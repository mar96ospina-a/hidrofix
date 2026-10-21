// MaterialesController.js - Gestiona la creaci贸n de nuevos materiales

// MaterialesController.js - Gestiona el Maestro de Materiales

const MaterialesController = {
    init() {
        this.renderTable();
    },

    openModal(codigo = null) {
        document.getElementById('modal-material').style.display = 'flex';
        const title = document.querySelector('#modal-material h3');

        // Reset or Fill
        if (codigo) {
            title.innerText = 'Editar Material';
            const mat = DataManager.getMaterialData(codigo);
            if (mat) {
                document.getElementById('new-mat-codigo').value = mat.codigo;
                document.getElementById('new-mat-codigo').readOnly = true; // No permitir cambiar ID facilmente
                document.getElementById('new-mat-codigo').style.opacity = '0.6';

                document.getElementById('new-mat-desc').value = mat.descripcion;
                document.getElementById('new-mat-unidad').value = mat.unidad || 'UN';
                document.getElementById('new-mat-precio').value = mat.precio;
            }
        } else {
            title.innerText = 'Crear Nuevo Material';
            document.getElementById('new-mat-codigo').value = '';
            document.getElementById('new-mat-codigo').readOnly = false;
            document.getElementById('new-mat-codigo').style.opacity = '1';

            document.getElementById('new-mat-desc').value = '';
            document.getElementById('new-mat-unidad').value = 'UN';
            document.getElementById('new-mat-precio').value = '0';
        }
    },

    closeModal() {
        document.getElementById('modal-material').style.display = 'none';
        this.renderTable(); // Refresh on close just in case
    },

    save() {
        const codigo = document.getElementById('new-mat-codigo').value.trim();
        const descripcion = document.getElementById('new-mat-desc').value.trim().toUpperCase();
        const unidad = document.getElementById('new-mat-unidad').value.trim().toUpperCase();
        const precio = parseFloat(document.getElementById('new-mat-precio').value) || 0;

        if (!codigo || !descripcion) {
            alert('Por favor ingrese c贸digo y descripci贸n.');
            return;
        }

        const newMat = { codigo, descripcion, unidad, precio };

        if (DataManager.saveMaterial(newMat)) {
            alert('Material guardado exitosamente.');
            window.dispatchEvent(new CustomEvent('materials-updated'));
            this.closeModal();
        }
    },

    deleteMaterial(codigo) {
        if (confirm(` 縀st谩 seguro de eliminar el material ${codigo}? Esta acci贸n no se puede deshacer.`)) {
            if (DataManager.deleteMaterial(codigo)) {
                // alert('Material eliminado.'); // Less invasive
                this.renderTable();
            } else {
                alert('No se pudo eliminar el material.');
            }
        }
    },

    renderTable() {
        const tbody = document.getElementById('materiales-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';
        const search = document.getElementById('search-material').value.toLowerCase();
        let materiales = DataManager.getAllMaterials();

        // Filter
        if (search) {
            materiales = materiales.filter(m =>
                m.codigo.toLowerCase().includes(search) ||
                m.descripcion.toLowerCase().includes(search)
            );
        }

        // Limit for performance - REMOVED for visibility
        // const MAX_ITEMS = 100;

        // Sort alphabetically by Description
        materiales.sort((a, b) => a.descripcion.localeCompare(b.descripcion));

        let count = 0;

        materiales.forEach(mat => {
            count++;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight: 600;">${mat.codigo}</td>
                <td>${mat.descripcion}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.1);">${mat.unidad || ''}</span></td>
                <td style="color: var(--accent-color); font-weight: bold;">$ ${mat.precio.toLocaleString('es-CO')}</td>
                <td>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn-icon btn-edit-mat" data-codigo="${mat.codigo.replace(/"/g, '&quot;')}" title="Editar">
                            <i data-lucide="edit-2" size="16"></i>
                        </button>
                        <button class="btn-icon btn-delete-mat" data-codigo="${mat.codigo.replace(/"/g, '&quot;')}" title="Eliminar" style="color: #ef4444;">
                            <i data-lucide="trash-2" size="16"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });

        // Add event listeners using delegation
        tbody.addEventListener('click', (e) => {
            const btnEdit = e.target.closest('.btn-edit-mat');
            const btnDelete = e.target.closest('.btn-delete-mat');

            if (btnEdit) {
                const codigo = btnEdit.getAttribute('data-codigo');
                this.openModal(codigo);
            } else if (btnDelete) {
                const codigo = btnDelete.getAttribute('data-codigo');
                this.deleteMaterial(codigo);
            }
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};
