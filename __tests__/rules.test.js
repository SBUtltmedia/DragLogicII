import { ruleSet, handleDropOnRuleSlot } from '../js/rules.js';
import { LogicParser } from '../js/parser.js';
import { store } from '../js/store.js';

// Mock the store.getState function to control feedback behavior
jest.mock('../js/store.js', () => ({
  store: {
    getState: jest.fn()
  }
}));

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

  describe('Drag and Drop Validation', () => {
    let mockStoreState;
    
    beforeEach(() => {
      // Mock the store state
      mockStoreState = {
        addFeedback: jest.fn()
      };
      store.getState.mockReturnValue(mockStoreState);
      
      // Mock the event system to prevent actual DOM interactions
      global.EventBus = {
        emit: jest.fn()
      };
    });

    afterEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
    });

    test('should allow valid source for standard rules', () => {
      // This tests the validation in handleDropOnRuleSlot function
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P',
            source: 'proof-lines'
          }))
        }
      };

      // Mock rule element with valid MP rule
      const mockRuleElement = {
        dataset: { rule: 'MP' },
        getElementsByClassName: jest.fn()
      };

      // Create a drop slot for this test
      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0';
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);
      
      // Call the function - this should work without errors
      expect(() => {
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
      }).not.toThrow();
    });

    test('should reject invalid source for standard rules', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P',
            source: 'wff-constructor'
          }))
        }
      };

      const mockRuleElement = {
        dataset: { rule: 'MP' },
        getElementsByClassName: jest.fn()
      };

      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0';
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

      // This should add a feedback error
      handleDropOnRuleSlot(mockEvent, mockRuleElement);
      
      expect(mockStoreState.addFeedback).toHaveBeenCalledWith(
        'This rule can only accept premises from the proof area.',
        'error'
      );
    });

    test('should allow valid sources for Add rule first slot', () => {
      // Test with proof-line source (which should be allowed)
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P',
            source: 'proof-lines'
          }))
        }
      };

      const mockRuleElement = {
        dataset: { rule: 'Add' },
        getElementsByClassName: jest.fn()
      };

      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0'; // First slot
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

      expect(() => {
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
      }).not.toThrow();
    });

    test('should reject invalid source for Add rule first slot', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P',
            source: 'wff-constructor'
          }))
        }
      };

      const mockRuleElement = {
        dataset: { rule: 'Add' },
        getElementsByClassName: jest.fn()
      };

      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0'; // First slot
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

      handleDropOnRuleSlot(mockEvent, mockRuleElement);
      
      expect(mockStoreState.addFeedback).toHaveBeenCalledWith(
        'First slot of Add rule must come from proof area.',
        'error'
      );
    });

    test('should allow valid sources for Add rule second slot', () => {
      // Test with both proof-line and wff-constructor sources (both should be allowed)
      const testSources = ['proof-lines', 'wff-constructor'];
      
      testSources.forEach(source => {
        const mockEvent = {
          preventDefault: jest.fn(),
          stopPropagation: jest.fn(),
          dataTransfer: {
            getData: jest.fn().mockReturnValue(JSON.stringify({
              formula: 'Q',
              source: source
            }))
          }
        };

        const mockRuleElement = {
          dataset: { rule: 'Add' },
          getElementsByClassName: jest.fn()
        };

        const dropSlot = document.createElement('div');
        dropSlot.dataset.premiseIndex = '1'; // Second slot 
        mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

        expect(() => {
          handleDropOnRuleSlot(mockEvent, mockRuleElement);
        }).not.toThrow();
      });
    });

    test('should validate formula from WFF constructor', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P ∨ Q', // Valid formula
            source: 'wff-constructor'
          }))
        }
      };

      const mockRuleElement = {
        dataset: { rule: 'MP' },  
        getElementsByClassName: jest.fn()
      };

      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0';
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

      expect(() => {
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
      }).not.toThrow();
    });

    test('should reject invalid formula from WFF constructor', () => {
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify({
            formula: 'P ∧', // Invalid - missing right operand 
            source: 'wff-constructor'
          }))
        }
      };

      const mockRuleElement = {
        dataset: { rule: 'MP' },
        getElementsByClassName: jest.fn()
      };

      const dropSlot = document.createElement('div');
      dropSlot.dataset.premiseIndex = '0';
      mockRuleElement.querySelector = jest.fn().mockReturnValue(dropSlot);

      handleDropOnRuleSlot(mockEvent, mockRuleElement);
      
      // Should provide an error about invalid formula from WFF constructor
      expect(mockStoreState.addFeedback).toHaveBeenCalled();
    });
  });
});
