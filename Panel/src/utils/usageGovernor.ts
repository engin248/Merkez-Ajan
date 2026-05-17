import * as fs from 'fs';
import * as path from 'path';

export type SavingsEventType =
    | 'intercept'
    | 'router_skipped'
    | 'router_called'
    | 'main_call'
    | 'cloud_fallback_blocked'
    | 'tool_call'
    | 'response'
    | 'loop_detected';

export interface SavingsPolicy {
    enabled: boolean;
    mode: 'tasarruf' | 'balanced';
    maxHistoryMessages: number;
    maxStoredHistoryMessages: number;
    mainNumPredict: number;
    routerNumPredict: number;
    numCtx: number;
    keepAlive: string;
    maxToolRounds: number;
    useRouterOnlyWhenNeeded: boolean;
    preferLocalRouterModel: boolean;
    localRouterModel: string;
    allowCloudFallback: boolean;
    systemReminder: string;
}

const PANEL_ROOT = path.resolve(__dirname, '..', '..');
const POLICY_FILE = path.join(PANEL_ROOT, 'KREDI_TASARRUF_POLITIKASI.json');
const LOG_FILE = path.join(PANEL_ROOT, 'KREDI_TASARRUF_LOG.jsonl');

const DEFAULT_POLICY: SavingsPolicy = {
    enabled: true,
    mode: 'tasarruf',
    maxHistoryMessages: 10,
    maxStoredHistoryMessages: 30,
    mainNumPredict: 512,
    routerNumPredict: 12,
    numCtx: 4096,
    keepAlive: '30m',
    maxToolRounds: 3,
    useRouterOnlyWhenNeeded: true,
    preferLocalRouterModel: true,
    localRouterModel: 'qwen2.5:latest',
    allowCloudFallback: false,
    systemReminder: 'Kredi tasarruf modu aktif: kisa ve net cevap ver, araclari yalnizca gerekliyse kullan, ayni isi tekrarlama, once yerel ve mevcut bilgiyi degerlendir.',
};

function clampNumber(value: any, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function normalizePolicy(raw: any): SavingsPolicy {
    const merged = { ...DEFAULT_POLICY, ...(raw || {}) };
    return {
        ...merged,
        enabled: merged.enabled !== false,
        mode: merged.mode === 'balanced' ? 'balanced' : 'tasarruf',
        maxHistoryMessages: clampNumber(merged.maxHistoryMessages, DEFAULT_POLICY.maxHistoryMessages, 2, 30),
        maxStoredHistoryMessages: clampNumber(merged.maxStoredHistoryMessages, DEFAULT_POLICY.maxStoredHistoryMessages, 10, 80),
        mainNumPredict: clampNumber(merged.mainNumPredict, DEFAULT_POLICY.mainNumPredict, 128, 2048),
        routerNumPredict: clampNumber(merged.routerNumPredict, DEFAULT_POLICY.routerNumPredict, 6, 64),
        numCtx: clampNumber(merged.numCtx, DEFAULT_POLICY.numCtx, 2048, 8192),
        maxToolRounds: clampNumber(merged.maxToolRounds, DEFAULT_POLICY.maxToolRounds, 1, 8),
        keepAlive: String(merged.keepAlive || DEFAULT_POLICY.keepAlive),
        localRouterModel: String(merged.localRouterModel || DEFAULT_POLICY.localRouterModel),
        systemReminder: String(merged.systemReminder || DEFAULT_POLICY.systemReminder),
    };
}

export function getSavingsPolicy(): SavingsPolicy {
    try {
        if (!fs.existsSync(POLICY_FILE)) {
            fs.writeFileSync(POLICY_FILE, JSON.stringify(DEFAULT_POLICY, null, 2), 'utf8');
            return DEFAULT_POLICY;
        }
        return normalizePolicy(JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')));
    } catch {
        return DEFAULT_POLICY;
    }
}

export function getSavingsStatus() {
    const policy = getSavingsPolicy();
    return {
        status: policy.enabled ? 'ACTIVE' : 'DISABLED',
        policy,
        policyFile: POLICY_FILE,
        logFile: LOG_FILE,
        serverTime: new Date().toISOString(),
        note: 'Bu yerel tasarruf katmani token, gecmis, arac ve bulut yedek kullanimini azaltir; dis servislerin kendi zaman/kredi limitlerini kaldirmaz.',
    };
}

export function trimHistoryForRequest(history: any[], content: string, policy = getSavingsPolicy()) {
    if (!policy.enabled) return history.slice(0, -1).concat([{ role: 'user', content }]);
    const previous = history.slice(0, -1).slice(-policy.maxHistoryMessages);
    return previous.concat([{ role: 'user', content }]);
}

export function trimStoredHistory(history: any[], policy = getSavingsPolicy()) {
    const limit = policy.enabled ? policy.maxStoredHistoryMessages : DEFAULT_POLICY.maxStoredHistoryMessages;
    while (history.length > limit) history.shift();
}

export function applySavingsToPayload(payload: any, role: 'main' | 'router' = 'main', policy = getSavingsPolicy()) {
    if (!policy.enabled) return payload;
    return {
        ...payload,
        keep_alive: role === 'router' ? undefined : policy.keepAlive,
        options: {
            ...(payload.options || {}),
            num_predict: role === 'router' ? policy.routerNumPredict : policy.mainNumPredict,
            num_ctx: policy.numCtx,
        },
    };
}

export function isCloudModel(model: string) {
    return /gemini|cloud|api/i.test(String(model || ''));
}

export function getRouterModel(selectedModel: string, policy = getSavingsPolicy()) {
    if (!policy.enabled || !policy.preferLocalRouterModel) return selectedModel;
    return isCloudModel(selectedModel) ? policy.localRouterModel : selectedModel;
}

export function shouldUseRouter(content: string, policy = getSavingsPolicy()) {
    if (!policy.enabled || !policy.useRouterOnlyWhenNeeded) return true;
    return /(a[cç]|a[cç]ar|site|web|internet|ara|google|youtube|whatsapp|mesaj|ekran|fare|tikla|t[ıi]kla|klavye|yaz|dosya|klas[oö]r|sistem|uygulama|komut|powershell|bilgisayar|pc|harita|mail|g[oö]nder)/i.test(content);
}

export function guessCategories(content: string): string[] | undefined {
    const categories = new Set<string>();
    if (/(web|internet|ara|google|site|sayfa|haber|fiyat)/i.test(content)) categories.add('Web');
    if (/(youtube|video|medya|ses|g[oö]rsel)/i.test(content)) categories.add('Media');
    if (/(whatsapp|mesaj|mail|e-?posta|g[oö]nder)/i.test(content)) categories.add('Communication');
    if (/(ekran|fare|t[ıi]kla|klavye|dosya|klas[oö]r|sistem|uygulama|komut|powershell|pc|bilgisayar)/i.test(content)) categories.add('System');
    return categories.size ? Array.from(categories) : undefined;
}

export function recordSavingsEvent(type: SavingsEventType, details: Record<string, any> = {}) {
    try {
        const line = JSON.stringify({ timestamp: new Date().toISOString(), type, ...details });
        fs.appendFileSync(LOG_FILE, line + '\n', 'utf8');
    } catch {}
}
