import { LogicParser } from './parser.js';
import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { addProofLine } from './proof.js';

EventBus.on('rule:apply', handleRuleApply);

export function handleRuleItemDragEnter(event) {
    const item = event.currentTarget;
    item.dataset.hoverTimer = setTimeout(() => {
        item.classList.add('active');
    }, 500);
}

export function handleRuleItemDragLeave(event) {
    const item = event.currentTarget;
    clearTimeout(item.dataset.hoverTimer);
}

export function handleRuleItemClick(event) {
    if (event.target && event.target.closest('.drop-slot')) {
        return;
    }

    const clickedItem = event.currentTarget;
    const isAlreadyActive = clickedItem.classList.contains('active');

    // Deactivate all other rule items
    document.querySelectorAll('.rule-item').forEach(item => {
        if (item !== clickedItem) {
            item.classList.remove('active');
        }
    });

    // Toggle the clicked one
    if (isAlreadyActive) {
        clickedItem.classList.remove('active');
    } else {
        clickedItem.classList.add('active');
    }

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
            justificationText: `MP ${premise1.line || 'WFF'}, ${premise2.line || 'WFF'} `,
            consumedWffIds: consumedWffIds
        };
    }
    EventBus.emit('feedback:show', { message: "MP Error: The second premise must match the antecedent of the first.", isError: true });
    return null;
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
            justificationText: `MT ${premise1.line || 'WFF'}, ${premise2.line || 'WFF'} `,
            consumedWffIds: consumedWffIds
        };
    }
    EventBus.emit('feedback:show', { message: "MT Error: The second premise must be the negation of the first's consequent.", isError: true });
    return null;
}

function attemptAutoAndIntroduction(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;
    const [premiseA, premiseB] = slotsData;

    const astA = LogicParser.textToAst(premiseA.formula);
    const astB = LogicParser.textToAst(premiseB.formula);
    if (!astA || !astB) { EventBus.emit('feedback:show', { message: "One of the formulas for ∧I is invalid.", isError: true }); return null; }

    const resultAst = { type: 'binary', operator: '∧', left: astA, right: astB };

    const consumedWffIds = [];
    if (premiseA.source === 'wff-tray-formula' && premiseA.elementId) consumedWffIds.push(premiseA.elementId);
    if (premiseB.source === 'wff-tray-formula' && premiseB.elementId) consumedWffIds.push(premiseB.elementId);
    return {
        resultFormula: LogicParser.astToText(resultAst),
        justificationText: `∧I ${premiseA.line || 'WFF'}, ${premiseB.line || 'WFF'} `,
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
        EventBus.emit('feedback:show', { message: "∧E Error: Premise must be a conjunction (φ ∧ ψ).", isError: true });
        return null;
    }

    const leftPart = LogicParser.astToText(ast.left);
    const rightPart = LogicParser.astToText(ast.right);

    const choice = prompt(`From "${conjunctionPremise.formula}", extract:\n1. "${leftPart}" (Left)\n2. "${rightPart}" (Right)`, "1");

    let resultFormula = null;
    if (choice === "1") resultFormula = leftPart;
    else if (choice === "2") resultFormula = rightPart;
    else { EventBus.emit('feedback:show', { message: "∧E: No valid choice made.", isError: true }); return null; }

    const consumedWffIds = [];
    if (conjunctionPremise.source === 'wff-tray-formula' && conjunctionPremise.elementId) consumedWffIds.push(conjunctionPremise.elementId);
    return { resultFormula: resultFormula, justificationText: `∧E ${conjunctionPremise.line || 'WFF'}`, consumedWffIds: consumedWffIds };
}

function attemptAutoAddition(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;
    const [premise1, premise2] = slotsData;

    const ast1 = LogicParser.textToAst(premise1.formula);
    const ast2 = LogicParser.textToAst(premise2.formula);

    if (!ast1 || !ast2) {
        EventBus.emit('feedback:show', { message: "Addition Error: Invalid formula.", isError: true });
        return null;
    }

    const resultAst = { type: 'binary', operator: '∨', left: ast1, right: ast2 };

    const consumedWffIds = [];
    if (premise1.source === 'wff-tray-formula' && premise1.elementId) consumedWffIds.push(premise1.elementId);
    if (premise2.source === 'wff-tray-formula' && premise2.elementId) consumedWffIds.push(premise2.elementId);

    return {
        resultFormula: LogicParser.astToText(resultAst),
        justificationText: `Add ${premise1.line || 'WFF'}`,
        consumedWffIds: consumedWffIds
    };
}

function attemptAutoExistentialIntroduction(ruleItemElement) {
    const { proofList } = store.getState();
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;

    const [formulaPremise, termPremise] = slotsData;
    const formulaAst = LogicParser.textToAst(formulaPremise.formula);
    const termAst = LogicParser.textToAst(termPremise.formula);

    if (!formulaAst || !termAst) {
        EventBus.emit('feedback:show', { message: "∃I Error: Invalid formula or term.", isError: true });
        return null;
    }

    const variableToIntroduce = prompt(`Introduce which variable (e.g., x, y, z) for "${LogicParser.astToText(termAst)}"?`);
    if (!/^[xyz]$/.test(variableToIntroduce)) {
        EventBus.emit('feedback:show', { message: "∃I Error: You must introduce a valid variable (x, y, or z).", isError: true });
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
        justificationText: `∃I ${formulaPremise.line || 'WFF'} `,
        consumedWffIds
    };
}


function attemptAutoDoubleNegation(ruleItemElement) {
    const slotsData = validateRuleSlots(ruleItemElement, 1);
    if (!slotsData || !slotsData[0].formula) return null;
    const premise = slotsData[0];

    const ast = LogicParser.textToAst(premise.formula);
    if (!ast) { EventBus.emit('feedback:show', { message: "Invalid formula for DN.", isError: true }); return null; }

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
    const { proofList } = store.getState();
    const slotsData = validateRuleSlots(ruleItemElement, 2);
    if (!slotsData) return null;

    const [quantifiedFormulaPremise, termPremise] = slotsData;
    const quantifiedAst = LogicParser.textToAst(quantifiedFormulaPremise.formula);
    const termAst = LogicParser.textToAst(termPremise.formula);

    if (!quantifiedAst || quantifiedAst.type !== 'quantifier' || quantifiedAst.quantifier !== '∀') {
        EventBus.emit('feedback:show', { message: "UI Error: First premise must be a universally quantified formula (∀x...).", isError: true });
        return null;
    }

    if (!termAst || (termAst.type !== 'variable' && termAst.type !== 'description')) {
        EventBus.emit('feedback:show', { message: "UI Error: Second premise must be a term (a variable or ι-expression).", isError: true });
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
            justificationText: `UI ${quantifiedFormulaPremise.line || 'WFF'} `,
            consumedWffIds
        };
    } catch (e) {
        EventBus.emit('feedback:show', { message: `UI Error: ${e.message}`, isError: true });
        return null;
    }
}

export function attemptAutoRule(ruleItemElement) {
    const ruleType = ruleItemElement.dataset.rule;
    let result = null;

    switch (ruleType) {
        case 'MP': result = attemptAutoModusPonens(ruleItemElement); break;
        case 'MT': result = attemptAutoModusTollens(ruleItemElement); break;
        case '∧I': result = attemptAutoAndIntroduction(ruleItemElement); break;
        case '∧E': result = attemptAutoAndElimination(ruleItemElement); break;
        case 'Add': result = attemptAutoAddition(ruleItemElement); break;
        case 'DN': result = attemptAutoDoubleNegation(ruleItemElement); break;
        case 'UI': result = attemptAutoUniversalInstantiation(ruleItemElement); break;
        case '∃I': result = attemptAutoExistentialIntroduction(ruleItemElement); break;
        default: EventBus.emit('feedback:show', { message: `Rule "${ruleType}" is not implemented yet.`, isError: true }); return;
    }

    if (result && result.resultFormula) {
        const { currentScopeLevel } = store.getState();
        addProofLine(result.resultFormula, result.justificationText, currentScopeLevel);
        if (result.consumedWffIds && result.consumedWffIds.length > 0) {
            result.consumedWffIds.forEach(id => {
                EventBus.emit('wff:remove', { elementId: id });
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

function handleRuleApply(data) {
    const { ruleName, droppedFormula, droppedLineId, droppedScope, elementId, sourceType, targetSlot, ruleItemElement } = data;
    const { currentScopeLevel } = store.getState();

    if (sourceType === 'proof-line-formula' && droppedScope > currentScopeLevel) {
        EventBus.emit('feedback:show', { message: "Rule Error: Cannot use line from inner, closed subproof.", isError: true });
        clearSlot(targetSlot);
        return;
    }

    // **NEW: Drop Slot Validation**
    const expectedPattern = targetSlot.dataset.expectedPattern;
    if (expectedPattern) {
        const droppedAst = LogicParser.textToAst(droppedFormula);
        if (!droppedAst) {
            EventBus.emit('feedback:show', { message: `Invalid formula dropped: "${droppedFormula}"`, isError: true });
            clearSlot(targetSlot);
            return;
        }

        let isValid = false;
        switch(expectedPattern) {
            case 'φ → ψ':
                if (droppedAst.type === 'binary' && droppedAst.operator === '→') isValid = true;
                else EventBus.emit('feedback:show', { message: "Invalid drop. Expected a conditional (e.g., A → B).", isError: true });
                break;
            case '~ψ':
                if (droppedAst.type === 'negation') isValid = true;
                else EventBus.emit('feedback:show', { message: "Invalid drop. Expected a negation (e.g., ~A).", isError: true });
                break;
            case 'φ ∧ ψ':
                if (droppedAst.type === 'binary' && droppedAst.operator === '∧') isValid = true;
                else EventBus.emit('feedback:show', { message: "Invalid drop. Expected a conjunction (e.g., A ∧ B).", isError: true });
                break;
            default:
                isValid = true; // No specific pattern to check
        }
        if (!isValid) {
            clearSlot(targetSlot);
            return;
        }
    }


    targetSlot.dataset.source = sourceType;
    targetSlot.dataset.formula = droppedFormula;
    if (droppedLineId) targetSlot.dataset.line = droppedLineId;
    else delete targetSlot.dataset.line;
    if (elementId) targetSlot.dataset.elementId = elementId;
    targetSlot.textContent = droppedLineId ? `${droppedLineId}: ${droppedFormula}` : droppedFormula;
    targetSlot.classList.remove('text-slate-400', 'italic');

    let ruleApplicationResult = null;
    let autoAppliedManually = false;

    if (ruleName === 'CI') {
        const ast = LogicParser.textToAst(droppedFormula);
        if (ast && ast.type === 'binary' && ast.operator === '→') {
            const conditionalFormula = LogicParser.astToText(ast);
            const antecedentFormula = LogicParser.astToText(ast.left);
            const consequentFormula = LogicParser.astToText(ast.right);

            const { currentScopeLevel } = store.getState();
            const showLineItem = addProofLine(`Show: ${conditionalFormula}`, "Goal (→I)", currentScopeLevel, false, true);
            if (!showLineItem) {
                return;
            }

            const subproofId = showLineItem.dataset.subproofId;
            const showLineFullId = showLineItem.dataset.lineNumber;
            const newScopeLevel = currentScopeLevel + 1;
            store.getState().setCurrentScopeLevel(newScopeLevel);

            const newSubGoal = {
                goal: consequentFormula,
                forWff: conditionalFormula,
                type: "→I",
                assumptionFormula: antecedentFormula,
                showLineFullId: showLineFullId,
                parentLineDisplay: showLineFullId,
                subLineLetterCode: 97,
                scope: newScopeLevel,
                assumptionLineFullId: "",
                subproofId: subproofId
            };

            const { subGoalStack } = store.getState();
            store.getState().updateSubGoalStack([...subGoalStack, newSubGoal]);

            const assumptionLineItem = addProofLine(antecedentFormula, "Assumption (→I)", newScopeLevel, true);
            if (assumptionLineItem) {
                const updatedStack = store.getState().subGoalStack;
                updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineItem.dataset.lineNumber;
                store.getState().updateSubGoalStack(updatedStack);
            }

            if (sourceType === 'wff-tray-formula') { EventBus.emit('wff:remove', { elementId: elementId }); }
            autoAppliedManually = true;
        } else {
            EventBus.emit('feedback:show', { message: "→I Error: Dropped formula must be a conditional (φ → ψ).", isError: true });
            clearSlot(targetSlot);
        }
    } else if (ruleName === "MP") ruleApplicationResult = attemptAutoModusPonens(ruleItemElement);
    else if (ruleName === "MT") ruleApplicationResult = attemptAutoModusTollens(ruleItemElement);
    else if (ruleName === "AndI") ruleApplicationResult = attemptAutoAndIntroduction(ruleItemElement);
    else if (ruleName === "AndE") ruleApplicationResult = attemptAutoAndElimination(ruleItemElement);
    else if (ruleName === "Add") ruleApplicationResult = attemptAutoAddition(ruleItemElement);
    else if (ruleName === "EI") ruleApplicationResult = attemptAutoExistentialIntroduction(ruleItemElement);
    else if (ruleName === "DN") ruleApplicationResult = attemptAutoDoubleNegation(ruleItemElement);
    else if (ruleName === "Reiteration" && droppedLineId) {
        if (addProofLine(droppedFormula, `Re ${droppedLineId}`, currentScopeLevel)) {
            autoAppliedManually = true;
        }
    }

    if (ruleApplicationResult) {
        const { currentScopeLevel } = store.getState();
        const newProofLine = addProofLine(ruleApplicationResult.resultFormula, ruleApplicationResult.justificationText, currentScopeLevel);
        if (newProofLine) {
            ruleApplicationResult.consumedWffIds.forEach(id => EventBus.emit('wff:remove', { elementId: id }));
            autoAppliedManually = true;
        }
    }

    if (autoAppliedManually) {
        clearRuleSlots(ruleItemElement);
        ruleItemElement.classList.remove('active');
    }

    if (ruleName === 'RAA') {
        const ast = LogicParser.textToAst(droppedFormula);
        if (ast) {
            const negatedAst = { type: 'negation', operand: ast };
            const assumptionFormula = LogicParser.astToText(negatedAst);

            const { currentScopeLevel } = store.getState();
            const showLineItem = addProofLine(`Show: ${droppedFormula}`, "Goal (RAA)", currentScopeLevel, false, true);
            if (!showLineItem) {
                return;
            }

            const subproofId = showLineItem.dataset.subproofId;
            const showLineFullId = showLineItem.dataset.lineNumber;
            const newScopeLevel = currentScopeLevel + 1;
            store.getState().setCurrentScopeLevel(newScopeLevel);

            const newSubGoal = {
                goal: '⊥', // Contradiction
                forWff: droppedFormula,
                type: "RAA",
                assumptionFormula: assumptionFormula,
                showLineFullId: showLineFullId,
                parentLineDisplay: showLineFullId,
                subLineLetterCode: 97,
                scope: newScopeLevel,
                assumptionLineFullId: "",
                subproofId: subproofId
            };

            const { subGoalStack } = store.getState();
            store.getState().updateSubGoalStack([...subGoalStack, newSubGoal]);

            const assumptionLineItem = addProofLine(assumptionFormula, "Assumption (RAA)", newScopeLevel, true);
            if (assumptionLineItem) {
                const updatedStack = store.getState().subGoalStack;
                updatedStack[updatedStack.length - 1].assumptionLineFullId = assumptionLineItem.dataset.lineNumber;
                store.getState().updateSubGoalStack(updatedStack);
            }

            if (sourceType === 'wff-tray-formula') { EventBus.emit('wff:remove', { elementId: elementId }); }
            autoAppliedManually = true;
        } else {
            EventBus.emit('feedback:show', { message: "RAA Error: Invalid formula.", isError: true });
            clearSlot(targetSlot);
        }
    }
}

export function setupRuleInteractions() {
    const { ruleItems } = store.getState();
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