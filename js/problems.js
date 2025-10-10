export const problemSets = {
    1: {
        name: "Propositional Logic",
        problems: [
            { premises: ['P → Q', 'P'], goal: {formula: 'Q'} },
            { premises: ['P → Q', '~Q'], goal: {formula: '~P'} },
            { premises: ['P ∨ Q', '~P'], goal: {formula: 'Q'} },
            { premises: ['P', 'Q'], goal: {formula: 'P ∧ Q'} },
            { premises: ['P ∧ Q'], goal: {formula: 'P'} },
            { premises: ['P'], goal: {formula: 'P ∨ Q'} },
            { premises: ['(P → Q) ∧ (R → S)', 'P ∨ R'], goal: {formula: 'Q ∨ S'} },
            { premises: ['P → Q', 'Q → R'], goal: {formula: 'P → R'} }, // Hypothetical Syllogism (HS) - requires CP
            { premises: ['P → (Q → R)', 'P ∧ Q'], goal: {formula: 'R'} },
            { premises: ['~(P ∧ Q)', 'P'], goal: {formula: '~Q'} }, // Requires De Morgan's laws or RAA
        ]
    }
};