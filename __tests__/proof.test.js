import { addProofLine, isNegationOf } from '../js/proof.js';
import { store } from '../js/store.js';
import { EventBus } from '../js/event-bus.js';
import { LogicParser } from '../js/parser.js';

jest.mock('../js/store.js', () => ({
  store: {
    getState: jest.fn(),
    subscribe: jest.fn(),
  },
}));

jest.mock('../js/event-bus.js', () => ({
  EventBus: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

describe('Proof Module', () => {
  let mockState;

  beforeEach(() => {
    // Reset mocks before each test
    mockState = {
      nextLineNumberGlobal: 1,
      subGoalStack: [],
      proofLines: [],
      goalFormula: { formula: 'Q', ast: LogicParser.textToAst('Q') },
      addProofLine: jest.fn(),
      setNextLineNumber: jest.fn(),
      updateSubGoalStack: jest.fn(),
      setProofLines: jest.fn(),
      setCurrentScopeLevel: jest.fn(),
    };
    store.getState.mockReturnValue(mockState);
    EventBus.emit.mockClear();
  });

  describe('addProofLine', () => {
    test('should add a new proof line to the store', () => {
        addProofLine('P', 'Premise', 0);
        expect(mockState.addProofLine).toHaveBeenCalled();
    });

    test('should not add a duplicate line in the same scope', () => {
      mockState.proofLines = [{ formula: LogicParser.textToAst('P'), scopeLevel: 0, isProven: true }];
      mockState.nextLineNumberGlobal = 2;

      const lineData = addProofLine('P', 'Reiteration', 0);

      expect(lineData).toBeNull();
      expect(EventBus.emit).toHaveBeenCalledWith('feedback:show', {
        message: 'This line already exists and is proven in the current scope.',
        isError: true,
      });
      expect(mockState.addProofLine).not.toHaveBeenCalled();
    });

    test('should emit game:win when goal is reached', () => {
        mockState.goalFormula = { formula: 'P', ast: LogicParser.textToAst('P') };
        mockState.proofLines = [{ formula: LogicParser.textToAst('P'), scopeLevel: 0, isProven: true }];
        const spy = jest.spyOn(EventBus, 'emit');
        addProofLine('P', 'Premise', 0);
        expect(spy).toHaveBeenCalledWith('game:win');
      });
  });

  describe('isNegationOf', () => {
    test('should return true for a formula and its negation', () => {
      expect(isNegationOf('P', '~P')).toBe(true);
      expect(isNegationOf('~P', 'P')).toBe(true);
    });

    test('should return false for two different formulas', () => {
      expect(isNegationOf('P', 'Q')).toBe(false);
    });

    test('should return false for a formula and its double negation', () => {
      expect(isNegationOf('P', '~~P')).toBe(false);
    });
  });
});