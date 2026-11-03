// ActividadesController — módulo de Actividades de Campo / KPIs (Recursos Hídricos)
const ActividadesController = (function () {
    const API = location.origin + '/api/actividades';
    let data = [];
    let filtros = { responsable: '', labor: '', estado: '', tipo: '', q: '' };
    let editId = null;

    const RESP = ['Jesus Alvarez', 'Jorge Gonzales', 'Jhonier Rayo', 'Grupo', 'Contratista'];
    const LABORES = ['Revision', 'Mantenimiento', 'Reparacion', 'Instalacion', 'Desinstalacion', 'Adecuacion', 'Fabricacion', 'Podas', 'Reposicion', 'Desconexion', 'Desenergizacion'];
    const ACCIONES = ['Equipo', 'Tractor', 'Infraestructura', 'Variador', 'Estacion', 'Cureña', 'Vagon', 'Guadaña apolo', 'Luminarias', 'Tanque', 'Motor', 'Transformador', 'Energia', 'Arrancador', 'Totalizador'];
    const TIPOS = ['RIEGO', 'GENERAL', 'DRENAJE'];
    const ESTADOS = ['Terminado', 'En ejecución', 'Pendiente'];

    // --- helpers de tiempo -------------------------------------------------
    const num = x => { const n = Number(String(x == null ? '' : x).replace(',', '.')); return isFinite(n) ? n : NaN; };
    const fRef = a => a.fecha_solicitud || a.fecha || '';           // fecha de referencia
    function parseD(s) { if (!s) return null; const p = String(s).slice(0, 10).split('-'); if (p.length < 3) return null; const d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }
    // días hábiles (lun–vie) inclusivos entre dos fechas; para calcular tiempos en registros nuevos
    function netDays(a, b) {
        const d1 = parseD(a), d2 = parseD(b); if (!d1 || !d2 || d2 < d1) return '';
        let n = 0, c = new Date(d1);
        while (c <= d2) { const w = c.getDay(); if (w !== 0 && w !== 6) n++; c.setDate(c.getDate() + 1); }
        return String(n);
    }
    function prom(rows, key) {
        const v = rows.map(a => num(a[key])).filter(n => isFinite(n));
        if (!v.length) return '—';
        return (v.reduce((s, n) => s + n, 0) / v.length).toFixed(1);
    }

    async function init() {
        const cont = document.getElementById('actividades-content');
        cont.innerHTML = '<p style="color:var(--text-muted);">Cargando actividades…</p>';
        try {
            const r = await fetch(API);
            const all = await r.json();
            // solo Recursos Hídricos activo (excluye archivo histórico / otras áreas)
            data = Array.isArray(all) ? all.filter(a => (a.area || 'RECURSOS HIDRICOS') === 'RECURSOS HIDRICOS') : [];
        } catch (e) {
            cont.innerHTML = '<p style="color:var(--danger);">No se pudo cargar. ¿Servidor arriba?</p>';
            return;
        }
        render();
    }

    function filtered() {
        return data.filter(a =>
            (!filtros.responsable || a.responsable === filtros.responsable) &&
            (!filtros.labor || a.labor === filtros.labor) &&
            (!filtros.estado || a.estado === filtros.estado) &&
            (!filtros.tipo || a.tipo === filtros.tipo) &&
            (!filtros.q || ((a.estacion || '') + (a.programacion || '') + (a.zona || '') + (a.apoyo || '') + (a.accion || '') + (a.labor || '') + (a.responsable || '') + (a.equipo || '')).toLowerCase().includes(filtros.q.toLowerCase()))
        ).sort((a, b) => {
            // más reciente primero (por fecha de solicitud; empate por No./id)
            const fa = fRef(a), fb = fRef(b);
            if (fa !== fb) return fb < fa ? -1 : 1;
            return (num(b.no) || 0) - (num(a.no) || 0) || String(b.id || '').localeCompare(String(a.id || ''));
        });
    }

    let vista = 'tablero';
    let _charts = [];

    function badge(estado) {
        const m = { 'Terminado': ['var(--primary)', 'rgba(47,178,74,.15)'], 'En ejecución': ['#c08a3a', 'rgba(192,138,58,.15)'], 'Pendiente': ['var(--danger)', 'rgba(239,71,81,.15)'] };
        const c = m[estado] || ['var(--text-muted)', 'rgba(128,128,128,.15)'];
        return `<span style="background:${c[1]};color:${c[0]};padding:2px 10px;border-radius:999px;font-size:.72rem;font-weight:700;white-space:nowrap;">${estado}</span>`;
    }
    function tipoTag(tipo) {
        const m = { 'RIEGO': '#2f7ad1', 'GENERAL': '#7a52c0', 'DRENAJE': '#c08a3a' };
        const c = m[tipo]; if (!c) return '';
        return `<span style="background:${c}22;color:${c};padding:2px 8px;border-radius:6px;font-size:.68rem;font-weight:700;">${tipo}</span>`;
    }

    function opts(arr, sel) { return '<option value="">Todos</option>' + arr.map(x => `<option ${x === sel ? 'selected' : ''}>${x}</option>`).join(''); }

    // colores del tema actual (claro/oscuro)
    function tc() {
        const cs = getComputedStyle(document.documentElement);
        const g = (n, f) => { const v = (cs.getPropertyValue(n) || '').trim(); return v || f; };
        return { text: g('--text-main', '#1a1f26'), muted: g('--text-muted', '#8a929b'), line: g('--glass-border', '#d7dbe0'),
                 green: g('--primary', '#2f7a47'), amber: '#c08a3a', red: g('--danger', '#c05058'), panel: g('--bg-panel', '#ffffff'),
                 blue: '#2f7ad1', violet: '#7a52c0' };
    }

    function kpiTiles(rows) {
        const term = rows.filter(a => a.estado === 'Terminado').length;
        const ejec = rows.filter(a => a.estado === 'En ejecución').length;
        const pend = rows.filter(a => a.estado === 'Pendiente').length;
        const resp = new Set(rows.map(a => a.responsable).filter(Boolean)).size;
        const cumpl = rows.length ? Math.round(term / rows.length * 100) : 0;
        const tResp = prom(rows, 'tiempo_respuesta');
        const tTot = prom(rows, 'tiempo_total');
        const card = (lab, val, color, sub) =>
            `<div class="glass-panel" style="padding:0.9rem 1.1rem;">
                <div style="font-size:0.68rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">${lab}</div>
                <div style="font-size:1.55rem;font-weight:800;color:${color};margin-top:2px;line-height:1.1;">${val}${sub || ''}</div>
            </div>`;
        const d = '<span style="font-size:.85rem;font-weight:700;color:var(--text-muted);"> d</span>';
        return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:1.25rem;">
            ${card('Total', rows.length, 'var(--text-main)')}
            ${card('Terminadas', term, 'var(--primary)')}
            ${card('En ejecución', ejec, '#c08a3a')}
            ${card('Pendientes', pend, pend ? 'var(--danger)' : 'var(--text-main)')}
            ${card('Cumplimiento', cumpl, 'var(--primary)', '<span style="font-size:.95rem;font-weight:700;">%</span>')}
            ${card('T. respuesta', tResp, 'var(--text-main)', tResp === '—' ? '' : d)}
            ${card('T. ejecución', tTot, 'var(--text-main)', tTot === '—' ? '' : d)}
            ${card('Responsables', resp, 'var(--text-main)')}
        </div>`;
    }

    function destroyCharts() { _charts.forEach(c => { try { c.destroy(); } catch (e) { } }); _charts = []; }

    function render() {
        destroyCharts();
        const rows = filtered();
        const tabBtn = (id, label) => `<button data-vista="${id}" style="padding:7px 16px;border-radius:7px;border:none;cursor:pointer;font-weight:700;font-size:.82rem;background:${vista === id ? 'var(--primary)' : 'transparent'};color:${vista === id ? '#fff' : 'var(--text-muted)'};">${label}</button>`;
        document.getElementById('actividades-content').innerHTML = `
            ${kpiTiles(rows)}
            <div style="display:inline-flex;background:var(--primary-soft);padding:4px;border-radius:10px;gap:4px;margin-bottom:1.25rem;">
                ${tabBtn('tablero', 'Tablero')}${tabBtn('listado', 'Listado')}
            </div>
            <div id="act-view"></div>`;
        document.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { vista = b.getAttribute('data-vista'); render(); });
        if (vista === 'tablero') renderTablero(rows); else renderListado(rows);
        if (window.lucide) lucide.createIcons();
    }

    function renderListado(rows) {
        const fieldStyle = 'background:var(--bg-panel);color:var(--text-main);border:1px solid var(--glass-border);border-radius:8px;padding:.5rem .7rem;font-size:.85rem;outline:none;';
        document.getElementById('act-view').innerHTML = `
            <div class="glass-panel" style="padding:.7rem 1rem;margin-bottom:1.25rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;flex:1;">
                    <div style="position:relative;flex:1;min-width:180px;max-width:300px;">
                        <i data-lucide="search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;color:var(--text-muted);"></i>
                        <input id="act-q" placeholder="Buscar actividad…" value="${filtros.q}" style="${fieldStyle}width:100%;box-sizing:border-box;padding-left:36px;">
                    </div>
                    <select id="act-tipo" style="${fieldStyle}">${opts(TIPOS, filtros.tipo)}</select>
                    <select id="act-resp" style="${fieldStyle}">${opts(RESP, filtros.responsable)}</select>
                    <select id="act-labor" style="${fieldStyle}">${opts(LABORES, filtros.labor)}</select>
                    <select id="act-estado" style="${fieldStyle}">${opts(ESTADOS, filtros.estado)}</select>
                </div>
                <div style="display:flex;gap:.5rem;align-items:center;">
                    <button id="act-nueva" style="background:var(--primary);color:#fff;border:1px solid var(--primary-strong);border-radius:8px;padding:.5rem 1rem;font-weight:700;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:6px;"><i data-lucide="plus" style="width:16px;"></i> Nueva</button>
                    <button id="act-csv" style="background:transparent;color:var(--text-muted);border:1px solid var(--glass-border);border-radius:8px;padding:.5rem .9rem;cursor:pointer;font-size:.85rem;display:inline-flex;align-items:center;gap:6px;"><i data-lucide="download" style="width:16px;"></i> Exportar</button>
                </div>
            </div>
            <div id="act-form" style="display:none;" class="glass-panel"></div>
            <div class="glass-panel" style="padding:0;overflow:hidden;">
                <div style="max-height:62vh;overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:.83rem;">
                    <thead><tr style="position:sticky;top:0;background:var(--bg-panel);z-index:1;">
                        ${['F. solicitud', 'Tipo', 'Labor', 'Acción', 'Programación', 'Estación', 'Responsable', 'Estado', 'T. resp', ''].map((h, i) => `<th style="text-align:${i === 9 ? 'right' : (i === 8 ? 'center' : 'left')};padding:.65rem .85rem;color:var(--text-muted);font-size:.68rem;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--glass-border);font-weight:700;white-space:nowrap;">${h}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                        ${rows.map(a => `<tr class="table-row" style="border-bottom:1px solid var(--glass-border);">
                            <td style="padding:.55rem .85rem;white-space:nowrap;font-family:monospace;color:var(--text-muted);">${fRef(a) || '—'}</td>
                            <td style="padding:.55rem .85rem;">${tipoTag(a.tipo) || '<span style="color:var(--text-muted);">—</span>'}</td>
                            <td style="padding:.55rem .85rem;color:var(--text-main);white-space:nowrap;">${a.labor || '—'}</td>
                            <td style="padding:.55rem .85rem;color:var(--text-muted);white-space:nowrap;">${a.accion || '—'}</td>
                            <td style="padding:.55rem .85rem;color:var(--text-main);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${(a.programacion || '').replace(/"/g, '&quot;')}">${a.programacion || '—'}</td>
                            <td style="padding:.55rem .85rem;color:var(--text-muted);white-space:nowrap;">${a.estacion || '—'}</td>
                            <td style="padding:.55rem .85rem;color:var(--text-main);white-space:nowrap;">${a.responsable || '—'}</td>
                            <td style="padding:.55rem .85rem;">${badge(a.estado)}</td>
                            <td style="padding:.55rem .85rem;text-align:center;color:var(--text-muted);font-family:monospace;">${a.tiempo_respuesta || '—'}</td>
                            <td style="padding:.55rem .85rem;text-align:right;white-space:nowrap;">
                                <button data-edit="${a.id}" title="Editar" style="background:none;border:none;color:var(--text-muted);cursor:pointer;display:inline-flex;margin-right:6px;"><i data-lucide="pencil" style="width:15px;"></i></button>
                                <button data-del="${a.id}" title="Eliminar" style="background:none;border:none;color:var(--danger);cursor:pointer;display:inline-flex;"><i data-lucide="trash-2" style="width:15px;"></i></button>
                            </td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                </div>
                <div style="padding:.7rem .9rem;color:var(--text-muted);font-size:.78rem;border-top:1px solid var(--glass-border);">Mostrando ${rows.length} de ${data.length} actividades</div>
            </div>`;
        wire();
        if (editId !== null) openForm(editId);
        if (window.lucide) lucide.createIcons();
    }

    function aggBy(rows, key) {
        const m = {}; rows.forEach(a => { const k = (a[key] || '—'); m[k] = (m[k] || 0) + 1; });
        return Object.keys(m).map(k => ({ k, v: m[k] })).sort((a, b) => b.v - a.v);
    }
    function promBy(rows, groupKey, valKey) {
        const m = {};
        rows.forEach(a => { const g = a[groupKey]; const n = num(a[valKey]); if (!g || !isFinite(n)) return; (m[g] = m[g] || []).push(n); });
        return Object.keys(m).map(k => ({ k, v: +(m[k].reduce((s, n) => s + n, 0) / m[k].length).toFixed(1) })).sort((a, b) => b.v - a.v);
    }

    // etiqueta de valor al final de barras horizontales
    const pBarLabels = { id: 'pBarLabels', afterDatasetsDraw(chart) {
        const ctx = chart.ctx; const col = tc();
        chart.data.datasets.forEach((ds, di) => {
            const meta = chart.getDatasetMeta(di); if (meta.hidden) return;
            meta.data.forEach((bar, i) => {
                const v = ds.data[i]; if (!v) return;
                ctx.save(); ctx.fillStyle = col.text; ctx.font = '600 11px Inter, system-ui, sans-serif';
                ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
                ctx.fillText(v, bar.x + 6, bar.y); ctx.restore();
            });
        });
    } };
    function pCenter(total) {
        return { id: 'pCenter', afterDraw(chart) {
            const ca = chart.chartArea; if (!ca) return; const col = tc(); const ctx = chart.ctx;
            const cx = ca.left + ca.width / 2, cy = ca.top + ca.height / 2;
            ctx.save(); ctx.textAlign = 'center';
            ctx.fillStyle = col.text; ctx.font = '800 26px Inter, system-ui, sans-serif'; ctx.fillText(total, cx, cy - 2);
            ctx.fillStyle = col.muted; ctx.font = '600 10px Inter, system-ui, sans-serif'; ctx.fillText('ACTIVIDADES', cx, cy + 16);
            ctx.restore();
        } };
    }

    function renderTablero(rows) {
        const host = document.getElementById('act-view');
        const title = t => `<div style="font-weight:700;font-size:.95rem;margin-bottom:.9rem;color:var(--text-main);">${t}</div>`;
        host.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;">
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Distribución por estado')}<div style="position:relative;height:250px;"><canvas id="ch-estado"></canvas></div></div>
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Distribución por tipo')}<div style="position:relative;height:250px;"><canvas id="ch-tipo"></canvas></div></div>
            </div>
            <div class="glass-panel" style="padding:1.1rem 1.2rem;margin-top:1rem;">${title('Actividades por responsable')}<div style="position:relative;height:260px;"><canvas id="ch-resp"></canvas></div></div>
            <div class="glass-panel" style="padding:1.1rem 1.2rem;margin-top:1rem;">${title('Tendencia mensual (por fecha de solicitud)')}<div style="position:relative;height:280px;"><canvas id="ch-mes"></canvas></div></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Tiempo de respuesta prom. (días háb.) por responsable')}<div style="position:relative;height:240px;"><canvas id="ch-tresp"></canvas></div></div>
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Actividades por estación (top 12)')}<div style="position:relative;height:360px;"><canvas id="ch-estacion"></canvas></div></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;margin-top:1rem;">
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Actividades por acción')}<div style="position:relative;height:340px;"><canvas id="ch-accion"></canvas></div></div>
                <div class="glass-panel" style="padding:1.1rem 1.2rem;">${title('Actividades por labor')}<div style="position:relative;height:340px;"><canvas id="ch-labor"></canvas></div></div>
            </div>`;
        if (!window.Chart) { host.insertAdjacentHTML('afterbegin', '<p style="color:var(--danger);">No se pudieron cargar las gráficas (Chart.js).</p>'); return; }
        buildCharts(rows);
    }

    function buildCharts(rows) {
        const col = tc();
        const EST = ['Terminado', 'En ejecución', 'Pendiente'];
        const EC = { 'Terminado': col.green, 'En ejecución': col.amber, 'Pendiente': col.red };
        const TC_ = { 'RIEGO': col.blue, 'GENERAL': col.violet, 'DRENAJE': col.amber };
        const axis = () => ({ ticks: { color: col.muted, font: { size: 11 } }, grid: { color: col.line }, border: { display: false } });
        const legend = (pos) => ({ position: pos || 'top', labels: { color: col.muted, usePointStyle: true, pointStyleWidth: 8, boxHeight: 7, font: { size: 11 } } });
        const C = (el, cfg) => { const e = document.getElementById(el); if (e) _charts.push(new Chart(e, cfg)); };

        // 1) Distribución por estado (doughnut)
        C('ch-estado', {
            type: 'doughnut',
            data: { labels: EST, datasets: [{ data: EST.map(e => rows.filter(a => a.estado === e).length), backgroundColor: EST.map(e => EC[e]), borderColor: col.panel, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: legend('bottom') } },
            plugins: [pCenter(rows.length)]
        });

        // 2) Distribución por tipo (doughnut)
        const tipos = TIPOS.filter(t => rows.some(a => a.tipo === t));
        C('ch-tipo', {
            type: 'doughnut',
            data: { labels: tipos, datasets: [{ data: tipos.map(t => rows.filter(a => a.tipo === t).length), backgroundColor: tipos.map(t => TC_[t]), borderColor: col.panel, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: legend('bottom') } }
        });

        // 3) Por responsable (barras apiladas por estado)
        const resps = [...new Set(rows.map(a => a.responsable).filter(Boolean))];
        C('ch-resp', {
            type: 'bar',
            data: { labels: resps, datasets: EST.map(e => ({ label: e, data: resps.map(r => rows.filter(a => a.responsable === r && a.estado === e).length), backgroundColor: EC[e], borderRadius: 4, maxBarThickness: 54 })) },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: legend('top') }, scales: { x: Object.assign({ stacked: true }, axis()), y: Object.assign({ stacked: true, beginAtZero: true }, axis()) } }
        });

        // 4) Tendencia mensual (área por estado)
        const meses = [...new Set(rows.map(a => fRef(a).slice(0, 7)).filter(Boolean))].sort();
        const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        const mLab = meses.map(m => { const p = m.split('-'); return (MES[(+p[1]) - 1] || p[1]) + ' ' + p[0]; });
        C('ch-mes', {
            type: 'line',
            data: { labels: mLab, datasets: EST.map(e => ({ label: e, data: meses.map(m => rows.filter(a => fRef(a).slice(0, 7) === m && a.estado === e).length), borderColor: EC[e], backgroundColor: EC[e] + '2e', fill: true, tension: .35, borderWidth: 2, pointRadius: 2, pointHoverRadius: 4 })) },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: legend('top') }, scales: { x: axis(), y: Object.assign({ beginAtZero: true }, axis()) } }
        });

        // 5) Tiempo de respuesta promedio por responsable (barras)
        const tr = promBy(rows, 'responsable', 'tiempo_respuesta');
        C('ch-tresp', {
            type: 'bar',
            data: { labels: tr.map(x => x.k), datasets: [{ data: tr.map(x => x.v), backgroundColor: col.blue, borderRadius: 4, maxBarThickness: 46 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: axis(), y: Object.assign({ beginAtZero: true }, axis()) } }
        });

        // 6) Por estación (barras horizontales, top 12)
        const est = aggBy(rows.filter(a => a.estacion), 'estacion').slice(0, 12);
        C('ch-estacion', {
            type: 'bar',
            data: { labels: est.map(x => x.k), datasets: [{ data: est.map(x => x.v), backgroundColor: col.violet, borderRadius: 4, maxBarThickness: 20 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 24 } }, plugins: { legend: { display: false } }, scales: { x: Object.assign({ beginAtZero: true }, axis()), y: axis() } },
            plugins: [pBarLabels]
        });

        // 7) Por acción (barras horizontales, top 12)
        const acc = aggBy(rows, 'accion').slice(0, 12);
        C('ch-accion', {
            type: 'bar',
            data: { labels: acc.map(x => x.k), datasets: [{ data: acc.map(x => x.v), backgroundColor: col.green, borderRadius: 4, maxBarThickness: 22 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 24 } }, plugins: { legend: { display: false } }, scales: { x: Object.assign({ beginAtZero: true }, axis()), y: axis() } },
            plugins: [pBarLabels]
        });

        // 8) Por labor (barras horizontales, top 12)
        const lab = aggBy(rows, 'labor').slice(0, 12);
        C('ch-labor', {
            type: 'bar',
            data: { labels: lab.map(x => x.k), datasets: [{ data: lab.map(x => x.v), backgroundColor: col.amber, borderRadius: 4, maxBarThickness: 22 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, layout: { padding: { right: 24 } }, plugins: { legend: { display: false } }, scales: { x: Object.assign({ beginAtZero: true }, axis()), y: axis() } },
            plugins: [pBarLabels]
        });
    }

    function wire() {
        const g = id => document.getElementById(id);
        g('act-q').oninput = e => { filtros.q = e.target.value; render(); };
        g('act-tipo').onchange = e => { filtros.tipo = e.target.value; render(); };
        g('act-resp').onchange = e => { filtros.responsable = e.target.value; render(); };
        g('act-labor').onchange = e => { filtros.labor = e.target.value; render(); };
        g('act-estado').onchange = e => { filtros.estado = e.target.value; render(); };
        g('act-csv').onclick = exportCSV;
        g('act-nueva').onclick = () => { editId = (editId === '' ? null : ''); const f = document.getElementById('act-form'); if (editId === null) { f.style.display = 'none'; } else { openForm(''); } };
        document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delAct(b.getAttribute('data-del')));
        document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { editId = b.getAttribute('data-edit'); openForm(editId); });
    }

    // id==='' → nueva; id==='<id>' → editar
    function openForm(id) {
        const f = document.getElementById('act-form');
        if (!f) return;
        const a = id ? (data.find(x => String(x.id) === String(id)) || {}) : {};
        const is = 'background:var(--input-bg,#fff);color:var(--text-main);border:1px solid var(--glass-border);border-radius:9px;padding:.5rem;font-size:.85rem;width:100%;box-sizing:border-box;';
        const lab = (t, inner) => `<label style="font-size:.68rem;color:var(--text-muted);display:block;">${t}${inner}</label>`;
        const sel = (id2, arr, val, extra) => `<select id="${id2}" style="${is}">${(extra ? `<option value="">${extra}</option>` : '')}${arr.map(x => `<option ${x === val ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
        const inp = (id2, val, ph, type) => `<input id="${id2}" ${type ? `type="${type}"` : ''} value="${(val == null ? '' : String(val)).replace(/"/g, '&quot;')}" placeholder="${ph || ''}" style="${is}">`;
        f.style.display = 'block'; f.style.padding = '1.1rem'; f.style.marginBottom = '1.25rem';
        f.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.9rem;">
                <div style="font-weight:700;color:var(--text-main);">${id ? 'Editar actividad' : 'Nueva actividad'}</div>
                <button id="nf-close" style="background:none;border:none;color:var(--text-muted);cursor:pointer;"><i data-lucide="x" style="width:18px;"></i></button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:.75rem;">
                ${lab('Tipo', sel('nf-tipo', TIPOS, a.tipo || 'RIEGO'))}
                ${lab('Labor', sel('nf-labor', LABORES, a.labor || 'Mantenimiento'))}
                ${lab('Acción', sel('nf-accion', ACCIONES, a.accion || 'Equipo'))}
                ${lab('Responsable', sel('nf-resp', RESP, a.responsable || RESP[0]))}
                ${lab('Estado', sel('nf-estado', ESTADOS, a.estado || 'Pendiente'))}
                ${lab('Apoyo / Zona', inp('nf-apoyo', a.apoyo || a.zona, 'Zona 1 / Zona 2…'))}
                ${lab('Estación', inp('nf-estacion', a.estacion, 'Luisa 1, El Durán…'))}
                ${lab('Equipo', inp('nf-equipo', a.equipo && a.equipo !== 'N/A' ? a.equipo : '', 'Código (opcional)'))}
                ${lab('Contratista', inp('nf-contratista', a.contratista && a.contratista !== 'N/A' ? a.contratista : '', 'Opcional'))}
                ${lab('Fecha solicitud', inp('nf-fsol', a.fecha_solicitud || a.fecha || new Date().toISOString().slice(0, 10), '', 'date'))}
                ${lab('Fecha tentativa', inp('nf-ftent', a.fecha_tentativa, '', 'date'))}
                ${lab('Fecha inicio', inp('nf-fini', a.fecha_inicio, '', 'date'))}
                ${lab('Fecha finalización', inp('nf-ffin', a.fecha_finalizacion, '', 'date'))}
            </div>
            <div style="margin-top:.75rem;">${lab('Programación (descripción de la tarea)', `<textarea id="nf-prog" rows="2" style="${is}resize:vertical;">${(a.programacion || '').replace(/</g, '&lt;')}</textarea>`)}</div>
            <div style="margin-top:.75rem;">${lab('Observaciones', `<textarea id="nf-obs" rows="2" style="${is}resize:vertical;">${(a.observaciones || '').replace(/</g, '&lt;')}</textarea>`)}</div>
            <div style="margin-top:1rem;display:flex;gap:.6rem;align-items:center;">
                <button id="nf-save" style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;border-radius:10px;padding:.6rem 1.3rem;font-weight:700;cursor:pointer;">${id ? 'Guardar cambios' : 'Crear actividad'}</button>
                <span style="font-size:.72rem;color:var(--text-muted);">Los tiempos (respuesta / ejecución / pausa) se calculan con las fechas.</span>
            </div>`;
        document.getElementById('nf-save').onclick = () => saveAct(id);
        document.getElementById('nf-close').onclick = () => { editId = null; f.style.display = 'none'; };
        if (window.lucide) lucide.createIcons();
        f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async function saveAct(id) {
        const v = id2 => { const e = document.getElementById(id2); return e ? e.value.trim() : ''; };
        const fsol = v('nf-fsol'), ftent = v('nf-ftent'), fini = v('nf-fini'), ffin = v('nf-ffin');
        const body = {
            tipo: v('nf-tipo'), labor: v('nf-labor'), accion: v('nf-accion'), responsable: v('nf-resp'), estado: v('nf-estado'),
            apoyo: v('nf-apoyo') || '', zona: v('nf-apoyo') || '—', estacion: v('nf-estacion') || '',
            equipo: v('nf-equipo') || null, contratista: v('nf-contratista') || '',
            programacion: v('nf-prog') || '', observaciones: v('nf-obs') || '',
            fecha: fsol, fecha_solicitud: fsol, fecha_tentativa: ftent, fecha_inicio: fini, fecha_finalizacion: ffin,
            tiempo_respuesta: (fsol && fini) ? netDays(fsol, fini) : '',
            tiempo_total: (fini && ffin) ? netDays(fini, ffin) : '',
            area: 'RECURSOS HIDRICOS'
        };
        if (id) {
            await fetch(API + '/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
            await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        editId = null;
        await init();
    }

    async function delAct(id) {
        if (!confirm('¿Eliminar esta actividad?')) return;
        await fetch(API + '/' + id, { method: 'DELETE' });
        await init();
    }

    function exportCSV() {
        const rows = filtered();
        const cols = ['no', 'tipo', 'labor', 'accion', 'programacion', 'apoyo', 'estacion', 'equipo', 'contratista', 'fecha_solicitud', 'fecha_tentativa', 'responsable', 'estado', 'fecha_inicio', 'fecha_finalizacion', 'dias_pausados', 'tiempo_total', 'tiempo_respuesta', 'observaciones'];
        const head = cols.join(',') + '\n';
        const body = rows.map(a => cols.map(c => `"${(a[c] == null ? '' : String(a[c])).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + head + body], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'actividades_campo.csv'; a.click();
    }

    // Expuesto para que el Centro Diésel cruce validación
    function getData() { return data; }

    return { init, getData };
})();
