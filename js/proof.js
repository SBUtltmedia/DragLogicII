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

function startRAA(wffToProve) {
    const { currentScopeLevel } = store.getState();
    const goalAst = LogicParser.textToAst(wffToProve);
    if (!goalAst) {
        EventBus.emit('feedback:show', { message: "Cannot start RAA: Invalid formula.", isError: true });
        return;
    }

    const showLineItem = addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);
    if (!showLineItem) return;

    const subproofId = showLineItem.dataset.subproofId;
    const showLineFullId = showLineItem.dataset.lineNumber;
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

    const { subGoalStack } = store.getState();
    store.getState().updateSubGoalStack([...subGoalStack, newSubGoal]);

    const assumptionLineItem = addProofLine(assumptionFormula, "Assumption (RAA)", newScopeLevel, true);
    if (assumptionLineItem) {
        const updatedStack = store.getState().subGoalStack;
        updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineItem.dataset.lineNumber;
        store.getState().updateSubGoalStack(updatedStack);
    }

    EventBus.emit('feedback:show', { message: `Subproof (RAA): Assume ${assumptionFormula}. Derive a contradiction.`, isError: false });
    EventBus.emit('subgoal:update');
}

function dischargeRAA(subproofDetails, contradictoryLine1Id, contradictoryLine2Id) {
    if (!subproofDetails || subproofDetails.type !== "RAA") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().subGoalStack.pop();
    const parentScopeLevel = dischargedSubproof.scope - 1;

    const showLineIndex = proofLines.findIndex(line => line.lineNumber === dischargedSubproof.showLineFullId);
    if (showLineIndex === -1) {
        store.getState().setCurrentScopeLevel(parentScopeLevel);
        EventBus.emit('subgoal:update');
        addProofLine(dischargedSubproof.forWff, `RAA ${dischargedSubproof.assumptionLineFullId} (${contradictoryLine1Id},${contradictoryLine2Id})`, parentScopeLevel);
        return;
    }

    const justificationText = `RAA ${dischargedSubproof.assumptionLineFullId} (${contradictoryLine1Id}, ${contradictoryLine2Id})`;

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

EventBus.on('proof:startRAA', ({ formula }) => startRAA(formula));
EventBus.on('proof:dischargeRAA', ({ subproof, line1, line2 }) => dischargeRAA(subproof, line1, line2));


export function checkWinCondition() {
    console.log('[checkWinCondition] Running check...');
    const { proofLines, goalFormula } = store.getState();
    const goalAst = LogicParser.textToAst(goalFormula);

    if (!goalAst) {
        console.error('[checkWinCondition] Could not parse goalFormula:', goalFormula);
        return;
    }
    console.log(`[checkWinCondition] Goal is: "${goalFormula}"`);

    for (const line of proofLines) {
        console.log(`[checkWinCondition] Checking line #${line.lineNumber}: Formula="${line.formula}", Scope=${line.scopeLevel}, Proven=${line.isProven}`);
        if (line.scopeLevel === 0 && line.isProven) {
            const lineAst = LogicParser.textToAst(line.formula);
            if (lineAst) {
                const areEqual = LogicParser.areAstsEqual(lineAst, goalAst);
                console.log(`[checkWinCondition] ...Line #${line.lineNumber} is at scope 0 and proven. Comparing with goal. Result: ${areEqual}`);
                if (areEqual) {
                    console.log('[checkWinCondition] WIN CONDITION MET!');
                    EventBus.emit('game:win');
                    return true; // Win condition met
                }
            } else {
                console.warn(`[checkWinCondition] ...Could not parse line #${line.lineNumber} formula: "${line.formula}"`);
            }
        }
    }
    console.log('[checkWinCondition] Finished check. No win condition met.');
    return false; // Win condition not met
}

export function addProofLine(formula, justification, scopeLevel, isAssumptionFlag = false, isShowLineFlag = false) {
    const { nextLineNumberGlobal, subGoalStack, proofLines } = store.getState();
    const cleanFormula = formula.trim();

    let formulaForParsing = cleanFormula;
    if (isShowLineFlag) {
        formulaForParsing = cleanFormula.replace(/^Show:\s*/i, '');
    }
    const formulaAst = LogicParser.textToAst(formulaForParsing);

    if (!isShowLineFlag && !isAssumptionFlag) {
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
    let newNextLineNumber = nextLineNumberGlobal;
    let newSubGoalStack = [...subGoalStack];

    if (scopeLevel === 0) {
        displayLineStr = `${newNextLineNumber}.`;
        dataLineId = `${newNextLineNumber}`;
        newNextLineNumber++;
        store.getState().setNextLineNumber(newNextLineNumber);
    } else {
        const activeSubProof = newSubGoalStack[newSubGoalStack.length - 1];
        if (!activeSubProof) {
            EventBus.emit('feedback:show', { message: "Proof Error: No active subproof!", isError: true });
            return null;
        }
        if (typeof activeSubProof.subLineLetterCode === 'undefined') activeSubProof.subLineLetterCode = 97; // 'a'
        const subLetter = String.fromCharCode(activeSubProof.subLineLetterCode++);
        displayLineStr = `${activeSubProof.parentLineDisplay}.${subLetter}`;
        dataLineId = displayLineStr;
        store.getState().updateSubGoalStack(newSubGoalStack);
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
        parentSubproofId: null
    };

    store.getState().addProofLine(lineData);
    checkWinCondition();
}

export function handleSubproofToggle(event) {
    const headerLi = event.target.closest('li[data-is-collapsible="true"]');
    if (!headerLi) return;

    const subproofId = headerLi.dataset.subproofId;
    const isCurrentlyCollapsed = headerLi.dataset.collapsed === 'true';

    headerLi.dataset.collapsed = (!isCurrentlyCollapsed).toString();

    const { proofList } = store.getState();
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
    if (!e.target || typeof e.target.textContent === 'undefined') { e.preventDefault(); return; }
    const lineItem = e.target.closest('li[data-line-number]');
    if (!lineItem) { return; }

    const { lineNumber: lineId, scopeLevel: scopeStr, isProven: isProvenStr } = lineItem.dataset;
    const scope = parseInt(scopeStr);
    if (!lineId || isNaN(scope)) {
        EventBus.emit('feedback:show', { message: "Drag Error: Missing lineId/scope.", isError: true });
        e.preventDefault();
        return;
    }
    if (isProvenStr !== 'true' && !isAssumption(lineItem)) {
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

function isAssumption(lineItem) { return lineItem && lineItem.dataset.isAssumption === 'true'; }