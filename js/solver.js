// =====================================================
// Rubik Solver Pro
// js/solver.js (Advanced & Complete Integrated Code)
// =====================================================

let solutionMoves = [];
let solverReady = false;

/**
 * Initialize solver (Run only once)
 */
function initializeSolver() {
    if (solverReady) return true;

    try {
        if (typeof Cube !== 'undefined' && typeof Cube.initSolver === 'function') {
            Cube.initSolver();
            solverReady = true;
            return true;
        } else if (typeof Cube !== 'undefined') {
            // சில Kociemba பதிப்புகளுக்கு initSolver தேவைப்படாது
            solverReady = true;
            return true;
        }
    } catch (err) {
        console.error("Solver Initialization Exception:", err);
    }
    return false;
}

/**
 * [REPLACE & UPGRADE] Convert CubeEngine stickers to 54-character Kociemba String (U R F D L B)
 * Supports both function calls and object properties safely.
 */
function getCubeString() {
    let engine = window.cubeEngine;
    
    // Check if cubeEngine method exists
    if (engine && typeof engine.getCubeString === "function") {
        try {
            const str = engine.getCubeString();
            if (str && str.length === 54) return str;
        } catch (e) {
            console.warn("engine.getCubeString() failed, falling back to manual mapping:", e);
        }
    }

    // Fallback manual mapping if engine property exists
    if (engine && engine.stickers && engine.stickers.length > 0) {
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = "";

        const colorToLetter = {
            "white": "U", "U": "U",
            "yellow": "D", "D": "D",
            "orange": "L", "L": "L",
            "red": "R", "R": "R",
            "green": "F", "F": "F",
            "blue": "B", "B": "B"
        };

        faceOrder.forEach(face => {
            // Use Strollers order from engine if available
            let faceStickers = [];
            if (typeof engine.getStickersForFace === "function") {
                faceStickers = engine.getStickersForFace(face);
            } else {
                faceStickers = engine.stickers.filter(
                    s => s.userData && s.userData.currentFace === face
                );
            }
            
            faceStickers.forEach(item => {
                const sticker = item.mesh || item;
                const rawCol = sticker.userData.color || sticker.userData.initialFace || face;
                cubeString += colorToLetter[rawCol] || rawCol;
            });
        });

        if (cubeString.length === 54) {
            return cubeString;
        }
    }
    return null;
}

/**
 * Solve Cube synchronously and return moves array
 */
function solveCube() {
    initializeSolver();

    const cubeString = getCubeString();

    if (!cubeString || cubeString.length !== 54) {
        console.error("Invalid cube string state or incomplete stickers (Length != 54)");
        return [];
    }

    try {
        if (typeof Cube === 'undefined' || typeof Cube.fromString !== 'function') {
            console.error("Kociemba Cube library is not loaded properly.");
            return [];
        }

        const parsedCube = Cube.fromString(cubeString);
        
        if (parsedCube.isSolved()) {
            solutionMoves = [];
            if (typeof loadSolution === 'function') loadSolution(solutionMoves);
            return [];
        }

        const solution = parsedCube.solve(22);

        if (!solution) {
            console.error("Unable to solve cube layout. Invalid or impossible configuration.");
            return [];
        }

        solutionMoves = solution.trim().split(/\s+/);

        if (typeof loadSolution === 'function') {
            loadSolution(solutionMoves);
        }

        return solutionMoves;
    } catch (err) {
        console.error("Solver Execution Error:", err);
        return [];
    }
}

/**
 * Solve Cube Asynchronously (Non-blocking UI using Promise / setTimeout)
 */
function solveCubeAsync() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            try {
                const moves = solveCube();
                resolve(moves);
            } catch (err) {
                reject(err);
            }
        }, 10);
    });
}

/**
 * Get solution array
 */
function getSolutionMoves() {
    return solutionMoves;
}

/**
 * Reset solver
 */
function resetSolver() {
    solutionMoves = [];
    if (typeof resetPlayer === 'function') {
        resetPlayer();
    }
}

// Export functions for modern module structures or global use
export {
    initializeSolver,
    getCubeString,
    solveCube,
    solveCubeAsync,
    getSolutionMoves,
    resetSolver
};
