import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';
import { setDragData, handleGenericDragEnd, handleDragStartProofLine } from './drag-drop.js';

// --- Helper Functions ---
export function isNegationOf(f1, f2) {
    const ast1 = LogicParser.textToAst(f1);
    const ast2 = LogicParser.textToAst(f2);
    if (!ast1 || !ast2) return false;

    return (ast1.type === 'negation' && LogicParser.areAstsEqual(ast1.operand, ast2)) ||
           (ast2.type === 'negation' && LogicParser.areAstsEqual(ast2.operand, ast1));
}

function isAssumption(lineItem) { 
    return lineItem && lineItem.dataset.isAssumption === 'true'; 
}

// --- Proof Line Management ---

/**
 * Creates a new proof line object and adds it to the store.
 * This is the single, authoritative way to add a line to the proof.
 * @returns {object} The line data object that was created.
 */
export function addProofLine(formula, justification, scopeLevel, isAssumptionFlag = false, isShowLineFlag = false) {
    const { nextLineNumberGlobal, subGoalStack, proofLines, currentScopeLevel } = store.getState();
    
    let formulaAst;
    let cleanFormula;
    let formulaForParsing;

    if (typeof formula === 'string') {
        cleanFormula = formula.trim();
        if (isShowLineFlag) {
            formulaForParsing = cleanFormula.replace(/^Show:\s*/i, '');
        } else {
            formulaForParsing = cleanFormula;
        }
        formulaAst = LogicParser.textToAst(formulaForParsing);
    } else {
        formulaAst = formula;
        cleanFormula = LogicParser.astToText(formulaAst);
    }

    // Prevent adding duplicate proven lines in the same scope
    if (!isShowLineFlag && !isAssumptionFlag) {
        const existingLines = proofLines.filter(line => line.scopeLevel === scopeLevel && line.isProven);
        for (const line of existingLines) {
            const existingAst = line.formula;
            if (existingAst && formulaAst && LogicParser.areAstsEqual(existingAst, formulaAst)) {
                EventBus.emit('feedback:show', { message: "This line already exists and is proven in the current scope.", isError: true });
                return null;
            }
        }
    }

    let displayLineStr, dataLineId;
    if (scopeLevel === 0) {
        displayLineStr = `${nextLineNumberGlobal}.`;
        dataLineId = `${nextLineNumberGlobal}`;
        store.getState().setNextLineNumber(nextLineNumberGlobal + 1);
    } else {
        const activeSubProof = { ...subGoalStack[subGoalStack.length - 1] };
        if (!activeSubProof) {
            EventBus.emit('feedback:show', { message: "Proof Error: No active subproof!", isError: true });
            return null;
        }
        const subLetter = String.fromCharCode(activeSubProof.subLineLetterCode);
        displayLineStr = `${activeSubProof.parentLineDisplay}.${subLetter}`;
        dataLineId = displayLineStr;

        const newSubGoalStack = [
            ...subGoalStack.slice(0, subGoalStack.length - 1),
            { ...activeSubProof, subLineLetterCode: activeSubProof.subLineLetterCode + 1 }
        ];
        store.getState().updateSubGoalStack(newSubGoalStack);
    }

    const lineData = {
        lineNumber: dataLineId,
        formula: formulaAst,  // Store the AST instead of text string for consistent internal operations
        justification,
        scopeLevel,
        isAssumption: isAssumptionFlag,
        isShowLine: isShowLineFlag,
        isProven: !isShowLineFlag && !isAssumptionFlag,
        subproofId: isShowLineFlag ? `subproof-${dataLineId.replace(/\./g, '-')}` : null,
        parentSubproofId: scopeLevel > 0 ? subGoalStack[subGoalStack.length - 1]?.subproofId : null
    };

    store.getState().addProofLine(lineData);
    if (checkWinCondition()) {
        EventBus.emit('game:win');
    }
    return lineData;
}

// --- Subproof Management ---

export function startRAA(wffToProve) {
    console.log("startRAA called with:", wffToProve);
    const { currentScopeLevel, subGoalStack } = store.getState();
    const goalAst = LogicParser.textToAst(wffToProve);
    if (!goalAst) {
        EventBus.emit('feedback:show', { message: "Cannot start RAA: Invalid formula.", isError: true });
        return;
    }

    const showLineItem = addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);
    if (!showLineItem) {
        return;
    }

    const subproofId = showLineItem.subproofId;
    const showLineFullId = showLineItem.lineNumber;
    const newScopeLevel = currentScopeLevel + 1;
    store.getState().setCurrentScopeLevel(newScopeLevel);


    const assumptionAst = { type: 'negation', operand: goalAst };
    const assumptionFormula = LogicParser.astToText(assumptionAst);

    const newSubGoal = {
        forWff: wffToProve,
        type: "RAA",
        assumptionFormula: assumptionFormula,
        showLineFullId: showLineFullId,
        parentLineDisplay: showLineFullId,
        subLineLetterCode: 97,
        scope: newScopeLevel,
        assumptionLineFullId: "",
        subproofId: subproofId
    };

    const newSubGoalStack = [...subGoalStack, newSubGoal];
    store.getState().updateSubGoalStack(newSubGoalStack);

    const assumptionLineItem = addProofLine(assumptionFormula, "Assumption (RAA)", newScopeLevel, true);
    if (assumptionLineItem) {
        const latestSubGoal = store.getState().subGoalStack.slice(-1)[0];
        latestSubGoal.assumptionLineFullId = assumptionLineItem.lineNumber;
    }
    EventBus.emit('subgoal:update');
    EventBus.emit('feedback:show', { message: `Subproof (RAA): Assume ${assumptionFormula}. Derive a contradiction.`, isError: false });
}

export function startConditionalIntroduction(conditionalAst) {
    const { currentScopeLevel } = store.getState();
    const conditionalFormulaText = LogicParser.astToText(conditionalAst);

    const showLineData = addProofLine(`Show: ${conditionalFormulaText}`, "Goal (→I)", currentScopeLevel, false, true);
    if (!showLineData) return;

    store.getState().startSubproof('CP', conditionalAst);
}

export function startExistentialInstantiation(existentialFormula, assumptionFormula, newVar) {
    const { currentScopeLevel } = store.getState();

    // 1. Add the "Show" line for the existential formula
    const showLineData = addProofLine(`Show: ${existentialFormula}`, "Goal (EI)", currentScopeLevel, false, true);
    if (!showLineData) return;

    // 2. Update state for the new subproof
    const newScopeLevel = currentScopeLevel + 1;
    store.getState().setCurrentScopeLevel(newScopeLevel);

    const newSubGoal = {
        goal: null, // In EI, the goal is to re-derive the same formula
        forWff: existentialFormula,
        type: "EI",
        assumptionFormula: assumptionFormula,
        showLineFullId: showLineData.lineNumber,
        parentLineDisplay: showLineData.lineNumber,
        subLineLetterCode: 97, // 'a'
        scope: newScopeLevel,
        assumptionLineFullId: "",
        subproofId: showLineData.subproofId,
        newInstanceVar: newVar
    };
    store.getState().updateSubGoalStack([...store.getState().subGoalStack, newSubGoal]);

    // 3. Add the assumption line
    const assumptionLineData = addProofLine(assumptionFormula, `Assumption (EI, ${newVar})`, newScopeLevel, true);
    if (assumptionLineData) {
        const updatedStack = store.getState().subGoalStack;
        updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineData.lineNumber;
        store.getState().updateSubGoalStack(updatedStack);
    }

    EventBus.emit('feedback:show', { message: `Subproof (EI): Assume ${assumptionFormula}. Derive the original formula.`, isError: false });
    EventBus.emit('subgoal:update');
}

function dischargeRAA({ subproof, line1, line2 }) {
    if (!subproof || subproof.type !== "RAA") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().subGoalStack.pop();
    const parentScopeLevel = dischargedSubproof.scope - 1;

    const showLineIndex = proofLines.findIndex(line => line.lineNumber === dischargedSubproof.showLineFullId);
    if (showLineIndex === -1) {
        store.getState().setCurrentScopeLevel(parentScopeLevel);
        EventBus.emit('subgoal:update');
        addProofLine(dischargedSubproof.forWff, `RAA ${dischargedSubproof.assumptionLineFullId} (${line1},${line2})`, parentScopeLevel);
        return;
    }

    const justificationText = `RAA ${dischargedSubproof.assumptionLineFullId} (${line1}, ${line2})`;

    const updatedProofLines = [...proofLines];
    const showLine = updatedProofLines[showLineIndex];

    showLine.formula = dischargedSubproof.forWff;
    showLine.justification = justificationText;
    showLine.isProven = true;
    showLine.isShowLine = false;
    showLine.isAssumption = false;

    store.getState().setProofLines(updatedProofLines);
    store.getState().setCurrentScopeLevel(parentScopeLevel);
    EventBus.emit('subgoal:update');
    EventBus.emit('feedback:show', { message: `Discharged RAA for ${dischargedSubproof.forWff}.`, isError: false });
}

function dischargeEE({ subproof, conclusionLineId }) {
    if (!subproof || subproof.type !== "EE") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().subGoalStack.pop();
    const parentScopeLevel = dischargedSubproof.scope - 1;

    const conclusionLine = proofLines.find(line => line.lineNumber === conclusionLineId);
    if (!conclusionLine) {
        store.getState().addFeedback('EE error: conclusion line not found.', 'error');
        return;
    }

    // A more robust implementation would check that the constant from the assumption does not appear in the conclusion.

    addProofLine(conclusionLine.formula, `EE ${dischargedSubproof.forWff.lineNumber}, ${subproof.assumptionLineFullId}-${conclusionLineId}`, parentScopeLevel);

    store.getState().setCurrentScopeLevel(parentScopeLevel);
    EventBus.emit('subgoal:update');
    EventBus.emit('feedback:show', { message: `Discharged EE for ${LogicParser.astToText(conclusionLine.formula)}.`, isError: false });
}

export function handleDropOnProofArea(event) {
    event.preventDefault();
    console.log("handleDropOnProofArea called");
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        return;
    }
    const data = JSON.parse(jsonData);
    console.log("Drop data:", data);
    const targetLi = event.target.closest('li[data-line-number]');

    // If dropped on the main proof area (not a specific line) and it's from the WFF constructor
    if (!targetLi && (data.source === 'wff-constructor' || data.source === 'wff-output-tray')) {
        startRAA(data.formula);
        if (data.source === 'wff-output-tray') {
            EventBus.emit('wff:remove', { elementId: data.elementId });
        }
        return;
    }

    if (targetLi && targetLi.dataset.isShowLine === 'true' && data.sourceType === 'proof-line-formula') {
        const subproofId = targetLi.dataset.subproofId;
        const { subGoalStack } = store.getState();
        const subproof = subGoalStack.find(sp => sp.subproofId === subproofId);
        if (subproof && subproof.type === 'EE') {
            EventBus.emit('proof:dischargeSubproof', { type: 'EE', subproof: subproof, conclusionLineId: data.lineId });
            return;
        }
    }

    // Handle reiteration
    if (data.sourceType === 'proof-line-formula') {
        const { formula, lineId, scopeLevel } = data;
        if (scopeLevel <= store.getState().currentScopeLevel) {
            addProofLine(formula, `Re ${lineId}`, store.getState().currentScopeLevel);
        } else {
            EventBus.emit('feedback:show', { message: "Reiteration Error: Cannot reiterate from inner scope.", isError: true });
        }
    }
    
    document.getElementById('proof-lines').classList.remove('drag-over-proof');
}

EventBus.on('proof:dischargeRAA', dischargeRAA);
EventBus.on('proof:dischargeSubproof', (subproof) => {
    if (subproof.type === 'RAA') {
        dischargeRAA(subproof);
    } else if (subproof.type === 'EE') {
        dischargeEE(subproof);
    }
});


export function checkWinCondition() {
    const { proofLines, goalFormula } = store.getState();
    if (!goalFormula || !goalFormula.formula) return false;
    const goalAst = LogicParser.textToAst(goalFormula.formula);
    if (!goalAst) return;

    for (const line of proofLines) {
        if (line.scopeLevel === 0 && line.isProven) {
            if (LogicParser.areAstsEqual(line.formula, goalAst)) {
                return true;
            }
        }
    }
    return false;
}

export function handleSubproofToggle(event) {
    const headerLi = event.target.closest('li[data-is-collapsible="true"]');
    if (!headerLi) return;

    const subproofId = headerLi.dataset.subproofId;
    const isCurrentlyCollapsed = headerLi.dataset.collapsed === 'true';

    headerLi.dataset.collapsed = (!isCurrentlyCollapsed).toString();

    const proofList = document.getElementById('proof-lines');
    proofList.querySelectorAll(`li[data-parent-subproof-id="${subproofId}"]`).forEach(line => {
        line.classList.toggle('subproof-content-hidden', !isCurrentlyCollapsed);
    });
}

export function setupProofLineDragging(proofList) {
    proofList.addEventListener('dragstart', handleDragStartProofLine);
    proofList.addEventListener('dragend', handleGenericDragEnd);
}


// --- Initialization ---
export function initializeProof() {
    console.log("Initializing proof...");
    const proofList = document.getElementById('proof-lines');
    if (proofList) {
        proofList.addEventListener('click', handleSubproofToggle);
        setupProofLineDragging(proofList);
        proofList.addEventListener('drop', handleDropOnProofArea);
    }
}

EventBus.on('proof:startRAA', startRAA);
EventBus.on('proof:startConditionalIntroduction', startConditionalIntroduction);
EventBus.on('proof:startExistentialInstantiation', startExistentialInstantiation);
EventBus.on('proof:addProofLine', (data) => addProofLine(data.formula, data.justification, data.scopeLevel));
EventBus.on('proof:checkWinCondition', checkWinCondition);
EventBus.on('proof:isNegationOf', ({ f1, f2, callback }) => callback(isNegationOf(f1, f2)));
EventBus.on('proof:isAssumption', ({ lineItem, callback }) => callback(isAssumption(lineItem)));
EventBus.on('proof:dischargeSubproof', (subproof) => {
    if (subproof.type === 'RAA') {
        dischargeRAA(subproof);
    } else if (subproof.type === 'EE') {
        dischargeEE(subproof);
    }
});
