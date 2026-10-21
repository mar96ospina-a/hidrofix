const DerivacionesController = {
    records: [],

    init() {
        console.log("DerivacionesController initialized");
        this.loadFromStorage();
        this.render();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    loadFromStorage() {
        const stored = localStorage.getItem('hidrofix_derivaciones');
        if (stored) {
            try {
                this.records = JSON.parse(stored);
            } catch (e) {
                console.error("Error loading derivaciones:", e);
                this.records = [];
            }
        }
    },

    saveToStorage() {
        localStorage.setItem('hidrofix_derivaciones', JSON.stringify(this.records));
    },

    render() {
        const container = document.getElementById('view-derivaciones');
        if (!container) return;

        container.innerHTML = `
            <header class="header-section">
                <div class="header-content">
                    <div>
                        <h2 class="view-title">Información Derivaciones</h2>
                        <p class="view-subtitle">Registro técnico de derivaciones y transformadores</p>
                    </div>
                </div>
            </header>

            <div class="content-wrapper" style="padding: 2rem; max-width: 1000px; margin: 0 auto;">
                
                <!-- Form Section -->
                <div class="glass-panel" style="padding: 2rem; margin-bottom: 3rem;">
                    <form onsubmit="event.preventDefault(); DerivacionesController.save();">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                            
                            <!-- Col 1 -->
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Fecha</label>
                                <input type="date" id="dev-fecha" class="input-dark" style="width: 100%;" required>
                            </div>

                            <!-- Col 2 -->
                            <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Derivación</label>
                                <input type="text" id="dev-nombre" class="input-dark" style="width: 100%;" placeholder="Nombre o ID de derivación" required>
                            </div>

                        </div>

                         <!-- GPS -->
                        <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                             <div class="form-group">
                                <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Ubicación / Coordenadas</label>
                                <div style="display: flex; gap: 0.5rem;">
                                    <input type="text" id="dev-coords" class="input-dark" style="width: 100%;" placeholder="Coordenadas o ubicación manual...">
                                    <button type="button" class="btn" style="background: var(--secondary); color: white; padding: 0 1rem;" onclick="DerivacionesController.getGPS()">
                                        <i data-lucide="map-pin"></i>
                                    </button>
                                </div>
                                <a id="dev-link-map" href="#" target="_blank" style="display: none; font-size: 0.8rem; color: var(--secondary); margin-top: 0.5rem;">Ver en Mapa</a>
                            </div>
                        </div>

                        <!-- Contractor Section Removed (Now in Labores Diarias) -->

                        <!-- Dynamic Lists Section -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                            
                            <!-- Transformadores -->
                            <div>
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                    <label style="color: var(--text-muted);">Capacidad Transformador(es)</label>
                                    <button type="button" class="btn-icon-small" onclick="DerivacionesController.addField('list-transformadores', 'Transformador (KVA)')" style="background: var(--primary); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer;">
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
                                    <button type="button" class="btn-icon-small" onclick="DerivacionesController.addField('list-fusibles', 'Fusible (A)')" style="background: var(--secondary); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: none; cursor: pointer;">
                                        <i data-lucide="plus" style="width: 16px;"></i>
                                    </button>
                                </div>
                                <div id="list-fusibles" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                    <input type="text" class="input-dark dynamic-field" placeholder="Fusible (A)">
                                </div>
                            </div>

                        </div>

                        <div class="form-group" style="margin-bottom: 2rem;">
                            <label style="display: block; color: var(--text-muted); margin-bottom: 0.5rem;">Observaciones Extra</label>
                            <textarea id="dev-trabajos" class="input-dark" style="width: 100%; height: 100px;" placeholder="Detalles técnicos adicionales..."></textarea>
                        </div>

                        <button type="submit" class="btn-primary" style="width: 100%; padding: 1rem; font-size: 1rem; display: flex; justify-content: center; gap: 0.5rem; border-radius: 1rem; background: var(--primary); border: none; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3); transition: transform 0.2s;">
                            <i data-lucide="save"></i> Guardar Información Técnica
                        </button>

                    </form>
                </div>

                <!-- History Section -->
                 <div class="glass-panel" style="padding: 0; overflow: hidden;">
                    <div style="padding: 1.5rem; border-bottom: 1px solid var(--glass-border); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: var(--accent-light); text-transform: uppercase; letter-spacing: 1px;">Historial de Derivaciones</h3>
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn" onclick="DerivacionesController.exportToExcel()" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">
                                <i data-lucide="file-spreadsheet" style="width: 1.1rem; margin-right: 0.5rem;"></i> EXCEL
                            </button>
                            <button class="btn" onclick="DerivacionesController.exportToPDF()" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2);">
                                <i data-lucide="file-text" style="width: 1.1rem; margin-right: 0.5rem;"></i> PDF
                            </button>
                            <button class="btn" onclick="DerivacionesController.exportToCSVForQGIS()" style="background: rgba(99, 102, 241, 0.1); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.2);">
                                <i data-lucide="map-pin" style="width: 1.1rem; margin-right: 0.5rem;"></i> QGIS (CSV)
                            </button>
                        </div>
                    </div>
                    
                    <div style="overflow-x: auto;">
                        <table class="modern-table" style="margin: 0;">
                            <thead>
                                <tr>
                                    <th>FECHA</th>
                                    <th>DERIVACIÓN</th>
                                    <th>UBICACIÓN</th>
                                    <th style="width: 50px;"></th>
                                </tr>
                            </thead>
                            <tbody id="derivaciones-history-body">
                                ${this.renderTableRows()}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    },

    renderTableRows() {
        if (this.records.length === 0) {
            return `<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">No hay registros guardados.</td></tr>`;
        }

        return this.records.sort((a, b) => b.id - a.id).map(r => `
            <tr>
                <td>${r.fecha}</td>
                <td style="font-weight: 500; color: white;">${r.derivacion}</td>
                <td style="font-size: 0.85rem; color: var(--text-muted);">
                    ${r.ubicacion ? `<a href="https://www.google.com/maps?q=${r.ubicacion}" target="_blank" style="color: var(--secondary); text-decoration: none;">${r.ubicacion}</a>` : 'N/A'}
                </td>
                <td style="text-align: center;">
                    <button class="btn-icon" onclick="DerivacionesController.deleteRecord(${r.id})" style="color: #ef4444; opacity: 0.7;">
                        <i data-lucide="trash-2" style="width: 16px;"></i>
                    </button>
                </td>
            </tr>
        `).join('');
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

    getGPS() {
        const input = document.getElementById('dev-coords');
        const link = document.getElementById('dev-link-map');

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

    save() {
        const fecha = document.getElementById('dev-fecha').value;
        const derivacion = document.getElementById('dev-nombre').value;
        const coords = document.getElementById('dev-coords').value;
        const trabajos = document.getElementById('dev-trabajos').value;

        // Harvest Dynamic Lists
        const transformadores = Array.from(document.querySelectorAll('#list-transformadores input')).map(i => i.value).filter(v => v);
        const fusibles = Array.from(document.querySelectorAll('#list-fusibles input')).map(i => i.value).filter(v => v);

        if (!fecha || !derivacion) {
            alert("Por favor complete los campos obligatorios (Fecha, Derivación).");
            return;
        }

        const report = {
            id: Date.now(),
            fecha,
            derivacion,
            transformadores,
            fusibles,
            ubicacion: coords,
            trabajos
        };

        this.records.push(report);
        this.saveToStorage();

        // Notify Map
        window.dispatchEvent(new CustomEvent('derivacion-saved'));

        console.log("Saving Technical Derivacion:", report);
        alert("Información técnica guardada correctamente.");

        // Re-render
        this.render();
    },

    deleteRecord(id) {
        if (!confirm(" �Está seguro de eliminar este registro?")) return;

        this.records = this.records.filter(r => r.id !== id);
        this.saveToStorage();
        this.render();
    },

    exportToExcel() {
        if (this.records.length === 0) {
            alert("No hay datos para exportar.");
            return;
        }

        const data = this.records.map(r => ({
            'FECHA': r.fecha,
            'DERIVACIÓN': r.derivacion,
            'UBICACIÓN': r.ubicacion,
            'TRANSFORMADORES': (r.transformadores || []).join(', '),
            'FUSIBLES': (r.fusibles || []).join(', '),
            'OBSERVACIONES': r.trabajos || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Información Derivaciones");
        XLSX.writeFile(wb, `informacion_derivaciones_${new Date().toISOString().split('T')[0]}.xlsx`);
    },

    async exportToPDF() {
        if (this.records.length === 0) {
            alert("No hay datos para exportar.");
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
            doc.text("INFORMACIÓN TÉCNICA DE DERIVACIONES", 148, 22, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100);
            doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, 148, 30, { align: "center" });
        } catch (e) {
            console.error("Error loading logos for PDF:", e);
            // Fallback
            doc.setFontSize(18);
            doc.text("INFORMACIÓN TÉCNICA DE DERIVACIONES", 14, 22);
        }

        // Prepare Table Data
        const body = this.records.map(r => [
            r.fecha,
            r.derivacion,
            r.ubicacion,
            (r.transformadores || []).join(', '),
            (r.fusibles || []).join(', ')
        ]);

        doc.autoTable({
            startY: 40,
            head: [['FECHA', 'DERIVACIÓN', 'UBICACIÓN (GPS)', 'TRANSFORMADORES', 'FUSIBLES']],
            body: body,
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 40 },
                2: { cellWidth: 40 },
                3: { cellWidth: 80 },
                4: { cellWidth: 80 }
            }
        });

        doc.save(`informacion_derivaciones_${new Date().toISOString().split('T')[0]}.pdf`);
    },

    exportToCSVForQGIS() {
        if (this.records.length === 0) {
            alert("No hay registros para exportar.");
            return;
        }

        // CSV Headers: Specifically separated lat/lng for easy QGIS import
        let csvContent = "FECHA,DERIVACION,LATITUD,LONGITUD,TRANSFORMADORES,FUSIBLES,TRABAJOS\n";

        this.records.forEach(r => {
            // Parse coordinates from "Lat, Lng" string
            const coords = r.ubicacion.match(/-?\d+\.\d+/g);
            const lat = coords ? coords[0] : "";
            const lng = coords ? coords[1] : "";

            const row = [
                `"${r.fecha}"`,
                `"${r.derivacion}"`,
                lat,
                lng,
                `"${(r.transformadores || []).join('; ')}"`,
                `"${(r.fusibles || []).join('; ')}"`,
                `"${(r.trabajos || '').replace(/"/g, '""')}"`
            ];
            csvContent += row.join(",") + "\n";
        });

        // Download Browser Logic
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `derivaciones_qgis_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Make globally available
window.DerivacionesController = DerivacionesController;
