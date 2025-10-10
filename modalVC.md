# Modal Logic: Model and Controller Implementation Plan

This document provides a developer-focused plan for implementing modal logic systems. The primary architectural principle is the strict separation of the Model (the logical state and data, primarily ASTs) from the View and Controller logic.

---

### Analysis of the Existing Codebase Philosophy

After reviewing `js/store.js`, `js/proof.js`, and `js/ui.js`, the existing codebase **does align well** with the philosophy of separating the model from the view.

*   **The Model (`store.js`):** The Zustand store is the single source of truth. It stores the proof state, including `proofLines`, `premises`, and the `goalFormula`. Crucially, the `formula` property within these objects is consistently stored as an **AST (Abstract Syntax Tree)**. There are no instances of HTML strings or other view-specific data being stored in the model. This is excellent practice.

*   **The Controller (`proof.js`, `rules.js`):** These files contain the core logic for manipulating the model. They take data from the store, perform logical operations (e.g., `applyRule`, `addProofLine`), and then update the store. They do not directly manipulate the DOM.

*   **The View (`ui.js`):** This file is responsible for rendering the state from the store into the DOM. It reads from the store and uses functions like `renderProofLines` to generate the UI. It communicates user actions to the controller via an `EventBus` or by directly calling controller functions, but it does not contain core logical rules.

This separation makes the codebase robust and easier to extend. The following plan for modal logic will adhere to and build upon this existing architecture.

---

### 1. Model Changes (`store.js`)

The following additions are needed to the state managed by Zustand:

1.  **`activeModalSystem`**: A new string property to track the currently selected modal system.
    ```javascript
    // In initialState
    activeModalSystem: 'T', // Default to T
    ```

2.  **`subGoalStack` Enhancement**: The objects within the `subGoalStack` array need a new boolean property to distinguish strict subproofs.
    ```javascript
    // Example of a strict subproof object in the stack
    {
        type: 'Strict',
        isStrict: true, // The key differentiator
        scopeLevel: 2,
        // ... other properties as needed
    }
    ```

3.  **New Action: `setActiveModalSystem`**: A new action to update the active system.
    ```javascript
    // In the store definition
    setActiveModalSystem: (system) => set({ activeModalSystem: system }),
    ```

---

### 2. Controller Changes (`proof.js` & `rules.js`)

The controller logic will be updated to handle the new modal features.

#### `rules.js`

1.  **Expand `ruleSet`**: Add the new modal rules (D, T, B, 4, 5) to the `ruleSet` object. These are standard inference rules and can be implemented similarly to the existing rules.

2.  **Rule Availability**: The `getRuleSet` function could be modified to filter the rules based on the `activeModalSystem` from the store, or this logic can be handled in the UI when rendering the rules.

#### `proof.js`

1.  **`startStrictSubproof()`**: A new exported function to initiate a strict subproof. This function will:
    *   Get the current `scopeLevel` from the store.
    *   Call the `startSubproof` action in the store, passing a new subproof object with `isStrict: true`.

2.  **`addProofLine()` Modification**: This is the most critical change. The `addProofLine` function must be updated to enforce the importation rules.
    *   Before adding a line, it needs to check if the target `scopeLevel` is within a strict subproof.
    *   If it is, it must check the `activeModalSystem` from the store and the formula being added to see if it complies with the importation rules for that system.
    *   The logic would look something like this:

    ```javascript
    // Inside addProofLine, before adding the line
    const { subGoalStack, activeModalSystem } = store.getState();
    const targetSubproof = subGoalStack.find(sp => sp.scopeLevel === scopeLevel);

    if (targetSubproof && targetSubproof.isStrict) {
        // This is where the importation logic goes.
        // It will be a switch statement or a series of if/else checks
        // based on activeModalSystem.
        // If the import is valid, the formula may need to be transformed
        // (e.g., stripping the '□' for systems K, T, B).
        // If invalid, it should show feedback and return null.
    }
    ```

3.  **`dischargeStrictSubproof()`**: A new function to handle the `□I` rule. It will:
    *   Check that the last derived formula `φ` in the strict subproof is valid.
    *   End the subproof by calling `endSubproof()`.
    *   Call `addProofLine()` to add `□φ` to the parent scope.

---

### 3. UI and View Interaction (`ui.js` & `drag-drop.js`)

From a developer's perspective, the UI's role is to trigger controller actions and render the state. It should not contain any core logic.

*   **System Selection Dropdown:** The `onChange` event of the dropdown will call the `setActiveModalSystem` action in the store.

*   **"New Strict Subproof" Button:** The `onClick` event will call the `startStrictSubproof()` function in `proof.js`.

*   **Drag-and-Drop (`drag-drop.js`):** The `handleDropOnProofArea` function will be the primary point of interaction for importation.
    *   It will **not** contain the importation logic itself.
    *   Instead, it will simply get the data from the drop event (the formula being dragged, the target scope) and call `addProofLine()`.
    *   `addProofLine` (in `proof.js`) will be responsible for validating the drop according to the modal logic rules.

*   **Visual Feedback:** The UI can read the `activeModalSystem` and `subGoalStack` from the store during a drag operation to determine if a drop target is valid and what the formula preview should be. This keeps the rendering logic in the view and the validation logic in the controller.
