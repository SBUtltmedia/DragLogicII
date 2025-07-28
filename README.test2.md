# Drag Logic II - Interactive Logic Prover (Test Version 2)

---

## 📁 File Structure

```
drag-logic-ii/
├── css/
│   └── [style.css](css/style.css)   # 1150-line CSS with theme styles
├── js/
│   ├── [drag-drop.js](js/drag-drop.js)     # Drag-and-drop manager (L349-667)
│   ├── [globals.js](js/globals.js)         # Global variables (L310-325)
│   ├── [main.js](js/main.js)               # Entry point (L386-456)
│   ├── [parser.js](js/parser.js)           # Formula parsing logic
│   ├── [problems.js](js/problems.js)       # Problem set management
│   ├── [proof.js](js/proof.js)             # Core proof engine
│   ├── [rules.js](js/rules.js)             # Rule application functions (L751-1106)
│   ├── [tutorial.js](js/tutorial.js)       # Tutorial system
│   └── [ui.js](js/ui.js)                   # UI interaction handlers
├── [index.html](index.html)         # Main application entry point
└── README.test2.md                  # This document
```

---

## 🔄 JavaScript Module Overview

### 🛠 Core Functionality Modules

1. **[drag-drop.js](js/drag-drop.js)**  
   Manages drag-and-drop interactions (L349-667)  
   Key functions:  
   ```javascript
   function createDragOverHandler()
   function createDragLeaveHandler()
   function setupProofLineDragging()
   ```

2. **[globals.js](js/globals.js)**  
   Global variable declarations (L310-325)  
   Key exports:  
   ```javascript
   let gameWrapper, wffOutputTray, proofList, nextLineNumberGlobal
   ```

3. **[main.js](js/main.js)**  
   Application initialization (L386-456)  
   Entry point:  
   ```javascript
   function initGame()
   ```

4. **[proof.js](js/proof.js)**  
   Core proof engine (1400+ lines)  
   Key functions:  
   ```javascript
   function addProofLine()
   function checkAndHandleMainGoalCompletion()
   ```

5. **[rules.js](js/rules.js)**  
   14 rule application functions (L751-1106)  
   Implemented rules:  
   ```javascript
   function attemptAutoModusPonens()
   function attemptAutoContradictionIntroduction()
   ```

---

## 🧪 Implementation Highlights

1. **Drag-and-Drop System**  
   Implemented in `drag-drop.js` with:
   - Custom drag handlers (L367-383)
   - Proof line drag-and-drop (L603-667)
   - WFF manipulation (L505-517)

2. **Proof Validation**  
   Core logic in `proof.js` includes:
   - Line addition system (L869-912)
   - Subproof management (L924-967)
   - Goal completion checking (L914-922)

3. **Rule Application**  
   The 14 rule implementation functions in `rules.js`:
   - Modus Ponens/Tollens (L751-785)
   - Connective rules (L787-853)
   - Subproof handling (L855-866)

---

## ✅ Status

This document provides a detailed view of the modular architecture. Key improvements include:
- Accurate representation of JavaScript file structure
- Specific implementation details for each module
- Code references with line numbers for key functions
- Logical grouping of related functionality

The file has been created at `Drag_Logic_II/README.test2.md`. Would you like me to:
1. Add specific implementation examples from individual files?
2. Include visual diagrams of the module relationships?
3. Compare this version with the original README.md?
4. Convert this to the final README.md format?