function createTriangleGeometry(isNav) {
    const currentChartWidth = appState.chartWidth || 1000;
    const currentChartHeight = appState.chartHeight || 1000;

    // Wir prüfen, ob die Karte im Hoch- oder Querformat vorliegt
    const isPortrait = currentChartHeight > currentChartWidth;

    // Ein echtes A4-Blatt ist im Hochformat 21cm breit, im Querformat 29.7cm lang.
    const realChartWidthCm = isPortrait ? 21.0 : 29.7;
    
    const pxPerCm = (currentChartWidth / realChartWidthCm) * 0.62; //fix, scheint gut zu passen

    const TARGET_TRIANGLE_WIDTH_CM = 26; 
    
    // 2. Multipliziere die berechnete Pixelgröße einfach mit dem customScale!
    const triangleSize = TARGET_TRIANGLE_WIDTH_CM * pxPerCm;
    const triangleHeight = triangleSize / 2;
    
    const group = new Konva.Group({
        x: 0,
        y: 0,
        visible: true,
        name: isNav ? 'navTriangle' : 'alignTriangle'
    });

     // Hilfreich für andere Funktionen: Wir speichern die Maße als Properties auf der Gruppe
    group.triangleSize = triangleSize;
    group.triangleHeight = triangleHeight;
    group.pxPerCm = pxPerCm;

    // 1. Der transparente Dreiecks-Körper
    const body = new Konva.Line({
        points: [-triangleSize / 2, triangleHeight, triangleSize / 2, triangleHeight, 0, 0],
        closed: true,
        fill: isNav ? 'rgba(255, 255, 255, 0.18)' : 'rgba(200, 220, 255, 0.12)',
        stroke: null
    });
    group.add(body);

    // 5. Rahmen und Linien zeichnen
    const frameStrokeWidth = Math.max(2, pxPerCm * 0.05); // Skaliert die Strichstärke leicht mit
    const frameGap = Math.max(6, pxPerCm * 0.15);       // Skaliert die Lücke an der Null-Marke mit

    group.add(
        new Konva.Line({
            points: [-triangleSize / 2, triangleHeight, 0, 0],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [0, 0, triangleSize / 2, triangleHeight],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [-triangleSize / 2, triangleHeight, -frameGap, triangleHeight],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        }),
        new Konva.Line({
            points: [frameGap, triangleHeight, triangleSize / 2, triangleHeight],
            stroke: '#000000',
            strokeWidth: frameStrokeWidth,
        })
    );

    // 2. Parallele Hilfsstriche im Körper (wichtig für die Ausrichtung an Meridianen)
    if (isNav) {
        // Horizontale Parallellinien im Abstand von je 15 Pixeln
        for (let i = 1; i <= 6; i++) {
            let h = i * 22; // Abstand der Linien
            let w = triangleSize * (1 - (h / triangleHeight)); // Breite auf dieser Höhe berechnen
            let line = new Konva.Line({
                points: [-w / 2, triangleHeight - h, w / 2, triangleHeight - h],
                stroke: 'rgba(0, 0, 0, 0.2)',
                strokeWidth: 1
            });
            group.add(line);
        }
    }

    // 3. MATHEMATISCH PRÄZISE GRADSKALA (Halbkreis-Bogen)
    if (isNav) {
        // Der Radius des inneren Skalenbogens (ca. 80% der Dreieckshöhe)
        const scaleRadius = triangleHeight * 0.78 - (2 * pxPerCm);
        // Der mathematische Mittelpunkt des Bogens liegt auf dem roten Ankerpunkt (0, TRIANGLE_HEIGHT)
        const centerX = 0;
        const centerY = triangleHeight;

        // Dynamische Schriftgröße (ca. 3.5 mm)
        const dynamicFontSize = Math.max(10, pxPerCm * 0.35); 
        const majorStroke = Math.max(1.5, pxPerCm * 0.04); 
        const minorStroke = Math.max(1, pxPerCm * 0.02); 


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
                strokeWidth: isMajor ? majorStroke : minorStroke
            });
            group.add(tick);

            // Beschriftung bei den großen 10-Grad-Schritten hinzufügen
            if (isMajor) {
                // Berechne die zwei um 180° versetzten Kurswerte
                let innerCourse = angleDeg;          // Innere Skala (z.B. 10° bis 170°)
                let outerCourse = angleDeg + 180;    // Äußere Skala (z.B. 190° bis 350°)

                // Abstand zum Strich dynamisch an die Pixeldichte koppeln!
                // 0.6 * pxPerCm bedeutet: Der Text startet immer exakt 6 Millimeter außerhalb des Bogens.
                let textDist = scaleRadius + (pxPerCm * 0.6);
                
                let textX = centerX + textDist * cos;
                let textY = centerY - textDist * sin;

                // Formatierung der Beschriftung untereinander (z.B. "30\n210")
                let courseLabel = new Konva.Text({
                    x: textX,
                    y: textY,
                    text: `${innerCourse}\n${outerCourse}`,
                    fontSize: dynamicFontSize,
                    fontFamily: 'monospace',
                    fill: innerCourse <= 90 ? '#000000' : '#dc2626', // Farbliche Trennung (Schwarz/Rot)
                    align: 'center',
                    fontStyle: 'bold',
                    lineHeight: 1.1 // Verringert den Zeilenabstand leicht, damit die Zahlen kompakter stehen
                });
                
                // NEU: Exakte Zentrierung über Konvas echte Box-Abmessungen.
                // Da der Text zweizeilig ist, liest courseLabel.height() die Gesamthöhe beider Zeilen aus.
                courseLabel.offsetX(courseLabel.width() / 2);
                courseLabel.offsetY(courseLabel.height() / 2);
                
                // Text parallel zum Winkel mitdrehen
                courseLabel.rotation(90 - angleDeg);

                group.add(courseLabel);
            }
        }
    }

    // 4. Roter Präzisionspunkt exakt im Zentrum der Hypotenuse (Der absolute Nullpunkt/Anker)
    const centerDot = new Konva.Circle({
        x: 0,
        y: triangleHeight,
        radius: 5,
        stroke: '#ef4444',
        strokeWidth: 1.5,
        opacity: 0.9
    });
    group.add(centerDot);

    const centerPoint = new Konva.Circle({
        x: 0,
        y: triangleHeight,
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
        const sides = {
            hypotenuse: {
                start: { x: -triangleSize / 2, y: triangleHeight },
                end: { x: triangleSize / 2, y: triangleHeight },
            },
            legA: {
                start: { x: -triangleSize / 2, y: triangleHeight },
                end: { x: 0, y: 0 },
            },
            legB: {
                start: { x: 0, y: 0 },
                end: { x: triangleSize / 2, y: triangleHeight },
            },
        };
        const side = sides[sideName];

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
            const centroid = { x: 0, y: triangleHeight * 2 / 3 };
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
    group.offset({ x: 0, y: triangleHeight });
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
