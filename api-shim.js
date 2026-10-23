// api-shim.js
// Intercepta todas las llamadas del app a `/api/...` (que antes iban al servidor Node local)
// y las traduce a Supabase: PostgREST (/rest/v1) para datos y GoTrue (/auth/v1) para login.
// Se carga ANTES de authmanager.js/datamanager.js para instalar el wrapper de fetch a tiempo.
(function () {
    'use strict';
    var CFG = window.SUPABASE_CONFIG || {};
    var SUPA = CFG.url;
    var ANON = CFG.anonKey;
    var DOMAIN = CFG.emailDomain || 'hidrofix.local';
    var REST = SUPA + '/rest/v1/';
    var AUTH = SUPA + '/auth/v1/';

    var _fetch = window.fetch.bind(window);

    // Config por recurso: tabla, PK, columnas permitidas, columnas JSON (texto) y numéricas.
    var RES = {
        planes: { table: 'planes', pk: 'id',
            cols: ['id', 'codigo', 'descripcion', 'tipo', 'equipo', 'frecuencia', 'nivel_alerta', 'materiales', 'estado', 'fechaProgramada', 'fechaEjecucion', 'costoTotal', 'tecnico'],
            json: ['materiales'], num: ['frecuencia', 'costoTotal'] },
        equipos: { table: 'equipos', pk: 'codigo',
            cols: ['codigo', 'descripcion', 'ubicacion', 'funcion', 'potenciaHP', 'horometro_actual', 'consumo_real_acumulado', 'horas_consumo_acumulado', 'potenciaKw', 'consumo', 'proveedor', 'fecha_ultima_actividad', 'variador', 'caudal'],
            json: [], num: ['horometro_actual', 'consumo_real_acumulado', 'horas_consumo_acumulado'] },
        boletas: { table: 'boletas', pk: 'id',
            cols: ['id', 'fecha', 'solicitante', 'equipo', 'items', 'estado', 'actividad'],
            json: ['items'], num: [] },
        actividades: { table: 'actividades', pk: 'id',
            cols: ['id', 'fecha', 'labor', 'accion', 'zona', 'responsable', 'estado', 'area', 'equipo'],
            json: [], num: [], genId: function () { return 'ACT-' + Date.now() + '-' + Math.floor(Math.random() * 1000); },
            defaults: { estado: 'Terminado', area: 'RECURSOS HIDRICOS' } },
        labores: { table: 'labores', pk: 'id',
            cols: ['id', 'fecha', 'tecnico', 'descripcion', 'estado', 'costoMateriales'],
            json: [], num: ['costoMateriales'] },
        personal: { table: 'personal', pk: 'id',
            cols: ['id', 'nombre', 'cargo', 'telefono'], json: [], num: [] },
        materiales: { table: 'materiales', pk: 'codigo',
            cols: ['codigo', 'descripcion', 'precio', 'unidad', 'stock'], json: [], num: ['precio', 'stock'] },
        audit: { table: 'audit_logs', pk: 'id',
            cols: ['id', 'timestamp', 'usuario', 'modulo', 'accion', 'detalle'], json: [], num: [] },
        recycle: { table: 'recycle_bin', pk: 'id',
            cols: ['id', 'tipo', 'descripcion', 'deleted_at', 'deleted_by', 'payload'], json: [], num: [] }
    };

    function json(obj, status) {
        return new Response(JSON.stringify(obj), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    function token() { try { return localStorage.getItem('hidrofix_token') || ANON; } catch (e) { return ANON; } }

    function restHeaders(extra) {
        var h = {
            'apikey': ANON,
            'Authorization': 'Bearer ' + token(),
            'Content-Type': 'application/json'
        };
        if (extra) for (var k in extra) h[k] = extra[k];
        return h;
    }

    // Prepara una fila para escribir: solo columnas válidas, JSON como texto, numéricos saneados.
    function prepRow(cfg, body) {
        var row = {};
        cfg.defaults && Object.keys(cfg.defaults).forEach(function (k) {
            if (body[k] === undefined || body[k] === null || body[k] === '') row[k] = cfg.defaults[k];
        });
        cfg.cols.forEach(function (c) {
            if (!(c in body)) return;
            var v = body[c];
            if (cfg.json.indexOf(c) !== -1) {
                row[c] = (typeof v === 'string') ? v : JSON.stringify(v || []);
            } else if (cfg.num.indexOf(c) !== -1) {
                if (v === '' || v === null || v === undefined) row[c] = null;
                else { var n = Number(v); row[c] = isFinite(n) ? n : null; }
            } else {
                row[c] = v;
            }
        });
        if (cfg.genId && (row[cfg.pk] === undefined || row[cfg.pk] === null || row[cfg.pk] === '')) {
            row[cfg.pk] = cfg.genId();
        }
        return row;
    }

    // Parsea las columnas JSON (texto) a objetos al leer, como hacía el servidor Node.
    function parseRows(cfg, rows) {
        if (!Array.isArray(rows)) return rows;
        if (!cfg.json.length) return rows;
        return rows.map(function (r) {
            cfg.json.forEach(function (c) {
                if (typeof r[c] === 'string') { try { r[c] = JSON.parse(r[c]); } catch (e) { r[c] = []; } }
                else if (r[c] == null) r[c] = [];
            });
            return r;
        });
    }

    async function refreshToken() {
        var rt; try { rt = localStorage.getItem('sb_refresh_token'); } catch (e) { }
        if (!rt) return null;
        try {
            var r = await _fetch(AUTH + 'token?grant_type=refresh_token', {
                method: 'POST',
                headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: rt })
            });
            if (!r.ok) return null;
            var d = await r.json();
            localStorage.setItem('hidrofix_token', d.access_token);
            localStorage.setItem('sb_refresh_token', d.refresh_token);
            return d.access_token;
        } catch (e) { return null; }
    }

    // Ejecuta una llamada REST con reintento único si el token expiró (401).
    async function restCall(url, opts) {
        var r = await _fetch(url, opts);
        if (r.status === 401) {
            var nt = await refreshToken();
            if (nt) {
                opts.headers['Authorization'] = 'Bearer ' + nt;
                r = await _fetch(url, opts);
            }
        }
        return r;
    }

    // ---------------- AUTH (GoTrue) ----------------
    async function handleAuth(action, method, body) {
        if (action === 'users' && method === 'GET') {
            var r = await _fetch(REST + 'user_cards?select=*', {
                headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + ANON }
            });
            var list = r.ok ? await r.json() : [];
            return json(list.map(function (u) {
                return {
                    username: u.username, role: u.role,
                    avatar_type: u.avatar_type, avatar_data: u.avatar_data,
                    name: u.full_name || u.username,
                    role_display: u.job_title || u.role
                };
            }));
        }

        if (action === 'login' && method === 'POST') {
            var email = String(body.username || '').toLowerCase() + '@' + DOMAIN;
            var tr = await _fetch(AUTH + 'token?grant_type=password', {
                method: 'POST',
                headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: body.password })
            });
            if (!tr.ok) {
                return json({ success: false, message: 'Usuario o contraseña incorrectos' }, 200);
            }
            var td = await tr.json();
            try {
                localStorage.setItem('hidrofix_token', td.access_token);
                localStorage.setItem('sb_refresh_token', td.refresh_token);
            } catch (e) { }
            // Traer perfil (rol, nombre, avatar) desde la vista user_cards
            var pr = await _fetch(REST + 'user_cards?username=eq.' + encodeURIComponent(body.username) + '&select=*', {
                headers: { 'apikey': ANON, 'Authorization': 'Bearer ' + td.access_token }
            });
            var profs = pr.ok ? await pr.json() : [];
            var p = profs[0] || {};
            return json({
                success: true,
                token: td.access_token,
                user: {
                    username: body.username,
                    role: p.role || 'USER',
                    avatar_type: p.avatar_type,
                    avatar_data: p.avatar_data,
                    full_name: p.full_name,
                    job_title: p.job_title,
                    must_change_password: p.must_change_password || 0
                }
            });
        }

        if ((action === 'force-password' || action === 'change-password') && method === 'POST') {
            // change-password: valida la clave antigua reintentando login
            if (action === 'change-password') {
                var em = String(body.username || '').toLowerCase() + '@' + DOMAIN;
                var chk = await _fetch(AUTH + 'token?grant_type=password', {
                    method: 'POST', headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: em, password: body.oldPassword })
                });
                if (!chk.ok) return json({ success: false, message: 'La contraseña actual es incorrecta' }, 200);
                var cd = await chk.json();
                try { localStorage.setItem('hidrofix_token', cd.access_token); localStorage.setItem('sb_refresh_token', cd.refresh_token); } catch (e) { }
            }
            var up = await restCall(AUTH + 'user', {
                method: 'PUT',
                headers: restHeaders(),
                body: JSON.stringify({ password: body.newPassword })
            });
            if (!up.ok) {
                var em = 'No se pudo actualizar la contraseña.';
                try {
                    var ed = await up.json();
                    var raw = String(ed.msg || ed.error_description || ed.message || '').toLowerCase();
                    if (raw.indexOf('at least') !== -1 || raw.indexOf('6 character') !== -1 || raw.indexOf('length') !== -1 || raw.indexOf('short') !== -1) {
                        em = 'La contraseña debe tener al menos 6 caracteres.';
                    } else if (raw.indexOf('weak') !== -1 || raw.indexOf('pwned') !== -1 || raw.indexOf('leaked') !== -1) {
                        em = 'Esa contraseña es muy común/insegura. Elige otra.';
                    } else if (ed.msg || ed.error_description) {
                        em = ed.msg || ed.error_description;
                    }
                } catch (e) { }
                return json({ success: false, message: em }, 200);
            }
            // limpiar flag must_change_password
            if (body.username) {
                await restCall(REST + 'users?username=eq.' + encodeURIComponent(body.username), {
                    method: 'PATCH', headers: restHeaders({ 'Prefer': 'return=minimal' }),
                    body: JSON.stringify({ must_change_password: 0 })
                });
            }
            return json({ success: true });
        }

        if (action === 'update-avatar' && method === 'POST') {
            await restCall(REST + 'users?username=eq.' + encodeURIComponent(body.username), {
                method: 'PATCH', headers: restHeaders({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ avatar_type: body.avatar_type, avatar_data: body.avatar_data })
            });
            return json({ success: true, message: 'Avatar actualizado' });
        }

        if (action === 'update-profile' && method === 'POST') {
            await restCall(REST + 'users?username=eq.' + encodeURIComponent(body.username), {
                method: 'PATCH', headers: restHeaders({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify({ full_name: body.full_name, job_title: body.job_title })
            });
            return json({ success: true, message: 'Perfil actualizado' });
        }

        return json({ success: false, message: 'Acción no soportada' }, 404);
    }

    // ---------------- DATOS (PostgREST) ----------------
    async function handleData(resource, id, method, body) {
        // capex fue retirado del menú y la tabla no coincide con el esquema del app: no-op seguro
        if (resource === 'capex') {
            if (method === 'GET') return json([]);
            return json({ message: 'ok' });
        }
        var cfg = RES[resource];
        if (!cfg) return json({ error: 'Recurso desconocido: ' + resource }, 404);

        if (method === 'GET') {
            var q = REST + cfg.table + '?select=*';
            if (resource === 'audit') q += '&order=timestamp.desc&limit=1000';
            var r = await restCall(q, { headers: restHeaders() });
            if (!r.ok) return json({ error: 'Error leyendo ' + resource }, r.status);
            var rows = await r.json();
            return json(parseRows(cfg, rows));
        }

        if (method === 'POST') {
            var row = prepRow(cfg, body || {});
            var r2 = await restCall(REST + cfg.table, {
                method: 'POST',
                headers: restHeaders({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
                body: JSON.stringify(row)
            });
            if (!r2.ok) { var t = await r2.text(); return json({ error: t }, r2.status); }
            return json({ message: 'ok', id: row[cfg.pk] }, 201);
        }

        if (method === 'PUT' && id != null) {
            var row2 = prepRow(cfg, body || {});
            delete row2[cfg.pk]; // no reescribir la PK en un update
            var r3 = await restCall(REST + cfg.table + '?' + cfg.pk + '=eq.' + encodeURIComponent(id), {
                method: 'PATCH',
                headers: restHeaders({ 'Prefer': 'return=minimal' }),
                body: JSON.stringify(row2)
            });
            if (!r3.ok) { var t3 = await r3.text(); return json({ error: t3 }, r3.status); }
            return json({ message: 'updated' });
        }

        if (method === 'DELETE' && id != null) {
            var r4 = await restCall(REST + cfg.table + '?' + cfg.pk + '=eq.' + encodeURIComponent(id), {
                method: 'DELETE', headers: restHeaders({ 'Prefer': 'return=minimal' })
            });
            if (!r4.ok) { var t4 = await r4.text(); return json({ error: t4 }, r4.status); }
            return json({ message: 'deleted' });
        }

        return json({ error: 'Método no soportado' }, 405);
    }

    // ---------------- WRAPPER de fetch ----------------
    window.fetch = async function (input, init) {
        var urlStr = (typeof input === 'string') ? input : (input && input.url) || '';
        var idx = urlStr.indexOf('/api');
        // Solo interceptar si '/api' es un segmento de ruta (/api o /api/...)
        var isApi = idx !== -1 && (urlStr.charAt(idx + 4) === '/' || urlStr.charAt(idx + 4) === '' || idx + 4 === urlStr.length || urlStr.charAt(idx + 4) === '?');
        if (!isApi) return _fetch(input, init);

        init = init || {};
        var method = (init.method || 'GET').toUpperCase();
        var body = {};
        if (init.body) { try { body = JSON.parse(init.body); } catch (e) { body = {}; } }

        var after = urlStr.slice(idx + 4).replace(/^\//, ''); // tras '/api/'
        var pathPart = after.split('?')[0];
        var segs = pathPart.split('/').filter(Boolean);

        try {
            if (segs.length === 0) {
                // health check (p.ej. AuthManager.checkConnection)
                return json({ message: 'Hidrofix (Supabase) OK' });
            }
            if (segs[0] === 'auth') {
                return await handleAuth(segs[1] || '', method, body);
            }
            var resource = segs[0];
            var id = segs.length > 1 ? decodeURIComponent(segs[1]) : null;
            return await handleData(resource, id, method, body);
        } catch (e) {
            console.error('[api-shim] error:', e);
            return json({ error: String(e && e.message || e) }, 500);
        }
    };

    console.log('[api-shim] Supabase activo ->', SUPA);
})();
