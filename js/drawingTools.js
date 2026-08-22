function createDrawingLine(start, end, isArrow) {
    const group = new Konva.Group({ listening: false, name: isArrow ? 'arrow' : 'line' });
    const line = new Konva.Line({
        points: [start.x, start.y, end.x, end.y],
        stroke: isArrow ? '#dc2626' : '#111827',
        strokeWidth: 2,
        lineCap: 'round',
        lineJoin: 'round',
    });
    group.add(line);

    if (isArrow) {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const size = 12;
        group.add(new Konva.Line({
            points: [
                end.x, end.y,
                end.x - size * Math.cos(angle - Math.PI / 6),
                end.y - size * Math.sin(angle - Math.PI / 6),
                end.x - size * Math.cos(angle + Math.PI / 6),
                end.y - size * Math.sin(angle + Math.PI / 6),
            ],
            closed: true,
            fill: '#dc2626',
            stroke: '#dc2626',
            strokeWidth: 1,
        }));
    }

    return group;
}

function createDrawingCircle(center, radius) {
    return new Konva.Circle({
        name: 'circle',
        x: center.x,
        y: center.y,
        radius: Math.max(1, radius),
        stroke: '#2563eb',
        strokeWidth: 2,
        listening: false,
    });
}

function createDrawingMarker(center, radius) {
    const group = new Konva.Group({ name: 'marker', listening: false });
    group.add(createDrawingCircle(center, radius));
    const size = 8;
    group.add(new Konva.Line({
        points: [center.x - size, center.y, center.x + size, center.y],
        stroke: '#2563eb',
        strokeWidth: 2,
    }));
    group.add(new Konva.Line({
        points: [center.x, center.y - size, center.x, center.y + size],
        stroke: '#2563eb',
        strokeWidth: 2,
    }));
    return group;
}

function createDrawingLabel(point, text) {
    return new Konva.Text({
        name: 'label',
        x: point.x,
        y: point.y,
        text,
        fontSize: 16,
        fontFamily: 'sans-serif',
        fill: '#111827',
        padding: 2,
        listening: false,
    });
}
