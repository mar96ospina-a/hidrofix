/**
 * ConfigController.js
 * Manages system configuration, master lists, and backup/restore.
 */
const ConfigController = {
    currentTab: 'personal',

    init() {
        console.log("ConfigController initialized.");
        this.renderTabs();
        this.loadTab(this.currentTab);
    },

    renderTabs() {
        const tabsContainer = document.getElementById('config-tabs');
        if (!tabsContainer) return;

        const tabs = [
            { id: 'personal', label: 'PERSONAL' },
            { id: 'ubicaciones', label: 'UBICACIONES' },
            { id: 'cargos', label: 'CARGOS' },
            { id: 'respaldo', label: 'RESPALDO' }
        ];

        tabsContainer.innerHTML = tabs.map(t => `
            <button class="tab-btn ${this.currentTab === t.id ? 'active' : ''}" 
                    onclick="ConfigController.switchTab('${t.id}')">
                ${t.label}
            </button>
        `).join('');
    },

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.config-tab-btn').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById('config-tab-' + tabId);
        if (btn) btn.classList.add('active');
        this.renderTabs();
        this.loadTab(tabId);
    },

    loadTab(tabId) {
        const content = document.getElementById('config-content');
        if (!content) return;

        switch (tabId) {
            case 'personal':
                this.renderPersonal(content);
                break;
            case 'ubicaciones':
                this.renderUbicaciones(content);
                break;
            case 'cargos':
                this.renderCargos(content);
                break;
            case 'respaldo':
                this.renderRespaldo(content);
                break;
        }
    },

    // --- RENDER METHODS ---

    renderPersonal(container) {
        const personal = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');

        container.innerHTML = `
            <div class="card-header">
                <h3>Gestionar Personal</h3>
                <button onclick="ConfigController.addPersonal()" class="btn-primary">+ Nuevo</button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Cargo</th>
                        <th>Teléfono</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${personal.map((p, index) => `
                        <tr>
                            <td>${p.nombre || p.name || 'Sin nombre'}</td>
                            <td>${p.cargo}</td>
                            <td>${p.telefono || '-'}</td>
                            <td>
                                <button onclick="ConfigController.editPersonal(${index})" class="btn-icon edit" style="margin-right: 8px; color: #0ea5e9;">
                                    <i data-lucide="edit-3"></i>
                                </button>
                                <button onclick="ConfigController.deletePersonal(${index})" class="btn-icon delete">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        lucide.createIcons();
    },

    renderUbicaciones(container) {
        const ubicaciones = JSON.parse(localStorage.getItem('hidrofix_ubicaciones') || '[]');

        container.innerHTML = `
            <div class="card-header">
                <h3>Gestionar Ubicaciones</h3>
                <button onclick="ConfigController.addUbicacion()" class="btn-primary">+ Nueva</button>
            </div>
            <ul class="list-group">
                ${ubicaciones.map((u, index) => `
                    <li class="list-item">
                        <span>${u}</span>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="ConfigController.editUbicacion(${index})" class="btn-icon edit" style="color: #0ea5e9;">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button onclick="ConfigController.deleteUbicacion(${index})" class="btn-icon delete">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
        lucide.createIcons();
    },

    renderCargos(container) {
        const cargos = JSON.parse(localStorage.getItem('hidrofix_cargos') || '[]');

        container.innerHTML = `
            <div class="card-header">
                <h3>Gestionar Cargos</h3>
                <button onclick="ConfigController.addCargo()" class="btn-primary">+ Nuevo</button>
            </div>
            <ul class="list-group">
                ${cargos.map((c, index) => `
                    <li class="list-item">
                        <span>${typeof c === 'object' ? (c.nombre || c.name || 'Cargo sin nombre') : c}</span>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="ConfigController.editCargo(${index})" class="btn-icon edit" style="color: #0ea5e9;">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button onclick="ConfigController.deleteCargo(${index})" class="btn-icon delete">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;
        lucide.createIcons();
    },

    renderRespaldo(container) {
        container.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center;">
                <h3 style="color: var(--primary); margin-bottom: 2rem;">COPIA DE SEGURIDAD Y RESTAURACIÓN</h3>
                <p style="color: #666; margin-bottom: 2rem;">Descarga una copia completa de tus datos (Equipos, Planes, Reportes, Personal, Materiales, Usuarios) o restaura una copia anterior.</p>
                
                <div style="display: flex; gap: 2rem; justify-content: center; flex-wrap: wrap;">
                    <div style="text-align: center;">
                        <div style="font-size: 3rem; color: #10B981; margin-bottom: 1rem;">
                            <i data-lucide="download"></i>
                        </div>
                        <h4 style="margin-bottom: 1rem;">CREAR RESPALDO</h4>
                        <button onclick="ConfigController.downloadBackup()" class="btn-primary" style="background: #10B981; border: none; padding: 0.75rem 1.5rem;">
                            DESCARGAR ARCHIVO .JSON
                        </button>
                    </div>

                    <div style="text-align: center;">
                        <div style="font-size: 3rem; color: var(--brand-blue); margin-bottom: 1rem;">
                            <i data-lucide="upload"></i>
                        </div>
                        <h4 style="margin-bottom: 1rem;">RESTAURAR DATOS</h4>
                        <input type="file" id="restoreFile" accept=".json" style="display: none;" onchange="ConfigController.restoreBackup(this)">
                        <button onclick="document.getElementById('restoreFile').click()" class="btn-secondary" style="padding: 0.75rem 1.5rem;">
                            SELECCIONAR ARCHIVO .JSON
                        </button>
                    </div>
                </div>

                <div style="margin-top: 3rem; padding: 1rem; background: #FFF7ED; border: 1px solid #FFE4E6; border-radius: 8px; color: #C2410C;">
                    <strong>Nota Importante:</strong><br>
                    Al restaurar, se reemplazarán los datos actuales por los del archivo seleccionado. Asegúrate de guardar cualquier cambio reciente antes de restaurar.
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    // --- ACTIONS ---

    addPersonal() {
        const nombre = prompt("Nombre del colaborador:");
        if (!nombre) return;

        const cargo = prompt("Cargo:");
        const telefono = prompt("Teléfono (Opcional):");

        const personal = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');
        personal.push({ nombre, cargo, telefono });
        localStorage.setItem('hidrofix_personal', JSON.stringify(personal));
        this.renderPersonal(document.getElementById('config-content'));
    },

    deletePersonal(index) {
        if (!confirm("¿Eliminar este registro?")) return;
        const personal = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');
        personal.splice(index, 1);
        localStorage.setItem('hidrofix_personal', JSON.stringify(personal));
        this.renderPersonal(document.getElementById('config-content'));
    },

    editPersonal(index) {
        const personal = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');
        const p = personal[index];
        if (!p) return;

        const nombre = prompt("Editar nombre:", p.nombre || p.name || "");
        if (nombre === null) return;

        const cargo = prompt("Editar cargo:", p.cargo || "");
        const telefono = prompt("Editar teléfono:", p.telefono || "");

        personal[index] = { ...p, nombre, cargo, telefono: telefono || '-' };
        localStorage.setItem('hidrofix_personal', JSON.stringify(personal));
        this.renderPersonal(document.getElementById('config-content'));
    },

    addUbicacion() {
        const nombre = prompt("Nueva Ubicación:");
        if (!nombre) return;
        const ubicaciones = JSON.parse(localStorage.getItem('hidrofix_ubicaciones') || '[]');
        ubicaciones.push(nombre);
        localStorage.setItem('hidrofix_ubicaciones', JSON.stringify(ubicaciones));
        this.renderUbicaciones(document.getElementById('config-content'));
    },

    deleteUbicacion(index) {
        if (!confirm("¿Eliminar esta ubicación?")) return;
        const ubicaciones = JSON.parse(localStorage.getItem('hidrofix_ubicaciones') || '[]');
        ubicaciones.splice(index, 1);
        localStorage.setItem('hidrofix_ubicaciones', JSON.stringify(ubicaciones));
        this.renderUbicaciones(document.getElementById('config-content'));
    },

    editUbicacion(index) {
        const ubicaciones = JSON.parse(localStorage.getItem('hidrofix_ubicaciones') || '[]');
        const current = ubicaciones[index];

        const nuevo = prompt("Editar ubicación:", current);
        if (nuevo === null || !nuevo.trim()) return;

        ubicaciones[index] = nuevo.trim();
        localStorage.setItem('hidrofix_ubicaciones', JSON.stringify(ubicaciones));
        this.renderUbicaciones(document.getElementById('config-content'));
    },

    addCargo() {
        const nombre = prompt("Nuevo Cargo:");
        if (!nombre) return;
        const cargos = JSON.parse(localStorage.getItem('hidrofix_cargos') || '[]');
        cargos.push(nombre);
        localStorage.setItem('hidrofix_cargos', JSON.stringify(cargos));
        this.renderCargos(document.getElementById('config-content'));
    },

    deleteCargo(index) {
        if (!confirm("¿Eliminar este cargo?")) return;
        const cargos = JSON.parse(localStorage.getItem('hidrofix_cargos') || '[]');
        cargos.splice(index, 1);
        localStorage.setItem('hidrofix_cargos', JSON.stringify(cargos));
        this.renderCargos(document.getElementById('config-content'));
    },

    editCargo(index) {
        const cargos = JSON.parse(localStorage.getItem('hidrofix_cargos') || '[]');
        const current = cargos[index];
        const currentNombre = typeof current === 'object' ? (current.nombre || current.name) : current;

        const nuevo = prompt("Editar cargo:", currentNombre);
        if (nuevo === null || !nuevo.trim()) return;

        if (typeof current === 'object') {
            cargos[index] = { ...current, nombre: nuevo.trim() };
        } else {
            cargos[index] = nuevo.trim();
        }

        localStorage.setItem('hidrofix_cargos', JSON.stringify(cargos));
        this.renderCargos(document.getElementById('config-content'));
    },

    // --- BACKUP & RESTORE ---

    downloadBackup() {
        const backupData = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            // Core Data
            equipos: localStorage.getItem('hidrofix_equipos'),
            planes: localStorage.getItem('hidrofix_planes_v2'), // Corrected to v2
            boletas: localStorage.getItem('hidrofix_boletas_v2'), // Corrected to v2
            labores: localStorage.getItem('hidrofix_labores_reportes'), // Corrected to reportes
            // Master Lists
            personal: localStorage.getItem('hidrofix_personal'),
            ubicaciones: localStorage.getItem('hidrofix_ubicaciones'),
            cargos: localStorage.getItem('hidrofix_cargos'),
            materiales: localStorage.getItem('hidrofix_materiales_v3'), // Added Materiales
            sectores: localStorage.getItem('hidrofix_sectores_suerte'), // Added Sectores
            // Extra
            usuarios: localStorage.getItem('hidrofix_usuarios'), // Added Users
            capex: localStorage.getItem('hidrofix_capex') // Added CAPEX
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_hidrofix_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    restoreBackup(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const data = JSON.parse(e.target.result);

                // Restore all keys explicitly
                if (data.equipos) localStorage.setItem('hidrofix_equipos', data.equipos);

                // DATA MIGRATION ON RESTORE: Handle both old and new backup formats
                if (data.planes) localStorage.setItem('hidrofix_planes_v2', data.planes);
                else if (data['v1_Planes']) localStorage.setItem('hidrofix_planes_v2', data['v1_Planes']); // Legacy support

                if (data.boletas) localStorage.setItem('hidrofix_boletas_v2', data.boletas);
                else if (data['v1_Boletas']) localStorage.setItem('hidrofix_boletas_v2', data['v1_Boletas']); // Legacy support

                if (data.labores) localStorage.setItem('hidrofix_labores_reportes', data.labores);
                else if (data['v1_Labores']) localStorage.setItem('hidrofix_labores_reportes', data['v1_Labores']); // Legacy support

                if (data.personal) localStorage.setItem('hidrofix_personal', data.personal);
                if (data.ubicaciones) localStorage.setItem('hidrofix_ubicaciones', data.ubicaciones);
                if (data.cargos) localStorage.setItem('hidrofix_cargos', data.cargos);

                // Restore new modules
                if (data.materiales) localStorage.setItem('hidrofix_materiales_v3', data.materiales);
                if (data.sectores) localStorage.setItem('hidrofix_sectores_suerte', data.sectores);
                if (data.usuarios) localStorage.setItem('hidrofix_usuarios', data.usuarios);
                if (data.capex) localStorage.setItem('hidrofix_capex', data.capex);

                alert('Datos restaurados correctamente. La página se recargará.');
                window.location.reload();
            } catch (err) {
                console.error('Restore error:', err);
                alert('Error al restaurar el archivo. Asegúrate de que es un respaldo válido.');
            }
        };
        reader.readAsText(file);
    },

    saveServerUrl() {
        const url = prompt("Introduce la URL del servidor (ej: http://192.168.1.10:3000):");
        if (url) {
            localStorage.setItem('hidrofix_server_url', url);
            alert("URL guardada. Recarga la página.");
        }
    }
};
