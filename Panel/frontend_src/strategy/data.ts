export const MODEL_NODE_MAP = {
  'qwen3:8b': 'qwen',
  'qwen2.5': 'qwen',
  'gemma4': 'gemma',
  'gemma3': 'gemma',
  'qwen3.5': 'qwen3',
  'qwen3': 'qwen3',
  'kimi-k2.5': 'kimi',
  'qwen3.5:cloud': 'qwenC',
  'glm-5.1': 'glm',
  'glm-5.1:cloud': 'glm',
  'minimax-m2.7': 'minimax',
  'minimax-m2.7:cloud': 'minimax',
};

export function modelToNodeId(modelName: string): string | null {
  if (!modelName) return null;
  const lower = modelName.toLowerCase();
  if ((MODEL_NODE_MAP as any)[lower]) return (MODEL_NODE_MAP as any)[lower];
  for (const [key, nodeId] of Object.entries(MODEL_NODE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return nodeId;
  }
  return null;
}

export const SKILL_CATALOG = {
  'PC Kontrol & İşletim Sistemi': [
    'Uygulama Başlatma', 'Dosya Sistemi Gezgini', 'Fare & Klavye Emülasyonu',
    'Pencere Yönetimi', 'Ekran Okuma & Yorumlama', 'UI Eleman Tanıma',
    'Masaüstü Operatör', 'Çoklu Ekran Koordinasyonu', 'Sistem Komutu Çalıştırma',
    'PM2 Süreç İzleme', 'Otomatik Restart & Failover'
  ],
  'Web & Tarayıcı': [
    'URL Açma', 'Web Gezgini Otonomisi', 'Web Crawler',
    'API Sources', 'Dinamik Form Doldurucu', 'Web Scraping',
    'Canlı Yayın Analizi', 'Arama Motoru Sorgusu'
  ],
  'Ses & Konuşma': [
    'STT Engine (Ses→Metin)', 'TTS Engine (Metin→Ses)', 'RVC Ses Dönüştürme',
    'Edge-TTS Fallback', 'Sesli Komut Kuyruğu', 'Ses Sentezi',
    'VAD (Ses Aktivite Algılama)', 'Konuşma Tanıma'
  ],
  'Siber Güvenlik': [
    'Anomali Tespit Radarı', 'Sıfır Güven Mimarisi (ZTA)', 'Bilişsel Güvenlik Duvarı',
    'Zararlı Yazılım İmha', 'Adversarial Sağlamlık', 'Penetrasyon Testi',
    'Kriptografik Kimlik Doğrulama', 'Veri Sızıntısı Önleme (DLP)',
    'Siber Adli Tıp', 'Akıllı Karantina'
  ],
  'Yönetim & Koordinasyon': [
    'Görev Yönetimi', 'Karar Motoru', 'Koordinasyon', 'Planlama',
    'Risk Analizi', 'Optimizasyon', 'Strateji', 'Görev Bölümleme',
    'Lider Seçimi', 'Çoklu Ajan Koordinasyonu', 'Bütünlük Denetimi'
  ],
  'Kod & Geliştirme': [
    'Code Gen', 'Debug & Fix', 'Architecture', 'Refactoring',
    'Test Otomasyon', 'API Geliştirme', 'Kendi Kendini Yaratan Kod',
    'Hata Ayıklama Görselleştirme'
  ],
  'Analiz & Veri': [
    'Veri Analizi', 'Rapor', 'Pattern Rec.', 'Araştırma',
    'Hipotez Test', 'Paper Analiz', 'İstatistik',
    'OCR & Belge Analizi', 'Sosyal Duygu Analizi', 'Görüntü İşleme'
  ],
  'İçerik & İletişim': [
    'İçerik Üretimi', 'Çeviri', 'Özetleme', 'Quick Query',
    'Fact Check', 'Real-time Yanıt', 'Doğal Dil İşleme',
    'Kullanıcı Niyeti Tahminleme'
  ],
  'Altyapı & Sistem': [
    'Ollama Server', 'ZMQ Bridge', 'WebSocket Telemetri',
    'Local DB', 'Bellek Yönetimi', 'Hafıza Budama',
    'Otonom Düğüm Kurtarma', 'Kaynak Tahsisi', 'VRAM Optimizasyonu'
  ],
  'Dünya Modeli & Ekonomi': [
    'Pazar Trend Analizi', 'Finansal Tahmin', 'Lojistik Optimizasyon',
    'Tedarik Zinciri Yönetimi', 'Jeopolitik Risk Analizi',
    'Otonom Ticaret', 'Portföy Dengeleme', 'Enerji Verimlilik'
  ]
};

export const RANK_LABELS = {
  core: { name: 'ANA KOMUTA', text: 'Ana Komuta Ajanı', desc: 'Tüm ajanları merkezi yönetir' },
  manager: { name: 'YÖNETİCİ', text: 'Yönetici Ajan', desc: 'Alt ajanları yönetir, model çalıştırır' },
  worker: { name: 'İŞÇİ', text: 'İşçi Ajan', desc: 'Tekil görevleri yürütür' }
};

export function getNodeRank(node: any): string {
  if (node.id === 'core') return 'core';
  if (node.r >= 18) return 'manager';
  return 'worker';
}

export const NODES: any[] = [
  // CENTER
  { id:'core', label:'ASKER MOTORU', sub:'Merkez Komuta AI', x:0, y:0, r:50, color:'#b800ff', type:'hex', model:'qwen3:8b', children:['qwen','gemma','qwen3','kimi','qwenC','glm','minimax','voice','data','infra'] },
  // 7 AI Models
  { id:'qwen', label:'QWEN 3', sub:'Merkez Beyin', x:-120, y:-260, r:22, color:'#ff4444', type:'mesh', model:'qwen3:8b', parent:'core',
    children:['qwen_task','qwen_decide','qwen_coord'],
    info:['ROLE: Merkez Koordinasyon','STATUS: AKTİF','MODEL: qwen3:8b'] },
  { id:'gemma', label:'GEMMA 4', sub:'Kod Üretimi', x:200, y:-220, r:22, color:'#00d4ff', type:'particles', model:'gemma4', parent:'core',
    children:['gem_code','gem_debug','gem_arch'],
    info:['ROLE: Code Generation','STATUS: STANDBY','MODEL: gemma4'] },
  { id:'qwen3', label:'QWEN 3.5', sub:'Analiz Motoru', x:320, y:-40, r:22, color:'#0af5c2', type:'rings', model:'qwen3.5', parent:'core',
    children:['q3_data','q3_report','q3_pattern'],
    info:['ROLE: Data Analysis','STATUS: STANDBY','MODEL: qwen3.5'] },
  { id:'kimi', label:'KIMI K2.5', sub:'Derin ArGe', x:260, y:180, r:22, color:'#b800ff', type:'mesh', model:'kimi-k2.5:cloud', parent:'core',
    children:['kimi_research','kimi_hypo','kimi_paper'],
    info:['ROLE: Deep Research','STATUS: STANDBY','MODEL: kimi-k2.5:cloud'] },
  { id:'qwenC', label:'QWEN CLOUD', sub:'Genel Operasyon', x:-30, y:280, r:22, color:'#ff9800', type:'particles', model:'qwen3.5:cloud', parent:'core',
    children:['qc_content','qc_translate','qc_summary'],
    info:['ROLE: General Ops','STATUS: ONLINE','MODEL: qwen3.5:cloud'] },
  { id:'glm', label:'GLM 5.1', sub:'Strateji', x:-280, y:160, r:22, color:'#ffd700', type:'mesh', model:'glm-5.1:cloud', parent:'core',
    children:['glm_plan','glm_risk','glm_opt'],
    info:['ROLE: Strategy','STATUS: ONLINE','MODEL: glm-5.1:cloud'] },
  { id:'minimax', label:'MINIMAX', sub:'Hızlı Yanıt', x:-300, y:-80, r:22, color:'#ff00ff', type:'rings', model:'minimax-m2.7:cloud', parent:'core',
    children:['mm_query','mm_fact','mm_rt'],
    info:['ROLE: Quick Response','STATUS: ONLINE','MODEL: minimax-m2.7:cloud'] },
  // Systems
  { id:'voice', label:'SES SİSTEMİ', sub:'Voice Engine', x:-400, y:-200, r:18, color:'#00ff88', type:'rings', parent:'core',
    children:['v_stt','v_tts','v_rvc'],
    info:['MODULE: Voice Pipeline','LATENCY: 120ms','STATUS: AKTİF'] },
  { id:'data', label:'VERİ KAYNAKLARI', sub:'Global Data Feed', x:440, y:120, r:18, color:'#00d4ff', type:'particles', parent:'core',
    children:['d_web','d_api','d_local'],
    info:['MODULE: Data Sources','FEEDS: 142 nodes','BANDWIDTH: 2.4 TB/s'] },
  { id:'infra', label:'ALTYAPI', sub:'Infrastructure', x:0, y:-380, r:18, color:'#8090a0', type:'mesh', parent:'core',
    children:['inf_ollama','inf_zmq','inf_pm2'],
    info:['MODULE: Core Infra','UPTIME: 99.7%','SERVICES: 5'] },
  // Leaf nodes
  { id:'qwen_task', label:'Görev Yönetimi', x:-220, y:-340, r:10, color:'#ff4444', type:'dot', parent:'qwen' },
  { id:'qwen_decide', label:'Karar Motoru', x:-80, y:-380, r:10, color:'#ff4444', type:'dot', parent:'qwen' },
  { id:'qwen_coord', label:'Koordinasyon', x:-180, y:-420, r:10, color:'#ff4444', type:'dot', parent:'qwen' },
  { id:'gem_code', label:'Code Gen', x:300, y:-340, r:10, color:'#00d4ff', type:'dot', parent:'gemma' },
  { id:'gem_debug', label:'Debug & Fix', x:380, y:-260, r:10, color:'#00d4ff', type:'dot', parent:'gemma' },
  { id:'gem_arch', label:'Architecture', x:160, y:-360, r:10, color:'#00d4ff', type:'dot', parent:'gemma' },
  { id:'q3_data', label:'Veri Analizi', x:460, y:-100, r:10, color:'#0af5c2', type:'dot', parent:'qwen3' },
  { id:'q3_report', label:'Rapor', x:480, y:20, r:10, color:'#0af5c2', type:'dot', parent:'qwen3' },
  { id:'q3_pattern', label:'Pattern Rec.', x:420, y:-160, r:10, color:'#0af5c2', type:'dot', parent:'qwen3' },
  { id:'kimi_research', label:'Araştırma', x:380, y:260, r:10, color:'#b800ff', type:'dot', parent:'kimi' },
  { id:'kimi_hypo', label:'Hipotez Test', x:320, y:320, r:10, color:'#b800ff', type:'dot', parent:'kimi' },
  { id:'kimi_paper', label:'Paper Analiz', x:200, y:300, r:10, color:'#b800ff', type:'dot', parent:'kimi' },
  { id:'qc_content', label:'İçerik', x:-140, y:370, r:10, color:'#ff9800', type:'dot', parent:'qwenC' },
  { id:'qc_translate', label:'Çeviri', x:60, y:400, r:10, color:'#ff9800', type:'dot', parent:'qwenC' },
  { id:'qc_summary', label:'Özetleme', x:-60, y:420, r:10, color:'#ff9800', type:'dot', parent:'qwenC' },
  { id:'glm_plan', label:'Planlama', x:-400, y:240, r:10, color:'#ffd700', type:'dot', parent:'glm' },
  { id:'glm_risk', label:'Risk Analizi', x:-360, y:100, r:10, color:'#ffd700', type:'dot', parent:'glm' },
  { id:'glm_opt', label:'Optimizasyon', x:-440, y:180, r:10, color:'#ffd700', type:'dot', parent:'glm' },
  { id:'mm_query', label:'Quick Query', x:-420, y:-160, r:10, color:'#ff00ff', type:'dot', parent:'minimax' },
  { id:'mm_fact', label:'Fact Check', x:-380, y:-20, r:10, color:'#ff00ff', type:'dot', parent:'minimax' },
  { id:'mm_rt', label:'Real-time', x:-460, y:-80, r:10, color:'#ff00ff', type:'dot', parent:'minimax' },
  { id:'v_stt', label:'STT Engine', x:-500, y:-280, r:10, color:'#00ff88', type:'dot', parent:'voice' },
  { id:'v_tts', label:'TTS Engine', x:-480, y:-140, r:10, color:'#00ff88', type:'dot', parent:'voice' },
  { id:'v_rvc', label:'RVC Pipeline', x:-540, y:-200, r:10, color:'#00ff88', type:'dot', parent:'voice' },
  { id:'d_web', label:'Web Crawler', x:560, y:60, r:10, color:'#00d4ff', type:'dot', parent:'data' },
  { id:'d_api', label:'API Sources', x:540, y:200, r:10, color:'#00d4ff', type:'dot', parent:'data' },
  { id:'d_local', label:'Local DB', x:580, y:140, r:10, color:'#00d4ff', type:'dot', parent:'data' },
  { id:'inf_ollama', label:'Ollama Server', x:-100, y:-460, r:10, color:'#8090a0', type:'dot', parent:'infra' },
  { id:'inf_zmq', label:'ZMQ Bridge', x:100, y:-460, r:10, color:'#8090a0', type:'dot', parent:'infra' },
  { id:'inf_pm2', label:'PM2 Monitor', x:0, y:-500, r:10, color:'#8090a0', type:'dot', parent:'infra' },
  { id:'depot', label:'EĞİTİM HAFIZASI', sub:'Ajan Bellek Merkezi', x:-450, y:400, r:30, color:'#b080ff', type:'depot', parent:'core',
    info:['MODULE: Training Memory','CAPACITY: 2048 MB','STATUS: LEARNING'] },
];

export const EDGES: any[] = [];
NODES.forEach(n => { if (n.parent) { EDGES.push({ from: n.parent, to: n.id, color: n.color }); }});
