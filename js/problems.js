import { createFormula } from './formula.js';

export const problemSets = {
  1: { // Propositional Logic
    name: "Propositional Logic",
    problems: [
      { premises: [createFormula("P → Q"), createFormula("P")], goal: createFormula("Q") }, // 1. Modus Ponens
      { premises: [createFormula("P → Q"), createFormula("~Q")], goal: createFormula("~P") }, // 2. Modus Tollens
      { premises: [createFormula("P ∨ Q"), createFormula("~P")], goal: createFormula("Q") }, // 3. Disjunctive Syllogism
      { premises: [createFormula("P → Q"), createFormula("Q → R")], goal: createFormula("P → R") }, // 4. Hypothetical Syllogism
      { premises: [createFormula("P"), createFormula("Q")], goal: createFormula("P ∧ Q") }, // 5. Conjunction Intro
      { premises: [createFormula("P ∧ Q")], goal: createFormula("P") }, // 6. Conjunction Elim
      { premises: [createFormula("P")], goal: createFormula("P ∨ Q") }, // 7. Disjunction Intro
      { premises: [createFormula("(P ∧ Q) → R"), createFormula("P"), createFormula("Q")], goal: createFormula("R") }, // 8.
      { premises: [createFormula("P → (Q → R)"), createFormula("P ∧ Q")], goal: createFormula("R") }, // 9.
      { premises: [createFormula("~P → ~Q"), createFormula("Q")], goal: createFormula("P") } // 10.
    ]
  },
  2: { // First-Order Logic
    name: "First-Order Logic",
    problems: [
      { premises: [createFormula("∀x(F(x) → G(x))"), createFormula("∃x(F(x))")], goal: createFormula("∃x(G(x))") }, // **CHANGED** 1. Classic ∃E
      { premises: [createFormula("∀x(F(x) ∧ G(x))")], goal: createFormula("∀x(G(x) ∧ F(x))") }, // 2. Commutativity
      { premises: [createFormula("∃x(F(x))")], goal: createFormula("∃y(F(y))") }, // 3. Variable Swap (needs subproof)
      { premises: [createFormula("∀x(F(x) → G(x))"), createFormula("∀x(G(x) → H(x))")], goal: createFormula("∀x(F(x) → H(x))") }, // 4.
      { premises: [createFormula("∃x(F(x) ∧ G(x))")], goal: createFormula("∃x(F(x)) ∧ ∃x(G(x))") }, // 5.
      { premises: [createFormula("∀x(F(x)) ∨ ∀x(G(x))")], goal: createFormula("∀x(F(x) ∨ G(x))") }, // 6.
      { premises: [createFormula("~∃x(F(x))")], goal: createFormula("∀x(~F(x))") }, // 7. Quantifier Negation
      { premises: [createFormula("∀x(F(x) → G(x))"), createFormula("∃x(F(x))")], goal: createFormula("∃x(G(x))") }, // 8. (Same as 1)
      { premises: [createFormula("∃x(∀y(F(x,y)))")], goal: createFormula("∀y(∃x(F(x,y)))") }, // 9.
      { premises: [createFormula("∀x(F(x) → G(x))"), createFormula("∃x(F(x))")], goal: createFormula("∃x(G(x))") } // 10. Mixed
    ]
  }
};