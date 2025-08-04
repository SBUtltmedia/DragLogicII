import { store } from './store.js';
import { problemSets } from './problems.js';
import * as ui from './ui.js';
import { EventBus } from './event-bus.js';

export function initGame() {
    ui.addEventListeners();

    const params = getUrlParams();
    loadProblem(params.set || 1, params.problem || 1);

    console.log("Natural Deduction Contraption Initialized");
}

export function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const set = params.get('set');
    const problem = params.get('problem');
    return { set: set ? parseInt(set) : null, problem: problem ? parseInt(problem) : null };
}

export function loadProblem(set, problemNumber) {
    const problemNum = parseInt(problemNumber, 10);
    if (!problemSets[set] || !problemSets[set].problems[problemNum - 1]) {
        return loadProblem(1, 1); // Load default
    }

    const problemData = problemSets[set].problems[problemNum - 1];
    const problemPayload = {
        problem: { set, number: problemNum },
        premises: problemData.premises.map(p => ({ formula: p, justification: "Premise" })),
        goalFormula: problemData.goal
    };

    store.getState().setProblem(problemPayload);

    // Update URL without reloading
    const url = new URL(window.location);
    url.searchParams.set('set', set);
    url.searchParams.set('problem', problemNum);
    window.history.pushState({}, '', url);

    resetProofState();
}

EventBus.on('problem:next', () => {
    loadNextProblem();
});

function resetProofState() {
    store.getState().resetProof();
    ui.render();
}

function getNextProblem() {
    const { currentProblem } = store.getState();
    const { set, number } = currentProblem;
    if (problemSets[set] && problemSets[set].problems.length > number) {
        return { set, problem: (number + 1).toString() };
    }
    if (problemSets[set + 1]) {
        return { set: set + 1, problem: '1' };
    }
    return null;
}

export function loadNextProblem() {
    const nextProblem = getNextProblem();
    if (nextProblem) {
        loadProblem(nextProblem.set, nextProblem.problem);
    }
}
