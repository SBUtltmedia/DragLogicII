
// Global state variables
let gameWrapper, wffOutputTray, draggableVariables, connectiveHotspots,
    trashCanDropArea, ruleItems, proofList, proofFeedbackDiv, subGoalDisplayContainer, gameTitle,
    prevFeedbackBtn, nextFeedbackBtn, zoomInWffBtn, zoomOutWffBtn;

let firstOperandWFF = null;
let waitingConnectiveWFF = null;
let draggedElementForRemoval = null;

let nextLineNumberGlobal = 1;
let currentScopeLevel = 0;
let subGoalStack = [];
let premises = [];
let goalFormula = "";
let currentProblem = {};

// KMM Specifics
let denotingTerms = []; // Terms that are currently considered to denote

// Feedback and Zoom State
let feedbackHistory = [];
let currentFeedbackIndex = -1;
let wffTrayFontSize = 2.4;
const FONT_SIZE_STEP = 0.2;
const MIN_FONT_SIZE = 0.6;
const MAX_FONT_SIZE = 4.0;
