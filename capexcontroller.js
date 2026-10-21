const CapexController = {
    currentId: null,

    init() {
        console.log("CapexController Initiated");
        this.renderTable();
    },

    renderTable() {
        const tbody = document.getElementById('capex-table-body');
        if (!tbody) return;

        const projects = DataManager.getCapex();
        tbody.innerHTML = '';

        if (projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay inversiones registradas.</td></tr>`;
            return;
        }

        projects.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold;">${p.descripcion}</td>
                <td>${p.proveedor || '-'}</td>
                <td>${p.fecha}</td>
                <td>${p.categoria || 'Maquinaria'}</td>
                <td style="text-align: right; font-weight: bold; color: var(--accent-color);">$ ${p.valor.toLocaleString('en-US')}</td>
                <td style="text-align: right;">
                    <button class="btn-icon" onclick="CapexController.edit('${p.id}')"><i data-lucide="edit-3" size="16"></i></button>
                    <button class="btn-icon" onclick="CapexController.delete('${p.id}')" style="color: #ef4444;"><i data-lucide="trash-2" size="16"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.updateStats();
    },

    updateStats() {
        const projects = DataManager.getCapex();
        const total = projects.reduce((sum, p) => sum + (parseFloat(p.valor) || 0), 0);

        const totalEl = document.getElementById('capex-total-display');
        if (totalEl) totalEl.innerText = '$ ' + total.toLocaleString('en-US');
    },

    openModal(id = null) {
        const modal = document.getElementById('modal-capex');
        if (!modal) return;

        modal.style.display = 'flex';
        this.currentId = id;

        // Reset or Fill
        if (id) {
            const p = DataManager.getCapex().find(x => x.id === id);
            if (p) {
                document.getElementById('capex-desc').value = p.descripcion;
                document.getElementById('capex-prov').value = p.proveedor;
                document.getElementById('capex-fecha').value = p.fecha;
                document.getElementById('capex-valor').value = p.valor;
                document.getElementById('capex-cat').value = p.categoria;
            }
        } else {
            document.getElementById('form-capex').reset();
            document.getElementById('capex-fecha').value = new Date().toISOString().split('T')[0];
        }
    },

    closeModal() {
        const modal = document.getElementById('modal-capex');
        if (modal) modal.style.display = 'none';
    },

    save() {
        const descripcion = document.getElementById('capex-desc').value;
        const proveedor = document.getElementById('capex-prov').value;
        const fecha = document.getElementById('capex-fecha').value;
        const valor = parseFloat(document.getElementById('capex-valor').value) || 0;
        const categoria = document.getElementById('capex-cat').value;

        if (!descripcion || valor <= 0) {
            alert("Por favor ingrese una descripción y un valor válido.");
            return;
        }

        const project = {
            id: this.currentId || ('CAP-' + Date.now()),
            descripcion,
            proveedor,
            fecha,
            valor,
            categoria,
            fechaRegistro: new Date().toISOString()
        };

        if (DataManager.saveCapexProject(project)) {
            alert("Inversión guardada correctamente.");
            this.closeModal();
            this.renderTable();
        }
    },

    delete(id) {
        if (confirm(" �Seguro que desea eliminar esta inversión?")) {
            DataManager.deleteCapex(id);
            this.renderTable();
        }
    }
};
