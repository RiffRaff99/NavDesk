// ============================================================
// navdesk - Pointer and interaction layer
// Handles panning, zooming, and basic tool dragging. Tool-specific
// logic remains in the individual tool modules and router.
// ============================================================

function initEventListeners() {
    if (!appState || !appState.stage) return;

    const stage = appState.stage;
    const containerEl = document.getElementById('container');
    if (!containerEl) return;

    stage.content.style.touchAction = 'none';
    containerEl.style.touchAction = 'none';

    let panning = false;
    let panStartX = 0;
    let panStartY = 0;
    let lastWheelDelta = 0;
    let rotateStart = null;
    let rotateMoved = false;
    let draggingTool = false;
    let shiftStart = null;

    function toChartSpace(pointer) {
        const transform = stage.getTransform().copy().invert();
        return transform.point(pointer);
    }

    function getToolChildren() {
        if (!appState.toolLayer || typeof appState.toolLayer.getChildren !== 'function') {
            return [];
        }
        return appState.toolLayer.getChildren();
    }

    function getToolFromEvent(event) {
        let node = event && event.target;
        while (node && node !== stage) {
            if (node === appState.navTriangle || node === appState.alignTriangle) {
                return node;
            }
            if (node === appState.compass) return node;
            node = typeof node.getParent === 'function' ? node.getParent() : null;
        }
        return null;
    }

    function updateCompassCursor(pointer, visible) {
        if (!appState.compassCursor) {
            appState.compassCursor = createCompassCursor();
            appState.toolLayer.add(appState.compassCursor);
        }
        appState.compassCursor.position(toChartSpace(pointer));
        appState.compassCursor.visible(visible);
    }

    function updateDrawingPreview(start, end) {
        if (appState.drawingPreview) appState.drawingPreview.destroy();
        if (appState.mode === 'CIRCLE_ACTIVE' || appState.mode === 'MARKER_ACTIVE') {
            const radius = compassPointDistance(start, end);
            appState.drawingPreview = appState.mode === 'MARKER_ACTIVE'
                ? createDrawingMarker(start, radius)
                : createDrawingCircle(start, radius);
        } else {
            appState.drawingPreview = createDrawingLine(
                start,
                end,
                appState.mode === 'ARROW_ACTIVE'
            );
        }
        appState.toolLayer.add(appState.drawingPreview);
    }

    function handleDrawingPointerDown(pointer) {
        const chartPointer = toChartSpace(pointer);

        if (appState.mode === 'LABEL_ACTIVE') {
            const text = window.prompt(i18n.t('msg_textPrompt'), '');
            if (text) {
                const label = createDrawingLabel(chartPointer, text);
                appState.toolLayer.add(label);
                appState.drawings.labels.push(label);
            }
            return true;
        }

        if (!appState.drawingStart) {
            appState.drawingStart = chartPointer;
            updateDrawingPreview(chartPointer, chartPointer);
            return true;
        }

        const start = appState.drawingStart;
        if (appState.mode === 'CIRCLE_ACTIVE' || appState.mode === 'MARKER_ACTIVE') {
            const radius = compassPointDistance(start, chartPointer);
            const circle = appState.mode === 'MARKER_ACTIVE'
                ? createDrawingMarker(start, radius)
                : createDrawingCircle(start, radius);
            appState.toolLayer.add(circle);
            appState.drawings[appState.mode === 'MARKER_ACTIVE' ? 'markers' : 'circles'].push(circle);
        } else {
            const drawing = createDrawingLine(start, chartPointer, appState.mode === 'ARROW_ACTIVE');
            appState.toolLayer.add(drawing);
            appState.drawings[appState.mode === 'ARROW_ACTIVE' ? 'arrows' : 'lines'].push(drawing);
        }

        clearDrawingPreview();
        return true;
    }

    function isToolHit(child, pointer) {
        if (!child) return false;

        const candidates = [];
        const collect = (node) => {
            if (!node) return;
            if (typeof node.containsPoint === 'function') {
                candidates.push(node);
            }
            if (node.getChildren && typeof node.getChildren === 'function') {
                node.getChildren().forEach(collect);
            }
        };

        collect(child);
        if (candidates.length === 0) return false;

        for (const candidate of candidates) {
            try {
                const localPoint = candidate.getAbsoluteTransform().copy().invert().point(pointer);
                if (candidate.containsPoint(localPoint)) {
                    return true;
                }
            } catch (error) {
                // Ignore invalid candidate transforms or nodes without hit-test support.
            }
        }

        return false;
    }

    function startParallelShift(tool) {
        if (!tool) return;
        appState.activeTool = tool;
        appState.mode = 'PARALLEL';
        const chartPointer = getLocalPointer();
        shiftStart = {
            pointer: chartPointer,
            position: { x: tool.x(), y: tool.y() },
            rotation: tool.rotation(),
            axis: getToolShiftAxis(tool),
        };
        updateStatus('status_parallelShift');
    }

    function getToolShiftAxis(tool) {
        if (tool && tool._triangle && tool._triangle.constrained && tool._triangle.constraintTool) {
            const constraintTool = tool._triangle.constraintTool;
            const sideName = tool._triangle.constraintSide;
            const side = constraintTool.getSide(sideName);
            const transform = constraintTool.getTransform();
            const start = transform.point(side.start);
            const end = transform.point(side.end);
            const length = Math.hypot(end.x - start.x, end.y - start.y);
            if (length > 0) {
                return {
                    x: (end.x - start.x) / length,
                    y: (end.y - start.y) / length,
                };
            }
        }

        if (tool === appState.alignTriangle && typeof tool.getSide === 'function'
            && tool._triangle && tool._triangle.constrained) {
            const side = tool.getSide(tool.getActiveSide());
            const radians = (tool.rotation() + side.angle) * Math.PI / 180;
            return { x: Math.cos(radians), y: Math.sin(radians) };
        }

        return null;
    }

    function getNearestNavSide(pointer) {
        return getNearestTriangleSide(appState.navTriangle, pointer);
    }

    function getNearestTriangleSide(tool, pointer) {
        if (!tool || typeof tool.getSide !== 'function') {
            return null;
        }

        const transform = tool.getTransform();
        const candidates = ['hypotenuse', 'legA', 'legB'].map((sideName) => {
            const side = tool.getSide(sideName);
            const start = transform.point(side.start);
            const end = transform.point(side.end);
            const deltaX = end.x - start.x;
            const deltaY = end.y - start.y;
            const lengthSquared = deltaX * deltaX + deltaY * deltaY;
            const projection = Math.max(0, Math.min(1,
                ((pointer.x - start.x) * deltaX + (pointer.y - start.y) * deltaY) / lengthSquared
            ));
            const nearest = {
                x: start.x + projection * deltaX,
                y: start.y + projection * deltaY,
            };
            return {
                side,
                sideName,
                start,
                end,
                nearest,
                distance: Math.hypot(pointer.x - nearest.x, pointer.y - nearest.y),
                angle: Math.atan2(deltaY, deltaX) * 180 / Math.PI,
            };
        });

        return candidates.reduce((nearest, candidate) => (
            candidate.distance < nearest.distance ? candidate : nearest
        ));
    }

    function updateHoveredSide(tool, chartPointer, keepMarkerAtPointer = false) {
        const nearest = getNearestTriangleSide(tool, chartPointer);
        if (nearest) {
            tool.setActiveSide(
                nearest.sideName,
                keepMarkerAtPointer ? chartPointer : undefined
            );
        }
        return nearest;
    }

    function snapAlignToNav(chartPointer, commit = false) {
        if (!appState.alignTriangle || !appState.navTriangle) return false;

        const nearest = getNearestNavSide(chartPointer);
        const tolerance = 5 / Math.max(stage.scaleX(), 0.0001);
        if (!nearest || nearest.distance > tolerance) return false;

        const navTransform = appState.navTriangle.getTransform();
        const navCentroid = navTransform.point({ x: 0, y: TRIANGLE_HEIGHT * 2 / 3 });
        appState.alignTriangle.setActiveSide(
            appState.alignTriangle.getActiveSide(),
            nearest.nearest,
            nearest.angle,
            navCentroid
        );
        if (commit) {
            appState.alignTriangle._triangle.constrained = true;
            appState.alignTriangle._triangle.constraintTool = appState.navTriangle;
            appState.alignTriangle._triangle.constraintSide = nearest.sideName;
            appState.navTriangle._triangle.constrained = true;
            appState.navTriangle._triangle.constraintTool = appState.alignTriangle;
            appState.navTriangle._triangle.constraintSide = appState.alignTriangle.getActiveSide();
        }
        return true;
    }

    function snapNavToAlign(chartPointer) {
        if (!appState.navTriangle || !appState.alignTriangle) return false;

        const nearest = getNearestTriangleSide(appState.alignTriangle, chartPointer);
        const tolerance = 5 / Math.max(stage.scaleX(), 0.0001);
        if (!nearest || nearest.distance > tolerance) return false;

        const alignTransform = appState.alignTriangle.getTransform();
        const alignSide = appState.alignTriangle.getSide(appState.alignTriangle.getActiveSide());
        const alignStart = alignTransform.point(alignSide.start);
        const alignEnd = alignTransform.point(alignSide.end);
        const alignAngle = Math.atan2(alignEnd.y - alignStart.y, alignEnd.x - alignStart.x) * 180 / Math.PI;
        appState.navTriangle.setActiveSide(
            appState.navTriangle.getActiveSide(),
            nearest.nearest,
            alignAngle
        );
        appState.navTriangle._triangle.constrained = true;
        appState.navTriangle._triangle.constraintTool = appState.alignTriangle;
        appState.navTriangle._triangle.constraintSide = appState.alignTriangle.getActiveSide();
        appState.alignTriangle._triangle.constrained = true;
        appState.alignTriangle._triangle.constraintTool = appState.navTriangle;
        appState.alignTriangle._triangle.constraintSide = appState.navTriangle.getActiveSide();
        return true;
    }

    function clearTriangleConstraint(tool) {
        if (!tool || !tool._triangle) return;
        tool._triangle.constrained = false;
        tool._triangle.constraintTool = null;
        tool._triangle.constraintSide = null;
    }

    function placeNavTriangle(pointer) {
        if (!appState.navTriangle) {
            appState.navTriangle = createNavTriangle();
            appState.toolLayer.add(appState.navTriangle);
        }

        const chartPointer = toChartSpace(pointer || stage.getPointerPosition());
        updateHoveredSide(appState.navTriangle, chartPointer, true);
        if (!snapNavToAlign(chartPointer)) {
            appState.navTriangle.x(chartPointer.x);
            appState.navTriangle.y(chartPointer.y);
            clearTriangleConstraint(appState.navTriangle);
            clearTriangleConstraint(appState.alignTriangle);
        }
        appState.navTriangle.visible(true);
        appState.activeTool = appState.navTriangle;
        appState.navTriangle._dragOffsetX = 0;
        appState.navTriangle._dragOffsetY = 0;
        appState.parallelAnchorX = chartPointer.x;
        appState.parallelAnchorY = chartPointer.y;
        draggingTool = true;
        shiftStart = {
            pointer: chartPointer,
            position: { x: chartPointer.x, y: chartPointer.y },
            rotation: appState.navTriangle.rotation(),
        };
        appState.mode = 'PARALLEL';
        updateStatus('status_parallelShift');
    }

    function placeAlignTriangle(pointer) {

        if (!appState.alignTriangle) {
            appState.alignTriangle = createAlignTriangle();
            appState.toolLayer.add(appState.alignTriangle);
        }

        const chartPointer = toChartSpace(pointer);
        updateHoveredSide(appState.alignTriangle, chartPointer);
        if (!snapAlignToNav(chartPointer, true)) {
            appState.alignTriangle.setActiveSide(
                appState.alignTriangle.getActiveSide(),
                chartPointer
            );
            appState.alignTriangle._triangle.constrained = false;
            appState.alignTriangle._triangle.constraintTool = null;
            appState.alignTriangle._triangle.constraintSide = null;
            clearTriangleConstraint(appState.navTriangle);
        }
        appState.alignTriangle.visible(true);
        appState.activeTool = appState.alignTriangle;
        draggingTool = true;
        appState.mode = 'PARALLEL';
        startParallelShift(appState.alignTriangle);
        updateStatus('status_parallelShift');
    }

    stage.on('dblclick', (event) => {
        const hitTool = getToolFromEvent(event);

        if (hitTool && hitTool === appState.navTriangle) {
            const chartPointer = toChartSpace(stage.getPointerPosition());
            updateHoveredSide(appState.navTriangle, chartPointer, true);
            if (appState.alignTriangle) {
                updateHoveredSide(appState.alignTriangle, chartPointer);
            }
            clearTriangleConstraint(appState.navTriangle);
            clearTriangleConstraint(appState.alignTriangle);
            appState.mode = 'NAV_ACTIVE';
            appState.activeTool = null;
            updateStatus('status_navActive');
            return;
        }

        if (hitTool && hitTool === appState.alignTriangle) {
            const chartPointer = toChartSpace(stage.getPointerPosition());
            updateHoveredSide(appState.alignTriangle, chartPointer, true);
            clearTriangleConstraint(appState.alignTriangle);
            clearTriangleConstraint(appState.navTriangle);
            appState.mode = 'ALIGN_ACTIVE';
            appState.activeTool = null;
            updateStatus('status_alignActive');
            return;
        }
    });

    stage.on('pointerdown', (event) => {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const isRightClick = event.evt && (event.evt.button === 2 || event.evt.which === 3);
        const hitTool = getToolFromEvent(event);

        if (DRAWING_MODES.has(appState.mode) && !isRightClick) {
            handleDrawingPointerDown(pointer);
            return;
        }

        if (appState.mode === 'COMPASS_ACTIVE' && appState.compass) {
            const compass = appState.compass;
            const state = compass._compass;
            const chartPointer = toChartSpace(pointer);
            const edgeRotation = getCompassEdgeRotation(chartPointer, appState.chartImage);
            if (isRightClick && state.hanging) {
                if (edgeRotation === null) {
                    rotateStart = {
                        x: pointer.x,
                        y: pointer.y,
                        tool: 'compass',
                        startAngle: compass.rotation(),
                    };
                    rotateMoved = false;
                }
                return;
            }

            if (state.hanging && hitTool === compass) {
                state.hanging = false;
                appState.activeTool = null;
                appState.mode = 'PAN_ZOOM';
                updateStatus('status_ready');
                return;
            }

            if (state.phase === 0) {
                state.point1 = { ...chartPointer };
                compass.visible(false);
                state.phase = 1;
                updateCompassCursor(pointer, true);
                updateStatus('status_compassSpan');
                return;
            }

            if (state.phase === 1) {
                const span = compassPointDistance(state.point1, chartPointer);
                if (span > 1) {
                    state.point2 = { ...chartPointer };
                    compass.setPoints(state.point1, state.point2);
                    compass.visible(true);
                    state.phase = 2;
                    appState.mode = 'PAN_ZOOM';
                    updateCompassCursor(pointer, false);
                    updateStatus('status_ready');
                }
                return;
            }
        }

        if (appState.mode === 'NAV_ACTIVE') {
            if (isRightClick && appState.navTriangle) {
                rotateStart = {
                    x: pointer.x,
                    y: pointer.y,
                    tool: 'nav',
                    startAngle: appState.navTriangle.rotation(),
                };
                rotateMoved = false;
                return;
            }

            placeNavTriangle(pointer);
            return;
        }

        if (appState.mode === 'ALIGN_ACTIVE') {
            if (isRightClick && appState.alignTriangle) {
                return;
            }
            placeAlignTriangle(pointer);
            return;
        }

        if (appState.mode === 'PARALLEL' && appState.activeTool && hitTool === appState.activeTool) {
            draggingTool = true;
            shiftStart = null;
            startParallelShift(appState.activeTool);
            return;
        }

        if (appState.compass && hitTool === appState.compass && isRightClick) {
            appState.compass._compass.hanging = true;
            appState.activeTool = appState.compass;
            appState.mode = 'COMPASS_ACTIVE';
            rotateStart = {
                x: pointer.x,
                y: pointer.y,
                tool: 'compass',
                startAngle: appState.compass.rotation(),
            };
            rotateMoved = false;
            return;
        }

        if (appState.mode === 'PAN_ZOOM' && appState.compass && hitTool === appState.compass) {
            appState.compass._compass.hanging = true;
            appState.activeTool = appState.compass;
            appState.mode = 'COMPASS_ACTIVE';
            updateCompassCursor(pointer, true);
            return;
        }

        if (hitTool) {
            draggingTool = true;
            shiftStart = null;
            appState.mode = 'PARALLEL';
            startParallelShift(hitTool);
            return;
        }

        panning = true;
        panStartX = pointer.x;
        panStartY = pointer.y;
        updateStatus('status_zooming');
    });

    stage.on('pointermove', (event) => {
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        if (rotateStart && rotateStart.tool === 'nav' && appState.navTriangle) {
            const dx = pointer.x - rotateStart.x;
            const dy = pointer.y - rotateStart.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                rotateMoved = true;
            }
            if (rotateMoved) {
                appState.navTriangle.rotation(
                    rotateStart.startAngle + (Math.atan2(dy, dx) * 180 / Math.PI)
                );
            }
            appState.toolLayer.batchDraw();
            return;
        }

        if (appState.mode === 'ALIGN_ACTIVE' && appState.alignTriangle) {
            const chartPointer = toChartSpace(pointer);
            updateHoveredSide(appState.alignTriangle, chartPointer);
            if (!snapAlignToNav(chartPointer)) {
                appState.alignTriangle.setActiveSide(
                    appState.alignTriangle.getActiveSide(),
                    chartPointer
                );
            }
            appState.alignTriangle.visible(true);
            appState.toolLayer.batchDraw();
            return;
        }

        if (DRAWING_MODES.has(appState.mode)) {
            const chartPointer = toChartSpace(pointer);
            if (appState.mode === 'LABEL_ACTIVE') return;
            if (appState.drawingStart) {
                updateDrawingPreview(appState.drawingStart, chartPointer);
                appState.toolLayer.batchDraw();
            }
            return;
        }

        if (rotateStart && rotateStart.tool === 'compass' && appState.compass && appState.compass._compass.hanging) {
            const dx = pointer.x - rotateStart.x;
            const dy = pointer.y - rotateStart.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                rotateMoved = true;
            }
            if (rotateMoved) {
                appState.compass.rotation(
                    rotateStart.startAngle + (Math.atan2(dy, dx) * 180 / Math.PI)
                );
            }
            appState.toolLayer.batchDraw();
            return;
        }

        if (appState.mode === 'NAV_ACTIVE' && appState.navTriangle) {
            const chartPointer = toChartSpace(pointer);
            appState.navTriangle.position(chartPointer);
            updateHoveredSide(appState.navTriangle, chartPointer, true);
            if (appState.alignTriangle) {
                updateHoveredSide(appState.alignTriangle, chartPointer);
            }
            appState.navTriangle.visible(true);
            appState.toolLayer.batchDraw();
            return;
        }

        if (appState.mode === 'COMPASS_ACTIVE' && appState.compass) {
            const compass = appState.compass;
            const state = compass._compass;
            const chartPointer = toChartSpace(pointer);
            if (state.hanging) {
                compass.position(chartPointer);
                const edgeRotation = getCompassEdgeRotation(chartPointer, appState.chartImage);
                if (edgeRotation !== null) {
                    compass.rotation(edgeRotation);
                }
                updateCompassCursor(pointer, true);
            } else if (state.phase === 0) {
                compass.position(chartPointer);
                compass.visible(false);
                updateCompassCursor(pointer, true);
            } else if (state.phase === 1 && state.point1) {
                compass.setPreviewPoints(state.point1, chartPointer);
                compass.visible(false);
                updateCompassCursor(pointer, true);
            }
            appState.toolLayer.batchDraw();
            return;
        }

        const leftButtonHeld = event.evt && (event.evt.buttons & 1) === 1;
        if (appState.mode === 'PARALLEL' && appState.activeTool && draggingTool && leftButtonHeld) {
            if (!shiftStart) {
                startParallelShift(appState.activeTool);
            }
            const chartPointer = toChartSpace(pointer);
            const delta = {
                x: chartPointer.x - shiftStart.pointer.x,
                y: chartPointer.y - shiftStart.pointer.y,
            };
            if (shiftStart.axis) {
                const distance = delta.x * shiftStart.axis.x + delta.y * shiftStart.axis.y;
                appState.activeTool.position({
                    x: shiftStart.position.x + distance * shiftStart.axis.x,
                    y: shiftStart.position.y + distance * shiftStart.axis.y,
                });
            } else {
                appState.activeTool.position({
                    x: shiftStart.position.x + delta.x,
                    y: shiftStart.position.y + delta.y,
                });
            }

            if (appState.toolLayer) appState.toolLayer.batchDraw();
            return;
        }

        if (!panning) return;

        const dx = pointer.x - panStartX;
        const dy = pointer.y - panStartY;
        stage.position({
            x: stage.position().x + dx,
            y: stage.position().y + dy,
        });

        panStartX = pointer.x;
        panStartY = pointer.y;
        stage.batchDraw();
    });

    stage.on('pointerup', () => {
        panning = false;
        draggingTool = false;
        shiftStart = null;
        rotateStart = null;
        rotateMoved = false;
        if (!appState.activeTool) {
            updateStatus('status_ready');
        }
    });

    stage.on('pointerleave', () => {
        panning = false;
        draggingTool = false;
        shiftStart = null;
        rotateStart = null;
        rotateMoved = false;
    });

    stage.on('contextmenu', (event) => {
        event.evt.preventDefault();
        if (appState.mode === 'PARALLEL' || appState.mode === 'ALIGN_ACTIVE') {
            appState.activeTool = null;
            draggingTool = false;
            appState.mode = 'PAN_ZOOM';
            updateStatus('status_ready');
        }
    });

    containerEl.addEventListener('wheel', (event) => {
        event.preventDefault();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        if (appState.mode === 'NAV_ACTIVE' && appState.navTriangle) {
            const delta = event.deltaY > 0 ? -0.5 : 0.5;
            appState.navTriangle.rotation(appState.navTriangle.rotation() + delta);
            appState.toolLayer.batchDraw();
            return;
        }

        if (appState.mode === 'COMPASS_ACTIVE' && appState.compass && appState.compass._compass.hanging) {
            const delta = event.deltaY > 0 ? -0.5 : 0.5;
            appState.compass.rotation(appState.compass.rotation() + delta);
            appState.toolLayer.batchDraw();
            return;
        }

        lastWheelDelta += event.deltaY;
        if (Math.abs(lastWheelDelta) < 5) return;

        const direction = lastWheelDelta > 0 ? -1 : 1;
        const factor = direction === 1 ? 1.1 : 1 / 1.1;
        lastWheelDelta = 0;

        const oldScale = stage.scaleX();
        const nextScale = oldScale * factor;
        const pointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        stage.scale({ x: nextScale, y: nextScale });
        stage.position({
            x: pointer.x - pointTo.x * nextScale,
            y: pointer.y - pointTo.y * nextScale,
        });
        stage.batchDraw();
    }, { passive: false });
}

function handleToolClick(tool, pointer) {
    appState.activeTool = tool;
    const chartPointer = getLocalPointer();
    tool._dragOffsetX = chartPointer.x - tool.x();
    tool._dragOffsetY = chartPointer.y - tool.y();
    updateStatus('status_parallelShift');
}
