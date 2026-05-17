import 'dotenv/config';
import * as http from 'http';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as db from './db';
import * as ts from 'typescript';
import { handleChatRoute } from './routes/chatHandler';
import { handlePcControl } from './routes/pcControlHandler';
import { 
    cleanupProcesses, 
    startOllamaService
} from './server/process_manager';
import { startWebSocketServer } from './server/ws_handler';
import { integrateModule } from './core/module_integrator';
import { Logger } from './utils/logger';
import { ErrorCodes, createError, extractErrorMessage } from './utils/errorCodes';
import { getSavingsStatus } from './utils/usageGovernor';

const logger = new Logger('Server');

const port = 8085;
const wsPort = 8086;
const askerMotoruRoot = process.env.ASKER_MOTORU_ROOT
    || path.resolve(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', 'ASKER_MOTORU_KOK_KLASORU');
const legacyAlbayPanelDir = path.resolve(__dirname, '..');

function readJsonIfExists(filePath: string, fallback: any = null) {
    try {
        if (!fs.existsSync(filePath)) return fallback;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        return fallback;
    }
}

function secondsSinceIso(isoValue: any) {
    if (!isoValue) return null;
    const parsed = Date.parse(String(isoValue));
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.floor((Date.now() - parsed) / 1000));
}

function readLastJsonLines(filePath: string, limit = 12) {
    try {
        if (!fs.existsSync(filePath)) return [];
        return fs.readFileSync(filePath, 'utf8')
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(-limit)
            .map(line => {
                try { return JSON.parse(line); }
                catch { return { raw: line }; }
            });
    } catch {
        return [];
    }
}

function discoverCoreAgents(limit = 125) {
    const coreDir = path.join(askerMotoruRoot, 'backend', 'Asker_Motoru_Cekirdegi');
    try {
        if (!fs.existsSync(coreDir)) return [];
        return fs.readdirSync(coreDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((a, b) => a.localeCompare(b, 'tr'))
            .slice(0, limit)
            .map((name, index) => ({
                id: name,
                ajan_kodu: name,
                name,
                role: name.replace(/^\d+_?/, '').replace(/_/g, ' '),
                statu: 'CORE',
                beceri_entegrasyonu: 'Asker Motoru çekirdek ajan/modül envanteri',
                source: 'backend/Asker_Motoru_Cekirdegi',
                order: index + 1,
            }));
    } catch {
        return [];
    }
}

function loadAvailableTrainingAgents(limit = 125) {
    const candidates = [
        path.join(legacyAlbayPanelDir, 'albay_komuta_zinciri.json'),
        path.join(askerMotoruRoot, 'Panel', 'albay_komuta_zinciri.json'),
        path.join(askerMotoruRoot, 'ASKER_MOTORU_NIHAYI_SET', 'Panel', 'albay_komuta_zinciri.json'),
    ];
    for (const filePath of candidates) {
        const chain = readJsonIfExists(filePath, null);
        const agents = Array.isArray(chain?.ajan_listesi) ? chain.ajan_listesi : [];
        if (agents.length) {
            return {
                source: filePath,
                agents: agents.slice(0, limit).map((agent: any, index: number) => ({
                    ...agent,
                    id: agent.id || agent.ajan_kodu || agent.name || `agent_${index + 1}`,
                    name: agent.name || agent.ajan_kodu || `Ajan ${index + 1}`,
                    order: index + 1,
                })),
            };
        }
    }

    const state = readJsonIfExists(path.join(askerMotoruRoot, 'EGITIM_DURUMU.json'), {});
    const stateAgents = Array.isArray(state.agent_records) ? state.agent_records : [];
    if (stateAgents.length >= limit) {
        return {
            source: path.join(askerMotoruRoot, 'EGITIM_DURUMU.json'),
            agents: stateAgents.slice(0, limit).map((agent: any, index: number) => ({
                ...agent,
                id: agent.id || agent.agent || agent.name || `agent_${index + 1}`,
                name: agent.name || agent.agent || `Ajan ${index + 1}`,
                order: index + 1,
            })),
        };
    }

    return {
        source: path.join(askerMotoruRoot, 'backend', 'Asker_Motoru_Cekirdegi'),
        agents: discoverCoreAgents(limit),
    };
}

function loadTrainingModules(limit = 314) {
    const inventoryPath = path.join(askerMotoruRoot, 'ASKER_MOTORU_AI_AJAN_TAM_ENVANTER_002_EGITIM.md');
    try {
        if (fs.existsSync(inventoryPath)) {
            const rows = fs.readFileSync(inventoryPath, 'utf8')
                .split(/\r?\n/)
                .map(line => line.match(/^\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/))
                .filter(Boolean)
                .slice(0, limit)
                .map((match: any) => ({
                    order: Number(match[1]),
                    id: match[2],
                    name: match[2],
                    layer: String(match[3] || '').trim(),
                    engine_bytes: Number(String(match[4] || '').trim()) || 0,
                    skill_count: Number(String(match[5] || '').trim()) || 0,
                    source: 'ASKER_MOTORU_AI_AJAN_TAM_ENVANTER_002_EGITIM.md',
                }));
            if (rows.length) return { source: inventoryPath, modules: rows };
        }
    } catch {}

    const coreDir = path.join(askerMotoruRoot, 'backend', 'Asker_Motoru_Cekirdegi');
    try {
        const modules = fs.readdirSync(coreDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name)
            .sort((a, b) => a.localeCompare(b, 'tr'))
            .slice(0, limit)
            .map((name, index) => ({
                order: index + 1,
                id: name,
                name,
                layer: name.includes('ZIRH') ? 'ZIRH' : 'BASE',
                engine_bytes: 0,
                skill_count: 0,
                source: 'backend/Asker_Motoru_Cekirdegi',
            }));
        return { source: coreDir, modules };
    } catch {
        return { source: coreDir, modules: [] };
    }
}

process.on('exit', () => { logger.info('Server exiting...'); cleanupProcesses(); });
process.on('SIGINT', () => { logger.warn('SIGINT received'); cleanupProcesses(); process.exit(); });
process.on('SIGTERM', () => { logger.warn('SIGTERM received'); cleanupProcesses(); process.exit(); });

const server = http.createServer(async (req: any, res: any) => {
    const parsedUrl = url.parse(req.url || '', true);
    const startTime = Date.now();

    const isApi = parsedUrl.pathname?.startsWith('/api/');
    if (isApi) {
        logger.debug(`[REQUEST] ${req.method} ${parsedUrl.pathname}`);
    }

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        if (isApi) {
            logger.info(`[RESPONSE] ${req.method} ${parsedUrl.pathname} - ${res.statusCode} (${duration}ms)`);
        } else {
            logger.trace(`[STATIC] ${req.method} ${parsedUrl.pathname} - ${res.statusCode} (${duration}ms)`);
        }
    });

    if (parsedUrl.pathname === '/api/sohbet' && req.method === 'POST') {
        return handleChatRoute(req, res);
    }

    if (parsedUrl.pathname === '/api/konus' && req.method === 'POST') {
        // ZMQ Bridge kaldırıldı — Native Web Speech API kullanılıyor.
        // Bu endpoint artık deprecated. Frontend doğrudan Web Speech API kullanıyor.
        res.writeHead(410, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ durum: 'DEPRECATED', mesaj: 'Ses sistemi artık Native Web Speech API ile çalışıyor. Bu endpoint kullanım dışıdır.' }));
        return;
    }

    if (parsedUrl.pathname === '/api/pc-control' && req.method === 'POST') {
        return handlePcControl(req, res);
    }

    if (parsedUrl.pathname === '/api/modules' && req.method === 'GET') {
        try {
            const { getAllModules } = require('./modules/registry');
            const mods = getAllModules();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(mods));
        } catch(e: any) {
            logger.error('Modules Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-REG-001', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/graph-state' && req.method === 'GET') {
        try {
            const state = await db.loadGraphState();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(state));
        } catch(e: any) {
            logger.error('Graph State Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-002', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/graph-state' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
            try {
                const { nodes, edges } = JSON.parse(body);
                const result = await db.saveGraphState(nodes || [], edges || []);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, ...result }));
            } catch(e: any) {
                logger.error('Graph State Save Hatası:', e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 'AM-SRV-002', error: e.message }));
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/chat-history' && req.method === 'GET') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            const messages = await db.getChatHistory(agentId, 100);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(messages));
        } catch(e: any) {
            logger.error('Chat History Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-007', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/chat-history' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
            try {
                const { agent_id, role, content } = JSON.parse(body);
                const result = await db.addChatMessage(agent_id, role, content);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch(e: any) {
                logger.error('Chat History Save Hatası:', e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 'AM-SRV-007', error: e.message }));
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/chat-history' && req.method === 'DELETE') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            await db.clearChatHistory(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        } catch(e: any) {
            logger.error('Chat History Delete Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-007', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/db-status' && req.method === 'GET') {
        try {
            const status = await db.testConnection();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(status));
        } catch(e: any) {
            logger.error('DB Status Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-DB-001', connected: false, error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/agent-memory' && req.method === 'GET') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            const memory = await db.getAgentMemory(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(memory || {}));
        } catch(e: any) {
            logger.error('Agent Memory Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/agent-memory' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
            try {
                const { agent_id, ...memoryData } = JSON.parse(body);
                if (!agent_id) throw new Error('agent_id gerekli');
                const result = await db.upsertAgentMemory(agent_id, memoryData);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch(e: any) {
                logger.error('Agent Memory Save Hatası:', e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/worker-prompt' && req.method === 'GET') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            const prompt = await db.getWorkerPrompt(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ prompt }));
        } catch(e: any) {
            logger.error('Worker Prompt Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/worker-prompt' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
            try {
                const { agent_id, prompt } = JSON.parse(body);
                if (!agent_id) throw new Error('agent_id gerekli');
                const result = await db.setWorkerPrompt(agent_id, prompt || '');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch(e: any) {
                logger.error('Worker Prompt Save Hatası:', e.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/system-prompt' && req.method === 'GET') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            const prompt = await db.getSystemPromptForChat(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ system_prompt: prompt }));
        } catch(e: any) {
            logger.error('System Prompt Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/memory-log' && req.method === 'GET') {
        const agentId = parsedUrl.query.agent_id as string;
        if (!agentId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'agent_id gerekli' }));
            return;
        }
        try {
            const logs = await db.getMemoryLog(agentId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(logs));
        } catch(e: any) {
            logger.error('Memory Log Load Hatası:', e.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ code: 'AM-SRV-008', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/healthcheck' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
        return;
    }

    if ((parsedUrl.pathname === '/api/tasarruf-durumu' || parsedUrl.pathname === '/api/tasarruf-politikasi') && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(getSavingsStatus()));
        return;
    }

    if (parsedUrl.pathname === '/api/albay-egitim' && req.method === 'GET') {
        try {
            const skillPath = path.join(legacyAlbayPanelDir, 'Albay_Beceri_Hafizasi.json');
            const chainPath = path.join(legacyAlbayPanelDir, 'albay_komuta_zinciri.json');
            const skillMemory = readJsonIfExists(skillPath, {});
            const commandChain = readJsonIfExists(chainPath, {});
            const skills = skillMemory.beceri_agaci || {};
            const categoryCounts: Record<string, number> = {};

            Object.values(skills).forEach((skill: any) => {
                const category = skill?.kategori || 'Bilinmeyen';
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            });

            const categoryList = Object.entries(categoryCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count);
            const agents = Array.isArray(commandChain.ajan_listesi) ? commandChain.ajan_listesi : [];
            const assignedAgents = agents.filter((a: any) => String(a.beceri_entegrasyonu || '').toLowerCase().includes('enjekte')).length;

            const payload: any = {
                status: 'OK',
                server_time: new Date().toISOString(),
                source: {
                    active_panel: legacyAlbayPanelDir,
                    skill_memory: skillPath,
                    command_chain: chainPath,
                    live_training: path.join(askerMotoruRoot, 'EGITIM_DURUMU.json'),
                },
                command_identity: skillMemory.komuta_kimligi || commandChain.merkez_komuta || 'Albay (000)',
                professor_level: skillMemory.profesorluk_seviyesi || null,
                total_injected_skills: skillMemory.toplam_enjekte_edilen_beceri || Object.keys(skills).length,
                verified_skill_records: Object.keys(skills).length,
                total_agents: commandChain.toplam_bagli_ajan || agents.length,
                assigned_agents: assignedAgents,
                waiting_agents: Math.max(0, agents.length - assignedAgents),
                live_training: {
                    status: 'UNKNOWN',
                    cycle: null,
                    last_update: null,
                    seconds_since_update: null,
                    albay_priority: null,
                },
                category_mode: 'LEGACY_SKILL_MEMORY',
                live_skill_profile: null,
                storage_categories: categoryList.slice(0, 30),
                categories: categoryList.slice(0, 30),
                sample_skills: Object.entries(skills).slice(0, 20).map(([id, skill]: [string, any]) => ({
                    id,
                    category: skill?.kategori,
                    status: skill?.durum,
                    authority: skill?.yetki_seviyesi,
                    path: skill?.yol,
                })),
                agents: agents.slice(0, 125),
                honesty_note: 'Bu ekran Albay beceri hafızası, komuta zinciri ve canlı eğitim JSON kayıtlarını gösterir; gerçek fine-tune başarısı ayrıca kanıtlanmadan yüzde yükseltilmez.',
            };

            const liveState = readJsonIfExists(path.join(askerMotoruRoot, 'EGITIM_DURUMU.json'), null);
            if (liveState) {
                payload.live_training = {
                    status: liveState.status || 'UNKNOWN',
                    cycle: liveState.cycle || null,
                    last_update: liveState.last_update || null,
                    seconds_since_update: secondsSinceIso(liveState.last_update),
                    albay_priority: liveState.albay_priority || null,
                    live_progress: liveState.live_progress || null,
                };
                const liveProfile = liveState.albay_priority?.records?.[0]?.skill_profile || null;
                if (liveProfile) {
                    payload.live_skill_profile = liveProfile;
                    payload.category_mode = 'LIVE_ALBAY_TRAINING';
                    payload.categories = Object.entries(liveProfile.domain_counts || {})
                        .map(([name, count]) => ({ name, count }))
                        .sort((a: any, b: any) => Number(b.count || 0) - Number(a.count || 0));
                    payload.sample_skills = (liveProfile.selected_skills || []).slice(0, 24).map((skill: any, index: number) => ({
                        id: skill.skill || `live_skill_${index + 1}`,
                        category: (skill.matched_terms || []).join(', ') || 'canli_eslesme',
                        status: `skor ${skill.score ?? '-'}`,
                        authority: 'Canli_ALBAY_Egitim_Secimi',
                        path: 'EGITIM_DURUMU.json',
                    }));
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(payload));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 'AM-SRV-002', status: 'ERROR', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/egitim-durumu' && req.method === 'GET') {
        try {
            const statePath = path.join(askerMotoruRoot, 'EGITIM_DURUMU.json');
            const planPath = path.join(askerMotoruRoot, 'PLANLAMA_DURUMU.json');
            const watchdogPath = path.join(askerMotoruRoot, 'EGITIM_GOZETMEN_DURUMU.json');
            const controlPath = path.join(askerMotoruRoot, 'EGITIM_MIDE_KONTROL_DURUMU.json');
            const heartbeatPath = path.join(askerMotoruRoot, 'EGITIM_HEARTBEAT.json');
            const progressPath = path.join(askerMotoruRoot, 'EGITIM_CANLI_ILERLEME.json');
            const sessionLogPath = path.join(askerMotoruRoot, 'EGITIM_OTURUM_LOG.jsonl');
            const planningLogPath = path.join(askerMotoruRoot, 'PLANLAMA_DEPARTMANI_LOG.jsonl');
            const misunderstandingStatePath = path.join(askerMotoruRoot, 'ALBAY_ANLAMADIM_EGITIM_KUYRUGU.json');
            const misunderstandingLogPath = path.join(askerMotoruRoot, 'ALBAY_ANLAMADIM_EGITIM_KUYRUGU.jsonl');

            const state = readJsonIfExists(statePath, {});
            const plan = readJsonIfExists(planPath, {});
            const watchdog = readJsonIfExists(watchdogPath, {});
            const educationControl = readJsonIfExists(controlPath, {});
            const heartbeat = readJsonIfExists(heartbeatPath, {});
            const liveProgress = readJsonIfExists(progressPath, state.live_progress || null);
            const misunderstandingState = readJsonIfExists(misunderstandingStatePath, { recent: [] });
            const nowIso = new Date().toISOString();
            const heartbeatAge = secondsSinceIso(heartbeat.timestamp || heartbeat.last_update);
            const stateAge = secondsSinceIso(state.last_update || state.timestamp);

            const payload = {
                ...state,
                status: state.status || 'UNKNOWN',
                server_time: nowIso,
                seconds_since_update: stateAge,
                next_cycle_estimate_seconds: stateAge === null ? null : Math.max(0, 60 - (stateAge % 60)),
                watchdog,
                education_control: educationControl,
                heartbeat: {
                    ...heartbeat,
                    seconds_since_update: heartbeatAge,
                },
                live_progress: liveProgress,
                live_activity: {
                    server_poll_time: nowIso,
                    state_file_age_seconds: stateAge,
                    heartbeat_age_seconds: heartbeatAge,
                    session_events: readLastJsonLines(sessionLogPath, 20),
                    planning_events: readLastJsonLines(planningLogPath, 20),
                    misunderstanding_events: Array.isArray(misunderstandingState.recent)
                        ? misunderstandingState.recent
                        : readLastJsonLines(misunderstandingLogPath, 20),
                },
                algorithm_pipeline_final: plan.algorithm_pipeline?.final || null,
                algorithm_count: plan.algorithm_pipeline?.total_algorithms || 0,
                teacher_summary: state.teacher_summary || {
                    active_teachers: state.teacher_roster?.length || 0,
                    total_teachers: state.teacher_roster?.length || 0,
                    layer_quota: {},
                },
                teacher_roster: Array.isArray(state.teacher_roster) ? state.teacher_roster : [],
                language_policy: state.language_policy || {},
                department_layers: Array.isArray(state.department_layers) ? state.department_layers : [],
                albay_priority: state.albay_priority || null,
                source_panels: {
                    agent_training_panel: '/training.html',
                    education_department_panel: '/egitim_departmani.html',
                    albay_training_panel: '/albay_egitim.html',
                },
                honesty_note: 'Eğitim paneli canlı JSON kayıtlarını gösterir. Ölçülmeyen beceri, zeka seviyesi veya fine-tune başarısı kanıtlanmadan yükseltilmiş sayılmaz.',
            };

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(payload));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 'AM-SRV-002', status: 'ERROR', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/egitim-ajanlari' && req.method === 'GET') {
        try {
            const catalog = loadAvailableTrainingAgents(125);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({
                status: 'OK',
                source: catalog.source,
                total: catalog.agents.length,
                agents: catalog.agents,
                honesty_note: 'Bu liste eğitim paneline eklenebilir ajan şablonlarıdır; eklemek gerçek fine-tune yapıldığı anlamına gelmez.',
            }));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 'AM-SRV-012', status: 'ERROR', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/egitim-modulleri' && req.method === 'GET') {
        try {
            const catalog = loadTrainingModules(314);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify({
                status: 'OK',
                source: catalog.source,
                total: catalog.modules.length,
                modules: catalog.modules,
                honesty_note: 'Bu liste eğitim paneline eklenebilir modül şablonlarıdır; eklemek modülün gerçekten eğitildiği anlamına gelmez.',
            }));
        } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 'AM-SRV-013', status: 'ERROR', error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/models' && req.method === 'GET') {
        exec('ollama list', { windowsHide: true }, (err: any, stdout: any) => {
            const apiModels = ["gemini-2.5-flash"];
            const localModels: string[] = [];
            
            if (!err && stdout) {
                const lines = stdout.trim().split('\n').slice(1);
                lines.forEach((line: string) => {
                    const parts = line.split(/\s+/);
                    if (parts.length > 0 && parts[0]) {
                        localModels.push(parts[0]);
                    }
                });
            } else {
                // Fallback local models if Ollama command fails
                localModels.push("qwen2.5:14b", "qwen3.5:latest");
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ local: localModels, api: apiModels }));
        });
        return;
    }

    if (parsedUrl.pathname === '/api/integrate-module' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            try {
                const { code, category, moduleName } = JSON.parse(body);
                if (!code || !moduleName) {
                    res.write(JSON.stringify({ type: 'ERROR', message: 'code veya moduleName eksik' }) + '\n');
                    return res.end();
                }
                const result = await integrateModule(code, category || 'System', moduleName, (msg: string) => {
                    res.write(JSON.stringify({ type: 'PROGRESS', message: msg }) + '\n');
                });
                res.write(JSON.stringify({ type: 'DONE', result }) + '\n');
                res.end();
            } catch(e: any) {
                logger.error('Module Integrate Hatası:', e.message);
                res.write(JSON.stringify({ type: 'ERROR', message: e.message }) + '\n');
                res.end();
            }
        });
        return;
    }

    if (parsedUrl.pathname === '/api/pm2-status') {
        exec('pm2 jlist', { windowsHide: true }, (err: any, stdout: any) => {
            if (err) return res.end('[]');
            try {
                const list = JSON.parse(stdout);
                const engines = list.map((p: any) => ({
                    name: p.name,
                    status: p.pm2_env.status,
                    cpu: p.monit.cpu + '%',
                    memory: (p.monit.memory / 1024 / 1024).toFixed(1) + ' MB'
                }));
                res.end(JSON.stringify(engines));
            } catch(ee) { res.end('[]'); }
        });
        return;
    }

    const MIME_TYPES: any = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.ts': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
    
    let pathname = parsedUrl.pathname || '';
    if (pathname === '/') pathname = '/strategy.html';

    let filePath = '';
    const ext = path.extname(pathname).toLowerCase();

    if (ext === '.html') {
        filePath = path.join(__dirname, '..', 'views', pathname);
    } else if (ext === '.css') {
        filePath = path.join(__dirname, '..', 'public', 'css', pathname);
    } else if (pathname.startsWith('/assets/')) {
        filePath = path.join(__dirname, '..', 'public', pathname);
    } else {
        filePath = path.join(__dirname, '..', pathname);
    }
    
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    if (ext === '.ts' || (ext === '' && fs.existsSync(filePath + '.ts'))) {
        const actualPath = ext === '.ts' ? filePath : filePath + '.ts';
        fs.readFile(actualPath, 'utf8', (err: any, fileContent: any) => {
            if (err) { res.statusCode = 404; res.end('Not Found'); }
            else {
                try {
                    const result = ts.transpileModule(fileContent, {
                        compilerOptions: { 
                            module: ts.ModuleKind.ESNext, 
                            target: ts.ScriptTarget.ES2022,
                            allowImportingTsExtensions: true 
                        }
                    });
                    res.writeHead(200, { 'Content-Type': 'application/javascript' });
                    res.end(result.outputText);
                } catch (e) {
                    logger.error('TS Compilation Error', e);
                    res.statusCode = 500; res.end('TS Compilation Error');
                }
            }
        });
    } else {
        fs.readFile(filePath, (err: any, fileContent: any) => {
            if (err) { res.statusCode = 404; res.end('Not Found'); }
            else { res.writeHead(200, { 'Content-Type': contentType }); res.end(fileContent); }
        });
    }
});

startWebSocketServer(wsPort);
startOllamaService();

server.listen(port, () => { logger.info(`PANEL Started: http://localhost:${port} | WS: ${wsPort}`); });
