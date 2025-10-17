import { store } from '../js/store.js';
import { addProofLine, startStrictSubproof, dischargeStrictSubproof, applyActiveRule } from '../js/proof.js';
import { handleDropOnProofArea } from '../js/drag-drop.js';
import { problemSets } from '../js/problems.js';
import { LogicParser } from '../js/parser.js';

// Mock the EventBus to prevent side effects in tests
jest.mock('../js/event-bus.js', () => ({
    EventBus: {
        on: jest.fn(),
        emit: jest.fn(),
    },
}));

describe('Modal Logic Problem Set Solutions', () => {
    beforeEach(() => {
        store.getState().resetProofState();
    });

    test('Problem 2-1 (System K)', () => {
        store.getState().loadProblem(2, 1);
        expect(store.getState().activeModalSystem).toBe('K');

        startStrictSubproof('□Q');

        // Simulate dragging the premises into the strict subproof
        const premise1 = { formula: '□(P → Q)', lineId: '1', source: 'proof-lines' };
        const premise2 = { formula: '□P', lineId: '2', source: 'proof-lines' };
        const dropEvent1 = { preventDefault: () => {}, target: { closest: () => ({ dataset: { scopeLevel: '2' }, classList: { remove: () => {} } }) }, dataTransfer: { getData: () => JSON.stringify(premise1) } };
        const dropEvent2 = { preventDefault: () => {}, target: { closest: () => ({ dataset: { scopeLevel: '2' }, classList: { remove: () => {} } }) }, dataTransfer: { getData: () => JSON.stringify(premise2) } };

        handleDropOnProofArea(dropEvent1);
        handleDropOnProofArea(dropEvent2);
        
        store.getState().setActiveRule('MP');
        store.getState().addPremise({ formula: 'P → Q', lineId: '3' });
        store.getState().addPremise({ formula: 'P', lineId: '4' });
        applyActiveRule();

        dischargeStrictSubproof();

        const finalState = store.getState();
        const lastLine = finalState.proofLines[finalState.proofLines.length - 1];
        expect(LogicParser.areAstsEqual(lastLine.formula, LogicParser.textToAst('□Q'))).toBe(true);
    });

    test('Problem 2-2 (System D)', () => {
        store.getState().loadProblem(2, 2);
        store.getState().setActiveRule('D');
        store.getState().addPremise({ formula: '□P', lineId: '1' });
        applyActiveRule();
        const state = store.getState();
        const lastLine = state.proofLines[state.proofLines.length - 1];
        expect(LogicParser.areAstsEqual(lastLine.formula, LogicParser.textToAst('◊P'))).toBe(true);
    });

    test('Problem 2-3 (System T)', () => {
        store.getState().loadProblem(2, 3);
        store.getState().setActiveRule('T');
        store.getState().addPremise({ formula: '□(P → Q)', lineId: '1' });
        applyActiveRule();

        store.getState().setActiveRule('MP');
        store.getState().addPremise({ formula: 'P → Q', lineId: '3' });
        store.getState().addPremise({ formula: 'P', lineId: '2' });
        applyActiveRule();

        const state = store.getState();
        const lastLine = state.proofLines[state.proofLines.length - 1];
        expect(LogicParser.areAstsEqual(lastLine.formula, LogicParser.textToAst('Q'))).toBe(true);
    });

    test('Problem 2-5 (System S4)', () => {
        store.getState().loadProblem(2, 5);
        store.getState().setActiveRule('4');
        store.getState().addPremise({ formula: '□P', lineId: '1' });
        applyActiveRule();
        const state = store.getState();
        const lastLine = state.proofLines[state.proofLines.length - 1];
        expect(LogicParser.areAstsEqual(lastLine.formula, LogicParser.textToAst('□□P'))).toBe(true);
    });

    test('Problem 2-7 (System S5)', () => {
        store.getState().loadProblem(2, 7);
        store.getState().setActiveRule('5');
        store.getState().addPremise({ formula: '◊P', lineId: '1' });
        applyActiveRule();
        const state = store.getState();
        const lastLine = state.proofLines[state.proofLines.length - 1];
        expect(LogicParser.areAstsEqual(lastLine.formula, LogicParser.textToAst('□◊P'))).toBe(true);
    });
});