const DRAG_DATA_TYPE = 'application/x-nd-drag-data';

function setDragData(event, dataObject) {
    try {
        const jsonDataString = JSON.stringify(dataObject);
        event.dataTransfer.setData(DRAG_DATA_TYPE, jsonDataString);
        event.dataTransfer.effectAllowed = 'copyMove';
    } catch (err) { console.error("Error in setDragData:", err, dataObject); }
}

function getDragData(event) {
    const jsonDataString = event.dataTransfer.getData(DRAG_DATA_TYPE);
    if (jsonDataString) {
        try { return JSON.parse(jsonDataString); }
        catch (err) { console.error("Error parsing drag data:", err, "Raw:", jsonDataString); return null; }
    }
    return null;
}

function createDragOverHandler(targetSelector, dragOverClass, allowedDataType = DRAG_DATA_TYPE) {
    return function(e) {
        if (e.dataTransfer.types.includes(allowedDataType)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            const targetElement = e.target.closest(targetSelector) || (this.matches && this.matches(targetSelector) ? this : null);
            if (targetElement) targetElement.classList.add(dragOverClass);
        } else {
            e.dataTransfer.dropEffect = 'none';
        }
    };
}

function createDragLeaveHandler(targetSelector, dragOverClass) {
    return function(e) {
        const targetElement = e.target.closest(targetSelector) || (this.matches && this.matches(targetSelector) ? this : null);
        if (targetElement) targetElement.classList.remove(dragOverClass);
    };
}

function handleWffDragStart(e) {
    e.stopPropagation(); // Stop bubbling immediately!

    const target = e.target.closest('.draggable-var, .formula');
    if (!target) return;

    let symbol = target.dataset.symbol;
    let type = target.dataset.type;
    let formula = target.dataset.formula || target.textContent.trim();
    let sourceType = type;

    if (target.classList.contains('formula')) {
         sourceType = 'wff-tray-formula';
    }

    let elementId = target.id;
    if (!elementId) {
        target.id = `wff-temp-${Date.now()}`;
        elementId = target.id;
    }

    if (!formula) {
        console.error("WFF Drag Start: No formula/symbol data on target.");
        e.preventDefault();
        return;
    }

    setDragData(e, { sourceType: sourceType, formula: formula, elementId: elementId, symbol: symbol });
    target.classList.add('dragging');
}

function handleGenericDragEnd(e) {
    // Remove the dragging class from ALL elements to be safe.
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    // Also remove drag-over from any potential drop targets
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleQuantifierDrop(connective, droppedFormula, droppedSourceType, targetHotspot) {
    const isQuantifier = connective === '∀' || connective === '∃';
    const operatorType = isQuantifier ? 'quantifier' : 'description';
    const operatorName = isQuantifier ? 'Quantifiers' : 'Iota';

    if (!firstOperandWFF) { // Waiting for a variable
        if (droppedSourceType !== 'fol-variable') {
            showFeedback(`${operatorName} require a variable first (x, y, or z).`, true);
            return;
        }
        firstOperandWFF = droppedFormula;
        waitingConnectiveWFF = connective;
        targetHotspot.classList.add('waiting');
        targetHotspot.textContent = `${connective}${droppedFormula}(?)`;
    } else { // Already have variable, waiting for formula
        if (waitingConnectiveWFF === connective) {
            const ast = LogicParser.textToAst(droppedFormula);
            if (!ast) { 
                showFeedback(`Invalid formula dropped on ${operatorName.toLowerCase()}.`, true); 
                return; 
            }
            const resultAst = { type: operatorType, operator: connective, variable: firstOperandWFF, formula: ast };
            if(isQuantifier) resultAst.quantifier = connective;
            createDraggableWffInTray(LogicParser.astToText(resultAst));
            clearWffInProgress();
        } else { 
            showFeedback(`${operatorName} mismatch.`, true); 
            clearWffInProgress(); 
        }
    }
}

function handleDropOnConnectiveHotspot(e) {
    e.preventDefault();
    const targetHotspot = e.target.closest('.connective-hotspot');
    if (!targetHotspot) return;
    targetHotspot.classList.remove('drag-over');
    const data = getDragData(e);
    if (!data || !data.formula) { console.error("Drop on Connective: No valid drag data found."); return; }

    const { formula: droppedFormula, elementId: droppedElementId, sourceType: droppedSourceType } = data;
    const connective = targetHotspot.dataset.connective;

    if (['∀', '∃', 'ι'].includes(connective)) {
        handleQuantifierDrop(connective, droppedFormula, droppedSourceType, targetHotspot);
        return;
    }

    // --- Handle Propositional Connectives ---
    const droppedAst = LogicParser.textToAst(droppedFormula);
    if (!droppedAst) { showFeedback("Invalid formula dropped.", true); return; }

    if (connective === '~') {
        const newAst = { type: 'negation', operand: droppedAst };
        createDraggableWffInTray(LogicParser.astToText(newAst));
        clearWffInProgress();
    } else {
        if (!firstOperandWFF) {
            firstOperandWFF = droppedFormula;
            waitingConnectiveWFF = connective;
            targetHotspot.classList.add('waiting');
            targetHotspot.textContent = `${LogicParser.astToText(droppedAst)} ${connective} ?`;
        } else {
            if (waitingConnectiveWFF === connective) {
                const firstAst = LogicParser.textToAst(firstOperandWFF);
                if (!firstAst) { showFeedback("Invalid first formula.", true); clearWffInProgress(); return; }
                const newAst = { type: 'binary', operator: connective, left: firstAst, right: droppedAst };
                createDraggableWffInTray(LogicParser.astToText(newAst));
                clearWffInProgress();
            } else { showFeedback("WFF Error: Connective mismatch.", true); clearWffInProgress(); }
        }
    }
    if (droppedSourceType === 'wff-tray-formula' && droppedElementId) removeWffFromTrayById(droppedElementId);
}

function handleDropOnWffOutputTray(e) {
    e.preventDefault();
    const targetElement = e.target.closest('#wff-output-tray') || wffOutputTray;
    targetElement.classList.remove('drag-over-tray');
    const data = getDragData(e);
    if (!data || !data.formula) { return; }

    // Handle dropping on an existing formula (for predicate application)
    const targetFormulaDiv = e.target.closest('.formula');
    if (targetFormulaDiv && targetFormulaDiv.parentElement === wffOutputTray) {
         targetFormulaDiv.classList.remove('drag-over');
         if (data.sourceType === 'fol-variable') {
            const targetAst = LogicParser.textToAst(targetFormulaDiv.dataset.formula);
            if (targetAst && targetAst.type === 'predicate') {
                // **FIX**: Create new formula but leave original F
                const newArgs = [...targetAst.args, { type: 'variable', value: data.symbol }];
                const newAst = { ...targetAst, args: newArgs };
                createDraggableWffInTray(LogicParser.astToText(newAst));
            } else {
                 showFeedback("Can only drop FOL variables onto predicates.", true);
            }
            return; // Stop processing here
         }
    }


    // Handle dropping a new item into the tray
    if (['prop-variable', 'predicate', 'fol-variable'].includes(data.sourceType)) {
         createDraggableWffInTray(data.formula);
    } else if (data.sourceType === 'wff-tray-formula') {
        // This case handles reordering items in the tray.
        // The dragged item is removed on 'drop' on a valid target, so nothing to do here.
    }
}

function handleDropOnTrashCan(e) {
    e.preventDefault();
    const targetTrashCan = e.target.closest('#trash-can-drop-area');
    if(targetTrashCan) targetTrashCan.classList.remove('trash-can-drag-over');

    const data = getDragData(e);
    if (data && data.sourceType === 'wff-tray-formula' && data.elementId && data.formula) {
        const formulaTextOfTrashedItem = data.formula;
        removeWffFromTrayById(data.elementId);
        showFeedback(`WFF "${formulaTextOfTrashedItem}" deleted from tray.`, false);
    }
    draggedElementForRemoval = null;
}

function handleDragStartProofLine(e) {
    e.stopPropagation();
    if (!e.target || typeof e.target.textContent === 'undefined') { e.preventDefault(); return; }
    const lineItem = e.target.closest('li[data-line-number]');
    if (!lineItem) { return; }

    const { lineNumber: lineId, scopeLevel: scopeStr, isProven: isProvenStr } = lineItem.dataset;
    const scope = parseInt(scopeStr);
    if (!lineId || isNaN(scope)) { console.error("Missing lineId/scope."); e.preventDefault(); return; }
    if (isProvenStr !== 'true' && !isAssumption(lineItem)) {
        showFeedback("Cannot use unproven 'Show' line as premise.", true); e.preventDefault(); return;
    }

    const formulaDiv = lineItem.querySelector('.formula');
    const formulaText = formulaDiv.dataset.formula;
    setDragData(e, {
        sourceType: 'proof-line-formula', formula: formulaText.trim(),
        lineId: lineId, scopeLevel: scope,
        elementId: lineItem.id || (lineItem.id = `proofline-${lineId.replace('.', '-')}`)
    });
    formulaDiv.classList.add('dragging');
}

function handleDropOnProofArea(e) {
    e.preventDefault();
    const targetProofList = e.target.closest('ol#proof-lines') || proofList;
    targetProofList.classList.remove('drag-over-proof');

    const data = getDragData(e);
    if (!data || !data.formula) { return; }

    const targetLi = e.target.closest('li[data-line-number]');
    const formulaToProcess = data.formula.trim();
    const elementIdToProcess = data.elementId;

    // If from constructor (tray or button) and dropped on the main proof area...
    if ((data.sourceType.includes('variable') || data.sourceType.includes('predicate')) && !targetLi) {
        startProofByContradiction(formulaToProcess);
        if (data.sourceType === 'wff-tray-formula') {
            removeWffFromTrayById(elementIdToProcess);
        }
    } else if (data.sourceType === 'proof-line-formula') {
        const { formula: draggedFormulaText, lineId: draggedLineId, scopeLevel: draggedScope } = data;
        if (targetLi) {
            const targetFormula = targetLi.querySelector('.formula').dataset.formula;
            const targetLineId = targetLi.dataset.lineNumber;
            const targetScope = parseInt(targetLi.dataset.scopeLevel);

            const activeSubProof = subGoalStack.length > 0 ? subGoalStack[subGoalStack.length - 1] : null;
            if (activeSubProof && activeSubProof.type === "RAA" &&
                draggedScope === activeSubProof.scope && targetScope === activeSubProof.scope) {
                if (isNegationOf(draggedFormulaText, targetFormula)) {
                    dischargeRAA(activeSubProof, draggedLineId, targetLineId);
                    return;
                }
            } else {
                 showFeedback("Cannot form contradiction here or not in RAA.", true);
            }
        } else {
            if (draggedScope <= currentScopeLevel) addProofLine(draggedFormulaText, `Re ${draggedLineId}`, currentScopeLevel);
            else showFeedback("Reiteration Error: Cannot reiterate from inner scope.", true);
        }
    }
}

function handleDropOnRuleSlot(e, ruleItemElement) {
    e.preventDefault();
    const targetSlot = e.target.closest('.drop-slot');
    if (!targetSlot) return;
    targetSlot.classList.remove('drag-over');
    const data = getDragData(e);
    if (!data || !data.formula) { targetSlot.textContent = "Drop Error!"; setTimeout(() => clearSlot(targetSlot), 1500); return; }
    const { formula: droppedFormula, lineId: droppedLineId, scopeLevel: droppedScopeNum, elementId: droppedElementId } = data;
    const droppedScope = data.sourceType === 'proof-line-formula' ? droppedScopeNum : -1;

    if (data.sourceType === 'proof-line-formula' && droppedScope > currentScopeLevel) {
        showFeedback("Rule Error: Cannot use line from inner, closed subproof.", true); clearSlot(targetSlot); return;
    }

    // **NEW: Drop Slot Validation**
    const expectedPattern = targetSlot.dataset.expectedPattern;
    if (expectedPattern) {
        const droppedAst = LogicParser.textToAst(droppedFormula);
        if (!droppedAst) {
            showFeedback(`Invalid formula dropped: "${droppedFormula}"`, true);
            clearSlot(targetSlot);
            return;
        }

        let isValid = false;
        switch(expectedPattern) {
            case 'φ → ψ':
                if (droppedAst.type === 'binary' && droppedAst.operator === '→') isValid = true;
                else showFeedback("Invalid drop. Expected a conditional (e.g., A → B).", true);
                break;
            case '~ψ':
                if (droppedAst.type === 'negation') isValid = true;
                else showFeedback("Invalid drop. Expected a negation (e.g., ~A).", true);
                break;
            case 'φ ∧ ψ':
                if (droppedAst.type === 'binary' && droppedAst.operator === '∧') isValid = true;
                else showFeedback("Invalid drop. Expected a conjunction (e.g., A ∧ B).", true);
                break;
            default:
                isValid = true; // No specific pattern to check
        }
        if (!isValid) {
            clearSlot(targetSlot);
            return;
        }
    }


    targetSlot.dataset.source = data.sourceType; targetSlot.dataset.formula = droppedFormula;
    if (droppedLineId) targetSlot.dataset.line = droppedLineId; else delete targetSlot.dataset.line;
    if (droppedElementId) targetSlot.dataset.elementId = droppedElementId;
    targetSlot.textContent = droppedLineId ? `${droppedLineId}: ${droppedFormula}` : droppedFormula;
    targetSlot.classList.remove('text-slate-400', 'italic');

    const ruleName = ruleItemElement.dataset.rule;
    let ruleApplicationResult = null;
    let autoAppliedManually = false;

    if (ruleName === 'CI') {
        const ast = LogicParser.textToAst(droppedFormula);
        if (ast && ast.type === 'binary' && ast.operator === '→') {
            startConditionalIntroduction(ast);
            if (data.sourceType === 'wff-tray-formula') { removeWffFromTrayById(droppedElementId); }
            autoAppliedManually = true;
        } else {
            showFeedback("→I Error: Dropped formula must be a conditional (φ → ψ).", true);
            clearSlot(targetSlot);
        }
    } else if (ruleName === "MP") ruleApplicationResult = attemptAutoModusPonens(ruleItemElement);
    else if (ruleName === "MT") ruleApplicationResult = attemptAutoModusTollens(ruleItemElement);
    else if (ruleName === "AndI") ruleApplicationResult = attemptAutoAndIntroduction(ruleItemElement);
    else if (ruleName === "AndE") ruleApplicationResult = attemptAutoAndElimination(ruleItemElement);
    else if (ruleName === "EI") ruleApplicationResult = attemptAutoExistentialIntroduction(ruleItemElement);
    else if (ruleName === "DN") ruleApplicationResult = attemptAutoDoubleNegation(ruleItemElement);
    else if (ruleName === "Reiteration" && droppedLineId) {
        if (addProofLine(droppedFormula, `Re ${droppedLineId}`, currentScopeLevel)) {
            autoAppliedManually = true;
        }
    }

    if (ruleApplicationResult) {
        const newProofLine = addProofLine(ruleApplicationResult.resultFormula, ruleApplicationResult.justificationText, currentScopeLevel);
        if (newProofLine) {
            ruleApplicationResult.consumedWffIds.forEach(id => removeWffFromTrayById(id));
            autoAppliedManually = true;
        }
    }

    if (autoAppliedManually) {
        clearRuleSlots(ruleItemElement);
        ruleItemElement.classList.remove('active');
    }
}
