const ProgramacionController = {
    selectedDate: null,

    init() {
        console.log("ProgramacionController initialized");
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        this.selectedDate = tomorrow;
    },

    loadView() {
        this.setupDateSelector();
        this.resetMessage();
    },

    setupDateSelector() {
        const dateInput = document.getElementById('programacion-date');
        if (!dateInput) return;

        // Set default to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;

        this.selectedDate = tomorrow;
    },

    setQuickDate(offset) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        this.selectedDate = d;

        const dateInput = document.getElementById('programacion-date');
        if (dateInput) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }

        this.resetMessage();
    },

    onDateChange() {
        const dateInput = document.getElementById('programacion-date');
        if (!dateInput || !dateInput.value) return;

        const parts = dateInput.value.split('-');
        this.selectedDate = new Date(parts[0], parts[1] - 1, parts[2]);
        this.resetMessage();
    },

    resetMessage() {
        const textarea = document.getElementById('programacion-texto');
        const previewContainer = document.getElementById('programacion-preview');
        if (!textarea) return;

        // Use selected date or default to tomorrow
        const d = this.selectedDate || new Date();
        if (!this.selectedDate) {
            d.setDate(d.getDate() + 1);
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const targetISO = `${year}-${month}-${day}`;

        // Fetch Plans for selected date (Pending/Programmed)
        const allPlanes = DataManager.getPlanes().filter(p =>
            p.fechaProgramada === targetISO && (p.estado === 'PENDIENTE' || p.estado === 'PROGRAMADO')
        );

        // Group by type
        const preventivos = [];
        const correctivos = [];
        const diarias = [];

        allPlanes.forEach(p => {
            const tipo = (p.tipo || '').toUpperCase();
            if (tipo.includes('CORRECTIVO')) {
                correctivos.push(p);
            } else if (tipo.includes('DIARIAS') || tipo.includes('DIARIA')) {
                diarias.push(p);
            } else {
                preventivos.push(p);
            }
        });

        const totalCount = allPlanes.length;

        // Build Header with counter
        let msg = `Programación del día Recursos Hídricos (${day}/${month}/${year})`;
        if (totalCount > 0) {
            msg += ` - ${totalCount} actividad${totalCount !== 1 ? 'es' : ''}:\n\n`;
        } else {
            msg += `:\n\n`;
        }

        // Build message with grouping
        if (preventivos.length > 0) {
            msg += `🔧 MANTENIMIENTOS PREVENTIVOS (${preventivos.length}):\n`;
            preventivos.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable ? ` (${p.responsable})` : '';
                msg += `- ${code}: ${desc}${responsable}\n`;
            });
            msg += '\n';
        }

        if (correctivos.length > 0) {
            msg += `🛠️ MANTENIMIENTOS CORRECTIVOS (${correctivos.length}):\n`;
            correctivos.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable ? ` (${p.responsable})` : '';
                msg += `- ${code}: ${desc}${responsable}\n`;
            });
            msg += '\n';
        }

        if (diarias.length > 0) {
            msg += `📋 LABORES DIARIAS (${diarias.length}):\n`;
            diarias.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable ? ` (${p.responsable})` : '';
                msg += `- ${code}: ${desc}${responsable}\n`;
            });
            msg += '\n';
        }

        if (totalCount === 0) {
            msg += `(Sin mantenimientos programados para esta fecha)\n`;
        }

        // Set to Textarea
        textarea.value = msg;

        // Update visual preview
        this.updatePreview(preventivos, correctivos, diarias, totalCount);
    },

    updatePreview(preventivos, correctivos, diarias, totalCount) {
        const previewContainer = document.getElementById('programacion-preview');
        if (!previewContainer) return;

        if (totalCount === 0) {
            previewContainer.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i data-lucide="calendar-x" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <p>No hay actividades programadas para esta fecha</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        let html = '';

        // Preventivos
        if (preventivos.length > 0) {
            html += `<div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: var(--primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🔧</span> MANTENIMIENTOS PREVENTIVOS (${preventivos.length})
                </h3>
                <div style="display: grid; gap: 0.5rem;">`;

            preventivos.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable || '';
                html += `
                    <div class="glass-panel" style="padding: 0.75rem; border-left: 3px solid var(--primary);">
                        <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem;">${code}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${desc}</div>
                        ${responsable ? `<div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">👤 ${responsable}</div>` : ''}
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Correctivos
        if (correctivos.length > 0) {
            html += `<div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: #f59e0b; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>🛠️</span> MANTENIMIENTOS CORRECTIVOS (${correctivos.length})
                </h3>
                <div style="display: grid; gap: 0.5rem;">`;

            correctivos.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable || '';
                html += `
                    <div class="glass-panel" style="padding: 0.75rem; border-left: 3px solid #f59e0b;">
                        <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem;">${code}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${desc}</div>
                        ${responsable ? `<div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">👤 ${responsable}</div>` : ''}
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        // Diarias
        if (diarias.length > 0) {
            html += `<div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 0.9rem; font-weight: 600; color: #8b5cf6; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>📋</span> LABORES DIARIAS (${diarias.length})
                </h3>
                <div style="display: grid; gap: 0.5rem;">`;

            diarias.forEach(p => {
                const code = (p.equipo || '').split(' - ')[0].trim();
                const desc = p.descripcion || p.labor || 'Sin descripción';
                const responsable = p.responsable || '';
                html += `
                    <div class="glass-panel" style="padding: 0.75rem; border-left: 3px solid #8b5cf6;">
                        <div style="font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem;">${code}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted);">${desc}</div>
                        ${responsable ? `<div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;">👤 ${responsable}</div>` : ''}
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        previewContainer.innerHTML = html;
        lucide.createIcons();
    },

    sendWhatsApp() {
        const textarea = document.getElementById('programacion-texto');
        if (!textarea) return;

        const msg = textarea.value;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    }
};

window.ProgramacionController = ProgramacionController;
