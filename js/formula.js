import { LogicParser } from './parser.js';

export function createFormula(text) {
    try {
        const ast = LogicParser.textToAst(text);
        return {
            text: text,
            ast: ast,
            formula: text
        };
    } catch (e) {
        console.error(`Failed to create formula for text: "${text}"`, e);
        return {
            text: text,
            ast: null,
            formula: ''
        };
    }
}