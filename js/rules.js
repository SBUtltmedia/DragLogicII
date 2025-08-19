import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';
import { addProofLine } from './proof.js';

export const ruleSet = {
    'MP': {
        name: 'Modus Ponens (MP)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' },
            { placeholder: 'φ', expectedPattern: 'any' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p_implies_q, p] = premises.map(p => p.formula);

            if (p_implies_q.type === 'binary' && p_implies_q.operator === '→') {
                if (LogicParser.areAstsEqual(p_implies_q.left, p)) {
                    return p_implies_q.right;
                }
            }
            return null;
        }
    },
    'MT': {
        name: 'Modus Tollens (MT)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' },
            { placeholder: '~ψ', expectedPattern: 'negation' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p_implies_q, not_q] = premises.map(p => p.formula);

            if (p_implies_q.type === 'binary' && p_implies_q.operator === '→' && not_q.type === 'negation') {
                if (LogicParser.areAstsEqual(p_implies_q.right, not_q.operand)) {
                    return { type: 'negation', operand: p_implies_q.left };
                }
            }
            return null;
        }
    },
    'DS': {
        name: 'Disjunctive Syllogism (DS)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ ∨ ψ', expectedPattern: 'binary.∨' },
            { placeholder: '~φ', expectedPattern: 'negation' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p_or_q, not_p] = premises.map(p => p.formula);

            if (p_or_q.type === 'binary' && p_or_q.operator === '∨' && not_p.type === 'negation') {
                if (LogicParser.areAstsEqual(p_or_q.left, not_p.operand)) {
                    return p_or_q.right;
                }
                if (LogicParser.areAstsEqual(p_or_q.right, not_p.operand)) {
                    return p_or_q.left;
                }
            }
            return null;
        }
    },
    'Add': {
        name: 'Addition (Add)',
        premises: 1,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' }
        ],
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.q) return null;
            const p = premises[0].formula;
            const q = LogicParser.textToAst(additionalData.q);
            return { type: 'binary', operator: '∨', left: p, right: q };
        }
    },
    'Simp': {
        name: 'Simplification (Simp)',
        premises: 1,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ ∧ ψ', expectedPattern: 'binary.∧' }
        ],
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const p_and_q = premises[0].formula;
            if (p_and_q.type === 'binary' && p_and_q.operator === '∧') {
                return p_and_q.left; // By default, returns p. UI could ask which one.
            }
            return null;
        }
    },
    'Conj': {
        name: 'Conjunction (Conj)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' },
            { placeholder: 'ψ', expectedPattern: 'any' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p, q] = premises.map(p => p.formula);
            return { type: 'binary', operator: '∧', left: p, right: q };
        }
    },
    'CD': {
        name: 'Constructive Dilemma (CD)',
        premises: 3,
        logicType: 'propositional',
        slots: [
            { placeholder: '(φ → ψ) ∧ (χ → ω)', expectedPattern: 'binary.∧' },
            { placeholder: 'φ ∨ χ', expectedPattern: 'binary.∨' },
            { placeholder: 'ψ ∨ ω', expectedPattern: 'any' } // This is the conclusion, not a premise
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null; // Expecting the two main premises
            const [implications, disjunction] = premises.map(p => p.formula);

            if (implications.type === 'binary' && implications.operator === '∧' &&
                implications.left.type === 'binary' && implications.left.operator === '→' &&
                implications.right.type === 'binary' && implications.right.operator === '→' &&
                disjunction.type === 'binary' && disjunction.operator === '∨') {

                const p = implications.left.left;
                const q = implications.left.right;
                const r = implications.right.left;
                const s = implications.right.right;

                if (LogicParser.areAstsEqual(disjunction.left, p) && LogicParser.areAstsEqual(disjunction.right, r)) {
                    return { type: 'binary', operator: '∨', left: q, right: s };
                }
            }
            return null;
        }
    },
    // Subproof Rules
    'CP': {
        name: 'Conditional Proof (CP)',
        isSubproof: true,
        logicType: 'propositional',
        slots: [],
        start: (assumption) => {
            if (!assumption) {
                store.getState().addFeedback('CP requires an assumption.', 'error');
                return;
            }
            const assumptionAst = LogicParser.textToAst(assumption);
            store.getState().startSubproof('CP', assumptionAst);
        },
        end: (subproof) => {
            if (!subproof || subproof.type !== 'CP' || subproof.lines.length === 0) return null;
            const assumption = subproof.assumption;
            const lastLine = subproof.lines[subproof.lines.length - 1].formula;
            return { type: 'binary', operator: '→', left: assumption, right: lastLine };
        }
    },
    'RAA': {
        name: 'Reductio ad Absurdum (RAA)',
        isSubproof: true,
        logicType: 'propositional',
        slots: [],
        start: (assumption) => {
            if (!assumption) {
                store.getState().addFeedback('RAA requires an assumption.', 'error');
                return;
            }
            const assumptionAst = LogicParser.textToAst(assumption);
            // Typically, the assumption for RAA is the negation of what you want to prove.
            store.getState().startSubproof('RAA', assumptionAst);
        },
        end: (subproof) => {
            if (!subproof || subproof.type !== 'RAA' || subproof.lines.length < 2) return null;

            // Find a contradiction: a formula and its negation
            for (let i = 0; i < subproof.lines.length; i++) {
                for (let j = i + 1; j < subproof.lines.length; j++) {
                    const line1 = subproof.lines[i].formula;
                    const line2 = subproof.lines[j].formula;

                    if (line2.type === 'negation' && LogicParser.areAstsEqual(line1, line2.operand)) {
                        // Found ψ and ~ψ. The conclusion is the negation of the assumption.
                        return { type: 'negation', operand: subproof.assumption };
                    }
                    if (line1.type === 'negation' && LogicParser.areAstsEqual(line2, line1.operand)) {
                        // Found ~ψ and ψ
                        return { type: 'negation', operand: subproof.assumption };
                    }
                }
            }
            return null; // No contradiction found
        }
    },

    // First-Order Logic Rules
    'UI': {
        name: 'Universal Instantiation (UI)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: '∀x φ(x)', expectedPattern: 'quantifier.∀' }
        ],
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.instance) return null;
            const universal = premises[0].formula;
            if (universal.type !== 'quantifier' || universal.quantifier !== '∀') return null;

            // `instance` should be a variable or constant to replace the quantified variable.
            // For simplicity, we'll assume it's a simple variable name string like 'y' or a constant 'a'.
            const variableToReplace = universal.variable;
            const instanceAst = LogicParser.textToAst(additionalData.instance);

            return LogicParser.substitute(universal.formula, variableToReplace, instanceAst);
        }
    },
    'EG': {
        name: 'Existential Generalization (EG)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: 'φ(a)', expectedPattern: 'any' }
        ],
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.variable) return null;
            const specific_instance = premises[0].formula;
            const variable = additionalData.variable; // e.g., 'x'

            // This is tricky. We need to find the constant 'a' in F(a) and replace it with x.
            // This requires a more complex substitution logic or a UI to select the term to generalize.
            // Simple case: assume the formula is a predicate with one argument F(a) -> ∃x F(x)
            if (specific_instance.type === 'predicate' && specific_instance.args.length > 0) {
                // This is a simplification. A real implementation needs to handle complex formulas.
                const termToGeneralize = specific_instance.args[0]; // e.g., the 'a' AST
                const generalizedFormula = LogicParser.substitute(specific_instance, termToGeneralize.value, { type: 'variable', value: variable });
                return { type: 'quantifier', quantifier: '∃', variable: variable, formula: generalizedFormula };
            }
            return null;
        }
    },
    'EI': {
        name: 'Existential Instantiation (EI)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: '∃x φ(x)', expectedPattern: 'quantifier.∃' }
        ],
        // EI is a subproof rule in many systems, but can be a direct rule with restrictions.
        // Here, we'll treat it as a direct rule that introduces a *new* constant.
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.newConstant) return null;
            const existential = premises[0].formula;
            if (existential.type !== 'quantifier' || existential.quantifier !== '∃') return null;

            // IMPORTANT: `newConstant` must be a constant that has not appeared in the proof before.
            // This check should be performed by the calling logic (e.g., in the store).
            const variableToReplace = existential.variable;
            const constantAst = { type: 'variable', value: additionalData.newConstant }; // Treat constants as variables for substitution

            return LogicParser.substitute(existential.formula, variableToReplace, constantAst);
        }
    },
    'EE': {
        name: 'Existential Elimination (EE)',
        isSubproof: true,
        logicType: 'fol',
        slots: [
            { placeholder: '∃x φ(x)', expectedPattern: 'quantifier.∃' },
            { placeholder: 'ψ', expectedPattern: 'any' } // The conclusion of the subproof
        ],
        start: (premises) => {
            if (premises.length !== 1) return;
            const existentialFormula = premises[0].formula;
            if (existentialFormula.type !== 'quantifier' || existentialFormula.quantifier !== '∃') {
                store.getState().addFeedback('EE requires an existential formula.', 'error');
                return;
            }

            const variable = existentialFormula.variable;
            const formula = existentialFormula.formula;
            const constant = 'a'; // This should be a fresh constant not appearing in the proof
            const assumption = LogicParser.substitute(formula, variable, { type: 'variable', value: constant });

            store.getState().startSubproof('EE', assumption, { existentialFormula });
        },
        end: (subproof) => {
            if (!subproof || subproof.type !== 'EE' || subproof.lines.length === 0) return null;
            const conclusion = subproof.lines[subproof.lines.length - 1].formula;
            // Here we should check that the constant 'a' does not appear in the conclusion
            return conclusion;
        }
    },
    'UG': {
        name: 'Universal Generalization (UG)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: 'φ(a)', expectedPattern: 'any' } // where 'a' is arbitrary
        ],
        // UG is also complex. It requires that F(a) has been derived and 'a' is an arbitrary constant.
        // This is often handled within a subproof structure.
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.variable) return null;
            const specific_instance = premises[0].formula;
            const variable = additionalData.variable; // e.g., 'x'

            // The calling logic must verify that the constant being generalized is arbitrary.
            // Simple case: F(a) -> ∀x F(x)
            if (specific_instance.type === 'predicate') {
                const termToGeneralize = specific_instance.args[0]; // This is a huge simplification
                const generalizedFormula = LogicParser.substitute(specific_instance, termToGeneralize.value, { type: 'variable', value: variable });
                return { type: 'quantifier', quantifier: '∀', variable: variable, formula: generalizedFormula };
            }
            return null;
        }
    }
};

let activeRule = null;
let collectedPremises = [];

export function handleRuleItemClick(event) {
    const ruleElement = event.currentTarget;
    const ruleKey = ruleElement.dataset.rule;
    const rule = ruleSet[ruleKey];

    if (activeRule === ruleKey) {
        // Deactivate rule
        activeRule = null;
        collectedPremises = [];
        EventBus.emit('rules:deactivate');
        return;
    }

    activeRule = ruleKey;
    collectedPremises = [];
    EventBus.emit('rules:activate', ruleElement);

    if (rule.premises === 0) {
        applyActiveRule();
    }
}

export function handleDropOnRuleSlot(event, ruleElement) {
    event.preventDefault();
    event.stopPropagation();

    const ruleKey = ruleElement.dataset.rule;
    if (activeRule !== ruleKey) {
        // If a different rule is active, switch to this one
        handleRuleItemClick({ currentTarget: ruleElement });
    }

    const slot = event.target.closest('.drop-slot');
    if (!slot) return;

    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) return;
    const data = JSON.parse(jsonData);
    const premiseIndex = parseInt(slot.dataset.premiseIndex, 10);

    // Validate premise pattern if specified
    const expectedPattern = slot.dataset.expectedPattern;
    if (expectedPattern && expectedPattern !== 'any') {
        const formulaAst = LogicParser.textToAst(data.formula);
        const [type, operator] = expectedPattern.split('.');
        let match = formulaAst.type === type;
        if (operator) {
            match = match && formulaAst.operator === operator;
        }
        if (!match) {
            store.getState().addFeedback(`Invalid premise type for this slot. Expected ${expectedPattern}.`, 'error');
            return;
        }
    }

    collectedPremises[premiseIndex] = data;
    EventBus.emit('rules:fillSlot', { slot, data });

    const rule = ruleSet[activeRule];
    if (collectedPremises.filter(p => p).length === rule.premises) {
        applyActiveRule();
    }
}

function applyActiveRule() {
    if (!activeRule) return;

    const rule = ruleSet[activeRule];
    const premisesData = collectedPremises.map((p, index) => ({
        ...p,
        formula: LogicParser.textToAst(p.formula), // Ensure formula is AST
        line: p.line || null,
        source: p.source || null
    }));

    let additionalData = {};
    // Handle rules that need extra input, like 'Add'
    if (activeRule === 'Add') {
        const q = prompt('Enter the formula to add (e.g., Q):');
        if (!q) {
            resetRuleState();
            return;
        }
        additionalData.q = q;
    }

    const resultAst = rule.apply(premisesData, additionalData);

    if (resultAst) {
        const justification = `${activeRule} ${premisesData.map(p => p.line).join(', ')}`;
        addProofLine(LogicParser.astToText(resultAst), justification, store.getState().currentScopeLevel);
    } else {
        store.getState().addFeedback(`Rule ${activeRule} could not be applied.`, 'error');
    }

    resetRuleState();
}

function resetRuleState() {
    activeRule = null;
    collectedPremises = [];
    EventBus.emit('rules:deactivate');
    // Clear visual slots
    document.querySelectorAll('.rule-item .drop-slot').forEach(slot => {
        EventBus.emit('rules:clearSlot', slot);
    });
}

// --- Drag and Drop Highlighting ---

export function handleRuleItemDragEnter(event) {
    event.preventDefault();
    const item = event.currentTarget;
    item.classList.add('drag-over-rule');
    item.dataset.hoverTimer = setTimeout(() => {
        item.classList.add('active');
    }, 500);
}

export function handleRuleItemDragLeave(event) {
    const item = event.currentTarget;
    item.classList.remove('drag-over-rule');
    clearTimeout(item.dataset.hoverTimer);
}