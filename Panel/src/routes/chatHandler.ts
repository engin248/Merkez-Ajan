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
            if (selectedModel === 'qwen3:8b' || selectedModel === 'qwen3.5:latest' || selectedModel === 'qwen2.5:latest') {
                selectedModel = 'qwen2.5:14b';
            }

            console.log(`\n[GELEN SES] "${content}" (Model: ${selectedModel})`);

            chatHistory.push({ role: 'user', content: content });
            if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
            await saveChatState(); // Async save

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
            systemPrompt += '\n\n[SON SAVUNMA KURALLARI]\n- Fiyat/güncel bilgi sorulursa web_ara aracını çağır, arama yapmadan fiyat söyleme.\n- Bilmediğin bilgiyi uydurma.\n- Emoji kullanma.';

            const messagesToSend = [
                { role: 'system', content: systemPrompt },
                ...chatHistory.slice(0, -1),
                { role: 'user', content }
            ];

            messagesToSend.push({ role: 'system', content: 'LÜTFEN ÇOK KISA VE ÖZ CEVAP VER. ASKERİ, NET VE KISA KONUŞ. UZUN AÇIKLAMALARDAN KAÇIN.' });
            
            const basePayload = {
                model: selectedModel,
                messages: messagesToSend,
                stream: false,
                keep_alive: "24h",
                tools: TOOL_DEFINITIONS,
                options: { temperature: 0.6, top_p: 0.85, top_k: 40, repeat_penalty: 1.8, num_predict: 128, num_ctx: 8192, presence_penalty: 0.8, frequency_penalty: 0.7 },
                think: false
            };

            let response = await ollamaRequest(basePayload);

            // FALLBACK logic
            if (response.error && response.error.includes("not found")) {
                console.log(`[YEDEK MODEL] ${basePayload.model} henüz iniyor veya bulunamadı. Geçici olarak 8B'ye dönülüyor...`);
                basePayload.model = "qwen2.5:latest";
                response = await ollamaRequest(basePayload);
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
                if (chatHistory.length > MAX_HISTORY) chatHistory.shift();
                await saveChatState(); // Async save

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
