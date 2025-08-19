# Drag Logic II - Developer Documentation

## Project Overview

This is an interactive natural deduction proof assistant that allows users to construct logical proofs step-by-step using drag-and-drop interactions. It supports both propositional and first-order logic systems.

## Architecture

The application uses a modular architecture with clear separation of concerns:

1. **State Management**: Uses Zustand for global state management
2. **Event System**: EventBus for communication between components
3. **UI Components**: Modular UI handling with DOM manipulation
4. **Logic Components**: Parser, rules engine, and problem definitions

### Core Modules

- `js/main.js`: Entry point that initializes the application
- `js/app.js`: Main application logic and initialization
- `js/ui.js`: User interface handlers and rendering logic
- `js/store.js`: Global state management using Zustand
- `js/drag-drop.js`: Drag-and-drop event handling
- `js/rules.js`: Inference rules implementation
- `js/parser.js`: Logical formula parser and AST generator
- `js/problems.js`: Problem definitions and sets

## Structure

```
Drag_Logic_II/
├── js/
│   ├── app.js              # Main application logic
│   ├── ui.js               # UI event handlers and rendering
│   ├── store.js            # Global state management
│   ├── drag-drop.js        # Drag-and-drop functionality
│   ├── rules.js            # Logical inference rules
│   ├── parser.js           # Formula parsing and AST generation
│   ├── problems.js         # Problem definitions
│   └── vendor/             # Third-party libraries
├── css/
│   └── style.css           # Application styling
└── __tests__/
    └── ui.test.js          # UI module tests
```

## Key Features

### Propositional Logic
- Basic connectives: ¬, ∧, ∨, →, ↔
- Inference rules: MP, MT, DS, Add, Simp, Conj, CD

### First-Order Logic
- Quantifiers: ∀, ∃
- Descriptive operators: ι
- Rules: UI, EG, EI, UG

### User Interface
- Drag-and-drop construction of well-formed formulas
- Visual proof area with line numbering and justification
- Rule application with contextual slots
- Subproof support (CP, RAA)

## Areas for Improvement

### 1. Incomplete Functionality
Several parts of the application are not fully implemented:
- **Subproof completion**: The `endSubproof` method in store.js is only partially implemented
- **Rule interaction**: Complex rules like those with quantifiers need better UI for input collection instead of prompts
- **Proof line management**: No proper way to display/hide subproof content or mark lines as proven/inactive

### 2. Code Quality Issues
- **Error handling**: Missing comprehensive error handling in several areas
- **Documentation**: Many functions lack JSDoc comments for parameters and return values
- **Code clarity**: Some complex logic could benefit from refactoring

### 3. UI/UX Enhancements
- **Visual feedback**: Enhanced error messages and clearer visual indicators
- **Better drag-drop states**: More polished hover and drop effects  
- **Rule slot hints**: Better guidance on what types of formulas are expected in rule slots

### 4. Testing
- **Limited test coverage**: Tests only cover basic UI rendering
- **Missing integration tests**: No comprehensive end-to-end testing of rules application
- **Edge case testing**: Missing validation for malformed inputs

## Technical Debt

1. **Incomplete Rule System**:
   - Subproof completion logic needs implementation
   - Complex rule parameter collection uses crude prompt dialogs
   - Quantifier rules lack proper variable restriction checking

2. **State Management Gaps**:
   - Some state transitions are not thoroughly validated
   - There's no proper undo/redo system

3. **Parser Robustness**:
   - Error reporting could be improved with better positions
   - Edge cases in string-to-AST conversion may not be handled properly

## Implementation Notes

The application architecture follows these core principles:

1. **Declarative UI Updates**: 
   - State changes trigger `render()` updates to reflect UI components
   - All UI logic is centralized in `ui.js`
   
2. **Event-Driven Architecture**:
   - EventBus handles communication between modules
   - This decouples components while maintaining loose coupling

3. **Functional Core with Imperative Shell**:
   - State management and business logic are kept functional
   - DOM manipulation happens in the imperative shell of UI module

4. **Scalable CSS**:
   - Uses `rem` units and container queries for responsive scaling
   - Modular CSS structure avoids global conflicts

## Contributing Guidelines

### Code Style
- Follow existing code patterns and naming conventions
- Add proper JSDoc comments to functions
- Keep functions focused on single responsibilities
- Write unit tests for new functionality

### Testing
- Add tests for both unit and integration scenarios
- Test edge cases in parsing and rule application
- Ensure UI interactions are properly covered by tests

### Implementation Process
1. Identify the specific feature or fix needed
2. Create a test case that will pass after implementation
3. Implement the solution
4. Verify all existing tests still pass
5. Add any missing tests for new functionality

## Future Enhancement Ideas

1. **Advanced Features**
   - Add undo/redo functionality
   - Implement auto-saving of progress
   - Add export/import for proofs 

2. **User Experience** 
   - More sophisticated tutorial system with interactive guidance
   - Better error messages and validation feedback
   - Visual indicators for proof complexity

3. **Technical Improvements**
   - Refactor complex drag-and-drop operations into reusable components
   - Implement proper test coverage for the rule engine
   - Add more comprehensive logging for debugging

4. **Learning Features**
   - Provide hints or suggestions when stuck
   - Show alternative approaches to proofs
   - Track user progress and performance over time

## Development Setup

1. Install dependencies: `npm install`
2. Run development server: `npm run start`
3. Run tests: `npm test`

The application uses Vite as the build tool and Jest for testing.
