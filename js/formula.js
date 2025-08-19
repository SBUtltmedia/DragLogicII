import { LogicParser } from './parser.js';

class Formula {
    constructor(logicalRepresentation) {
        if (typeof logicalRepresentation === 'string') {
            this.text = logicalRepresentation;
            this.ast = LogicParser.textToAst(logicalRepresentation);
        } else if (typeof logicalRepresentation === 'object') {
            this.ast = logicalRepresentation;
            this.text = LogicParser.astToText(logicalRepresentation);
        } else {
            throw new Error('Invalid formula representation');
        }
    }

    equals(otherFormula) {
        return LogicParser.areAstsEqual(this.ast, otherFormula.ast);
    }

    // Example of a transformation: getting the conclusion from Modus Ponens
    static modusPonens(premise1, premise2) {
        if (premise1.ast.type === 'binary' && premise1.ast.operator === '→') {
            if (LogicParser.areAstsEqual(premise1.ast.left, premise2.ast)) {
                return new Formula(premise1.ast.right);
            }
        }
        return null; // Not applicable
    }
}

export default Formula;