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
    },
    2: {
        name: "First-Order Logic",
        problems: [
            { premises: ['∀x(F(x) → G(x))', 'F(a)'], goal: {formula: 'G(a)'} },
            { premises: ['∀x(H(x) ∧ I(x))'], goal: {formula: '∀xH(x)'} },
            { premises: ['∃x(J(x) ∨ K(x))'], goal: {formula: '∃xJ(x) ∨ ∃xK(x)'} },
            { premises: ['F(a)'], goal: {formula: '∃x(F(x))'} },
            { premises: ['∀x(F(x))'], goal: {formula: 'F(a)'} },
            { premises: ['∀x(F(x) → G(x))', '~G(a)'], goal: {formula: '~F(a)'} },
            { premises: ['∃x(F(x) ∧ G(x))'], goal: {formula: '∃x(F(x))'} },
            { premises: ['∀x(F(x) → G(x))', '∀x(G(x) → H(x))'], goal: {formula: '∀x(F(x) → H(x))'} },
            { premises: ['∃x(F(x))', '∀x(F(x) → G(x))'], goal: {formula: '∃x(G(x))'} },
            { premises: ['~∃x(F(x))'], goal: {formula: '∀x(~F(x))'} },
        ]
    }
};