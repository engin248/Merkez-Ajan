import { WebSocketServer } from 'ws';
import { exec } from 'child_process';
import { Logger, subscribeToLogs } from '../utils/logger';

const logger = new Logger('WebSocket');
export let wss: WebSocketServer | null = null;

export function broadcastLog(logData: any) {
    if (wss) {
        wss.clients.forEach(client => {
            if (client.readyState === 1 /* WebSocket.OPEN */) {
                client.send(JSON.stringify({ topic: 'SYSTEM_LOG', payload: logData }));
            }
        });
    }
}

export function startWebSocketServer(wsPort: number) {
    wss = new WebSocketServer({ port: wsPort });
    
    // Subscribe logger to this broadcast function
    subscribeToLogs(broadcastLog);
    
    logger.info(`WebSocket Server started on port ${wsPort}`);

    wss.on('connection', (ws: any) => {
        logger.info('Browser connected to Telemetry Bridge');

        const sendUpdate = () => {
            const startTime = Date.now();
            exec('pm2 jlist', { windowsHide: true }, (err: any, stdout: any) => {
                if (!err) {
                    try {
                        const list = JSON.parse(stdout);
                        const processes = list.map((p: any) => ({
                            name: p.name,
                            status: p.pm2_env.status,
                            cpu: p.monit?.cpu || 0,
                            mem: Math.round((p.monit?.memory || 0) / 1024 / 1024)
                        }));
                        ws.send(JSON.stringify({ topic: 'PM2_TELEMETRY', payload: processes }));
                        logger.trace('PM2 Telemetry sent', { durationMs: Date.now() - startTime });
                    } catch (e) {
                        logger.error("Telemetry Error: " + (e as any).message);
                    }
                }
            });
        };

        const interval = setInterval(sendUpdate, 3000);

        ws.on('close', () => {
            logger.info('Browser disconnected from Telemetry Bridge');
            clearInterval(interval);
        });
    });
}
