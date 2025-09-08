import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';

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
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: 'φ', expectedPattern: 'any' },
            { placeholder: 'ψ', expectedPattern: 'any' }
        ],
        apply: (premises) => {
            if (premises.length !== 2) return null;
            const [p, q] = premises.map(p => p.formula);
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
                return p_and_q.left;
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
        premises: 2,
        logicType: 'propositional',
        slots: [
            { placeholder: '(φ → ψ) ∧ (χ → ω)', expectedPattern: 'binary.∧' },
            { placeholder: 'φ ∨ χ', expectedPattern: 'binary.∨' }
        ],
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
            store.getState().startSubproof('RAA', assumptionAst);
        },
        end: (subproof) => {
            if (!subproof || subproof.type !== 'RAA' || subproof.lines.length < 2) return null;
            for (let i = 0; i < subproof.lines.length; i++) {
                for (let j = i + 1; j < subproof.lines.length; j++) {
                    const line1 = subproof.lines[i].formula;
                    const line2 = subproof.lines[j].formula;

                    if (line2.type === 'negation' && LogicParser.areAstsEqual(line1, line2.operand)) {
                        return { type: 'negation', operand: subproof.assumption };
                    }
                    if (line1.type === 'negation' && LogicParser.areAstsEqual(line2, line1.operand)) {
                        return { type: 'negation', operand: subproof.assumption };
                    }
                }
            }
            return null;
        }
    },
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
            const instanceAst = LogicParser.textToAst(additionalData.instance);
            return LogicParser.substitute(universal.formula, universal.variable, instanceAst);
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
            const variable = additionalData.variable;
            if (specific_instance.type === 'predicate' && specific_instance.args.length > 0) {
                const termToGeneralize = specific_instance.args[0];
                const generalizedFormula = LogicParser.substitute(specific_instance, termToGeneralize, { type: 'variable', name: variable });
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
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.newConstant) return null;
            const existential = premises[0].formula;
            if (existential.type !== 'quantifier' || existential.quantifier !== '∃') return null;
            const variableToReplace = existential.variable;
            const constantAst = { type: 'variable', name: additionalData.newConstant };
            return LogicParser.substitute(existential.formula, variableToReplace, constantAst);
        }
    },
    'EE': {
        name: 'Existential Elimination (EE)',
        isSubproof: true,
        logicType: 'fol',
        slots: [
            { placeholder: '∃x φ(x)', expectedPattern: 'quantifier.∃' },
            { placeholder: 'ψ', expectedPattern: 'any' }
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
            const constant = 'a';
            const assumption = LogicParser.substitute(formula, variable, { type: 'variable', name: constant });
            store.getState().startSubproof('EE', assumption, { existentialFormula });
        },
        end: (subproof) => {
            if (!subproof || subproof.type !== 'EE' || subproof.lines.length === 0) return null;
            const conclusion = subproof.lines[subproof.lines.length - 1].formula;
            return conclusion;
        }
    },
    'UG': {
        name: 'Universal Generalization (UG)',
        premises: 1,
        logicType: 'fol',
        slots: [
            { placeholder: 'φ(a)', expectedPattern: 'any' }
        ],
        apply: (premises, additionalData) => {
            if (premises.length !== 1 || !additionalData || !additionalData.variable) return null;
            const specific_instance = premises[0].formula;
            const variable = additionalData.variable;
            if (specific_instance.type === 'predicate' && specific_instance.args.length > 0) {
                const termToGeneralize = specific_instance.args[0];
                const generalizedFormula = LogicParser.substitute(specific_instance, termToGeneralize, { type: 'variable', name: variable });
                return { type: 'quantifier', quantifier: '∀', variable: variable, formula: generalizedFormula };
            }
            return null;
        }
    }
};

export const Rules = {
    applyRule: function(ruleName, premises) {
        if (!ruleSet[ruleName]) {
            return { applied: false, error: `Rule ${ruleName} not found` };
        }
        
        const rule = ruleSet[ruleName];
        
        if (premises.length !== rule.premises) {
            return { applied: false, error: `Rule ${ruleName} requires ${rule.premises} premises, got ${premises.length}` };
        }
        
        const result = rule.apply(premises);
        
        if (result) {
            return { applied: true, conclusion: result, rule: ruleName };
        }
        
        return { applied: false, error: `Rule ${ruleName} does not apply to these premises` };
    },

    getRuleSet: function() {
        return ruleSet;
    }
};