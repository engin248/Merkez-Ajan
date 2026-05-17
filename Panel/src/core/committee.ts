import { Logger } from '../utils/logger';
import { universalLlmRequest, withRetry } from '../routes/llmBridge';
import { blackboard } from './blackboard';

const logger = new Logger('Committee');

export interface CommitteeResult {
    success: boolean;
    final_decision: string;
    action_taken?: boolean;
    tool_calls?: any[];
    error?: string;
}

export class Committee {
    private domainName: string;
    private model: string;

    constructor(domainName: string, model: string = 'gemini-2.5-flash') {
        this.domainName = domainName;
        this.model = model;
    }

    /**
     * Komite içi otonom tartışmayı başlatır ve kararı döner.
     */
    public async deliberate(taskDescription: string, contextId?: string): Promise<CommitteeResult> {
        logger.info(`[${this.domainName}] Komite tartışması başladı. Görev: ${taskDescription}`);
        
        // 1. Proposer (Tasarımcı)
        const proposal = await this.askProposer(taskDescription, contextId);
        if (!proposal) return { success: false, final_decision: '', error: 'Proposer fikir üretemedi.' };
        logger.info(`[${this.domainName}-Proposer] Öneri: ${proposal.substring(0, 100)}...`);

        // 2. Critic (Eleştirmen)
        const critique = await this.askCritic(taskDescription, proposal);
        if (!critique) return { success: false, final_decision: '', error: 'Critic değerlendirme yapamadı.' };
        logger.info(`[${this.domainName}-Critic] Eleştiri: ${critique.substring(0, 100)}...`);

        // 3. Decider (Hakem)
        const decision = await this.askDecider(taskDescription, proposal, critique);
        if (!decision) return { success: false, final_decision: '', error: 'Decider karar veremedi.' };
        logger.info(`[${this.domainName}-Decider] Karar: ${decision.substring(0, 100)}...`);

        return {
            success: true,
            final_decision: decision
        };
    }

    private async callLLM(systemPrompt: string, userPrompt: string): Promise<string | null> {
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]
        };

        try {
            const response = await withRetry(() => universalLlmRequest(payload), 2, 2000);
            return response.message?.content || null;
        } catch (e: any) {
            logger.error(`[${this.domainName}] LLM Çağrı Hatası:`, e.message);
            return null;
        }
    }

    private async askProposer(task: string, contextId?: string): Promise<string | null> {
        let contextData = '';
        if (contextId) {
            const data = blackboard.read(contextId);
            contextData = data ? `\nKaratahta Verisi (ID: ${contextId}): ${JSON.stringify(data)}` : '';
        }

        const sys = `Sen ${this.domainName} Komitesinin Tasarımcı (Proposer) ajanısın.
Görevleri çözerken şu [ZORUNLU KARAR ANAYASASI]'na uymalısın:
A-03 Alan Bağımsızlık: Sadece "${this.domainName}" yetkilerin dahilinde çözüm üret. Diğer alanlara müdahale etme.
A-04 Alternatif Üretim: Tek bir çözüme saplanma, en az 2 alternatif yöntem sun.
A-09 Teknoloji Seçimi: Hangi sistem aracını veya parametreyi neden seçtiğini açıkla.`;
        const user = `Görev: ${task}${contextData}\nÇözüm önerin nedir?`;
        return this.callLLM(sys, user);
    }

    private async askCritic(task: string, proposal: string): Promise<string | null> {
        const sys = `Sen ${this.domainName} Komitesinin Eleştirmen (Critic) ajanısın. 
[ZORUNLU KARAR ANAYASASI]
A-05 Tez-Antitez Dengesi: Tasarımcının önerdiği çözüme "Şeytanın Avukatlığını" yap. Olası fatal (ölümcül) riskleri veya çökmeleri bul.
A-11 Sapma Dedektörü: Öneri, kullanıcının orijinal hedefinden sapmış mı kontrol et.
A-03 Alan Bağımsızlık: Önerilen işlem yetki sınırlarını aşıyor mu denetle.
Eğer riskler kabul edilemez ise şiddetle reddet, risk yoksa onay ver.`;
        const user = `Görev: ${task}\nTasarımcının Önerisi: ${proposal}\nEleştirilerin nelerdir?`;
        return this.callLLM(sys, user);
    }

    private async askDecider(task: string, proposal: string, critique: string): Promise<string | null> {
        const sys = `Sen ${this.domainName} Komitesinin Hakem (Decider) ajanısın.
[ZORUNLU KARAR ANAYASASI]
A-06 Puanlama Matrisi: Tasarımcının önerisini hız, stabilite ve hata riskine göre değerlendir.
A-07 Ağırlıklı Sentez: Eleştirmenin uyarılarını dikkate alarak öneriyi iyileştir/sentezle.
A-13 Uzman Panel Kararı: Tasarımcı ve Eleştirmenin zıt düştüğü durumlarda nihai kararı ver.
A-14 Final Onay: Sonucun kesin, net ve doğrudan kod/araç tarafından işlenebilir bir formatta olduğundan emin ol. Asla "Şunu yapmalıyız" deme, kararı yaz ve bitir.`;
        const user = `Görev: ${task}\nTasarımcı: ${proposal}\nEleştirmen: ${critique}\nNihai Kararın nedir?`;
        return this.callLLM(sys, user);
    }
}
