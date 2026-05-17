// ═══════════════════════════════════════════════════════════
// ASKER MOTORU — SHARED HEADER INJECTION
// Tüm sayfalarda aynı header yapısını oluşturur.
// Her sayfada <header class="topbar" id="mainTopbar"></header>
// olması yeterli — bu script içeriği doldurur.
// ═══════════════════════════════════════════════════════════

(function() {
  const currentPath = window.location.pathname;

  function isActive(path) {
    if (path === '/index.html') return currentPath === '/index.html' || currentPath === '/chat';
    if (path === '/strategy.html') return currentPath === '/' || currentPath === '/strategy.html' || currentPath === '/home.html';
    return currentPath === path;
  }

  function tabClass(path) {
    return 'topbar-tab' + (isActive(path) ? ' active' : '');
  }

  const TABS = [
    { href: '/strategy.html', icon: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m-10-10h4m12 0h4m-2.93-7.07l-2.83 2.83m-8.48 8.48l-2.83 2.83m0-14.14l2.83 2.83m8.48 8.48l2.83 2.83"/>', label: 'Operasyon' },
    { href: '/map.html', icon: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>', label: 'Map' },
    { href: '#', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>', label: 'Kurul' },
    { href: '/training.html', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', label: 'Ajan Eğitimi' },
    { href: '/egitim_departmani.html', icon: '<path d="M12 3l8 4v5c0 5-3.4 8.7-8 9-4.6-.3-8-4-8-9V7l8-4z"/><path d="M9 12l2 2 4-5"/>', label: 'Eğitim Dep.' },
    { href: '/albay_egitim.html', icon: '<path d="M12 2l3 7h7l-5.5 4.2L18.5 21 12 16.5 5.5 21l2-7.8L2 9h7z"/>', label: 'ALBAY Eğitim' }
  ];

  // Sayfa başlığını belirle
  const PAGE_TITLES = {
    '/': 'Operasyon Merkezi',
    '/home.html': 'Operasyon Merkezi',
    '/strategy.html': 'Operasyon Merkezi',
    '/map.html': 'Dünya Haritası',
    '/training.html': 'Ajan Eğitim Merkezi',
    '/egitim_departmani.html': 'Eğitim Departmanı',
    '/albay_egitim.html': 'ALBAY Eğitim Paneli',
    '/chat': 'Komuta Merkezi',
    '/index.html': 'Komuta Merkezi'
  };

  const PAGE_BADGES = {
    '/': 'Active',
    '/home.html': 'Active',
    '/strategy.html': 'Active',
    '/map.html': 'Live',
    '/training.html': 'Training',
    '/egitim_departmani.html': 'Dept',
    '/albay_egitim.html': 'ALBAY',
    '/chat': 'Online',
    '/index.html': 'Online'
  };

  const pageTitle = PAGE_TITLES[currentPath] || 'Asker Motoru';
  const pageBadge = PAGE_BADGES[currentPath] || 'Active';

  // Tab HTML oluştur
  const tabsHtml = TABS.map(t => `
    <a href="${t.href}" class="${tabClass(t.href)}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${t.icon}</svg>
      ${t.label}
    </a>
  `).join('');

  // Header HTML
  const headerHtml = `
    <!-- Left: Logo + Workflow -->
    <div class="topbar-left">
      <div class="topbar-logo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.8"/>
          <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>
          <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.6"/>
        </svg>
      </div>
      <div class="topbar-divider"></div>
      <div class="topbar-workflow">
        <span class="workflow-name">${pageTitle}</span>
        <span class="workflow-badge">${pageBadge}</span>

      </div>
    </div>

    <!-- Center: Nav tabs -->
    <nav class="topbar-center">${tabsHtml}</nav>

    <!-- Right: Slot for page-specific content + Komuta -->
    <div class="topbar-right">
      <div id="headerRightSlot"></div>

      <!-- GLOBAL EKLE DROPDOWN -->
      <div class="header-dropdown" style="position:relative;">
          <button class="tb-btn highlight" id="globalAddBtn" style="background:rgba(0,212,255,0.1); color:#00d4ff; border-color:rgba(0,212,255,0.3);">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Ekle ▾
          </button>
          <div class="dropdown-menu" id="globalAddMenu" style="display:none; position:absolute; top:100%; right:0; margin-top:5px; background:rgba(10,15,25,0.95); border:1px solid rgba(0,212,255,0.3); border-radius:8px; padding:8px; width:180px; z-index:1000; backdrop-filter:blur(10px);">
              <div class="dropdown-item" id="globalUploadModuleBtn" style="padding:8px 12px; color:#fff; cursor:pointer; font-size:12px; border-radius:4px; display:flex; align-items:center; gap:8px;">
                  <span style="color:#f39c12;">☁</span> Otonom Modül
              </div>
          </div>
      </div>

      <div class="topbar-divider"></div>
      <a href="/index.html" class="tb-btn komuta">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Komuta
      </a>
    </div>
  `;

  // Header'ı doldur
  const topbar = document.getElementById('mainTopbar');
  if (topbar) {
    topbar.innerHTML = headerHtml;
  }

  // GLOBAL MODAL INJECTION
  const modalHtml = `
  <div class="node-modal-overlay" id="globalModuleUploadOverlay" style="z-index:9999;">
      <div class="node-modal modal-warning" style="width: 480px; padding: 30px;">
          <h3 class="modal-warning-title" style="margin-top:0; display:flex; align-items:center; gap:10px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              OTONOM MODÜL ENTEGRATÖRÜ
          </h3>
          <p class="modal-desc" style="font-size: 12px; margin-bottom: 25px;">Sisteme yeni bir yetenek veya proje klasörü ekleyin. Kaynak kodlarınız yapay zeka tarafından analiz edilerek otomatik olarak derlenecektir.</p>
          
          <div style="display:flex; gap:15px; margin-bottom:20px;">
              <div style="flex:1;">
                  <label style="font-size:10px; color:rgba(255,255,255,0.5); letter-spacing:1px;">MODÜL ADI</label>
                  <input type="text" id="gUploadModuleName" class="nm-input" placeholder="Örn: Gelişmiş PDF Analizörü" style="margin-top:5px; width:100%;">
              </div>
              <div style="flex:1;">
                  <label style="font-size:10px; color:rgba(255,255,255,0.5); letter-spacing:1px;">ÜST KATEGORİ</label>
                  <select id="gUploadModuleCategory" class="nm-select" style="margin-top:5px; width:100%;">
                      <option value="Agent">🤖 Ajan / Agent</option>
                      <option value="Media">🎨 Medya / Görüntü</option>
                      <option value="System">⚙️ Sistem / Çekirdek</option>
                      <option value="Web">🌐 Web / Crawler</option>
                      <option value="Network">📡 Ağ / İletişim</option>
                      <option value="Database">🗄️ Veritabanı</option>
                      <option value="Custom">✨ Özel / Diğer</option>
                  </select>
              </div>
          </div>
          
          <div style="margin-bottom: 25px;">
              <label style="font-size:10px; color:rgba(255,255,255,0.5); letter-spacing:1px; display:block; margin-bottom:8px;">KAYNAK YÜKLEME TİPİ</label>
              <div style="display:flex; gap:10px;">
                  <button id="gSelectFileBtn" type="button" class="nm-btn" style="flex:1; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:5px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                      <span>Tek Dosya (.ts/.js)</span>
                  </button>
                  <button id="gSelectFolderBtn" type="button" class="nm-btn" style="flex:1; background:rgba(255,255,255,0.05); color:#fff; border:1px solid rgba(255,255,255,0.1); padding:12px; border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:5px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                      <span>Proje Klasörü (Dizin)</span>
                  </button>
              </div>
              <input type="file" id="gUploadModuleFile" accept=".ts,.js" style="display:none;">
              <input type="file" id="gUploadModuleFolder" webkitdirectory directory multiple style="display:none;">
              <div id="gSelectedFilesText" style="margin-top:10px; font-size:11px; color:#8b5cf6; text-align:center; min-height:16px;"></div>
          </div>
          
          <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px;">
              <button class="nm-btn" id="gCancelUploadModule" style="background:rgba(255,255,255,0.05); color:rgba(255,255,255,0.6);">İPTAL</button>
              <button class="nm-btn btn-warning" id="gConfirmUploadModule" style="padding:10px 24px; font-weight:600;">ENTEGRE ET</button>
          </div>
      </div>
  </div>`;
  
  if (!document.getElementById('globalModuleUploadOverlay')) {
      document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // GLOBAL EVENTS
  setTimeout(() => {
      const addBtn = document.getElementById('globalAddBtn');
      const addMenu = document.getElementById('globalAddMenu');
      if (addBtn && addMenu) {
          addBtn.onclick = (e) => { e.stopPropagation(); addMenu.style.display = addMenu.style.display === 'none' ? 'block' : 'none'; };
          document.addEventListener('click', () => addMenu.style.display = 'none');
          addMenu.addEventListener('mouseover', (e) => {
              if ((e.target as HTMLElement).classList.contains('dropdown-item')) {
                  (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              }
          });
          addMenu.addEventListener('mouseout', (e) => {
              if ((e.target as HTMLElement).classList.contains('dropdown-item')) {
                  (e.target as HTMLElement).style.background = 'transparent';
              }
          });
      }

      const upBtn = document.getElementById('globalUploadModuleBtn');
      const overlay = document.getElementById('globalModuleUploadOverlay');
      if (upBtn && overlay) {
          upBtn.onclick = () => {
              overlay.classList.add('active');
          };
      }

      const fileBtn = document.getElementById('gSelectFileBtn');
      const folderBtn = document.getElementById('gSelectFolderBtn');
      const fileInput = document.getElementById('gUploadModuleFile') as HTMLInputElement;
      const folderInput = document.getElementById('gUploadModuleFolder') as HTMLInputElement;
      const selectedText = document.getElementById('gSelectedFilesText');

      let selectedFiles: File[] = [];

      function updateFileUI(files: FileList | null, isFolder: boolean) {
          if (!files || files.length === 0) return;
          selectedFiles = Array.from(files);
          if (fileBtn && folderBtn) {
              fileBtn.style.borderColor = !isFolder ? '#f39c12' : 'rgba(255,255,255,0.1)';
              fileBtn.style.color = !isFolder ? '#f39c12' : '#fff';
              folderBtn.style.borderColor = isFolder ? '#f39c12' : 'rgba(255,255,255,0.1)';
              folderBtn.style.color = isFolder ? '#f39c12' : '#fff';
          }
          if (selectedText) {
              selectedText.textContent = isFolder 
                  ? `${selectedFiles.length} dosya içeren proje klasörü seçildi.` 
                  : `${selectedFiles[0].name} dosyası seçildi.`;
          }
      }

      if (fileBtn) fileBtn.onclick = () => fileInput?.click();
      if (folderBtn) folderBtn.onclick = () => folderInput?.click();

      if (fileInput) fileInput.onchange = (e: any) => updateFileUI(e.target.files, false);
      if (folderInput) folderInput.onchange = (e: any) => updateFileUI(e.target.files, true);

      const closeOverlay = () => {
          overlay?.classList.remove('active');
          selectedFiles = [];
          if (selectedText) selectedText.textContent = '';
          if (fileBtn) { fileBtn.style.borderColor = 'rgba(255,255,255,0.1)'; fileBtn.style.color = '#fff'; }
          if (folderBtn) { folderBtn.style.borderColor = 'rgba(255,255,255,0.1)'; folderBtn.style.color = '#fff'; }
          if (fileInput) fileInput.value = '';
          if (folderInput) folderInput.value = '';
      };

      const cancelBtn = document.getElementById('gCancelUploadModule');
      if (cancelBtn) cancelBtn.onclick = closeOverlay;

      const confirmBtn = document.getElementById('gConfirmUploadModule');
      if (confirmBtn) {
          confirmBtn.onclick = async () => {
              const nameInput = document.getElementById('gUploadModuleName') as HTMLInputElement;
              const catSelect = document.getElementById('gUploadModuleCategory') as HTMLSelectElement;
              const name = nameInput?.value?.trim();
              const category = catSelect?.value;
              
              if (!name) return alert('Lütfen modül adı giriniz.');
              if (selectedFiles.length === 0) return alert('Lütfen bir dosya veya klasör seçiniz.');

              // Eğer bu fonksiyon global olarak backend ile iletişime geçecekse:
              // FormData ile dosyaları yükleme:
              const formData = new FormData();
              formData.append('name', name);
              formData.append('category', category);
              selectedFiles.forEach(f => {
                  formData.append('files', f, f.webkitRelativePath || f.name);
              });

              try {
                  confirmBtn.textContent = 'YÜKLENİYOR...';
                  confirmBtn.style.pointerEvents = 'none';
                  const response = await fetch('/api/modules/upload', {
                      method: 'POST',
                      body: formData
                  });
                  if (!response.ok) throw new Error('Yükleme başarısız');
                  
                  // Başarılı ise kapat ve terminali aç
                  closeOverlay();
                  
                  // Merkezi Log Terminalini göster (eğer sayfada varsa)
                  const term = document.getElementById('centerLogTerminalOverlay');
                  if (term) term.classList.add('active');
                  else alert('Modül başarıyla otonom entegrasyon kuyruğuna alındı!');
                  
              } catch(err) {
                  alert('Hata: ' + err);
              } finally {
                  confirmBtn.textContent = 'ENTEGRE ET';
                  confirmBtn.style.pointerEvents = 'auto';
              }
          };
      }
  }, 100);

})();
