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
            ...initialState,
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

    constructWff: (operand, connective) => {
        const { wffConstruction, addWff, clearWffConstruction, addFeedback } = get();
        const { firstOperand, connective: waitingConnective } = wffConstruction;

        if (connective === '∀' || connective === '∃') {
            if (!firstOperand) {
                if (operand.type !== 'fol-variable') {
                    addFeedback("Quantifiers require a variable first (x, y, or z).", "error");
                    return;
                }
                set({ wffConstruction: { firstOperand: operand, connective: connective } });
                EventBus.emit('render');
            } else {
                if (waitingConnective === connective) {
                    const ast = LogicParser.textToAst(operand.formula);
                    if (!ast) { addFeedback("Invalid formula dropped on quantifier.", "error"); return; }
                    const resultAst = { type: 'quantifier', quantifier: connective, variable: firstOperand.formula, formula: ast };
                    addWff(resultAst);
                    clearWffConstruction();
                } else { addFeedback("Quantifier mismatch.", "error"); clearWffConstruction(); }
            }
            return;
        }

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
    },

    removeWff: (elementId) => {
        set(state => ({ wffTray: state.wffTray.filter(w => w.elementId !== elementId) }));
    },

    addFeedback: (message, type = 'info') => {
        set(state => {
            const newHistory = [...state.feedbackHistory, { message, type }];
            return {
                feedbackHistory: newHistory,
                currentFeedbackIndex: newHistory.length - 1
            };
        });
        EventBus.emit('render');
    },

    previousFeedback: () => {
        set(state => ({ currentFeedbackIndex: Math.max(0, state.currentFeedbackIndex - 1) }));
        EventBus.emit('render');
    },

    nextFeedback: () => {
        set(state => ({ currentFeedbackIndex: Math.min(state.feedbackHistory.length - 1, state.currentFeedbackIndex + 1) }));
        EventBus.emit('render');
    },

    setWffTrayFontSize: (size) => {
        set({ wffTrayFontSize: size });
        EventBus.emit('render');
    },

    startSubproof: (type, assumption, additionalData = {}) => {
        const { proofLines, subGoalStack } = get();
        const currentScope = subGoalStack.length;
        const subproofId = `subproof-${Date.now()}`;

        let goal, forWff;
        if (type === 'CP') {
            goal = null;
            forWff = null;
        } else if (type === 'RAA') {
            goal = '⊥';
            forWff = { type: 'negation', operand: assumption };
        } else if (type === 'EE') {
            goal = null;
            forWff = additionalData.existentialFormula;
        }

        const newSubGoal = {
            scope: currentScope + 1,
            type,
            assumptionFormula: assumption,
            goal,
            forWff,
            subproofId,
            subLineLetterCode: 97,
        };

        const assumptionLine = {
            lineNumber: proofLines.length + 1,
            formula: assumption,
            justification: 'Assumption',
            scopeLevel: currentScope + 1,
            isProven: true,
            isAssumption: true,
            parentSubproofId: subproofId
        };

        set(state => ({
            proofLines: [...state.proofLines, assumptionLine],
            subGoalStack: [...state.subGoalStack, newSubGoal],
            currentScopeLevel: state.currentScopeLevel + 1
        }));
        EventBus.emit('proof:update');
        EventBus.emit('subgoal:update');
    },

    updateSubGoalStack: (newStack) => {
        set({ subGoalStack: newStack });
    },

    setNextLineNumber: (n) => {
        set({ nextLineNumberGlobal: n });
    },

    setCurrentScopeLevel: (n) => {
        set({ currentScopeLevel: n });
    },

    setSelectedDraggable: (draggableData) => {
        set({ selectedDraggable: draggableData });
    },

    clearSelectedDraggable: () => {
        set({ selectedDraggable: null });
    },

    endSubproof: () => {
        const { subGoalStack } = get();
        if (subGoalStack.length === 0) return null;
        const dischargedSubproof = subGoalStack[subGoalStack.length - 1];
        set(state => ({
            subGoalStack: state.subGoalStack.slice(0, -1),
            currentScopeLevel: Math.max(0, state.currentScopeLevel - 1)
        }));
        EventBus.emit('proof:update');
        EventBus.emit('subgoal:update');
        return dischargedSubproof;
    },
}));