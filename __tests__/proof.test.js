import { addProofLine, isNegationOf } from '../js/proof.js';
import { store } from '../js/store.js';
import { EventBus } from '../js/event-bus.js';

jest.mock('../js/event-bus.js', () => ({
  EventBus: {
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

describe('Proof Module', () => {
  beforeEach(() => {
    store.setState(store.getInitialState());
    EventBus.emit.mockClear();
  });

  describe('addProofLine', () => {
    test('should add a new proof line to the store', () => {
      addProofLine('P', 'Premise', 0);
      const state = store.getState();
      expect(state.proofLines).toHaveLength(1);
      expect(state.proofLines[0].formula).toBe('P');
      expect(state.nextLineNumberGlobal).toBe(2);
    });

    test('should not add a duplicate line in the same scope', () => {
      addProofLine('P', 'Premise', 0);
      addProofLine('P', 'Reiteration', 0);
      expect(EventBus.emit).toHaveBeenCalledWith('feedback:show', {
        message: 'This line already exists and is proven in the current scope.',
        isError: true,
      });
      const state = store.getState();
      expect(state.proofLines).toHaveLength(1);
    });

    test('should emit game:win when goal is reached', () => {
      store.setState({ goalFormula: 'Q' });
      addProofLine('Q', 'Premise', 0);
      expect(EventBus.emit).toHaveBeenCalledWith('game:win');
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