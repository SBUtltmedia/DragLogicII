import { EventBus } from './event-bus.js';
import { store } from './store.js';
import { handleRuleItemClick } from './rules.js';

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
    if (!formulaElement) {
        event.preventDefault();
        return;
    }
    event.dataTransfer.effectAllowed = 'copy';
    const data = {
        formula: formulaElement.dataset.formula,
        source: formulaElement.parentElement.id, // e.g., 'wff-output-tray' or 'proof-lines'
        elementId: formulaElement.id,
        line: formulaElement.closest('li')?.dataset.lineNumber
    };
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