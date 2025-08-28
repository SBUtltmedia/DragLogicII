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
export function addProofLine(formula, justification, scopeLevel, isAssumptionFlag = false,
 isShowLineFlag = false) {                                                                    const { nextLineNumberGlobal, subGoalStack, proofLines, currentScopeLevel } = store.ge
tState();                                                                                     
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
line.isProven);                                                                                   for (const line of existingLines) {

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
    return newLine;
}

// --- Subproof Management ---

export function startSubproof(type, assumptionFormula, goalFormula = null) {
    const { currentScopeLevel } = store.getState();
    const subGoalDetails = {
        type,
        scopeLevel: currentScopeLevel + 1,
        assumptionFormula: LogicParser.textToAst(assumptionFormula),
        goalFormula: goalFormula ? LogicParser.textToAst(goalFormula) : null
    };
    
    store.getState().startSubproof(type, assumptionFormula, { goalFormula });
    EventBus.emit('subproof:started', subGoalDetails);
}

export function endSubproof() {
    const { subGoalStack } = store.getState();
    if (subGoalStack.length === 0) {
        EventBus.emit('feedback:show', { 
            message: 'No active subproof to end.', 
            isError: true 
        });
        return;
    }

    // Here would be logic to validate that the last subproof is complete
    // In a real implementation, this would check if the assumption leads to the goal
    
    store.getState().endSubproof();
    EventBus.emit('subproof:ended');
}

// --- Rule Application ---

export function applyRule(ruleName, premiseLineNumbers) {
    const { proofLines } = store.getState();
    
    // Validate that we have the right number of premises
    if (premiseLineNumbers.length === 0) {
        EventBus.emit('feedback:show', { 
            message: 'At least one premise is required for rule application.', 
            isError: true 
        });
        return false;
    }
    
    // Get the actual premises from the proof lines
    const premises = premiseLineNumbers.map(num => {
        const line = proofLines.find(l => l.lineNumber === num);
        return line ? line.formula : null;
    }).filter(Boolean); // Remove any nulls
    
    if (premises.length !== premiseLineNumbers.length) {
        EventBus.emit('feedback:show', { 
            message: 'Not all premises could be found.', 
            isError: true 
        });
        return false;
    }
    
    // Apply the rule
    const { applied, conclusion, error } = Rules.applyRule(ruleName, premises);
    
    if (applied && conclusion) {
        // Add the result as a new proof line
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
    EventBus.on('subproof:start', (data) => {
        startSubproof(data.type, data.assumptionFormula, data.goalFormula);
    });
    
    EventBus.on('subproof:end', () => {
        endSubproof();
    });
    
    EventBus.on('rule:apply', (data) => {
        applyRule(data.ruleName, data.premiseLineNumbers);
    });

    // Initialize with the first problem
    const { currentProblem } = store.getState();
    if (currentProblem) {
        store.getState().loadProblem(currentProblem.set, currentProblem.number);
    }
}