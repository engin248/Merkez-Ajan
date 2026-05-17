const { exec } = require('child_process');

/**
 * ══════════════════════════════════════════════════════════════
 *  AGENT ACTIONS // PC CONTROL MODULE
 *  Burada yapay zekanın bilgisayarınızda çalıştırabileceği 
 *  komutlar (Browser açma, uygulama başlatma vs.) tanımlanır.
 * ══════════════════════════════════════════════════════════════
 */

class AgentActions {
    // 1. Tarayıcıyı aç ve istenen siteye git
    static openBrowser(url: string) {
        if(!url) return;
        if (!url.startsWith('http')) url = 'https://' + url;
        console.log(`[ACTION] Tarayıcı açılıyor: ${url}`);
        // Windows için varsayılan tarayıcıda açar
        exec(`start "" "${url}"`, (err: any) => {
            if (err) console.error("[ACTION ERROR] Tarayıcı açılamadı:", err);
        });
        return `Tarayıcıda ${url} adresi açıldı.`;
    }

    // 2. Bir programı başlat (Örn: notepad, calc, vs.)
    static launchApp(appName: string) {
        if(!appName) return;
        console.log(`[ACTION] Uygulama başlatılıyor: ${appName}`);
        exec(`start ${appName}`, (err: any) => {
            if (err) console.error("[ACTION ERROR] Uygulama açılamadı:", err);
        });
        return `${appName} uygulaması başlatıldı.`;
    }

    // LLM'den dönen gizli komutu çalıştırır
    static executeAction(actionType: string, actionData: string) {
        if (actionType === 'OPEN_URL') {
            return this.openBrowser(actionData);
        } else if (actionType === 'OPEN_APP') {
            return this.launchApp(actionData);
        }
        return null;
    }
}

export default AgentActions;
