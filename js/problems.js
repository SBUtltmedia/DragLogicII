export const problemSets = {
  1: { // Propositional Logic
    name: "Propositional Logic",
    problems: [
      { premises: ["P → Q", "P"], goal: "Q" }, // 1. Modus Ponens
      { premises: ["P → Q", "~Q"], goal: "~P" }, // 2. Modus Tollens
      { premises: ["P ∨ Q", "~P"], goal: "Q" }, // 3. Disjunctive Syllogism
      { premises: ["P → Q", "Q → R"], goal: "P → R" }, // 4. Hypothetical Syllogism
      { premises: ["P", "Q"], goal: "P ∧ Q" }, // 5. Conjunction Intro
      { premises: ["P ∧ Q"], goal: "P" }, // 6. Conjunction Elim
      { premises: ["P"], goal: "P ∨ Q" }, // 7. Disjunction Intro
      { premises: ["(P ∧ Q) → R", "P", "Q"], goal: "R" }, // 8.
      { premises: ["P → (Q → R)", "P ∧ Q"], goal: "R" }, // 9.
      { premises: ["~P → ~Q", "Q"], goal: "P" } // 10.
    ]
  },
  2: { // First-Order Logic
    name: "First-Order Logic",
    problems: [
      { premises: ["∀x(F(x) → G(x))", "∃x(F(x))"], goal: "∃x(G(x))" }, // **CHANGED** 1. Classic ∃E
      { premises: ["∀x(F(x) ∧ G(x))"], goal: "∀x(G(x) ∧ F(x))" }, // 2. Commutativity
      { premises: ["∃x(F(x))"], goal: "∃y(F(y))" }, // 3. Variable Swap (needs subproof)
      { premises: ["∀x(F(x) → G(x))", "∀x(G(x) → H(x))"], goal: "∀x(F(x) → H(x))" }, // 4.
      { premises: ["∃x(F(x) ∧ G(x))"], goal: "∃x(F(x)) ∧ ∃x(G(x))" }, // 5.
      { premises: ["∀x(F(x)) ∨ ∀x(G(x))"], goal: "∀x(F(x) ∨ G(x))" }, // 6.
      { premises: ["~∃x(F(x))"], goal: "∀x(~F(x))" }, // 7. Quantifier Negation
      { premises: ["∀x(F(x) → G(x))", "∃x(F(x))"], goal: "∃x(G(x))" }, // 8. (Same as 1)
      { premises: ["∃x(∀y(F(x,y)))"], goal: "∀y(∃x(F(x,y)))" }, // 9.
      { premises: ["∀x(P(x) → Q)", "∃x(P(x))"], goal: "Q" } // 10. Mixed
    ]
  }
};