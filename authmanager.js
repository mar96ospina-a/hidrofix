/**
 * AuthManager.js
 * Handles client-side authentication, token management, and login UI.
 */
const AuthManager = {
    // Intelligent calculation of API_URL based on protocol
    // Intelligent calculation of API_URL based on protocol
    API_URL: (function () {
        if (window.location.protocol === 'file:') return 'http://127.0.0.1:3000/api/auth';

        // Dynamic URL construction: protocol + // + hostname + :3000 + /api/auth
        // Example: http: + // + 192.168.1.15 + :3000 + /api/auth
        const baseUrl = window.location.protocol + '//' + window.location.hostname + ':3000';
        return baseUrl + '/api/auth';
    })(),

    init() {
        console.log("AuthManager init with Card UI...");

        // Ensure UI state matches auth state
        if (this.isAuthenticated()) {
            this.hideLogin_UI();
        } else {
            this.showLogin_UI();
            this.checkConnection(); // Check server status on login screen
            this.renderUserCards(); // Load users dynamically
        }

        // Attach logout listener if exists
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }
    },

    async checkConnection() {
        const indicator = document.getElementById('server-status-indicator');
        if (!indicator) return;

        indicator.innerHTML = '<span style="color: var(--brand-yellow);">🟡 Verificando servidor...</span>';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(this.API_URL.replace('/auth', ''), {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                indicator.innerHTML = '<span style="color: var(--primary);">🟢 Servidor Conectado</span>';
                // Clear any pending connection error in the password modal if it's open
                const modalError = document.getElementById('modal-error');
                if (modalError && modalError.textContent.includes('conexión')) {
                    modalError.textContent = '';
                }
            } else {
                indicator.innerHTML = '<span style="color: var(--danger);">🔴 Servidor con Errores</span>';
            }
        } catch (error) {
            indicator.innerHTML = '<a href="#" onclick="AuthManager.checkConnection()" style="color: var(--danger); text-decoration: none;">🔴 Servidor Desconectado (Reintentar)</a>';
            console.warn("Server offline or unreachable:", error);
        }
    },

    isAuthenticated() {
        const token = localStorage.getItem('hidrofix_token');
        return !!token;
    },

    getToken() {
        return localStorage.getItem('hidrofix_token');
    },

    getUser() {
        const userStr = localStorage.getItem('hidrofix_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    async login(username, password) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`${this.API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('hidrofix_token', data.token);
                localStorage.setItem('hidrofix_user', JSON.stringify(data.user));

                // Success actions
                this.closePasswordModal();
                this.hideLogin_UI();

                // FORCE RELOAD to ensure clean state
                console.log("Login success. Reloading...");
                window.location.reload();
                return { success: true };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.name === 'AbortError') {
                return { success: false, message: "Tiempo de espera agotado" };
            }
            return { success: false, message: "Error de conexión (Verifique INICIAR_SERVIDOR.bat)" };
        }
    },

    logout() {
        localStorage.removeItem('hidrofix_token');
        localStorage.removeItem('hidrofix_user');
        this.showLogin_UI();
        window.location.reload();
    },

    // --- UI Handling ---

    getInitials(user) {
        const base = (user && (user.name || user.full_name || user.username)) || '?';
        const parts = String(base).trim().split(/\s+/).filter(Boolean);
        let ini = parts.length >= 2 ? (parts[0][0] + parts[1][0]) : base.slice(0, 2);
        return ini.toUpperCase();
    },

    getAvatarHtml(user, size = '120px') {
        if (!user) return '';

        // Foto subida: se respeta
        if (user.avatar_type === 'UPLOAD' && user.avatar_data) {
            return `<img src="${user.avatar_data}" style="width: ${size}; height: ${size}; border-radius: 50%; object-fit: cover;">`;
        }

        // Avatar corporativo: iniciales en círculo, color sobrio
        const ini = this.getInitials(user);
        const font = `calc(${size} * 0.38)`;
        return `<div style="width:${size};height:${size};border-radius:50%;display:flex;align-items:center;justify-content:center;
            background:var(--primary-soft,rgba(63,138,87,.12));color:var(--primary-strong,#4f9c67);
            font-weight:700;font-size:${font};letter-spacing:.5px;border:1px solid var(--glass-border,#2b2f35);
            font-family:var(--font-family,'Inter',sans-serif);">${ini}</div>`;
    },

    showLogin_UI() {
        const view = document.getElementById('view-login');
        if (view) view.style.display = 'flex';

        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.style.display = 'none';

        document.body.style.overflow = 'hidden';
    },

    hideLogin_UI() {
        const view = document.getElementById('view-login');
        if (view) view.style.display = 'none';

        const sidebar = document.getElementById('main-sidebar');
        if (sidebar) sidebar.style.display = 'flex';

        // --- RBAC: Hide Restricted Items for non-ADMIN users ---
        const user = this.getUser();
        if (user) {
            // Update Sidebar Profile Info
            const avatarContainer = document.getElementById('sidebar-avatar-container');
            if (avatarContainer) {
                avatarContainer.innerHTML = this.getAvatarHtml(user, '40px');
            }
            const nameEl = document.getElementById('sidebar-user-name');
            if (nameEl) {
                nameEl.textContent = user.full_name || user.username;
            }

            // --- PERMISOS POR USUARIO/CARGO ---
            // Módulos (targets de navigate) permitidos por usuario. 'ALL' = todo.
            const PERMS = {
                admin:   'ALL',
                ana:     ['centro', 'actividades', 'boletas', 'calendario', 'programacion', 'equipos', 'materiales', 'auditoria'], // Coordinadora: supervisa
                johan:   ['actividades', 'programacion', 'calendario', 'centro'],  // Analista I: labores/rutas
                jvargas: ['boletas', 'centro']                                     // Auxiliar: boletas (genera desde Plantillas)
            };
            const uname = (user.username || '').toLowerCase();
            const allowed = PERMS[uname];
            const isAdmin = user.role === 'ADMIN' || allowed === 'ALL';

            if (!isAdmin) {
                const set = Array.isArray(allowed) ? allowed : ['centro']; // fallback mínimo
                document.querySelectorAll('#main-sidebar .nav-item').forEach(li => {
                    const oc = li.getAttribute('onclick') || '';
                    const m = oc.match(/navigate\(['"]([^'"]+)['"]\)/);
                    const txt = (li.textContent || '').toLowerCase();
                    if (m) {
                        if (!set.includes(m[1])) li.style.display = 'none';
                    } else {
                        // Items sin navigate: dejar Sincronizar y Cambiar Tema; ocultar Diagnóstico
                        if (/diagn/.test(txt)) li.style.display = 'none';
                    }
                });
                // Admin-only por id (por si no tienen navigate detectable)
                ['nav-recycle-bin', 'nav-config'].forEach(id => {
                    const el = document.getElementById(id); if (el) el.style.display = 'none';
                });
            }

            // Forzar cambio de contraseña en el primer ingreso
            if (user.must_change_password == 1) {
                setTimeout(() => { try { this.forcePasswordChange(user.username); } catch (e) { } }, 500);
            }
        }

        document.body.style.overflow = 'auto';
    },

    refreshSidebarProfile() {
        const user = this.getUser();
        if (!user) return;

        const avatarContainer = document.getElementById('sidebar-avatar-container');
        if (avatarContainer) {
            avatarContainer.innerHTML = this.getAvatarHtml(user, '40px');
        }
        const nameEl = document.getElementById('sidebar-user-name');
        if (nameEl) {
            nameEl.textContent = user.full_name || user.username;
        }
    },

    forcePasswordChange(username) {
        if (document.getElementById('force-pass-modal')) return;
        const ov = document.createElement('div');
        ov.id = 'force-pass-modal';
        ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
        ov.innerHTML = `
            <div style="background:var(--bg-panel,#191c20);color:var(--text-main,#e4e7ea);border:1px solid var(--glass-border,#2b2f35);border-radius:10px;max-width:400px;width:92%;padding:1.6rem;box-shadow:0 20px 60px rgba(0,0,0,.5);">
                <h2 style="margin:0 0 .3rem;font-size:1.2rem;">Crea tu contraseña</h2>
                <p style="margin:0 0 1.1rem;color:var(--text-muted,#8a929b);font-size:.85rem;">Por seguridad, cambia la clave temporal antes de continuar.</p>
                <input id="fp-1" type="password" placeholder="Nueva contraseña" style="width:100%;box-sizing:border-box;margin-bottom:.6rem;background:var(--bg-dark,#141619);color:var(--text-main);border:1px solid var(--glass-border);border-radius:6px;padding:.6rem .7rem;font-size:.9rem;">
                <input id="fp-2" type="password" placeholder="Confirmar contraseña" style="width:100%;box-sizing:border-box;margin-bottom:.4rem;background:var(--bg-dark,#141619);color:var(--text-main);border:1px solid var(--glass-border);border-radius:6px;padding:.6rem .7rem;font-size:.9rem;">
                <div id="fp-err" style="color:var(--danger,#c05058);font-size:.78rem;min-height:1.1em;margin-bottom:.6rem;"></div>
                <button id="fp-save" style="width:100%;background:var(--primary,#3f8a57);color:#fff;border:1px solid var(--primary-strong,#4f9c67);border-radius:6px;padding:.65rem;font-weight:700;cursor:pointer;">Guardar y continuar</button>
            </div>`;
        document.body.appendChild(ov);
        const err = ov.querySelector('#fp-err');
        ov.querySelector('#fp-save').onclick = async () => {
            const p1 = ov.querySelector('#fp-1').value, p2 = ov.querySelector('#fp-2').value;
            if (p1.length < 4) { err.textContent = 'Mínimo 4 caracteres.'; return; }
            if (p1 !== p2) { err.textContent = 'Las contraseñas no coinciden.'; return; }
            try {
                const r = await fetch(this.API_URL + '/force-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, newPassword: p1 }) });
                const d = await r.json();
                if (!d.success) { err.textContent = d.message || 'Error al guardar.'; return; }
                const u = this.getUser(); if (u) { u.must_change_password = 0; localStorage.setItem('hidrofix_user', JSON.stringify(u)); }
                ov.remove();
            } catch (e) { err.textContent = 'Error de conexión.'; }
        };
    },

    async renderUserCards() {
        const grid = document.getElementById('login-user-grid');
        if (!grid) return;

        try {
            // Remove the '/auth' suffix from this.API_URL temporarily if it's already there
            const baseUrl = this.API_URL.endsWith('/auth') ? this.API_URL : `${this.API_URL}/auth`;
            const response = await fetch(`${baseUrl}/users`);
            const users = await response.json();

            grid.innerHTML = '';

            users.forEach(u => {
                const card = document.createElement('div');
                card.className = 'glass-panel user-card';
                card.style.cssText = `
                    padding: 2rem;
                    text-align: center;
                    cursor: pointer;
                    border: 1px solid var(--glass-border);
                    background: var(--login-card-bg);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                     animation: popIn 0.5s ease backwards;
                `;
                card.onclick = () => AuthManager.openPasswordModal(u.username, u.name, u.role, u.avatar_type, u.avatar_data);

                // Card Header: Avatar
                const avatarHtml = this.getAvatarHtml(u, '80px');

                card.innerHTML = `
                    <div style="width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        ${avatarHtml}
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--login-text); text-transform: uppercase; letter-spacing: -0.5px;">${u.name}</h3>
                        <p style="margin: 4px 0 0; font-size: 0.8rem; color: var(--login-text-muted); font-weight: 600; text-transform: uppercase; opacity: 0.8;">${u.role_display}</p>
                    </div>
                `;
                grid.appendChild(card);
            });
        } catch (e) {
            console.error("Error loading user cards:", e);
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 2.5rem 2rem; background: rgba(239, 68, 68, 0.05); border-radius: 1.5rem; border: 1px solid rgba(239, 68, 68, 0.2); animation: popIn 0.3s ease;">
                        <span style="font-size: 3rem; margin-bottom: 1rem; display: block;">🔌</span>
                        <h3 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">Servidor Desconectado</h3>
                        <p style="margin: 0; color: var(--login-text-muted); font-size: 0.95rem; line-height: 1.5;">El servidor local no está en ejecución.<br>Por favor minimice su navegador y ejecute el archivo <b style="color:var(--login-text);">INICIAR_SERVIDOR.bat</b> para continuar.</p>
                        <button onclick="window.location.reload()" style="margin-top: 1.5rem; padding: 0.8rem 2rem; background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: 1rem; cursor: pointer; font-weight: 600; display: inline-flex; align-items: center; gap: 0.5rem; transition: 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">
                            <i data-lucide="refresh-cw" style="width: 16px; height: 16px;"></i> Reintentar Conexión
                        </button>
                    </div>
                `;
                if (window.lucide) {
                    lucide.createIcons();
                }
            }
        }
    },

    // --- Modal Logic for User Cards ---

    openPasswordModal(username, fullName, role, avatarType, avatarData) {
        const modal = document.getElementById('password-modal');
        if (!modal) return console.error("Password modal not found");

        // Set User Details
        document.getElementById('modal-username').value = username;
        document.getElementById('selected-user-name').textContent = fullName;

        const avatarContainer = document.getElementById('selected-user-avatar');
        if (avatarContainer) {
            avatarContainer.innerHTML = this.getAvatarHtml({ username, avatar_type: avatarType, avatar_data: avatarData }, '120px');
        }

        document.getElementById('modal-error').textContent = '';
        document.getElementById('modal-password').value = '';

        // Show Modal
        modal.style.display = 'flex';

        // Focus password
        setTimeout(() => document.getElementById('modal-password').focus(), 100);
    },

    async handlePasswordSubmit(event) {
        event.preventDefault();
        const username = document.getElementById('modal-username').value;
        const password = document.getElementById('modal-password').value;
        const btn = event.target.querySelector('button');
        const errorMsg = document.getElementById('modal-error');

        if (!password) {
            errorMsg.textContent = "Ingrese la contraseña";
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = "Verificando...";
        errorMsg.textContent = "";

        const result = await this.login(username, password);

        if (!result.success) {
            btn.disabled = false;
            btn.textContent = originalText;
            errorMsg.textContent = result.message || "Credenciales incorrectas";

            // If connection error, re-trigger status check
            if (result.message.includes("conexión")) {
                this.checkConnection();
            }
        }
        // If success, login() handles closing UI
    },

    closePasswordModal() {
        const modal = document.getElementById('password-modal');
        if (modal) modal.style.display = 'none';
    }
};

window.AuthManager = AuthManager;
// Global helpers for inline onclicks (safety net)
window.openPasswordModal = AuthManager.openPasswordModal.bind(AuthManager);
window.closePasswordModal = AuthManager.closePasswordModal.bind(AuthManager);
