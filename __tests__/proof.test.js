import { LogicParser } from '../js/parser.js';

describe('Proof Module', () => {
  describe('isNegationOf', () => {
    test('should be able to parse negations correctly', () => {
      const negation = LogicParser.textToAst('~P');
      expect(negation.type).toBe('unary');
      expect(negation.operator).toBe('~');
      expect(negation.operand.type).toBe('atomic');
      expect(negation.operand.value).toBe('P');
    });

    test('should correctly handle double negation', () => {
      const doubleNegation = LogicParser.textToAst('~~P');
      expect(doubleNegation.type).toBe('unary');
      expect(doubleNegation.operand.type).toBe('unary');
      expect(doubleNegation.operand.operand.type).toBe('atomic');
      expect(doubleNegation.operand.operand.value).toBe('P');
    });
  });

  describe('Logic Parsing', () => {
    test('should correctly parse basic formulas', () => {
      expect(() => LogicParser.textToAst('P')).not.toThrow();
      expect(() => LogicParser.textToAst('(P → Q)')).not.toThrow();
      expect(() => LogicParser.textToAst('~P')).not.toThrow();
    });
  });
});