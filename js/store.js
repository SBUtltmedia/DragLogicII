import { createStore } from './vendor/zustand.js';
import { EventBus } from './event-bus.js';
import { LogicParser } from './parser.js';
import { problemSets } from './problems.js';

const initialState = {
    proofLines: [],
    wffTray: [],
    premises: [],
    goalFormula: null,
    wffConstruction: { firstOperand: null, connective: null },
    feedbackHistory: [],
    currentFeedbackIndex: -1,
    wffTrayFontSize: 1,
    subGoalStack: [],
    currentProblem: {
        set: 1,
        number: 1
    },
    nextLineNumberGlobal: 1,
    currentScopeLevel: 0,
    selectedDraggable: null,
};

export const store = createStore((set, get) => ({
    ...initialState,

    // --- Actions ---

    loadProblem: (setNumber, problemNumber) => {
        console.log(`Loading problem: set ${setNumber}, number ${problemNumber}`);
        const problem = problemSets[setNumber]?.problems[problemNumber - 1];
        if (!problem) {
            get().addFeedback(`Problem ${setNumber}-${problemNumber} not found.`, 'error');
            return;
        }

        const premisesAsts = problem.premises.map(p => { 
            const parsedAst = LogicParser.textToAst(p); 
            return { 
                formula: parsedAst, 
                isProven: true 
            };
        });
        const goalAst = { 
            formula: problem.goal.formula || problem.goal, 
            ast: LogicParser.textToAst(problem.goal.formula || problem.goal),
            isProven: false 
        };

        set({
            ...initialState, // Reset state
            premises: premisesAsts,
            goalFormula: goalAst,
            proofLines: premisesAsts.map((p, i) => ({
                lineNumber: i + 1,
                formula: p.formula,
                justification: 'Premise',
                scopeLevel: 0,
                isProven: true,
                isAssumption: false
            })),
            currentProblem: { set: setNumber, number: problemNumber },
            nextLineNumberGlobal: premisesAsts.length + 1,
            feedbackHistory: [{ message: `Problem loaded: ${problemSets[setNumber].name} #${problemNumber}`, type: 'info' }],
            currentFeedbackIndex: 0
        });
        EventBus.emit('problem:loaded');
    },

    addProofLine: (lineData) => {
        set(state => ({ proofLines: [...state.proofLines, lineData] }));
        EventBus.emit('render');
    },

    addFeedback: (message, type = 'info') => {
        const newFeedback = { message, type };
        set(state => ({
            feedbackHistory: [...state.feedbackHistory, newFeedback],
            currentFeedbackIndex: state.feedbackHistory.length
        }));
    },

    showNextFeedback: () => {
        set(state => ({
            currentFeedbackIndex: Math.min(state.currentFeedbackIndex + 1, state.feedbackHistory.length - 1)
        }));
    },

    showPreviousFeedback: () => {
        set(state => ({
            currentFeedbackIndex: Math.max(state.currentFeedbackIndex - 1, 0)
        }));
    },

    // --- Subproof Management ---
    
    startSubproof: (type, assumptionFormula, additionalData = {}) => {
        const { subGoalStack, currentScopeLevel } = get();
        const newSubGoal = {
            type,
            scopeLevel: currentScopeLevel + 1,
            assumptionFormula,
            goalFormula: additionalData.goalFormula || null
        };
        
        set(state => ({
            subGoalStack: [...state.subGoalStack, newSubGoal],
            currentScopeLevel: state.currentScopeLevel + 1
        }));
        EventBus.emit('proof:update');
        EventBus.emit('subgoal:update');
    },

    endSubproof: () => {
        const { subGoalStack } = get();
        
        if (subGoalStack.length === 0) return;

        // Get the most recent subproof and remove it
        const currentSubproof = subGoalStack[subGoalStack.length - 1];
        
        set(state => ({
            subGoalStack: state.subGoalStack.slice(0, -1),
            currentScopeLevel: Math.max(0, state.currentScopeLevel - 1)
        }));
        EventBus.emit('proof:update');
        EventBus.emit('subgoal:update');
    },

    // --- Getter Methods ---
    
    getCurrentSubgoal: () => {
        const { subGoalStack } = get();
        return subGoalStack.length > 0 
            ? subGoalStack[subGoalStack.length - 1] 
            : null;
    },

    getCurrentScopeLevel: () => {
        return get().currentScopeLevel;
    },

    // --- Utility Methods ---
    
    setSubGoalStack: (newStack) => {
        set({ subGoalStack: newStack });
    },
    
    incrementScopeLevel: () => {
        set(state => ({ currentScopeLevel: state.currentScopeLevel + 1 }));
    },

    decrementScopeLevel: () => {
        set(state => ({ currentScopeLevel: Math.max(0, state.currentScopeLevel - 1) }));
    },

    resetProofState: () => {
        set(initialState);
    }
}));