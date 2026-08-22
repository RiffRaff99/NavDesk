# Navdesk Specification

## Context and Objective

Navdesk is a browser-based digital chart table for nautical navigation exercises, especially the German Sportbootfuehrerschein See (SBF See). It provides an interactive chart, transparent virtual navigation tools, drawing tools, and viewport controls without damaging a physical chart table.

The application is a single-page app. The HTML entry point is `index.html`. JavaScript files are loaded in this order:

1. `js/tailwind.js`
2. `js/konva.min.js`
3. PDF.js from the CDN
4. `js/triangles.js`
5. `js/zirkel.js`
6. `js/drawingTools.js`
7. `js/router.js`
8. `js/i18n.js`
9. `js/app.js`
10. `js/eventListeners.js`

## Viewport and Chart

- The Konva stage fills the browser viewport.
- The chart is rendered in a base layer; tools and drawings are rendered in a separate tool layer.
- The user can import raster images and PDF files through the `Karte laden` control. For PDFs, page 1 is rendered as an image by PDF.js. If PDF.js is unavailable, the PDF is loaded through the browser file reader fallback.
- Importing a new chart removes the previous chart tools and drawings, centers the new chart in the viewport, and resets the stage scale to 1.
- The stage supports panning with left-button drag in `PAN_ZOOM` when no tool interaction consumes the pointer event.
- The mouse wheel zooms around the current pointer position. Zoom changes use a factor of 1.1 or its inverse after accumulated wheel movement reaches the threshold of 5 wheel units.
- The chart and all chart-space tools scale together because tools are children of the same transformed Konva stage.
- Pointer coordinates are converted from screen space into chart space through the inverse stage transform before chart-space placement, snapping, and drawing.
- Window resize updates the stage dimensions without changing the chart transform.
- Browser context menus are suppressed on the stage. In `PARALLEL` and `ALIGN_ACTIVE`, a context-menu event also cancels the active tool selection and returns to `PAN_ZOOM`.

## Application State

The central `appState` contains:

- `stage`: the Konva stage
- `baseLayer`: the chart layer
- `toolLayer`: the tool and drawing layer
- `mode`: the current canonical interaction mode
- `activeTool`: the triangle or compass currently being manipulated
- `navTriangle`: the navigation triangle (NT)
- `alignTriangle`: the alignment triangle (AT)
- `compass`: the compass tool
- `compassCursor`: the precision cursor marker used during compass setup or attachment
- `drawings`: persistent line, arrow, circle, marker, and label collections
- `drawingStart` and `drawingPreview`: temporary drawing state
- `chartImage`: the current chart image

The public application API is:

- `app.importImage(file)`: import an image or PDF
- `app.setMode(modeName)`: activate a tool or canonical mode
- `app.reset()`: remove all tools and drawings and return to `PAN_ZOOM`

## Canonical Modes

- `PAN_ZOOM`: chart navigation and neutral interaction
- `NAV_ACTIVE`: NT follows the cursor for placement and rotation
- `ALIGN_ACTIVE`: AT follows the cursor for placement and active-side selection
- `COMPASS_ACTIVE`: compass setup or attached movement
- `PARALLEL`: one selected tool is shifted along its allowed movement direction
- `LINE_ACTIVE`: two-click line drawing
- `ARROW_ACTIVE`: two-click arrow drawing
- `CIRCLE_ACTIVE`: center-radius circle drawing
- `MARKER_ACTIVE`: center-radius marker drawing
- `LABEL_ACTIVE`: one-click text-label placement

The router accepts short aliases such as `nav`, `align`, `compass`, `line`, `arrow`, `circle`, `marker`, `label`, `pan`, and `parallel`.

## Navigation Triangle (NT)

### Geometry

- The NT is an isosceles triangle with a 90-degree angle at the apex.
- The nominal size is approximately 496 px, with a height of approximately 248 px.
- The transparent body uses `rgba(255, 255, 255, 0.18)`.
- The outline is black with 2 px strokes. The lower frame is split around the anchor marker so the black line does not pass through the marker.
- Six horizontal parallel helper lines are drawn inside the NT at 22 px intervals.
- The rotation origin is the midpoint of the hypotenuse.
- The marker at the active side is a hollow red ring with a very small filled red center point of approximately 1 px diameter. It is an alignment aid, not a replacement for the browser pointer.

### Course Scale

- The NT contains a semicircular course scale from 5 to 175 degrees in 1-degree increments.
- The scale center is the hypotenuse midpoint.
- The radius is approximately `TRIANGLE_HEIGHT * 0.78 - 2cm`, about 151 px at the nominal size, so the scale stays inside the enlarged triangle.
- Major ticks occur every 10 degrees and are 14 px long with 1.5 px strokes.
- Medium ticks occur every 5 degrees and are 9 px long.
- Minor ticks are 5 px long.
- Each major tick displays the paired course values separated by 180 degrees, for example `30` and `210`.
- The horizontal scale orientation matches a real navigation triangle: with 90 degrees pointing up, 10/190 degrees are on the right and 170/350 degrees are on the left.

## Alignment Triangle (AT)

### Geometry and Active Side

- The AT has the same triangle dimensions as the NT and uses `rgba(200, 220, 255, 0.12)`.
- It has no course scale and no parallel helper lines.
- Its possible active sides are `hypotenuse`, `legA`, and `legB`.
- The active side is the side nearest to the pointer while the AT is in `ALIGN_ACTIVE`; hovering changes the active side.
- The red ring and small center point identify the midpoint of the active side.
- The 90-degree angle is visually oriented away from the NT when the AT is snapped. The hypotenuse uses the required 180-degree visual correction.

### AT Activation and Placement

- Selecting AT from the toolbar creates or reuses an AT and enters `ALIGN_ACTIVE`.
- The AT follows the pointer before placement, even if no NT exists.
- Its existing rotation is preserved when it is activated.
- A left click places the AT. If the active AT side is within 5 screen pixels of an NT edge, it snaps to that finite edge and becomes constrained. Otherwise it is placed freely.
- Before snapping, the AT can be moved freely in both axes.
- After snapping, the AT can only be shifted parallel to the active NT edge.

## Active-Side Snapping and Constraints

- NT and AT each maintain an active side, a constrained flag, the other triangle as constraint partner, and the partner side name.
- Snap tolerance is measured in screen pixels and converted through the current stage scale, so the tolerance remains 5 screen pixels at every zoom level.
- Snapping uses the nearest point on a finite NT or AT edge, not an infinite line extension.
- AT-to-NT snap aligns the active AT side parallel to the nearest NT edge and places the active-side marker at the nearest point.
- NT-to-AT snap performs the inverse operation: the hovered NT side is aligned parallel to the active AT side and the NT marker is placed at the nearest AT point.
- A successful snap stores the two-way constraint relationship.
- A missed snap leaves the triangle free and clears stale constraint data on both triangles.
- Changing the active side through hover does not alter the current triangle angle unless snapping requires alignment.

## Interaction Modes

### `PAN_ZOOM`

- Wheel input zooms the chart around the pointer.
- Left-button drag on empty chart space pans the stage.
- Left-click on a tool begins interaction with that tool.
- Double-click on NT activates `NAV_ACTIVE`, preserves the NT rotation, and does not remove or move the AT.
- Double-click on AT activates `ALIGN_ACTIVE` and preserves the AT rotation.

### `NAV_ACTIVE`

- NT is visible and follows the pointer without a button being held.
- The nearest NT side under the pointer becomes active and its marker is kept at the pointer.
- If an AT exists, the nearest AT side under the pointer is also updated as the potential snap target.
- Left click places the NT and enters `PARALLEL`.
- If the hovered NT side is within 5 screen pixels of an AT edge, the NT snaps to the AT and both constraint records are stored.
- If no snap occurs, the NT remains freely movable.
- Right-button drag rotates the NT using the pointer displacement angle from `Math.atan2(dy, dx)`, while preserving the rotation at the start of the gesture.
- Releasing the right button leaves the NT in its current mode and does not delete it.
- Wheel input rotates the NT in reversible 0.5-degree steps instead of zooming.

### `ALIGN_ACTIVE`

- AT is visible and follows the pointer.
- Hover chooses the nearest AT side and moves the active-side marker to the pointer.
- A nearby NT edge is previewed as a parallel alignment.
- Left click places the AT and enters `PARALLEL`.
- Right-click does not change the active side; active-side selection is pointer-hover based.
- Wheel input uses normal chart zoom unless another mode consumes it.

### `PARALLEL`

- `activeTool` identifies the only triangle that moves; the other triangle remains fixed as a reference.
- A left-button drag on the active tool begins or continues the shift.
- A standalone NT moves freely in both axes.
- A standalone, unsnapped AT moves freely in both axes.
- An NT constrained to an AT moves only along the active AT side.
- An AT constrained to an NT moves only along the active NT side.
- Movement is calculated as the projection of pointer displacement onto the permitted axis; perpendicular movement is ignored for constrained tools.
- Constrained movement preserves the current rotation.
- Pointer release ends only the current drag. The mode and tools remain available.
- Right-click/context-menu exits `PARALLEL` and returns to `PAN_ZOOM`; the tools remain visible.

### Double-Click Rules

- Double-click NT activates the same free-positioning behavior as the NT toolbar command, but preserves the already configured rotation and keeps AT intact.
- Double-click AT activates the same free-positioning behavior as the AT toolbar command, but preserves the already configured rotation.
- The active side is recalculated from the pointer hover after either activation.

## Compass (Zirkel)

- The compass toolbar button toggles the compass tool on and off.
- First left click defines leg 1.
- Pointer movement displays a precision cursor and previews the span.
- Second left click defines leg 2 and fixes the span.
- The fixed span remains unchanged while the compass is moved or rotated.
- The closed hinge end has a 1 px chart-space interaction point for precise placement and attachment. Its hit area may be larger for practical pointer use, but the visual point remains 1 px.
- Compass interaction states are explicitly distinguishable: span setup, fixed span, attached movement, and placed compass.
- After the span is fixed, left-clicking the compass attaches it to the pointer; another left click places it.
- While attached inside the chart, right-button drag rotates freely using the pointer displacement angle.
- While attached outside the chart, the compass automatically uses the nearest chart edge and snaps to a right angle. The closed end points toward the chart, so no outside-chart image area is needed for the working alignment.
- A right click outside the chart while attached does not accidentally place the compass.
- Wheel input while attached rotates the compass in reversible 0.5-degree steps instead of zooming.
- Pointer release ends rotation or dragging without deleting the compass.

## Drawing Tools

All drawing objects are chart-space objects, remain at the chart location while the viewport pans or zooms, and are non-interactive after creation.

### Line

- In `LINE_ACTIVE`, the first left click stores the start point.
- Pointer movement previews a straight line.
- The second left click fixes the line.
- Completed lines remain and multiple lines are supported.

### Arrow

- In `ARROW_ACTIVE`, the first left click stores the start point.
- Pointer movement previews a line.
- The second left click fixes the line and adds a red arrowhead at the endpoint.
- Multiple arrows are supported.

### Circle

- In `CIRCLE_ACTIVE`, the first left click defines the center.
- Pointer movement previews the radius from that center.
- The second left click fixes the circle.
- The radius is at least 1 chart-space unit.
- Completed circles remain and multiple circles are supported.

### Marker

- In `MARKER_ACTIVE`, the first left click defines the center.
- Pointer movement previews the radius.
- The second left click fixes a blue circle with a blue cross at its center.
- Multiple markers are supported.

### Label

- In `LABEL_ACTIVE`, one left click opens a text prompt.
- Non-empty input creates a label at the clicked chart position.
- Multiple labels are supported.

Switching drawing tools preserves all completed drawing objects. Reset removes them.

## Reset

- Reset removes the AT, NT, compass, compass cursor, all completed drawings, and temporary drawing preview state.
- Reset clears the active tool and returns to `PAN_ZOOM`.
- Importing a new chart performs the same tool-layer cleanup before displaying the new chart.

## User Interface

- A fixed top toolbar contains chart import, NT, AT, compass, line, arrow, circle, marker, label, status, and reset controls.
- The file input accepts image files and PDFs and is hidden behind the chart-load control.
- Active tool buttons receive the `tool-active` visual state according to the canonical mode.
- A status display shows the current localized interaction state.
- The page uses a full-viewport canvas with a dark background and prevents browser text selection during chart interaction.

## Localization

- All user-facing labels and status messages are stored in the central `i18n.dict` object.
- German (`de`) is the default language; English (`en`) is supported.
- `i18n.t(key)` returns the localized value with German fallback.
- `i18n.apply()` maps dictionary keys to toolbar element IDs.
- `i18n.setLang(lang)` changes the active language and reapplies the UI labels.

## Product Roadmap

Navdesk remains a simulator for practicing nautical chart-work concepts. It does not replace training with a real paper chart and real navigation instruments, and it does not provide an examination mode. Each roadmap item should be developed on its own feature branch, reviewed locally, and merged to `main` as a focused commit or small commit series.

### Git Workflow

- `main` contains the latest integrated, usable version.
- Each feature starts from `main` in a branch named `feature/<short-name>`.
- Documentation-only changes use `docs/<short-name>`.
- A feature branch should contain logically grouped commits, for example implementation, UI wiring, and documentation.
- Do not combine unrelated roadmap items in one commit.
- Merge or fast-forward only after the feature's focused checks are complete.
- Later beta work may add release tags such as `v0.2.0` and `v1.0.0`.

### Release 0.2: Precision and Basic Interaction

#### Branch: `feature/compass-precision` (implemented)

1. **Compass handling**
	- Add a one-pixel visual and precision interaction handle at the closed end.
	- Improve visual feedback for span definition, attachment, placement, and edge alignment.
	- Preserve precise pointer-based operation for extracting values from the chart.
	- Keep the compass span fixed while moving or rotating.

Suggested commits:

- `Add compass interaction handle`
- `Improve compass state feedback`
- `Document compass precision behavior`

Implemented commits on this branch:

- `0a95e00 Document compass precision milestone`
- `Add compass precision handle and states`

#### Branch: `feature/pan-zoom-mode` (implemented)

2. **Dedicated Pan/Zoom mode**
	- Add a clearly visible default Pan/Zoom toolbar button.
	- Pressing `Escape` always returns to `PAN_ZOOM`.
	- Leaving drawing and tool modes must be unambiguous.
	- Preserve the current chart, tool, and drawing state when only the mode changes.
	- Switching to `PAN_ZOOM` must not delete or reposition existing tools or drawings.

Suggested commits:

- `Add Pan Zoom toolbar mode`
- `Return to Pan Zoom on Escape`
- `Document default navigation mode`

Implemented commit on this branch:

- `4eb9f6f Add dedicated Pan Zoom mode`

#### Branch: `feature/eraser`

3. **Eraser**
	- Add an eraser mode for drawing objects.
	- Delete the nearest line or element only when it is within 2 screen pixels of the pointer.
	- Keep the tolerance constant at every zoom level by converting the screen-space tolerance to chart space.
	- Support lines, arrows, circles, markers, and labels.
	- Define deterministic behavior for overlapping objects, preferably nearest visible object first.
	- Keep NT, AT, and compass deletion protected; these remain removable through Reset only.

Suggested commits:

- `Add screen-space eraser hit testing`
- `Connect eraser to drawing objects`
- `Document eraser interaction rules`

### Release 0.3: Portable Exercise Overlays

#### Branch: `feature/json-overlay`

4. **JSON overlay export and import**
	- Export and import the current exercise state as a JSON file managed by the user's file system.
	- The user opens the chart first and then imports its overlay.
	- Never embed or copy the chart image into the JSON file.
	- Store exactly these user-facing metadata fields: exercise number, notes, and chart source.
	- Store technical state required for restoration: format version, export timestamp, NT/AT position and rotation, active sides, snap relationships, compass position, rotation and span, drawings, and labels.
	- Display the stored chart filename or source as a compatibility hint.
	- Warn when the current chart differs from the overlay metadata, but do not require local path matching.
	- Let the user rename, copy, archive, and delete overlay files in the operating system.

Suggested commits:

- `Define versioned overlay schema`
- `Export chart overlay as JSON`
- `Import overlay onto open chart`
- `Add exercise notes and chart metadata`
- `Document overlay file workflow`

### Release 0.4: OpenSeaMap Experimentation

#### Branch: `feature/openseamap-source`

5. **Optional OpenSeaMap mode**
	- Provide an optional low-cost or no-paywall way to experiment with chart-work exercises.
	- Do not bundle copyrighted SBF examination charts.
	- Verify the current OpenStreetMap, OpenSeaMap, tile-provider, and attribution requirements before implementation.
	- Display source, attribution, license information, and retrieval date where required.
	- Check whether the available chart content supports the relevant exercise objects and visual references.
	- Keep externally sourced maps and user-provided maps separate from overlay data.
	- Do not add automatic course calculation, GPS assistance, or other digital navigation aids.

Suggested commits:

- `Document OpenSeaMap licensing requirements`
- `Add optional OpenSeaMap chart source`
- `Add map attribution display`
- `Document external chart source behavior`

### Later: Beta and Production Quality

#### Branches: `qa/<short-name>` and `release/<version>`

6. **Quality assurance**
	- Add repeatable integration tests for the complete Exercise 1 workflow.
	- Test snap tolerances in screen pixels across zoom levels.
	- Test pan, zoom, pointer precision, compass states, erasing, and JSON round trips.
	- Check behavior with mouse, trackpad, and touch input where supported.
	- Add regression coverage only when the project is shared with external users.

7. **Beta and production preparation**
	- Add issue reporting, compatibility documentation, release notes, and regression coverage.
	- Review privacy, licensing, attribution, and offline behavior before production release.
	- Use release tags and keep `main` deployable.

### Existing Snap Behavior

Snap-up is not a separate roadmap feature. A double-click on NT or AT already returns that triangle to its active positioning mode while preserving its rotation, so the user can move it away from the current relationship and effectively release the snap. The implementation must continue to clear stale constraint state when a snap is missed or released.

### Explicitly Out of Scope

- No examination or certification mode is planned.
- No permanent GPS, automatic course calculation, or other digital navigation aid is added to the simulator.
- No copyrighted examination charts are distributed with Navdesk.
- No internal overlay library or session-management database is required initially; the user's file system manages exported JSON overlays.
- Undo and redo are out of scope for the foreseeable roadmap.
- Card rotation is out of scope; the input scan, image, or PDF must already have the required orientation.
- A separate chart-scale calibration feature is out of scope; the loaded chart image defines the working scale for the paper-chart simulation.

### Priority Order

1. Compass precision and handling
2. Pan/Zoom mode and `Escape` handling
3. Eraser
4. JSON overlay import/export with exercise number, notes, and chart source
5. Optional OpenSeaMap chart source
6. QA, beta, and production preparation
