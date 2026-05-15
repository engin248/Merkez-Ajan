import * as http from 'http';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as db from './db';
import * as ts from 'typescript';
import { handleChatRoute } from './routes/chatHandler';
import { 
    startZMQBridge, 
    cleanupProcesses, 
    scheduleZMQRestart, 
    sendToZmq, 
    startOllamaService,
    startVoiceEngine,
    startRVCServer
} from './server/process_manager';
import { startWebSocketServer } from './server/ws_handler';
import { Logger } from './utils/logger';

const logger = new Logger('Server');

const port = 8085;
const wsPort = 8086;

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
        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const metin = parsed.metin || "Emredersiniz.";
                
                const payload = JSON.stringify({ text: metin }) + '\n';
                const success = sendToZmq(payload);
                if (success) {
                    res.end(JSON.stringify({ durum: 'OK', mesaj: 'Kuyruğa eklendi' }));
                } else {
                    res.end(JSON.stringify({ durum: 'HATA', neden: 'ZMQ Buffer Dolu veya Köprü Çökmüş.' }));
                }
            } catch(e: any) { 
                logger.error('Konuşma API Hatası:', e.message);
                res.end(JSON.stringify({ durum: 'HATA', neden: e.message })); 
            }
        });
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
            res.end(JSON.stringify({ error: e.message }));
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
                res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
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
                res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ connected: false, error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
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
                res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
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
                res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
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
            res.end(JSON.stringify({ error: e.message }));
        }
        return;
    }

    if (parsedUrl.pathname === '/api/healthcheck' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
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
startZMQBridge();
startVoiceEngine();
startRVCServer();

server.listen(port, () => { logger.info(`PANEL Started: http://localhost:${port} | WS: ${wsPort}`); });
