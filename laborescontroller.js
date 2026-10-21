const LaboresController = {
    // State
    // State
    currentStep: 'tecnicos', // 'tecnicos', 'tareas', 'formulario'
    selectedTecnico: null,
    selectedTarea: null,
    selectedMateriales: [],
    editingReportId: null, // Track if we are editing
    currentTareasTab: 'LISTA', // 'LISTA' or 'HISTORIAL'

    // Data Storage
    reportes: [],
    deletedReports: [],

    // Mock Data
    // Data is now fetched from DataManager
    currentTareasTab: 'LISTA', // 'LISTA' or 'HISTORIAL'


    tareas: [
        { id: 1, nombre: "Mantenimiento Tableros Electrónicos" },
        { id: 2, nombre: "Recorrido de podas" },
        { id: 3, nombre: "Revisión de horómetros" },
        { id: 4, nombre: "Derivaciones" },
        { id: 5, nombre: "Tareas Diarias" },
        { id: 6, nombre: "Bitácora Mecánica" }
    ],

    // SECTOR_SUERTE: Moved to DataManager
    // Data for Smart Form
    STATION_DATA: {
        "BOMBEO LUISA 1": {
            "Zona 1": ["336501 - BOMBA ELEC VERTICAL No.01", "336502 - BOMBA ELEC VERTICAL No.02", "336503 - BOMBA ELEC VERTICAL No.03", "336504 - BOMBA ELEC VERTICAL No.04", "336505 - BOMBA ELEC VERTICAL No.05", "336507 - BOMBA ELEC VERTICAL No.07", "336531 - BOMBA ELEC VERTICAL No.31", "336534 - BOMBA ELEC VERTICAL No.34", "336601 - BOMBA ELEC FLUJO MIXTO No.01", "336607 - BOMBA ELEC FLUJO MIXTO No.07", "336619 - BOMBA ELEC FLUJO MIXTO No.19", "336401 - MOTOBOMBA DIESEL No.1", "336002 - EQUIPO LISTER No.2", "336904 - BOMBA DIESEL HIDROAXIAL No.04", "336702 - BOMBA DIESEL HIDROMIXTA No.2"]
        },
        "BOMBEO LUISA 2": {
            "Zona 1": ["336540 - BOMBA ELECTRICA VERTICAL No.40", "336558 - BOMBA ELEC VERTICAL No.58", "336591 - BOMBA ELEC HORIZONTAL No. 91", "336604 - BOMBA ELEC FLUJO MIXTO No.04", "336610 - BOMBA ELEC FLUJO MIXTO No.10"]
        },
        "BOMBEO SUERTE 140": {
            "Zona 2": ["336543 - BOMBA ELEC VERTICAL No.43", "336546 - BOMBA ELEC VERTICAL NO.46"]
        },
        "DRENAJE SUERTE 140": {
            "Zona 2": ["336599 - BOMBA ELEC HORIZONTAL No. 99"]
        },
        "BOMBEO VENECIA": {
            "Zona 2": ["336544 - BOMBA ELEC VERTICAL No.44", "336545 - BOMBA ELEC VERTICAL No.45", "336555 - BOMBA ELEC VERTICAL No.55", "336422 - MOTOBOMBA DIESEL No.22", "336407 - MOTOBOMBA DIESEL No.7"]
        },
        "BOMBEO LA ENCANECADA": {
            "Zona 2": ["336550 - BOMBA ELEC VERTICAL No.50", "336551 - BOMBA ELEC VERTICAL No.51", "336804 - BOMBA ELEC HIDROAXIAL No.04", "336810 - BOMBA ELEC HIDROAXIAL No.10", "332001 - DRAGA VALDIVIA NO.01", "336416 - MOTOBOMBA DIESEL No.16", "336907 - BOMBA DIESEL HIDROAXIAL NO.07"]
        },
        "BOMBEO EL MATEO": {
            "Zona 2": ["336561 - BOMBA ELEC VERTICAL No.61", "336564 - BOMBA ELEC VERTICAL No.64", "336567 - BOMBA ELEC VERTICAL No.67", "336570 - BOMBA ELEC VERTICAL No.70", "336701 - BOMBA DIESEL FLUJO MIXTO No.01", "337301 - FLOTANTE DIESEL No.01", "336594 - BOMBA ELECTRICA VERTICAL NO.94"]
        },
        "BOMBEO LOS CHIVOS": {
            "Zona 2": ["336573 - BOMBA ELEC VERTICAL No.73", "337001 - FLOTANTE ELECTRICA No.1", "337004 - FLOTANTE ELECTRICA No.4"]
        },
        "BOMBEO EL DURÁN": {
            "Zona 2": ["336576 - BOMBA ELEC VERTICAL No.76", "336585 - BOMBA ELEC VERTICAL No.85", "336613 - BOMBA ELEC FLUJO MIXTO No.13", "336616 - BOMBA ELEC FLUJO MIXTO No.16", "336816 - BOMBA ELEC HIDROAXIAL No.16", "336598 - BOMBA ELEC VERTICAL No.98", "336679 - BOMBA ELEC FLUJO MIXTO No. 79", "336682 - BOMBA ELEC FLUJO MIXTO No. 82", "336688 - BOMBA ELEC FLUJO MIXTO No. 88", "331002 - TRACTOR CASE FARMALL 75 HP", "336410 - MOTOBOMBA DIESEL No.10", "336910 - BOMBA DIESEL HIDROAXIAL No.10", "336001 - EQUIPO LISTER No.1", "336003 - EQUIPO LISTER No.3", "336579 - BOMBA ELEC VERTICAL NO.79", "336582 - BOMBA ELEC VERTICAL No.82", "336588 - BOMBA ELEC VERTICAL No.88"]
        },
        "BOMBEO SAN ALFONSO": {
            "Zona 2": ["336597 - BOMBA ELEC VERTICAL No.97", "336813 - BOMBA ELEC HIDROAXIAL No.13"]
        },
        "BOMBEO LAGUNAS 1": {
            "Zona 1": ["336601 - BOMBA ELEC FLUJO MIXTO No.01", "336607 - BOMBA ELEC FLUJO MIXTO No.07"]
        },
        "BOMBEO LAGUNAS 2": {
            "Zona 1": ["336604 - BOMBA ELEC FLUJO MIXTO No.04", "336610 - BOMBA ELEC FLUJO MIXTO No.10"]
        },
        "BOMBEO LA RANCHERA": {
            "Zona 1": ["336619 - BOMBA ELEC FLUJO MIXTO No.19", "336413 - MOTOBOMBA DIESEL No.13", "336904 - BOMBA DIESEL HIDROAXIAL No.04", "336519 - BOMBA ELEC VERTICAL NO.19"]
        },
        "BOMBEO LAGUNAS NORTE": {
            "Zona 1": ["337010 - FLOTANTE ELEC CENTRIFUGA No.10"]
        },
        "BOMBEO LAGUNAS CENTRO": {
            "Zona 1": ["337011 - FLOTANTE ELEC CENTRIFUGA No.11"]
        },
        "BOMBEO LAGUNAS SUR": {
            "Zona 1": ["337012 - FLOTANTE ELEC CENTRIFUGA No.12"]
        },
        "BOMBEO ZANJÓN NEGRO": {
            "Zona 2": ["337702 - BOMBA ELEC HORIZONTAL No. 02", "337703 - BOMBA ELEC HORIZONTAL No. 03"]
        },
        "BOMBEO BOCATOMA": {
            "Zona 1": ["336401 - MOTOBOMBA DIESEL No.1", "336625 - BOMBA ELEC FLUJO MIXTO No.25"]
        },
        "CAMPAMENTO LA LUISA": {
            "Zona 1": ["331001 - TRACTOR CASE FARMALL 75 HP", "331425 - TRACTOR CASE QUANTUM 65V"]
        },
        "BOMBEO LA ISLA": {
            "Zona 1": ["336428 - MOTOBOMBA DIESEL No.28", "336628 - BOMBA ELECTRICA CENTRIFUGA No.28"]
        },
        "POZO TEQUENDAMA": {
            "Zona 2": ["337501 - MOTOBOMBA ELEC SUMERGIBLE POZO No. 1"]
        },
        "LOS MANGOS": {
            "Zona 0": ["336203 - BOMBA ELEC HORIZONATAL No.01"]
        }
    },

        getFilteredPersonal() {
        const allowed = ['JESUS ALVAREZ GIRALDO', 'JHONNIER ANDRES RAYO', 'JORGE LUIS ARICAPA'];
        return DataManager.getPersonal().filter(t => {
            const n = (t.name || t.nombre || '').trim().toUpperCase();
            return allowed.includes(n);
        });
    },

    init() {
        // DEBUG: Trace execution
        console.log("LaboresController.init() CALLED");
        const container = document.getElementById('labores-content');
        if (!container) console.error("CRITICAL: labores-content container NOT FOUND");

        this.loadFromStorage();
        this.renderTecnicos();

        // Listen for updates from MaterialesController
        window.addEventListener('materials-updated', () => {
            if (this.currentStep === 'formulario') {
                this.refreshMaterialOptions();
            }
        });
    },

    renderHeader(activeTab) {
        return `
            <div style="display: flex; gap: 1rem; margin-bottom: 2rem; border-bottom: 1px solid var(--glass-border);">
                <button class="tab-btn ${activeTab === 'registro' ? 'active' : ''}" 
                        onclick="LaboresController.goToTecnicos()" 
                        style="padding: 0.8rem 1.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Registrar Labor
                </button>
                <button class="tab-btn ${activeTab === 'historial' ? 'active' : ''}" 
                        onclick="LaboresController.renderReportes()" 
                        style="padding: 0.8rem 1.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                    Historial de Reportes
                </button>
            </div>
        `;
    },


    loadFromStorage() {
        const storedReports = localStorage.getItem('hidrofix_labores_reportes');
        const storedDeleted = localStorage.getItem('hidrofix_labores_deleted');

        if (storedReports) {
            this.reportes = JSON.parse(storedReports);
            console.log(`[DEBUG] Loaded ${this.reportes.length} reports from storage.`);
        } else {
            console.log("[DEBUG] No reports in storage.");
        }
        if (storedDeleted) {
            this.deletedReports = JSON.parse(storedDeleted);
        }
    },

    saveToStorage() {
        try {
            console.log(`[DEBUG] Saving ${this.reportes.length} reports to storage...`);
            localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(this.reportes));
            localStorage.setItem('hidrofix_labores_deleted', JSON.stringify(this.deletedReports));
        } catch (e) {
            console.error("Critical Error Saving Labores:", e);
            alert("� ️ ERROR CRÍTICO: No se pudo guardar el reporte. El almacenamiento está lleno. Por favor borre datos antiguos.");
            throw e; // Re-throw so saveReport knows it failed
        }
    },

    // Navigation Logic
    goToTecnicos() {
        this.currentStep = 'tecnicos';
        this.selectedTecnico = null;
        this.selectedTarea = null;
        this.editingReportId = null; // Clear edit mode
        this.currentMode = null; // Reset mode
        this.renderTecnicos();
    },

    selectModeForTecnico(tecnicoId) {
        const tecnicos = this.getFilteredPersonal().filter(t => ['JESUS ALVAREZ GIRALDO', 'JHONNIER ANDRES RAYO', 'JORGE LUIS ARICAPA'].includes(t.name.trim().toUpperCase()));
        const tecnico = tecnicos.find(t => String(t.id) === String(tecnicoId));
        if (!tecnico) return;

        this.selectedTecnico = tecnico;

        // CHECK: Only Jhonnier needs the Propio/Contratista selection
        // Others (Jorge, Jesus, etc.) go directly to tasks
        const tName = (tecnico.name || tecnico.nombre || '').toUpperCase();
        if (!tName.includes('JHONNIER') && String(tecnico.id) !== '103') {
            this.setModeAndGo('PROPIO'); // Default mode for others
            return;
        }

        const container = document.getElementById('labores-content');
        if (!container) return;

        // Custom Selection Overlay (similar to Maintenance)
        container.innerHTML = `
            <div style="animation: fadeIn 0.3s ease;">
                <button class="btn-icon" onclick="LaboresController.goToTecnicos()" style="margin-bottom: 1rem;">
                    <i data-lucide="arrow-left"></i> Volver
                </button>
                
                <h2 style="text-align: center; margin-bottom: 2rem; color: var(--text-main);">
                    Seleccione Tipo de Labor para <span style="color: var(--secondary);">${tecnico.name}</span>
                </h2>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; max-width: 800px; margin: 0 auto;">
                    <!-- Option 1: Propio -->
                    <div class="glass-panel mode-card" onclick="LaboresController.setModeAndGo('PROPIO')"
                        style="padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;">
                        <div style="width: 80px; height: 80px; background: rgba(51, 179, 71, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #33B347;">
                            <i data-lucide="user" size="40"></i>
                        </div>
                        <div style="text-align: center;">
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #33B347;">Propio</h3>
                            <p style="color: var(--text-muted);">Personal interno de la empresa.</p>
                        </div>
                    </div>

                    <!-- Option 2: Contratista -->
                    <div class="glass-panel mode-card" onclick="LaboresController.setModeAndGo('CONTRATISTA')"
                        style="padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; cursor: pointer; transition: all 0.2s; border: 2px solid transparent;">
                        <div style="width: 80px; height: 80px; background: rgba(4, 104, 58, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #04683A;">
                            <i data-lucide="briefcase" size="40"></i>
                        </div>
                        <div style="text-align: center;">
                            <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem; color: #04683A;">Contratista</h3>
                            <p style="color: var(--text-muted);">Apoyo externo o servicios contratados.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    setModeAndGo(mode) {
        this.currentMode = mode;
        this.goToTareas(this.selectedTecnico.id);
    },

    goToTareas(tecnicoId) {
        this.currentStep = 'tareas';
        this.currentTareasTab = 'LISTA'; // Reset to task list by default
        const tecnicos = this.getFilteredPersonal().filter(t => ['JESUS ALVAREZ GIRALDO', 'JHONNIER ANDRES RAYO', 'JORGE LUIS ARICAPA'].includes(t.name.trim().toUpperCase()));
        this.selectedTecnico = tecnicos.find(t => String(t.id) === String(tecnicoId));
        this.renderTareas();
    },

    goToFormulario(tareaNombre) {
        this.currentStep = 'formulario';
        this.selectedTarea = tareaNombre;
        this.selectedMateriales = []; // Reset materials
        this.selectedBitacoraEquipos = []; // Reset multi-equipments
        this.editingReportId = null; // Reset editing mode
        this.renderFormulario();
    },

    // Render Methods
    renderTecnicos() {
        const container = document.getElementById('labores-content');
        if (!container) return;

        // Get fresh list from DataManager
        let tecnicos = this.getFilteredPersonal();

        // REDUNDANCY CHECK: If list is empty, force self-healing and retry
        if (tecnicos.length === 0) {
            console.warn("LaboresController: No technicians found. Forcing DataManager healing...");
            // Manually trigger the healing logic from DataManager
            const defaults = [
                { id: 101, name: "Admin User", cargo: "Administrador", role: "ADMIN" },
                { id: 102, name: "Jorge Luis Aricapa", cargo: "Soldador", role: "TECNICO" },
                { id: 103, name: "Jhonnier Andres Rayo", cargo: "Eléctrico", role: "TECNICO" },
                { id: 105, name: "Jesus Alvarez Giraldo", cargo: "Mecánico", role: "TECNICO" }
            ];

            // Critical Rescue
            const existing = this.getFilteredPersonal();
            defaults.forEach(def => {
                if (!existing.some(e => String(e.id) === String(def.id))) {
                    existing.push(def);
                }
            });
            DataManager.savePersonal(existing);

            // Fetch again
            tecnicos = this.getFilteredPersonal();
        }

        let html = `
            ${this.renderHeader('registro')}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <h3 style="color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
                    Seleccione un Técnico para iniciar
                </h3>
            </div>
            <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: fadeIn 0.3s ease;">
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
        `;

        // Sort alphabetically
        tecnicos.sort((a, b) => {
            const nameA = (a.name || a.nombre || '').toUpperCase();
            const nameB = (b.name || b.nombre || '').toUpperCase();
            return nameA.localeCompare(nameB);
        });

        tecnicos.forEach(tech => {
            const displayName = tech.name || tech.nombre || 'Sin Nombre';
            const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            html += `
                <div class="glass-panel" onclick="LaboresController.selectModeForTecnico('${tech.id}')" 
                     style="padding: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; cursor: pointer; transition: transform 0.2s, background 0.2s;">
                    <div style="width: 60px; height: 60px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; color: white;">
                        ${initials}
                    </div>
                    <div style="text-align: center;">
                        <h4 style="margin: 0; font-size: 1rem;">${displayName}</h4>
                        <span style="color: var(--text-muted); font-size: 0.8rem;">${tech.cargo || 'Técnico'}</span>
                    </div>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;
        this.addHoverEffects();
    },

    renderTareas() {
        const container = document.getElementById('labores-content');
        if (!container) return;

        let html = `
            <div style="display: flex; flex-direction: column; gap: 1.5rem; animation: slideIn 0.3s ease;">
                <!-- Header with Back Button and Info -->
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <button onclick="LaboresController.goToTecnicos()" class="btn-icon">
                            <i data-lucide="arrow-left"></i>
                        </button>
                        <div>
                            <h3 style="margin: 0; color: var(--secondary);">Panel de Usuario</h3>
                            <span style="color: var(--text-muted); font-size: 0.85rem;">Técnico: ${this.selectedTecnico.name || this.selectedTecnico.nombre}</span>
                        </div>
                    </div>
                    <div style="padding: 0.4rem 1rem; background: rgba(255,255,255,0.05); border-radius: 2rem; border: 1px solid var(--glass-border);">
                        <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">MODO: ${this.currentMode}</span>
                    </div>
                </div>

                <!-- Tabs for Tasks / History -->
                <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 0px;">
                    <button class="tab-btn ${this.currentTareasTab === 'LISTA' ? 'active' : ''}" 
                            onclick="LaboresController.switchTareasTab('LISTA')"
                            style="padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600;">
                        <i data-lucide="list" style="width: 14px; margin-right: 6px; vertical-align: middle;"></i> REGISTRAR TAREAS
                    </button>
                    <button class="tab-btn ${this.currentTareasTab === 'HISTORIAL' ? 'active' : ''}" 
                            onclick="LaboresController.switchTareasTab('HISTORIAL')"
                            style="padding: 0.7rem 1.2rem; font-size: 0.85rem; font-weight: 600;">
                        <i data-lucide="history" style="width: 14px; margin-right: 6px; vertical-align: middle;"></i> HISTORIAL PERSONAL
                    </button>
                </div>

                <div id="tareas-content-area">
        `;

        if (this.currentTareasTab === 'LISTA') {
            html += `
                <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
            `;

            // Filter tasks based on Technician ID
            // Filter tasks based on Technician ID
            // IDs updated to match DataManager reference (102=Jorge, 103=Jhonnier)
            let specificTasks = [];

            // Check by ID or Name for robustness
            const tId = this.selectedTecnico.id;
            const tName = (this.selectedTecnico.name || this.selectedTecnico.nombre || '').toUpperCase();

            // --- SPECIAL LAYOUT LOGIC ---
            // Helper to safely match names
            const nameContains = (name, substring) => (name || '').toUpperCase().includes(substring);

            if (String(tId) === '103' || nameContains(tName, 'JHONNIER')) {
                // --- JHONNIER SPECIAL LAYOUT ---
                // Monthly Tasks: IDs 1 (Tableros), 2 (Podas), 3 (Horómetros)
                const monthlyTaskIds = [1, 2, 3];
                const monthlyTasks = this.tareas.filter(t => monthlyTaskIds.includes(t.id));
                const otherTasks = this.tareas.filter(t => !monthlyTaskIds.includes(t.id) && t.id !== 5 && t.id !== 6); // Exclude Tareas Diarias and Bitácora

                // Helper to check if task is pending for current month
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();

                const isPending = (taskId) => {
                    const hasReport = this.reportes.some(r => {
                        const rDate = new Date(r.fecha + 'T00:00:00');
                        return (String(r.tecnico).toUpperCase() === tName) &&
                            r.labor === this.tareas.find(t => t.id === taskId).nombre &&
                            rDate.getMonth() === currentMonth &&
                            rDate.getFullYear() === currentYear;
                    });
                    return !hasReport;
                };

                // RENDER MONTHLY TASKS
                if (monthlyTasks.length > 0) {
                    html += `<div style="margin-top: 5px; margin-bottom: 5px; font-size: 0.75rem; font-weight: bold; color: var(--text-muted); letter-spacing: 0.05em;">TAREAS MENSUALES</div>`;
                    monthlyTasks.forEach(tarea => {
                        const pending = isPending(tarea.id);
                        const statusBadge = pending
                            ? `<span style="background: rgba(254, 184, 17, 0.2); color: #FEB811; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(254, 184, 17, 0.3);">� ️ Pendiente Mes</span>`
                            : `<span style="background: rgba(51, 179, 71, 0.2); color: #33B347; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(51, 179, 71, 0.3);">✔ Completado</span>`;

                        html += `
                            <div class="glass-panel" onclick="LaboresController.goToFormulario('${tarea.nombre}')"
                                 style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-left: 3px solid ${pending ? '#FEB811' : '#33B347'}; margin-bottom: 0.5rem;">
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <span style="font-weight: 500;">${tarea.nombre}</span>
                                    <div>${statusBadge}</div>
                                </div>
                                <i data-lucide="chevron-right" color="var(--text-muted)"></i>
                            </div>
                            `;
                    });
                }

                // RENDER OTHER TASKS
                if (otherTasks.length > 0) {
                    html += `<div style="margin-top: 15px; margin-bottom: 5px; font-size: 0.75rem; font-weight: bold; color: var(--text-muted); letter-spacing: 0.05em;">OTRAS LABORES</div>`;
                    otherTasks.forEach(tarea => {
                        html += `
                            <div class="glass-panel" onclick="LaboresController.goToFormulario('${tarea.nombre}')"
                                 style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-left: 3px solid var(--secondary); margin-bottom: 0.5rem;">
                                <span style="font-weight: 500;">${tarea.nombre}</span>
                                <i data-lucide="chevron-right" color="var(--text-muted)"></i>
                            </div>
                            `;
                    });
                }

            } else {
                // --- STANDARD LAYOUT FOR OTHERS ---
                if (nameContains(tName, 'JESUS') || String(tId) === '105') {
                    // Jesus: Bitácora only
                    specificTasks = this.tareas.filter(t => t.id === 6);
                } else if (nameContains(tName, 'JORGE') || String(tId) === '102') {
                    // Jorge: Tareas Diarias only
                    specificTasks = this.tareas.filter(t => t.id === 5);
                } else {
                    // Default fallback: Show All Tasks EXCEPT Bitácora (ID 6)
                    specificTasks = this.tareas.filter(t => t.id !== 6);
                }

                specificTasks.forEach(tarea => {
                    html += `
                            <div class="glass-panel" onclick="LaboresController.goToFormulario('${tarea.nombre}')"
                                 style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; border-left: 3px solid var(--secondary);">
                                <span style="font-weight: 500;">${tarea.nombre}</span>
                                <i data-lucide="chevron-right" color="var(--text-muted)"></i>
                            </div>
                        `;
                });
            }
            html += `</div>`;
        } else {
            html += this.renderHistorialTecnico();
        }

        html += `</div></div>`;
        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    switchTareasTab(tab) {
        this.currentTareasTab = tab;
        this.renderTareas();
    },

    renderHistorialTecnico() {
        const tName = (this.selectedTecnico.name || this.selectedTecnico.nombre || '').toUpperCase();
        const history = this.reportes.filter(r => String(r.tecnico).toUpperCase() === tName);

        let html = `
            <div style="animation: fadeIn 0.3s ease;">
            <div class="table-container" style="max-height: 500px; overflow-y: auto;">
                <table class="data-table data-table-hover">
                    <thead>
                        <tr>
                            <th style="text-align: center;">Fecha</th>
                            <th style="text-align: center;">Técnico</th>
                            <th style="text-align: center;">Tarea</th>
                            <th style="text-align: center;">Ubicación</th>
                            <th style="text-align: center;">Hora Inicio</th>
                            <th style="text-align: center;">Hora Fin</th>
                            <th style="text-align: center;">Costo Mat.</th>
                            <th style="text-align: center;">Estado</th>
                            <th style="text-align: center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

        if (history.length === 0) {
            html += `<tr><td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-muted);">No has registrado labores aún.</td></tr>`;
        } else {
            history.sort((a, b) => b.id - a.id).forEach(rep => {
                // Ensure ID is unique/valid
                const tecnicoName = rep.tecnico || 'Desconocido'; // Use rep.tecnico for this context

                html += `
                        <tr class="table-row" onclick="LaboresController.showBoletaModal(${rep.id})" style="cursor: pointer;">
                            <td style="text-align: center;">${rep.fecha}</td>
                            <td style="font-weight: 500; color: #f8fafc; text-align: center;">${tecnicoName}</td>
                            <td style="text-align: center;">${rep.labor || rep.tarea}</td>
                            <td style="font-size: 0.85rem; text-align: center;">${rep.estacion || rep.zona || rep.ubicacion || '-'}</td>
                            <td style="text-align: center;">${rep.horaInicio || '-'}</td>
                            <td style="text-align: center;">${rep.horaFin || '-'}</td>
                            <td style="font-family: monospace; font-weight: 600; text-align: center;">$${(rep.costoMateriales || 0).toLocaleString()} <span onclick="event.stopPropagation(); LaboresController.toggleEmailStatus(${rep.id}, ${!rep.sentEmail})" title="${rep.sentEmail ? 'Enviado: ' + (rep.emailDate || '') : 'Pendiente'}" style="color: ${rep.sentEmail ? '#10b981' : '#ef4444'}; margin-left: 8px; cursor: pointer; display: inline-flex; align-items: center; transition: all 0.2s;" onmouseover="this.style.transform='scale(1.2)';" onmouseout="this.style.transform='scale(1)';"><i data-lucide="${rep.sentEmail ? 'mail-check' : 'mail'}" size="18" stroke-width="2.5"></i></span></td>
                            <td style="text-align: center;">
                                ${this.getStatusBadge(rep)}
                            </td>
                            <td style="text-align: center;">
                                <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                    <button class="btn-icon" onclick="event.stopPropagation(); LaboresController.editReport(${rep.id})" 
                                        style="color: #FEB811;" title="Editar">
                                        <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                                    </button>
                                    <button class="btn-icon" onclick="event.stopPropagation(); LaboresController.deleteReport(${rep.id})" 
                                        style="color: #D7181F;" title="Eliminar">
                                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
            });
        }

        html += `</tbody></table></div></div>`;
        return html;
    },

    renderFormulario() {
        const container = document.getElementById('labores-content');
        if (!container) return;

        const stations = Object.keys(this.STATION_DATA);

        // Generate Material Options for Datalist
        const allMaterials = DataManager.getAllMaterials();
        const materialOptions = allMaterials.map(m =>
            `<option value="${m.codigo} - ${m.descripcion}">`
        ).join('');

        const isDerivaciones = this.selectedTarea === "Derivaciones";
        const isPoda = this.selectedTarea === "Recorrido de podas";
        const isHorometro = this.selectedTarea === "Revisión de horómetros";
        const isTareasDiarias = this.selectedTarea === "Tareas Diarias";
        const isBitacora = this.selectedTarea === "Bitácora Mecánica";

        let html = `
            <div style="animation: slideIn 0.3s ease; max-width: 900px; margin: 0 auto;">
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 2rem;">
                    <button onclick="LaboresController.goToTareas(${this.selectedTecnico.id})" class="btn-icon">
                         <i data-lucide="arrow-left"></i>
                    </button>
                    <div style="width: 100%; text-align: center;">
                        <h3 style="margin: 0; color: var(--primary);">Registrar Labor</h3>
                        <span style="color: var(--text-muted); font-size: 0.85rem;">${this.selectedTarea} - ${this.selectedTecnico.nombre}</span>
                        
                        <datalist id="materiales-list">
                            ${materialOptions}
                        </datalist>
                        <datalist id="ubicaciones-list">
                            ${DataManager.getUbicaciones().map(s => `<option value="${s.nombre}">`).join('')}
                        </datalist>
                        
                        <!-- Datalist for Bitácora Equipment (Full List) -->
                        <datalist id="equipos-full-list">
                            ${DataManager.getEquipos().map(e => `<option value="${e.codigo} - ${e.descripcion}">`).join('')}
                        </datalist>
                    </div>
                </div>

                <div class="glass-panel" style="padding: 2rem;">
                    <form onsubmit="event.preventDefault(); LaboresController.saveReport();">
        `;

        if (isBitacora) {
            // --- BITÁCORA MECÁNICA FORM ---
            html += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                     <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Fecha Inicio</label>
                        <input type="date" id="bit-fecha-inicio" class="input-dark" style="width: 100%;" required>
                    </div>
                    <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Hora Inicio</label>
                        <input type="time" id="bit-hora-inicio" class="input-dark" style="width: 100%;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Fecha Fin</label>
                        <input type="date" id="bit-fecha-fin" class="input-dark" style="width: 100%;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Hora Fin</label>
                        <input type="time" id="bit-hora-fin" class="input-dark" style="width: 100%;">
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Equipos / Maquinaria</label>
                    <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                         <input type="text" id="bit-equipo-search" list="equipos-full-list" class="input-dark" 
                           placeholder="Buscar y seleccionar equipo..." 
                           style="flex: 1;">
                         <button class="btn" style="background: var(--secondary); color: white;" onclick="LaboresController.addBitacoraEquipo(document.getElementById('bit-equipo-search').value); document.getElementById('bit-equipo-search').value='';">
                            <i data-lucide="plus"></i> Añadir
                         </button>
                    </div>
                </div>

                <div id="bit-equipos-cards-container" style="display: flex; flex-direction: column; gap: 1.5rem; margin-bottom: 2rem;">
                    <!-- Cards will be injected here -->
                    <div id="bit-no-equipos-msg" style="text-align: center; color: var(--text-muted); padding: 2rem; border: 1px dashed var(--glass-border); border-radius: 0.5rem;">
                        No se han seleccionado equipos. Añada uno arriba.
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Tipo de Mantenimiento</label>
                    <select id="bit-tipo-mant" class="input-dark" style="width: 100%;" required>
                        <option value="998- MANTENIMIENTO PREVENTIVO">998- MANTENIMIENTO PREVENTIVO</option>
                        <option value="999-MANTENIMIENTO CORRECTIVO">999-MANTENIMIENTO CORRECTIVO</option>
                    </select>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Sistemas Afectados</label>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                        <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="MOTOR" style="accent-color: var(--primary);"> Motor
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="HIDRAULICO" style="accent-color: var(--primary);"> Hidráulico
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="ELECTRICO" style="accent-color: var(--primary);"> Eléctrico
                        </label>
                         <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="TRANSMISION" style="accent-color: var(--primary);"> Transmisión
                        </label>
                        <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="LLANTAS" style="accent-color: var(--primary);"> Llantas
                        </label>
                         <label style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.9rem;">
                            <input type="checkbox" name="bit-sistema" value="OTROS" style="accent-color: var(--primary);"> Otros
                        </label>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem; text-align: center;">Acciones Realizadas / Descripción</label>
                    <textarea id="labor-descripcion" class="input-dark" style="width: 100%; height: 100px; resize: vertical;" placeholder="Describa el trabajo realizado..."></textarea>
                </div>


                <div class="form-group" style="margin-bottom: 1.5rem;">
                     <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Estado Final</label>
                     <select id="bit-estado" class="input-dark" style="width: 100%;" required>
                        <option value="EJECUTADO">Ejecutado (Finalizado)</option>
                        <option value="EN PROCESO">En Proceso</option>
                        <option value="PENDIENTE">Pendiente</option>
                    </select>
                </div>

                <!-- Global Materials Section Removed as per User Request (Now per Card) -->

                <!-- Evidencia (Fotos) Section -->
                <div class="form-group" style="margin-bottom: 1.5rem;">
                     <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Evidencia (Fotos)</label>
                     <div style="border: 2px dashed var(--glass-border); padding: 2rem; border-radius: 0.5rem; text-align: center;">
                        <input type="file" id="bit-evidencia" multiple accept="image/*" style="display: none;" onchange="document.getElementById('evidencia-label').innerText = this.files.length + ' archivos seleccionados'">
                        <label for="bit-evidencia" style="cursor: pointer; color: var(--primary); display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
                            <i data-lucide="camera" style="width: 24px; height: 24px;"></i>
                            <span id="evidencia-label">Subir Fotos / Tomar Foto</span>
                        </label>
                     </div>
                </div>
            `;
        } else {
            html += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Fecha</label>
                        <input type="date" id="labor-fecha" class="input-dark" style="width: 100%;" required>
                    </div>
                            
                            ${!isPoda && !isDerivaciones && !isTareasDiarias ? `
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Estación de Bombeo</label>
                                <select id="sel-station" class="input-dark" style="width: 100%;" onchange="LaboresController.handleStationChange(this.value)" required>
                                    <option value="">Seleccione Estación...</option>
                                    ${stations.map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                            ` : ``
                }

                             ${isTareasDiarias ? `
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Tipo de Intervención</label>
                                <select id="sel-tipo-intervencion" class="input-dark" style="width: 100%;" 
                                        onchange="LaboresController.handleInterventionTypeChange(this.value)" required>
                                    <option value="EQUIPO" selected>INTERVENCIÓN EN EQUIPO</option>
                                    <option value="SUERTE">INTERVENCIÓN EN SECTOR SUERTE</option>
                                </select>
                            </div>
                            ` : ``
                }

                             ${isPoda || isDerivaciones ? `
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Ubicación (GPS)</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" id="poda-coords" class="input-dark" style="width: 100%;" placeholder="Coordenadas o ubicación manual...">
                                    <button type="button" class="btn" style="background: var(--secondary); color: white; padding: 0 1rem;" onclick="LaboresController.getGPS()">
                                        <i data-lucide="map-pin"></i>
                                    </button>
                                </div>
                                <a id="link-map" href="#" target="_blank" style="display: none; font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">Ver en Mapa</a>
                            </div>
                            ` : ''
                }
                        </div>
            `;
        }

        if (!isBitacora) {
            // --- STANDARD SECTIONS (Derivaciones, Sector Suerte, Station/Zone for Diarias) ---

            if (isDerivaciones) {
                html += `
                        <div class="form-group" style="margin-bottom: 1rem;">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Derivación</label>
                                <input type="text" id="dev-nombre" class="input-dark" style="width: 100%;" placeholder="Nombre o ID de derivación" required>
                        </div>
                `;
            }

            if (isTareasDiarias) {
                html += `
                        <div id="wrapper-sector-suerte" style="display: none; margin-bottom: 1rem;">
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Sector Suerte</label>
                                <select id="sel-sector-suerte" class="input-dark" style="width: 100%;">
                                    <option value="">Seleccione Sector...</option>
                                    ${DataManager.getSectoresSuerte().map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>

                        <!-- ZONA SOLICITANTE (NEW) -->
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Zona Solicitante</label>
                            <select id="sel-zona-solicitante" class="input-dark" style="width: 100%;">
                                <option value="">Seleccione Solicitante...</option>
                                <option value="Zona 1: Leonardo Andres Lopez">Zona 1: Leonardo Andres Lopez</option>
                                <option value="Zona 2: Walter Hernando Bermudez">Zona 2: Walter Hernando Bermudez</option>
                            </select>
                        </div>

                        <!-- LABOR MANUAL (NEW - DROPDOWN) -->
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Labor Realizada (Manual)</label>
                            <select id="input-labor-manual" class="input-dark" style="width: 100%;">
                                <option value="">Seleccione Labor...</option>
                                <option value="747-MANTENIMIENTO DE OBRAS CIVILES">747-MANTENIMIENTO DE OBRAS CIVILES</option>
                                <option value="995-OPERACIÓN DE MAQ.MATERIALES">995-OPERACIÓN DE MAQ.MATERIALES</option>
                                <option value="996-OPERACIÓN DE MAQUINARIA">996-OPERACIÓN DE MAQUINARIA</option>
                                <option value="998-MANTENIMIENTO PREVENTIVO">998-MANTENIMIENTO PREVENTIVO</option>
                                <option value="999-MANTENIMIENTO CORRECTIVO">999-MANTENIMIENTO CORRECTIVO</option>
                            </select>
                        </div>

                        <div id="wrapper-equipo-intervencion" style="margin-bottom: 1rem;">
                                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1rem;">
                                    <div class="form-group">
                                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Estación de Bombeo</label>
                                        <select id="sel-station-diarias" class="input-dark" style="width: 100%;" onchange="LaboresController.handleStationChange(this.value)">
                                            <option value="">Seleccione Estación...</option>
                                            ${stations.map(s => `<option value="${s}">${s}</option>`).join('')}
                                        </select>
                                    </div>
                                    <div class="form-group" style="display: none;">
                                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Zona</label>
                                        <select id="sel-zone-diarias" class="input-dark" style="width: 100%;" onchange="LaboresController.handleZoneChange(this.value)" disabled>
                                            <option value="">Seleccione Zona...</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="form-group" style="margin-bottom: 1rem;">
                                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Equipos Intervenidos (Selección Múltiple)</label>
                                    <div id="equipment-list-diarias" class="input-dark" style="width: 100%; height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.2rem;">
                                        <div style="padding: 1rem; color: var(--text-muted); text-align: center;">Seleccione una estación y zona...</div>
                                    </div>
                                </div>
                        </div>
                `;
            }

            // --- CONTRACTOR SUPPORT SECTION (Derivaciones or Tareas Diarias) ---
            if (isDerivaciones || isTareasDiarias) {
                html += `
                        <div class="glass-panel" style="margin-bottom: 1.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); padding: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h3 style="font-size: 1rem; color: var(--accent);">Apoyo de Contratista (Opcional)</h3>
                                <label class="switch">
                                    <input type="checkbox" id="dev-check-contratista"
                                        onchange="document.getElementById('dev-wrapper-contratista').style.display = this.checked ? 'block' : 'none';">
                                    <span class="slider round"></span>
                                </label>
                            </div>
                            <div id="dev-wrapper-contratista" style="display: none; border-top: 1px solid var(--glass-border); padding-top: 1rem;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                                    <div class="form-group">
                                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.8rem;">CONTRATISTA</label>
                                        <input type="text" id="dev-contratista-nombre" placeholder="Nombre de la empresa o contratista" class="input-dark" style="width: 100%;">
                                    </div>
                                    <div class="form-group">
                                        <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.8rem;">COSTO ($)</label>
                                        <input type="number" id="dev-contratista-costo" value="0" class="input-dark" style="width: 100%; color: var(--accent-light);">
                                    </div>
                                </div>
                                <div class="form-group" style="margin-top: 1rem;">
                                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem; font-size: 0.8rem;">DESCRIPCIÓN DEL SERVICIO</label>
                                    <input type="text" id="dev-contratista-servicio" placeholder="Detalles del servicio prestado..." class="input-dark" style="width: 100%;">
                                </div>
                            </div>
                        </div>
                `;
            }


            // --- DYNAMIC LISTS FOR DERIVACIONES ---
            if (isDerivaciones) {
                html += `
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                            <!-- Transformadores -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <label style="color: var(--text-muted);">Capacidad Transformador(es)</label>
                                    <button type="button" class="btn-icon-small" onclick="LaboresController.addField('list-transformadores', 'Transformador (KVA)')" style="background: var(--primary); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer;">
                                        <i data-lucide="plus" style="width: 16px;"></i>
                                    </button>
                                </div>
                                <div id="list-transformadores" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <input type="text" class="input-dark dynamic-field" placeholder="Transformador (KVA)">
                                </div>
                            </div>
                            <!-- Fusibles -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <label style="color: var(--text-muted);">Capacidad Fusible(s)</label>
                                    <button type="button" class="btn-icon-small" onclick="LaboresController.addField('list-fusibles', 'Fusible (A)')" style="background: var(--secondary); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer;">
                                        <i data-lucide="plus" style="width: 16px;"></i>
                                    </button>
                                </div>
                                <div id="list-fusibles" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <input type="text" class="input-dark dynamic-field" placeholder="Fusible (A)">
                                </div>
                            </div>
                        </div>
                 `;
            }

            // --- STANDARD ZONE/EQUIPMENT SELECTOR (If not Poda, Derivaciones, or Tareas Diarias) ---
            if (!isPoda && !isDerivaciones && !isTareasDiarias) {
                html += `
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Zona</label>
                            <select id="sel-zone" class="input-dark" style="width: 100%;" onchange="LaboresController.handleZoneChange(this.value)" disabled>
                                <option value="">Seleccione Zona...</option>
                            </select>
                        </div>
                        
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Equipos Intervenidos (Selección Múltiple)</label>
                            <div id="equipment-list" class="input-dark" style="width: 100%; height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.2rem;">
                                <div style="padding: 1rem; color: var(--text-muted); text-align: center;">Seleccione una zona primero...</div>
                            </div>
                        </div>
                `;
            }

            // --- HOROMETER INFO ---
            if (isHorometro) {
                html += `
                        <div class="glass-panel" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); padding: 1rem; margin-bottom: 1rem; text-align: center;">
                            <p style="margin: 0; color: var(--primary); font-size: 0.9rem; font-weight: 600;">
                                <i data-lucide="info" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 0.5rem;"></i>
                                Ingrese la hora y el horómetro para cada equipo en la lista de abajo.
                            </p>
                        </div>
                `;
            }

            // --- PODA DETAILS ---
            if (isPoda) {
                html += `
                        <div style="animation: fadeIn 0.3s ease; margin-bottom: 1.5rem; background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 0.5rem; border: 1px solid var(--glass-border);">
                            <h4 style="color: var(--secondary); margin-top: 0; margin-bottom: 1rem;">Detalles de Poda</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                <div class="form-group">
                                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Tipo de Vegetación</label>
                                    <select id="poda-tipo" class="input-dark" style="width: 100%;">
                                        <option value="">SELECCIONE...</option>
                                        <option value="ARBOL">ÁRBOL</option>
                                        <option value="ARBUSTO">ARBUSTO</option>
                                        <option value="ENREDADERA">ENREDADERA</option>
                                        <option value="BAMBU">GUADUA/BAMBÚ</option>
                                        <option value="OTRO">OTRO</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Altura Aprox.</label>
                                    <select id="poda-altura" class="input-dark" style="width: 100%;">
                                        <option value="">SELECCIONE...</option>
                                        <option value="BAJA">BAJA (&lt; 2m)</option>
                                        <option value="MEDIA">MEDIA (2 - 5m)</option>
                                        <option value="ALTA">ALTA (&gt; 5m)</option>
                                    </select>
                                </div>
                            </div>
                             <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Nivel de Riesgo</label>
                                <select id="poda-riesgo" class="input-dark" style="width: 100%; border-left: 4px solid transparent;" onchange="this.style.borderLeftColor = this.value === 'CRITICO' ? '#ef4444' : (this.value === 'MEDIO' ? '#f59e0b' : '#10b981')">
                                    <option value="">SELECCIONE NIVEL...</option>
                                    <option value="BAJO">BAJO (SIN INTERFERENCIA)</option>
                                    <option value="MEDIO">MEDIO (CERCANO A LÍNEAS)</option>
                                    <option value="CRITICO">CRÍTICO (CONTACTO INMINENTE)</option>
                                </select>
                            </div>
                        </div>
                `;
            }

            html += `
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">${isTareasDiarias ? 'Tareas Realizadas' : 'Observaciones / Trabajos Realizados'}</label>
                <textarea id="labor-observaciones" class="input-dark" style="width: 100%; height: 80px;" required placeholder="Detalles del trabajo..."></textarea>
            </div>

            <!-- STATUS SELECTOR (NEW) -->
            <div class="form-group" style="margin-bottom: 1.5rem;">
                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Estado de la Labor</label>
                <select id="labor-estado" class="input-dark" style="width: 100%; border-left: 4px solid #10b981;" onchange="this.style.borderLeftColor = this.value === 'EJECUTADO' ? '#10b981' : (this.value === 'EN PROCESO' ? '#f59e0b' : (this.value === 'SUSPENDIDO' ? '#ef4444' : '#64748b'))">
                    <option value="PROGRAMADO">📅 PROGRAMADO</option>
                    <option value="EN PROCESO">⏳ EN PROCESO</option>
                    <option value="EJECUTADO" selected>✔ EJECUTADO (FINALIZADO)</option>
                    <option value="SUSPENDIDO">⛔ SUSPENDIDO / CANCELADO</option>
                </select>
            </div>
            `;

            if (!isPoda) {
                html += `
                        <div style="margin-bottom: 2rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem;">
                             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                <h4 style="color: var(--secondary); margin: 0;">Materiales Consumidos</h4>
                                <button type="button" class="btn" style="background: var(--primary); color: white; border: none; font-size: 0.8rem; padding: 0.4rem 0.8rem; display: flex; align-items: center; gap: 0.4rem; border-radius: 0.3rem;" onclick="MaterialesController.openModal()">
                                    <i data-lucide="plus-circle" style="width: 14px;"></i> Nuevo Material
                                </button>
                            </div>

                            <div style="background: rgba(0,0,0,0.2); border-radius: 0.5rem; overflow: hidden; margin-bottom: 1rem;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                                    <thead style="background: rgba(255,255,255,0.05); color: var(--text-muted);">
                                        <tr>
                                            <th style="padding: 0.75rem; text-align: left; width: 35%;">Material</th>
                                            <th style="padding: 0.75rem; text-align: left; width: 30%;">Descripción</th>
                                            <th style="padding: 0.75rem; text-align: center; width: 10%;">Cant.</th>
                                            <th style="padding: 0.75rem; text-align: right; width: 15%;">Subtotal</th>
                                            <th style="padding: 0.75rem; text-align: center; width: 10%;"></th>
                                        </tr>
                                    </thead>
                                    <tbody id="lista-materiales-body"></tbody>
                                    <tfoot style="border-top: 1px solid var(--glass-border);">
                                        <tr>
                                            <td colspan="3" style="text-align: right; padding: 0.75rem; font-weight: bold;">Costo Total Materiales:</td>
                                            <td id="total-materiales-cost" style="text-align: right; padding: 0.75rem; color: var(--secondary); font-weight: bold;">$0</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <button type="button" class="btn" onclick="LaboresController.addMaterialRow()" style="width: 100%; border: 1px dashed var(--text-muted); color: var(--text-muted); padding: 0.5rem; font-size: 0.9rem; transition: all 0.2s;">
                                + Agregar Fila de Material
                            </button>
                        </div>
                `;
            }
        } // End if (!isBitacora)

        // Close the form and container for ALL forms
        html += `
                        <button type="submit" class="btn-primary" style="width: 100%; padding: 1rem; font-size: 1rem; margin-top: 1rem;">
                            Guardar Reporte
                        </button>
                    </form>
                </div>
            </div>
        `;

        container.innerHTML = html;
        lucide.createIcons();
        // Initialize material row for both Bitacora and standard forms (except purely simple ones if logic dictates, but safe to add always if table exists)
        if (document.getElementById('lista-materiales-body')) {
            this.addMaterialRow();
        }
    },

    addField(containerId, placeholder) {
        const container = document.getElementById(containerId);
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        div.innerHTML = `
            <input type="text" class="input-dark dynamic-field" placeholder="${placeholder}" style="flex: 1;">
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">
                <i data-lucide="trash-2" style="width: 16px;"></i>
            </button>
        `;
        container.appendChild(div);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    addMaterialRow() {
        const tbody = document.getElementById('lista-materiales-body');
        if (!tbody) return;
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.innerHTML = `
            <td style="padding: 0.5rem;">
                <input type="text" class="input-dark" list="materiales-list" placeholder="Buscar..." 
                       onchange="LaboresController.updateRowCost(this)" 
                       style="width: 100%; font-size: 0.85rem;">
            </td>
            <td style="padding: 0.5rem;">
                <input type="text" class="input-dark" placeholder="Descripción" readonly 
                       style="width: 100%; font-size: 0.85rem; opacity: 0.8; cursor: not-allowed;">
            </td>
            <td style="padding: 0.5rem; text-align: center;">
                <input type="number" class="input-dark" value="1" min="0.1" step="0.1" 
                       oninput="LaboresController.updateRowCost(this)" 
                       style="width: 60px; text-align: center; font-size: 0.85rem;">
            </td>
            <td style="padding: 0.5rem; text-align: right;">
                 <input type="text" class="input-dark" value="$ 0" readonly 
                       data-raw="0"
                       style="width: 100%; text-align: right; font-size: 0.85rem; border: none; background: transparent; font-weight: bold;">
            </td>
            <td style="padding: 0.5rem; text-align: center;">
                <button type="button" class="btn-icon" onclick="this.closest('tr').remove(); LaboresController.calculateTotalMateriales();" style="color: #ef4444;">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
        lucide.createIcons();
    },

    updateRowCost(inputElement) {
        const row = inputElement.closest('tr');
        const inputs = row.querySelectorAll('input');

        const matInput = inputs[0];  // Search Input
        const descInput = inputs[1]; // Desc Readonly
        const qtyInput = inputs[2];  // Quantity
        const totalInput = inputs[3];// Total Display

        // 1. Try to find material price
        const val = matInput.value;
        if (val.includes(' - ')) {
            const code = val.split(' - ')[0];
            const allMaterials = DataManager.getAllMaterials();
            const material = allMaterials.find(m => m.codigo === code);

            if (material) {
                const price = material.precio || 0;
                descInput.value = material.descripcion;
                row.dataset.price = price;
            }
        }

        // 2. Calculate Total
        const qty = parseFloat(qtyInput.value) || 0;
        const price = parseFloat(row.dataset.price) || 0;
        const subtotal = qty * price;

        totalInput.value = '$ ' + subtotal.toLocaleString();
        totalInput.dataset.raw = subtotal;

        this.calculateTotalMateriales();
    },

    calculateTotalMateriales() {
        let total = 0;
        document.querySelectorAll('#lista-materiales-body tr').forEach(row => {
            const inputs = row.querySelectorAll('input');
            if (inputs.length > 3) {
                const sub = parseFloat(inputs[3].dataset.raw) || 0;
                total += sub;
            }
        });

        const totalEl = document.getElementById('total-materiales-cost');
        if (totalEl) totalEl.innerText = '$ ' + total.toLocaleString();

        return total;
    },

    // --- BITACORA CARD SYSTEM ---

    addBitacoraEquipo(val) {
        if (!val) return;
        if (this.selectedBitacoraEquipos.some(e => e.equipo === val)) {
            alert("Este equipo ya ha sido añadido.");
            return;
        }

        // Add to state with empty materials
        this.selectedBitacoraEquipos.push({ equipo: val, materiales: [] });
        this.renderBitacoraCards();
    },

    removeBitacoraEquipo(index) {
        if (confirm(' �Seguro que desea quitar este equipo y sus materiales?')) {
            this.selectedBitacoraEquipos.splice(index, 1);
            this.renderBitacoraCards();
        }
    },

    renderBitacoraCards() {
        const container = document.getElementById('bit-equipos-cards-container');
        const msg = document.getElementById('bit-no-equipos-msg');
        if (!container) return;

        if (this.selectedBitacoraEquipos.length === 0) {
            container.innerHTML = '';
            if (msg) msg.style.display = 'block';
            container.appendChild(msg);
            return;
        }

        // Clear container but keep msg (hidden)
        container.innerHTML = '';

        this.selectedBitacoraEquipos.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'glass-panel bit-equipo-card';
            card.style.padding = '1rem';
            card.style.borderLeft = '4px solid var(--primary)';
            card.style.animation = 'fadeIn 0.3s ease';
            card.style.marginBottom = '1rem';

            // Build Materials Rows HTML
            let matRows = '';
            item.materiales.forEach((mat, mIndex) => {
                matRows += `
                    <tr>
                        <td style="padding:0.5rem; color: var(--text-main);">${mat.codigo}</td>
                        <td style="padding:0.5rem; color: var(--text-muted);">${mat.descripcion}</td>
                        <td style="padding:0.5rem; color: var(--text-main);">${mat.cantidad}</td>
                        <td style="padding:0.5rem; text-align: right; color: var(--secondary);">$${(mat.total || 0).toLocaleString()}</td>
                        <td style="padding:0.5rem; text-align: center;">
                            <button class="btn-icon" onclick="LaboresController.removeMaterialFromCard(${index}, ${mIndex})" style="color: var(--danger); background: none; border: none; cursor: pointer;">
                                <i data-lucide="trash-2" style="width: 14px;"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            if (item.materiales.length === 0) {
                matRows = `<tr><td colspan="5" style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.8rem;">Sin materiales asignados.</td></tr>`;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--glass-border);">
                    <h4 style="margin: 0; color: var(--text-main); font-size: 1rem;">
                        <i data-lucide="tractor" style="width: 18px; margin-right: 8px; vertical-align: bottom;"></i>
                        ${item.equipo}
                    </h4>
                    <button class="btn-icon" onclick="LaboresController.removeBitacoraEquipo(${index})" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 4px; border-radius: 4px; border: none; cursor: pointer;">
                        <i data-lucide="x" style="width: 18px;"></i>
                    </button>
                </div>

                <!-- Mini Materials Table -->
                <h5 style="margin: 0 0 0.5rem 0; font-size: 0.8rem; color: var(--text-muted);">Repuestos / Materiales:</h5>
                <div style="margin-bottom: 1rem; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden; border: 1px solid var(--glass-border);">
                    <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                        <thead style="background: rgba(255,255,255,0.05); color: var(--text-muted);">
                             <tr>
                                <th style="padding: 0.5rem; text-align: left;">Cod</th>
                                <th style="padding: 0.5rem; text-align: left;">Repuesto</th>
                                <th style="padding: 0.5rem; text-align: left;">Cant</th>
                                <th style="padding: 0.5rem; text-align: right;">Total</th>
                                <th style="padding: 0.5rem;"></th>
                            </tr>
                        </thead>
                        <tbody>${matRows}</tbody>
                    </table>
                </div>

                <div style="text-align: right;">
                    <button class="btn" onclick="LaboresController.openMaterialModalForCard(${index})" 
                            style="font-size: 0.75rem; padding: 0.4rem 1rem; background: var(--glass-surface); border: 1px solid var(--glass-border); color: var(--text-main); cursor: pointer; border-radius: 4px;">
                        <i data-lucide="plus" style="width: 14px; margin-right: 4px; vertical-align: middle;"></i> Añadir Material
                    </button>
                </div>
            `;
            container.appendChild(card);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    // --- CARD MATERIAL HANDLING ---
    activeCardIndex: null, // Track which card is asking for materials

    openMaterialModalForCard(index) {
        this.activeCardIndex = index;

        const code = prompt("BUSCAR REPUESTO: Ingrese código o nombre (o parte del nombre):");
        if (!code) return;

        // Search logic
        const materials = DataManager.getAllMaterials();
        const match = materials.find(m => m.codigo.includes(code) || m.descripcion.toLowerCase().includes(code.toLowerCase()));

        if (!match) {
            alert("No se encontró ningún repuesto con ese criterio.");
            return;
        }

        const qty = prompt(`Repuesto Encontrado:\n${match.descripcion} ($${match.precio || 0})\n\nIngrese CANTIDAD:`, "1");
        if (!qty) return;

        const quantity = parseFloat(qty);
        const total = quantity * (match.precio || 0);

        this.addMaterialToCard(this.activeCardIndex, {
            codigo: match.codigo,
            descripcion: match.descripcion,
            cantidad: quantity,
            total: total,
            costoUnit: match.precio
        });
    },

    addMaterialToCard(cardIndex, material) {
        if (this.selectedBitacoraEquipos[cardIndex]) {
            this.selectedBitacoraEquipos[cardIndex].materiales.push(material);
            this.renderBitacoraCards();
        }
    },

    removeMaterialFromCard(cardIndex, matIndex) {
        if (this.selectedBitacoraEquipos[cardIndex]) {
            this.selectedBitacoraEquipos[cardIndex].materiales.splice(matIndex, 1);
            this.renderBitacoraCards();
        }
    },

    refreshMaterialOptions() {
        const datalist = document.getElementById('materiales-list');
        if (!datalist) return;

        const allMaterials = DataManager.getAllMaterials();
        datalist.innerHTML = allMaterials.map(m =>
            `<option value="${m.codigo} - ${m.descripcion}">`
        ).join('');

        console.log("LaboresController: Material List Refreshed");
    },

    handleInterventionTypeChange(val) {
        const suerteWrapper = document.getElementById('wrapper-sector-suerte');
        const equipoWrapper = document.getElementById('wrapper-equipo-intervencion');

        if (val === 'SUERTE') {
            suerteWrapper.style.display = 'block';
            equipoWrapper.style.display = 'none';
        } else {
            suerteWrapper.style.display = 'none';
            equipoWrapper.style.display = 'block';
        }
    },

    handleStationChange(stationName) {
        const isDaily = this.selectedTarea === "Tareas Diarias";
        const zoneSelect = isDaily ? document.getElementById('sel-zone-diarias') : document.getElementById('sel-zone');
        const listContainer = isDaily ? document.getElementById('equipment-list-diarias') : document.getElementById('equipment-list');

        if (!zoneSelect || !listContainer) return;

        zoneSelect.innerHTML = '<option value="">Seleccione Zona...</option>';
        listContainer.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">Seleccione una zona primero...</div>';
        zoneSelect.disabled = true;

        if (!stationName || !this.STATION_DATA[stationName]) return;

        const zones = Object.keys(this.STATION_DATA[stationName]);
        zones.forEach(z => {
            zoneSelect.innerHTML += `<option value="${z}">${z}</option>`;
        });

        zoneSelect.disabled = false;

        if (zones.length === 1) {
            zoneSelect.value = zones[0];
            this.handleZoneChange(zones[0]);
        }
    },

    handleZoneChange(zoneName) {
        const isDaily = this.selectedTarea === "Tareas Diarias";
        const stationSelect = isDaily ? document.getElementById('sel-station-diarias') : document.getElementById('sel-station');
        const listContainer = isDaily ? document.getElementById('equipment-list-diarias') : document.getElementById('equipment-list');

        if (!stationSelect || !listContainer) return;

        const stationName = stationSelect.value;
        listContainer.innerHTML = '';

        if (!zoneName || !stationName || !this.STATION_DATA[stationName] || !this.STATION_DATA[stationName][zoneName]) {
            listContainer.innerHTML = '<div style="padding: 1rem; color: var(--text-muted); text-align: center;">No hay equipos asociados...</div>';
            return;
        }

        const equipments = this.STATION_DATA[stationName][zoneName];

        if (this.selectedTarea === "Revisión de horómetros") {
            listContainer.innerHTML = `
    <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 400px;">
            <thead>
                <tr style="border-bottom: 1px solid var(--glass-border);">
                    <th style="padding: 0.75rem; text-align: left; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase;">Equipo</th>
                    <th style="padding: 0.75rem; text-align: left; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; width: 130px;">Hora</th>
                    <th style="padding: 0.75rem; text-align: left; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; width: 130px;">Horómetro</th>
                </tr>
            </thead>
            <tbody id="horometro-table-body"></tbody>
        </table>
    </div>
    `;
            const tbody = document.getElementById('horometro-table-body');
            equipments.forEach(eq => {
                const tr = document.createElement('tr');
                tr.className = 'horometro-row';
                tr.setAttribute('data-equipo', eq);
                tr.style.borderBottom = '1px dotted var(--glass-border)';
                tr.innerHTML = `
                    <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-main);">${eq}</td>
                    <td style="padding: 0.75rem;"><input type="time" class="input-dark input-hora" style="width: 100%; padding: 0.4rem; font-size: 0.8rem;"></td>
                    <td style="padding: 0.75rem;"><input type="number" step="0.1" class="input-dark input-valor" style="width: 100%; padding: 0.4rem; font-size: 0.8rem;" placeholder="0.0"></td>
`;
                tbody.appendChild(tr);
            });
        } else {
            equipments.forEach(eq => {
                const item = document.createElement('div');
                item.className = 'equipment-item';
                item.style.padding = '0.5rem';
                item.style.borderBottom = '1px solid var(--glass-border)';
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.gap = '0.8rem';
                item.style.cursor = 'pointer';
                item.style.transition = 'background 0.2s ease';

                item.onmouseenter = () => item.style.background = 'rgba(255,255,255,0.05)';
                item.onmouseleave = () => item.style.background = 'transparent';

                item.innerHTML = `
                    <input type="checkbox" value="${eq}" id="check-${eq}" style="width: 18px; height: 18px; cursor: pointer;">
                    <label for="check-${eq}" style="flex: 1; cursor: pointer; font-size: 0.85rem; margin: 0; color: var(--text-main);">${eq}</label>
`;

                item.onclick = (e) => {
                    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'LABEL') {
                        const cb = item.querySelector('input');
                        cb.checked = !cb.checked;
                    }
                };

                listContainer.appendChild(item);
            });
        }
    },

    getGPS() {
        const input = document.getElementById('poda-coords');
        const link = document.getElementById('link-map');

        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            return;
        }

        input.value = "Obteniendo ubicación...";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                const coords = `${lat}, ${lng} `;

                input.value = coords;
                link.href = `https://www.google.com/maps?q=${lat},${lng}`;
                link.style.display = 'block';
            },
            (error) => {
                console.error("Error GPS:", error);
                input.value = "";
                let msg = "Error al obtener ubicación.";
                if (error.code === 1) msg = "Atención: Debes permitir el acceso a la ubicación.";
                alert(msg);
            }
        );
    },

    saveReport() {
        // [MODIFIED] Added syncToBoletasHistory call
        const isBitacora = this.selectedTarea === "Bitácora Mecánica";

        // --- BITÁCORA SAVING LOGIC ---
        if (isBitacora) {
            const fInicio = document.getElementById('bit-fecha-inicio').value;
            const hInicio = document.getElementById('bit-hora-inicio').value;
            // End Date Optional now
            const fFin = document.getElementById('bit-fecha-fin').value;
            const hFin = document.getElementById('bit-hora-fin').value;

            // Validate Cards
            if (!this.selectedBitacoraEquipos || this.selectedBitacoraEquipos.length === 0) {
                alert('Debe añadir al menos un equipo a la bitácora.');
                return;
            }

            const tipoMant = document.getElementById('bit-tipo-mant').value;
            const descripcion = document.getElementById('labor-descripcion').value;
            const estado = document.getElementById('bit-estado').value;

            // System Checkboxes
            const sistemasChecked = Array.from(document.querySelectorAll('input[name="bit-sistema"]:checked')).map(cb => cb.value);

            if (!fInicio || !descripcion) {
                alert('Por favor complete los campos obligatorios:\n- Fecha Inicio (Programación)\n- Descripción/Labor');
                return;
            }

            // Evidence
            const fileInput = document.getElementById('bit-evidencia');
            const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];
            const fileNames = files.map(f => f.name);

            // Calculate hours ONLY if end date provided AND start time is present
            let diffHrs = 0;
            if (fFin && hFin && hInicio) {
                const start = new Date(`${fInicio}T${hInicio}`);
                const end = new Date(`${fFin}T${hFin}`);
                const diffMs = end - start;
                diffHrs = (diffMs / (1000 * 60 * 60)).toFixed(2);
            }

            // --- SAVE AS SINGLE AGGREGATED REPORT ---
            // Aggregate materials for the main view cost
            let totalCostBitacora = 0;
            const fullDetails = this.selectedBitacoraEquipos.map(cardItem => {
                let eqName = "";
                let mats = [];
                let cost = 0;

                if (typeof cardItem === 'string') {
                    eqName = cardItem;
                } else {
                    eqName = cardItem.equipo;
                    mats = cardItem.materiales.map(m => ({
                        codigo: m.codigo,
                        descripcion: m.descripcion,
                        cantidad: m.cantidad,
                        costo: m.total
                    }));
                    cost = cardItem.materiales.reduce((sum, m) => sum + (m.total || 0), 0);
                }
                totalCostBitacora += cost;

                return {
                    equipoFull: eqName,
                    equipoId: eqName.split(' - ')[0],
                    materiales: mats,
                    costoMateriales: cost
                };
            });

            // If only 1 equipment, keep standard format. If > 1, use "Multiple" format for display.
            const isMultiple = fullDetails.length > 1;
            const mainEquipoText = isMultiple ? `Multiples Equipos (${fullDetails.length})` : fullDetails[0].equipoFull;
            const mainEquipoId = isMultiple ? 'MULTIPLE' : fullDetails[0].equipoId;

            // Flatten materials for legacy compatibility/search
            const allMaterialsFlat = fullDetails.flatMap(d => d.materiales);

            const newReport = {
                id: Date.now() + Math.floor(Math.random() * 100000),
                fecha: fInicio,
                fechaFin: fFin || "",
                horaInicio: hInicio,
                horaFin: hFin || "",
                horasTotales: diffHrs > 0 ? diffHrs : 0,
                tecnico: this.selectedTecnico.name || this.selectedTecnico.nombre,
                tecnicoId: this.selectedTecnico.id,
                labor: "Bitácora Mecánica",
                tarea: "Bitácora Mecánica",
                tipoMantenimiento: tipoMant,

                // Main display fields
                equipo: mainEquipoText,
                equipoId: mainEquipoId,

                // Expanded Details
                detalles: fullDetails,
                esMultiple: isMultiple,

                sistemas: sistemasChecked,
                descripcion: descripcion,
                estado: estado,
                materiales: allMaterialsFlat,
                costoMateriales: totalCostBitacora,
                evidencia: fileNames,
                modo: this.currentMode || 'PROPIO'
            };

            this.reportes.push(newReport);

            // Sync to Boletas
            if (typeof this.syncToBoletasHistory === 'function') {
                this.syncToBoletasHistory(newReport);
            }

            this.saveToStorage();
            alert(`Se ha guardado el reporte de Bitácora correctamente.`);
            this.goToTecnicos();
            return;
        }



        try {
            const isPoda = this.selectedTarea === "Recorrido de podas";
            const isDerivaciones = this.selectedTarea === "Información de Derivaciones"; // Verify exact string if possible, but this is likely it
            const isTareasDiarias = this.selectedTarea === "Tareas Diarias";
            // Check if isContratista is needed?
            const isContratista = this.selectedTecnico && (this.selectedTecnico.rol === 'CONTRATISTA' || this.selectedTecnico.rol === 'EXTERNO');

            // --- STANDARD SAVING LOGIC ---

            const fechaInput = document.getElementById('labor-fecha');
            const descInput = document.getElementById('labor-observaciones');

            if (!fechaInput) return;

            const fecha = fechaInput.value;
            const descripcion = descInput ? descInput.value : '';

            if (!fecha) {
                alert('Por favor complete la fecha');
                return;
            }

            // Harvesting Logic
            let estacion = '';
            let zona = 'N/A';
            let equipos = [];
            let sectorSuerte = '';

            if (isPoda || isDerivaciones) {
                estacion = "Recorrido Externo";
            } else if (isTareasDiarias) {
                const tipoSelect = document.getElementById('sel-tipo-intervencion');
                const tipo = tipoSelect ? tipoSelect.value : 'EQUIPO';

                if (tipo === 'SUERTE') {
                    const sectorSelect = document.getElementById('sel-sector-suerte');
                    sectorSuerte = sectorSelect ? sectorSelect.value : '';
                    estacion = "Sector Suerte";
                    zona = sectorSuerte || 'N/A';
                    if (!sectorSuerte) {
                        alert('Por favor seleccione el Sector Suerte');
                        return;
                    }
                } else {
                    const stationSelect = document.getElementById('sel-station-diarias');
                    estacion = stationSelect ? stationSelect.value : '';

                    const zoneSelect = document.getElementById('sel-zone-diarias');
                    zona = zoneSelect ? zoneSelect.value : 'N/A';

                    const checkedBoxes = document.querySelectorAll('#equipment-list-diarias input[type="checkbox"]:checked');
                    equipos = Array.from(checkedBoxes).map(cb => cb.value);

                    if (!estacion) {
                        alert('Por favor seleccione la estación de bombeo');
                        return;
                    }
                    if (equipos.length === 0) {
                        alert('Por favor seleccione al menos un equipo');
                        return;
                    }
                }
            } else {
                const stationSelect = document.getElementById('sel-station');
                estacion = stationSelect ? stationSelect.value : '';
                zona = document.getElementById('sel-zone').value || 'N/A';
                const checkedBoxes = document.querySelectorAll('#equipment-list input[type="checkbox"]:checked');
                equipos = Array.from(checkedBoxes).map(cb => cb.value);

                if (!estacion) {
                    alert('Por favor seleccione la estación de bombeo');
                    return;
                }
            }

            // --- CAPTURE JORGE LUIS SPECIFIC FIELDS (NEW) ---
            // Zona Solicitante & Labor Manual
            let zonaSolicitante = '';
            let laborManual = '';

            if (isTareasDiarias) {
                const zonaEl = document.getElementById('sel-zona-solicitante');
                if (zonaEl) zonaSolicitante = zonaEl.value;

                const laborEl = document.getElementById('input-labor-manual');
                if (laborEl) laborManual = laborEl.value;
            }

            // Harvest Poda Data
            let podaInfo = null;
            if (isPoda) {
                const ubi = document.getElementById('poda-coords').value;
                const tipo = document.getElementById('poda-tipo').value;
                const alt = document.getElementById('poda-altura').value;
                const riesgo = document.getElementById('poda-riesgo').value;

                if (!ubi || !tipo || !alt || !riesgo) {
                    alert('Por favor complete todos los detalles de la poda');
                    return;
                }

                podaInfo = { ubicacion: ubi, tipo: tipo, altura: alt, riesgo: riesgo };
            }

            // Harvest Derivaciones Data
            let derivacionInfo = null;
            if (isDerivaciones) {
                const devName = document.getElementById('dev-nombre').value;
                const ubi = document.getElementById('poda-coords').value;
                const transformadores = Array.from(document.querySelectorAll('#list-transformadores input')).map(i => i.value).filter(v => v);
                const fusibles = Array.from(document.querySelectorAll('#list-fusibles input')).map(i => i.value).filter(v => v);

                if (!devName) {
                    alert('Por favor ingrese el nombre de la Derivación');
                    return;
                }

                const hasContratista = document.getElementById('dev-check-contratista').checked;
                const contratistaNombre = hasContratista ? document.getElementById('dev-contratista-nombre').value : "";
                const contratistaServicio = hasContratista ? document.getElementById('dev-contratista-servicio').value : "";
                const contratistaCosto = hasContratista ? parseFloat(document.getElementById('dev-contratista-costo').value) || 0 : 0;

                derivacionInfo = {
                    nombre: devName,
                    ubicacion: ubi,
                    transformadores: transformadores,
                    fusibles: fusibles,
                    contratista: { activo: hasContratista, nombre: contratistaNombre, servicio: contratistaServicio, costo: contratistaCosto }
                };
            }

            // Harvest Horometer Data
            let lecturasHorometro = [];
            if (this.selectedTarea === "Revisión de horómetros") {
                const rows = document.querySelectorAll('.horometro-row');
                rows.forEach(row => {
                    const eq = row.getAttribute('data-equipo');
                    const hora = row.querySelector('.input-hora').value;
                    const valor = row.querySelector('.input-valor').value;
                    if (hora || valor) {
                        lecturasHorometro.push({ equipo: eq, hora: hora, valor: parseFloat(valor) || 0 });
                    }
                });
                if (lecturasHorometro.length === 0) {
                    alert('Por favor ingrese al menos una lectura de horómetro');
                    return;
                }
                equipos = lecturasHorometro.map(l => l.equipo);
            }

            // Harvest Materials
            const materiales = [];
            let costoMateriales = 0;

            // Note: For Jorge Luis (Tareas Diarias or Derivaciones), handle contractor cost if active
            let isContratistaInForm = false;
            let cCosto = 0;

            if (isDerivaciones || isTareasDiarias) {
                const cb = document.getElementById('dev-check-contratista');
                if (cb && cb.checked) {
                    isContratistaInForm = true;
                    cCosto = parseFloat(document.getElementById('dev-contratista-costo').value) || 0;
                }
            }

            if (!isContratista && !isPoda && !isContratistaInForm) {
                document.querySelectorAll('#lista-materiales-body tr').forEach(row => {
                    const inputs = row.querySelectorAll('input');
                    if (inputs.length > 0 && inputs[0].value) {
                        const codeRaw = inputs[0].value;
                        const code = codeRaw.includes(' - ') ? codeRaw.split(' - ')[0] : codeRaw;
                        const desc = inputs[1].value;
                        const cant = parseFloat(inputs[2].value) || 0;
                        const tot = parseFloat(inputs[3].dataset.raw) || 0;
                        materiales.push({ codigo: code, descripcion: desc, cantidad: cant, total: tot });
                    }
                });
                costoMateriales = this.calculateTotalMateriales();
            } else if (isContratista) {
                // mode CONTRATISTA (whole report is contractor)
                // Currently cCosto placeholder
                costoMateriales = 0;
            } else if (isContratistaInForm) {
                costoMateriales = cCosto;
            }

            // --- CAPTURE STATUS (NEW) ---
            const estadoInput = document.getElementById('labor-estado');
            const estado = estadoInput ? estadoInput.value : 'EJECUTADO';

            const report = {
                id: Date.now(),
                fecha: fecha,
                tecnico: this.selectedTecnico.nombre,
                rol: this.selectedTecnico.rol,
                tarea: this.selectedTarea,
                estacion: estacion,
                zona: zona,
                equipos: equipos,
                observaciones: descripcion,
                materiales: materiales,
                costoMateriales: costoMateriales,
                esContratista: isContratista || isContratistaInForm,
                lecturasHorometro: lecturasHorometro,
                podaInfo: podaInfo,
                derivacionInfo: derivacionInfo,
                sectorSuerte: sectorSuerte,
                // Jorge Luis Custom Fields
                zonaSolicitante: zonaSolicitante || "N/A",
                laborManual: laborManual || "",
                estado: estado // USES CAPTURED STATE
            };

            try {
                if (this.editingReportId) {
                    // UPDATE EXISTING
                    const index = this.reportes.findIndex(r => r.id === this.editingReportId);
                    if (index !== -1) {
                        // Preserve ID and original creation info if needed, or just overwrite
                        report.id = this.editingReportId;
                        this.reportes[index] = report;

                        // Sync update to history as well
                        this.syncToBoletasHistory(report);

                        alert('Reporte Actualizado Correctamente');
                    }
                    this.editingReportId = null;
                } else {
                    // CREATE NEW
                    this.reportes.unshift(report);
                    // Sync new to history
                    this.syncToBoletasHistory(report);

                    alert('Reporte Guardado Correctamente');
                }

                this.saveToStorage();
                this.goToTecnicos();
            } catch (error) {
                console.error("Error saving report:", error);
                alert("Error guardando el reporte: " + error.message);
            }
        } catch (outerError) {
            console.error("Critical Error in saveReport:", outerError);
            alert("Error inesperado al procesar el reporte: " + outerError.message);
        }
    },

    syncToBoletasHistory(report) {
        if (!DataManager || !DataManager.saveBoleta) {
            console.warn("DataManager.saveBoleta not available. Skipping auto-sync.");
            return;
        }

        // Determine Type: 
        // User clarified: Maintenance reports are Boletas de Aplicación, NOT Requisicion.
        const type = 'APLICACION';

        // Determine Solicitante
        // "asocialo al inicio de sesión o al perfil de la persona que te solicita"
        let solicitanteName = report.tecnico || 'Desconocido';

        if (typeof AuthManager !== 'undefined') {
            const currentUser = AuthManager.getUser();
            if (currentUser && (currentUser.name || currentUser.nombre || currentUser.username)) {
                solicitanteName = currentUser.name || currentUser.nombre || currentUser.username;
            }
        }

        // Define "Equipo" or "Destino" global context
        let mainDestino = report.estacion || report.zona || 'Varias Ubicaciones';
        if (report.equipos && report.equipos.length === 1) {
            mainDestino = report.equipos[0];
        } else if (report.esBitacora && report.equipo) {
            mainDestino = report.equipo;
        }

        // Map Items
        // Standard Labores materials: { codigo, descripcion, cantidad, total }
        // Boleta items: { tipoDestino, destino, actividad, codigo, descripcion, cantidad, unidad }

        let boletaItems = [];

        // CASE 1: Grouped Report (Bitacora with multiple equipments)
        if (report.detalles && report.detalles.length > 0) {
            report.detalles.forEach(detail => {
                const specificEquipo = detail.equipoFull || detail.equipo;

                // If the equipment has materials, add them as specific items
                if (detail.materiales && detail.materiales.length > 0) {
                    const items = detail.materiales.map(m => ({
                        tipoDestino: 'EQUIPO',
                        destino: specificEquipo, // SPECIFIC EQUIPMENT HERE
                        actividad: report.laborManual || report.tarea || 'Bitácora Mecánica',
                        codigo: m.codigo,
                        descripcion: m.descripcion,
                        cantidad: m.cantidad,
                        unidad: 'UND',
                        total: m.costo || m.total || 0
                    }));
                    boletaItems = boletaItems.concat(items);
                }
            });
        }

        // CASE 2: Standard/Legacy Report (Single list of materials only)
        if (boletaItems.length === 0 && report.materiales && report.materiales.length > 0) {
            boletaItems = report.materiales.map(m => {
                return {
                    tipoDestino: type === 'APLICACION' ? 'SECTOR' : 'EQUIPO',
                    destino: mainDestino, // GLOBAL DESTINATION
                    actividad: report.laborManual || report.tarea || 'Mantenimiento',
                    codigo: m.codigo,
                    descripcion: m.descripcion,
                    cantidad: m.cantidad,
                    unidad: 'UND',
                    total: m.total || 0
                };
            });
        }

        if (boletaItems.length === 0) {
            // No materials to sync
            return;
        }

        const boleta = {
            id: `AUTO-${report.id}`, // Unique ID linked to Report ID
            tipo: type,
            fecha: report.fecha,
            solicitante: solicitanteName,
            equipo: mainDestino,
            observaciones: `Generado Automáticamente desde Labores. Tarea: ${report.tarea}. ${report.observaciones ? 'Obs: ' + report.observaciones : ''}`,
            items: boletaItems,
            total: report.costoMateriales || 0
        };

        DataManager.saveBoleta(boleta);
        console.log("Auto-synced report to Boletas history:", boleta.id);
    },

    reportes: [
        { id: 1, fecha: "2025-12-20", tecnico: "Jhonnier Andres Rayo", labor: "Mantenimiento Tableros", estacion: "EB01 - La Luisa", esContratista: false },
        { id: 2, fecha: "2025-12-22", tecnico: "Jorge Luis Aricapa", labor: "Recorrido de podas", estacion: "BOMBEO LUISA 1", esContratista: false }
    ],

    getStatusBadge(rep) {
        const estado = (rep.estado || 'PENDIENTE').toUpperCase();
        let className = 'status-pending';
        let icon = 'clock';
        let text = estado;

        // Date-based logic for Vencido
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const repDate = new Date(rep.fecha + 'T12:00:00'); // Midday to avoid TZ issues

        if (estado === 'COMPLETADO' || estado === 'EJECUTADO') {
            className = 'status-active';
            icon = 'check-circle';
            text = 'EJECUTADO';
        } else if (estado === 'PENDIENTE' || estado === 'PROGRAMADO') {
            if (repDate < today) {
                className = 'status-inactive';
                icon = 'alert-circle';
                text = 'VENCIDO';
            } else {
                className = 'status-scheduled';
                icon = 'calendar';
                text = 'PROGRAMADO';
            }
        }

        return `
            <span class="status-badge ${className}">
                <i data-lucide="${icon}" style="width: 14px; height: 14px;"></i>
                ${text}
            </span>
        `;
    },

    renderReportes() {
        const container = document.getElementById('labores-content');
        if (!container) return;

        let html = `
            ${this.renderHeader('historial')}
            <div style="animation: fadeIn 0.3s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; color: var(--primary); text-transform: uppercase; letter-spacing: 1px;">Reportes Guardados</h3>
                    <div style="color: var(--text-muted); font-size: 0.9rem; font-weight: 600;">TOTAL: ${this.reportes.length}</div>
                </div>

                <div class="glass-panel" style="padding: 1rem; margin-bottom: 1rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
                    <div style="position: relative; flex: 1; min-width: 250px; max-width: 400px;">
                        <i data-lucide="search" style="position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 1.2rem;"></i>
                        <input type="text" placeholder="BUSCAR REPORTE..." class="input-dark" style="width: 100%; padding-left: 2.5rem; text-transform: uppercase; font-size: 0.8rem;">
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);" onclick="LaboresController.exportToExcel()">
                            <i data-lucide="file-spreadsheet" style="width: 1.1rem; margin-right: 0.5rem;"></i>
                            EXCEL
                        </button>
                        <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);" onclick="LaboresController.exportToPDF()">
                            <i data-lucide="file-text" style="width: 1.1rem; margin-right: 0.5rem;"></i>
                            PDF
                        </button>
                        <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);" onclick="LaboresController.deleteSelectedReports()">
                            <i data-lucide="trash-2" style="width: 1.1rem; margin-right: 0.5rem;"></i>
                            BORRAR
                        </button>
                        <button class="btn" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2);" onclick="LaboresController.startAuditMode()">
                            <i data-lucide="eye" style="width: 1.1rem; margin-right: 0.5rem;"></i>
                            AUDITORÍA
                        </button>
                    </div>
                </div>

                <div class="glass-panel" style="overflow-x: auto;">
                    <table class="modern-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">
                                    <input type="checkbox" id="chk-all-reports" onchange="LaboresController.toggleSelectAllReports(this.checked)" style="accent-color: var(--primary); transform: scale(1.2); cursor: pointer;">
                                </th>
                                <th>Fecha</th>
                                <th>Técnico</th>
                                <th>Labor</th>
                                <th>Estación de Bombeo</th>
                                <th>Costo Mat.</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (this.reportes.length === 0) {
            html += `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay reportes guardados</td></tr>`;
        } else {
            this.reportes.forEach(rep => {
                const tecnicoName = (rep.tecnico || '').toUpperCase();
                const isJhonnier = tecnicoName.includes('JHONNIER');
                const btnTitle = isJhonnier ? 'Generar Requisición' : 'Generar Boleta de Aplicación';

                // Customize displayed Labor Name for Bitácora
                // Customize displayed Labor Name for Bitácora
                let laborDisplay = rep.tarea || rep.labor || 'Labor General';
                const isBitacora = rep.esBitacora || rep.labor === "Bitácora Mecánica";

                if (isBitacora) {
                    // For Bitacora, showing just "Bitacora Mecanica" is repetitive.
                    // If description exists, show it. If not, show "Bitacora".
                    if (rep.observaciones || rep.descripcion) {
                        const desc = rep.observaciones || rep.descripcion;
                        const shortDesc = desc.length > 50 ? desc.substring(0, 50) + '...' : desc;
                        laborDisplay = `<span style="color: var(--secondary); font-weight: bold;">Bitácora:</span> ${shortDesc}`;
                    }
                }

                html += `
                    <tr class="table-row" onclick="LaboresController.showBoletaModal('${rep.id}')" style="cursor: pointer;">
                        <td style="text-align: center;" onclick="event.stopPropagation()">
                            <input type="checkbox" class="report-chk" value="${rep.id}" style="accent-color: var(--primary); transform: scale(1.2); cursor: pointer;">
                        </td>
                        <td>${rep.fecha}</td>
                        <td style="font-weight: 500; color: #f8fafc;">${tecnicoName}</td>
                        <td>${laborDisplay}</td>
                        <td style="font-size: 0.85rem;">${rep.estacion || rep.zona || rep.equipo || 'N/A'}</td>
                        <td style="font-family: monospace; font-weight: 600;">$${(rep.costoMateriales || 0).toLocaleString()}</td>
                        <td onclick="event.stopPropagation()">
                            <div style="display: flex; align-items: center; justify-content: center;">
                                ${this.getStatusBadge(rep)}
                            </div>
                        </td>
                        <td onclick="event.stopPropagation()">
                             <div style="display: flex; gap: 0.5rem; justify-content: center;">
                                <button class="btn-icon" onclick="LaboresController.editReport('${rep.id}')" title="Editar" style="color: #f59e0b;">
                                    <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                                </button>
                                <button class="btn-icon" onclick="LaboresController.deleteReport('${rep.id}')" title="Eliminar" style="color: #ef4444;">
                                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        }

        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    toggleSelectAllReports(checked) {
        document.querySelectorAll('.report-chk').forEach(chk => chk.checked = checked);
    },

    deletedReports: [],

    deleteReport(id) {
        if (confirm(' �Está seguro de mover este reporte a la Papelera de Auditoría?')) {
            // Use loose equality (==) to handle string/number mismatches
            const item = this.reportes.find(r => r.id == id);

            if (item) {
                // 1. CRITICAL: Remove from active list FIRST and SAVE
                this.reportes = this.reportes.filter(r => r.id != id);
                this.saveToStorage();

                // 2. Add to Local Deleted (Audit)
                // Get User (Try this.currentUser, then global currentUser, then default)
                const user = (this.currentUser && this.currentUser.name) ||
                    (typeof currentUser !== 'undefined' && currentUser.name) ||
                    'Usuario';

                const deletedItem = { ...item, deletedAt: new Date().toISOString(), deletedBy: user };
                this.deletedReports.unshift(deletedItem);
                this.saveToStorage(); // Save again to sync deleted list (if quota allows)

                // 3. Add to Global Recycle Bin (Best Effort)
                try {
                    if (typeof DataManager !== 'undefined' && DataManager.addToRecycleBin) {
                        DataManager.addToRecycleBin(item, 'LABOR');
                    }
                } catch (e) {
                    console.warn("Recycle Bin Error (Non-fatal):", e);
                }

                this.renderReportes();
            } else {
                console.warn(`Reporte con ID ${id} no encontrado para eliminar.`);
                alert("Error: No se encontró el reporte para eliminar. Intente recargar la página.");
            }
        }
    },

    deleteSelectedReports() {
        const checked = document.querySelectorAll('.report-chk:checked');
        if (checked.length === 0) {
            alert('Por favor seleccione al menos un reporte para eliminar.');
            return;
        }

        if (confirm(` �Está seguro de eliminar ${checked.length} reporte(s)?\nSe moverán a la Papelera de Reciclaje Global.`)) {
            // Use loose comparisons for IDs
            const idsToDelete = Array.from(checked).map(cb => cb.value); // Keep as string or whatever comes from value

            // Find items using loose equality
            const itemsToDelete = this.reportes.filter(r => idsToDelete.some(id => id == r.id));

            // 1. CRITICAL: Remove from active list FIRST and SAVE
            this.reportes = this.reportes.filter(r => !idsToDelete.some(id => id == r.id));
            this.saveToStorage();

            // Get User Fallback
            const user = (this.currentUser && this.currentUser.name) ||
                (typeof currentUser !== 'undefined' && currentUser.name) ||
                'Usuario';

            // 2. Add to Local & Global Bins (Best Effort)
            itemsToDelete.forEach(item => {
                // Add to Local Audit Bin
                const deletedItem = { ...item, deletedAt: new Date().toISOString(), deletedBy: user };
                this.deletedReports.unshift(deletedItem);

                // Add to Global Bin
                try {
                    if (typeof DataManager !== 'undefined' && DataManager.addToRecycleBin) {
                        DataManager.addToRecycleBin(item, 'LABOR');
                    }
                } catch (e) {
                    console.warn("Recycle Bin Error (Non-fatal):", e);
                }
            });

            this.saveToStorage(); // Save deletions to local audit
            this.renderReportes();
            this.toggleSelectAllReports(false); // Uncheck master checkbox if checked

            console.log(`${itemsToDelete.length} items movidos a papelera.`);
        }
    },


    updateReportStatus(id, newStatus) {
        const report = this.reportes.find(r => r.id === id);
        if (report) {
            report.estado = newStatus;
            this.saveToStorage();
            console.log(`Estado reporte ${id} actualizado a: ${newStatus}`);
            this.renderReportes();
        }
    },

    addHoverEffects() {
        // Quick utility for hover states if css isn't enough
    },

    editReport(id) {
        const report = this.reportes.find(r => r.id === id);
        if (!report) return;

        // 1. Identify Technician
        const tecnicos = this.getFilteredPersonal().filter(t => ['JESUS ALVAREZ GIRALDO', 'JHONNIER ANDRES RAYO', 'JORGE LUIS ARICAPA'].includes(t.name.trim().toUpperCase()));
        const techName = (report.tecnico || '').trim();
        // Try strict match or fuzzy check
        let tecnico = tecnicos.find(t => (t.name === techName) || (t.nombre === techName));

        if (!tecnico) {
            alert('No se pudo identificar el técnico asociado para editar.');
            return;
        }

        this.selectedTecnico = tecnico;
        this.selectedTarea = report.tarea || report.labor;
        this.editingReportId = id;

        // 2. Set mode (Propio vs Contratista) based on report
        if (report.esContratista) {
            this.currentMode = 'CONTRATISTA';
        } else {
            this.currentMode = 'PROPIO';
        }

        // 3. Render Form (renders blank)
        this.goToFormulario(this.selectedTarea);

        // 4. Populate Form
        setTimeout(() => {
            this.populateFormFromReport(report);
        }, 100);
    },

    populateFormFromReport(report) {
        // Basic Fields
        const dateInput = document.getElementById('labor-fecha');
        if (dateInput) dateInput.value = report.fecha;

        // Bitacora Fields
        if (report.labor === "Bitácora Mecánica") {
            const fInicio = document.getElementById('bit-fecha-inicio');
            const hInicio = document.getElementById('bit-hora-inicio');
            const fFin = document.getElementById('bit-fecha-fin');
            const hFin = document.getElementById('bit-hora-fin');
            const desc = document.getElementById('labor-descripcion');
            const type = document.getElementById('bit-tipo-mant');
            const state = document.getElementById('bit-estado');

            if (fInicio) fInicio.value = report.fecha || '';
            if (hInicio) hInicio.value = report.horaInicio || '';
            if (fFin) fFin.value = report.fechaFin || '';
            if (hFin) hFin.value = report.horaFin || '';
            if (desc) desc.value = report.descripcion || '';
            if (type) type.value = report.tipoMantenimiento || '';
            if (state) state.value = report.estado || 'EJECUTADO';

            // Systems
            if (report.sistemas) {
                document.querySelectorAll('input[name="bit-sistema"]').forEach(cb => {
                    cb.checked = report.sistemas.includes(cb.value);
                });
            }

            // Restore Cards (Grouped or Single)
            this.selectedBitacoraEquipos = [];

            if (report.detalles && Array.isArray(report.detalles)) {
                // Restore from aggregated details
                this.selectedBitacoraEquipos = report.detalles.map(d => ({
                    equipo: d.equipoFull || d.equipo, // Fallback
                    materiales: d.materiales.map(m => ({
                        codigo: m.codigo,
                        descripcion: m.descripcion,
                        cantidad: m.cantidad,
                        total: m.costo // Remap cost to total for display
                    }))
                }));
            } else {
                // Legacy or Single Report fallback
                this.selectedBitacoraEquipos.push({
                    equipo: report.equipo,
                    materiales: (report.materiales || []).map(m => ({
                        codigo: m.codigo,
                        descripcion: m.descripcion,
                        cantidad: m.cantidad,
                        total: m.total || m.costo || 0
                    }))
                });
            }

            this.renderBitacoraCards();
            return; // Exit early for Bitacora to avoid standard logic interference
        }

        // Standard Report Logic
        if (true) { // keeping block structure
            // Station
            const stationSel = document.getElementById('sel-station');
            if (stationSel && report.estacion) {
                stationSel.value = report.estacion;
            }
            // ... (rest of standard logic)
        }

        // Description
        const descArea = document.getElementById('labor-descripcion');
        if (descArea) descArea.value = report.observaciones || '';

        // Status
        const statusSel = document.getElementById('labor-estado');
        if (statusSel) statusSel.value = report.estado || 'EJECUTADO';

        // --- MATERIALS (Standard) ---
        const matBody = document.getElementById('lista-materiales-body');
        if (matBody && report.materiales && report.materiales.length > 0) {
            // Clear existing empty row
            matBody.innerHTML = '';

            report.materiales.forEach(m => {
                this.addMaterialRowWithData(m);
            });
            this.calculateTotalMateriales();
        }
    },

    addMaterialRowWithData(data) {
        const tbody = document.getElementById('lista-materiales-body');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
        row.innerHTML = `
            <td style="padding: 0.5rem;">
                <input type="text" class="input-dark" placeholder="Buscar..." list="materiales-list" 
                       value="${data.codigo}"
                       onchange="LaboresController.handleMaterialSelect(this)" style="width: 100%;">
            </td>
            <td style="padding: 0.5rem;">
                <input type="text" class="input-dark" placeholder="Descripción" value="${data.descripcion}" readonly>
            </td>
            <td style="padding: 0.5rem;">
                <input type="number" class="input-dark" placeholder="0" value="${data.cantidad}"
                       onchange="LaboresController.updateRowTotal(this)" style="text-align: center;">
            </td>
            <td style="padding: 0.5rem; text-align: right;">
                 <input type="text" class="input-dark" value="$${(data.total || 0).toLocaleString()}" readonly 
                        data-raw="${data.total}" style="text-align: right; width: 100px;">
            </td>
            <td style="padding: 0.5rem; text-align: center;">
                <button type="button" class="btn-icon" onclick="this.closest('tr').remove(); LaboresController.calculateTotalMateriales();" style="color: #ef4444;">
                    <i data-lucide="trash-2" style="width: 16px;"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
        lucide.createIcons();
    },

    startAuditMode() {
        const container = document.getElementById('labores-content');
        if (!container) return;

        let html = `
            <div style="animation: fadeIn 0.3s ease;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                    <h3 style="margin: 0; color: var(--secondary);">Papelera de Auditoría</h3>
                    <div style="display: flex; gap: 0.5rem;">
                         <button class="btn" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3);" onclick="LaboresController.emptyTrash()">
                             <i data-lucide="trash" style="width: 1.2rem; margin-right: 0.5rem;"></i> Vaciar Papelera
                        </button>
                        <button class="btn" style="background: var(--bg-panel); border: 1px solid var(--glass-border);" onclick="LaboresController.renderReportes()">
                             <i data-lucide="arrow-left" style="width: 1.2rem; margin-right: 0.5rem;"></i> Volver
                        </button>
                    </div>
                </div>
                
                <div class="glass-panel" style="overflow-x: auto;">
                    <table class="modern-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="color: var(--text-muted);">
                                <th>Fecha Elim.</th>
                                <th>Usuario</th>
                                <th>Reporte Original</th>
                                <th style="text-align: right;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        if (this.deletedReports.length === 0) {
            html += `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">La papelera está vacía</td></tr>`;
        } else {
            this.deletedReports.forEach((item, index) => {
                const deletedDate = new Date(item.deletedAt).toLocaleString();
                html += `
                    <tr class="table-row">
                        <td style="font-size: 0.85rem; color: var(--text-muted);">${deletedDate}</td>
                        <td style="font-size: 0.85rem;">${item.deletedBy}</td>
                        <td>
                            <div style="font-weight: 600;">${item.labor}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${item.tecnico} - ${item.estacion}</div>
                        </td>
                        <td style="text-align: right;">
                             <button class="btn" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: rgba(16, 185, 129, 0.15); color: #10b981; border: none;" 
                                onclick="LaboresController.restoreReport(${index})">
                                <i data-lucide="rotate-ccw" style="width: 14px; margin-right: 4px;"></i> Restaurar
                            </button>
                        </td>
                    </tr>
                 `;
            });
        }

        html += `</tbody></table></div></div>`;
        container.innerHTML = html;
        lucide.createIcons();
    },

    restoreReport(index) {
        if (!confirm(' �Restaurar este reporte a la lista principal?')) return;

        const itemToRestore = this.deletedReports[index];
        // Remove from deleted
        this.deletedReports.splice(index, 1);

        // Clean Audit Props
        delete itemToRestore.deletedAt;
        delete itemToRestore.deletedBy;

        // Add back to main list
        this.reportes.unshift(itemToRestore);
        this.saveToStorage();

        // Return to audit view to see updated list
        this.startAuditMode();
        console.log("Restaurado reporte:", itemToRestore.id);
    },

    emptyTrash() {
        if (this.deletedReports.length === 0) {
            alert("La papelera ya está vacía.");
            return;
        }

        if (confirm(" �Estás seguro de VACIAR la papelera? Esta acción NO se puede deshacer.")) {
            this.deletedReports = [];
            this.saveToStorage();
            this.startAuditMode();
            alert("Papelera vaciada correctamente.");
        }
    },

    // GPS for Derivaciones
    getDerivacionGPS() {
        const input = document.getElementById('labor-derivacion-coords');
        const link = document.getElementById('labor-derivacion-map-link');

        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            return;
        }

        input.value = "Obteniendo ubicación...";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(6);
                const lng = position.coords.longitude.toFixed(6);
                input.value = `${lat}, ${lng}`;
                link.href = `https://www.google.com/maps?q=${lat},${lng}`;
                link.style.display = 'block';
            },
            (error) => {
                console.error("GPS Error:", error);
                input.value = "";
                alert("No se pudo obtener la ubicación. Verifique los permisos.");
            }
        );
    },

    // Add dynamic fields for Derivaciones
    addDerivacionField(containerId, placeholder) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '0.5rem';
        div.innerHTML = `
            <input type="text" class="input-dark dynamic-field" placeholder="${placeholder}" style="flex: 1;">
            <button type="button" onclick="this.parentElement.remove()" style="background: none; border: none; color: #ef4444; cursor: pointer;">
                <i data-lucide="trash-2" style="width: 16px;"></i>
            </button>
        `;
        container.appendChild(div);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    exportToExcel() {
        if (this.reportes.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const data = this.reportes.map(r => ({
            'FECHA': r.fecha,
            'TÉCNICO': r.tecnico,
            'ROL': r.rol,
            'LABOR': r.tarea,
            'ESTACIÓN': r.estacion,
            'ZONA': r.zona,
            'EQUIPOS': (r.equipos || []).join(', '),
            'ESTADO': r.estado,
            'COSTO MATERIALES': r.costoMateriales || 0,
            'CONTRATISTA': r.esContratista ? 'SÍ' : 'NO',
            'OBSERVACIONES': r.observaciones || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Labores Diarias");
        XLSX.writeFile(wb, `labores_diarias_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    async exportToPDF() {
        if (this.reportes.length === 0) {
            alert("No hay reportes para exportar.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape


        try {
            // Use Hardcoded Base64 Branding for maximum reliability
            if (window.Branding) {
                doc.addImage(Branding.LOGO_EMPRESA, 'PNG', 14, 10, 25, 25);
                doc.addImage(Branding.LOGO_HIDROFIX, 'PNG', 255, 10, 25, 25);
            }
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text("REPORTE DE LABORES DIARIAS", 148, 22, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, 148, 30, { align: "center" });
        } catch (e) {
            console.error("Error loading logos for PDF:", e);
            // Fallback: Just text
            doc.setFontSize(18);
            doc.text("REPORTE DE LABORES DIARIAS", 14, 22);
        }

        // Prepare Table Data
        const body = this.reportes.map(r => [
            r.fecha,
            r.tecnico,
            r.tarea,
            r.estacion,
            (r.equipos || []).join(', '),
            `$${(r.costoMateriales || 0).toLocaleString()}`,
            r.estado.toUpperCase()
        ]);

        doc.autoTable({
            startY: 40,
            head: [['FECHA', 'TÉCNICO', 'LABOR', 'ESTACIÓN', 'EQUIPOS', 'COSTO MAT.', 'ESTADO']],
            body: body,
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 40 },
                3: { cellWidth: 40 },
                4: { cellWidth: 60 },
                5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'center' }
            }
        });

        doc.save(`labores_diarias_${new Date().toISOString().split('T')[0]}.pdf`);
    },

    // --- Boleta Generation Logic (Adapted for Labores) ---
    // Show the Detail View (Dark Mode UI)
    showBoletaModal(reportId) {
        const report = this.reportes.find(r => r.id === reportId);
        if (!report) return;

        // Create modal container
        let modal = document.getElementById('boleta-modal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'boleta-modal';
        modal.setAttribute('style', `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
            display: flex; justify-content: center; align-items: center; z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `);

        // Check if report is Bitacora or Requisition (Jhonnier) or Standard
        const isBitacora = report.esBitacora === true;
        const isRequisition = (report.tecnico || '').toUpperCase().includes('JHONNIER');

        let contentHtml = '';

        if (isBitacora) {
            // --- BITÁCORA DETAIL VIEW ---
            contentHtml = `
                <div style="background: linear-gradient(145deg, #1e293b, #0f172a); width: 90%; max-width: 800px; max-height: 90vh; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    <!-- Header -->
                    <div style="padding: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; alignItems: center; gap: 1rem;">
                            <div style="width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #60a5fa;">
                                <i data-lucide="clipboard-list" style="width: 24px; height: 24px;"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.25rem; color: white;">Bitácora Mecánica</h2>
                                <div style="font-size: 0.85rem; color: #94a3b8;">ID: ${report.id}</div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('boleta-modal').remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s;">
                            <i data-lucide="x" style="width: 24px;"></i>
                        </button>
                    </div>

                    <div style="padding: 2rem;">
                         <!-- Main Info Grid -->
                         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;"> 
                            <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Técnico</label>
                                <div style="color: white; font-weight: 500;">${report.tecnico}</div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Fecha Inicio</label>
                                <div style="color: white; font-weight: 500;">${report.fecha} ${report.horaInicio || ''}</div>
                            </div>
                             <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Fecha Fin</label>
                                <div style="color: white; font-weight: 500;">${report.fechaFin || ''} ${report.horaFin || ''}</div>
                            </div>
                            <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Equipo</label>
                                <div style="color: #60a5fa; font-weight: 500;">${report.equipo}</div>
                            </div>
                             <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Tipo Mantenimiento</label>
                                <div style="color: white; font-weight: 500;">${report.tipoMantenimiento}</div>
                            </div>
                             <div>
                                <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.05em;">Estado</label>
                                <span style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; background: rgba(16, 185, 129, 0.1); color: #34d399;">
                                    ${report.estado}
                                </span>
                            </div>
                         </div>

                         <!-- Systems -->
                         <div style="margin-bottom: 2rem;">
                            <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Sistemas Intervenidos</label>
                            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                                ${(report.sistemas || []).map(s => `
                                    <span style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); padding: 0.25rem 0.75rem; border-radius: 0.3rem; color: #cbd5e1; font-size: 0.85rem;">
                                        ${s}
                                    </span>
                                `).join('')}
                                ${(report.sistemas || []).length === 0 ? '<span style="color: #64748b; font-style: italic;">Ninguno registrado</span>' : ''}
                            </div>
                         </div>

                         <!-- Description -->
                         <div style="margin-bottom: 2rem; background: rgba(0, 0, 0, 0.2); border-radius: 0.75rem; padding: 1.5rem;">
                            <label style="display: block; font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em;">Descripción del Trabajo</label>
                            <div style="color: #cbd5e1; line-height: 1.6;">
                                ${report.observaciones || 'Sin descripción.'}
                            </div>
                         </div>

                         <!-- Materials Table -->
                         <div style="margin-bottom: 2rem;">
                            <h3 style="font-size: 1rem; color: white; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i data-lucide="package" style="width: 18px; color: #60a5fa;"></i> Repuestos Utilizados
                            </h3>
                            <div style="border: 1px solid rgba(255,255,255,0.1); border-radius: 0.5rem; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                    <thead style="background: rgba(255,255,255,0.05); color: #94a3b8; font-size: 0.75rem; text-transform: uppercase;">
                                        <tr>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Repuesto</th>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Descripción</th>
                                            <th style="padding: 1rem; text-align: center; font-weight: 600;">Cant.</th>
                                            <th style="padding: 1rem; text-align: right; font-weight: 600;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody style="color: #e2e8f0;">
                                        ${(report.materiales || []).map(m => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                                <td style="padding: 1rem;">${m.codigo}</td>
                                                <td style="padding: 1rem;">${m.descripcion}</td>
                                                <td style="padding: 1rem; text-align: center;">${m.cantidad}</td>
                                                <td style="padding: 1rem; text-align: right;">$${(m.total || 0).toLocaleString()}</td>
                                            </tr>
                                        `).join('')}
                                        ${(report.materiales || []).length === 0 ? '<tr><td colspan="4" style="padding: 2rem; text-align: center; color: #64748b;">No se registraron repuestos</td></tr>' : ''}
                                    </tbody>
                                    <tfoot style="background: rgba(0,0,0,0.2);">
                                        <tr>
                                            <td colspan="3" style="padding: 1rem; text-align: right; color: #94a3b8; font-weight: 600;">Costos Repuestos:</td>
                                            <td style="padding: 1rem; text-align: right; color: #60a5fa; font-weight: 600; font-size: 1rem;">$${(report.costoMateriales || 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                         </div>
                    </div>

                    <!-- Footer -->
                    <div style="padding: 1.5rem; background: rgba(0,0,0,0.2); border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: flex-end; gap: 1rem;">
                        <button onclick="LaboresController.openPrintFormat(${report.id})" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: background 0.2s;">
                            <i data-lucide="printer" style="width: 18px;"></i> Imprimir Bitácora
                        </button>
                    </div>
                </div>
             `;
        } else {
            // --- STANDARD / REQUISITION VIEW (Existing Logic) ---
            // I will reuse the existing logic in the else block, but I'll need to wrap it correctly.
            // Since I can't easily "unwrap" the existing code in a replace call without matching perfectly, 
            // I will implement the Standard view here as well, essentially copying what was likely there but cleaned up.

            contentHtml = `
                <div style="background: var(--bg-card-glass); backdrop-filter: blur(16px); width: 90%; max-width: 800px; max-height: 90vh; border-radius: 1rem; border: 1px solid var(--glass-border); overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                    <div style="padding: 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; alignItems: center; gap: 1rem;">
                            <div style="width: 48px; height: 48px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #3b82f6;">
                                <i data-lucide="file-text" style="width: 24px; height: 24px;"></i>
                            </div>
                            <div>
                                <h2 style="margin: 0; font-size: 1.25rem; color: var(--text-main);">${isRequisition ? 'Requisición de Materiales' : 'Detalle de Labor'}</h2>
                                <div style="font-size: 0.85rem; color: var(--text-muted);">${report.tarea}</div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('boleta-modal').remove()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: all 0.2s;">
                            <i data-lucide="x" style="width: 24px;"></i>
                        </button>
                    </div>

                     <div style="padding: 2rem;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;"> 
                            <div><label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Técnico</label><div style="color: var(--text-main); font-weight: 500;">${report.tecnico}</div></div>
                            <div><label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Fecha</label><div style="color: var(--text-main); font-weight: 500;">${report.fecha}</div></div>
                            <div><label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Estación/Zona</label><div style="color: var(--text-main); font-weight: 500;">${report.estacion} - ${report.zona}</div></div>
                            <div><label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem; text-transform: uppercase;">Estado</label><span style="padding:0.25rem 0.75rem; border-radius:999px; background:rgba(16,185,129,0.1); color:#10b981; font-size:0.75rem; font-weight: 600;">${report.estado}</span></div>
                        </div>

                        ${report.equipos && report.equipos.length > 0 ? `
                        <div style="margin-bottom: 2rem;">
                            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">Equipos</label>
                            <div style="background: rgba(15, 23, 42, 0.05); padding: 1rem; border-radius: 0.5rem; color: var(--text-main); border: 1px solid var(--glass-border);">${report.equipos.join(', ')}</div>
                        </div>` : ''}

                         <div style="margin-bottom: 2rem; background: rgba(15, 23, 42, 0.05); border: 1px solid var(--glass-border); border-radius: 0.75rem; padding: 1.5rem;">
                            <label style="display: block; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase;">Observaciones</label>
                            <div style="color: var(--text-main); line-height: 1.6;">${report.observaciones || 'Sin observaciones.'}</div>
                        </div>

                         <div style="margin-bottom: 2rem;">
                            <h3 style="font-size: 1rem; color: var(--text-main); margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i data-lucide="package" style="width: 18px; color: #3b82f6;"></i> Materiales
                            </h3>
                             <div style="border: 1px solid var(--glass-border); border-radius: 0.5rem; overflow: hidden;">
                                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                                    <thead style="background: rgba(15, 23, 42, 0.03); color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase;">
                                        <tr>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Material</th>
                                            <th style="padding: 1rem; text-align: left; font-weight: 600;">Desc.</th>
                                            <th style="padding: 1rem; text-align: center; font-weight: 600;">Cant.</th>
                                        </tr>
                                    </thead>
                                    <tbody style="color: var(--text-main);">
                                        ${(report.materiales || []).map(m => `
                                            <tr style="border-bottom: 1px solid var(--glass-border);">
                                                <td style="padding: 1rem;">${m.codigo}</td>
                                                <td style="padding: 1rem;">${m.descripcion}</td>
                                                <td style="padding: 1rem; text-align: center;">${m.cantidad}</td>
                                            </tr>
                                        `).join('')}
                                        ${(report.materiales || []).length === 0 ? '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-muted);">No hay materiales</td></tr>' : ''}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                     </div>

                     <div style="padding: 1.5rem; background: rgba(0,0,0,0.02); border-top: 1px solid var(--glass-border); display: flex; justify-content: flex-end; gap: 1rem;">
                        <button onclick="LaboresController.openPrintFormat(${report.id})" style="background: var(--primary); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                            <i data-lucide="printer" style="width: 18px;"></i> ${isRequisition ? 'Generar Requisición' : 'Imprimir Boleta'}
                        </button>
                    </div>
                </div>
             `;
        }

        modal.innerHTML = contentHtml;
        document.body.appendChild(modal);
        lucide.createIcons();
    },

    openPrintFormat(reportId) {
        // Close detail modal if open
        const detailModal = document.getElementById('boleta-modal'); // logic uses boleta-modal ID now
        if (detailModal) detailModal.remove();

        // Also remove the specific report-detail-modal if it exists (legacy id)
        const legacyModal = document.getElementById('report-detail-modal');
        if (legacyModal) legacyModal.remove();

        const report = this.reportes.find(r => r.id === reportId);
        if (!report) return;

        // Determine Mode
        const tecnicoName = (report.tecnico || '').toUpperCase();
        const isJhonnier = tecnicoName.includes('JHONNIER');
        const isBitacora = report.esBitacora === true;

        // Common Data
        const materiales = report.materiales || [];
        // [MODIFIED] User requested Equipment Code instead of Station Name
        const displayDestino = (report.equipos && report.equipos.length > 0)
            ? report.equipos.join(', ')
            : (report.equipo || report.estacion || 'N/A');

        const terreno = displayDestino; // Reusing variable name to minimize changes in template
        const labor = report.tarea || report.labor || 'N/A';

        // Create Modal Container for Print/Preview
        let modalContainer = document.createElement('div');
        modalContainer.id = 'print-modal';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '0';
        modalContainer.style.left = '0';
        modalContainer.style.width = '100%';
        modalContainer.style.height = '100%';
        modalContainer.style.background = 'rgba(0,0,0,0.85)';
        modalContainer.style.display = 'flex';
        modalContainer.style.justifyContent = 'center';
        modalContainer.style.alignItems = 'center';
        modalContainer.style.zIndex = '9999';
        modalContainer.style.padding = '20px';
        modalContainer.style.overflowY = 'auto'; // Allow scrolling if needed

        document.body.appendChild(modalContainer);

        let modalHtml = "";

        if (isBitacora) {
            // --- LAYOUT 3: BITÁCORA MECÁNICA ---
            // A specialized layout for mechanical logs
            modalHtml = `
                <div style="background: white; color: black; padding: 40px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; max-width: 900px; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <div style="border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between;">
                        <div>
                             <h1 style="margin: 0; font-size: 24px; color: #1e293b; text-transform: uppercase;">Bitácora Mecánica</h1>
                             <div style="font-size: 14px; color: #64748b; margin-top: 5px;">Reporte de Mantenimiento y Reparación</div>
                        </div>
                        <div style="text-align: right;">
                             <div style="font-weight: bold; font-size: 14px;">ID: ${report.id}</div>
                             <div style="color: #64748b;">${new Date().toLocaleDateString()}</div>
                        </div>
                    </div>

                    <!-- Main Info -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
                        <div>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 120px;">TÉCNICO:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${report.tecnico}</td></tr>
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">EQUIPO:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${report.equipo}</td></tr>
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">TIPO MANT.:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${report.tipoMantenimiento}</td></tr>
                            </table>
                        </div>
                        <div>
                             <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; width: 120px;">INICIO:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${report.fecha} ${report.horaInicio}</td></tr>
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">FIN:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${report.fechaFin || report.fecha} ${report.horaFin || ''}</td></tr>
                                <tr><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold;">ESTADO:</td><td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #10b981;">${report.estado.toUpperCase()}</td></tr>
                            </table>
                        </div>
                    </div>

                    <!-- Systems -->
                    <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                         <div style="font-weight: bold; margin-bottom: 10px; color: #475569; text-transform: uppercase; font-size: 10px; letter-spacing: 1px;">Sistemas Intervenidos</div>
                         <div style="font-size: 13px; color: #1e293b;">${(report.sistemas || ['Ninguno']).join(', ')}</div>
                    </div>

                    <!-- Description -->
                    <div style="margin-bottom: 30px;">
                        <h3 style="font-size: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #1e293b;">DESCRIPCIÓN DE LA LABOR</h3>
                        <div style="font-size: 12px; line-height: 1.6; color: #334155; text-align: justify;">
                            ${report.observaciones || 'Sin descripción detallada.'}
                        </div>
                    </div>

                    <!-- Materials -->
                     <div style="margin-bottom: 30px;">
                        <h3 style="font-size: 14px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #1e293b;">REPUESTOS Y MATERIALES</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background: #f1f5f9; color: #475569;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">CÓDIGO</th>
                                    <th style="padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0;">DESCRIPCIÓN</th>
                                    <th style="padding: 10px; text-align: center; border-bottom: 1px solid #e2e8f0;">CANT.</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(report.materiales || []).map(m => `
                                    <tr>
                                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.codigo || '-'}</td>
                                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${m.descripcion}</td>
                                        <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${m.cantidad}</td>
                                    </tr>
                                `).join('')}
                                ${(report.materiales || []).length === 0 ? '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #94a3b8;">No se utilizaron repuestos.</td></tr>' : ''}
                            </tbody>
                        </table>
                    </div>

                     <!-- Footer / Signatures -->
                    <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px;">
                        <div style="border-top: 1px solid #94a3b8; padding-top: 10px; text-align: center;">
                            <div style="font-weight: bold; margin-bottom: 5px;">${report.tecnico}</div>
                            <div style="font-size: 10px; color: #64748b;">Firma Técnico</div>
                        </div>
                        <div style="border-top: 1px solid #94a3b8; padding-top: 10px; text-align: center;">
                            <div style="margin-bottom: 5px;">&nbsp;</div>
                            <div style="font-size: 10px; color: #64748b;">Firma Supervisor / Recibido</div>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="margin-top: 40px; text-align: center;" class="no-print">
                         <button onclick="document.getElementById('print-modal').remove()" style="padding: 10px 20px; border: 1px solid #cbd5e1; background: white; border-radius: 6px; cursor: pointer; margin-right: 10px;">Cerrar</button>
                         <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer;">Imprimir PDF</button>
                    </div>
                </div>
             `;

        } else if (isJhonnier) {
            // --- LAYOUT 1: REQUISICIÓN INTERNA CONSUMOS (Jhonnier) ---
            let rowsHtml = '';
            if (materiales.length > 0) {
                materiales.forEach(m => {
                    const cod = m.codigo || m.id || '-';
                    const desc = m.descripcion || m.nombre || 'Material';
                    const cant = parseFloat(m.cantidad || 0).toFixed(4);
                    const um = m.unidad || 'UND';

                    rowsHtml += `
                        <tr style="font-size: 10px; height: 20px; border-bottom: 1px solid #ccc;">
                            <td style="padding: 2px 5px;">${cod}</td>
                            <td style="padding: 2px 5px;">${desc}</td>
                            <td style="padding: 2px 5px; text-align: center;"></td>
                            <td style="padding: 2px 5px; text-align: center;">01000</td>
                            <td style="padding: 2px 5px; text-align: center;">${um}</td>
                            <td style="padding: 2px 5px; text-align: right;">${cant}</td>
                            <td style="padding: 2px 5px; text-align: center;">00101</td>
                            <td style="padding: 2px 5px; text-align: center;">330100</td>
                            <td style="padding: 2px 5px; text-align: center;">602-05</td>
                            <td style="padding: 2px 5px;"></td>
                        </tr>`;
                });
            } else {
                rowsHtml = `<tr><td colspan="10" style="text-align: center; padding: 10px; font-style: italic;">Sin materiales</td></tr>`;
            }

            modalHtml = `
                <div style="background: white; color: black; padding: 30px; font-family: Arial, sans-serif; font-size: 11px; max-width: 950px; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <div style="border: 2px solid #000; padding: 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="width: 25%; padding: 10px; border-right: 2px solid #000; vertical-align: middle;">
                                    <img src="assets/logo-riopaila.jpg" alt="Riopaila" style="height: 50px; display: block;">
                                    <div style="font-weight: bold; font-size: 10px; margin-top: 5px;">NIT 890302567</div>
                                </td>
                                <td style="width: 45%; text-align: center; font-weight: bold; font-size: 14px; border-right: 2px solid #000; vertical-align: middle;">
                                    REQUISICION INTERNA CONSUMOS
                                </td>
                                <td style="width: 30%; padding: 10px; vertical-align: middle;">
                                    <div style="font-weight: bold;">Número: REQ-${String(report.id).padStart(8, '0')}</div>
                                    <div style="margin-top: 5px;">Fecha: &nbsp; ${report.fecha || new Date().toLocaleDateString()}</div>
                                    <div style="margin-top: 5px;">Referencia:</div>
                                </td>
                            </tr>
                        </table>

                        <div style="border-top: 2px solid #000; padding: 10px;">
                            <table style="width: 100%;">
                                <tr>
                                    <td style="width: 15%; font-weight: bold;">Solicitante:</td>
                                    <td style="width: 50%;">49 &nbsp;&nbsp; SOL RECURSOS HIDRICOS (Ana Maria Mosquera)</td>
                                    <td style="width: 35%;"></td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold;">Fecha de entrega programada:</td>
                                    <td>${report.fecha || new Date().toLocaleDateString()}</td>
                                    <td style="text-align: right; font-weight: bold;">Fecha entrega real: ________________</td>
                                </tr>
                                <tr>
                                    <td style="font-weight: bold; vertical-align: top;">Notas:</td>
                                    <td colspan="2">${labor} - ${terreno}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-top: 20px; border-top: 2px solid #000; border-bottom: 2px solid #000;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="font-weight: bold; font-size: 10px;">
                                    <tr style="border-bottom: 1px solid #000;">
                                        <th style="text-align: left; padding: 5px;">Referencia</th>
                                        <th style="text-align: left; padding: 5px; width: 30%;">Descripción</th>
                                        <th style="text-align: center; padding: 5px;">Talla-Color</th>
                                        <th style="text-align: center; padding: 5px;">Bodega</th>
                                        <th style="text-align: center; padding: 5px;">U.M.</th>
                                        <th style="text-align: right; padding: 5px;">Cantidad</th>
                                        <th style="text-align: center; padding: 5px;">U.N</th>
                                        <th style="text-align: center; padding: 5px;">C. Costo</th>
                                        <th style="text-align: center; padding: 5px;">Motivo</th>
                                        <th style="text-align: left; padding: 5px;">C. Entregada</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                        <div style="height: 50px;"></div>
                        <div style="border-top: 2px solid #000;"></div>
                    </div>
                    <div style="margin-top: 20px; text-align: center;" class="no-print">
                        <button onclick="document.getElementById('print-modal').remove()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Imprimir / Guardar PDF</button>
                         <button onclick="LaboresController.sendBoletaEmail(${report.id}, '${terreno.replace(/'/g, "\\'")}')" 
                                style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                             Enviar por Correo
                        </button>
                    </div>
                </div>`;

        } else {
            // --- LAYOUT 2: BOLETA DE APLICACIÓN (Standard) ---
            let trHtml = '';
            // Determine rows to print
            let printRows = [];

            // Case A: Grouped Report (Bitacora with detalles)
            if (report.detalles && report.detalles.length > 0) {
                report.detalles.forEach(d => {
                    const specificEq = d.equipoFull || d.equipo;
                    if (d.materiales && d.materiales.length > 0) {
                        d.materiales.forEach(m => {
                            printRows.push({
                                eq: specificEq,
                                mat: m
                            });
                        });
                    }
                });
            } else {
                // Case B: Standard Report (or flat legacy)
                if (materiales.length > 0) {
                    materiales.forEach(m => {
                        printRows.push({
                            eq: terreno, // Uses the globally calculated destination
                            mat: m
                        });
                    });
                }
            }

            // Description for Activity Column
            // User requested: "descripción del cod.actividad" -> We use the user's typed description or fallback to labor name.
            const activityDesc = report.descripcion || report.tarea || report.labor || 'Mantenimiento';

            if (printRows.length > 0) {
                printRows.forEach(row => {
                    const m = row.mat;
                    const eqName = row.eq;

                    const codMat = m.codigo || m.id || '-';
                    const descMat = m.descripcion || m.nombre || 'Material Sin Nombre';
                    const cant = m.cantidad || 0;
                    const unidad = m.unidad || 'UND';
                    const orden = m.orden || '-'; // Assuming 'orden' might exist in material/detail

                    trHtml += `
                        <tr style="height: 25px; border-bottom: 1px dotted #ccc;">
                            <td style="background: #e6f4ea; border-right: 1px dashed #999; text-align: center;">${eqName}</td>
                            <td style="background: #e6f4ea; border-right: 1px dashed #999; text-align: center;">-</td>
                            <td style="border-right: 1px dashed #ccc; padding-left: 5px;">${activityDesc}</td>
                            <td style="border-right: 1px dashed #ccc; text-align: center;">UND</td>
                            <td style="background: #ffffcc; border-right: 1px dashed #999; text-align: center;">${codMat}</td>
                            <td style="border-right: 1px dashed #ccc; padding-left: 5px;">${descMat}</td>
                            <td style="border-right: 1px dashed #ccc; text-align: center;">${unidad}</td>
                            <td style="background: #ffffcc; text-align: center; font-weight: bold;">${cant}</td>
                             <td style="text-align: center; border-left: 1px dashed #999; color: #B91C1C;">${orden}</td>
                        </tr>`;
                });
            } else {
                trHtml += `
                    <tr style="height: 25px; border-bottom: 1px dotted #ccc;">
                        <td style="background: #e6f4ea; border-right: 1px dashed #999; text-align: center;">${terreno}</td>
                        <td style="background: #e6f4ea; border-right: 1px dashed #999; text-align: center;">-</td>
                        <td style="border-right: 1px dashed #ccc; padding-left: 5px;">${labor}</td>
                        <td style="border-right: 1px dashed #ccc; text-align: center;">UND</td>
                        <td colspan="5" style="text-align: center; font-style: italic;">Sin materiales registrados</td>
                    </tr>`;
            }

            modalHtml = `
                <div style="background: white; color: black; padding: 20px; font-family: Arial, sans-serif; font-size: 11px; max-width: 900px; width: 100%; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px; border-bottom: 2px solid #333; padding-bottom: 10px;">
                        <div>
                            <img src="assets/logo-riopaila.jpg" alt="Riopaila" style="height: 60px; object-fit: contain;"> 
                        </div>
                        <div style="text-align: right;">
                            <h3 style="margin: 0; color: #333;">BOLETA DE APLICACIÓN</h3>
                            <p style="margin: 5px 0 0 0; font-size: 10px;">GENERADO: ${new Date().toLocaleString()}</p>
                            <p style="margin: 2px 0 0 0; font-size: 10px;">REPORTE ID: ${report.id}</p>
                        </div>
                    </div>

                     <!-- Header Info -->
                    <div style="margin-bottom: 10px; font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 5px;">
                         <strong>Responsable:</strong> ${solicitante || 'Desconocido'} &nbsp;|&nbsp; 
                         <strong>Fecha Reporte:</strong> ${report.fecha}
                         ${report.observaciones ? `<br><strong>Observaciones:</strong> ${report.observaciones}` : ''}
                    </div>

                     <table border="1" cellspacing="0" cellpadding="4" style="width: 100%; border-collapse: collapse; border: 1px solid #999; font-family: Arial, sans-serif;">
                        <thead style="font-weight: bold; font-size: 11px;">
                            <tr style="height: 30px; background: #9bbb59; color: white;">
                                <th style="border: 1px solid #666; width: 100px;">Equipo / Sector</th>
                                <th style="border: 1px solid #666; width: 60px;">Cód. Act.</th>
                                <th style="border: 1px solid #666;">Descr. Actividad</th>
                                <th style="border: 1px solid #666; width: 50px;">UM. Act.</th>
                                <th style="border: 1px solid #666; width: 100px;">Cód. Recurso</th>
                                <th style="border: 1px solid #666;">Descr. Recurso/Material</th>
                                <th style="border: 1px solid #666; width: 60px;">UM Rec.</th>
                                <th style="border: 1px solid #666; width: 60px;">Cantidad</th>
                                <th style="border: 1px solid #666; width: 50px;">Orden</th>
                            </tr>
                        </thead>
                        <tbody style="font-size: 12px;">
                            ${trHtml}
                        </tbody>
                    </table>
                            ${trHtml}
                        </tbody>
                    </table>

                     <div style="margin-top: 20px; text-align: center;" class="no-print">
                        <button onclick="document.getElementById('print-modal').remove()" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">Cerrar</button>
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                            ${isJhonnier ? 'Generar Requisición' : 'Imprimir / Guardar PDF'}
                        </button>
                        <button onclick="LaboresController.copyPrintToClipboard()" 
                                style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                             <i data-lucide="copy" style="width:16px;"></i> Copiar Formato
                        </button>
                        <button onclick="LaboresController.sendBoletaEmail(${report.id}, '${terreno.replace(/'/g, "\\'")}')" 
                                style="padding: 10px 20px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                             Enviar por Correo
                        </button>
                    </div>
                </div>`;
        }

        // Store for copy function
        this.currentBoletaHtml = modalHtml;

        modalContainer.innerHTML = modalHtml;
    },

    async copyPrintToClipboard() {
        if (!this.currentBoletaHtml) return;

        // Use a temp container to extract ONLY the visual table, not the buttons
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.currentBoletaHtml;

        // Remove no-print section
        const noPrints = tempDiv.getElementsByClassName('no-print');
        while (noPrints.length > 0) {
            noPrints[0].parentNode.removeChild(noPrints[0]);
        }

        const cleanHtml = tempDiv.innerHTML;

        try {
            const blob = new Blob([cleanHtml], { type: 'text/html' });
            const data = [new ClipboardItem({ 'text/html': blob })];
            await navigator.clipboard.write(data);
            alert(' �Formato copiado!\n\nAhora puedes pegarlo (Ctrl+V) directamente en tu correo.');
        } catch (err) {
            console.error('Error copiando:', err);
            alert('No se pudo copiar automáticamente. Intenta seleccionar la tabla y copiarla manualmente.');
        }
    },

    sendBoletaEmail(reportId, terreno) {
        const report = this.reportes.find(r => r.id === reportId);
        if (!report) return;

        const tecnicoName = (report.tecnico || '').toUpperCase();
        const isJhonnier = tecnicoName.includes('JHONNIER');

        let emailTo = "";
        let emailCc = "ammosquera@agricolas.co, jereyes@agricolas.co, aataimal@agricolas.co";
        let bodyStart = "";

        if (isJhonnier) {
            emailTo = "mospina@agricolas.co";
            emailCc = "";
            bodyStart = `Cordial saludo, \n\nMaria me colaboras con la creación de la siguiente requisición para retiro de materiales.`;
        } else {
            emailTo = "sjrodriguez@agricolas.co";
            emailCc += ", mospina@agricolas.co";
            bodyStart = `Cordial saludo, \n\nSergio me colaboras con la creación de la siguiente boleta de aplicación para retiro de inusmos, adjunto formato.`;
        }

        let body = `${bodyStart} \n\n`;
        body += `[PRESIONA CTRL+V AQUI PARA PEGAR LA BOLETA]\n\n`;
        body += `--------------------------------------------------\n`;
        body += `Reporte ID: ${reportId} - Lugar: ${terreno} \n`;
        body += `Generado por Hidrofix Manager (Labores).`;

        const docType = isJhonnier ? "Requisición" : "Boleta de Aplicación";
        const subject = `${docType} - Reporte ${reportId} - ${terreno}`;
        window.location.href = `mailto:${emailTo}?cc=${emailCc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
};

