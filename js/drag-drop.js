import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { addProofLine, isNegationOf, startRAA } from './proof.js';

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
        data = {
            formula: formulaElement.dataset.formula,
            source: formulaElement.parentElement.id,
            elementId: formulaElement.id,
            line: formulaElement.closest('li')?.dataset.lineNumber
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

export function handleDropOnProofArea(event) {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) {
        return;
    }
    const data = JSON.parse(jsonData);
    const targetLi = event.target.closest('li[data-line-number]');

    if (!targetLi && (data.source === 'wff-constructor' || data.source === 'wff-output-tray')) {
        startRAA(data.formula);
        if (data.source === 'wff-output-tray') {
            EventBus.emit('wff:remove', { elementId: data.elementId });
        }
        return;
    }

    if (targetLi && targetLi.dataset.isShowLine === 'true' && data.source === 'proof-lines') {
        const subproofId = targetLi.dataset.subproofId;
        const { subGoalStack } = store.getState();
        const subproof = subGoalStack.find(sp => sp.subproofId === subproofId);
        if (subproof && subproof.type === 'EE') {
            EventBus.emit('proof:dischargeSubproof', { type: 'EE', subproof: subproof, conclusionLineId: data.line });
            return;
        }
    }

    if (data.source === 'proof-lines') {
        const { formula, line, scopeLevel } = data;
        if (scopeLevel <= store.getState().currentScopeLevel) {
            addProofLine(formula, `Re ${line}`, store.getState().currentScopeLevel);
        } else {
            EventBus.emit('feedback:show', { message: "Reiteration Error: Cannot reiterate from inner scope.", isError: true });
        }
    }
    
    document.getElementById('proof-lines').classList.remove('drag-over-proof');
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
        source: 'proof-lines', 
        formula: formulaText.trim(),
        line: lineId, 
        scopeLevel: scope,
        elementId: lineItem.id || (lineItem.id = `proofline-${lineId.replace('.', '-')}`)
    });
    formulaDiv.classList.add('dragging');
}