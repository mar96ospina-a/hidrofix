const AuditoriaController = {
    init() {
        console.log("AuditoriaController Initialized");
        this.render();
    },

    render() {
        const view = document.getElementById('view-auditoria');
        if (!view) return;

        view.innerHTML = `
            <div class="header-section">
                <h1><i data-lucide="shield-alert"></i> Auditoría de Mantenimiento</h1>
                <div class="actions">
                     <input type="text" id="audit-search" placeholder="Buscar en registros..." class="form-input" onkeyup="AuditoriaController.filterLogs()">
                     <select id="audit-filter-type" class="form-select" onchange="AuditoriaController.filterLogs()">
                        <option value="">Todas las Acciones</option>
                        <option value="CREAR">Creación</option>
                        <option value="EDITAR">Edición</option>
                        <option value="ELIMINAR">Eliminación</option>
                        <option value="LOGIN">Acceso</option>
                     </select>
                </div>
            </div>
            
            <div class="card">
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Fecha/Hora</th>
                                <th>Usuario</th>
                                <th>Módulo</th>
                                <th>Acción</th>
                                <th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody id="audit-logs-body">
                            <!-- Logs will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        lucide.createIcons();
        this.loadLogs();
    },

    loadLogs() {
        // Mock data for now, pending DataManager implementation
        const logs = DataManager.getAuditLogs ? DataManager.getAuditLogs() : [];
        const tbody = document.getElementById('audit-logs-body');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay registros de auditoría disponibles.</td></tr>';
            return;
        }

        // Sort by date desc
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.usuario || 'Sistema'}</td>
                <td><span class="badge badge-info">${log.modulo}</span></td>
                <td><span class="badge ${this.getActionColor(log.accion)}">${log.accion}</span></td>
                <td>${log.detalle}</td>
            `;
            tbody.appendChild(row);
        });
    },

    getActionColor(action) {
        switch (action) {
            case 'CREAR': return 'badge-success';
            case 'ELIMINAR': return 'badge-danger';
            case 'EDITAR': return 'badge-warning';
            default: return 'badge-secondary';
        }
    },

    filterLogs() {
        const searchTerm = document.getElementById('audit-search').value.toLowerCase();
        const filterType = document.getElementById('audit-filter-type').value;
        const rows = document.querySelectorAll('#audit-logs-body tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const type = row.querySelector('td:nth-child(4)').textContent;

            const matchSearch = text.includes(searchTerm);
            const matchType = filterType === '' || type === filterType;

            row.style.display = matchSearch && matchType ? '' : 'none';
        });
    }
};

window.AuditoriaController = AuditoriaController;
