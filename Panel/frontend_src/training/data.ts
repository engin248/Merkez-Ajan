// @ts-nocheck
// @ts-nocheck
// ═══════════════════════════════════════════════════════════
// KRONOS — AJAN EĞİTİM ENGINE v6
// Sidebar agent list + canvas + FAB + picker
// ═══════════════════════════════════════════════════════════

export const ICONS = {
    agent: '<rect x="4" y="4" width="16" height="12" rx="2"/><circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1.5" fill="currentColor" stroke="none"/><path d="M9 14h6"/><line x1="12" y1="2" x2="12" y2="4"/><circle cx="12" cy="1.5" r="1"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/>',
    twitter: '<path d="M4 4l6.5 8L4 20h2l5.5-6.8L16 20h4l-7-8.5L19 4h-2l-5 6.2L8 4H4z"/>',
    youtube: '<path d="M22.5 6.4a2.8 2.8 0 0 0-2-2C18.9 4 12 4 12 4s-6.9 0-8.5.4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 1 12a29 29 0 0 0 .5 5.6 2.8 2.8 0 0 0 2 2c1.6.4 8.5.4 8.5.4s6.9 0 8.5-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 23 12a29 29 0 0 0-.5-5.6z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98"/>',
    tiktok: '<path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/>',
    linkedin: '<rect x="2" y="2" width="20" height="20" rx="3"/><path d="M7 10v7m4-4.5V17m0-3.5a3 3 0 0 1 6 0V17M7 7h.01"/>',
    pinterest: '<path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1 .5 1.8 1.5 1.8 1.8 0 3.1-1.9 3.1-4.6 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.5 2.1-4.5 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.2.2-.3.1-1.2-.6-2-2.4-2-3.8 0-3.1 2.3-6 6.5-6 3.4 0 6.1 2.5 6.1 5.7 0 3.4-2.2 6.2-5.2 6.2-1 0-2-.5-2.3-1.1l-.6 2.4c-.2.9-.8 2-1.2 2.7A10 10 0 1 0 12 2z"/>',
    web: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.07 0l4-4a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-4 4a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    amazon: '<path d="M14.5 17.5c-4.7 2.8-7.8 1-9.8-.7-.2-.2-.4 0-.2.3 1.5 1.8 4.8 3.5 8.5 2.5.5-.1.8-.6.5-1l-1-1.1z"/><path d="M6 11c0-1.5.8-3 2.5-3s2.5 1.5 2.5 3-1 3-2.5 3S6 12.5 6 11z"/><path d="M13 8c0-1 .7-2 2-2s2 1 2 2v3c0 1-.7 2-2 2"/>',
    trendyol: '<path d="M3 7h4l2 10h6l2-7H9"/><circle cx="10" cy="20" r="1.5"/><circle cx="16" cy="20" r="1.5"/>',
    api: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>',
    webhook: '<path d="M10 13a5 5 0 0 0 7.5 4.4M5.5 17.6A5 5 0 0 0 12 8m-6.5 9.6L8 12"/><path d="M17.5 17.6L15 12H9"/>',
    gpt: '<path d="M12 2a8 8 0 0 0-8 8v1a3 3 0 0 0 0 6v1a8 8 0 0 0 16 0v-1a3 3 0 0 0 0-6v-1a8 8 0 0 0-8-8z"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>',
    embedding: '<path d="M3 3h18v18H3z" fill="none"/><path d="M8 8l4-4 4 4M8 16l4 4 4-4M4 12h16"/>',
};

export const NODE_DEFS = [
    { key:'agent',     label:'Ajan',              color:'#8b5cf6', cat:'Ajan' },
    { key:'instagram', label:'Instagram',         color:'#E4405F', cat:'Sosyal Medya' },
    { key:'twitter',   label:'X / Twitter',       color:'#1DA1F2', cat:'Sosyal Medya' },
    { key:'youtube',   label:'YouTube',           color:'#FF0000', cat:'Sosyal Medya' },
    { key:'tiktok',    label:'TikTok',            color:'#69C9D0', cat:'Sosyal Medya' },
    { key:'linkedin',  label:'LinkedIn',          color:'#0077B5', cat:'Sosyal Medya' },
    { key:'pinterest', label:'Pinterest',         color:'#E60023', cat:'Sosyal Medya' },
    { key:'amazon',    label:'Amazon',            color:'#FF9900', cat:'E-Ticaret' },
    { key:'trendyol',  label:'Trendyol',          color:'#F27A1A', cat:'E-Ticaret' },
    { key:'web',       label:'Web Tarayıcı',      color:'#43a047', cat:'Web Kaynağı' },
    { key:'link',      label:'Link / URL',        color:'#26a69a', cat:'Web Kaynağı' },
    { key:'search',    label:'Google Arama',      color:'#fbbc04', cat:'Web Kaynağı' },
    { key:'api',       label:'API Bağlantı',      color:'#9C27B0', cat:'Entegrasyon' },
    { key:'webhook',   label:'Webhook',           color:'#5d4037', cat:'Entegrasyon' },
    { key:'gpt',       label:'GPT Model',         color:'#10a37f', cat:'Model' },
    { key:'embedding', label:'Embedding',         color:'#6366f1', cat:'Model' },
];

export const CANVAS_ICONS = {
    agent:'A', instagram:'IG', twitter:'X', youtube:'YT', tiktok:'TT',
    linkedin:'in', pinterest:'P', amazon:'AZ', trendyol:'TY',
    web:'W', link:'🔗', search:'🔍', api:'⚡',
    webhook:'WH', gpt:'AI', embedding:'EM'
};

