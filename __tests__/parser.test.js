import { LogicParser } from '../js/parser.js';

describe('LogicParser', () => {
  describe('textToAst', () => {
    test('should parse atomic propositions correctly', () => {
      const ast = LogicParser.textToAst('P');
      expect(ast).toEqual({ type: 'atomic', value: 'P' });
    });

    test('should parse negation correctly', () => {
      const ast = LogicParser.textToAst('~P');
      expect(ast).toEqual({
        type: 'negation',
        operand: { type: 'atomic', value: 'P' }
      });
    });

    test('should parse conjunction correctly', () => {
      const ast = LogicParser.textToAst('P ∧ Q');
      expect(ast).toEqual({
        type: 'binary',
        operator: '∧',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should parse implication correctly', () => {
      const ast = LogicParser.textToAst('P → Q');
      expect(ast).toEqual({
        type: 'binary',
        operator: '→',
        left: { type: 'atomic', value: 'P' },
        right: { type: 'atomic', value: 'Q' }
      });
    });

    test('should handle parentheses correctly', () => {
      const ast = LogicParser.textToAst('(P ∧ Q) → R');
      expect(ast).toEqual({
        type: 'binary',
        operator: '→',
        left: {
          type: 'binary',
          operator: '∧',
          left: { type: 'atomic', value: 'P' },
          right: { type: 'atomic', value: 'Q' }
        },
        right: { type: 'atomic', value: 'R' }
      });
    });

    test('should throw error for malformed input', () => {
      expect(() => LogicParser.textToAst('P ∧')).toThrow('Parsing Error');
    });

    test('should parse predicates with no arguments', () => {
      const ast = LogicParser.textToAst('F');
      expect(ast).toEqual({ type: 'predicate', name: 'F', args: [] });
    });

    test('should parse predicates with one argument', () => {
      const ast = LogicParser.textToAst('F(x)');
      expect(ast).toEqual({
        type: 'predicate',
        name: 'F',
        args: [{ type: 'variable', value: 'x' }]
      });
    });

    test('should parse predicates with multiple arguments', () => {
      const ast = LogicParser.textToAst('G(x, y, z)');
      expect(ast).toEqual({
        type: 'predicate',
        name: 'G',
        args: [
          { type: 'variable', value: 'x' },
          { type: 'variable', value: 'y' },
          { type: 'variable', value: 'z' }
        ]
      });
    });

    test('should parse universal quantifiers', () => {
      const ast = LogicParser.textToAst('∀x(F(x))');
      expect(ast).toEqual({
        type: 'quantifier',
        quantifier: '∀',
        variable: 'x',
        formula: {
          type: 'predicate',
          name: 'F',
          args: [{ type: 'variable', value: 'x' }]
        }
      });
    });

    test('should parse existential quantifiers', () => {
      const ast = LogicParser.textToAst('∃y(G(y))');
      expect(ast).toEqual({
        type: 'quantifier',
        quantifier: '∃',
        variable: 'y',
        formula: {
          type: 'predicate',
          name: 'G',
          args: [{ type: 'variable', value: 'y' }]
        }
      });
    });

    test('should parse descriptions', () => {
      const ast = LogicParser.textToAst('ιx(F(x))');
      expect(ast).toEqual({
        type: 'description',
        operator: 'ι',
        variable: 'x',
        formula: {
          type: 'predicate',
          name: 'F',
          args: [{ type: 'variable', value: 'x' }]
        }
      });
    });
  });

  describe('astToText', () => {
    test('should convert atomic proposition to text', () => {
      const ast = { type: 'atomic', value: 'P' };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('P');
    });

    test('should convert negation to text', () => {
      const ast = {
        type: 'negation',
        operand: { type: 'atomic', value: 'P' }
      };
      const text = LogicParser.astToText(ast);
      expect(text).toBe('~P');
    });
  });

  describe('areAstsEqual', () => {
    test('should correctly compare equal atomic propositions', () => {
      const ast1 = { type: 'atomic', value: 'P' };
      const ast2 = { type: 'atomic', value: 'P' };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(true);
    });

    test('should correctly compare different atomic propositions', () => {
      const ast1 = { type: 'atomic', value: 'P' };
      const ast2 = { type: 'atomic', value: 'Q' };
      expect(LogicParser.areAstsEqual(ast1, ast2)).toBe(false);
    });
  });

  describe('tokenize', () => {
    test('should split simple proposition correctly', () => {
      const tokens = LogicParser.tokenize('P');
      expect(tokens).toEqual(['P']);
    });

    test('should split conjunction correctly', () => {
      const tokens = LogicParser.tokenize('P ∧ Q');
      expect(tokens).toEqual(['P', '∧', 'Q']);
    });
  });
});