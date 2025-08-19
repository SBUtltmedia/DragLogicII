export const problemSets = {
    1: {
        name: "Propositional Logic",
        problems: [
            { premises: ['P → Q', 'P'], goal: 'Q' },
            { premises: ['P → Q', '~Q'], goal: '~P' },
            { premises: ['P ∨ Q', '~P'], goal: 'Q' },
            { premises: ['P', 'Q'], goal: 'P ∧ Q' },
            { premises: ['P ∧ Q'], goal: 'P' },
            { premises: ['P'], goal: 'P ∨ Q' },
            { premises: ['(P → Q) ∧ (R → S)', 'P ∨ R'], goal: 'Q ∨ S' },
            { premises: ['P → Q', 'Q → R'], goal: 'P → R' }, // Hypothetical Syllogism (HS) - requires CP
            { premises: ['P → (Q → R)', 'P ∧ Q'], goal: 'R' },
            { premises: ['~(P ∧ Q)', 'P'], goal: '~Q' }, // Requires De Morgan's laws or RAA
        ]
    },
    2: {
        name: "First-Order Logic",
        problems: [
            { premises: ['∀x(F(x) → G(x))', 'F(a)'], goal: 'G(a)' },
            { premises: ['∀x(H(x) ∧ I(x))'], goal: '∀xH(x)' }, // This is not strictly valid - needs clarification
            { premises: ['∃x(J(x) ∨ K(x))'], goal: '∃xJ(x) ∨ ∃xK(x)' },
            { premises: ['F(a)'], goal: '∃x(F(x))' },
            { premises: ['∀x(F(x))'], goal: 'F(a)' },
        ]
    }
};