const COMPASS_SIZE = 180;
const COMPASS_HALF_ANGLE = 15;

function createCompass() {
    const group = new Konva.Group({
        name: 'compass',
        visible: true,
        listening: true,
    });

    const leftLeg = new Konva.Line({
        points: [0, 0, 0, COMPASS_SIZE],
        stroke: '#111827',
        strokeWidth: 2.5,
        hitStrokeWidth: 14,
        lineCap: 'butt',
    });
    const rightLeg = new Konva.Line({
        points: [0, 0, 0, COMPASS_SIZE],
        stroke: '#b45309',
        strokeWidth: 2.5,
        hitStrokeWidth: 14,
        lineCap: 'butt',
    });
    const hinge = new Konva.Circle({
        x: 0,
        y: 0,
        radius: 5,
        fill: '#dc2626',
        stroke: '#111827',
        strokeWidth: 1.5,
    });

    group.add(leftLeg, rightLeg, hinge);
    group._compass = {
        span: 0,
        phase: 0,
        hanging: false,
        point1: null,
        point2: null,
    };
    group.setPoints = (point1, point2) => {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const span = Math.hypot(dx, dy);
        if (span <= 1) return;

        const halfAngle = COMPASS_HALF_ANGLE * Math.PI / 180;
        const legLength = span / (2 * Math.sin(halfAngle));
        const halfSpan = span / 2;
        const legHeight = legLength * Math.cos(halfAngle);
        const midpoint = {
            x: (point1.x + point2.x) / 2,
            y: (point1.y + point2.y) / 2,
        };
        const angle = Math.atan2(dy, dx);

        group._compass.span = span;
        group._compass.point1 = { ...point1 };
        group._compass.point2 = { ...point2 };
        group.position({
            x: midpoint.x + Math.sin(angle) * legHeight,
            y: midpoint.y - Math.cos(angle) * legHeight,
        });
        group.rotation(angle * 180 / Math.PI);
        leftLeg.points([0, 0, -halfSpan, legHeight]);
        rightLeg.points([0, 0, halfSpan, legHeight]);
    };
    group.setPreviewPoints = (point1, point2) => {
        if (compassPointDistance(point1, point2) <= 1) return;
        group.setPoints(point1, point2);
        group._compass.phase = 1;
    };
    return group;
}

function createCompassCursor() {
    const cursor = new Konva.Group({ name: 'compassCursor', listening: false });
    cursor.add(new Konva.Circle({
        x: 0,
        y: 0,
        radius: 9,
        stroke: '#dc2626',
        strokeWidth: 1.5,
        opacity: 0.75,
    }));
    return cursor;
}

function compassPointDistance(first, second) {
    return Math.hypot(second.x - first.x, second.y - first.y);
}

function getCompassEdgeRotation(pointer, chartImage) {
    if (!chartImage) return null;

    const imageWidth = typeof chartImage.width === 'function'
        ? chartImage.width()
        : chartImage.image().width;
    const imageHeight = typeof chartImage.height === 'function'
        ? chartImage.height()
        : chartImage.image().height;
    const left = chartImage.x();
    const top = chartImage.y();
    const right = left + imageWidth;
    const bottom = top + imageHeight;

    const outsideDistances = [
        { distance: left - pointer.x, rotation: 270 },
        { distance: pointer.x - right, rotation: 90 },
        { distance: top - pointer.y, rotation: 0 },
        { distance: pointer.y - bottom, rotation: 180 },
    ].filter((edge) => edge.distance > 0);

    if (outsideDistances.length === 0) return null;

    return outsideDistances.reduce((nearest, edge) => (
        edge.distance < nearest.distance ? edge : nearest
    )).rotation;
}
