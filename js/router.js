// ============================================================
// navdesk - Mode router
// Keeps all state transitions centralized so tools can be added
// one by one without hard-coding state into the UI or the canvas.
// ============================================================

const MODE_ALIASES = {
    nav: 'NAV_ACTIVE',
    'nav-active': 'NAV_ACTIVE',
    align: 'ALIGN_ACTIVE',
    'align-active': 'ALIGN_ACTIVE',
    compass: 'COMPASS_ACTIVE',
    'compass-active': 'COMPASS_ACTIVE',
    pan: 'PAN_ZOOM',
    'pan-zoom': 'PAN_ZOOM',
    parallel: 'PARALLEL',
    'NAV_ACTIVE': 'NAV_ACTIVE',
    'ALIGN_ACTIVE': 'ALIGN_ACTIVE',
    'PAN_ZOOM': 'PAN_ZOOM',
    'PARALLEL': 'PARALLEL',
    'COMPASS_ACTIVE': 'COMPASS_ACTIVE',
    line: 'LINE_ACTIVE',
    arrow: 'ARROW_ACTIVE',
    circle: 'CIRCLE_ACTIVE',
    marker: 'MARKER_ACTIVE',
    label: 'LABEL_ACTIVE',
    eraser: 'ERASER_ACTIVE',
    'LINE_ACTIVE': 'LINE_ACTIVE',
    'ARROW_ACTIVE': 'ARROW_ACTIVE',
    'CIRCLE_ACTIVE': 'CIRCLE_ACTIVE',
    'MARKER_ACTIVE': 'MARKER_ACTIVE',
    'LABEL_ACTIVE': 'LABEL_ACTIVE',
};

const DRAWING_MODES = new Set(['LINE_ACTIVE', 'ARROW_ACTIVE', 'CIRCLE_ACTIVE', 'MARKER_ACTIVE', 'LABEL_ACTIVE']);

function clearDrawingPreview() {
    if (appState.drawingPreview) {
        appState.drawingPreview.destroy();
        appState.drawingPreview = null;
    }
    appState.drawingStart = null;
}

function normalizeModeName(modeName) {
    if (modeName === undefined || modeName === null) {
        return appState.mode || 'PAN_ZOOM';
    }

    const key = String(modeName).trim().toLowerCase();
    if (MODE_ALIASES[key]) return MODE_ALIASES[key];
    if (MODE_ALIASES[String(modeName)]) return MODE_ALIASES[String(modeName)];
    return String(modeName).toUpperCase();
}

function createNavTriangle() {
    return createTriangleGeometry(true);
}

function createAlignTriangle() {
    return createTriangleGeometry(false);
}

function transition(fromMode, toMode) {
    const from = normalizeModeName(fromMode || appState.mode);
    const target = normalizeModeName(toMode);
    const transitionKey = from + '_' + target;

    clearDrawingPreview();

    if (target === 'COMPASS_ACTIVE' && !appState.compass) {
        appState.compass = createCompass();
        if (appState.navTriangle) {
            appState.compass.rotation(appState.navTriangle.rotation());
        }
        appState.compass.x(0);
        appState.compass.y(0);
        appState.compass.visible(false);
        if (appState.toolLayer) appState.toolLayer.add(appState.compass);
    }

    if (DRAWING_MODES.has(from) || DRAWING_MODES.has(target)) {
        appState.mode = target;
        if (typeof updateStatus === 'function') {
            updateStatus(target === 'PAN_ZOOM' ? 'status_ready' : 'status_' + target.toLowerCase());
        }
        return target;
    }

    if (target === 'PAN_ZOOM') {
        appState.activeTool = null;
        appState.mode = target;
        if (typeof updateStatus === 'function') updateStatus('status_ready');
        return target;
    }

    if (appState.stage && !appState.toolLayer) {
        appState.toolLayer = new Konva.Layer();
        appState.stage.add(appState.toolLayer);
    }

    switch (transitionKey) {
        case 'PAN_ZOOM_NAV_ACTIVE':
        case 'PARALLEL_NAV_ACTIVE':
        case 'ALIGN_ACTIVE_NAV_ACTIVE':
            if (!appState.navTriangle) {
                appState.navTriangle = createNavTriangle();
                appState.navTriangle.visible(false);
                if (appState.toolLayer) {
                    appState.toolLayer.add(appState.navTriangle);
                }
            }
            break;

        case 'PAN_ZOOM_ALIGN_ACTIVE':
        case 'PARALLEL_ALIGN_ACTIVE':
        case 'NAV_ACTIVE_ALIGN_ACTIVE':
            if (!appState.alignTriangle) {
                appState.alignTriangle = createAlignTriangle();
                if (appState.toolLayer) {
                    appState.toolLayer.add(appState.alignTriangle);
                }
            }
            break;

        case 'PAN_ZOOM_COMPASS_ACTIVE':
        case 'PARALLEL_COMPASS_ACTIVE':
        case 'NAV_ACTIVE_COMPASS_ACTIVE':
            if (!appState.compass) {
                appState.compass = createCompass();
                if (appState.navTriangle) {
                    appState.compass.rotation(appState.navTriangle.rotation());
                }
                appState.compass.x(0);
                appState.compass.y(0);
                appState.compass.visible(false);
                if (appState.toolLayer) appState.toolLayer.add(appState.compass);
            }
            break;

        case 'NAV_ACTIVE_PARALLEL':
            if (appState.navTriangle) {
                const pointer = getLocalPointer();
                appState.navTriangle.x(pointer.x);
                appState.navTriangle.y(pointer.y);
                appState.navTriangle.visible(true);
                appState.parallelAnchorX = pointer.x;
                appState.parallelAnchorY = pointer.y;
                appState.activeTool = appState.navTriangle;
            }
            break;

        case 'ALIGN_ACTIVE_PARALLEL':
            if (appState.alignTriangle) {
                appState.activeTool = appState.alignTriangle;
            }
            break;

        case 'PARALLEL_PARALLEL':
            if (!appState.activeTool && appState.alignTriangle) {
                appState.activeTool = appState.alignTriangle;
            }
            break;

        case 'PARALLEL_PAN_ZOOM':
            appState.parallelAnchorX = 0;
            appState.parallelAnchorY = 0;
            appState.activeTool = null;
            break;

        case 'NAV_ACTIVE_PAN_ZOOM':
        case 'ALIGN_ACTIVE_PAN_ZOOM':
            if (appState.alignTriangle) {
                appState.alignTriangle.destroy();
                appState.alignTriangle = null;
            }
            if (appState.navTriangle) {
                appState.navTriangle.destroy();
                appState.navTriangle = null;
            }
            appState.activeTool = null;
            break;

        default:
            if (typeof console !== 'undefined') {
                console.warn('Unknown transition:', from + ' -> ' + target);
            }
            break;
    }

    appState.mode = target;
    if (typeof updateStatus === 'function') {
        updateStatus(target === 'PAN_ZOOM' ? 'status_ready' : 'status_' + target.toLowerCase());
    }
    return target;
}

const OVERLAY_VERSION = 1;

function serializeNode(node) {
    return {
        x: node.x(),
        y: node.y(),
        rotation: node.rotation(),
    };
}

function serializeDrawing(drawing) {
    const type = drawing.name();
    if (type === 'circle') {
        return { type, x: drawing.x(), y: drawing.y(), radius: drawing.radius() };
    }
    if (type === 'marker') {
        const circle = drawing.getChildren()[0];
        return { type, x: circle.x(), y: circle.y(), radius: circle.radius() };
    }
    if (type === 'line' || type === 'arrow') {
        const points = drawing.getChildren()[0].points();
        return { type, points: [...points] };
    }
    if (type === 'label') {
        return { type, x: drawing.x(), y: drawing.y(), text: drawing.text() };
    }
    return null;
}

function serializeTriangle(triangle) {
    if (!triangle) return null;
    return {
        ...serializeNode(triangle),
        activeSide: triangle.getActiveSide ? triangle.getActiveSide() : 'hypotenuse',
        constrained: Boolean(triangle._triangle && triangle._triangle.constrained),
        constraintSide: triangle._triangle ? triangle._triangle.constraintSide : null,
    };
}

function serializeCompass(compass) {
    if (!compass) return null;
    return {
        ...serializeNode(compass),
        state: {
            span: compass._compass.span,
            phase: compass._compass.phase,
            hanging: false,
            interactionState: compass._compass.interactionState,
            point1: compass._compass.point1,
            point2: compass._compass.point2,
        },
    };
}

function createOverlayState() {
    const drawings = Object.values(appState.drawings).flatMap((items) => items.map(serializeDrawing));
    return {
        format: 'navdesk-overlay',
        version: OVERLAY_VERSION,
        exportedAt: new Date().toISOString(),
        metadata: {
            notes: appState.notes || '',
            chartSource: appState.chartFileName || '',
        },
        viewport: {
            x: appState.stage.x(),
            y: appState.stage.y(),
            scale: appState.stage.scaleX(),
        },
        triangles: {
            nav: serializeTriangle(appState.navTriangle),
            align: serializeTriangle(appState.alignTriangle),
        },
        compass: serializeCompass(appState.compass),
        drawings,
    };
}

function downloadOverlay() {
    const overlay = createOverlayState();
    const requestedName = window.prompt(
        i18n.t('msg_overlayFilename'),
        (overlay.metadata.chartSource || 'navdesk').replace(/\.[^.]+$/, '') + '_overlay.json'
    );
    if (requestedName === null) return;
    const filename = requestedName.trim() || 'navdesk_overlay.json';
    const downloadName = filename.toLowerCase().endsWith('.json') ? filename : filename + '.json';
    const blob = new Blob([JSON.stringify(overlay, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = downloadName;
    link.click();
    URL.revokeObjectURL(link.href);
}

function restoreDrawing(data) {
    if (!data || typeof data.type !== 'string') return null;
    if (data.type === 'circle') return createDrawingCircle({ x: data.x, y: data.y }, data.radius);
    if (data.type === 'marker') return createDrawingMarker({ x: data.x, y: data.y }, data.radius);
    if (data.type === 'line' || data.type === 'arrow') {
        const points = data.points || [];
        return createDrawingLine(
            { x: points[0], y: points[1] },
            { x: points[2], y: points[3] },
            data.type === 'arrow'
        );
    }
    if (data.type === 'label' && typeof data.text === 'string') {
        return createDrawingLabel({ x: data.x, y: data.y }, data.text);
    }
    return null;
}

function restoreTriangle(data, createTriangle) {
    if (!data) return null;
    const triangle = createTriangle();
    triangle.position({ x: data.x, y: data.y });
    triangle.rotation(data.rotation || 0);
    if (triangle.setActiveSide && data.activeSide) triangle.setActiveSide(data.activeSide);
    return triangle;
}

function restoreOverlay(raw) {
    let overlay;
    try {
        overlay = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
        throw new Error('Invalid overlay JSON');
    }
    if (!overlay || overlay.format !== 'navdesk-overlay' || overlay.version !== OVERLAY_VERSION) {
        throw new Error('Unsupported overlay format');
    }
    if (!appState.stage || !appState.toolLayer) throw new Error('Chart table is not ready');

    resetToolsOnly();
    appState.stage.position({ x: overlay.viewport.x, y: overlay.viewport.y });
    appState.stage.scale({ x: overlay.viewport.scale, y: overlay.viewport.scale });
    if (overlay.triangles.nav) {
        appState.navTriangle = restoreTriangle(overlay.triangles.nav, createNavTriangle);
        appState.toolLayer.add(appState.navTriangle);
    }
    if (overlay.triangles.align) {
        appState.alignTriangle = restoreTriangle(overlay.triangles.align, createAlignTriangle);
        appState.toolLayer.add(appState.alignTriangle);
    }
    if (appState.navTriangle && appState.alignTriangle
        && overlay.triangles.nav && overlay.triangles.align
        && overlay.triangles.nav.constrained && overlay.triangles.align.constrained) {
        appState.navTriangle._triangle.constrained = true;
        appState.navTriangle._triangle.constraintTool = appState.alignTriangle;
        appState.navTriangle._triangle.constraintSide = overlay.triangles.nav.constraintSide;
        appState.alignTriangle._triangle.constrained = true;
        appState.alignTriangle._triangle.constraintTool = appState.navTriangle;
        appState.alignTriangle._triangle.constraintSide = overlay.triangles.align.constraintSide;
    }
    if (overlay.compass) {
        appState.compass = createCompass();
        appState.compass.position({ x: overlay.compass.x, y: overlay.compass.y });
        appState.compass.rotation(overlay.compass.rotation || 0);
        appState.compass._compass = { ...appState.compass._compass, ...overlay.compass.state };
        appState.toolLayer.add(appState.compass);
    }
    for (const data of overlay.drawings || []) {
        const drawing = restoreDrawing(data);
        if (!drawing) continue;
        appState.toolLayer.add(drawing);
        const collection = appState.drawings[data.type === 'arrow' ? 'arrows' : data.type + 's'];
        if (collection) collection.push(drawing);
    }
    if (overlay.metadata && overlay.metadata.chartSource && appState.chartFileName
        && overlay.metadata.chartSource !== appState.chartFileName) {
        alert('Overlay-Karte: ' + overlay.metadata.chartSource + '\nAktuelle Karte: ' + appState.chartFileName);
    }
    appState.notes = overlay.metadata && overlay.metadata.notes ? overlay.metadata.notes : '';
    const notesText = document.getElementById('notes-text');
    if (notesText) notesText.value = appState.notes;
    appState.toolLayer.batchDraw();
}

function rotateChartImage(degrees) {
    if (!appState.chartImage) return;

    const img = appState.chartImage;

    // 1. Offset in die Bildmitte setzen (wichtig für die Drehung vor Ort)
    img.offset({
        x: img.width() / 2,
        y: img.height() / 2
    });

    // 2. Da das Bild vorher bei (0,0) lag, müssen wir es um den halben Offset
    // nach rechts/unten verschieben, damit es exakt am selben Fleck bleibt!
    img.position({
        x: img.width() / 2,
        y: img.height() / 2
    });

    // 3. Rotation berechnen und anwenden
    const currentRotation = img.rotation() || 0;
    const newRotation = (currentRotation + degrees) % 360;
    img.rotation(newRotation);

    // 4. Das Bild rotiert nun perfekt um seine eigene Mitte bei (0,0) der Stage.
    // Jetzt zentrieren wir die Stage (den Viewport) wieder genau auf diese Mitte.
    // Das entspricht exakt deiner Logik aus dem Lade-Code!
    appState.stage.position({
        x: (window.innerWidth - img.width()) / 2,
        y: (window.innerHeight - img.height()) / 2
    });

    // 5. Alles frisch zeichnen
    appState.stage.batchDraw();
}




function initAppAPI(app) {
    return {
        rotateMap: function () {
            rotateChartImage(90);
        },

        importImage: function (file) {
            if (file) loadChartFile(file);
        },

        exportOverlay: function () {
            downloadOverlay();
        },

        importOverlay: function (raw) {
            try {
                restoreOverlay(raw);
            } catch (error) {
                alert(error.message);
            }
        },

        setMode: function (modeName) {
            const previous = appState.mode;
            const target = normalizeModeName(modeName);

            if (target === 'COMPASS_ACTIVE' && appState.compass) {
                appState.compass.destroy();
                appState.compass = null;
                appState.activeTool = null;
                appState.mode = 'PAN_ZOOM';
                updateStatus('status_ready');
                return;
            }
            if (previous === target) {
                if (DRAWING_MODES.has(target)) clearDrawingPreview();
                return;
            }
            transition(previous, target);
        },

        reset: function () {
            if (appState.alignTriangle) {
                appState.alignTriangle.destroy();
                appState.alignTriangle = null;
            }
            if (appState.navTriangle) {
                appState.navTriangle.destroy();
                appState.navTriangle = null;
            }
            if (appState.compass) {
                appState.compass.destroy();
                appState.compass = null;
            }
            if (appState.compassCursor) {
                appState.compassCursor.destroy();
                appState.compassCursor = null;
            }
            appState.activeTool = null;
            appState.mode = 'PAN_ZOOM';
        },
    };
}
