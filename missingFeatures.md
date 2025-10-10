# Missing Features & Design Deviations Report

This document outlines features and behaviors from `legacy.html.old` that are missing or have been altered in the current `main` branch.

---

### ✅ Implemented / Ported Features

*   **Collapsible Subproofs:**
    *   **Status:** ✅ Implemented
    *   **Files:** `js/ui.js`, `css/style.css`
    *   **Description:** The UI supports collapsing and expanding subproofs, though the mechanism is different from legacy (it relies on toggling classes on child elements rather than modifying the header's content).

*   **Expanded Rule Set:**
    *   **Status:** ✅ Implemented
    *   **File:** `js/rules.js`
    *   **Description:** The rule set has been ported and expanded to a modular system in `rules.js`, including `MP`, `MT`, `DS`, `Add`, `Simp` (formerly ∧E), and `Conj` (formerly ∧I).

*   **Core Drag and Drop:**
    *   **Status:** ✅ Implemented
    *   **Files:** `js/drag-drop.js`, `js/ui.js`
    *   **Description:** Dragging variables, connectives, and proof lines is functional. Dropping items on the proof area, rule slots, and trash can is implemented.

*   **Feedback Navigation:**
    *   **Status:** ✅ Implemented
    *   **Files:** `js/ui.js`, `js/store.js`
    *   **Description:** The previous/next buttons for navigating feedback history are functional.

### 🟡 In-Progress / Partial Features

*   **WFF Constructor:**
    *   **Status:** 🟡 In Progress
    *   **Files:** `js/store.js` (`constructWff`), `js/drag-drop.js`
    *   **Description:** The basic logic for constructing formulas by dragging and dropping is in place and connected to the state manager. However, it may still have bugs and lacks the full robustness of the legacy version.

*   **Subproof Management:**
    *   **Status:** 🟡 In Progress / Design Deviation
    *   **File:** `js/proof.js`
    *   **Description:** Functions like `startRAA`, `startConditionalIntroduction`, `dischargeRAA`, and `dischargeCP` are implemented.
    *   **Deviation:** The legacy version would convert the `Show:` line into the proven line upon discharging a subproof. The current implementation adds a *new* line for the conclusion, which is a different user experience and may leave unproven `Show:` lines in the proof.
    *   **Potential Issue:** The `dischargeRAA` logic concludes `~assumption` rather than the original goal, which is a deviation from standard Reductio ad Absurdum.

### 🔴 Missing Features (Regressions from Legacy)



*   **Problem Loading from URL:**
    *   **Status:** 🔴 Missing
    *   **Description:** The legacy application could load a specific problem via URL query parameters (e.g., `?set=1&problem=2`). This feature is currently missing.

*   **Zoom Functionality:**
    *   **Status:** 🔴 Missing
    *   **Description:** The legacy version had two zoom features that are now absent:
        1.  Zoom in/out buttons for the WFF Output tray.
        2.  A double-click-to-zoom feature on the main game area.
