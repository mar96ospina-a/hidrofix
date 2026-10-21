/**
 * AlertsEngine - Motor de Análisis de Alertas Inteligentes
 * Detecta anomalías en costos, consumos y patrones de mantenimiento
 */
class AlertsEngine {
    /**
     * Analiza todos los datos y genera alertas relevantes
     * @param {Array} boletas - Array de boletas desde DataManager
     * @param {Array} equipos - Array de equipos desde DataManager
     * @returns {Array} Array de alertas ordenadas por severidad
     */
    static analyzeData(boletas, equipos) {
        const alerts = [];

        // Análisis de sobrecostos por equipo
        const costAlerts = this.detectCostAnomalies(boletas, equipos);
        alerts.push(...costAlerts);

        // Análisis de consumo inusual de insumos
        const consumptionAlerts = this.detectConsumptionAnomalies(boletas);
        alerts.push(...consumptionAlerts);

        // Análisis de frecuencia de mantenimiento
        const frequencyAlerts = this.detectMaintenanceFrequency(boletas, equipos);
        alerts.push(...frequencyAlerts);

        // Análisis de tendencias de costo
        const trendAlerts = this.detectCostTrends(boletas);
        alerts.push(...trendAlerts);

        // Análisis de Boletas / Documentos Pendientes de Enviar
        const pendingAlerts = this.detectPendingEmails(boletas);
        alerts.push(...pendingAlerts);

        // Ordenar por severidad (crítico > advertencia > info)
        return alerts.sort((a, b) => b.severity - a.severity).slice(0, 5); // Top 5 alertas
    }

    /**
     * Detecta equipos con sobrecostos comparado con su promedio histórico
     */
    static detectCostAnomalies(boletas, equipos) {
        const alerts = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Agrupar costos por equipo y mes
        const costsByEquipo = {};

        boletas.forEach(b => {
            const fecha = new Date(b.fecha);
            const equipo = b.equipo || b.equipoDestino || 'Sin Equipo';
            const month = fecha.getMonth();
            const year = fecha.getFullYear();
            const key = `${year}-${month}`;

            if (!costsByEquipo[equipo]) {
                costsByEquipo[equipo] = {};
            }
            if (!costsByEquipo[equipo][key]) {
                costsByEquipo[equipo][key] = 0;
            }

            // Sumar costos de items
            if (b.items) {
                b.items.forEach(item => {
                    costsByEquipo[equipo][key] += (item.cantidad || 0) * (item.precioUnitario || 0);
                });
            }
        });

        // Analizar cada equipo
        Object.keys(costsByEquipo).forEach(equipoId => {
            const months = costsByEquipo[equipoId];
            const currentKey = `${currentYear}-${currentMonth}`;
            const currentCost = months[currentKey] || 0;

            // Calcular promedio de últimos 3 meses (excluyendo el actual)
            const historicalCosts = Object.keys(months)
                .filter(k => k !== currentKey)
                .map(k => months[k])
                .slice(-3);

            if (historicalCosts.length >= 2 && currentCost > 0) {
                const avgCost = historicalCosts.reduce((a, b) => a + b, 0) / historicalCosts.length;
                const deviation = ((currentCost - avgCost) / avgCost) * 100;

                // Generar alerta si desviación > 30%
                if (deviation > 30) {
                    const equipoName = equipos.find(e => e.id === equipoId)?.nombre || equipoId;
                    const severity = deviation > 50 ? 3 : deviation > 40 ? 2 : 1;

                    alerts.push({
                        type: 'cost_anomaly',
                        severity: severity,
                        title: severity === 3 ? '🔴 Sobrecosto Crítico' : '🟡 Sobrecosto Detectado',
                        message: `Equipo ${equipoName} ha gastado $${this.formatCurrency(currentCost)} este mes (promedio: $${this.formatCurrency(avgCost)}, +${deviation.toFixed(0)}%)`,
                        equipoId: equipoId,
                        data: {
                            current: currentCost,
                            average: avgCost,
                            deviation: deviation
                        }
                    });
                }
            }
        });

        return alerts;
    }

    /**
     * Detecta consumo inusual de insumos específicos
     */
    static detectConsumptionAnomalies(boletas) {
        const alerts = [];
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Agrupar consumo por material y mes
        const consumptionByMaterial = {};

        boletas.forEach(b => {
            const fecha = new Date(b.fecha);
            const month = fecha.getMonth();
            const year = fecha.getFullYear();
            const key = `${year}-${month}`;

            if (b.items) {
                b.items.forEach(item => {
                    const material = item.descripcion || 'Material Desconocido';

                    if (!consumptionByMaterial[material]) {
                        consumptionByMaterial[material] = {};
                    }
                    if (!consumptionByMaterial[material][key]) {
                        consumptionByMaterial[material][key] = 0;
                    }

                    consumptionByMaterial[material][key] += item.cantidad || 0;
                });
            }
        });

        // Analizar cada material
        Object.keys(consumptionByMaterial).forEach(material => {
            const months = consumptionByMaterial[material];
            const currentKey = `${currentYear}-${currentMonth}`;
            const currentConsumption = months[currentKey] || 0;

            // Calcular promedio histórico
            const historicalConsumption = Object.keys(months)
                .filter(k => k !== currentKey)
                .map(k => months[k])
                .slice(-3);

            if (historicalConsumption.length >= 2 && currentConsumption > 0) {
                const avgConsumption = historicalConsumption.reduce((a, b) => a + b, 0) / historicalConsumption.length;
                const ratio = currentConsumption / avgConsumption;

                // Generar alerta si consumo > 2x promedio
                if (ratio > 2) {
                    const severity = ratio > 3 ? 3 : 2;

                    alerts.push({
                        type: 'consumption_anomaly',
                        severity: severity,
                        title: severity === 3 ? '🔴 Consumo Crítico' : '🟡 Consumo Elevado',
                        message: `${material}: ${currentConsumption.toFixed(1)} unidades este mes (promedio: ${avgConsumption.toFixed(1)}, ${ratio.toFixed(1)}x más)`,
                        data: {
                            material: material,
                            current: currentConsumption,
                            average: avgConsumption,
                            ratio: ratio
                        }
                    });
                }
            }
        });

        return alerts;
    }

    /**
     * Detecta equipos con mantenimientos muy frecuentes
     */
    static detectMaintenanceFrequency(boletas, equipos) {
        const alerts = [];
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Contar mantenimientos por equipo en últimos 7 días
        const maintenanceCount = {};

        boletas.forEach(b => {
            const fecha = new Date(b.fecha);
            if (fecha >= sevenDaysAgo && fecha <= now) {
                const equipo = b.equipo || b.equipoDestino || 'Sin Equipo';
                maintenanceCount[equipo] = (maintenanceCount[equipo] || 0) + 1;
            }
        });

        // Generar alertas para equipos con > 2 mantenimientos
        Object.keys(maintenanceCount).forEach(equipoId => {
            const count = maintenanceCount[equipoId];
            if (count > 2) {
                const equipoName = equipos.find(e => e.id === equipoId)?.nombre || equipoId;
                const severity = count > 4 ? 3 : 2;

                alerts.push({
                    type: 'maintenance_frequency',
                    severity: severity,
                    title: severity === 3 ? '🔴 Mantenimiento Excesivo' : '🟡 Alta Frecuencia',
                    message: `Equipo ${equipoName} ha tenido ${count} mantenimientos en los últimos 7 días`,
                    equipoId: equipoId,
                    data: {
                        count: count,
                        period: '7 días'
                    }
                });
            }
        });

        return alerts;
    }

    /**
     * Detecta tendencias de costo (ascendente/descendente)
     */
    static detectCostTrends(boletas) {
        const alerts = [];

        // Agrupar costos por mes
        const costsByMonth = {};

        boletas.forEach(b => {
            const fecha = new Date(b.fecha);
            const month = fecha.getMonth();
            const year = fecha.getFullYear();
            const key = `${year}-${month}`;

            if (!costsByMonth[key]) {
                costsByMonth[key] = 0;
            }

            if (b.items) {
                b.items.forEach(item => {
                    costsByMonth[key] += (item.cantidad || 0) * (item.precioUnitario || 0);
                });
            }
        });

        // Obtener últimos 3 meses
        const months = Object.keys(costsByMonth).sort().slice(-3);

        if (months.length === 3) {
            const costs = months.map(m => costsByMonth[m]);
            const firstMonth = costs[0];
            const lastMonth = costs[2];
            const trend = ((lastMonth - firstMonth) / firstMonth) * 100;

            // Generar alerta si tendencia > 20%
            if (Math.abs(trend) > 20) {
                const severity = Math.abs(trend) > 40 ? 2 : 1;
                const direction = trend > 0 ? 'aumentado' : 'disminuido';
                const icon = trend > 0 ? '📈' : '📉';

                alerts.push({
                    type: 'cost_trend',
                    severity: severity,
                    title: `${icon} Tendencia de Costos`,
                    message: `Los costos totales han ${direction} ${Math.abs(trend).toFixed(0)}% en el último trimestre`,
                    data: {
                        trend: trend,
                        firstMonth: firstMonth,
                        lastMonth: lastMonth
                    }
                });
            }
        }

        return alerts;
    }

    /**
     * Formatea números como moneda
     */
    /**
     * Detecta boletas y documentos que no han sido enviados por correo
     */
    static detectPendingEmails(boletas) {
        const alerts = [];

        // 1. Boletas de Aplicación Manuales
        const pendingBoletas = (boletas || []).filter(b => b.tipo === 'APLICACION' && !b.sentEmail);
        if (pendingBoletas.length > 0) {
            alerts.push({
                type: 'pending_email_boletas',
                severity: 2,
                title: '📧 Boletas Pendientes',
                message: `Hay ${pendingBoletas.length} boletas de aplicación pendientes por enviar por correo`,
                data: { count: pendingBoletas.length }
            });
        }

        // 2. Planes de Mantenimiento con Materiales
        try {
            const planes = JSON.parse(localStorage.getItem('hidrofix_planes_v2') || '[]');
            const pendingPlanes = planes.filter(p =>
                p.estado === 'REALIZADO' &&
                !p.sentEmail &&
                ((p.recursos && p.recursos.length > 0) || (p.repuestos && p.repuestos.length > 0))
            );

            if (pendingPlanes.length > 0) {
                alerts.push({
                    type: 'pending_email_planes',
                    severity: 2,
                    title: '🛠️ Mantenimientos Pendientes',
                    message: `Hay ${pendingPlanes.length} mantenimientos realizados con retiro de materiales pendientes por enviar`,
                    data: { count: pendingPlanes.length }
                });
            }
        } catch (e) { console.error("AlertsEngine: Error checking planes", e); }

        // 3. Reportes de Labor
        try {
            const labores = JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]');
            const pendingLabores = labores.filter(l => !l.sentEmail);

            if (pendingLabores.length > 0) {
                alerts.push({
                    type: 'pending_email_labores',
                    severity: 1,
                    title: '📄 Reportes de Labor Pendientes',
                    message: `Hay ${pendingLabores.length} reportes de labor diaria pendientes por enviar`,
                    data: { count: pendingLabores.length }
                });
            }
        } catch (e) { console.error("AlertsEngine: Error checking labores", e); }

        return alerts;
    }
}
