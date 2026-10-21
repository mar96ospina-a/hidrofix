/**
 * RecycleBinController.js
 * Manages the global recycle bin view and actions.
 */
const RecycleBinController = {
    init() {
        console.log("Initializing RecycleBinController...");
        this.renderTable();          // pinta la caché local al instante
        this.refreshFromCloud();     // y refresca desde la nube
    },

    async refreshFromCloud() {
        if (typeof DataManager.getRecycleBinFromServer === 'function') {
            await DataManager.getRecycleBinFromServer();
            this.renderTable();
        }
    },

    renderTable() {
        const container = document.getElementById('recycle-bin-content');
        if (!container) return;

        const bin = DataManager.getRecycleBin();

        let html = `
            <div class="glass-panel" style="overflow-x: auto;">
                <table class="modern-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Descripción / ID</th>
                            <th>Fecha Eliminación</th>
                            <th>Eliminado Por</th>
                            <th style="text-align: right;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        if (bin.length === 0) {
            html += `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">La papelera está vacía</td></tr>`;
        } else {
            bin.forEach(item => {
                let desc = '-';
                let icon = 'file';

                // Determine description based on type
                if (item._originalType === 'PLAN') {
                    desc = `Plan Mantenimiento: ${item.codigo} - ${item.equipo}`;
                    icon = 'calendar-clock';
                } else if (item._originalType === 'LABOR') {
                    desc = `Labor: ${item.tecnico} - ${item.labor || item.tarea} (${item.fecha})`;
                    icon = 'clipboard-list';
                } else if (item._originalType === 'EQUIPO') {
                    desc = `Equipo: ${item.nombre} (${item.id})`;
                    icon = 'truck';
                } else if (item._originalType === 'MATERIAL') {
                    desc = `Material: ${item.descripcion} (${item.codigo})`;
                    icon = 'box';
                }

                html += `
                    <tr class="table-row">
                        <td>
                            <span class="status-badge status-inactive">
                                <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
                                ${item._originalType}
                            </span>
                        </td>
                        <td>${desc}</td>
                        <td>${item._deletedAt || '-'}</td>
                        <td>${item._deletedBy || '-'}</td>
                        <td style="text-align: right;">
                            <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: none;" 
                                onclick="RecycleBinController.restore('${item._deletedId}')">
                                <i data-lucide="rotate-ccw" style="width: 14px; margin-right: 4px;"></i> Restaurar
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div>`;
        container.innerHTML = html;

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    async restore(trashId) {
        if (confirm("¿Desea restaurar este elemento a su ubicación original?")) {
            const success = await DataManager.restoreFromTrash(trashId);
            if (success) {
                this.renderTable();
                alert("Elemento restaurado correctamente.");
            } else {
                alert("Error al restaurar el elemento.");
            }
        }
    },

    async emptyTrash() {
        if (confirm("¿Está SEGURO de vaciar la papelera? Esta acción borrará PERMANENTEMENTE todos los elementos eliminados.")) {
            await DataManager.emptyRecycleBin();
            this.renderTable();
            alert("Papelera vaciada.");
        }
    }
};

window.RecycleBinController = RecycleBinController;
