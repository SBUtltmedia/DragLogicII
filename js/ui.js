import { store } from './store.js';
import { EventBus } from './event-bus.js';
import { problemSets } from './problems.js';
import { Rules } from './rules.js';
import { handleWffDragStart, handleGenericDragEnd, handleDropOnConnectiveHotspot, handleDropOnWffOutputTray, handleDropOnTrashCan, createDragHandler, handleDragStartProofLine } from './drag-drop.js';
import { initializeProof, applyActiveRule, dischargeRAA, dischargeCP, startConditionalIntroduction, startRAA } from './proof.js';
import { startTutorial, propositionalTutorialSteps } from './tutorial.js';
import { LogicParser } from './parser.js';
import { handleDraggableClick, handleDroppableClick } from './click-to-move.js';

// --- DOM Element References ---
let wffOutputTray, draggableVariables, connectiveHotspots, trashCanDropArea, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle, prevFeedbackBtn, nextFeedbackBtn, helpIcon, subproofsArea, inferenceRulesArea, winModalOverlay, modalNextProblemBtn, modalCloseBtn;
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
    helpIcon = document.getElementById('help-icon');
    subproofsArea = document.getElementById('subproofs-area');
    inferenceRulesArea = document.getElementById('inference-rules-area');
    winModalOverlay = document.getElementById('win-modal-overlay');
    modalNextProblemBtn = document.getElementById('modal-next-problem-btn');
    modalCloseBtn = document.getElementById('modal-close-btn');

    gameWrapper = document.getElementById('main-container');
}

// --- Modal Control ---
function showWinModal() {
    if (winModalOverlay) {
        winModalOverlay.classList.remove('hidden');
    }
}

function hideWinModal() {
    if (winModalOverlay) {
        winModalOverlay.classList.add('hidden');
    }
}

// --- Central Render Function ---
function render() {
    const state = store.getState();
    renderProofLines(state.proofLines);
    renderWffTray(state.wffTray);
    updateConnectiveHotspots(state.wffConstruction);
    updateProblemDisplay();
    updateSubGoalDisplay();
    renderRules();
    renderSubproofs();
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

        proofList.addEventListener('click', handleSubproofToggle);
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

    // Setup Modal Buttons
    if (modalNextProblemBtn) {
        modalNextProblemBtn.addEventListener('click', () => {
            const { currentProblem } = store.getState();
            const currentSet = problemSets[currentProblem.set];
            const nextProblemNumber = currentProblem.number + 1;
    
            if (nextProblemNumber <= currentSet.problems.length) {
                store.getState().loadProblem(currentProblem.set, nextProblemNumber);
            } else {
                EventBus.emit('feedback:show', { message: 'Last problem in the set!', isError: false });
            }
            hideWinModal();
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', hideWinModal);
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
}

// --- Event Listener Setup ---
export function addEventListeners() {
    cacheDomElements();
    initializeUI();
    
    EventBus.on('render', render);

    EventBus.on('ui:showWinModal', showWinModal);

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
function renderProofLines() {
    const { proofLines, subGoalStack } = store.getState();
    
    if (!proofList) return;
    
    proofList.innerHTML = '';

    // Sort the lines by scope level to ensure proper nesting
    const orderedLines = [...proofLines].sort((a, b) => a.scopeLevel - b.scopeLevel);
    
    orderedLines.forEach(line => {
        const li = document.createElement('li');
        li.className = `proof-line`;
        li.dataset.lineNumber = line.lineNumber;
        li.dataset.scopeLevel = line.scopeLevel;
        li.dataset.isProven = line.isProven;
        li.dataset.isAssumption = line.isAssumption;
        
        if (line.isAssumption) {
            li.classList.add('assumption');
        }

        if (line.isWinningLine) {
            li.classList.add('proof-line-complete');
        }

        if (line.isShowLine) {
            li.classList.add('show-line', 'subproof-header-collapsible');
            li.dataset.isCollapsible = 'true';
            li.dataset.collapsed = 'true';
        }

        if (line.scopeLevel > 0) {
            li.style.marginLeft = `${line.scopeLevel * 1.5}rem`;
        }
        
        // Add the line content
        const lineNumberSpan = document.createElement('span');
        lineNumberSpan.className = 'line-number';
        lineNumberSpan.textContent = line.lineNumber;
        
        const formulaSpan = document.createElement('span');
        formulaSpan.className = 'formula';
        formulaSpan.dataset.formula = line.cleanFormula;
        formulaSpan.textContent = LogicParser.astToText(line.formula);
        formulaSpan.draggable = true;
        formulaSpan.addEventListener('dragstart', handleDragStartProofLine);
        formulaSpan.addEventListener('dragend', handleGenericDragEnd);
        
        const justificationSpan = document.createElement('span');
        justificationSpan.className = 'justification';
        justificationSpan.textContent = line.justification || '';
        
        li.appendChild(lineNumberSpan);
        li.appendChild(formulaSpan);
        li.appendChild(justificationSpan);
        
        proofList.appendChild(li);
    });
}

function renderWffTray(wffTray) {
    if (!wffOutputTray) return;
    wffOutputTray.innerHTML = '';
    wffTray?.forEach(wffData => {
        const item = document.createElement('div');
        item.className = 'formula';
        item.innerHTML = '';
        const formulaText = LogicParser.astToText(wffData.formula);
        item.appendChild(renderFormulaWithDraggableVars(formulaText));

        item.dataset.formula = formulaText;
        item.id = wffData.elementId;
        item.draggable = true;

        wffOutputTray.appendChild(item);
    });
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

function renderRules() {
    if (!inferenceRulesArea) return;
    inferenceRulesArea.innerHTML = '<h2>Inference Rules</h2>';
    const ruleSet = Rules.getRuleSet();
    const { activeRule, collectedPremises } = store.getState();

    for (const ruleKey in ruleSet) {
        const rule = ruleSet[ruleKey];
        const ruleElement = document.createElement('div');
        ruleElement.className = 'rule-item';
        ruleElement.dataset.rule = ruleKey;
        ruleElement.textContent = rule.name;

        if (ruleKey === activeRule) {
            ruleElement.classList.add('active');
        }

        // Click handler remains the same, causing a re-render
        ruleElement.addEventListener('click', () => handleRuleItemClick(ruleKey));

        // Implement legacy-style hover-activation on dragenter
        ruleElement.addEventListener('dragenter', (event) => {
            const item = event.currentTarget;
            // Set a timer to activate the rule, preventing flickering
            item.dataset.hoverTimer = setTimeout(() => {
                // Visually deactivate other rules
                document.querySelectorAll('.rule-item.active').forEach(el => el.classList.remove('active'));
                // Visually activate the current rule
                item.classList.add('active');
                // Silently update the store's active rule without re-rendering
                store.getState().setActiveRule(ruleKey, true);
            }, 300);
        });

        // Clear the timer on dragleave
        ruleElement.addEventListener('dragleave', (event) => {
            const item = event.currentTarget;
            clearTimeout(item.dataset.hoverTimer);
        });

        if (rule.slots) {
            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'rule-slots';
            rule.slots.forEach((slot, index) => {
                const slotElement = document.createElement('div');
                slotElement.className = 'drop-slot';
                slotElement.dataset.premiseIndex = index;
                slotElement.dataset.placeholder = slot.placeholder;
                if (collectedPremises[index]) {
                    slotElement.textContent = collectedPremises[index].formula;
                } else {
                    slotElement.textContent = slot.placeholder;
                }
                const dragHandler = createDragHandler('.drop-slot', 'drag-over');
                slotElement.addEventListener('dragover', dragHandler.dragover);
                slotElement.addEventListener('dragleave', dragHandler.dragleave);
                slotElement.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropOnRuleSlot(e, ruleKey, index);
                });
                slotsContainer.appendChild(slotElement);
            });

            if (rule.conclusion) {
                const conclusionElement = document.createElement('div');
                conclusionElement.className = 'rule-conclusion';
                conclusionElement.innerHTML = `<strong>Conclusion:</strong> ${rule.conclusion}`;
                slotsContainer.appendChild(conclusionElement);
            }

            ruleElement.appendChild(slotsContainer);
        }

        inferenceRulesArea.appendChild(ruleElement);
    }
}

function renderSubproofs() {
    if (!subproofsArea) return;
    subproofsArea.innerHTML = '<h2>Subproofs</h2>';
    const subproofRuleSet = Rules.getSubproofRuleSet();
    const { activeRule, collectedPremises } = store.getState();

    for (const ruleKey in subproofRuleSet) {
        const rule = subproofRuleSet[ruleKey];
        const ruleElement = document.createElement('div');
        ruleElement.className = 'rule-item';
        ruleElement.dataset.rule = ruleKey;
        ruleElement.textContent = rule.name;

        if (ruleKey === activeRule) {
            ruleElement.classList.add('active');
        }

        ruleElement.addEventListener('click', () => handleRuleItemClick(ruleKey));
        ruleElement.addEventListener('dragenter', () => handleRuleItemClick(ruleKey));

        if (rule.slots) {
            const slotsContainer = document.createElement('div');
            slotsContainer.className = 'rule-slots';
            rule.slots.forEach((slot, index) => {
                const slotElement = document.createElement('div');
                slotElement.className = 'drop-slot';
                slotElement.dataset.premiseIndex = index;
                slotElement.dataset.placeholder = slot.placeholder;
                if (collectedPremises[index]) {
                    slotElement.textContent = collectedPremises[index].formula;
                } else {
                    slotElement.textContent = slot.placeholder;
                }
                const dragHandler = createDragHandler('.drop-slot', 'drag-over');
                slotElement.addEventListener('dragover', dragHandler.dragover);
                slotElement.addEventListener('dragleave', dragHandler.dragleave);
                slotElement.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDropOnRuleSlot(e, ruleKey, index);
                });
                slotsContainer.appendChild(slotElement);
            });
            ruleElement.appendChild(slotsContainer);
        }

        subproofsArea.appendChild(ruleElement);
    }
}

function handleRuleItemClick(ruleKey) {
    store.getState().setActiveRule(ruleKey);
}

function handleDropOnRuleSlot(event, ruleKey, slotIndex) {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) return;
    const data = JSON.parse(jsonData);

    const { activeRule } = store.getState();
    const rule = Rules.getRuleSet()[activeRule] || Rules.getSubproofRuleSet()[activeRule];

    if (rule.isSubproof) {
        if (activeRule === 'CP') {
            const ast = LogicParser.textToAst(data.formula);
            if (ast.type === 'binary' && ast.operator === '→') {
                startConditionalIntroduction(data.formula);
            } else {
                store.getState().addFeedback('Only a conditional formula can be dropped here.', 'error');
            }
        } else if (activeRule === 'RAA') {
            startRAA(data.formula);
        }
    } else {
        store.getState().addPremise(data, slotIndex);
        const { collectedPremises } = store.getState();
        if (collectedPremises.filter(p => p).length === rule.premises) {
            applyActiveRule();
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
        const { connective, firstOperand } = wffConstruction;
        const hotspot = document.querySelector(`.connective-hotspot[data-connective="${connective}"]`);
        if (hotspot) {
            hotspot.classList.add('waiting');
            hotspot.textContent = `${firstOperand.formula} ${connective} ?`;
        }
    }
}

function showFeedback(message, isError = false) {
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

function handleSubproofToggle(event) {
    const headerLi = event.target.closest('li[data-is-collapsible="true"]');
    if (!headerLi) return;

    const subproofId = headerLi.dataset.subproofId;
    const isCurrentlyCollapsed = headerLi.dataset.collapsed === 'true';
    
    headerLi.dataset.collapsed = (!isCurrentlyCollapsed).toString();

    proofList.querySelectorAll(`li[data-parent-subproof-id="${subproofId}"]`).forEach(line => {
        line.classList.toggle('subproof-content-hidden', !isCurrentlyCollapsed);
    });
}

// --- Display Updates ---
function updateProblemDisplay() {
    console.log('updateProblemDisplay called in ui.js');
    const { goalFormula, currentProblem } = store.getState();
    const problemSetInfo = problemSets[currentProblem.set];
    gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${currentProblem.number}`;

    const problemInfoDiv = document.getElementById('proof-problem-info');
    if (problemInfoDiv) {
        let problemHtml = '';
        if (goalFormula && goalFormula.ast) {
            problemHtml += `<div class="proof-goal">Show: <span>${LogicParser.astToText(goalFormula.ast)}</span></div>`;
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