// @ts-nocheck
import { NODES, EDGES } from './data.ts';
import { saveGraphState } from './state.ts';

export function initContextMenu(canvas: HTMLCanvasElement, cam: any, getW: () => number, getH: () => number, selectedNodes: Set<any>, updateDeleteBtn: () => void) {
// ═══════════════════════════════════════════════════════════
// NODE CONTEXT MENU (Settings Panel) — Redesigned
// ═══════════════════════════════════════════════════════════
let ctxTargetNode = null;
const ctxMenu = (document.getElementById('nodeCtxMenu') as any);

// ── Yetenek Kataloğu (Sistemden Analiz Edilen Gerçek Yetenekler) ──
const SKILL_CATALOG = {
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

function getNodeRank(node) {
  if (node.id === 'core') return 'core';
  if (node.r >= 18) return 'manager';
  return 'worker';
}

const RANK_LABELS = {
  core: { name: 'ANA KOMUTA', text: 'Ana Komuta Ajanı', desc: 'Tüm ajanları merkezi yönetir' },
  manager: { name: 'YÖNETİCİ', text: 'Yönetici Ajan', desc: 'Alt ajanları yönetir, model çalıştırır' },
  worker: { name: 'İŞÇİ', text: 'İşçi Ajan', desc: 'Tekil görevleri yürütür' }
};

function openNodeCtx(node, screenX, screenY) {
  ctxTargetNode = node;
  if (!ctxMenu) return;

  // ── Populate Genel fields ──
  (document.getElementById('ctxTitle') as any).textContent = node.label;
  (document.getElementById('ctxTitle') as any).style.color = node.color;
  (document.getElementById('ctxLabel') as any).value = node.label;
  (document.getElementById('ctxSub') as any).value = node.sub || '';
  (document.getElementById('ctxColor') as any).value = node.color;
  (document.getElementById('ctxType') as any).value = node.type || 'dot';
  const ctxModelEl = (document.getElementById('ctxModel') as any);
  if (ctxModelEl) ctxModelEl.value = node.model || '';

  // ── Rank Badge & Info ──
  const rank = getNodeRank(node);
  const rl = RANK_LABELS[rank];
  const badge = (document.getElementById('ctxRankBadge') as any);
  badge.textContent = rl.name;
  badge.className = 'ctx-rank-badge rank-' + rank;
  (document.getElementById('ctxRankDot') as any).className = 'rank-dot ' + rank;
  (document.getElementById('ctxRankText') as any).textContent = rl.text;
  (document.getElementById('ctxRankDesc') as any).textContent = rl.desc;

  // ── Reset tabs to "Genel" ──
  document.querySelectorAll('.ctx-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ctx-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('.ctx-tab[data-tab="general"]').classList.add('active');
  (document.getElementById('ctxTabGeneral') as any).classList.add('active');

  // ── Populate Skills ──
  renderAssignedSkills(node);
  renderSkillPool(node);

  // ── Position ──
  ctxMenu.style.left = '-9999px';
  ctxMenu.style.top = '-9999px';
  ctxMenu.classList.add('visible');

  const menuW = ctxMenu.offsetWidth || 300;
  const menuH = ctxMenu.offsetHeight || 500;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let mx = screenX + 16;
  let my = screenY - 20;
  if (mx + menuW > vw - 10) mx = screenX - menuW - 10;
  if (mx < 10) mx = 10;
  if (my + menuH > vh - 10) my = vh - menuH - 10;
  if (my < 56) my = 56;

  ctxMenu.style.left = mx + 'px';
  ctxMenu.style.top = my + 'px';

  // Hide delete for core node
  const delBtn = (document.getElementById('ctxDelete') as any);
  if (delBtn) delBtn.style.display = node.id === 'core' ? 'none' : 'block';
}

// ── Tab switching ──
document.querySelectorAll('.ctx-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ctx-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ctx-tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.getAttribute('data-tab');
    document.querySelector(`.ctx-tab-content[data-tab="${target}"]`).classList.add('active');
  });
});

// ── Skill search filter ──
(document.getElementById('ctxSkillSearch') as any)?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('#ctxSkillsPool .skill-chip.pool').forEach(chip => {
    chip.style.display = (!q || chip.textContent.toLowerCase().includes(q)) ? '' : 'none';
  });
  document.querySelectorAll('#ctxSkillsPool .skill-category').forEach(cat => {
    const visible = cat.querySelectorAll('.skill-chip.pool:not([style*="display: none"])').length;
    cat.style.display = visible > 0 ? '' : 'none';
  });
});

// ── Render assigned skills ──
function renderAssignedSkills(node) {
  const container = (document.getElementById('ctxSkillsAssigned') as any);
  const emptyMsg = (document.getElementById('ctxSkillsEmpty') as any);
  if (!container) return;

  // Clear existing chips
  container.querySelectorAll('.skill-chip').forEach(c => c.remove());

  const skills = node.capabilities || [];
  emptyMsg.style.display = skills.length === 0 ? 'block' : 'none';

  skills.forEach(skill => {
    const chip = document.createElement('span');
    chip.className = 'skill-chip assigned';
    chip.innerHTML = `${skill} <span class="skill-remove">✕</span>`;
    chip.addEventListener('click', () => {
      const idx = node.capabilities.indexOf(skill);
      if (idx >= 0) node.capabilities.splice(idx, 1);
      renderAssignedSkills(node);
      renderSkillPool(node);
      saveGraphState();
    });
    container.insertBefore(chip, emptyMsg);
  });
}

// ── Render skill pool ──
function renderSkillPool(node) {
  const pool = (document.getElementById('ctxSkillsPool') as any);
  if (!pool) return;
  pool.innerHTML = '';
  const assigned = node.capabilities || [];

  for (const [catName, skills] of Object.entries(SKILL_CATALOG)) {
    const catDiv = document.createElement('div');
    catDiv.className = 'skill-category';
    catDiv.innerHTML = `<div class="skill-category-title">${catName}</div>`;
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'skill-category-chips';

    skills.forEach(skill => {
      const chip = document.createElement('span');
      const isAssigned = assigned.includes(skill);
      chip.className = 'skill-chip pool' + (isAssigned ? ' already' : '');
      chip.textContent = skill;
      if (!isAssigned) {
        chip.addEventListener('click', () => {
          if (!node.capabilities) node.capabilities = [];
          node.capabilities.push(skill);
          renderAssignedSkills(node);
          renderSkillPool(node);
          saveGraphState();
        });
      }
      chipsDiv.appendChild(chip);
    });

    catDiv.appendChild(chipsDiv);
    pool.appendChild(catDiv);
  }
}

function closeNodeCtx() {
  if (ctxMenu) ctxMenu.classList.remove('visible');
  ctxTargetNode = null;
}

// Double-click → open context menu
canvas.addEventListener('dblclick', e => {
  const wx = (e.clientX - getW()/2) / cam.zoom - cam.x;
  const wy = (e.clientY - getH()/2) / cam.zoom - cam.y;
  for (let i = NODES.length-1; i >= 0; i--) {
    const n = NODES[i];
    const dx = wx - n.x, dy = wy - n.y;
    if (dx*dx + dy*dy < (n.r+10)*(n.r+10)) {
      openNodeCtx(n, e.clientX, e.clientY);
      return;
    }
  }
});

// Right-click → open context menu
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  const wx = (e.clientX - getW()/2) / cam.zoom - cam.x;
  const wy = (e.clientY - getH()/2) / cam.zoom - cam.y;
  for (let i = NODES.length-1; i >= 0; i--) {
    const n = NODES[i];
    const dx = wx - n.x, dy = wy - n.y;
    if (dx*dx + dy*dy < (n.r+10)*(n.r+10)) {
      openNodeCtx(n, e.clientX, e.clientY);
      return;
    }
  }
  closeNodeCtx();
});

// Close button
(document.getElementById('ctxClose') as any)?.addEventListener('click', closeNodeCtx);

// Close when clicking outside
document.addEventListener('mousedown', e => {
  if (ctxMenu && ctxMenu.classList.contains('visible') && !ctxMenu.contains(e.target)) {
    closeNodeCtx();
  }
});

// Save
(document.getElementById('ctxSave') as any)?.addEventListener('click', () => {
  if (!ctxTargetNode) return;
  const newLabel = (document.getElementById('ctxLabel') as any).value.trim();
  if (newLabel) ctxTargetNode.label = newLabel.toUpperCase();
  ctxTargetNode.sub = (document.getElementById('ctxSub') as any).value.trim() || null;
  ctxTargetNode.color = (document.getElementById('ctxColor') as any).value;
  ctxTargetNode.type = (document.getElementById('ctxType') as any).value;
  // Model ata
  const ctxModelVal = (document.getElementById('ctxModel') as any);
  if (ctxModelVal) {
    ctxTargetNode.model = ctxModelVal.value || null;
    // info dizisindeki MODEL satırını güncelle
    if (ctxTargetNode.info) {
      const mIdx = ctxTargetNode.info.findIndex(s => s.startsWith('MODEL:'));
      if (ctxTargetNode.model) {
        const modelStr = 'MODEL: ' + ctxTargetNode.model;
        if (mIdx >= 0) ctxTargetNode.info[mIdx] = modelStr;
        else ctxTargetNode.info.push(modelStr);
      } else if (mIdx >= 0) {
        ctxTargetNode.info.splice(mIdx, 1);
      }
    }
  }

  // Update edge colors
  EDGES.forEach(e => {
    if (e.to === ctxTargetNode.id) e.color = ctxTargetNode.color;
  });

  saveGraphState();
  closeNodeCtx();
});

// Disconnect all edges
(document.getElementById('ctxDisconnect') as any)?.addEventListener('click', () => {
  if (!ctxTargetNode) return;
  for (let i = EDGES.length-1; i >= 0; i--) {
    if (EDGES[i].from === ctxTargetNode.id || EDGES[i].to === ctxTargetNode.id) {
      EDGES.splice(i, 1);
    }
  }
  delete ctxTargetNode.parent;
  const connEl3 = (document.getElementById('connectionStatus') as any); if (connEl3) connEl3.textContent = EDGES.length + ' conn';
  saveGraphState();
  closeNodeCtx();
});

// Delete node
(document.getElementById('ctxDelete') as any)?.addEventListener('click', () => {
  if (!ctxTargetNode || ctxTargetNode.id === 'core') return;
  // Remove node + children recursively
  function removeRec(nodeId) {
    const children = NODES.filter(n => n.parent === nodeId);
    children.forEach(c => removeRec(c.id));
    const idx = NODES.findIndex(n => n.id === nodeId);
    if (idx !== -1) NODES.splice(idx, 1);
    for (let i = EDGES.length-1; i >= 0; i--) {
      if (EDGES[i].from === nodeId || EDGES[i].to === nodeId) EDGES.splice(i, 1);
    }
  }
  removeRec(ctxTargetNode.id);
  selectedNodes.delete(ctxTargetNode);
  updateDeleteBtn();
  const ncEl = (document.getElementById('nodeCountStatus') as any); if (ncEl) ncEl.textContent = NODES.length + ' nodes';
  const connEl4 = (document.getElementById('connectionStatus') as any); if (connEl4) connEl4.textContent = EDGES.length + ' conn';
  saveGraphState();
  closeNodeCtx();
});

// ═══════════════════════════════════════════════════════════
// NODE MANAGEMENT (Add / Delete)
// ═══════════════════════════════════════════════════════════



function populateParentSelect() {
  const sel = (document.getElementById('newNodeParent') as any);
  if (!sel) return;
  sel.innerHTML = '';
  NODES.filter(n => n.type !== 'dot').forEach(n => {
    const opt = document.createElement('option');
    opt.value = n.id;
    opt.textContent = n.label;
    sel.appendChild(opt);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const dropdownWrap = document.querySelector('.add-dropdown-wrap');
  const toggleBtn = (document.getElementById('addNodeToggle') as any);
  const delBtn = (document.getElementById('deleteNodeBtn') as any);
  const overlay = (document.getElementById('nodeModalOverlay') as any);
  const confirmBtn = (document.getElementById('confirmAddNode') as any);
  const cancelBtn = (document.getElementById('cancelAddNode') as any);

  // ── Dropdown Toggle ──
  if (toggleBtn) toggleBtn.addEventListener('click', e => {
    e.stopPropagation();
    dropdownWrap.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (dropdownWrap && !dropdownWrap.contains(e.target)) {
      dropdownWrap.classList.remove('open');
    }
  });

  // ── Open modal helper ──
  function openAddModal(mode, parentId) {
    if (dropdownWrap) dropdownWrap.classList.remove('open');
    closeNodeCtx();

    (document.getElementById('addNodeMode') as any).value = mode;
    (document.getElementById('addNodeParentId') as any).value = parentId || 'core';

    const title = (document.getElementById('modalTitle') as any);
    const typeSelect = (document.getElementById('newNodeType') as any);

    if (mode === 'big') {
      title.textContent = '⬡ YENİ ANA AJAN EKLE';
      title.style.color = '#00d4ff';
      typeSelect.value = 'mesh';
      // Show only big types
      for (const opt of typeSelect.options) {
        opt.hidden = opt.value === 'dot';
      }
    } else {
      title.textContent = '● YENİ ALT AJAN EKLE';
      title.style.color = '#ff9800';
      typeSelect.value = 'dot';
      // Show only dot
      for (const opt of typeSelect.options) {
        opt.hidden = opt.value !== 'dot';
      }
    }

    populateParentSelect();
    // Pre-select parent
    const parentSel = (document.getElementById('newNodeParent') as any);
    if (parentSel && parentId) parentSel.value = parentId;

    overlay.classList.add('active');
  }

  // ── Header dropdown buttons ──
  (document.getElementById('addBigNodeBtn') as any)?.addEventListener('click', () => openAddModal('big', 'core'));
  (document.getElementById('addSmallNodeBtn') as any)?.addEventListener('click', () => openAddModal('small', 'core'));

  // ── Module Integrator ──
  const moduleUploadOverlay = (document.getElementById('moduleUploadOverlay') as any);
  (document.getElementById('uploadModuleBtn') as any)?.addEventListener('click', () => {
    if (dropdownWrap) dropdownWrap.classList.remove('open');
    closeNodeCtx();
    (document.getElementById('uploadModuleName') as HTMLInputElement).value = '';
    (document.getElementById('uploadModuleCategory') as HTMLInputElement).value = '';
    (document.getElementById('uploadModuleFile') as HTMLInputElement).value = '';
    (document.getElementById('moduleUploadStatus') as HTMLElement).style.display = 'none';
    moduleUploadOverlay?.classList.add('active');
  });

  (document.getElementById('cancelUploadModule') as any)?.addEventListener('click', () => {
    moduleUploadOverlay?.classList.remove('active');
  });

  (document.getElementById('confirmUploadModule') as any)?.addEventListener('click', async () => {
    const modName = (document.getElementById('uploadModuleName') as HTMLInputElement).value.trim();
    const modCat = (document.getElementById('uploadModuleCategory') as HTMLInputElement).value.trim();
    const fileInput = document.getElementById('uploadModuleFile') as HTMLInputElement;

    if (!modName || !fileInput.files || fileInput.files.length === 0) {
      alert('Lütfen modül adını girin ve bir .ts/.js dosyası seçin!');
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
      const code = e.target?.result as string;
      
      // Kapat eski modali, aç Terminal'i
      moduleUploadOverlay?.classList.remove('active');
      const terminalOverlay = document.getElementById('centerLogTerminalOverlay') as HTMLElement;
      const terminalFeed = document.getElementById('centerLogTerminalFeed') as HTMLElement;
      const terminalStatus = document.getElementById('centerLogTerminalStatus') as HTMLElement;
      
      terminalFeed.innerHTML = '';
      terminalStatus.textContent = 'Ağ bağlantısı kuruluyor...';
      terminalOverlay.classList.add('active');

      try {
        const response = await fetch('http://localhost:8085/api/integrate-module', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, category: modCat, moduleName: modName })
        });

        if (!response.body) throw new Error("Stream desteklenmiyor");

        const streamReader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        terminalStatus.textContent = 'Yapay Zeka kodunuzu dönüştürüyor, lütfen bekleyin...';

        let done = false;
        while (!done) {
          const { value, done: readerDone } = await streamReader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(l => l.trim() !== '');
            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.type === 'PROGRESS') {
                  terminalFeed.innerHTML += `<div><span style="color:#00ffaa">➔</span> ${data.message}</div>`;
                  terminalFeed.scrollTop = terminalFeed.scrollHeight;
                } else if (data.type === 'DONE') {
                  terminalStatus.textContent = data.result.success ? 'İşlem Başarılı!' : 'İşlem Tamamlandı (Hatalı)';
                  terminalStatus.style.color = data.result.success ? '#00ffaa' : '#ff4444';
                  terminalStatus.style.animation = 'none';
                  setTimeout(() => terminalOverlay.classList.remove('active'), 4000);
                } else if (data.type === 'ERROR') {
                  terminalFeed.innerHTML += `<div style="color:#ff4444"><span style="color:#ff4444">➔ HATA:</span> ${data.message}</div>`;
                  terminalStatus.textContent = 'Sistem Hatası';
                  terminalStatus.style.color = '#ff4444';
                  terminalStatus.style.animation = 'none';
                }
              } catch (parseErr) {
                 // Gelen chunk tam JSON değilse yoksay veya biriktir (basitlik adına atlıyoruz)
              }
            }
          }
        }
      } catch (err: any) {
        terminalFeed.innerHTML += `<div style="color:#ff4444"><span style="color:#ff4444">➔ BAĞLANTI HATASI:</span> ${err.message}</div>`;
        terminalStatus.textContent = 'Bağlantı koptu';
        terminalStatus.style.animation = 'none';
        terminalStatus.style.color = '#ff4444';
      }
    };
    reader.readAsText(file);
  });

  (document.getElementById('closeLogTerminal') as any)?.addEventListener('click', () => {
    (document.getElementById('centerLogTerminalOverlay') as HTMLElement).classList.remove('active');
  });

  // ── Context menu add child buttons ──
  (document.getElementById('ctxAddBigChild') as any)?.addEventListener('click', () => {
    if (ctxTargetNode) openAddModal('big', ctxTargetNode.id);
  });
  (document.getElementById('ctxAddSmallChild') as any)?.addEventListener('click', () => {
    if (ctxTargetNode) openAddModal('small', ctxTargetNode.id);
  });

  // ── Cancel ──
  if (cancelBtn) cancelBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
  });

  // ── Confirm Add ──
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    const label = (document.getElementById('newNodeLabel') as any).value.trim();
    const sub = (document.getElementById('newNodeSub') as any).value.trim();
    const type = (document.getElementById('newNodeType') as any).value;
    const color = (document.getElementById('newNodeColor') as any).value;
    const mode = (document.getElementById('addNodeMode') as any).value;
    const parentId = (document.getElementById('addNodeParentId') as any).value || (document.getElementById('newNodeParent') as any).value;
    if (!label) { alert('Düğüm adı gerekli!'); return; }

    const parent = NODES.find(n => n.id === parentId);
    const angle = Math.random() * Math.PI * 2;
    const dist = mode === 'big' ? (120 + Math.random() * 80) : (60 + Math.random() * 40);
    const selectedModel = (document.getElementById('newNodeModel') as any)?.value || null;
    const infoArr = ['LABEL: ' + label, 'TYPE: ' + type, 'STATUS: ACTIVE'];
    if (selectedModel) infoArr.push('MODEL: ' + selectedModel);
    const newNode = {
      id: 'node_' + Date.now(),
      label: label.toUpperCase(),
      sub: sub || null,
      x: (parent ? parent.x : 0) + Math.cos(angle) * dist,
      y: (parent ? parent.y : 0) + Math.sin(angle) * dist,
      r: mode === 'big' ? 22 : 10,
      color: color,
      type: type,
      model: selectedModel,
      parent: parentId,
      info: infoArr
    };
    NODES.push(newNode);
    EDGES.push({ from: parentId, to: newNode.id, color: color });

    // Reset form
    (document.getElementById('newNodeLabel') as any).value = '';
    (document.getElementById('newNodeSub') as any).value = '';
    if ((document.getElementById('newNodeModel') as any)) (document.getElementById('newNodeModel') as any).value = '';
    overlay.classList.remove('active');

    // Update counts (null-safe)
    const ncEl2 = (document.getElementById('nodeCountStatus') as any); if (ncEl2) ncEl2.textContent = NODES.length + ' nodes';
    const connEl5 = (document.getElementById('connectionStatus') as any); if (connEl5) connEl5.textContent = EDGES.length + ' conn';
    saveGraphState();
  });

  if (delBtn) delBtn.addEventListener('click', () => {
    if (selectedNodes.size === 0) return;
    const toDelete = [...selectedNodes].filter(n => n.id !== 'core');
    toDelete.forEach(sn => {
      function removeRecursive(nodeId) {
        const children = NODES.filter(n => n.parent === nodeId);
        children.forEach(c => removeRecursive(c.id));
        const idx = NODES.findIndex(n => n.id === nodeId);
        if (idx !== -1) NODES.splice(idx, 1);
        for (let i = EDGES.length-1; i >= 0; i--) {
          if (EDGES[i].from === nodeId || EDGES[i].to === nodeId) EDGES.splice(i, 1);
        }
      }
      removeRecursive(sn.id);
    });
    selectedNodes.clear();
    updateDeleteBtn();
    (document.getElementById('nodeCountStatus') as any).textContent = NODES.length + ' nodes';
    (document.getElementById('connectionStatus') as any).textContent = EDGES.length + ' conn';
    saveGraphState();
  });
});

// ═══════════════════════════════════════════════════════════
// VOICE CHAT SYSTEM
// ═══════════════════════════════════════════════════════════




}
