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
    { href: '/training.html', icon: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>', label: 'Ajan Eğitimi' }
  ];

  // Sayfa başlığını belirle
  const PAGE_TITLES = {
    '/': 'Operasyon Merkezi',
    '/home.html': 'Operasyon Merkezi',
    '/strategy.html': 'Operasyon Merkezi',
    '/map.html': 'Dünya Haritası',
    '/training.html': 'Ajan Eğitim Merkezi',
    '/chat': 'Komuta Merkezi',
    '/index.html': 'Komuta Merkezi'
  };

  const PAGE_BADGES = {
    '/': 'Active',
    '/home.html': 'Active',
    '/strategy.html': 'Active',
    '/map.html': 'Live',
    '/training.html': 'Training',
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
})();
