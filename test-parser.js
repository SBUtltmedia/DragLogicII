// Simple test for LogicParser without Jest dependency
// This file can be run directly to verify basic functionality

// Import the parser module
import { LogicParser } from './js/parser.js';

console.log('Testing LogicParser...\n');

try {
  // Test atomic proposition
  const ast1 = LogicParser.textToAst('P');
  console.log('Atomic test: ', ast1);
  
  // Test negation 
  const ast2 = LogicParser.textToAst('~P');
  console.log('Negation test: ', ast2);
  
  // Test conjunction
  const ast3 = LogicParser.textToAst('P ∧ Q');
  console.log('Conjunction test: ', ast3);
  
  // Test implication
  const ast4 = LogicParser.textToAst('P → Q');
  console.log('Implication test: ', ast4);
  
  // Convert back to text
  const text = LogicParser.astToText(ast1);
  console.log('Convert back to text: ', text);
  
  console.log('\n✅ All basic parser tests passed!');
  
} catch (error) {
  console.error('❌ Parser test failed:', error.message);
}

console.log('\nParser testing completed.');
