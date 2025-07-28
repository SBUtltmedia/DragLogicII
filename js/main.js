document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    initGame();
});

function initGame() {
    addEventListeners();

    // Load the initial problem
    const params = getUrlParams();
    loadProblem(params.set || 2, params.problem || '1');

    // Check and run tutorials
    checkAndRunTutorials(params.set || 2);

    console.log("Natural Deduction Contraption Initialized");
    window.addEventListener('resize', () => updateLayout('game-wrapper', 16 / 9, 100));
}





function checkAndRunTutorials(problemSet) {
    if (problemSet === 1) { // Problem set 1 is propositional
        if (!hasSeenTutorial('propositional')) {
            startTutorial(propositionalTutorialSteps);
            markTutorialAsSeen('propositional');
        }
    } else if (problemSet === 2) { // Problem set 2 is FOL
        if (!hasSeenTutorial('fol')) {
            startTutorial(folTutorialSteps);
            markTutorialAsSeen('fol');
        }
    }
}
