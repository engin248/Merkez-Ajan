import 'dotenv/config';
import AgentActions from '../core/agent_actions';
// http/https artık llmBridge.ts'de
import * as fs from 'fs';
import * as path from 'path';
import { formatAiResponse, convertToHtml } from '../utils/textFormatter';
import { getActiveToolDefinitions, executeTool } from '../core/tools';
import {
    applySavingsToPayload,
    getRouterModel,
    getSavingsPolicy,
    guessCategories,
    recordSavingsEvent,
    shouldUseRouter,
    trimHistoryForRequest,
    trimStoredHistory,

} from '../utils/usageGovernor';
import * as db from '../db';
import { universalLlmRequest, withRetry } from './llmBridge';
import { tryIntercept } from './interceptor';
import { Logger } from '../utils/logger';
import { createError, extractErrorMessage } from '../utils/errorCodes';
import { AnaPlanner } from '../core/ana_planner';

const logger = new Logger('ChatHandler');

// State Memory — Bellekte tutulan oturum gecmisi
// NOT: Kalici gecmis veritabaninda saklanir (db.ts).
// Dosya tabanli .chat_state.json KALDIRILDI — tek kaynak: DB.

let chatHistory: any[] = [];

async function saveChatState() {
    // Oturum gecmisi sadece bellekte, kalici kayit DB uzerinden yapilir.
}


export async function handleChatRoute(req: any, res: any) {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk; });
    req.on('end', async () => {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        });

        try {
            const parsed = JSON.parse(body);
            const content = parsed.prompt || parsed.content || '';
            let selectedModel = parsed.model || 'qwen2.5:14b';
            const savingsPolicy = getSavingsPolicy();
            
            // Eskiden olan "eski modelleri değiştir" mantığı kaldırıldı, kullanıcı ne seçerse o kullanılacak.

            console.log(`\n[GELEN SES] "${content}" (Model: ${selectedModel})`);

            // ─── INTERCEPTOR: Yaygın komutları modele bırakmadan doğrudan çalıştır ───
            const interceptResult = await tryIntercept(content);
            if (interceptResult) {
                console.log(`[INTERCEPTOR] Komut yakalandı ve çalıştırıldı: ${interceptResult}`);
                chatHistory.push({ role: 'user', content });
                chatHistory.push({ role: 'assistant', content: interceptResult });
                trimStoredHistory(chatHistory, savingsPolicy);
                recordSavingsEvent('intercept', { model_avoided: selectedModel, content: content.slice(0, 160) });
                await saveChatState();

                const words = interceptResult.split(/(\\s+)/);
                for (const word of words) {
                    res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            // ─── SWARM (KOVAN) ORKESTRATÖRÜ YAKALAYICISI ───
            if (content.trim().toLowerCase().startsWith('!kovan')) {
                const kovanIntent = content.trim().substring(6).trim();
                console.log(`[ANA PLANNER] Kovan mimarisi tetiklendi. Görev: ${kovanIntent}`);
                res.write(`data: ${JSON.stringify({ content: "[Hiyerarşik Kovan] Ana Planner aktif edildi. Adımlar planlanıyor...\n" })}\n\n`);
                
                const planner = new AnaPlanner(selectedModel);
                const finalReport = await planner.executeUserIntent(kovanIntent);

                chatHistory.push({ role: 'user', content });
                chatHistory.push({ role: 'assistant', content: finalReport });
                trimStoredHistory(chatHistory, savingsPolicy);
                await saveChatState();

                const lines = finalReport.split('\n');
                for (const line of lines) {
                    res.write(`data: ${JSON.stringify({ content: line + '\n' })}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            chatHistory.push({ role: 'user', content: content });
            // NOT: Kalici gecmis yanittan sonra kirpilir; istege giden gecmis tasarruf politikasi ile ayrica kisaltilir.
            await saveChatState();

            let systemPrompt = '';
            const agentId = parsed.agent_id || 'core';

            try { systemPrompt = await db.getSystemPromptForChat(agentId); } catch (dbErr: unknown) { logger.error(createError('DB_SAVE_FAILED', extractErrorMessage(dbErr), dbErr).message); }

            if (!systemPrompt) {
                const modelFolderMap: any = {
                    'qwen3:8b': '1_Qwen_2.5_Merkez', 'qwen2.5:latest': '1_Qwen_2.5_Merkez', 'gemma4': '2_Gemma_4_Kod',
                    'qwen3.5': '3_Qwen_3.5_Analiz', 'kimi-k2.5:cloud': '4_Kimi_Derin_Arge', 'qwen3.5:cloud': '5_Qwen_Cloud_Genel',
                    'glm-5.1:cloud': '6_GLM_5.1_Strateji', 'minimax-m2.7:cloud': '7_Minimax_Hizli'
                };
                const folderName = modelFolderMap[selectedModel] || '1_Qwen_2.5_Merkez';
                const memoryFilePath = path.join(__dirname, '..', '..', 'Memories', folderName, 'memory.md');
                try {
                    const stats = await fs.promises.stat(memoryFilePath);
                    if (stats.isFile()) {
                        systemPrompt = await fs.promises.readFile(memoryFilePath, 'utf-8');
                    }
                } catch (err) {}
            }

            if (!systemPrompt) systemPrompt = 'Sen yetenekli, zeki ve otonom bir yapay zeka asistanısın. Türkçe konuş.';
            systemPrompt += `\n\n[OTONOM AJAN PRENSİPLERİ]
- Sen sadece emir uygulayan bir bot değil, kendi kararlarını alabilen özgür bir ajansın. Kullanıcının hedefine ulaşması için araçları kendi mantığınla en doğru şekilde seç ve kullan.
- Araçlara (Tools) göndereceğin parametreleri tamamen kendi zekanı kullanarak optimize et. (Örneğin; arama araçlarına uzun cümleler değil, hedefe yönelik anahtar kelimeler gönderilir).
- Görevi tamamlamak için araçları dilediğin sırada ve sayıda arka arkaya çağırabilirsin.
- Nasıl yapacağını anlatarak vakit kaybetme, doğrudan inisiyatif al ve eyleme geç (Aracı çalıştır).
- Asla "Şunu yapabilirsiniz" deme, yapabiliyorsan kendin yap.`;

            if (savingsPolicy.enabled) {
                systemPrompt += `\n\n[TASARRUF KATMANI]\n- ${savingsPolicy.systemReminder}\n- Arac cagrilarini birlestir, zorunlu degilse web/API/bulut kullanma.\n- Gereksiz uzun cevap verme; kullanicinin mevcut sayfadaki isini bitirmeye odaklan.`;
            }

            const messagesToSend = [
                { role: 'system', content: systemPrompt },
                ...trimHistoryForRequest(chatHistory, content, savingsPolicy),
            ];
            
            // ─── YÖNLENDİRİCİ (ROUTER) ÇAĞRISI ───
            const routerPrompt = `Sen bir Yönlendirici (Router) yapay zekasın. Görevin, kullanıcının talebini analiz edip hangi araç kategorilerine ihtiyaç duyulacağını tespit etmektir. SADECE virgülle ayrılmış kategori isimleri ile cevap ver, asla açıklama yapma. Mevcut kategoriler: Media, Communication, Web, System. Kullanıcı talebi: "${content}"`;
            
            let allowedCategories: string[] | undefined = guessCategories(content);
            if (!shouldUseRouter(content, savingsPolicy)) {
                allowedCategories = [];
                recordSavingsEvent('router_skipped', { reason: 'simple_request', content: content.slice(0, 160) });
                console.log(`[ROUTER] Tasarruf: basit istek, router atlandi.`);
            } else if (!allowedCategories || !savingsPolicy.enabled) {
                try {
                    const routerModel = getRouterModel(selectedModel, savingsPolicy);
                    console.log(`[ROUTER] Kategori tespiti yapılıyor... (Model: ${routerModel})`);
                    recordSavingsEvent('router_called', { model: routerModel, selectedModel });
                    const routerPayload = applySavingsToPayload({
                        model: routerModel,
                        messages: [{ role: 'system', content: routerPrompt }],
                        stream: false,
                        options: { temperature: 0.1, num_predict: 20 },
                        think: false
                    }, 'router', savingsPolicy);
                    const routerResponse = await universalLlmRequest(routerPayload);
                    if (routerResponse && routerResponse.message && routerResponse.message.content) {
                        const respText = routerResponse.message.content.toUpperCase();
                        allowedCategories = [];
                        if (respText.includes('MEDIA')) allowedCategories.push('Media');
                        if (respText.includes('COMMUNICATION')) allowedCategories.push('Communication');
                        if (respText.includes('WEB')) allowedCategories.push('Web');
                        if (respText.includes('SYSTEM')) allowedCategories.push('System');
                        
                        if (allowedCategories.length === 0) allowedCategories = undefined; // Kategori bulamazsa hepsini getir
                        console.log(`[ROUTER] Tespit edilen kategoriler: ${allowedCategories ? allowedCategories.join(', ') : 'Hepsi'}`);
                    }
                } catch(e) {
                    allowedCategories = savingsPolicy.enabled ? [] : undefined;
                    console.log(`[ROUTER] Router hatası, tasarruf modunda sadece cekirdek araclar yukleniyor.`);
                }
            } else {
                console.log(`[ROUTER] Tasarruf: kategori yerel tahmin edildi: ${allowedCategories.join(', ')}`);
            }

            const basePayload = applySavingsToPayload({
                model: selectedModel,
                messages: messagesToSend,
                stream: false,
                keep_alive: "24h",
                tools: getActiveToolDefinitions(allowedCategories),
                options: { temperature: 0.1, num_predict: 1024, num_ctx: 8192 },
                think: false
            }, 'main', savingsPolicy);

            recordSavingsEvent('main_call', {
                model: selectedModel,
                messages: messagesToSend.length,
                tools: Array.isArray(basePayload.tools) ? basePayload.tools.length : 0,
                num_predict: basePayload.options?.num_predict,
                num_ctx: basePayload.options?.num_ctx,
            });
            let response = await universalLlmRequest(basePayload);

            // FALLBACK logic (Seçilen model hata verirse veya çöküp yanıt veremezse direkt Gemini devreye girer)
            if (response.error || !response.message) {
                if (savingsPolicy.enabled && !savingsPolicy.allowCloudFallback) {
                    recordSavingsEvent('cloud_fallback_blocked', { failedModel: basePayload.model, error: response.error || 'empty_response' });
                    throw new Error(`${basePayload.model} yanıt veremedi. Tasarruf modu bulut yedek modelini otomatik kullanmadı; yerel modeli secip tekrar deneyebilirsin.`);
                } else {
                    console.log(`[YEDEK MODEL] ${basePayload.model} yanıt veremedi veya bulunamadı. Gemini'ye geçiliyor...`);
                    basePayload.model = 'gemini-2.5-flash';
                    response = await universalLlmRequest(basePayload);
                }
            }

            if (response.error) throw new Error(response.error);

            let aiMessage = response.message;
            let toolCallMessages = [...messagesToSend];
            let toolRound = 0;
            const MAX_TOOL_ROUNDS = savingsPolicy.enabled ? savingsPolicy.maxToolRounds : 8;
            const toolCallHistory: string[] = [];

            while (aiMessage && aiMessage.tool_calls && aiMessage.tool_calls.length > 0 && toolRound < MAX_TOOL_ROUNDS) {
                toolRound++;

                // Tekrar algilama: Ayni arac+arguman cagrisi daha once yapildiysa donguyu kir
                const currentCallSignature = aiMessage.tool_calls
                    .map((tc: any) => `{tc.function.name}:{JSON.stringify(tc.function.arguments)}`)
                    .sort().join('|');
                if (toolCallHistory.includes(currentCallSignature)) {
                    logger.warn(`Sonsuz dongu algilandi (tur {toolRound})`, currentCallSignature.slice(0, 120));
                    recordSavingsEvent('loop_detected', { round: toolRound, signature: currentCallSignature.slice(0, 200) });
                    break;
                }
                toolCallHistory.push(currentCallSignature);

                toolCallMessages.push(aiMessage);

                for (const tc of aiMessage.tool_calls) {
                    const toolName = tc.function.name;
                    const toolArgs = tc.function.arguments;
                    recordSavingsEvent('tool_call', { toolName, round: toolRound });
                    res.write(`data: ${JSON.stringify({ content: `<br><i>[Sistem ${toolName} aracını kullanıyor...]</i><br>` })}\n\n`);
                    const result = await executeTool(toolName, toolArgs);
                    const toolOutput = result.success ? result.output : `HATA: ${result.error}`;
                    toolCallMessages.push({ 
                        role: 'tool', 
                        name: toolName,
                        tool_call_id: tc.id, // Gemini/OpenAI sarti
                        content: toolOutput 
                    });
                }

                response = await universalLlmRequest({ ...basePayload, messages: toolCallMessages });
                aiMessage = response.message;
            }

            if (aiMessage && aiMessage.content) {
                let fullAiResponse = formatAiResponse(aiMessage.content);


                let actionExecuted = false;
                const urlMatch2 = fullAiResponse.match(/\[URL:\s*(.+?)\]/i);
                if (urlMatch2) { AgentActions.executeAction('OPEN_URL', urlMatch2[1]); fullAiResponse = fullAiResponse.replace(urlMatch2[0], ''); actionExecuted = true; }
                const appMatch = fullAiResponse.match(/\[APP:\s*(.+?)\]/i);
                if (appMatch) { AgentActions.executeAction('OPEN_APP', appMatch[1]); fullAiResponse = fullAiResponse.replace(appMatch[0], ''); actionExecuted = true; }

                if (!fullAiResponse && (actionExecuted || toolRound > 0)) {
                    fullAiResponse = toolRound > 0 ? 'İşlem tamamlandı.' : 'Tamam, işlem başlatılıyor.';
                }

                // HAFIZA KORUMA: Modelin sızdırdığı ham JSON (tool_call) formatlarını temizle (örn: ićc ... </tool_call>)
                let cleanHistoryResponse = fullAiResponse.replace(/ićc[\s\S]*?<\/tool_call>/gi, '').trim();
                // Bazen model sadece JSON sızdırır, temizledikten sonra boş kalırsa varsayılan metin ata
                if (!cleanHistoryResponse) {
                    cleanHistoryResponse = 'İşlem tamamlandı.';
                }

                chatHistory.push({ role: 'assistant', content: cleanHistoryResponse });
                // Geçmiş limitini burada uygula (user + assistant eklenmiş haliyle)
                trimStoredHistory(chatHistory, savingsPolicy);
                recordSavingsEvent('response', { model: selectedModel, toolRounds: toolRound, length: cleanHistoryResponse.length });
                await saveChatState();

                try {
                    await db.addChatMessage(agentId, 'user', content);
                    await db.addChatMessage(agentId, 'assistant', fullAiResponse);
                } catch (dbErr: unknown) { logger.error(createError('DB_SAVE_FAILED', extractErrorMessage(dbErr), dbErr).message); }

                const htmlResponse = convertToHtml(fullAiResponse);
                const words = htmlResponse.split(/(\s+)/);
                let wordIndex = 0;

                function sendNextWord() {
                    if (wordIndex >= words.length) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        return;
                    }
                    const word = words[wordIndex++];
                    res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                    setTimeout(sendNextWord, word.length > 10 ? 40 : 25);
                }
                sendNextWord();
            } else {
                res.write(`data: ${JSON.stringify({ content: 'Yapay Zeka Yanit Donemedi.' })}\n\n`);
                res.write('data: [DONE]\n\n');
                res.end();
            }
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ content: `Hata: ${e.message}` })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    });
}
