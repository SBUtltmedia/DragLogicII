import { addEventListeners } from './ui.js';
import { store } from './store.js';

document.addEventListener('DOMContentLoaded', () => {
    addEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    const setNumber = urlParams.get('set');
    const problemNumber = urlParams.get('problem');

    if (setNumber && problemNumber) {
        store.getState().loadProblem(parseInt(setNumber, 10), parseInt(problemNumber, 10));
    } else {
        const { currentProblem } = store.getState();
        store.getState().loadProblem(currentProblem.set, currentProblem.number);
    }
});