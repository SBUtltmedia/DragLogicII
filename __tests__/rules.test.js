import { ruleSet } from '../js/rules.js';

describe('Rules Module', () => {
  describe('ruleSet object', () => {
    test('should be defined', () => {
      expect(ruleSet).toBeDefined();
    });
    
    test('should contain basic inference rules', () => {
      expect(Object.keys(ruleSet)).toContain('MP');
      expect(Object.keys(ruleSet)).toContain('MT');
      expect(Object.keys(ruleSet)).toContain('AndI');
      expect(Object.keys(ruleSet)).toContain('AndE');
    });

    test('should have rule definitions with correct structure', () => {
      const mpRule = ruleSet.MP;
      expect(mpRule).toBeDefined();
      expect(mpRule.name).toBe('Modus Ponens (MP / →E)');
      expect(mpRule.premises).toBe(2);
      expect(mpRule.logicType).toBe('prop');
      expect(Array.isArray(mpRule.slots)).toBe(true);
    });

    test('should contain subproof rules', () => {
      expect(Object.keys(ruleSet)).toContain('CI');
      expect(Object.keys(ruleSet)).toContain('RAA');
      expect(ruleSet.CI.isSubproof).toBe(true);
      expect(ruleSet.RAA.isSubproof).toBe(true);
    });
  });
});
