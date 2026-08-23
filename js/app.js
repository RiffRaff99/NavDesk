// ============================================================
// navdesk - Application Bootstrap & Import Logic
// Minimal: state init + Konva stage setup + file import
// All mode routing lives in router.js
// ============================================================

const appState = {
    stage: null,       // Konva.Stage
    baseLayer: null,   // chart image layer
    toolLayer: null,   // triangles & tools
    
    mode: 'PAN_ZOOM',  // current work mode
    activeTool: null,  // currently focused triangle (Konva.Group)
    navTriangle: null, // placed Nav-Dreieck
    alignTriangle: null, // placed Anlegedreieck
    compass: null,     // Zirkel
    compassCursor: null,
    drawings: {
        lines: [],
        arrows: [],
        circles: [],
        markers: [],
        labels: [],
    },
    drawingStart: null,
    drawingPreview: null,

    parallelAnchorX: 0,
    parallelAnchorY: 0,

    chartImage: null,  // Konva.Image reference for cleanup
    chartFileName: '',
    notes: '',
};

// ---- Public API (wired after DOMContentLoaded) ----
const app = {
    importImage: () => {},
    exportOverlay: () => {},
    importOverlay: () => {},
    setMode: (modeName) => {},
    reset: () => {},
};



// ---- Local pointer conversion (screen -> chart space) ----
function getLocalPointer() {
    const transform = appState.stage.getTransform().copy().invert();
    return transform.point(appState.stage.getPointerPosition());
}

// ---- Tool-layer cleanup (called by reset & imports) ----
function resetToolsOnly() {
    if (appState.toolLayer) {
        appState.toolLayer.destroyChildren();
    }
    
    appState.activeTool = null;
    appState.navTriangle = null;
    appState.alignTriangle = null;
    appState.compass = null;
    appState.compassCursor = null;
    appState.drawings.lines = [];
    appState.drawings.arrows = [];
    appState.drawings.circles = [];
    appState.drawings.markers = [];
    appState.drawings.labels = [];
    appState.drawingStart = null;
    appState.drawingPreview = null;
    appState.mode = 'PAN_ZOOM';
}

// ---- Chart file loader (image or PDF) ----
function loadChartFile(file) {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        loadPdfAsImage(file);
    } else {
        const reader = new FileReader();
        reader.onload = function(e) {
            loadImageResult(e.target.result);
        };
        reader.readAsDataURL(file);
    }
}

function loadImageResult(src) {
    const img = new Image();
    img.src = src;
    img.onload = function() {
        if (appState.chartImage && appState.baseLayer) {
            appState.baseLayer.remove(appState.chartImage);
        }
        resetToolsOnly();

        appState.chartImage = new Konva.Image({ image: img, x: 0, y: 0 });
        appState.chartFileName = appState.pendingChartFileName || '';
        appState.pendingChartFileName = '';
        appState.notes = '';
        appState.baseLayer.add(appState.chartImage);

        // Wenn es ein PDF war, haben wir den exakten Wert bereits ermittelt
        if (appState.pendingPxPerCm) {
            appState.pxPerCm = appState.pendingPxPerCm;
            appState.pendingPxPerCm = null; // zurücksetzen
        } else {
            // Es ist ein reines Bild -> Fallback auf Monitor-Standard (96 DPI)
            appState.pxPerCm = 96 / 2.54;
        }

        appState.chartWidth = img.width;
        appState.chartHeight = img.height;
        
        // Center viewport on image center
        appState.stage.position({
            x: (window.innerWidth - img.width) / 2,
            y: (window.innerHeight - img.height) / 2
        });
        appState.stage.scale({ x: 1, y: 1 });

        appState.baseLayer.batchDraw();
        appState.stage.batchDraw();


    };
}

function loadPdfAsImage(file) {
    if (typeof window.pdfjsLib !== 'undefined') {
        const reader = new FileReader();

        // 1. Datei als ArrayBuffer einlesen
        reader.onload = function (e) {
            const arrayBuffer = e.target.result;

            // 2. PDF.js mit den Binärdaten (Uint8Array) füttern
            window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
                .then((pdf) => pdf.getPage(1))
                .then((page) => {
                    const targetWidth = window.innerWidth * 0.95;
                    const unscaledViewport = page.getViewport({ scale: 1 });
                    const scale = targetWidth / unscaledViewport.width;
                    const viewport = page.getViewport({ scale });
                    //Exakte physikalische Pixeldichte aus den PDF-Metadaten berechnen
                    const POINTS_PER_CM = 72 / 2.54;
                    appState.pendingPxPerCm = scale * POINTS_PER_CM; 

                    const pdfCanvas = document.createElement('canvas');
                    pdfCanvas.width = viewport.width;
                    pdfCanvas.height = viewport.height;
                    const ctx = pdfCanvas.getContext('2d');

                    return page.render({ canvasContext: ctx, viewport }).promise.then(() => pdfCanvas);
                })
                .then((canvas) => {
                    loadImageResult(canvas.toDataURL());
                })
                .catch((err) => {
                    console.error("PDF Rendering Fehler:", err);
                    alert(i18n.t('msg_noChart'));
                });
        };

        reader.onerror = function () {
            alert(i18n.t('msg_noChart'));
        };

        // Startet das Auslesen der Datei
        reader.readAsArrayBuffer(file);
        return;
    }
}

function updateStatus(statusKey) {
    const text = typeof i18n !== 'undefined' && i18n.t ? i18n.t(statusKey) : statusKey;

    const statusText = document.getElementById('status-text-2');
    if (statusText) statusText.textContent = text;

    const toolbarStatus = document.querySelector('.status-display span');
    if (toolbarStatus) toolbarStatus.textContent = text;

    const activeButtons = {
        PAN_ZOOM: 'btn-pan',
        NAV_ACTIVE: 'btn-nav',
        ALIGN_ACTIVE: 'btn-align',
        COMPASS_ACTIVE: 'btn-compass',
        LINE_ACTIVE: 'btn-line',
        ARROW_ACTIVE: 'btn-arrow',
        CIRCLE_ACTIVE: 'btn-circle',
        MARKER_ACTIVE: 'btn-marker',
        LABEL_ACTIVE: 'btn-label',
        ERASER_ACTIVE: 'btn-eraser',
    };
    if (appState.mode === 'PARALLEL' && appState.activeTool) {
        if (appState.activeTool === appState.navTriangle) activeButtons.PARALLEL = 'btn-nav';
        if (appState.activeTool === appState.alignTriangle) activeButtons.PARALLEL = 'btn-align';
        if (appState.activeTool === appState.compass) activeButtons.PARALLEL = 'btn-compass';
    }
    document.querySelectorAll('.tool-button').forEach((button) => {
        button.classList.toggle('tool-active', button.id === activeButtons[appState.mode]);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    appState.stage = new Konva.Stage({
        container: 'container',
        width: window.innerWidth,
        height: window.innerHeight,
    });

    appState.baseLayer = new Konva.Layer();
    appState.toolLayer = new Konva.Layer();
    appState.stage.add(appState.baseLayer, appState.toolLayer);

    if (typeof initEventListeners === 'function') {
        initEventListeners();
    }

    if (typeof i18n !== 'undefined' && i18n.apply) {
        i18n.apply();
    }

    const notesPanel = document.getElementById('notes-panel');
    const notesHeader = document.getElementById('notes-header');
    const notesText = document.getElementById('notes-text');
    const notesButton = document.getElementById('btn-notes');
    if (notesPanel && notesHeader && notesText && notesButton) {
        notesText.value = appState.notes;
        notesText.addEventListener('input', () => {
            appState.notes = notesText.value;
        });
        notesButton.addEventListener('click', () => {
            notesPanel.hidden = !notesPanel.hidden;
        });
        let draggingNotes = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        notesHeader.addEventListener('pointerdown', (event) => {
            draggingNotes = true;
            const rect = notesPanel.getBoundingClientRect();
            dragOffsetX = event.clientX - rect.left;
            dragOffsetY = event.clientY - rect.top;
            notesHeader.setPointerCapture(event.pointerId);
        });
        notesHeader.addEventListener('pointermove', (event) => {
            if (!draggingNotes) return;
            notesPanel.style.left = Math.max(0, event.clientX - dragOffsetX) + 'px';
            notesPanel.style.top = Math.max(0, event.clientY - dragOffsetY) + 'px';
        });
        notesHeader.addEventListener('pointerup', () => {
            draggingNotes = false;
        });
    }

    const input = document.getElementById('btn-import');
    if (input) {
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;
            appState.pendingChartFileName = file.name;
            loadChartFile(file);
            input.value = '';
        });
    }

    const overlayInput = document.getElementById('btn-overlay-import');
    if (overlayInput) {
        overlayInput.addEventListener('change', () => {
            const file = overlayInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => app.importOverlay(reader.result);
            reader.readAsText(file);
            overlayInput.value = '';
        });
    }

    window.addEventListener('resize', () => {
        appState.stage.width(window.innerWidth).height(window.innerHeight);
        appState.stage.batchDraw();
    });

    if (typeof initAppAPI === 'function') {
        const api = initAppAPI(app);
        app.importImage = api.importImage || app.importImage;
        app.exportOverlay = api.exportOverlay || app.exportOverlay;
        app.importOverlay = api.importOverlay || app.importOverlay;
        app.setMode = api.setMode || app.setMode;
        app.reset = api.reset || app.reset;
        app.rotateMap = api.rotateMap || app.rotateMap;
    }
});
