import { problemSet2 } from './problem-set-2.js';

const problemSet1 = {
    1: {
        name: "Propositional Logic",
        problems: [
            { system: 'propositional', premises: ['P → Q', 'P'], goal: {formula: 'Q'} },
            { system: 'propositional', premises: ['P → Q', '~Q'], goal: {formula: '~P'} },
            { system: 'propositional', premises: ['P ∨ Q', '~P'], goal: {formula: 'Q'} },
            { system: 'propositional', premises: ['P', 'Q'], goal: {formula: 'P ∧ Q'} },
            { system: 'propositional', premises: ['P ∧ Q'], goal: {formula: 'P'} },
            { system: 'propositional', premises: ['P'], goal: {formula: 'P ∨ Q'} },
            { system: 'propositional', premises: ['(P → Q) ∧ (R → S)', 'P ∨ R'], goal: {formula: 'Q ∨ S'} },
            { system: 'propositional', premises: ['P → Q', 'Q → R'], goal: {formula: 'P → R'} },
            { system: 'propositional', premises: ['P → (Q → R)', 'P ∧ Q'], goal: {formula: 'R'} },
            { system: 'propositional', premises: ['~(P ∧ Q)', 'P'], goal: {formula: '~Q'} },
        ]
    }
};

export const problemSets = { ...problemSet1, ...problemSet2 };
