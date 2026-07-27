// =====================================================
// Rubik Solver Pro
// js/solver.js (Complete Integrated Code)
// =====================================================

let solutionMoves = [];
let solverReady = false;

/**
 * Initialize solver (Run only once)
 */
function initializeSolver() {
    if (solverReady) return;

    if (typeof Cube !== 'undefined' && typeof Cube.initSolver === 'function') {
        Cube.initSolver();
        solverReady = true;
    }
}

/**
 * [REPLACE] Convert CubeEngine stickers to 54-character Kociemba String (U R F D L B)
 */
function getCubeString() {
    // Check if cubeEngine and its stickers exist in the global scope
    if (window.cubeEngine && window.cubeEngine.stickers && window.cubeEngine.stickers.length > 0) {
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = "";

        faceOrder.forEach(face => {
            const faceStickers = window.cubeEngine.stickers.filter(
                s => s.userData && s.userData.currentFace === face
            );
            
            faceStickers.forEach(s => {
                cubeString += s.userData.color || face;
            });
        });

        if (cubeString.length === 54) {
            return cubeString;
        }
    }
    return null;
}

/**
 * Solve Cube and return moves array
 */
function solveCube() {
    initializeSolver();

    const cubeString = getCubeString();

    if (!cubeString || cubeString.length !== 54) {
        console.error("Invalid cube string state or incomplete stickers");
        return [];
    }

    try {
        const parsedCube = Cube.fromString(cubeString);
        
        if (parsedCube.isSolved()) {
            return [];
        }

        const solution = parsedCube.solve(22);

        if (!solution) {
            console.error("Unable to solve cube layout");
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

