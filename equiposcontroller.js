const EquiposController = {
    equipos: [],
    currentId: null, // For editing

    // IDs for Diesel Equipment (Maintenance every 250H)
    DIESEL_EQUIPMENT_IDS: [
        '336407', '336410', '336413', '336416', '336422', '336910',
        '336701', '336904', '337301', '336702', '336428', '336401',
        '331001', '331002', '331425', '336001', '336002', '336003'
    ],

    init: function () {
        // Init data handling
        this.equipos = DataManager.getEquipos();

        // Check for corruption (existing data but missing keys) or empty
        const isCorrupted = this.equipos.length > 0 && (!this.equipos[0].codigo || this.equipos[0].codigo === undefined);

        // Populate if empty or corrupted
        if (this.equipos.length === 0 || isCorrupted) {
            console.warn("Datos de equipos corruptos, vacíos o incompletos. Sincronizando con maestro de datos...");
            this.equipos = this.getSeedData();
            // DataManager.saveEquipos(this.equipos); // DANGEROUS: Might overwrite cloud fetch in race condition
        }

        // Recalculate alerts on init (case where data exists but logic changed)
        this.syncMaintenanceHistory(); // New: Sync from Planes History
        this.recalculateAlerts();

        this.renderTable();
        console.log("Maestro de Equipos inicializado");
    },

    recalculateAlerts: function () {
        let changed = false;
        this.equipos.forEach(eq => {
            if (this.DIESEL_EQUIPMENT_IDS.includes(eq.codigo)) {
                const status = this.calculateAlertStatus(eq.horometro_actual, eq.ultimo_mtto_horas);
                if (eq.maintenanceStatus !== status) {
                    eq.maintenanceStatus = status;
                    changed = true;
                }
            }
        });
        if (changed) DataManager.saveEquipos(this.equipos);
    },

    syncMaintenanceHistory: function () {
        const planes = DataManager.getPlanes();
        if (!planes || planes.length === 0) return;

        let changed = false;

        // Iterate only Diesel Equipments
        this.equipos.forEach(eq => {
            const eqCode = String(eq.codigo).trim();
            if (this.DIESEL_EQUIPMENT_IDS.some(id => String(id) === eqCode)) {

                // Find COMPLETED plans for this equipment
                const myPlans = planes.filter(p =>
                    String(p.equipo).startsWith(eqCode) &&
                    p.estado === 'REALIZADO'
                );

                if (myPlans.length === 0) return;

                // Find the Highest Maintenance Interval done
                // Heuristic: Extract number from description "Mantenimiento 250 Horas"
                let maxMaintenance = 0;

                myPlans.forEach(p => {
                    // PRIORIDAD 1: Horómetro Absoluto
                    if (p.horometroCierre && !isNaN(parseFloat(p.horometroCierre))) {
                        const cierre = parseFloat(p.horometroCierre);
                        if (cierre > maxMaintenance) maxMaintenance = cierre;
                        return;
                    }

                    // PRIORIDAD 2: Regex
                    const desc = p.descripcion || '';
                    const match = desc.match(/(\d+)\s*(Horas|H|Hrs)/i);
                    if (match) {
                        const val = parseInt(match[1]);
                        if (val > maxMaintenance) maxMaintenance = val;
                    }

                    // Fallback: Use Sequence * 250 if description is custom but sequence exists?
                    if (p.secuencia) {
                        const seqVal = p.secuencia * 250;
                        if (seqVal > maxMaintenance) maxMaintenance = seqVal;
                    }
                });

                // Update Equipment if new max found
                const currentLast = parseFloat(eq.ultimo_mtto_horas || 0);
                if (maxMaintenance > currentLast) {
                    eq.ultimo_mtto_horas = maxMaintenance;
                    changed = true;
                }

                // AUTO-CORRECTION: If maintenance horometer is higher than current equipment horometer, update it.
                // This fixes cases where "307" is shown but maintenance was done at "20150".
                const currentActual = parseFloat(eq.horometro_actual || 0);
                if (maxMaintenance > currentActual) {
                    console.log(`Auto-correcting Eq ${eq.codigo} hours: ${currentActual} -> ${maxMaintenance}`);
                    eq.horometro_actual = maxMaintenance;
                    changed = true;
                }
            }
        });

        if (changed) {
            console.log("Maintenance History Synced: Updated 'Last Maintenance' & 'Current Hours'.");
            DataManager.saveEquipos(this.equipos);
        }
    },

    calculateAlertStatus: function (currentHours, lastMaintenanceHours = 0) {
        if (!currentHours) return 'NORMAL';

        const h = parseFloat(currentHours);
        const last = parseFloat(lastMaintenanceHours || 0);
        const interval = 250;

        // RELATIVE LOGIC (Shifted):
        // Next maintenance is exactly 250 hours after the last one was performed.
        // This adapts to late maintenances automatically.
        let target = last + interval;

        // If never maintained (last=0), target is 250.
        if (last === 0) target = 250;

        // Edge case: if last is 0, target is 250.
        // If last is 250, target is 500.

        const diff = target - h;

        if (h >= target) {
            // We passed the target!
            // It is VENCIDO (Overdue) until maintenance is recorded.
            return 'ALERT';
        } else if (diff <= 25) {
            // We are within 25 hours of target
            return 'WARNING';
        }

        return 'NORMAL';
    },

    getSeedData: function () {
        return DataManager.defaults.equipos;
    },

    // --- CRUD ACTIONS ---
    createEquipo: function () {
        this.editEquipo(null);
    },

    editEquipo: function (id) {
        this.currentId = id;
        const equipo = id ? this.equipos.find(e => e.id === id || e.codigo === id) : {};

        const title = id ? 'Editar Equipo' : 'Nuevo Equipo';
        const btnText = id ? 'Guardar Cambios' : 'Crear Equipo';
        const codeValue = equipo.codigo || '';
        const descValue = equipo.descripcion || '';
        const brandValue = equipo.marca || '';
        const modelValue = equipo.modelo || '';
        const seriesValue = equipo.serie || '';
        const horometerValue = equipo.horometro_actual || 0;
        const locationValue = equipo.ubicacion || '';
        const statusValue = equipo.estado || 'OPERATIVO';

        // Modal HTML
        const modalHtml = `
            <div id="modal-equipo" class="modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; animation: fadeIn 0.2s;">
                <div class="glass-panel" style="width: 100%; max-width: 500px; padding: 2rem; position: relative;">
                    <button class="btn-icon" style="position: absolute; top: 1rem; right: 1rem;" onclick="document.getElementById('modal-equipo').remove()">
                        <i data-lucide="x"></i>
                    </button>
                    
                    <h2 style="margin-top: 0; margin-bottom: 1.5rem; text-align: center; color: var(--primary);">${title}</h2>
                    
                    <form onsubmit="event.preventDefault(); EquiposController.saveEquipo();">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Código (ID Único)</label>
                            <input type="text" id="eq-codigo" class="input-dark" style="width: 100%;" value="${codeValue}" required ${id ? 'readonly' : ''}>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Descripción</label>
                            <input type="text" id="eq-desc" class="input-dark" style="width: 100%;" value="${descValue}" required>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                             <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Marca</label>
                                <input type="text" id="eq-marca" class="input-dark" style="width: 100%;" value="${brandValue}">
                            </div>
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Modelo</label>
                                <input type="text" id="eq-modelo" class="input-dark" style="width: 100%;" value="${modelValue}">
                            </div>
                        </div>

                         <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                             <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Serie</label>
                                <input type="text" id="eq-serie" class="input-dark" style="width: 100%;" value="${seriesValue}">
                            </div>
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Horómetro Actual</label>
                                <input type="number" id="eq-horometro" class="input-dark" style="width: 100%;" value="${horometerValue}" step="0.1">
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Ubicación</label>
                            <input type="text" id="eq-ubicacion" class="input-dark" style="width: 100%;" value="${locationValue}">
                        </div>

                        <div class="form-group" style="margin-bottom: 2rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Estado Operativo</label>
                            <select id="eq-estado" class="input-dark" style="width: 100%;">
                                <option value="OPERATIVO" ${statusValue === 'OPERATIVO' ? 'selected' : ''}>OPERATIVO</option>
                                <option value="MANTENIMIENTO" ${statusValue === 'MANTENIMIENTO' ? 'selected' : ''}>EN MANTENIMIENTO</option>
                                <option value="FUERA DE SERVICIO" ${statusValue === 'FUERA DE SERVICIO' ? 'selected' : ''}>FUERA DE SERVICIO</option>
                            </select>
                        </div>

                        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                            <i data-lucide="save"></i> ${btnText}
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        lucide.createIcons();
    },

    saveEquipo: function () {
        const codigo = document.getElementById('eq-codigo').value.trim();
        if (!codigo) { alert("El código es obligatorio."); return; }

        // Check duplicate if new
        if (!this.currentId) {
            const exists = this.equipos.some(e => String(e.codigo) === String(codigo));
            if (exists) { alert(" �El código ya existe! Usa otro."); return; }
        }

        const data = {
            id: codigo, // ID matches Code
            codigo: codigo,
            descripcion: document.getElementById('eq-desc').value.trim(),
            marca: document.getElementById('eq-marca').value.trim(),
            modelo: document.getElementById('eq-modelo').value.trim(),
            serie: document.getElementById('eq-serie').value.trim(),
            horometro_actual: parseFloat(document.getElementById('eq-horometro').value) || 0,
            ubicacion: document.getElementById('eq-ubicacion').value.trim(),
            estado: document.getElementById('eq-estado').value,
            ultimo_mtto_horas: 0 // Init
        };

        if (this.currentId) {
            // Update
            const idx = this.equipos.findIndex(e => e.id === this.currentId || e.codigo === this.currentId);
            if (idx !== -1) {
                // Preserve existing fields not in form
                this.equipos[idx] = { ...this.equipos[idx], ...data };
            }
        } else {
            // Create
            this.equipos.push(data);
        }

        DataManager.saveEquipos(this.equipos);
        document.getElementById('modal-equipo').remove();
        this.renderTable(); // Refresh table
        this.renderDashboardWidgets(); // Refresh widgets
        alert("Equipo guardado correctamente.");
    },

    deleteEquipo: function (id) {
        if (!confirm(' �Estás seguro de eliminar este equipo?')) return;

        this.equipos = this.equipos.filter(e => e.id !== id && e.codigo !== id);
        DataManager.saveEquipos(this.equipos);
        this.renderTable();
    },

    // Filter Logic
    filterTable: function (query) {
        const typeFilter = document.getElementById('filter-equipo-tipo') ? document.getElementById('filter-equipo-tipo').value : 'TODOS';
        const term = query ? query.toLowerCase() : '';

        const filtered = this.equipos.filter(eq => {
            // 1. Text Search
            const codigo = String(eq.codigo || '').toLowerCase();
            const desc = String(eq.descripcion || '').toLowerCase();
            const ubic = String(eq.ubicacion || '').toLowerCase();
            const prov = String(eq.proveedor || '').toLowerCase();
            const matchesText = !term || codigo.includes(term) || desc.includes(term) || ubic.includes(term) || prov.includes(term);

            // 2. Type Filter
            const isDiesel = this.DIESEL_EQUIPMENT_IDS.some(id => String(id) === String(eq.codigo)); // Robust comparison
            let matchesType = true;

            if (typeFilter === 'DIESEL') {
                matchesType = isDiesel;
            } else if (typeFilter === 'ELECTRICO') {
                matchesType = !isDiesel;
            }

            return matchesText && matchesType;
        });
        this.renderTableData(filtered);
    },

    renderTable: function () {
        this.renderTableData(this.equipos);
    },

    renderTableData: function (data) {
        const tableBody = document.getElementById('equipos-table-body');
        if (!tableBody) return;

        const formatValue = (val) => {
            if (val === undefined || val === null || val === '' || val === '-' || val === '0' || String(val) === 'undefined') return '-';
            const num = parseFloat(val);
            if (isNaN(num)) return val;
            return Number.isInteger(num) ? num.toString() : num.toFixed(2);
        };

        let html = '';
        data.forEach(eq => {
            // Determine Row Style based on status
            let statusStyle = '';
            let statusIcon = '';

            if (eq.maintenanceStatus === 'WARNING') {
                statusStyle = 'border-left: 4px solid #FEB811; background: rgba(254, 184, 17, 0.05);';
                statusIcon = '<span title="Mantenimiento Próximo" style="color: #FEB811; margin-left: 0.5rem;"><i data-lucide="alert-triangle" style="width:16px;"></i></span>';
            } else if (eq.maintenanceStatus === 'ALERT') {
                statusStyle = 'border-left: 4px solid #D7181F; background: rgba(215, 24, 31, 0.05);';
                statusIcon = '<span title="Mantenimiento Vencido/Requerido" style="color: #D7181F; margin-left: 0.5rem;"><i data-lucide="alert-circle" style="width:16px;"></i></span>';
            }

            html += `
                <tr style="${statusStyle}">
                    <td style="font-weight: 600; color: var(--primary-main); cursor: pointer;" onclick="EquiposController.showInfoCard('${eq.codigo}')" title="Ver Tarjeta Informativa">
                        ${eq.codigo}
                        ${statusIcon}
                    </td>
                    <td>${eq.descripcion}</td>
                    <td>${eq.ubicacion}</td>
                    <td>${eq.funcion || '-'}</td>
                    <td>${formatValue(eq.caudal)}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; line-height: 1.2;">
                            <span style="font-weight: bold; font-size: 0.9em;" title="Consumo Real Promedio">
                                ${(parseFloat(eq.horas_consumo_acumulado) > 0) ? (parseFloat(eq.consumo_real_acumulado) / parseFloat(eq.horas_consumo_acumulado)).toFixed(2) : '-'}
                            </span>
                            <span style="font-size: 0.8em; color: var(--text-muted);" title="Consumo Aforo (Teórico)">${formatValue(eq.consumo || eq.aforo_consumo || eq.aforoconsumo)}</span>
                        </div>
                    </td>
                    <td>${eq.variador || '-'}</td>
                    <td>${formatValue(eq.potenciaHP)}</td>
                    <td>${formatValue(eq.potenciaKw)}</td>
                    <td>
                        <span style="font-weight: bold; color: ${this.DIESEL_EQUIPMENT_IDS.includes(String(eq.codigo)) ? 'var(--text-main)' : 'var(--text-muted)'};">
                            ${this.DIESEL_EQUIPMENT_IDS.includes(String(eq.codigo)) ? (eq.horometro_actual ? formatValue(eq.horometro_actual) : '0') : 'N/A'}
                        </span>
                    </td>
                    <td>
                        <span class="badge ${eq.proveedor === 'PROPIO' ? 'badge-success' : 'badge-warning'}">${eq.proveedor}</span>
                    </td>
                    <td>
                        <button class="btn-icon" onclick="EquiposController.editEquipment('${eq.codigo}')" title="Editar Información">
                            <i data-lucide="edit-3" style="width: 16px;"></i>
                        </button>
                        <button class="btn-icon" onclick="EquiposController.deleteEquipment('${eq.codigo}')" title="Eliminar Equipo" style="color: #D7181F; margin-left: 0.5rem;">
                            <i data-lucide="trash-2" style="width: 16px;"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    showInfoCard: function (codigo) {
        const eq = this.equipos.find(e => e.codigo === codigo);
        if (!eq) return;

        const formatValue = (val) => {
            if (val === undefined || val === null || val === '' || val === '-' || val === '0') return '-';
            const num = parseFloat(val);
            if (isNaN(num)) return val;
            return Number.isInteger(num) ? num.toString() : num.toFixed(2);
        };

        // Populate Card
        document.getElementById('info-eq-codigo').innerText = eq.codigo;
        document.getElementById('info-eq-descripcion').innerText = eq.descripcion || '-';
        document.getElementById('info-eq-ubicacion').innerText = eq.ubicacion || '-';
        const realVal = parseFloat(eq.consumo_real_acumulado) || 0;
        const realHrs = parseFloat(eq.horas_consumo_acumulado) || 0;
        let realAvgText = 'N/A';
        if (realHrs > 0) realAvgText = (realVal / realHrs).toFixed(2) + ' Gal/Hr';

        document.getElementById('info-eq-consumo').innerHTML = `
            <div>
                <strong style="color: var(--primary-main)">${realAvgText}</strong> <small>(Real)</small><br>
                <small style="color:var(--text-muted)">Aforo: ${formatValue(eq.consumo)}</small>
            </div>
        `;
        document.getElementById('info-eq-funcion').innerText = eq.funcion || '-';
        document.getElementById('info-eq-caudal').innerText = formatValue(eq.caudal);
        document.getElementById('info-eq-potencia').innerText = `${formatValue(eq.potenciaHP)} HP / ${formatValue(eq.potenciaKw)} Kw`;
        document.getElementById('info-eq-variador').innerText = eq.variador || 'NO';
        document.getElementById('info-eq-horometro').innerText = `${formatValue(eq.horometro_actual)} Hrs`;
        document.getElementById('info-eq-proveedor').innerText = eq.proveedor || 'PROPIO';

        // --- DIESEL PROGRAM BUTTON LOGIC ---
        const btnProgramar = document.getElementById('btn-programar-mtto');
        if (btnProgramar) {
            if (this.DIESEL_EQUIPMENT_IDS.includes(eq.codigo)) {
                btnProgramar.style.display = 'inline-flex';
                btnProgramar.onclick = () => this.programarDesdeAlerta(eq.codigo);
            } else {
                btnProgramar.style.display = 'none';
            }
        }

        document.getElementById('modal-info-equipo').style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    programarDesdeAlerta: function (codigo) {
        const eq = this.equipos.find(e => e.codigo === codigo);
        if (!eq) return;

        this.closeInfoModal();

        // Navigate to Planes
        if (typeof navigate === 'function') {
            navigate('planes');
            // If in selection mode, go into Propio automatically
            if (typeof PlanesController !== 'undefined') {
                PlanesController.selectMode('PROPIO');

                // Determine next maintenance sequence based on existing planes
                const planes = DataManager.getPlanes().filter(p => String(p.equipo).startsWith(codigo));
                const lastSequence = planes.length > 0 ? Math.max(...planes.map(p => p.secuencia || 1)) : 0;
                const nextSequence = lastSequence + 1;
                const sequenceName = `Mantenimiento ${nextSequence * 250} Horas`;

                // Load form with initial data
                PlanesController.loadForm(null, {
                    equipoFull: `${eq.codigo} - ${eq.descripcion}`,
                    descripcion: sequenceName,
                    secuencia: nextSequence
                });
            }
        }
    },

    closeInfoModal: function () {
        const modal = document.getElementById('modal-info-equipo');
        if (modal) modal.style.display = 'none';
    },

    editEquipment: function (codigo) {
        const eq = this.equipos.find(e => e.codigo === codigo);
        if (!eq) return;

        // Populate Modal
        document.getElementById('modal-equipo-title').innerText = 'Editar Datos de Equipo';
        document.getElementById('eq-codigo').value = eq.codigo;
        document.getElementById('eq-descripcion').value = eq.descripcion || '';
        document.getElementById('eq-ubicacion').value = eq.ubicacion || '';
        document.getElementById('eq-consumo').value = eq.consumo || '';
        document.getElementById('eq-funcion').value = eq.funcion || '';
        document.getElementById('eq-proveedor').value = eq.proveedor || 'PROPIO';
        document.getElementById('eq-caudal').value = eq.caudal || '';
        document.getElementById('eq-variador').value = eq.variador || 'NO';
        document.getElementById('eq-hp').value = eq.potenciaHP || '';
        document.getElementById('eq-kw').value = eq.potenciaKw || '';

        // Lock ID for editing
        document.getElementById('eq-codigo').disabled = true;

        this.openModal(true);
    },

    // --- DASHBOARD WIDGETS ---
    renderDashboardWidgets: function () {
        const chartCanvas = document.getElementById('fleet-health-chart');
        const alertsList = document.getElementById('fleet-alerts-list');
        const totalDisplay = document.getElementById('fleet-health-total');

        if (!chartCanvas || !alertsList) return;

        // Ensure data is loaded
        if (!this.equipos || this.equipos.length === 0) {
            this.equipos = DataManager.getEquipos();
        }

        // 1. Calculate Stats
        let stats = { NORMAL: 0, ALERT: 0, WARNING: 0 };
        let criticalList = [];

        this.equipos.forEach(eq => {
            // Only count if it's Diesel/Machinery with tracking
            const eqCode = String(eq.codigo).trim();
            if (this.DIESEL_EQUIPMENT_IDS.some(id => String(id) === eqCode)) {
                // Ensure status is up to date
                const status = this.calculateAlertStatus(eq.horometro_actual, eq.ultimo_mtto_horas);
                if (status === 'ALERT') stats.ALERT++;
                else if (status === 'WARNING') stats.WARNING++;
                else stats.NORMAL++;

                if (status !== 'NORMAL') {
                    // Calculate days information
                    const currentHours = parseFloat(eq.horometro_actual) || 0;
                    const lastMttoHours = parseFloat(eq.ultimo_mtto_horas) || 0;
                    const hoursSinceLastMtto = currentHours - lastMttoHours;
                    const maintenanceInterval = 250; // Standard interval

                    let daysInfo = {};
                    if (status === 'ALERT') {
                        // Vencido
                        const hoursOverdue = hoursSinceLastMtto - maintenanceInterval;
                        // Assuming 8 hours per day of operation
                        const daysOverdue = Math.ceil(hoursOverdue / 8);
                        daysInfo = {
                            type: 'overdue',
                            days: daysOverdue,
                            message: `Vencido hace ${daysOverdue} día${daysOverdue !== 1 ? 's' : ''}`,
                            sortPriority: 1000 + daysOverdue // Higher priority for more overdue
                        };
                    } else {
                        // Próximo
                        const hoursRemaining = maintenanceInterval - hoursSinceLastMtto;
                        const daysRemaining = Math.ceil(hoursRemaining / 8);
                        daysInfo = {
                            type: 'upcoming',
                            days: daysRemaining,
                            message: `Vence en ${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`,
                            sortPriority: -daysRemaining // Lower priority for further away
                        };
                    }

                    criticalList.push({
                        ...eq,
                        status: status,
                        daysInfo: daysInfo,
                        hoursSinceLastMtto: hoursSinceLastMtto,
                        maintenanceInterval: maintenanceInterval
                    });
                }
            }
        });

        const totalTracked = stats.NORMAL + stats.ALERT + stats.WARNING;
        if (totalDisplay) totalDisplay.innerText = totalTracked;

        // 2. Render Chart
        if (window.fleetChart instanceof Chart) {
            window.fleetChart.destroy();
        }

        const ctx = chartCanvas.getContext('2d');
        if (typeof Chart !== 'undefined') {
            window.fleetChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Operativo', 'Alerta', 'Crítico'],
                    datasets: [{
                        data: [stats.NORMAL, stats.WARNING, stats.ALERT],
                        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                        borderWidth: 0,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: '#9ca3af',
                                padding: 15,
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });
        }

        // 3. Sort and limit to top 5 critical
        criticalList.sort((a, b) => b.daysInfo.sortPriority - a.daysInfo.sortPriority);
        const top5Critical = criticalList.slice(0, 5);

        // 4. Render Critical List with Professional Design
        alertsList.innerHTML = '';
        if (top5Critical.length === 0) {
            alertsList.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-style: italic;">
                    <i data-lucide="check-circle" style="color: #10b981; margin-bottom: 0.5rem;" size="32"></i><br>
                    Flota operativa. Sin alertas activas.
                </div>`;
        } else {
            top5Critical.forEach(eq => {
                const isOverdue = eq.daysInfo.type === 'overdue';

                // Determine criticality level and colors
                let criticalityLevel, badgeColor, borderColor, bgGradient, icon;

                if (isOverdue) {
                    if (eq.daysInfo.days > 15) {
                        // Critical - Vencido >15 días
                        criticalityLevel = 'CRÍTICO';
                        badgeColor = '#ef4444';
                        borderColor = '#ef4444';
                        bgGradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)';
                        icon = '� ️';
                    } else {
                        // High - Vencido 1-15 días
                        criticalityLevel = 'ALTO';
                        badgeColor = '#f97316';
                        borderColor = '#f97316';
                        bgGradient = 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(249, 115, 22, 0.02) 100%)';
                        icon = '� ️';
                    }
                } else {
                    if (eq.daysInfo.days <= 7) {
                        // Medium - Próximo <7 días
                        criticalityLevel = 'MEDIO';
                        badgeColor = '#f59e0b';
                        borderColor = '#f59e0b';
                        bgGradient = 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)';
                        icon = '⏰';
                    } else {
                        // Low - Próximo 7-30 días
                        criticalityLevel = 'BAJO';
                        badgeColor = '#3b82f6';
                        borderColor = '#3b82f6';
                        bgGradient = 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)';
                        icon = '⏰';
                    }
                }

                const item = document.createElement('div');
                item.style.cssText = `
                    background: ${bgGradient};
                    padding: 1rem;
                    border-left: 4px solid ${borderColor};
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                `;

                item.onmouseenter = function () {
                    this.style.transform = 'translateX(4px)';
                    this.style.boxShadow = `0 4px 12px ${borderColor}33`;
                };
                item.onmouseleave = function () {
                    this.style.transform = 'translateX(0)';
                    this.style.boxShadow = 'none';
                };

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                <span style="font-size: 1.2rem;">${icon}</span>
                                <div style="font-weight: 700; font-size: 0.95rem; color: white;">${eq.descripcion}</div>
                            </div>
                            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
                                <span style="font-weight: 600; color: #9ca3af;">${eq.codigo}</span> • ${eq.ubicacion || 'Sin ubicación'}
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.75rem;">
                                <div>
                                    <span style="color: var(--text-muted);">Horómetro:</span>
                                    <span style="font-weight: 600; color: white; margin-left: 0.25rem;">${eq.horometro_actual || 0} hrs</span>
                                </div>
                                <div>
                                    <span style="color: var(--text-muted);">Programado:</span>
                                    <span style="font-weight: 600; color: white; margin-left: 0.25rem;">${eq.maintenanceInterval} hrs</span>
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;">
                            <div style="
                                background: ${badgeColor};
                                color: white;
                                padding: 0.4rem 0.8rem;
                                border-radius: 6px;
                                font-size: 0.75rem;
                                font-weight: 800;
                                text-align: center;
                                box-shadow: 0 2px 8px ${badgeColor}44;
                                white-space: nowrap;
                            ">
                                ${eq.daysInfo.message}
                            </div>
                            <button 
                                class="btn btn-primary" 
                                onclick="event.stopPropagation(); navigate('planes'); setTimeout(() => PlanesController.loadForm(null, {equipo: '${eq.codigo}'}), 100);"
                                style="
                                    font-size: 0.75rem;
                                    padding: 0.5rem 1rem;
                                    background: ${badgeColor};
                                    border: none;
                                    box-shadow: 0 2px 8px ${badgeColor}44;
                                    white-space: nowrap;
                                "
                                onmouseenter="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px ${badgeColor}66';"
                                onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px ${badgeColor}44';"
                            >
                                <i data-lucide="calendar-plus" style="width: 14px; height: 14px;"></i>
                                Programar
                            </button>
                        </div>
                    </div>
                `;

                alertsList.appendChild(item);
            });

            // Add "Ver todos" link if there are more than 5
            if (criticalList.length > 5) {
                const viewAllDiv = document.createElement('div');
                viewAllDiv.style.cssText = 'text-align: center; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--glass-border);';
                viewAllDiv.innerHTML = `
                    <a href="#" onclick="navigate('equipos'); return false;" style="color: var(--primary); font-size: 0.85rem; text-decoration: none; font-weight: 600;">
                        Ver todos los equipos críticos (${criticalList.length}) →
                    </a>
                `;
                alertsList.appendChild(viewAllDiv);
            }
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    openModal: function (isEdit = false) {
        document.getElementById('modal-equipo').style.display = 'flex';
        // If it is NOT edit (i.e. New), we unlock ID and clear form
        if (!isEdit) {
            document.getElementById('form-equipo').reset();
            document.getElementById('eq-codigo').disabled = false;
            document.getElementById('modal-equipo-title').innerText = "Nuevo Equipo";
        }
    },

    closeModal: function () {
        document.getElementById('modal-equipo').style.display = 'none';
        document.getElementById('form-equipo').reset();
    },

    save: function () {
        const codigo = document.getElementById('eq-codigo').value;
        if (!codigo) { alert('El codigo es obligatorio.'); return; }
        
        const index = this.equipos.findIndex(e => e.codigo === codigo);

        const updatedEq = {
            codigo: codigo,
            descripcion: document.getElementById('eq-descripcion').value,
            ubicacion: document.getElementById('eq-ubicacion').value,
            consumo: document.getElementById('eq-consumo').value,
            funcion: document.getElementById('eq-funcion').value,
            proveedor: document.getElementById('eq-proveedor').value,
            caudal: document.getElementById('eq-caudal').value,
            variador: document.getElementById('eq-variador').value,
            potenciaHP: document.getElementById('eq-hp').value,
            potenciaKw: document.getElementById('eq-kw').value
        };

        if (index === -1) {
            updatedEq.id = codigo;
            updatedEq.horas_operativas = 0;
            this.equipos.push(updatedEq);
        } else {
            this.equipos[index] = { ...this.equipos[index], ...updatedEq };
        }

        DataManager.saveEquipos(this.equipos);

        this.renderTableData(this.equipos);
        this.closeModal();

        alert('Información del equipo actualizada correctamente.');
    },

    deleteEquipment: function (codigo) {
        if (!confirm(` �Estás seguro de que deseas eliminar el equipo ${codigo}?\nEsta acción no se puede deshacer.`)) return;

        const index = this.equipos.findIndex(e => e.codigo === codigo);
        if (index > -1) {
            this.equipos.splice(index, 1);
            DataManager.saveEquipos(this.equipos);
            this.renderTableData(this.equipos);
            this.recalculateAlerts();
            this.renderDashboardWidgets();
        }
    },

    // --- RESTORED EXCEL LOGIC ---
    triggerImport: function () {
        document.getElementById('excel-upload').click();
    },

    handleFile: function (input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                let globalBest = {
                    sheetName: null,
                    rowIndex: -1,
                    score: -1,
                    rowContent: [],
                    rowsDump: []
                };

                let globalDebugLog = [];

                // Essential columns (at least one of these MUST be present for a valid header)
                // Added 'unidad', 'interno', 'serial'
                const essentialKeywords = ['equipo', 'codigo', 'maquinaria', 'placa', 'id', 'item', 'referencia', 'interno', 'unidad', 'serial'];

                // General keywords to boost confidence
                const keywords = [
                    ...essentialKeywords,
                    'descripcion', 'nombre', 'detalle',
                    'horometro', 'horas', 'lectura', 'tiempo', 'duracion', 'uso',
                    'ubicacion', 'actividad', 'funcion', 'labor', 'centro', 'lote', 'finca',
                    'consumo', 'galones', 'combustible',
                    'proveedor', 'contratista',
                    'fecha', 'dia', 'mes'
                ];

                // Iterate ALL Sheets to find the best one
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (!rawRows || rawRows.length === 0) return;

                    // Local best for this sheet
                    let sheetBestIndex = -1;
                    let sheetMaxMatches = 0;
                    let sheetBestRow = [];
                    let sheetDump = [];

                    // Scan first 50 rows of this sheet
                    for (let i = 0; i < Math.min(rawRows.length, 50); i++) {
                        const row = rawRows[i];

                        // Capture dump (first 5 rows of each sheet for debug)
                        if (sheetDump.length < 5 && row && row.length > 0) {
                            sheetDump.push(`[${sheetName}:R${i}]: ${row.map(c => String(c).substring(0, 10)).join('|')}`);
                        }

                        if (!row || !Array.isArray(row) || row.length < 2) continue;

                        let matches = 0;
                        let hasEssential = false;
                        let filledCells = 0;

                        row.forEach(cell => {
                            if (!cell) return;
                            filledCells++;
                            const val = String(cell).toLowerCase().trim()
                                .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                            if (keywords.some(k => val.includes(k))) matches++;

                            // Essential check
                            if (essentialKeywords.some(k => val === k || val.includes(` ${k}`) || val.includes(`${k} `))) hasEssential = true;
                            if (essentialKeywords.some(k => val.includes(k) && val.length < 15)) hasEssential = true;
                        });

                        // Boost score
                        if (hasEssential) matches += 5;

                        // Update local sheet best
                        if (matches > sheetMaxMatches) {
                            sheetMaxMatches = matches;
                            sheetBestIndex = i;
                            sheetBestRow = row;
                        } else if (matches === sheetMaxMatches && matches > 0) {
                            if (filledCells > (sheetBestRow.length || 0)) {
                                sheetBestIndex = i;
                                sheetBestRow = row;
                            }
                        }
                    }

                    globalDebugLog.push(`Hoja '${sheetName}': Mejor Puntaje=${sheetMaxMatches} (Fila ${sheetBestIndex})`);

                    // Update Global Best
                    if (sheetMaxMatches > globalBest.score) {
                        globalBest = {
                            sheetName: sheetName,
                            rowIndex: sheetBestIndex,
                            score: sheetMaxMatches,
                            rowContent: sheetBestRow,
                            rowsDump: sheetDump // Keep dump of the winning sheet candidates
                        };
                    } else if (sheetMaxMatches > 0 && sheetMaxMatches === globalBest.score) {
                        // Tie breaker: prefer sheet with more rows or simply later one? 
                        // Usually first valid sheet is better, but here user said 2nd sheet.
                        // Let's assume higher score wins. If tie, keep first found or maybe check filled cells.
                        // We'll stick to 'first found with high score' unless strict inequality to avoid flip-flopping.
                    }
                });

                // Fallback
                if (globalBest.rowIndex === -1) {
                    console.warn("No se detectó fila de encabezado en ninguna hoja.");
                    globalBest.rowIndex = 0;
                    globalBest.sheetName = workbook.SheetNames[0]; // Default to first
                }

                console.log(`Ganador Global: Hoja '${globalBest.sheetName}', Fila ${globalBest.rowIndex}, Puntaje ${globalBest.score}`);

                // Parse using the BEST sheet and row
                const finalSheet = workbook.Sheets[globalBest.sheetName];
                const jsonData = XLSX.utils.sheet_to_json(finalSheet, { range: globalBest.rowIndex });

                this.importFromExcel(jsonData, globalBest.rowIndex, {
                    bestRowContent: globalBest.rowContent,
                    debugSearchResults: globalDebugLog,
                    rowsDump: globalBest.rowsDump,
                    chosenRowIndex: globalBest.rowIndex,
                    chosenSheet: globalBest.sheetName
                });

            } catch (err) {
                console.error("Error parsing Excel:", err);
                alert("Error crítico al leer el archivo Excel. Verifique el formato.");
            }
        };
        reader.readAsArrayBuffer(file);
        input.value = '';
    },

    importFromExcel: function (data, detectedRowIndex = 0, debugContext = {}) {
        if (!data || data.length === 0) {
            alert('El archivo parece estar vacío o no se encontraron datos legibles después del encabezado.');
            return;
        }

        // --- 0. PREPARATION & DEDUPLICATION OF EXISTING ---
        // We ensure we are working on a clean list first
        const newEquiposMap = new Map();

        this.equipos.forEach(eq => {
            const c = String(eq.codigo).trim();
            if (!c) return;
            if (!newEquiposMap.has(c)) {
                newEquiposMap.set(c, eq);
            } else {
                // Consolidate duplicates before starting: keep max horometer
                const existing = newEquiposMap.get(c);
                const exH = parseFloat(existing.horometro_actual) || 0;
                const currH = parseFloat(eq.horometro_actual) || 0;
                if (currH > exH) existing.horometro_actual = currH;

                // Keep max last activity date
                const exDate = existing.fecha_ultima_actividad ? new Date(existing.fecha_ultima_actividad).getTime() : 0;
                const currDate = eq.fecha_ultima_actividad ? new Date(eq.fecha_ultima_actividad).getTime() : 0;
                if (currDate > exDate) existing.fecha_ultima_actividad = eq.fecha_ultima_actividad;
            }
        });

        // --- 1. SETUP HELPERS ---
        const normalizeKey = (k) => String(k).trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

        const parseExcelDate = (val) => {
            if (!val) return null;
            if (typeof val === 'number') {
                const d = new Date(Math.round((val - 25569) * 86400 * 1000));
                return isNaN(d.getTime()) ? null : d;
            }
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const debug = {
            total_rows: data.length,
            ignored_no_activity: 0,
            ignored_old_date: 0,
            processed_rows: 0
        };

        let updatedCount = 0;

        // --- 2. PROCESS IMPORT ROWS ---
        data.forEach(row => {
            const rowNorm = {};
            Object.keys(row).forEach(key => rowNorm[normalizeKey(key)] = row[key]);

            // B. FIND EQUIPMENT
            const rawCode = rowNorm['codigo'] || rowNorm['id'] || rowNorm['equipo'] ||
                rowNorm['maquinaria'] || rowNorm['placa'] || rowNorm['codequipo'];

            if (!rawCode) return;
            const code = String(rawCode).trim();

            // Auto-create if not exists (for Master Import)
            if (!newEquiposMap.has(code)) {
                newEquiposMap.set(code, {
                    codigo: code,
                    horometro_actual: 0,
                    consumo_real_acumulado: 0,
                    horas_consumo_acumulado: 0,
                    maintenanceStatus: 'NORMAL',
                    descripcion: 'Nuevo Equipo Importado'
                });
            }

            const equipment = newEquiposMap.get(code);

            // --- DETECT TYPE FIRST ---
            const tipo = rowNorm['tipoderegistro'] || rowNorm['tipo'] || rowNorm['registro'] || rowNorm['clase'] || rowNorm['actividad'];
            const isActivityLog = tipo && String(tipo).toLowerCase().includes('actividad');

            // --- METADATA UPDATE (Restore Missing Data) ---
            if (rowNorm['descripcion']) equipment.descripcion = rowNorm['descripcion'];
            if (rowNorm['ubicacion']) equipment.ubicacion = rowNorm['ubicacion'];
            if (rowNorm['funcion']) equipment.funcion = rowNorm['funcion'];
            if (rowNorm['proveedor']) equipment.proveedor = rowNorm['proveedor'];
            if (rowNorm['variador']) equipment.variador = rowNorm['variador'];

            // Numeric Fields
            // IF Master Data -> Update Rated "Consumo" (Aforo)
            if (!isActivityLog) {
                if (rowNorm['consumo'] || rowNorm['galones']) equipment.consumo = rowNorm['consumo'] || rowNorm['galones'];
            }

            if (rowNorm['caudal']) equipment.caudal = rowNorm['caudal'];

            // Power
            if (rowNorm['potenciahp'] || rowNorm['hp']) equipment.potenciaHP = rowNorm['potenciahp'] || rowNorm['hp'];
            if (rowNorm['potenciakw'] || rowNorm['kw']) equipment.potenciaKw = rowNorm['potenciakw'] || rowNorm['kw'];


            // --- ACTIVITY / HOURS UPDATE ---
            // C. DATE FILTER (CRITICAL for Logs)
            const dateVal = rowNorm['fecha'] || rowNorm['dia'] || rowNorm['date'] || rowNorm['fechafinal'];
            const rowDate = parseExcelDate(dateVal);
            const rowTs = rowDate ? rowDate.getTime() : 0;
            const lastActivity = equipment.fecha_ultima_actividad ? new Date(equipment.fecha_ultima_actividad).getTime() : 0;

            if (isActivityLog) {
                // If it's a log, we follow strict deduplication
                if (rowTs > 0 && rowTs <= lastActivity) {
                    debug.ignored_old_date++;
                    return; // Skip old log
                }

                // D. EXTRACT CONSUMPTION (Sum Logic)
                const fuelVal = parseFloat(rowNorm['consumo'] || rowNorm['galones'] || rowNorm['combustible']);
                let hasFuel = false;
                if (!isNaN(fuelVal) && fuelVal > 0) {
                    equipment.consumo_real_acumulado = (parseFloat(equipment.consumo_real_acumulado) || 0) + fuelVal;
                    hasFuel = true;
                }

                // E. EXTRACT HOURS TO ADD
                const readingRel = rowNorm['tiempo'] || rowNorm['duracion'] || rowNorm['horas'] || rowNorm['hrs'] || rowNorm['totalhoras'];
                let valToAdd = 0;
                if (readingRel !== undefined && !isNaN(parseFloat(readingRel))) {
                    valToAdd = parseFloat(readingRel);
                }

                if (valToAdd > 0) {
                    const currentH = parseFloat(equipment.horometro_actual) || 0;
                    equipment.horometro_actual = (currentH + valToAdd).toFixed(2);

                    // If this row has fuel, add hours to consumption accumulator
                    if (hasFuel) {
                        equipment.horas_consumo_acumulado = (parseFloat(equipment.horas_consumo_acumulado) || 0) + valToAdd;
                    }

                    if (rowTs > 0) {
                        // Update Max Date
                        const currentMax = equipment.fecha_ultima_actividad ? new Date(equipment.fecha_ultima_actividad).getTime() : 0;
                        if (rowTs > currentMax) {
                            equipment.fecha_ultima_actividad = rowDate.toISOString();
                        }
                    }
                }
            } else {
                // MASTER DATA MODE: If 'Horometro' is present, treat it as CURRENT reading (Absolute)
                const absHorometro = rowNorm['horometro'] || rowNorm['horometroactual'] || rowNorm['lectura'];
                if (absHorometro !== undefined && !isNaN(parseFloat(absHorometro))) {
                    const newH = parseFloat(absHorometro);
                    const curH = parseFloat(equipment.horometro_actual) || 0;
                    if (newH > curH) {
                        equipment.horometro_actual = newH.toFixed(2);
                    }
                }
            }

            updatedCount++;
            debug.processed_rows++;
        });

        console.log("Import Logic Result:", debug);

        if (updatedCount === 0) {
            if (debug.ignored_old_date > 0) {
                alert(`No se actualizaron horas. Se encontraron ${debug.ignored_old_date} registros de actividad, pero son de fechas ya procesadas anteriormente.`);
            } else {
                alert("No se encontraron nuevos registros de 'Actividad' válidos para sumar.");
            }
            return;
        }

        // --- 3. SAVE ---
        this.equipos = Array.from(newEquiposMap.values());
        DataManager.saveEquipos(this.equipos);
        this.renderTableData(this.equipos);
        this.recalculateAlerts();
        this.renderDashboardWidgets();

        alert(`Sincronización Inteligente Completada:\n\n- ${updatedCount} registros nuevos procesados.\n- ${debug.ignored_old_date} registros duplicados (fechas antiguas) ignorados.\n- ${debug.ignored_no_activity} filas no eran actividad.\n\nHorómetros actualizados correctamente.`);
    },

    // --- REPAIR TOOL ---
    repairMetadata: function () {
        // 1. CONFIRMATION
        if (!confirm("Esto realizará dos operaciones:\n\n1. ELIMINARÁ DUPLICADOS (Consolidando el mayor horómetro).\n2. RESTAURARÁ Nombres y Ubicaciones desde el Maestro.\n\n �Desea continuar?")) return;

        const resetHorometers = confirm(" �Desea TAMBIÉN reiniciar los horómetros a 0 para volver a importar desde cero?\n\n(Esto borrará el historial de fechas y permitirá cargar archivos antiguos de nuevo).");

        const masterEquipos = DataManager.defaults.equipos; // The Source of Truth
        let rawList = this.equipos;

        // 2. DEDUPLICATE & CLEAN
        const uniqueMap = new Map();

        rawList.forEach(item => {
            // Normalize code
            const code = String(item.codigo || '').trim();
            if (!code || code === 'undefined' || code === 'null') return; // Skip garbage

            if (!uniqueMap.has(code)) {
                // If reset requested, clear values immediately
                if (resetHorometers) {
                    item.horometro_actual = 0;
                    delete item.fecha_ultima_actividad; // Clear history to allow re-import
                }
                uniqueMap.set(code, item);
            } else {
                // Merge strategies
                const existing = uniqueMap.get(code);

                if (!resetHorometers) {
                    // Normal Strategy: Keep MAX Horometer
                    const oldHoro = parseFloat(existing.horometro_actual) || 0;
                    const newHoro = parseFloat(item.horometro_actual) || 0;

                    if (newHoro > oldHoro) {
                        existing.horometro_actual = newHoro;
                        if (item.fecha_horometro) existing.fecha_horometro = item.fecha_horometro;
                    }

                    // Preserve Max Date
                    const exDate = existing.fecha_ultima_actividad ? new Date(existing.fecha_ultima_actividad).getTime() : 0;
                    const currDate = item.fecha_ultima_actividad ? new Date(item.fecha_ultima_actividad).getTime() : 0;
                    if (currDate > exDate) existing.fecha_ultima_actividad = item.fecha_ultima_actividad;
                } else {
                    // Reset Strategy: just plain merge, ensure 0
                    existing.horometro_actual = 0;
                    delete existing.fecha_ultima_actividad;
                }

                if (!existing.descripcion && item.descripcion) existing.descripcion = item.descripcion;
            }
        });

        // 3. RESTORE FROM MASTER (Add missing, Update names)
        let repairedCount = 0;
        let addedCount = 0;

        masterEquipos.forEach(master => {
            const masterCode = String(master.codigo).trim();
            if (uniqueMap.has(masterCode)) {
                const target = uniqueMap.get(masterCode);
                // Restore metadata
                target.descripcion = master.descripcion;
                target.ubicacion = master.ubicacion;
                target.funcion = master.funcion;
                target.consumo = master.consumo;
                target.caudal = master.caudal;
                target.variador = master.variador;
                target.potenciaHP = master.potenciaHP;
                target.potenciaKw = master.potenciaKw;
                target.proveedor = master.proveedor;
                if (!target.id) target.id = masterCode;
                repairedCount++;
            } else {
                // Add missing from master
                const newEquip = {
                    ...master,
                    horometro_actual: 0 // Default for new
                };
                uniqueMap.set(masterCode, newEquip);
                addedCount++;
            }
        });

        const cleanList = Array.from(uniqueMap.values());
        const removedCount = rawList.length - cleanList.length;

        // 4. SAVE
        this.equipos = cleanList;
        DataManager.saveEquipos(this.equipos);

        this.renderTableData(this.equipos); // Force table refresh
        this.recalculateAlerts();
        this.renderDashboardWidgets();

        let msg = `Limpieza Completa:\n\nRegistros Totales: ${cleanList.length}\nDuplicados Eliminados: ${removedCount}\nDatos Maestros Restaurados: ${repairedCount}`;
        if (resetHorometers) msg += `\n\n✅ HORÓMETROS REINICIADOS A 0.`;

        alert(msg);
    },

    // ===== IMPORTACIÓN DE HORAS OPERATIVAS DESDE SIMPLEAGRI =====

    openHoursImportModal() {
        document.getElementById('hours-upload').click();
    },

    handleHoursFile(input) {
        const file = input.files[0];
        if (!file) return;

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('El archivo es demasiado grande. Máximo 5 MB.');
            input.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Look for "BD" sheet specifically (SimpleAgri format)
                let targetSheet = null;
                let sheetName = null;

                // First, try to find "BD" sheet
                if (workbook.SheetNames.includes('BD')) {
                    targetSheet = workbook.Sheets['BD'];
                    sheetName = 'BD';
                } else {
                    // Fallback: use first sheet
                    sheetName = workbook.SheetNames[0];
                    targetSheet = workbook.Sheets[sheetName];
                    console.warn(`Hoja "BD" no encontrada. Usando hoja: "${sheetName}"`);
                }

                const jsonData = XLSX.utils.sheet_to_json(targetSheet);

                if (!jsonData || jsonData.length === 0) {
                    alert(`El archivo está vacío o no tiene datos válidos en la hoja "${sheetName}".`);
                    return;
                }

                console.log(`Leyendo ${jsonData.length} filas de la hoja "${sheetName}"`);
                this.processHoursImport(jsonData);
            } catch (err) {
                console.error('Error reading Excel:', err);
                alert('Error al leer el archivo Excel. Verifica el formato.');
            }
        };
        reader.readAsArrayBuffer(file);
        input.value = '';
    },

    processHoursImport(data) {
        // Normalize column names
        const normalizeKey = (k) => String(k).trim().toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

        // Detect columns
        const firstRow = data[0];
        const keys = Object.keys(firstRow);

        // Find codigo column
        const codigoCol = keys.find(k => {
            const norm = normalizeKey(k);
            return norm.includes('codigo') || norm.includes('id') ||
                norm.includes('equipo') || norm === 'cod' || norm === 'code';
        });

        // Find horas column
        const horasCol = keys.find(k => {
            const norm = normalizeKey(k);
            return norm.includes('hora') || norm.includes('horometro') ||
                norm.includes('lectura') || norm.includes('tiempo');
        });

        // Find tipo de registro column (for filtering)
        const tipoRegistroCol = keys.find(k => {
            const norm = normalizeKey(k);
            return norm.includes('tipoderegistro') || norm.includes('tiporegistro') ||
                (norm.includes('tipo') && norm.includes('registro'));
        });

        // Find razon/labor column (for filtering)
        const razonCol = keys.find(k => {
            const norm = normalizeKey(k);
            return norm.includes('razon') || norm.includes('labor') ||
                norm.includes('motivo') || norm.includes('actividad');
        });

        if (!codigoCol || !horasCol) {
            alert(`No se pudieron detectar las columnas necesarias.\n\nColumnas encontradas: ${keys.join(', ')}\n\nAsegúrate que el archivo tenga columnas de "Código" y "Horas".`);
            return;
        }

        console.log(`Columnas detectadas:
- Código: "${codigoCol}"
- Horas: "${horasCol}"
- Tipo Registro: "${tipoRegistroCol || 'No encontrada'}"
- Razón/Labor: "${razonCol || 'No encontrada'}"`);

        // Filter data first (SimpleAgri specific)
        let filteredData = data;
        let totalRows = data.length;
        let filteredCount = 0;

        if (tipoRegistroCol || razonCol) {
            filteredData = data.filter(row => {
                let passFilter = false; // Start with false, set to true if ANY condition matches

                // Include if tipo de registro = "Actividad" (OR condition)
                if (tipoRegistroCol) {
                    const tipoValue = String(row[tipoRegistroCol] || '').trim().toLowerCase();
                    if (tipoValue === 'actividad') {
                        passFilter = true; // Include all "Actividad" records
                    }
                }

                // Include if razon/labor = "024" (OR condition)
                if (razonCol) {
                    const razonValue = String(row[razonCol] || '').trim().toLowerCase();
                    // Check if it contains "024"
                    if (razonValue && razonValue.includes('024')) {
                        passFilter = true; // Include all "Labor 024" records
                    }
                }

                return passFilter;
            });

            filteredCount = totalRows - filteredData.length;
            console.log(`Filtrado aplicado: ${filteredData.length} de ${totalRows} filas (${filteredCount} filtradas)`);

            if (filteredData.length === 0) {
                alert(`No se encontraron registros que cumplan los filtros:\n- Tipo de Registro: "Actividad" (cualquier labor)\n- O Labor: "024" (cualquier tipo)\n\nTotal de filas en archivo: ${totalRows}`);
                return;
            }
        }

        // Process rows
        const updates = [];
        const errors = [];
        const newEquipos = [];
        const warnings = [];

        filteredData.forEach((row, index) => {
            const codigo = String(row[codigoCol] || '').trim();
            const horasRaw = row[horasCol];
            const horas = parseFloat(horasRaw);

            // Validate
            if (!codigo) {
                errors.push({ row: index + 2, reason: 'Código vacío' });
                return;
            }

            if (isNaN(horas) || horas < 0) {
                errors.push({ row: index + 2, codigo, reason: 'Horas inválidas' });
                return;
            }

            // Find equipment
            const equipo = this.equipos.find(e => String(e.codigo).trim() === codigo);

            if (equipo) {
                const horasActuales = parseFloat(equipo.horometro_actual) || 0;

                // Check if new hours are less than current
                if (horas < horasActuales) {
                    warnings.push({
                        codigo,
                        horasActuales,
                        horasNuevas: horas,
                        diferencia: horasActuales - horas
                    });
                }

                // Check for large jumps (>500 hrs)
                if (horas - horasActuales > 500) {
                    warnings.push({
                        codigo,
                        horasActuales,
                        horasNuevas: horas,
                        diferencia: horas - horasActuales,
                        type: 'large_jump'
                    });
                }

                updates.push({
                    codigo,
                    descripcion: equipo.descripcion,
                    horasAntes: horasActuales,
                    horasDespues: horas,
                    diferencia: horas - horasActuales
                });
            } else {
                newEquipos.push({ codigo, horas });
            }
        });

        // Show preview modal
        this.showHoursImportPreview(updates, newEquipos, errors, warnings);
    },

    showHoursImportPreview(updates, newEquipos, errors, warnings) {
        const totalUpdates = updates.length;
        const totalNew = newEquipos.length;
        const totalErrors = errors.length;
        const totalWarnings = warnings.length;

        // Build preview table (first 10 items)
        let previewHtml = '';
        const previewItems = updates.slice(0, 10);

        previewItems.forEach(item => {
            const diffColor = item.diferencia >= 0 ? '#10b981' : '#ef4444';
            const diffSign = item.diferencia >= 0 ? '+' : '';
            previewHtml += `
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <td style="padding: 0.5rem; font-weight: 600;">${item.codigo}</td>
                    <td style="padding: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">${item.descripcion || '-'}</td>
                    <td style="padding: 0.5rem; text-align: right;">${item.horasAntes.toFixed(1)}</td>
                    <td style="padding: 0.5rem; text-align: right; font-weight: 700;">${item.horasDespues.toFixed(1)}</td>
                    <td style="padding: 0.5rem; text-align: right; color: ${diffColor}; font-weight: 600;">
                        ${diffSign}${item.diferencia.toFixed(1)}
                    </td>
                </tr>
            `;
        });

        if (updates.length > 10) {
            previewHtml += `
                <tr>
                    <td colspan="5" style="padding: 0.5rem; text-align: center; color: var(--text-muted); font-style: italic;">
                        ... y ${updates.length - 10} equipos más
                    </td>
                </tr>
            `;
        }

        // Build warnings section
        let warningsHtml = '';
        if (totalWarnings > 0) {
            warningsHtml = `
                <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 1rem; margin-top: 1rem; border-radius: 4px;">
                    <div style="font-weight: 700; color: #f59e0b; margin-bottom: 0.5rem;">
                        � ️ ${totalWarnings} Advertencia${totalWarnings !== 1 ? 's' : ''}
                    </div>
                    <ul style="margin: 0; padding-left: 1.5rem; font-size: 0.85rem;">
                        ${warnings.slice(0, 5).map(w => `
                            <li>${w.codigo}: ${w.type === 'large_jump' ?
                    `Salto grande (${w.diferencia.toFixed(0)} hrs)` :
                    `Horas menores (${w.horasNuevas} < ${w.horasActuales})`}
                            </li>
                        `).join('')}
                        ${warnings.length > 5 ? `<li>... y ${warnings.length - 5} más</li>` : ''}
                    </ul>
                </div>
            `;
        }

        // Build errors section
        let errorsHtml = '';
        if (totalErrors > 0) {
            errorsHtml = `
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 1rem; margin-top: 1rem; border-radius: 4px;">
                    <div style="font-weight: 700; color: #ef4444; margin-bottom: 0.5rem;">
                        ❌ ${totalErrors} Error${totalErrors !== 1 ? 'es' : ''}
                    </div>
                    <ul style="margin: 0; padding-left: 1.5rem; font-size: 0.85rem;">
                        ${errors.slice(0, 5).map(e => `
                            <li>Fila ${e.row}: ${e.codigo || 'Sin código'} - ${e.reason}</li>
                        `).join('')}
                        ${errors.length > 5 ? `<li>... y ${errors.length - 5} más</li>` : ''}
                    </ul>
                </div>
            `;
        }

        // Build new equipos section
        let newEquiposHtml = '';
        if (totalNew > 0) {
            newEquiposHtml = `
                <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; padding: 1rem; margin-top: 1rem; border-radius: 4px;">
                    <div style="font-weight: 700; color: #3b82f6; margin-bottom: 0.5rem;">
                        ℹ️ ${totalNew} Equipo${totalNew !== 1 ? 's' : ''} no encontrado${totalNew !== 1 ? 's' : ''}
                    </div>
                    <p style="margin: 0; font-size: 0.85rem;">
                        Estos equipos no existen en el sistema y serán omitidos:
                        ${newEquipos.slice(0, 5).map(e => e.codigo).join(', ')}
                        ${newEquipos.length > 5 ? ` y ${newEquipos.length - 5} más` : ''}
                    </p>
                </div>
            `;
        }

        const modalHtml = `
            <div id="modal-hours-import" class="modal-overlay" style="display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; animation: fadeIn 0.2s;">
                <div class="glass-panel" style="width: 100%; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 2rem; position: relative;">
                    <button class="btn-icon" style="position: absolute; top: 1rem; right: 1rem;" onclick="document.getElementById('modal-hours-import').remove()">
                        <i data-lucide="x"></i>
                    </button>
                    
                    <h2 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--primary);">
                        <i data-lucide="upload" style="width: 24px; height: 24px; vertical-align: middle;"></i>
                        Importar Horas Operativas
                    </h2>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Revisa los cambios antes de confirmar</p>

                    <!-- Summary Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        <div style="background: rgba(16, 185, 129, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #10b981;">
                            <div style="font-size: 2rem; font-weight: 800; color: #10b981;">${totalUpdates}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Equipos a actualizar</div>
                        </div>
                        ${totalNew > 0 ? `
                        <div style="background: rgba(59, 130, 246, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #3b82f6;">
                            <div style="font-size: 2rem; font-weight: 800; color: #3b82f6;">${totalNew}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">No encontrados</div>
                        </div>
                        ` : ''}
                        ${totalWarnings > 0 ? `
                        <div style="background: rgba(245, 158, 11, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #f59e0b;">
                            <div style="font-size: 2rem; font-weight: 800; color: #f59e0b;">${totalWarnings}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Advertencias</div>
                        </div>
                        ` : ''}
                        ${totalErrors > 0 ? `
                        <div style="background: rgba(239, 68, 68, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #ef4444;">
                            <div style="font-size: 2rem; font-weight: 800; color: #ef4444;">${totalErrors}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Errores</div>
                        </div>
                        ` : ''}
                    </div>

                    <!-- Preview Table -->
                    ${totalUpdates > 0 ? `
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="font-size: 0.9rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 1rem;">
                            📊 Preview (primeras 10 filas)
                        </h3>
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                <thead>
                                    <tr style="background: rgba(255,255,255,0.05); border-bottom: 2px solid var(--glass-border);">
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 700;">Código</th>
                                        <th style="padding: 0.75rem; text-align: left; font-weight: 700;">Descripción</th>
                                        <th style="padding: 0.75rem; text-align: right; font-weight: 700;">Antes</th>
                                        <th style="padding: 0.75rem; text-align: right; font-weight: 700;">Después</th>
                                        <th style="padding: 0.75rem; text-align: right; font-weight: 700;">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${previewHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ` : ''}

                    ${warningsHtml}
                    ${errorsHtml}
                    ${newEquiposHtml}

                    <!-- Actions -->
                    <div style="display: flex; gap: 1rem; margin-top: 2rem; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="document.getElementById('modal-hours-import').remove()">
                            Cancelar
                        </button>
                        <button class="btn btn-primary" onclick="EquiposController.confirmHoursImport(${JSON.stringify(updates).replace(/"/g, '&quot;')})" ${totalUpdates === 0 ? 'disabled' : ''}>
                            <i data-lucide="check"></i>
                            Confirmar e Importar (${totalUpdates})
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    confirmHoursImport(updates) {
        if (!updates || updates.length === 0) {
            alert('No hay equipos para actualizar.');
            return;
        }

        // Update horometers
        let updatedCount = 0;
        updates.forEach(update => {
            const equipo = this.equipos.find(e => e.codigo === update.codigo);
            if (equipo) {
                equipo.horometro_actual = update.horasDespues;
                equipo.fecha_ultima_actualizacion = new Date().toISOString();
                updatedCount++;
            }
        });

        // Save
        DataManager.saveEquipos(this.equipos);

        // Update UI
        this.renderTable();
        this.renderDashboardWidgets();

        // Close modal
        const modal = document.getElementById('modal-hours-import');
        if (modal) modal.remove();

        // Show success message
        alert(`✅ Importación Exitosa\n\n${updatedCount} equipo${updatedCount !== 1 ? 's' : ''} actualizado${updatedCount !== 1 ? 's' : ''} correctamente.\n\nEl dashboard se ha actualizado automáticamente.`);

        // Navigate to dashboard to see changes
        if (confirm(' �Deseas ir al Dashboard para ver las alertas actualizadas?')) {
            navigate('dashboard');
            setTimeout(() => {
                if (typeof DashboardController !== 'undefined') {
                    DashboardController.switchTab('mantenimiento');
                }
            }, 100);
        }
    },
};
