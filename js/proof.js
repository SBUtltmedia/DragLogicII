import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';
import { setDragData, handleGenericDragEnd, handleDragStartProofLine } from './drag-drop.js';
import { Rules } from './rules.js';

// --- Helper Functions ---
export function isNegationOf(f1, f2) {
    const ast1 = LogicParser.textToAst(f1);
    const ast2 = LogicParser.textToAst(f2);
    if (!ast1 || !ast2) return false;

    return (ast1.type === 'unary' && ast1.operator === '~' && LogicParser.areAstsEqual(ast1.operand, ast2)) ||
           (ast2.type === 'unary' && ast2.operator === '~' && LogicParser.areAstsEqual(ast2.operand, ast1));
}

function isAssumption(lineItem) { 
    return lineItem && lineItem.dataset.isAssumption === 'true'; 
}

function checkMainGoal(line) {
    const { goalFormula } = store.getState();
    if (line.scopeLevel === 0 && goalFormula && goalFormula.ast) {
        if (LogicParser.areAstsEqual(line.formula, goalFormula.ast)) {
            store.getState().markLineAsWinner(line.id);
            EventBus.emit('feedback:show', { message: 'Main Proof Goal Achieved!', isError: false });
            const gameTitle = document.getElementById('game-title');
            if (gameTitle && !gameTitle.textContent.includes('Solved!')) {
                gameTitle.textContent += " - Solved!";
            }
            EventBus.emit('ui:showWinModal');
        }
    }
}

// --- Proof Line Management ---
export function addProofLine(formula, justification, scopeLevel, isAssumptionFlag = false, isShowLineFlag = false, fromImport = false) {
    const { nextLineNumberGlobal, subGoalStack, proofLines, activeModalSystem } = store.getState();
    let formulaAst;
    let cleanFormula;

    if (typeof formula === 'string') {
        cleanFormula = formula.trim();
        if (isShowLineFlag) {
            formulaAst = LogicParser.textToAst(cleanFormula.substring(5)); // Parse only the formula part
        } else {
            formulaAst = LogicParser.textToAst(cleanFormula);
        }
    } else {
        formulaAst = formula;
        cleanFormula = LogicParser.astToText(formulaAst);
    }

    const targetSubproof = subGoalStack.find(sp => sp.scopeLevel === scopeLevel);
    if (targetSubproof && targetSubproof.isStrict && !fromImport) {
        EventBus.emit('feedback:show', { message: `Cannot add line directly to strict subproof. Use importation rules.`, isError: true });
        return null;
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

    if (!isShowLineFlag && !isAssumptionFlag) {
        checkMainGoal(newLine);
        const activeSubProof = subGoalStack.length > 0 ? subGoalStack[subGoalStack.length - 1] : null;
        if (activeSubProof && activeSubProof.scopeLevel === scopeLevel) {
            if (activeSubProof.type === 'RAA') {
                const linesInScope = proofLines.filter(line => line.scopeLevel === scopeLevel);
                for (const line of linesInScope) {
                    if (isNegationOf(cleanFormula, line.cleanFormula)) {
                        dischargeRAA(activeSubProof, newLine.lineNumber, line.lineNumber);
                        break;
                    }
                }
            } else if (activeSubProof.type === 'CP') {
                if (LogicParser.areAstsEqual(formulaAst, activeSubProof.goalFormula)) {
                    dischargeCP(activeSubProof, newLine.lineNumber);
                }
            } else if (activeSubProof.type === 'Strict') {
                if (LogicParser.areAstsEqual(formulaAst, activeSubProof.goalFormula)) {
                    dischargeStrictSubproof();
                }
            }
        }
    }

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

    addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);

    const assumptionAst = { type: 'unary', operator: '~', operand: goalAst };
    const assumptionFormula = LogicParser.astToText(assumptionAst);

    store.getState().startSubproof('RAA', assumptionAst, goalAst);
    addProofLine(assumptionFormula, "Assumption (RAA)", currentScopeLevel + 1, true);
}

export function startConditionalIntroduction(conditionalFormula) {
    const { currentScopeLevel } = store.getState();
    const conditionalAst = LogicParser.textToAst(conditionalFormula);
    if (!conditionalAst || conditionalAst.type !== 'binary' || conditionalAst.operator !== '→') {
        EventBus.emit('feedback:show', { message: "Cannot start CP: Invalid conditional formula.", isError: true });
        return;
    }

    addProofLine(`Show: ${conditionalFormula}`, "Goal (→I)", currentScopeLevel, false, true);

    const antecedentFormula = LogicParser.astToText(conditionalAst.left);
    store.getState().startSubproof('CP', conditionalAst.left, conditionalAst.right);
    addProofLine(antecedentFormula, "Assumption (→I)", currentScopeLevel + 1, true);
}

export function startStrictSubproof(goalFormula) {
    const { currentScopeLevel } = store.getState();
    const goalAst = LogicParser.textToAst(goalFormula);
    if (!goalAst || goalAst.type !== 'unary' || goalAst.operator !== '□') {
        EventBus.emit('feedback:show', { message: 'Invalid goal for Strict Subproof.', isError: true });
        return;
    }

    addProofLine(`Show: ${goalFormula}`, 'Goal (□I)', currentScopeLevel, false, true);
    store.getState().startSubproof('Strict', null, goalAst.operand, { isStrict: true });
}

export function dischargeRAA(subproof, line1, line2) {
    if (!subproof || subproof.type !== "RAA") return;

    const dischargedSubproof = store.getState().endSubproof();
    const parentScopeLevel = dischargedSubproof.scopeLevel - 1;

    const conclusion = dischargedSubproof.goalFormula;
    const justification = `RAA ${line1}, ${line2}`;

    addProofLine(conclusion, justification, parentScopeLevel);
}

export function dischargeCP(subproof, consequentLineId) {
    if (!subproof || subproof.type !== "CP") return;

    const dischargedSubproof = store.getState().endSubproof();
    const parentScopeLevel = dischargedSubproof.scopeLevel - 1;

    const conclusion = { type: 'binary', operator: '→', left: dischargedSubproof.assumptionFormula, right: dischargedSubproof.goalFormula };
    const justification = `CP ${consequentLineId}`;

    addProofLine(conclusion, justification, parentScopeLevel);
}

export function dischargeStrictSubproof() {
    const { subGoalStack } = store.getState();
    const activeSubproof = subGoalStack[subGoalStack.length - 1];
    if (!activeSubproof || !activeSubproof.isStrict) return;

    const dischargedSubproof = store.getState().endSubproof();
    const parentScopeLevel = dischargedSubproof.scopeLevel - 1;

    const conclusion = { type: 'unary', operator: '□', operand: dischargedSubproof.goalFormula };
    const justification = `□I`;

    addProofLine(conclusion, justification, parentScopeLevel);
}


// --- Rule Application ---

export function applyActiveRule() {
    const { activeRule, collectedPremises, currentScopeLevel, subGoalStack } = store.getState();
    if (!activeRule) return;

    const rule = Rules.getRuleSet()[activeRule];
    const premisesData = collectedPremises.map((p, index) => ({
        ...p,
        formula: LogicParser.textToAst(p.formula),
    }));

    const result = rule.apply(premisesData);

    if (result) {
        const resultAst = result.resultAst || result;
        const justification = result.justification || `${activeRule} ${premisesData.map(p => p.lineId || 'WFF').join(', ')}`;
        
        const targetSubproof = subGoalStack.find(sp => sp.scopeLevel === currentScopeLevel);
        const isInsideStrictSubproof = targetSubproof && targetSubproof.isStrict;

        addProofLine(resultAst, justification, currentScopeLevel, false, false, isInsideStrictSubproof);
    } else {
        store.getState().addFeedback(`Rule ${activeRule} could not be applied.`, 'error');
    }

    store.getState().setActiveRule(null);
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
    EventBus.on('rule:apply', (data) => {
        applyRule(data.ruleName, data.premiseLineNumbers);
    });
}