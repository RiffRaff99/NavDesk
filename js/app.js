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
};

// ---- Public API (wired after DOMContentLoaded) ----
const app = {
    importImage: () => {},
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
        appState.baseLayer.add(appState.chartImage);

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
        window.pdfjsLib.getDocument({ data: file }).promise
            .then((pdf) => pdf.getPage(1))
            .then((page) => {
                const targetWidth = window.innerWidth * 0.95;
                const scale = targetWidth / page.getViewport({ scale: 1 }).width;
                const viewport = page.getViewport({ scale });

                const pdfCanvas = document.createElement('canvas');
                pdfCanvas.width = viewport.width;
                pdfCanvas.height = viewport.height;
                const ctx = pdfCanvas.getContext('2d');

                return page.render({ canvasContext: ctx, viewport }).promise.then(() => pdfCanvas);
            })
            .then((canvas) => {
                loadImageResult(canvas.toDataURL());
            })
            .catch(() => {
                alert(i18n.t('msg_noChart'));
            });
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        loadImageResult(e.target.result);
    };
    reader.readAsDataURL(file);
}

function updateStatus(statusKey) {
    const text = typeof i18n !== 'undefined' && i18n.t ? i18n.t(statusKey) : statusKey;

    const statusText = document.getElementById('status-text-2');
    if (statusText) statusText.textContent = text;

    const toolbarStatus = document.querySelector('.status-display span');
    if (toolbarStatus) toolbarStatus.textContent = text;

    const activeButtons = {
        NAV_ACTIVE: 'btn-nav',
        ALIGN_ACTIVE: 'btn-align',
        COMPASS_ACTIVE: 'btn-compass',
        LINE_ACTIVE: 'btn-line',
        ARROW_ACTIVE: 'btn-arrow',
        CIRCLE_ACTIVE: 'btn-circle',
        MARKER_ACTIVE: 'btn-marker',
        LABEL_ACTIVE: 'btn-label',
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

    const input = document.getElementById('btn-import');
    if (input) {
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;
            loadChartFile(file);
            input.value = '';
        });
    }

    window.addEventListener('resize', () => {
        appState.stage.width(window.innerWidth).height(window.innerHeight);
        appState.stage.batchDraw();
    });

    if (typeof initAppAPI === 'function') {
        const api = initAppAPI(app);
        app.importImage = api.importImage || app.importImage;
        app.setMode = api.setMode || app.setMode;
        app.reset = api.reset || app.reset;
    }
});
