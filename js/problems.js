const problemSets = {
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

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const set = params.get('set');
    const problem = params.get('problem');
    return { set: set ? parseInt(set) : null, problem: problem ? parseInt(problem) : null };
}

function getNextProblem() {
    const { set, number } = currentProblem;
    if (problemSets[set] && problemSets[set].problems.length > number) {
        return { set, problem: (number + 1).toString() };
    }
    // Check if there is a next set
    if (problemSets[set + 1]) {
        return { set: set + 1, problem: '1' };
    }
    return null; // No more problems
}

function loadProblem(set, problemNumber) {
    const problemNum = parseInt(problemNumber, 10);
    if (!problemSets[set] || !problemSets[set].problems[problemNum - 1]) {
        showFeedback(`Problem ${set}-${problemNum} not found. Loading default.`, true);
        // Load a default problem if the requested one is not found
        loadProblem(1, '1');
        return;
    }

    currentProblem = { set, number: problemNum };
    const problem = problemSets[set].problems[problemNum - 1];
    premises = problem.premises.map(p => ({ formula: p, justification: "Premise" }));
    goalFormula = problem.goal;

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('set', set);
    url.searchParams.set('problem', problemNum);
    window.history.pushState({}, '', url);

    // Reset the entire proof state with the new problem data
    resetProofState();

    // Update the UI to reflect the logic type
    updateLogicUIVisibility();
}

function resetProofState() {
    if (!proofList) return;

    // Clear the proof board
    proofList.innerHTML = '';
    nextLineNumberGlobal = 1;
    currentScopeLevel = 0;
    subGoalStack = [];
    updateSubGoalDisplay();

    // Re-enable proof area
    const proofArea = document.getElementById('proof-area');
    if (proofArea) {
        proofArea.classList.remove('proof-complete');
    }

    // Dynamically update the premise and goal displays based on the current problem
    const problemInfoDiv = document.getElementById('proof-problem-info');
    let problemHtml = '';
    premises.forEach((p, i) => {
        problemHtml += `<div class="proof-header">Premise ${i + 1}: <span>${p.formula}</span></div>`;
    });
    problemHtml += `<div class="proof-goal">Prove: <span>${goalFormula}</span></div>`;
    problemInfoDiv.innerHTML = problemHtml;

    // Set the game title
    const problemSetInfo = problemSets[currentProblem.set];
    if(gameTitle) gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${currentProblem.number}`;

    // Add the current premises to the proof
    premises.forEach(p => addProofLine(p.formula, p.justification, 0));

    // Reset UI elements
    ruleItems.forEach(item => { item.classList.remove('active'); clearRuleSlots(item); });
    wffOutputTray.innerHTML = '';
    clearWffInProgress();

    // Reset WFF tray zoom
    wffTrayFontSize = 2.4;
    changeWffTrayZoom(0);

    // **NEW**: Reset main zoom
    gameWrapper.classList.remove('zoomed');
    gameWrapper.style.transformOrigin = '';


    // Reset feedback history
    feedbackHistory = [];
    currentFeedbackIndex = -1;
    displayCurrentFeedback();
    showFeedback(`Problem ${currentProblem.set}-${currentProblem.number} loaded. Good luck!`, false);

    // Pre-populate tray for FOL problems
    if (currentProblem.set == 2) {
        createDraggableWffInTray('x');
        createDraggableWffInTray('y');
        createDraggableWffInTray('F(x)');
    }
}
