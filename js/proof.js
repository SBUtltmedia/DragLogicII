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

    const newLine = {
        id: Date.now(),
        lineNumber: isShowLineFlag ? 'Show' : nextLineNumberGlobal,
        formula: formulaAst,
        cleanFormula,
        justification,
        scopeLevel,
        isAssumption: isAssumptionFlag,
        isProven: !isAssumptionFlag,
        isShowLine: isShowLineFlag,
    };

    store.getState().addProofLine(newLine);
    
    if (!isShowLineFlag) {
        store.getState().setNextLineNumberGlobal(nextLineNumberGlobal + 1);
    }
    
    EventBus.emit('proof:lineAdded', newLine);
    return newLine;
}

// --- Subproof Management ---
export function startRAA(wffToProve) {
    const { currentScopeLevel } = store.getState();
    const goalAst = LogicParser.textToAst(wffToProve);
    if (!goalAst) {
        EventBus.emit('feedback:show', { message: "Cannot start RAA: Invalid formula.", isError: true });
        return;
    }

    const showLineItem = addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);
    if (!showLineItem) {
        return;
    }

    const assumptionAst = { type: 'negation', operand: goalAst };
    const assumptionFormula = LogicParser.astToText(assumptionAst);

    store.getState().startSubproof('RAA', assumptionAst, goalAst);
    EventBus.emit('feedback:show', { message: `Subproof (RAA): Assume ${assumptionFormula}. Derive a contradiction.`, isError: false });
}

export function startConditionalIntroduction(conditionalFormula) {
    const conditionalAst = LogicParser.textToAst(conditionalFormula);
    if (!conditionalAst || conditionalAst.type !== 'binary' || conditionalAst.operator !== '→') {
        EventBus.emit('feedback:show', { message: "Cannot start CP: Invalid conditional formula.", isError: true });
        return;
    }

    const { currentScopeLevel } = store.getState();
    const showLineItem = addProofLine(`Show: ${conditionalFormula}`, "Goal (CP)", currentScopeLevel, false, true);
    if (!showLineItem) {
        return;
    }

    store.getState().startSubproof('CP', conditionalAst.left, conditionalAst.right);
    EventBus.emit('feedback:show', { message: `Subproof (CP): Assume ${LogicParser.astToText(conditionalAst.left)}. Derive ${LogicParser.astToText(conditionalAst.right)}.`, isError: false });
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

function dischargeCP({ subproof, conclusionLineId }) {
    if (!subproof || subproof.type !== "CP") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().subGoalStack.pop();
    const parentScopeLevel = dischargedSubproof.scope - 1;

    const conclusionLine = proofLines.find(line => line.lineNumber === conclusionLineId);
    if (!conclusionLine) {
        store.getState().addFeedback('CP error: conclusion line not found.', 'error');
        return;
    }
    
    const assumption = dischargedSubproof.assumption;
    const conclusion = conclusionLine.formula;
    const resultAst = { type: 'binary', operator: '→', left: assumption, right: conclusion };

    const showLineIndex = proofLines.findIndex(line => line.lineNumber === dischargedSubproof.showLineFullId);
    if (showLineIndex === -1) {
        store.getState().setCurrentScopeLevel(parentScopeLevel);
        EventBus.emit('subgoal:update');
        addProofLine(resultAst, `CP ${dischargedSubproof.assumptionLineFullId}-${conclusionLineId}`, parentScopeLevel);
        return;
    }
    
    const justificationText = `CP ${dischargedSubproof.assumptionLineFullId}-${conclusionLineId}`;

    const updatedProofLines = [...proofLines];
    const showLine = updatedProofLines[showLineIndex];

    showLine.formula = resultAst;
    showLine.justification = justificationText;
    showLine.isProven = true;
    showLine.isShowLine = false;
    showLine.isAssumption = false;

    store.getState().setProofLines(updatedProofLines);
    store.getState().setCurrentScopeLevel(parentScopeLevel);
    EventBus.emit('subgoal:update');
    EventBus.emit('feedback:show', { message: `Discharged CP for ${LogicParser.astToText(resultAst)}.`, isError: false });
}

// --- Rule Application ---
export function applyRule(ruleName, premiseLineNumbers) {
    const { proofLines } = store.getState();
    
    const premises = premiseLineNumbers.map(num => {
        const line = proofLines.find(l => l.lineNumber === num);
        return line ? line.formula : null;
    }).filter(Boolean);
    
    if (premises.length !== premiseLineNumbers.length) {
        EventBus.emit('feedback:show', { 
            message: 'Not all premises could be found.', 
            isError: true 
        });
        return false;
    }
    
    const { applied, conclusion, error } = Rules.applyRule(ruleName, premises);
    
    if (applied && conclusion) {
        const resultLine = addProofLine(
            LogicParser.astToText(conclusion),
            `${ruleName} on lines ${premiseLineNumbers.join(', ')}`,
            store.getState().currentScopeLevel
        );
        
        if (resultLine) {
            EventBus.emit('feedback:show', { 
                message: `Applied rule ${ruleName}`,
                isError: false 
            });
            return true;
        }
    } else {
        EventBus.emit('feedback:show', { 
            message: error || `Failed to apply rule ${ruleName}`,
            isError: true 
        });
        return false;
    }
    
    return false;
}

// --- Proof Validation ---
export function validateProof() {
    const { proofLines, goalFormula } = store.getState();
    
    if (proofLines.length === 0 || !goalFormula) {
        return { valid: false, message: 'Empty proof or no goal formula.' };
    }
    
    const lastLine = proofLines[proofLines.length - 1];
    if (!lastLine) {
        return { valid: false, message: 'No final proof line found.' };
    }
    
    if (goalFormula.ast && LogicParser.areAstsEqual(lastLine.formula, goalFormula.ast)) {
        return { valid: true, message: 'Valid proof' };
    } else {
        return { valid: false, message: `Proof does not establish the goal formula.` };
    }
}

export function checkWinCondition() {
    const { valid } = validateProof();
    return valid;
}

// --- Initialize Proof System ---
export function initializeProof() {
    console.log("Initializing proof system...");
    EventBus.on('proof:startRAA', startRAA);
    EventBus.on('proof:startConditionalIntroduction', startConditionalIntroduction);
    EventBus.on('proof:startExistentialInstantiation', startExistentialInstantiation);
    EventBus.on('rule:apply', (data) => {
        applyRule(data.ruleName, data.premiseLineNumbers);
    });
    EventBus.on('proof:isNegationOf', ({ f1, f2, callback }) => callback(isNegationOf(f1, f2)));
    EventBus.on('proof:isAssumption', ({ lineItem, callback }) => callback(isAssumption(lineItem)));
    EventBus.on('proof:dischargeSubproof', (subproof) => {
        if (subproof.type === 'RAA') {
            dischargeRAA(subproof);
        } else if (subproof.type === 'EE') {
            dischargeEE(subproof);
        } else if (subproof.type === 'CP') {
            dischargeCP(subproof);
        }
    });

    const { currentProblem } = store.getState();
    if (currentProblem) {
        store.getState().loadProblem(currentProblem.set, currentProblem.number);
    }
}