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
    activeRule: null,
    collectedPremises: [],
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
                cleanFormula: LogicParser.astToText(p.formula),
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
        EventBus.emit('render');
    },

    addProofLine: (lineData) => {
        set(state => ({ proofLines: [...state.proofLines, lineData] }));
        EventBus.emit('render');
    },

    setNextLineNumberGlobal: (newNumber) => set({ nextLineNumberGlobal: newNumber }),

    constructWff: (operand, connective) => {
        const { wffConstruction, addWff, clearWffConstruction, addFeedback } = get();
        const { firstOperand, connective: waitingConnective } = wffConstruction;

        const droppedAst = LogicParser.textToAst(operand.formula);
        if (!droppedAst) { addFeedback("Invalid formula dropped.", "error"); return; }

        if (connective === '~') { 
            const newAst = { type: 'negation', operand: droppedAst };
            addWff(newAst);
            clearWffConstruction(); 
        } else { 
            if (!firstOperand) {
                set({ wffConstruction: { firstOperand: operand, connective: connective } });
                EventBus.emit('render');
            } else {
                if (waitingConnective === connective) { 
                    const firstAst = LogicParser.textToAst(firstOperand.formula);
                    if (!firstAst) { addFeedback("Invalid first formula.", "error"); clearWffConstruction(); return; }
                    const newAst = { type: 'binary', operator: connective, left: firstAst, right: droppedAst };
                    addWff(newAst);
                    clearWffConstruction(); 
                } else { addFeedback("WFF Error: Connective mismatch.", "error"); clearWffConstruction(); }
            }
        }
    },

    clearWffConstruction: () => {
        set({ wffConstruction: { firstOperand: null, connective: null } });
        EventBus.emit('render');
    },

    setWffConstruction: (wffConstruction) => {
        set({ wffConstruction });
        EventBus.emit('render');
    },

    addWff: (formula) => {
        const newWff = {
            formula: typeof formula === 'string' ? LogicParser.textToAst(formula) : formula,
            elementId: `wff-${Date.now()}`
        };
        set(state => ({ wffTray: [...state.wffTray, newWff] }));
        EventBus.emit('render');
    },

    removeWff: (elementId) => {
        set(state => ({ wffTray: state.wffTray.filter(w => w.elementId !== elementId) }));
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

    setActiveRule: (rule, silent = false) => {
        // If the rule isn't changing, do nothing.
        if (get().activeRule === rule) {
            return;
        }

        // If the rule is changing, reset the premises.
        set({ activeRule: rule, collectedPremises: [] });
        
        if (!silent) {
            EventBus.emit('render');
        }
    },

    addPremise: (premise, index) => {
        set(state => {
            const newPremises = [...state.collectedPremises];
            newPremises[index] = premise;
            return { collectedPremises: newPremises };
        });
        EventBus.emit('render');
    },

    clearPremises: () => {
        set({ collectedPremises: [] });
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
        return currentSubproof;
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

    markLineAsWinner: (lineId) => {
        set(state => ({
            proofLines: state.proofLines.map(l => 
                l.id === lineId ? { ...l, isWinningLine: true } : l
            )
        }));
        EventBus.emit('render');
    },

    resetProofState: () => {
        set(initialState);
    }
}));