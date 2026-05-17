import * as fs from 'fs';
import * as path from 'path';
import { createError, extractErrorMessage } from '../utils/errorCodes';

export interface ModuleTool {
    name: string;
    description: string;
    parameters: any;
    execute: (args: any) => Promise<{ success: boolean; output?: string; error?: string }>;
}

export interface SwarmModule {
    id: string;
    name: string;
    category?: string; // e.g. 'Media', 'Communication', 'Web', 'System'
    tools: ModuleTool[];
}

const modules: Map<string, SwarmModule> = new Map();
const toolCache: Map<string, ModuleTool> = new Map();

export async function loadModules() {
    const modulesDir = __dirname;
    modules.clear();
    toolCache.clear();

    if (!fs.existsSync(modulesDir)) return;

    const files = fs.readdirSync(modulesDir);
    for (const dirName of files) {
        if (dirName === 'registry.ts' || dirName === 'registry.js') continue;
        
        try {
            const modPath = path.join(modulesDir, dirName);
            const stat = fs.statSync(modPath);
            
            if (!stat.isDirectory()) continue;
            
            let swarmMod: SwarmModule = {
                id: `mod_${dirName}`,
                name: dirName.charAt(0).toUpperCase() + dirName.slice(1),
                category: 'System',
                tools: []
            };

            const indexPathTs = path.join(modPath, 'index.ts');
            const indexPathJs = path.join(modPath, 'index.js');
            let hasIndex = false;
            
            if (fs.existsSync(indexPathTs) || fs.existsSync(indexPathJs)) {
                const indexPath = fs.existsSync(indexPathTs) ? indexPathTs : indexPathJs;
                delete require.cache[require.resolve(indexPath)];
                const loadedMod = require(indexPath);
                const explicitMod = loadedMod.default || loadedMod;
                if (explicitMod && explicitMod.id) {
                    swarmMod = { ...explicitMod };
                    if (!swarmMod.tools) swarmMod.tools = [];
                    hasIndex = true;
                }
            }

            // Dizin altındaki tüm dosyaları (ts/js) tara ve araçları topla
            const toolFiles = fs.readdirSync(modPath);
            for (const tFile of toolFiles) {
                if (!tFile.endsWith('.ts') && !tFile.endsWith('.js')) continue;
                // Index doyasında tool array'i verilmişse ve içindekiler yetiyorsa ama biz yine de tarıyoruz.
                // Çakışma olmaması için isme göre bakacağız.
                const tFilePath = path.join(modPath, tFile);
                delete require.cache[require.resolve(tFilePath)];
                const exported = require(tFilePath);
                
                // Export edilen her şeye bak, eğer ModuleTool yapısındaysa ekle
                for (const key in exported) {
                    const item = exported[key];
                    if (item && item.name && item.description && item.parameters && typeof item.execute === 'function') {
                        // Eğer bu tool zaten index.ts üzerinden eklenmemişse listeye al:
                        if (!swarmMod.tools.find(t => t.name === item.name)) {
                            swarmMod.tools.push(item as ModuleTool);
                        }
                    }
                }
            }
            
            if (swarmMod.tools.length > 0) {
                modules.set(swarmMod.id, swarmMod);
                for (const tool of swarmMod.tools) {
                    toolCache.set(tool.name, tool);
                }
                console.log(`[REGISTRY] Modül yüklendi: ${swarmMod.name} (${swarmMod.tools.length} araç)`);
            }
        } catch (e) {
            console.error(createError('REG_LOAD_FAILED', `${dirName}: ${extractErrorMessage(e)}`, e).message);
        }
    }
}

export function getDynamicToolDefinitions() {
    const defs: any[] = [];
    for (const tool of toolCache.values()) {
        defs.push({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        });
    }
    return defs;
}

export function getFilteredToolDefinitions(allowedCategories: string[]) {
    const defs: any[] = [];
    for (const mod of modules.values()) {
        // Eğer modülün kategorisi, izin verilen kategoriler içindeyse veya modül kategorisizse (güvenlik payı)
        if (!mod.category || allowedCategories.includes(mod.category)) {
            for (const tool of mod.tools) {
                defs.push({
                    type: 'function',
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                });
            }
        }
    }
    return defs;
}

export async function executeDynamicTool(name: string, args: any) {
    const tool = toolCache.get(name);
    if (!tool) return null; // Registry'de yoksa null döner
    try {
        console.log(`[REGISTRY] Araç çalıştırılıyor: ${name}`);
        return await tool.execute(args);
    } catch (e: any) {
        return { success: false, error: createError('TOOL_EXEC_FAILED', `${name}: ${(e as Error).message}`, e).message };
    }
}

export function getAllModules() {
    const result: any[] = [];
    for (const mod of modules.values()) {
        result.push({
            id: mod.id,
            name: mod.name,
            category: mod.category || 'System',
            tools: mod.tools.map(t => ({ name: t.name, description: t.description }))
        });
    }
    return result;
}

// Sisteme ilk yüklemede modülleri tarar
try {
    loadModules();
} catch (e) {}
