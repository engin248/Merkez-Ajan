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

function badgeClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('planned')) return 'planned';
    if (s.includes('waiting')) return 'waiting';
    return '';
}

function setStatus(data, error) {
    const dot = $('statusDot');
    const text = $('statusText');
    dot.className = 'dot';
    if (error) {
        dot.classList.add('err');
        text.textContent = 'PANEL BAĞLANTI HATASI';
        return;
    }
    if (data.status === 'RUNNING' && data.continuous_training) {
        dot.classList.add('run');
        text.textContent = 'SÜREKLİ EĞİTİM ÇALIŞIYOR';
        return;
    }
    text.textContent = data.status || 'BİLİNMİYOR';
}

function renderSummary(data) {
    const watchdog = data.watchdog || {};
    const control = data.education_control || {};
    const heartbeat = data.heartbeat || {};
    const policy = data.language_policy || {};
    const aiInventory = data.ai_training_inventory || {};
    const languageLine = [policy.primary, policy.secondary, policy.tertiary]
        .filter(Boolean)
        .map(item => `${item.code || '-'}:${item.name || '-'}`)
        .join(' / ');
    $('lastUpdate').textContent = data.last_update || '-';
    $('cycleStamp').textContent = `tur ${data.cycle || '-'}`;
    $('summary').innerHTML = `
        <div class="metric"><span>Eğitim durumu</span><span>${esc(data.status)}</span></div>
        <div class="metric"><span>Canlı veri yaşı</span><span>${esc(data.seconds_since_update ?? '-')} sn</span></div>
        <div class="metric"><span>Heartbeat yaşı</span><span>${esc(heartbeat.seconds_since_update ?? '-')} sn</span></div>
        <div class="metric"><span>Tahmini sonraki tur</span><span>${esc(data.next_cycle_estimate_seconds ?? '-')} sn</span></div>
        <div class="metric"><span>Sürekli eğitim</span><span>${data.continuous_training ? 'AKTİF' : 'PASİF'}</span></div>
        <div class="metric"><span>Gözetmen</span><span>${esc(watchdog.status || 'yok')}</span></div>
        <div class="metric"><span>Mide kontrol</span><span>${esc(control.status || '-')} / ${esc(control.action || '-')}</span></div>
        <div class="metric"><span>Kontrol imzası</span><span>${esc(control.cycle_signature || '-')}</span></div>
        <div class="metric"><span>Gözetmen PID</span><span>${esc(watchdog.process_pid || '-')}</span></div>
        <div class="metric"><span>Yeniden başlatma</span><span>${esc(watchdog.restart_count ?? 0)}</span></div>
        <div class="metric"><span>Hoca kadrosu</span><span>${esc(data.teacher_summary?.active_teachers ?? 0)} / ${esc(data.teacher_summary?.total_teachers ?? 0)}</span></div>
        <div class="metric"><span>Dil sırası</span><span>${esc(languageLine || '-')}</span></div>
        <div class="metric"><span>Ajan / Modül / Algoritma / YZ</span><span>${esc(data.active_training_agents || 0)} / ${esc(data.active_training_modules || 0)} / ${esc(data.active_training_algorithms || 0)} / ${esc(data.active_training_ai_models || 0)}</span></div>
        <div class="metric"><span>YZ vardiya eğitimi</span><span>${esc(aiInventory.trained_this_cycle ?? data.active_training_ai_models ?? 0)} / ${esc(aiInventory.total ?? '-')}</span></div>
        <div class="metric"><span>ALBAY öncelik</span><span>${esc(data.albay_priority?.status || '-')}</span></div>
        <div class="truth">${esc(data.honesty_note || 'Ölçülmeyen şey yükseltilmiş gibi gösterilmez.')}</div>
        ${renderControlPanel(control)}
    `;
    const activity = data.live_activity || {};
    $('liveStrip').innerHTML = `
        <div class="pulse-card">
            <div class="pulse-dot"></div>
            <div class="pulse-main">
                <div class="pulse-title">CANLI TUR ${esc(data.cycle || '-')} / ${esc(heartbeat.phase || heartbeat.status || 'heartbeat')}</div>
                <div class="pulse-sub">Durum dosyası: ${esc(activity.state_file_age_seconds ?? '-')} sn | Heartbeat: ${esc(activity.heartbeat_age_seconds ?? '-')} sn | Son yoklama: ${esc(activity.server_poll_time || '-')}</div>
            </div>
            <div class="pulse-age">${esc(data.next_cycle_estimate_seconds ?? '-')}s</div>
        </div>
        ${renderLiveProgress(data.live_progress)}
    `;
}

function renderControlPanel(control) {
    const checks = Array.isArray(control.checks) ? control.checks : [];
    if (!checks.length) {
        return '<div class="truth">Mide kontrol kaydı bekleniyor. Kontrol dosyası oluşmadan eğitim başarı beyanı yapılmaz.</div>';
    }
    return `
        <div class="truth">
            <strong>Mide kontrol mekanizması:</strong> ${esc(control.status || '-')} | ${esc(control.timestamp || '-')}<br>
            ${checks.map(check => `${esc(check.name)}: ${esc(check.status)} (${esc(check.detail)})`).join('<br>')}
        </div>
    `;
}

function renderLiveProgress(progress) {
    if (!progress) {
        return '<div class="truth">Canlı ilerleme defteri bekleniyor.</div>';
    }
    const counts = progress.counts || {};
    const delta = progress.delta_from_previous || {};
    const focus = progress.focus || {};
    const focusRows = [
        ...(focus.agents || []).map(item => ({ ...item, type: 'Ajan' })),
        ...(focus.modules || []).map(item => ({ ...item, type: 'Modül' })),
        ...(focus.algorithms || []).map(item => ({ ...item, type: 'Algoritma' })),
        ...(focus.ai_models || []).map(item => ({ ...item, type: 'YZ' })),
    ].slice(0, 12);
    return `
        <div class="pulse-card">
            <div class="pulse-dot"></div>
            <div class="pulse-main">
                <div class="pulse-title">İLERLEME DEFTERİ / ${esc(progress.cycle_signature || '-')}</div>
                <div class="pulse-sub">Tamamlanan tur: ${esc(progress.completed_cycles ?? '-')} | Yazım aralığı: ${esc(progress.seconds_between_state_writes ?? '-')} sn | Vardiya hocası: ${esc(progress.teacher_shift?.id || '-')} ${esc(progress.teacher_shift?.specialty || '')}</div>
            </div>
            <div class="pulse-age">${esc(progress.cycle || '-')}</div>
        </div>
        <div class="teacher-grid">
            <div class="teacher-card"><div class="teacher-name">Ajan</div><div class="teacher-sub">${esc(counts.agents ?? 0)} / Δ ${esc(delta.agents ?? 0)}</div></div>
            <div class="teacher-card"><div class="teacher-name">Modül</div><div class="teacher-sub">${esc(counts.modules ?? 0)} / Δ ${esc(delta.modules ?? 0)}</div></div>
            <div class="teacher-card"><div class="teacher-name">Algoritma</div><div class="teacher-sub">${esc(counts.algorithms ?? 0)} / Δ ${esc(delta.algorithms ?? 0)}</div></div>
        </div>
        <div class="event-feed">
            ${focusRows.map(item => `
                <div class="event-row">
                    <div class="event-title"><span>${esc(item.type)} · ${esc(item.name)}</span><span>${esc(item.status || '-')}</span></div>
                    <div class="event-sub">Hoca: ${esc(item.teacher?.id || '-')} ${esc(item.teacher?.specialty || '')} | ${esc(item.training_name || item.selected_action || '-')}</div>
                </div>
            `).join('') || '<div class="empty">Bu tur odak kaydı bekleniyor.</div>'}
        </div>
    `;
}

function renderTeachers(data) {
    const summary = data.teacher_summary || {};
    const teachers = Array.isArray(data.teacher_roster) ? data.teacher_roster : [];
    const sample = teachers.slice(0, 12);
    const quotas = summary.layer_quota || {};
    const quotaLine = Object.entries(quotas).map(([key, value]) => `${key}:${value}`).join(' | ');
    $('teacherStrip').innerHTML = `
        <div class="pulse-card">
            <div class="pulse-dot"></div>
            <div class="pulse-main">
                <div class="pulse-title">123 HOCA KADROSU / ${esc(summary.active_teachers ?? 0)} AKTİF</div>
                <div class="pulse-sub">${esc(quotaLine || 'Katman kotası bekleniyor')}</div>
            </div>
            <div class="pulse-age">${esc(summary.total_teachers ?? teachers.length)}</div>
        </div>
        <div class="teacher-grid">
            ${sample.map(teacher => `
                <div class="teacher-card">
                    <div class="teacher-name">${esc(teacher.id)} ${esc(teacher.name)}</div>
                    <div class="teacher-sub">${esc(teacher.layer_id)} / ${esc(teacher.specialty)}</div>
                </div>
            `).join('')}
        </div>
        <div class="truth">${esc(summary.truth_boundary || 'Hoca kadrosu egitim takip sorumlulugudur.')}</div>
    `;
}

function teacherCountsByLayer(data) {
    const counts = {};
    const quotas = data.teacher_summary?.layer_quota || {};
    Object.entries(quotas).forEach(([layerId, total]) => {
        counts[layerId] = { total, active: 0 };
    });
    (Array.isArray(data.teacher_roster) ? data.teacher_roster : []).forEach(teacher => {
        const layerId = teacher.layer_id || 'UNKNOWN';
        if (!counts[layerId]) counts[layerId] = { total: 0, active: 0 };
        counts[layerId].total = Math.max(counts[layerId].total, 1);
        if (String(teacher.status || '').toLowerCase() === 'active') counts[layerId].active += 1;
    });
    return counts;
}

function renderLayers(data) {
    const layers = Array.isArray(data.department_layers) ? data.department_layers : [];
    const teacherCounts = teacherCountsByLayer(data);
    $('layers').innerHTML = layers.length ? layers.map(layer => {
        const teacherCount = teacherCounts[layer.id] || { total: 0, active: 0 };
        return `
        <div class="layer">
            <div class="layer-top">
                <div class="layer-name">${esc(layer.name || layer.id)}</div>
                <div class="badge ${badgeClass(layer.status)}">${esc(layer.status || '-')}</div>
            </div>
            <div class="layer-count">${esc(layer.trained_items ?? 0)}</div>
            <div class="layer-desc">Hoca: ${esc(teacherCount.active)} / ${esc(teacherCount.total)} | Katman: ${esc(layer.id || '-')}</div>
            <div class="layer-desc">Son tur: ${esc(layer.last_cycle ?? '-')} | Hata: ${esc(layer.error_items ?? 0)} | Atlanan: ${esc(layer.skipped_items ?? 0)}</div>
            <div class="layer-desc">${esc(layer.target || '')}</div>
            <div class="layer-desc">${esc(layer.truth_boundary || '')}</div>
        </div>
    `;
    }).join('') : '<div class="empty">Katman kaydı bekleniyor.</div>';
}

function eventLabel(item) {
    return item.event || item.status || item.phase || item.timestamp || item.raw || 'olay';
}

function eventDetail(item) {
    const parts = [];
    if (item.cycle !== undefined) parts.push(`tur ${item.cycle}`);
    if (item.department) parts.push(item.department);
    if (item.state) parts.push(item.state);
    if (item.prompt) parts.push(item.prompt);
    if (item.assigned_teacher_specialty) parts.push(item.assigned_teacher_specialty);
    if (Array.isArray(item.training_doors)) parts.push(item.training_doors.join(', '));
    if (item.error) parts.push(item.error);
    if (item.raw) parts.push(item.raw);
    return parts.join(' | ') || JSON.stringify(item).slice(0, 180);
}

function renderEvents(data) {
    const activity = data.live_activity || {};
    const sessionEvents = Array.isArray(activity.session_events) ? activity.session_events.slice().reverse() : [];
    const planningEvents = Array.isArray(activity.planning_events) ? activity.planning_events.slice().reverse() : [];
    const misunderstandingEvents = Array.isArray(activity.misunderstanding_events) ? activity.misunderstanding_events.slice().reverse() : [];
    $('eventCount').textContent = `${sessionEvents.length} olay`;
    $('planningCount').textContent = `${planningEvents.length} olay`;
    $('misunderstandingCount').textContent = `${misunderstandingEvents.length} kayıt`;
    $('events').innerHTML = sessionEvents.length ? sessionEvents.map(item => `
        <div class="event-row">
            <div class="event-title"><span>${esc(eventLabel(item))}</span><span>${esc(item.timestamp || '')}</span></div>
            <div class="event-sub">${esc(eventDetail(item))}</div>
        </div>
    `).join('') : '<div class="empty">Canlı eğitim olayı bekleniyor.</div>';
    $('planningEvents').innerHTML = planningEvents.length ? planningEvents.map(item => `
        <div class="event-row">
            <div class="event-title"><span>${esc(eventLabel(item))}</span><span>${esc(item.timestamp || '')}</span></div>
            <div class="event-sub">${esc(eventDetail(item))}</div>
        </div>
    `).join('') : '<div class="empty">Planlama olayı bekleniyor.</div>';
    $('misunderstandings').innerHTML = misunderstandingEvents.length ? misunderstandingEvents.map(item => `
        <div class="event-row">
            <div class="event-title"><span>${esc(item.status || eventLabel(item))}</span><span>${esc(item.timestamp || '')}</span></div>
            <div class="event-sub">${esc(eventDetail(item))}</div>
        </div>
    `).join('') : '<div class="empty">Anlaşılmayan komut kaydı yok.</div>';
}

function renderAgents(data) {
    const agents = Array.isArray(data.agents) ? data.agents : [];
    $('agentCount').textContent = `${agents.length} kayıt`;
    $('agents').innerHTML = agents.length ? agents.map(agent => {
        const info = Array.isArray(agent.taught_information) ? agent.taught_information : [];
        const profile = agent.skill_profile || {};
        return `
            <div class="item">
                <div class="item-title">
                    <span>${esc(agent.name)}</span>
                    <span>${esc(agent.percent_label || '0%')}</span>
                </div>
                <div class="item-sub">${esc(agent.training_name || agent.training_mode || 'eğitim kaydı')}</div>
                <div class="item-sub">Hoca: ${esc(agent.assigned_teacher?.id || '-')} ${esc(agent.assigned_teacher?.name || '')}</div>
                <div class="item-sub">Uzmanlık: ${esc((profile.domains || []).join(', ') || '-')} | Seçili beceri: ${esc(profile.selected_skill_count ?? 0)}/${esc(profile.available_skill_count ?? 0)}</div>
                <ul class="info-list">
                    ${info.slice(0, 5).map(line => `<li>${esc(line)}</li>`).join('')}
                    ${(profile.selected_skills || []).slice(0, 3).map(item => `<li>${esc(item.skill)} (${esc(item.score)})</li>`).join('')}
                </ul>
                <div class="item-sub">${esc(agent.what_changed || agent.skill_basis || '')}</div>
            </div>
        `;
    }).join('') : '<div class="empty">Ajan eğitim kaydı bekleniyor.</div>';
    const albay = data.albay_priority?.records?.[0];
    if (albay) {
        const profile = albay.skill_profile || {};
        $('agents').innerHTML = `
            <div class="item">
                <div class="item-title"><span>000 ALBAY ÖNCELİK</span><span>${esc(albay.priority || 'P1')}</span></div>
                <div class="item-sub">${esc(albay.training_name || '')}</div>
                <div class="item-sub">Hoca: ${esc(albay.assigned_teacher?.id || '-')} ${esc(albay.assigned_teacher?.name || '')}</div>
                <div class="item-sub">Dil eğitmeni: ${esc(albay.language_teacher?.id || data.albay_priority?.language_teacher?.id || '-')} ${esc(albay.language_teacher?.name || data.albay_priority?.language_teacher?.name || '')}</div>
                <div class="item-sub">Uzmanlık: ${esc((profile.domains || []).join(', ') || '-')} | Seçili beceri: ${esc(profile.selected_skill_count ?? 0)}/${esc(profile.available_skill_count ?? 0)}</div>
                <ul class="info-list">${(albay.taught_information || []).slice(0, 8).map(line => `<li>${esc(line)}</li>`).join('')}</ul>
                <div class="item-sub">${esc(albay.what_changed || '')}</div>
            </div>
        ` + $('agents').innerHTML;
    }
}

function renderWork(data) {
    const manifest = data.cycle_training_manifest || {};
    const modules = Array.isArray(manifest.modules) ? manifest.modules.slice(0, 12) : [];
    const algorithms = Array.isArray(manifest.algorithms) ? manifest.algorithms.slice(0, 15) : [];
    const aiModels = Array.isArray(manifest.ai_models) ? manifest.ai_models.slice(0, 20) : [];
    $('moduleCount').textContent = `${modules.length} modül / ${algorithms.length} algoritma / ${aiModels.length} YZ`;
    const moduleHtml = modules.map(item => `
        <div class="item">
            <div class="item-title"><span>${esc(item.name)}</span><span>${esc(item.status)}</span></div>
            <div class="item-sub">${esc(item.training_name || '')}</div>
            <div class="item-sub">Hoca: ${esc(item.assigned_teacher?.id || '-')} ${esc(item.assigned_teacher?.name || '')}</div>
            <div class="item-sub">Uzmanlık: ${esc((item.skill_profile?.domains || []).join(', ') || '-')} | Seçili beceri: ${esc(item.skill_profile?.selected_skill_count ?? 0)}/${esc(item.skill_profile?.available_skill_count ?? 0)}</div>
            <ul class="info-list">${(item.taught_information || []).slice(0, 3).map(line => `<li>${esc(line)}</li>`).join('')}</ul>
        </div>
    `).join('');
    const algoHtml = algorithms.map(item => `
        <div class="item">
            <div class="item-title"><span>${esc(item.name)}</span><span>${esc(item.status)}</span></div>
            <div class="item-sub">${esc(item.training_name || '')}</div>
            <div class="item-sub">Hoca: ${esc(item.assigned_teacher?.id || '-')} ${esc(item.assigned_teacher?.name || '')}</div>
            <div class="item-sub">Uzmanlık: ${esc((item.skill_profile?.domains || []).join(', ') || '-')}</div>
            <ul class="info-list">${(item.taught_information || []).slice(0, 2).map(line => `<li>${esc(line)}</li>`).join('')}</ul>
        </div>
    `).join('');
    const aiHtml = aiModels.map(item => `
        <div class="item">
            <div class="item-title"><span>${esc(item.name)}</span><span>${esc(item.status)}</span></div>
            <div class="item-sub">${esc(item.training_name || '')}</div>
            <div class="item-sub">Hoca: ${esc(item.assigned_teacher?.id || '-')} ${esc(item.assigned_teacher?.name || '')}</div>
            <div class="item-sub">Uzmanlık: ${esc((item.skill_profile?.domains || []).join(', ') || '-')} | Seçili beceri: ${esc(item.skill_profile?.selected_skill_count ?? 0)}/${esc(item.skill_profile?.available_skill_count ?? 0)}</div>
            <ul class="info-list">${(item.taught_information || []).slice(0, 3).map(line => `<li>${esc(line)}</li>`).join('')}</ul>
        </div>
    `).join('');
    $('work').innerHTML = moduleHtml + algoHtml + aiHtml || '<div class="empty">Modül/algoritma/YZ eğitim kaydı bekleniyor.</div>';
}

async function load() {
    try {
        const res = await fetch('/api/egitim-durumu', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStatus(data, false);
        renderSummary(data);
        renderTeachers(data);
        renderLayers(data);
        renderAgents(data);
        renderWork(data);
        renderEvents(data);
    } catch (err) {
        setStatus({}, true);
        $('summary').innerHTML = `<div class="truth">Eğitim API okunamadı: ${esc(err.message)}</div>`;
    }
}

load();
setInterval(load, 5000);
