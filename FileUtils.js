/**
 * FileUtils.js
 * Utilidades para manejo de archivos adjuntos en mantenimientos
 */

const FileUtils = {
    // Tipos de archivo permitidos
    ALLOWED_TYPES: {
        'application/pdf': { icon: 'file-text', label: 'PDF' },
        'image/jpeg': { icon: 'image', label: 'JPG' },
        'image/jpg': { icon: 'image', label: 'JPG' },
        'image/png': { icon: 'image', label: 'PNG' },
        'image/webp': { icon: 'image', label: 'WebP' },
        'application/vnd.ms-excel': { icon: 'file-spreadsheet', label: 'Excel' },
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'file-spreadsheet', label: 'Excel' }
    },

    MAX_FILE_SIZE_MB: 5,

    /**
     * Convierte un File a Base64
     * @param {File} file - Archivo a convertir
     * @returns {Promise<string>} - Data URL en Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    },

    /**
     * Valida si el tipo de archivo está permitido
     * @param {File} file - Archivo a validar
     * @returns {boolean}
     */
    isValidFileType(file) {
        return file.type in this.ALLOWED_TYPES;
    },

    /**
     * Valida el tamaño del archivo
     * @param {File} file - Archivo a validar
     * @param {number} maxSizeMB - Tamaño máximo en MB
     * @returns {boolean}
     */
    isValidFileSize(file, maxSizeMB = null) {
        const maxSize = (maxSizeMB || this.MAX_FILE_SIZE_MB) * 1024 * 1024;
        return file.size <= maxSize;
    },

    /**
     * Formatea el tamaño del archivo para display
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} - Tamaño formateado (ej: "2.5 MB")
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * Obtiene el icono de Lucide según el tipo de archivo
     * @param {string} mimeType - Tipo MIME del archivo
     * @returns {string} - Nombre del icono de Lucide
     */
    getFileIcon(mimeType) {
        return this.ALLOWED_TYPES[mimeType]?.icon || 'file';
    },

    /**
     * Obtiene la etiqueta del tipo de archivo
     * @param {string} mimeType - Tipo MIME del archivo
     * @returns {string} - Etiqueta del tipo
     */
    getFileLabel(mimeType) {
        return this.ALLOWED_TYPES[mimeType]?.label || 'Archivo';
    },

    /**
     * Descarga un archivo desde Base64
     * @param {string} dataUrl - Data URL en Base64
     * @param {string} filename - Nombre del archivo
     */
    downloadFile(dataUrl, filename) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    /**
     * Procesa múltiples archivos y los convierte a formato de adjunto
     * @param {FileList} files - Lista de archivos
     * @returns {Promise<Array>} - Array de objetos de adjunto
     */
    async processFiles(files) {
        const attachments = [];
        const errors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // Validar tipo
            if (!this.isValidFileType(file)) {
                errors.push({
                    file: file.name,
                    reason: `Tipo de archivo no permitido: ${file.type}`
                });
                continue;
            }

            // Validar tamaño
            if (!this.isValidFileSize(file)) {
                errors.push({
                    file: file.name,
                    reason: `Archivo muy grande (máx ${this.MAX_FILE_SIZE_MB}MB): ${this.formatFileSize(file.size)}`
                });
                continue;
            }

            try {
                const dataUrl = await this.fileToBase64(file);
                attachments.push({
                    id: `att_${Date.now()}_${i}`,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    dataUrl: dataUrl,
                    uploadedAt: new Date().toISOString()
                });
            } catch (error) {
                errors.push({
                    file: file.name,
                    reason: `Error al procesar: ${error.message}`
                });
            }
        }

        return { attachments, errors };
    },

    /**
     * Genera HTML para preview de archivos
     * @param {Array} attachments - Array de adjuntos
     * @param {boolean} allowDelete - Permitir eliminar archivos
     * @returns {string} - HTML
     */
    generateAttachmentsPreview(attachments, allowDelete = false) {
        if (!attachments || attachments.length === 0) {
            return '<p style="color: var(--text-muted); font-size: 0.9rem;">No hay archivos adjuntos</p>';
        }

        return attachments.map(att => `
            <div class="attachment-item" style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                border: 1px solid var(--glass-border);
                margin-bottom: 0.5rem;
            ">
                <i data-lucide="${this.getFileIcon(att.type)}" style="color: var(--primary); width: 20px; height: 20px;"></i>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 600; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${att.name}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">
                        ${this.getFileLabel(att.type)} • ${this.formatFileSize(att.size)}
                    </div>
                </div>
                <button class="btn-icon" onclick="FileUtils.downloadFile('${att.dataUrl}', '${att.name}')" title="Descargar">
                    <i data-lucide="download"></i>
                </button>
                ${allowDelete ? `
                    <button class="btn-icon" onclick="FileUtils.removeAttachment('${att.id}')" title="Eliminar" style="color: #ef4444;">
                        <i data-lucide="trash-2"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');
    },

    /**
     * Genera HTML para input de archivos
     * @param {string} inputId - ID del input
     * @returns {string} - HTML
     */
    generateFileInput(inputId = 'file-input') {
        return `
            <div class="file-input-container" style="margin-top: 1rem;">
                <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-muted); font-size: 0.85rem;">
                    📎 ARCHIVOS ADJUNTOS
                </label>
                <input 
                    type="file" 
                    id="${inputId}" 
                    multiple 
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
                    style="
                        width: 100%;
                        padding: 0.75rem;
                        background: rgba(255,255,255,0.05);
                        border: 2px dashed var(--glass-border);
                        border-radius: 8px;
                        color: var(--text);
                        cursor: pointer;
                        transition: all 0.3s ease;
                    "
                    onchange="FileUtils.handleFileInputChange(this)"
                />
                <div id="${inputId}-preview" style="margin-top: 1rem;"></div>
                <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">
                    Formatos: PDF, JPG, PNG, WebP, Excel • Máx ${this.MAX_FILE_SIZE_MB}MB por archivo
                </p>
            </div>
        `;
    },

    /**
     * Maneja el cambio en el input de archivos
     * @param {HTMLInputElement} input - Input element
     */
    async handleFileInputChange(input) {
        const previewDiv = document.getElementById(`${input.id}-preview`);
        if (!previewDiv) return;

        if (input.files.length === 0) {
            previewDiv.innerHTML = '';
            return;
        }

        previewDiv.innerHTML = '<p style="color: var(--text-muted);">Procesando archivos...</p>';

        const result = await this.processFiles(input.files);

        // Mostrar errores si hay
        if (result.errors.length > 0) {
            const errorHtml = result.errors.map(err => `
                <div style="background: rgba(239, 68, 68, 0.1); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; font-size: 0.85rem;">
                    <strong>${err.file}:</strong> ${err.reason}
                </div>
            `).join('');
            previewDiv.innerHTML = errorHtml;
        }

        // Mostrar preview de archivos válidos
        if (result.attachments.length > 0) {
            previewDiv.innerHTML += this.generateAttachmentsPreview(result.attachments, true);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        // Guardar attachments en el input para acceso posterior
        input.dataset.attachments = JSON.stringify(result.attachments);
    },

    /**
     * Obtiene los adjuntos procesados de un input
     * @param {string} inputId - ID del input
     * @returns {Array} - Array de adjuntos
     */
    getAttachmentsFromInput(inputId) {
        const input = document.getElementById(inputId);
        if (!input || !input.dataset.attachments) return [];
        try {
            return JSON.parse(input.dataset.attachments);
        } catch (e) {
            return [];
        }
    }
};
