/* ═══ ASKER MOTORU — STATE MANAGER ═══
 * Tüm sayfalar arası ve oturum arası kalıcı durum yönetimi.
 * localStorage üzerinde persist eder.
 * Her sayfa bu dosyayı yükler.
 */

// ── MIGRATION: Eski model referanslarını otomatik düzelt ──
(function migrateOldModel() {
  try {
    const raw = localStorage.getItem('asker_motoru_state');
    if (raw) {
      const s = JSON.parse(raw);
      if (s.activeModel && (s.activeModel.includes('qwen2.5') || s.activeModel === 'qwen3.5:latest')) {
        s.activeModel = 'qwen3:8b';
        s.activeModelName = 'Qwen 3 (Merkez)';
        localStorage.setItem('asker_motoru_state', JSON.stringify(s));
        console.log('[MIGRATION] Model güncellendi: qwen3:8b');
      }
    }
    // Ayrıca eski localStorage activeModel key'ini de temizle
    const oldModel = localStorage.getItem('activeModel');
    if (oldModel && (oldModel.includes('qwen2.5') || oldModel === 'qwen3.5:latest')) {
      localStorage.setItem('activeModel', 'qwen3:8b');
      console.log('[MIGRATION] localStorage.activeModel güncellendi: qwen3:8b');
    }
  } catch(e) {}
})();

const StateManager = (() => {
  const STORAGE_KEY = 'asker_motoru_state';
  const CHAT_HISTORY_KEY = 'asker_motoru_chat_history';
  const ACTIVITY_LOG_KEY = 'asker_motoru_activity_log';

  // ── Varsayılan state yapısı ──
  const DEFAULT_STATE = {
    activeModel: 'qwen3:8b',
    activeModelName: 'Qwen 3.5 (Merkez)',
    camera: { x: 0, y: 0, zoom: 1 },
    lastPage: '/',
    theme: 'dark',
    voiceEnabled: false,
    updatedAt: 0
  };

  // ── Core: Okuma / Yazma ──
  function getState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.error('[STATE] Okuma hatası:', e);
    }
    return { ...DEFAULT_STATE };
  }

  function setState(updates) {
    try {
      const current = getState();
      const merged = { ...current, ...updates, updatedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (e) {
      console.error('[STATE] Yazma hatası:', e);
      return null;
    }
  }

  function getValue(key) {
    return getState()[key];
  }

  function setValue(key, value) {
    return setState({ [key]: value });
  }

  // ── Sohbet Geçmişi (Model bazlı kalıcı) ──
  function getChatHistory(model) {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      return map[model] || [];
    } catch (e) { return []; }
  }

  function pushChatMessage(model, entry) {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (!map[model]) map[model] = [];
      map[model].push(entry);
      // Her model için maksimum 20 mesaj tut
      if (map[model].length > 20) map[model] = map[model].slice(-20);
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(map));
      return map[model];
    } catch (e) { return []; }
  }

  function clearChatHistory(model) {
    try {
      const raw = localStorage.getItem(CHAT_HISTORY_KEY);
      const map = raw ? JSON.parse(raw) : {};
      if (model) { delete map[model]; }
      else { Object.keys(map).forEach(k => delete map[k]); }
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(map));
    } catch (e) { /* ignore */ }
  }

  // ── Activity Log (Kalıcı) ──
  function getActivityLog() {
    try {
      const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }

  function pushActivityLog(entry) {
    try {
      const logs = getActivityLog();
      logs.unshift({ ...entry, time: new Date().toISOString() });
      // Maksimum 100 kayıt tut
      if (logs.length > 100) logs.length = 100;
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs));
      return logs;
    } catch (e) { return []; }
  }

  function clearActivityLog() {
    try { localStorage.setItem(ACTIVITY_LOG_KEY, '[]'); } catch (e) { /* */ }
  }

  // ── Kamera Durumu (Strategy Map için) ──
  function saveCamera(x, y, zoom) {
    setState({ camera: { x, y, zoom } });
  }

  function getCamera() {
    return getState().camera || DEFAULT_STATE.camera;
  }

  // ── Model Seçimi ──
  function setActiveModel(modelId, modelName) {
    setState({ activeModel: modelId, activeModelName: modelName });
  }

  function getActiveModel() {
    const s = getState();
    return { id: s.activeModel, name: s.activeModelName };
  }

  // ── Sayfa Navigasyonu Takibi ──
  function setCurrentPage(pagePath) {
    setState({ lastPage: pagePath });
  }

  function getLastPage() {
    return getState().lastPage || '/';
  }

  // ── Dışa aç ──
  return {
    getState,
    setState,
    getValue,
    setValue,
    getChatHistory,
    pushChatMessage,
    clearChatHistory,
    getActivityLog,
    pushActivityLog,
    clearActivityLog,
    saveCamera,
    getCamera,
    setActiveModel,
    getActiveModel,
    setCurrentPage,
    getLastPage,
    STORAGE_KEY,
    DEFAULT_STATE
  };
})();

// Sayfa yüklendiğinde mevcut sayfayı kaydet
StateManager.setCurrentPage(location.pathname);
console.log('[STATE] Durum yöneticisi aktif. Kayıtlı model:', StateManager.getActiveModel().id);
