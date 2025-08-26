import { ruleSet, handleDropOnRuleSlot } from '../js/rules.js';
import { LogicParser } from '../js/parser.js';
import { store } from '../js/store.js';

// Mock the store.getState function to control feedback behavior
jest.mock('../js/store.js', () => ({
  store: {
    getState: jest.fn()
  }
}));

// Mock EventBus for tests
jest.mock('../js/event-bus.js', () => ({
    EventBus: {
      emit: jest.fn(),
      on: jest.fn(),
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

  describe('Drag and Drop Validation', () => {
    let mockStoreState;
    let dropSlot;
    let mockRuleElement;

    beforeEach(() => {
      // Mock the store state
      mockStoreState = {
        addFeedback: jest.fn(),
        proofLines: [],
        wffTray: [],
        currentScopeLevel: 0,
      };
      store.getState.mockReturnValue(mockStoreState);

      // Set up a basic DOM structure for the drop slot
      document.body.innerHTML = `
        <div>
          <div class="rule-item" data-rule="MP">
            <div class="drop-slot" data-premise-index="0"></div>
          </div>
        </div>
      `;
      dropSlot = document.querySelector('.drop-slot');
      mockRuleElement = document.querySelector('.rule-item');
    });

    afterEach(() => {
      // Reset all mocks
      jest.clearAllMocks();
      document.body.innerHTML = '';
    });

    const createMockEvent = (data) => ({
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: dropSlot, // Point the event target to our DOM element
        dataTransfer: {
          getData: jest.fn().mockReturnValue(JSON.stringify(data)),
        },
    });

    test('should allow valid source for standard rules', () => {
      const mockEvent = createMockEvent({ formula: 'P', source: 'proof-lines' });
      handleDropOnRuleSlot(mockEvent, mockRuleElement);
      expect(mockStoreState.addFeedback).not.toHaveBeenCalled();
    });

    test('should reject invalid source for standard rules', () => {
        const mockEvent = createMockEvent({ formula: 'P', source: 'wff-constructor' });
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
        expect(mockStoreState.addFeedback).toHaveBeenCalledWith(
            'This rule can only accept premises from the proof area.',
            'error'
        );
    });

    test('should allow valid sources for Add rule second slot', () => {
        mockRuleElement.dataset.rule = 'Add';
        dropSlot.dataset.premiseIndex = '1';
        const testSources = ['proof-lines', 'wff-constructor'];
        
        testSources.forEach(source => {
            const mockEvent = createMockEvent({ formula: 'Q', source });
            handleDropOnRuleSlot(mockEvent, mockRuleElement);
            expect(mockStoreState.addFeedback).not.toHaveBeenCalled();
            jest.clearAllMocks(); // Clear mocks for the next iteration
        });
    });

    test('should validate formula from WFF constructor', () => {
        mockRuleElement.dataset.rule = 'Add'; // A rule that can accept from constructor
        dropSlot.dataset.premiseIndex = '1';
        const mockEvent = createMockEvent({ formula: 'P ∨ Q', source: 'wff-constructor' });
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
        expect(mockStoreState.addFeedback).not.toHaveBeenCalled();
    });

    test('should reject invalid formula from WFF constructor', () => {
        mockRuleElement.dataset.rule = 'Add';
        dropSlot.dataset.premiseIndex = '1';
        const mockEvent = createMockEvent({ formula: 'P ∧', source: 'wff-constructor' });
        handleDropOnRuleSlot(mockEvent, mockRuleElement);
        expect(mockStoreState.addFeedback).toHaveBeenCalledWith(
            `Invalid formula from WFF constructor: Parsing Error: Unexpected token at start of expression: undefined in formula: "P ∧"`,
            'error'
        );
    });
  });
});