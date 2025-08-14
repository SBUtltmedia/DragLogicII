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
            document.body.innerHTML = `<h1 id="game-title"></h1>
                <div id="proof-problem-info"></div>`;
            problemInfoDiv = document.getElementById('proof-problem-info');
            gameTitle = document.getElementById('game-title');
        });

        test('should correctly display the problem premises and goal', () => {
            const premises = [
                { text: 'P → Q' },
                { text: 'P' }
            ];
            const goalFormula = 'Q';
            const set = 1;
            const number = 1;

            updateProblemDisplay(premises, goalFormula, set, number);

            expect(gameTitle.textContent).toBe('Natural Deduction Contraption - Test Set #1');
            expect(problemInfoDiv.innerHTML).toContain('<span>P → Q</span>');
            expect(problemInfoDiv.innerHTML).toContain('<span>P</span>');
            expect(problemInfoDiv.innerHTML).toContain('<span>Q</span>');
        });

        test('should handle empty premises', () => {
            const premises = [];
            const goalFormula = 'P ∨ ~P';
            const set = 1;
            const number = 2;

            updateProblemDisplay(premises, goalFormula, set, number);

            expect(gameTitle.textContent).toBe('Natural Deduction Contraption - Test Set #2');
            expect(problemInfoDiv.innerHTML).not.toContain('proof-header');
            expect(problemInfoDiv.innerHTML).toContain('<span>P ∨ ~P</span>');
        });
    });
});
