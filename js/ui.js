import { store } from './store.js';
import { EventBus } from './event-bus.js';
import { problemSets } from './problems.js';
import { ruleSet, handleRuleItemClick, handleRuleItemDragEnter, handleRuleItemDragLeave } from './rules.js';
import { handleWffDragStart, handleGenericDragEnd, handleDropOnConnectiveHotspot, handleDropOnWffOutputTray, handleDropOnTrashCan, handleDropOnProofArea, handleDropOnRuleSlot, createDragHandler } from './drag-drop.js';
import { handleSubproofToggle, setupProofLineDragging } from './proof.js';
import { startTutorial, propositionalTutorialSteps, folTutorialSteps } from './tutorial.js';

// --- DOM Element References ---
let wffOutputTray, draggableVariables, connectiveHotspots, trashCanDropArea, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle, prevFeedbackBtn, nextFeedbackBtn, zoomInWffBtn, zoomOutWffBtn, helpIcon, subproofsArea, inferenceRulesArea;
let gameWrapper;

function cacheDomElements() {
    wffOutputTray = document.getElementById('wff-output-tray');
    draggableVariables = document.querySelectorAll('.draggable-var');
    connectiveHotspots = document.querySelectorAll('.connective-hotspot');
    trashCanDropArea = document.getElementById('trash-can-drop-area');
    proofList = document.getElementById('proof-lines');
    proofFeedbackDiv = document.getElementById('proof-feedback');
    subGoalDisplayContainer = document.getElementById('subproof-goal-display-container');
    gameTitle = document.getElementById('game-title');
    prevFeedbackBtn = document.getElementById('prev-feedback');
    nextFeedbackBtn = document.getElementById('next-feedback');
    zoomInWffBtn = document.getElementById('zoom-in-wff');
    zoomOutWffBtn = document.getElementById('zoom-out-wff');
    helpIcon = document.getElementById('help-icon');
    subproofsArea = document.getElementById('subproofs-area');
    inferenceRulesArea = document.getElementById('inference-rules-area');
    gameWrapper = document.getElementById('game-wrapper');
}

// --- Central Render Function ---
export function render() {
    const state = store.getState();

    if (wffOutputTray) {
        wffOutputTray.style.setProperty('--wff-font-size-rem', `${state.wffTrayFontSize}rem`);
    }

    renderRules();
    renderProofLines(state.proofLines);
    updateProblemDisplay(state.premises, state.goalFormula, state.currentProblem.set, state.currentProblem.number);
    updateSubGoalDisplay();
    displayCurrentFeedback();
    renderWffTray(state.wffTray);
    updateConnectiveHotspots(state.wffConstruction);
    checkWinState(state);
}

function checkWinState(state) {
    const { proofLines, goalFormula } = state;
    if (!goalFormula) return;
    const goalAst = goalFormula.ast;
    if (!goalAst) return;

    const hasWon = proofLines.some(line => 
        line.scopeLevel === 0 && 
        line.isProven && 
        LogicParser.areAstsEqual(line.formula.ast, goalAst)
    );

    if (hasWon) {
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
    }
}

function updateConnectiveHotspots(wffConstruction) {
    if (!connectiveHotspots) return;
    connectiveHotspots.forEach(spot => {
        if (spot.classList.contains('waiting')) {
            spot.classList.remove('waiting');
            spot.textContent = spot.dataset.originalText || spot.dataset.connective;
        }
    });

    if (wffConstruction.firstOperand) {
        const { connective } = wffConstruction;
        const hotspot = document.querySelector(`.connective-hotspot[data-connective="${connective}"]`);
        if (hotspot) {
            hotspot.classList.add('waiting');
            hotspot.textContent = `${wffConstruction.firstOperand.formula} ${connective} ?`;
        }
    }
}

// --- UI Update Functions ---

function renderRules() {
    subproofsArea.innerHTML = '<h2>Subproofs</h2>';
    inferenceRulesArea.innerHTML = '<h2>Inference Rules</h2>';

    for (const ruleKey in ruleSet) {
        const rule = ruleSet[ruleKey];
        const ruleElement = createRuleElement(ruleKey, rule);
        if (rule.isSubproof) {
            subproofsArea.appendChild(ruleElement);
        } else {
            inferenceRulesArea.appendChild(ruleElement);
        }
    }
    // Re-add event listeners to the newly created rule elements
    addRuleEventListeners();
}

function createRuleElement(ruleKey, rule) {
    const ruleElement = document.createElement('div');
    ruleElement.className = 'rule-item';
    ruleElement.dataset.rule = ruleKey;
    ruleElement.dataset.premises = rule.premises;
    if (rule.logicType) {
        ruleElement.dataset.logicType = rule.logicType;
    }
    ruleElement.setAttribute('role', 'button');
    ruleElement.setAttribute('tabindex', '0');
    ruleElement.textContent = rule.name;

    const slotsContainer = document.createElement('div');
    slotsContainer.className = 'rule-slots';
    rule.slots.forEach((slot, index) => {
        const slotElement = document.createElement('div');
        slotElement.className = 'drop-slot';
        slotElement.dataset.premiseIndex = index;
        slotElement.dataset.placeholder = slot.placeholder;
        if (slot.expectedPattern) {
            slotElement.dataset.expectedPattern = slot.expectedPattern;
        }
        slotElement.setAttribute('role', 'region');
        slotElement.setAttribute('aria-dropeffect', 'copy');
        slotElement.textContent = slot.placeholder;
        slotsContainer.appendChild(slotElement);
    });

    ruleElement.appendChild(slotsContainer);
    return ruleElement;
}

function renderProofLines(proofLines) {
    proofList.innerHTML = ''; // Clear existing lines
    proofLines.forEach(lineData => {
        const listItem = createProofLineElement(lineData);
        proofList.appendChild(listItem);
    });
}

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
    formulaDiv.appendChild(renderFormulaWithDraggableVars(lineData.formula));

    listItem.innerHTML = `<span class="line-number">${lineData.lineNumber}</span>`;
    listItem.appendChild(formulaDiv);
    listItem.innerHTML += `<span class="justification">${lineData.justification}</span>`;

    return listItem;
}


export function updateProblemDisplay(premises, goalFormula, set, number) {
    const problemSetInfo = problemSets[set];
    gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${number}`;

    const problemInfoDiv = document.getElementById('proof-problem-info');
    let problemHtml = '';
    premises.forEach((p, i) => {
        problemHtml += `<div class="proof-header">Premise ${i + 1}: <span>${p.formula}</span></div>`;
    });
    problemHtml += `<div class="proof-goal">Prove: <span>${goalFormula.formula}</span></div>`;
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

function renderWffTray(wffTray) {
    console.log('[renderWffTray] Rendering WFF tray with formulas:', wffTray);
    wffOutputTray.innerHTML = '';
    wffTray?.forEach(wffData => {
        const item = document.createElement('div');
        item.className = 'formula';
        item.innerHTML = '';
        item.appendChild(renderFormulaWithDraggableVars(wffData.formula));

        item.dataset.formula = wffData.formula;
        item.id = wffData.elementId;
        item.draggable = true;

        wffOutputTray.appendChild(item);
    });
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

    addRuleEventListeners();

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
    });
    EventBus.on('feedback:prev', () => {
        store.getState().previousFeedback();
    });
    EventBus.on('feedback:next', () => {
        store.getState().nextFeedback();
    });
    EventBus.on('wff:zoom', (direction) => {
        const currentSize = store.getState().wffTrayFontSize;
        const newSize = Math.max(0.5, Math.min(2.5, currentSize + direction * 0.1));
        store.getState().setWffTrayFontSize(newSize);
    });
    
    EventBus.on('wff:add', (wffData) => {
        store.getState().addWff(wffData);
    });
    EventBus.on('wff:remove', (wffData) => {
        store.getState().removeWff(wffData.elementId);
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
        store.getState().setWffConstruction({ firstOperand: null, connective: null });
    });
    EventBus.on('rules:fillSlot', ({ slot, data }) => {
        slot.textContent = data.line ? `${data.line}: ${data.formula}` : data.formula;
        slot.classList.remove('text-slate-400', 'italic');
        Object.assign(slot.dataset, data);
    });

    EventBus.on('rules:clearSlot', (slot) => {
        slot.textContent = slot.dataset.placeholder || "Drop here...";
        slot.classList.add('text-slate-400', 'italic');
        delete slot.dataset.formula;
        delete slot.dataset.line;
        delete slot.dataset.source;
        delete slot.dataset.elementId;
    });
    EventBus.on('rules:activate', (ruleElement) => {
        document.querySelectorAll('.rule-item').forEach(item => item.classList.remove('active'));
        ruleElement.classList.add('active');
    });
    EventBus.on('rules:deactivate', () => {
        document.querySelectorAll('.rule-item').forEach(item => item.classList.remove('active'));
    });
}

function addRuleEventListeners() {
    document.querySelectorAll('.rule-item').forEach(item => {
        item.addEventListener('click', handleRuleItemClick);
        item.addEventListener('dragenter', handleRuleItemDragEnter);
        item.addEventListener('dragleave', handleRuleItemDragLeave);
        item.querySelectorAll('.drop-slot').forEach(slot => {
            const slotHandler = createDragHandler('.drop-slot', 'drag-over');
            slot.addEventListener('dragover', slotHandler.dragover);
            slot.addEventListener('dragleave', slotHandler.dragleave);
            slot.addEventListener('drop', (e) => handleDropOnRuleSlot(e, item));
        });
    });
}


// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    addEventListeners();
    EventBus.emit('app:init');
});
