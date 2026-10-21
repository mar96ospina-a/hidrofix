// Prevent redeclaration error if script is loaded twice
if (typeof MAESTRO_MATERIALES === 'undefined') {
    var MAESTRO_MATERIALES = [
        // --- Agroquímicos y Fertilizantes ---
        { codigo: "12000001", descripcion: "AZUFRE ELEMENTAL", unidad: "KG", precio: 1024.0 },
        { codigo: "12000007", descripcion: "COSMO OIL", unidad: "L", precio: 8825.0 },
        { codigo: "12000010", descripcion: "AMINOLOM ENZIMATICO 24%", unidad: "L", precio: 44000.0 },
        { codigo: "12000011", descripcion: "MASTER 720", unidad: "L", precio: 27040.0 },
        { codigo: "12000013", descripcion: "BENOMIL", unidad: "KG", precio: 42400.0 },
        { codigo: "12000024", descripcion: "UREA GRANULADA 46%", unidad: "KG", precio: 1500.0 },
        { codigo: "12000271", descripcion: "ALIMENTO CONCENTRADO ANIMALES", unidad: "KG", precio: 1872.0 },
        { codigo: "12000310", descripcion: "HERBICIDA FINALE", unidad: "L", precio: 35750.0 },
        { codigo: "12000746", descripcion: "MAP GRANULADO", unidad: "KG", precio: 2890.0 },
        { codigo: "12000970", descripcion: "DAP", unidad: "KG", precio: 1605.0 },
        { codigo: "12001225", descripcion: "TRIPLE-18", unidad: "KG", precio: 1600.0 },

        // --- ACEITES, GRASAS Y LUBRICANTES (Lo que faltaba) ---
        { codigo: "14700234", descripcion: "GRASA ANTIFRICCION 3W LB", unidad: "LB", precio: 7647.0 },
        { codigo: "14700357", descripcion: "GRASA MULTIPROPOSITO EP2", unidad: "KG", precio: 1.0 },
        { codigo: "14700390", descripcion: "GRASA COMPLEJO DE LITIO EP2", unidad: "C/U", precio: 120000.0 },
        { codigo: "14700411", descripcion: "SHELL TELLUS 100 X CUÐETE", unidad: "C/U", precio: 295000.0 },
        { codigo: "14700457", descripcion: "ACEITE DE ENGRANAJES 85W140", unidad: "GLN", precio: 1.0 }, // Added as requested
        { codigo: "14700230", descripcion: "ACEITE REF:15W40 X 55 GALONES", unidad: "GLN", precio: 850000.0 }, // Estimado/Mock
        { codigo: "14700491", descripcion: "ACEITE HYTRAN (Caja/Hidraulico)", unidad: "GLN", precio: 115000.0 },
        { codigo: "16040461", descripcion: "GRASA ROJA X KILOS", unidad: "KG", precio: 40000.0 },
        { codigo: "16040466", descripcion: "TAMBOR DE ACEITE MOVIL REF:15W50", unidad: "GLN", precio: 1.0 },
        { codigo: "16040963", descripcion: "DEPOSITO ACEITE HIDRAULICO TRACTOR", unidad: "C/U", precio: 171661.0 },
        { codigo: "16043673", descripcion: "DEPOSITO ACEITE HIDRAULICO FARMALL", unidad: "C/U", precio: 331382.0 },
        { codigo: "26100148", descripcion: "VASO NIVEL ACEITE COMPLETO", unidad: "C/U", precio: 619803.0 },

        // --- FILTROS (Comunes en Mantenimientos) ---
        { codigo: "14700441", descripcion: "FILTRO DE COMBUSTIBLE 84467749", unidad: "C/U", precio: 45000.0 },
        { codigo: "14700443", descripcion: "FILTRO DE COMBUSTIBLE TRAMPA", unidad: "C/U", precio: 38000.0 },
        { codigo: "14700445", descripcion: "FILTRO DE ACEITE 87679562", unidad: "C/U", precio: 52000.0 },
        { codigo: "14700451", descripcion: "FILTRO DE ACEITE 82824884", unidad: "C/U", precio: 48000.0 },

        // --- Labor/Maquinaria ---
        { codigo: "331001", descripcion: "TRACTOR MASSEY 75 HP No. 1", unidad: "HR", precio: 47577.0 },
        { codigo: "331002", descripcion: "TRACTOR MASSEY 75 HP No. 2", unidad: "HR", precio: 47577.0 },
        { codigo: "330201", descripcion: "AUXILIAR DE CAMPO", unidad: "HR", precio: 8000.0 },
        { codigo: "330202", descripcion: "OFICIOS VARIOS CAMPO", unidad: "HR", precio: 13853.0 },
        { codigo: "731009", descripcion: "TRACTOR CASE JX 110", unidad: "HR", precio: 72728.0 }
    ];

    window.MAESTRO_MATERIALES = MAESTRO_MATERIALES;
}
