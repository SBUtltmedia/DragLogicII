export const propositionalTutorialSteps = [
    {
        element: '#wff-construction-area',
        intro: 'Welcome to the Natural Deduction Contraption! This tutorial will guide you through the basics of solving propositional logic problems.'
    },
    {
        element: '#prop-logic-accordion',
        intro: 'This is the Propositional Logic section. Here you can construct well-formed formulas (WFFs).'
    },
    {
        element: '.draggable-var',
        intro: 'Drag these variables to the connective hotspots to build your formulas.'
    },
    {
        element: '.connective-hotspot',
        intro: 'Drop variables or other formulas here to apply logical connectives.'
    },
    {
        element: '#wff-output-tray',
        intro: 'Your constructed WFFs will appear here. You can then drag them to the proof area.'
    },
    {
        element: '#proof-area',
        intro: 'This is the proof area. Your goal is to derive the conclusion from the given premises.'
    },
    {
        element: '#proof-problem-info',
        intro: 'The premises and conclusion of the current problem are displayed here.'
    },
    {
        element: '#inference-rules-area',
        intro: 'Here are the inference rules you can use. Drag WFFs from the proof to the rule slots to apply them.'
    },
    {
        element: '#subproofs-area',
        intro: 'You can start subproofs here, like Conditional Introduction.'
    },
    {
        element: '#feedback-container',
        intro: 'Feedback on your proof will be displayed here.'
    }
];

export const folTutorialSteps = [
    {
        element: '#wff-construction-area',
        intro: 'This tutorial will introduce you to the new features for First-Order Logic (FOL).',
    },
    {
        element: '#fol-logic-accordion',
        intro: 'This is the First-Order Logic section. It contains tools for building FOL formulas.'
    },
    {
        element: '.fol-predicate',
        intro: 'Drag these predicates to build atomic formulas.'
    },
    {
        element: '.fol-variable',
        intro: 'These are FOL variables.'
    },
    {
        element: '[data-connective="∀"], [data-connective="∃"]',
        intro: 'Use these quantifiers to bind variables in your formulas.'
    },
    {
        element: '[data-rule="UI"], [data-rule="EE"], [data-rule="EI"]',
        intro: 'These are the new inference rules for FOL.'
    }
];

export function startTutorial(tutorial) {
    const intro = introJs();
    intro.setOptions({
        steps: tutorial,
        showProgress: true,
        showBullets: false
    });
    intro.start();
}

export function hasSeenTutorial(tutorialName) {
    return localStorage.getItem(tutorialName);
}

export function markTutorialAsSeen(tutorialName) {
    localStorage.setItem(tutorialName, 'true');
}