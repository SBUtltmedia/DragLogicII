import { EventBus } from './event-bus.js';
import { store } from './store.js';

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

    store.getState().constructWff(data, connective);
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
    setDragData(e, {
        sourceType: 'proof-line-formula', formula: formulaText.trim(),
        lineId: lineId, scopeLevel: scope,
        elementId: lineItem.id || (lineItem.id = `proofline-${lineId.replace('.', '-')}`)
    });
    formulaDiv.classList.add('dragging');
}