import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { addProofLine, isNegationOf, startRAA, dischargeRAA, startConditionalIntroduction } from './proof.js';
import { LogicParser } from './parser.js';

// --- Drag Data Utilities ---
export function setDragData(event, dataObject) {
    try {
        const jsonDataString = JSON.stringify(dataObject);
        event.dataTransfer.setData('application/json', jsonDataString);
        event.dataTransfer.effectAllowed = 'copyMove';
    } catch (err) { console.error("Error in setDragData:", err, dataObject); }
}

// --- Drag and Drop Handlers ---

export function handleWffDragStart(event) {
    const formulaElement = event.target.closest('.formula');
    let data;

    if (formulaElement) {
        // It's a formula from the tray or proof lines
        data = {
            formula: formulaElement.dataset.formula,
            source: formulaElement.parentElement.id,
            elementId: formulaElement.id,
            line: formulaElement.closest('li')?.dataset.lineNumber
        };
    } else if (event.target.classList.contains('draggable-var')) {
        // It's a variable from the constructor tools
        const variableElement = event.target;
        data = {
            formula: variableElement.dataset.symbol,
            source: 'wff-constructor',
            type: variableElement.dataset.type
        };
    } else {
        // Not a draggable element we handle here
        event.preventDefault();
        return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    setDragData(event, data);
    event.target.classList.add('dragging');
}

export function handleGenericDragEnd(event) {
    event.target.classList.remove('dragging');
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

    // Validate that we have a proper connection
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
    
    // If the item came from the proof, it's a copy, so we add it.
    // If it came from another source (like another part of the tray), it might be a move.
    // For simplicity, we'll treat all drops here as requests to add/move to the tray.
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
    const targetProofList = e.target.closest('ol#proof-lines');
    if (targetProofList) {
        targetProofList.classList.remove('drag-over-proof');
    }
    
    const jsonData = e.dataTransfer.getData('application/json');
    if (!jsonData) { return; }
    const data = JSON.parse(jsonData);
    if (!data || !data.formula) { return; }

    const targetLi = e.target.closest('li[data-line-number]'); 
    const formulaToProcess = data.formula.trim();
    const elementIdToProcess = data.elementId;

    const { subGoalStack, currentScopeLevel } = store.getState();

    // If from constructor (tray or button) and dropped on the main proof area...
    if ((data.source.includes('wff-constructor') || data.source.includes('wff-output-tray')) && !targetLi) { 
        startRAA(formulaToProcess);
        if (data.source === 'wff-output-tray') { 
            EventBus.emit('wff:remove', { elementId: elementIdToProcess });
        }
    } else if (data.source === 'proof-lines') {
        const { formula: draggedFormulaText, line: draggedLineId, scopeLevel: draggedScope } = data;
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
                 EventBus.emit('feedback:show', { message: "Cannot form contradiction here or not in RAA.", isError: true });
            }
        } else { 
            if (draggedScope <= currentScopeLevel) {
                addProofLine(draggedFormulaText, `Re ${draggedLineId}`, currentScopeLevel);
            } else {
                EventBus.emit('feedback:show', { message: "Reiteration Error: Cannot reiterate from inner scope.", isError: true });
            }
        }
    }
}

// --- Generic Drag Over/Leave Highlighting ---

export function createDragHandler(selector, className) {
    const dragOver = (event) => {
        event.preventDefault();
        const target = event.target.closest(selector);
        if (target) {
            target.classList.add(className);
        }
    };

    const dragLeave = (event) => {
        const target = event.target.closest(selector);
        if (target) {
            target.classList.remove(className);
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
    console.log('Dragging from proof line:', dragData);
    setDragData(e, dragData);
    formulaDiv.classList.add('dragging');
}