import { store } from '../js/store.js';
import { applyActiveRule } from '../js/proof.js';

describe('Consistency Checks', () => {
    beforeEach(() => {
        // Reset the store before each test
        store.setState(store.getState().initialState);
    });

    test('should not apply MP with a premise from WFF constructor', () => {
        // 1. Set up the initial state
        store.setState({
            proofLines: [
                {
                    id: 1,
                    lineNumber: 1,
                    formula: { type: 'atomic', value: 'P' },
                    cleanFormula: 'P',
                    justification: 'Premise',
                    scopeLevel: 0,
                    isProven: true,
                    isAssumption: false
                }
            ],
            nextLineNumberGlobal: 2,
            activeRule: 'MP',
            collectedPremises: [
                {
                    formula: 'P → Q',
                    source: 'wff-output-tray' // Premise from WFF constructor
                },
                {
                    formula: 'P',
                    source: 'proof-lines', // Premise from proof
                    lineId: 1
                }
            ]
        });

        // 2. Apply the rule
        applyActiveRule();

        // 3. Get the final state
        const finalState = store.getState();

        // 4. Assert that no new line was added
        expect(finalState.proofLines.length).toBe(1);

        // 5. Assert that a feedback message was sent (optional but good)
        // This requires inspecting the event bus or the feedback state, 
        // which might be more involved depending on the implementation.
    });
});
