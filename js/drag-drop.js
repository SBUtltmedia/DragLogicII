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
            EventBus.emit('feedback:show', { message: `${operatorName} require a variable first (x, y, or z).`, isError: true });
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
                EventBus.emit('feedback:show', { message: `Invalid formula dropped on ${operatorName.toLowerCase()}.`, isError: true });
                return; 
            }
            const resultAst = { type: operatorType, operator: connective, variable: firstOperandWFF, formula: ast };
            if(isQuantifier) resultAst.quantifier = connective;
            createDraggableWffInTray(LogicParser.astToText(resultAst));
            clearWffInProgress();
        } else { 
            EventBus.emit('feedback:show', { message: `${operatorName} mismatch.`, isError: true });
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
    if (!droppedAst) { EventBus.emit('feedback:show', { message: "Invalid formula dropped.", isError: true }); return; }

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
                if (!firstAst) { EventBus.emit('feedback:show', { message: "Invalid first formula.", isError: true }); clearWffInProgress(); return; }
                const newAst = { type: 'binary', operator: connective, left: firstAst, right: droppedAst };
                createDraggableWffInTray(LogicParser.astToText(newAst));
                clearWffInProgress();
            } else { EventBus.emit('feedback:show', { message: "WFF Error: Connective mismatch.", isError: true }); clearWffInProgress(); }
        }
    }
    if (droppedSourceType === 'wff-tray-formula' && droppedElementId) EventBus.emit('wff:remove', { elementId: droppedElementId });
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
                 EventBus.emit('feedback:show', { message: "Can only drop FOL variables onto predicates.", isError: true });
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
        EventBus.emit('wff:remove', { elementId: data.elementId });
        EventBus.emit('feedback:show', { message: `WFF "${formulaTextOfTrashedItem}" deleted from tray.`, isError: false });
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
        EventBus.emit('feedback:show', { message: "Cannot use unproven 'Show' line as premise.", isError: true }); 
        e.preventDefault(); 
        return;
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
        EventBus.emit('proof:startContradiction', { formula: formulaToProcess });
        if (data.sourceType === 'wff-tray-formula') {
            EventBus.emit('wff:remove', { elementId: elementIdToProcess });
        }
    } else if (data.sourceType === 'proof-line-formula') {
        const { formula: draggedFormulaText, lineId: draggedLineId, scopeLevel: draggedScope } = data;
        if (targetLi) {
            const targetFormula = targetLi.querySelector('.formula').dataset.formula;
            const targetLineId = targetLi.dataset.lineNumber;
            const targetScope = parseInt(targetLi.dataset.scopeLevel);

            EventBus.emit('proof:contradiction', { 
                draggedFormula: draggedFormulaText, 
                targetFormula: targetFormula, 
                draggedLineId: draggedLineId, 
                targetLineId: targetLineId, 
                draggedScope: draggedScope, 
                targetScope: targetScope 
            });
        } else {
            EventBus.emit('proof:reiterate', { formula: draggedFormulaText, lineId: draggedLineId, scope: draggedScope });
        }
    }
}

function handleDropOnRuleSlot(e, ruleItemElement) {
    e.preventDefault();
    const targetSlot = e.target.closest('.drop-slot');
    if (!targetSlot) return;
    targetSlot.classList.remove('drag-over');
    const data = getDragData(e);
    if (!data || !data.formula) { 
        EventBus.emit('feedback:show', { message: 'Drop Error!', isError: true });
        setTimeout(() => clearSlot(targetSlot), 1500);
        return; 
    }
    const { formula: droppedFormula, lineId: droppedLineId, scopeLevel: droppedScopeNum, elementId: droppedElementId } = data;
    const droppedScope = data.sourceType === 'proof-line-formula' ? droppedScopeNum : -1;

    EventBus.emit('rule:apply', { 
        ruleName: ruleItemElement.dataset.rule, 
        droppedFormula: droppedFormula, 
        droppedLineId: droppedLineId, 
        droppedScope: droppedScope, 
        elementId: droppedElementId, 
        sourceType: data.sourceType,
        targetSlot: targetSlot,
        ruleItemElement: ruleItemElement
    });
}
