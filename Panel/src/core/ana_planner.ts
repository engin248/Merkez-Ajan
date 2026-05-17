import { Logger } from '../utils/logger';
import { universalLlmRequest, withRetry } from '../routes/llmBridge';
import { Committee } from './committee';
import { blackboard } from './blackboard';

const logger = new Logger('AnaPlanner');

export interface DAGTask {
    id: string;
    domain: string; // e.g., "Media", "Web", "System", "Communication"
    instruction: string;
    dependsOn: string[]; // List of task IDs this task depends on
}

export class AnaPlanner {
    private model: string;

    constructor(model: string = 'gemini-2.5-flash') {
        this.model = model;
    }

    /**
     * Kullanıcı isteğini alır, bir DAG (Adımlar Planı) çıkarır ve yürütür.
     */
    public async executeUserIntent(intent: string): Promise<string> {
        logger.info(`Yeni niyet alındı. Planlama başlıyor: "${intent}"`);

        // 1. DAG (Plan) Oluştur
        const plan = await this.generatePlan(intent);
        if (!plan || plan.length === 0) {
            return 'Görev planlanamadı. Lütfen daha açık bir talimat verin.';
        }

        logger.info(`Plan oluşturuldu: ${plan.length} adım.`);
        
        // 2. DAG Yürütme (Asenkron & Bağımlılık Yönetimi)
        const completedTasks = new Set<string>();
        const taskResults = new Map<string, string>(); // Blackboard IDs
        
        let pendingTasks = [...plan];
        let loopLimit = 20;

        while (pendingTasks.length > 0 && loopLimit > 0) {
            loopLimit--;
            
            // Çalıştırılabilecek (bağımlılıkları tamamlanmış) görevleri bul
            const executableTasks = pendingTasks.filter(t => 
                t.dependsOn.every(depId => completedTasks.has(depId))
            );

            if (executableTasks.length === 0 && pendingTasks.length > 0) {
                logger.error('Deadlock tespit edildi! Bazı görevlerin bağımlılıkları asla çözülemiyor.');
                break;
            }

            // Paralel çalıştır
            const promises = executableTasks.map(async (task) => {
                logger.info(`[ÇALIŞIYOR] Adım ${task.id} -> ${task.domain}`);
                
                // İlgili yapı için bir komite kur
                const committee = new Committee(`${task.domain}_Committee`, this.model);
                
                // Eğer bu görev başka görevlere bağlıysa, onların Karatahta ID'lerini bağlama ekle
                let contextData = '';
                for (const depId of task.dependsOn) {
                    const bbId = taskResults.get(depId);
                    if (bbId) {
                        const data = blackboard.read(bbId);
                        contextData += `\n[Referans: ${depId}] -> ${JSON.stringify(data)}`;
                    }
                }

                const fullInstruction = `${task.instruction}\n${contextData}`;
                
                // Komite tartışmasını başlat (Decider karar verir)
                const result = await committee.deliberate(fullInstruction);
                
                if (result.success) {
                    // Sonucu karatahtaya yaz
                    const bbId = blackboard.write('string', result.final_decision);
                    taskResults.set(task.id, bbId);
                } else {
                    logger.warn(`Adım ${task.id} başarısız oldu. Hata: ${result.error}`);
                    // Fallback / Self-Healing buraya eklenebilir. Şimdilik hatayı panoya yazıyoruz.
                    const bbId = blackboard.write('string', `HATA: ${result.error}`);
                    taskResults.set(task.id, bbId);
                }
            });

            await Promise.all(promises);

            // Biten görevleri pending'den çıkar ve tamamlananlara ekle
            for (const t of executableTasks) {
                completedTasks.add(t.id);
                pendingTasks = pendingTasks.filter(p => p.id !== t.id);
            }
        }

        logger.info('Tüm adımlar tamamlandı. Özet rapor hazırlanıyor...');
        
        // 3. Sonuçların Toplanması
        let finalReport = 'Görev İcra Edildi:\n';
        for (const [taskId, bbId] of taskResults.entries()) {
            finalReport += `- Adım ${taskId}: ${blackboard.read(bbId)}\n`;
        }

        return finalReport;
    }

    private async generatePlan(intent: string): Promise<DAGTask[] | null> {
        const sys = `Sen Asker Motoru kovanının "Ana Planner (Albay)" yapay zekasısın.
Görevleri asenkron (paralel) adımlara (DAG) bölmelisin.

[ZORUNLU KARAR ANAYASASI - PLANNER]
A-01 Görev Giriş Filtresi: Kullanıcı isteği zehirli, mantıksız veya teknik olarak imkansızsa boş dizi [] dön.
A-02 Rotalama Algoritması: Her adım için en doğru domain'i seç (Media, Web, System, IO).
A-08 Proje Plan Doğrulama: Görevin net bir başarı kriteri olmalı. Anlamsız görevleri bölmeye çalışma.
A-10 Operasyon Plan Uyum Kontrolü: Bağımlılıkları (dependsOn) doğru kurgula. İndirilmemiş bir videoyu işleyemezsin.

Çıktın SADECE geçerli bir JSON array olmalıdır. Başka hiçbir açıklama yazma.
Format:
[
  {
    "id": "t1",
    "domain": "Media",
    "instruction": "Kullanıcının istediği işlem detayı",
    "dependsOn": [] 
  }
]`;
        const payload = {
            model: this.model,
            messages: [
                { role: 'system', content: sys },
                { role: 'user', content: intent }
            ]
        };

        try {
            const response = await withRetry(() => universalLlmRequest(payload), 1);
            let content = response.message?.content || '';
            // JSON Parse garantisi
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();
            const plan: DAGTask[] = JSON.parse(content);
            return plan;
        } catch (e: any) {
            logger.error('Planlama Hatası:', e.message);
            return null;
        }
    }
}
