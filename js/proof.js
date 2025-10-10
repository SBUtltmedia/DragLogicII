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
function checkMainGoal(line) {
    const { goalFormula } = store.getState();
    // Only check for wins in the main scope (scope 0)
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

export function addProofLine(formula, justification, scopeLevel, isAssumptionFlag = false,
 isShowLineFlag = false) {
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
        const existingLines = proofLines.filter(line => line.scopeLevel === scopeLevel && 
line.isProven);
        for (const line of existingLines) {
            if (LogicParser.areAstsEqual(formulaAst, line.formula)) {
                EventBus.emit('feedback:show', { 
                    message: `Formula already exists in current scope.`,
                    isError: true 
                });
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
        isProven: !isAssumptionFlag, // Assumptions are not proven yet
        isShowLine: isShowLineFlag,
    };

    store.getState().addProofLine(newLine);
    
    if (!isShowLineFlag) {
        store.getState().setNextLineNumberGlobal(nextLineNumberGlobal + 1);
    }
    
    EventBus.emit('proof:lineAdded', newLine);

    // Check for win conditions
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

    const assumptionAst = { type: 'negation', operand: goalAst };
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

export function dischargeRAA(subproof, line1, line2) {
    if (!subproof || subproof.type !== "RAA") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().endSubproof();
    const parentScopeLevel = dischargedSubproof.scopeLevel - 1;

    const conclusion = dischargedSubproof.goalFormula;
    const justification = `RAA ${line1}, ${line2}`;

    addProofLine(LogicParser.astToText(conclusion), justification, parentScopeLevel);
}

export function dischargeCP(subproof, consequentLineId) {
    if (!subproof || subproof.type !== "CP") return;

    const { proofLines } = store.getState();
    const dischargedSubproof = store.getState().endSubproof();
    const parentScopeLevel = dischargedSubproof.scopeLevel - 1;

    const conclusion = { type: 'binary', operator: '→', left: dischargedSubproof.assumptionFormula, right: dischargedSubproof.goalFormula };
    const justification = `CP ${consequentLineId}`;

    addProofLine(LogicParser.astToText(conclusion), justification, parentScopeLevel);
}


// --- Rule Application ---

export function applyActiveRule() {
    const { activeRule, collectedPremises, currentScopeLevel } = store.getState();
    if (!activeRule) return;

    const rule = Rules.getRuleSet()[activeRule];
    const premisesData = collectedPremises.map((p, index) => ({
        ...p,
        formula: LogicParser.textToAst(p.formula),
    }));

    const resultAst = rule.apply(premisesData);

    if (resultAst) {
        const justification = `${activeRule} ${premisesData.map(p => p.lineId || 'WFF').join(', ')}`;
        addProofLine(LogicParser.astToText(resultAst), justification, currentScopeLevel);
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
    
    // Check that the last line matches the goal formula
    const lastLine = proofLines[proofLines.length - 1];
    if (!lastLine) {
        return { valid: false, message: 'No final proof line found.' };
    }
    
    // For now we're just checking direct matching; a full implementation should 
    // verify all rules were applied correctly and subproofs closed properly
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
    // Setup event listeners for proof-related events
    EventBus.on('proof:startRAA', startRAA);
    EventBus.on('proof:startConditionalIntroduction', startConditionalIntroduction);
    EventBus.on('proof:dischargeRAA', dischargeRAA);
    EventBus.on('proof:dischargeCP', dischargeCP);
    
    EventBus.on('rule:apply', (data) => {
        applyRule(data.ruleName, data.premiseLineNumbers);
    });

    // Initialize with the first problem
    const { currentProblem } = store.getState();
    if (currentProblem) {
        store.getState().loadProblem(currentProblem.set, currentProblem.number);
    }
}