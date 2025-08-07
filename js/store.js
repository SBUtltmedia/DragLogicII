import { createStore as create } from 'zustand/vanilla';

const initialState = {
    // App state
    currentProblem: { set: 1, number: 1 },
    premises: [],
    goalFormula: '',
    proofLines: [],
    subGoalStack: [],
    currentScopeLevel: 0,
    nextLineNumberGlobal: 1,

    // UI state that is data
    wffConstruction: { firstOperand: null, connective: null }, // New state for building WFFs
    draggedElementForRemoval: null,
    feedbackHistory: [],
    currentFeedbackIndex: -1,
    wffTrayFontSize: 2.4,
    wffTray: [],
};

export const store = create((set) => ({
    ...initialState,

    // Actions
    setProblem: (problem) => set({
        currentProblem: problem.problem,
        premises: problem.premises,
        goalFormula: problem.goalFormula,
        wffTray: [], // Reset WFF tray on new problem
    }),

    addProofLine: (line) => set(state => ({
        proofLines: [...state.proofLines, line]
    })),

    updateSubGoalStack: (stack) => set({ subGoalStack: stack }),

    setCurrentScopeLevel: (level) => set({ currentScopeLevel: level }),

    setNextLineNumber: (number) => set({ nextLineNumberGlobal: number }),

    resetProof: () => set(state => ({
        proofLines: state.premises.map((p, i) => ({
            lineNumber: i + 1,
            formula: p.formula,
            justification: p.justification,
            scopeLevel: 0,
            isAssumption: false,
            isShowLine: false,
            isProven: true,
        })),
        subGoalStack: [],
        currentScopeLevel: 0,
        nextLineNumberGlobal: state.premises.length + 1,
        wffTray: [], // Reset WFF tray on proof reset
        wffConstruction: { firstOperand: null, connective: null }, // Reset WFF construction
    })),

    setWffConstruction: (construction) => set({ wffConstruction: construction }),

    setProofLines: (lines) => set({ proofLines: lines }),

    addFeedback: (message, type = 'info') => set(state => ({
        feedbackHistory: [...state.feedbackHistory, { message, type }],
        currentFeedbackIndex: state.feedbackHistory.length,
    })),

    previousFeedback: () => set(state => ({
        currentFeedbackIndex: Math.max(0, state.currentFeedbackIndex - 1),
    })),

    nextFeedback: () => set(state => ({
        currentFeedbackIndex: Math.min(state.feedbackHistory.length - 1, state.currentFeedbackIndex + 1),
    })),

    clearFeedback: () => set({ feedbackHistory: [], currentFeedbackIndex: -1 }),

    // WFF Tray Actions
    addWff: (wff) => set(state => {
        console.log('[store.addWff] Adding WFF:', wff);
        return { wffTray: [...state.wffTray, wff] };
    }),

    removeWff: (elementId) => set(state => {
        console.log('[store.removeWff] Removing WFF with elementId:', elementId);
        return { wffTray: state.wffTray.filter(wff => wff.elementId !== elementId) };
    }),
}));
