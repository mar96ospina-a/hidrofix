// supabase-config.js
// Configuración de conexión a Supabase (nube). Reemplaza al servidor Node/Express local.
// La llave es PÚBLICA (anon) por diseño: el acceso a los datos está protegido por RLS + login.
window.SUPABASE_CONFIG = {
    url: 'https://qamgvibsbvkbywhhlfuh.supabase.co',
    // Llave anon (legacy JWT). También funciona la publishable sb_publishable_QZrydFgsNsFOEnVt93CXTQ_Oa5suuTN
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbWd2aWJzYnZrYnl3aGhsZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMzAwMzksImV4cCI6MjEwNzkwNjAzOX0.Tfq0XBSOmbHKP2HwSHZeMq22iOr3zXgMw6Oc7OlxaD0',
    // Dominio de los correos internos de login (usuario -> usuario@hidrofix.local)
    emailDomain: 'hidrofix.local'
};
