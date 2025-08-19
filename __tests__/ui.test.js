import { updateProblemDisplay } from '../js/ui.js';
import { problemSets } from '../js/problems.js';

// Mock the dependencies
jest.mock('../js/problems.js', () => ({
    problemSets: {
        1: { name: 'Test Set' }
    }
}));

describe('UI Module', () => {
    describe('updateProblemDisplay', () => {
        let problemInfoDiv;
        let gameTitle;

        beforeEach(() => {
            // Set up our document body
            document.body.innerHTML = '<h1 id="game-title"></h1>' +
                '<div id="proof-problem-info"></div>';
            problemInfoDiv = document.getElementById('proof-problem-info');
            gameTitle = document.getElementById('game-title');
        });

        test('should correctly display the problem premises and goal', () => {
            const premises = [
                { formula: {type: 'binary', operator: '→', left: {type: 'atomic', value: 'P'}, right: {type: 'atomic', value: 'Q'}} },
                { formula: {type: 'atomic', value: 'P'} }
            ];
            const goalFormula = { ast: {type: 'atomic', value: 'Q'} };
            const set = 1;
            const number = 1;

            updateProblemDisplay(premises, goalFormula, set, number);

            expect(gameTitle.textContent).toBe('Natural Deduction Contraption - Test Set #1');
            expect(problemInfoDiv.innerHTML).toContain('<div class="proof-header">Premise 1: <span>P → Q</span></div>');
            expect(problemInfoDiv.innerHTML).toContain('<div class="proof-header">Premise 2: <span>P</span></div>');
            expect(problemInfoDiv.innerHTML).toContain('<div class="proof-goal">Prove: <span>Q</span></div>');
        });

        test('should handle empty premises', () => {
            const premises = [];
            const goalFormula = { ast: {type: 'binary', operator: '∨', left: {type: 'atomic', value: 'P'}, right: {type: 'negation', operand: {type: 'atomic', value: 'P'}}} };
            const set = 1;
            const number = 2;

            updateProblemDisplay(premises, goalFormula, set, number);

            expect(gameTitle.textContent).toBe('Natural Deduction Contraption - Test Set #2');
            expect(problemInfoDiv.innerHTML).not.toContain('proof-header');
            expect(problemInfoDiv.innerHTML).toContain('<div class="proof-goal">Prove: <span>P ∨ ~P</span></div>');
        });
    });
});