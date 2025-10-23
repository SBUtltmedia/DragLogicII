import { store } from '../js/store.js';
import { applyActiveRule, startStrictSubproof, dischargeStrictSubproof } from '../js/proof.js';
import { handleDropOnProofArea } from '../js/drag-drop.js';
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
        // 1. Load the problem
        store.getState().loadProblem(2, 1);
        expect(store.getState().activeModalSystem).toBe('K');
        expect(store.getState().proofLines.length).toBe(2);

        // 2. Start a strict subproof for □Q
        startStrictSubproof('□Q');
        let state = store.getState();
        expect(state.proofLines.length).toBe(3); // 2 premises + 1 show line
        expect(state.subGoalStack.length).toBe(1);
        expect(state.subGoalStack[0].type).toBe('Strict');

        // 3. Import the premises
        const premise1 = { formula: '□(P → Q)', lineId: '1', source: 'proof-lines' };
        const premise2 = { formula: '□P', lineId: '2', source: 'proof-lines' };
        const dropEvent1 = { preventDefault: () => {}, target: { closest: () => ({ dataset: { scopeLevel: '1' }, classList: { contains: () => false, remove: () => {} } }) }, dataTransfer: { getData: () => JSON.stringify(premise1) } };
        const dropEvent2 = { preventDefault: () => {}, target: { closest: () => ({ dataset: { scopeLevel: '1' }, classList: { contains: () => false, remove: () => {} } }) }, dataTransfer: { getData: () => JSON.stringify(premise2) } };

        handleDropOnProofArea(dropEvent1);
        handleDropOnProofArea(dropEvent2);

        state = store.getState();
        expect(state.proofLines.length).toBe(5); // 2 premises + 1 show line + 2 imported lines
        const line4 = state.proofLines[3];
        const line5 = state.proofLines[4];
        expect(line4.cleanFormula).toBe('P → Q');
        expect(line5.cleanFormula).toBe('P');

        // 4. Apply Modus Ponens
        store.getState().setActiveRule('MP');
        store.getState().addPremise({ formula: 'P → Q', lineId: line4.lineNumber, source: 'proof-lines' });
        store.getState().addPremise({ formula: 'P', lineId: line5.lineNumber, source: 'proof-lines' });
        applyActiveRule();

        state = store.getState();
        expect(state.proofLines.length).toBe(6);
        const line6 = state.proofLines[5];
        expect(line6.cleanFormula).toBe('Q');
        expect(line6.justification).toMatch(/MP/);

        // 5. Discharge the subproof
        dischargeStrictSubproof(state.subGoalStack[0], line6.lineNumber);

        state = store.getState();
        expect(state.subGoalStack.length).toBe(0);
        expect(state.proofLines.length).toBe(7);
        const lastLine = state.proofLines[6];
        expect(lastLine.cleanFormula).toBe('□Q');
        expect(lastLine.justification).toMatch(/□I/);
    });
});