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
 * Convert 3D Cube / Editor State to 54-character Kociemba String (U R F D L B)
 */
function getCubeString() {
    if (!window.cubeState && !window.rubiksCubeGroup) {
        return null;
    }

    // Kociemba Algorithm-க்கு தேவையான சரியான பக்க வரிசை (U -> R -> F -> D -> L -> B)
    const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
    let cubeString = "";

    // Editor-இல் உள்ள 6 பக்கங்களின் தரவுகளை URFDLB வரிசையில் இணைத்தல்
    if (window.cubeState) {
        faceOrder.forEach(face => {
            if (window.cubeState[face]) {
                window.cubeState[face].forEach(sticker => {
                    cubeString += sticker; // U, R, F, D, L, B எழுத்துகள்
                });
            }
        });
    }

    return cubeString;
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
