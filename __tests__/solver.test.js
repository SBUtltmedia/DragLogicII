const { problemSets } = jest.requireActual('../js/problems.js');
import { ruleSet } from '../js/rules.js';
import { store } from '../js/store.js';
import { addProofLine, checkWinCondition } from '../js/proof.js';
import { LogicParser } from '../js/parser.js';

jest.mock('../js/store.js', () => ({
  store: {
    getState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('../js/event-bus.js', () => ({
  EventBus: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

const solutions = {
    '1-1': (state) => {
        const premise1 = { formula: state.proofLines[0].formula, line: 1 };
        const premise2 = { formula: state.proofLines[1].formula, line: 2 };
        const result = ruleSet.MP.apply([premise1, premise2]);
        addProofLine(result.resultFormula, result.justificationText, 0);
    },
    '1-2': (state) => {
        const premise1 = { formula: state.proofLines[0].formula, line: 1 };
        const premise2 = { formula: state.proofLines[1].formula, line: 2 };
        const result = ruleSet.MT.apply([premise1, premise2]);
        addProofLine(result.resultFormula, result.justificationText, 0);
    },
    '1-3': (state) => {
        const premise1 = { formula: state.proofLines[0].formula, line: 1 };
        const premise2 = { formula: state.proofLines[1].formula, line: 2 };
        const result = ruleSet.MTP.apply([premise1, premise2]);
        addProofLine(result.resultFormula, result.justificationText, 0);
    },
};

function setupProblem(problem) {
    const premises = problem.premises.map((p, i) => ({
        lineNumber: i + 1,
        formula: p,
        justification: 'Premise',
        scopeLevel: 0,
        isProven: true,
    }));
    const mockState = {
        proofLines: premises,
        goalFormula: problem.goal,
        subGoalStack: [],
        currentScopeLevel: 0,
        nextLineNumberGlobal: premises.length + 1,
        addProofLine: jest.fn((line) => { 
            const newLine = { ...line, lineNumber: mockState.nextLineNumberGlobal, isProven: true };
            mockState.proofLines.push(newLine);
            mockState.nextLineNumberGlobal++;
            return newLine;
        }),
        setNextLineNumber: jest.fn((n) => { mockState.nextLineNumberGlobal = n; }),
        updateSubGoalStack: jest.fn((stack) => { mockState.subGoalStack = stack; }),
        setCurrentScopeLevel: jest.fn((level) => { mockState.currentScopeLevel = level; }),
        setProofLines: jest.fn((lines) => { mockState.proofLines = lines; }),
    };
    store.getState.mockReturnValue(mockState);
    return mockState;
}

describe('Problem Solver', () => {
    Object.keys(solutions).forEach(problemId => {
        const [setKey, problemIndex] = problemId.split('-');
        const problem = problemSets[setKey - 1].problems[problemIndex - 1];

        test(`should solve problem ${problemId}: ${problem.goal}`, () => {
            const state = setupProblem(problem);
            solutions[problemId](state);

            const goalAst = LogicParser.textToAst(problem.goal);
            const hasWon = state.proofLines.some(line =>
                line.scopeLevel === 0 &&
                line.isProven &&
                LogicParser.areAstsEqual(LogicParser.textToAst(line.formula), goalAst)
            );

            expect(hasWon).toBe(true);
        });
    });
});
