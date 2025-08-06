import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';
import { setDragData, handleGenericDragEnd } from './drag-drop.js';

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
    const { nextLineNumberGlobal, subGoalStack, proofLines } = store.getState();
    const cleanFormula = formula.trim();

    // Prevent adding duplicate proven lines in the same scope
    if (!isShowLineFlag && !isAssumptionFlag) {
        const formulaAst = LogicParser.textToAst(cleanFormula);
        const existingLines = proofLines.filter(line => line.scopeLevel === scopeLevel && line.isProven);
        for (const line of existingLines) {
            const existingAst = LogicParser.textToAst(line.formula);
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
        const activeSubProof = subGoalStack[subGoalStack.length - 1];
        if (!activeSubProof) {
            EventBus.emit('feedback:show', { message: "Proof Error: No active subproof!", isError: true });
            return null;
        }
        const subLetter = String.fromCharCode(activeSubProof.subLineLetterCode);
        activeSubProof.subLineLetterCode++; // Increment for the next line
        displayLineStr = `${activeSubProof.parentLineDisplay}.${subLetter}`;
        dataLineId = displayLineStr;
        store.getState().updateSubGoalStack(subGoalStack);
    }

    const lineData = {
        lineNumber: dataLineId,
        formula: cleanFormula,
        justification,
        scopeLevel,
        isAssumption: isAssumptionFlag,
        isShowLine: isShowLineFlag,
        isProven: !isShowLineFlag && !isAssumptionFlag,
        subproofId: isShowLineFlag ? `subproof-${dataLineId.replace('.', '-')}` : null,
        parentSubproofId: scopeLevel > 0 ? subGoalStack[subGoalStack.length - 1]?.subproofId : null
    };

    store.getState().addProofLine(lineData);
    checkWinCondition();
    return lineData;
}

// --- Subproof Management ---

export function startRAA(goalAst) {
    const { currentScopeLevel } = store.getState();
    const wffToProve = LogicParser.astToText(goalAst);

    // 1. Add the "Show" line
    const showLineData = addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);
    if (!showLineData) return; // Stop if the line couldn't be added

    // 2. Update state for the new subproof
    const newScopeLevel = currentScopeLevel + 1;
    store.getState().setCurrentScopeLevel(newScopeLevel);

    const assumptionAst = { type: 'negation', operand: goalAst };
    const assumptionFormula = LogicParser.astToText(assumptionAst);

    const newSubGoal = {
        forWff: wffToProve,
        type: "RAA",
        assumptionFormula: assumptionFormula,
        showLineFullId: showLineData.lineNumber,
        parentLineDisplay: showLineData.lineNumber,
        subLineLetterCode: 97, // 'a'
        scope: newScopeLevel,
        assumptionLineFullId: "",
        subproofId: showLineData.subproofId
    };
    store.getState().updateSubGoalStack([...store.getState().subGoalStack, newSubGoal]);

    // 3. Add the assumption line
    const assumptionLineData = addProofLine(assumptionFormula, "Assumption (RAA)", newScopeLevel, true);
    if (assumptionLineData) {
        const updatedStack = store.getState().subGoalStack;
        updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineData.lineNumber;
        store.getState().updateSubGoalStack(updatedStack);
    }

    EventBus.emit('feedback:show', { message: `Subproof (RAA): Assume ${assumptionFormula}. Derive a contradiction.`, isError: false });
    EventBus.emit('subgoal:update');
}

export function startConditionalIntroduction(conditionalAst) {
    const { currentScopeLevel } = store.getState();
    const conditionalFormula = LogicParser.astToText(conditionalAst);
    const antecedentFormula = LogicParser.astToText(conditionalAst.left);
    const consequentFormula = LogicParser.astToText(conditionalAst.right);

    // 1. Add the "Show" line
    const showLineData = addProofLine(`Show: ${conditionalFormula}`, "Goal (→I)", currentScopeLevel, false, true);
    if (!showLineData) return;

    // 2. Update state for the new subproof
    const newScopeLevel = currentScopeLevel + 1;
    store.getState().setCurrentScopeLevel(newScopeLevel);

    const newSubGoal = {
        goal: consequentFormula,
        forWff: conditionalFormula,
        type: "→I",
        assumptionFormula: antecedentFormula,
        showLineFullId: showLineData.lineNumber,
        parentLineDisplay: showLineData.lineNumber,
        subLineLetterCode: 97, // 'a'
        scope: newScopeLevel,
        assumptionLineFullId: "",
        subproofId: showLineData.subproofId
    };
    store.getState().updateSubGoalStack([...store.getState().subGoalStack, newSubGoal]);

    // 3. Add the assumption line
    const assumptionLineData = addProofLine(antecedentFormula, "Assumption (→I)", newScopeLevel, true);
    if (assumptionLineData) {
        const updatedStack = store.getState().subGoalStack;
        updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineData.lineNumber;
        store.getState().updateSubGoalStack(updatedStack);
    }

    EventBus.emit('feedback:show', { message: `Subproof (→I): Assume ${antecedentFormula}. Derive ${consequentFormula}.`, isError: false });
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
    checkWinCondition();
}

EventBus.on('proof:dischargeRAA', dischargeRAA);


export function checkWinCondition() {
    const { proofLines, goalFormula } = store.getState();
    const goalAst = LogicParser.textToAst(goalFormula);
    if (!goalAst) return;

    for (const line of proofLines) {
        if (line.scopeLevel === 0 && line.isProven) {
            const lineAst = LogicParser.textToAst(line.formula);
            if (lineAst && LogicParser.areAstsEqual(lineAst, goalAst)) {
                EventBus.emit('game:win');
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

function handleDragStartProofLine(e) {
    e.stopPropagation();
    const lineItem = e.target.closest('li[data-line-number]');
    if (!lineItem) return;

    const { lineNumber: lineId, scopeLevel: scopeStr, isProven: isProvenStr, isAssumption: isAssumptionStr } = lineItem.dataset;
    const scope = parseInt(scopeStr);
    if (!lineId || isNaN(scope)) {
        EventBus.emit('feedback:show', { message: "Drag Error: Missing lineId/scope.", isError: true });
        e.preventDefault();
        return;
    }
    if (isProvenStr !== 'true' && isAssumptionStr !== 'true') {
        EventBus.emit('feedback:show', { message: "Cannot use unproven 'Show' line as premise.", isError: true });
        e.preventDefault();
        return;
    }

    const formulaDiv = lineItem.querySelector('.formula');
    const formulaText = formulaDiv.dataset.formula;
    setDragData(e, {
        sourceType: 'proof-line-formula', formula: formulaText.trim(),
        lineId: lineId, scopeLevel: scope,
        elementId: lineItem.id || (lineItem.id = `proofline-${lineId.replace('.', '-')}`)
    });
    formulaDiv.classList.add('dragging');
}
