let tutorialSteps = [];
let currentStep = 0;
let tutorialElement;

export const propositionalTutorialSteps = [
    { 
        element: '#wff-output-tray',
        text: "Welcome to the Natural Deduction Contraption! This is the Well-Formed Formula (WFF) tray. You can drag premises and conclusions from here.",
        position: 'bottom'
    },
    {
        element: '#inference-rules-area',
        text: "These are the inference rules. Click on a rule to activate it, then drag lines from the proof area to its slots.",
        position: 'top'
    },
    {
        element: '#proof-lines',
        text: "This is the proof area. Your goal is to derive the conclusion from the premises. Drag formulas from the WFF tray to start.",
        position: 'right'
    },
    {
        element: '#proof-problem-info',
        text: "Here you can see the premises and the goal of the current problem.",
        position: 'bottom'
    },
    {
        element: '#trash-can-drop-area',
        text: "Made a mistake or have a cluttered WFF tray? Drag formulas here to delete them.",
        position: 'top'
    },
    {
        element: '#help-icon',
        text: "You can restart this tutorial anytime by clicking this help icon.",
        position: 'left'
    }
];

export const folTutorialSteps = [
    // ... FOL-specific steps can be added here ...
    { 
        element: '#wff-output-tray',
        text: "Welcome to First-Order Logic! You now have quantifiers (∀, ∃) and variables (x, y, z) available.",
        position: 'bottom'
    },
     {
        element: '#inference-rules-area',
        text: "New rules like Universal Instantiation (UI) and Existential Generalization (EG) are available for FOL proofs.",
        position: 'top'
    },
];

export function startTutorial(steps) {
    tutorialSteps = steps;
    currentStep = 0;
    if (!document.getElementById('tutorial-overlay')) {
        createTutorialElement();
    }
    showStep();
}

function createTutorialElement() {
    const overlay = document.createElement('div');
    overlay.id = 'tutorial-overlay';
    overlay.style.cssText = `
        position: fixed; 
        top: 0; left: 0; 
        width: 100vw; height: 100vh; 
        background: rgba(0,0,0,0.5); 
        z-index: 999;
    `;

    tutorialElement = document.createElement('div');
    tutorialElement.id = 'tutorial-step';
    tutorialElement.style.cssText = `
        position: absolute;
        background: #fff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 0 15px rgba(0,0,0,0.3);
        max-width: 400px;
        z-index: 1001;
    `;

    const content = document.createElement('p');
    content.id = 'tutorial-text';
    tutorialElement.appendChild(content);

    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.onclick = nextStep;
    styleButton(nextButton);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'End Tutorial';
    closeButton.onclick = endTutorial;
    styleButton(closeButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '15px';
    buttonContainer.appendChild(nextButton);
    buttonContainer.appendChild(closeButton);
    tutorialElement.appendChild(buttonContainer);

    document.body.appendChild(overlay);
    document.body.appendChild(tutorialElement);

    overlay.onclick = endTutorial; // Close when clicking outside
}

function styleButton(button) {
    button.style.cssText = `
        background-color: #007bff;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin-right: 10px;
    `;
}

function showStep() {
    if (currentStep >= tutorialSteps.length) {
        endTutorial();
        return;
    }

    const step = tutorialSteps[currentStep];
    const targetElement = document.querySelector(step.element);

    if (targetElement) {
        targetElement.classList.add('highlight');
        const rect = targetElement.getBoundingClientRect();
        document.getElementById('tutorial-text').textContent = step.text;

        // Position the tutorial box
        switch (step.position) {
            case 'bottom':
                tutorialElement.style.top = `${rect.bottom + 10}px`;
                tutorialElement.style.left = `${rect.left}px`;
                break;
            case 'top':
                tutorialElement.style.top = `${rect.top - tutorialElement.offsetHeight - 10}px`;
                tutorialElement.style.left = `${rect.left}px`;
                break;
            case 'left':
                tutorialElement.style.left = `${rect.left - tutorialElement.offsetWidth - 10}px`;
                tutorialElement.style.top = `${rect.top}px`;
                break;
            case 'right':
            default:
                tutorialElement.style.left = `${rect.right + 10}px`;
                tutorialElement.style.top = `${rect.top}px`;
                break;
        }
    }
}

function nextStep() {
    // Remove highlight from the current element
    const oldStep = tutorialSteps[currentStep];
    const oldTarget = document.querySelector(oldStep.element);
    if (oldTarget) {
        oldTarget.classList.remove('highlight');
    }

    currentStep++;
    showStep();
}

function endTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.remove();
    if (tutorialElement) tutorialElement.remove();

    // Remove all highlights
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
}