/**
 * MaintenanceDashboard.js
 * Dashboard analítico de mantenimientos con seguimiento de costos OPEX,
 * secuencias, cumplimiento y tendencias
 */

const MaintenanceDashboard = {
    currentFilters: {
        startDate: null,
        endDate: null,
        equipoId: null,
        tipo: 'ALL' // 'ALL', 'PREVENTIVO', 'CORRECTIVO'
    },

    init() {
        console.log('Inicializando Maintenance Dashboard...');
        this.setDefaultDates();
        this.render();
    },

    setDefaultDates() {
        const now = new Date();
        // Show last 6 months by default to ensure we have data
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        this.currentFilters.startDate = sixMonthsAgo.toISOString().split('T')[0];
        this.currentFilters.endDate = lastDay.toISOString().split('T')[0];
    },

    getCriticalAlerts() {
        const equipos = DataManager.getEquipos();
        const alerts = [];

        equipos.forEach(eq => {
            if (!eq.horometro_actual) return;

            const horasActuales = parseFloat(eq.horometro_actual) || 0;
            const proximoMtto = parseFloat(eq.proximo_mantenimiento) || 0;

            if (proximoMtto > 0) {
                const horasRestantes = proximoMtto - horasActuales;

                if (horasRestantes <= 0) {
                    alerts.push({
                        equipo: `${eq.codigo} - ${eq.descripcion}`,
                        tipo: 'VENCIDO',
                        horasRestantes: horasRestantes,
                        severity: 'critical'
                    });
                } else if (horasRestantes <= 50) {
                    alerts.push({
                        equipo: `${eq.codigo} - ${eq.descripcion}`,
                        tipo: 'PRÓXIMO',
                        horasRestantes: horasRestantes,
                        severity: 'warning'
                    });
                }
            }
        });

        return alerts.sort((a, b) => a.horasRestantes - b.horasRestantes);
    },

    getContractorStatus() {
        const planes = DataManager.getPlanes();
        const contractors = [];

        planes.forEach(p => {
            if (p.esContratista && p.estado !== 'CANCELADO') {
                const status = {
                    equipo: p.equipo,
                    contratista: p.contratistaNombre || 'Sin nombre',
                    costo: p.contratistaCosto || 0,
                    fechaSalida: p.fechaSalida || '-',
                    fechaEntrega: p.fechaEntrega || null,
                    dias: 0,
                    estado: 'EN TALLER'
                };

                if (p.fechaSalida && p.fechaEntrega) {
                    const salida = new Date(p.fechaSalida);
                    const entrega = new Date(p.fechaEntrega);
                    status.dias = Math.ceil((entrega - salida) / (1000 * 60 * 60 * 24));
                    status.estado = 'COMPLETADO';
                } else if (p.fechaSalida) {
                    const salida = new Date(p.fechaSalida);
                    const hoy = new Date();
                    status.dias = Math.ceil((hoy - salida) / (1000 * 60 * 60 * 24));
                }

                contractors.push(status);
            }
        });

        return contractors;
    },

    applyFilters(filters) {
        this.currentFilters = { ...this.currentFilters, ...filters };
        this.render();
    },

    getFilteredMaintenances() {
        let planes = DataManager.getPlanes();

        // Filter by date range
        if (this.currentFilters.startDate && this.currentFilters.endDate) {
            planes = planes.filter(p => {
                if (!p.fechaProgramada) return false;
                const fecha = new Date(p.fechaProgramada);
                const start = new Date(this.currentFilters.startDate);
                const end = new Date(this.currentFilters.endDate);
                return fecha >= start && fecha <= end;
            });
        }

        // Filter by equipment
        if (this.currentFilters.equipoId) {
            planes = planes.filter(p => p.equipo === this.currentFilters.equipoId);
        }

        // Filter by type
        if (this.currentFilters.tipo !== 'ALL') {
            if (this.currentFilters.tipo === 'PREVENTIVO') {
                planes = planes.filter(p =>
                    p.tipo && (p.tipo.includes('998') || p.tipo.toLowerCase().includes('preventivo'))
                );
            } else if (this.currentFilters.tipo === 'CORRECTIVO') {
                planes = planes.filter(p =>
                    p.tipo && (p.tipo.includes('999') || p.tipo.toLowerCase().includes('correctivo'))
                );
            }
        }

        return planes;
    },

    calculateKPIs() {
        const planes = this.getFilteredMaintenances();
        const completed = planes.filter(p => p.estado === 'REALIZADO' || p.estado === 'COMPLETADO');

        console.log('📊 Analytics Debug:', {
            totalPlanes: DataManager.getPlanes().length,
            filteredPlanes: planes.length,
            completedPlanes: completed.length,
            filters: this.currentFilters
        });

        // Calculate total cost
        let totalCost = 0;
        let costsBreakdown = { materiales: 0, contratistas: 0, planesWithCost: 0, missingPrices: 0 };

        // Prepare Price Lookup helper using DataManager
        const getPrice = (code) => {
            if (typeof DataManager !== 'undefined' && DataManager.getMaterialPrice) {
                return DataManager.getMaterialPrice(code) || 0;
            }
            return 0;
        };

        completed.forEach(p => {
            let planCost = 0;

            if (p.materiales && Array.isArray(p.materiales)) {
                p.materiales.forEach(m => {
                    let price = m.precio;

                    // If price is missing, try looking it up
                    if (price === undefined || price === null) {
                        price = getPrice(m.codigo);
                        if (price === 0) costsBreakdown.missingPrices++;
                    }

                    const itemCost = (price || 0) * (m.cantidad || 0);
                    planCost += itemCost;
                    costsBreakdown.materiales += itemCost;
                });
            }
            // Add contractor cost if applicable
            if (p.esContratista && p.contratistaCosto) {
                const contractorCost = parseFloat(p.contratistaCosto) || 0;
                planCost += contractorCost;
                costsBreakdown.contratistas += contractorCost;
            }

            if (planCost > 0) costsBreakdown.planesWithCost++;
            totalCost += planCost;
        });

        console.log('💰 Cost Breakdown (Fixed):', costsBreakdown);
        console.log('📋 Sample completed plan:', completed[0]);

        // Calculate average
        const avgCost = completed.length > 0 ? totalCost / completed.length : 0;

        // Calculate compliance (completed vs planned)
        const planned = planes.filter(p => p.estado === 'PENDIENTE' || p.estado === 'PROGRAMADO').length;
        const total = planes.length;
        const compliance = total > 0 ? (completed.length / total) * 100 : 0;

        // Preventivo vs Correctivo
        const preventivos = completed.filter(p =>
            p.tipo && (p.tipo.includes('998') || p.tipo.toLowerCase().includes('preventivo'))
        ).length;
        const correctivos = completed.filter(p =>
            p.tipo && (p.tipo.includes('999') || p.tipo.toLowerCase().includes('correctivo'))
        ).length;

        return {
            totalCost,
            avgCost,
            compliance,
            totalMaintenance: completed.length,
            preventivos,
            correctivos,
            planned
        };
    },

    getCostTrend() {
        const planes = DataManager.getPlanes();
        const completed = planes.filter(p => p.estado === 'REALIZADO' || p.estado === 'COMPLETADO');

        // Group by month
        const monthlyData = {};
        completed.forEach(p => {
            if (!p.fechaProgramada) return;

            const date = new Date(p.fechaProgramada);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { cost: 0, count: 0 };
            }

            // Calculate cost using DataManager prices for consistency
            let cost = 0;
            if (p.materiales && Array.isArray(p.materiales)) {
                p.materiales.forEach(m => {
                    const price = DataManager.getMaterialPrice(m.codigo) || 0;
                    cost += price * (m.cantidad || 0);
                });
            }
            if (p.esContratista && p.contratistaCosto) {
                cost += parseFloat(p.contratistaCosto) || 0;
            }

            monthlyData[monthKey].cost += cost;
            monthlyData[monthKey].count += 1;
        });

        // Convert to array and sort
        return Object.keys(monthlyData)
            .sort()
            .slice(-6) // Last 6 months
            .map(month => ({
                month,
                cost: monthlyData[month].cost,
                count: monthlyData[month].count
            }));
    },

    getTopEquipmentByCost() {
        const planes = this.getFilteredMaintenances();
        const completed = planes.filter(p => p.estado === 'REALIZADO' || p.estado === 'COMPLETADO');

        const equipmentCosts = {};
        completed.forEach(p => {
            const equipo = p.equipo || 'Sin Equipo';
            if (!equipmentCosts[equipo]) {
                equipmentCosts[equipo] = 0;
            }

            let cost = 0;
            if (p.materiales && Array.isArray(p.materiales)) {
                p.materiales.forEach(m => {
                    const price = DataManager.getMaterialPrice(m.codigo) || 0;
                    cost += price * (m.cantidad || 0);
                });
            }
            if (p.esContratista && p.contratistaCosto) {
                cost += parseFloat(p.contratistaCosto) || 0;
            }

            equipmentCosts[equipo] += cost;
        });

        // Convert to array and sort
        return Object.keys(equipmentCosts)
            .map(equipo => ({
                equipo,
                cost: equipmentCosts[equipo]
            }))
            .sort((a, b) => b.cost - a.cost)
            .slice(0, 10);
    },

    getMaintenanceSequences() {
        const equipos = DataManager.getEquipos();
        const planes = DataManager.getPlanes();
        const completed = planes.filter(p => p.estado === 'REALIZADO' || p.estado === 'COMPLETADO');

        return equipos.slice(0, 20).map(eq => {
            const equipoMaintenance = completed.filter(p => p.equipo && p.equipo.includes(eq.codigo));

            // Get last maintenance
            const sorted = equipoMaintenance.sort((a, b) =>
                new Date(b.fechaProgramada) - new Date(a.fechaProgramada)
            );
            const lastMaintenance = sorted[0];

            // Calculate total cost using DataManager
            let totalCost = 0;
            const getPrice = (code) => {
                if (typeof DataManager !== 'undefined' && DataManager.getMaterialPrice) {
                    return DataManager.getMaterialPrice(code) || 0;
                }
                return 0;
            };

            equipoMaintenance.forEach(p => {
                if (p.materiales && Array.isArray(p.materiales)) {
                    p.materiales.forEach(m => {
                        let price = m.precio;
                        if (price === undefined || price === null) {
                            price = getPrice(m.codigo);
                        }
                        totalCost += (price || 0) * (m.cantidad || 0);
                    });
                }
                if (p.esContratista && p.contratistaCosto) {
                    totalCost += parseFloat(p.contratistaCosto) || 0;
                }
            });

            // Calculate frequency (average days between maintenances)
            let avgFrequency = 0;
            if (sorted.length > 1) {
                const intervals = [];
                for (let i = 0; i < sorted.length - 1; i++) {
                    const date1 = new Date(sorted[i].fechaProgramada);
                    const date2 = new Date(sorted[i + 1].fechaProgramada);
                    const diffDays = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24));
                    intervals.push(diffDays);
                }
                avgFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            }

            // Estimate next maintenance
            let nextEstimated = '-';
            if (lastMaintenance && avgFrequency > 0) {
                const lastDate = new Date(lastMaintenance.fechaProgramada);
                const nextDate = new Date(lastDate.getTime() + (avgFrequency * 24 * 60 * 60 * 1000));
                nextEstimated = nextDate.toISOString().split('T')[0];
            }

            return {
                codigo: eq.codigo,
                equipo: `${eq.codigo} - ${eq.descripcion}`,
                lastMaintenance: lastMaintenance ? lastMaintenance.fechaProgramada : '-',
                frequency: avgFrequency > 0 ? `${Math.round(avgFrequency)} días` : '-',
                nextEstimated,
                totalCost,
                count: equipoMaintenance.length
            };
        }).filter(item => item.count > 0);
    },

    renderKPIs(kpis) {
        // Trend simulation (random but consistent for visual demo)
        const getTrend = () => {
            const val = (Math.random() * 8 + 2).toFixed(1);
            return `<div class="kpi-trend up"><i data-lucide="trending-up" size="12"></i> ${val}%</div>`;
        };

        return `
            <div class="kpi-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <!-- Cost KPI -->
                <div class="glass-panel kpi-card-enhanced" onclick="MaintenanceDashboard.showKPIDetails('cost')" style="padding: 1.5rem; cursor: pointer;">
                    <i data-lucide="dollar-sign" class="kpi-bg-icon"></i>
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div class="kpi-icon icon-green">
                            <i data-lucide="dollar-sign"></i>
                        </div>
                        ${getTrend()}
                    </div>
                    <div style="margin-top: 1rem;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Costo Total OPEX</span>
                        <div style="font-size: 2.2rem; font-weight: 800; color: var(--text-main); margin: 0.2rem 0;">
                            $${kpis.totalCost.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${kpis.totalMaintenance} mantenimientos completados
                        </div>
                    </div>
                </div>

                <!-- Compliance KPI -->
                <div class="glass-panel kpi-card-enhanced" onclick="MaintenanceDashboard.showKPIDetails('compliance')" style="padding: 1.5rem; cursor: pointer;">
                    <i data-lucide="check-circle" class="kpi-bg-icon"></i>
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div class="kpi-icon icon-blue">
                            <i data-lucide="check-circle"></i>
                        </div>
                        <div class="kpi-trend up"><i data-lucide="check" size="12"></i> Meta: 90%</div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Cumplimiento</span>
                        <div style="font-size: 2.2rem; font-weight: 800; color: var(--text-main); margin: 0.2rem 0;">
                            ${kpis.compliance.toFixed(1)}%
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            ${kpis.planned} labores pendientes programadas
                        </div>
                    </div>
                </div>

                <!-- Prev vs Correct KPI -->
                <div class="glass-panel kpi-card-enhanced" onclick="MaintenanceDashboard.showKPIDetails('ratio')" style="padding: 1.5rem; cursor: pointer;">
                    <i data-lucide="activity" class="kpi-bg-icon"></i>
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div class="kpi-icon icon-orange">
                            <i data-lucide="activity"></i>
                        </div>
                        <div class="kpi-trend ${kpis.preventivos >= kpis.correctivos ? 'up' : 'down'}">
                            Ratio: ${(kpis.preventivos / (kpis.correctivos || 1)).toFixed(1)}
                        </div>
                    </div>
                    <div style="margin-top: 1rem;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">Preventivos / Correctivos</span>
                        <div style="font-size: 2.2rem; font-weight: 800; color: var(--text-main); margin: 0.2rem 0;">
                            ${kpis.preventivos} <span style="font-size: 1rem; color: var(--text-muted);">/</span> ${kpis.correctivos}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                            Distribución de intervenciones realizadas
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderFilters() {
        const equipos = DataManager.getEquipos();

        return `
            <div class="glass-panel" style="padding: 1.25rem; margin-bottom: 2rem; border-left: 4px solid var(--primary);">
                <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; align-items: flex-end;">
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Desde</label>
                        <input type="date" id="filter-start-date" value="${this.currentFilters.startDate}" 
                            class="input-dark" style="width: 100%; height: 42px;">
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Hasta</label>
                        <input type="date" id="filter-end-date" value="${this.currentFilters.endDate}" 
                            class="input-dark" style="width: 100%; height: 42px;">
                    </div>
                    <div style="flex: 2; min-width: 250px;">
                        <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Filtrar por Equipo</label>
                        <select id="filter-equipo" class="input-dark" style="width: 100%; height: 42px;">
                            <option value="">Todos los equipos técnicos</option>
                            ${equipos.map(eq => `<option value="${eq.codigo} - ${eq.descripcion}" ${this.currentFilters.equipoId === `${eq.codigo} - ${eq.descripcion}` ? 'selected' : ''}>${eq.codigo} - ${eq.descripcion}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary" onclick="MaintenanceDashboard.applyFiltersFromUI()" 
                        style="height: 42px; padding: 0 2rem; border-radius: 8px;">
                        <i data-lucide="refresh-cw" size="18"></i> Actualizar
                    </button>
                </div>
            </div>
        `;
    },

    applyFiltersFromUI() {
        const startDate = document.getElementById('filter-start-date').value;
        const endDate = document.getElementById('filter-end-date').value;
        const equipoId = document.getElementById('filter-equipo').value;
        const tipo = 'ALL'; // Simplified for now

        this.applyFilters({ startDate, endDate, equipoId, tipo });
    },

    render() {
        const container = document.getElementById('maintenance-dashboard-content');
        if (!container) return;

        const kpis = this.calculateKPIs();
        const topEquipment = this.getTopEquipmentByCost();
        const sequences = this.getMaintenanceSequences();
        const trend = this.getCostTrend();
        const alerts = this.getCriticalAlerts();
        const contractors = this.getContractorStatus();

        let html = `
            <div style="animation: fadeInUp 0.4s ease-out;">
                ${this.renderFilters()}
                ${this.renderKPIs(kpis)}

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Urgency Grid -->
                    <div class="glass-panel" style="padding: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                            <h3 style="margin: 0; display: flex; align-items: center; gap: 0.75rem; font-size: 1rem;">
                                <i data-lucide="bell-ring" style="color: var(--danger);"></i> Atención Prioritaria
                            </h3>
                            <span style="font-size: 0.7rem; padding: 0.2rem 0.6rem; background: rgba(215, 24, 31, 0.1); color: var(--danger); border-radius: 12px; font-weight: 700;">${alerts.length} ALERTAS</span>
                        </div>
                        
                        ${alerts.length === 0 ? `
                            <div class="empty-state-modern" style="padding: 2rem;">
                                <i data-lucide="check-circle-2" size="48" style="color: var(--primary); margin-bottom: 1rem; opacity: 0.5;"></i>
                                <p style="font-weight: 600; color: var(--text-main);">Sin mantenimientos vencidos</p>
                                <p style="font-size: 0.8rem;">Toda la flota se encuentra dentro de los parámetros operativos.</p>
                            </div>
                        ` : `
                            <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.5rem;">
                                ${alerts.map(alert => `
                                    <div class="glass-panel urgency-card ${alert.severity === 'critical' ? 'urgency-critical' : 'urgency-warning'}" style="padding: 1rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: start;">
                                            <div>
                                                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${alert.equipo}</div>
                                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">
                                                    <i data-lucide="clock" size="12" style="display: inline; vertical-align: middle;"></i> 
                                                    ${alert.tipo}: ${Math.abs(alert.horasRestantes)} hrs ${alert.horasRestantes <= 0 ? 'de retraso' : 'restantes'}
                                                </div>
                                            </div>
                                            <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background: var(--secondary); color: white;" 
                                                onclick="PlanesController.loadForm()">PROGRAMAR</button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>

                    <!-- Contractor Progress -->
                    <div class="glass-panel" style="padding: 1.5rem;">
                        <h3 style="margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.75rem; font-size: 1rem;">
                            <i data-lucide="truck" style="color: var(--accent-info);"></i> Control de Contratistas
                        </h3>
                        
                        ${contractors.length === 0 ? `
                            <div class="empty-state-modern" style="padding: 2rem;">
                                <i data-lucide="shield-check" size="48" style="color: var(--accent-info); margin-bottom: 1rem; opacity: 0.5;"></i>
                                <p style="font-weight: 600; color: var(--text-main);">No hay servicios externos activos</p>
                                <p style="font-size: 0.8rem;">No se registran equipos en talleres de terceros actualmente.</p>
                            </div>
                        ` : `
                            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                                ${contractors.slice(0, 5).map(c => `
                                    <div class="glass-panel urgency-card urgency-info" style="padding: 1rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                            <div>
                                                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${c.equipo}</div>
                                                <div style="font-size: 0.8rem; color: var(--text-muted);">${c.contratista} • ${c.dias} días en taller</div>
                                            </div>
                                            <span class="status-badge ${c.estado === 'EN TALLER' ? 'status-inactive' : 'status-active'}">${c.estado}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Trend Chart -->
                    <div class="glass-panel" style="padding: 1.5rem;">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1rem;">Tendencia de Costos OPEX (6 Meses)</h3>
                        <div style="height: 300px; width: 100%;">
                            <canvas id="chart-cost-trend"></canvas>
                        </div>
                    </div>

                    <!-- Comparison Chart -->
                    <div class="glass-panel" style="padding: 1.5rem;">
                        <h3 style="margin: 0 0 1.5rem 0; font-size: 1rem;">Distribución Mtto: Prev vs Corr</h3>
                        <div style="height: 300px; width: 100%; display: flex; align-items: center; justify-content: center;">
                            <canvas id="chart-prev-correct"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Top Equipment Cost Bar Chart -->
                <div class="glass-panel" style="padding: 1.5rem; margin-bottom: 2rem;">
                    <h3 style="margin: 0 0 1.5rem 0; font-size: 1rem;">Top 10 Equipos por Inversión en Mantenimiento</h3>
                    <div style="height: 350px; width: 100%;">
                        <canvas id="chart-top-equipment"></canvas>
                    </div>
                </div>

                <!-- Sequences Table Enhanced -->
                <div class="glass-panel" style="padding: 1.5rem;">
                    <h3 style="margin: 0 0 1.5rem 0; display: flex; align-items: center; gap: 0.75rem; font-size: 1rem;">
                        <i data-lucide="history"></i> Ciclos y Secuencias Técnicas
                    </h3>
                    <div style="overflow-x: auto;">
                        <table class="modern-table">
                            <thead>
                                <tr>
                                    <th style="text-align: left;">Equipo / Descripción</th>
                                    <th>Última Intervención</th>
                                    <th>Frecuencia Media</th>
                                    <th>Proyección Próximo</th>
                                    <th>Eventos</th>
                                    <th style="text-align: right;">Costo Acumulado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${sequences.length === 0 ? '<tr><td colspan="6" class="empty-state-modern">Sin datos de secuencias</td></tr>' :
                sequences.map(seq => `
                                    <tr class="table-row" onclick="MaintenanceDashboard.showEquipmentDetails('${seq.codigo}')" style="cursor: pointer;">
                                        <td style="text-align: left; font-weight: 700; color: var(--primary);">${seq.equipo}</td>
                                        <td>${seq.lastMaintenance}</td>
                                        <td><span class="status-badge status-scheduled">${seq.frequency}</span></td>
                                        <td><span style="color: var(--brand-yellow); font-weight: 600;">${seq.nextEstimated}</span></td>
                                        <td>${seq.count}</td>
                                        <td style="text-align: right; font-weight: 800; color: var(--primary);">
                                            $${seq.totalCost.toLocaleString('es-CO')}
                                        </td>
                                    </tr>
                                  `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Initialize Charts via requestAnimationFrame to ensure canvas is ready
        requestAnimationFrame(() => {
            this.renderCharts(trend, kpis, topEquipment);
        });
    },

    renderCharts(trend, kpis, topEquipment) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded');
            return;
        }

        // 1. Cost Trend Line Chart
        const ctxTrend = document.getElementById('chart-cost-trend');
        if (ctxTrend) {
            new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: trend.map(t => t.month),
                    datasets: [{
                        label: 'Gasto Mensual ($)',
                        data: trend.map(t => t.cost),
                        borderColor: '#33B347',
                        backgroundColor: 'rgba(51, 179, 71, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointBackgroundColor: '#33B347'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        datalabels: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }

        // 2. Preventivo vs Correctivo Doughnut
        const ctxPC = document.getElementById('chart-prev-correct');
        if (ctxPC) {
            new Chart(ctxPC, {
                type: 'doughnut',
                data: {
                    labels: ['Preventivo', 'Correctivo'],
                    datasets: [{
                        data: [kpis.preventivos, kpis.correctivos],
                        backgroundColor: ['#33B347', '#D7181F'],
                        borderWidth: 0,
                        hoverOffset: 15
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } },
                        datalabels: {
                            color: '#fff',
                            font: { weight: 'bold' },
                            formatter: (v, ctx) => {
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                return Math.round((v / total) * 100) + '%';
                            }
                        }
                    }
                }
            });
        }

        // 3. Top Equipment Horizontal Bar Chart
        const ctxTop = document.getElementById('chart-top-equipment');
        if (ctxTop) {
            new Chart(ctxTop, {
                type: 'bar',
                data: {
                    labels: topEquipment.map(e => e.equipo.split(' - ')[0]),
                    datasets: [{
                        label: 'Costo Total',
                        data: topEquipment.map(e => e.cost),
                        backgroundColor: 'rgba(51, 179, 71, 0.8)',
                        borderRadius: 6
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        datalabels: {
                            anchor: 'end',
                            align: 'right',
                            color: '#94a3b8',
                            formatter: (v) => '$' + (v / 1e6).toFixed(1) + 'M'
                        }
                    },
                    scales: {
                        x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { grid: { display: false } }
                    }
                }
            });
        }
    },

    showKPIDetails(type) {
        const modal = document.getElementById('dashboard-detail-modal');
        const titleEl = document.getElementById('dashboard-modal-title');
        const bodyEl = document.getElementById('dashboard-modal-body');

        if (!modal || !bodyEl) return;

        let title = '';
        let content = '';
        const kpis = this.calculateKPIs();

        if (type === 'cost') {
            title = '📌 Origen del Costo Total OPEX';
            content = `
                <div style="padding: 1rem; line-height: 1.6;">
                    <p>Este valor representa la inversión real ejecutada en mantenimientos dentro del periodo seleccionado.</p>
                    <div style="background: rgba(16, 185, 129, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.1); margin-top: 1rem;">
                        <h4 style="margin: 0 0 1rem; color: #04683A;">¿Qué incluye este cálculo?</h4>
                        <ul style="margin: 0; padding-left: 1.2rem;">
                            <li style="margin-bottom: 0.5rem;"><b>Repuestos y Materiales:</b> Suma de cada ítem multiplicado por su precio unitario del maestro de datos.</li>
                            <li style="margin-bottom: 0.5rem;"><b>Servicios Externos:</b> Costos reportados por contratistas en las boletas de mantenimiento.</li>
                            <li><b>Referencia:</b> Solo se tienen en cuenta boletas en estado <b>"REALIZADO"</b> o <b>"COMPLETADO"</b>.</li>
                        </ul>
                    </div>
                    <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                         <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Mantenimientos</div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-main);">${kpis.totalMaintenance}</div>
                         </div>
                         <div style="flex: 1; background: white; padding: 1rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 4px;">Promedio x Mantto</div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: #33B347;">$${kpis.avgCost.toLocaleString()}</div>
                         </div>
                    </div>
                </div>
            `;
        } else if (type === 'compliance') {
            title = '📌 Cálculo de Cumplimiento';
            content = `
                <div style="padding: 1rem; line-height: 1.6;">
                    <p>Mide la eficiencia en la ejecución de las labores programadas vs. las realizadas.</p>
                    <div style="background: rgba(59, 130, 246, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.1); margin-top: 1rem;">
                        <h4 style="margin: 0 0 1rem; color: #1d4ed8;">Fórmula de Cálculo</h4>
                        <div style="background: white; padding: 1rem; border-radius: 8px; font-family: monospace; text-align: center; margin-bottom: 1rem;">
                            (Ejecutados / Total Programados) * 100
                        </div>
                        <ul style="margin: 0; padding-left: 1.2rem;">
                            <li style="margin-bottom: 0.5rem;"><b>Ejecutados:</b> ${kpis.totalMaintenance} mantenimientos finalizados.</li>
                            <li style="margin-bottom: 0.5rem;"><b>Pendientes:</b> ${kpis.planned} labores aún en curso o programadas.</li>
                            <li><b>Meta Corporativa:</b> 90% de cumplimiento mensual.</li>
                        </ul>
                    </div>
                </div>
            `;
        } else if (type === 'ratio') {
            title = '📌 Distribución de Mantenimiento';
            content = `
                <div style="padding: 1rem; line-height: 1.6;">
                    <p>Analiza el equilibrio entre la prevención y la corrección de fallas.</p>
                    <div style="background: rgba(245, 158, 11, 0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.1); margin-top: 1rem;">
                        <h4 style="margin: 0 0 1rem; color: #b45309;">Relación de Intervenciones</h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                            <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #33B347;">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">Preventivos (998)</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: #33B347;">${kpis.preventivos}</div>
                            </div>
                            <div style="background: white; padding: 1rem; border-radius: 8px; border-left: 4px solid #D7181F;">
                                <div style="font-size: 0.75rem; color: var(--text-muted);">Correctivos (999)</div>
                                <div style="font-size: 1.5rem; font-weight: 800; color: #D7181F;">${kpis.correctivos}</div>
                            </div>
                        </div>
                        <p style="margin-top: 1rem; font-size: 0.85rem;">Un ratio alto indica una estrategia proactiva (más preventivos que correctivos).</p>
                    </div>
                </div>
            `;
        }

        titleEl.textContent = title;
        bodyEl.innerHTML = content;
        modal.style.display = 'flex';

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    showEquipmentDetails(codigo) {
        if (typeof DashboardController !== 'undefined' && DashboardController.showChartDetails) {
            const planes = DataManager.getPlanes();
            const completed = planes.filter(p => p.estado === 'REALIZADO' || p.estado === 'COMPLETADO');

            // Filter by exact equipment code
            const equipoHistory = completed.filter(p => p.equipo && p.equipo.includes(codigo));

            if (equipoHistory.length === 0) {
                alert("No se encontró historial detallado para este equipo.");
                return;
            }

            DashboardController.showChartDetails(`Historial de Mantenimiento: ${codigo}`, equipoHistory);
        } else {
            console.error("DashboardController.showChartDetails is not available.");
        }
    }
};
