document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    initGame();
});

function initGame() {
    // Cache DOM elements
    cacheDomElements();

    // Add event listeners
    addEventListeners();

    // Load the initial problem
    const params = getUrlParams();
    loadProblem(params.set || 2, params.problem || '1');

    console.log("Natural Deduction Contraption Initialized");
    window.addEventListener('resize', () => updateLayout('game-wrapper', 16 / 9, 100));
}
