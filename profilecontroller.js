/**
 * ProfileController.js
 * Handles the "Mi Perfil" view, password changes, and personal audit logs.
 */
const ProfileController = {
    init() {
        console.log("ProfileController Initialized");
        this.render();
    },

    render() {
        const user = AuthManager.getUser();
        if (!user) return;

        const view = document.getElementById('view-perfil');
        if (!view) return;

        // Selection of curated 3D icons (emojis that look 3D in modern systems)
        const galleryIcons = ['👨‍🚀', '👩‍🚀', '👨‍🔧', '👩‍🔧', '👨‍💻', '👩‍💻', '🦸‍♂️', '🦸‍♀️', '🥷', '🤖', '🦊', '🦁'];

        view.innerHTML = `
    <div style="margin-bottom: 2.5rem; animation: fadeIn 0.5s ease;">
        <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--text-main); display: flex; align-items: center;">
            <i data-lucide="user-circle" style="vertical-align: middle; margin-right: 12px; width: 42px; height: 42px; color: #0ea5e9;"></i>Mi Perfil
        </h1>
        <p style="color: var(--text-muted); font-size: 1.1rem; letter-spacing: 0.5px;">Gestión de cuenta y personalización</p>
    </div>
    
    <div style="display: grid; grid-template-columns: 350px 1fr; gap: 2rem; align-items: start;">
        <!-- Left Sidebar: Profile & Security -->
        <div style="display: flex; flex-direction: column; gap: 2rem;">
            <!-- User Card -->
            <div class="glass-panel" style="padding: 2.5rem 2rem; text-align: center; border-radius: 2rem; position: relative; overflow: hidden; border: 1px solid var(--glass-border); background: var(--card-bg);">
                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 80px; background: linear-gradient(to bottom, rgba(14, 165, 233, 0.15), transparent);"></div>
                
                <div id="profile-card-avatar" style="width: 120px; height: 120px; background: var(--bg-dark); border-radius: 50%; margin: 0 auto 1.5rem; display: flex; align-items: center; justify-content: center; border: 4px solid #0ea5e9; box-shadow: 0 8px 16px rgba(14, 165, 233, 0.2); position: relative; z-index: 1; overflow: hidden;">
                    ${AuthManager.getAvatarHtml(user, '120px')}
                </div>
                
                <div style="position: relative; z-index: 1;">
                    <h2 id="profile-card-name" style="margin: 0; font-size: 1.8rem; letter-spacing: -1px; font-weight: 700; color: var(--text-main);">${(user.full_name || user.username).toUpperCase()}</h2>
                    <div id="profile-card-title" style="display: inline-block; margin-top: 10px; padding: 4px 16px; background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.2); border-radius: 20px; color: #0ea5e9; font-size: 0.8rem; font-weight: 700; text-transform: uppercase;">
                        <i data-lucide="shield-check" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>${user.job_title || user.role}
                    </div>
                </div>
            </div>

            <!-- profile Info -->
            <div class="glass-panel" style="padding: 2rem; border-radius: 2rem; border: 1px solid var(--glass-border); background: var(--card-bg);">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                    <i data-lucide="user-edit" style="color: #10b981;"></i> Mi Información
                </h3>
                <div style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; display: block; font-weight: 600;">Nombre Completo</label>
                        <input type="text" id="profile-full-name" value="${user.full_name || ''}" placeholder="Ej: Maria del Mar" style="width: 100%; padding: 12px 16px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); transition: all 0.3s;">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; display: block; font-weight: 600;">Cargo / Puesto</label>
                        <input type="text" id="profile-job-title" value="${user.job_title || ''}" placeholder="Ej: Administradora" style="width: 100%; padding: 12px 16px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); transition: all 0.3s;">
                    </div>
                    <button onclick="ProfileController.updateProfileData()" class="btn btn-primary" style="margin-top: 0.5rem; padding: 12px; border-radius: 12px; font-weight: 700; width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; background: #10b981; border: none; color: white;">
                        Guardar Cambios
                    </button>
                    <div id="profile-data-msg" style="font-size: 0.8rem; text-align: center; min-height: 1.2rem;"></div>
                </div>
            </div>

            <!-- Avatar Selection -->
            <div class="glass-panel" style="padding: 2rem; border-radius: 2rem; border: 1px solid var(--glass-border); background: var(--card-bg);">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                    <i data-lucide="image" style="color: #0ea5e9;"></i> Personalizar Imagen
                </h3>
                
                <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                    <!-- Photo Upload -->
                    <div style="text-align: center;">
                        <button onclick="document.getElementById('avatar-upload').click()" class="btn" style="width: 100%; padding: 10px; background: rgba(14, 165, 233, 0.1); border: 1px dashed #0ea5e9; color: #0ea5e9; border-radius: 12px; font-weight: 600; cursor: pointer; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i data-lucide="upload-cloud" style="width: 18px;"></i> Subir Foto Personalizada
                        </button>
                        <input type="file" id="avatar-upload" hidden accept="image/*" onchange="ProfileController.handleAvatarUpload(event)">
                        <p style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">Formato JPG/PNG, máx 1MB (se optimizará)</p>
                    </div>

                    <div style="height: 1px; background: var(--glass-border); width: 100%;"></div>

                    <!-- Icon Gallery -->
                    <div>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px; font-weight: 600;">O selecciona un estilo 3D:</p>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
                            ${galleryIcons.map(icon => `
                                <div onclick="ProfileController.updateAvatar('GALLERY', '${icon}')" 
                                     style="font-size: 1.8rem; cursor: pointer; padding: 10px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; transition: 0.3s; text-align: center;"
                                     class="avatar-option">
                                    ${icon}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Password Form -->
            <div class="glass-panel" style="padding: 2rem; border-radius: 2rem; border: 1px solid var(--glass-border); background: var(--card-bg);">
                <h3 style="margin-top: 0; margin-bottom: 1.5rem; font-size: 1.2rem; display: flex; align-items: center; gap: 10px; color: var(--text-main);">
                    <i data-lucide="key-round" style="color: #f59e0b;"></i> Seguridad
                </h3>
                <form id="form-change-password" onsubmit="ProfileController.handleChangePassword(event)" style="display: flex; flex-direction: column; gap: 1.2rem;">
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; display: block; font-weight: 600;">Contraseña Actual</label>
                        <input type="password" id="profile-old-pass" placeholder="••••••••" required style="width: 100%; padding: 12px 16px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); transition: all 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; display: block; font-weight: 600;">Nueva Contraseña</label>
                        <input type="password" id="profile-new-pass" placeholder="Mín. 4 caracteres" required style="width: 100%; padding: 12px 16px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); transition: all 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                    </div>
                    <div class="form-group">
                        <label style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 6px; display: block; font-weight: 600;">Confirmar Nueva</label>
                        <input type="password" id="profile-confirm-pass" placeholder="Repita la contraseña" required style="width: 100%; padding: 12px 16px; background: var(--bg-dark); border: 1px solid var(--glass-border); border-radius: 12px; color: var(--text-main); transition: all 0.3s; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
                    </div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 1rem; padding: 14px; border-radius: 12px; font-weight: 700; width: 100%; display: flex; justify-content: center; align-items: center; gap: 10px; background: #0ea5e9; border: none; color: white; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);">
                        Actualizar Credenciales
                    </button>
                    <div id="profile-msg" style="font-size: 0.85rem; text-align: center; min-height: 1.2rem; font-weight: 500;"></div>
                </form>
            </div>
        </div>
        
        <!-- Right Side: Activity List -->
        <div class="glass-panel" style="padding: 2.5rem; border-radius: 2rem; min-height: 600px; display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--glass-border);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h3 style="margin: 0; font-size: 1.4rem; display: flex; align-items: center; gap: 12px; color: var(--text-main);">
                    <i data-lucide="list-checks" style="color: #10b981;"></i> 
                    ${user.role === 'ADMIN' ? 'Auditoría del Sistema' : 'Historial de Actividad'}
                </h3>
                ${user.role === 'ADMIN' ? `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600;">Filtrar por:</span>
                        <select id="profile-user-filter" onchange="ProfileController.loadPersonalLogs()"
                            style="background: var(--bg-dark); border: 1px solid var(--glass-border); color: var(--text-main); padding: 8px 16px; border-radius: 10px; outline: none; font-weight: 500;">
                            <option value="ALL">Todo el personal</option>
                            <option value="maria">Maria del Mar</option>
                            <option value="ana">Ana Maria</option>
                            <option value="johan">Johan Stevel</option>
                        </select>
                    </div>
                ` : ''}
            </div>
            <div style="flex: 1; overflow-y: auto; background: var(--bg-dark); border-radius: 1.5rem; border: 1px solid var(--glass-border);">
                <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                    <thead style="position: sticky; top: 0; background: var(--bg-dark); z-index: 5;">
                        <tr style="text-align: left;">
                            <th style="padding: 18px 24px; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); text-transform: uppercase; letter-spacing: 1px;">FECHA Y HORA</th>
                            <th style="padding: 18px 24px; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); text-transform: uppercase; letter-spacing: 1px;">USUARIO</th>
                            <th style="padding: 18px 24px; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); text-transform: uppercase; letter-spacing: 1px;">TIPO/MÓDULO</th>
                            <th style="padding: 18px 24px; color: var(--text-muted); font-size: 0.8rem; font-weight: 700; border-bottom: 1px solid var(--glass-border); text-transform: uppercase; letter-spacing: 1px;">DETALLES ACCIÓN</th>
                        </tr>
                    </thead>
                    <tbody id="profile-audit-body">
                        <!-- Loaded via JS -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;

        lucide.createIcons();
        this.loadPersonalLogs();
    },

    async updateProfileData() {
        const full_name = document.getElementById('profile-full-name').value.trim();
        const job_title = document.getElementById('profile-job-title').value.trim();
        const msgEl = document.getElementById('profile-data-msg');
        const user = AuthManager.getUser();

        if (!full_name || !job_title) {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = 'Por favor complete todos los campos';
            return;
        }

        try {
            const response = await fetch(`${AuthManager.API_URL}/update-profile`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    full_name,
                    job_title
                })
            });

            const data = await response.json();
            if (data.success) {
                // Update Local Session
                user.full_name = full_name;
                user.job_title = job_title;
                localStorage.setItem('hidrofix_user', JSON.stringify(user));

                // Update UI Elements
                const cardName = document.getElementById('profile-card-name');
                const cardTitle = document.getElementById('profile-card-title');
                if (cardName) cardName.textContent = full_name.toUpperCase();
                if (cardTitle) cardTitle.innerHTML = `<i data-lucide="shield-check" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;"></i>${job_title}`;

                // Update Sidebar via AuthManager helper
                AuthManager.refreshSidebarProfile();

                msgEl.style.color = '#10b981';
                msgEl.textContent = '¡Perfil actualizado correctamente!';

                if (window.lucide) lucide.createIcons();
            } else {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = data.message || 'Error al actualizar perfil';
            }
        } catch (e) {
            console.error("Error updating profile:", e);
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = 'Error de conexión';
        }
    },

    async updateAvatar(type, data) {
        const user = AuthManager.getUser();
        if (!user) return;

        try {
            const response = await fetch(`${DataManager.API_URL}/auth/update-avatar`, {
                method: 'POST',
                headers: DataManager.getAuthHeaders(),
                body: JSON.stringify({
                    username: user.username,
                    avatar_type: type,
                    avatar_data: data
                })
            });

            const result = await response.json();
            if (result.success) {
                // Update local session
                user.avatar_type = type;
                user.avatar_data = data;
                localStorage.setItem('hidrofix_user', JSON.stringify(user));

                // Update UI in real-time
                const avatarEl = document.getElementById('profile-card-avatar');
                if (avatarEl) {
                    avatarEl.innerHTML = AuthManager.getAvatarHtml(user, '120px');
                }

                if (type === 'GALLERY') {
                    DataManager.logAction('PERFIL', 'UPDATE_AVATAR', `Usuario seleccionó el avatar ${data}`);
                } else {
                    DataManager.logAction('PERFIL', 'UPDATE_AVATAR', `Usuario subió una foto personalizada`);
                }
            } else {
                alert("Error al actualizar avatar: " + result.message);
            }
        } catch (e) {
            console.error("Error updating avatar:", e);
        }
    },

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("La imagen es demasiado grande. Máximo 2MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize and compress using Canvas
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 256;
                const MAX_HEIGHT = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // Compress as JPEG
                this.updateAvatar('UPLOAD', dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    async loadPersonalLogs() {
        const user = AuthManager.getUser();
        if (!user) return;

        let allLogs = [];
        const tbody = document.getElementById('profile-audit-body');
        if (!tbody) return;

        // Show loading state
        tbody.innerHTML = `<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted); font-weight: 600;">Cargando registros...</td></tr>`;

        if (user.role === 'ADMIN') {
            // Admin fetches from SERVER to see everyone's actions
            const serverLogs = await DataManager.getAuditLogsFromServer();
            allLogs = serverLogs || DataManager.getAuditLogs(); // Fallback to local if server fails
        } else {
            // Regular users only see their local actions for now (privacy/simplicity)
            allLogs = DataManager.getAuditLogs();
        }

        let filteredLogs = allLogs;

        if (user.role === 'ADMIN') {
            const filter = document.getElementById('profile-user-filter')?.value || 'ALL';
            if (filter !== 'ALL') {
                filteredLogs = allLogs.filter(log => log.usuario === filter);
            }
        } else {
            // Filter by username for non-admins
            filteredLogs = allLogs.filter(log => log.usuario === user.username);
        }

        filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const limitedLogs = filteredLogs.slice(0, 50);

        if (limitedLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="padding: 40px; text-align: center; color: var(--text-muted); font-weight: 600;">No se encontraron registros de actividad.</td></tr>`;
            return;
        }

        tbody.innerHTML = limitedLogs.map(log => `
            <tr style="transition: background 0.2s; border-bottom: 1px solid var(--glass-border);">
                <td style="padding: 18px 24px; font-size: 0.85rem; white-space: nowrap; color: var(--text-muted);">
                    ${new Date(log.timestamp).toLocaleDateString()} 
                    <span style="opacity: 0.7; font-size: 0.75rem; display: block; font-weight: 500;">${new Date(log.timestamp).toLocaleTimeString()}</span>
                </td>
                <td style="padding: 18px 24px; font-weight: 700; color: var(--text-main);">
                    ${log.usuario || 'Sistema'}
                </td>
                <td style="padding: 18px 24px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="padding: 4px 12px; border-radius: 8px; background: rgba(14, 165, 233, 0.1); color: #0ea5e9; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(14, 165, 233, 0.2);">
                            ${log.modulo}
                        </span>
                        <span style="padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 700; border: 1px solid currentColor;" class="${this.getActionColor(log.accion)}-outline">
                            ${log.accion}
                        </span>
                    </div>
                </td>
                <td style="padding: 18px 24px; font-size: 0.85rem; color: var(--text-main); line-height: 1.5; font-weight: 500;">
                    ${log.detalle}
                </td>
            </tr>
        `).join('');
    },

    getActionColor(action) {
        switch (action) {
            case 'CREAR': return 'badge-success';
            case 'ELIMINAR': return 'badge-danger';
            case 'EDITAR': return 'badge-warning';
            default: return 'badge-secondary';
        }
    },

    async handleChangePassword(event) {
        event.preventDefault();
        const oldPass = document.getElementById('profile-old-pass').value;
        const newPass = document.getElementById('profile-new-pass').value;
        const confirmPass = document.getElementById('profile-confirm-pass').value;
        const msgEl = document.getElementById('profile-msg');
        const btn = event.target.querySelector('button');

        if (newPass !== confirmPass) {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = 'Las contraseñas nuevas no coinciden';
            return;
        }

        if (newPass.length < 4) {
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = 'La contraseña debe tener al menos 4 caracteres';
            return;
        }

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Procesando...';
        msgEl.textContent = '';

        try {
            const user = AuthManager.getUser();
            const response = await fetch(`${AuthManager.API_URL}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.username,
                    oldPassword: oldPass,
                    newPassword: newPass
                })
            });

            const data = await response.json();

            if (data.success) {
                msgEl.style.color = '#10b981';
                msgEl.textContent = '¡Contraseña actualizada con éxito!';
                event.target.reset();

                // Optional: Log this action locally too
                if (DataManager.logAction) {
                    DataManager.logAction('PERFIL', 'EDITAR', 'Cambio de contraseña realizado');
                }
            } else {
                msgEl.style.color = 'var(--danger)';
                msgEl.textContent = data.message || 'Error al cambiar contraseña';
            }
        } catch (error) {
            console.error("Error changing password:", error);
            msgEl.style.color = 'var(--danger)';
            msgEl.textContent = 'Error de conexión con el servidor';
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }
};

window.ProfileController = ProfileController;
