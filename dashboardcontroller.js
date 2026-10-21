const DashboardController = {
    init() {
        if (typeof ChartDataLabels !== 'undefined') Chart.register(ChartDataLabels);

        // Update current date display
        const dateEl = document.getElementById('current-date-text');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('es-CO', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).replace(/^\w/, (c) => c.toUpperCase());
        }

        this.updateKPIs();
        this.updateCharts();
        this.updateContractorWidget(); // New
        this.updateDieselAlerts();

        // Setup Listeners (Moved here to ensure they run)
        const insumosFilter = document.getElementById('insumos-date-filter');
        if (insumosFilter) {
            insumosFilter.addEventListener('change', () => {
                this.updateInsumosCharts();
            });
        }
    },

    updateCO2Emission() {
        const widget = document.getElementById('co2-value');
        if (!widget) return;

        // Formula: Total Diesel Consumed * Emission Factor
        // Factor for Diesel: ~10.18 kg CO2 per gallon -> ~0.01018 Metric Tons per gallon
        const DIESEL_EMISSION_FACTOR = 0.01018;

        const equipos = DataManager.getEquipos();
        let totalEmissions = 0;

        equipos.forEach(eq => {
            // Only count if it has fuel consumption data
            const consumo = parseFloat(eq.consumo);
            const horometro = parseFloat(eq.horometro_actual);

            if (!isNaN(consumo) && consumo > 0 && !isNaN(horometro) && horometro > 0) {
                // Estimated Total Fuel Consumed = Hours * Gal/Hr
                const totalFuel = horometro * consumo;
                const emissions = totalFuel * DIESEL_EMISSION_FACTOR;
                totalEmissions += emissions;
            }
        });

        // Format: "1,2 Ton" (use comma as decimal separator for ES-CO)
        widget.textContent = `${totalEmissions.toLocaleString('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Ton`;
    },

    chartInstance: null,

    updateCharts() {
        // Chart logic delegated to EquiposController
        // const ctx = document.getElementById('fleet-health-chart');
        // if (ctx) { ... }

        this.updateCostChart(); // Call new cost chart method
        this.updateFinanceCharts(); // Call finance charts
        if (typeof EquiposController !== 'undefined' && EquiposController.renderDashboardWidgets) {
            EquiposController.renderDashboardWidgets();
        }
    },

    updateCostChart() {
        const ctxCost = document.getElementById('cost-chart');
        if (!ctxCost) return;

        const plans = DataManager.getPlanes();

        if (this.costChartInstance) this.costChartInstance.destroy();

        // Sort by cost descending and take top 5
        const topCosts = [...plans].sort((a, b) => (b.costoTotal || 0) - (a.costoTotal || 0)).slice(0, 5);

        this.costChartInstance = new Chart(ctxCost, {
            type: 'bar',
            data: {
                labels: topCosts.map(p => p.codigo || p.equipo),
                datasets: [{
                    label: 'Costo ($)',
                    data: topCosts.map(p => p.costoTotal || 0),
                    backgroundColor: 'rgba(51, 179, 71, 0.6)', // Brand Green transparent
                    borderColor: '#33B347',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { color: '#2d3748', font: { size: 10, weight: '600' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: '#2d3748',
                            font: { size: 10, weight: '600' },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    updateContractorWidget() {
        const container = document.getElementById('contractor-list-container');
        const countBadge = document.getElementById('contractor-count');
        if (!container) return;

        container.innerHTML = '';
        const plans = DataManager.getPlanes();
        const today = new Date();

        // Filter: Contractor Plans that are NOT CANCELLED
        // We want to show:
        // 1. "In Shop" (Red): Created, Sent, Not Returned (fechaSalida defined, fechaEntrega empty)
        // 2. "Returned" (Green): Recently returned (e.g. within last 7 days? or just active/completed recently?)
        //    User said: "Red not delivered, Green delivered". 
        //    Let's show "Delivered" if it HAS a fechaEntrega, maybe limit Recents to keep list clean? 
        //    Actually, let's show all "Active" ones. For "Delivered", if it's marked REALIZADO it might disappear from "Active" lists usually?
        //    Let's filter plans where esContratista == true AND (State != CANCELADO)

        // Filter: Active Plans (Not Cancelled/Deleted)
        const relevantPlans = Array.isArray(plans) ? plans.filter(p => p.estado !== 'CANCELADO' && p.estado !== 'ELIMINADO') : [];

        let capexTotal = 0;
        let opexTotal = 0;

        // Calculate Global Totals (Propio + Contratista)
        // STRICT SEPARATION: Plans = OPEX, Capex Module = CAPEX
        const capexProjects = DataManager.getCapex() || [];
        if (Array.isArray(capexProjects)) {
            capexTotal = capexProjects.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);
        }

        relevantPlans.forEach(p => {
            // All maintenance plans are considered OPEX
            const cost = p.costoTotal || p.contratistaCosto || 0;
            opexTotal += cost;
        });

        // Filter for Widget LIST only (Contractors)
        const contractorPlans = relevantPlans.filter(p => p.esContratista);

        // Sort: "In Shop" first, then by date desc
        contractorPlans.sort((a, b) => {
            const aInShop = (a.fechaSalida && !a.fechaEntrega);
            const bInShop = (b.fechaSalida && !b.fechaEntrega);
            if (aInShop && !bInShop) return -1;
            if (!aInShop && bInShop) return 1;
            return new Date(b.fechaRegistro || 0) - new Date(a.fechaRegistro || 0);
        });

        let activeCount = 0;
        let renderedCount = 0;

        contractorPlans.forEach(plan => {
            // Logic for Status
            const isInShop = (plan.fechaSalida && !plan.fechaEntrega);
            if (isInShop) activeCount++;

            // Determine Color & Text
            let statusColor = '#33B347'; // Brand Green
            let statusText = 'ENTREGADO';
            let timeText = '';

            if (isInShop) {
                statusColor = '#D7181F'; // Brand Red
                statusText = 'EN TALLER';

                // Calc days elapsed
                const start = new Date(plan.fechaSalida);
                const diffTime = Math.abs(today - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                timeText = `${diffDays} Días fuera`;
            } else if (plan.fechaEntrega) {
                statusText = `RECIBIDO: ${plan.fechaEntrega}`;
            } else {
                statusColor = '#FEB811'; // Brand Yellow
                statusText = 'PENDIENTE DE SALIDA';
            }

            renderedCount++;

            const html = `
                <div class="glass-panel" style="padding: 0.8rem; background: rgba(30, 41, 59, 0.4); border: 1px solid ${statusColor}40; display: flex; flex-direction: column; gap: 0.5rem; transition: transform 0.2s; position: relative; overflow: hidden;">
                    <div style="position: absolute; left: 0; top: 0; width: 4px; height: 100%; background: ${statusColor};"></div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-left: 0.5rem;">
                        <div>
                            <div style="font-weight: 700; color: white;">${plan.equipo || 'S/N'}</div>
                            <div style="font-size: 0.85rem; color: #707072;">${plan.contratistaNombre || 'Contratista S/N'}</div>
                        </div>
                        <div style="text-align: right;">
                             <div class="badge" style="background: ${statusColor}20; color: ${statusColor}; font-weight: bold; font-size: 0.75rem; margin-bottom: 0.3rem;">
                                ${statusText}
                             </div>
                             <div style="font-size: 0.85rem; color: white; font-weight: 600;">
                                $ ${(plan.costoTotal || plan.contratistaCosto || 0).toLocaleString('es-CO')}
                             </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-left: 0.5rem; margin-top: 0.2rem;">
                         ${isInShop ? `
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                             <i data-lucide="clock" size="14" color="${statusColor}"></i>
                             <span style="font-size: 0.85rem; color: ${statusColor}; font-weight: 500;">
                                ${timeText}
                             </span>
                        </div>` : '<div></div>'}
                         <div style="font-size: 0.7rem; color: #707072; font-weight: 600;">${plan.tipoGasto || 'OPEX'}</div>
                    </div>
                </div>
             `;
            container.insertAdjacentHTML('beforeend', html);
        });

        if (contractorPlans.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); grid-column: 1/-1; padding: 2rem;">No hay servicios de contratistas registrados.</div>`;
        }

        if (countBadge) countBadge.textContent = activeCount;

        // Render CAPEX/OPEX Chart
        const ctx = document.getElementById('capex-opex-chart');
        if (ctx) {
            if (this.capexChart) this.capexChart.destroy();
            this.capexChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['OPEX', 'CAPEX'],
                    datasets: [{
                        data: [opexTotal, capexTotal],
                        backgroundColor: ['#33B347', '#f59e0b'], // Green vs Amber/Gold
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '75%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed !== null) {
                                        label += '$ ' + context.parsed.toLocaleString('es-CO');
                                    }
                                    return label;
                                }
                            }
                        }
                    }
                }
            });

            const legendEl = document.getElementById('capex-opex-legend');
            if (legendEl) {
                legendEl.innerHTML = `
                    <div style="display:flex; gap:1rem; justify-content:center; align-items: center;">
                        <div style="text-align:center;">
                            <div style="font-size:0.7rem; color:#33B347; font-weight:800;">OPEX</div> 
                            <div style="font-weight:600; color:var(--text-main); font-size:0.8rem;">$${opexTotal.toLocaleString('en-US', { maximumFractionDigits: 0, notation: "compact" })}</div>
                        </div>
                        <div style="width:1px; height:20px; background:var(--glass-border);"></div>
                        <div style="text-align:center;">
                            <div style="font-size:0.7rem; color:#f59e0b; font-weight:800;">CAPEX</div> 
                            <div style="font-weight:600; color:var(--text-main); font-size:0.8rem;">$${capexTotal.toLocaleString('en-US', { maximumFractionDigits: 0, notation: "compact" })}</div>
                        </div>
                    </div>
                `;
            }
        }
    },

    updateKPIs() {
        const plans = DataManager.getPlanes();

        // 1. Programado (PENDIENTE or BLOQUEADO)
        const pendingCount = plans.filter(p => p.estado === 'PENDIENTE' || p.estado === 'BLOQUEADO').length;
        document.getElementById('kpi-pending').textContent = pendingCount;

        // 2. Efficiency (Realized / Total)
        const total = plans.length;
        const realizadoCount = plans.filter(p => p.estado === 'REALIZADO').length;
        const efficiency = total > 0 ? Math.round((realizadoCount / total) * 100) : 0;
        document.getElementById('kpi-efficiency').textContent = efficiency + '%';

        // 3. Investment Total (Real Cost)
        const totalInvestment = this.calculateTotalRealCost();
        document.getElementById('kpi-investment').textContent = '$ ' + totalInvestment.toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    },


    // --- NOTEPAD ---
    initNotepad() {
        const textarea = document.getElementById('notepad-content');
        if (!textarea) return;

        // Load saved note
        const savedNote = DataManager.getNotepad();
        textarea.value = savedNote;

        // Auto-save on input
        textarea.addEventListener('input', () => {
            document.getElementById('notepad-status').innerText = 'Guardando...';
            this.saveNoteDebounced();
        });

        // Initialize debounced saver
        this.saveNoteDebounced = this.debounce(() => {
            DataManager.saveNotepad(textarea.value);
            document.getElementById('notepad-status').innerText = 'Guardado';

            // Visual feedback
            const statusEl = document.getElementById('notepad-status');
            statusEl.style.color = '#33B347';
            setTimeout(() => { statusEl.style.color = '#707072'; }, 2000);
        }, 1000);
    },

    toggleNotepad() {
        const panel = document.getElementById('notepad-panel');
        if (panel) {
            panel.classList.toggle('active');
            if (panel.classList.contains('active')) {
                // Initialize if empty (re-check)
                if (!this.notepadInitialized) {
                    this.initNotepad();
                    this.notepadInitialized = true;
                }
                setTimeout(() => document.getElementById('notepad-content').focus(), 100);
            }
        }
    },

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },

    calculateTotalRealCost() {
        const planes = DataManager.getPlanes();
        const planesCost = planes.reduce((acc, p) => acc + (p.costoTotal || 0), 0);
        const labores = DataManager.getLaboresReportes();
        const laboresCost = labores.reduce((acc, l) => acc + (l.costoMateriales || 0), 0);
        return planesCost + laboresCost;
    },

    updateDieselAlerts() {
        const container = document.getElementById('diesel-alerts-container');
        const widget = document.getElementById('diesel-alerts-widget');
        const countBadge = document.getElementById('diesel-alert-count');
        if (!container || !widget) return;

        if (typeof EquiposController === 'undefined') return;

        const dieselEquipos = EquiposController.equipos.filter(eq =>
            EquiposController.DIESEL_EQUIPMENT_IDS.includes(eq.codigo)
        );

        const alerted = dieselEquipos.map(eq => {
            const statusInfo = EquiposController.calculateAlertStatus(eq.horometro_actual);
            return { ...eq, ...statusInfo };
        }).filter(eq => eq.status === 'WARNING' || eq.status === 'ALERT');

        if (alerted.length === 0) {
            widget.style.display = 'none';
            return;
        }

        widget.style.display = 'block';
        countBadge.innerText = alerted.length;
        container.innerHTML = alerted.map(eq => `
        <div class="glass-panel" onclick="EquiposController.programarDesdeAlerta('${eq.codigo}')" style="cursor: pointer; padding: 0.8rem; border-left: 4px solid ${eq.color}; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;">
            <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: white;">${eq.codigo}</div>
                <div style="font-size: 0.8rem; color: #707072; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px;">${eq.descripcion}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 800; color: ${eq.color}; font-size: 1rem;">${eq.horometro_actual} Hrs</div>
                <button class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; background: ${eq.color}22; color: ${eq.color}; border: 1px solid ${eq.color}44; margin-top: 0.3rem;">
                    PROGRAMAR MTTO
                </button>
            </div>
        </div>
    `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    updateLaboresCharts() {
        const ctxStatus = document.getElementById('labores-status-chart');
        const ctxActivity = document.getElementById('labores-activity-chart');

        if (!ctxStatus || !ctxActivity) return;

        // Ensure LaboresController is available
        const reports = (typeof LaboresController !== 'undefined') ? LaboresController.reportes : [];

        // 1. Status Chart
        const statusCounts = {
            'Completado': 0,
            'Pendiente': 0,
            'En Revisión': 0
        };

        reports.forEach(r => {
            if (statusCounts[r.estado] !== undefined) statusCounts[r.estado]++;
            else statusCounts['Pendiente']++; // Default fallback
        });

        if (this.laboresStatusChart) this.laboresStatusChart.destroy();

        this.laboresStatusChart = new Chart(ctxStatus, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#33B347', '#D7181F', '#FEB811'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#2d3748', font: { size: 10, weight: '600' } } }
                }
            }
        });

        // 2. Activity Chart (Reports by Technician)
        const techCounts = {};
        reports.forEach(r => {
            techCounts[r.tecnico] = (techCounts[r.tecnico] || 0) + 1;
        });

        if (this.laboresActivityChart) this.laboresActivityChart.destroy();

        this.laboresActivityChart = new Chart(ctxActivity, {
            type: 'bar',
            data: {
                labels: Object.keys(techCounts),
                datasets: [{
                    label: 'Reportes',
                    data: Object.values(techCounts),
                    backgroundColor: 'rgba(51, 179, 71, 0.6)',
                    borderColor: '#33B347',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.08)' }, ticks: { color: '#2d3748', font: { weight: '600' } } },
                    x: { grid: { display: false }, ticks: { color: '#2d3748', font: { weight: '600' } } }
                },
                plugins: { legend: { display: false } }
            }
        });
    },

    updateFinanceCharts() {
        const ctxDist = document.getElementById('finance-distribution-chart');
        const ctxBudget = document.getElementById('finance-budget-chart');

        if (!ctxDist || !ctxBudget) return;

        // --- REAL DATA CALCULATION ---
        const planes = DataManager.getPlanes();
        const labores = (typeof LaboresController !== 'undefined') ? LaboresController.reportes : [];

        // 1. Calculate OPEX (Mantenimientos + Labores)
        // Mantenimientos Cost
        const costoMantenimientos = planes.reduce((acc, p) => acc + (p.costoTotal || 0), 0);

        // Labores Cost (Materiales + Mano de Obra estimada si la hubiera, por ahora materiales)
        const costoLabores = labores.reduce((acc, r) => acc + (r.costoMateriales || 0), 0);

        const opexTotal = costoMantenimientos + costoLabores;

        // 2. Calculate CAPEX (From new Module)
        const capexProjects = DataManager.getCapex();
        const capexTotal = capexProjects.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

        // 1. Distribution Chart
        if (this.financeDistChart) this.financeDistChart.destroy();

        this.financeDistChart = new Chart(ctxDist, {
            type: 'pie',
            data: {
                labels: ['OPEX (Mantenimiento)', 'CAPEX (Inversión)'],
                datasets: [{
                    data: [opexTotal, capexTotal],
                    backgroundColor: ['#FEB811', '#04683A'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#2d3748', font: { size: 10, weight: '600' } } },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // 2. Budget Execution (Monthly) - Based on Planes Dates
        const monthlyCosts = Array(12).fill(0);
        let currentYear = new Date().getFullYear();

        // Safety: If no planes in current year, check if there are planes in other years to avoid empty charts
        const hasCurrentYearData = planes.some(p => p.fechaProgramada && new Date(p.fechaProgramada).getFullYear() === currentYear) ||
            labores.some(l => l.fecha && new Date(l.fecha).getFullYear() === currentYear);

        if (!hasCurrentYearData && (planes.length > 0 || labores.length > 0)) {
            // Find the most recent year with data
            const allDates = [...planes.map(p => p.fechaProgramada), ...labores.map(l => l.fecha)].filter(Boolean);
            if (allDates.length > 0) {
                currentYear = new Date(allDates.sort().reverse()[0]).getFullYear();
                console.log(`Dashboard: No data for ${new Date().getFullYear()}, switching to ${currentYear}`);
            }
        }

        planes.forEach(p => {
            if (p.fechaProgramada) {
                const date = new Date(p.fechaProgramada);
                if (date.getFullYear() === currentYear) {
                    monthlyCosts[date.getMonth()] += (p.costoTotal || 0);
                }
            }
        });

        // Add Labores costs
        labores.forEach(r => {
            if (r.fecha) {
                // Assuming format YYYY-MM-DD
                const date = new Date(r.fecha);
                if (date.getFullYear() === currentYear) {
                    monthlyCosts[date.getMonth()] += (r.costoMateriales || 0);
                }
            }
        });

        // Budget Mock (Flat or Curve)
        const monthlyBudget = [1500000, 1500000, 2000000, 1500000, 1500000, 1500000, 1500000, 2000000, 1500000, 1500000, 3000000, 4000000];

        if (this.financeBudgetChart) this.financeBudgetChart.destroy();

        this.financeBudgetChart = new Chart(ctxBudget, {
            type: 'line',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                datasets: [{
                    label: `Presupuesto ${currentYear}`,
                    data: monthlyBudget,
                    borderColor: 'rgba(51, 179, 71, 0.5)',
                    borderDash: [5, 5],
                    tension: 0.4,
                    fill: false
                }, {
                    label: 'Ejecutado Real',
                    data: monthlyCosts,
                    borderColor: '#D7181F',
                    backgroundColor: 'rgba(215, 24, 31, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#2d3748',
                            font: { size: 10, weight: '600' },
                            callback: function (value) { return '$' + value / 1000 + 'k'; }
                        }
                    },
                    x: { ticks: { color: '#2d3748', font: { weight: '600' } }, grid: { display: false } }
                },
                plugins: { legend: { display: true, labels: { color: '#2d3748', font: { weight: '600' } } } }
            }
        });
    },

    showChartDetails(title, filteredBoletas, categoryFilter = null) {
        const modal = document.getElementById('modal-chart-details');
        const titleEl = document.getElementById('chart-details-title');
        const tbody = document.getElementById('chart-details-body');
        const insightEl = document.getElementById('chart-details-insight');

        if (!modal || !tbody) return;

        if (titleEl) titleEl.textContent = title;
        tbody.innerHTML = '';
        if (insightEl) insightEl.style.display = 'none'; // Reset

        const laborStats = {};
        const equipmentStats = {};
        let totalFilteredCost = 0;

        if (filteredBoletas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1rem;">No hay registros.</td></tr>';
        } else {
            filteredBoletas.forEach(b => {
                // 1. Group items by their specific destination
                const itemsByDest = {};

                // Determine a fallback destination from header (if exists)
                const headerDest = b.equipoDestino || (b.sectorDestino ? `SECTOR: ${b.sectorDestino}` : 'General/Varios');

                if (b.items) {
                    b.items.forEach(i => {
                        // Insight Calculation Filtering
                        if (categoryFilter) {
                            const itemCat = this.classifyMaterial(i.descripcion);
                            if (itemCat === categoryFilter) {
                                const price = DataManager.getMaterialPrice(i.codigo) || 0;
                                const cost = (parseFloat(i.cantidad) || 0) * price;
                                const lab = i.actividad || '998'; // Default Labor
                                const eq = i.destino || b.equipo || 'N/A';

                                totalFilteredCost += cost;
                                if (!laborStats[lab]) laborStats[lab] = 0;
                                laborStats[lab] += cost;

                                if (!equipmentStats[eq]) equipmentStats[eq] = 0;
                                equipmentStats[eq] += cost;
                            }
                        }


                        // Priority: Item Destination > Header Destination > 'General'
                        let dest = i.destino ? (i.tipoDestino === 'SECTOR' ? `SECTOR: ${i.destino}` : i.destino) : headerDest;

                        if (!itemsByDest[dest]) {
                            itemsByDest[dest] = [];
                        }
                        itemsByDest[dest].push(i);
                    });
                }

                // 2. Generate a row for EACH destination group
                Object.keys(itemsByDest).forEach(dest => {
                    const groupItems = itemsByDest[dest];
                    let groupCost = 0;
                    let itemsDesc = [];
                    let itemsLabors = [];

                    groupItems.forEach(i => {
                        const price = DataManager.getMaterialPrice(i.codigo) || 0;
                        const cant = parseFloat(i.cantidad) || 0;
                        groupCost += (cant * price);
                        itemsDesc.push(`${cant} ${i.unidad || 'Und'} ${i.descripcion}`);
                        itemsLabors.push(i.actividad || '-');
                    });

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${b.fecha || '-'}</td>
                        <td>${b.id || '-'}</td>
                        <td style="font-weight: 600; color: #33B347;">${dest}</td>
                        <td style="text-align: center; color: var(--text-muted);">${itemsLabors.join('<br>')}</td>
                        <td style="font-size: 0.8rem;">${itemsDesc.join('<br>').substring(0, 500)}</td>
                        <td style="text-align: center;">${groupItems.length}</td>
                        <td style="text-align: right;">$ ${groupCost.toLocaleString()}</td>
                    `;
                    tbody.appendChild(tr);
                });
            });

            // --- INSIGHT LOGIC ---
            if (categoryFilter && insightEl && totalFilteredCost > 0) {
                // Find top labor
                let maxLabor = 'N/A';
                let maxCost = -1;
                Object.keys(laborStats).forEach(lab => {
                    if (laborStats[lab] > maxCost) {
                        maxCost = laborStats[lab];
                        maxLabor = lab;
                    }
                });

                if (maxLabor !== 'N/A') {
                    const percentage = ((maxCost / totalFilteredCost) * 100).toFixed(1);
                    // Try to get labor description if possible or just show code
                    const laborText = BoletasController.getActividadDescription ? BoletasController.getActividadDescription(maxLabor, null, null) : maxLabor;

                    // Find top equipment
                    let maxEquip = 'N/A';
                    let maxEquipCost = -1;
                    Object.keys(equipmentStats).forEach(eq => {
                        if (equipmentStats[eq] > maxEquipCost) {
                            maxEquipCost = equipmentStats[eq];
                            maxEquip = eq;
                        }
                    });

                    insightEl.innerHTML = `
                        <div style="font-weight: bold; color: #04683A; display: flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="lightbulb" style="width: 18px;"></i> INSIGHT
                        </div>
                        <p style="margin: 0.5rem 0 0; font-size: 0.95rem; color: #333;">
                            El <b>${percentage}%</b> del costo  ($ ${maxCost.toLocaleString()}) en esta categoría está asociado a la labor 
                            <b>"${laborText}"</b> (Código: ${maxLabor}). <br>
                            Concentrado principalmente en el equipo: <b>${maxEquip}</b> ($ ${maxEquipCost.toLocaleString()}).
                        </p>
                    `;
                    insightEl.style.display = 'block';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    insightEl.style.display = 'none';
                }
            } else {
                if (insightEl) insightEl.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
    },

    classifyMaterial(desc) {
        if (!desc) return 'OTROS';
        const d = desc.toUpperCase();
        if (d.includes('FILTRO')) return 'FILTROS';
        if (d.includes('ACEITE') || d.includes('GRASA') || d.includes('LUBRI') || d.includes('VALVULINA')) return 'LUBRICANTES';
        if (d.includes('LLANTA') || d.includes('NEUMA') || d.includes('CAMARA')) return 'LLANTAS';
        if (d.includes('BATERIA') || d.includes('ELECTR') || d.includes('CABLE') || d.includes('FUSIBLE')) return 'ELECTRICOS';
        if (d.includes('CORREA') || d.includes('BANDA')) return 'CORREAS';
        if (d.includes('ORING') || d.includes('SELLO') || d.includes('EMPAQUE') || d.includes('RETENEDOR')) return 'SELLOS';
        if (d.includes('RODAMIENT') || d.includes('BALINERA') || d.includes('COJINETE')) return 'RODAMIENTOS';
        if (d.includes('TORNILL') || d.includes('PERNO') || d.includes('TUERCA') || d.includes('ARANDELA')) return 'TORNILLERIA';
        if (d.includes('GUADAÑA') || d.includes('NYLON') || d.includes('CUCHILLA') || d.includes('YOYO')) return 'GUADAÑADO';
        if (d.includes('DISCO') || d.includes('PASTILLA') || d.includes('FRENO')) return 'FRENOS';
        if (d.includes('MANGUERA') || d.includes('ACOPLE') || d.includes('RACOR')) return 'HIDRAULICA';
        return 'OTROS REPUESTOS';
    },

    updateInsumosCharts() {
        const picker = document.getElementById('insumos-month-picker');
        const scopeSelect = document.getElementById('insumos-scope-filter');
        const summaryCard1 = document.getElementById('insumos-kpi-total-items');
        const summaryCard2 = document.getElementById('insumos-kpi-cost');

        if (!picker || !summaryCard1 || !summaryCard2) {
            console.warn("DOM elements missing for Insumos Charts.");
            return;
        }

        // 1. Set Default Date if empty
        if (!picker.value) {
            const boletas = DataManager.getBoletas();
            if (boletas.length > 0) {
                // Find latest boleta date
                const allDates = boletas.map(b => b.fecha || b.fechaGeneracion).filter(Boolean).sort().reverse();
                if (allDates.length > 0) {
                    const latestDate = allDates[0];
                    picker.value = latestDate.slice(0, 7); // Extract YYYY-MM
                }
            } else {
                const now = new Date();
                const localMonth = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 7);
                picker.value = localMonth;
            }
        }

        // 2. Attach Listeners (Idempotent)
        if (picker && !picker.dataset.listenerAttached) {
            picker.addEventListener('change', () => this.updateInsumosCharts());
            picker.dataset.listenerAttached = 'true';
        }
        if (scopeSelect && !scopeSelect.dataset.listenerAttached) {
            scopeSelect.addEventListener('change', () => this.updateInsumosCharts());
            scopeSelect.dataset.listenerAttached = 'true';
        }

        // 3. Generate and Render Alerts
        this.renderAlerts();

        const ctxCost = document.getElementById('insumos-cost-chart');
        const ctxTrend = document.getElementById('insumos-trend-chart');
        const ctxDest = document.getElementById('insumos-dest-chart');

        if (!ctxCost) return;

        const boletas = DataManager.getBoletas();
        const materialStats = {};
        const categoryStats = {};
        const trendStats = {};
        const destinationStats = {};
        const globalLaborStats = {};
        const watchlistStats = {}; // New: For Top 5 Watchlist

        // Helper to guess category (maintained)
        const getCategory = (desc) => this.classifyMaterial(desc);

        let totalItems = 0;
        let totalEstimatedCost = 0;

        // New Fuel Stats
        let totalOil = 0;
        let totalDiesel = 0;
        let totalGas = 0;

        // --- FILTER LOGIC ---
        const scope = scopeSelect ? scopeSelect.value : 'month'; // month, year, all

        // Parse Picker Date (YYYY-MM)
        let targetYear, targetMonth;
        if (picker && picker.value) {
            const parts = picker.value.split('-');
            targetYear = parseInt(parts[0], 10);
            targetMonth = parseInt(parts[1], 10) - 1; // 0-indexed for JS Date
        } else {
            const now = new Date();
            targetYear = now.getFullYear();
            targetMonth = now.getMonth();
        }

        const filteredBoletas = boletas.filter(b => {
            if (scope === 'all') return true;

            const dateStr = b.fecha || b.fechaGeneracion;
            if (!dateStr) return false;

            let bYear, bMonth;

            // Strategy 1: ISO Format (YYYY-MM-DD)
            const isoMatch = typeof dateStr === 'string' && dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (isoMatch) {
                bYear = parseInt(isoMatch[1], 10);
                bMonth = parseInt(isoMatch[2], 10) - 1;
            }
            // Strategy 2: Slash Format (DD/MM/YYYY)
            else if (typeof dateStr === 'string' && dateStr.includes('/') && dateStr.length <= 10) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    if (parts[2].length === 4) {
                        bYear = parseInt(parts[2], 10);
                        bMonth = parseInt(parts[1], 10) - 1;
                    } else {
                        const d = new Date(dateStr);
                        bYear = d.getFullYear();
                        bMonth = d.getMonth();
                    }
                }
            } else {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return false;
                bYear = d.getFullYear();
                bMonth = d.getMonth();
            }

            if (scope === 'year') {
                return bYear === targetYear;
            }
            // Default: Month Scope
            return bYear === targetYear && bMonth === targetMonth;
        });

        // Store immediately to ensure interactivity even if charts fail later
        this.lastFilteredInsumos = filteredBoletas;

        // Update UI Labels based on filter
        const costLabel = document.querySelector('#insumos-kpi-cost + p');
        if (costLabel) {
            if (scope === 'all') costLabel.textContent = 'Costo Total Histórico';
            else if (scope === 'year') costLabel.textContent = `Costo Año ${targetYear}`;
            else {
                // Month Name
                const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
                costLabel.textContent = `Costo ${monthNames[targetMonth]} ${targetYear}`;
            }
        }


        // Aggregate Data (Use filteredBoletas)
        filteredBoletas.forEach(b => {
            // 1. Destination Logic
            let dest = 'Otros/General';
            // Check Header First
            if (b.tipo === 'APLICACION') dest = 'Aplicación Campo';
            else if (b.tipo === 'MANTENIMIENTO') dest = 'Mantenimiento Equipos';

            // Check Items if not clear
            if (b.items && b.items.length > 0) {
                const hasSector = b.items.some(i => i.tipoDestino === 'SECTOR');
                const hasEquipo = b.items.some(i => i.tipoDestino === 'EQUIPO');
                if (hasSector) dest = 'Aplicación Campo';
                else if (hasEquipo && dest === 'Otros/General') dest = 'Mantenimiento Equipos';
            }
            if (!destinationStats[dest]) destinationStats[dest] = 0;
            b._tempDest = dest; // Tag for drill-down

            // 2. Trend Logic
            // Parse date correctly (Assuming YYYY-MM-DD or ISO)
            let dateKey = b.fecha ? b.fecha.substring(0, 10) : 'Unknown';
            if (!trendStats[dateKey]) trendStats[dateKey] = 0;
            b._tempDate = dateKey; // Tag for drill-down

            if (b.items && Array.isArray(b.items)) {
                b.items.forEach(item => {
                    const price = DataManager.getMaterialPrice(item.codigo) || 0;
                    const cantidad = parseFloat(item.cantidad) || 0;
                    const totalCost = cantidad * price;

                    totalItems += cantidad;
                    totalEstimatedCost += totalCost;

                    // Accumulate for Destination & Trend
                    destinationStats[dest] += totalCost;
                    trendStats[dateKey] += totalCost;

                    // By Material
                    if (!materialStats[item.descripcion]) {
                        materialStats[item.descripcion] = 0;
                    }
                    materialStats[item.descripcion] += totalCost;



                    // By Category
                    const cat = getCategory(item.descripcion);
                    if (!categoryStats[cat]) {
                        categoryStats[cat] = 0;
                    }
                    if (!categoryStats[cat]) {
                        categoryStats[cat] = 0;
                    }
                    categoryStats[cat] += totalCost;

                    // Global Labor Stats
                    const lab = item.actividad || '998'; // Default Labor
                    if (!globalLaborStats[lab]) globalLaborStats[lab] = { cost: 0, topCategory: {}, topEquipment: {} };
                    globalLaborStats[lab].cost += totalCost;

                    if (!globalLaborStats[lab].topCategory[cat]) globalLaborStats[lab].topCategory[cat] = 0;
                    globalLaborStats[lab].topCategory[cat] += totalCost;

                    const currentDest = item.destino || b.equipo || 'N/A';
                    if (!globalLaborStats[lab].topEquipment[currentDest]) globalLaborStats[lab].topEquipment[currentDest] = 0;
                    globalLaborStats[lab].topEquipment[currentDest] += totalCost;

                    // Watchlist Stats (Per Machine/Dest)
                    if (!watchlistStats[currentDest]) watchlistStats[currentDest] = 0;
                    watchlistStats[currentDest] += totalCost;


                    // Fuel Logic
                    const desc = item.descripcion.toUpperCase();
                    if ((desc.includes('ACEITE') || desc.includes('VALVULINA')) && !desc.includes('FILTRO')) {
                        totalOil += cantidad;
                    } else if (desc.includes('ACPM') || desc.includes('DIESEL')) {
                        totalDiesel += cantidad;
                    } else if (desc.includes('GASOLINA') || desc.includes('EXTRA') || desc.includes('CORRIENTE')) {
                        totalGas += cantidad;
                    }
                });
            }
        });

        // --- UPDATE KPIS ---
        const kpiItemsEl = document.getElementById('insumos-kpi-total-items');
        const kpiCostEl = document.getElementById('insumos-kpi-cost');
        const kpiTopEl = document.getElementById('insumos-kpi-top-mat');

        if (kpiItemsEl) kpiItemsEl.textContent = filteredBoletas.length; // Correct: Boletas Count
        if (kpiCostEl) kpiCostEl.textContent = '$ ' + totalEstimatedCost.toLocaleString('en-US', { minimumFractionDigits: 0 });

        // Update Fuel KPIs
        const kpiOilEl = document.getElementById('insumos-kpi-oil');
        const kpiDieselEl = document.getElementById('insumos-kpi-diesel');
        const kpiGasEl = document.getElementById('insumos-kpi-gas');

        if (kpiOilEl) kpiOilEl.textContent = totalOil.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' gal';
        if (kpiDieselEl) kpiDieselEl.textContent = totalDiesel.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' gal';
        if (kpiGasEl) kpiGasEl.textContent = totalGas.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' gal';

        // --- GLOBAL INSIGHT UPDATE ---
        const mainInsightEl = document.getElementById('insumos-main-insight');
        if (mainInsightEl) {
            if (totalEstimatedCost > 0) {
                // Find top labor
                let maxLabor = 'N/A';
                let maxCost = -1;
                Object.keys(globalLaborStats).forEach(lab => {
                    if (globalLaborStats[lab].cost > maxCost) {
                        maxCost = globalLaborStats[lab].cost;
                        maxLabor = lab;
                    }
                });

                if (maxLabor !== 'N/A') {
                    const laborData = globalLaborStats[maxLabor];
                    const percentage = ((laborData.cost / totalEstimatedCost) * 100).toFixed(1);
                    const laborText = BoletasController.getActividadDescription ? BoletasController.getActividadDescription(maxLabor, null, null) : maxLabor;

                    // Find Top Category within this labor
                    let topCat = 'General';
                    let maxCatCost = -1;
                    Object.keys(laborData.topCategory).forEach(c => {
                        if (laborData.topCategory[c] > maxCatCost) {
                            maxCatCost = laborData.topCategory[c];
                            topCat = c;
                        }
                    });

                    // Find Top Equipment within this labor
                    let topEquip = 'Varios';
                    let maxEquipCost = -1;
                    Object.keys(laborData.topEquipment).forEach(e => {
                        if (laborData.topEquipment[e] > maxEquipCost) {
                            maxEquipCost = laborData.topEquipment[e];
                            topEquip = e;
                        }
                    });

                    mainInsightEl.innerHTML = `
                         <div style="font-weight: bold; color: #04683A; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                            <i data-lucide="sparkles" style="width: 18px;"></i> HALLAZGO PRINCIPAL
                        </div>
                        <p style="margin: 0; font-size: 1rem; color: #333;">
                            El costo más representativo este periodo es la labor <b>"${laborText}"</b> ($ ${laborData.cost.toLocaleString()}), 
                            que abarca el <b>${percentage}%</b> del gasto total, con mayor gasto en <b>${topCat}</b> 
                            principalmente en el equipo/responsable <b>${topEquip}</b>.
                        </p>
                    `;
                    mainInsightEl.style.display = 'block';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                } else {
                    mainInsightEl.style.display = 'none';
                }
            } else {
                mainInsightEl.style.display = 'none';
            }
        }


        // --- RENDER NEW CHARTS ---

        // 1. Trend Chart (Line)
        if (ctxTrend) {
            const sortedDates = Object.keys(trendStats).sort();
            const trendData = sortedDates.map(d => trendStats[d]);

            // Robust Destroy
            const existingTrend = Chart.getChart(ctxTrend);
            if (existingTrend) existingTrend.destroy();

            this.insumosTrendChart = new Chart(ctxTrend, {
                type: 'line',
                data: {
                    labels: sortedDates,
                    datasets: [{
                        label: 'Gasto Diario',
                        data: trendData,
                        borderColor: '#04683A',
                        backgroundColor: 'rgba(4, 104, 58, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (e, activeEls) => {
                        if (activeEls.length > 0) {
                            const index = activeEls[0].index;
                            const labelDate = sortedDates[index];
                            // Filter boletas for this date
                            const drillDownData = filteredBoletas.filter(b => b._tempDate === labelDate);
                            this.showChartDetails(`Insumos del día: ${labelDate}`, drillDownData);
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: { label: (c) => '$ ' + c.raw.toLocaleString() }
                        },
                        datalabels: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.08)' },
                            ticks: { color: '#2d3748', font: { size: 11, weight: '600' } }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#2d3748', font: { size: 11, weight: '600' } }
                        }
                    }
                }
            });
        }

        // 2. Top Equipos Chart (Bar) - REPLACED Destination Logic
        if (ctxDest) {
            // Sort watchlistStats (which tracks cost per equipment/dest)
            const topEquipos = Object.entries(watchlistStats)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const destLabels = topEquipos.map(e => e[0]);
            const destData = topEquipos.map(e => e[1]);

            // Robust Destroy
            const existingDest = Chart.getChart(ctxDest);
            if (existingDest) existingDest.destroy();

            this.insumosDestChart = new Chart(ctxDest, {
                type: 'bar',
                data: {
                    labels: destLabels,
                    datasets: [{
                        label: 'Gasto Total',
                        data: destData,
                        backgroundColor: 'rgba(245, 158, 11, 0.7)', // Premium Amber/Orange
                        borderColor: '#f59e0b',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y', // Horizontal Layout often reads better for names
                    onClick: (e, activeEls) => {
                        if (activeEls.length > 0) {
                            const index = activeEls[0].index;
                            const labelDest = destLabels[index];
                            // Filter boletas for this equipment/dest
                            // Logic: check both boleta.equipo OR items.destino
                            const drillDownData = filteredBoletas.filter(b =>
                                b.equipo === labelDest ||
                                (b.items && b.items.some(i => i.destino === labelDest))
                            );
                            // Pass labelDest as equipmentFilter to show only items for this specific equipment/sector
                            this.showChartDetails(`Insumos para: ${labelDest}`, drillDownData, null, labelDest);
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.08)' },
                            ticks: { color: '#2d3748', font: { size: 11, weight: '600' } }
                        },
                        y: {
                            grid: { display: false },
                            ticks: {
                                color: '#2d3748',
                                font: { size: 11, weight: '700' },
                                padding: 8,
                                autoSkip: false // Ensure all names show
                            }
                        }
                    }
                }
            });
        }



        // Chart 4: Cost by Category (Doughnut)
        const topCategories = Object.entries(categoryStats)
            .sort((a, b) => b[1] - a[1]);

        // Robust Destroy
        const existingCost = Chart.getChart(ctxCost);
        if (existingCost) existingCost.destroy();

        this.insumosCostChart = new Chart(ctxCost, {
            type: 'doughnut',
            data: {
                labels: topCategories.map(d => d[0]),
                datasets: [{
                    data: topCategories.map(d => d[1]),
                    backgroundColor: [
                        '#33B347', '#04683A', '#FEB811', '#D7181F', '#88C336', '#231F20', '#707072', '#14b8a6', '#f97316', '#a855f7'
                    ],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 2000,
                    easing: 'easeOutBounce'
                },
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#2d3748', boxWidth: 14, font: { size: 12, weight: '600' }, padding: 18 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(context.raw);
                                return label;
                            }
                        }
                    },
                    datalabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value, ctx) => {
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            let percentage = (value * 100 / sum).toFixed(0) + "%";
                            // Only show if > 4% to avoid clutter
                            return (value * 100 / sum) > 4 ? percentage : '';
                        }
                    },
                    title: {
                        display: false, // Title already in HTML
                        text: 'Distribución por Categoría',
                        color: '#2d3748',
                        position: 'top',
                        align: 'start',
                        font: { size: 14, weight: 'bold' },
                        padding: { bottom: 10 }
                    }
                },
                onClick: (e, activeEls) => {
                    if (activeEls.length > 0) {
                        const index = activeEls[0].index;
                        const labelCat = topCategories[index][0]; // Get Category Name

                        // Filter boletas that have items in this category
                        const drillDownData = filteredBoletas.filter(b => {
                            if (!b.items) return false;
                            return b.items.some(item => getCategory(item.descripcion) === labelCat);
                        });

                        this.showChartDetails(`Detalle Categoría: ${labelCat}`, drillDownData, labelCat);
                    }
                }
            }
        });


    },

    switchMaintenanceSubTab(subTabId) {
        // Toggle sub-tab buttons
        const operativoBtn = document.getElementById('mtto-subtab-operativo');
        const analiticaBtn = document.getElementById('mtto-subtab-analitica');
        const operativoSection = document.getElementById('mtto-section-operativo');
        const analiticaSection = document.getElementById('mtto-section-analitica');

        if (subTabId === 'operativo') {
            operativoBtn.style.background = 'var(--primary)';
            operativoBtn.style.color = 'white';
            analiticaBtn.style.background = 'rgba(255,255,255,0.05)';
            analiticaBtn.style.color = 'var(--text-muted)';
            operativoSection.style.display = 'block';
            analiticaSection.style.display = 'none';
        } else if (subTabId === 'analitica') {
            analiticaBtn.style.background = 'var(--primary)';
            analiticaBtn.style.color = 'white';
            operativoBtn.style.background = 'rgba(255,255,255,0.05)';
            operativoBtn.style.color = 'var(--text-muted)';
            operativoSection.style.display = 'none';
            analiticaSection.style.display = 'block';
            // Initialize analytics when switching to it
            if (typeof MaintenanceDashboard !== 'undefined' && MaintenanceDashboard.init) {
                setTimeout(() => MaintenanceDashboard.init(), 100);
            }
        }

        // Refresh icons
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    switchTab(tabId) {
        document.querySelectorAll('.dash-tab-content').forEach(el => el.style.display = 'none');

        const targetTab = document.getElementById(`dash-${tabId}`);
        if (targetTab) {
            targetTab.style.display = 'block';
        }

        document.querySelectorAll('#view-dashboard .tab-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`dash-tab-${tabId}`);
        if (activeBtn) activeBtn.classList.add('active');

        // Update Title dynamically to reflect context
        const titleEl = document.querySelector('#view-dashboard h1');
        const descEl = document.querySelector('#view-dashboard p');

        if (titleEl && descEl) {
            if (tabId === 'mantenimiento') {
                titleEl.textContent = 'Dashboard de Seguimiento';
                descEl.textContent = 'Resumen de operaciones en tiempo real';
            } else if (tabId === 'analytics-mantenimiento') {
                titleEl.textContent = 'Analítica de Mantenimientos';
                descEl.textContent = 'Costos OPEX, secuencias y cumplimiento';
            } else if (tabId === 'labores') {
                titleEl.textContent = 'Seguimiento de Labores';
                descEl.textContent = 'Visualización de rendimiento y tareas';
            } else if (tabId === 'finanzas') {
                titleEl.textContent = 'Gestión Financiera';
                descEl.textContent = 'Análisis de costos, CAPEX y OPEX';
            } else if (tabId === 'insumos') {
                titleEl.textContent = 'Gestión de Insumos';
                descEl.textContent = 'Control de materiales y costos operativos';
            }
        }

        // Trigger Chart Updates
        if (tabId === 'mantenimiento') {
            setTimeout(() => {
                this.updateKPIs();
                this.updateCharts();
                this.updateDieselAlerts();
                // Initialize Maintenance Analytics
                if (typeof MaintenanceDashboard !== 'undefined' && MaintenanceDashboard.init) {
                    MaintenanceDashboard.init();
                }
            }, 50);
        } else if (tabId === 'analytics-mantenimiento') {
            setTimeout(() => {
                if (typeof MaintenanceDashboard !== 'undefined' && MaintenanceDashboard.render) {
                    MaintenanceDashboard.render();
                }
            }, 50);
        } else if (tabId === 'labores') {
            // REMOVED: LaboresController.init() to avoid rendering registration cards here
            setTimeout(() => this.updateLaboresCharts(), 50);
        } else if (tabId === 'finanzas') {
            setTimeout(() => this.updateFinanceCharts(), 50);
        } else if (tabId === 'insumos') {
            setTimeout(() => this.updateInsumosCharts(), 50);
        }
    },

    showChartDetails(title, data, categoryFilter = null, equipmentFilter = null) {
        const modal = document.getElementById('dashboard-detail-modal');
        const titleEl = document.getElementById('dashboard-modal-title');
        const bodyEl = document.getElementById('dashboard-modal-body');

        if (!modal || !bodyEl) return;

        titleEl.textContent = title;

        if (!data || data.length === 0) {
            bodyEl.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">No hay datos para mostrar.</p>';
            modal.style.display = 'flex';
            return;
        }

        // Generate Table
        let html = `
            <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif;">
                <thead>
                    <tr style="background: rgba(0,0,0,0.03); border-bottom: 1px solid var(--glass-border); text-align: left;">
                        <th style="padding: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Fecha</th>
                        <th style="padding: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Tipo / Equipo</th>
                        <th style="padding: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Items Relevantes</th>
                        <th style="padding: 1rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; text-align: right;">Costo</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let totalModalCost = 0;

        // Helper to check if item matches filter
        const matchesFilter = (item) => {
            if (!categoryFilter) return true;
            // Safe call check
            if (typeof this.classifyMaterial === 'function') {
                return this.classifyMaterial(item.descripcion) === categoryFilter;
            }
            return true; // Fallback if no classifier
        };

        data.forEach(b => {
            // 1. Group items by their specific destination
            const itemsByDest = {};

            // FALLBACK: Maintenance records use 'materiales', Boletas use 'items'
            const recordItems = b.items || b.materiales || [];

            // Filter all items first
            let allRelevantItems = recordItems.filter(i => matchesFilter(i));

            // Check if we specify equipmentFilter
            if (equipmentFilter) {
                allRelevantItems = allRelevantItems.filter(i => {
                    const itemDest = i.destino || b.equipo || 'N/A';
                    return itemDest === equipmentFilter;
                });
            }

            // If there are no items but it's a completed record with materials/items, return (filtered out)
            if (allRelevantItems.length === 0 && (b.items || b.materiales)) {
                // However, if we didn't specify a filter, this shouldn't happen unless the arrays are empty
                // If they are empty but it's a contractor, we continue
                if (!b.esContratista) return;
            }

            // If it's a contractor service with no items, we should still show it as a line item
            if (allRelevantItems.length === 0 && b.esContratista) {
                const dest = b.equipo || 'N/A';
                if (!itemsByDest[dest]) itemsByDest[dest] = [];
            } else {
                allRelevantItems.forEach(i => {
                    const dest = i.destino || b.equipo || 'N/A';
                    if (!itemsByDest[dest]) itemsByDest[dest] = [];
                    itemsByDest[dest].push(i);
                });
            }

            // 2. Generate a row for EACH destination group
            Object.keys(itemsByDest).forEach(dest => {
                const groupItems = itemsByDest[dest];
                const itemsCost = groupItems.reduce((acc, i) => {
                    const price = DataManager.getMaterialPrice(i.codigo) || 0;
                    return acc + (parseFloat(i.cantidad) * price);
                }, 0);

                // Add contractor cost if this is the main equipment and no specific items have destinations
                const contractorCost = (b.esContratista && dest === b.equipo) ? (parseFloat(b.contratistaCosto) || 0) : 0;
                const cost = itemsCost + contractorCost;

                totalModalCost += cost;

                const itemsSummary = groupItems.length > 0 ? groupItems.map(i => {
                    const price = DataManager.getMaterialPrice(i.codigo) || 0;
                    const itemCost = parseFloat(i.cantidad) * price;
                    return `<div style="font-size: 0.8rem; color: var(--text-main); margin-bottom: 2px; display: flex; justify-content: space-between; gap: 1rem;">
                        <span>${i.cantidad} x ${i.descripcion}</span>
                        <span style="font-weight: 600; color: #33B347;">$ ${itemCost.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>`;
                }).join('') : (b.esContratista ? `<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Servicio Técnico / Mano de Obra</div>` : '');

                const dateStr = b.fecha || b.fechaGeneracion || b.fechaProgramada || 'Sin Fecha';

                html += `
                    <tr style="border-bottom: 1px solid var(--glass-border);">
                        <td style="padding: 1rem; font-size: 0.9rem; color: var(--text-main);">${dateStr.substring(0, 10)}</td>
                        <td style="padding: 1rem;">
                            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">${dest}</div>
                            <span style="display:block; font-size: 0.75rem; color: #33B347; font-weight: 600; margin-top: 2px;">ID: ${b.id}</span>
                        </td>
                        <td style="padding: 1rem;">${itemsSummary}</td>
                        <td style="padding: 1rem; font-weight: 700; text-align: right; color: var(--text-main);">$ ${cost.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                `;
            });
        });

        html += `
                </tbody>
                <tfoot>
                    <tr style="background: rgba(51, 179, 71, 0.1);">
                        <td style="padding: 1rem; font-weight: 800; color: #33B347;" colspan="3">TOTAL SELECCIÓN</td>
                        <td style="padding: 1rem; font-weight: 800; text-align: right; color: #33B347;">$ ${totalModalCost.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                </tfoot>
            </table>
        `;

        bodyEl.innerHTML = html;
        modal.style.display = 'flex';

        // Re-init lucide
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // New: Show Details for Fuel KPIs
    showFuelDetails(type) {
        // Safety check
        if (!this.lastFilteredInsumos) {
            // Try one last time to get from manager if completely missing
            this.lastFilteredInsumos = DataManager.getBoletas();
        }
        if (!this.lastFilteredInsumos) return;

        let title = '';
        let itemsFilter = null;

        if (type === 'oil') {
            title = 'Detalle de Aceite Retirado';
            itemsFilter = (desc) => (desc.includes('ACEITE') || desc.includes('VALVULINA')) && !desc.includes('FILTRO');
        } else if (type === 'diesel') {
            title = 'Detalle de Consumo ACPM';
            itemsFilter = (desc) => desc.includes('ACPM') || desc.includes('DIESEL');
        } else if (type === 'gas') {
            title = 'Detalle de Consumo Gasolina';
            itemsFilter = (desc) => desc.includes('GASOLINA') || desc.includes('EXTRA') || desc.includes('CORRIENTE');
        }

        if (!itemsFilter) return;

        // Aggregate by Equipment + Material
        const detailsStats = {};
        let totalQty = 0;

        this.lastFilteredInsumos.forEach(b => {
            if (b.items) {
                b.items.forEach(i => {
                    const desc = i.descripcion.toUpperCase();
                    if (itemsFilter(desc)) {
                        const qty = parseFloat(i.cantidad) || 0;
                        // FIX: Prioritize item destination (e.g. 339008) over boleta header (e.g. 336816)
                        const equip = i.destino || b.equipo || 'Sin Equipo';
                        // Composite Key
                        const key = `${equip}__|__${i.codigo}__|__${i.descripcion}`;

                        if (!detailsStats[key]) detailsStats[key] = { qty: 0, equip: equip, material: i.descripcion, code: i.codigo };
                        detailsStats[key].qty += qty;
                        totalQty += qty;
                    }
                });
            }
        });

        const modal = document.getElementById('dashboard-detail-modal');
        const modalTitle = document.getElementById('dashboard-modal-title');
        const modalBody = document.getElementById('dashboard-modal-body');

        if (modal && modalTitle && modalBody) {
            modalTitle.textContent = `${title} (Total: ${totalQty.toLocaleString('en-US', { maximumFractionDigits: 1 })} gal)`;

            // Sort by Quantity
            const sorted = Object.values(detailsStats).sort((a, b) => b.qty - a.qty);

            modalBody.innerHTML = `
                <table style="width: 100%; border-collapse: collapse; font-family: 'Inter', sans-serif;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--glass-border); text-align: left;">
                            <th style="padding: 1rem; color: var(--text-muted); width: 25%;">Equipo</th>
                             <th style="padding: 1rem; color: var(--text-muted); width: 45%;">Material / Insumo</th>
                            <th style="padding: 1rem; color: var(--text-muted); text-align: right;">Cantidad (Gal)</th>
                            <th style="padding: 1rem; color: var(--text-muted); text-align: right;">% Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sorted.map(item => {
                const pct = totalQty > 0 ? ((item.qty / totalQty) * 100).toFixed(1) : 0;
                return `
                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                <td style="padding: 1rem; font-weight: 600; color: var(--text-main);">${item.equip}</td>
                                <td style="padding: 1rem; font-size: 0.9rem; color: var(--text-main);">
                                    ${item.material} 
                                    <span style="display:block; font-size: 0.75rem; color: var(--text-muted);">Cod: ${item.code || 'N/A'}</span>
                                </td>
                                <td style="padding: 1rem; text-align: right; color: var(--text-main); font-weight: 700;">${item.qty.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                                <td style="padding: 1rem; text-align: right; color: var(--text-muted); font-size: 0.85rem;">${pct}%</td>
                            </tr>
                            `;
            }).join('')}
                    </tbody>
                </table>
             `;

            modal.style.display = 'flex';
        }
    },

    classifyMaterial(desc) {
        if (!desc) return 'Otros';
        const d = desc.toUpperCase();
        if (d.includes('GLIFOSATO') || d.includes('AMINA') || d.includes('HERBICIDA')) return 'Agroquímicos';
        if (d.includes('FERTILIZANTE') || d.includes('UREA') || d.includes('DAP')) return 'Fertilizantes';
        if (d.includes('ACEITE') || d.includes('FILTRO') || d.includes('VALVULINA')) return 'Lubricantes y Filtros';
        if (d.includes('LLANTA') || d.includes('NEUMATICO')) return 'Llantas';
        if (d.includes('BATERIA')) return 'Baterías';
        if (d.includes('GASOLINA') || d.includes('ACPM') || d.includes('DIESEL')) return 'Combustible';
        if (d.includes('GUAYA') || d.includes('DISCO') || d.includes('CUCHILLA')) return 'Repuestos Menores';
        return 'Repuestos General';
    },

    /**
     * Render Intelligent Alerts
     * Generates and displays alerts using AlertsEngine
     */
    renderAlerts() {
        const container = document.getElementById('alerts-container');
        if (!container) return;

        // Get data
        const boletas = DataManager.getBoletas();
        const equipos = DataManager.getEquipos();

        // Generate alerts using AlertsEngine
        const alerts = AlertsEngine.analyzeData(boletas, equipos);

        // Get dismissed alerts from localStorage
        const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

        // Filter out dismissed alerts (dismissed within last 7 days)
        const activeAlerts = alerts.filter(alert => {
            const alertKey = `${alert.type}_${alert.equipoId || alert.data?.material || 'global'}`;
            const dismissedTime = dismissedAlerts[alertKey];
            return !dismissedTime || (now - dismissedTime) > sevenDaysMs;
        });

        // Clear container
        container.innerHTML = '';

        if (activeAlerts.length === 0) {
            container.innerHTML = `
                <div class="no-alerts-message">
                    ✅ Todo está funcionando normalmente. No hay alertas en este momento.
                </div>
            `;
            return;
        }

        // Render alerts
        activeAlerts.forEach(alert => {
            const severityClass = alert.severity === 3 ? 'alert-critical' : alert.severity === 2 ? 'alert-warning' : 'alert-info';
            const alertKey = `${alert.type}_${alert.equipoId || alert.data?.material || 'global'}`;

            const alertCard = document.createElement('div');
            alertCard.className = `alert-card ${severityClass}`;
            alertCard.innerHTML = `
                <div class="alert-icon">${alert.title.split(' ')[0]}</div>
                <div class="alert-content">
                    <h4 class="alert-title">${alert.title}</h4>
                    <p class="alert-message">${alert.message}</p>
                </div>
                <button class="alert-dismiss" onclick="DashboardController.dismissAlert('${alertKey}')" title="Descartar por 7 días">
                    <i data-lucide="x" style="width: 16px; height: 16px;"></i>
                </button>
            `;

            container.appendChild(alertCard);
        });

        // Re-initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    /**
     * Dismiss an alert for 7 days
     */
    dismissAlert(alertKey) {
        const dismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
        dismissedAlerts[alertKey] = Date.now();
        localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedAlerts));

        // Re-render alerts
        this.renderAlerts();
    }
};
