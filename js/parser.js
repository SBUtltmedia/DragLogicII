export const LogicParser = (() => {
    const operators = {
        '□': { prec: 5, assoc: 'right' }, // Highest precedence
        '◊': { prec: 5, assoc: 'right' },
        '~': { prec: 4, assoc: 'right' },
        '∧': { prec: 3, assoc: 'left' },
        '∨': { prec: 2, assoc: 'left' },
        '→': { prec: 1, assoc: 'right' },
        '↔': { prec: 0, assoc: 'right' },
    };

    function tokenize(text) {
        const regex = /\s*([PQRS]|\(|\)|~|∧|∨|→|↔|□|◊)\s*/g;
        return text.replace(regex, ' $1 ').trim().split(/\s+/).filter(t => t.length > 0);
    }

    // --- Recursive Descent Parser ---
    let tokens = [];
    let pos = 0;

    function peek() { return tokens[pos]; }
    function consume() { return tokens[pos++]; }
    function match(expected) {
        if (peek() === expected) {
            return consume();
        }
        throw new Error(`Expected '${expected}' but found '${peek()}'`);
    }

    function parsePrimary() {
        const token = peek();
        if (token === '(') {
            consume(); // Eat '('
            const expr = parseExpression(0);
            match(')');
            return expr;
        }
        if (/^[PQRS]$/.test(token)) {
            return { type: 'atomic', value: consume() };
        }
        if(token === '~' || token === '□' || token === '◊') {
            const op = consume();
            return {type: 'unary', operator: op, operand: parseExpression(operators[op].prec) }
        }
        throw new Error(`Unexpected token at start of expression: ${token}`);
    }

    function parseExpression(precedence) {
        let left = parsePrimary();
        while(pos < tokens.length) {
            const token = peek();
            if(operators[token] && operators[token].prec >= precedence) {
                const op = operators[token];
                consume();
                const right = parseExpression(op.assoc === 'left' ? op.prec + 1 : op.prec);
                left = { type: 'binary', operator: token, left, right };
            } else {
                break;
            }
        }
        return left;
    }

    function fromAst(ast) {
        const result = fromAstRecursive(ast);
        // Remove outermost parentheses if they exist and aren't necessary
        if (result.startsWith('(') && result.endsWith(')')) {
            // A simple check to avoid removing necessary parens like in ~(P & Q)
            let parenCount = 0;
            for (let i = 1; i < result.length - 1; i++) {
                if (result[i] === '(') parenCount++;
                if (result[i] === ')') parenCount--;
                if (parenCount < 0) return result; // Unbalanced, so outer parens are needed
            }
            return result.slice(1, -1);
        }
        return result;
    }

    function fromAstRecursive(ast) {
         if (!ast) return '';
         switch (ast.type) {
            case 'atomic':
                return ast.value;
            case 'unary':
                const operandStr = fromAstRecursive(ast.operand);
                if (ast.operand.type === 'atomic' || ast.operand.type === 'unary') {
                     return `${ast.operator}${operandStr}`;
                }
                return `${ast.operator}(${operandStr})`;
            case 'binary':
                const left = fromAstRecursive(ast.left);
                const right = fromAstRecursive(ast.right);
                return `(${left} ${ast.operator} ${right})`;
            default:
                throw new Error(`Unknown AST node type: ${ast.type}`);
         }
    }

    function areEqual(ast1, ast2) {
        if (!ast1 && !ast2) return true;
        if (!ast1 || !ast2 || ast1.type !== ast2.type) return false;

        switch (ast1.type) {
            case 'atomic':
                return ast1.value === ast2.value;
            case 'unary':
                return ast1.operator === ast2.operator && areEqual(ast1.operand, ast2.operand);
            case 'binary':
                return ast1.operator === ast2.operator &&
                       areEqual(ast1.left, ast2.left) &&
                       areEqual(ast1.right, ast2.right);
            default:
                return false;
        }
    }

    return {
        textToAst: (text) => {
            if (typeof text !== 'string') {
                throw new Error(`Parser Error: Input is not a string, but ${typeof text}.`);
            }
            try {
                tokens = tokenize(text);
                pos = 0;
                const ast = parseExpression(0);
                if (pos < tokens.length) {
                    // This ensures the entire string was consumed.
                    throw new Error(`Unexpected token at end of expression: ${peek()}`);
                }
                return ast;
            }
            catch (e) {
                // Re-throw a more informative error.
                throw new Error(`Parsing Error: ${e.message} in formula: "${text}"`);
            }
        },
        
        validateFormula: (formulaText) => {
            try {
                const ast = LogicParser.textToAst(formulaText);
                return { valid: true, ast };
            } catch (error) {
                return { valid: false, error: error.message };
            }
        },
        astToText: (ast) => {
             try {
                return fromAst(ast);
             }
             catch (e) {
                // Re-throw a more informative error.
                throw new Error(`AST-to-Text Error: ${e.message}`);
             }
        },
        areAstsEqual: areEqual,
        tokenize: tokenize // Expose tokenize for rendering
    };
})();
