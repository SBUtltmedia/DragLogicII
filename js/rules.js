function isTermDenoting(termAst, proofList) {
    if (!termAst) return false;
    // Simple variables are always considered denoting in this system.
    if (termAst.type === 'variable') {
        return true;
    }
    // For ι-expressions, we need to find a proof line that asserts its existence and uniqueness.
    if (termAst.type === 'description') {
        const termText = LogicParser.astToText(termAst);
        // The formula we are looking for is ∃y(y = ιx(Fx))
        const denotingFormulaAst = {
            type: 'quantifier',
            quantifier: '∃',
            variable: 'y', // A standard variable used for this check
            formula: {
                type: 'binary',
                operator: '=',
                left: { type: 'variable', value: 'y' },
                right: termAst
            }
        };
        const denotingFormulaText = LogicParser.astToText(denotingFormulaAst);

        const allLines = proofList.querySelectorAll('li[data-is-proven="true"]');
        for (const line of allLines) {
            const lineFormula = line.querySelector('.formula').dataset.formula;
            if (lineFormula === denotingFormulaText) {
                return true;
            }
        }
        return false;
    }
    return false;
}

function handleRuleItemDragEnter(event) {
    const item = event.currentTarget;
    item.dataset.hoverTimer = setTimeout(() => {
        item.classList.add('active');
    }, 500);
}

function handleRuleItemDragLeave(event) {
    const item = event.currentTarget;
    clearTimeout(item.dataset.hoverTimer);
}

function handleRuleItemClick(event) {
    if (event.target && event.target.closest('.drop-slot')) {
        return;
    }

    const clickedItem = event.currentTarget;
    const isAlreadyActive = clickedItem.classList.contains('active');

    ruleItems.forEach(item => {
        item.classList.remove('active');
    });

    if (!isAlreadyActive) {
        clickedItem.classList.add('active');
    }
}

function getRuleSlotData(ruleItemElement) {
    const slots = ruleItemElement.querySelectorAll('.drop-slot');
    return Array.from(slots).map(slot => ({
        formula: slot.dataset.formula, line: slot.dataset.line,
        source: slot.dataset.source, elementId: slot.dataset.elementId
    }));
}

function validateRuleSlots(ruleItemElement, expectedPremises) {
    const slotsData = getRuleSlotData(ruleItemElement);
    const filledSlots = slotsData.filter(s => s.formula);
    if (filledSlots.length < expectedPremises) { return null; }
    return slotsData;
}

function attemptAutoModusPonens(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;
    const [premise1, premise2] = slotsData;

    const ast1 = LogicParser.textToAst(premise1.formula);
    const ast2 = LogicParser.textToAst(premise2.formula);

    // Validation already happened, so we just check the logic
    if (ast1 && ast2 && LogicParser.areAstsEqual(ast1.left, ast2)) {
        const consumedWffIds = [];
        if (premise1.source === 'wff-tray-formula' && premise1.elementId) consumedWffIds.push(premise1.elementId);
        if (premise2.source === 'wff-tray-formula' && premise2.elementId) consumedWffIds.push(premise2.elementId);
        return {
            resultFormula: LogicParser.astToText(ast1.right),
            justificationText: `MP ${premise1.line || 'WFF'}, ${premise2.line || 'WFF'}`,
            consumedWffIds: consumedWffIds
        };
    }
    showFeedback("MP Error: The second premise must match the antecedent of the first.", true); return null;
}

function attemptAutoModusTollens(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;
    const [premise1, premise2] = slotsData;

    const ast1 = LogicParser.textToAst(premise1.formula);
    const ast2 = LogicParser.textToAst(premise2.formula);

    // Validation already happened, we just check the logic
    if (ast1 && ast2 && LogicParser.areAstsEqual(ast1.right, ast2.operand)) {

        const consumedWffIds = [];
        if (premise1.source === 'wff-tray-formula' && premise1.elementId) consumedWffIds.push(premise1.elementId);
        if (premise2.source === 'wff-tray-formula' && premise2.elementId) consumedWffIds.push(premise2.elementId);

        const resultAst = { type: 'negation', operand: ast1.left };

        return {
            resultFormula: LogicParser.astToText(resultAst),
            justificationText: `MT ${premise1.line || 'WFF'}, ${premise2.line || 'WFF'}`,
            consumedWffIds: consumedWffIds
        };
    }
    showFeedback("MT Error: The second premise must be the negation of the first's consequent.", true); return null;
}

function attemptAutoAndIntroduction(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;
    const [premiseA, premiseB] = slotsData;

    const astA = LogicParser.textToAst(premiseA.formula);
    const astB = LogicParser.textToAst(premiseB.formula);
    if (!astA || !astB) { showFeedback("One of the formulas for ∧I is invalid.", true); return null; }

    const resultAst = { type: 'binary', operator: '∧', left: astA, right: astB };

    const consumedWffIds = [];
    if (premiseA.source === 'wff-tray-formula' && premiseA.elementId) consumedWffIds.push(premiseA.elementId);
    if (premiseB.source === 'wff-tray-formula' && premiseB.elementId) consumedWffIds.push(premiseB.elementId);
    return {
        resultFormula: LogicParser.astToText(resultAst),
        justificationText: `∧I ${premiseA.line || 'WFF'}, ${premiseB.line || 'WFF'}`,
        consumedWffIds: consumedWffIds
    };
}

function attemptAutoAndElimination(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 1);
    if (!slotsData || !slotsData[0].formula) return null;
    const conjunctionPremise = slotsData[0];

    const ast = LogicParser.textToAst(conjunctionPremise.formula);
    if (!ast || ast.type !== 'binary' || ast.operator !== '∧') {
        // This check is now redundant due to slot validation, but safe to keep
        showFeedback("∧E Error: Premise must be a conjunction (φ ∧ ψ).", true); return null;
    }

    const leftPart = LogicParser.astToText(ast.left);
    const rightPart = LogicParser.astToText(ast.right);

    const choice = prompt(`From "${conjunctionPremise.formula}", extract:\n1. "${leftPart}" (Left)\n2. "${rightPart}" (Right)`, "1");

    let resultFormula = null;
    if (choice === "1") resultFormula = leftPart;
    else if (choice === "2") resultFormula = rightPart;
    else { showFeedback("∧E: No valid choice made.", true); return null; }

    const consumedWffIds = [];
    if (conjunctionPremise.source === 'wff-tray-formula' && conjunctionPremise.elementId) consumedWffIds.push(conjunctionPremise.elementId);
    return { resultFormula: resultFormula, justificationText: `∧E ${conjunctionPremise.line || 'WFF'}`, consumedWffIds: consumedWffIds };
}

function attemptAutoExistentialIntroduction(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;

    const [formulaPremise, termPremise] = slotsData;
    const formulaAst = LogicParser.textToAst(formulaPremise.formula);
    const termAst = LogicParser.textToAst(termPremise.formula);

    if (!formulaAst || !termAst) {
        showFeedback("∃I Error: Invalid formula or term.", true);
        return null;
    }

    // Restriction: The term used for generalization must be denoting.
    if (!isTermDenoting(termAst, proofList)) {
        showFeedback(`∃I Error: The term "${LogicParser.astToText(termAst)}" must be proven to be denoting.`, true);
        return null;
    }

    const variableToIntroduce = prompt(`Introduce which variable (e.g., x, y, z) for "${LogicParser.astToText(termAst)}"?`);
    if (!/^[xyz]$/.test(variableToIntroduce)) {
        showFeedback("∃I Error: You must introduce a valid variable (x, y, or z).", true);
        return null;
    }

    function replaceInAst(ast, fromTerm, toVar) {
        if (!ast) return null;
        if (LogicParser.areAstsEqual(ast, fromTerm)) {
            return { type: 'variable', value: toVar };
        }
        if (ast.type === 'predicate') {
            const newArgs = ast.args.map(arg => replaceInAst(arg, fromTerm, toVar));
            return { ...ast, args: newArgs };
        }
        if (ast.type === 'negation') {
             return { ...ast, operand: replaceInAst(ast.operand, fromTerm, toVar) };
        }
        if (ast.type === 'binary') {
            return { ...ast, left: replaceInAst(ast.left, fromTerm, toVar), right: replaceInAst(ast.right, fromTerm, toVar) };
        }
         if (ast.type === 'quantifier') {
             // If the quantifier binds a variable in the term we're replacing, this is a complex case.
             // For now, we'll assume no variable capture for simplicity.
             return { ...ast, formula: replaceInAst(ast.formula, fromTerm, toVar) };
        }
        return ast;
    }

    const newFormulaBody = replaceInAst(formulaAst, termAst, variableToIntroduce);
    const resultAst = { type: 'quantifier', quantifier: '∃', variable: variableToIntroduce, formula: newFormulaBody };

    const consumedWffIds = [];
    if (formulaPremise.source === 'wff-tray-formula' && formulaPremise.elementId) consumedWffIds.push(formulaPremise.elementId);
    if (termPremise.source === 'wff-tray-formula' && termPremise.elementId) consumedWffIds.push(termPremise.elementId);

    return {
        resultFormula: LogicParser.astToText(resultAst),
        justificationText: `∃I ${formulaPremise.line || 'WFF'}`,
        consumedWffIds
    };
}


function attemptAutoDoubleNegation(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 1);
    if (!slotsData || !slotsData[0].formula) return null;
    const premise = slotsData[0];

    const ast = LogicParser.textToAst(premise.formula);
    if (!ast) { showFeedback("Invalid formula for DN.", true); return null; }

    let resultAst;
    if (ast.type === 'negation' && ast.operand.type === 'negation') {
        resultAst = ast.operand.operand; // ~~A -> A
    } else {
        resultAst = { type: 'negation', operand: { type: 'negation', operand: ast } }; // A -> ~~A
    }

    const consumedWffIds = [];
    if (premise.source === 'wff-tray-formula' && premise.elementId) consumedWffIds.push(premise.elementId);
    return { resultFormula: LogicParser.astToText(resultAst), justificationText: `DN ${premise.line || 'WFF'}`, consumedWffIds: consumedWffIds };
}

function attemptAutoUniversalInstantiation(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;

    const [quantifiedFormulaPremise, termPremise] = slotsData;
    const quantifiedAst = LogicParser.textToAst(quantifiedFormulaPremise.formula);
    const termAst = LogicParser.textToAst(termPremise.formula);

    if (!quantifiedAst || quantifiedAst.type !== 'quantifier' || quantifiedAst.quantifier !== '∀') {
        showFeedback("UI Error: First premise must be a universally quantified formula (∀x...).", true);
        return null;
    }

    if (!termAst || (termAst.type !== 'variable' && termAst.type !== 'description')) {
        showFeedback("UI Error: Second premise must be a term (a variable or ι-expression).", true);
        return null;
    }

    // Restriction: The term used for instantiation must be denoting.
    if (!isTermDenoting(termAst, proofList)) {
        showFeedback(`UI Error: The term "${LogicParser.astToText(termAst)}" must be proven to be denoting.`, true);
        return null;
    }

    // Replace all free occurrences of of the quantified variable with the term.
    function replaceInAst(ast, fromVar, toTerm) {
        if (!ast) return null;
        if (ast.type === 'variable' && ast.value === fromVar) {
            return toTerm;
        }
        if (ast.type === 'predicate') {
            const newArgs = ast.args.map(arg => replaceInAst(arg, fromVar, toTerm));
            return { ...ast, args: newArgs };
        }
        if (ast.type === 'negation') {
            return { ...ast, operand: replaceInAst(ast.operand, fromVar, toTerm) };
        }
        if (ast.type === 'binary') {
            return { ...ast, left: replaceInAst(ast.left, fromVar, toTerm), right: replaceInAst(ast.right, fromVar, toTerm) };
        }
        if (ast.type === 'quantifier') {
            // If the inner quantifier binds the same variable, stop substitution in this branch.
            if (ast.variable === fromVar) return ast;
            // Prevent variable capture
            if (toTerm.type === 'variable' && ast.variable === toTerm.value) {
                 throw new Error("Variable capture detected. This substitution is not allowed.");
            }
            return { ...ast, formula: replaceInAst(ast.formula, fromVar, toTerm) };
        }
        if (ast.type === 'description') {
             if (ast.variable === fromVar) return ast; // Bound variable
             return { ...ast, formula: replaceInAst(ast.formula, fromVar, toTerm) };
        }
        return ast;
    }

    try {
        const resultAst = replaceInAst(quantifiedAst.formula, quantifiedAst.variable, termAst);
        const consumedWffIds = [];
        if (quantifiedFormulaPremise.source === 'wff-tray-formula' && quantifiedFormulaPremise.elementId) consumedWffIds.push(quantifiedFormulaPremise.elementId);
        if (termPremise.source === 'wff-tray-formula' && termPremise.elementId) consumedWffIds.push(termPremise.elementId);

        return {
            resultFormula: LogicParser.astToText(resultAst),
            justificationText: `UI ${quantifiedFormulaPremise.line || 'WFF'}`,
            consumedWffIds
        };
    } catch (e) {
        showFeedback(`UI Error: ${e.message}`, true);
        return null;
    }
}

function attemptAutoRule(ruleItemElement) {
    const ruleType = ruleItemElement.dataset.rule;
    let result = null;

    switch (ruleType) {
        case 'MP': result = attemptAutoModusPonens(ruleItemElement); break;
        case 'MT': result = attemptAutoModusTollens(ruleItemElement); break;
        case '∧I': result = attemptAutoAndIntroduction(ruleItemElement); break;
        case '∧E': result = attemptAutoAndElimination(ruleItemElement); break;
        case 'DN': result = attemptAutoDoubleNegation(ruleItemElement); break;
        case 'UI': result = attemptAutoUniversalInstantiation(ruleItemElement); break;
        case '∃I': result = attemptAutoExistentialIntroduction(ruleItemElement); break;
        default: showFeedback(`Rule "${ruleType}" is not implemented yet.`, true); return;
    }

    if (result && result.resultFormula) {
        addProofLine(result.resultFormula, result.justificationText);
        if (result.consumedWffIds && result.consumedWffIds.length > 0) {
            result.consumedWffIds.forEach(id => {
                const elem = document.getElementById(id);
                if (elem) elem.remove();
            });
        }
        // Clear slots after successful application
        ruleItemElement.querySelectorAll('.drop-slot').forEach(slot => {
            slot.innerHTML = '';
            delete slot.dataset.formula;
            delete slot.dataset.line;
            delete slot.dataset.source;
            delete slot.dataset.elementId;
        });
        ruleItemElement.classList.remove('active');
    } else if (!result) {
        // Feedback is handled within the specific attempt function
    }
}

function setupRuleInteractions() {
    ruleItems.forEach(item => {
        item.addEventListener('click', handleRuleItemClick);
        item.addEventListener('dragenter', handleRuleItemDragEnter);
        item.addEventListener('dragleave', handleRuleItemDragLeave);

        const slots = item.querySelectorAll('.drop-slot');
        slots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOverSlot);
            slot.addEventListener('dragleave', handleDragLeaveSlot);
            slot.addEventListener('drop', handleDropOnSlot);
        });

        const applyButton = item.querySelector('.apply-rule-btn');
        if (applyButton) {
            applyButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent the item's own click listener from firing
                attemptAutoRule(item);
            });
        }
    });
}