# Modal Logic UI/UX Design Suggestions

This document outlines a proposed UI/UX design for incorporating modal logic systems (K, D, T, B, S4, S5) into the natural deduction tool, focusing on a drag-and-drop-centric interface.

---

### 1. System Selection

A dropdown menu should be added to the main UI, likely near the problem description, to allow users to select the active modal system.

*   **UI Element:** A `<select>` dropdown menu.
*   **Label:** "Modal System"
*   **Options:** K, D, T, B, S4, S5
*   **Behavior:**
    *   The default system should be **T**.
    *   Changing the system will dynamically update the available inference rules and the drag-and-drop behavior for strict subproofs.
    *   The currently selected system should be clearly visible.

---

### 2. Strict Subproofs ("Boxed" Subproofs)

A new UI element is required to initiate a strict subproof for the purpose of **Necessity Introduction (`□I`)**.

*   **UI Element:** A "New Strict Subproof" button in the subproofs area, or a draggable "Box" item.
*   **Visual Representation:**
    *   A strict subproof should be visually distinct from regular subproofs. A solid, "boxed" border (e.g., a double border or a thicker, darker border) is recommended.
    *   The background color of the strict subproof should be slightly different from the main proof area.
*   **Functionality:**
    *   When a new strict subproof is created, it appears as an empty box with a placeholder for the first line.
    *   The subproof is "discharged" or "closed" by deriving a formula `φ` inside it. A "Discharge" or "Close" button on the subproof container would then allow the user to add `□φ` to the parent proof.

---

### 3. Inference Rules

The new modal inference rules should be added to the existing "Inference Rules" panel.

*   **UI Elements:** New draggable rule items for:
    *   **(D):** `□φ ⊢ ◊φ`
    *   **(T):** `□φ ⊢ φ`
    *   **(B):** `φ ⊢ □◊φ`
    *   **(4):** `□φ ⊢ □□φ`
    *   **(5):** `◊φ ⊢ □◊φ`
*   **Behavior:** These rules will be enabled or disabled based on the selected modal system from the dropdown. For example, selecting "S4" would show the rules for T and rule (4), but not B or 5.

---

### 4. Drag-and-Drop Importation for Strict Subproofs

This is the most critical part of the UI design. The system must provide clear visual feedback to the user about what can and cannot be imported into a strict subproof.

#### Visual Feedback during Drag Operations:

*   **Valid Drop Target:** When dragging a formula that can be legally imported into a strict subproof, the subproof area should be highlighted with a welcoming color (e.g., a green border glow).
*   **Invalid Drop Target:** If the formula cannot be imported, the subproof area should either not be highlighted, or be highlighted with a "disabled" or "error" state (e.g., a red border glow).
*   **Formula Transformation Preview:** When hovering over a valid strict subproof drop target, a "ghost" or preview of the resulting formula should appear at the drop location. This is crucial for systems like K and T, where `□φ` becomes `φ`.

#### Drag-and-Drop Behavior Summary:

| System | Formula Being Dragged | Hovering over Strict Subproof | Result on Drop |
| :--- | :--- | :--- | :--- |
| **All** | Any premise or non-modal formula `φ` | Invalid Target (Red Glow) | Drop is rejected. |
| **K, D, T, B** | `□φ` | Valid Target (Green Glow), Preview shows `φ` | A new line with `φ` is created inside the subproof. |
| **S4** | `□φ` | Valid Target (Green Glow), Preview shows `□φ` | A new line with `□φ` is created inside the subproof. |
| **S5** | `□φ` | Valid Target (Green Glow), Preview shows `□φ` | A new line with `□φ` is created inside the subproof. |
| **S5** | `◊φ` | Valid Target (Green Glow), Preview shows `◊φ` | A new line with `◊φ` is created inside the subproof. |

By implementing these UI/UX features, the tool will provide an intuitive and visually informative way for users to engage with the complexities of modal logic.
np