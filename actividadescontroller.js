// ActividadesController — módulo de Actividades de Campo / KPIs (Recursos Hídricos)
const ActividadesController = (function () {
    const API = location.origin + '/api/actividades';
    let data = [];
    let filtros = { responsable: '', labor: '', estado: '', q: '' };

    const RESP = ['Jesus Alvarez', 'Jorge Gonzales', 'Jhonier Rayo', 'Grupo', 'Contratista'];
    const LABORES = ['Revision', 'Mantenimiento', 'Reparacion', 'Instalacion', 'Desinstalacion', 'Adecuacion', 'Fabricacion', 'Podas', 'Reposicion', 'Desconexion', 'Desenergizacion'];
    const ACCIONES = ['Equipo', 'Tractor', 'Infraestructura', 'Variador', 'Estacion', 'Cureña', 'Vagon', 'Guadaña apolo', 'Luminarias', 'Tanque', 'Motor', 'Transformador', 'Energia', 'Arrancador'];
    const ESTADOS = ['Terminado', 'En ejecución', 'Pendiente'];
    const DIESEL = ['331001', '331002', '331425', '336401', '336407', '336410', '336413', '336416', '336422', '336428', '337301', '336701', '336702', '336904', '336907', '336910'];

    async function init() {
        const cont = document.getElementById('actividades-content');
        cont.innerHTML = '<p style="color:var(--text-muted);">Cargando actividades…</p>';
        try {
            const r = await fetch(API);
            data = await r.json();
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
            (!filtros.q || ((a.zona || '') + (a.accion || '') + (a.labor || '') + (a.responsable || '')).toLowerCase().includes(filtros.q.toLowerCase()))
        ).sort((a, b) => {
            // más reciente primero (por fecha; empate por id para que lo recién creado quede arriba)
            const fa = a.fecha || '', fb = b.fecha || '';
            if (fa !== fb) return fb < fa ? -1 : 1;
            return String(b.id || '').localeCompare(String(a.id || ''));
        });
    }

    function kpis(rows) {
        const term = rows.filter(a => a.estado === 'Terminado').length;
        const pend = rows.filter(a => a.estado !== 'Terminado').length;
        const resp = new Set(rows.map(a => a.responsable)).size;
        const card = (lab, val, color) =>
            `<div class="glass-panel" style="padding:0.9rem 1.1rem;">
                <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">${lab}</div>
                <div style="font-size:1.6rem;font-weight:800;color:${color};margin-top:2px;line-height:1.1;">${val}</div>
            </div>`;
        return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:1.5rem;">
            ${card('Actividades', rows.length, 'var(--text-main)')}
            ${card('Terminadas', term, 'var(--primary)')}
            ${card('Pendientes/curso', pend, '#f5a623')}
            ${card('Responsables', resp, 'var(--text-main)')}
        </div>`;
    }

    function badge(estado) {
        const m = { 'Terminado': ['var(--primary)', 'rgba(47,178,74,.15)'], 'En ejecución': ['#f5a623', 'rgba(245,166,35,.15)'], 'Pendiente': ['var(--danger)', 'rgba(239,71,81,.15)'] };
        const c = m[estado] || ['var(--text-muted)', 'rgba(128,128,128,.15)'];
        return `<span style="background:${c[1]};color:${c[0]};padding:2px 10px;border-radius:999px;font-size:.72rem;font-weight:700;">${estado}</span>`;
    }

    function opts(arr, sel) { return '<option value="">Todos</option>' + arr.map(x => `<option ${x === sel ? 'selected' : ''}>${x}</option>`).join(''); }

    function render() {
        const rows = filtered();
        const fieldStyle = 'background:var(--bg-panel);color:var(--text-main);border:1px solid var(--glass-border);border-radius:8px;padding:.5rem .7rem;font-size:.85rem;outline:none;';
        const html = `
            ${kpis(rows)}
            <div class="glass-panel" style="padding:.7rem 1rem;margin-bottom:1.25rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;justify-content:space-between;">
                <div style="display:flex;gap:.6rem;flex-wrap:wrap;align-items:center;flex:1;">
                    <div style="position:relative;flex:1;min-width:180px;max-width:300px;">
                        <i data-lucide="search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;color:var(--text-muted);"></i>
                        <input id="act-q" placeholder="Buscar actividad…" value="${filtros.q}" style="${fieldStyle}width:100%;box-sizing:border-box;padding-left:36px;">
                    </div>
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
                <div style="max-height:60vh;overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
                    <thead><tr style="position:sticky;top:0;background:var(--bg-panel);z-index:1;">
                        ${['Fecha', 'Labor', 'Acción', 'Zona', 'Responsable', 'Estado', ''].map((h, i) => `<th style="text-align:${i === 6 ? 'right' : 'left'};padding:.7rem .9rem;color:var(--text-muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--glass-border);font-weight:700;">${h}</th>`).join('')}
                    </tr></thead>
                    <tbody>
                        ${rows.map(a => `<tr class="table-row" style="border-bottom:1px solid var(--glass-border);">
                            <td style="padding:.6rem .9rem;white-space:nowrap;font-family:monospace;color:var(--text-muted);">${a.fecha}</td>
                            <td style="padding:.6rem .9rem;color:var(--text-main);">${a.labor}</td>
                            <td style="padding:.6rem .9rem;color:var(--text-muted);">${a.accion}</td>
                            <td style="padding:.6rem .9rem;color:var(--text-muted);">${a.zona}</td>
                            <td style="padding:.6rem .9rem;color:var(--text-main);">${a.responsable}</td>
                            <td style="padding:.6rem .9rem;">${badge(a.estado)}</td>
                            <td style="padding:.6rem .9rem;text-align:right;"><button data-del="${a.id}" title="Eliminar" style="background:none;border:none;color:var(--danger);cursor:pointer;display:inline-flex;"><i data-lucide="trash-2" style="width:15px;"></i></button></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                </div>
                <div style="padding:.7rem .9rem;color:var(--text-muted);font-size:.78rem;border-top:1px solid var(--glass-border);">Mostrando ${rows.length} de ${data.length} actividades</div>
            </div>`;
        document.getElementById('actividades-content').innerHTML = html;
        wire();
        if (window.lucide) lucide.createIcons();
    }

    function wire() {
        const g = id => document.getElementById(id);
        g('act-q').oninput = e => { filtros.q = e.target.value; render(); };
        g('act-resp').onchange = e => { filtros.responsable = e.target.value; render(); };
        g('act-labor').onchange = e => { filtros.labor = e.target.value; render(); };
        g('act-estado').onchange = e => { filtros.estado = e.target.value; render(); };
        g('act-csv').onclick = exportCSV;
        g('act-nueva').onclick = toggleForm;
        document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => delAct(b.getAttribute('data-del')));
    }

    function toggleForm() {
        const f = document.getElementById('act-form');
        if (f.style.display === 'block') { f.style.display = 'none'; return; }
        const is = 'background:var(--input-bg,#fff);color:var(--text-main);border:1px solid var(--glass-border);border-radius:10px;padding:.5rem;font-size:.85rem;width:100%;';
        f.style.display = 'block'; f.style.padding = '1rem'; f.style.marginBottom = '1rem';
        f.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:.7rem;align-items:end;">
            <label style="font-size:.7rem;color:var(--text-muted);">Fecha<input id="nf-fecha" type="date" value="${new Date().toISOString().slice(0, 10)}" style="${is}"></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Responsable<select id="nf-resp" style="${is}">${RESP.map(x => `<option>${x}</option>`).join('')}</select></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Labor<select id="nf-labor" style="${is}">${LABORES.map(x => `<option>${x}</option>`).join('')}</select></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Acción<select id="nf-accion" style="${is}">${ACCIONES.map(x => `<option>${x}</option>`).join('')}</select></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Zona<input id="nf-zona" placeholder="Zona 1 / Zona 2…" style="${is}"></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Equipo (diésel)<select id="nf-equipo" style="${is}"><option value="">— (opcional)</option>${DIESEL.map(x => `<option>${x}</option>`).join('')}</select></label>
            <label style="font-size:.7rem;color:var(--text-muted);">Estado<select id="nf-estado" style="${is}">${ESTADOS.map(x => `<option>${x}</option>`).join('')}</select></label>
            <button id="nf-save" style="background:linear-gradient(135deg,var(--primary),var(--secondary));color:#fff;border:none;border-radius:10px;padding:.6rem 1rem;font-weight:600;cursor:pointer;">Guardar</button>
        </div>`;
        document.getElementById('nf-save').onclick = saveAct;
    }

    async function saveAct() {
        const v = id => document.getElementById(id).value;
        const body = { fecha: v('nf-fecha'), responsable: v('nf-resp'), labor: v('nf-labor'), accion: v('nf-accion'), zona: v('nf-zona') || '—', equipo: v('nf-equipo') || null, estado: v('nf-estado'), area: 'RECURSOS HIDRICOS' };
        await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        await init();
    }

    async function delAct(id) {
        if (!confirm('¿Eliminar esta actividad?')) return;
        await fetch(API + '/' + id, { method: 'DELETE' });
        await init();
    }

    function exportCSV() {
        const rows = filtered();
        const head = 'Fecha,Labor,Accion,Zona,Responsable,Estado\n';
        const body = rows.map(a => [a.fecha, a.labor, a.accion, a.zona, a.responsable, a.estado].map(x => `"${x}"`).join(',')).join('\n');
        const blob = new Blob(['﻿' + head + body], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'actividades_campo.csv'; a.click();
    }

    // Expuesto para que el Centro Diésel cruce validación
    function getData() { return data; }

    return { init, getData };
})();
