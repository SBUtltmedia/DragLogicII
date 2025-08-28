import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { LogicParser } from './parser.js';

// --- Rule Definitions and Application Functions ---
const ruleSet = {
    // -- Modus Ponens (MP) --
    MP: {
        name: "Modus Ponens",
        premises: 2,
        pattern: [
            { type: 'binary', operator: '→' },
            { type: 'atomic' }
        ],
        apply: function(premise1, premise2) {
            if (premise1 && premise2) {
                if (premise1.type === 'binary' && premise1.operator === '→') {
                    // If premise2 matches the left side of premise1
                    if (LogicParser.areAstsEqual(premise2, premise1.left)) {
                        return premise1.right; // Return the right side as conclusion
                    }
                }
            }
            return null;
        }
    },

    // -- Modus Tollens (MT) --
    MT: {
        name: "Modus Tollens",  
        premises: 2,
        pattern: [
            { type: 'binary', operator: '→' },
            { type: 'negation' }
        ],
        apply: function(premise1, premise2) {
            if (premise1 && premise2) {
                if (premise1.type === 'binary' && premise1.operator === '→') {
                    // If premise2 is ~A and A is the right side of premise1
                    if (premise2.type === 'negation' && LogicParser.areAstsEqual(premise2.operand, premise1.right)) {
                        return { type: 'negation', operand: premise1.left };
                    }
                }
            }
            return null;
        }
    },

    // -- And Introduction (∧I) --
    ANDI: {
        name: "And Introduction",
        premises: 2,
        pattern: [{ type: 'atomic' }, { type: 'atomic' }],
        apply: function(premise1, premise2) {
            if (premise1 && premise2 && premise1.type === 'atomic' && premise2.type === 'atomic') {
                return { type: 'binary', operator: '∧', left: premise1, right: premise2 };
            }
            return null;
        }
    },

    // -- And Elimination (∧E) --
    ANDE: {
        name: "And Elimination",
        premises: 1,
        pattern: [{ type: 'binary', operator: '∧' }],
        apply: function(premise1) {
            if (premise1 && premise1.type === 'binary' && premise1.operator === '∧') {
                // Return either left or right side
                return premise1.left; // Or could return premise1.right
            }
            return null;
        }
    },

    // -- Or Introduction (∨I) --
    ORI: {
        name: "Or Introduction",
        premises: 1,
        pattern: [{ type: 'atomic' }],
        apply: function(premise1, premise2 = null) {
            if (premise1 && premise1.type === 'atomic') {
                // We can add the premise to either side of a disjunction
                return { type: 'binary', operator: '∨', left: premise1, right: { type: 'atomic', value: 'dummy' } };
            }
            return null;
        }
    },

    // -- Or Elimination (∨E) --
    ORE: {
        name: "Or Elimination",
        premises: 3,
        pattern: [
            { type: 'binary', operator: '∨' },
            { type: 'binary', operator: '→' }, 
            { type: 'binary', operator: '→' }
        ],
        apply: function(premise1, premise2, premise3) {
            // This is a simplified version - full ∨E would require complex subproof handling
            if (premise1 && premise1.type === 'binary' && premise1.operator === '∨') {
                // For now: return one of the disjuncts if it matches conditions 
                return premise1.left;
            }
            return null;
        }
    },

    // -- Conditional Proof (CP) --
    CP: {
        name: "Conditional Proof",
        premises: 0, // No direct premises needed, assumes a subproof
        pattern: [], 
        apply: function(premise1, premise2, premise3) {
            // For now - just return null because CP is a meta-rule that affects scope,
            // not an inference rule with immediate conclusion.
            return null;
        }
    },

    // -- Reductio ad Absurdum (RAA) --
    RAA: {
        name: "Reductio ad Absurdum",
        premises: 0, // No direct premises needed, assumes a subproof
        pattern: [],
        apply: function(premise1, premise2, premise3) {
            // For now - just return null because RAA requires the assumption to lead to contradiction
            return null;
        }
    },

    // -- Universal Introduction (∀I) --
    UI: {
        name: "Universal Introduction",
        premises: 1,
        pattern: [{ type: 'atomic' }], 
        apply: function(premise1) {
            if (premise1 && premise1.type === 'atomic') {
                // For now - return a quantified formula
                // This is simplified - proper UI would need to check for free variables
                return { type: 'quantifier', quantifier: '∀', variable: 'x', formula: premise1 };
            }
            return null;
        }
    },

    // -- Universal Elimination (∀E) --
    UE: {
        name: "Universal Elimination",
        premises: 1,
        pattern: [{ type: 'quantifier', quantifier: '∀' }],
        apply: function(premise1) {
            if (premise1 && premise1.type === 'quantifier' && premise1.quantifier === '∀') {
                return premise1.formula; // Return the formula inside the quantifier
            }
            return null;
        }
    },

    // -- Existential Introduction (∃I) --
    EI: {
        name: "Existential Introduction",
        premises: 1,
        pattern: [{ type: 'atomic' }],
        apply: function(premise1) {
            if (premise1 && premise1.type === 'atomic') {
                return { type: 'quantifier', quantifier: '∃', variable: 'x', formula: premise1 };
            }
            return null;
        }
    },

    // -- Existential Elimination (∃E) --  
    EE: {
        name: "Existential Elimination",
        premises: 2,
        pattern: [
            { type: 'quantifier', quantifier: '∃' },
            { type: 'binary', operator: '→' }
        ],
        apply: function(premise1, premise2) {
            if (premise1 && premise1.type === 'quantifier' && premise1.quantifier === '∃') {
                // For now return the formula from the quantifier
                return premise1.formula; // Simplified - real EE would need subproof logic
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
        
        // Validate premises
        if (premises.length !== rule.premises) {
            return { applied: false, error: `Rule ${ruleName} requires ${rule.premises} premises, got ${premises.length}` };
        }
        
        // Try to apply the rule
        const result = rule.apply(premises[0], premises[1], premises[2]);
        
        if (result) {
            return { applied: true, conclusion: result, rule: ruleName };
        }
        
        return { applied: false, error: `Rule ${ruleName} does not apply to these premises` };
    },

    getRuleSet: function() {
        return ruleSet;
    }
};

// Dummy exports for functions that are used in the UI but not yet implemented
export const handleRuleItemClick = () => {};
export const handleRuleItemDragEnter = () => {};
export const handleRuleItemDragLeave = () => {};
export const handleDropOnRuleSlot = () => {};
