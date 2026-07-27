// ===============================================
// Rubik Solver Pro
// player.js (Complete Code)
// ===============================================

let currentStep = 0;
let moves = [];

/**
 * Load solution moves
 */
function loadSolution(solution) {
    moves = Array.isArray(solution) ? solution : [];
    currentStep = 0;
}

/**
 * Get current step index
 */
function getCurrentStep() {
    return currentStep;
}

/**
 * Get total steps
 */
function getTotalSteps() {
    return moves.length;
}

/**
 * Get current move
 */
function getCurrentMove() {
    if (moves.length === 0)
        return null;

    return moves[currentStep];
}

/**
 * Next step
 */
function nextStep() {
    if (currentStep < moves.length - 1) {
        currentStep++;
    }
    return getCurrentMove();
}

/**
 * Previous step
 */
function previousStep() {
    if (currentStep > 0) {
        currentStep--;
    }
    return getCurrentMove();
}

/**
 * First step?
 */
function isFirstStep() {
    return currentStep === 0;
}

/**
 * Last step?
 */
function isLastStep() {
    return currentStep === moves.length - 1;
}

/**
 * Reset player
 */
function resetPlayer() {
    currentStep = 0;
    moves = [];
}
