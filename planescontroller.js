// PlanesController.js - Controla la vista de Planes

const PlanesController = {
    currentTab: 'PENDIENTE', // 'PENDIENTE' or 'HISTORICO'
    currentPlanId: null,

    currentMode: null, // 'PROPIO' | 'CONTRATISTA'
    deletedPlanes: [], // Store soft-deleted items

    // --- LOGIC CONFIG ---
    TRACTOR_IDS: ['331001', '331002', '331425'],
    SPECIAL_TRACTOR_IDS: ['337301'],
    SEQUENCE_MAP: {
        'MANTENIMIENTO 250 HORAS': 1,
        'MANTENIMIENTO 500 HORAS': 2,
        'MANTENIMIENTO 750 HORAS': 3,
        'MANTENIMIENTO 1000 HORAS': 4
    },
    SPECIAL_SEQUENCE_MAP: {
        'MANTENIMIENTO 250 HORAS': 1,
        'MANTENIMIENTO 500 HORAS': 2
    },

    init() {
        try {
            console.log("Iniciando PlanesController...");
            this.loadDeletedState();
            // Hide planes view, show selection is default in HTML structure now
            // But if we want to default to selection we ensure it
            const viewPlanes = document.getElementById('view-planes');
            const viewSelection = document.getElementById('view-planes-selection');

            if (viewPlanes) viewPlanes.style.display = 'none';
            if (viewSelection) {
                viewSelection.style.display = 'block';
            } else {
                console.error("Critical: view-planes-selection not found in DOM");
                alert("Error: No se encontró la vista de selección de planes (DOM Missing).");
            }
        } catch (e) {
            console.error(e);
            alert("Error al ingresar a Mantenimientos: " + e.message);
        }
    },

    selectMode(mode) {
        this.currentMode = mode;
        const title = document.getElementById('planes-title');
        if (title) {
            title.innerText = mode === 'CONTRATISTA'
                ? 'Mantenimiento: Contratistas'
                : 'Mantenimiento: Propio';
        }

        // Update Button Text (Unified)
        const btnNew = document.getElementById('btn-nuevo-plan');
        if (btnNew) {
            btnNew.innerHTML = '<i data-lucide="plus"></i> Agregar Labor';
            lucide.createIcons();
        }

        // Switch Views
        document.getElementById('view-planes-selection').style.display = 'none';
        document.getElementById('view-planes').style.display = 'block';

        this.renderTable();
    },

    returnToSelection() {
        this.currentMode = null;
        document.getElementById('view-planes').style.display = 'none';
        document.getElementById('view-planes-selection').style.display = 'block';
    },

    loadDeletedState() {
        const stored = localStorage.getItem('planes_deleted');
        if (stored) {
            try {
                this.deletedPlanes = JSON.parse(stored);
            } catch (e) {
                console.error("Error parsing deleted planes", e);
                this.deletedPlanes = [];
            }
        }
    },

    switchTab(tab) {
        this.currentTab = tab;

        // Update UI Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        if (tab === 'PENDIENTE') document.getElementById('tab-pendientes').classList.add('active');
        if (tab === 'HISTORICO') document.getElementById('tab-historico').classList.add('active');

        this.renderTable();
    },

    renderTable() {
        try {
            const tableBody = document.getElementById('planes-table-body');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            let planes = DataManager.getPlanes();

            // 1. FILTER BY MODE (Propio vs Contratista)
            const isContratista = (this.currentMode === 'CONTRATISTA');

            /* DEBUG REMOVED */

            planes = planes.filter(p => !!p.esContratista === isContratista);

            // 2. FILTER BY TAB
            if (this.currentTab === 'HISTORICO') {
                // SHOW ONLY COMPLETED (COMPLETADO / REALIZADO)
                const historyPlanes = planes.filter(p => p.estado === 'COMPLETADO' || p.estado === 'REALIZADO');

                // GROUP BY EQUIPMENT
                const groups = {};
                historyPlanes.forEach(p => {
                    const eq = p.equipo || 'Sin Equipo';
                    if (!groups[eq]) groups[eq] = [];
                    groups[eq].push(p);
                });

                // RENDER GROUPS
                if (Object.keys(groups).length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay historial disponible</td></tr>';
                    return;
                }

                Object.keys(groups).sort().forEach((equipo, index) => {
                    const groupPlanes = groups[equipo];
                    // Sort by date desc
                    groupPlanes.sort((a, b) => new Date(b.fechaProgramada) - new Date(a.fechaProgramada));

                    const lastDate = groupPlanes[0].fechaProgramada || 'N/A';
                    const count = groupPlanes.length;
                    const collapseId = `group-${index}`;

                    // PARENT ROW
                    const row = document.createElement('tr');
                    row.className = 'accordion-header';
                    row.onclick = () => {
                        row.classList.toggle('active');
                        const content = document.getElementById(collapseId);
                        if (content) content.classList.toggle('active');
                    };

                    row.innerHTML = `
                    <td colspan="7" style="padding: 1rem; border-bottom: 1px solid var(--glass-border);">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <i data-lucide="chevron-right" class="accordion-icon" size="18" style="color: var(--text-muted);"></i>
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-weight: 700; font-size: 1rem; color: var(--text-main);">${equipo}</span>
                                <span style="font-size: 0.8rem; color: var(--text-muted);">${count} mantenimientos realizados</span>
                            </div>
                            <div style="margin-left: auto; text-align: right;">
                                <span style="font-size: 0.75rem; color: var(--primary); background: rgba(16, 185, 129, 0.1); padding: 0.2rem 0.6rem; border-radius: 1rem;">
                                    Último: ${lastDate}
                                </span>
                            </div>
                        </div>
                    </td>
                 `;
                    tableBody.appendChild(row);

                    // CONTENT ROW (Child Table)
                    const contentRow = document.createElement('tr');
                    contentRow.id = collapseId;
                    contentRow.className = 'accordion-content';

                    let innerRows = '';
                    groupPlanes.forEach(plan => {
                        const statusBadge = this.renderStatusBadge(plan);
                        innerRows += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <td style="padding: 0.8rem 1rem; padding-left: 3rem; color: var(--text-muted);">${plan.fechaProgramada}</td>
                            <td style="padding: 0.8rem;">${plan.descripcion}</td>
                            <td colspan="2" style="padding: 0.8rem;">${plan.ubicacion || '-'}</td>
                            <td style="padding: 0.8rem;">${statusBadge}</td>
                            <td style="padding: 0.8rem;">${plan.duracionReal || plan.duracionEstimada || '-'}</td>
                             <td style="padding: 0.8rem; text-align: right;">
                                <button class="btn-icon" onclick="event.stopPropagation(); PlanesController.showDetail('${plan.id}')" title="Ver Detalle">
                                    <i data-lucide="eye" size="16"></i>
                                </button>
                            </td>
                        </tr>
                     `;
                    });

                    contentRow.innerHTML = `
                    <td colspan="7" style="padding: 0;">
                        <table style="width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.1);">
                            ${innerRows}
                        </table>
                    </td>
                 `;
                    tableBody.appendChild(contentRow);
                });

            } else {
                // SHOW PENDING / ACTIVE (The original table view)
                const allModePlanes = planes; // Keep ref to all planes in this mode (Propio/Contratista)

                planes = planes.filter(p => p.estado !== 'COMPLETADO' && p.estado !== 'REALIZADO' && p.estado !== 'CANCELADO');

                if (planes.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay planes pendientes</td></tr>';
                }

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                planes.forEach(plan => {
                    const row = document.createElement('tr');
                    row.className = 'table-row';
                    row.onclick = () => this.showDetail(plan.id);

                    const statusBadge = this.renderStatusBadge(plan);

                    // --- Date Alert Logic ---
                    let dateDisplay = plan.fechaProgramada || 'Pendiente';
                    let dateStyle = '';
                    let dateIcon = '';

                    if (plan.fechaProgramada && plan.estado === 'PENDIENTE') {
                        const parts = plan.fechaProgramada.split('-'); // YYYY-MM-DD
                        const planDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
                        const compareDate = new Date(parts[0], parts[1] - 1, parts[2]);

                        const diffTime = compareDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 0) {
                            // PROGRAMADO (Blue)
                        } else if (diffDays >= -15) {
                            dateStyle = 'color: #f59e0b; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;';
                            dateIcon = `<i data-lucide="alert-triangle" size="16"></i>`;
                        } else {
                            // VENCIDO CRITICO (Red)
                            dateStyle = 'color: var(--danger); font-weight: 700; display: flex; align-items: center; gap: 0.5rem;';
                            dateIcon = `<i data-lucide="alert-circle" size="16"></i>`;
                        }
                    }
                    const dateCell = dateStyle ? `<span style="${dateStyle}">${dateIcon} ${dateDisplay}</span>` : dateDisplay;

                    row.innerHTML = `
                    <td style="width: 40px; text-align: center;" onclick="event.stopPropagation()">
                        <input type="checkbox" class="plan-checkbox" value="${plan.id}" onchange="PlanesController.updateDeleteButtonState()">
                    </td>
                    <td>${dateCell}</td>
                    <td>${plan.descripcion}</td>
                    <td style="font-weight: 600; color: var(--primary);">${plan.equipo}</td>
                    <td>${plan.ubicacion}</td>
                    <td>${statusBadge}</td>
                    <td>${plan.duracion}</td>
                    <td style="text-align: right; white-space: nowrap;">
                        <button class="btn-icon" onclick="event.stopPropagation(); PlanesController.loadForm('${plan.id}')" title="Editar">
                            <i data-lucide="${plan.estado === 'BLOQUEADO' ? 'lock' : 'edit-2'}" size="16"></i>
                        </button>

                         ${plan.estado === 'PENDIENTE' ?
                            `<button class="btn-primary" onclick="event.stopPropagation(); PlanesController.executePlan('${plan.id}')" title="Ejecutar Mantenimiento" style="padding: 0.3rem 0.8rem; font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.3rem; border-radius: 2rem;">
                            <i data-lucide="play-circle" size="14"></i> EJECUTAR
                        </button>` :
                            ''
                        }
                        
                        <button class="btn-icon" onclick="event.stopPropagation(); PlanesController.showDetail('${plan.id}')">
                            <i data-lucide="chevron-right" size="18"></i>
                        </button>
                    </td>
                `;
                    tableBody.appendChild(row);
                });
            }

            // Reset and Re-init (Shared logic)
            const headerCk = document.getElementById('check-all-planes');
            if (headerCk) headerCk.checked = false;
            this.updateDeleteButtonState();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (e) {
            alert("Error rendering table: " + e.message + "\n" + e.stack);
            console.error(e);
        }
    },

    toggleSelectAll(source) {
        const checkboxes = document.querySelectorAll('.plan-checkbox');
        checkboxes.forEach(cb => cb.checked = source.checked);
        this.updateDeleteButtonState();
    },

    updateDeleteButtonState() {
        const checkedCount = document.querySelectorAll('.plan-checkbox:checked').length;
        const btn = document.getElementById('btn-delete-selected');
        if (btn) {
            btn.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
            btn.innerHTML = `<i data-lucide="trash" size="16"></i> Eliminar (${checkedCount})`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    },

    deleteSelected(id = null) {
        let idsToDelete = [];

        if (id) {
            idsToDelete = [parseInt(id)];
        } else {
            const checkboxes = document.querySelectorAll('.plan-checkbox:checked');
            checkboxes.forEach(cb => idsToDelete.push(parseInt(cb.value)));
        }

        if (idsToDelete.length === 0) {
            alert('Seleccione al menos un plan para eliminar.');
            return;
        }

        if (confirm(` �Está seguro de eliminar ${idsToDelete.length} plan(es)?\nSe moverán a la papelera (Auditoría).`)) {
            let planes = DataManager.getPlanes();

            // Soft Delete
            const itemsToDelete = planes.filter(p => idsToDelete.includes(p.id));
            itemsToDelete.forEach(item => {
                this.deletedPlanes.unshift({
                    ...item,
                    deletedAt: new Date().toISOString(),
                    deletedBy: 'Usuario Actual' // Placeholder, ideally from auth system
                });
            });

            // Remove from main list
            planes = planes.filter(p => !idsToDelete.includes(p.id));
            DataManager.savePlanes(planes);
            this.saveDeletedState();

            this.renderTable();
            // Also refresh charts/KPIs if open
            if (typeof DashboardController !== 'undefined' && DashboardController.init) DashboardController.init();
        }
    },

    saveDeletedState() {
        localStorage.setItem('planes_deleted', JSON.stringify(this.deletedPlanes));
    },

    startAuditMode() {
        const viewPlanes = document.getElementById('view-planes');
        const viewAudit = document.getElementById('view-planes-audit');

        if (!viewPlanes || !viewAudit) return;

        viewPlanes.style.display = 'none';
        viewAudit.style.display = 'block';

        // 1. GET DATA FOR REPORTS
        const allPlanes = DataManager.getPlanes();
        // Correctivos: Type 999 or Description includes Correctivo
        const correctivos = allPlanes.filter(p =>
            (p.tipo && p.tipo.includes('999')) ||
            (p.descripcion && p.descripcion.toLowerCase().includes('correctivo'))
        ).sort((a, b) => new Date(b.fechaProgramada) - new Date(a.fechaProgramada)); // Newest first

        // Costo "por defecto" = mismo valor repetido muchas veces (artefacto de importación)
        const freq = {};
        correctivos.forEach(p => { const c = this.auditCostOf(p); if (c > 0) freq[c] = (freq[c] || 0) + 1; });
        let placeholder = -1, maxf = 0;
        Object.keys(freq).forEach(c => { if (freq[c] > maxf) { maxf = freq[c]; placeholder = Number(c); } });
        if (maxf < 5) placeholder = -1;
        this._auditCorrectivos = correctivos;
        this._auditPlaceholder = placeholder;
        this._auditActLoaded = false;

        const equipos = new Set(correctivos.map(p => p.equipo).filter(Boolean));
        const costoReal = correctivos.reduce((a, p) => { const c = this.auditCostOf(p); return a + (c === placeholder ? 0 : c); }, 0);
        const kpi = (lab, val) => `<div class="glass-panel" style="padding:.9rem 1.1rem;"><div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;">${lab}</div><div style="font-size:1.6rem;font-weight:800;color:var(--text-main);margin-top:2px;line-height:1.1;">${val}</div></div>`;

        const html = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:1.5rem;">
                <div>
                    <h1 style="font-size:1.6rem;font-weight:700;margin:0;color:var(--text-main);">Auditoría y control</h1>
                    <p style="color:var(--text-muted);margin:4px 0 0;font-size:.9rem;">Correctivos, actividad del sistema y elementos eliminados</p>
                </div>
                <button class="btn-ghost" onclick="PlanesController.exitAuditMode()"><i data-lucide="arrow-left" style="width:16px;"></i> Volver</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:1.5rem;">
                ${kpi('Correctivos', correctivos.length)}
                ${kpi('Costo correctivos', this._fmtCOP(costoReal))}
                ${kpi('Equipos afectados', equipos.size)}
                ${kpi('En papelera', DataManager.getRecycleBin().length)}
            </div>
            <div class="config-tabs-wrap" style="margin-bottom:1.25rem;">
                <button class="config-tab-btn active" id="audtab-corr" onclick="PlanesController.switchAuditTab('corr')">Correctivos</button>
                <button class="config-tab-btn" id="audtab-act" onclick="PlanesController.switchAuditTab('act')">Actividad</button>
                <button class="config-tab-btn" id="audtab-pap" onclick="PlanesController.switchAuditTab('pap')">Papelera</button>
            </div>
            <div id="audpane-corr">${this.renderAuditCorrectivos(correctivos)}</div>
            <div id="audpane-act" style="display:none;"></div>
            <div id="audpane-pap" style="display:none;">${this.renderAuditPapelera()}</div>
        `;
        viewAudit.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    auditCostOf(p) {
        let c = Number(p.costoTotal) || 0;
        if (!c && Array.isArray(p.materiales)) c = p.materiales.reduce((a, m) => a + (Number(m.precio || 0) * Number(m.cantidad || 0)), 0);
        return c;
    },

    _fmtCOP(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO'); },

    renderAuditCorrectivos(list) {
        return `
            <div class="glass-panel" style="padding:.7rem 1rem;margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;">
                <div style="position:relative;flex:1;min-width:200px;max-width:340px;">
                    <i data-lucide="search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;color:var(--text-muted);"></i>
                    <input id="aud-corr-q" placeholder="Buscar por equipo o descripción…" onkeyup="PlanesController.filterAuditCorr(this.value)" style="width:100%;box-sizing:border-box;padding:.5rem .7rem .5rem 36px;background:var(--bg-panel);color:var(--text-main);border:1px solid var(--glass-border);border-radius:8px;font-size:.88rem;outline:none;">
                </div>
                <button class="btn-ghost" onclick="PlanesController.exportAuditCorr()"><i data-lucide="download" style="width:16px;"></i> Exportar</button>
            </div>
            <div class="glass-panel" style="padding:0;overflow:hidden;">
                <div style="overflow:auto;max-height:60vh;">
                    <table class="modern-table" style="width:100%;">
                        <thead><tr>
                            <th style="text-align:left;padding-left:16px;">Fecha</th>
                            <th style="text-align:left;">Equipo</th>
                            <th style="text-align:left;">Falla / Descripción</th>
                            <th style="text-align:left;">Estado</th>
                            <th style="text-align:right;padding-right:16px;">Costo</th>
                        </tr></thead>
                        <tbody id="aud-corr-body">${this.renderAuditCorrRows(list)}</tbody>
                    </table>
                </div>
                ${this._auditPlaceholder > 0 ? `<div style="padding:.6rem 1rem;font-size:.72rem;color:var(--text-muted);border-top:1px solid var(--glass-border);">* Costo marcado = valor por defecto de la importación (${this._fmtCOP(this._auditPlaceholder)}) — revisar en Simple Agri.</div>` : ''}
            </div>`;
    },

    renderAuditCorrRows(list) {
        if (!list.length) return `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">No hay correctivos que coincidan.</td></tr>`;
        const ph = this._auditPlaceholder;
        return list.map(p => {
            const c = this.auditCostOf(p);
            const isPh = ph > 0 && c === ph;
            const cost = c > 0
                ? (isPh ? `<span style="color:var(--text-muted);" title="Valor por defecto de la importación — revisar">${this._fmtCOP(c)} *</span>` : this._fmtCOP(c))
                : `<span style="color:var(--text-muted);">—</span>`;
            return `<tr class="table-row">
                <td style="padding:.6rem 16px;font-family:monospace;font-size:.8rem;white-space:nowrap;color:var(--text-muted);">${p.fechaProgramada || ''}</td>
                <td style="font-weight:600;">${p.equipo || '—'}</td>
                <td style="font-size:.85rem;">${p.descripcion || '—'}</td>
                <td>${this.renderStatusBadge(p)}</td>
                <td style="text-align:right;padding-right:16px;font-weight:700;">${cost}</td>
            </tr>`;
        }).join('');
    },

    filterAuditCorr(q) {
        q = (q || '').toLowerCase().trim();
        const list = (this._auditCorrectivos || []).filter(p =>
            !q || (p.equipo || '').toLowerCase().includes(q) || (p.descripcion || '').toLowerCase().includes(q));
        const body = document.getElementById('aud-corr-body');
        if (body) { body.innerHTML = this.renderAuditCorrRows(list); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    },

    exportAuditCorr() {
        const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const rows = [['Fecha', 'Equipo', 'Descripcion', 'Estado', 'Costo']];
        (this._auditCorrectivos || []).forEach(p => rows.push([p.fechaProgramada || '', p.equipo || '', p.descripcion || '', p.estado || '', this.auditCostOf(p)]));
        const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = 'correctivos_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(a.href);
    },

    renderAuditPapelera() {
        const bin = DataManager.getRecycleBin();
        const tipoLabel = { PLAN: 'Plan', BOLETA: 'Boleta', REQUISICION: 'Boleta', LABOR: 'Labor' };
        let rows;
        if (!bin.length) {
            rows = `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">La papelera está vacía</td></tr>`;
        } else {
            rows = bin.map(item => {
                const desc = item.descripcion || item.codigo || item.id || 'Sin descripción';
                return `<tr class="table-row">
                    <td><span class="pill pill-info">${tipoLabel[item._originalType] || item._originalType || '—'}</span></td>
                    <td style="font-size:.85rem;color:var(--text-muted);white-space:nowrap;">${item._deletedAt || ''}</td>
                    <td style="font-size:.85rem;font-weight:600;">${item.equipo || item.tecnico || '—'}</td>
                    <td style="font-size:.85rem;">${desc}</td>
                    <td style="text-align:right;padding-right:16px;">
                        <button class="btn-ghost" style="padding:.3rem .7rem;" onclick="PlanesController.restoreFromBin('${item._deletedId}')"><i data-lucide="rotate-ccw" style="width:14px;"></i> Restaurar</button>
                    </td>
                </tr>`;
            }).join('');
        }
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.75rem;gap:12px;">
                <span style="font-size:.8rem;color:var(--text-muted);">Elementos eliminados (recuperables desde cualquier dispositivo)</span>
                <button class="btn-ghost" style="color:var(--danger);border-color:var(--danger);" onclick="PlanesController.emptyAuditTrash()"><i data-lucide="trash-2" style="width:15px;"></i> Vaciar todo</button>
            </div>
            <div class="glass-panel" style="padding:0;overflow:hidden;">
                <div style="overflow:auto;max-height:60vh;">
                    <table class="modern-table" style="width:100%;">
                        <thead><tr>
                            <th style="text-align:left;padding-left:16px;">Tipo</th>
                            <th style="text-align:left;">Fecha elim.</th>
                            <th style="text-align:left;">Equipo / Técnico</th>
                            <th style="text-align:left;">Descripción</th>
                            <th style="text-align:right;padding-right:16px;">Acciones</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
            </div>`;
    },

    async refreshAuditPapelera() {
        if (typeof DataManager.getRecycleBinFromServer === 'function') await DataManager.getRecycleBinFromServer();
        const pane = document.getElementById('audpane-pap');
        if (pane) { pane.innerHTML = this.renderAuditPapelera(); if (typeof lucide !== 'undefined') lucide.createIcons(); }
    },

    async restoreFromBin(trashId) {
        if (!confirm('¿Restaurar este elemento a su ubicación original?')) return;
        const ok = await DataManager.restoreFromTrash(trashId);
        if (ok) { await this.refreshAuditPapelera(); alert('Elemento restaurado correctamente.'); }
        else alert('No se pudo restaurar el elemento.');
    },

    async emptyAuditTrash() {
        if (!confirm('¿Vaciar la papelera? Esto eliminará PERMANENTEMENTE todos los elementos.')) return;
        await DataManager.emptyRecycleBin();
        await this.refreshAuditPapelera();
    },

    switchAuditTab(tab) {
        ['corr', 'act', 'pap'].forEach(t => {
            const pane = document.getElementById('audpane-' + t);
            const btn = document.getElementById('audtab-' + t);
            if (pane) pane.style.display = (t === tab) ? 'block' : 'none';
            if (btn) btn.classList.toggle('active', t === tab);
        });
        if (tab === 'act' && !this._auditActLoaded) { this._auditActLoaded = true; this.loadAuditActividad(); }
        if (tab === 'pap') { this.refreshAuditPapelera(); }
    },

    _auditLogRow(l) {
        const d = l.timestamp ? new Date(l.timestamp).toLocaleString('es-CO') : '';
        const accColor = l.accion === 'ELIMINAR' ? 'var(--danger)' : (l.accion === 'CREAR' ? 'var(--primary)' : 'var(--text-muted)');
        return `<tr class="table-row">
            <td style="font-size:.8rem;color:var(--text-muted);white-space:nowrap;">${d}</td>
            <td style="font-weight:600;">${l.usuario || 'Sistema'}</td>
            <td><span class="pill pill-info">${l.modulo || ''}</span></td>
            <td style="font-weight:700;color:${accColor};font-size:.82rem;">${l.accion || ''}</td>
            <td style="font-size:.85rem;color:var(--text-muted);">${l.detalle || ''}</td>
        </tr>`;
    },

    async loadAuditActividad() {
        const pane = document.getElementById('audpane-act');
        if (!pane) return;
        pane.innerHTML = `<div class="glass-panel" style="padding:2rem;text-align:center;color:var(--text-muted);">Cargando registro de actividad…</div>`;
        let logs = await DataManager.getAuditLogsFromServer();
        if (!Array.isArray(logs)) logs = DataManager.getAuditLogs() || [];
        logs = logs.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        this._auditLogs = logs;
        const body = logs.length
            ? logs.map(l => this._auditLogRow(l)).join('')
            : `<tr><td colspan="5" style="text-align:center;padding:2.5rem;color:var(--text-muted);">Aún no hay actividad registrada. Se irá llenando a medida que se crean, editan o eliminan boletas, planes y labores.</td></tr>`;
        pane.innerHTML = `
            <div class="glass-panel" style="padding:.7rem 1rem;margin-bottom:1rem;display:flex;align-items:center;gap:.6rem;">
                <div style="position:relative;flex:1;max-width:340px;">
                    <i data-lucide="search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;color:var(--text-muted);"></i>
                    <input id="aud-act-q" placeholder="Buscar en el registro…" onkeyup="PlanesController.filterAuditAct(this.value)" style="width:100%;box-sizing:border-box;padding:.5rem .7rem .5rem 36px;background:var(--bg-panel);color:var(--text-main);border:1px solid var(--glass-border);border-radius:8px;font-size:.88rem;outline:none;">
                </div>
                <span style="font-size:.78rem;color:var(--text-muted);">${logs.length} registros</span>
            </div>
            <div class="glass-panel" style="padding:0;overflow:hidden;">
                <div style="overflow:auto;max-height:60vh;">
                    <table class="modern-table" style="width:100%;">
                        <thead><tr>
                            <th style="text-align:left;padding-left:16px;">Fecha y hora</th>
                            <th style="text-align:left;">Usuario</th>
                            <th style="text-align:left;">Módulo</th>
                            <th style="text-align:left;">Acción</th>
                            <th style="text-align:left;">Detalle</th>
                        </tr></thead>
                        <tbody id="aud-act-body">${body}</tbody>
                    </table>
                </div>
            </div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    filterAuditAct(q) {
        q = (q || '').toLowerCase().trim();
        const logs = (this._auditLogs || []).filter(l => !q || JSON.stringify(l).toLowerCase().includes(q));
        const body = document.getElementById('aud-act-body');
        if (!body) return;
        body.innerHTML = logs.length ? logs.map(l => this._auditLogRow(l)).join('')
            : `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted);">Sin coincidencias.</td></tr>`;
    },

    exitAuditMode() {
        const viewPlanes = document.getElementById('view-planes');
        const viewAudit = document.getElementById('view-planes-audit');

        if (viewPlanes) viewPlanes.style.display = 'block';
        if (viewAudit) viewAudit.style.display = 'none';

        this.renderTable();
    },

    restorePlan(index) {
        if (!confirm(' �Restaurar este plan a la lista principal?')) return;

        const itemToRestore = this.deletedPlanes[index];
        this.deletedPlanes.splice(index, 1);

        delete itemToRestore.deletedAt;
        delete itemToRestore.deletedBy;

        const planes = DataManager.getPlanes();
        planes.unshift(itemToRestore); // Add to the beginning of the main list
        DataManager.savePlanes(planes);

        this.saveDeletedState();
        this.startAuditMode(); // Re-render audit mode to show updated list
        console.log("Restaurado plan:", itemToRestore.id);
    },

    emptyTrash() {
        if (this.deletedPlanes.length === 0) {
            alert("La papelera ya está vacía.");
            return;
        }

        if (confirm(" �Estás seguro de VACIAR la papelera? Esta acción NO se puede deshacer.")) {
            this.deletedPlanes = [];
            this.saveDeletedState();
            this.startAuditMode(); // Re-render audit mode to show empty state
            alert("Papelera vaciada correctamente.");
        }
    },

    handleDescriptionChange(input) {
        const val = input.value;
        const fieldSec = document.getElementById('field-secuencia');
        if (!fieldSec) return;

        // Check map
        if (this.SEQUENCE_MAP[val]) {
            fieldSec.value = this.SEQUENCE_MAP[val];
        } else {
            // Regex fallbacks (original logic)
            if (val.toLowerCase().includes('250 horas')) fieldSec.value = 1;
            else if (val.toLowerCase().includes('500 horas')) fieldSec.value = 2;
            else if (val.toLowerCase().includes('750 horas')) fieldSec.value = 3;
            else if (val.toLowerCase().includes('1000 horas')) fieldSec.value = 4;
            else if (val.toLowerCase().includes('2000 horas')) fieldSec.value = 5;
            // Else keep current or default
        }
    },

    calculateContractorDays() {
        const fSalida = document.getElementById('field-fecha-salida').value;
        const fEntrega = document.getElementById('field-fecha-entrega').value;
        const fDias = document.getElementById('field-dias-contratista');

        if (fSalida && fEntrega) {
            const start = new Date(fSalida);
            const end = new Date(fEntrega);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            fDias.value = diffDays;
        } else {
            fDias.value = 0;
        }
    },

    renderStatusBadge(plan) {
        const estado = plan.estado;
        let className = 'status-pending'; // Default Amber
        let icon = 'clock';
        let text = estado;

        if (estado === 'PENDIENTE') {
            if (plan.fechaProgramada) {
                const parts = plan.fechaProgramada.split('-');
                const planDate = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // Diff in days
                const diffTime = new Date(parts[0], parts[1] - 1, parts[2]) - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    className = 'status-scheduled'; // Blue
                    icon = 'calendar-clock';
                    text = 'PROGRAMADO';
                } else if (diffDays >= -15) {
                    className = 'status-pending'; // Amber (Grace Period)
                    icon = 'alert-triangle';
                    text = 'VENCIDO (< 15 DÍAS)';
                } else {
                    className = 'status-inactive'; // Red (> 15 days late)
                    icon = 'alert-circle';
                    text = 'VENCIDO CRÍTICO';
                }
            } else {
                className = 'status-scheduled'; // Blue default
                icon = 'calendar';
                text = 'PROGRAMADO';
            }
        } else if (estado === 'ACTIVO') {
            className = 'status-active';
            icon = 'check-circle';
        } else if (estado === 'INACTIVO' || estado === 'BLOQUEADO') {
            className = 'status-inactive';
            icon = 'lock';
        } else if (estado === 'REALIZADO' || (plan.esContratista && plan.fechaEntrega)) {
            className = 'status-active'; // Green/Blue
            icon = 'check-square';
            text = 'COMPLETADO';
            if (plan.esContratista) text = 'RECIBIDO / COMPLETADO';
        } else if (plan.esContratista && plan.fechaSalida && !plan.fechaEntrega) {
            className = 'status-inactive'; // Red/Orange based on semantics, user asked for RED for "En Taller"
            icon = 'tool'; // or 'truck'
            text = 'EN TALLER / CONTRATISTA';
            // Override class for explicit Red if status-inactive isn't red enough (usually is)
        }

        return `
            <span class="status-badge ${className}">
                <i data-lucide="${icon}" size="14"></i>
                ${text}
            </span>
        `;
    },

    clearAllPlanes() {
        if (confirm(' �Estás seguro de que deseas eliminar TODOS los planes? Esta acción no se puede deshacer.')) {
            DataManager.clearPlanes();
            this.renderTable();
            alert('Todos los planes han sido eliminados.');
        }
    },

    executePlan(planId) {
        if (confirm(' �Confirmar ejecución de este plan? Esto desbloqueará el siguiente plan en la secuencia.')) {
            const success = DataManager.markPlanAsComplete(planId);
            if (success) {
                alert('Plan marcado como realizado. Siguiente plan desbloqueado.');
                this.renderTable();
            } else {
                alert('Error al actualizar el plan.');
            }
        }
    },

    showDetail(id) {
        alert(`Aquí se abrirá el detalle del plan ${id} y sus materiales`);
        // Próximo paso: Implementar Modal / Drawer
    },

    loadForm(planId = null, initialData = null) {
        this.currentPlanId = planId;
        navigate('nuevo-plan');

        const form = document.getElementById('form-nuevo-plan');
        const title = document.getElementById('form-title');
        title.innerText = planId ? 'Editar Plan de Mantenimiento' : 'Nuevo Plan de Mantenimiento';

        // Llenar datalist de equipos
        const equiposList = document.getElementById('equipos-list');
        equiposList.innerHTML = '';
        const equipos = DataManager.getEquipos();
        equipos.forEach(eq => {
            const option = document.createElement('option');
            option.value = `${eq.codigo} - ${(eq.descripcion || '').toUpperCase()}`;
            equiposList.appendChild(option);
        });

        // Llenar datalist de materiales
        this.refreshMaterialSuggestions();


        // Listener para auto-populado de CECO
        const equipoInput = document.getElementById('field-equipo');
        equipoInput.oninput = (e) => {
            const val = e.target.value;
            // Extraer solo el nombre (después del ID)
            const parts = val.split(' - ');
            const idPart = parts[0];
            const nombre = parts.length > 1 ? parts[1] : val;
            const ceco = DataManager.getCecoForEquipo(nombre);
            document.getElementById('field-ceco').value = ceco;

            // --- MACHINERY LOGIC: UPDATE SUGGESTIONS ---
            // Combine Tractor or Diesel (General)
            const isDiesel = (typeof EquiposController !== 'undefined' && EquiposController.DIESEL_EQUIPMENT_IDS.includes(idPart));
            const isTractor = this.TRACTOR_IDS.includes(idPart);
            const isSpecialTractor = this.SPECIAL_TRACTOR_IDS.includes(idPart);

            const descList = document.getElementById('desc-suggestions');
            const seqWrap = document.getElementById('wrapper-secuencia');

            if (isTractor || isDiesel) {
                if (descList) {
                    descList.innerHTML = '';
                    Object.keys(this.SEQUENCE_MAP).forEach(desc => {
                        const opt = document.createElement('option');
                        opt.value = desc;
                        descList.appendChild(opt);
                    });
                }
                if (seqWrap) seqWrap.style.display = 'block';
            } else if (isSpecialTractor) {
                if (descList) {
                    descList.innerHTML = '';
                    Object.keys(this.SPECIAL_SEQUENCE_MAP).forEach(desc => {
                        const opt = document.createElement('option');
                        opt.value = desc;
                        descList.appendChild(opt);
                    });
                }
                if (seqWrap) seqWrap.style.display = 'block';
            } else {
                if (descList) descList.innerHTML = '';
                if (seqWrap) seqWrap.style.display = 'none';
            }
        };

        // ... resto de la lógica de limpieza o carga de plan ...
        document.getElementById('tbody-actividades').innerHTML = '';
        document.getElementById('tbody-materiales').innerHTML = '';

        // Reset Contratista
        const checkContratista = document.getElementById('check-contratista');
        const wrapperContratista = document.getElementById('wrapper-contratista');

        if (checkContratista) {
            // Auto-set based on Mode
            const isContratistaMode = this.currentMode === 'CONTRATISTA';

            // Hide/Show Fields
            // Hide/Show Fields
            const seqWrapper = document.getElementById('wrapper-secuencia');
            const descWrapper = document.getElementById('wrapper-descripcion');
            const matWrapper = document.getElementById('wrapper-materiales');

            // SEQUENCE is HIDDEN by default in Propio, unless Tractor logic enables it
            if (seqWrapper) seqWrapper.style.display = 'none';

            // Show/Hide Description is handled by generic logic, but let's ensure
            if (descWrapper) descWrapper.style.display = isContratistaMode ? 'none' : 'block';

            // --- CONTRACTOR SPECIFIC VISIBILITY ---
            const wrapperActividades = document.getElementById('wrapper-actividades');
            const wrapperFechasContratista = document.getElementById('wrapper-fechas-contratista');

            if (wrapperActividades) wrapperActividades.style.display = isContratistaMode ? 'none' : 'block';
            if (wrapperFechasContratista) wrapperFechasContratista.style.display = isContratistaMode ? 'block' : 'none';

            if (descWrapper) descWrapper.style.display = isContratistaMode ? 'none' : 'block';
            if (matWrapper) matWrapper.style.display = isContratistaMode ? 'none' : 'block';

            // Activities Table Header Change (Horas vs Días)
            const thHoras = document.getElementById('th-horas');
            if (thHoras) {
                thHoras.innerText = isContratistaMode ? 'DÍAS' : 'HORAS';
            }

            // Duration Label Change
            const labelDuracion = document.getElementById('label-duracion');
            if (labelDuracion) {
                labelDuracion.innerText = isContratistaMode ? 'DURACIÓN TOTAL (DÍAS)' : 'DURACIÓN ESTIMADA DEL PLAN (HH:MM)';
            }

            checkContratista.checked = isContratistaMode;
            // Solo deshabilitar si está en modo Contratista (forzado)
            // En modo Propio, debe estar habilitado para "Apoyo"
            checkContratista.disabled = isContratistaMode;

            if (wrapperContratista) {
                wrapperContratista.style.display = isContratistaMode ? 'block' : 'none';
            }

            // Don't clear values if loading an existing plan, only reset on new
            if (!planId) {
                document.getElementById('field-contratista-nombre').value = '';
                document.getElementById('field-contratista-costo').value = 0;
                if (document.getElementById('field-contratista-tipo-gasto'))
                    document.getElementById('field-contratista-tipo-gasto').value = 'OPEX';

                // Reset new fields
                document.getElementById('field-fecha-salida').value = '';
                document.getElementById('field-fecha-entrega').value = '';
                document.getElementById('field-dias-contratista').value = 0;
            }

            // POPULATE LOCATIONS BASED ON MODE
            const ubicacionesList = document.getElementById('ubicaciones-list');
            ubicacionesList.innerHTML = ''; // Clear existing

            if (isContratistaMode) {
                // Load Stations from LaboresController
                if (typeof LaboresController !== 'undefined' && LaboresController.STATION_DATA) {
                    Object.keys(LaboresController.STATION_DATA).sort().forEach(station => {
                        const opt = document.createElement('option');
                        opt.value = station;
                        ubicacionesList.appendChild(opt);
                    });
                }
            } else {
                // Load Default Camps for Propio
                ['Campamento La Luisa', 'Campamento El Durán'].forEach(camp => {
                    const opt = document.createElement('option');
                    opt.value = camp;
                    ubicacionesList.appendChild(opt);
                });
            }
        }

        document.getElementById('total-estimado').value = '$ 0';

        if (!planId) {
            form.reset();
            title.innerText = 'Nuevo Plan de Mantenimiento';

            // Hide delete btn
            const btnDel = document.getElementById('btn-delete-plan');
            if (btnDel) btnDel.style.display = 'none';

            // Explicitly clear values that might stick
            document.getElementById('field-equipo').value = '';
            document.getElementById('field-ceco').value = '';
            document.getElementById('field-ubicacion').value = '';
            document.getElementById('field-descripcion').value = '';
            document.getElementById('field-fecha-programada').value = '';
            document.getElementById('field-duracion').value = '00:00';




            // Default sequence for new plan
            const fieldSec = document.getElementById('field-secuencia');
            if (fieldSec) fieldSec.value = "1";

            // Unlock completely
            const fieldEquipo = document.getElementById('field-equipo');
            const fieldCeco = document.getElementById('field-ceco');

            if (fieldEquipo) {
                fieldEquipo.removeAttribute('readonly');
                fieldEquipo.style.opacity = '1';
                fieldEquipo.style.cursor = 'text'; // Force text cursor
                fieldEquipo.style.background = 'var(--bg-dark)';
                fieldEquipo.disabled = false;
            }
            if (fieldCeco) {
                // CECO is usually readonly in HTML, but let's reset style
                fieldCeco.style.opacity = '1';
                fieldCeco.style.backgroundColor = '';
                // We keep it readonly as per original design for auto-calc, 
                // but ensure it doesn't look disabled involved in a logic flow
                fieldCeco.setAttribute('readonly', true);
                fieldCeco.style.cursor = 'not-allowed';
            }
        } else {
            console.log("Loading plan for edit:", planId);
            const plan = DataManager.getPlanById(planId);

            if (!plan) {
                console.error("Plan not found inside loadForm:", planId);
                alert("Error: No se puede cargar el plan. ID invalido.");
                return;
            }

            // Populate fields
            const eqInfo = DataManager.defaults.equipos.find(e => e.id === plan.equipo);
            if (eqInfo) {
                document.getElementById('field-equipo').value = `${plan.equipo} - ${eqInfo.nombre}`;
            } else {
                document.getElementById('field-equipo').value = plan.equipo || '';
            }

            document.getElementById('field-tipo').value = plan.tipo;
            const descInput = document.getElementById('field-descripcion');
            descInput.value = plan.descripcion;
            document.getElementById('field-ubicacion').value = plan.ubicacion;
            document.getElementById('field-fecha-programada').value = plan.fechaProgramada || '';
            document.getElementById('field-duracion').value = plan.duracion;

            // Set sequence first (from DB)
            if (document.getElementById('field-secuencia')) {
                document.getElementById('field-secuencia').value = plan.secuencia || 1;
            }

            // Populate contractor fields
            if (plan.esContratista) {
                if (document.getElementById('check-contratista')) document.getElementById('check-contratista').checked = true;
                if (document.getElementById('wrapper-contratista')) document.getElementById('wrapper-contratista').style.display = 'block';
                document.getElementById('field-contratista-nombre').value = plan.contratistaNombre || '';
                document.getElementById('field-contratista-costo').value = plan.contratistaCosto || 0;

                if (document.getElementById('field-contratista-tipo-gasto')) {
                    document.getElementById('field-contratista-tipo-gasto').value = plan.tipoGasto || 'OPEX';
                }

                // New Fields
                document.getElementById('field-fecha-salida').value = plan.fechaSalida || '';
                document.getElementById('field-fecha-entrega').value = plan.fechaEntrega || '';
                this.calculateContractorDays(); // Recalc days
            }

            // Populate Closing Horometer (Real Hours)
            const inputCierre = document.getElementById('field-horometro-cierre');
            if (inputCierre) {
                inputCierre.value = plan.horometroCierre || '';
            }

            // THEN Force update logic for sequence based on description (Overrides DB if description matches pattern)
            this.handleDescriptionChange(descInput);

            // Populate Actividades
            if (plan.actividades) {
                plan.actividades.forEach(act => {
                    this.addActivityRow();
                    const rows = document.getElementById('tbody-actividades').querySelectorAll('tr');
                    const lastRow = rows[rows.length - 1];
                    const inputs = lastRow.querySelectorAll('input');
                    inputs[0].value = act.descripcion;
                    inputs[1].value = act.horas || 0.5; // Default if missing
                });
            }

            // Populate Materiales
            if (plan.materiales) {
                plan.materiales.forEach(mat => {
                    this.addMaterialRow();
                    const rows = document.getElementById('tbody-materiales').querySelectorAll('tr');
                    const lastRow = rows[rows.length - 1];
                    const inputs = lastRow.querySelectorAll('input');

                    // Try to find full string in datalist or just set code
                    inputs[0].value = mat.codigo; // Ideally we'd trigger the change event but let's set values directly first
                    inputs[1].value = mat.descripcion;
                    inputs[2].value = mat.cantidad;

                    // Trigger cost update for this row
                    this.updateRowCost(inputs[0]);
                });
            }

            this.calculateTotalPlan();
        }

        // Listener para filtrado de equipos según ubicación
        const fieldUbicacion = document.getElementById('field-ubicacion');
        if (fieldUbicacion) {
            fieldUbicacion.oninput = (e) => {
                this.filterEquiposByLocation(e.target.value);
            };
            // Filtro inicial si ya hay valor (ej: al editar)
            if (fieldUbicacion.value) {
                this.filterEquiposByLocation(fieldUbicacion.value);
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
        navigate('nuevo-plan');

        // --- PRE-FILL FROM INITIAL DATA (External Alert) ---
        // MUST BE AFTER navigate and form.reset()
        if (!planId && initialData) {
            const eqInput = document.getElementById('field-equipo');
            const descInput = document.getElementById('field-descripcion');
            const seqInput = document.getElementById('field-secuencia');

            if (initialData.equipoFull) {
                eqInput.value = initialData.equipoFull;
                // Manually trigger the CECO and Sequence display logic
                const event = new Event('input', { bubbles: true });
                eqInput.dispatchEvent(event);
            }
            if (initialData.descripcion) descInput.value = initialData.descripcion;
            if (initialData.secuencia) seqInput.value = initialData.secuencia;

            // Show sequence if it's diesel (forced check)
            const idPart = initialData.equipoFull.split(' - ')[0];
            const isDiesel = (typeof EquiposController !== 'undefined' && EquiposController.DIESEL_EQUIPMENT_IDS.includes(idPart));
            if (isDiesel) {
                const seqWrap = document.getElementById('wrapper-secuencia');
                if (seqWrap) seqWrap.style.display = 'block';
            }
        }
    },

    filterEquiposByLocation(location) {
        let filteredEquipos = [];
        const isStation = typeof LaboresController !== 'undefined' && LaboresController.STATION_DATA && LaboresController.STATION_DATA[location];

        if (isStation) {
            // Extraer equipos de todas las zonas de esa estación
            const zones = LaboresController.STATION_DATA[location];
            Object.values(zones).forEach(list => {
                filteredEquipos = filteredEquipos.concat(list);
            });
        } else {
            // Default: Todos los equipos del DataManager
            const allEquipos = DataManager.defaults.equipos || [];
            filteredEquipos = allEquipos.map(eq => `${eq.id} - ${eq.nombre}`);
        }

        this.populateEquiposList(filteredEquipos);
    },

    populateEquiposList(list) {
        const dlist = document.getElementById('equipos-list');
        if (!dlist) return;

        dlist.innerHTML = '';
        list.forEach(val => {
            const opt = document.createElement('option');
            opt.value = val;
            dlist.appendChild(opt);
        });
    },

    refreshMaterialSuggestions() {
        const materialesList = document.getElementById('materiales-list');
        if (!materialesList) return;

        materialesList.innerHTML = '';

        // Unified List from DataManager
        const materiales = DataManager.getAllMaterials();

        // Sort for better UX
        materiales.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

        materiales.forEach(mat => {
            const option = document.createElement('option');
            option.value = `${mat.codigo} - ${mat.descripcion}`;
            materialesList.appendChild(option);
        });
    },

    // --- Dynamic Rows Helpers ---
    addActivityRow() {
        const tbody = document.getElementById('tbody-actividades');

        const isContratistaMode = this.currentMode === 'CONTRATISTA';
        const placeholderTime = isContratistaMode ? 'Días' : 'Horas';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="input-dark" placeholder="Descripción de Actividad" style="width: 100%;"></td>
            <td><input type="number" class="input-dark" value="0.5" step="0.5" placeholder="${placeholderTime}" oninput="PlanesController.calculateTotalPlan()" style="width: 100%;"></td>
            <td><button type="button" class="btn-icon" onclick="PlanesController.removeRow(this)"><i data-lucide="trash-2" size="16"></i></button></td>
        `;
        tbody.appendChild(row);
        lucide.createIcons();
    },

    addMaterialRow() {
        const tbody = document.getElementById('tbody-materiales');
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="text" class="input-dark" list="materiales-list" placeholder="Código" onchange="PlanesController.updateRowCost(this)" style="width: 100%; font-size: 0.85rem;"></td>
            <td><input type="text" class="input-dark" placeholder="Descripción Material" style="width: 100%; font-size: 0.85rem;"></td>
            <td><input type="number" class="input-dark" value="1" style="width: 100%; font-size: 0.85rem;" oninput="PlanesController.updateRowCost(this)"></td>
            <td><input type="text" class="input-dark" value="$ 0" readonly style="width: 100%; opacity: 0.7; font-size: 0.85rem; text-align: right;" placeholder="$0"></td>
            <td><input type="text" class="input-dark" value="$ 0" readonly style="width: 100%; font-weight: bold; font-size: 0.85rem; text-align: right;" placeholder="$0"></td>
            <td><button type="button" class="btn-icon" onclick="PlanesController.removeRow(this)"><i data-lucide="trash-2" size="16"></i></button></td>
        `;
        tbody.appendChild(row);
        lucide.createIcons();
    },

    updateRowCost(input) {
        const row = input.closest('tr');
        const inputs = row.querySelectorAll('input');

        // Parse Code from "Code - Desc"
        let codigo = inputs[0].value;
        if (codigo.includes(' - ')) {
            const parts = codigo.split(' - ');
            codigo = parts[0];
            inputs[0].value = codigo; // Set clean code
            if (!inputs[1].value && parts[1]) inputs[1].value = parts[1]; // Set description if empty
        }

        const cantidad = parseFloat(inputs[2].value) || 0;
        let precio = parseFloat(inputs[3].dataset.raw) || 0;

        // If code changed, fetch price
        if (input === inputs[0]) {
            const data = DataManager.getMaterialData(codigo);
            if (data) {
                precio = data.precio;
                inputs[3].dataset.raw = precio;
                inputs[3].value = '$ ' + precio.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
                inputs[1].value = data.descripcion;
            }
        }

        const subtotal = cantidad * precio;
        inputs[4].dataset.raw = subtotal;
        inputs[4].value = '$ ' + subtotal.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

        this.calculateTotalPlan();
    },

    calculateTotalPlan() {
        let totalCosto = 0;
        let totalUnidades = 0; // Horas o Días

        // --- Cálculo de Horas/Días desde ACTIVIDADES ---
        document.querySelectorAll('#tbody-actividades tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 2) {
                const val = parseFloat(inputs[1].value) || 0;
                totalUnidades += val;
            }
        });

        // Sum Materiales (using dataset.raw)
        document.querySelectorAll('#tbody-materiales tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs.length >= 5) {
                const sub = parseFloat(inputs[4].dataset.raw) || 0;
                totalCosto += sub;
            }
        });

        // Sum Costo Contratista (Si aplica)
        const checkContratista = document.getElementById('check-contratista');
        if (checkContratista && checkContratista.checked) {
            const fieldCosto = document.getElementById('field-contratista-costo');
            if (fieldCosto) {
                const costoExterno = parseFloat(fieldCosto.value) || 0;
                totalCosto += costoExterno;
            }
        }

        // Actualizar UI
        const totalElem = document.getElementById('total-estimado');
        if (totalElem) {
            totalElem.value = '$ ' + totalCosto.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
        }

        // Formatear Duración
        const durField = document.getElementById('field-duracion');
        if (this.currentMode === 'CONTRATISTA') {
            durField.value = `${totalUnidades} Días`;
        } else {
            // HH:MM Format for Propio (Hours)
            const hours = Math.floor(totalUnidades);
            const minutes = Math.round((totalUnidades - hours) * 60);
            const durationStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            durField.value = durationStr;
        }
    },



    removeRow(btn) {
        btn.closest('tr').remove();
        this.calculateTotalPlan();
    },

    handleSave() {
        const isContratistaMode = this.currentMode === 'CONTRATISTA';

        let descripcion = document.getElementById('field-descripcion').value;
        const equipoRaw = document.getElementById('field-equipo').value;
        const equipoId = equipoRaw ? equipoRaw.split(' - ')[0] : 'S/N'; // Extract ID "331001" from "331001 - Name"

        const tipo = document.getElementById('field-tipo').value;
        const ubicacion = document.getElementById('field-ubicacion').value;
        const duracion = document.getElementById('field-duracion').value;
        const fechaProgramada = document.getElementById('field-fecha-programada').value;

        // New Contractor Fields
        const fechaSalida = document.getElementById('field-fecha-salida').value;
        const fechaEntrega = document.getElementById('field-fecha-entrega').value;

        // NEW: Closing Horometer (For absolute tracking)
        const horometroCierreRaw = document.getElementById('field-horometro-cierre');
        const horometroCierre = horometroCierreRaw ? parseFloat(horometroCierreRaw.value) : null;

        // Collect Actividades
        const actividades = [];
        let firstActivity = ''; // Fallback for description if hidden

        document.querySelectorAll('#tbody-actividades tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs[0].value) {
                const act = {
                    codigo: "MANUAL",
                    descripcion: inputs[0].value,
                    horas: inputs[1].value // This is 'Días' in Contratista mode, but storing as 'horas' field is fine for now or needs renamed? Let's keep data structure simple.
                };
                actividades.push(act);
                if (!firstActivity) firstActivity = inputs[0].value;
            }
        });

        // Auto-fill Description if hidden
        if (isContratistaMode && !descripcion) {
            const contratistaName = document.getElementById('field-contratista-nombre').value;
            descripcion = contratistaName ? `Servicio: ${contratistaName}` : (firstActivity || 'Servicio Contratista');
        }

        // Collect Mano de Obra
        const manoObra = [];
        document.querySelectorAll('#tbody-mano-obra tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            manoObra.push({ horas: inputs[0].value, tarifa: inputs[1].value });
        });

        // Collect Materiales
        const materiales = [];
        document.querySelectorAll('#tbody-materiales tr').forEach(tr => {
            const inputs = tr.querySelectorAll('input');
            if (inputs[1].value) materiales.push({ codigo: inputs[0].value, descripcion: inputs[1].value, cantidad: inputs[2].value });
        });

        // Generate ID
        let id = this.currentPlanId;
        let fechaRegistro = new Date().toLocaleDateString('es-CO');

        // Sequence Logic: Get explicitly from field, or fallback to 1
        let secuencia = 1;
        const fieldSec = document.getElementById('field-secuencia');
        if (fieldSec && fieldSec.value) {
            secuencia = parseInt(fieldSec.value);
        }

        let estado = "PENDIENTE";
        let codigo = "AUTO-GEN";
        let equipo = equipoId;

        if (id) {
            // Edit mode: Keep original valid fields
            const existing = DataManager.getPlanById(id);
            if (existing) {
                fechaRegistro = existing.fechaRegistro;
                // Don't overwrite sequence from existing unless user changed it (not possible if readonly, but good for data integrity)
                // But wait, if we are editing an existing plan, we should probably keep its sequence or use the one in form which matches.
                // Actually, if we are in duplicate mode (id is null), we use the one in form.
                if (fieldSec) secuencia = parseInt(fieldSec.value); // Use form value

                estado = existing.estado;
                codigo = existing.codigo;
                equipo = existing.equipo; // Keep original equipment if we don't want to allow changing it deeply
            }
        } else {
            id = 'PLAN-' + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        }

        // Calculate Costo Total
        const totalRaw = document.getElementById('total-estimado').value;
        const costoTotal = parseFloat(totalRaw.replace('$ ', '').replace(/,/g, '')) || 0;

        // Contractor Name (Explicit Save)
        const contratistaNombre = isContratistaMode ? document.getElementById('field-contratista-nombre').value : null;

        const newPlan = {
            id,
            codigo,
            descripcion,
            tipo,
            equipo: equipoId, // Use form value
            ubicacion,
            fechaProgramada,
            fechaRegistro,
            fechaUltimoMovimiento: new Date().toLocaleString('es-CO'),
            estado,
            duracion,
            secuencia,
            costoTotal,
            usuario: "campo@agricolas.co",
            solicitarBoleta: "NO",
            actividades,
            manoObra,
            materiales,
            esContratista: this.currentMode === 'CONTRATISTA',
            fechaSalida: isContratistaMode ? fechaSalida : null,
            fechaEntrega: isContratistaMode ? fechaEntrega : null,
            contratistaNombre: contratistaNombre, // Saved explicitly
            tieneCotizacion: false, // Placeholder for now
            horometroCierre: horometroCierre // Save absolute hours at maintenance
        };

        // --- TRACTOR VALIDATION LOGIC ---
        const eqId = newPlan.equipo;
        const isTractor = this.TRACTOR_IDS.includes(eqId);

        if (isTractor && !this.currentPlanId) { // Only apply for new plans
            const currentSeq = parseInt(newPlan.secuencia);
            if (currentSeq > 1) {
                // Must have previous sequence completed
                const requiredPrevSeq = currentSeq - 1;
                const planes = DataManager.getPlanes();

                // Find if there is a COMPLETED or REALIZADO plan for this equipment with the required previous sequence
                const prevPlan = planes.find(p =>
                    p.equipo === eqId &&
                    parseInt(p.secuencia) === requiredPrevSeq &&
                    (p.estado === 'COMPLETADO' || p.estado === 'REALIZADO')
                );

                if (!prevPlan) {
                    // Strict block removed. Now just a warning for historical data entry.
                    if (!confirm(`ADVERTENCIA DE SECUENCIA:\n\nEstá intentando registrar el mantenimiento de Secuencia ${currentSeq} (aprox ${currentSeq * 250} hrs), pero no encontramos registrado el anterior (Secuencia ${requiredPrevSeq}).\n\n �Desea continuar de todos modos? (Útil para carga de historial)`)) {
                        return;
                    }
                }
            }
        }

        if (this.currentPlanId) {
            // EDIT
            DataManager.updatePlan(this.currentPlanId, newPlan);
            alert('Plan actualizado correctamente.');
        } else {
            // NEW
            DataManager.savePlan(newPlan);
            alert('Plan creado con éxito.');
        }
        navigate('planes');
    },

    deleteCurrentPlan() {
        if (!this.currentPlanId) return;

        if (confirm(' �Estás seguro de que deseas eliminar este plan? Esta acción no se puede deshacer.')) {
            if (DataManager.deletePlans([this.currentPlanId])) {
                alert('Plan eliminado correctamente.');
                navigate('planes');
                this.renderTable();
            } else {
                alert('Error al eliminar el plan.');
            }
        }
    },

    scheduleNext(id) {
        console.log("SCHEDULE NEXT triggered for ID:", id);
        const plans = DataManager.getPlanes();
        const originalPlan = plans.find(p => p.id === id);

        if (!originalPlan) {
            console.error("Plan not found!", id);
            return;
        }

        // 1. Switch to Form View
        const modal = document.getElementById('view-nuevo-plan');
        const viewPlanes = document.getElementById('view-planes');
        const form = document.getElementById('form-nuevo-plan');
        const title = document.getElementById('form-title');

        if (!modal || !viewPlanes || !form) {
            console.error("DOM Validation Failed");
            return;
        }

        viewPlanes.style.display = 'none';
        modal.style.display = 'block';

        // 2. Reset Form
        form.reset();
        this.currentPlanId = null; // Important: Clear current ID so it saves as NEW

        // Calculate Next Sequence (Cycle 1-4)
        const currentSeq = originalPlan.secuencia || 1;
        const validSeq = parseInt(currentSeq) || 1;
        const nextSequence = (validSeq % 5) + 1;

        console.log("Cycling Sequence: " + validSeq + " -> " + nextSequence);
        const fieldSec = document.getElementById('field-secuencia');
        if (fieldSec) {
            fieldSec.value = nextSequence;
        }

        document.getElementById('tbody-actividades').innerHTML = '';
        document.getElementById('tbody-materiales').innerHTML = '';

        // Ensure datalist is populated
        const equiposList = document.getElementById('equipos-list');
        if (equiposList) {
            equiposList.innerHTML = '';
            DataManager.defaults.equipos.forEach(eq => {
                const option = document.createElement('option');
                option.value = `${eq.id} - ${eq.nombre}`;
                equiposList.appendChild(option);
            });
        }

        this.refreshMaterialSuggestions();

        // 3. Populate with Original Plan Data
        console.log("Populating Description:", originalPlan.descripcion);
        const fieldDesc = document.getElementById('field-descripcion')
        if (fieldDesc) {
            fieldDesc.value = originalPlan.descripcion || '';
        }

        // Handle Equipment & Ceco
        const fieldEquipo = document.getElementById('field-equipo');
        const fieldCeco = document.getElementById('field-ceco');

        if (fieldEquipo && fieldCeco) {
            let equipoVal = originalPlan.equipo || '';

            // Search in defaults
            const equipos = DataManager.defaults.equipos || [];
            // Match ID directly or "ID - Name" starts with ID
            const eqData = equipos.find(e => e.id === equipoVal || (equipoVal && equipoVal.toString().startsWith(e.id)));

            if (eqData) {
                equipoVal = `${eqData.id} - ${eqData.nombre}`;
                const ceco = DataManager.getCecoForEquipo(eqData.nombre);
                fieldCeco.value = ceco || '';
                fieldEquipo.value = equipoVal;
            } else {
                fieldEquipo.value = equipoVal;
                // Try fallback logic
                if (equipoVal.includes(' - ')) {
                    const parts = equipoVal.split(' - ');
                    if (parts.length > 1) {
                        const ceco = DataManager.getCecoForEquipo(parts[1]);
                        fieldCeco.value = ceco || '';
                    }
                }
            }

            if (!fieldCeco.value) fieldCeco.value = '';

            // Lock fields
            fieldEquipo.setAttribute('readonly', true);
            fieldCeco.setAttribute('readonly', true);
            fieldEquipo.style.opacity = '1';
            fieldEquipo.style.cursor = 'not-allowed';
            fieldEquipo.style.backgroundColor = 'var(--bg-dark)';
            fieldCeco.style.opacity = '1';
            fieldCeco.style.cursor = 'not-allowed';
            fieldCeco.style.backgroundColor = 'var(--bg-dark)';
        }

        // Populate other simple fields
        if (document.getElementById('field-ubicacion')) document.getElementById('field-ubicacion').value = originalPlan.ubicacion || '';
        if (document.getElementById('field-tipo')) document.getElementById('field-tipo').value = originalPlan.tipo || '';
        if (document.getElementById('field-duracion')) document.getElementById('field-duracion').value = originalPlan.duracion || '';

        // Set title
        if (title) title.textContent = "Programar Siguiente Ciclo";

        // Populate Activities
        if (originalPlan.actividades && originalPlan.actividades.length > 0) {
            console.log("Populating activities:", originalPlan.actividades.length);
            originalPlan.actividades.forEach(act => {
                this.addActivityRow();
                const rows = document.getElementById('tbody-actividades').querySelectorAll('tr');
                const lastRow = rows[rows.length - 1];
                const inputs = lastRow.querySelectorAll('input');
                if (inputs.length >= 2) {
                    inputs[0].value = act.descripcion || '';
                    inputs[1].value = act.horas || 0.5;
                }
            });
        }

        // Populate Materials
        if (originalPlan.materiales && originalPlan.materiales.length > 0) {
            console.log("Populating materials:", originalPlan.materiales.length);
            originalPlan.materiales.forEach(mat => {
                this.addMaterialRow();
                const rows = document.getElementById('tbody-materiales').querySelectorAll('tr');
                const lastRow = rows[rows.length - 1];
                const inputs = lastRow.querySelectorAll('input');

                if (inputs.length > 0) {
                    inputs[0].value = mat.codigo || '';
                    inputs[1].value = mat.descripcion || '';
                    inputs[2].value = mat.cantidad || 1;
                    // Trigger cost update
                    this.updateRowCost(inputs[0]);
                }
            });
        }
    },

    showDetail(planId) {
        const plan = DataManager.getPlanById(planId);
        if (!plan) return;

        // Populate Header
        document.getElementById('detail-title').textContent = `${plan.descripcion || 'Sin título'} (${plan.codigo || planId})`;
        document.getElementById('detail-subtitle').textContent = `ID: ${plan.id} | Registrado: ${plan.fechaRegistro}`;

        // Populate Grid
        document.getElementById('detail-equipo').textContent = plan.equipo || '-';
        document.getElementById('detail-ubicacion').textContent = plan.ubicacion || '-';
        document.getElementById('detail-fecha').textContent = plan.fechaProgramada || 'Pendiente';
        document.getElementById('detail-duracion').textContent = plan.duracion || '-';
        document.getElementById('detail-descripcion').textContent = plan.descripcion || '-';

        // Render Status
        const statusContainer = document.getElementById('detail-status');
        if (statusContainer) {
            statusContainer.innerHTML = this.renderStatusBadge(plan);
        }

        // --- BUTTONS LOGIC ---
        let btnExec = '';
        if (plan.estado === 'PENDIENTE') {
            btnExec = `
            <button class="btn btn-primary" onclick="PlanesController.executePlan('${plan.id}')" title="Ejecutar Mantenimiento" style="display: inline-flex; justify-content: center; align-items: center; border-radius: 50px !important; padding: 0.5rem 1.5rem !important; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">
                <i data-lucide="play-circle" style="width: 18px; margin-right: 0.5rem;"></i> EJECUTAR
            </button>`;
        }

        document.getElementById('detail-actions').innerHTML = `
            <button class="btn-icon" onclick="PlanesController.loadForm('${plan.id}')" title="Editar">
                <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-icon" onclick="PlanesController.showBoletaModal('${plan.id}')" title="Generar Boleta de Aplicación" style="background: rgba(16, 185, 129, 0.2); color: #10b981; margin: 0 0.5rem; border: 1px solid #10b981;">
                <i data-lucide="file-spreadsheet"></i>
            </button>
            <button class="btn-icon" onclick="PlanesController.exportToPDF('${plan.id}')" title="Exportar PDF" style="margin-right: 0.5rem;">
                <i data-lucide="file-text"></i>
            </button>
            ${btnExec}
        `;
        lucide.createIcons();
        lucide.createIcons();

        // Render Activities
        const tbodyAct = document.getElementById('detail-tbody-actividades');
        tbodyAct.innerHTML = '';
        if (plan.actividades && plan.actividades.length > 0) {
            plan.actividades.forEach(act => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 0.8rem; color: var(--text-muted); text-align: center;">${act.descripcion}</td>
                    <td style="padding: 0.8rem; text-align: center; font-weight: 600;">${act.horas} h</td>
                `;
                tbodyAct.appendChild(tr);
            });
        } else {
            tbodyAct.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 1rem; color: var(--text-muted);">Sin actividades registradas</td></tr>';
        }

        // Render Materiales
        const tbodyMat = document.getElementById('detail-tbody-materiales');
        tbodyMat.innerHTML = '';
        if (plan.materiales && plan.materiales.length > 0) {
            plan.materiales.forEach(mat => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 0.8rem; font-family: monospace; text-align: center;">${mat.codigo}</td>
                    <td style="padding: 0.8rem; text-align: center; color: var(--text-muted);">${mat.descripcion}</td>
                    <td style="padding: 0.8rem; text-align: right; padding-right: 2rem; font-weight: 600;">${mat.cantidad}</td>
                `;
                tbodyMat.appendChild(tr);
            });
        } else {
            tbodyMat.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 1rem; color: var(--text-muted);">Sin materiales registrados</td></tr>';
        }

        // Initialize Lucide icons for the previously injected content
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Navigate
        navigate('detalle-plan');
    },



    uploadCotizacion() {
        // Simulation of File Upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // In a real app, upload this file. here we just simulate.
                alert(`Cotización "${file.name}" cargada correctamente (Simulación).`);
            }
        };
        input.click();
    },



    // --- BOLETA DE ALMACÉN GENERATOR ---
    showBoletaModal(planId) {
        const plan = DataManager.getPlanById(planId);
        if (!plan) return;

        // Extract Equipment Info
        const equipoFull = plan.equipo || "";
        const equipoCode = equipoFull.split(" - ")[0] || ""; // "337010"

        // Fetch CECO from Plan Logic
        const ceco = DataManager.getCecoForEquipo(equipoFull) || "";

        // Prepare Materials Rows
        let materialsRows = plan.materiales || [];
        // Ensure at least 8 rows for look and feel
        const minRows = 8;
        const totalRows = Math.max(materialsRows.length + 1, minRows);

        let trHtml = '';

        for (let i = 0; i < totalRows; i++) {
            const mat = materialsRows[i];

            const codigoActividad = '998';
            const descActividad = 'MANTENIMIENTO PREVENTIVO';
            const umActividad = 'C/U';

            const codMaterial = mat ? (mat.codigo || '') : '';
            const descMaterial = mat ? (mat.descripcion || '') : '';
            const umMaterial = mat ? (mat.unidad || 'UND') : '';
            const cantMaterial = mat ? (mat.cantidad || '') : '';

            const hasMaterial = !!codMaterial;

            const cellTerreno = hasMaterial ? equipoCode : '';
            const cellCodAct = hasMaterial ? codigoActividad : '';
            const cellDescAct = hasMaterial ? descActividad : '';
            const cellUmAct = hasMaterial ? umActividad : '';

            trHtml += `
            <tr style="height: 25px; border-bottom: 1px dotted #ccc;">
                <td style="background: #e2efda; border-right: 1px solid #ccc; text-align: center;">${cellTerreno}</td>
                <td style="background: #e2efda; border-right: 1px solid #ccc; text-align: center;">${cellCodAct}</td>
                <td style="background: #ffffff; border-right: 1px solid #ccc; padding-left: 5px;">${cellDescAct}</td>
                <td style="background: #ffffff; border-right: 1px solid #ccc; text-align: center;">${cellUmAct}</td>
                
                <td style="background: #e2efda; border-right: 1px solid #ccc; text-align: center;">${codMaterial}</td>
                <td style="background: #ffffff; border-right: 1px solid #ccc; padding-left: 5px;">${descMaterial}</td>
                <td style="background: #ffffff; border-right: 1px solid #ccc; text-align: center;">${umMaterial}</td>
                <td style="background: #e2efda; text-align: center; font-weight: bold;">${cantMaterial}</td>
            </tr>
            `;
        }

        // Modal HTML
        const modalHtml = `
            <div style="background: white; color: black; padding: 20px; font-family: Arial, sans-serif; font-size: 11px; max-width: 900px; margin: 0 auto; box-shadow: 0 4px 15px rgba(0,0,0,0.5); -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                
                <!-- HEADER -->
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">
                    <div>
                        <img src="assets/logo-riopaila.jpg" alt="Riopaila Agrícola" style="height: 60px; object-fit: contain;"> 
                    </div>
                    <div style="text-align: right;">
                        <h3 style="margin: 0; color: #333;">BOLETA DE APLICACIÓN</h3>
                        <p style="margin: 5px 0 0 0; font-size: 10px;">GENERADO: ${new Date().toLocaleString()}</p>
                        <p style="margin: 2px 0 0 0; font-size: 10px;">PLAN ID: ${plan.id}</p>
                    </div>
                </div>

                <!-- TABLE HEADER (Olive Green #9bbb59) -->
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #999;">
                    <thead style="font-weight: bold; font-size: 10px; color: black;">
                        <tr style="height: 30px;">
                            <th style="background: #9bbb59; width: 80px; border: 1px solid #999;">Terreno</th>
                            <th style="background: #9bbb59; width: 60px; border: 1px solid #999;">Cód. Actividad</th>
                            <th style="background: #9bbb59; border: 1px solid #999;">Descr. Actividad</th>
                            <th style="background: #9bbb59; width: 50px; border: 1px solid #999;">UM. Activ.</th>
                            <th style="background: #9bbb59; width: 100px; border: 1px solid #999;">Cód. Recurso/Material</th>
                            <th style="background: #9bbb59; border: 1px solid #999;">Descr. Recurso/Material</th>
                            <th style="background: #9bbb59; width: 60px; border: 1px solid #999;">UM Recurso</th>
                            <th style="background: #9bbb59; width: 60px; border: 1px solid #999;">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody style="font-size: 11px;">
                        ${trHtml}
                    </tbody>
                </table>

                <!-- FOOTER -->
                <div style="margin-top: 20px; text-align: center; color: #666; font-size: 9px; font-style: italic;">
                    Generado por Hidrofix Manager v5.6
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <button onclick="document.getElementById('boleta-modal').remove()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancelar</button>
                    
                    <button onclick="PlanesController.registerBoleta('${plan.id}', true)" style="padding: 10px 20px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                        <i data-lucide="save"></i> Solo Guardar
                    </button>

                    <button onclick="PlanesController.handlePrintAndSave('${plan.id}')" style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                        <i data-lucide="printer"></i> Guardar e Imprimir
                    </button>
                </div>
            </div>
        `;

        // Create modal container
        let modalContainer = document.getElementById('boleta-modal');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'boleta-modal';
            modalContainer.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
                overflow-y: auto; padding: 20px;
            `;
            document.body.appendChild(modalContainer);
        }

        modalContainer.innerHTML = modalHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    registerBoleta(planId, showMessage = false) {
        const plan = DataManager.getPlanById(planId);
        if (!plan) return false;

        // Prompt for Solicitante (Optional, but good for completeness)
        // If we want to be less intrusive, we can default to empty. 
        // But user wants to match the format "Maria del Mar Ospina".
        // Let's rely on them editing it later if they want, or check if there's a stored user.
        // For now, let's use a default or empty.

        const timestamp = Date.now().toString().slice(-6);
        const boleta = {
            id: 'APP-' + timestamp, // Using APP- prefix as requested
            tipo: 'APLICACION',      // Explicit Type
            planId: plan.id,
            fecha: new Date().toISOString(), // Use ISO for reliable parsing
            solicitante: '', // Leave empty to force them to edit/assign? Or put "Sistema". Let's put empty.
            equipo: plan.equipo,
            observaciones: `Generado desde Plan ${planId}`,
            items: (plan.materiales || []).map(m => ({
                tipoDestino: 'EQUIPO',
                destino: (plan.equipo || '').split(' - ')[0],
                actividad: '998', // Default
                codigo: m.codigo,
                descripcion: m.descripcion,
                cantidad: m.cantidad,
                unidad: m.unidad || 'UND',
                orden: ''
            })),
            estado: 'GENERADO'
        };

        if (DataManager.saveBoleta(boleta)) {
            if (showMessage) {
                // We show the ID so they know
                alert(`✅ Boleta guardada correctamente.\nID: ${boleta.id}`);
                const modal = document.getElementById('boleta-modal');
                if (modal) modal.remove();
            }
            return true;
        } else {
            alert('❌ Error al guardar la boleta.');
            return false;
        }
    },

    handlePrintAndSave(planId) {
        if (this.registerBoleta(planId, false)) {
            // Wait a small moment for UI update if needed, then print
            setTimeout(() => {
                window.print();
            }, 500);
        }
    },

    sendDailyProgramWhatsApp() {
        // 1. Filter Plans (Strictly for TODAY)
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const todayISO = `${year}-${month}-${day}`;

        // Get all plans for today (or pending ones if preferred, but user said 'fecha')
        const planes = DataManager.getPlanes().filter(p =>
            p.fechaProgramada === todayISO && (p.estado === 'PENDIENTE' || p.estado === 'PROGRAMADO')
        );

        // 2. Build Message
        // Requested Format:
        // Programación del día Recursos Hídricos:
        // Mtto.Preventivo 331425
        let msg = `Programación del día Recursos Hídricos:\n\n`;

        if (planes.length === 0) {
            msg += `No hay labores programadas para hoy.`;
        } else {
            planes.forEach(p => {
                // Extract Equipment Code (e.g. "331425" from "331425 - TRACTOR...")
                const parts = (p.equipo || '').split(' - ');
                const code = parts[0].trim();

                // Determine concise type
                let label = "Mtto. Preventivo";
                if (p.tipo && p.tipo.toUpperCase().includes('CORRECTIVO')) {
                    label = "Mtto. Correctivo";
                }

                msg += `${label} ${code}\n`;
            });
        }

        // 3. Open WhatsApp
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    },

    sendBoletaEmail(planId, equipoCode) {
        const plan = DataManager.getPlanById(planId);
        if (!plan) return;

        const subject = `Boleta de Aplicación - Plan ${planId} - ${equipoCode}`;

        let body = `BOLETA DE APLICACIÓN\n`;
        body += `--------------------------------------------------\n`;
        body += `Plan ID: ${planId}\n`;
        body += `Equipo: ${plan.equipo}\n`;
        body += `Fecha: ${new Date().toLocaleString()}\n`;
        body += `Actividad: MANTENIMIENTO PREVENTIVO (998)\n`;
        body += `\nMATERIALES / RECURSOS:\n`;

        if (plan.materiales && plan.materiales.length > 0) {
            plan.materiales.forEach(m => {
                body += `- [${m.codigo}] ${m.descripcion} (${m.cantidad} ${m.unidad || 'UND'})\n`;
            });
        } else {
            body += `(Sin materiales registrados)\n`;
        }

        body += `\n--------------------------------------------------\n`;
        body += `Generado por Hidrofix Manager.`;

        // --- CONFIGURACIÓN DE CORREOS ---
        const emailTo = "sjrodriguez@agricolas.co";
        const emailCc = "ammosquera@agricolas.co, mospina@agricolas.co, jereyes@agricolas.co, aataimal@agricolas.co";

        // Custom Body requested by User
        // We override the previous body completely or just prepend?
        // User wants specific text: "Cordial saludo, Sergio me colaboras..."
        // I will adhere to that but keep the material summary at the bottom just in case they want it, or cleaner to match request.
        // "adjunto formato" implies the summary is in the attachment/image. 
        // I will reset the body to exactly what requested + the paste instruction.

        let finalBody = `Cordial saludo,\n\n`;
        finalBody += `Sergio me colaboras con la creación de la siguiente boleta de aplicación para retiro de inusmos, adjunto formato.\n\n`;
        finalBody += `[PEGAR CAPTURA DE PANTALLA AQUÍ]\n\n`;
        finalBody += `--------------------------------------------------\n`;
        finalBody += `Generado por Hidrofix Manager.`;

        window.location.href = `mailto:${emailTo}?cc=${emailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(finalBody)}`;
    },

    exportToExcel() {
        let planes = DataManager.getPlanes();
        // Filter by current mode (Propio vs Contratista)
        const isContratista = (this.currentMode === 'CONTRATISTA');
        planes = planes.filter(p => !!p.esContratista === isContratista);

        if (planes.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const data = planes.map(p => ({
            'ID': p.id,
            'FECHA': p.fechaProgramada || 'PENDIENTE',
            'EQUIPO': p.equipo,
            'TIPO': p.tipo,
            'DESCRIPCIÓN': p.descripcion,
            'UBICACIÓN': p.ubicacion,
            'ESTADO': p.estado,
            'DURACIÓN': p.duracion,
            'COSTO TOTAL': p.costoTotal || 0,
            'REGISTRADO EL': p.fechaRegistro,
            'CONTRATISTA': p.esContratista ? 'SÍ' : 'NO'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mantenimientos");
        const fileName = `mantenimientos_${this.currentMode}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);
    },

    async exportToPDF() {
        let planes = DataManager.getPlanes();
        // Filter by current mode (Propio vs Contratista)
        const isContratista = (this.currentMode === 'CONTRATISTA');
        planes = planes.filter(p => !!p.esContratista === isContratista);

        if (planes.length === 0) {
            alert("No hay reportes para exportar.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

        try {
            // Use Hardcoded Base64 Branding
            if (window.Branding) {
                doc.addImage(Branding.LOGO_EMPRESA, 'PNG', 14, 10, 25, 25);
                doc.addImage(Branding.LOGO_HIDROFIX, 'PNG', 255, 10, 25, 25);
            }
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text("REPORTE DE MANTENIMIENTOS", 148, 22, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`Modo: ${this.currentMode} | Fecha: ${new Date().toLocaleString()}`, 148, 30, { align: "center" });
        } catch (e) {
            console.error("Error loading logos for PDF:", e);
            doc.setFontSize(18);
            doc.text("REPORTE DE MANTENIMIENTOS", 14, 22);
        }

        // Prepare Table Data
        const body = planes.map(p => [
            p.fechaProgramada || 'PEND',
            p.equipo,
            p.descripcion,
            p.ubicacion || '-',
            p.estado,
            `$${(p.costoTotal || 0).toLocaleString()}`
        ]);

        doc.autoTable({
            startY: 40,
            head: [['FECHA', 'EQUIPO', 'DESCRIPCIÓN', 'UBICACIÓN', 'ESTADO', 'COSTO']],
            body: body,
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 40 },
                2: { cellWidth: 80 },
                3: { cellWidth: 40 },
                4: { cellWidth: 30 },
                5: { cellWidth: 30, halign: 'right' }
            }
        });

        const fileName = `mantenimientos_${this.currentMode}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    }
};
