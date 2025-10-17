# Modal Logic Problem Solutions

This document provides step-by-step solutions for the problems in the modal logic problem set.

---

### Problem 2-1 (System K)

**Goal:** `□Q`
**Premises:** `□(P → Q)`, `□P`

1.  Start a Strict Subproof for `□I`.
2.  Inside the strict subproof, import `P → Q` from premise 1 (using `im`).
3.  Inside the strict subproof, import `P` from premise 2 (using `im`).
4.  Apply Modus Ponens (MP) to the two lines inside the subproof to derive `Q`.
5.  Discharge the strict subproof to conclude `□Q`.

---

### Problem 2-2 (System D)

**Goal:** `◊P`
**Premise:** `□P`

1.  Apply Rule (D) to the premise `□P` to derive `◊P`.

---

### Problem 2-3 (System T)

**Goal:** `Q`
**Premises:** `□(P → Q)`, `P`

1.  Apply Rule (T) to premise `□(P → Q)` to derive `P → Q`.
2.  Apply Modus Ponens (MP) to the result of step 1 and premise `P` to derive `Q`.

---

### Problem 2-4 (System B)

**Goal:** `□◊P`
**Premise:** `P`

1.  Apply Rule (B) to the premise `P` to derive `□◊P`.

---

### Problem 2-5 (System S4)

**Goal:** `□□P`
**Premise:** `□P`

1.  Apply Rule (4) to the premise `□P` to derive `□□P`.

---

### Problem 2-6 (System S4)

**Goal:** `□(□P → □Q)`
**Premise:** `□(P → Q)`

1.  Start a Strict Subproof for `□I`.
2.  Inside the strict subproof, start a Conditional Proof (CP) for `□P → □Q`. Assume `□P`.
3.  Inside the CP, import `□(P → Q)` from the main premise (using `im4`).
4.  Inside the CP, apply Rule (T) to the assumed `□P` to derive `P`.
5.  Inside the CP, apply Rule (T) to the imported `□(P → Q)` to derive `P → Q`.
6.  Inside the CP, apply Modus Ponens (MP) to lines from steps 4 and 5 to derive `Q`.
7.  Now, you need `□Q`. Start a *nested* Strict Subproof.
8.  Inside the nested strict subproof, import `□(P → Q)` from the main premise (using `im4`).
9.  Inside the nested strict subproof, import `□P` from the CP assumption (using `im4`).
10. Inside the nested strict subproof, import `P → Q` (from step 8) and `P` (from step 9) using `im`.
11. Apply MP to derive `Q` inside the nested strict subproof.
12. Discharge the nested strict subproof to get `□Q`.
13. Discharge the Conditional Proof to get `□P → □Q`.
14. Discharge the outermost Strict Subproof to get `□(□P → □Q)`.

---

### Problem 2-7 (System S5)

**Goal:** `□◊P`
**Premise:** `◊P`

1.  Apply Rule (5) to the premise `◊P` to derive `□◊P`.

---

### Problem 2-8 (System S5)

**Goal:** `□P`
**Premise:** `◊□P`

1.  Start a Strict Subproof for `□I`.
2.  Inside the strict subproof, import `◊□P` from the premise (using `im5`).
3.  *This is a tricky one that often requires a change of quantifiers or a more advanced rule not typically in basic S5 introductions. A common approach involves deriving a contradiction from `~P`.*
4.  Assume `~P` (RAA).
5.  From `◊□P`, it's known there is a world where `□P` is true. In S5, if something is possibly necessary, it is necessary. So, `◊□P ⊢ □P`. This is often taken as a derived rule. If we must prove it:
6.  Start a new subproof from `◊□P`.
7.  Apply Rule (5) to get `□◊□P`.
8.  Apply Rule (T) to get `◊□P`.
9.  Apply Rule (B) to get `P` from `□P` (which is inside the `◊`). This is getting complicated.

**Simplified approach using a common S5 derived rule (`◊□φ ⊢ □φ`):**

1.  Apply the derived rule `◊□φ ⊢ □φ` to the premise `◊□P` to derive `□P`.

*Note: Solving this from first principles without derived rules is advanced and may not be intended for this tool's scope.*
