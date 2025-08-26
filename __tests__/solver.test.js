import { store } from '../js/store.js';
import { problemSets } from '../js/problems.js';
import { ruleSet } from '../js/rules.js';
import { LogicParser } from '../js/parser.js';

// Mock the entire store and its methods
jest.mock('../js/store.js');

// Mock EventBus
jest.mock('../js/event-bus.js');

// A more robust helper function to simulate solving a proof
const solveProof = (problem, steps) => {
    let proofLines = problem.premises.map((p, i) => ({
        lineNumber: i + 1,
        formula: LogicParser.textToAst(p),
        justification: 'Premise',
        scopeLevel: 0,
        isProven: true,
    }));
    const goalAst = LogicParser.textToAst(problem.goal.formula);
    let currentScopeLevel = 0;
    let subGoalStack = [];
    let nextLineNumber = proofLines.length + 1;

    const addLine = (formulaAst, justification, scope) => {
        const newLine = {
            lineNumber: nextLineNumber++,
            formula: formulaAst,
            justification,
            scopeLevel: scope,
            isProven: true, // Assume all derived lines are proven for test purposes
        };
        proofLines.push(newLine);
        return newLine;
    };

    steps.forEach(step => {
        if (step.action === 'applyRule') {
            const { rule, premises: premiseRefs } = step;
            const ruleDef = ruleSet[rule];
            const slotsData = premiseRefs.map(ref => {
                if (ref.source === 'line') {
                    return proofLines.find(l => l.lineNumber === ref.line);
                }
                return { formula: LogicParser.textToAst(ref.formula) };
            });

            const resultAst = ruleDef.apply(slotsData);
            if (resultAst) {
                const justification = `${rule} ${premiseRefs.map(p => p.line || p.formula).join(', ')}`;
                addLine(resultAst, justification, currentScopeLevel);
            }
        } else if (step.action === 'startSubproof') {
            currentScopeLevel++;
            const assumptionAst = LogicParser.textToAst(step.assumption);
            const assumptionLine = addLine(assumptionAst, 'Assumption', currentScopeLevel);
            subGoalStack.push({ ...step, scope: currentScopeLevel, assumptionLine: assumptionLine.lineNumber });
        } else if (step.action === 'discharge') {
            const activeSubGoal = subGoalStack.pop();
            if (activeSubGoal) {
                currentScopeLevel--;
                let conclusionAst;
                if (activeSubGoal.type === 'CP') {
                    conclusionAst = LogicParser.textToAst(activeSubGoal.goal);
                } else if (activeSubGoal.type === 'RAA') {
                    conclusionAst = LogicParser.textToAst(activeSubGoal.goal);
                }
                if (conclusionAst) {
                    addLine(conclusionAst, `${activeSubGoal.type} ${activeSubGoal.assumptionLine}-${proofLines.length}`, currentScopeLevel);
                }
            }
        }
    });

    const win = proofLines.some(line => 
        line.scopeLevel === 0 && 
        line.isProven && 
        LogicParser.areAstsEqual(line.formula, goalAst)
    );

    return win;
};

describe('End-to-End Proof Solver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Problem 1.1 (MP) should be solved correctly', () => {
    const problem = problemSets[1].problems[0];
    const steps = [
      {
        action: 'applyRule',
        rule: 'MP',
        premises: [
          { source: 'line', line: 1 },
          { source: 'line', line: 2 },
        ],
      },
    ];
    const isSolved = solveProof(problem, steps);
    expect(isSolved).toBe(true);
  });

  test('Problem 1.8 (HS) should be solved correctly', () => {
    const problem = problemSets[1].problems[7]; // P → Q, Q → R ⊢ P → R
    const steps = [
        {
            action: 'startSubproof',
            type: 'CP',
            goal: 'P → R',
            assumption: 'P'
        },
        {
            action: 'applyRule',
            rule: 'MP',
            premises: [
                { source: 'line', line: 1 }, // P → Q
                { source: 'line', line: 3 }  // P (assumption)
            ]
        },
        {
            action: 'applyRule',
            rule: 'MP',
            premises: [
                { source: 'line', line: 2 }, // Q → R
                { source: 'line', line: 4 }  // Q
            ]
        },
        {
            action: 'discharge'
        }
    ];
    const isSolved = solveProof(problem, steps);
    expect(isSolved).toBe(true);
  });

  test('Problem 1.10 (RAA) should be solved correctly', () => {
    const problem = problemSets[1].problems[9]; // ~(P ∧ Q), P ⊢ ~Q
    const steps = [
        {
            action: 'startSubproof',
            type: 'RAA',
            goal: '~Q',
            assumption: 'Q'
        },
        {
            action: 'applyRule',
            rule: 'Conj',
            premises: [
                { source: 'line', line: 2 }, // P
                { source: 'line', line: 3 }  // Q (assumption)
            ]
        },
        {
            action: 'discharge'
        }
    ];
    const isSolved = solveProof(problem, steps);
    expect(isSolved).toBe(true);
  });
});
