export {};
const $ = (id: string) => document.getElementById(id);

function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

function renderSummary(data) {
    const profile = data.live_skill_profile || {};
    const progress = data.live_training?.live_progress || {};
    $('summary').innerHTML = `
        <div class="metric"><span>Komuta kimliği</span><span>${esc(data.command_identity)}</span></div>
        <div class="metric"><span>Canlı eğitim</span><span>${esc(data.live_training?.status || '-')}</span></div>
        <div class="metric"><span>Son tur</span><span>${esc(data.live_training?.cycle || '-')}</span></div>
        <div class="metric"><span>Tur imzası</span><span>${esc(progress.cycle_signature || '-')}</span></div>
        <div class="metric"><span>Tamamlanan tur</span><span>${esc(progress.completed_cycles ?? '-')}</span></div>
        <div class="metric"><span>Vardiya hocası</span><span>${esc(progress.teacher_shift?.id || '-')} ${esc(progress.teacher_shift?.specialty || '')}</span></div>
        <div class="metric"><span>Canlı veri yaşı</span><span>${esc(data.live_training?.seconds_since_update ?? '-')} sn</span></div>
        <div class="metric"><span>ALBAY öncelik</span><span>${esc(data.live_training?.albay_priority?.status || '-')}</span></div>
        <div class="metric"><span>Beceri ekranı modu</span><span>${esc(data.category_mode || '-')}</span></div>
        <div class="metric"><span>Canlı eşleşen beceri</span><span>${esc(profile.matched_skill_count ?? '-')}</span></div>
        <div class="metric"><span>Turda seçilen beceri</span><span>${esc(profile.selected_skill_count ?? '-')}</span></div>
        <div class="metric"><span>Seviye kaydı</span><span>${esc(data.professor_level || '-')}</span></div>
        <div class="metric"><span>Enjekte beceri beyanı</span><span>${esc(data.total_injected_skills || 0)}</span></div>
        <div class="metric"><span>Doğrulanan beceri kaydı</span><span>${esc(data.verified_skill_records || 0)}</span></div>
        <div class="metric"><span>Bağlı ajan</span><span>${esc(data.total_agents || 0)}</span></div>
        <div class="metric"><span>Atama bekleyen ajan</span><span>${esc(data.waiting_agents || 0)}</span></div>
        <div class="truth">${esc(data.honesty_note || '')}</div>
        <div class="truth">Kaynak: ${esc(data.source?.skill_memory || '')}</div>
        ${renderAlbayLiveFocus(progress)}
        ${renderAlbayDoctrine(data.live_training?.albay_priority)}
    `;
}

function renderAlbayLiveFocus(progress) {
    const focus = progress?.focus || {};
    const agents = Array.isArray(focus.agents) ? focus.agents : [];
    const albayFocus = agents.find(item => String(item.name || '').toUpperCase().includes('ALBAY')) || agents[0];
    if (!albayFocus) return '<div class="truth">ALBAY canlı odak kaydı bekleniyor.</div>';
    return `
        <div class="truth">
            <strong>Canlı odak:</strong> ${esc(albayFocus.name)}<br>
            Hoca: ${esc(albayFocus.teacher?.id || '-')} ${esc(albayFocus.teacher?.specialty || '')}<br>
            Eğitim: ${esc(albayFocus.training_name || '-')}<br>
            Kural: her tur imza ve vardiya hocası değişir; sabit sayı tek başına eğitim sayılmaz.
        </div>
    `;
}

function renderAlbayDoctrine(albayPriority) {
    const record = albayPriority?.records?.[0];
    if (!record) return '';
    const lines = Array.isArray(record.taught_information) ? record.taught_information.slice(0, 10) : [];
    return `
        <div class="truth">
            <strong>Son ALBAY eğitimi:</strong><br>
            ${lines.map(line => `• ${esc(line)}`).join('<br>')}
        </div>
    `;
}

function renderCategories(data) {
    const categories = Array.isArray(data.categories) ? data.categories : [];
    const selectedSkills = Array.isArray(data.sample_skills) ? data.sample_skills : [];
    const max = Math.max(1, ...categories.map(c => Number(c.count || 0)));
    $('catCount').textContent = data.category_mode === 'LIVE_ALBAY_TRAINING'
        ? `${categories.length} canlı odak`
        : `${categories.length} arşiv kategori`;
    const categoryHtml = categories.map(cat => `
        <div class="item">
            <div class="item-top"><span>${esc(cat.name)}</span><span>${esc(cat.count)}</span></div>
            <div class="bar"><div class="fill" style="width:${Math.max(2, Number(cat.count || 0) / max * 100)}%"></div></div>
        </div>
    `).join('') || '<div class="item-sub">Canlı beceri odağı bekleniyor.</div>';
    const skillHtml = selectedSkills.map(skill => `
        <div class="item">
            <div class="item-top"><span>${esc(skill.id)}</span><span>${esc(skill.status || '-')}</span></div>
            <div class="item-sub">Eşleşme: ${esc(skill.category || '-')}</div>
            <div class="item-sub">Kaynak: ${esc(skill.path || '-')}</div>
        </div>
    `).join('');
    const archiveNote = data.category_mode === 'LIVE_ALBAY_TRAINING'
        ? `<div class="truth">Eski arşiv kategorileri ayrı tutuldu; bu alan artık canlı ALBAY eğitim turundaki domain ve seçili becerileri gösterir.</div>`
        : `<div class="truth">Canlı ALBAY beceri profili bulunamadı; geçici olarak eski beceri hafızası kategorileri gösteriliyor.</div>`;
    $('categories').innerHTML = categoryHtml + archiveNote + skillHtml;
}

function renderAgents(data) {
    const agents = Array.isArray(data.agents) ? data.agents : [];
    $('agentCount').textContent = `${agents.length} ajan`;
    $('agents').innerHTML = agents.map(agent => `
        <div class="item">
            <div class="item-top"><span>${esc(agent.ajan_kodu)}</span><span>${esc(agent.statü || agent.statu || '-')}</span></div>
            <div class="item-sub">Komutan: ${esc(agent.bagli_oldugu_komutan || '-')}</div>
            <div class="item-sub">Beceri entegrasyonu: ${esc(agent.beceri_entegrasyonu || '-')}</div>
        </div>
    `).join('') || '<div class="item-sub">Ajan kaydı yok.</div>';
}

async function load() {
    try {
        const res = await fetch('/api/albay-egitim', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        $('status').textContent = data.status === 'OK' ? 'VERİ OKUNDU' : data.status;
        renderSummary(data);
        renderCategories(data);
        renderAgents(data);
    } catch (err) {
        $('status').textContent = 'HATA';
        $('summary').innerHTML = `<div class="truth">Albay eğitim verisi okunamadı: ${esc(err.message)}</div>`;
    }
}

load();
setInterval(load, 10000);
