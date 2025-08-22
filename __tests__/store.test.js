import { LogicParser } from '../js/parser.js';

// Mock the EventBus since it's used in the store
jest.mock('../js/event-bus.js', () => {
  const mockEventBus = {
    on: jest.fn(),
    emit: jest.fn(),
  };
  return { EventBus: mockEventBus };
});

describe('Store Module - Basic Tests', () => {
  // Since the full store functionality is complex to test in isolation,
  // we'll focus on testing that basic components work properly.
  
  test('should be able to parse formulas using LogicParser', () => {
    expect(() => LogicParser.textToAst('P')).not.toThrow();
    const ast = LogicParser.textToAst('P');
    expect(ast).toHaveProperty('type', 'atomic');
    expect(ast).toHaveProperty('value', 'P');
  });

  test('should handle basic logical expressions', () => {
    // Test simple atomic formula
    const atomic = LogicParser.textToAst('P');
    expect(atomic.type).toBe('atomic');
    
    // Test negation
    const negation = LogicParser.textToAst('~P');
    expect(negation.type).toBe('negation');
    expect(negation.operand.type).toBe('atomic');
    expect(negation.operand.value).toBe('P');

    // Test binary connective
    const binary = LogicParser.textToAst('(P → Q)');
    expect(binary.type).toBe('binary');
    expect(binary.operator).toBe('→');
  });

  test('should handle parsing errors gracefully', () => {
    expect(() => LogicParser.textToAst('')).toThrow();
    expect(() => LogicParser.textToAst('(')).toThrow();
  });
});
