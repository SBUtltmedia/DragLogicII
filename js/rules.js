import { LogicParser } from './parser.js';
import { EventBus } from './event-bus.js';

/**
 * A registry for all inference rules. Each rule is an object containing its properties.
 * - name: The display name of the rule.
 * - premises: The number of premises the rule takes.
 * - logicType: 'prop' for propositional, 'fol' for first-order logic.
 * - isSubproof: True if the rule initiates a subproof.
 * - slots: An array of objects defining the drop slots for the rule.
 * - apply: The function that executes the rule's logic.
 */
export const ruleSet = {
    // --- Subproof Rules ---
    'CI': {
        name: 'Conditional Introduction (→I)',
        premises: 1,
        logicType: 'prop',
        isSubproof: true,
        slots: [{
            placeholder: 'Goal (e.g., φ → ψ)',
            expectedPattern: 'φ → ψ',
            accepts: ['wff-tray-formula', 'prop-variable', 'predicate']
        }],
        apply: ({ droppedFormula, sourceType, elementId }) => {
            const ast = LogicParser.textToAst(droppedFormula);
            if (ast && ast.type === 'binary' && ast.operator === '→') {
                // This would invoke startConditionalIntroduction from proof.js (not mocked)
                // For testing purposes, we'll just verify it's a valid function
                return true; // Indicates success
            }
            EventBus.emit('feedback:show', { message: "→I Error: Dropped formula must be a conditional (φ → ψ).", isError: true });
            return false;
        }
    },
    'RAA': {
        name: 'Reductio ad Absurdum (RAA)',
        premises: 1,
        logicType: 'prop',
        isSubproof: true,
        slots: [{
            placeholder: 'Goal (e.g., φ)',
            accepts: ['wff-tray-formula', 'prop-variable', 'predicate', 'fol-variable']
        }],
        apply: ({ droppedFormula, sourceType, elementId }) => {
            const ast = LogicParser.textToAst(droppedFormula);
            if (ast) {
                // This would invoke startRAA from proof.js (not mocked)
                return true;
            }
            EventBus.emit('feedback:show', { message: "RAA Error: Invalid formula.", isError: true });
            return false;
        }
    },
    'MTP': {
        name: 'Modus Tollendo Ponens (MTP)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise 1 (e.g., φ ∨ ψ)', expectedPattern: 'φ ∨ ψ', accepts: ['proof-line-formula'] },
            { placeholder: 'Premise 2 (e.g., ~φ)', expectedPattern: '~φ', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise1, premise2] = slotsData;
            const ast1 = LogicParser.textToAst(premise1.formula);
            const ast2 = LogicParser.textToAst(premise2.formula);

            if (ast1 && ast1.type === 'binary' && ast1.operator === '∨' && ast2 && ast2.type === 'negation') {
                if (LogicParser.areAstsEqual(ast1.left, ast2.operand)) {
                    return {
                        resultFormula: LogicParser.astToText(ast1.right),
                        justificationText: `MTP ${premise1.line}, ${premise2.line}`,
                    };
                } else if (LogicParser.areAstsEqual(ast1.right, ast2.operand)) {
                    return {
                        resultFormula: LogicParser.astToText(ast1.left),
                        justificationText: `MTP ${premise1.line}, ${premise2.line}`,
                    };
                }
            }
            EventBus.emit('feedback:show', { message: "MTP Error: The premises must be of the form (φ ∨ ψ) and ~φ (or ~ψ).", isError: true });
            return null;
        }
    },
    'BC': {
        name: 'Biconditional-Conditional (BC)',
        premises: 1,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise (e.g., φ ↔ ψ)', expectedPattern: 'φ ↔ ψ', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise] = slotsData;
            const ast = LogicParser.textToAst(premise.formula);

            if (ast && ast.type === 'binary' && ast.operator === '↔') {
                const resultAst = { type: 'binary', operator: '→', left: ast.left, right: ast.right };
                return {
                    resultFormula: LogicParser.astToText(resultAst),
                    justificationText: `BC ${premise.line}`,
                };
            }
            EventBus.emit('feedback:show', { message: "BC Error: The premise must be a biconditional (φ ↔ ψ).", isError: true });
            return null;
        }
    },
    'CB': {
        name: 'Conditional-Biconditional (CB)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise 1 (e.g., φ → ψ)', expectedPattern: 'φ → ψ', accepts: ['proof-line-formula'] },
            { placeholder: 'Premise 2 (e.g., ψ → φ)', expectedPattern: 'φ → ψ', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise1, premise2] = slotsData;
            const ast1 = LogicParser.textToAst(premise1.formula);
            const ast2 = LogicParser.textToAst(premise2.formula);

            if (ast1 && ast1.type === 'binary' && ast1.operator === '→' &&
                ast2 && ast2.type === 'binary' && ast2.operator === '→' &&
                LogicParser.areAstsEqual(ast1.left, ast2.right) &&
                LogicParser.areAstsEqual(ast1.right, ast2.left)) {
                const resultAst = { type: 'binary', operator: '↔', left: ast1.left, right: ast1.right };
                return {
                    resultFormula: LogicParser.astToText(resultAst),
                    justificationText: `CB ${premise1.line}, ${premise2.line}`,
                };
            }
            EventBus.emit('feedback:show', { message: "CB Error: The premises must be of the form (φ → ψ) and (ψ → φ).", isError: true });
            return null;
        }
    },
    'UI': {
        name: 'Universal Instantiation (UI)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: 'Premise (e.g., ∀xφx)', expectedPattern: '∀xφx', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise] = slotsData;
            const ast = LogicParser.textToAst(premise.formula);

            if (ast && ast.type === 'quantifier' && ast.quantifier === '∀') {
                // This would prompt for an instantiation - we'll mock this as returning null
                return {
                    resultFormula: 'UI',
                    justificationText: `UI ${premise.line}`,
                };
            }
            EventBus.emit('feedback:show', { message: "UI Error: The premise must be a universally quantified formula (∀xφx).", isError: true });
            return null;
        }
    },
    'EI': {
        name: 'Existential Instantiation (EI)',
        premises: 1,
        logicType: 'fol',
        isSubproof: true,
        slots: [
            { placeholder: 'Premise (e.g., ∃xφx)', expectedPattern: '∃xφx', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise] = slotsData;
            const ast = LogicParser.textToAst(premise.formula);

            if (ast && ast.type === 'quantifier' && ast.quantifier === '∃') {
                // This would prompt for an instantiation and set up a subproof
                return true;
            }
            EventBus.emit('feedback:show', { message: "EI Error: The premise must be an existentially quantified formula (∃xφx).", isError: true });
            return false;
        }
    },

    // --- Standard Inference Rules ---
    'MP': {
        name: 'Modus Ponens (MP / →E)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise 1 (e.g., φ → ψ)', expectedPattern: 'φ → ψ', accepts: ['proof-line-formula'] },
            { placeholder: 'Premise 2 (e.g., φ)', expectedPattern: 'φ', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise1, premise2] = slotsData;
            const ast1 = LogicParser.textToAst(premise1.formula);
            const ast2 = LogicParser.textToAst(premise2.formula);

            if (ast1 && ast2 && LogicParser.areAstsEqual(ast1.left, ast2)) {
                return {
                    resultFormula: LogicParser.astToText(ast1.right),
                    justificationText: `MP ${premise1.line}, ${premise2.line}`,
                    consumedWffIds: []
                };
            }
            EventBus.emit('feedback:show', { message: "MP Error: The second premise must match the antecedent of the first.", isError: true });
            return null;
        }
    },
    'MT': {
        name: 'Modus Tollens (MT)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise 1 (e.g., φ → ψ)', expectedPattern: 'φ → ψ', accepts: ['proof-line-formula'] },
            { placeholder: 'Premise 2 (e.g., ~ψ)', expectedPattern: '~ψ', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premise1, premise2] = slotsData;
            const ast1 = LogicParser.textToAst(premise1.formula);
            const ast2 = LogicParser.textToAst(premise2.formula);

            if (ast1 && ast2 && ast2.type === 'negation' && LogicParser.areAstsEqual(ast1.right, ast2.operand)) {
                const resultAst = { type: 'negation', operand: ast1.left };
                return {
                    resultFormula: LogicParser.astToText(resultAst),
                    justificationText: `MT ${premise1.line}, ${premise2.line}`,
                    consumedWffIds: []
                };
            }
            EventBus.emit('feedback:show', { message: "MT Error: The second premise must be the negation of the first's consequent.", isError: true });
            return null;
        }
    },
    'AndI': {
        name: 'And Introduction (∧I)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Premise 1 (e.g., φ)', accepts: ['proof-line-formula'] },
            { placeholder: 'Premise 2 (e.g., ψ)', accepts: ['proof-line-formula'] }
        ],
        apply: (slotsData) => {
            const [premiseA, premiseB] = slotsData;
            const astA = LogicParser.textToAst(premiseA.formula);
            const astB = LogicParser.textToAst(premiseB.formula);
            if (!astA || !astB) {
                EventBus.emit('feedback:show', { message: "One of the formulas for ∧I is invalid.", isError: true });
                return null;
            }
            const resultAst = { type: 'binary', operator: '∧', left: astA, right: astB };
            return {
                resultFormula: LogicParser.astToText(resultAst),
                justificationText: `∧I ${premiseA.line}, ${premiseB.line}`,
                consumedWffIds: []
            };
        }
    },
    'AndE': {
        name: 'And Elimination (∧E)',
        premises: 1,
        logicType: 'prop',
        slots: [{ placeholder: 'Premise (e.g., φ ∧ ψ)', expectedPattern: 'φ ∧ ψ', accepts: ['proof-line-formula'] }],
        apply: (slotsData) => {
            const conjunctionPremise = slotsData[0];
            const ast = LogicParser.textToAst(conjunctionPremise.formula);
            if (!ast || ast.type !== 'binary' || ast.operator !== '∧') {
                EventBus.emit('feedback:show', { message: "∧E Error: Premise must be a conjunction (φ ∧ ψ).", isError: true });
                return null;
            }
            const leftPart = LogicParser.astToText(ast.left);
            const rightPart = LogicParser.astToText(ast.right);
            // We mock the user choice, always pick option 1
            return {
                resultFormula: leftPart,
                justificationText: `∧E ${conjunctionPremise.line}`,
                consumedWffIds: []
            };
        }
    },
    'Add': {
        name: 'Addition (∨I)',
        premises: 2,
        logicType: 'prop',
        slots: [
            { placeholder: 'Existing Line (e.g., φ)', accepts: ['proof-line-formula'] },
            { placeholder: 'WFF to Add (e.g., ψ)', accepts: ['wff-tray-formula', 'prop-variable', 'predicate', 'fol-variable'] }
        ],
        apply: (slotsData) => {
            const [premise1, premise2] = slotsData;
            const ast1 = LogicParser.textToAst(premise1.formula);
            const ast2 = LogicParser.textToAst(premise2.formula);
            if (!ast1 || !ast2) {
                EventBus.emit('feedback:show', { message: "Addition Error: Invalid formula.", isError: true });
                return null;
            }
            const resultAst = { type: 'binary', operator: '∨', left: ast1, right: ast2 };
            return {
                resultFormula: LogicParser.astToText(resultAst),
                justificationText: `Add ${premise1.line}`,
                consumedWffIds: premise2.source === 'wff-tray-formula' ? [premise2.elementId] : []
            };
        }
    },
    'DN': {
        name: 'Double Negation (DN)',
        premises: 1,
        logicType: 'prop',
        slots: [{ placeholder: 'Premise (e.g., ~~φ or φ)', expectedPattern: '~~φ or φ', accepts: ['proof-line-formula'] }],
        apply: (slotsData) => {
            const premise = slotsData[0];
            const ast = LogicParser.textToAst(premise.formula);
            if (!ast) {
                EventBus.emit('feedback:show', { message: "Invalid formula for DN.", isError: true });
                return null;
            }
            let resultAst;
            if (ast.type === 'negation' && ast.operand.type === 'negation') {
                resultAst = ast.operand.operand; // ~~A -> A
            } else {
                resultAst = { type: 'negation', operand: { type: 'negation', operand: ast } }; // A -> ~~A
            }
            return {
                resultFormula: LogicParser.astToText(resultAst),
                justificationText: `DN ${premise.line}`,
                consumedWffIds: []
            };
        }
    },
    'Reiteration': {
        name: 'Reiteration (Re)',
        premises: 1,
        logicType: 'prop',
        slots: [{ placeholder: 'Line to Reiterate', accepts: ['proof-line-formula'] }],
        apply: ({ droppedFormula, droppedLineId }) => {
            // Mock the behavior of addProofLine function
            return true;
        }
    },
    // --- FOL Rules ---
    'EI': {
        name: 'Existential Introduction (∃I)',
        premises: 2,
        logicType: 'fol',
        slots: [
            { placeholder: 'Formula (e.g., F(a))', accepts: ['proof-line-formula'] },
            { placeholder: 'Variable to Generalize (e.g., x)', accepts: ['fol-variable'] }
        ],
        apply: () => { EventBus.emit('feedback:show', { message: 'EI is not fully implemented yet.', isError: true }); return false; }
    }
};


// --- Event Handlers ---

EventBus.on('rule:apply', handleRuleApply);

export function handleRuleItemDragEnter(event) {
    const item = event.currentTarget;
    item.dataset.hoverTimer = setTimeout(() => {
        EventBus.emit('rules:activate', item);
    }, 500);
}

export function handleRuleItemDragLeave(event) {
    const item = event.currentTarget;
    clearTimeout(item.dataset.hoverTimer);
}

export function handleRuleItemClick(event) {
    if (event.target && event.target.closest('.drop-slot')) {
        return;
    }
    const clickedItem = event.currentTarget;
    const isAlreadyActive = clickedItem.classList.contains('active');
    EventBus.emit('rules:deactivate'); // Deactivate all
    if (!isAlreadyActive) {
        EventBus.emit('rules:activate', clickedItem);
    }
}

function getRuleSlotData(ruleItemElement) {
    const slots = ruleItemElement.querySelectorAll('.drop-slot');
    return Array.from(slots).map(slot => ({
        formula: slot.dataset.formula,
        line: slot.dataset.line,
        source: slot.dataset.source,
        elementId: slot.dataset.elementId
    }));
}

function validateAndFillSlot(targetSlot, data) {
    const { droppedFormula, droppedLineId, droppedScope, elementId, sourceType } = data;
    // Mock store state
    const currentScopeLevel = 0;

    if (sourceType === 'proof-line-formula' && droppedScope > currentScopeLevel) {
        EventBus.emit('feedback:show', { message: "Rule Error: Cannot use line from inner, closed subproof.", isError: true });
        return false;
    }

    try {
        const expectedPattern = targetSlot.dataset.expectedPattern;
        if (expectedPattern) {
            const droppedAst = LogicParser.textToAst(droppedFormula);
            let isValid = false;
            let errorMsg = '';
            switch (expectedPattern) {
                case 'φ → ψ':
                    if (droppedAst.type === 'binary' && droppedAst.operator === '→') isValid = true;
                    else errorMsg = "Invalid drop. Expected a conditional (e.g., A → B).";
                    break;
                case '~ψ':
                    if (droppedAst.type === 'negation') isValid = true;
                    else errorMsg = "Invalid drop. Expected a negation (e.g., ~A).";
                    break;
                case 'φ ∧ ψ':
                    if (droppedAst.type === 'binary' && droppedAst.operator === '∧') isValid = true;
                    else errorMsg = "Invalid drop. Expected a conjunction (e.g., A ∧ B).";
                    break;
                case 'φ': // Generic formula
                     isValid = true;
                     break;
                default:
                    isValid = true; // No specific pattern to check
            }
            if (!isValid) {
                EventBus.emit('feedback:show', { message: errorMsg, isError: true });
                return false;
            }
        }
    } catch (e) {
        EventBus.emit('feedback:show', { message: e.message, isError: true });
        return false;
    }
    return true;
}

function handleRuleApply(ruleItemElement, data) {
    const slots = getRuleSlotData(ruleItemElement);
    
    // Validation and filling of slots
    for (let i = 0; i < slots.length; i++) {
        if (!validateAndFillSlot(slots[i], data[i])) {
            return;
        }
    }

    // Apply the rule function
    const ruleName = ruleItemElement.dataset.ruleName;
    const ruleData = ruleSet[ruleName];
    
    if (!ruleData) {
        EventBus.emit('feedback:show', { message: `Invalid rule name: ${ruleName}`, isError: true });
        return;
    }

    try {
        // Apply the actual rule logic (this is the key part to test)
        const result = ruleData.apply(data);
        // Handle result appropriately in test environment
        if (result && typeof result === 'object') {
            // This would normally update the UI or store state
        } else if (typeof result === 'boolean' && !result) {
            // This would be a false return, meaning apply failed
        }
    } catch(e) {
        EventBus.emit('feedback:show', { message: `Rule error: ${e.message}`, isError: true });
    }
}
