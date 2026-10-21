// CalendarController.js

const CalendarController = {
    currentDate: new Date(),

    init() {
        this.populateEquiposFilter();
        this.render();
    },

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    },

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    },

    goToToday() {
        this.currentDate = new Date();
        this.render();
    },

    exportToICS() {
        try {
            const planes = DataManager.getPlanes();
            const equipos = DataManager.getEquipos();

            if (planes.length === 0) {
                alert('No hay eventos para exportar.');
                return;
            }

            // Get filter values to export only filtered events
            const equipoFilter = document.getElementById('calendar-filter-equipo')?.value || '';
            const estadoFilter = document.getElementById('calendar-filter-estado')?.value || '';

            let filteredPlanes = [...planes];

            // Apply equipo filter
            if (equipoFilter) {
                filteredPlanes = filteredPlanes.filter(p => p.equipo === equipoFilter);
            }

            // Apply estado filter with special handling
            if (estadoFilter) {
                if (estadoFilter === 'PROGRAMADO') {
                    filteredPlanes = filteredPlanes.filter(p => {
                        if (p.estado !== 'PENDIENTE') return false;
                        const parts = p.fechaProgramada.split('-');
                        const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const diffTime = pDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays >= 0;
                    });
                } else if (estadoFilter === 'VENCIDO') {
                    filteredPlanes = filteredPlanes.filter(p => {
                        if (p.estado !== 'PENDIENTE') return false;
                        const parts = p.fechaProgramada.split('-');
                        const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const diffTime = pDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays < 0;
                    });
                } else {
                    filteredPlanes = filteredPlanes.filter(p => p.estado === estadoFilter);
                }
            }

            if (filteredPlanes.length === 0) {
                alert('No hay eventos que coincidan con los filtros actuales.');
                return;
            }

            // Generate iCalendar content
            let icsContent = 'BEGIN:VCALENDAR\r\n';
            icsContent += 'VERSION:2.0\r\n';
            icsContent += 'PRODID:-//Hidrofix Manager//Calendar//ES\r\n';
            icsContent += 'CALSCALE:GREGORIAN\r\n';
            icsContent += 'METHOD:PUBLISH\r\n';
            icsContent += 'X-WR-CALNAME:Mantenimientos Hidrofix\r\n';
            icsContent += 'X-WR-TIMEZONE:America/Bogota\r\n';

            filteredPlanes.forEach(plan => {
                const equipo = equipos.find(e => e.id === plan.equipo);
                const equipoNombre = equipo ? equipo.nombre : plan.equipo || 'Sin equipo';

                // Format date for iCalendar (YYYYMMDD)
                const fechaParts = plan.fechaProgramada.split('-');
                const fechaICS = `${fechaParts[0]}${fechaParts[1]}${fechaParts[2]}`;

                // Generate timestamp
                const now = new Date();
                const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

                icsContent += 'BEGIN:VEVENT\r\n';
                icsContent += `UID:plan-${plan.id}@hidrofix.com\r\n`;
                icsContent += `DTSTAMP:${timestamp}\r\n`;
                icsContent += `DTSTART;VALUE=DATE:${fechaICS}\r\n`;
                icsContent += `SUMMARY:${equipoNombre} - ${plan.descripcion || 'Mantenimiento'}\r\n`;

                // Description with details
                let description = `Equipo: ${equipoNombre}\\n`;
                description += `Descripción: ${plan.descripcion || 'Sin descripción'}\\n`;
                description += `Estado: ${plan.estado || 'PENDIENTE'}\\n`;
                if (plan.labor) description += `Labor: ${plan.labor}\\n`;
                if (plan.responsable) description += `Responsable: ${plan.responsable}\\n`;
                icsContent += `DESCRIPTION:${description}\r\n`;

                // Location
                icsContent += `LOCATION:${equipoNombre}\r\n`;

                // Status
                if (plan.estado === 'REALIZADO') {
                    icsContent += 'STATUS:CONFIRMED\r\n';
                } else if (plan.estado === 'CANCELADO') {
                    icsContent += 'STATUS:CANCELLED\r\n';
                } else {
                    icsContent += 'STATUS:TENTATIVE\r\n';
                }

                icsContent += 'END:VEVENT\r\n';
            });

            icsContent += 'END:VCALENDAR\r\n';

            // Create and download file
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);

            // Generate filename with current date
            const today = new Date();
            const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            link.download = `hidrofix-mantenimientos-${dateStr}.ics`;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            alert(`✅ Archivo exportado exitosamente!\n\n${filteredPlanes.length} evento(s) exportado(s).\n\nPuedes importar este archivo en:\n• Microsoft Outlook\n• Google Calendar\n• Apple Calendar`);
        } catch (e) {
            alert("Error al exportar calendario: " + e.message);
            console.error(e);
        }
    },

    clearFilters() {
        const equipoFilter = document.getElementById('calendar-filter-equipo');
        const estadoFilter = document.getElementById('calendar-filter-estado');
        if (equipoFilter) equipoFilter.value = '';
        if (estadoFilter) estadoFilter.value = '';
        this.render();
    },

    populateEquiposFilter() {
        const select = document.getElementById('calendar-filter-equipo');
        if (!select) {
            console.warn('Calendar filter equipo select not found');
            return;
        }

        const equipos = DataManager.getEquipos();
        const planes = DataManager.getPlanes();

        console.log('Populating equipos filter:', { equiposCount: equipos.length, planesCount: planes.length });

        // Get unique equipos that have plans
        const equiposWithPlans = new Set();
        planes.forEach(p => {
            if (p.equipo) equiposWithPlans.add(p.equipo);
        });

        console.log('Equipos with plans:', equiposWithPlans.size);

        // Clear existing options except first
        select.innerHTML = '<option value="">Todos los Equipos</option>';

        // Create array of equipos with their names for sorting
        const equipoOptions = [];
        equiposWithPlans.forEach(equipoId => {
            const equipo = equipos.find(e => e.id === equipoId);
            const nombre = equipo ? (equipo.nombre || equipoId) : equipoId;
            equipoOptions.push({
                id: equipoId,
                nombre: nombre || 'Sin nombre'
            });
        });

        // Sort alphabetically by name (with null safety)
        equipoOptions.sort((a, b) => {
            const nameA = String(a.nombre || '');
            const nameB = String(b.nombre || '');
            return nameA.localeCompare(nameB);
        });

        // Add sorted options
        equipoOptions.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.nombre;
            select.appendChild(option);
        });

        console.log('Equipos filter populated with', equipoOptions.length, 'options');
    },

    render() {
        try {
            const grid = document.getElementById('calendar-grid');
            const monthYearLabel = document.getElementById('calendar-month-year');
            if (!grid || !monthYearLabel) return;

            // Get filter values
            const equipoFilter = document.getElementById('calendar-filter-equipo')?.value || '';
            const estadoFilter = document.getElementById('calendar-filter-estado')?.value || '';

            // Clear grid
            grid.innerHTML = `
             <div class="cal-header">Dom</div>
             <div class="cal-header">Lun</div>
             <div class="cal-header">Mar</div>
             <div class="cal-header">Mié</div>
             <div class="cal-header">Jue</div>
             <div class="cal-header">Vie</div>
             <div class="cal-header">Sáb</div>
        `;

            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();

            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            monthYearLabel.innerText = `${monthNames[month]} ${year}`;

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            // Empty slots
            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'cal-day empty';
                grid.appendChild(empty);
            }

            // Days
            const planes = DataManager.getPlanes();
            const equipos = DataManager.getEquipos();

            // Counters
            let counterProgramado = 0;
            let counterVencido = 0;
            let counterRealizado = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                dayCell.className = 'cal-day glass-panel';

                // Highlight today
                const today = new Date();
                if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    dayCell.classList.add('today');
                }

                dayCell.innerHTML = `<div style="font-weight: bold; margin-bottom: 0.5rem; font-size: var(--font-size-small);">${day}</div>`;

                // Find events for this day
                const checkDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                let dayPlans = planes.filter(p => p.fechaProgramada === checkDate);

                // Apply equipo filter
                if (equipoFilter) {
                    dayPlans = dayPlans.filter(p => p.equipo === equipoFilter);
                }

                // Apply estado filter with special handling
                if (estadoFilter) {
                    if (estadoFilter === 'PROGRAMADO') {
                        // Show only PENDIENTE events that are on time (not vencido)
                        dayPlans = dayPlans.filter(p => {
                            if (p.estado !== 'PENDIENTE') return false;
                            const parts = p.fechaProgramada.split('-');
                            const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const diffTime = pDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays >= 0; // Only future or today
                        });
                    } else if (estadoFilter === 'VENCIDO') {
                        // Show only PENDIENTE events that are vencido
                        dayPlans = dayPlans.filter(p => {
                            if (p.estado !== 'PENDIENTE') return false;
                            const parts = p.fechaProgramada.split('-');
                            const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const diffTime = pDate - today;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays < 0; // Only past
                        });
                    } else {
                        // REALIZADO or PENDIENTE (all)
                        dayPlans = dayPlans.filter(p => p.estado === estadoFilter);
                    }
                }

                dayPlans.forEach(p => {
                    const event = document.createElement('div');
                    event.className = 'cal-event';

                    // Click: Navigate to plan
                    event.onclick = () => {
                        navigate('planes');
                        PlanesController.loadForm(p.id);
                    };

                    let eventClass = '';
                    if (p.estado === 'REALIZADO') {
                        eventClass = 'realizado';
                        counterRealizado++;
                    } else if (p.estado === 'PENDIENTE') {
                        // Check date for color
                        const parts = p.fechaProgramada.split('-');
                        const pDate = new Date(parts[0], parts[1] - 1, parts[2]);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const diffTime = pDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays >= 0) {
                            eventClass = 'programado';
                            counterProgramado++;
                        } else if (diffDays >= -15) {
                            eventClass = 'vencido-grace';
                            counterVencido++;
                        } else {
                            eventClass = 'vencido-critico';
                            counterVencido++;
                        }
                    }

                    event.classList.add(eventClass);

                    const equipoName = (p.equipo || 'S/E').split('-')[0];
                    const descBrief = (p.descripcion || '').substring(0, 15);
                    event.innerText = `${equipoName} ${descBrief}...`;

                    // Add tooltip
                    const equipoFull = equipos.find(e => e.id === p.equipo);
                    const equipoNombre = equipoFull ? equipoFull.nombre : p.equipo;
                    event.title = `${equipoNombre}\n${p.descripcion || 'Sin descripción'}\nEstado: ${p.estado}`;

                    dayCell.appendChild(event);
                });

                grid.appendChild(dayCell);
            }

            // Update counters
            const counterProgramadoEl = document.getElementById('counter-programado');
            const counterVencidoEl = document.getElementById('counter-vencido');
            const counterRealizadoEl = document.getElementById('counter-realizado');

            if (counterProgramadoEl) counterProgramadoEl.textContent = counterProgramado;
            if (counterVencidoEl) counterVencidoEl.textContent = counterVencido;
            if (counterRealizadoEl) counterRealizadoEl.textContent = counterRealizado;

            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (e) {
            alert("Error Calendario: " + e.message);
            console.error(e);
        }
    }
};
