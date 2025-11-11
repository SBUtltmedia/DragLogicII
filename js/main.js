import { addEventListeners } from './ui.js';
import { store } from './store.js';

function loadProblemFromHash() {
    const hash = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(hash);
    const setNumber = urlParams.get('set');
    const problemNumber = urlParams.get('problem');

    if (setNumber && problemNumber) {
        store.getState().loadProblem(parseInt(setNumber, 10), parseInt(problemNumber, 10));
    } else {
        const { currentProblem } = store.getState();
        // Update hash to reflect the default problem being loaded
        window.location.hash = `set=${currentProblem.set}&problem=${currentProblem.number}`;
        // The hashchange listener will then call this function again and load the problem
    }
}

document.addEventListener('DOMContentLoaded', () => {
    addEventListeners();

    // Listen for hash changes to load problems
    window.addEventListener('hashchange', loadProblemFromHash);

    // Initial load based on the current hash or default
    if (window.location.hash) {
        loadProblemFromHash();
    } else {
        const { currentProblem } = store.getState();
        window.location.hash = `set=${currentProblem.set}&problem=${currentProblem.number}`;
    }
});
