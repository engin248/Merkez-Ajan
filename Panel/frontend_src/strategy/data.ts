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
  { id:'core', label:'ASKER MOTORU', sub:'Merkez Komuta AI', x:0, y:0, r:50, color:'#b800ff', type:'hex', model:'qwen3:8b', children:['youtube','whatsapp','web_search'] },
  
  // Local Modules
  { id:'youtube', label:'YouTube Otonom Entegrasyon', sub:'Media', x:-150, y:-100, r:18, color:'#ff0000', type:'rings', parent:'core',
    children:['yt_islem'],
    info:['MODULE: YouTube','STATUS: AKTİF'] },
  { id:'whatsapp', label:'WhatsApp Otonom Entegrasyon', sub:'Communication', x:150, y:-100, r:18, color:'#25d366', type:'mesh', parent:'core',
    children:['wp_mesaj'],
    info:['MODULE: WhatsApp','STATUS: AKTİF'] },
  { id:'web_search', label:'Gelişmiş Web Arama', sub:'Web', x:0, y:150, r:18, color:'#00aaff', type:'particles', parent:'core',
    children:['web_playwright'],
    info:['MODULE: Web Search','STATUS: AKTİF'] },
    
  // Leaf nodes
  { id:'yt_islem', label:'youtube_islem', x:-200, y:-180, r:10, color:'#ff0000', type:'dot', parent:'youtube' },
  { id:'wp_mesaj', label:'whatsapp_mesaj_gonder', x:200, y:-180, r:10, color:'#25d366', type:'dot', parent:'whatsapp' },
  { id:'web_playwright', label:'playwright_web_ara', x:0, y:230, r:10, color:'#00aaff', type:'dot', parent:'web_search' },
  
  // Storage
  { id:'depot', label:'EĞİTİM HAFIZASI', sub:'Ajan Bellek Merkezi', x:-300, y:200, r:30, color:'#b080ff', type:'depot', parent:'core',
    info:['MODULE: Training Memory','CAPACITY: 2048 MB','STATUS: LEARNING'] }
];

export const EDGES: any[] = [];
NODES.forEach(n => { if (n.parent) { EDGES.push({ from: n.parent, to: n.id, color: n.color }); }});
