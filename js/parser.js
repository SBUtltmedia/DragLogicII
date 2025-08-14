export const LogicParser = (() => {
    const operators = {
        '=': { prec: 5, assoc: 'left' },
        '~': { prec: 4, assoc: 'right' },
        '∧': { prec: 3, assoc: 'left' },
        '∨': { prec: 2, assoc: 'left' },
        '→': { prec: 1, assoc: 'right' },
        '↔': { prec: 0, assoc: 'right' },
    };

    function tokenize(text) {
        // Updated regex to include FOL tokens and '='
        const regex = /\s*([PQRSFGHxyz]|\(|\)|~|∧|∨|→|↔|∀|∃|ι|=|,)\s*/g;
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
        if (/^[FGH]$/.test(token)) {
            const name = consume();
            let args = [];
            if (peek() === '(') {
                consume(); // Eat '('
                if(peek() !== ')') {
                    args.push({ type: 'variable', value: consume() });
                    while (peek() === ',') {
                        consume(); // Eat ','
                        args.push({ type: 'variable', value: consume() });
                    }
                }
                match(')');
            }
            return { type: 'predicate', name, args };
        }
         if (/^[xyz]$/.test(token)) {
            return { type: 'variable', value: consume() };
        }
        if(token === '~') {
            consume();
            return {type: 'negation', operand: parseExpression(operators['~'].prec) }
        }
        if(token === '∀' || token === '∃') {
            const quantifier = consume();
            const variable = consume();
            const formula = parseExpression(0); // Quantifiers bind tightly
             return { type: 'quantifier', quantifier, variable, formula };
        }
        if(token === 'ι') {
            const operator = consume();
            const variable = consume();
            const formula = parseExpression(0); // Iota binds tightly
            return { type: 'description', operator, variable, formula };
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
         if (!ast) return '';
         switch (ast.type) {
            case 'atomic':
            case 'variable':
                return ast.value;
            case 'predicate':
                if (ast.args.length === 0) return ast.name;
                return `${ast.name}(${ast.args.map(fromAst).join(', ')})`;
            case 'negation':
                const operandStr = fromAst(ast.operand);
                if (ast.operand.type === 'atomic' || ast.operand.type === 'predicate') {
                     return `~${operandStr}`;
                }
                return `~(${operandStr})`;
            case 'binary':
                const left = fromAst(ast.left);
                const right = fromAst(ast.right);
                return `(${left} ${ast.operator} ${right})`;
             case 'quantifier':
                const formulaStr = fromAst(ast.formula);
                if (ast.formula.type === 'binary') {
                    return `${ast.quantifier}${ast.variable}(${formulaStr})`;
                }
                return `${ast.quantifier}${ast.variable}${formulaStr}`;
            case 'description':
                const descFormulaStr = fromAst(ast.formula);
                if (ast.formula.type === 'binary') {
                    return `${ast.operator}${ast.variable}(${descFormulaStr})`;
                }
                return `${ast.operator}${ast.variable}${descFormulaStr}`;
            default:
                throw new Error(`Unknown AST node type: ${ast.type}`);
         }
    }

    function areEqual(ast1, ast2) {
        if (!ast1 && !ast2) return true;
        if (!ast1 || !ast2 || ast1.type !== ast2.type) return false;

        switch (ast1.type) {
            case 'atomic':
            case 'variable':
                return ast1.value === ast2.value;
            case 'predicate':
                 if (ast1.name !== ast2.name || ast1.args.length !== ast2.args.length) return false;
                 for(let i = 0; i < ast1.args.length; i++) {
                     if (!areEqual(ast1.args[i], ast2.args[i])) return false;
                 }
                 return true;
            case 'negation':
                return areEqual(ast1.operand, ast2.operand);
            case 'binary':
                return ast1.operator === ast2.operator &&
                       areEqual(ast1.left, ast2.left) &&
                       areEqual(ast1.right, ast2.right);
             case 'quantifier':
                return ast1.quantifier === ast2.quantifier &&
                       ast1.variable === ast2.variable &&
                       areEqual(ast1.formula, ast2.formula);
            case 'description':
                return ast1.operator === ast2.operator &&
                       ast1.variable === ast2.variable &&
                       areEqual(ast1.formula, ast2.formula);
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