/**
 * MapController.js
 * Manages the interactive operational map for Hidrofix.
 * Uses Leaflet.js to visualize derivation coordinates.
 */
const MapController = {
    map: null,
    markers: [],

    init() {
        console.log("Initializing MapController...");
        const mapContainer = document.getElementById('main-map');
        if (!mapContainer) return;

        // Prevent multiple initializations
        if (this.map) {
            this.map.invalidateSize();
            this.renderMarkers();
            return;
        }

        // Initialize Map (Default centered on a neutral region if no data)
        this.map = L.map('main-map').setView([4.570868, -74.297333], 6); // Default: Colombia

        // Add Tile Layer (OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Listen for updates
        window.addEventListener('derivacion-saved', () => {
            console.log("MapController: Refreshing markers...");
            this.renderMarkers();
        });

        this.renderMarkers();
    },

    renderMarkers() {
        if (!this.map) return;

        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Check for records in DerivacionesController
        const records = (window.DerivacionesController && window.DerivacionesController.records) || [];

        if (records.length === 0) {
            console.log("No derivation records found for the map.");
            return;
        }

        const validCoords = [];

        records.forEach(r => {
            if (!r.ubicacion) return;

            // Robust Identification of Coords (Supports various formats)
            const matches = r.ubicacion.match(/-?\d+\.\d+/g);
            if (!matches || matches.length < 2) {
                console.warn("Invalid coords for:", r.derivacion);
                return;
            }

            const lat = parseFloat(matches[0]);
            const lng = parseFloat(matches[1]);

            // Create Marker
            const marker = L.marker([lat, lng]).addTo(this.map);

            // Create Popup Content
            const transStr = (r.transformadores || []).length > 0 ? r.transformadores.join(', ') : 'N/A';
            const fusStr = (r.fusibles || []).length > 0 ? r.fusibles.join(', ') : 'N/A';

            const popupContent = `
                <div style="font-family: 'Inter', sans-serif; padding: 0.5rem; min-width: 200px;">
                    <h3 style="margin: 0 0 0.5rem 0; color: var(--primary); font-size: 1rem; text-transform: uppercase; border-bottom: 2px solid var(--primary); padding-bottom: 4px;">${r.derivacion}</h3>
                    <div style="font-size: 0.85rem; line-height: 1.4;">
                        <p><strong>FECHA:</strong> ${r.fecha}</p>
                        <p><strong>TRANSFORMADORES:</strong> ${transStr}</p>
                        <p><strong>FUSIBLES:</strong> ${fusStr}</p>
                        <p style="margin-top: 0.8rem; border-top: 1px solid #eee; padding-top: 8px;">
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" style="color: #6366f1; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                                Abrir en Google Maps &#8599;
                            </a>
                        </p>
                    </div>
                </div>
            `;

            marker.bindPopup(popupContent);
            this.markers.push(marker);
            validCoords.push([lat, lng]);
        });

        // Fit map to markers
        if (validCoords.length > 0) {
            const bounds = L.latLngBounds(validCoords);
            this.map.fitBounds(bounds, { padding: [50, 50] });
        }
    }
};

window.MapController = MapController;
