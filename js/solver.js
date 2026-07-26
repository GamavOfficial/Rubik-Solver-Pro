// =======================================
// Rubik Solver Pro
// js/solver.js
// =======================================

let solutionMoves = [];
let solverReady = false;

/**
 * Initialize solver (Run only once)
 */
function initializeSolver() {
    if (solverReady) return;

    if (typeof Cube !== 'undefined' && Cube.initSolver) {
        Cube.initSolver();
        solverReady = true;
    }
}

/**
 * /**
 * Convert 3D Cube / Editor State to 54-character Kociemba String (U R F D L B)
 */
function getCubeString() {
    // 1. window.cubeEngine மூலம் 3D Cube Engine-இல் இருந்து String-ஐப் பெறுதல்
    if (window.cubeEngine && typeof window.cubeEngine.getCubeString === 'function') {
        try {
            return window.cubeEngine.getCubeString();
        } catch (e) {
            console.warn("CubeEngine getCubeString error:", e);
        }
    }

    // 2. 3D Engine இல்லையெனில் Fallback-ஆக window.cubeState-ஐப் பயன்படுத்துதல்
    if (window.cubeState) {
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = "";

        faceOrder.forEach(face => {
            if (window.cubeState[face]) {
                window.cubeState[face].forEach(sticker => {
                    cubeString += sticker;
                });
            }
        });

        return cubeString;
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
        console.error("Invalid cube string state");
        alert("க்யூப் தரவு தவறாக உள்ளது!");
        return [];
    }

    try {
        const parsedCube = Cube.fromString(cubeString);
        const solution = parsedCube.solve(22);

        if (!solution) {
            console.error("Unable to solve cube");
            return [];
        }

        solutionMoves = solution.trim().split(/\s+/);

        if (typeof loadSolution === 'function') {
            loadSolution(solutionMoves);
        }

        return solutionMoves;
    } catch (err) {
        console.error("Solver Execution Error:", err);
        alert("க்யூப்பைத் தீர்ப்பதில் பிழை: " + err.message);
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
