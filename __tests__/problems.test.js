import { problemSets } from '../js/problems.js';

describe('Problems Module', () => {
  describe('problemSets structure', () => {
    test('should be defined', () => {
      expect(problemSets).toBeDefined();
    });

    test('should have propositional logic problems (set 1)', () => {
      expect(problemSets[1]).toBeDefined();
      expect(problemSets[1].name).toBe('Propositional Logic');
      expect(Array.isArray(problemSets[1].problems)).toBe(true);
      expect(problemSets[1].problems.length).toBe(10);
    });

    test('should have first-order logic problems (set 2)', () => {
      expect(problemSets[2]).toBeDefined();
      expect(problemSets[2].name).toBe('First-Order Logic');
      expect(Array.isArray(problemSets[2].problems)).toBe(true);
      expect(problemSets[2].problems.length).toBe(10);
    });

    test('should have valid problem structure', () => {
      const firstProblem = problemSets[1].problems[0];
      expect(firstProblem).toBeDefined();
      expect(Array.isArray(firstProblem.premises)).toBe(true);
      expect(typeof firstProblem.goal.formula).toBe('string');
    });
    
    test('should contain valid logical formulas in problems', () => {
      // Test that the problems contain properly formatted premises and goals
      const propositionalProblems = problemSets[1].problems;
      
      propositionalProblems.forEach((problem, index) => {
        expect(problem.premises).toBeDefined();
        expect(Array.isArray(problem.premises)).toBe(true);
        
        expect(problem.goal).toBeDefined();
        expect(typeof problem.goal.formula).toBe('string');
      });
    });
  });
});
