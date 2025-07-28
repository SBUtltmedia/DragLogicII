

function cacheDomElements() {
    gameWrapper = document.getElementById('game-wrapper');
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
}

function addEventListeners() {
    cacheDomElements();
    const helpIcon = document.getElementById('help-icon');
    window.helpIcon = helpIcon; // Make it globally available for simplicity
    helpIcon.addEventListener('click', () => {
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
        spot.addEventListener('dragover', createDragOverHandler('.connective-hotspot', 'drag-over'));
        spot.addEventListener('dragleave', createDragLeaveHandler('.connective-hotspot', 'drag-over'));
        spot.addEventListener('drop', handleDropOnConnectiveHotspot);
        spot.dataset.originalText = spot.textContent;
    });

    wffOutputTray.addEventListener('dragstart', handleWffDragStart);
    wffOutputTray.addEventListener('dragend', handleGenericDragEnd);
    wffOutputTray.addEventListener('dragover', createDragOverHandler('#wff-output-tray', 'drag-over-tray'));
    wffOutputTray.addEventListener('dragleave', createDragLeaveHandler('#wff-output-tray', 'drag-over-tray'));
    wffOutputTray.addEventListener('drop', handleDropOnWffOutputTray);

    if (trashCanDropArea) {
        trashCanDropArea.addEventListener('dragover', createDragOverHandler('#trash-can-drop-area', 'trash-can-drag-over'));
        trashCanDropArea.addEventListener('dragleave', createDragLeaveHandler('#trash-can-drop-area', 'trash-can-drag-over'));
        trashCanDropArea.addEventListener('drop', handleDropOnTrashCan);
    }

    proofList.addEventListener('dragover', createDragOverHandler('ol#proof-lines', 'drag-over-proof'));
    proofList.addEventListener('dragleave', createDragLeaveHandler('ol#proof-lines', 'drag-over-proof'));
    proofList.addEventListener('drop', handleDropOnProofArea);
    proofList.addEventListener('click', handleSubproofToggle);

    ruleItems.forEach(item => {
        item.addEventListener('click', handleRuleItemClick);
        item.addEventListener('dragenter', handleRuleItemDragEnter);
        item.addEventListener('dragleave', handleRuleItemDragLeave);
        item.querySelectorAll('.drop-slot').forEach(slot => {
            slot.addEventListener('dragover', createDragOverHandler('.drop-slot', 'drag-over'));
            slot.addEventListener('dragleave', createDragLeaveHandler('.drop-slot', 'drag-over'));
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

    prevFeedbackBtn.addEventListener('click', showPreviousFeedback);
    nextFeedbackBtn.addEventListener('click', showNextFeedback);
    zoomInWffBtn.addEventListener('click', () => changeWffTrayZoom(1));
    zoomOutWffBtn.addEventListener('click', () => changeWffTrayZoom(-1));

    gameWrapper.addEventListener('dblclick', handleWrapperZoom);

    setupProofLineDragging();

    EventBus.on('feedback:show', (data) => {
        showFeedback(data.message, data.isError, data.isWarning);
    });

    EventBus.on('wff:remove', (data) => {
        removeWffFromTrayById(data.elementId);
    });
}

function updateLayout(wrapperId = 'game-wrapper', targetAspectRatio = 16 / 9, rootFontSizeReferenceWidth = 120) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) { console.error(`Wrapper element with ID "${wrapperId}" not found.`); return; }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight; const availableWidth = viewportWidth;
    let wrapperWidth, wrapperHeight;
    if (availableWidth / availableHeight > targetAspectRatio) {
        wrapperHeight = availableHeight * 0.98;
        wrapperWidth = wrapperHeight * targetAspectRatio;
    } else {
        wrapperWidth = availableWidth * 0.98;
        wrapperHeight = wrapperWidth / targetAspectRatio;
    }
    wrapperWidth = Math.max(wrapperWidth, 320 * targetAspectRatio);
    wrapperHeight = Math.max(wrapperHeight, 320);
    wrapper.style.width = `${wrapperWidth}px`;
    wrapper.style.height = `${wrapperHeight}px`;
    const rootFontSize = (wrapperWidth / rootFontSizeReferenceWidth) * 1;
    document.documentElement.style.fontSize = `${rootFontSize}px`;
}

function showFeedback(message, isError = false, isWarning = false) {
    if (!proofFeedbackDiv) return;

    let type = 'success';
    if (isError) type = 'error';
    else if (isWarning) type = 'warning';

    // Check if the immediately preceding feedback was an error and this is a success
    if (type === 'success' && feedbackHistory.length > 0) {
        const lastFeedback = feedbackHistory[feedbackHistory.length - 1];
        if (lastFeedback.type === 'error') {
            message += " (Previous error resolved)";
        }
    }

    feedbackHistory.push({ message, type });
    currentFeedbackIndex = feedbackHistory.length - 1;

    displayCurrentFeedback();
}

let feedbackClearTimer = null;

function displayCurrentFeedback() {
    if (!proofFeedbackDiv || feedbackHistory.length === 0) {
        if (proofFeedbackDiv) {
            proofFeedbackDiv.textContent = "";
            proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2';
            proofFeedbackDiv.classList.add('hidden-feedback'); // Hide completely when empty
        }
        updateFeedbackNavButtons();
        return;
    }

    // Clear any existing timers and classes
    clearTimeout(feedbackClearTimer);
    proofFeedbackDiv.classList.remove('fade-out', 'hidden-feedback');

    const { message, type } = feedbackHistory[currentFeedbackIndex];

    proofFeedbackDiv.textContent = message;
    proofFeedbackDiv.className = 'text-center font-bold flex-grow mx-2'; // Reset classes

    if (type === 'error') proofFeedbackDiv.classList.add('text-red-400');
    else if (type === 'warning') proofFeedbackDiv.classList.add('text-yellow-400');
    else proofFeedbackDiv.classList.add('text-green-400');

    updateFeedbackNavButtons();

    // Start fade-out timer for non-error/warning messages
    if (type === 'success') { // Only fade out success messages automatically
        feedbackClearTimer = setTimeout(() => {
            proofFeedbackDiv.classList.add('fade-out');
            // After transition, hide completely
            proofFeedbackDiv.addEventListener('transitionend', function handler() {
                proofFeedbackDiv.classList.add('hidden-feedback');
                proofFeedbackDiv.removeEventListener('transitionend', handler);
            }, { once: true });
        }, 3000); // Message visible for 3 seconds before fading
    }
}

function updateFeedbackNavButtons() {
    if (!prevFeedbackBtn || !nextFeedbackBtn) return;
    prevFeedbackBtn.disabled = currentFeedbackIndex <= 0;
    nextFeedbackBtn.disabled = currentFeedbackIndex >= feedbackHistory.length - 1;
}

function showPreviousFeedback() {
    if (currentFeedbackIndex > 0) {
        currentFeedbackIndex--;
        displayCurrentFeedback();
    }
}

function showNextFeedback() {
    if (currentFeedbackIndex < feedbackHistory.length - 1) {
        currentFeedbackIndex++;
        displayCurrentFeedback();
    }
}

function changeWffTrayZoom(direction) {
    const newSize = wffTrayFontSize + (direction * FONT_SIZE_STEP);
    wffTrayFontSize = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, newSize));
    wffOutputTray.style.setProperty('--wff-tray-font-size', `${wffTrayFontSize}rem`);
}

function handleWrapperZoom(e) {
    if (e.target.closest('button, .draggable-var, .formula, .rule-item, .connective-hotspot, .accordion-header, #proof-lines li')) {
        return;
    }

    const wrapper = e.currentTarget;
    const isZoomed = wrapper.classList.toggle('zoomed');

    if (isZoomed) {
        const rect = wrapper.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width * 100;
        const y = (e.clientY - rect.top) / rect.height * 100;
        wrapper.style.transformOrigin = `${x}% ${y}%`;
    } else {
        wrapper.style.transformOrigin = ''; // Reset to center
    }
}

function clearSlot(slotElement) {
    if (slotElement) {
        slotElement.textContent = slotElement.dataset.placeholder || "Drop here...";
        slotElement.classList.add('text-slate-400', 'italic');
        delete slotElement.dataset.formula; delete slotElement.dataset.line;
        delete slotElement.dataset.source; delete slotElement.dataset.elementId;
    }
}

function clearRuleSlots(ruleItemElement) { ruleItemElement.querySelectorAll('.drop-slot').forEach(clearSlot); }

function updateSubGoalDisplay() {
    if (!subGoalDisplayContainer) return;
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

function isNegationOf(f1, f2) {
    const ast1 = LogicParser.textToAst(f1);
    const ast2 = LogicParser.textToAst(f2);
    if (!ast1 || !ast2) return false;

    return (ast1.type === 'negation' && LogicParser.areAstsEqual(ast1.operand, ast2)) ||
           (ast2.type === 'negation' && LogicParser.areAstsEqual(ast2.operand, ast1));
}

function renderFormulaWithDraggableVars(formulaString) {
    const fragment = document.createDocumentFragment();
    // Use regex to split on operators, parens, commas, and variables, keeping them.
    const parts = formulaString.split(/([(),~∧∨→↔∀∃])|([xyz])/).filter(p => p);

    parts.forEach(part => {
        if (/^[xyz]$/.test(part)) {
            const span = document.createElement('span');
            span.className = 'draggable-var fol-variable'; // This class is for styling consistency
            span.draggable = true;
            span.dataset.type = 'fol-variable';
            span.dataset.symbol = part;
            span.textContent = part;
            // Drag listeners are now handled by delegation on the parent tray
            fragment.appendChild(span);
        } else {
            fragment.appendChild(document.createTextNode(part));
        }
    });
    return fragment;
}

function createDraggableWffInTray(formula) {
    if (!formula || formula.trim() === "") return;
    const item = document.createElement('div');
    item.className = 'formula';
    item.innerHTML = ''; // Clear it first
    item.appendChild(renderFormulaWithDraggableVars(formula));

    item.dataset.formula = formula;
    item.id = `wff-output-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    item.draggable = true;
    // The main drag listeners are delegated to the tray now

    // Add drop listeners for predicate application
    item.addEventListener('dragover', createDragOverHandler('.formula', 'drag-over'));
    item.addEventListener('dragleave', createDragLeaveHandler('.formula', 'drag-over'));

    wffOutputTray.appendChild(item);
}

function clearWffInProgress() {
    firstOperandWFF = null;
    if (waitingConnectiveWFF && connectiveHotspots) {
        connectiveHotspots.forEach(spot => {
            if (spot.classList.contains('waiting')) {
                spot.classList.remove('waiting');
                spot.textContent = spot.dataset.originalText || spot.dataset.connective;
            }
        });
    }
    waitingConnectiveWFF = null;
}

function removeWffFromTrayById(elementId) {
    if (!elementId) { return; }
    const elToRemove = document.getElementById(elementId);
    if (elToRemove && elToRemove.parentNode === wffOutputTray) {
        wffOutputTray.removeChild(elToRemove);
        if (draggedElementForRemoval && draggedElementForRemoval.id === elementId) {
            draggedElementForRemoval = null;
        }
    }
}

function updateLogicUIVisibility() {
    const isFolProblem = currentProblem.set === 2;

    // Toggle accordion sections
    document.getElementById('prop-logic-accordion').classList.remove('disabled-section'); // Always enable prop logic constructor
    document.getElementById('fol-logic-accordion').classList.toggle('disabled-section', !isFolProblem);

    // Toggle rule items
    document.querySelectorAll('.rule-item').forEach(item => {
        const logicType = item.dataset.logicType;
        if (logicType === 'fol') {
            item.classList.toggle('disabled-section', !isFolProblem);
        }
    });
}
