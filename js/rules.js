import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';

// --- Rule Definitions and Application Functions ---
export const ruleSet = {
    // -- Modus Ponens (MP) --
    MP: {
        name: "Modus Ponens",
        premises: 2,
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' },
            { placeholder: 'φ', expectedPattern: 'any' }
        ],
        conclusion: 'ψ',
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

    // -- Modus Tollens (MT) --
    MT: {
        name: "Modus Tollens",  
        premises: 2,
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' },
            { placeholder: '~ψ', expectedPattern: 'negation' }
        ],
        conclusion: '~φ',
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

    // -- Disjunctive Syllogism (DS) --
    DS: {
        name: 'Disjunctive Syllogism (DS)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ ∨ ψ', expectedPattern: 'binary.∨' },
            { placeholder: '~φ', expectedPattern: 'negation' }
        ],
        conclusion: 'ψ',
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

    // -- Addition (Add) --
    Add: {
        name: 'Addition (Add)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' },
            { placeholder: 'ψ', expectedPattern: 'any' }
        ],
        conclusion: 'φ ∨ ψ',
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p, q] = premises.map(p => p.formula);
            return { type: 'binary', operator: '∨', left: p, right: q };
        }
    },

    // -- Simplification (Simp) --
    Simp: {
        name: 'Simplification (Simp)',
        premises: 1,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ ∧ ψ', expectedPattern: 'binary.∧' }
        ],
        conclusion: 'φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const p_and_q = premises[0].formula;
            if (p_and_q.type === 'binary' && p_and_q.operator === '∧') {
                return p_and_q.left;
            }
            return null;
        }
    },

    // -- Conjunction (Conj) --
    Conj: {
        name: 'Conjunction (Conj)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' },
            { placeholder: 'ψ', expectedPattern: 'any' }
        ],
        conclusion: 'φ ∧ ψ',
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p, q] = premises.map(p => p.formula);
            return { type: 'binary', operator: '∧', left: p, right: q };
        }
    },

    // -- Constructive Dilemma (CD) --
    CD: {
        name: 'Constructive Dilemma (CD)',
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: '(φ → ψ) ∧ (χ → ω)', expectedPattern: 'binary.∧' },
            { placeholder: 'φ ∨ χ', expectedPattern: 'binary.∨' }
        ],
        conclusion: 'ψ ∨ ω',
        apply: (premises) => {
            if (premises.length !== 2) return null;
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
};

export const subproofRuleSet = {
    CP: {
        name: "Conditional Proof",
        premises: 1,
        isSubproof: true,
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' }
        ],
        apply: () => null
    },
    RAA: {
        name: "Reductio ad Absurdum",
        premises: 1,
        isSubproof: true,
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' }
        ],
        apply: () => null
    }
};

export const Rules = {
    applyRule: function(ruleName, premises) {
        if (!ruleSet[ruleName]) {
            return { applied: false, error: `Rule ${ruleName} not found` };
        }
        
        const rule = ruleSet[ruleName];
        
        // Validate premises
        if (premises.length !== rule.premises) {
            return { applied: false, error: `Rule ${ruleName} requires ${rule.premises} premises, got ${premises.length}` };
        }
        
        // Try to apply the rule
        const result = rule.apply(premises);
        
        if (result) {
            return { applied: true, conclusion: result, rule: ruleName };
        }
        
        return { applied: false, error: `Rule ${ruleName} does not apply to these premises` };
    },

    getRuleSet: function() {
        return ruleSet;
    },

    getSubproofRuleSet: function() {
        return subproofRuleSet;
    }
};

// Dummy exports for functions that are used in the UI but not yet implemented
export const handleRuleItemClick = () => {};
export const handleRuleItemDragEnter = () => {};
export const handleRuleItemDragLeave = () => {};
export const handleDropOnRuleSlot = () => {};
