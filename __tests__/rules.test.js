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
      expect(mpRule.name).toBe('Modus Ponens');
      expect(mpRule.premises).toBe(2);
      expect(mpRule.systems).toContain('propositional');
      expect(Array.isArray(mpRule.slots)).toBe(true);
    });

    test('should contain subproof rules', () => {
      const { CP, RAA } = require('../js/rules.js').subproofRuleSet;
      expect(CP).toBeDefined();
      expect(RAA).toBeDefined();
      expect(CP.isSubproof).toBe(true);
      expect(RAA.isSubproof).toBe(true);
    });
  });

  describe('Modus Ponens (MP) rule', () => {
    const mpRule = ruleSet.MP;

    test('should correctly apply MP', () => {
        const slotsData = [
            { formula: LogicParser.textToAst('P→Q') },
            { formula: LogicParser.textToAst('P') }
        ];
        const result = mpRule.apply(slotsData);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('Q'))).toBe(true);
    });
  });

  // --- Modal Logic Rule Tests ---

  describe('Rule (D)', () => {
    const rule = ruleSet.D;
    test('should derive ◊P from □P', () => {
        const premises = [{ formula: LogicParser.textToAst('□P') }];
        const result = rule.apply(premises);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('◊P'))).toBe(true);
    });
  });

  describe('Rule (T)', () => {
    const rule = ruleSet.T;
    test('should derive P from □P', () => {
        const premises = [{ formula: LogicParser.textToAst('□P') }];
        const result = rule.apply(premises);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('P'))).toBe(true);
    });
  });

  describe('Rule (B)', () => {
    const rule = ruleSet.B;
    test('should derive □◊P from P', () => {
        const premises = [{ formula: LogicParser.textToAst('P') }];
        const result = rule.apply(premises);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('□◊P'))).toBe(true);
    });
  });

  describe('Rule (4)', () => {
    const rule = ruleSet['4'];
    test('should derive □□P from □P', () => {
        const premises = [{ formula: LogicParser.textToAst('□P') }];
        const result = rule.apply(premises);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('□□P'))).toBe(true);
    });
  });

  describe('Rule (5)', () => {
    const rule = ruleSet['5'];
    test('should derive □◊P from ◊P', () => {
        const premises = [{ formula: LogicParser.textToAst('◊P') }];
        const result = rule.apply(premises);
        expect(LogicParser.areAstsEqual(result, LogicParser.textToAst('□◊P'))).toBe(true);
    });
  });
});