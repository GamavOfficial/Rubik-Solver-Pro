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
    // 1. window.getCubeString ஃபங்க்ஷன் இருந்தால் அதை முதன்மையாகப் பயன்படுத்துதல்
    if (typeof window.getCubeString === 'function') {
        try {
            return window.getCubeString();
        } catch (e) {
            console.warn("Global getCubeString error:", e);
        }
    }

    // 2. window.cubeEngine மூலம் 3D Cube Engine-இல் இருந்து String-ஐப் பெறுதல்
    if (window.cubeEngine && typeof window.cubeEngine.getCubeString === 'function') {
        try {
            return window.cubeEngine.getCubeString();
        } catch (e) {
            console.warn("CubeEngine getCubeString error:", e);
        }
    }

    // 3. Fallback: window.cubeState-ஐப் பயன்படுத்துதல்
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
 * Solve Cube and trigger UI & Animation
 */
function solveCube() {
    initializeSolver();

    const cubeString = getCubeString();

    if (!cubeString || cubeString.length !== 54) {
        console.error("Invalid cube string state");
        if (typeof showToast === 'function') {
            showToast("Complete all 54 stickers first!");
        } else {
            alert("க்யூப் தரவு தவறாக உள்ளது!");
        }
        return [];
    }

    try {
        if (typeof Cube === 'undefined') {
            throw new Error("Cube library is not loaded properly.");
        }

        const parsedCube = Cube.fromString(cubeString);

        if (parsedCube.isSolved()) {
            if (typeof showToast === 'function') showToast("Cube is already solved!");
            return [];
        }

        const solution = parsedCube.solve(22);

        if (!solution) {
            console.error("Unable to solve cube");
            if (typeof showToast === 'function') showToast("No solution found!");
            return [];
        }

        solutionMoves = solution.trim().split(/\s+/);
        console.log("Solution found:", solutionMoves);

        // State update & UI Transition
        if (typeof solverState !== 'undefined') {
            solverState.solutionMoves = solutionMoves;
            solverState.totalMoves = solutionMoves.length;
            solverState.currentMoveIndex = 0;
            solverState.moveQueue = [];

            // UI View Transition (Editor -> Solver)
            const editorPage = document.getElementById("editor-page");
            const solverPage = document.getElementById("solver-page");

            if (editorPage && solverPage) {
                editorPage.classList.add("hidden");
                solverPage.classList.remove("hidden");
            }

            // Update UI Elements
            const moveCounter = document.getElementById("move-counter");
            const statsMoves = document.getElementById("stats-moves");
            const algorithmList = document.getElementById("algorithm-list");

            if (moveCounter) moveCounter.textContent = `Move 0 / ${solverState.totalMoves}`;
            if (statsMoves) statsMoves.textContent = solverState.totalMoves;
            if (algorithmList) algorithmList.textContent = solutionMoves.join(" ");

            // Toast message
            if (typeof showToast === 'function') {
                showToast(`Solution found! Total moves: ${solverState.totalMoves}`);
            }

            // Prepare Animation Move Queue
            for (let i = 0; i < solverState.totalMoves; i++) {
                solverState.moveQueue.push("next");
            }

            if (typeof processMoveQueue === 'function') {
                processMoveQueue();
            }
        }

        if (typeof loadSolution === 'function') {
            loadSolution(solutionMoves);
        }

        return solutionMoves;

    } catch (err) {
        console.error("Solver Execution Error:", err);
        if (typeof showToast === 'function') {
            showToast("Solver Error: " + err.message);
        } else {
            alert("க்யூப்பைத் தீர்ப்பதில் பிழை: " + err.message);
        }
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

// Global scope Access (Window Object Binding)
window.solveCube = solveCube;
window.getSolutionMoves = getSolutionMoves;
window.resetSolver = resetSolver;
