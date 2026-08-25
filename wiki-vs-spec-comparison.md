# User Manual Wiki vs. Navdesk Specification Comparison

**Generated:** 2026-08-25  
**Purpose:** Document discrepancies and new information between the user manual wiki page and `navdesk-spec.md` for manual review.

---

## Table of Contents

1. [Features in Wiki NOT in Spec](#1-features-in-wiki-not-in-spec)
2. [Discrepancies (Conflicting Information)](#2-discrepancies-conflicting-information)
3. [Features Consistent Across Both Documents](#3-features-consistent-across-both-documents)
4. [Actions Required](#4-actions-required)

---

## 1. Features in Wiki NOT in Spec

### 1.1 Rotate Map (Toolbar Item 2)

| Aspect | Wiki Description | Spec Status |
|--------|------------------|-------------|
| Feature | Rotates the map 90° clockwise per activation (three right-clicks = one left turn) | **Explicitly out of scope** - Line 438: "Card rotation is out of scope; the input scan, image, or PDF must already have the required orientation." |

**Action:** Either implement rotate functionality or remove from wiki documentation.

---

### 1.2 Granular Rotation Speeds (0.1° Fine-tuning)

| Step Size | Wiki Description | Spec Description (Lines 150, 202) |
|-----------|------------------|-------------------------------|
| Large | Right-click hold + mouse movement | Same (right-button drag uses `Math.atan2(dy, dx)`) |
| Medium | **[Shift] + Mouse wheel** = **1° steps** | Wheel input rotates in **0.5° reversible steps** |
| Fine | **Only Mouse wheel** = **0.1° steps** | Not mentioned; spec only describes 0.5° steps |

**Action:** Determine intended rotation precision and align both documents.

---

### 1.3 Eraser Limitation for Text Elements

| Aspect | Wiki Description | Spec Description (Line 178) |
|--------|------------------|----------------------------|
| Text/Labels | "Text elements cannot be erased with this tool." | "Erasing affects lines, arrows, circles, markers, **and labels**." |

**Action:** Decide whether labels should be erasable or protected, then update both documents.

---

### 1.4 UX Tips Not in Spec

| Wiki Information | Spec Coverage |
|------------------|---------------|
| Eraser: "Increase your zoom level if needed" for precision | No UX tip in spec (line 176-181 only covers algorithm) |
| Pan/Zoom: "(also per [Esc]-Taste)" | Spec mentions Escape returns to PAN_ZOOM (line 308) but wiki combines this with pan/zoom section header |

**Action:** Consider adding UX tips to spec for discoverability.

---

### 1.5 Visual Descriptions (Image References)

The wiki includes image assets showing:
- Navigation triangle active/inactive states
- Alignment triangle docking behavior  
- Compass cursor transformation ring

These visual references are described textually in the spec but the wiki provides concrete visual examples that could enhance the spec documentation.

**Action:** Consider adding ASCII diagrams or referencing image assets in spec.

---

## 2. Discrepancies (Conflicting Information)

### D1: Rotation Precision Mismatch

```
Wiki:    Medium = 1° steps, Fine = 0.1° steps
Spec:    0.5° reversible steps (single granularity)
```

**Location:**  
- Wiki: Section 6 (Nav Dreieck) and Section 8 (Zirkel)  
- Spec: Lines 150, 202

---

### D2: Card Rotation Scope Conflict

```
Wiki:    Item 2 - "Rotate Map" feature exists and is documented
Spec:    Line 438 - "Card rotation is out of scope"
```

**Location:**  
- Wiki: Section header "--- ### 2 Rotate Map ---"  
- Spec: Lines 431-439 (Explicitly Out of Scope)

---

### D3: Eraser Behavior for Labels

```
Wiki:    Text elements cannot be erased
Spec:    Labels are included in erasable objects (line 178)
```

**Location:**  
- Wiki: Section 14 (Radierer)  
- Spec: Lines 174-181

---

## 3. Features Consistent Across Both Documents

| Feature | Wiki Coverage | Spec Coverage | Status |
|---------|---------------|---------------|--------|
| Chart Import (Image + PDF) | Item 1 | Line 24 | Consistent |
| Overlay Export/Import | Items 3-4 | Lines 56, 348-370 | Consistent |
| Pan/Zoom Navigation | Item 5 | Lines 132-138 | Consistent |
| Navigation Triangle Geometry | Section 6 | Lines 76-98 | Consistent |
| Alignment Triangle | Section 7 | Lines 99-117 | Consistent |
| Active-Side Snapping | Section 7 | Lines 119-128 | Consistent |
| Compass Setup & Interaction | Section 8 | Lines 189-203 | Consistent |
| Drawing Tools (Lines, Arrows, Circles, Markers) | Items 9-12 | Lines 205-244 | Consistent |
| Text Labels | Item 13 | Line 238-242 | Consistent |
| Eraser Tool | Item 14 | Lines 174-181 | **See D3** |
| Notes Panel | Item 15 | Lines 258, 373-380 | Consistent |
| Reset Function | Item 16 | Lines 246-250 | Consistent |

---

## 4. Actions Required

### Priority 1: Resolve Conflicts

1. **[ ] Rotation Precision** - Decide whether to implement single 0.5° granularity (spec) or multi-granular 1°/0.1° steps (wiki)
2. **[ ] Card Rotation Feature** - Either implement Item 2 or remove it from wiki
3. **[ ] Label Erasure** - Decide if labels should be erasable or protected

### Priority 2: Enhance Documentation

4. **[ ] Add UX Tips** - Consider adding zoom-level hints for eraser precision in spec
5. **[ ] Visual References** - Evaluate whether to embed image references in spec for complex tools (triangles, compass)

### Priority 3: Alignment Review

6. **[ ] Verify Implementation Matches One Source of Truth** - After resolving conflicts, ensure code matches the chosen specification

---

## Appendix: Wiki Section Mapping

| Wiki Item | Spec Equivalent | Notes |
|-----------|-----------------|-------|
| 1. Karte laden | Lines 24-25, 54 | Consistent |
| 2. Rotate Map | **Line 438 (out of scope)** | Conflict |
| 3. Overlay exportieren | Lines 56, 348-370 | Consistent |
| 4. Overlay importieren | Lines 56, 348-370 | Consistent |
| 5. Pan/Zoom | Lines 132-138, 306-321 | Consistent (Esc noted in both) |
| 6. Nav Dreieck | Lines 76-98, 140-149 | Rotation step **D1** |
| 7. Anlegedreieck | Lines 99-117, 152-172 | Consistent |
| 8. Zirkel | Lines 189-203 | Rotation step **D1** |
| 9-12. Zeichenvorgänge | Lines 205-244 | Consistent |
| 13. Text | Lines 238-242 | Consistent |
| 14. Radierer | Lines 174-181 | Eraser behavior **D3** |
| 15. Notizen | Lines 258, 373-380 | Consistent |
| 16. Reset | Lines 246-250 | Consistent |
