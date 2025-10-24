import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';

// --- Rule Definitions and Application Functions ---
export const ruleSet = {
    // -- Propositional Rules --
    MP: {
        name: "Modus Ponens",
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
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
    MT: {
        name: "Modus Tollens",  
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' },
            { placeholder: '~ψ', expectedPattern: 'unary.~' }
        ],
        conclusion: '~φ',
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p_implies_q, not_q] = premises.map(p => p.formula);

            if (p_implies_q.type === 'binary' && p_implies_q.operator === '→' && not_q.type === 'unary' && not_q.operator === '~') {
                if (LogicParser.areAstsEqual(p_implies_q.right, not_q.operand)) {
                    return { type: 'unary', operator: '~', operand: p_implies_q.left };
                }
            }
            return null;
        }
    },
    DS: {
        name: 'Disjunctive Syllogism (DS)',
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: 'φ ∨ ψ', expectedPattern: 'binary.∨' },
            { placeholder: '~φ', expectedPattern: 'unary.~' }
        ],
        conclusion: 'ψ',
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p_or_q, not_p] = premises.map(p => p.formula);

            if (p_or_q.type === 'binary' && p_or_q.operator === '∨' && not_p.type === 'unary' && not_p.operator === '~') {
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
    Add: {
        name: 'Addition (Add / ∨I)',
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: 'φ (from proof or WFF)' },
            { placeholder: 'ψ (from proof or WFF)' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p1, p2] = premises;

            const p1_line = p1.lineId;
            const p2_line = p2.lineId;

            if (!p1_line && !p2_line) {
                EventBus.emit('feedback:show', { message: 'Addition requires at least one line from the proof.', isError: true });
                return null;
            }

            const justificationLines = [p1_line, p2_line].filter(Boolean).join(', ');

            const ast1 = LogicParser.textToAst(p1.formula);
            const ast2 = LogicParser.textToAst(p2.formula);
            
            return {
                resultAst: { type: 'binary', operator: '∨', left: ast1, right: ast2 },
                justification: `Add, ${justificationLines}`
            };
        }
    },
    Simp: {
        name: 'Simplification (Simp)',
        premises: 1,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
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
    Conj: {
        name: 'Conjunction (Conj)',
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
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
    CD: {
        name: 'Constructive Dilemma (CD)',
        premises: 2,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
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

    // -- Modal Rules --
    D: {
        name: '(D) / bd',
        premises: 1,
        systems: ['D', 'T', 'B', 'S4', 'S5'],
        slots: [{ placeholder: '□φ', expectedPattern: 'unary.□' }],
        conclusion: '◊φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const box_phi = premises[0].formula;
            if (box_phi.type === 'unary' && box_phi.operator === '□') {
                return { type: 'unary', operator: '◊', operand: box_phi.operand };
            }
            return null;
        }
    },
    T: {
        name: '(T) / NI',
        premises: 1,
        systems: ['T', 'B', 'S4', 'S5'],
        slots: [{ placeholder: '□φ', expectedPattern: 'unary.□' }],
        conclusion: 'φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const box_phi = premises[0].formula;
            if (box_phi.type === 'unary' && box_phi.operator === '□') {
                return box_phi.operand;
            }
            return null;
        }
    },
    B: {
        name: '(B)',
        premises: 1,
        systems: ['B', 'S5'],
        slots: [{ placeholder: 'φ', expectedPattern: 'any' }],
        conclusion: '□◊φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const phi = premises[0].formula;
            return { type: 'unary', operator: '□', operand: { type: 'unary', operator: '◊', operand: phi } };
        }
    },
    4: {
        name: '(4)',
        premises: 1,
        systems: ['S4', 'S5'],
        slots: [{ placeholder: '□φ', expectedPattern: 'unary.□' }],
        conclusion: '□□φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const box_phi = premises[0].formula;
            if (box_phi.type === 'unary' && box_phi.operator === '□') {
                return { type: 'unary', operator: '□', operand: box_phi };
            }
            return null;
        }
    },
    5: {
        name: '(5)',
        premises: 1,
        systems: ['S5'],
        slots: [{ placeholder: '◊φ', expectedPattern: 'unary.◊' }],
        conclusion: '□◊φ',
        apply: (premises) => {
            if (premises.length !== 1) return null;
            const diamond_phi = premises[0].formula;
            if (diamond_phi.type === 'unary' && diamond_phi.operator === '◊') {
                return { type: 'unary', operator: '□', operand: diamond_phi };
            }
            return null;
        }
    },
};

export const subproofRuleSet = {
    CP: {
        name: "Conditional Proof (→I)",
        premises: 1,
        isSubproof: true,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: 'φ → ψ', expectedPattern: 'binary.→' }
        ],
        apply: () => null
    },
    RAA: {
        name: "Reductio ad Absurdum",
        premises: 1,
        isSubproof: true,
        systems: ['propositional', 'K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' }
        ],
        apply: () => null
    },
    Strict: {
        name: "Strict Subproof (□I)",
        premises: 1, 
        isSubproof: true,
        systems: ['K', 'D', 'T', 'B', 'S4', 'S5'],
        slots: [
            { placeholder: '□φ', expectedPattern: 'unary.□' }
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