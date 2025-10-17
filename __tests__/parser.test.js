import { LogicParser } from '../js/parser.js';

describe('Logic Parser', () => {
  describe('textToAst conversion', () => {
    test('should parse simple atomic formulas', () => {
      const ast = LogicParser.textToAst('P');
      expect(ast).toEqual({ type: 'atomic', value: 'P' });
    });

    test('should parse negation formulas', () => {
      const ast = LogicParser.textToAst('~P');
      expect(ast).toEqual({ 
        type: 'unary', 
        operator: '~',
        operand: { type: 'atomic', value: 'P' } 
      });
    });

    test('should parse box formulas', () => {
      const ast = LogicParser.textToAst('□P');
      expect(ast).toEqual({ 
        type: 'unary', 
        operator: '□',
        operand: { type: 'atomic', value: 'P' } 
      });
    });

    test('should parse diamond formulas', () => {
      const ast = LogicParser.textToAst('◊P');
      expect(ast).toEqual({ 
        type: 'unary', 
        operator: '◊',
        operand: { type: 'atomic', value: 'P' } 
      });
    });

    test('should parse conjunction formulas', () => {
      const ast = LogicParser.textToAst('(P ∧ Q)');
      expect(ast).toEqual({
        type: 'binary',
        operator: '∧',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should parse disjunction formulas', () => {
      const ast = LogicParser.textToAst('(P ∨ Q)');
      expect(ast).toEqual({
        type: 'binary',
        operator: '∨',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should parse conditional formulas', () => {
      const ast = LogicParser.textToAst('(P → Q)');
      expect(ast).toEqual({
        type: 'binary',
        operator: '→',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should parse biconditional formulas', () => {
      const ast = LogicParser.textToAst('(P ↔ Q)');
      expect(ast).toEqual({
        type: 'binary',
        operator: '↔',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should handle nested expressions', () => {
      const ast = LogicParser.textToAst('(P → Q) ∧ R');
      expect(ast).toEqual({
        type: 'binary',
        operator: '∧',
        left: {
          type: 'binary',
          operator: '→',
          left: { type: 'atomic', value: 'P' },
          right: { type: 'atomic', value: 'Q' }
        },
        right: { type: 'atomic', value: 'R' }
      });
    });

    test('should throw error for invalid syntax', () => {
      expect(() => LogicParser.textToAst('(P ∧')).toThrow('Unexpected token');
    });
  });

  describe('astToText conversion', () => {
    test('should convert atomic formulas correctly', () => {
      const ast = { type: 'atomic', value: 'P' };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('P');
    });

    test('should convert negation formulas correctly', () => {
      const ast = { 
        type: 'unary', 
        operator: '~',
        operand: { type: 'atomic', value: 'P' } 
      };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('~P');
    });

    test('should convert box formulas correctly', () => {
      const ast = { 
        type: 'unary', 
        operator: '□',
        operand: { type: 'atomic', value: 'P' } 
      };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('□P');
    });

    test('should convert conjunction formulas correctly', () => {
      const ast = {
        type: 'binary',
        operator: '∧',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('P ∧ Q');
    });
  });

  describe('areAstsEqual comparison', () => {
    test('should correctly identify equal atomic formulas', () => {
      const ast1 = { type: 'atomic', value: 'P' };
      const ast2 = { type: 'atomic', value: 'P' };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(true);
    });

    test('should correctly identify different atomic formulas as not equal', () => {
      const ast1 = { type: 'atomic', value: 'P' };
      const ast2 = { type: 'atomic', value: 'Q' };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(false);
    });

    test('should correctly handle negations', () => {
      const ast1 = { type: 'unary', operator: '~', operand: { type: 'atomic', value: 'P' } };
      const ast2 = { type: 'unary', operator: '~', operand: { type: 'atomic', value: 'P' } };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(true);
    });

    test('should correctly identify not equal negations', () => {
      const ast1 = { type: 'unary', operator: '~', operand: { type: 'atomic', value: 'P' } };
      const ast2 = { type: 'unary', operator: '~', operand: { type: 'atomic', value: 'Q' } };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(false);
    });

    test('should correctly handle complex nested structures', () => {
      const ast1 = {
        type: 'binary',
        operator: '→',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      };
      const ast2 = {
        type: 'binary',
        operator: '→',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(true);
    });
  });

  describe('tokenize function', () => {
    test('should correctly tokenize atomic formula', () => {
      const tokens = LogicParser.tokenize('P');
      expect(tokens).toEqual(['P']);
    });

    test('should correctly tokenize complex expression', () => {
      const tokens = LogicParser.tokenize('(P ∧ Q)');
      expect(tokens).toEqual(['(', 'P', '∧', 'Q', ')']);
    });

    test('should handle spaces correctly', () => {
      const tokens = LogicParser.tokenize(' ( P ∧ Q ) ');
      expect(tokens).toEqual(['(', 'P', '∧', 'Q', ')']);
    });

    test('should tokenize modal operators', () => {
        const tokens = LogicParser.tokenize('□(P → ◊Q)');
        expect(tokens).toEqual(['□', '(', 'P', '→', '◊', 'Q', ')']);
    });
  });
});