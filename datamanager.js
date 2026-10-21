// DataManager.js - El cerebro de los datos

const DataManager = {
    // URL Base: Try to get from LocalStorage, else default to localhost
    API_URL: (function () {
        if (window.location.protocol === 'file:') return 'http://127.0.0.1:3000/api';
        // If accessed via standard ports (80/443) but API is on 3000, point explicitly
        if (!window.location.port || window.location.port === '80' || window.location.port === '443') {
            return window.location.protocol + '//' + window.location.hostname + ':3000/api';
        }
        return '/api';
    })(),

    getAuthHeaders() {
        const token = AuthManager.getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    },

    // Helper for safe JSON parsing specifically for arrays
    safeParseArray(key, defaultValue = '[]') {
        try {
            const data = localStorage.getItem(key);
            if (!data || data === 'null' || data === 'undefined') return JSON.parse(defaultValue);
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : JSON.parse(defaultValue);
        } catch (e) {
            console.warn(`DataManager: Error parsing ${key}, returning default.`, e);
            return JSON.parse(defaultValue);
        }
    },

    async syncToCloud() {
        console.log("Starting Sync to Cloud...");
        const data = {
            planes: this.getPlanes(),
            equipos: this.getEquipos(),
            boletas: this.getBoletas(),
            labores: JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]'),
            personal: this.getPersonal(),
            materiales: this.getAllMaterials(),
            capex: this.getCapex()
        };

        try {
            // Upload Planes
            for (const p of data.planes) {
                await fetch(`${this.API_URL}/planes`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(p)
                });
            }
            // Upload Equipos
            for (const e of data.equipos) {
                await fetch(`${this.API_URL}/equipos`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(e)
                });
            }
            // Upload Boletas
            for (const b of data.boletas) {
                await fetch(`${this.API_URL}/boletas`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(b)
                });
            }
            // Upload Labores
            for (const l of data.labores) {
                await fetch(`${this.API_URL}/labores`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(l)
                });
            }
            // Upload Personal
            for (const p of data.personal) {
                await fetch(`${this.API_URL}/personal`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(p)
                });
            }
            // Upload Materiales
            for (const m of data.materiales) {
                await fetch(`${this.API_URL}/materiales`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(m)
                });
            }
            // Upload CAPEX
            for (const c of data.capex) {
                await fetch(`${this.API_URL}/capex`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(c)
                });
            }

            alert("Sincronización con el servidor completada con éxito.");
            localStorage.setItem('hidrofix_migrated', 'true');
        } catch (error) {
            console.error("Error syncing to cloud:", error);
            alert("Error al sincronizar: " + error.message);
        }
    },

    async loadFromCloud() {
        try {
            console.log("Loading data from Cloud API...");

            // Parallel Fetch - Adding error handling per fetch to avoid full failure
            // Note: safeFetch now includes auth headers implicitly via getAuthHeaders logic if I recall correctly... 
            // Wait, standard fetch(url) is GET. I need to add headers to GET requests too if the API protects them.
            // For now, assuming GETs are also protected or public. Let's add headers to be safe.

            const getOpts = { headers: this.getAuthHeaders() };
            const safeFetch = (url) => fetch(url, getOpts).then(r => {
                if (r.status === 401) {
                    console.warn(`Auth failed for ${url} - failing gracefully without logout`);
                    // AuthManager.logout(); // CAUSING LOOP?
                    throw new Error("Unauthorized");
                }
                if (!r.ok) throw new Error("Server Error");
                return r.json();
            }).catch(e => {
                console.warn(`Fetch failed for ${url}:`, e);
                return null; // Return null on error to distinguish from empty array
            });

            const [p, e, b, l, per, mat, cpx] = await Promise.all([
                safeFetch(`${this.API_URL}/planes`),
                safeFetch(`${this.API_URL}/equipos`),
                safeFetch(`${this.API_URL}/boletas`),
                safeFetch(`${this.API_URL}/labores`),
                safeFetch(`${this.API_URL}/personal`),
                safeFetch(`${this.API_URL}/materiales`),
                safeFetch(`${this.API_URL}/capex`)
            ]);

            // Update Local Cache (LocalStorage) - Only if fetch was successful (not null)
            if (p !== null) localStorage.setItem('hidrofix_planes_v2', JSON.stringify(Array.isArray(p) ? p : []));
            if (e !== null) localStorage.setItem('hidrofix_equipos', JSON.stringify(Array.isArray(e) ? e : []));
            if (b !== null) localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(Array.isArray(b) ? b : []));
            if (l !== null) localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(Array.isArray(l) ? l : []));
            if (per !== null) localStorage.setItem('hidrofix_personal', JSON.stringify(Array.isArray(per) ? per : []));
            if (mat !== null) localStorage.setItem('hidrofix_materiales_v3', JSON.stringify(Array.isArray(mat) ? mat : []));
            if (cpx !== null) localStorage.setItem('hidrofix_capex', JSON.stringify(Array.isArray(cpx) ? cpx : []));

            console.log("Data loaded from cloud successfully.");
            return true;
        } catch (error) {
            console.error("Error loading from cloud:", error);
            return false;
        }
    },

    // --- Mock Data Inicial (Para que no esté vacío) ---
    defaults: {
        planes: [
            {
                id: "PLAN-006",
                codigo: "MTTO-250H",
                descripcion: "MANTENIMIENTO 250 HORAS",
                tipo: "Preventivo",
                equipo: "331002",
                ubicacion: "CAMPAMENTO EL DURÁN",
                fechaRegistro: "2025-12-02",
                fechaUltimoMovimiento: "18/12/2025 14:34:06",
                estado: "ACTIVO",
                duracion: "0:03:00",
                secuencia: 1,
                costoTotal: 434012,
                usuario: "mospina@agricolas.co",
                solicitarBoleta: "NO",
                materiales: [
                    { codigo: "14700441", descripcion: "FILTRO DE COMBUSTIBLE 84467749", cantidad: 1 },
                    { codigo: "14700443", descripcion: "FILTRO DE COMBUSTIBLE TRAMPA", cantidad: 1 },
                    { codigo: "14700445", descripcion: "FILTRO DE ACEITE 87679562", cantidad: 1 },
                    { codigo: "14700451", descripcion: "FILTRO DE ACEITE 82824884", cantidad: 1 },
                    { codigo: "14700491", descripcion: "ACEITE HYTRAN", cantidad: 5 },
                    { codigo: "14700230", descripcion: "ACEITE REF:15W40 X 55 GALONES", cantidad: 2 }

                ]
            }
        ],
        equipos: [
            { codigo: "331001", descripcion: "TRACTOR CASE FARMALL 75 HP", ubicacion: "CAMPAMENTO LA LUISA", consumo: "0.6", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "75", potenciaKw: "56", proveedor: "PROPIO" },
            { codigo: "331002", descripcion: "TRACTOR CASE FARMALL 75 HP", ubicacion: "BOMBEO EL DURÁN", consumo: "0.7", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "75", potenciaKw: "56", proveedor: "PROPIO" },
            { codigo: "331425", descripcion: "TRACTOR CASE QUANTUM 65V", ubicacion: "CAMPAMENTO LA LUISA", consumo: "0.5", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "PROPIO" },
            { codigo: "332001", descripcion: "DRAGA VALDIVIA NO.01", ubicacion: "BOMBEO LA ENCANECADA", consumo: "12", funcion: "LIMPIEZA", caudal: "200", variador: "NO", potenciaHP: "500", potenciaKw: "373", proveedor: "PROPIO" },
            { codigo: "332506", descripcion: "GUADAÑA TIPO APOLO 66\" No 1", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "332507", descripcion: "GUADAÑA TIPO APOLO 66\" No 2", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "332576", descripcion: "BOMBA FUMIGADORA ESTACIONARIA", ubicacion: "LOS MANGOS", consumo: "", funcion: "FUMIGACIÓN", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "332577", descripcion: "INSUFLADORA MATA HORMIGAS NO.1", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "FUMIGACIÓN", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "332578", descripcion: "INSUFLADORA MATA HORMIGAS NO.2", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "FUMIGACIÓN", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339017", descripcion: "GUADAÑA HUSQVARA NO.01", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339018", descripcion: "GUADAÑA HUSQVARA NO.02", ubicacion: "LOS MANGOS", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339019", descripcion: "GUADAÑA HUSQVARA NO.03", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339022", descripcion: "GUADAÑA HUSQVARNA No.04", ubicacion: "BOMBEO EL MATEO", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339023", descripcion: "GUADAÑA HUSQVARNA No.05", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339026", descripcion: "GUADAÑA HUSQVARNA No.06", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339027", descripcion: "GUADAÑA HUSQVARNA No.07", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339013", descripcion: "IMPLEMENTO TANQUE AGUA No.1", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "OBRAS CIVILES", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339008", descripcion: "MOTOSOLDADOR FIELD POWER 190", ubicacion: "RIOPAILA AGRICOLA", consumo: "", funcion: "SOLDADURA", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339007", descripcion: "IMPLEMENTO TROMPO MEZCLADOR No.1", ubicacion: "RIOPAILA AGRICOLA", consumo: "", funcion: "OBRAS CIVILES", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "336591", descripcion: "BOMBA ELEC HORIZONTAL No. 91", ubicacion: "BOMBEO LUISA 2", consumo: "0", funcion: "RIEGO", caudal: "120", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "RIOEN" },
            { codigo: "336601", descripcion: "BOMBA ELEC FLUJO MIXTO No.01", ubicacion: "BOMBEO LAGUNAS 1", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "80", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336604", descripcion: "BOMBA ELEC FLUJO MIXTO No.04", ubicacion: "BOMBEO LAGUNAS 2", consumo: "0", funcion: "DRENAJE", caudal: "200", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336607", descripcion: "BOMBA ELEC FLUJO MIXTO No.07", ubicacion: "BOMBEO LAGUNAS 1", consumo: "0", funcion: "DRENAJE", caudal: "113", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336610", descripcion: "BOMBA ELEC FLUJO MIXTO No.10", ubicacion: "BOMBEO LAGUNAS 2", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "155", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336613", descripcion: "BOMBA ELEC FLUJO MIXTO No.13", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "249", variador: "SI", potenciaHP: "70", potenciaKw: "37", proveedor: "RIOEN" },
            { codigo: "336616", descripcion: "BOMBA ELEC FLUJO MIXTO No.16", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "223.8", variador: "SI", potenciaHP: "70", potenciaKw: "37", proveedor: "RIOEN" },
            { codigo: "336619", descripcion: "BOMBA ELEC FLUJO MIXTO No.19", ubicacion: "BOMBEO LA RANCHERA", consumo: "0", funcion: "DRENAJE", caudal: "246.1", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "RIOEN" },
            { codigo: "336625", descripcion: "BOMBA ELEC FLUJO MIXTO No.25", ubicacion: "BOMBEO BOCATOMA", consumo: "0", funcion: "RIEGO", caudal: "80", variador: "NO", potenciaHP: "100", potenciaKw: "75", proveedor: "CELSIA" },
            { codigo: "336203", descripcion: "BOMBA ELEC HORIZONTAL No.01", ubicacion: "LOS MANGOS", consumo: "0", funcion: "RIEGO", caudal: "10", variador: "NO", potenciaHP: "5", potenciaKw: "4", proveedor: "CELSIA 1" },
            { codigo: "336501", descripcion: "BOMBA ELEC VERTICAL No.01", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO", caudal: "120", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336504", descripcion: "BOMBA ELEC VERTICAL No.04", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "DRENAJE", caudal: "91.2", variador: "NO", potenciaHP: "30", potenciaKw: "22", proveedor: "RIOEN" },
            { codigo: "336507", descripcion: "BOMBA ELEC VERTICAL No.07", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "DRENAJE", caudal: "124.8", variador: "SI", potenciaHP: "30", potenciaKw: "16", proveedor: "RIOEN" },
            { codigo: "336628", descripcion: "BOMBA ELECTRICA CENTRIFUGA No.28", ubicacion: "BOMBEO LA ISLA", consumo: "0", funcion: "RIEGO", caudal: "70", variador: "NO", potenciaHP: "100", potenciaKw: "70", proveedor: "RIOEN" },
            { codigo: "336679", descripcion: "BOMBA ELEC FLUJO MIXTO No. 79", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "320.4", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336682", descripcion: "BOMBA ELEC FLUJO MIXTO No. 82", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "339", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336688", descripcion: "BOMBA ELEC FLUJO MIXTO No. 88", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "385", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "337702", descripcion: "BOMBA ELEC HORIZONTAL No. 02", ubicacion: "BOMBEO ZANJÓN NEGRO", consumo: "0", funcion: "RIEGO", caudal: "120", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "RIOEN" },
            { codigo: "337703", descripcion: "BOMBA ELEC HORIZONTAL No. 03", ubicacion: "BOMBEO ZANJÓN NEGRO", consumo: "0", funcion: "RIEGO", caudal: "126", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "RIOEN" },
            { codigo: "336001", descripcion: "EQUIPO LISTER No.1", ubicacion: "BOMBEO EL DURÁN", consumo: "0.75", funcion: "RIEGO/DRENAJE", caudal: "72", variador: "NO", potenciaHP: "25", potenciaKw: "19", proveedor: "PROPIO" },
            { codigo: "336002", descripcion: "EQUIPO LISTER No.2", ubicacion: "BOMBEO LUISA 1", consumo: "0.9", funcion: "RIEGO/DRENAJE", caudal: "90", variador: "NO", potenciaHP: "50", potenciaKw: "37", proveedor: "PROPIO" },
            { codigo: "336003", descripcion: "EQUIPO LISTER No.3", ubicacion: "BOMBEO EL DURÁN", consumo: "0.8", funcion: "RIEGO/DRENAJE", caudal: "80", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "336401", descripcion: "MOTOBOMBA DIESEL No.1", ubicacion: "BOMBEO BOCATOMA", consumo: "", funcion: "RIEGO/DRENAJE", caudal: "150", variador: "NO", potenciaHP: "80", potenciaKw: "60", proveedor: "PROPIO" },
            { codigo: "336407", descripcion: "MOTOBOMBA DIESEL No.7", ubicacion: "BOMBEO VENECIA", consumo: "1.5", funcion: "RIEGO/DRENAJE", caudal: "150", variador: "NO", potenciaHP: "88", potenciaKw: "66", proveedor: "PROPIO" },
            { codigo: "336410", descripcion: "MOTOBOMBA DIESEL No.10", ubicacion: "BOMBEO EL DURÁN", consumo: "1.7", funcion: "RIEGO/DRENAJE", caudal: "100", variador: "NO", potenciaHP: "88", potenciaKw: "66", proveedor: "PROPIO" },
            { codigo: "336413", descripcion: "MOTOBOMBA DIESEL No.13", ubicacion: "BOMBEO LA RANCHERA", consumo: "1.3", funcion: "RIEGO/DRENAJE", caudal: "57", variador: "NO", potenciaHP: "88", potenciaKw: "66", proveedor: "PROPIO" },
            { codigo: "336416", descripcion: "MOTOBOMBA DIESEL No.16", ubicacion: "BOMBEO LA ENCANECADA", consumo: "", funcion: "RIEGO/DRENAJE", caudal: "150", variador: "NO", potenciaHP: "88", potenciaKw: "66", proveedor: "PROPIO" },
            { codigo: "336422", descripcion: "MOTOBOMBA DIESEL No.22", ubicacion: "BOMBEO VENECIA", consumo: "1.8", funcion: "RIEGO/DRENAJE", caudal: "150", variador: "NO", potenciaHP: "88", potenciaKw: "66", proveedor: "PROPIO" },
            { codigo: "336428", descripcion: "MOTOBOMBA DIESEL No.28", ubicacion: "BOMBEO LA ISLA", consumo: "", funcion: "RIEGO/DRENAJE", caudal: "120", variador: "NO", potenciaHP: "128", potenciaKw: "95", proveedor: "PROPIO" },
            { codigo: "337001", descripcion: "FLOTANTE ELECTRICA No.1", ubicacion: "BOMBEO LOS CHIVOS", consumo: "0", funcion: "RIEGO", caudal: "1014", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "337004", descripcion: "FLOTANTE ELECTRICA No.4", ubicacion: "BOMBEO LOS CHIVOS", consumo: "0", funcion: "RIEGO", caudal: "952", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "337010", descripcion: "FLOTANTE ELEC CENTRIFUGA No.10", ubicacion: "BOMBEO LAGUNAS NORTE", consumo: "0", funcion: "RIEGO", caudal: "172", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "337011", descripcion: "FLOTANTE ELEC CENTRIFUGA No.11", ubicacion: "BOMBEO LAGUNAS CENTRO", consumo: "0", funcion: "RIEGO", caudal: "170", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "337012", descripcion: "FLOTANTE ELEC CENTRIFUGA No.12", ubicacion: "BOMBEO LAGUNAS SUR", consumo: "0", funcion: "RIEGO", caudal: "170", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "337301", descripcion: "FLOTANTE DIESEL No.01", ubicacion: "BOMBEO EL MATEO", consumo: "6", funcion: "DRENAJE", caudal: "2099", variador: "NO", potenciaHP: "317", potenciaKw: "236", proveedor: "PROPIO" },

            { codigo: "336502", descripcion: "BOMBA ELEC VERTICAL No.02", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO", caudal: "200", variador: "NO", potenciaHP: "200", potenciaKw: "149", proveedor: "RIOEN" },
            { codigo: "336503", descripcion: "BOMBA ELEC VERTICAL No.03", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO", caudal: "231", variador: "NO", potenciaHP: "200", potenciaKw: "149", proveedor: "RIOEN" },
            { codigo: "336505", descripcion: "BOMBA ELEC VERTICAL No.05", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO", caudal: "220", variador: "NO", potenciaHP: "200", potenciaKw: "149", proveedor: "RIOEN" },
            { codigo: "336519", descripcion: "BOMBA ELEC VERTICAL NO.19", ubicacion: "BOMBEO LA RANCHERA", consumo: "0", funcion: "DRENAJE", caudal: "80", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336531", descripcion: "BOMBA ELEC VERTICAL No.31", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "424.58", variador: "SI", potenciaHP: "100", potenciaKw: "52", proveedor: "RIOEN" },
            { codigo: "336534", descripcion: "BOMBA ELEC VERTICAL No.34", ubicacion: "BOMBEO LUISA 1", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "579", variador: "SI", potenciaHP: "100", potenciaKw: "52", proveedor: "RIOEN" },
            { codigo: "336540", descripcion: "BOMBA ELECTRICA VERTICAL No.40", ubicacion: "BOMBEO LUISA 2", consumo: "0", funcion: "DRENAJE", caudal: "350", variador: "NO", potenciaHP: "75", potenciaKw: "56", proveedor: "RIOEN" },
            { codigo: "336543", descripcion: "BOMBA ELEC VERTICAL No.43", ubicacion: "BOMBEO SUERTE 140", consumo: "0", funcion: "DRENAJE", caudal: "302.9", variador: "SI", potenciaHP: "100", potenciaKw: "52", proveedor: "RIOEN" },
            { codigo: "336544", descripcion: "BOMBA ELEC VERTICAL No.44", ubicacion: "BOMBEO VENECIA", consumo: "0", funcion: "DRENAJE", caudal: "899", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336545", descripcion: "BOMBA ELEC VERTICAL No.45", ubicacion: "BOMBEO VENECIA", consumo: "0", funcion: "DRENAJE", caudal: "879", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336546", descripcion: "BOMBA ELEC VERTICAL No.46", ubicacion: "BOMBEO SUERTE 140", consumo: "0", funcion: "DRENAJE", caudal: "500", variador: "NO", potenciaHP: "100", potenciaKw: "75", proveedor: "RIOEN" },
            { codigo: "336550", descripcion: "BOMBA ELEC VERTICAL No.50", ubicacion: "BOMBEO LA ENCANECADA", consumo: "0", funcion: "DRENAJE", caudal: "875", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336551", descripcion: "BOMBA ELEC VERTICAL No.51", ubicacion: "BOMBEO LA ENCANECADA", consumo: "0", funcion: "DRENAJE", caudal: "883", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336555", descripcion: "BOMBA ELEC VERTICAL No.55", ubicacion: "BOMBEO VENECIA", consumo: "0", funcion: "DRENAJE", caudal: "785", variador: "SI", potenciaHP: "150", potenciaKw: "78", proveedor: "RIOEN" },
            { codigo: "336558", descripcion: "BOMBA ELEC VERTICAL No.58", ubicacion: "BOMBEO LUISA 2", consumo: "0", funcion: "DRENAJE", caudal: "703.9", variador: "SI", potenciaHP: "150", potenciaKw: "78", proveedor: "RIOEN" },
            { codigo: "336561", descripcion: "BOMBA ELEC VERTICAL No.61", ubicacion: "BOMBEO EL MATEO", consumo: "0", funcion: "DRENAJE", caudal: "1500", variador: "SI", potenciaHP: "150", potenciaKw: "78", proveedor: "RIOEN" },
            { codigo: "336564", descripcion: "BOMBA ELEC VERTICAL No.64", ubicacion: "BOMBEO EL MATEO", consumo: "0", funcion: "DRENAJE", caudal: "2390", variador: "SI", potenciaHP: "150", potenciaKw: "78", proveedor: "RIOEN" },
            { codigo: "336567", descripcion: "BOMBA ELEC VERTICAL No.67", ubicacion: "BOMBEO EL MATEO", consumo: "0", funcion: "DRENAJE", caudal: "1500", variador: "SI", potenciaHP: "150", potenciaKw: "78", proveedor: "RIOEN" },
            { codigo: "336570", descripcion: "BOMBA ELEC VERTICAL No.70", ubicacion: "BOMBEO EL MATEO", consumo: "0", funcion: "DRENAJE", caudal: "1500", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336573", descripcion: "BOMBA ELEC VERTICAL No.73", ubicacion: "BOMBEO LOS CHIVOS", consumo: "0", funcion: "RIEGO", caudal: "1746", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336576", descripcion: "BOMBA ELEC VERTICAL No.76", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO", caudal: "267", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336579", descripcion: "BOMBA ELEC VERTICAL No.79", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO", caudal: "225", variador: "NO", potenciaHP: "250", potenciaKw: "187", proveedor: "RIOEN" },
            { codigo: "336582", descripcion: "BOMBA ELEC VERTICAL No.82", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "", variador: "SI", potenciaHP: "300", potenciaKw: "157", proveedor: "RIOEN" },
            { codigo: "336585", descripcion: "BOMBA ELEC VERTICAL No.85", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "265", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336588", descripcion: "BOMBA ELEC VERTICAL No.88", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "", variador: "NO", potenciaHP: "200", potenciaKw: "149", proveedor: "RIOEN" },
            { codigo: "336594", descripcion: "BOMBA ELECTRICA VERTICAL NO.94", ubicacion: "BOMBEO EL MATEO", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "300", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "RIOEN" },
            { codigo: "336597", descripcion: "BOMBA ELEC VERTICAL No.97", ubicacion: "BOMBEO SAN ALFONSO", consumo: "0", funcion: "DRENAJE", caudal: "633", variador: "SI", potenciaHP: "175", potenciaKw: "91", proveedor: "RIOEN" },
            { codigo: "336598", descripcion: "BOMBA ELEC VERTICAL No.98", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO", caudal: "181", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "RIOEN" },
            { codigo: "336599", descripcion: "BOMBA ELEC HORIZONTAL No. 99", ubicacion: "BOMBEO SUERTE 140", consumo: "0", funcion: "DRENAJE", caudal: "1000", variador: "NO", potenciaHP: "200", potenciaKw: "149", proveedor: "RIOEN" },
            { codigo: "336601", descripcion: "BOMBA ELEC FLUJO MIXTO No.01", ubicacion: "BOMBEO LAGUNAS 1", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "80", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336604", descripcion: "BOMBA ELEC FLUJO MIXTO No.04", ubicacion: "BOMBEO LAGUNAS 2", consumo: "0", funcion: "DRENAJE", caudal: "200", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336607", descripcion: "BOMBA ELEC FLUJO MIXTO No.07", ubicacion: "BOMBEO LAGUNAS 1", consumo: "0", funcion: "DRENAJE", caudal: "113", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336610", descripcion: "BOMBA ELEC FLUJO MIXTO No.10", ubicacion: "BOMBEO LAGUNAS 2", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "155", variador: "SI", potenciaHP: "36", potenciaKw: "19", proveedor: "RIOEN" },
            { codigo: "336613", descripcion: "BOMBA ELEC FLUJO MIXTO No.13", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "249", variador: "SI", potenciaHP: "70", potenciaKw: "37", proveedor: "RIOEN" },
            { codigo: "336616", descripcion: "BOMBA ELEC FLUJO MIXTO No.16", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "223.8", variador: "SI", potenciaHP: "70", potenciaKw: "37", proveedor: "RIOEN" },
            { codigo: "336619", descripcion: "BOMBA ELEC FLUJO MIXTO No.19", ubicacion: "BOMBEO LA RANCHERA", consumo: "0", funcion: "DRENAJE", caudal: "246.1", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "RIOEN" },
            { codigo: "336625", descripcion: "BOMBA ELEC FLUJO MIXTO No.25", ubicacion: "BOMBEO BOCATOMA", consumo: "0", funcion: "RIEGO", caudal: "80", variador: "NO", potenciaHP: "100", potenciaKw: "75", proveedor: "CELSIA" },
            { codigo: "336628", descripcion: "BOMBA ELECTRICA CENTRIFUGA No.28", ubicacion: "BOMBEO LA ISLA", consumo: "0", funcion: "RIEGO", caudal: "70", variador: "NO", potenciaHP: "100", potenciaKw: "70", proveedor: "RIOEN" },
            { codigo: "336679", descripcion: "BOMBA ELEC FLUJO MIXTO No. 79", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "320.4", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336682", descripcion: "BOMBA ELEC FLUJO MIXTO No. 82", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "339", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336688", descripcion: "BOMBA ELEC FLUJO MIXTO No. 88", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "RIEGO/DRENAJE", caudal: "385", variador: "SI", potenciaHP: "250", potenciaKw: "131", proveedor: "RIOEN" },
            { codigo: "336701", descripcion: "BOMBA DIESEL FLUJO MIXTO No.01", ubicacion: "BOMBEO EL MATEO", consumo: "4.6", funcion: "DRENAJE", caudal: "721", variador: "NO", potenciaHP: "170", potenciaKw: "127", proveedor: "PROPIO" },
            { codigo: "336702", descripcion: "BOMBA DIESEL HIDROMIXTA No.2", ubicacion: "BOMBEO LUISA 1", consumo: "4.7", funcion: "DRENAJE", caudal: "546", variador: "NO", potenciaHP: "180", potenciaKw: "134", proveedor: "PROPIO" },
            { codigo: "336804", descripcion: "BOMBA ELEC HIDROAXIAL No.04", ubicacion: "BOMBEO LA ENCANECADA", consumo: "0", funcion: "DRENAJE", caudal: "500", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336810", descripcion: "BOMBA ELEC HIDROAXIAL No.10", ubicacion: "BOMBEO LA ENCANECADA", consumo: "0", funcion: "DRENAJE", caudal: "442", variador: "SI", potenciaHP: "200", potenciaKw: "104", proveedor: "RIOEN" },
            { codigo: "336813", descripcion: "BOMBA ELEC HIDROAXIAL No.13", ubicacion: "BOMBEO SAN ALFONSO", consumo: "0", funcion: "DRENAJE", caudal: "300", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "RIOEN" },
            { codigo: "336816", descripcion: "BOMBA ELEC HIDROAXIAL No.16", ubicacion: "BOMBEO EL DURÁN", consumo: "0", funcion: "DRENAJE", caudal: "347", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "RIOEN" },
            { codigo: "336904", descripcion: "BOMBA DIESEL HIDROAXIAL No.04", ubicacion: "BOMBEO LA RANCHERA", consumo: "4.6", funcion: "RIEGO/DRENAJE", caudal: "546", variador: "NO", potenciaHP: "170", potenciaKw: "127", proveedor: "PROPIO" },
            { codigo: "336907", descripcion: "BOMBA DIESEL HIDROAXIAL No.07", ubicacion: "BOMBEO LA ENCANECADA", consumo: "0.6", funcion: "RIEGO/DRENAJE", caudal: "150", variador: "NO", potenciaHP: "60", potenciaKw: "45", proveedor: "PROPIO" },
            { codigo: "336910", descripcion: "BOMBA DIESEL HIDROAXIAL No.10", ubicacion: "BOMBEO EL DURÁN", consumo: "4.1", funcion: "DRENAJE", caudal: "900", variador: "NO", potenciaHP: "170", potenciaKw: "127", proveedor: "PROPIO" },

            { codigo: "337501", descripcion: "MOTOBOMBA ELEC SUMERGIBLE POZO No. 1", ubicacion: "POZO TEQUENDAMA", consumo: "0", funcion: "RIEGO", caudal: "100", variador: "SI", potenciaHP: "125", potenciaKw: "65", proveedor: "CELSIA" },

            { codigo: "339001", descripcion: "IMPLEM. VAGON No.01", ubicacion: "EL CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339002", descripcion: "IMPLEM. VAGON No.02", ubicacion: "EL CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339003", descripcion: "IMPLEM. VAGON No.03", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339004", descripcion: "IMPLEM. VAGON No.04", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339007", descripcion: "IMPLEMENTO TROMPO MEZCLADOR No.1", ubicacion: "RIOPAILA AGRICOLA", consumo: "", funcion: "OBRAS CIVILES", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339013", descripcion: "IMPLEMENTO TANQUE AGUA No.1", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "OBRAS CIVILES", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339017", descripcion: "GUADAÑA HUSQVARA NO.01", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339018", descripcion: "GUADAÑA HUSQVARA NO.02", ubicacion: "LOS MANGOS", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339019", descripcion: "GUADAÑA HUSQVARA NO.03", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339020", descripcion: "MOTOSIERRA HUSQVARNA No.01", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339021", descripcion: "MOTOSIERRA HUSQVARNA No.02", ubicacion: "CASA MORILLO", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339022", descripcion: "GUADAÑA HUSQVARNA No.04", ubicacion: "BOMBEO EL MATEO", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339023", descripcion: "GUADAÑA HUSQVARNA No.05", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339024", descripcion: "MOTOSIERRA HUSQVARNA No.03", ubicacion: "LOS MANGOS", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339025", descripcion: "MOTOSIERRA HUSQVARNA No.04", ubicacion: "LOS MANGOS", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339026", descripcion: "GUADAÑA HUSQVARNA No.06", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339027", descripcion: "GUADAÑA HUSQVARNA No.07", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339029", descripcion: "MOTOSIERRA HUSQVARNA No.05", ubicacion: "ZONA 1", consumo: "", funcion: "CTRL MALEZAS MEC", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339030", descripcion: "IMPLEM. CUREÑA RIEGO No.3", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339031", descripcion: "IMPLEM. CUREÑA RIEGO No.4", ubicacion: "HACIENDA ZAMBRANO", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339033", descripcion: "IMPLEM. CUREÑA RIEGO No.6", ubicacion: "HACIENDA VALPARAISO", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339034", descripcion: "IMPLEM. CUREÑA RIEGO No.7", ubicacion: "HACIENDA VALPARAISO", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339035", descripcion: "IMPLEM. CUREÑA RIEGO No.8", ubicacion: "HACIENDA SAN NICOLAS", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339036", descripcion: "IMPLEM. CUREÑA RIEGO No.9", ubicacion: "HACIENDAVENECIA 2", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339037", descripcion: "IMPLEM. CUREÑA RIEGO No.10", ubicacion: "HACIENDAVENECIA 2", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339038", descripcion: "IMPLEM. CUREÑA RIEGO No.11", ubicacion: "HACIENDAVENECIA 2", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339039", descripcion: "IMPLEM. CUREÑA RIEGO No.12", ubicacion: "BOMBEO LUISA 2", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339041", descripcion: "IMPLEM. CUREÑA RIEGO No.14", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339044", descripcion: "IMPLEM. CUREÑA RIEGO No.17", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339045", descripcion: "IMPLEM. CUREÑA RIEGO No.18", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339046", descripcion: "IMPLEM. CUREÑA RIEGO No.19", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339047", descripcion: "IMPLEM. CUREÑA RIEGO No.20", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339048", descripcion: "IMPLEM. CUREÑA RIEGO No.21", ubicacion: "CAMPAMENTO LA LUISA", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339049", descripcion: "IMPLEM. CUREÑA RIEGO No.22", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
            { codigo: "339050", descripcion: "IMPLEM. CUREÑA RIEGO No.23", ubicacion: "BOMBEO EL DURÁN", consumo: "", funcion: "TRANSPORTE", caudal: "0", variador: "NO", potenciaHP: "0", potenciaKw: "0", proveedor: "PROPIO" },
        ],
        sectores_suerte: [
            "3106", "3106-010", "3106-020", "3106-030", "3106-040", "3106-050", "3106-060", "3106-071", "3106-080", "3106-081",
            "3106-090", "3106-100", "3106-110", "3106-130", "3106-140", "3106-150", "3106-160", "3106-170", "3106-171",
            "3106-180", "3106-181", "3106-190", "3106-200", "3106-210", "3106-211", "3106-220", "3106-221", "3106-222",
            "3106-230", "3106-231", "3106-232", "3106-240", "3106-241", "3106-250", "3106-260", "3106-270", "3106-271",
            "3106-280", "3106-281", "3106-282", "3106-300", "3106-302", "3106-310", "3106-311", "3106-312", "3106-313",
            "3106-314", "3106-320", "3106-330", "3106-331", "3106-340", "3106-342", "3106-350", "3106-351", "3106-352",
            "3106-360", "3106-361", "3106-362", "3106-370", "3107", "3107-380", "3107-390", "3107-400", "3107-410", "3107-412",
            "3107-420", "3107-430", "3107-440", "3107-441", "3107-443", "3107-450", "3107-460", "3107-470", "3107-473",
            "3107-474", "3107-480", "3107-490", "3107-491", "3107-700", "3107-710", "3107-720", "3107-730", "3107-731",
            "3107-732", "3107-740", "3107-741", "3107-750", "3107-751", "3107-760", "3107-770", "3107-771", "3107-780",
            "3107-782", "3107-790", "3107-800", "3107-810", "3107-820", "3107-821", "3107-830", "3107-840", "3107-850",
            "3107-851", "3107-852", "3107-853", "3107-860", "3107-870", "3107-880", "3107-881", "3107-890", "3107-891",
            "3107-900", "3107-902", "3107-910", "3107-920", "3107-930", "3118", "3118-010", "3118-020", "3118-021", "3118-022",
            "3118-040", "3118-060", "3118-061", "3118-080", "3118-090", "3118-100", "3118-110", "3118-111", "3118-113",
            "3118-114", "3118-130", "3118-150", "3118-160", "3118-161", "3123", "3123-310", "3123-320", "3233", "3233-010", "3233-011",
            "3233-012", "3233-013", "3233-020", "3233-021", "3233-030", "3233-031", "3233-040", "3233-042", "3233-050",
            "3233-051", "3233-053", "3233-055", "3233-060", "3233-061", "3233-062", "3233-070", "3233-080", "3233-090",
            "3233-091", "3233-093", "3233-100", "3233-101", "3233-110", "3233-111", "3233-120", "3418", "3418-030", "3418-050",
            "3418-070", "3418-071", "3418-120", "3418-121", "3418-140", "3440", "3440-700", "3440-710", "3440-711", "3440-720",
            "3440-723", "3440-730", "3440-760", "3440-770", "3501", "3501-020", "3501-050", "3501-052", "3501-070", "3501-080",
            "3501-081", "3501-100", "3501-110", "3501-120", "3501-130", "3501-140", "3501-141", "3501-142", "3501-150",
            "3501-160", "3501-170", "3501-180", "3501-190", "3501-200", "3501-230", "3501-231", "3501-232", "3501-240",
            "3501-250", "3501-260", "3501-270", "3501-280", "3501-310", "3501-320", "3501-330", "3501-340", "3501-341",
            "3501-350", "3501-360", "3501-362", "3501-370", "3501-380", "3501-390", "3501-391", "3501-400", "3501-431",
            "3501-432", "3501-471", "3501-510", "3501-513", "3501-514", "3501-520", "3501-530", "3501-532", "3501-533",
            "3501-534", "3501-540", "3501-541", "3501-550", "3501-551", "3501-560", "3501-561", "3501-570", "3501-571",
            "3501-580", "3501-581", "3501-590", "3501-600", "3501-602", "3501-610", "3501-620", "3501-621", "3501-623",
            "3501-630", "3501-631", "3501-640", "3501-650", "3501-651",
            "3102", "3102-010", "3102-011", "3102-012", "3102-015", "3102-016", "3102-017", "3102-020", "3102-025", "3102-030",
            "3102-040", "3102-044", "3102-050", "3102-060", "3102-080", "3102-081", "3102-090", "3102-091", "3102-092",
            "3102-094", "3102-100", "3102-110", "3102-120", "3102-121", "3102-140", "3102-151", "3102-160", "3102-161",
            "3102-170", "3102-171", "3102-180", "3102-181", "3102-190", "3102-191", "3102-280", "3102-281", "3102-290",
            "3102-300",
            "3104", "3104-010", "3104-020", "3104-021", "3104-030", "3104-040", "3104-041", "3104-050", "3104-051", "3104-060",
            "3104-061", "3104-070", "3104-080", "3104-081", "3104-082", "3104-090", "3104-100", "3104-102", "3104-103",
            "3104-110", "3104-120", "3104-123", "3104-130", "3104-131", "3104-140", "3104-141", "3104-142", "3104-150",
            "3104-160", "3104-161", "3104-170", "3104-171", "3104-180", "3104-181", "3104-182", "3104-190", "3104-192",
            "3104-200", "3104-201", "3104-210", "3104-211", "3104-213", "3104-220", "3104-221", "3104-230", "3104-234",
            "3104-240", "3104-241", "3104-250", "3104-251", "3104-252", "3104-260", "3104-261", "3104-262", "3104-270",
            "3104-280", "3104-340", "3104-341", "3104-350", "3104-351", "3104-360", "3104-370", "3104-371", "3104-410",
            "3104-420", "3104-430", "3104-440",
            "3105", "3105-300", "3105-310", "3105-320", "3105-430", "3105-431", "3105-440", "3105-450", "3105-460", "3105-600",
            "3105-601", "3105-610", "3105-611", "3105-612", "3105-613", "3105-620", "3105-630", "3105-640", "3105-650",
            "3105-651", "3105-660",
            "3109", "3109-010", "3109-020", "3109-060", "3109-061", "3109-062", "3109-070", "3109-110", "3109-111", "3109-120",
            "3109-160", "3109-161", "3109-170", "3109-171", "3109-210", "3109-220", "3109-221", "3109-222", "3109-261",
            "3109-262", "3109-270", "3109-271", "3109-300", "3109-301", "3109-310", "3109-340", "3109-350", "3109-351",
            "3109-352", "3109-400", "3109-410", "3109-420", "3109-422", "3109-500", "3109-510", "3109-511", "3109-520",
            "3109-530",
            "3110", "3110-010", "3110-020", "3110-030", "3110-031", "3110-040", "3110-050", "3110-051", "3110-060", "3110-061",
            "3110-064", "3110-070", "3110-071", "3110-080", "3110-081", "3110-082", "3110-090", "3110-091", "3110-092",
            "3110-100", "3110-110", "3110-120", "3110-130", "3110-140", "3110-141", "3110-150", "3110-151", "3110-160",
            "3110-161", "3110-162", "3110-170", "3110-180", "3110-190", "3110-200", "3110-210", "3110-220", "3110-240",
            "3110-250", "3110-251", "3110-260", "3110-261", "3110-262", "3110-270", "3110-290", "3110-291",
            "3111", "3111-010", "3111-020", "3111-030", "3111-040", "3111-050", "3111-052", "3111-060", "3111-070", "3111-071",
            "3111-072", "3111-080", "3111-090", "3111-100", "3111-110", "3111-111", "3111-120", "3111-121", "3111-131",
            "3111-132", "3111-140", "3111-141", "3111-142", "3111-150", "3111-160", "3111-161", "3111-170", "3111-171",
            "3111-180", "3111-190", "3111-200", "3111-210", "3111-220", "3111-240", "3111-241", "3111-250", "3111-260",
            "3111-270", "3111-280", "3111-281", "3111-290", "3111-300", "3111-310", "3111-320", "3111-330", "3111-350",
            "3111-360", "3111-370", "3111-372", "3111-380", "3111-390", "3111-400", "3111-401", "3111-410", "3111-411",
            "3111-420", "3111-421", "3111-430", "3111-431", "3111-433", "3111-440", "3111-442", "3111-450", "3111-451",
            "3111-460", "3111-480", "3111-490", "3111-491", "3111-492", "3111-500", "3111-501", "3111-510", "3111-520",
            "3113", "3113-040", "3113-050", "3113-051", "3113-053", "3113-060", "3113-061", "3113-070", "3113-071", "3113-080",
            "3113-090", "3113-091", "3113-100", "3113-110", "3113-120", "3113-122", "3113-130", "3113-140", "3113-150",
            "3113-151", "3113-160", "3113-161", "3113-170", "3113-180", "3113-181", "3113-190", "3113-200", "3113-201",
            "3113-210", "3113-220", "3113-221", "3113-230", "3113-231", "3113-240", "3113-241", "3113-242", "3113-243",
            "3121", "3121-031", "3121-040", "3121-150", "3121-180", "3121-190", "3121-191", "3121-200", "3121-210", "3121-220",
            "3121-230", "3121-231", "3121-240", "3121-250", "3121-260", "3121-270", "3121-271", "3121-280", "3121-600",
            "3121-610", "3121-620",
            "3122", "3122-050", "3122-100", "3122-101", "3122-130", "3122-131", "3122-150", "3122-180", "3122-200", "3122-230",
            "3122-250", "3122-280", "3122-320", "3122-321", "3122-360", "3122-361", "3122-370", "3122-371", "3122-450",
            "3425", "3425-010", "3425-011", "3425-020", "3425-021", "3425-022", "3425-030",
            "3426", "3426-010", "3426-020", "3426-021", "3426-022", "3426-030", "3426-031", "3426-110", "3426-111", "3426-112",
            "3426-120"
        ],
        personal: [
            { id: 106, name: "ANDRES FELIPE MESSA", cargo: "Técnico", role: "TECNICO" },
            { id: 105, name: "JESUS ALVAREZ GIRALDO", cargo: "Mecánico", role: "TECNICO" },
            { id: 103, name: "JHONNIER ANDRES RAYO", cargo: "Eléctrico", role: "TECNICO" },
            { id: 102, name: "JORGE LUIS ARICAPA", cargo: "Soldador", role: "TECNICO" },
            { id: 107, name: "LEONARDO ANDRES LOPEZ", cargo: "Técnico", role: "TECNICO" },
            { id: 109, name: "LUIS CARLOS ARANA", cargo: "Técnico", role: "TECNICO" },
            { id: 108, name: "WALTER HERNANDO BERMUDEZ", cargo: "Técnico", role: "TECNICO" },
            { id: 110, name: "ANA MARIA MOSQUERA GOMEZ", cargo: "Analista", role: "REQ" },
            { id: 111, name: "JOHAN STEVEL PEÑA", cargo: "Analista", role: "REQ" },
            { id: 112, name: "MARIA DEL MAR OSPINA", cargo: "Analista", role: "REQ" }
        ],
        ubicaciones: [],
        cargos: []
    },

    // --- Init ---
    async init() {
        // SELF-HEALING: Check if data is missing and try to load from cloud
        // Enhanced to check multiple critical datasets
        const equipos = this.getEquipos();
        const planes = this.getPlanes();
        const boletas = this.getBoletas();

        if (equipos.length < 5 || (planes.length <= 1 && boletas.length === 0)) {
            console.log("Init: Critical data missing or only defaults present. Attempting to load from cloud...");
            const success = await this.loadFromCloud();

            // CRITICAL FIX: Verify we actually got data before reloading to avoid infinite loop
            const newEquipos = JSON.parse(localStorage.getItem('hidrofix_equipos') || '[]');
            if (success && newEquipos.length > 5) {
                console.log("Init: Data restored from cloud. Reloading...");
                window.location.reload();
                return;
            } else {
                console.warn("Init: Load attempted but data still missing. Skipping reload.");
            }
        }

        // SELF-HEALING: Merge defaults if missing (CRITICAL FIX)
        try {
            let currentPersonal = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');
            let modified = false;

            // Ensure our default guys are there if missing OR Deduplicate if broken
            const uniquePersonal = [];
            const seenIds = new Set();

            // 1. First, process current list to deduplicate and remove ADMIN USER (101)
            currentPersonal.forEach(p => {
                const pid = String(p.id);
                if (pid !== "101" && !seenIds.has(pid)) {
                    uniquePersonal.push(p);
                    seenIds.add(pid);
                } else if (pid === "101" || seenIds.has(pid)) {
                    modified = true;
                }
            });

            // 2. Add missing defaults (excluding ADMIN USER)
            this.defaults.personal.forEach(def => {
                const defId = String(def.id);
                if (defId !== "101" && !seenIds.has(defId)) {
                    uniquePersonal.push(def);
                    seenIds.add(defId);
                    modified = true;
                    console.log(`CRITICAL: Restoring missing technician ${def.name}`);
                }
            });

            if (modified) {
                console.log("Saving self-healed and deduplicated personal list...");
                localStorage.setItem('hidrofix_personal', JSON.stringify(uniquePersonal));
            }
        } catch (e) { console.error("Self-healing error:", e); }

        const CURRENT_VERSION = "BOSS_DEMO_v11"; // Bump version to force global integrity check
        const storedVersion = localStorage.getItem('hidrofix_data_version');
        console.log(`DataManager Init: Stored v${storedVersion}, Current v${CURRENT_VERSION}`);

        if (storedVersion !== CURRENT_VERSION) {
            console.log("Detectada nueva versión de datos. Verificando integridad...");

            // FIX: Force update for 336002 (Horometer 308)
            try {
                // 1. Fix Equipment
                const currentEquipos = JSON.parse(localStorage.getItem('hidrofix_equipos') || '[]');
                const eqFixIndex = currentEquipos.findIndex(e => e.codigo === '336002');
                let equiposModified = false;

                if (eqFixIndex >= 0) {
                    const eq = currentEquipos[eqFixIndex];
                    if (parseFloat(eq.horometro_actual) === 557 || parseFloat(eq.horometro_actual) === 557.0) {
                        console.log("Applying HOTFIX for 336002 Equipment: 557 -> 308");
                        eq.horometro_actual = 308;
                        eq.ultimo_mtto_horas = 250;
                        equiposModified = true;
                    }
                }
                if (equiposModified) localStorage.setItem('hidrofix_equipos', JSON.stringify(currentEquipos));

                // 2. Ensure 339008 is present (PROACTIVE INTEGRITY)
                const eq339008 = currentEquipos.find(e => e.codigo === '339008');
                if (!eq339008) {
                    console.log("Integrity Check: Adding missing equipment 339008");
                    const def339008 = this.defaults.equipos.find(e => e.codigo === '339008');
                    if (def339008) {
                        currentEquipos.push(def339008);
                        localStorage.setItem('hidrofix_equipos', JSON.stringify(currentEquipos));
                    }
                }

                // 3. FIX THE ROGUE PLAN (The Source of Truth)
                const currentPlanes = JSON.parse(localStorage.getItem('hidrofix_planes_v2') || '[]');
                let planModified = false;

                currentPlanes.forEach(p => {
                    if (p.equipo === '336002' || (p.equipo && String(p.equipo).startsWith('336002'))) {
                        if (parseFloat(p.horometroCierre) === 557) {
                            p.horometroCierre = 308;
                            planModified = true;
                        }
                        if (p.descripcion && p.descripcion.includes('557')) {
                            p.descripcion = p.descripcion.replace('557', '308');
                            planModified = true;
                        }
                    }
                });

                if (planModified) {
                    localStorage.setItem('hidrofix_planes_v2', JSON.stringify(currentPlanes));
                }

            } catch (e) { console.error("Error applying hotfix 336002/339008:", e); }

            // 1. SAFE MERGE FOR EQUIPOS (Already handled above)
            // 2. SAFE MERGE FOR SECTORES
            try {
                const currentSectores = JSON.parse(localStorage.getItem('hidrofix_sectores_suerte') || '[]');
                if (currentSectores.length === 0) {
                    localStorage.setItem('hidrofix_sectores_suerte', JSON.stringify(this.defaults.sectores_suerte));
                }
            } catch (e) { console.error("Error updating sectores:", e); }

            // Update version
            try {
                localStorage.setItem('hidrofix_data_version', CURRENT_VERSION);
            } catch (e) {
                console.error("FATAL: Could not update data version.", e);
            }
        }

        // MIGRATION: Planes v2 (Robust)
        const planesV2 = this.getPlanes();
        if (planesV2.length === 0) {
            const oldPlanes = this.safeParseArray('hidrofix_planes');
            if (oldPlanes.length > 0) {
                console.log(`MIGRATION: Moving ${oldPlanes.length} planes from legacy to v2 cache...`);
                localStorage.setItem('hidrofix_planes_v2', JSON.stringify(oldPlanes));
            } else if (!localStorage.getItem('hidrofix_planes_v2')) {
                localStorage.setItem('hidrofix_planes_v2', JSON.stringify(this.defaults.planes));
            }
        }

        // MIGRATION: Boletas v2 (Robust)
        const boletasV2 = this.getBoletas();
        if (boletasV2.length === 0) {
            const oldBoletas = this.safeParseArray('hidrofix_boletas');
            if (oldBoletas.length > 0) {
                console.log(`MIGRATION: Moving ${oldBoletas.length} boletas from legacy to v2 cache...`);
                localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(oldBoletas));
            }
        }

        // PROACTIVE PATCH: Reassign historical supplies from 336816 to 339008 (Weld/Gas items on Jan 27)
        try {
            const boletas = this.getBoletas();
            let boletasModified = false;
            boletas.forEach(b => {
                // Look for records around Jan 27 associated with the Pump or the new Welder
                if (b.fecha === '2026-01-27' && (b.equipo === '336816' || b.equipoDestino === '336816' || b.equipo === '339008')) {
                    if (b.items) {
                        b.items.forEach(i => {
                            const desc = (i.descripcion || "").toUpperCase();
                            const isMotosoldadorItem = desc.includes('SOLDADURA') ||
                                desc.includes('DISCO') ||
                                desc.includes('GASOLINA');

                            const isPumpItem = desc.includes('ACEITE HIDRAULICO');

                            if (isMotosoldadorItem && i.destino !== '339008') {
                                console.log(`MIGRATION: Moving "${i.descripcion}" to 339008`);
                                i.destino = '339008';
                                i.tipoDestino = 'EQUIPO';
                                boletasModified = true;
                            } else if (isPumpItem && i.destino !== '336816') {
                                console.log(`MIGRATION: Restoring "${i.descripcion}" to 336816`);
                                i.destino = '336816';
                                i.tipoDestino = 'EQUIPO';
                                boletasModified = true;
                            }
                        });
                    }
                }
            });
            if (boletasModified) {
                localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(boletas));
            }
        } catch (e) { console.error("Error reassigning historical data:", e); }

        // CHECK EQUIPOS (Safe Init - fallback if deleted)
        if (!localStorage.getItem('hidrofix_equipos')) {
            localStorage.setItem('hidrofix_equipos', JSON.stringify(this.defaults.equipos));
        } else {
            // PROACTIVE PATCH: Ensure ALL default equipments are present regardless of version
            try {
                const currentEquipos = JSON.parse(localStorage.getItem('hidrofix_equipos') || '[]');
                let missingEquiposCount = 0;
                this.defaults.equipos.forEach(defEq => {
                    if (!currentEquipos.some(e => e.codigo === defEq.codigo)) {
                        currentEquipos.push(defEq);
                        missingEquiposCount++;
                    }
                });

                if (missingEquiposCount > 0) {
                    console.log(`Integrity Check: Restored ${missingEquiposCount} missing default equipments (e.g. 339021)`);
                    localStorage.setItem('hidrofix_equipos', JSON.stringify(currentEquipos));
                }
            } catch (e) { }
        }

        // MIGRATION: Materiales v3 (Robust)
        let currentMats = this.getAllMaterials();
        if (currentMats.length === 0) {
            try {
                const legacyMats = this.safeParseArray('hidrofix_materiales_maestro');
                if (legacyMats.length > 0) {
                    currentMats = legacyMats;
                    localStorage.setItem('hidrofix_materiales_v3', JSON.stringify(currentMats));
                }
            } catch (e) { }
        }

        if (currentMats.length === 0) {
            let initialMaterials = [];
            if (typeof MAESTRO_MATERIALES !== 'undefined') {
                initialMaterials = [...MAESTRO_MATERIALES];
            }
            const oldCustoms = JSON.parse(localStorage.getItem('hidrofix_materiales_extra') || '[]');
            if (oldCustoms.length > 0) {
                oldCustoms.forEach(custom => {
                    const exists = initialMaterials.some(m => m.codigo === custom.codigo);
                    if (!exists) initialMaterials.push(custom);
                });
            }
            localStorage.setItem('hidrofix_materiales_v3', JSON.stringify(initialMaterials));
        }

        // --- SECTORES SUERTE INIT ---
        if (!localStorage.getItem('hidrofix_sectores_suerte')) {
            localStorage.setItem('hidrofix_sectores_suerte', JSON.stringify(this.defaults.sectores_suerte));
        }
    },

    // --- Planes CRUD ---
    getPlanes() {
        return this.safeParseArray('hidrofix_planes_v2');
    },

    getPlanById(id) {
        return this.getPlanes().find(p => p.id === id);
    },

    getSectoresSuerte() {
        return this.safeParseArray('hidrofix_sectores_suerte', JSON.stringify(this.defaults.sectores_suerte));
    },

    // --- Helper for CECO ---
    getCecoForEquipo(equipoNombre) {
        // Mapa simplificado basado en centros-costo.js
        const mapping = {
            "TRACTOR CASE FARMALL 75 HP": "332101",
            "TRACTOR CASE QUANTUM": "332103",
            "DRAGA VALDIVIA": "332201",
            "EQUIPO LISTER": "332301",
            "MOTOBOMBA DIESEL": "332302",
            "BOMBA DIESEL FLUJO MIXTO": "332314",
            "BOMBA DIESEL HIDROAXIAL": "332316",
            "FLOTANTE": "332320",
            "MOTOR ELECTRICO": "332401",
            "BOMBA ELEC VERTICAL": "332403"
        };

        for (const [key, code] of Object.entries(mapping)) {
            if (equipoNombre && equipoNombre.toUpperCase().includes(key)) return code;
        }
        return "N/A";
    },

    // --- MATERIALES CRUD (Unified - v3) ---
    getAllMaterials() {
        return this.safeParseArray('hidrofix_materiales_v3');
    },

    getMaterialPrice(codigo) {
        const item = this.getMaterialData(codigo);
        return item ? item.precio : 0;
    },

    getMaterialData(codigo) {
        if (!codigo) return null;
        const allMats = this.getAllMaterials();
        return allMats.find(m => m.codigo === codigo) || null;
    },

    // Replaces the old behavior. Now saves to the Master list.
    saveMaterial(material) {
        const materials = this.getAllMaterials();
        const index = materials.findIndex(m => m.codigo === material.codigo);

        if (index >= 0) {
            materials[index] = material;
        } else {
            materials.push(material);
        }

        try {
            localStorage.setItem('hidrofix_materiales_v3', JSON.stringify(materials));
            return true;
        } catch (e) {
            console.error("Storage Error (Materials):", e);
            alert("â � ï � � ERROR CRÍTICO: No se pudo guardar el material. Almacenamiento lleno.");
            return false;
        }
    },

    deleteMaterial(codigo) {
        let materials = this.getAllMaterials();
        const initialLength = materials.length;
        materials = materials.filter(m => m.codigo !== codigo);

        if (materials.length < initialLength) {
            localStorage.setItem('hidrofix_materiales_v3', JSON.stringify(materials));
            return true;
        }
        return false;
    },

    // Legacy method shim 
    getCustomMaterials() {
        return [];
    },

    savePlan(plan) {
        const planes = this.getPlanes();
        const index = planes.findIndex(p => p.id === plan.id);
        if (index >= 0) {
            planes[index] = plan;
        } else {
            planes.push(plan);
        }
        localStorage.setItem('hidrofix_planes_v2', JSON.stringify(planes));

        // AUDIT LOG
        this.logAction('PLANES', index >= 0 ? 'EDITAR' : 'CREAR', `Plan ${plan.codigo || plan.id} - ${plan.equipo}`);

        return true;
    },

    updatePlan(id, plan) {
        return this.savePlan(plan);
    },

    savePlanes(planes) {
        try {
            localStorage.setItem('hidrofix_planes_v2', JSON.stringify(planes));
            return true;
        } catch (e) {
            console.error("Error saving planes list:", e);
            return false;
        }
    },

    updateEstado(planId, nuevoEstado) {
        const planes = this.getPlanes();
        const plan = planes.find(p => p.id === planId);
        if (plan) {
            plan.estado = nuevoEstado;
            plan.fechaUltimoMovimiento = new Date().toLocaleString('es-CO');
            localStorage.setItem('hidrofix_planes_v2', JSON.stringify(planes));
            return true;
        }
        return false;
    },

    markPlanAsComplete(planId) {
        const planes = this.getPlanes();
        const planIndex = planes.findIndex(p => p.id === planId);

        if (planIndex === -1) return false;

        const currentPlan = planes[planIndex];

        // 1. Mark current plan as REALIZADO
        currentPlan.estado = 'REALIZADO';
        currentPlan.fechaUltimoMovimiento = new Date().toLocaleString('es-CO');
        // Capture exact execution time for KPIs
        currentPlan.fechaEjecucion = new Date().toLocaleString('es-CO');

        // 2. Find and unlock the NEXT plan in sequence for the same equipment
        const nextPlan = planes.find(p =>
            p.equipo === currentPlan.equipo &&
            p.secuencia === currentPlan.secuencia + 1
        );

        if (nextPlan && nextPlan.estado === 'BLOQUEADO') {
            nextPlan.estado = 'PENDIENTE';
            nextPlan.fechaUltimoMovimiento = new Date().toLocaleString('es-CO');
        }

        localStorage.setItem('hidrofix_planes_v2', JSON.stringify(planes));
        return true;
    },

    deletePlans(ids) {
        if (!ids || ids.length === 0) return false;

        const planes = this.getPlanes();
        const initialLength = planes.length;

        ids.forEach(id => {
            const plan = planes.find(p => p.id === id);
            if (plan) this.addToRecycleBin(plan, 'PLAN');
            this.cloudDelete('planes', id); // borra también en la nube
        });

        const newPlanes = planes.filter(p => !ids.includes(p.id));

        if (newPlanes.length < initialLength) {
            localStorage.setItem('hidrofix_planes_v2', JSON.stringify(newPlanes));

            // AUDIT LOG
            this.logAction('PLANES', 'ELIMINAR', `Eliminados ${initialLength - newPlanes.length} planes`);

            return true;
        }
        return false;
    },

    clearPlanes() {
        localStorage.setItem('hidrofix_planes_v2', JSON.stringify([]));
        return true;
    },

    // --- Equipos CRUD ---
    getEquipos() {
        return this.safeParseArray('hidrofix_equipos');
    },

    saveEquipos(equipos) {
        localStorage.setItem('hidrofix_equipos', JSON.stringify(equipos));
        // Trigger server sync in background
        this.saveEquiposToServer(equipos);
        return true;
    },

    // --- CAPEX CRUD (New Module) ---
    getCapex() {
        return this.safeParseArray('hidrofix_capex');
    },

    saveCapexProject(project) {
        const projects = this.getCapex();
        const index = projects.findIndex(p => p.id === project.id);
        if (index >= 0) {
            projects[index] = project;
        } else {
            projects.push(project);
        }
        localStorage.setItem('hidrofix_capex', JSON.stringify(projects));
        return true;
    },

    deleteCapex(id) {
        let projects = this.getCapex();
        const initialLen = projects.length;
        projects = projects.filter(p => p.id !== id);
        if (projects.length < initialLen) {
            localStorage.setItem('hidrofix_capex', JSON.stringify(projects));
            return true;
        }
        return false;
    },

    async saveEquiposToServer(equipos) {
        console.log("Saving equipments to server...");
        try {
            for (const eq of equipos) {
                // Check valid code
                if (!eq.codigo) continue;

                await fetch(`${this.API_URL}/equipos`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(eq)
                });
            }
            console.log("Equipments synced to server successfully.");
        } catch (error) {
            console.error("Error syncing equipments to server:", error);
        }
    },

    // --- Personal CRUD ---
    getPersonal() {
        try {
            const data = JSON.parse(localStorage.getItem('hidrofix_personal') || '[]');
            const list = Array.isArray(data) ? data : [];
            // Dynamically ensure UPPERCASE for all retrieved names
            return list.map(p => ({
                ...p,
                name: (p.name || p.nombre || '').toUpperCase(),
                nombre: (p.name || p.nombre || '').toUpperCase()
            }));
        } catch (e) {
            console.error("Error parsing personal:", e);
            return [];
        }
    },

    savePersonal(personal) {
        try {
            localStorage.setItem('hidrofix_personal', JSON.stringify(personal));
            return true;
        } catch (e) {
            console.error("Storage Error (Personal):", e);
            alert("â � ï � � ERROR CRÍTICO: No se pudo guardar el personal. Almacenamiento lleno.");
            return false;
        }
    },

    savePerson(person) {
        // Standardize Person Object
        const sanitizedPerson = {
            ...person,
            id: String(person.id),
            // Force UPPERCASE on save
            name: (person.name || person.nombre || '').toUpperCase(),
            nombre: (person.name || person.nombre || '').toUpperCase()
        };

        let personal = this.getPersonal();
        const index = personal.findIndex(p => String(p.id) === String(sanitizedPerson.id));

        if (index >= 0) {
            personal[index] = sanitizedPerson;
        } else {
            personal.push(sanitizedPerson);
        }

        return this.savePersonal(personal);
    },

    forceResetPersonal() {
        console.log("Forcing reset of Personal list...");
        localStorage.setItem('hidrofix_personal', JSON.stringify(this.defaults.personal));
        return true;
    },

    // --- Ubicaciones CRUD ---
    getUbicaciones() {
        return this.safeParseArray('hidrofix_ubicaciones');
    },

    saveUbicacion(ubicacion) {
        let ubicaciones = this.getUbicaciones();
        const index = ubicaciones.findIndex(u => u.id === ubicacion.id);
        if (index >= 0) ubicaciones[index] = ubicacion;
        else ubicaciones.push(ubicacion);

        localStorage.setItem('hidrofix_ubicaciones', JSON.stringify(ubicaciones));
        return true;
    },

    deleteUbicacion(id) {
        let ubicaciones = this.getUbicaciones();
        const initialLen = ubicaciones.length;
        ubicaciones = ubicaciones.filter(u => u.id !== id);
        if (ubicaciones.length < initialLen) {
            localStorage.setItem('hidrofix_ubicaciones', JSON.stringify(ubicaciones));
            return true;
        }
        return false;
    },

    // --- Cargos CRUD ---
    getCargos() {
        return this.safeParseArray('hidrofix_cargos');
    },

    saveCargo(cargo) {
        let cargos = this.getCargos();
        const index = cargos.findIndex(c => c.id === cargo.id);
        if (index >= 0) cargos[index] = cargo;
        else cargos.push(cargo);
        localStorage.setItem('hidrofix_cargos', JSON.stringify(cargos));
        return true;
    },

    deleteCargo(id) {
        let cargos = this.getCargos();
        const initialLen = cargos.length;
        cargos = cargos.filter(c => c.id !== id);
        if (cargos.length < initialLen) {
            localStorage.setItem('hidrofix_cargos', JSON.stringify(cargos));
            return true;
        }
        return false;
    },

    deleteLabor(id) {
        // Labores are stored in 'hidrofix_labores_reportes'
        // FIX: Ensure we parse correctly
        let labores = [];
        try {
            labores = JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]');
        } catch (e) { console.error("Error parsing labores:", e); return false; }

        const labor = labores.find(l => l.id === id);

        if (labor) {
            this.addToRecycleBin(labor, 'LABOR');

            const newLabores = labores.filter(l => l.id !== id);
            localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(newLabores));
            this.cloudDelete('labores', id); // borra también en la nube

            // AUDIT LOG
            this.logAction('LABORES', 'ELIMINAR', `Labor ${labor.fecha || ''} - ${labor.id}`);

            return true;
        }
        return false;
    },

    // --- Email Status Tracking (Multi-Module) ---
    updateBoletaEmailStatus(id, status = true) {
        const boletas = this.getBoletas();
        const index = boletas.findIndex(b => b.id === id);
        if (index >= 0) {
            boletas[index].sentEmail = status;
            boletas[index].emailDate = status ? new Date().toLocaleString('es-CO') : null;
            boletas[index].estado = status ? 'ENVIADO' : 'GENERADO';
            localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(boletas));
            // persistir el estado en la nube (compartido entre dispositivos)
            try {
                fetch(`${this.API_URL}/boletas/${encodeURIComponent(id)}`, {
                    method: 'PUT', headers: this.getAuthHeaders(),
                    body: JSON.stringify(boletas[index])
                }).catch(e => console.warn('No se pudo sincronizar estado de boleta', e));
            } catch (e) { }
            return true;
        }
        return false;
    },

    updatePlanEmailStatus(id, status = true) {
        const planes = this.getPlanes();
        const index = planes.findIndex(p => p.id === id);
        if (index >= 0) {
            planes[index].sentEmail = status;
            planes[index].emailDate = status ? new Date().toLocaleString('es-CO') : null;
            localStorage.setItem('hidrofix_planes_v2', JSON.stringify(planes));
            return true;
        }
        return false;
    },

    updateLaborEmailStatus(id, status = true) {
        const labores = JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]');
        const index = labores.findIndex(l => l.id === id);
        if (index >= 0) {
            labores[index].sentEmail = status;
            labores[index].emailDate = status ? new Date().toLocaleString('es-CO') : null;
            localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(labores));
            return true;
        }
        return false;
    },

    // --- Boletas CRUD ---
    getBoletas() {
        return this.safeParseArray('hidrofix_boletas_v2');
    },

    saveBoletas(boletas) {
        try {
            localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(boletas));
        } catch (e) {
            console.error("Storage Error:", e);
            alert("â � ï � � ERROR CRÍTICO: No se pudo guardar la boleta.\n\nEs probable que el almacenamiento local esté lleno.\nIntenta borrar el historial de navegación o contacta a soporte.");
        }
    },

    // --- Daily Labores ---
    getLaboresReportes() {
        return this.safeParseArray('hidrofix_labores_reportes');
    },

    saveLaboresReportes(reportes) {
        localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(reportes));
    },

    // --- Notepad ---
    getNotepad() {
        return localStorage.getItem('hidrofix_notepad') || '';
    },

    saveNotepad(content) {
        localStorage.setItem('hidrofix_notepad', content);
    },

    async saveBoleta(boleta) {
        // 1. Guardar en localStorage (inmediato, para UI responsiva)
        const boletas = this.getBoletas();
        const index = boletas.findIndex(b => b.id === boleta.id);

        if (index >= 0) {
            boletas[index] = boleta;
        } else {
            boletas.unshift(boleta);
        }

        this.saveBoletas(boletas);

        // AUDIT LOG
        this.logAction('BOLETAS', index >= 0 ? 'EDITAR' : 'CREAR', `Boleta ${boleta.id} - ${boleta.equipo || 'S/E'}`);

        // 2. Guardar en servidor automáticamente (permanente)
        try {
            const response = await fetch(`${this.API_URL}/boletas`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(boleta)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            console.log(`â � � Boleta ${boleta.id} guardada en servidor`);
        } catch (error) {
            console.error('â � � Error guardando boleta en servidor:', error);

            // Notificar al usuario sin bloquear
            this.showSyncError('boleta', boleta.id);
        }

        return true;
    },

    deleteBoleta(id) {
        const boletas = this.getBoletas();
        const boleta = boletas.find(b => b.id === id);

        if (boleta) {
            this.addToRecycleBin(boleta, 'BOLETA');

            const newBoletas = boletas.filter(b => b.id !== id);
            this.saveBoletas(newBoletas);
            this.cloudDelete('boletas', id); // borra también en la nube

            // AUDIT LOG
            this.logAction('BOLETAS', 'ELIMINAR', `Boleta ${id}`);

            return true;
        }
        return false;
    },

    renumberBoleta(oldId, newId) {
        const boletas = this.getBoletas();
        const index = boletas.findIndex(b => b.id === oldId);
        if (index !== -1) {
            boletas[index].id = newId;
            this.saveBoletas(boletas);
            return true;
        }
        return false;
    },

    // --- Papelera / Recycle Bin (en la nube: tabla recycle_bin, con caché local) ---
    getRecycleBin() {
        // caché local (sync) para render inmediato
        try { return JSON.parse(localStorage.getItem('hidrofix_papelera') || '[]'); } catch (e) { return []; }
    },

    async getRecycleBinFromServer() {
        try {
            const r = await fetch(`${this.API_URL}/recycle`, { headers: this.getAuthHeaders() });
            if (!r.ok) throw new Error('server');
            const rows = await r.json();
            const bin = (Array.isArray(rows) ? rows : []).map(row => {
                try { return JSON.parse(row.payload); } catch (e) { return null; }
            }).filter(Boolean);
            bin.sort((a, b) => new Date(b._deletedDate || 0) - new Date(a._deletedDate || 0));
            localStorage.setItem('hidrofix_papelera', JSON.stringify(bin));
            return bin;
        } catch (e) {
            console.warn('Papelera: no se pudo leer de la nube, usando caché local', e);
            return this.getRecycleBin();
        }
    },

    // Borrado en la nube (fire-and-forget) para que lo eliminado no reaparezca al sincronizar
    cloudDelete(resource, id) {
        try {
            fetch(`${this.API_URL}/${resource}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: this.getAuthHeaders() })
                .catch(e => console.warn('cloudDelete falló', resource, id, e));
        } catch (e) { }
    },

    addToRecycleBin(item, type) {
        const user = (typeof AuthManager !== 'undefined' && AuthManager.getUser()) ? AuthManager.getUser() : null;
        const deletedItem = {
            ...item,
            _originalType: type,
            _deletedType: type,
            _deletedDate: new Date().toISOString(),
            _deletedAt: new Date().toLocaleString('es-CO'),
            _deletedBy: user ? (user.full_name || user.username) : 'Sistema',
            _deletedId: Date.now().toString() + Math.random().toString(36).substr(2, 5)
        };
        // caché local
        let bin = this.getRecycleBin();
        bin.unshift(deletedItem);
        if (bin.length > 100) bin = bin.slice(0, 100);
        localStorage.setItem('hidrofix_papelera', JSON.stringify(bin));
        // nube (no bloquea la UI)
        const desc = deletedItem.descripcion || deletedItem.codigo || deletedItem.id || '';
        try {
            fetch(`${this.API_URL}/recycle`, {
                method: 'POST', headers: this.getAuthHeaders(),
                body: JSON.stringify({
                    id: deletedItem._deletedId, tipo: type, descripcion: String(desc).slice(0, 300),
                    deleted_at: deletedItem._deletedAt, deleted_by: deletedItem._deletedBy,
                    payload: JSON.stringify(deletedItem)
                })
            }).catch(e => console.warn('Papelera: no se pudo sincronizar a la nube', e));
        } catch (e) { }
    },

    async restoreFromTrash(trashId) {
        let bin = this.getRecycleBin();
        let itemIndex = bin.findIndex(i => i._deletedId === trashId);
        let itemToRestore = itemIndex !== -1 ? bin[itemIndex] : null;
        if (!itemToRestore) {
            bin = await this.getRecycleBinFromServer();
            itemIndex = bin.findIndex(i => i._deletedId === trashId);
            itemToRestore = itemIndex !== -1 ? bin[itemIndex] : null;
        }
        if (!itemToRestore) return false;

        const type = itemToRestore._originalType;
        const cleanItem = { ...itemToRestore };
        ['_originalType', '_deletedType', '_deletedDate', '_deletedAt', '_deletedBy', '_deletedId'].forEach(k => delete cleanItem[k]);

        let localKey = null, resource = null, modulo = null;
        if (type === 'LABOR') { localKey = 'hidrofix_labores_reportes'; resource = 'labores'; modulo = 'LABORES'; }
        else if (type === 'PLAN') { localKey = 'hidrofix_planes_v2'; resource = 'planes'; modulo = 'PLANES'; }
        else if (type === 'BOLETA' || type === 'REQUISICION') { localKey = 'hidrofix_boletas_v2'; resource = 'boletas'; modulo = 'BOLETAS'; }
        if (!localKey) return false;

        // restaurar en caché local
        const list = JSON.parse(localStorage.getItem(localKey) || '[]');
        list.unshift(cleanItem);
        localStorage.setItem(localKey, JSON.stringify(list));

        // re-insertar en la nube y quitar de la papelera (nube + local)
        try {
            await fetch(`${this.API_URL}/${resource}`, { method: 'POST', headers: this.getAuthHeaders(), body: JSON.stringify(cleanItem) });
        } catch (e) { console.warn('Restaurar: no se pudo re-insertar en la nube', e); }
        try {
            await fetch(`${this.API_URL}/recycle/${encodeURIComponent(trashId)}`, { method: 'DELETE', headers: this.getAuthHeaders() });
        } catch (e) { console.warn('Restaurar: no se pudo quitar de la papelera en la nube', e); }

        bin.splice(itemIndex, 1);
        localStorage.setItem('hidrofix_papelera', JSON.stringify(bin));
        this.logAction(modulo, 'RESTAURAR', `Restaurado ${cleanItem.id || cleanItem.codigo || ''}`);
        return true;
    },

    async emptyRecycleBin() {
        const bin = await this.getRecycleBinFromServer();
        for (const it of bin) {
            try { await fetch(`${this.API_URL}/recycle/${encodeURIComponent(it._deletedId)}`, { method: 'DELETE', headers: this.getAuthHeaders() }); } catch (e) { }
        }
        localStorage.setItem('hidrofix_papelera', '[]');
        return true;
    },

    // --- Backup & Restore (Restored) ---
    exportAllData: function () {
        const data = {
            planes: this.getPlanes(),
            reportes: JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]'),
            boletas: this.getBoletas(), // Added for traceability
            equipos: JSON.parse(localStorage.getItem('hidrofix_equipos') || '[]'),
            personal: JSON.parse(localStorage.getItem('hidrofix_personal') || '[]'),
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hidrofix_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    },

    importData: function (input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.planes) localStorage.setItem('hidrofix_planes_v2', JSON.stringify(data.planes));
                if (data.equipos) localStorage.setItem('hidrofix_equipos', JSON.stringify(data.equipos));
                if (data.reportes) localStorage.setItem('hidrofix_labores_reportes', JSON.stringify(data.reportes));
                if (data.boletas) localStorage.setItem('hidrofix_boletas_v2', JSON.stringify(data.boletas));
                if (data.personal) localStorage.setItem('hidrofix_personal', JSON.stringify(data.personal));

                alert('Copia de seguridad restaurada correctamente.');
                setTimeout(() => location.reload(), 500);
            } catch (err) {
                console.error("Error importing data", err);
                alert('Error al leer el archivo de respaldo.');
            }
        };
        reader.readAsText(file);
    },

    // --- Recovery and Debugging Tools ---
    debugState() {
        const stats = {
            'v2_Planes': JSON.parse(localStorage.getItem('hidrofix_planes_v2') || '[]').length,
            'v1_Planes': JSON.parse(localStorage.getItem('hidrofix_planes') || '[]').length,
            'v2_Boletas': JSON.parse(localStorage.getItem('hidrofix_boletas_v2') || '[]').length,
            'v1_Boletas': JSON.parse(localStorage.getItem('hidrofix_boletas') || '[]').length,
            'v3_Mat': JSON.parse(localStorage.getItem('hidrofix_materiales_v3') || '[]').length,
            'v1_Mat': JSON.parse(localStorage.getItem('hidrofix_materiales_maestro') || '[]').length,
            'Labores': JSON.parse(localStorage.getItem('hidrofix_labores_reportes') || '[]').length,
            'Equipos': JSON.parse(localStorage.getItem('hidrofix_equipos') || '[]').length,
            'Version': localStorage.getItem('hidrofix_data_version')
        };
        console.table(stats);
        return stats;
    },

    // --- Maintenance Events with Attachments ---
    saveMaintenanceEvents(events) {
        try {
            localStorage.setItem('hidrofix_maintenance_events', JSON.stringify(events));
            console.log(`â � � Saved ${events.length} maintenance events`);
            return true;
        } catch (error) {
            console.error('Error saving maintenance events:', error);
            // Check if quota exceeded
            if (error.name === 'QuotaExceededError') {
                alert('â � ï � � Espacio de almacenamiento lleno. Los archivos adjuntos son muy grandes.\nConsidera eliminar archivos antiguos o reducir el tamaño de los adjuntos.');
            }
            return false;
        }
    },

    getMaintenanceEvents() {
        try {
            const events = JSON.parse(localStorage.getItem('hidrofix_maintenance_events') || '[]');
            console.log(`ð � � � Loaded ${events.length} maintenance events`);
            return events;
        } catch (error) {
            console.error('Error loading maintenance events:', error);
            return [];
        }
    },

    removeAttachmentFromEvent(eventId, attachmentId) {
        const events = this.getMaintenanceEvents();
        const event = events.find(e => e.id === eventId);

        if (event && event.attachments) {
            event.attachments = event.attachments.filter(a => a.id !== attachmentId);
            this.saveMaintenanceEvents(events);
            return true;
        }

        return false;
    },

    forceSyncFromLegacy() {
        if (!confirm("â � ï � � ATENCIÓN: Esta acción reemplazará los datos actuales (_v2/_v3) con los datos antiguos.\nÂ �Desea continuar?")) return;

        localStorage.removeItem('hidrofix_planes_v2');
        localStorage.removeItem('hidrofix_boletas_v2');
        localStorage.removeItem('hidrofix_materiales_v3');

        this.init();
        alert("Recuperación completada. Por favor, refresque la página (Ctrl+R).");
        location.reload();
    },

    // --- Sync Error Handling ---
    showSyncError(tipo, id) {
        // Mostrar notificación no intrusiva
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-weight: 600;
            max-width: 400px;
        `;
        notification.innerHTML = `
            â � ï � � No se pudo sincronizar ${tipo} <strong>${id}</strong> con el servidor.<br>
            <small style="opacity: 0.9;">Los datos están guardados localmente. Sincroniza manualmente más tarde.</small>
        `;

        document.body.appendChild(notification);

        // Auto-remover después de 5 segundos
        setTimeout(() => notification.remove(), 5000);

        // Guardar en lista de pendientes
        this.addToPendingSync(tipo, id);
    },

    addToPendingSync(tipo, id) {
        const pending = JSON.parse(localStorage.getItem('hidrofix_pending_sync') || '[]');
        pending.push({ tipo, id, timestamp: Date.now() });
        localStorage.setItem('hidrofix_pending_sync', JSON.stringify(pending));

        // Actualizar contador si existe
        const badge = document.getElementById('pending-count');
        if (badge) {
            badge.textContent = pending.length;
            badge.style.display = pending.length > 0 ? 'inline-block' : 'none';
        }
    },

    // --- AUDIT SYSTEM ---
    async logAction(modulo, action, detalle) {
        const logs = this.getAuditLogs();
        const user = AuthManager.getUser();

        const newLog = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            usuario: user ? user.username : 'Sistema',
            modulo: modulo,
            accion: action,
            detalle: detalle
        };

        logs.push(newLog);

        // Limit local logs (cache)
        if (logs.length > 500) logs.shift();

        try {
            localStorage.setItem('hidrofix_audit_logs', JSON.stringify(logs));

            // Sync with Server (Centralized)
            await fetch(`${this.API_URL}/audit`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(newLog)
            });

            return true;
        } catch (e) {
            console.error("Error saving/syncing audit log:", e);
            return false;
        }
    },

    getAuditLogs() {
        try {
            return JSON.parse(localStorage.getItem('hidrofix_audit_logs') || '[]');
        } catch (e) { return []; }
    },

    async getAuditLogsFromServer() {
        try {
            const response = await fetch(`${this.API_URL}/audit`, {
                headers: this.getAuthHeaders()
            });
            if (!response.ok) throw new Error("Server error fetching logs");
            return await response.json();
        } catch (e) {
            console.error("Error fetching audit logs from server:", e);
            return null;
        }
    },

    // --- SYNC PENDING ---
    async syncPending() {
        const pending = JSON.parse(localStorage.getItem('hidrofix_pending_sync') || '[]');

        if (pending.length === 0) {
            alert('â � � No hay elementos pendientes de sincronización');
            return;
        }

        if (!confirm(`Â �Sincronizar ${pending.length} elementos pendientes con el servidor?`)) {
            return;
        }

        let success = 0;
        let errors = 0;

        for (const item of pending) {
            try {
                let data;
                switch (item.tipo) {
                    case 'boleta':
                        data = this.getBoletas().find(b => b.id === item.id);
                        break;
                    case 'plan':
                        data = this.getPlanes().find(p => p.id === item.id);
                        break;
                    case 'equipo':
                        data = this.getEquipos().find(e => e.codigo === item.id);
                        break;
                    default:
                        continue;
                }

                if (!data) {
                    errors++;
                    continue;
                }

                const response = await fetch(`${this.API_URL}/${item.tipo}s`, {
                    method: 'POST',
                    headers: this.getAuthHeaders(),
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    success++;
                } else {
                    errors++;
                }
            } catch (e) {
                errors++;
            }
        }

        // Limpiar pendientes exitosos
        if (success > 0) {
            localStorage.removeItem('hidrofix_pending_sync');
            const badge = document.getElementById('pending-count');
            if (badge) badge.style.display = 'none';
        }

        alert(`Sincronización completada:\nâ � � Exitosas: ${success}\nâ � � Errores: ${errors}`);

        if (success > 0) {
            location.reload();
        }
    }
};

// Auto-init al cargar
try {
    DataManager.init();

    // Auto-load from cloud DISABLED to prevent overwriting local changes
    // if (localStorage.getItem('hidrofix_token')) {
    //     console.log("Auto-loading cloud data...");
    //     DataManager.loadFromCloud().then(() => {
    //         console.log("Cloud data refreshed on startup.");
    //         if (typeof DashboardController !== 'undefined') DashboardController.init();
    //         if (typeof PlanesController !== 'undefined' && typeof PlanesController.renderTable === 'function') {
    //             PlanesController.renderTable();
    //         }
    //     });
    // }
} catch (e) {
    alert("CRITICAL ERROR IN DATAMANAGER: " + e.message + "\n" + e.stack);
}
