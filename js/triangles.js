// Geometrische Konstanten für ein echtes SBF-Nav-Dreieck
const CM_IN_PX = 96 / 2.54;
const TRIANGLE_SIZE = 420 + (2 * CM_IN_PX); // Etwa 1 cm je Seite größer
const TRIANGLE_HEIGHT = TRIANGLE_SIZE / 2; // 90° Winkel an der Spitze
const TRIANGLE_SIDES = {
    hypotenuse: {
        start: { x: -TRIANGLE_SIZE / 2, y: TRIANGLE_HEIGHT },
        end: { x: TRIANGLE_SIZE / 2, y: TRIANGLE_HEIGHT },
    },
    legA: {
        start: { x: -TRIANGLE_SIZE / 2, y: TRIANGLE_HEIGHT },
        end: { x: 0, y: 0 },
    },
    legB: {
        start: { x: 0, y: 0 },
        end: { x: TRIANGLE_SIZE / 2, y: TRIANGLE_HEIGHT },
    },
};

function createTriangleGeometry(isNav) {
    const group = new Konva.Group({
        x: 0,
        y: 0,
        visible: true,
        name: isNav ? 'navTriangle' : 'alignTriangle'
    });

    // 1. Der transparente Dreiecks-Körper
    const body = new Konva.Line({
        points: [-TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT, TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT, 0, 0],
        closed: true,
        fill: isNav ? 'rgba(255, 255, 255, 0.18)' : 'rgba(200, 220, 255, 0.12)',
        stroke: null
    });
    group.add(body);

    const frameStrokeWidth = 2;
    const frameGap = 6;
    group.add(
        new Konva.Line({
            points: [-TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT, 0, 0],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [0, 0, TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [-TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT, -frameGap, TRIANGLE_HEIGHT],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [frameGap, TRIANGLE_HEIGHT, TRIANGLE_SIZE / 2, TRIANGLE_HEIGHT],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        })
    );

    // 2. Parallele Hilfsstriche im Körper (wichtig für die Ausrichtung an Meridianen)
    if (isNav) {
        // Horizontale Parallellinien im Abstand von je 15 Pixeln
        for (let i = 1; i <= 6; i++) {
            let h = i * 22; // Abstand der Linien
            let w = TRIANGLE_SIZE * (1 - (h / TRIANGLE_HEIGHT)); // Breite auf dieser Höhe berechnen
            let line = new Konva.Line({
                points: [-w / 2, TRIANGLE_HEIGHT - h, w / 2, TRIANGLE_HEIGHT - h],
                stroke: 'rgba(0, 0, 0, 0.2)',
                strokeWidth: 1
            });
            group.add(line);
        }
    }

    // 3. MATHEMATISCH PRÄZISE GRADSKALA (Halbkreis-Bogen)
    if (isNav) {
        // Der Radius des inneren Skalenbogens (ca. 80% der Dreieckshöhe)
        const scaleRadius = TRIANGLE_HEIGHT * 0.78 - (2 * CM_IN_PX);
        // Der mathematische Mittelpunkt des Bogens liegt auf dem roten Ankerpunkt (0, TRIANGLE_HEIGHT)
        const centerX = 0;
        const centerY = TRIANGLE_HEIGHT;

        // Wir laufen von 10° bis 170° entlang des Bogens
        for (let angleDeg = 5; angleDeg <= 175; angleDeg++) {
            // Umrechnung in Bogenmaß (Winkel im mathematischen Koordinatensystem spiegeln)
            let rad = (angleDeg * Math.PI) / 180;
            
            // Startpunkt des Strichs auf dem Bogen
            let cos = Math.cos(rad);
            let sin = Math.sin(rad);

            let startX = centerX + scaleRadius * cos;
            let startY = centerY - scaleRadius * sin;

            // Bestimme die Länge des Hilfsstrichs (10°-Schritte groß, 5°-Schritte mittel, 1°-Schritte klein)
            let tickLength = 5;
            let isMajor = (angleDeg % 10 === 0);
            let isMedium = (angleDeg % 5 === 0 && !isMajor);

            if (isMajor) tickLength = 14;
            else if (isMedium) tickLength = 9;

            let endX = centerX + (scaleRadius + tickLength) * cos;
            let endY = centerY - (scaleRadius + tickLength) * sin;

            // Hilfsstrich zeichnen
            let tick = new Konva.Line({
                points: [startX, startY, endX, endY],
                stroke: isMajor ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.35)',
                strokeWidth: isMajor ? 1.5 : 1
            });
            group.add(tick);

            // Beschriftung bei den großen 10-Grad-Schritten hinzufügen
            if (isMajor) {
                // Berechne die zwei um 180° versetzten Kurswerte
                let innerCourse = angleDeg;          // Innere Skala (z.B. 10° bis 170°)
                let outerCourse = angleDeg + 180;    // Äußere Skala (z.B. 190° bis 350°)

                // Text-Position leicht außerhalb des Strichs ansetzen
                let textDist = scaleRadius + 24;
                let textX = centerX + textDist * cos;
                let textY = centerY - textDist * sin;

                // Formatierung der Beschriftung untereinander (z.B. "30\n210")
                let courseLabel = new Konva.Text({
                    x: textX,
                    y: textY,
                    text: `${innerCourse}\n${outerCourse}`,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    fill: innerCourse <= 90 ? '#000000' : '#dc2626', // Farbliche Trennung zur besseren Orientierung (Schwarz/Rot)
                    align: 'center',
                    fontStyle: 'bold'
                });

                // Text um das eigene Zentrum versetzen, damit er perfekt über dem Strich zentriert
                courseLabel.offsetX(courseLabel.width() / 2);
                courseLabel.offsetY(courseLabel.height() / 2);
                
                // Text parallel zum Winkel mitdrehen, genau wie beim echten Dreieck!
                courseLabel.rotation(angleDeg - 90);

                group.add(courseLabel);
            }
        }
    }

    // 4. Roter Präzisionspunkt exakt im Zentrum der Hypotenuse (Der absolute Nullpunkt/Anker)
    const centerDot = new Konva.Circle({
        x: 0,
        y: TRIANGLE_HEIGHT,
        radius: 5,
        stroke: '#ef4444',
        strokeWidth: 1.5,
        opacity: 0.9
    });
    group.add(centerDot);

    const centerPoint = new Konva.Circle({
        x: 0,
        y: TRIANGLE_HEIGHT,
        radius: 0.5,
        fill: '#ef4444'
    });
    group.add(centerPoint);

    group._triangle = {
        activeSide: 'hypotenuse',
        constrained: false,
        constraintTool: null,
        constraintSide: null,
        centerDot,
        centerPoint,
    };

    group.getSide = (sideName) => {
        const side = TRIANGLE_SIDES[sideName];
        if (!side) return null;

        const dx = side.end.x - side.start.x;
        const dy = side.end.y - side.start.y;
        return {
            start: { ...side.start },
            end: { ...side.end },
            midpoint: {
                x: (side.start.x + side.end.x) / 2,
                y: (side.start.y + side.end.y) / 2,
            },
            angle: Math.atan2(dy, dx) * 180 / Math.PI,
        };
    };

    group.getActiveSide = () => group._triangle.activeSide;

    group.setActiveSide = (sideName, anchorPoint, alignedAngle, outwardPoint) => {
        const nextSide = group.getSide(sideName);
        if (!nextSide) return;

        const previousSide = group.getSide(group._triangle.activeSide);
        const currentAngle = group.rotation() + previousSide.angle;
        const targetAngle = alignedAngle === undefined ? currentAngle : alignedAngle;
        let nextRotation = targetAngle - nextSide.angle;

        if (outwardPoint) {
            const centroid = { x: 0, y: TRIANGLE_HEIGHT * 2 / 3 };
            const toInterior = {
                x: centroid.x - nextSide.midpoint.x,
                y: centroid.y - nextSide.midpoint.y,
            };
            const radians = nextRotation * Math.PI / 180;
            const rotatedInterior = {
                x: toInterior.x * Math.cos(radians) - toInterior.y * Math.sin(radians),
                y: toInterior.x * Math.sin(radians) + toInterior.y * Math.cos(radians),
            };
            const towardNt = {
                x: outwardPoint.x - anchorPoint.x,
                y: outwardPoint.y - anchorPoint.y,
            };
            if (rotatedInterior.x * towardNt.x + rotatedInterior.y * towardNt.y > 0) {
                nextRotation += 180;
            }
        }

        group._triangle.activeSide = sideName;
        group._triangle.centerDot.position(nextSide.midpoint);
        group._triangle.centerPoint.position(nextSide.midpoint);
        group.rotation(nextRotation);

        if (anchorPoint) {
            const offsetX = nextSide.midpoint.x - group.offsetX();
            const offsetY = nextSide.midpoint.y - group.offsetY();
            const radians = nextRotation * Math.PI / 180;
            group.position({
                x: anchorPoint.x - (offsetX * Math.cos(radians) - offsetY * Math.sin(radians)),
                y: anchorPoint.y - (offsetX * Math.sin(radians) + offsetY * Math.cos(radians)),
            });
        }
    };

    // Setzt das Rotationszentrum der Konva-Gruppe auf den roten Ankerpunkt
    group.offset({ x: 0, y: TRIANGLE_HEIGHT });
    return group;
}

// Positioniert das Anlegedreieck mathematisch exakt bündig an der Hypotenuse des Navdreiecks
function positionAlignOnNav(alignObj, navObj, offsetOnKante) {
    if (!alignObj || !navObj) return;

    let rad = (navObj.rotation() * Math.PI) / 180;
    let cos = Math.cos(rad);
    let sin = Math.sin(rad);

    let newX = navObj.x() + offsetOnKante * cos;
    let newY = navObj.y() + offsetOnKante * sin;

    alignObj.position({ x: newX, y: newY });
    alignObj.rotation(navObj.rotation() + 180); // Umgedreht bündig anlegen
}
