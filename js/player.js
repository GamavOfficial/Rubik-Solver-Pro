// ===============================================
// Rubik Solver Pro
// player.js (Advanced & Complete Upgraded Code)
// ===============================================

let currentStep = 0;
let moves = [];
let isAutoPlaying = false;
let autoPlayTimer = null;

/**
 * Load solution moves (Supports both Array and Space-separated String)
 */
function loadSolution(solution) {
    stopAutoPlay();
    if (Array.isArray(solution)) {
        moves = solution.filter(m => m && typeof m === "string" && m.trim() !== "");
    } else if (typeof solution === "string" && solution.trim() !== "") {
        moves = solution.trim().split(/\s+/);
    } else {
        moves = [];
    }
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
 * Get current move string
 */
function getCurrentMove() {
    if (moves.length === 0 || currentStep < 0 || currentStep >= moves.length) {
        return null;
    }
    return moves[currentStep];
}

/**
 * Move to next step and return the move
 */
function nextStep() {
    if (currentStep < moves.length - 1) {
        currentStep++;
        return getCurrentMove();
    }
    return null;
}

/**
 * Move to previous step and return the move
 */
function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        return getCurrentMove();
    }
    return null;
}

/**
 * Check if player is at the first step
 */
function isFirstStep() {
    return currentStep === 0;
}

/**
 * Check if player is at the last step
 */
function isLastStep() {
    return moves.length === 0 || currentStep >= moves.length - 1;
}

/**
 * Reset player to initial state
 */
function resetPlayer() {
    stopAutoPlay();
    currentStep = 0;
    moves = [];
}

/**
 * Jump to a specific step index safely
 */
function jumpToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < moves.length) {
        currentStep = stepIndex;
        return getCurrentMove();
    }
    return null;
}

/**
 * Start automatic playback of solution moves
 */
function startAutoPlay(cubeEngine, intervalMs = 400, onStepPlayed = null) {
    if (isAutoPlaying || moves.length === 0) return;
    isAutoPlaying = true;

    autoPlayTimer = setInterval(() => {
        if (isLastStep()) {
            stopAutoPlay();
            return;
        }
        const move = nextStep();
        if (move && cubeEngine && typeof cubeEngine.enqueue === "function") {
            cubeEngine.enqueue(move);
        }
        if (typeof onStepPlayed === "function") {
            onStepPlayed(currentStep, move);
        }
    }, intervalMs);
}

/**
 * Stop automatic playback
 */
function stopAutoPlay() {
    if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
        autoPlayTimer = null;
    }
    isAutoPlaying = false;
}

/**
 * Check if auto play is active
 */
function getAutoPlayStatus() {
    return isAutoPlaying;
}

// Export functions for module systems or global window use
export {
    loadSolution,
    getCurrentStep,
    getTotalSteps,
    getCurrentMove,
    nextStep,
    previousStep,
    isFirstStep,
    isLastStep,
    resetPlayer,
    jumpToStep,
    startAutoPlay,
    stopAutoPlay,
    getAutoPlayStatus
};
