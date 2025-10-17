import { store } from './store.js';
import { EventBus } from './event-bus.js';
import { problemSets } from './problems.js';
import { Rules } from './rules.js';
import { handleWffDragStart, handleGenericDragEnd, handleDropOnConnectiveHotspot, handleDropOnWffOutputTray, handleDropOnTrashCan, createDragHandler, handleDragStartProofLine, getDropValidationState, handleDropOnProofArea } from './drag-drop.js';
import { initializeProof, applyActiveRule, dischargeRAA, dischargeCP, startConditionalIntroduction, startRAA, startStrictSubproof, dischargeStrictSubproof, addProofLine } from './proof.js';
import { startTutorial, propositionalTutorialSteps } from './tutorial.js';
import { LogicParser } from './parser.js';
import { handleDraggableClick, handleDroppableClick } from './click-to-move.js';

// --- DOM Element References ---
let wffOutputTray, draggableVariables, connectiveHotspots, trashCanDropArea, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle, prevFeedbackBtn, nextFeedbackBtn, helpIcon, subproofsArea, inferenceRulesArea, winModalOverlay, modalNextProblemBtn, modalCloseBtn, simpPopup, simpChoiceLeft, simpChoiceRight, systemDisplay, proofDropSlot;
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
    simpPopup = document.getElementById('simp-popup');
    simpChoiceLeft = document.getElementById('simp-choice-left');
    simpChoiceRight = document.getElementById('simp-choice-right');
    systemDisplay = document.getElementById('system-display');
    proofDropSlot = document.getElementById('proof-drop-slot');

    gameWrapper = document.getElementById('main-container');
}

// --- Modal & Popup Control ---
function showWinModal() {
    if (winModalOverlay) winModalOverlay.classList.remove('hidden');
}

function hideWinModal() {
    if (winModalOverlay) winModalOverlay.classList.add('hidden');
}

function showSimpPopup(premise, ast, event) {
    const leftText = LogicParser.astToText(ast.left);
    const rightText = LogicParser.astToText(ast.right);

    simpChoiceLeft.textContent = leftText;
    simpChoiceRight.textContent = rightText;

    const mainRect = gameWrapper.getBoundingClientRect();
    simpPopup.style.left = `${event.clientX - mainRect.left}px`;
    simpPopup.style.top = `${event.clientY - mainRect.top}px`;

    simpPopup.classList.remove('hidden');

    simpChoiceLeft.onclick = () => {
        addProofLine(ast.left, `Simp, ${premise.lineId}`);
        simpPopup.classList.add('hidden');
        store.getState().clearPremises();
    };
    simpChoiceRight.onclick = () => {
        addProofLine(ast.right, `Simp, ${premise.lineId}`);
        simpPopup.classList.add('hidden');
        store.getState().clearPremises();
    };
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

// --- Drag and Drop UI ---
function showProofDropSlot(targetLi, validationState) {
    proofDropSlot.classList.remove('hidden', 'valid-drop', 'invalid-drop');
    if (validationState.isValid) {
        proofDropSlot.classList.add('valid-drop');
        proofDropSlot.textContent = `Drop to apply: ${validationState.justification}`;
    } else {
        proofDropSlot.classList.add('invalid-drop');
        proofDropSlot.textContent = validationState.message || 'Invalid move';
    }

    if (targetLi) {
        targetLi.parentNode.insertBefore(proofDropSlot, targetLi.nextSibling);
    } else {
        proofList.appendChild(proofDropSlot);
    }
}

function hideProofDropSlot() {
    proofDropSlot.classList.add('hidden');
}

function handleProofAreaDragOver(event) {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (!jsonData) return;

    const data = JSON.parse(jsonData);
    const targetLi = event.target.closest('li[data-line-number]');
    const validationState = getDropValidationState(data, targetLi);

    showProofDropSlot(targetLi, validationState);
}

function handleProofAreaDragLeave(event) {
    const proofArea = document.getElementById('proof-area');
    if (!proofArea.contains(event.relatedTarget)) {
        hideProofDropSlot();
    }
}

// --- Initialize UI Components ---
export function initializeUI() {
    initializeProof();
    
    const proofArea = document.getElementById('proof-area');
    if (proofArea) {
        proofArea.addEventListener('dragover', handleProofAreaDragOver);
        proofArea.addEventListener('dragleave', handleProofAreaDragLeave);
        proofArea.addEventListener('drop', handleDropOnProofArea);
        proofList.addEventListener('click', handleSubproofToggle);
    }
    
    if (wffOutputTray) {
        const dragHandler = createDragHandler('#wff-output-tray', 'drag-over-tray');
        wffOutputTray.addEventListener('dragover', dragHandler.dragover);
        wffOutputTray.addEventListener('dragleave', dragHandler.dragleave);
        wffOutputTray.addEventListener('drop', handleDropOnWffOutputTray);
    }

    if (connectiveHotspots) {
        connectiveHotspots.forEach(hotspot => {
            const dragHandler = createDragHandler(`[data-connective="${hotspot.dataset.connective}"]`, 'drag-over-connective');
            hotspot.addEventListener('dragover', dragHandler.dragover);
            hotspot.addEventListener('dragleave', dragHandler.dragleave);
            hotspot.addEventListener('drop', handleDropOnConnectiveHotspot);
        });
    }

    if (trashCanDropArea) {
        const dragHandler = createDragHandler('#trash-can-drop-area', 'trash-can-drag-over');
        trashCanDropArea.addEventListener('dragover', dragHandler.dragover);
        trashCanDropArea.addEventListener('dragleave', dragHandler.dragleave);
        trashCanDropArea.addEventListener('drop', handleDropOnTrashCan);
    }
    
    if (helpIcon) {
        helpIcon.addEventListener('click', () => {
            startTutorial(propositionalTutorialSteps);
        });
    }
    
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

    document.addEventListener('dragstart', handleWffDragStart);
    document.addEventListener('dragend', handleGenericDragEnd);
}

// --- Event Listener Setup ---
export function addEventListeners() {
    cacheDomElements();
    initializeUI();
    
    EventBus.on('render', render);
    EventBus.on('ui:showWinModal', showWinModal);
    EventBus.on('ui:hideProofDropSlot', hideProofDropSlot);
    EventBus.on('feedback:show', (data) => {
        store.getState().addFeedback(data.message, data.isError ? 'error' : 'success');
    });
    EventBus.on('feedback:update', renderFeedback);
    EventBus.on('problem:loaded', () => {
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

    proofLines.forEach(line => {
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

        const subproof = subGoalStack.find(sg => sg.scopeLevel === line.scopeLevel);
        if (subproof && subproof.isStrict) {
            li.classList.add('strict-subproof-line');
        }

        if (line.isShowLine) {
            li.classList.add('show-line', 'subproof-header-collapsible');
            li.dataset.isCollapsible = 'true';
            li.dataset.collapsed = 'true';
        }

        if (line.scopeLevel > 0) {
            li.style.marginLeft = `${line.scopeLevel * 1.5}rem`;
        }
        
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
    const parts = formulaString.split(/([(),~∧∨→↔∀∃□◊])/).filter(p => p && p.trim());
    
    parts.forEach(part => {
        fragment.appendChild(document.createTextNode(part));
    });
    return fragment;
}

function renderRules() {
    if (!inferenceRulesArea) return;
    inferenceRulesArea.innerHTML = '<h2>Inference Rules</h2>';
    const allRules = Rules.getRuleSet();
    const { activeRule, collectedPremises, activeModalSystem } = store.getState();

    for (const ruleKey in allRules) {
        const rule = allRules[ruleKey];
        if (!rule.systems.includes(activeModalSystem)) {
            continue;
        }

        const ruleElement = document.createElement('div');
        ruleElement.className = 'rule-item';
        ruleElement.dataset.rule = ruleKey;
        ruleElement.textContent = rule.name;

        if (ruleKey === activeRule) {
            ruleElement.classList.add('active');
        }

        ruleElement.addEventListener('click', () => handleRuleItemClick(ruleKey));

        ruleElement.addEventListener('dragenter', (event) => {
            const item = event.currentTarget;
            item.dataset.hoverTimer = setTimeout(() => {
                document.querySelectorAll('.rule-item.active').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                store.getState().setActiveRule(ruleKey, true);
            }, 300);
        });

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
    const allSubproofRules = Rules.getSubproofRuleSet();
    const { activeRule, collectedPremises, activeModalSystem } = store.getState();

    for (const ruleKey in allSubproofRules) {
        const rule = allSubproofRules[ruleKey];
        if (!rule.systems.includes(activeModalSystem)) {
            continue;
        }

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

    if (activeRule === 'Simp') {
        const ast = LogicParser.textToAst(data.formula);
        if (ast.type === 'binary' && ast.operator === '∧') {
            showSimpPopup(data, ast, event);
            return;
        }
    }

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
        } else if (activeRule === 'Strict') {
            const ast = LogicParser.textToAst(data.formula);
            if (ast.type === 'unary' && ast.operator === '□') {
                startStrictSubproof(data.formula);
            } else {
                store.getState().addFeedback('Only a Box (□) formula can be used to start a strict subproof.', 'error');
            }
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

function renderFeedback() {
    if (!proofFeedbackDiv) return;

    const { feedbackHistory, currentFeedbackIndex } = store.getState();
    const feedback = feedbackHistory[currentFeedbackIndex];

    if (feedback) {
        proofFeedbackDiv.textContent = feedback.message;
        proofFeedbackDiv.className = `alert ${feedback.type === 'error' ? 'alert-danger' : 'alert-success'}`;
    } else {
        proofFeedbackDiv.textContent = '';
        proofFeedbackDiv.className = '';
    }
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
    const { goalFormula, currentProblem, activeModalSystem } = store.getState();
    const problemSetInfo = problemSets[currentProblem.set];
    gameTitle.textContent = `Natural Deduction Contraption - ${problemSetInfo.name} #${currentProblem.number}`;

    if (systemDisplay) {
        systemDisplay.textContent = activeModalSystem;
    }

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