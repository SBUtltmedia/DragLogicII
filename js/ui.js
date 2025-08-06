import { store } from './store.js';
import { EventBus } from './event-bus.js';
import { problemSets } from './problems.js';
import { handleWffDragStart, handleGenericDragEnd, handleDropOnConnectiveHotspot, handleDropOnWffOutputTray, handleDropOnTrashCan, handleDropOnProofArea, handleDropOnRuleSlot, createDragHandler } from './drag-drop.js';
import { handleRuleItemClick, handleRuleItemDragEnter, handleRuleItemDragLeave } from './rules.js';
import { handleSubproofToggle, setupProofLineDragging } from './proof.js';
import { startTutorial, propositionalTutorialSteps, folTutorialSteps } from './tutorial.js';

// --- DOM Element References ---
// These are cached once and are not part of the state
let wffOutputTray, draggableVariables, connectiveHotspots, trashCanDropArea, ruleItems, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle, prevFeedbackBtn, nextFeedbackBtn, zoomInWffBtn, zoomOutWffBtn, helpIcon;

function cacheDomElements() {
    wffOutputTray = document.getElementById('wff-output-tray');
    draggableVariables = document.querySelectorAll('.draggable-var');
    connectiveHotspots = document.querySelectorAll('.connective-hotspot');
    trashCanDropArea = document.getElementById('trash-can-drop-area');
    ruleItems = document.querySelectorAll('.rule-item');
    proofList = document.getElementById('proof-lines');
    proofFeedbackDiv = document.getElementById('proof-feedback');
    subGoalDisplayContainer = document.getElementById('subproof-goal-display-container');
    gameTitle = document.getElementById('game-title');
    prevFeedbackBtn = document.getElementById('prev-feedback');
    nextFeedbackBtn = document.getElementById('next-feedback');
    zoomInWffBtn = document.getElementById('zoom-in-wff');
    zoomOutWffBtn = document.getElementById('zoom-out-wff');
    helpIcon = document.getElementById('help-icon');
}

// --- Central Render Function ---
export function render() {
    const state = store.getState();

    // Render Proof Lines
    proofList.innerHTML = ''; // Clear existing lines
    state.proofLines.forEach(lineData => {
        const listItem = createProofLineElement(lineData);
        proofList.appendChild(listItem);
    });

    // Render Problem Info
    updateProblemDisplay(state.premises, state.goalFormula, state.currentProblem.set, state.currentProblem.number);

    // Render Sub-goal Display
    updateSubGoalDisplay();

    // Render Feedback
    displayCurrentFeedback();

    // Render WFF Tray
    // (Assuming this is handled by other functions for now)
}

// --- UI Update Functions (Called by Render or directly by events) ---

function createProofLineElement(lineData) {
    const listItem = document.createElement('li');
    Object.assign(listItem.dataset, {
        lineNumber: lineData.lineNumber,
        scopeLevel: lineData.scopeLevel,
        isAssumption: lineData.isAssumption,
        isShowLine: lineData.isShowLine,
        isProven: lineData.isProven
    });

    if (lineData.isShowLine) {
        listItem.classList.add('show-line');
        listItem.dataset.subproofId = lineData.subproofId;
    }

    if (lineData.scopeLevel > 0) {
        listItem.classList.add('subproof-line');
        listItem.style.marginLeft = `${lineData.scopeLevel * 1.5}rem`;
        if (lineData.parentSubproofId) {
            listItem.dataset.parentSubproofId = lineData.parentSubproofId;
            if (lineData.isAssumption) {
                 listItem.classList.add('subproof-assumption');
            }
        }
    }

    const formulaDiv = document.createElement('span');
    formulaDiv.className = 'formula';
    formulaDiv.dataset.formula = lineData.formula;
    formulaDiv.draggable = true;
    // formulaDiv.appendChild(renderFormulaWithDraggableVars(lineData.formula));
    formulaDiv.textContent = lineData.formula;

    listItem.innerHTML = `<span class="line-number">${lineData.lineNumber}</span>`;
    listItem.appendChild(formulaDiv);
    listItem.innerHTML += `<span class="justification">${lineData.justification}</span>`;

    return listItem;
}


function updateProblemDisplay(premises, goalFormula, set, number) {
    const problemSetInfo = problemSets[set];
    gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${number}`;

    const problemInfoDiv = document.getElementById('proof-problem-info');
    let problemHtml = '';
    premises.forEach((p, i) => {
        problemHtml += `<div class="proof-header">Premise ${i + 1}: <span>${p.formula}</span></div>`;
    });
    problemHtml += `<div class="proof-goal">Prove: <span>${goalFormula}</span></div>`;
    problemInfoDiv.innerHTML = problemHtml;
}

function updateSubGoalDisplay() {
    const { subGoalStack } = store.getState();
    subGoalDisplayContainer.innerHTML = '';
    if (subGoalStack.length > 0) {
        const {scope, type, assumptionFormula, goal, forWff} = subGoalStack[subGoalStack.length - 1];
        let goalText = goal;
        if (type === "RAA") {
            goalText = "a contradiction (ψ and ~ψ)";
        }
        subGoalDisplayContainer.innerHTML = `<div class="subproof-goal-display">Current Sub-Goal (Scope ${scope}, Type: ${type}): <br>Assume: <span>${assumptionFormula}</span><br>Derive: <span>${goalText}</span> (to prove <span>${forWff}</span>)</div>`;
    }
}

function displayCurrentFeedback() {
    const { feedbackHistory, currentFeedbackIndex } = store.getState();
    if (!proofFeedbackDiv || feedbackHistory.length === 0) {
        if (proofFeedbackDiv) {
            proofFeedbackDiv.textContent = "";
            proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2';
        }
        updateFeedbackNavButtons();
        return;
    }

    const { message, type } = feedbackHistory[currentFeedbackIndex];

    proofFeedbackDiv.textContent = message;
    proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2'; // Reset classes

    if (type === 'error') proofFeedbackDiv.classList.add('text-red-400');
    else if (type === 'warning') proofFeedbackDiv.classList.add('text-yellow-400');
    else proofFeedbackDiv.classList.add('text-green-400');

    updateFeedbackNavButtons();
}

function updateFeedbackNavButtons() {
    const { currentFeedbackIndex, feedbackHistory } = store.getState();
    if (!prevFeedbackBtn || !nextFeedbackBtn) return;
    prevFeedbackBtn.disabled = currentFeedbackIndex <= 0;
    nextFeedbackBtn.disabled = currentFeedbackIndex >= feedbackHistory.length - 1;
}

function renderFormulaWithDraggableVars(formulaString) {
    const fragment = document.createDocumentFragment();
    const parts = formulaString.split(/([(),~∧∨→↔∀∃])|([xyz])/).filter(p => p);

    parts.forEach(part => {
        if (/^[xyz]$/.test(part)) {
            const span = document.createElement('span');
            span.className = 'draggable-var fol-variable';
            span.draggable = true;
            span.dataset.type = 'fol-variable';
            span.dataset.symbol = part;
            span.textContent = part;
            fragment.appendChild(span);
        } else {
            fragment.appendChild(document.createTextNode(part));
        }
    });
    return fragment;
}

function createDraggableWffInTray(wffData) {
    if (!wffData.formula || wffData.formula.trim() === "") return;
    const item = document.createElement('div');
    item.className = 'formula';
    item.innerHTML = '';
    item.appendChild(renderFormulaWithDraggableVars(wffData.formula));

    item.dataset.formula = wffData.formula;
    item.id = wffData.elementId;
    item.draggable = true;

    wffOutputTray.appendChild(item);
}

// --- Event Listeners ---
export function addEventListeners() {
    cacheDomElements();

    helpIcon.addEventListener('click', () => {
        const { currentProblem } = store.getState();
        const currentProblemSet = currentProblem.set;
        if (currentProblemSet === 1) {
            startTutorial(propositionalTutorialSteps);
        } else if (currentProblemSet === 2) {
            startTutorial(folTutorialSteps);
        }
    });

    draggableVariables.forEach(v => {
        v.addEventListener('dragstart', handleWffDragStart);
        v.addEventListener('dragend', handleGenericDragEnd);
    });

    connectiveHotspots.forEach(spot => {
        const handler = createDragHandler('.connective-hotspot', 'drag-over');
        spot.addEventListener('dragover', handler.dragover);
        spot.addEventListener('dragleave', handler.dragleave);
        spot.addEventListener('drop', handleDropOnConnectiveHotspot);
        spot.dataset.originalText = spot.textContent;
    });

    const wffOutputTrayHandler = createDragHandler('#wff-output-tray', 'drag-over-tray');
    wffOutputTray.addEventListener('dragstart', handleWffDragStart);
    wffOutputTray.addEventListener('dragend', handleGenericDragEnd);
    wffOutputTray.addEventListener('dragover', wffOutputTrayHandler.dragover);
    wffOutputTray.addEventListener('dragleave', wffOutputTrayHandler.dragleave);
    wffOutputTray.addEventListener('drop', handleDropOnWffOutputTray);

    if (trashCanDropArea) {
        const trashCanHandler = createDragHandler('#trash-can-drop-area', 'trash-can-drag-over');
        trashCanDropArea.addEventListener('dragover', trashCanHandler.dragover);
        trashCanDropArea.addEventListener('dragleave', trashCanHandler.dragleave);
        trashCanDropArea.addEventListener('drop', handleDropOnTrashCan);
    }

    const proofListHandler = createDragHandler('ol#proof-lines', 'drag-over-proof');
    proofList.addEventListener('dragover', proofListHandler.dragover);
    proofList.addEventListener('dragleave', proofListHandler.dragleave);
    proofList.addEventListener('drop', handleDropOnProofArea);
    proofList.addEventListener('click', handleSubproofToggle);

    ruleItems.forEach(item => {
        item.addEventListener('click', handleRuleItemClick);
        item.addEventListener('dragenter', handleRuleItemDragEnter);
        item.addEventListener('dragleave', handleRuleItemDragLeave);
        item.querySelectorAll('.drop-slot').forEach(slot => {
            const slotHandler = createDragHandler('.drop-slot', 'drag-over');
            slot.addEventListener('dragover', slotHandler.dragover);
            slot.addEventListener('dragleave', slotHandler.dragleave);
            slot.addEventListener('drop', (e) => handleDropOnRuleSlot(e, item));
            slot.dataset.placeholder = slot.textContent;
        });
    });

    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            header.classList.toggle('closed');
            content.classList.toggle('hidden');
        });
    });

    prevFeedbackBtn.addEventListener('click', () => EventBus.emit('feedback:prev'));
    nextFeedbackBtn.addEventListener('click', () => EventBus.emit('feedback:next'));
    zoomInWffBtn.addEventListener('click', () => EventBus.emit('wff:zoom', 1));
    zoomOutWffBtn.addEventListener('click', () => EventBus.emit('wff:zoom', -1));

    setupProofLineDragging(proofList);

    // --- Event Bus Subscriptions ---
    EventBus.on('render', render);
    EventBus.on('feedback:show', (feedback) => {
        store.getState().addFeedback(feedback.message, feedback.isError ? 'error' : 'success');
        displayCurrentFeedback();
    });
    EventBus.on('feedback:prev', () => {
        store.getState().previousFeedback();
        displayCurrentFeedback();
    });
    EventBus.on('feedback:next', () => {
        store.getState().nextFeedback();
        displayCurrentFeedback();
    });
    EventBus.on('wff:zoom', (direction) => {
        const currentSize = parseFloat(getComputedStyle(wffOutputTray).getPropertyValue('--wff-font-size-rem'));
        const newSize = Math.max(0.5, Math.min(2.5, currentSize + direction * 0.1));
        wffOutputTray.style.setProperty('--wff-font-size-rem', `${newSize}rem`);
    });
    
    EventBus.on('wff:remove', (wffData) => {
        const el = wffOutputTray.querySelector(`[data-element-id="${wffData.elementId}"]`);
        if (el) el.remove();
    });
    EventBus.on('proof:update', render);
    EventBus.on('subgoal:update', updateSubGoalDisplay);
    EventBus.on('problem:loaded', render);
    EventBus.on('feedback:clear', () => {
        store.dispatch({ type: 'CLEAR_FEEDBACK' });
        displayCurrentFeedback();
    });
    EventBus.on('game:win', () => {
        const { currentProblem } = store.getState();
        const message = `Congratulations! You solved ${problemSets[currentProblem.set].name} #${currentProblem.number}.`;
        if (proofFeedbackDiv) {
            proofFeedbackDiv.textContent = message;
            proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2 text-green-400';
        }
        const nextProblemButton = document.createElement('button');
        nextProblemButton.textContent = 'Next Problem →';
        nextProblemButton.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-2';
        nextProblemButton.onclick = () => {
            EventBus.emit('problem:next');
            nextProblemButton.remove();
        };
        if (proofFeedbackDiv && proofFeedbackDiv.parentElement) {
            proofFeedbackDiv.parentElement.appendChild(nextProblemButton);
        }
    });
    EventBus.on('ui:resetHotspots', () => {
        if (!connectiveHotspots) return;
        connectiveHotspots.forEach(spot => {
            if (spot.classList.contains('waiting')) {
                spot.classList.remove('waiting');
                spot.textContent = spot.dataset.originalText || spot.dataset.connective;
            }
        });
    });
}



EventBus.on('game:win', () => {
    const { currentProblem } = store.getState();
    const message = `Congratulations! You solved ${problemSets[currentProblem.set].name} #${currentProblem.number}.`;

    // Directly update the feedback div to ensure the win message is seen
    if (proofFeedbackDiv) {
        proofFeedbackDiv.textContent = message;
        proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2 text-green-400';
    }

    // Create and show a "Next Problem" button
    const nextProblemButton = document.createElement('button');
    nextProblemButton.textContent = 'Next Problem →';
    nextProblemButton.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded m-2';
    nextProblemButton.onclick = () => {
        EventBus.emit('problem:next');
        nextProblemButton.remove(); // Remove button after click
    };

    // Append it to the feedback container
    if (proofFeedbackDiv && proofFeedbackDiv.parentElement) {
        proofFeedbackDiv.parentElement.appendChild(nextProblemButton);
    }
});

EventBus.on('ui:resetHotspots', () => {
    if (!connectiveHotspots) return;
    connectiveHotspots.forEach(spot => {
        if (spot.classList.contains('waiting')) {
            spot.classList.remove('waiting');
            spot.textContent = spot.dataset.originalText || spot.dataset.connective;
        }
    });
});

EventBus.on('wff:add', (wffData) => {
    createDraggableWffInTray(wffData);
});

EventBus.on('wff:remove', (wffData) => {
    const el = wffOutputTray.querySelector(`[data-element-id="${wffData.elementId}"]`);
    if (el) el.remove();
});