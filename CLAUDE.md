# Claude Code Guidelines for Drag_Logic_II

## Important Tool Usage
- When modifying files, use the **Edit tool** (not replace tool which has issues on macOS)
- The Edit tool performs exact string replacements and works reliably

## Code Architecture
- When modifying a file, whenever possible WFFs should be treated as AST with some exceptions like UI and problem sets for ease on human creation of problem sets.

## Consistency Requirements
This program is intended to ensure consistency by only allowing correct implementation of its inference rules and subproofs. For instance, dragging P->Q and P from the WFF construction area onto Modus Ponens should not add Q to the proof. Check for this consistency whenever adding code to this area.

## Development Workflow
- Don't run "npm start" unless asked - it's always running in another window

## File Operations
- Always use the Edit tool for file modifications on this macOS system
- Read files first before editing them
- Treat WFFs as AST structures where appropriate for consistency
