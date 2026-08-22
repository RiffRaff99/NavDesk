// ============================================================
// i18n — Central Language Dictionary for navdesk SBF SEE
// Default language: German ("de"), switch via i18n.setLang(lang)
// ============================================================

const i18n = {
    currentLang: 'de', // Change to 'en' for English, or any supported lang
    
    dict: {
        de: {
            lbl_panZoom: 'Pan/Zoom',
            lbl_import: 'Karte laden',
            lbl_navTriangle: 'Nav-Dreieck',
            lbl_alignTriangle: 'Anlegedreieck',
            lbl_compass: 'Zirkel',
            lbl_line: 'Linie',
            lbl_arrow: 'Pfeil',
            lbl_circle: 'Kreis',
            lbl_marker: 'Marker',
            lbl_label: 'Text',
            lbl_reset: 'Reset',
            
            status_ready: 'Karte bereit. Ziehen mit Linksklick, Zoomen mit Mausrad.',
            status_navActive: 'Nav-Dreieck aktiv. Rechtsklick+Ziehen dreht, Mausrad fein-dreht ±0,5°, Linksklick platziert.',
            status_alignActive: 'Anlegedreieck platziert! Maus bewegen zum Positionieren auf der Schiene.',
            status_compassSpan: 'Zirkel: Zweiten Klick setzen, um die Spannweite festzulegen.',
            status_compass_active: 'Zirkel aktiv.',
            status_line_active: 'Linienwerkzeug aktiv. Zwei Punkte setzen.',
            status_arrow_active: 'Pfeilwerkzeug aktiv. Zwei Punkte setzen.',
            status_circle_active: 'Kreiswerkzeug aktiv. Mittelpunkt und Radius setzen.',
            status_marker_active: 'Markerwerkzeug aktiv. Mittelpunkt und Radius setzen.',
            status_label_active: 'Beschriftungswerkzeug aktiv. Position anklicken.',
            status_parallelShift: 'Parallelverschiebung aktiv! Maus bewegt verschiebt das Nav-Dreieck entlang der Schiene. Rechtsklick verlässt.',
            status_zooming: 'Zoomen mit Mausrad.',
            status_rotating: 'Dreieck dreht mit Mausrad.',
            
            msg_noChart: 'Bitte zuerst eine Seekarte laden.',
            msg_firstNav: 'First ein Nav-Dreieck anlegen.',
            msg_textPrompt: 'Beschriftung eingeben:',
        },
        en: {
            lbl_panZoom: 'Pan/Zoom',
            lbl_import: 'Load Chart',
            lbl_navTriangle: 'Nav-Triangle',
            lbl_alignTriangle: 'Align-Triangle',
            lbl_compass: 'Compass',
            lbl_line: 'Line',
            lbl_arrow: 'Arrow',
            lbl_circle: 'Circle',
            lbl_marker: 'Marker',
            lbl_label: 'Text',
            lbl_reset: 'Reset',
            
            status_ready: 'Chart ready. Drag with left-click, zoom with mouse wheel.',
            status_navActive: 'Nav-Triangle active. Right-drag rotates coarse, scroll fine-rotates ±0.5°, left-click places.',
            status_alignActive: 'Align-Triangle placed! Move mouse to position along the rail.',
            status_compassSpan: 'Compass: Set the second click to define the span.',
            status_compass_active: 'Compass active.',
            status_line_active: 'Line tool active. Set two points.',
            status_arrow_active: 'Arrow tool active. Set two points.',
            status_circle_active: 'Circle tool active. Set center and radius.',
            status_marker_active: 'Marker tool active. Set center and radius.',
            status_label_active: 'Label tool active. Click a position.',
            status_parallelShift: 'Parallel shift active! Mouse movement slides Nav-Triangle along rail. Right-click exits.',
            status_zooming: 'Zooming with mouse wheel.',
            status_rotating: 'Triangle rotating with scroll.',
            
            msg_noChart: 'Please load a sea chart first.',
            msg_firstNav: 'Place a Nav-Triangle first.',
            msg_textPrompt: 'Enter label text:',
        }
    },

    // Get a localized string by key
    t(key) {
        return this.dict[this.currentLang]?.[key] || this.dict['de'][key] || key;
    },

    // Apply language to all UI elements
    apply() {
        const map = {
            'lbl-pan': 'lbl_panZoom',
            'lbl-import': 'lbl_import',
            'lbl-nav': 'lbl_navTriangle',
            'lbl-align': 'lbl_alignTriangle',
            'lbl-compass': 'lbl_compass',
            'lbl-line': 'lbl_line',
            'lbl-arrow': 'lbl_arrow',
            'lbl-circle': 'lbl_circle',
            'lbl-marker': 'lbl_marker',
            'lbl-label': 'lbl_label',
            'lbl-clear': 'lbl_reset',
        };
        
        for (const [id, key] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.textContent = this.t(key);
        }
    },

    // Switch language and apply immediately
    setLang(lang) {
        if (this.dict[lang]) {
            this.currentLang = lang;
            this.apply();
        }
    }
};
