// CentroController — Centro de Mantenimiento Diésel (corazón del app)
const CentroController = (function () {
    const APIp = location.origin + '/api/planes';
    const APIb = location.origin + '/api/boletas';
    const APIa = location.origin + '/api/actividades';
    const DIESEL = ['331001', '331002', '331425', '336401', '336407', '336410', '336413', '336416', '336422', '336428', '337301', '336701', '336702', '336904', '336907', '336910'];
    const TRACT = ['331001', '331002', '331425'];
    const NOMBRE = {
        '331001': 'Tractor Farmall 75HP', '331002': 'Tractor Farmall 75HP', '331425': 'Tractor Quantum 65V',
        '336401': 'Motobomba Perkins', '336907': 'Bomba diésel hidroaxial'
    };
    let planes = [];
    let actividades = [];   // actividades de campo (Recursos Hídricos)
    let ventana = { min: null, max: null };   // rango de fechas con actividad registrada

    async function init() {
        const cont = document.getElementById('centro-content');
        cont.innerHTML = '<p style="color:var(--text-muted);">Cargando…</p>';
        try {
            const [rp, ra] = await Promise.all([fetch(APIp), fetch(APIa)]);
            planes = await rp.json();
            actividades = await ra.json();
        } catch (e) {
            cont.innerHTML = '<p style="color:var(--danger);">No se pudo cargar. ¿Servidor arriba?</p>';
            return;
        }
        // Actividades que cuentan como "ejecución en equipo diésel": acción Equipo/Tractor + labor de mtto/revisión
        // Labores de campo que cuentan como ejecución: por equipo (exacto) o, si no trae equipo, acción Equipo/Tractor + mtto/revisión
        campoList = actividades
            .filter(a => a.fecha && (a.equipo || (['Equipo', 'Tractor'].includes(a.accion) && ['Mantenimiento', 'Revision'].includes(a.labor))))
            .map(a => ({ fecha: a.fecha, equipo: a.equipo || null }));
        const fechas = campoList.map(a => a.fecha).sort();
        ventana.min = fechas[0] || null;
        ventana.max = fechas[fechas.length - 1] || null;
        render();
    }

    let campoList = [];
    const DAY = 86400000;
    // Devuelve {val, tot} de preventivos validados en campo (±2 días). Match EXACTO por equipo si la labor lo trae; si no, por fecha.
    function validacion(eq) {
        const prev = planes.filter(p => p.equipo === eq && String(p.id).startsWith('SA-') && (p.tipo || '').includes('998') && p.fechaEjecucion);
        const enVentana = prev.filter(p => ventana.min && p.fechaEjecucion >= ventana.min && p.fechaEjecucion <= ventana.max);
        if (!enVentana.length) return { val: 0, tot: 0 };
        let val = 0;
        for (const p of enVentana) {
            const t = new Date(p.fechaEjecucion + 'T00:00:00').getTime();
            const hit = campoList.some(a =>
                Math.abs(new Date(a.fecha + 'T00:00:00').getTime() - t) <= 2 * DAY &&
                (a.equipo ? a.equipo === eq : true)   // con equipo → exacto; sin equipo → por fecha
            );
            if (hit) val++;
        }
        return { val, tot: enVentana.length };
    }

    function resumenEquipo(eq) {
        const sa = planes.filter(p => p.equipo === eq && String(p.id).startsWith('SA-'));
        const prev = sa.filter(p => (p.tipo || '').includes('998'));
        const corr = sa.filter(p => (p.tipo || '').includes('999'));
        const fechas = prev.map(p => p.fechaEjecucion).filter(Boolean).sort();
        const ult = fechas.length ? fechas[fechas.length - 1] : null;
        const dias = ult ? Math.floor((Date.now() - new Date(ult + 'T00:00:00')) / 86400000) : null;
        const costo = sa.reduce((s, p) => s + (p.costoTotal || 0), 0);
        const tpl = planes.find(p => p.equipo === eq && p.estado === 'PLANTILLA');
        return { nprev: prev.length, ncorr: corr.length, ult, dias, costo, tpl };
    }

    function card(val, lab, color) {
        return `<div class="glass-panel" style="padding:1.1rem 1.3rem;flex:1;min-width:150px;">
            <div style="font-size:1.9rem;font-weight:800;color:${color};line-height:1;">${val}</div>
            <div style="font-size:.68rem;letter-spacing:.8px;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-top:.3rem;">${lab}</div>
        </div>`;
    }

    function money(n) { return '$ ' + (n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 }); }

    let tab = 'panel';
    const TH = h => `<th style="text-align:left;padding:.7rem .9rem;color:var(--text-muted);font-size:.68rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--glass-border);">${h}</th>`;
    const tipoBadge = t => {
        const prev = (t || '').includes('998');
        const c = prev ? ['var(--primary)', 'var(--primary-soft)'] : ['var(--warn,#c08a3a)', 'rgba(192,138,58,.14)'];
        return `<span style="background:${c[1]};color:${c[0]};padding:2px 9px;border-radius:3px;font-size:.72rem;font-weight:600;">${prev ? 'PREVENTIVO' : 'CORRECTIVO'}</span>`;
    };
    const mats = p => Array.isArray(p.materiales) ? p.materiales : JSON.parse(p.materiales || '[]');

    function render() {
        const R = DIESEL.map(eq => ({ eq, ...resumenEquipo(eq) }));
        const totInt = R.reduce((s, r) => s + r.nprev + r.ncorr, 0);
        const totCosto = R.reduce((s, r) => s + r.costo, 0);
        const conTpl = R.filter(r => r.tpl).length;
        let gVal = 0, gTot = 0;
        R.forEach(r => { const v = validacion(r.eq); r._v = v; gVal += v.val; gTot += v.tot; });

        const tabBtn = (id, label) =>
            `<button data-tab="${id}" style="background:${tab === id ? 'var(--primary-soft)' : 'transparent'};color:${tab === id ? 'var(--primary-strong)' : 'var(--text-muted)'};border:none;border-bottom:2px solid ${tab === id ? 'var(--primary)' : 'transparent'};padding:.6rem 1.1rem;font-weight:600;font-size:.85rem;cursor:pointer;">${label}</button>`;

        document.getElementById('centro-content').innerHTML = `
            <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.3rem;">
                ${card(DIESEL.length, 'Equipos diésel', 'var(--text-main)')}
                ${card(totInt, 'Intervenciones', 'var(--accent-info)')}
                ${card(conTpl + '/' + DIESEL.length, 'Con plantilla', 'var(--primary)')}
                ${card(gTot ? gVal + '/' + gTot : '—', 'Validados en campo', 'var(--accent-info)')}
                ${card(money(totCosto), 'OPEX acumulado', 'var(--accent-gold,#b8923e)')}
            </div>
            <div style="border-bottom:1px solid var(--glass-border);margin-bottom:1rem;display:flex;gap:.2rem;">
                ${tabBtn('panel', 'Panel por equipo')}
                ${tabBtn('historico', 'Histórico (' + totInt + ')')}
                ${tabBtn('plantillas', 'Plantillas')}
                ${tabBtn('analitica', 'Analítica')}
            </div>
            <div id="centro-tab"></div>`;

        document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.getAttribute('data-tab'); render(); });
        const host = document.getElementById('centro-tab');
        if (tab === 'panel') renderPanel(host, R);
        else if (tab === 'historico') renderHistorico(host);
        else if (tab === 'analitica') renderAnalitica(host);
        else renderPlantillas(host);
    }

    let charts = [];
    function destroyCharts() { charts.forEach(c => { try { c.destroy(); } catch (e) { } }); charts = []; }

    function renderAnalitica(host) {
        destroyCharts();
        const sa = planes.filter(p => DIESEL.includes(p.equipo) && String(p.id).startsWith('SA-'));
        const cMuted = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8a929b';
        const cPrim = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#3f8a57';
        const cWarn = getComputedStyle(document.documentElement).getPropertyValue('--warn').trim() || '#c08a3a';
        const cLine = getComputedStyle(document.documentElement).getPropertyValue('--glass-border').trim() || '#2b2f35';
        const noGrid = { grid: { display: false, drawBorder: false }, ticks: { color: cMuted, font: { size: 10 } } };

        // Datos
        const byMonth = {};
        sa.forEach(p => { if (!p.fechaEjecucion) return; const m = p.fechaEjecucion.slice(0, 7); byMonth[m] = (byMonth[m] || 0) + (p.costoTotal || 0); });
        const months = Object.keys(byMonth).sort().slice(-12);
        const nPrev = sa.filter(p => (p.tipo || '').includes('998')).length;
        const nCorr = sa.filter(p => (p.tipo || '').includes('999')).length;
        const byEq = {};
        sa.forEach(p => { byEq[p.equipo] = (byEq[p.equipo] || 0) + (p.costoTotal || 0); });
        const top = Object.entries(byEq).sort((a, b) => b[1] - a[1]).slice(0, 10);

        host.innerHTML = `
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem;">
                <div class="glass-panel" style="padding:1rem;"><h3 style="margin:0 0 .8rem;">Costo OPEX por mes</h3><div style="height:240px;"><canvas id="ch-opex"></canvas></div></div>
                <div class="glass-panel" style="padding:1rem;"><h3 style="margin:0 0 .8rem;">Preventivo vs Correctivo</h3><div style="height:240px;"><canvas id="ch-pc"></canvas></div></div>
                <div class="glass-panel" style="padding:1rem;grid-column:1/-1;"><h3 style="margin:0 0 .8rem;">Top 10 equipos por inversión (COP)</h3><div style="height:300px;"><canvas id="ch-top"></canvas></div></div>
            </div>`;

        charts.push(new Chart(document.getElementById('ch-opex'), {
            type: 'bar',
            data: { labels: months, datasets: [{ data: months.map(m => Math.round(byMonth[m])), backgroundColor: cPrim, borderRadius: 3, maxBarThickness: 28 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { x: noGrid, y: { ...noGrid, ticks: { ...noGrid.ticks, callback: v => '$' + (v / 1e6).toFixed(0) + 'M' } } } }
        }));
        charts.push(new Chart(document.getElementById('ch-pc'), {
            type: 'doughnut',
            data: { labels: ['Preventivo', 'Correctivo'], datasets: [{ data: [nPrev, nCorr], backgroundColor: [cPrim, cWarn], borderColor: cLine, borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: cMuted, font: { size: 11 }, padding: 14 } }, datalabels: { color: '#fff', font: { weight: 'bold' } } } }
        }));
        charts.push(new Chart(document.getElementById('ch-top'), {
            type: 'bar',
            data: { labels: top.map(t => t[0]), datasets: [{ data: top.map(t => Math.round(t[1])), backgroundColor: cPrim, borderRadius: 3, maxBarThickness: 20 }] },
            options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } }, scales: { x: { ...noGrid, ticks: { ...noGrid.ticks, callback: v => '$' + (v / 1e6).toFixed(0) + 'M' } }, y: noGrid } }
        }));
    }

    function renderPanel(host, R) {
        const rowHtml = r => {
            const clase = TRACT.includes(r.eq) ? 'TRACTOR' : 'BOMBA';
            const nombre = NOMBRE[r.eq] || ('Motobomba diésel ' + r.eq);
            const semClass = r.dias == null ? 'sem-crit' : (r.dias > 90 ? 'sem-warn' : 'sem-ok');
            const estadoColor = r.dias == null ? 'var(--danger)' : (r.dias > 90 ? 'var(--warn,#c08a3a)' : 'var(--primary)');
            const estadoTxt = `<span class="sem-dot ${semClass}"></span>` + (r.ult ? `${r.dias} días` : 'sin preventivo');
            const btn = r.tpl
                ? `<button data-boleta="${r.eq}" style="background:var(--primary);color:#fff;border:1px solid var(--primary-strong);border-radius:4px;padding:.38rem .8rem;font-size:.76rem;font-weight:600;cursor:pointer;">Generar boleta</button>`
                : `<span style="color:var(--text-muted);font-size:.75rem;">sin plantilla</span>`;
            let valCell;
            if (r._v.tot === 0) valCell = `<span style="color:var(--text-muted);font-size:.75rem;">— s/ datos</span>`;
            else {
                const full = r._v.val === r._v.tot;
                const col = full ? 'var(--primary)' : (r._v.val > 0 ? 'var(--warn,#c08a3a)' : 'var(--danger)');
                const bg = full ? 'var(--primary-soft)' : (r._v.val > 0 ? 'rgba(192,138,58,.14)' : 'rgba(192,80,88,.14)');
                valCell = `<span title="Preventivos con labor del mecánico a ±2 días" style="background:${bg};color:${col};padding:2px 10px;border-radius:3px;font-size:.74rem;font-weight:700;">${r._v.val}/${r._v.tot} ${full ? '✓' : ''}</span>`;
            }
            return `<tr style="border-bottom:1px solid var(--line);">
                <td style="padding:.6rem .9rem;font-weight:700;">${r.eq}</td>
                <td style="padding:.6rem .9rem;">${nombre}</td>
                <td style="padding:.6rem .9rem;text-align:center;">${clase}</td>
                <td style="padding:.6rem .9rem;text-align:center;">${r.nprev}</td>
                <td style="padding:.6rem .9rem;text-align:center;">${r.ncorr}</td>
                <td style="padding:.6rem .9rem;white-space:nowrap;">${r.ult || '—'}</td>
                <td style="padding:.6rem .9rem;color:${estadoColor};font-weight:600;">${estadoTxt}</td>
                <td style="padding:.6rem .9rem;text-align:center;">${valCell}</td>
                <td style="padding:.6rem .9rem;text-align:right;">${money(r.costo)}</td>
                <td style="padding:.6rem .9rem;text-align:center;">${btn}</td></tr>`;
        };
        host.innerHTML = `<div class="sem-legend">
                <span><span class="sem-dot sem-ok"></span><b>Al día</b> (≤90 d)</span>
                <span><span class="sem-dot sem-warn"></span><b>Alerta</b> (&gt;90 d)</span>
                <span><span class="sem-dot sem-crit"></span><b>Crítico</b> (sin preventivo)</span>
                <span style="margin-left:auto;">Validación campo = preventivos con labor del mecánico (±2 días)</span>
            </div>
            <div class="glass-panel" style="padding:0;overflow:hidden;"><div style="max-height:58vh;overflow:auto;">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
                <thead><tr style="position:sticky;top:0;background:var(--bg-head);">${['Código', 'Equipo', 'Clase', 'Prev', 'Corr', 'Últ. preventivo', 'Estado', 'Validación campo', 'OPEX', 'Boleta'].map(TH).join('')}</tr></thead>
                <tbody>${R.map(rowHtml).join('')}</tbody>
            </table></div></div>
            <p style="color:var(--text-muted);font-size:.78rem;margin-top:.7rem;">La boleta se genera desde la plantilla 250h del equipo y queda en Boletas y Requisiciones (estado GENERADO).</p>`;
        host.querySelectorAll('[data-boleta]').forEach(b => b.onclick = () => generarBoleta(b.getAttribute('data-boleta')));
    }

    function renderHistorico(host) {
        const sa = planes.filter(p => DIESEL.includes(p.equipo) && String(p.id).startsWith('SA-'))
            .sort((a, b) => (b.fechaEjecucion || '').localeCompare(a.fechaEjecucion || ''));
        const is = 'background:var(--input-bg,#1d2126);color:var(--text-main);border:1px solid var(--glass-border);border-radius:4px;padding:.45rem .6rem;font-size:.84rem;';
        host.innerHTML = `
            <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem;align-items:center;">
                <input id="h-q" placeholder="Buscar equipo/orden/insumo…" style="${is}flex:1;min-width:180px;">
                <select id="h-eq" style="${is}"><option value="">Todos los equipos</option>${DIESEL.map(e => `<option>${e}</option>`).join('')}</select>
                <select id="h-tipo" style="${is}"><option value="">Prev + Corr</option><option value="998">Preventivo</option><option value="999">Correctivo</option></select>
            </div>
            <div class="glass-panel" style="padding:0;overflow:hidden;"><div style="max-height:58vh;overflow:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:.84rem;">
                    <thead><tr style="position:sticky;top:0;background:var(--bg-head);">${['Fecha', 'Equipo', 'Tipo', '# Insumos', 'Costo', 'Orden SA', ''].map(TH).join('')}</tr></thead>
                    <tbody id="h-body"></tbody>
                </table></div>
                <div id="h-count" style="padding:.5rem .9rem;color:var(--text-muted);font-size:.76rem;"></div>
            </div>`;
        const draw = () => {
            const q = (document.getElementById('h-q').value || '').toLowerCase();
            const feq = document.getElementById('h-eq').value;
            const ftipo = document.getElementById('h-tipo').value;
            const rows = sa.filter(p => (!feq || p.equipo === feq) && (!ftipo || (p.tipo || '').includes(ftipo)) &&
                (!q || (p.equipo + ' ' + p.id + ' ' + mats(p).map(m => m.descripcion).join(' ')).toLowerCase().includes(q)));
            document.getElementById('h-body').innerHTML = rows.map((p, i) => {
                const ins = mats(p);
                const detalle = ins.map(m => `${m.descripcion} ×${m.cantidad}${m.unidad || ''}`).join(' · ');
                return `<tr data-row="${i}" style="border-bottom:1px solid var(--line);cursor:pointer;">
                        <td style="padding:.55rem .9rem;white-space:nowrap;">${p.fechaEjecucion || '—'}</td>
                        <td style="padding:.55rem .9rem;font-weight:600;">${p.equipo}</td>
                        <td style="padding:.55rem .9rem;">${tipoBadge(p.tipo)}</td>
                        <td style="padding:.55rem .9rem;text-align:center;">${ins.length}</td>
                        <td style="padding:.55rem .9rem;text-align:right;">${money(p.costoTotal)}</td>
                        <td style="padding:.55rem .9rem;color:var(--text-muted);">${String(p.id).replace('SA-', '')}</td>
                        <td style="padding:.55rem .9rem;color:var(--text-dim);">▾</td></tr>
                    <tr data-det="${i}" style="display:none;background:var(--bg-dark);"><td colspan="7" style="padding:.5rem 1.2rem;color:var(--text-muted);font-size:.8rem;">${detalle || 'Sin insumos'}</td></tr>`;
            }).join('');
            document.getElementById('h-count').textContent = `Mostrando ${rows.length} de ${sa.length} mantenimientos`;
            document.querySelectorAll('[data-row]').forEach(tr => tr.onclick = () => {
                const d = document.querySelector(`[data-det="${tr.getAttribute('data-row')}"]`);
                if (d) d.style.display = d.style.display === 'none' ? 'table-row' : 'none';
            });
        };
        ['h-q', 'h-eq', 'h-tipo'].forEach(id => { document.getElementById(id).oninput = draw; document.getElementById(id).onchange = draw; });
        draw();
    }

    function renderPlantillas(host) {
        const tpls = planes.filter(p => p.estado === 'PLANTILLA');
        // Agrupar por equipo (una tarjeta por equipo)
        const grupos = {};
        tpls.forEach(p => { (grupos[p.equipo] = grupos[p.equipo] || []).push(p); });
        const equipos = Object.keys(grupos).sort();
        equipos.forEach(e => grupos[e].sort((a, b) => (a.frecuencia || 0) - (b.frecuencia || 0)));

        const listOf = ins => ins.map(m => `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:.8rem;padding:.3rem 0;border-bottom:1px solid var(--line);font-size:.78rem;">
            <span style="color:var(--text-muted);">${m.descripcion}</span>
            <span style="color:var(--text-main);font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;">${m.cantidad} ${m.unidad || ''}</span>
        </div>`).join('');

        const cardHtml = eq => {
            const list = grupos[eq];
            const clase = TRACT.includes(eq) ? 'TRACTOR' : 'BOMBA DIÉSEL';
            const nombre = NOMBRE[eq] || ('Motobomba diésel ' + eq);
            const freqs = list.map(p => `<span style="background:var(--primary-soft);color:var(--primary-strong);border-radius:3px;padding:2px 8px;font-size:.7rem;font-weight:700;">${p.frecuencia || 250} h</span>`).join(' ');
            const sub = list.map(p => `
                <div style="border-top:1px solid var(--line);padding-top:.8rem;margin-top:.8rem;">
                    <div style="text-align:center;font-weight:700;font-size:.8rem;text-transform:uppercase;letter-spacing:.5px;color:var(--primary-strong);margin-bottom:.5rem;">Mantenimiento ${p.frecuencia || 250} h <span style="color:var(--text-dim);font-weight:500;">· ${mats(p).length} insumos</span></div>
                    <div style="margin-bottom:.8rem;">${listOf(mats(p))}</div>
                    <div style="text-align:center;">
                        <button data-tpl="${p.id}" style="background:var(--primary);color:#fff;border:1px solid var(--primary-strong);border-radius:4px;padding:.55rem 1.4rem;font-weight:600;font-size:.82rem;cursor:pointer;display:inline-flex;align-items:center;gap:.45rem;">
                            <i data-lucide="mail" style="width:15px;height:15px;"></i> Generar y enviar ${p.frecuencia || 250}h
                        </button>
                    </div>
                </div>`).join('');
            return `<div class="glass-panel" style="border-left:3px solid var(--primary);overflow:hidden;">
                <div data-eqcard="${eq}" style="padding:1rem 1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:.5rem;">
                    <div>
                        <div style="font-weight:800;font-size:1.1rem;letter-spacing:.3px;">${eq}</div>
                        <div style="color:var(--text-muted);font-size:.74rem;">${nombre}</div>
                        <div style="font-size:.64rem;text-transform:uppercase;letter-spacing:.6px;color:var(--text-dim);margin-top:.2rem;">${clase} · ${list.length} plantilla${list.length > 1 ? 's' : ''}</div>
                    </div>
                    <div style="display:flex;align-items:center;gap:.5rem;">${freqs}<i data-lucide="chevron-down" data-chev="${eq}" style="width:18px;height:18px;color:var(--text-muted);transition:transform .2s;"></i></div>
                </div>
                <div data-eqbody="${eq}" style="display:none;padding:0 1.1rem 1.1rem;">${sub}</div>
            </div>`;
        };
        host.innerHTML = `
            <p style="color:var(--text-muted);font-size:.8rem;margin:0 0 1rem;">${equipos.length} equipos con plantilla. Clic en una tarjeta para ver sus mantenimientos; <b style="color:var(--text-main);">Generar boleta</b> crea la requisición y abre la vista para imprimir / enviar por correo / WhatsApp.</p>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem;align-items:start;">
                ${equipos.map(cardHtml).join('')}
            </div>`;
        // Expandir/colapsar
        host.querySelectorAll('[data-eqcard]').forEach(h => h.onclick = () => {
            const eq = h.getAttribute('data-eqcard');
            const body = host.querySelector(`[data-eqbody="${eq}"]`);
            const chev = host.querySelector(`[data-chev="${eq}"]`);
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            if (chev) chev.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
        });
        // Generar boleta por plantilla específica
        host.querySelectorAll('[data-tpl]').forEach(b => b.onclick = (ev) => { ev.stopPropagation(); generarBoletaTpl(b.getAttribute('data-tpl')); });
        if (window.lucide) lucide.createIcons();
    }

    async function generarBoletaTpl(tplId) {
        const tpl = planes.find(p => p.id === tplId && p.estado === 'PLANTILLA');
        if (!tpl) { alert('Plantilla no encontrada.'); return; }
        return generarBoletaFromTpl(tpl);
    }

    // Usado por el Panel (default 250h) y las tarjetas
    async function generarBoleta(eq) {
        const list = planes.filter(p => p.equipo === eq && p.estado === 'PLANTILLA');
        const tpl = list.find(t => (t.frecuencia || 250) === 250) || list[0];
        if (!tpl) { alert('Ese equipo no tiene plantilla.'); return; }
        return generarBoletaFromTpl(tpl);
    }

    async function generarBoletaFromTpl(tpl) {
        const eq = tpl.equipo;
        const frec = tpl.frecuencia || 250;
        const m = Array.isArray(tpl.materiales) ? tpl.materiales : JSON.parse(tpl.materiales || '[]');
        const items = m.map(x => ({ tipoDestino: 'EQUIPO', destino: eq, actividad: '998', codigo: x.codigo, descripcion: x.descripcion, cantidad: x.cantidad, unidad: x.unidad }));
        const hoy = new Date().toISOString().slice(0, 10);
        const body = {
            id: 'BOL-PREV-' + eq + '-' + frec + 'H-' + hoy.replace(/-/g, ''),
            fecha: hoy, solicitante: 'MECANICO', equipo: eq,
            items: items, estado: 'GENERADO', actividad: '998 - MANTENIMIENTO PREVENTIVO'
        };
        try {
            const r = await fetch(APIb, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            try {
                const rb = await fetch(APIb); const arr = await rb.json();
                localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(Array.isArray(arr) ? arr : []));
            } catch (e) { }
            if (typeof BoletasController !== 'undefined' && BoletasController.printBoleta) {
                BoletasController.printBoleta(body.id);
            } else {
                alert('Boleta generada: ' + body.id + ' (' + items.length + ' insumos).');
            }
        } catch (e) {
            alert('No se pudo generar la boleta: ' + e.message);
        }
    }

    return { init };
})();
