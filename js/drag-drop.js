import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { addProofLine, isNegationOf, startRAA, dischargeRAA, startConditionalIntroduction, dischargeCP, dischargeStrictSubproof } from './proof.js';
import { LogicParser } from './parser.js';
import { Validator } from './validator.js';
import { Rules } from './rules.js';

// --- Drag Data Utilities ---
export function setDragData(event, dataObject) {
    try {
        const jsonDataString = JSON.stringify(dataObject);
        event.dataTransfer.setData('application/json', jsonDataString);
        event.dataTransfer.effectAllowed = 'copyMove';
    } catch (err) { console.error("Error in setDragData:", err, dataObject); }
}

// --- Validation Logic ---
export function isPremiseValid(draggedData, activeRule) {
    const rule = Rules.getRuleSet()[activeRule] || Rules.getSubproofRuleSet()[activeRule];
    if (!rule) return { isValid: false, message: 'No active rule.' };

    const requiresProofLine = !rule.isSubproof && activeRule !== 'Add';
    if (requiresProofLine && draggedData.source !== 'proof-lines') {
        return { isValid: false, message: 'This rule requires premises from the proof.' };
    }

    return { isValid: true };
}

export function getDropValidationState(data, targetLi) {
    if (!data || !data.formula) {
        return { isValid: false, message: 'Invalid drag data' };
    }

    const { subGoalStack, activeModalSystem, currentScopeLevel } = store.getState();

    if (targetLi && targetLi.classList.contains('show-line')) {
        const targetScope = parseInt(targetLi.dataset.scopeLevel) + 1;
        const subproof = subGoalStack.find(sg => sg.scopeLevel === targetScope);

        if (subproof) {
            const draggedFormulaAst = LogicParser.textToAst(data.formula);
            if (LogicParser.areAstsEqual(draggedFormulaAst, subproof.goalFormula)) {
                if (data.scopeLevel === subproof.scopeLevel) {
                    if (subproof.type === 'Strict') {
                        return { isValid: true, justification: '□I', isDischarge: true, dischargeType: 'Strict', dischargeArgs: [subproof, data.lineId] };
                    } else if (subproof.type === 'CP') {
                        return { isValid: true, justification: '→I', isDischarge: true, dischargeType: 'CP', dischargeArgs: [subproof, data.lineId] };
                    }
                }
            }
        }
    }

    let targetScope;
    if (targetLi) {
        const liScope = parseInt(targetLi.dataset.scopeLevel);
        if (targetLi.classList.contains('show-line')) {
            targetScope = liScope + 1;
        } else {
            targetScope = liScope;
        }
    } else {
        targetScope = currentScopeLevel + 1;
    }

    const targetSubproof = subGoalStack.find(sg => sg.scopeLevel === targetScope);

    if (targetSubproof && targetSubproof.isStrict) {
        const ast = LogicParser.textToAst(data.formula);

        if (data.source === 'proof-lines' && data.scopeLevel === targetScope) {
            return { isValid: true, justification: `Re ${data.lineId}`, formula: data.formula, scope: targetScope };
        }

        let justification = '';
        let importedFormula = null;

        switch (activeModalSystem) {
            case 'K':
            case 'D':
            case 'T':
            case 'B':
                if (ast.type === 'unary' && ast.operator === '□') {
                    justification = `im, ${data.lineId}`;
                    importedFormula = ast.operand;
                }
                break;
            case 'S4':
                if (ast.type === 'unary' && ast.operator === '□') {
                    justification = `im4, ${data.lineId}`;
                    importedFormula = ast;
                }
                break;
            case 'S5':
                if (ast.type === 'unary' && (ast.operator === '□' || ast.operator === '◊')) {
                    justification = `im5, ${data.lineId}`;
                    importedFormula = ast;
                }
                break;
        }

        if (justification) {
            return { isValid: true, justification, formula: importedFormula, scope: targetScope, fromImport: true };
        } else {
            return { isValid: false, message: `Cannot import into strict subproof in ${activeModalSystem}` };
        }
    }

    if (data.source === 'proof-lines') {
        const { formula: draggedFormulaText, lineId: draggedLineId, scopeLevel: draggedScope } = data;
        if (targetLi) {
            const targetFormula = targetLi.querySelector('.formula').dataset.formula;
            if (isNegationOf(draggedFormulaText, targetFormula)) {
                const activeSubProof = subGoalStack.length > 0 ? subGoalStack[subGoalStack.length - 1] : null;
                if (activeSubProof && activeSubProof.type === "RAA" && draggedScope === targetScope) {
                    return { isValid: true, justification: `RAA ${draggedLineId}, ${targetLi.dataset.lineNumber}`, isDischarge: true, dischargeArgs: [activeSubProof, draggedLineId, targetLi.dataset.lineNumber] };
                }
            }
        }
        if (draggedScope <= currentScopeLevel) {
            return { isValid: true, justification: `Re ${draggedLineId}`, formula: draggedFormulaText, scope: currentScopeLevel };
        } else {
            return { isValid: false, message: 'Cannot reiterate from inner scope' };
        }
    }

    if ((data.source.includes('wff-constructor') || data.source.includes('wff-output-tray')) && !targetLi) {
        return { isValid: true, justification: 'RAA', isStartRaa: true, formula: data.formula };
    }

    return { isValid: false, message: 'Invalid drop target' };
}


// --- Drag and Drop Handlers ---

export function handleWffDragStart(event) {
    const formulaElement = event.target.closest('.formula');
    let data;

    if (formulaElement) {
        const parentId = formulaElement.parentElement.id;
        let source;
        if (parentId === 'wff-output-tray') {
            source = 'wff-output-tray';
        } else if (formulaElement.closest('#proof-lines')) {
            source = 'proof-lines';
        } else {
            source = 'unknown';
        }

        data = {
            formula: formulaElement.dataset.formula,
            source: source,
            elementId: formulaElement.id,
            lineId: formulaElement.closest('li')?.dataset.lineNumber
        };
    } else if (event.target.classList.contains('draggable-var')) {
        const variableElement = event.target;
        data = {
            formula: variableElement.dataset.symbol,
            source: 'wff-constructor',
            type: variableElement.dataset.type
        };
    } else {
        event.preventDefault();
        return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    setDragData(event, data);
    event.target.classList.add('dragging');
}

export function handleGenericDragEnd(event) {
    event.target.classList.remove('dragging');
    EventBus.emit('ui:hideProofDropSlot');
}

export function handleDropOnConnectiveHotspot(event) {
    event.preventDefault();
    const spot = event.target.closest('.connective-hotspot');
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        return;
    }
    const data = JSON.parse(jsonData);
    const connective = spot.dataset.connective;

    if (data && typeof data === 'object') {
        store.getState().constructWff(data, connective);
    } else {
        console.error("Invalid data for WFF construction");
        EventBus.emit('feedback:show', { 
            message: "Failed to construct formula. Invalid data.", 
            isError: true 
        });
    }
    spot.classList.remove('drag-over');
}

export function handleDropOnWffOutputTray(event) {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        return;
    }
    const data = JSON.parse(jsonData);
    
    if (data.source !== 'wff-output-tray') {
        EventBus.emit('wff:add', { formula: data.formula });
    }
    
    document.getElementById('wff-output-tray').classList.remove('drag-over-tray');
}

export function handleDropOnTrashCan(event) {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        return;
    }
    const data = JSON.parse(jsonData);
    if (data.elementId) {
        EventBus.emit('wff:remove', { elementId: data.elementId });
    }
    document.getElementById('trash-can-drop-area').classList.remove('trash-can-drag-over');
}

export function handleDropOnProofArea(e) {
    e.preventDefault();
    EventBus.emit('ui:hideProofDropSlot');

    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) return;
    const data = JSON.parse(jsonData);

    const targetLi = e.target.closest('li[data-line-number]');
    const validationState = getDropValidationState(data, targetLi);

    if (validationState.isValid) {
        if (validationState.isDischarge) {
            if (validationState.dischargeType === 'Strict') {
                dischargeStrictSubproof(...validationState.dischargeArgs);
            } else if (validationState.dischargeType === 'CP') {
                dischargeCP(...validationState.dischargeArgs);
            } else {
                dischargeRAA(...validationState.dischargeArgs);
            }
        } else if (validationState.isStartRaa) {
            startRAA(validationState.formula);
            if (data.source === 'wff-output-tray') { 
                EventBus.emit('wff:remove', { elementId: data.elementId });
            }
        } else {
            addProofLine(validationState.formula, validationState.justification, validationState.scope, false, false, validationState.fromImport || false);
        }
    } else {
        EventBus.emit('feedback:show', { message: validationState.message || 'Invalid move', isError: true });
    }
}

// --- Generic Drag Over/Leave Highlighting ---

export function createDragHandler(selector, className, ruleKey = null) {
    const dragOver = (event) => {
        event.preventDefault();
        const target = event.target.closest(selector);
        if (!target) return;

        target.classList.add(className);

        const jsonData = event.dataTransfer.getData('application/json');
        if (!jsonData) return;
        const data = JSON.parse(jsonData);

        if (ruleKey) {
            const validation = isPremiseValid(data, ruleKey);
            if (validation.isValid) {
                target.classList.add('valid-drop');
            } else {
                target.classList.add('invalid-drop');
            }
        } else {
            const pattern = target.dataset.expectedPattern;
            if (pattern) {
                try {
                    const ast = LogicParser.textToAst(data.formula);
                    if (Validator.validate(ast, pattern)) {
                        target.classList.add('valid-drop');
                    } else {
                        target.classList.add('invalid-drop');
                    }
                } catch (e) {
                    target.classList.add('invalid-drop');
                }
            }
        }
    };

    const dragLeave = (event) => {
        const target = event.target.closest(selector);
        if (target) {
            target.classList.remove(className, 'valid-drop', 'invalid-drop');
        }
    };

    return { dragover: dragOver, dragleave: dragLeave };
}

export function handleDragStartProofLine(e) {
    e.stopPropagation();
    const lineItem = e.target.closest('li[data-line-number]');
    if (!lineItem) return;

    const { lineNumber: lineId, scopeLevel: scopeStr, isProven: isProvenStr, isAssumption: isAssumptionStr } = lineItem.dataset;
    const scope = parseInt(scopeStr);
    if (!lineId || isNaN(scope)) {
        EventBus.emit('feedback:show', { message: "Drag Error: Missing lineId/scope.", isError: true });
        e.preventDefault();
        return;
    }
    if (isProvenStr !== 'true' && isAssumptionStr !== 'true') {
        EventBus.emit('feedback:show', { message: "Cannot use unproven 'Show' line as premise.", isError: true });
        e.preventDefault();
        return;
    }

    const formulaDiv = lineItem.querySelector('.formula');
    const formulaText = formulaDiv.dataset.formula;
    const dragData = {
        source: 'proof-lines', 
        formula: formulaText.trim(),
        lineId: lineId, 
        scopeLevel: scope,
        elementId: lineItem.id || (lineItem.id = `proofline-${lineId.replace('.', '-')}`)
    };
    setDragData(e, dragData);
    formulaDiv.classList.add('dragging');
}