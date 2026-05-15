import { NODES } from './data.ts';

export const activityLog: any[] = [];
export let logFilter = 'all';
export const MAX_LOG_ENTRIES = 200;

export const LOG_TAGS: any = {
  status:   { label: 'DURUM', bg: 'rgba(0,255,136,0.1)', color: '#00ff88' },
  action:   { label: 'AKSİYON', bg: 'rgba(0,212,255,0.1)', color: '#00d4ff' },
  sentinel: { label: 'NÖBETÇİ', bg: 'rgba(0,255,200,0.1)', color: '#00ffc8' },
  error:    { label: 'HATA', bg: 'rgba(255,68,68,0.1)', color: '#ff4444' },
  system:   { label: 'SİSTEM', bg: 'rgba(160,120,255,0.1)', color: '#b080ff' },
};

export function logActivity(agentName: string, message: string, type?: string, color?: string) {
  const entry = {
    id: Date.now() + Math.random(),
    agent: agentName,
    message: message,
    type: type || 'action',
    color: color || '#00d4ff',
    time: new Date(),
  };
  activityLog.unshift(entry);
  if (activityLog.length > MAX_LOG_ENTRIES) activityLog.pop();
  updateLogBadge();
  renderLogIfOpen();
}

export function updateLogBadge() {
  const badge = document.getElementById('logBadge');
  if (badge) {
    badge.textContent = activityLog.length.toString();
    badge.dataset.count = activityLog.length.toString();
    badge.style.display = activityLog.length > 0 ? 'flex' : 'none';
  }
}

export function formatTime(date: Date) {
  return date.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

export function renderLogIfOpen() {
  const panel = document.getElementById('activityPanel');
  if (!panel || !panel.classList.contains('open')) return;
  renderLogFeed();
}

export function renderLogFeed() {
  const feed = document.getElementById('activityFeed');
  if (!feed) return;

  const filtered = logFilter === 'all'
    ? activityLog
    : activityLog.filter(e => e.type === logFilter);

  if (filtered.length === 0) {
    feed.innerHTML = '<div class="ap-empty">Henüz kayıt yok</div>';
  } else {
    feed.innerHTML = filtered.map(e => {
      const tag = LOG_TAGS[e.type] || LOG_TAGS.action;
      return `<div class="ap-entry" style="border-left-color: ${e.color}">
        <div class="ap-entry-header">
          <span class="ap-entry-agent" style="color: ${e.color}">${e.agent}</span>
          <span class="ap-entry-time">${formatTime(e.time)}</span>
        </div>
        <div class="ap-entry-msg">${e.message}</div>
        <span class="ap-entry-tag" style="background:${tag.bg};color:${tag.color}">${tag.label}</span>
      </div>`;
    }).join('');
  }

  const totalEl = document.getElementById('apStatTotal');
  const activeEl = document.getElementById('apStatActive');
  if (totalEl) totalEl.textContent = activityLog.length + ' kayıt';
  if (activeEl) activeEl.textContent = NODES.filter(n => n.status === 'active').length + ' aktif';
}

export const AGENT_ACTIONS: any = {
  'qwen': ['Görev analizi yapılıyor', 'Koordinasyon mesajı gönderildi', 'Karar ağacı güncellendi', 'Alt ajanlara görev dağıtıldı'],
  'gemma': ['Kod üretimi tamamlandı', 'Debug taraması başlatıldı', 'Mimari optimizasyon önerisi hazır', 'Syntax analizi çalıştırıldı'],
  'qwen3': ['Veri seti analiz ediliyor', 'Rapor oluşturuldu', 'Pattern tespiti yapıldı', 'İstatistik hesaplandı'],
  'kimi': ['Araştırma dokümanı tarandı', 'Hipotez test edildi', 'Paper özetlendi', 'Derin analiz tamamlandı'],
  'qwenC': ['İçerik oluşturuldu', 'Çeviri işlemi tamamlandı', 'Metin özetlendi', 'Genel operasyon raporu hazır'],
  'glm': ['Strateji planı güncellendi', 'Risk analizi tamamlandı', 'Optimizasyon çalıştırıldı', 'Planlama döngüsü bitti'],
  'minimax': ['Hızlı yanıt üretildi', 'Fact-check tamamlandı', 'Gerçek zamanlı sorgu işlendi', 'Hızlı işlem kuyruğu boşaltıldı'],
  'voice': ['Ses tanıma aktif', 'TTS sentezi tamamlandı', 'Ses komutu işlendi', 'Voice pipeline hazır'],
  'data': ['Veri akışı senkronize edildi', 'Web crawl tamamlandı', 'API sorgusu yanıtlandı', 'Veritabanı güncellendi'],
  'infra': ['Servis sağlık kontrolü OK', 'PM2 süreçleri kontrol edildi', 'Bellek kullanımı optimize edildi', 'Sistem tanılama tamamlandı'],
};

export function simulateAgentActivity() {
  const activeNodes = NODES.filter((n: any) => n.status === 'active' && n.type !== 'dot' && n.id !== 'core');
  if (activeNodes.length === 0) return;

  const n = activeNodes[Math.floor(Math.random() * activeNodes.length)];
  const actions = AGENT_ACTIONS[n.id];
  if (!actions) return;
  const msg = actions[Math.floor(Math.random() * actions.length)];
  logActivity(n.label, msg, 'action', n.color);
}

export function scheduleNextActivity() {
  const delay = 8000 + Math.random() * 7000;
  setTimeout(() => {
    simulateAgentActivity();
    scheduleNextActivity();
  }, delay);
}

export function setLogFilter(filter: string) {
  logFilter = filter;
}

export function clearLogActivity() {
  activityLog.length = 0;
  updateLogBadge();
  renderLogFeed();
}
