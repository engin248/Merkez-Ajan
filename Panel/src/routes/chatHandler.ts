import AgentActions from '../../core/agent_actions';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { formatAiResponse, convertToHtml } from '../utils/textFormatter';
import { TOOL_DEFINITIONS, executeTool } from '../core/tools';
import * as db from '../db';

// State Memory functions
const CHAT_HISTORY_FILE = path.join(__dirname, '..', '..', '.chat_state.json');
const MAX_HISTORY = 30;

let chatHistory: any[] = [];
try {
    if (fs.existsSync(CHAT_HISTORY_FILE)) {
        chatHistory = JSON.parse(fs.readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
    }
} catch (e) { chatHistory = []; }

async function saveChatState() {
    try {
        await fs.promises.writeFile(CHAT_HISTORY_FILE, JSON.stringify(chatHistory), 'utf-8');
    } catch (e) {}
}

function ollamaRequest(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const oReq = http.request({
            hostname: 'localhost', port: 11434, path: '/api/chat',
            method: 'POST', headers: { 'Content-Type': 'application/json' }
        }, (oRes) => {
            let buf = '';
            oRes.on('data', c => buf += c);
            oRes.on('end', () => {
                try { resolve(JSON.parse(buf)); }
                catch (e) { reject(new Error('Ollama JSON parse hatasi')); }
            });
        });
        oReq.on('error', reject);
        oReq.setTimeout(120000, () => { oReq.destroy(); reject(new Error('Ollama timeout')); });
        oReq.write(data);
        oReq.end();
    });
}

// ─── KOMUT YAKALAYICI (Interceptor) ───
// Model tool calling'de başarısız olduğu yaygın komutları
// doğrudan yakalayıp çalıştırır. Model'e hiç gitmez.
async function tryIntercept(content: string): Promise<string | null> {
    const lower = content.toLowerCase().trim();

    // YouTube aç
    const ytMatch = lower.match(/youtube['']?(?:da|de|dan|den)?\s+(.+)/i);
    if (ytMatch) {
        let query = ytMatch[1].replace(/\s*(aç|çal|oynat|ac|cal)\s*$/i, '').trim();
        if (query) {
            const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            await executeTool('url_ac', { url });
            return `YouTube'da "${query}" arandı ve açıldı.`;
        }
    }

    // Google'da ara
    const googleMatch = lower.match(/google['']?(?:da|de)?\s+(.+?)(?:\s+ara|$)/i)
        || lower.match(/(?:ara|arat)\s+google['']?(?:da|de)?\s+(.+)/i);
    if (googleMatch) {
        const query = googleMatch[1].trim();
        const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        await executeTool('url_ac', { url });
        return `Google'da "${query}" arandı ve açıldı.`;
    }

    // Uygulama aç (calc, notepad, vs.)
    const appMatch = lower.match(/(?:hesap\s*makine|calculator)/i);
    if (appMatch) { await executeTool('uygulama_ac', { uygulama: 'calc' }); return 'Hesap makinesi açıldı.'; }
    const noteMatch = lower.match(/(?:not\s*defteri|notepad)/i);
    if (noteMatch && lower.includes('aç')) { await executeTool('uygulama_ac', { uygulama: 'notepad' }); return 'Not defteri açıldı.'; }

    // Site aç
    const siteMatch = lower.match(/(.+?)(?:\s+sitesini|\s+sayfasını)\s*aç/i)
        || lower.match(/aç\s+(.+?)(?:\s+sitesini|\s+sayfasını)/i);
    if (siteMatch) {
        const site = siteMatch[1].trim();
        let url = site;
        if (!url.startsWith('http')) url = `https://www.${site.replace(/\s+/g, '')}.com`;
        await executeTool('url_ac', { url });
        return `${site} açıldı.`;
    }

    return null; // Yakalayıcı bu komutu tanımadı, model'e devret
}

export async function handleChatRoute(req: any, res: any) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
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
            const DEPRECATED_MODELS = ['qwen3:8b', 'qwen3.5:latest', 'qwen2.5:latest'];
            if (DEPRECATED_MODELS.includes(selectedModel)) {
                selectedModel = 'qwen2.5:14b';
            }

            console.log(`\n[GELEN SES] "${content}" (Model: ${selectedModel})`);

            // ─── INTERCEPTOR: Yaygın komutları modele bırakmadan doğrudan çalıştır ───
            const interceptResult = await tryIntercept(content);
            if (interceptResult) {
                console.log(`[INTERCEPTOR] Komut yakalandı ve çalıştırıldı: ${interceptResult}`);
                chatHistory.push({ role: 'user', content });
                chatHistory.push({ role: 'assistant', content: interceptResult });
                while (chatHistory.length > MAX_HISTORY) chatHistory.shift();
                await saveChatState();

                const words = interceptResult.split(/(\\s+)/);
                for (const word of words) {
                    res.write(`data: ${JSON.stringify({ content: word })}\n\n`);
                }
                res.write('data: [DONE]\n\n');
                res.end();
                return;
            }

            chatHistory.push({ role: 'user', content: content });
            // NOT: Geçmiş limiti Ollama yanıtından SONRA uygulanır (off-by-one hatasını önlemek için)
            await saveChatState();

            let systemPrompt = '';
            const agentId = parsed.agent_id || 'core';

            try { systemPrompt = await db.getSystemPromptForChat(agentId); } catch (dbErr) {}

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

            if (!systemPrompt) systemPrompt = 'Sen yetenekli ve pratik bir yapay zeka asistanisin. Turkce konus.';
            systemPrompt += `\n\n[KİŞİSEL ASİSTAN KURALLARI — MUTLAK]
- Sen kullanıcının kişisel bilgisayar asistanısın. AÇIKLAMA YAPMA, DOĞRUDAN YAP.
- Kullanıcı bir şey yapmanı istediğinde NASIL yapılacağını anlatma, ARACI ÇAĞIR VE YAP.
- "YouTube'da X aç/çal" → url_ac aracını kullan
- "Google'da X ara" → url_ac aracını kullan
- "Hesap makinesini aç" / "Notepad aç" → uygulama_ac aracını kullan
- "GPU/RAM/CPU durumu" → sistem_bilgisi aracını kullan
- "Dosyaları listele/grupla/taşı/sil/organize et" → pc_komutu_calistir aracıyla PowerShell komutu çalıştır
- "X sitesini aç" → url_ac aracını kullan
- "Ekrana bak" / "Ekranda ne var" / "Ne görüyorsun" → ekran_analiz aracını kullan
- "X dosyasını aç" → dosya_ac aracını kullan
- Fiyat/güncel bilgi → web_ara aracını çağır
- ASLA "şu komutu çalıştırabilirsiniz" veya "şu adımları takip edin" gibi AÇIKLAMA yapma
- ASLA "bunu yapamam" deme
- Bilmediğin bilgiyi uydurma, emoji kullanma
- Kullanıcı adı Esisya, masaüstü: C:\\Users\\Esisya\\Desktop`;

            const messagesToSend = [
                { role: 'system', content: systemPrompt },
                ...chatHistory.slice(0, -1),
                { role: 'user', content }
            ];

            messagesToSend.push({ role: 'system', content: 'KRİTİK: AÇIKLAMA YAPMA, DOĞRUDAN ARACI ÇAĞIR VE YAP. Kullanıcı dosya taşımak, gruplamak, silmek, organize etmek istiyorsa pc_komutu_calistir aracıyla PowerShell komutu çalıştır. "Şu komutu çalıştırabilirsiniz" gibi cümleler YASAK. İşlemi KENDİN yap ve kısa rapor ver.' });
            
            const basePayload = {
                model: selectedModel,
                messages: messagesToSend,
                stream: false,
                keep_alive: "24h",
                tools: TOOL_DEFINITIONS,
                options: { temperature: 0.6, top_p: 0.85, top_k: 40, repeat_penalty: 1.8, num_predict: 512, num_ctx: 8192, presence_penalty: 0.8, frequency_penalty: 0.7 },
                think: false
            };

            let response = await ollamaRequest(basePayload);

            // FALLBACK logic
            if (response.error && response.error.includes("not found")) {
                console.log(`[YEDEK MODEL] ${basePayload.model} bulunamadı. Mevcut modelleri kontrol ediyor...`);
                // Döngüyü kırmak için sabit bir fallback zinciri kullan
                const FALLBACK_CHAIN = ['qwen2.5:14b', 'qwen2.5:latest', 'qwen2.5:7b'];
                const currentIdx = FALLBACK_CHAIN.indexOf(basePayload.model);
                const nextModel = FALLBACK_CHAIN[currentIdx + 1] || FALLBACK_CHAIN[FALLBACK_CHAIN.length - 1];
                if (nextModel !== basePayload.model) {
                    basePayload.model = nextModel;
                    response = await ollamaRequest(basePayload);
                }
            }

            if (response.error) throw new Error(response.error);

            let aiMessage = response.message;
            let toolCallMessages = [...messagesToSend];
            let toolRound = 0;
            const MAX_TOOL_ROUNDS = 3;

            while (aiMessage && aiMessage.tool_calls && aiMessage.tool_calls.length > 0 && toolRound < MAX_TOOL_ROUNDS) {
                toolRound++;
                toolCallMessages.push(aiMessage);

                for (const tc of aiMessage.tool_calls) {
                    const toolName = tc.function.name;
                    const toolArgs = tc.function.arguments;
                    res.write(`data: ${JSON.stringify({ content: `<br><i>[Sistem ${toolName} aracını kullanıyor...]</i><br>` })}\n\n`);
                    const result = await executeTool(toolName, toolArgs);
                    const toolOutput = result.success ? result.output : `HATA: ${result.error}`;
                    toolCallMessages.push({ role: 'tool', content: toolOutput });
                }

                response = await ollamaRequest({ ...basePayload, messages: toolCallMessages });
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

                chatHistory.push({ role: 'assistant', content: fullAiResponse });
                // Geçmiş limitini burada uygula (user + assistant eklenmiş haliyle)
                while (chatHistory.length > MAX_HISTORY) chatHistory.shift();
                await saveChatState();

                try {
                    await db.addChatMessage(agentId, 'user', content);
                    await db.addChatMessage(agentId, 'assistant', fullAiResponse);
                } catch (dbErr) {}

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
