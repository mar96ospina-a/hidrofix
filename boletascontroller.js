/**
 * BoletasController.js
 * Manages "Boletas y Requisiciones" module.
 * Allows creating, saving, emailing, and printing material requisitions and application slips.
 */
const BoletasController = {
    currentBoletaItems: [],
    editingId: null,
    currentFilter: 'ALL',
    searchTerm: '',
    collapsedMonths: {}, // Track which months are collapsed (ID: MonthYear)

    toggleMonthGroup(monthId) {
        this.collapsedMonths[monthId] = !this.collapsedMonths[monthId];
        this.render();
    },

    setFilter(type, tabId) {
        this.currentFilter = type;
        // Update UI Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-muted)';
            btn.style.boxShadow = 'none';
        });
        const activeTab = document.getElementById(tabId);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.background = 'var(--primary)';
            activeTab.style.color = 'white';
            activeTab.style.boxShadow = 'none';
        }
        this.render();
    },

    handleSearch(val) {
        this.searchTerm = val.toLowerCase().trim();
        this.render();
    },

    // Indicadores del encabezado
    updateKPIs(boletas) {
        const list = Array.isArray(boletas) ? boletas : [];
        const now = new Date();
        let total = list.length, mes = 0, req = 0, app = 0;
        list.forEach(b => {
            const isApp = (b.tipo === 'APLICACION') || (b.id && b.id.startsWith('APP-'));
            if (isApp) app++; else req++;
            if (b.fecha) {
                const d = new Date(String(b.fecha).replace(/-/g, '/'));
                if (!isNaN(d.getTime()) && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) mes++;
            }
        });
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('kpi-bol-total', total);
        set('kpi-bol-month', mes);
        set('kpi-bol-req', req);
        set('kpi-bol-app', app);
    },

    // Exportar la vista actual a CSV
    exportCSV() {
        let boletas = DataManager.getBoletas();
        boletas = Array.isArray(boletas) ? boletas : [];
        if (this.currentFilter !== 'ALL') {
            boletas = boletas.filter(b => {
                const isApp = (b.tipo === 'APLICACION') || (b.id && b.id.startsWith('APP-'));
                return this.currentFilter === 'APLICACION' ? isApp : !isApp;
            });
        }
        if (this.searchTerm) {
            boletas = boletas.filter(b =>
                (b.id && b.id.toLowerCase().includes(this.searchTerm)) ||
                (b.solicitante && b.solicitante.toLowerCase().includes(this.searchTerm))
            );
        }
        const esc = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
        const rows = [['ID', 'Fecha', 'Tipo', 'Equipo', 'Responsable', 'Items', 'Estado']];
        boletas.forEach(b => {
            const isApp = (b.tipo === 'APLICACION') || (b.id && b.id.startsWith('APP-'));
            rows.push([b.id, b.fecha || '', isApp ? 'Aplicacion' : 'Boleta', b.equipo || '',
                b.solicitante || '', (b.items && b.items.length) ? b.items.length : 0, b.estado || 'GENERADO']);
        });
        const csv = '﻿' + rows.map(r => r.map(esc).join(';')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'boletas_' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    },

    // Helper to format date for input[type="date"] (YYYY-MM-DD)
    formatToISO(dateVal) {
        const d = dateVal ? new Date(dateVal) : new Date();
        if (isNaN(d.getTime())) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        // Force Local Date YYYY-MM-DD without UTC conversion
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    showInfoCard(id) {
        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        const isApp = (boleta.tipo === 'APLICACION') || (boleta.id && boleta.id.startsWith('APP-'));
        const color = isApp ? '#10b981' : '#3b82f6';
        const lightBg = '#ffffff';
        const textColor = '#1e293b';
        const mutedText = '#64748b';

        // Items HTML
        const itemsHtml = (boleta.items || []).map(item => `
            <div style="background: #f8fafc; padding: 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 0.8rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-weight: 800; color: ${textColor}; font-size: 1.1rem; line-height: 1.3; white-space: normal; flex: 1; margin-right: 1rem;">${item.descripcion}</span>
                    <span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 6px; font-size: 0.9rem; font-weight: 900; box-shadow: 0 4px 10px ${color}44; white-space: nowrap;">
                        ${item.cantidad} ${item.unit || item.unidad || 'UND'}
                    </span>
                </div>
                <div style="display: flex; gap: 1.5rem; font-size: 0.85rem;">
                    <span style="color: ${mutedText};"><strong style="color: ${color}; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Destino:</strong> <span style="color: ${textColor}; font-weight: 700;">${item.destino || 'N/A'}</span></span>
                    <span style="color: ${mutedText};"><strong style="color: ${color}; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px;">Orden:</strong> <span style="color: #f59e0b; font-weight: 700;">${item.orden || '-'}</span></span>
                </div>
            </div>
        `).join('');

        const modalHtml = `
            <div id="info-card-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 11000; display: flex; justify-content: center; align-items: center; padding: 20px;">
                <div class="info-card-anim" style="max-width: 650px; width: 100%; background: ${lightBg}; border-radius: 24px; padding: 0; overflow: hidden; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.15);">
                    <!-- Header Cover -->
                    <div style="background: linear-gradient(135deg, ${color}, ${color}dd); padding: 2.5rem 2rem; position: relative;">
                        <button onclick="document.getElementById('info-card-modal').remove()" style="position: absolute; right: 1.2rem; top: 1.2rem; background: rgba(255,255,255,0.2); border: none; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;">
                            <i data-lucide="x" style="width: 20px;"></i>
                        </button>
                        <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.5rem;">
                             <span style="background: white; width: 12px; height: 12px; border-radius: 50%; box-shadow: 0 0 10px white;"></span>
                             <span style="font-size: 0.9rem; font-weight: 900; color: white; text-transform: uppercase; letter-spacing: 1.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">${isApp ? 'Boleta de Aplicación' : 'Requisición de Almacén'}</span>
                        </div>
                        <h2 style="margin: 0; color: white; font-size: 2.5rem; font-weight: 900;">${boleta.id}</h2>
                    </div>

                    <!-- Main Info Grid -->
                    <div style="padding: 2rem; max-height: 55vh; overflow-y: auto;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: #f1f5f9; padding: 1.5rem; border-radius: 16px; border: 1px solid #e2e8f0;">
                            <div>
                                <label style="display: block; font-size: 0.8rem; color: ${color}; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Responsable</label>
                                <div style="color: ${textColor}; font-weight: 700; font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis;">${(boleta.solicitante || 'Sin asignar').toUpperCase()}</div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.8rem; color: ${color}; font-weight: 800; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Fecha Registro</label>
                                <div style="color: ${textColor}; font-weight: 700; font-size: 1.1rem;">${new Date(boleta.fecha.replace(/-/g, '/')).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                            </div>
                        </div>

                        ${boleta.observaciones ? `
                        <div style="margin-bottom: 2rem;">
                            <label style="display: block; font-size: 0.85rem; color: ${mutedText}; font-weight: 800; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid ${color}; padding-left: 12px; letter-spacing: 0.5px;">Notas / Observaciones</label>
                            <div style="color: ${textColor}; font-size: 1rem; line-height: 1.6; background: #f8fafc; padding: 1.2rem; border-radius: 12px; border: 1px solid #e2e8f0; font-style: italic;">
                                "${boleta.observaciones}"
                            </div>
                        </div>
                        ` : ''}

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.2rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem;">
                            <label style="font-size: 0.85rem; color: ${mutedText}; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">Detalle de Insumos</label>
                            <span style="background: ${color}11; color: ${color}; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; border: 1px solid ${color}22;">${(boleta.items || []).length} Ítems</span>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            ${itemsHtml}
                        </div>
                    </div>

                    <!-- Interactive Footer -->
                    <div style="padding: 1.5rem; background: #f8fafc; border-top: 1px solid #e2e8f0; display: grid; grid-template-columns: 1fr; gap: 1rem;">
                        <button onclick="document.getElementById('info-card-modal').remove(); BoletasController.printBoleta('${boleta.id}')" style="padding: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.8rem; background: ${color}; color: white; border: none; border-radius: 16px; font-weight: 800; transition: all 0.2s; font-size: 1rem; box-shadow: 0 8px 16px ${color}33;">
                            <i data-lucide="printer" style="width: 20px;"></i> Ver / Imprimir boleta
                        </button>
                    </div>
                </div>
                <style>
                    .info-card-anim { animation: infoPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                    @keyframes infoPop {
                        from { transform: scale(0.85) translateY(30px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                    #info-card-modal button:hover { transform: translateY(-3px); filter: brightness(1.05); box-shadow: 0 8px 15px rgba(0,0,0,0.1); }
                    #info-card-modal button:active { transform: translateY(-1px); }
                    #info-card-modal div::-webkit-scrollbar { width: 6px; }
                    #info-card-modal div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                </style>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Close on click outside
        const m = document.getElementById('info-card-modal');
        m.onclick = (e) => {
            if (e.target === m) m.remove();
        };
    },

    init() {
        console.log("BoletasController init...");
        this.render();
    },

    render() {
        // TOGGLE VIEWS
        const viewList = document.getElementById('boletas-list-view');
        const viewForm = document.getElementById('boletas-form-container');

        if (viewList) viewList.style.display = 'block';
        if (viewForm) {
            viewForm.style.display = 'none';
            viewForm.innerHTML = ''; // Clear form to save memory
        }

        const tbody = document.getElementById('boletas-table-body');
        if (!tbody) {
            console.error("BoletasController: Table body not found!");
            return;
        }

        // Load history (Robust)
        const rawBoletas = DataManager.getBoletas();
        let boletas = Array.isArray(rawBoletas) ? rawBoletas : [];

        // Sorting
        boletas.sort((a, b) => {
            const dateA = new Date((a.fecha || '').replace(/-/g, '/'));
            const dateB = new Date((b.fecha || '').replace(/-/g, '/'));
            return dateB - dateA;
        });

        // KPIs (sobre el total, antes de filtrar/buscar)
        this.updateKPIs(boletas);

        // Apply Filters (tipo inferido: APP-* = Aplicación, resto = Requisición de almacén)
        if (this.currentFilter !== 'ALL') {
            boletas = boletas.filter(b => {
                const isApp = (b.tipo === 'APLICACION') || (b.id && b.id.startsWith('APP-'));
                return this.currentFilter === 'APLICACION' ? isApp : !isApp;
            });
        }

        // Apply Search
        if (this.searchTerm) {
            boletas = boletas.filter(b =>
                (b.id && b.id.toLowerCase().includes(this.searchTerm)) ||
                (b.solicitante && b.solicitante.toLowerCase().includes(this.searchTerm))
            );
        }

        // Show all boletas to avoid discrepancies with dashboard
        const displayBoletas = boletas;

        let html = '';
        let lastMonthGroup = '';

        const isFiltering = !!(this.searchTerm || this.currentFilter !== 'ALL');
        if (displayBoletas.length === 0) {
            html = `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i data-lucide="inbox" style="width: 40px; height: 40px; margin-bottom: 15px; opacity: 0.3;"></i><br>
                ${isFiltering ? 'No se encontraron documentos que coincidan con la búsqueda.' : 'No hay documentos generados aún.'}
            </td></tr>`;
        } else {
            displayBoletas.forEach(b => {
                // Determine Month Group
                let currentMonthGroup = '';
                if (b.fecha) {
                    const d = new Date(b.fecha.replace(/-/g, '/'));
                    if (!isNaN(d.getTime())) {
                        const monthName = d.toLocaleDateString('es-CO', { month: 'long' }).toUpperCase();
                        currentMonthGroup = `${monthName} ${d.getFullYear()}`;
                    }
                }

                // Insert Separator Row if Month Changes
                if (currentMonthGroup && currentMonthGroup !== lastMonthGroup) {
                    const isCollapsed = !!this.collapsedMonths[currentMonthGroup];
                    html += `
                        <tr style="cursor: pointer;" onclick="BoletasController.toggleMonthGroup('${currentMonthGroup}')">
                            <td colspan="6" style="padding: 8px 16px; color: var(--text-muted); font-weight: 700; font-size: 0.72rem; letter-spacing: 0.6px; text-transform: uppercase; background: var(--primary-soft);">
                                <div style="display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <i data-lucide="calendar" style="width: 14px;"></i>
                                        <span>${currentMonthGroup}</span>
                                    </div>
                                    <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" style="width: 16px; opacity: 0.5;"></i>
                                </div>
                            </td>
                        </tr>
                    `;
                    lastMonthGroup = currentMonthGroup;
                }

                // Skip individual rows if month is collapsed
                if (this.collapsedMonths[currentMonthGroup]) return;

                const isApp = (b.tipo === 'APLICACION') || (b.id && b.id.startsWith('APP-'));
                const typeLabel = isApp ? 'Aplicación' : 'Boleta';

                // Fecha (parse seguro YYYY/MM/DD para evitar desfase UTC)
                let dateDisplay = '';
                if (b.fecha) {
                    const d = new Date(String(b.fecha).replace(/-/g, '/'));
                    dateDisplay = !isNaN(d.getTime()) ? d.toLocaleDateString('es-CO') : b.fecha;
                } else if (b.fechaGeneracion) {
                    const d = new Date(b.fechaGeneracion);
                    dateDisplay = !isNaN(d.getTime()) ? d.toLocaleDateString('es-CO') : b.fechaGeneracion;
                }

                const equipoDisplay = b.equipo || '—';
                const solicitanteDisplay = b.solicitante || 'Sin asignar';
                const itemsCount = (b.items && b.items.length) ? b.items.length : 0;

                // Estado como píldora de color (verde = enviado/hecho; ámbar = pendiente de envío)
                const estado = String(b.estado || 'GENERADO').toUpperCase();
                let pillBg = 'rgba(192,138,58,0.16)', pillFg = '#c08a3a'; // ámbar = generado/pendiente
                if (estado === 'ENVIADO') { pillBg = 'rgba(63,138,87,0.15)'; pillFg = 'var(--primary)'; } // verde = enviado
                else if (estado === 'ANULADO' || estado === 'CANCELADO') { pillBg = 'rgba(239,68,68,0.15)'; pillFg = '#ef4444'; }
                const estadoLabel = estado.charAt(0) + estado.slice(1).toLowerCase();
                const sent = !!b.sentEmail || estado === 'ENVIADO';

                html += `
                    <tr class="table-row">
                        <td style="padding: 11px 16px;">
                            <div style="font-family: monospace; font-size: 0.82rem; font-weight: 700; color: var(--text-main); cursor: pointer;" onclick="BoletasController.printBoleta('${b.id}')" title="Ver formato de boleta">${b.id}</div>
                            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${dateDisplay} · ${typeLabel}</div>
                        </td>
                        <td style="color: var(--text-muted); font-weight: 600;">${equipoDisplay}</td>
                        <td style="color: var(--text-main);">${solicitanteDisplay}</td>
                        <td style="text-align: center; color: var(--text-muted);">${itemsCount}</td>
                        <td><span style="font-size: 0.72rem; padding: 3px 10px; border-radius: 20px; background: ${pillBg}; color: ${pillFg}; font-weight: 700;">${estadoLabel}</span></td>
                        <td style="text-align: right; padding-right: 16px; white-space: nowrap;">
                            <button class="btn-icon" title="Ver detalle" onclick="BoletasController.showInfoCard('${b.id}')" style="color: var(--text-muted); margin-left: 6px;"><i data-lucide="eye" style="width: 16px;"></i></button>
                            <button class="btn-icon" title="Imprimir / PDF" onclick="BoletasController.printBoleta('${b.id}')" style="color: var(--text-muted); margin-left: 6px;"><i data-lucide="printer" style="width: 16px;"></i></button>
                            <button class="btn-icon" title="${sent ? 'Enviado por correo (clic: marcar NO enviado)' : 'Pendiente de enviar (clic: marcar ENVIADO)'}" onclick="BoletasController.toggleEmailStatus('${b.id}', ${!sent})" style="color: ${sent ? 'var(--primary)' : 'var(--text-muted)'}; margin-left: 6px;"><i data-lucide="${sent ? 'mail-check' : 'mail'}" style="width: 16px;"></i></button>
                            <button class="btn-icon" title="Eliminar" onclick="BoletasController.deleteBoleta('${b.id}')" style="color: #ef4444; margin-left: 6px;"><i data-lucide="trash-2" style="width: 16px;"></i></button>
                        </td>
                    </tr>
                `;
            });
        }

        tbody.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- ACTIONS ---
    deleteBoleta(id) {
        if (confirm('Â �Estás seguro de eliminar este documento?')) {
            if (DataManager.deleteBoleta(id)) {
                this.render();
            } else {
                alert('No se pudo eliminar el documento.');
            }
        }
    },

    editBoleta(id) {
        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        // Determine Type Robustly
        let type = boleta.tipo;

        // Infer from ID if missing or ambiguous
        if (!type || type === 'REQUISICION') {
            if (boleta.id && boleta.id.startsWith('APP-')) {
                type = 'APLICACION';
            }
        }

        // Infer from Items content (if applicable)
        if (type !== 'APLICACION' && boleta.items && boleta.items.some(i => i.tipoDestino === 'SECTOR')) {
            type = 'APLICACION';
        }

        this.editingId = id;
        this.currentBoletaItems = JSON.parse(JSON.stringify(boleta.items)); // Deep copy

        if (type === 'APLICACION') {
            this.renderAplicacionForm(boleta);
        } else {
            this.renderRequisicionForm(boleta);
        }
    },

    renumberBoleta(oldId) {
        const newId = prompt("Ingrese el nuevo número/ID para esta boleta:", oldId);
        if (!newId || newId === oldId) return;

        // Check duplicates
        const exists = DataManager.getBoletas().some(b => b.id === newId);
        if (exists) {
            alert("Â �Error! Ya existe una boleta con este número ID.");
            return;
        }

        // Validate Format (Optional but recommended)
        if (!confirm(`Â �Confirmas el cambio de ID?\n\nDe: ${oldId}\nA: ${newId}`)) return;

        if (DataManager.renumberBoleta && typeof DataManager.renumberBoleta === 'function') {
            if (DataManager.renumberBoleta(oldId, newId)) {
                this.render();
                alert("Número actualizado correctamente.");
            } else {
                alert("Error al actualizar en base de datos.");
            }
        } else {
            // Fallback manual update if method missing in DataManager
            const boletas = DataManager.getBoletas();
            const idx = boletas.findIndex(b => b.id === oldId);
            if (idx !== -1) {
                boletas[idx].id = newId;
                DataManager.saveBoletas(boletas); // Assuming generic save exists or direct mutation works
                this.render();
            } else {
                alert("Boleta no encontrada.");
            }
        }
    },

    renderAplicacionForm(existingData = null) {
        this.currentType = 'APLICACION';
        const type = 'APLICACION';
        const title = 'NUEVA BOLETA DE APLICACIÓN';
        const color = '#10b981';

        const container = document.getElementById('boletas-form-container'); // CHANGED TARGET
        const viewList = document.getElementById('boletas-list-view');

        if (!container) return;

        // TOGGLE VIEWS
        if (viewList) viewList.style.display = 'none';
        container.style.display = 'block';

        // ... (Keep existing polished code here) ...
        const personal = DataManager.getPersonal();
        const personalOptions = personal
            .filter(p => {
                const name = (p.name || p.nombre || "").toUpperCase();
                return !name.includes("JHONNIER") && !name.includes("JORGE") && !name.includes("JESUS") && !name.includes("JESÚS");
            })
            .map(p => `<option value="${(p.name || p.nombre || "").toUpperCase()}">`).join('');
        const equipos = DataManager.getEquipos().map(e => `<option value="${e.codigo}">${(e.descripcion || "").toUpperCase()}</option>`).join('');
        const materiales = DataManager.getAllMaterials().map(m => `<option value="${m.codigo} - ${(m.descripcion || "").toUpperCase()}" data-precio="${m.precio}">`).join('');

        // Pre-fill values
        const valSolicitante = existingData ? existingData.solicitante : '';
        const valFecha = existingData ? this.formatToISO(existingData.fecha) : this.formatToISO(null);
        const valObs = (existingData && existingData.observaciones) ? existingData.observaciones : '';
        const btnText = existingData ? 'GUARDAR CAMBIOS' : 'GENERAR Y ENVIAR';

        let html = `
            ${this.renderHeader()}
            <div style="animation: slideIn 0.3s ease; width: 100%; margin: 0 auto;">
                <button class="btn-icon" onclick="BoletasController.render()" style="margin-bottom: 1rem;">
                    <i data-lucide="arrow-left"></i> Volver
                </button>

                <div class="glass-panel" style="padding: 2rem; border-top: 4px solid ${color};">
                    <h2 style="text-align: center; color: ${color}; margin-bottom: 2rem;">${title}</h2>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                         <div class="form-group">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">ID Documento / Orden</label>
                            <input type="text" id="bol-id" class="input-dark" style="width: 100%; font-family: monospace; font-weight: bold;" value="${existingData ? existingData.id : 'AUTOGENERADO'}" ${existingData ? '' : 'readonly'}>
                            ${existingData ? '<small style="color: #f59e0b;">* Puedes editar este ID manualmente</small>' : ''}
                        </div>

                    <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Responsable / Solicitante</label>
                        <input type="text" id="bol-solicitante" class="input-dark" style="width: 100%;" list="personal-list" placeholder="Nombre completo" required value="${valSolicitante}">
                        <datalist id="personal-list">
                            ${personalOptions}
                        </datalist>
                    </div>
                    <div class="form-group" style="display:none;">
                        <input type="date" id="bol-fecha" value="${valFecha}">
                    </div>
                </div>


                    <!-- Items Section -->

                    <div style="margin-bottom: 2rem; border-radius: 8px; overflow: hidden; background: #ccc; border: 1px solid #999;">
                        <!-- HEADER MATCHING REFERENCE -->
                        <div style="padding: 1rem 1.5rem; background: #fff; display: flex; justify-content: space-between; align-items: center;">
                            <h4 style="color: #333; margin: 0; font-weight: 700; font-size: 1rem; letter-spacing: 0.5px;">MATERIALES A APLICAR</h4>
                        </div>
                        
                        <!-- SHARED DATALISTS (Hidden) -->
                        <datalist id="equipos-list">${equipos}</datalist>
                        <datalist id="sectores-list">${DataManager.getSectoresSuerte().map(s => `<option value="${s}">`).join('')}</datalist>
                        <datalist id="materiales-codes-list">${DataManager.getAllMaterials().map(m => `<option value="${m.codigo}">`).join('')}</datalist>
                        <datalist id="materiales-list">${(() => {
                const mats = DataManager.getAllMaterials();
                if (mats.length === 0) {
                    // AUTO-RECOVERY: If no materials, try to load and re-render
                    console.warn("BoletasController: No materials found. Attempting auto-reload...");
                    setTimeout(() => {
                        DataManager.loadFromCloud().then(success => {
                            if (success && DataManager.getAllMaterials().length > 0) {
                                BoletasController.render();
                            }
                        });
                    }, 100);
                    return '<option value="Cargando materiales del servidor... Por favor espere...">';
                }
                return mats.map(m => {
                    const desc = (m.descripcion || "").toUpperCase().replace(/"/g, '&quot;');
                    const val = `${m.codigo} - ${desc}`;
                    return `<option value="${val}" data-precio="${m.precio}" data-unidad="${m.unidad || 'UND'}">`;
                }).join('');
            })()}</datalist>

                        <div style="background: #e5e7eb; padding: 1rem;">
                            <!-- TABLE HEADER -->
                            <div style="display: grid; grid-template-columns: 110px 140px 140px 1fr 100px 70px 80px 40px; gap: 8px; margin-bottom: 0.5rem; padding: 0 0.5rem;">
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">Tipo</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">Destino</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">Actividad</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">Material</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">C&oacute;digo</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase; text-align: center;">Cant.</div>
                                <div style="font-weight: 700; color: #6b7280; font-size: 0.75rem; text-transform: uppercase;">N&deg; Orden</div>
                                <div></div>
                            </div>

                            <!-- ROWS CONTAINER -->
                            <div id="bol-items-body" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <!-- Rows rendered here via renderItemsTable -->
                            </div>

                             <!-- COSTO TOTAL (Placeholder for visuals) -->
                            <div style="margin-top: 1rem; text-align: right; padding-right: 3rem; font-weight: 700; color: #374151; font-size: 0.9rem;">
                                Total Items: <span id="bol-total-items">0</span>
                            </div>
                        </div>

                         <!-- ADD BUTTON (Bottom Style) -->
                        <button onclick="BoletasController.addItem()" style="
                            width: 100%;
                            padding: 12px;
                            background: #f3f4f6;
                            color: #6b7280;
                            border: none;
                            border-top: 1px dashed #9ca3af;
                            cursor: pointer;
                            font-weight: 700;
                            text-transform: uppercase;
                            font-size: 0.8rem;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.background='#e5e7eb'; this.style.color='#374151'" onmouseout="this.style.background='#f3f4f6'; this.style.color='#6b7280'">
                            <i data-lucide="plus"></i> AGREGAR FILA DE MATERIAL
                        </button>
                    </div>

                    <div class="form-group" style="margin-bottom: 2rem;">
                         <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Observaciones</label>
                         <textarea id="bol-obs" class="input-dark" style="width: 100%; height: 80px;" placeholder="Comentarios adicionales...">${valObs}</textarea>
                    </div>

                    <div style="text-align: right; display: flex; justify-content: flex-end; gap: 1rem;">
                         ${existingData ? `<button class="btn" onclick="BoletasController.render()" style="background: transparent; border: 1px solid var(--glass-border);">CANCELAR</button>` : ''}
                        <button class="btn btn-primary" onclick="BoletasController.saveAndSend('${type}')" style="padding: 1rem 2rem; font-size: 1rem; background: ${color}; border-color: ${color};">
                            <i data-lucide="save" style="margin-right: 8px;"></i> ${btnText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        // Start with 1 empty row if new
        if (this.currentBoletaItems.length === 0) {
            this.addItem();
        } else {
            this.renderItemsTable();
        }
        lucide.createIcons();
    },

    addItem() {
        this.currentBoletaItems.push({
            tipoDestino: 'EQUIPO',
            destino: '',
            actividad: '',
            orden: '', // New Field
            codigo: '-',
            descripcion: '',
            cantidad: 1,
            unidad: 'UND'
        });
        this.renderItemsTable();
    },

    removeItem(index) {
        this.currentBoletaItems.splice(index, 1);
        this.renderItemsTable();
    },



    updateItem(index, field, value) {
        const item = this.currentBoletaItems[index];
        item[field] = value;

        // Handle unified MATERIAL field - Dropdown (Select)
        if (field === 'material') {
            const code = value;
            const material = DataManager.getMaterialData(code);

            if (material) {
                console.log(`Material selected: ${material.descripcion}`);
                item.codigo = material.codigo;
                item.descripcion = material.descripcion;
                item.unidad = material.unidad || 'UND';
                item.precio = material.precio || 0;
            } else {
                item.codigo = code || '-';
                item.descripcion = '';
            }
            this.renderItemsTable();
            return;
        }

        if (field === 'codigo') {
            const material = DataManager.getMaterialData(value.trim());
            if (material) {
                item.codigo = material.codigo;
                item.descripcion = material.descripcion;
                item.unidad = material.unidad || 'UND';
                this.renderItemsTable();
                return;
            } else {
                item.codigo = value.trim() || '-';
                item.descripcion = '';
            }
        }
    },

    // CUSTOM SEARCHABLE DROPDOWN LOGIC
    filterMaterials(input, index) {
        const val = input.value.toUpperCase();
        const resultsDiv = document.getElementById(`mat-results-${index}`);

        // Always get materials for potential display
        const allMaterials = DataManager.getAllMaterials();
        let matches = [];

        if (!val) {
            // Show top 50 if empty (default dropdown behavior)
            matches = allMaterials.slice(0, 50);
        } else {
            // Filter by name or code
            matches = allMaterials.filter(m =>
                (m.descripcion && m.descripcion.toUpperCase().includes(val)) ||
                (m.codigo && m.codigo.includes(val))
            ).slice(0, 50);
        }

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(m => `
                <div class="dropdown-item" 
                     style="padding: 8px; cursor: pointer; border-bottom: 1px solid #eee;"
                     onmouseover="this.style.background='#f3f4f6'" 
                     onmouseout="this.style.background='white'"
                     onclick="BoletasController.selectMaterial(${index}, '${m.codigo}')">
                    <strong>${m.descripcion}</strong> <br>
                    <span style="font-size: 0.8em; color: #666;">${m.codigo}</span>
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.style.display = 'none';
        }
    },

    selectMaterial(index, code) {
        const material = DataManager.getMaterialData(code);
        if (material) {
            this.updateItem(index, 'material', code);
        }
        // Hide dropdown
        const resultsDiv = document.getElementById(`mat-results-${index}`);
        if (resultsDiv) resultsDiv.style.display = 'none';
    },

    // Close dropdowns when clicking outside
    setupDropdownListeners() {
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.custom-dropdown')) {
                document.querySelectorAll('.dropdown-content').forEach(d => d.style.display = 'none');
            }
        });
    },

    handleRowTypeChange(index, newType) {
        this.currentBoletaItems[index].tipoDestino = newType;
        this.currentBoletaItems[index].destino = ''; // Clear dest on type switch
        this.renderItemsTable(); // Re-render to update datalist attribute
    },

    renderItemsTable() {
        const container = document.getElementById('bol-items-body');
        const countSpan = document.getElementById('bol-total-items');
        if (!container) return;

        if (countSpan) countSpan.innerText = this.currentBoletaItems.length;

        container.innerHTML = this.currentBoletaItems.map((item, idx) => {
            const listId = item.tipoDestino === 'SECTOR' ? 'sectores-list' : 'equipos-list';
            const ph = item.tipoDestino === 'SECTOR' ? 'Seleccione Sector...' : 'Seleccione Equipo...';

            // VISUAL STYLE FOR INPUTS: White bg, rounded, no border (looks like card) or light border
            const inputStyle = "width: 100%; padding: 0.6rem; border-radius: 6px; border: 1px solid #d1d5db; background: #ffffff; color: #374151; font-size: 0.85rem; outline: none;";
            const codeStyle = "width: 100%; padding: 0.6rem; border-radius: 6px; border: 1px solid #e5e7eb; background: #f9fafb; color: #6b7280; font-size: 0.85rem; outline: none; font-family: monospace; font-weight: 600;";




            return `
            <div style="display: grid; grid-template-columns: 110px 140px 140px 1fr 100px 70px 80px 40px; gap: 8px; align-items: center;">
                <div>
                     <select class="input-dark" style="${inputStyle} appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.7rem top 50%; background-size: 0.65rem auto;" onchange="BoletasController.handleRowTypeChange(${idx}, this.value)">
                        <option value="EQUIPO" ${item.tipoDestino === 'EQUIPO' ? 'selected' : ''}>EQUIPO</option>
                        <option value="SECTOR" ${item.tipoDestino === 'SECTOR' ? 'selected' : ''}>SECTOR</option>
                    </select>
                </div>
                <div>
                    ${item.tipoDestino === 'EQUIPO' ? `
                        <select style="${inputStyle} appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 0.7rem top 50%; background-size: 0.65rem auto;" 
                            onchange="BoletasController.updateItem(${idx}, 'destino', this.value)">
                            <option value="">-- Seleccione --</option>
                            ${DataManager.getEquipos().map(e => `
                                <option value="${e.codigo}" ${item.destino === e.codigo ? 'selected' : ''}>
                                    ${e.codigo}
                                </option>
                            `).join('')}
                        </select>
                    ` : `
                        <input type="text" style="${inputStyle}" 
                            list="${listId}" 
                            placeholder="${ph}"
                            value="${item.destino || ''}" 
                            onchange="BoletasController.updateItem(${idx}, 'destino', this.value)">
                    `}
                </div>
                <!-- ACTIVIDAD -->
                <div>
                    <input type="text" style="${inputStyle}" 
                        placeholder="Actividad..."
                        value="${item.actividad || ''}" 
                        onchange="BoletasController.updateItem(${idx}, 'actividad', this.value)">
                </div>

                <!-- MATERIAL (Custom Search Input) -->
                <div class="custom-dropdown" style="position: relative;">
                     <input type="text" style="${inputStyle} font-weight: 600;" 
                        placeholder="Buscar material o c&oacute;digo..." 
                        value="${(item.descripcion || '').replace(/"/g, '&quot;')}" 
                        onfocus="BoletasController.filterMaterials(this, ${idx})"
                        oninput="BoletasController.filterMaterials(this, ${idx})">
                     
                     <div id="mat-results-${idx}" class="dropdown-content" style="
                        display: none;
                        position: absolute;
                        top: 100%;
                        left: 0;
                        right: 0;
                        background: white;
                        border: 1px solid #ddd;
                        max-height: 200px;
                        overflow-y: auto;
                        z-index: 1000;
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        border-radius: 0 0 4px 4px;
                     "></div>
                </div>
                
                <!-- CODE (Auto-Calculated) -->
                <div>
                    <input type="text" style="${codeStyle} background: #eee; cursor: not-allowed;" 
                        readonly
                        placeholder="C&oacute;digo"
                        value="${item.codigo !== '-' ? item.codigo : ''}">
                </div>

                <div>
                     <input type="number" style="${inputStyle} text-align: center;" 
                        min="0" step="0.01" 
                        value="${item.cantidad}" 
                        onchange="BoletasController.updateItem(${idx}, 'cantidad', this.value)">
                </div>
                <!-- ORDEN -->
                 <div>
                    <input type="text" style="${inputStyle}" 
                        placeholder="#"
                        value="${item.orden || ''}" 
                        onchange="BoletasController.updateItem(${idx}, 'orden', this.value)">
                </div>
                <div style="text-align: center;">
                    <button class="btn-icon" style="color: #ef4444; padding: 6px; background: rgba(239,68,68,0.1); border-radius: 6px;" onclick="BoletasController.removeItem(${idx})" tabindex="-1">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    saveAndSend(type) {
        // Validate Header
        const solicitante = document.getElementById('bol-solicitante').value;
        if (!solicitante) { alert("Debes indicar el responsable/solicitante."); return; }

        // New: Validate ID
        let newId = document.getElementById('bol-id') ? document.getElementById('bol-id').value : null;

        // Verify ID format/uniqueness if changed
        if (this.editingId && newId && newId !== this.editingId) {
            const exists = DataManager.getBoletas().some(b => b.id === newId);
            if (exists) {
                alert(`Â �El ID "${newId}" ya existe! Por favor usa otro.`);
                return;
            }
        }

        // If it's new (Autogenerado placeholder)
        if (newId === 'AUTOGENERADO' || !newId) newId = null;


        // Validate Items
        if (this.currentBoletaItems.length === 0) { alert("Debes agregar al menos un ítem."); return; }

        // Check for empty rows
        const invalidItem = this.currentBoletaItems.find(i => !i.destino || !i.descripcion || i.cantidad <= 0);
        if (invalidItem) {
            alert("Por favor completa todos los campos (Destino, Material, Cantidad) de las filas agregadas.");
            return;
        }

        // Legacy compatibility
        const legacyEquipo = this.currentBoletaItems[0].destino;

        // Handle Date: if editing use existing (from hidden field), if new use now
        let finalFecha = document.getElementById('bol-fecha') ? document.getElementById('bol-fecha').value : null;
        if (!finalFecha || finalFecha === 'undefined' || finalFecha === 'null') {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            finalFecha = `${year}-${month}-${day}`;
        }

        let boleta = {
            id: newId || this.editingId,
            tipo: type,
            fecha: finalFecha,
            solicitante: solicitante,
            equipo: legacyEquipo,
            observaciones: document.getElementById('bol-obs').value || '',
            items: this.currentBoletaItems,
            total: 0
        };

        if (!boleta.id) {
            // New ID Generation if not manually set
            const prefix = type === 'APLICACION' ? 'APP' : 'REQ';
            boleta.id = `${prefix}-${Date.now().toString().slice(-6)}`;
        }

        // Handle ID Change (Delete old if exists and different)
        if (this.editingId && this.editingId !== boleta.id) {
            DataManager.deleteBoleta(this.editingId); // Remove old record
            // Hack: deleteBoleta might trigger render but we handle it.
        }

        // Save
        DataManager.saveBoleta(boleta);

        if (this.editingId) {
            alert("Cambios guardados correctamente.");
            this.editingId = null;
            this.render();
        } else {
            // Ask to send email
            if (confirm("Documento guardado. Â �Deseas generar el correo ahora?")) {
                this.generarMailTo(boleta.id);
            } else {
                this.render();
            }
        }
    },

    getActividadDescription(code, tipoDestino, actividadDesc) {
        // 1. Priority: Exact Code Match (User Defined)
        const MAP = {
            '995': 'OPERACIÓN DE MAQ.MATERIALES',
            '998': 'MANTENIMIENTO PREVENTIVO',
            '999': 'MANTENIMIENTO CORRECTIVO',
            '747': 'MANTENIMIENTO DE OBRAS CIVILES'
        };
        if (code && MAP[code]) return MAP[code];

        // 2. Fallback: Existing Logic (Sector vs Equipment)
        if (tipoDestino === 'SECTOR') return 'APLICACIÓN EN CAMPO';

        // 3. Fallback: Default text or existing desc
        if (actividadDesc && actividadDesc !== '998') return actividadDesc; // Return manual desc if valid
        return 'OPERACIÓN DE MAQ.MATERIALES'; // Ultimate Default
    },

    async generarMailTo(id) {
        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        // Robust Logic (Same as printBoleta)
        const isApp = (boleta.tipo === 'APLICACION') ||
            (boleta.id && boleta.id.startsWith('APP-')) ||
            (boleta.items && boleta.items.some(i => i.tipoDestino === 'SECTOR' || i.tipoDestino === 'EQUIPO'));

        // 1. COPY HTML TO CLIPBOARD
        // Build simple HTML table for email (Same as copyForEmail)
        // 1. COPY HTML TO CLIPBOARD (MATCHING PRINT FORMAT)
        let htmlTable = ``;

        if (isApp) {
            // GREEN STYLE TEMPLATE (Copied from printBoleta)
            htmlTable = `
                <div style="background: white; color: black; padding: 10px; font-family: Arial, sans-serif; width: 100%; max-width: 700px;">
                    <!--HEADER -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                           <!-- Logo excluded for email compatibility, using text title -->
                           <div style="font-size: 16px; font-weight: bold; color: #B91C1C; line-height: 1;">
                                RIOPAILA<br>AGRÍCOLA S.A.
                           </div>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0; color: #333; font-size: 14px; text-transform: uppercase;">BOLETA DE APLICACIÓN</h2>
                            <p style="margin: 2px 0 0 0; font-size: 9px; color: #000;">GENERADO: ${boleta.fecha}</p>
                            <p style="margin: 1px 0 0 0; font-size: 9px; color: #000;">PLAN ID: ${boleta.id}</p>
                        </div>
                    </div>

                     <!--INFO -->
                    <div style="margin-bottom: 8px; font-size: 10px; border-bottom: 1px dashed #ccc; padding-bottom: 5px;">
                         <strong>Responsable:</strong> ${boleta.solicitante.toUpperCase()}
                         ${boleta.observaciones ? `<br><strong>Observaciones:</strong> ${boleta.observaciones}` : ''}
                    </div>

                    <!--TABLE -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #999;">
                        <thead>
                            <tr style="background-color: #8dbd5e; color: #000; font-size: 9px; height: 25px; border-bottom: 1px solid #999;">
                                <th style="border-right: 1px solid #999; padding: 2px;">Equipo / Sector</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">Cód.<br>Actividad</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">Descr. Actividad</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">UM. Activ.</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">Cód.<br>Mat.</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">Descr. Recurso/Material</th>
                                <th style="border-right: 1px solid #999; padding: 2px;">UM Rec.</th>
                                <th style="width: 40px; padding: 2px;">Cant.</th>
                                <th style="border-left: 1px solid #999; padding: 2px;">Orden</th>
                            </tr>
                        </thead>
                        <tbody style="font-size: 9px;">
                            ${boleta.items.map((m, index) => {
                const displayDest = m.destino || boleta.equipo || 'N/A';
                const laborDesc = this.getActividadDescription(m.actividad, m.tipoDestino, null);
                return `
                                <tr style="height: 30px; border-bottom: 1px solid #ccc; background-color: ${index % 2 === 0 ? '#e6f4ea' : '#f0fdf4'}; font-size: 11px;">
                                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; font-weight: bold;">${displayDest}</td>
                                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd;">${m.actividad || '998'}</td>
                                    <td style="padding: 5px; border-right: 1px solid #ddd;">${laborDesc}</td>
                                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd;">C/U</td>
                                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd;">${m.codigo || '-'}</td>
                                    <td style="padding: 5px; border-right: 1px solid #ddd;">${m.descripcion}</td>
                                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd;">${m.unidad || 'UND'}</td>
                                    <td style="padding: 5px; text-align: center; font-weight: bold;">${parseFloat(m.cantidad).toFixed(2)}</td>
                                    <td style="padding: 5px; text-align: center; border-left: 1px solid #ddd; font-weight: bold; color: #B91C1C;">${m.orden || '-'}</td>
                                </tr>`;
            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            // Keep simplified for "Requisicion" or adopt similar logic later if requested
            htmlTable = `
    < div style = "font-family: Arial, sans-serif; color: #333; max-width: 800px;" >
                    <h3 style="color: #3b82f6;">REQUISICIÓN DE MATERIALES - ${boleta.id}</h3>
                    <p>
                        <strong>Solicitante:</strong> ${boleta.solicitante}<br>
                        <strong>Fecha:</strong> ${boleta.fecha}<br>
                        <strong>Observaciones:</strong> ${boleta.observaciones || ''}
                    </p>
                    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 800px;">
                        <thead>
                            <tr style="background-color: #f3f4f6;">
                                <th>Equipo</th>
                                <th>Material / Recurso</th>
                                <th style="width: 80px; text-align: center;">Cant.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${boleta.items.map(m => `
                                <tr>
                                    <td><strong>${m.tipoDestino === 'SECTOR' ? '[S]' : '[E]'}</strong> ${m.destino || '-'}</td>
                                    <td>${m.descripcion}</td>
                                    <td style="text-align: center; font-weight: bold;">${m.cantidad}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        try {
            const blob = new Blob([htmlTable], { type: 'text/html' });
            const data = [new ClipboardItem({ 'text/html': blob })];
            await navigator.clipboard.write(data);
            // alert("La tabla con formato ha sido copiada.\n\nCuando se abra el correo, presiona Ctrl+V para pegarla.");
        } catch (err) {
            console.error('Failed to copy html: ', err);
            // Fallback handled by plain text body below
        }

        // 2. CONSTRUCT MAILTO (Plain Text Fallback / Header)
        let subject = '';
        let body = '';

        if (isApp) {
            subject = `BOLETA DE APLICACIÓN - ${boleta.id} - ${boleta.solicitante}`;
            body = `Cordial saludo,\n\nMaría me colaboras por favor con la creación de las siguientes boletas de aplicación, adjunto formato.\n\n(Presiona Ctrl+V aquí para pegar la tabla detallada)\n\n`;
        } else {
            subject = `REQ. ALMACÉN - ${boleta.id} - ${boleta.solicitante}`;
            body = `Cordial saludo,\n\nSolicitud de requisición para ${boleta.equipo}:\n\n(Presiona Ctrl+V aquí para pegar la tabla detallada)\n\n`;
        }



        // Base recipients (CC) — Maria del Mar va como destinatario principal; en su lugar va Johan Stevel Peña
        let ccList = [
            "ammosquera@agricolas.co", // Ana Maria Mosquera Gomez
            "jspena@agricolas.co",     // Johan Stevel Peña (reemplaza a Maria del Mar en CC)
            "jereyes@agricolas.co",    // Jhon Eric Reyes Pasichana
            "aataimal@agricolas.co"    // Andres Aicardo Taimal Moncayo
        ];

        // FILTER: Remove self from CC if matching
        // Map names to emails for filtering
        const emailMap = {
            "ANA MARIA MOSQUERA GOMEZ": "ammosquera@agricolas.co",
            "DIANA MARIA OSPINA": "mospina@agricolas.co", // Assuming full name variant
            "MARIA DEL MAR OSPINA": "mospina@agricolas.co" // Matches user input
        };

        const currentEmail = emailMap[boleta.solicitante];
        if (currentEmail) {
            ccList = ccList.filter(email => email !== currentEmail);
        }

        const recipientsCC = ccList.join(',');
        const mailto = `mailto:mospina@agricolas.co?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}&cc=${encodeURIComponent(recipientsCC)}`;

        // Mark as sent
        DataManager.updateBoletaEmailStatus(id, true);
        this.render(); // Update list UI if open

        window.location.href = mailto;
    },

    reenviarCorreo(id) {
        this.generarMailTo(id);
    },

    printBoleta(id) {
        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        // Fallback: Check ID prefix if tipo is missing or malformed to ensure correct format
        // Also check if items have 'DESTINO' field which is typical of Applications
        const isApp = (boleta.tipo === 'APLICACION') ||
            (boleta.id && boleta.id.startsWith('APP-')) ||
            (boleta.items && boleta.items.some(i => i.tipoDestino === 'SECTOR' || i.tipoDestino === 'EQUIPO'));

        // Define Template Variables
        let modalContent = '';

        if (isApp) {
            // ===========================================
            // TEMPLATE 1: BOLETA DE APLICACIÓN (Green Open Style)
            // Matches user image strictly: Green Headers, Red Order#
            // ===========================================

            const rowsHtml = boleta.items.map((m, index) => {
                // FALLBACK for legacy boletas without per-item destination: use global boleta.equipo
                const displayDest = m.destino || boleta.equipo || 'N/A';
                const laborDesc = this.getActividadDescription(m.actividad, m.tipoDestino, null);

                return `
                <tr style="height: 30px; border-bottom: 1px solid #ccc; font-size: 11px;">
                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; font-weight: bold; background-color: #e2efda;">${displayDest}</td>
                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; background-color: #e2efda;">${m.actividad || '998'}</td>
                    <td style="padding: 5px; border-right: 1px solid #ddd; background-color: #ffffff;">${laborDesc}</td>
                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; background-color: #ffffff;">C/U</td>
                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; background-color: #e2efda;">${m.codigo || '-'}</td>
                    <td style="padding: 5px; border-right: 1px solid #ddd; background-color: #ffffff;">${m.descripcion}</td>
                    <td style="padding: 5px; text-align: center; border-right: 1px solid #ddd; background-color: #ffffff;">${m.unidad || 'UND'}</td>
                    <td style="padding: 5px; text-align: center; font-weight: bold; background-color: #e2efda;">${parseFloat(m.cantidad).toFixed(2)}</td>
                    <td style="padding: 5px; text-align: center; border-left: 1px solid #ddd; font-weight: bold; color: #B91C1C; background-color: #f7f7f7;">${m.orden || '-'}</td>
                </tr>
            `}).join('');

            modalContent = `
                <div style="background: white; color: black; padding: 20px 40px; font-family: Arial, sans-serif; max-width: 950px; width: 100%; height: fit-content; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    
                    <!-- HEADER (Open Style) -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 5px; border-bottom: 3px solid #000; padding-bottom: 5px;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                           <img src="assets/logo-riopaila.jpg" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" style="height: 60px; object-fit: contain;">
                           <div style="display:none; font-size: 24px; font-weight: bold; color: #B91C1C; line-height: 1;">
                                RIOPAILA<br>AGRÍCOLA S.A.
                           </div>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="margin: 0; color: #333; font-size: 20px; text-transform: uppercase;">BOLETA DE APLICACIÓN</h2>
                            <p style="margin: 2px 0 0 0; font-size: 11px; color: #000;">GENERADO: ${new Date().toLocaleString('es-CO')}</p>
                            <p style="margin: 1px 0 0 0; font-size: 11px; color: #000;">PLAN ID: ${boleta.id}</p>
                        </div>
                    </div>

                     <!-- GENERAL INFO (Optional) -->
                    <div style="margin-bottom: 15px; font-size: 11px; padding-top: 5px;">
                         <strong>Responsable:</strong> ${(boleta.solicitante || 'Sin Asignar').toUpperCase()} <span style="margin: 0 10px;">|</span>
                         <strong>Fecha Reporte:</strong> ${boleta.fecha || boleta.fechaGeneracion || 'Fecha desconocida'}
                         ${boleta.observaciones ? `<br><strong>Observaciones:</strong> ${boleta.observaciones}` : ''}
                    </div>

                    <!-- TABLE (Green Style) -->
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 40px; border: 1px solid #999;">
                        <thead>
                            <tr style="background-color: #8dbd5e; color: #000; font-size: 10px; height: 35px; border-bottom: 1px solid #999;">
                                <th style="border-right: 1px solid #888; width: 70px; padding: 2px; text-align: center;">Equipo /<br>Sector</th>
                                <th style="border-right: 1px solid #888; width: 60px; padding: 2px; text-align: center;">Cód.<br>Actividad</th>
                                <th style="border-right: 1px solid #888; padding: 2px; text-align: center;">Descr. Actividad</th>
                                <th style="border-right: 1px solid #888; width: 40px; padding: 2px; text-align: center;">UM.<br>Activ.</th>
                                <th style="border-right: 1px solid #888; width: 90px; padding: 2px; text-align: center;">Cód.<br>Recurso/Material</th>
                                <th style="border-right: 1px solid #888; padding: 2px; text-align: center;">Descr.<br>Recurso/Material</th>
                                <th style="border-right: 1px solid #888; width: 50px; padding: 2px; text-align: center;">UM<br>Recurso</th>
                                <th style="width: 50px; padding: 2px; border-right: 1px solid #888; text-align: center;">Cantidad</th>
                                <th style="width: 50px; padding: 2px; text-align: center;">Orden</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <!-- FOOTER INFO -->
                    <div style="margin-top: 50px; text-align: center; color: #888; font-style: italic; font-size: 11px;">
                        Generado por Hidrofix Manager v5.6
                    </div>
                </div>
            `;

        } else {
            // ===========================================
            // TEMPLATE 2: REQUISICIÓN INTERNA (Boxed Style)
            // No changes needed for Requisicion as it is not 'Aplicacion'
            // ===========================================

            const rowsHtml = boleta.items.map(m => `
                 <tr style="height: 25px; border-bottom: 1px solid #000; font-size: 11px;">
                    <td style="padding: 5px;">${m.codigo || '-'}</td>
                    <td style="padding: 5px;">${m.descripcion}</td>
                    <td style="padding: 5px; text-align: center;">-</td> 
                    <td style="padding: 5px; text-align: center;">01000</td> 
                    <td style="padding: 5px; text-align: center;">${m.unidad || 'UND'}</td>
                    <td style="padding: 5px; text-align: right;">${parseFloat(m.cantidad).toFixed(4)}</td>
                    <td style="padding: 5px; text-align: right;">00101</td> 
                    <td style="padding: 5px; text-align: center;">330100</td> 
                    <td style="padding: 5px;">602-05</td> 
                    <td style="padding: 5px;"></td> 
                </tr>
            `).join('');

            modalContent = `
                <div style="background: white; color: black; padding: 40px; font-family: Arial, sans-serif; font-size: 11px; max-width: 950px; width: 100%; height: fit-content; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <!-- BOXED CONTAINER -->
                    <div style="border: 2px solid #000;">
                        
                        <!-- HEADER ROW -->
                        <div style="display: flex; border-bottom: 2px solid #000;">
                            <div style="width: 25%; border-right: 2px solid #000; padding: 10px; display: flex; flex-direction: column; justify-content: center;">
                                <img src="assets/logo-riopaila.jpg" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" style="height: 50px; object-fit: contain; margin-bottom: 5px;">
                                <div style="display:none; font-size: 16px; font-weight: bold; color: #B91C1C;">RIOPAILA<br>AGRÍCOLA S.A.</div>
                                <div style="font-size: 9px; margin-top: 5px; font-weight: bold;">NIT 890302567</div>
                            </div>
                            <div style="width: 45%; border-right: 2px solid #000; display: flex; align-items: center; justify-content: center;">
                                <h1 style="margin: 0; font-size: 16px; font-weight: bold; text-align: center;">REQUISICION INTERNA CONSUMOS</h1>
                            </div>
                            <div style="width: 30%; padding: 10px; font-size: 10px;">
                                <div style="margin-bottom: 5px;"><strong>Número:</strong> ${boleta.id}</div>
                                <div style="margin-bottom: 5px;"><strong>Fecha:</strong> ${boleta.fecha}</div>
                                <div><strong>Referencia:</strong> -</div>
                            </div>
                        </div>

                        <!-- INFO ROW -->
                        <div style="padding: 10px; border-bottom: 2px solid #000; font-size: 10px;">
                            <div style="display: flex; margin-bottom: 5px;">
                                <div style="width: 100px;"><strong>Solicitante:</strong></div>
                                <div>${boleta.solicitante.toUpperCase()}</div>
                            </div>
                            <div style="display: flex; margin-bottom: 5px;">
                                <div style="width: 150px;"><strong>Fecha de entrega programada:</strong></div>
                                <div style="width: 200px;">${boleta.fecha}</div>
                                <div style="flex: 1; text-align: right;"><strong>Fecha entrega real:</strong> _________________</div>
                            </div>
                            <div style="display: flex;">
                                <div style="width: 100px;"><strong>Notas:</strong></div>
                                <div>${boleta.observaciones || boleta.equipo}</div>
                            </div>
                        </div>

                        <!-- TABLE -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                            <thead>
                                <tr style="border-bottom: 2px solid #000; font-weight: bold; height: 25px;">
                                    <th style="text-align: left; padding: 5px;">Referencia</th>
                                    <th style="text-align: left; padding: 5px;">Descripción</th>
                                    <th style="text-align: center; padding: 5px;">Talla-Color</th>
                                    <th style="text-align: center; padding: 5px;">Bodega</th>
                                    <th style="text-align: center; padding: 5px;">U.M.</th>
                                    <th style="text-align: right; padding: 5px;">Cantidad</th>
                                    <th style="text-align: right; padding: 5px;">U.N</th>
                                    <th style="text-align: center; padding: 5px;">C. Costo</th>
                                    <th style="text-align: left; padding: 5px;">Motivo</th>
                                    <th style="text-align: left; padding: 5px;">C. Entregada</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rowsHtml}
                            </tbody>
                        </table>
                        
                        <!-- Minimum height spacer -->
                        <div style="height: 100px;"></div>
                    </div>
                </div>
            `;
        }

        const modalHtml = `
             <div id="print-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000; display: flex; justify-content: center; overflow-y: auto; padding: 20px;">
                ${modalContent}
                
                <!-- BUTTONS (Floating/Common) -->
                <div style="position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); display: flex; gap: 10px;" class="no-print">
                    <button onclick="document.getElementById('print-modal').remove()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
                    
                    <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                        <i data-lucide="printer"></i> Imprimir / Guardar PDF
                    </button>
                    
                     <button onclick="BoletasController.generarMailTo('${boleta.id}')" 
                            style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                         <i data-lucide="mail"></i> Enviar por Correo
                    </button>

                    <button onclick="BoletasController.copyForEmail('${boleta.id}')" 
                            style="padding: 10px 20px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                         <i data-lucide="copy"></i> Copiar para Pegar
                    </button>

                    <button onclick="BoletasController.sendWhatsApp('${boleta.id}')" 
                            style="padding: 10px 20px; background: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                         <i data-lucide="message-circle"></i> WhatsApp
                    </button>
                </div>
            </div>
            <style>
                @media print {
                    body > *:not(#print-modal) { display: none !important; }
                    #print-modal { position: absolute; background: white; width: 100%; height: auto; overflow: visible; padding: 0; top: 0; left: 0; }
                    .no-print { display: none !important; }
                    /* Force background colors print */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            </style>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async copyForEmail(id) {
        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        const isApp = (boleta.tipo === 'APLICACION');

        // Build simple HTML table for email
        let htmlTable = `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h3 style="color: ${isApp ? '#10b981' : '#3b82f6'};">${isApp ? 'BOLETA DE APLICACIÓN' : 'REQUISICIÓN DE MATERIALES'} - ${boleta.id}</h3>
                <p>
                    <strong>Solicitante:</strong> ${boleta.solicitante}<br>
                    <strong>Fecha:</strong> ${boleta.fecha}<br>
                    <strong>Observaciones:</strong> ${boleta.observaciones || ''}
                </p>
                <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <thead>
                        <tr style="background-color: #f3f4f6;">
                            ${isApp ? `<th>Equipo / Sector</th>` : ''}
                            <th>Material / Recurso</th>
                            <th style="width: 80px; text-align: center;">Cant.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${boleta.items.map(m => `
                            <tr>
                                ${isApp ? `<td><strong>${m.tipoDestino === 'SECTOR' ? '[S]' : '[E]'}</strong> ${m.destino || '-'}</td>` : ''}
                                <td>${m.descripcion}</td>
                                <td style="text-align: center; font-weight: bold;">${m.cantidad}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        try {
            const blob = new Blob([htmlTable], { type: 'text/html' });

            // Clipboard API with HTML
            const data = [new ClipboardItem({ 'text/html': blob })];
            await navigator.clipboard.write(data);
            alert("Â �Copiado! Ahora puedes pegar (Ctrl+V) la tabla en tu correo.");
        } catch (err) {
            console.error('Failed to copy: ', err);
            // Fallback to text
            const text = `DOC: ${boleta.id}\nSolicitante: ${boleta.solicitante}\n\nITEMS:\n` +
                boleta.items.map(i => `${isApp ? `[${i.destino}] ` : ''}- ${i.descripcion} (${i.cantidad})`).join('\n');
            navigator.clipboard.writeText(text).then(() => {
                alert("Copiado en texto plano (tu navegador no soportó copiado rico).");
            });
        }
    },

    sendWhatsApp(id) {

        const boleta = DataManager.getBoletas().find(b => b.id === id);
        if (!boleta) return;

        let message = `\u2713 *BOLETA DE APLICACIÓN*\n\n`;

        // Group by Order
        const groups = {};
        boleta.items.forEach(m => {
            const ord = m.orden || 'S/N';
            if (!groups[ord]) groups[ord] = [];
            groups[ord].push(m);
        });

        // Generate Summary Lines
        for (const [orden, items] of Object.entries(groups)) {
            const first = items[0];
            const dest = first.destino || boleta.equipo || 'N/A';
            const isSector = (first.tipoDestino === 'SECTOR');

            let label = first.descripcion;
            let icon = '\uD83D\uDCE6'; // ð � � � Package

            if (items.length > 1 && !['998', '999'].includes(first.actividad)) {
                label += ' Y OTROS';
            }

            if (isSector) {
                icon = '\uD83C\uDF3F'; // ð � � � Herb
            }

            if (first.actividad === '998') {
                label = "MTO. PREVENTIVO";
                icon = '\uD83D\uDEE0'; // ð � � ï � � Hammer and Wrench
            }
            else if (first.actividad === '999') {
                label = "MTO. CORRECTIVO";
                icon = '\uD83D\uDEA8'; // ð � � � Rotate Light
            }

            message += `${icon} ${orden} - ${label} ${dest}\n`;
        }

        // Switch to api.whatsapp.com which is often more robust for encoded paremeters
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        console.log("WhatsApp URL generated:", url); // Debug
        window.open(url, '_blank');
    },

    // --- CONSTANTS ---
    CENTROS_COSTO_01: [
        { id: '330102', label: '330102 - GERTRUDIS' },
        { id: '330104', label: '330104 - VALPARAISO' },
        { id: '330105', label: '330105 - MORILLO' },
        { id: '330106', label: '330106 - LA LUISA' },
        { id: '330107', label: '330107 - LA LUISA 2' },
        { id: '330109', label: '330109 - VENECIA' },
        { id: '330110', label: '330110 - NORMANDIA' },
        { id: '330111', label: '330111 - PERALONSO' },
        { id: '330113', label: '330113 - SAN NICOLAS' },
        { id: '330118', label: '330118 - ZAMBRANO' },
        { id: '330121', label: '330121 - MORILLO' },
        { id: '330122', label: '330122 - VENECIA' },
        { id: '330123', label: '330123 - SAN CARLOS LOTE 7' },
        { id: '330201', label: '330201 - AUXILIAR DE CAMPO' },
        { id: '330202', label: '330202 - OFICIOS VARIOS CAMPO' },
        { id: '330203', label: '330203 - VIGILANCIA' },
        { id: '330204', label: '330204 - TECNICOS Y SUPERVISORES' },
        { id: '330205', label: '330205 - PERSONAL TEMPORAL' },
        { id: '330206', label: '330206 - SEMILLA' },
        { id: '330209', label: '330209 - SERVICIOS CAMPO' },
        { id: '330233', label: '330233 - LAGUNAS' },
        { id: '330291', label: '330291 - AUXILIAR CAMPO FRUTALES' },
        { id: '330292', label: '330292 - OFICIOS VARIOS FRUTALES' },
        { id: '330418', label: '330418 - LA PAILA' },
        { id: '330425', label: '330425 - TEQUENDAMA' },
        { id: '330426', label: '330426 - MEDIA LUNA' },
        { id: '330440', label: '330440 - PAILA ARRIBA' },
        { id: '330501', label: '330501 - RIOPAILA' },
        { id: '330600', label: '330600 - EL ESTABLO MANGO' },
        { id: '330601', label: '330601 - EL ESTABLO LIMON' },
        { id: '330999', label: '330999 - VALOR RAZONABLE CULTIVOS' }
    ],

    CENTROS_COSTO_02: [
        { id: '301001', label: '301001 - JUNTA DIRECTIVA' },
        { id: '301005', label: '301005 - REVISORIA FISCAL' },
        { id: '301010', label: '301010 - AUDITORIA' },
        { id: '301015', label: '301015 - CASA PRINCIPAL' },
        { id: '302001', label: '302001 - GERENCIA GENERAL' },
        { id: '302015', label: '302015 - CASA GERENCIA' },
        { id: '302102', label: '302102 - GESTION DOCUMENTAL' },
        { id: '303001', label: '303001 - GERENCIA FINANCIERA Y ADMON' },
        { id: '303002', label: '303002 - JURIDICO' },
        { id: '303003', label: '303003 - TESORERIA' },
        { id: '303004', label: '303004 - CONTABILIDAD' },
        { id: '303005', label: '303005 - PLANEACION FISCAL E IMPUESTOS' },
        { id: '303006', label: '303006 - INFORMATICA' },
        { id: '303007', label: '303007 - SERVICIOS GENERALES' },
        { id: '303008', label: '303008 - COMPRAS' },
        { id: '303101', label: '303101 - GESTION HUMANA' },
        { id: '303105', label: '303105 - DESARROLLO DEL TALENTO' },
        { id: '303201', label: '303201 - PLANEACION Y CONTROL' },
        { id: '303998', label: '303998 - COSTO ADMON BENGALA' },
        { id: '303999', label: '303999 - COSTO OTRAS VENTAS RIOPAILA' }
    ],

    CENTROS_COSTO_04: [
        { id: '302101', label: '302101 - PLANEACION Y CONTROL' },
        { id: '302201', label: '302201 - ADMON PLANTA MEZCLAS' },
        { id: '303009', label: '303009 - ALMACEN' },
        { id: '303110', label: '303110 - RESPONSABILIDAD SOCIAL EMPRESARIAL' },
        { id: '320101', label: '320101 - JEFATURA OPERACIONES CAMPO' },
        { id: '320102', label: '320102 - PLANEACION Y CONTROL' },
        { id: '320105', label: '320105 - INGENIERIA AGRICOLA' },
        { id: '320110', label: '320110 - ADMON ZONA 1' },
        { id: '320115', label: '320115 - HIDROLOGIA' },
        { id: '320120', label: '320120 - ADMON ZONA 2' },
        { id: '320998', label: '320998 - COSTO OPERACION BENGALA' },
        { id: '322015', label: '322015 - ADMON VICHADA' },
        { id: '322020', label: '322020 - ADMON VALLE' }
    ],

    CENTROS_COSTO_05: [
        { id: '330100', label: '330100 - OTROS COSTOS DE OPERACIÓN' },
        { id: '330190', label: '330190 - OPERACION DRAGADO' },
        { id: '330199', label: '330199 - OPERACION LOGISTICA' },
        { id: '330300', label: '330300 - COSTOS POR AFECTACIONES CLIMATICAS' },
        { id: '330301', label: '330301 - MTTO DIQUE RIO CAUCA' }
    ],

    CENTROS_COSTO_07: [
        { id: '302202', label: '302202 - OPERACIÓN PLANTA MEZCLAS' }
    ],

    CENTROS_COSTO_08: [
        { id: '332001', label: '332001 - GASTOS DE ADMINISTRACION MAQUINARIA' },
        { id: '332101', label: '332101 - TRACTOR CASE FARMALL 75 HP' },
        { id: '332102', label: '332102 - TRACTOR CASE FARMALL 75 HP' },
        { id: '332103', label: '332103 - TRACTOR CASE QUANTUM 65V' },
        { id: '332201', label: '332201 - DRAGA VALDIVIA' },
        { id: '332202', label: '332202 - LANCHA MOTOR OUTBOARD' },
        { id: '332301', label: '332301 - EQUIPO LISTER No.1' },
        { id: '332302', label: '332302 - MOTOBOMBA DIESEL No.1' },
        { id: '332303', label: '332303 - MOTOBOMBA DIESEL No.4' },
        { id: '332304', label: '332304 - MOTOBOMBA DIESEL No.7' },
        { id: '332305', label: '332305 - MOTOBOMBA DIESEL No.10' },
        { id: '332306', label: '332306 - MOTOBOMBA DIESEL No.13' },
        { id: '332307', label: '332307 - MOTOBOMBA DIESEL No.16' },
        { id: '332308', label: '332308 - MOTOBOMBA DIESEL No.19' },
        { id: '332309', label: '332309 - MOTOBOMBA DIESEL No.22' },
        { id: '332310', label: '332310 - MOTOBOMBA DIESEL No.25' },
        { id: '332311', label: '332311 - MOTOBOMBA DIESEL No.28' },
        { id: '332312', label: '332312 - MOTOBOMBA DIESEL No.31' },
        { id: '332313', label: '332313 - MOTOBOMBA DIESEL No.34' },
        { id: '332314', label: '332314 - BOMBA DIESEL FLUJO MIXTO No.01' },
        { id: '332315', label: '332315 - BOMBA DIESEL HIDROMIXTA' },
        { id: '332316', label: '332316 - BOMBA DIESEL HIDROAXIAL No.01' },
        { id: '332317', label: '332317 - BOMBA DIESEL HIDROAXIAL No.04' },
        { id: '332318', label: '332318 - BOMBA DIESEL HIDROAXIAL No.07' },
        { id: '332319', label: '332319 - BOMBA DIESEL HIDROAXIAL No.10' },
        { id: '332320', label: '332320 - FLOTANTE DIESEL No.01' },
        { id: '332321', label: '332321 - EQUIPO LISTER No.2' },
        { id: '332350', label: '332350 - LATERAL PIVOTABLE LINDSAY' },
        { id: '332401', label: '332401 - MOTOR ELECTRICO No.1' },
        { id: '332402', label: '332402 - MOTOBOMBA ELECTRICA No. 01' },
        { id: '332403', label: '332403 - BOMBA ELEC VERTICAL No.01' },
        { id: '332404', label: '332404 - BOMBA ELEC VERTICAL No.02' },
        { id: '332405', label: '332405 - BOMBA ELEC VERTICAL No.03' },
        { id: '332406', label: '332406 - BOMBA ELEC VERTICAL No.04' },
        { id: '332407', label: '332407 - BOMBA ELEC VERTICAL No.05' },
        { id: '332408', label: '332408 - BOMBA ELEC VERTICAL No.07' },
        { id: '332409', label: '332409 - BOMBA ELEC VERTICAL No.10' },
        { id: '332410', label: '332410 - BOMBA ELEC VERTICAL No.13' },
        { id: '332411', label: '332411 - BOMBA ELEC VERTICAL No.16' },
        { id: '332412', label: '332412 - BOMBA ELEC VERTICAL No.19' },
        { id: '332413', label: '332413 - BOMBA ELEC VERTICAL No.22' },
        { id: '332414', label: '332414 - BOMBA ELEC VERTICAL No.25' },
        { id: '332415', label: '332415 - BOMBA ELEC VERTICAL No.28' },
        { id: '332416', label: '332416 - BOMBA ELEC VERTICAL No.31' },
        { id: '332417', label: '332417 - BOMBA ELEC VERTICAL No.34' },
        { id: '332418', label: '332418 - BOMBA ELEC VERTICAL No.37' },
        { id: '332419', label: '332419 - BOMBA ELEC VERTICAL No.40' },
        { id: '332420', label: '332420 - BOMBA ELEC VERTICAL No.43' },
        { id: '332421', label: '332421 - BOMBA ELEC VERTICAL No.44-NUEVA' },
        { id: '332422', label: '332422 - BOMBA ELEC VERTICAL No.45-NUEVA' },
        { id: '332423', label: '332423 - BOMBA ELEC VERTICAL No.46' },
        { id: '332424', label: '332424 - BOMBA ELEC VERTICAL No.49' },
        { id: '332425', label: '332425 - BOMBA ELEC VERTICAL No.50-NUEVA' },
        { id: '332426', label: '332426 - BOMBA ELEC VERTICAL No.51-NUEVA' },
        { id: '332427', label: '332427 - BOMBA ELEC VERTICAL No.52' },
        { id: '332428', label: '332428 - BOMBA ELEC VERTICAL No.55' },
        { id: '332429', label: '332429 - BOMBA ELEC VERTICAL No.58' },
        { id: '332430', label: '332430 - BOMBA ELEC VERTICAL No.61' },
        { id: '332431', label: '332431 - BOMBA ELEC VERTICAL No.64' },
        { id: '332432', label: '332432 - BOMBA ELEC VERTICAL No.67' },
        { id: '332433', label: '332433 - BOMBA ELEC VERTICAL No.70' },
        { id: '332434', label: '332434 - BOMBA ELEC VERTICAL No.73' },
        { id: '332435', label: '332435 - BOMBA ELEC VERTICAL No.76' },
        { id: '332436', label: '332436 - BOMBA ELEC VERTICAL No.79' },
        { id: '332437', label: '332437 - BOMBA ELEC VERTICAL No.82' },
        { id: '332438', label: '332438 - BOMBA ELEC VERTICAL No.85' },
        { id: '332439', label: '332439 - BOMBA ELEC VERTICAL No.88' },
        { id: '332440', label: '332440 - BOMBA ELEC VERTICAL No.91' },
        { id: '332441', label: '332441 - BOMBA ELEC VERTICAL No.94' },
        { id: '332442', label: '332442 - BOMBA ELEC VERTICAL No.97' },
        { id: '332443', label: '332443 - BOMBA ELEC FLUJO MIXTO No.01' },
        { id: '332444', label: '332444 - BOMBA ELEC FLUJO MIXTO No.04' },
        { id: '332445', label: '332445 - BOMBA ELEC FLUJO MIXTO No.07' },
        { id: '332446', label: '332446 - BOMBA ELEC FLUJO MIXTO No.10' },
        { id: '332447', label: '332447 - BOMBA ELEC FLUJO MIXTO No.13' },
        { id: '332448', label: '332448 - BOMBA ELEC FLUJO MIXTO No.16' },
        { id: '332449', label: '332449 - BOMBA ELEC FLUJO MIXTO No.19' },
        { id: '332450', label: '332450 - BOMBA ELEC FLUJO MIXTO No.25' },
        { id: '332451', label: '332451 - BOMBA ELEC HIDROAXIAL No.01' },
        { id: '332452', label: '332452 - BOMBA ELEC HIDROAXIAL No.04' },
        { id: '332453', label: '332453 - BOMBA ELEC HIDROAXIAL No.07' },
        { id: '332454', label: '332454 - BOMBA ELEC HIDROAXIAL No.10' },
        { id: '332455', label: '332455 - BOMBA ELEC HIDROAXIAL No.13' },
        { id: '332456', label: '332456 - BOMBA ELEC HIDROAXIAL No.16' },
        { id: '332457', label: '332457 - BOMBA ELEC HIDROAXIAL No.19' },
        { id: '332458', label: '332458 - FLOTANTE ELECTRICA No.1' },
        { id: '332459', label: '332459 - FLOTANTE ELECTRICA No.4' },
        { id: '332460', label: '332460 - BOMBA ELEC-MIXTO No.1' },
        { id: '332461', label: '332461 - MOTOBOMBA ELEC SUMERGIBLE POZO' },
        { id: '332462', label: '332462 - BOMBA ELEC HORIZONTAL No. 02' },
        { id: '332463', label: '332463 - BOMBA ELEC HORIZONTAL No. 03' },
        { id: '332464', label: '332464 - FLOTANTE ELECTRICA CENTRIFUGA' },
        { id: '332465', label: '332465 - FLOTANTE ELECTRICA CENTRIFUGA' },
        { id: '332466', label: '332466 - FLOTANTE ELECTRICA CENTRIFUGA' },
        { id: '332467', label: '332467 - BOMBA ELEC VERTICAL No.06' },
        { id: '332468', label: '332468 - BOMBA ELEC VERTICAL No.09' },
        { id: '332469', label: '332469 - BOMBA ELEC FLUJO MIXTO No. 28' },
        { id: '332470', label: '332470 - BOMBA ELEC FLUJO MIXTO No. 79' },
        { id: '332471', label: '332471 - BOMBA ELEC FLUJO MIXTO No. 82' },
        { id: '332472', label: '332472 - BOMBA ELEC FLUJO MIXTO No. 88' },
        { id: '332501', label: '332501 - EQUIPO LIMPIADRENES' },
        { id: '332502', label: '332502 - GUADAÑA DESBROZADORA No.1' },
        { id: '332505', label: '332505 - EQUIPO CAÑON VIAJERO' },
        { id: '332506', label: '332506 - GUADAÑA TIPO APOLO DE 66" No. 0' },
        { id: '332507', label: '332507 - GUADAÑA TIPO APOLO DE 66" No. 0' },
        { id: '332508', label: '332508 - PALA NIVELADORA DE 2.50 MT No. 0' },
        { id: '332509', label: '332509 - PALA NIVELADORA DE 2.50 MT No. 0' },
        { id: '332510', label: '332510 - FUMIGADORA DE ESPALDA MOTORIZADA' },
        { id: '332511', label: '332511 - REENCALLADORA No. 01' },
        { id: '332512', label: '332512 - DESPAJADORA No. 01' },
        { id: '332513', label: '332513 - DESPAJADORA No. 02' },
        { id: '332514', label: '332514 - MINI APORCADOR PARA UNA SOLA C' },
        { id: '332515', label: '332515 - ABONADOR MECAICO FONDO DEL S' },
        { id: '332567', label: '332567 - VAGONES' },
        { id: '332568', label: '332568 - CUREÑAS' },
        { id: '332569', label: '332569 - IMPLEMENTO COMPACTADORA' },
        { id: '332570', label: '332570 - IMPLEMENTO TANQUE AGUA' },
        { id: '332571', label: '332571 - IMPLEMENTO TROMPO MEZCLADOR' },
        { id: '332572', label: '332572 - MOTOSIERRA HUSQVARNA No.01' },
        { id: '332573', label: '332573 - GUADAÑA HUSQVARNA No.01' },
        { id: '332574', label: '332574 - MOTOSOLDADOR FIELD POWER 150' },
        { id: '332575', label: '332575 - GUADAÑA HUSQVARNA FRUTALES' },
        { id: '332576', label: '332576 - BOMBA FUMIGADORA ESTACIONARIA' },
        { id: '332577', label: '332577 - INSUFLADORA MATA HORMIGAS No.' },
        { id: '332578', label: '332578 - INSUFLADORA MATA HORMIGAS No.' },
        { id: '332579', label: '332579 - APORCADOR DE DISCO NO.1' },
        { id: '332580', label: '332580 - APORCADOR DE DISCO NO.2' },
        { id: '332581', label: '332581 - MOTOSOLDADOR MILLER BLUE STAR' },
        { id: '332601', label: '332601 - EQUIPOS ALQUILADOS' },
        { id: '332602', label: '332602 - EQ. PRESTADO LISTER - CAST 2360' }
    ],

    CENTROS_COSTO_10: [
        { id: '322001', label: '322001 - OPERACION VICHADA' },
        { id: '322005', label: '322005 - OPERACION VALLE' },
        { id: '322010', label: '322010 - MANO OBRA GANADERIA' }
    ],

    CENTROS_COSTO_11: [
        { id: '304001', label: '304001 - PREDIOS CON POTENCIAL URBANISTICO E INMO' },
        { id: '304002', label: '304002 - PROYECTO PORTAL DEL RIO' },
        { id: '304003', label: '304003 - PROYECTO TABLONES' },
        { id: '304501', label: '304501 - SIST RIEGO COMPUERTAS RIOCAL' },
        { id: '304502', label: '304502 - MEJORAS CASA PRINCIPAL' },
        { id: '304503', label: '304503 - ADECUACIÓN CAMPAMENTO LA LUISA.' },
        { id: '304504', label: '304504 - APROVE DE AGUA PARA RIEG DE LA ENCANE' },
        { id: '304505', label: '304505 - CONDUCCION PRESURIZADA ESTACION EL DURAN' },
        { id: '304506', label: '304506 - ADECUACIÓN CASA 71' },
        { id: '304507', label: '304507 - AMPLIACION RESERV HDA RIOPAILA' },
        { id: '304508', label: '304508 - INST DRENA ENTU RANURADO FASE II' },
        { id: '304509', label: '304509 - RIEGO POR COMPUERTAS PAILA ARRIBA' },
        { id: '304510', label: '304510 - DRONE PHANTOM 4 PRO - DJI' },
        { id: '304512', label: '304512 - MMTO DIQUES - RIOPAIAL AGRICOLA' },
        { id: '304513', label: '304513 - ADECUACIÓN CASA 45' },
        { id: '304514', label: '304514 - ELECTRIF. ESTACION DE BOMBEO LA ISLA' },
        { id: '304515', label: '304515 - RECUPER CANAL REVESTIDO ZONA 2' },
        { id: '304516', label: '304516 - REPOSICION TUBERIA CON VENTANAS Z1 y Z2' },
        { id: '304517', label: '304517 - SISTEMA DE RIEGO HACIENDA GERTRUDIS' },
        { id: '304518', label: '304518 - FASE II SISTEMA DE RIEGO HDA VALPARAISO' },
        { id: '304519', label: '304519 - MTTO EQUIPOS DE BOMBEO - RIEGO Y DRENAJE' },
        { id: '304520', label: '304520 - REPOSICION EQUIPOS - RIEGO Y DRENAJE' },
        { id: '304521', label: '304521 - OBRA PROTECCION MARGINAL SOBRE RIO CAUC' },
        { id: '304522', label: '304522 - PLANTA POSTCOSECHA' },
        { id: '304523', label: '304523 - RECUPER CANAL REVESTIDO ZONA 2 (FASE II)' },
        { id: '304524', label: '304524 - OFICINA Y BODEGA CASA PRINCIPAL' },
        { id: '304525', label: '304525 - BODEGA GANADERIA' },
        { id: '304526', label: '304526 - TRANSFORMADOR CASA LAS BRISAS' },
        { id: '304527', label: '304527 - MTTO DIQUE RIO CAUCA' },
        { id: '304528', label: '304528 - SISTEMA DE RIEGO HACIENDA MORILLO' },
        { id: '304529', label: '304529 - REPOSICION EQUIPOS DRENAJE -LA RANCHERIA' },
        { id: '304530', label: '304530 - RECUPER CANAL REVESTIDO ZONA2 (FASE III)' },
        { id: '304599', label: '304599 - ACTIVOS FIJOS DIRECTOS' }
    ],

    CENTROS_COSTO_13: [
        { id: '305001', label: '305001 - RECUPERACION AREA - RIOPAILA' },
        { id: '305002', label: '305002 - MANTENIMIENTO DE RESERVORIO EL MATEO' },
        { id: '305003', label: '305003 - TIERRAS JUNTA DIRECTIVA' },
        { id: '305004', label: '305004 - ADECUACION Y MANTENIMIENTO CASA 40' },
        { id: '305005', label: '305005 - ADECUACION Y MANTENIMIENTO CASA 42' },
        { id: '305006', label: '305006 - ADECUACION Y MANTENIMIENTO CASA 80' },
        { id: '305007', label: '305007 - ADECUACION Y MANTENIMIENTO CASA 41' },
        { id: '305501', label: '305501 - PROYECTO STAC - IMPLANTACIÓN SOFTWARE ER' },
        { id: '305502', label: '305502 - PROYECTO SIEMBRA CULTIVO DE MANGO' },
        { id: '305503', label: '305503 - PROYECTO SIEMBRA CULTIVO DE LIMON' },
        { id: '305504', label: '305504 - OTROS FRUTALES' },
        { id: '305505', label: '305505 - GASTOS INVERSION DE GANADERIA' }
    ],

    MOTIVOS: [
        { id: '01', label: '01 - CULTIVO', cc: '2010' },
        { id: '02', label: '02 - ADMINISTRACION', cc: '2020' },
        { id: '04', label: '04 - FIJOS OPERACIÓN', cc: '2040' },
        { id: '05', label: '05 - CAMPO', cc: '2050' },
        { id: '07', label: '07 - PLANTA', cc: '2070' },
        { id: '08', label: '08 - MAQUINARIA', cc: '2080' },
        { id: '10', label: '10 - GANADERIA', cc: '2100' },
        { id: '11', label: '11 - PROYECTOS/ACTIVOS', cc: '2110' },
        { id: '13', label: '13 - DIFERIDOS', cc: '2130' }
    ],

    getCCList(motivoId) {
        if (motivoId === '01') return this.CENTROS_COSTO_01;
        if (motivoId === '02') return this.CENTROS_COSTO_02;
        if (motivoId === '04') return this.CENTROS_COSTO_04;
        if (motivoId === '05') return this.CENTROS_COSTO_05;
        if (motivoId === '07') return this.CENTROS_COSTO_07;
        if (motivoId === '08') return this.CENTROS_COSTO_08;
        if (motivoId === '10') return this.CENTROS_COSTO_10;
        if (motivoId === '11') return this.CENTROS_COSTO_11;
        if (motivoId === '13') return this.CENTROS_COSTO_13;
        return [];
    },

    // RENDER REQUISICION
    renderRequisicionForm(existingData = null) {
        this.currentType = 'REQUISICION';
        const title = 'NUEVA REQUISICIÓN DE MATERIALES';
        const color = '#3b82f6'; // Blue

        const container = document.getElementById('boletas-form-container'); // CHANGED TARGET
        const viewList = document.getElementById('boletas-list-view');

        if (!container) return;

        // TOGGLE VIEWS
        if (viewList) viewList.style.display = 'none';
        container.style.display = 'block';

        // Data
        const materiales = DataManager.getAllMaterials().map(m => `<option value="${m.codigo} - ${m.descripcion}">`).join('');
        // const motivos = ... (We use this.MOTIVOS now)

        // Pre-fill values
        const valSolicitante = existingData ? existingData.solicitante : '49 SOL RECURSOS HIDRICOS (ANA MARIA MOSQUERA)';
        const valFecha = existingData ? this.formatToISO(existingData.fecha) : this.formatToISO(null);
        const valObs = (existingData && existingData.observaciones) ? existingData.observaciones : '';
        const btnText = existingData ? 'GUARDAR REQUISICIÓN' : 'GENERAR Y ENVIAR';

        // Initialize items if new
        if (!existingData && this.currentBoletaItems.length === 0) {
            this.addItem();
        }

        let html = `
            ${this.renderHeader()}
            <div style="animation: slideIn 0.3s ease; width: 100%; margin: 0 auto;">
                <button class="btn-icon" onclick="BoletasController.render()" style="margin-bottom: 1rem;">
                    <i data-lucide="arrow-left"></i> Volver
                </button>

                <div class="glass-panel" style="padding: 2rem; border-top: 4px solid ${color};">
                    <h2 style="text-align: center; color: ${color}; margin-bottom: 2rem;">${title}</h2>
                    ${existingData ? `<div style="text-align:center; background: #3b82f622; color: #3b82f6; padding: 0.5rem; margin-bottom: 1rem; border-radius: 4px;">Modo Edición: ${existingData.id}</div>` : ''}
                    
                    <!-- Header -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
                         <div class="form-group">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Solicitante (Siesa)</label>
                            <input type="text" id="bol-solicitante" class="input-dark" style="width: 100%; background: #f3f4f6; color: #6b7280;" 
                                value="${valSolicitante}" readonly title="Valor fijo por defecto">
                        </div>
                        <div class="form-group" style="display:none;">
                            <input type="date" id="bol-fecha" value="${valFecha}">
                        </div>
                    </div>

                    <!-- Items Table REQ -->
                    <datalist id="materiales-list">${materiales}</datalist>
                    
                    <div style="margin-bottom: 2rem; border-radius: 8px; overflow: hidden; background: #ccc; border: 1px solid #999;">
                        <!-- Blue Header -->
                        <div style="padding: 1rem 1.5rem; background: #eff6ff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bfdbfe;">
                            <h4 style="color: #1e40af; margin: 0; font-weight: 700; font-size: 0.9rem; letter-spacing: 0.5px;">DETALLE DE MATERIALES</h4>
                             <div style="font-size: 0.8rem; color: #3b82f6;">Total Items: <span id="bol-total-items-req">0</span></div>
                        </div>

                        <div style="background: #f8fafc; padding: 1rem; overflow-x: auto;">
                            <!-- Columns: Material(1.5fr), Bodega(70), Motivo(160), CCosto(180), Cant(60), Trash(40) -->
                            <div style="display: grid; grid-template-columns: 1.5fr 70px 160px 180px 60px 40px; gap: 8px; margin-bottom: 0.5rem; padding: 0 0.5rem; min-width: 600px;">
                                <div style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Material</div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Bodega</div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase;">Motivo</div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase;">C.Costo</div>
                                <div style="font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase; text-align: center;">Cant.</div>
                                <div></div>
                            </div>

                            <!-- List -->
                            <div id="bol-items-body-req" style="display: flex; flex-direction: column; gap: 0.5rem; min-width: 600px;"></div>
                        </div>

                        <!-- Add Button -->
                        <button onclick="BoletasController.addItemReq()" style="
                            width: 100%; padding: 12px; background: #eff6ff; color: #3b82f6; border: none; border-top: 1px dashed #bfdbfe;
                            cursor: pointer; font-weight: 700; text-transform: uppercase; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;
                        " onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                            <i data-lucide="plus"></i> AGREGAR MATERIAL
                        </button>
                    </div>

                    <div class="form-group" style="margin-bottom: 2rem;">
                         <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Nota / Observaciones</label>
                         <textarea id="bol-obs" class="input-dark" style="width: 100%; height: 80px;" placeholder="Detalles adicionales para la requisición...">${valObs}</textarea>
                    </div>

                    <div style="text-align: right; display: flex; justify-content: flex-end; gap: 1rem;">
                         ${existingData ? `<button class="btn" onclick="BoletasController.render()" style="background: transparent; border: 1px solid var(--glass-border);">CANCELAR</button>` : ''}
                        <button class="btn btn-primary" onclick="BoletasController.saveAndSend('${this.currentType}')" style="padding: 1rem 2rem; font-size: 1rem; background: ${color}; border-color: ${color};">
                            <i data-lucide="save" style="margin-right: 8px;"></i> ${btnText}
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        this.renderItemsTableReq();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    addItemReq() {
        this.currentBoletaItems.push({
            codigo: '-',
            descripcion: '',
            bodega: '1000',
            motivo: '', // Dropdown ID
            centroCosto: '', // Auto
            cantidad: 1,
            unidad: 'UND'
        });
        this.renderItemsTableReq();
    },

    renderItemsTableReq() {
        const container = document.getElementById('bol-items-body-req');
        const countSpan = document.getElementById('bol-total-items-req');
        if (!container) return;
        if (countSpan) countSpan.innerText = this.currentBoletaItems.length;

        container.innerHTML = this.currentBoletaItems.map((item, idx) => {
            const inputStyle = "width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; color: #334155; font-size: 0.8rem; outline: none;";
            const readStyle = "width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #e2e8f0; background: #f1f5f9; color: #64748b; font-size: 0.8rem; outline: none; font-weight: 600;";

            // Build Motivos Options
            const optionsMotivo = this.MOTIVOS.map(m => `<option value="${m.id}" ${item.motivo === m.id ? 'selected' : ''}>${m.label}</option>`).join('');

            // Build C.Costo Input (Dynamic based on Motivo)
            // Use BoletasController explicitly to access the helper
            const ccList = BoletasController.getCCList ? BoletasController.getCCList(item.motivo) : [];
            let ccInput;

            if (ccList && ccList.length > 0) {
                const ccOptions = ccList.map(ccc => `<option value="${ccc.id}" ${item.centroCosto === ccc.id ? 'selected' : ''}>${ccc.label}</option>`).join('');
                ccInput = `
                    <select style="${inputStyle}" onchange="BoletasController.updateItem(${idx}, 'centroCosto', this.value)">
                        <option value="">Seleccione CC...</option>
                        ${ccOptions}
                    </select>
                 `;
            } else {
                // Fallback for others or unknown
                ccInput = `
                    <input type="text" style="${inputStyle}" placeholder="CC" value="${item.centroCosto || ''}" 
                    onchange="BoletasController.updateItem(${idx}, 'centroCosto', this.value)">
                 `;
            }

            return `
            <div style="display: grid; grid-template-columns: 1.5fr 70px 160px 180px 60px 40px; gap: 8px; align-items: center;">
                
                <!-- Material (without Code column, search includes code) -->
                <input type="text" style="${inputStyle}" list="materiales-list" placeholder="Código o Nombre del Material..." value="${item.descripcion}" 
                    onchange="BoletasController.updateItem(${idx}, 'descripcion', this.value)">

                <!-- Bodega -->
                <input type="text" style="${readStyle}; text-align: center;" value="1000" readonly>

                <!-- Motivo -->
                <select style="${inputStyle}" onchange="BoletasController.updateItem(${idx}, 'motivo', this.value); BoletasController.renderItemsTableReq();">
                    <option value="">Sel...</option>
                    ${optionsMotivo}
                </select>

                <!-- C. Costo -->
                ${ccInput}

                <!-- Cant -->
                <input type="number" style="${inputStyle}; text-align: center;" min="0" step="0.01" value="${item.cantidad}" 
                    onchange="BoletasController.updateItem(${idx}, 'cantidad', this.value)">

                <!-- Trash -->
                <div style="text-align: center;">
                    <button class="btn-icon" style="color: #ef4444; padding: 6px; background: rgba(239,68,68,0.1); border-radius: 6px;" onclick="BoletasController.removeItemReq(${idx})" tabindex="-1">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </div>
             `;
        }).join('');
        lucide.createIcons();
    },

    removeItemReq(index) {
        this.currentBoletaItems.splice(index, 1);
        this.renderItemsTableReq();
    },

    renderHeader() {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <div>
                    <h1 style="font-size: 1.5rem; font-weight: 700; color: #10b981; margin: 0; text-align: left;">BOLETAS Y REQUISICIONES</h1>
                    <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem; text-align: left;">Control de salidas y pedidos de almacén</p>
                </div>
                <!-- Optional Right Side Action or Info -->
                <div></div>
            </div>
        `;
    },

    toggleEmailStatus(id, newStatus) {
        if (!id) return;
        DataManager.updateBoletaEmailStatus(id, newStatus);
        this.boletas = DataManager.getBoletas();
        this.render();
    }
};
