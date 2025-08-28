import { ruleSet } from '../js/rules.js';
import { LogicParser } from '../js/parser.js';

describe('Rules Module', () => {
  describe('ruleSet object', () => {
    test('should be defined', () => {
      expect(ruleSet).toBeDefined();
    });
    
    test('should contain basic inference rules', () => {
      expect(Object.keys(ruleSet)).toContain('MP');
      expect(Object.keys(ruleSet)).toContain('MT');
      expect(Object.keys(ruleSet)).toContain('Conj');
      expect(Object.keys(ruleSet)).toContain('Simp');
    });

    test('should have rule definitions with correct structure', () => {
      const mpRule = ruleSet.MP;
      expect(mpRule).toBeDefined();
      expect(mpRule.name).toBe('Modus Ponens (MP)');
      expect(mpRule.premises).toBe(2);
      expect(mpRule.logicType).toBe('propositional');
      expect(Array.isArray(mpRule.slots)).toBe(true);
    });

    test('should contain subproof rules', () => {
      expect(Object.keys(ruleSet)).toContain('CP');
      expect(Object.keys(ruleSet)).toContain('RAA');
      expect(ruleSet.CP.isSubproof).toBe(true);
      expect(ruleSet.RAA.isSubproof).toBe(true);
    });
  });

  describe('Modus Ponens (MP) rule', () => {
    const mpRule = ruleSet.MP;

    test('should correctly apply MP when premises are in order', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P→Q'), line: '1' },
            { formula: LogicParser.textToAst('P'), line: '2' }
        ];
        const result = mpRule.apply(slotsData);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('Q'))).toBe(true);
    });

    test('should correctly apply MP when premises are reversed', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P'), line: '1' },
            { formula: LogicParser.textToAst('P→Q'), line: '2' }
        ];
        const result = mpRule.apply(slotsData);
        expect(result).toBeNull();
    });

    test('should return null for invalid premises', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P→Q'), line: '1' },
            { formula: LogicParser.textToAst('R'), line: '2' }
        ];
        const result = mpRule.apply(slotsData);
        expect(result).toBeNull();
    });
  });

  describe('Conjunction Introduction (Conj) rule', () => {
    const conjRule = ruleSet.Conj;

    test('should correctly apply Conj rule', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P'), line: '1' },
            { formula: LogicParser.textToAst('Q'), line: '2' }
        ];
        const result = conjRule.apply(slotsData);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('P ∧ Q'))).toBe(true);
    });

    test('should return null for insufficient premises', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P'), line: '1' }
        ];
        const result = conjRule.apply(slotsData);
        expect(result).toBeNull();
    });
  });
});
