import { store } from './store.js';
import { EventBus } from './event-bus.js';
import { problemSets } from './problems.js';
import { Rules } from './rules.js';
import { handleWffDragStart, handleGenericDragEnd, handleDropOnConnectiveHotspot, handleDropOnWffOutputTray, handleDropOnTrashCan, createDragHandler } from './drag-drop.js';
import { initializeProof } from './proof.js';
import { startTutorial, propositionalTutorialSteps, folTutorialSteps } from './tutorial.js';
import { LogicParser } from './parser.js';
import { handleDraggableClick, handleDroppableClick } from './click-to-move.js';

// --- DOM Element References ---
let wffOutputTray, draggableVariables, connectiveHotspots, trashCanDropArea, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle, prevFeedbackBtn, nextFeedbackBtn, zoomInWffBtn, zoomOutWffBtn, helpIcon, subproofsArea, inferenceRulesArea;
let gameWrapper;

export function cacheDomElements() {
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

    gameWrapper = document.getElementById('main-container');
}

// --- Initialize UI Components ---
export function initializeUI() {
    // Set up the problem selector
    const problemSelector = document.getElementById('problem-selector');
    
    if (problemSelector) {
        problemSelector.innerHTML = '';
        Object.entries(problemSets).forEach(([setNumber, set]) => {
            const optGroup = document.createElement('optgroup');
            optGroup.label = set.name;
            
            set.problems.forEach((problem, index) => {
                const option = document.createElement('option');
                option.value = `${setNumber}-${index + 1}`;
                option.textContent = `#${index + 1}`;
                optGroup.appendChild(option);
            });
            
            problemSelector.appendChild(optGroup);
        });
    }

    // Initialize the proof area
    initializeProof();
    
    // Setup event listeners for proof lines (using the drop area)
    if (proofList) {
        const proofArea = document.getElementById('proof-area');
        
        proofArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            proofArea.classList.add('drag-over-proof-area');
        });
        
        proofArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            proofArea.classList.remove('drag-over-proof-area');
        });
    }
    
    // Setup the WFF output tray
    if (wffOutputTray) {
        const dragHandler = createDragHandler('#wff-output-tray', 'drag-over-tray');
        
        wffOutputTray.addEventListener('dragover', dragHandler.dragover);
        wffOutputTray.addEventListener('dragleave', dragHandler.dragleave);
        wffOutputTray.addEventListener('drop', handleDropOnWffOutputTray);
    }

    // Setup connectives
    if (connectiveHotspots) {
        connectiveHotspots.forEach(hotspot => {
            const dragHandler = createDragHandler(`[data-connective="${hotspot.dataset.connective}"]`, 'drag-over-connective');
            
            hotspot.addEventListener('dragover', dragHandler.dragover);
            hotspot.addEventListener('dragleave', dragHandler.dragleave);
            hotspot.addEventListener('drop', handleDropOnConnectiveHotspot);
        });
    }

    // Setup trash can
    if (trashCanDropArea) {
        const dragHandler = createDragHandler('#trash-can-drop-area', 'trash-can-drag-over');
        
        trashCanDropArea.addEventListener('dragover', dragHandler.dragover);
        trashCanDropArea.addEventListener('dragleave', dragHandler.dragleave);
        trashCanDropArea.addEventListener('drop', handleDropOnTrashCan);
    }
    
    // Setup zoom controls
    if (zoomInWffBtn) {
        zoomInWffBtn.addEventListener('click', () => {
            store.getState().incrementWffTrayFontSize();
        });
    }
    
    if (zoomOutWffBtn) {
        zoomOutWffBtn.addEventListener('click', () => {
            store.getState().decrementWffTrayFontSize();
        });
    }

    // Setup help icon
    if (helpIcon) {
        helpIcon.addEventListener('click', () => {
            startTutorial(propositionalTutorialSteps);
        });
    }
    
    // Setup feedback navigation buttons
    if (prevFeedbackBtn) {
        prevFeedbackBtn.addEventListener('click', () => {
            store.getState().showPreviousFeedback();
        });
    }
    
    if (nextFeedbackBtn) {
        nextFeedbackBtn.addEventListener('click', () => {
            store.getState().showNextFeedback();
        });
    }

    // Set up drag events
    document.addEventListener('dragstart', handleWffDragStart);
    document.addEventListener('dragend', handleGenericDragEnd);
    
    // Set up other UI events
    const resetButton = document.getElementById('reset-button');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            EventBus.emit('proof:reset');
        });
    }
    
    const nextProblemButton = document.getElementById('next-problem-button');
    if (nextProblemButton) {
        nextProblemButton.addEventListener('click', () => {
            EventBus.emit('problem:next');
        });
    }

    const tutorialButton = document.getElementById('tutorial-button');
    if (tutorialButton) {
        tutorialButton.addEventListener('click', () => {
            startTutorial(propositionalTutorialSteps);
        });
    }

    const solutionButton = document.getElementById('solution-button');
    if (solutionButton) {
        solutionButton.addEventListener('click', () => {
            EventBus.emit('solution:show');
        });
    }

    // Problem selector
    if (problemSelector) {
        problemSelector.addEventListener('change', (e) => {
            const [setNumber, problemNumber] = e.target.value.split('-').map(Number);  
            if (!isNaN(setNumber) && !isNaN(problemNumber)) {
                EventBus.emit('problem:load', { set: setNumber, number: problemNumber });
            }
        });
    }

    // Setup subproof buttons
    document.addEventListener('click', (e) => {
        // Handle subproof creation buttons
        if (e.target.closest('.subproof-start-btn')) {
            const type = e.target.closest('.subproof-start-btn').dataset.type;
            
            if (type === 'RAA') {
                const formula = prompt("Enter the formula to prove by contradiction:");
                if (formula) {
                    EventBus.emit('proof:startRAA', formula);
                }
            } else if (type === 'CP') {
                const conditional = prompt("Enter the conditional to prove:");
                if (conditional) {
                    EventBus.emit('proof:startConditionalIntroduction', conditional);
                }
            }
        }
    });
}

// --- Event Listener Setup ---
export function addEventListeners() {
    cacheDomElements();
    initializeUI();
    
    // Setup event listeners that depend on the store
    EventBus.on('render', () => {
        renderProofLines();
    });

    EventBus.on('feedback:show', (data) => {
        showFeedback(data.message, data.isError); 
    });

    EventBus.on('problem:loaded', () => {
        console.log('problem:loaded event received in ui.js');
        updateProblemDisplay();
    });
    
    EventBus.on('subgoal:update', () => {
        updateSubGoalDisplay();
    });
}

// --- UI Render Functions ---
export function renderProofLines() {
    const { proofLines } = store.getState();
    
    if (!proofList) return;
    
    proofList.innerHTML = '';

    // Sort the lines by scope level to ensure proper nesting
    const orderedLines = [...proofLines].sort((a, b) => a.scopeLevel - b.scopeLevel);
    
    orderedLines.forEach(line => {
        const li = document.createElement('li');
        li.className = `proof-line`;
        li.dataset.lineNumber = line.lineNumber;
        li.dataset.scopeLevel = line.scopeLevel;
        
        // Handle different types of lines
        if (line.isAssumption) {
            li.classList.add('assumption');
        }
        
        // Add the line content
        const lineNumberSpan = document.createElement('span');
        lineNumberSpan.className = 'line-number';
        lineNumberSpan.textContent = line.lineNumber;
        
        const formulaSpan = document.createElement('span');
        formulaSpan.className = 'formula';
        formulaSpan.textContent = LogicParser.astToText(line.formula);
        
        const justificationSpan = document.createElement('span');
        justificationSpan.className = 'justification';
        justificationSpan.textContent = line.justification || '';
        
        li.appendChild(lineNumberSpan);
        li.appendChild(formulaSpan);
        li.appendChild(justificationSpan);
        
        proofList.appendChild(li);
    });
}

export function showFeedback(message, isError = false) {
    if (!proofFeedbackDiv) return;
    
    const feedbackElement = document.createElement('div');
    feedbackElement.className = `alert ${isError ? 'alert-danger' : 'alert-success'}`;
    feedbackElement.textContent = message;
    
    proofFeedbackDiv.appendChild(feedbackElement);
    
    // Auto-remove after delay
    setTimeout(() => {
        if (feedbackElement.parentNode) {
            feedbackElement.parentNode.removeChild(feedbackElement);
        }
    }, 5000);
}

// --- Display Updates ---
function updateProblemDisplay() {
    console.log('updateProblemDisplay called in ui.js');
    const { premises, goalFormula, currentProblem } = store.getState();
    const problemSetInfo = problemSets[currentProblem.set];
    gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${currentProblem.number}`;

    const problemInfoDiv = document.getElementById('proof-problem-info');
    if (problemInfoDiv) {
        let problemHtml = '';
        premises.forEach((p, i) => {
            if (p && p.formula) {
                problemHtml += `<div class="proof-header">Premise ${i + 1}: <span>${LogicParser.astToText(p.formula)}</span></div>`;
            }
        });
        if (goalFormula && goalFormula.ast) {
            problemHtml += `<div class="proof-goal">Prove: <span>${LogicParser.astToText(goalFormula.ast)}</span></div>`;
        }
        problemInfoDiv.innerHTML = problemHtml;
    }
}

function updateSubGoalDisplay() {
    const { subGoalStack, currentScopeLevel } = store.getState();
    
    if (!subGoalDisplayContainer) return;
    
    // Clear the container
    subGoalDisplayContainer.innerHTML = '';
    
    if (subGoalStack.length > 0) {
        const subgoalElement = document.createElement('div');
        subgoalElement.className = 'subgoal-display';
        
        const currentSubGoal = subGoalStack[subGoalStack.length - 1];
        subgoalElement.innerHTML = `<strong>Current Subproof:</strong> ${currentSubGoal.type}`;
        if (currentSubGoal.assumptionFormula) {
            subgoalElement.innerHTML += ` (Assuming: ${LogicParser.astToText(currentSubGoal.assumptionFormula)})`;
        }
        
        subGoalDisplayContainer.appendChild(subgoalElement);
    } else {
        const noSubgoalElement = document.createElement('div');
        noSubgoalElement.className = 'no-subgoal';
        noSubgoalElement.textContent = 'No active subproof';
        subGoalDisplayContainer.appendChild(noSubgoalElement);
    }
}

// --- Initialize on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    addEventListeners();
});
