import { LogicParser } from './parser.js';

export const Validator = {
    validate: function(formulaAst, pattern) {
        if (!pattern || pattern === 'any') {
            return true; // No validation needed
        }

        if (!formulaAst) {
            return false;
        }

        const parts = pattern.split('.');
        const expectedType = parts[0];
        const expectedOperator = parts[1] || null;

        if (formulaAst.type !== expectedType) {
            return false;
        }

        if (expectedOperator && formulaAst.operator !== expectedOperator) {
            return false;
        }

        return true;
    }
};