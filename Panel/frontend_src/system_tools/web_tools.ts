// @ts-nocheck
// ══════════════════════════════════════════════════════════════
// ASKER MOTORU — WEB ARAÇLARI
// ══════════════════════════════════════════════════════════════

import * as http from 'http';
import * as https from 'https';

function fetchWebContent(targetUrl) {
    return new Promise((resolve) => {
        const client = targetUrl.startsWith('https') ? https : http;
        const req = client.get(targetUrl, { timeout: 15000, headers: { 'User-Agent': 'AskerMotoru/1.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchWebContent(res.headers.location).then(resolve);
                return;
            }
            let data = '';
            res.setEncoding('utf-8');
            res.on('data', chunk => { data += chunk; if (data.length > 200000) { res.destroy(); } });
            res.on('end', () => {
                // HTML'den basit metin çıkarma
                let text = data
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                if (text.length > 8000) text = text.substring(0, 8000) + '\n...[kırpıldı]';
                resolve({ basarili: true, url: targetUrl, uzunluk: text.length, icerik: text });
            });
        });
        req.on('error', (e) => resolve({ basarili: false, hata: e.message }));
        req.on('timeout', () => { req.destroy(); resolve({ basarili: false, hata: 'Zaman aşımı' }); });
    });
}

function webSearch(sorgu) {
    // DuckDuckGo Instant Answer API
    const encodedQuery = encodeURIComponent(sorgu);
    const searchUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    return fetchWebContent(searchUrl).then(result => {
        if (!result?.basarili) return result;
        try {
            const data = JSON.parse(result?.icerik);
            const results = [];
            if (data.Abstract) results.push({ baslik: data.Heading || 'Özet', icerik: data.Abstract, kaynak: data.AbstractURL });
            if (data.RelatedTopics) {
                data.RelatedTopics.slice(0, 5).forEach(t => {
                    if (t.Text) results.push({ baslik: t.Text.substring(0, 80), icerik: t.Text, url: t.FirstURL });
                });
            }
            if (results.length === 0) results.push({ baslik: 'Sonuç', icerik: 'Doğrudan sonuç bulunamadı. Daha spesifik arama yapmayı dene.' });
            return { basarili: true, sorgu, sonuc_sayisi: results.length, sonuclar: results };
        } catch { return { basarili: true, sorgu, sonuclar: [{ icerik: result?.icerik.substring(0, 3000) }] }; }
    });
}

export {
    fetchWebContent,
    webSearch
};

export {};
