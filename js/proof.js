

function addProofLine(formula, justification, scopeLevel = currentScopeLevel, isAssumptionFlag = false, isShowLineFlag = false) {
    if (!proofList) return null;
    const cleanFormula = formula.trim();

    let formulaForParsing = cleanFormula;
    if (isShowLineFlag) {
        formulaForParsing = cleanFormula.replace(/^Show:\s*/i, '');
    }
    const formulaAst = LogicParser.textToAst(formulaForParsing);

    if (!isShowLineFlag && !isAssumptionFlag) {
        // Check for duplicate lines
        const existingLines = proofList.querySelectorAll(`li[data-scope-level="${scopeLevel}"]`);
        for (const line of existingLines) {
            const existingFormulaEl = line.querySelector('.formula');
            const existingAst = LogicParser.textToAst(existingFormulaEl.dataset.formula || existingFormulaEl.textContent);
            if (existingAst && formulaAst && LogicParser.areAstsEqual(existingAst, formulaAst) && line.dataset.isProven === 'true') {
                showFeedback("This line already exists and is proven in the current scope.", true); return null;
            }
        }
    }
    let displayLineStr, dataLineId;
    if (scopeLevel === 0) {
        displayLineStr = `${nextLineNumberGlobal}.`; dataLineId = `${nextLineNumberGlobal}`; nextLineNumberGlobal++;
    } else {
        const activeSubProof = subGoalStack[subGoalStack.length - 1];
        if (!activeSubProof) { console.error("No active subproof!"); return null; }
        if (typeof activeSubProof.subLineLetterCode === 'undefined') activeSubProof.subLineLetterCode = 97;
        const subLetter = String.fromCharCode(activeSubProof.subLineLetterCode++);
        displayLineStr = `${activeSubProof.parentLineDisplay}.${subLetter}`; dataLineId = displayLineStr;
    }
    const listItem = document.createElement('li');
    Object.assign(listItem.dataset, {
        lineNumber: dataLineId,
        scopeLevel,
        isAssumption: isAssumptionFlag,
        isShowLine: isShowLineFlag,
        isProven: (!isShowLineFlag && !isAssumptionFlag).toString()
    });

    if (isShowLineFlag) {
        listItem.classList.add('show-line');
        listItem.dataset.subproofId = `subproof-${dataLineId.replace('.', '-')}`;
    }
    if (isAssumptionFlag && subGoalStack.length > 0) {
        listItem.classList.add('subproof-assumption');
        const activeSub = subGoalStack[subGoalStack.length - 1];
        if (activeSub.subproofId) {
            listItem.dataset.parentSubproofId = activeSub.subproofId;
        }
    } else if (scopeLevel > 0 && subGoalStack.length > 0 && !isAssumptionFlag && !isShowLineFlag) {
        const activeSub = subGoalStack[subGoalStack.length - 1];
        if (activeSub.subproofId) {
            listItem.dataset.parentSubproofId = activeSub.subproofId;
        }
    }

    if (scopeLevel > 0) { listItem.classList.add('subproof-line'); listItem.style.marginLeft = `${scopeLevel * 1.5}rem`; }

    const formulaDiv = document.createElement('span');
    formulaDiv.className = 'formula';
    formulaDiv.dataset.formula = cleanFormula;
    formulaDiv.draggable = true; // Make the formula draggable
    formulaDiv.appendChild(renderFormulaWithDraggableVars(cleanFormula));

    listItem.innerHTML = `<span class="line-number">${displayLineStr}</span>`;
    listItem.appendChild(formulaDiv);
    listItem.innerHTML += `<span class="justification">${justification}</span>`;

    proofList.appendChild(listItem);

    if (!isShowLineFlag && !isAssumptionFlag && subGoalStack.length > 0) {
        const currentSubGoalInfo = subGoalStack[subGoalStack.length - 1];
        if (scopeLevel === currentSubGoalInfo.scope) {
            if (currentSubGoalInfo.type === "RAA") {
                const linesInCurrentSubProof = Array.from(proofList.querySelectorAll(`li[data-scope-level="${currentSubGoalInfo.scope}"][data-parent-subproof-id="${currentSubGoalInfo.subproofId}"]`));
                const assumptionLine = proofList.querySelector(`li[data-line-number="${currentSubGoalInfo.assumptionLineFullId}"][data-parent-subproof-id="${currentSubGoalInfo.subproofId}"]`);
                if(assumptionLine && !linesInCurrentSubProof.includes(assumptionLine)) linesInCurrentSubProof.push(assumptionLine);

                for (const existingLi of linesInCurrentSubProof) {
                    if (existingLi === listItem) continue;
                    const existingFormulaEl = existingLi.querySelector('.formula');
                    if (existingFormulaEl && isNegationOf(cleanFormula, existingFormulaEl.dataset.formula)) {
                        dischargeRAA(currentSubGoalInfo, existingLi.dataset.lineNumber, dataLineId);
                        return listItem;
                    }
                }
            } else if (currentSubGoalInfo.type === "→I") {
                const subGoalAst = LogicParser.textToAst(currentSubGoalInfo.goal);
                if (LogicParser.areAstsEqual(formulaAst, subGoalAst)) {
                    dischargeConditionalIntroduction(currentSubGoalInfo, dataLineId);
                    return listItem;
                }
            }
        }
    } else if (scopeLevel === 0 && !isShowLineFlag && !isAssumptionFlag) {
        checkAndHandleMainGoalCompletion(formulaAst, listItem);
    }
    return listItem;
}

function checkAndHandleMainGoalCompletion(provenAst, lineItem) {
    const goalAst = LogicParser.textToAst(goalFormula);
    if (currentScopeLevel === 0 && goalAst && provenAst && LogicParser.areAstsEqual(provenAst, goalAst)) {
        if (lineItem) lineItem.classList.add('proof-line-complete');
        showFeedback("Main Proof Goal Achieved!", false);
        if(gameTitle) gameTitle.textContent += " - Solved!";

        // Disable further interaction
        const proofArea = document.getElementById('proof-area');
        if (proofArea) {
            proofArea.classList.add('proof-complete');
        }

        // Add a 'Next Problem' button if not the last problem
        const nextProblem = getNextProblem();
        if (nextProblem) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next Problem';
            nextButton.classList.add('next-problem-button');
            nextButton.onclick = () => {
                loadProblem(nextProblem.set, nextProblem.problem);
            };
            const problemInfoDiv = document.getElementById('proof-problem-info');
            if (problemInfoDiv) {
                problemInfoDiv.appendChild(nextButton);
            }
        }
        return true;
    }
    return false;
}

function startProofByContradiction(wffToProve) {
    const goalAst = LogicParser.textToAst(wffToProve);
    if (!goalAst) { showFeedback("Cannot start RAA: Invalid formula.", true); return; }

    const showLineItem = addProofLine(`Show: ${wffToProve}`, "Goal (RAA)", currentScopeLevel, false, true);
    if (!showLineItem) { return; }

    const subproofId = showLineItem.dataset.subproofId;
    const showLineFullId = showLineItem.dataset.lineNumber;
    currentScopeLevel++;

    const assumptionAst = { type: 'negation', operand: goalAst };
    const assumptionFormula = LogicParser.astToText(assumptionAst);

    subGoalStack.push({
        forWff: wffToProve, type: "RAA", assumptionFormula: assumptionFormula,
        showLineFullId: showLineFullId, parentLineDisplay: showLineFullId,
        subLineLetterCode: 97, scope: currentScopeLevel, assumptionLineFullId: "",
        subproofId: subproofId
    });
    const assumptionLineItem = addProofLine(assumptionFormula, "Assumption (RAA)", currentScopeLevel, true);
    if (assumptionLineItem) {
        subGoalStack[subGoalStack.length - 1].assumptionLineFullId = assumptionLineItem.dataset.lineNumber;
    }
    updateSubGoalDisplay();
    showFeedback(`Subproof (RAA): Assume ${assumptionFormula}. Derive a contradiction.`, false, true);
}

function startConditionalIntroduction(conditionalAst) {
    const conditionalFormula = LogicParser.astToText(conditionalAst);
    const antecedentFormula = LogicParser.astToText(conditionalAst.left);
    const consequentFormula = LogicParser.astToText(conditionalAst.right);

    const showLineItem = addProofLine(`Show: ${conditionalFormula}`, "Goal (→I)", currentScopeLevel, false, true);
    if (!showLineItem) { return; }

    const subproofId = showLineItem.dataset.subproofId;
    const showLineFullId = showLineItem.dataset.lineNumber;
    currentScopeLevel++;
    subGoalStack.push({
        goal: consequentFormula, forWff: conditionalFormula, type: "→I", assumptionFormula: antecedentFormula,
        showLineFullId: showLineFullId, parentLineDisplay: showLineFullId,
        subLineLetterCode: 97, scope: currentScopeLevel, assumptionLineFullId: "",
        subproofId: subproofId
    });
    const assumptionLineItem = addProofLine(antecedentFormula, "Assumption (→I)", currentScopeLevel, true);
     if (assumptionLineItem) {
        subGoalStack[subGoalStack.length - 1].assumptionLineFullId = assumptionLineItem.dataset.lineNumber;
     }
    updateSubGoalDisplay();
    showFeedback(`Subproof (→I): Assume ${antecedentFormula}. Derive ${consequentFormula}.`, false, true);
}

function dischargeSubproof(subproofDetails, justificationText) {
    const dischargedSubproof = subGoalStack.pop();
    const parentScopeLevel = dischargedSubproof.scope - 1;
    const showLineElement = proofList.querySelector(`li[data-line-number="${dischargedSubproof.showLineFullId}"]`);

    if (!showLineElement) {
        currentScopeLevel = parentScopeLevel;
        updateSubGoalDisplay();
        addProofLine(dischargedSubproof.forWff, justificationText, parentScopeLevel);
        return;
    }

    const showFormulaSpan = showLineElement.querySelector('.formula');
    const showJustSpan = showLineElement.querySelector('.justification');

    showFormulaSpan.innerHTML = ''; // Clear old content
    showFormulaSpan.appendChild(renderFormulaWithDraggableVars(dischargedSubproof.forWff));
    showFormulaSpan.dataset.formula = dischargedSubproof.forWff;

    if (showJustSpan) showJustSpan.textContent = justificationText;

    showLineElement.classList.remove('show-line');
    showLineElement.classList.add('proven-show-line', 'subproof-header-collapsible');
    Object.assign(showLineElement.dataset, {
        isProven: 'true',
        isShowLine: 'false',
        isAssumption: 'false',
        isCollapsible: 'true',
        collapsed: 'true'
    });

    proofList.querySelectorAll(`li[data-parent-subproof-id="${dischargedSubproof.subproofId}"]`).forEach(line => {
        line.classList.add('subproof-content-hidden');
    });

    currentScopeLevel = parentScopeLevel;
    updateSubGoalDisplay();
    showFeedback(`Discharged ${dischargedSubproof.type} for ${dischargedSubproof.forWff}. Subproof collapsed.`, false);
    const provenAst = LogicParser.textToAst(dischargedSubproof.forWff);
    checkAndHandleMainGoalCompletion(provenAst, showLineElement);
}

function dischargeRAA(subproofDetails, contradictoryLine1Id, contradictoryLine2Id) {
    if (!subproofDetails || subproofDetails.type !== "RAA") { return; }
    const justificationText = `RAA ${subproofDetails.assumptionLineFullId} (${contradictoryLine1Id}, ${contradictoryLine2Id})`;
    dischargeSubproof(subproofDetails, justificationText);
}

function dischargeConditionalIntroduction(subproofDetails, consequentLineId) {
    if (!subproofDetails || subproofDetails.type !== "→I") { return; }
    const justificationText = `→I ${subproofDetails.assumptionLineFullId}–${consequentLineId}`;
    dischargeSubproof(subproofDetails, justificationText);
}

function handleSubproofToggle(event) {
    const headerLi = event.target.closest('li[data-is-collapsible="true"]');
    if (!headerLi) return;

    const subproofId = headerLi.dataset.subproofId;
    const isCurrentlyCollapsed = headerLi.dataset.collapsed === 'true';

    headerLi.dataset.collapsed = (!isCurrentlyCollapsed).toString(); // Toggle the state

    proofList.querySelectorAll(`li[data-parent-subproof-id="${subproofId}"]`).forEach(line => {
        line.classList.toggle('subproof-content-hidden', !isCurrentlyCollapsed);
    });
}

function isAssumption(lineItem) { return lineItem && lineItem.dataset.isAssumption === 'true'; }

function setupProofLineDragging() {
    // This function now only needs one delegated listener on the proof list
    proofList.addEventListener('dragstart', handleDragStartProofLine);
    proofList.addEventListener('dragend', handleGenericDragEnd);
}
