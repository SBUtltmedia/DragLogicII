import { store } from './store.js';

export function handleDraggableClick(event) {
    const target = event.target.closest('.draggable-var, .formula');
    if (!target) return;

    let data;
    if (target.classList.contains('formula')) {
        data = {
            formula: target.dataset.formula,
            source: target.parentElement.id,
            elementId: target.id,
            line: target.closest('li')?.dataset.lineNumber
        };
    } else if (target.classList.contains('draggable-var')) {
        data = {
            formula: target.dataset.symbol,
            source: 'wff-constructor',
            type: target.dataset.type
        };
    }

    store.getState().setSelectedDraggable(data);
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    target.classList.add('selected');
}

export function handleDroppableClick(event, dropHandler) {
    const { selectedDraggable } = store.getState();
    if (!selectedDraggable) return;

    const mockEvent = {
        preventDefault: () => {},
        stopPropagation: () => {},
        target: event.target,
        dataTransfer: {
            getData: () => JSON.stringify(selectedDraggable)
        }
    };

    dropHandler(mockEvent);

    store.getState().clearSelectedDraggable();
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
}
