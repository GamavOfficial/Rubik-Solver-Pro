import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";

Cube.initSolver();

/* ==========================================
   Rubik Solver Pro - App State
========================================== */

const splashScreen = document.getElementById("splash-screen");
const mainApp = document.getElementById("main-app");
const loadingProgress = document.getElementById("loading-progress");
const toast = document.getElementById("toast");

const appState = {
    currentFace: 0,
    totalFaces: 6,
    selectedColor: "white",
    filledStickers: 0,
    cubeValidated: false,
    solving: false
};

const solverState = {
    solutionMoves: [],
    currentMoveIndex: 0,
    totalMoves: 0,
    isPlaying: false,
    moveQueue: []
};

// UI Elements
const filledCount = document.getElementById("filled-count");
const validateBtn = document.getElementById("validate-btn");
const solveBtn = document.getElementById("solve-btn");
const previousFaceBtn = document.getElementById("previous-face");
const nextFaceBtn = document.getElementById("next-face");
const moveCounterDisplay = document.getElementById("face-counter");

const COLOR_TO_FACE = {
    white: "U",
    red: "R",
    green: "F",
    yellow: "D",
    orange: "L",
    blue: "B"
};

const faceOrderList = ["F", "R", "B", "L", "U", "D"];

/* ==========================================
   Utility & Toast
========================================== */

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

/* ==========================================
   App Initialization & Splash
========================================== */

async function startSplash() {
    let progress = 0;
    while (progress <= 100) {
        loadingProgress.style.width = progress + "%";
        await sleep(20);
        progress++;
    }

    splashScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

    setTimeout(() => {
        if (window.cubeEngine) {
            window.cubeEngine.onResize();
            setupDefaultBlackCube(); // Default All Black
            setEditor2DView();       // Set 2D Editor View
        }
    }, 100);

    showToast("Paint the cube to solve!");
}

window.addEventListener("load", () => {
    startSplash();
});

/* ==========================================
   Color Picker Counter Logic
========================================== */

const colorButtons = document.querySelectorAll(".color-btn");
const colorCounters = {
    white: document.getElementById("count-white"),
    yellow: document.getElementById("count-yellow"),
    red: document.getElementById("count-red"),
    orange: document.getElementById("count-orange"),
    blue: document.getElementById("count-blue"),
    green: document.getElementById("count-green")
};

const colorUsage = {
    white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0
};

setActiveColor("white");

colorButtons.forEach(button => {
    button.addEventListener("click", () => {
        setActiveColor(button.dataset.color);
    });
});

function setActiveColor(color) {
    appState.selectedColor = color;
    colorButtons.forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.querySelector(`[data-color="${color}"]`);
    if (activeBtn) activeBtn.classList.add("active");
}

function updateColorCounters() {
    Object.keys(colorUsage).forEach(color => {
        if (colorCounters[color]) {
            colorCounters[color].textContent = `${colorUsage[color]}/9`;
        }
        const button = document.querySelector(`[data-color="${color}"]`);
        if (button) button.disabled = colorUsage[color] >= 9;
    });
}

/* ==========================================
   CubeEngine Setup (Black Cube & 2D View)
========================================== */

const viewer = document.getElementById("viewer");
const cubeEngine = new CubeEngine({ turnSpeed: 200 });
cubeEngine.initialize(viewer);
window.cubeEngine = cubeEngine;

// 1. Default-ஆக அனைத்து பக்கங்களும் Black (Unpainted) ஆக்குதல்
function setupDefaultBlackCube() {
    if (cubeEngine.resetToBlack) {
        cubeEngine.resetToBlack();
    } else if (cubeEngine.stickers) {
        cubeEngine.stickers.forEach(s => {
            cubeEngine.setStickerColor(s, "NONE"); // or 'black'
        });
    }
    appState.filledStickers = 0;
    updateFilledCounter();
}

// 2. Editor Mode-ல் Face 2D Flat-ஆகத் தெரிய
function setEditor2DView() {
    const targetFace = faceOrderList[appState.currentFace];
    if (cubeEngine.setOrthographicView) {
        cubeEngine.setOrthographicView(targetFace);
    } else {
        cubeEngine.navigateToFace(targetFace);
    }
}

// Sticker Tap Event Handler
cubeEngine.onStickerTapped = function(sticker) {
    if (appState.solving) return; // Solve பண்ணும்போது Color மாற்றக்கூடாது

    const activeColorKey = appState.selectedColor;
    const faceLetter = COLOR_TO_FACE[activeColorKey];
    const currentStickerColor = sticker.userData.color;

    if (currentStickerColor !== faceLetter) {
        if (colorUsage[activeColorKey] >= 9) {
            showToast(`${activeColorKey} limit reached (9/9)`);
            return;
        }

        if (currentStickerColor) {
            const oldColorKey = Object.keys(COLOR_TO_FACE).find(k => COLOR_TO_FACE[k] === currentStickerColor);
            if (oldColorKey && colorUsage[oldColorKey] > 0) {
                colorUsage[oldColorKey]--;
            }
        }

        cubeEngine.setStickerColor(sticker, faceLetter);
        colorUsage[activeColorKey]++;

        updateFilledCounter();
        updateValidateButton();
        updateColorCounters();
    }
};

function updateFilledCounter() {
    const total = cubeEngine.getTotalStickersCompletedCount ? cubeEngine.getTotalStickersCompletedCount() : Object.values(colorUsage).reduce((a, b) => a + b, 0);
    appState.filledStickers = total;
    if (filledCount) filledCount.textContent = `${total} / 54`;
}

function updateValidateButton() {
    validateBtn.disabled = appState.filledStickers !== 54;
}

/* ==========================================
   Validation & 3D Solve Switch
========================================== */

validateBtn.addEventListener("click", () => {
    if (appState.filledStickers !== 54) {
        showToast("Complete all 54 stickers.");
        return;
    }
    appState.cubeValidated = true;
    solveBtn.disabled = false;
    solveBtn.classList.remove("hidden");
    showToast("Cube validated! Click Solve.");
});

solveBtn.addEventListener("click", () => {
    if (!appState.cubeValidated) {
        showToast("Validate cube first.");
        return;
    }
    solveCube();
});

async function solveCube() {
    try {
        const cubeString = cubeEngine.getCubeString();

        if (!cubeString || cubeString.length !== 54) {
            showToast("Invalid Cube State!");
            return;
        }

        const cube = Cube.fromString(cubeString);

        if (cube.isSolved()) {
            showToast("Cube is already solved!");
            return;
        }

        const solution = cube.solve(22);

        if (solution) {
            solverState.solutionMoves = solution.trim().split(/\s+/);
            solverState.totalMoves = solverState.solutionMoves.length;
            solverState.currentMoveIndex = 0;
            solverState.moveQueue = [];

            appState.solving = true;

            // Solve Animation-க்கு Perspective 3D View-க்கு மாற்றுதல்
            if (cubeEngine.setPerspective3DView) {
                cubeEngine.setPerspective3DView();
            }

            updateMoveUI();
            showToast(`Solution found! Steps: ${solverState.totalMoves}`);
        } else {
            showToast("No solution found for this configuration.");
        }

    } catch (e) {
        alert("Solver Error: " + e.message);
        console.error(e);
    }
}

/* ==========================================
   Queue Animation Engine
========================================== */

async function processMoveQueue() {
    if (solverState.isPlaying || solverState.moveQueue.length === 0) return;

    solverState.isPlaying = true;
    const direction = solverState.moveQueue.shift();

    if (direction === "next" && solverState.currentMoveIndex < solverState.totalMoves) {
        const move = solverState.solutionMoves[solverState.currentMoveIndex];
        await cubeEngine.applyAlgorithm(move);
        solverState.currentMoveIndex++;
        updateMoveUI();
    } else if (direction === "prev" && solverState.currentMoveIndex > 0) {
        solverState.currentMoveIndex--;
        const move = solverState.solutionMoves[solverState.currentMoveIndex];
        const inverseMove = getInverseMove(move);
        await cubeEngine.applyAlgorithm(inverseMove);
        updateMoveUI();
    }

    solverState.isPlaying = false;

    if (solverState.moveQueue.length > 0) {
        processMoveQueue();
    }
}

function getInverseMove(move) {
    if (move.endsWith("'")) return move.slice(0, -1);
    if (move.endsWith("2")) return move;
    return move + "'";
}

function updateMoveUI() {
    if (moveCounterDisplay) {
        if (appState.solving) {
            moveCounterDisplay.textContent = `${solverState.currentMoveIndex} / ${solverState.totalMoves}`;
        } else {
            moveCounterDisplay.textContent = `${appState.currentFace + 1} / ${appState.totalFaces}`;
        }
    }
}

/* ==========================================
   Next / Previous Button Handlers
========================================== */

nextFaceBtn.addEventListener("click", () => {
    if (appState.solving) {
        // Solve Mode: Step Forward with Queue
        if (solverState.currentMoveIndex < solverState.totalMoves) {
            solverState.moveQueue.push("next");
            processMoveQueue();
        }
    } else {
        // Edit Mode: Move to Next 2D Face
        if (cubeEngine.isAnimating) return;
        if (appState.currentFace >= 5) return;

        appState.currentFace++;
        updateMoveUI();
        setEditor2DView();
    }
});

previousFaceBtn.addEventListener("click", () => {
    if (appState.solving) {
        // Solve Mode: Step Backward with Queue
        if (solverState.currentMoveIndex > 0) {
            solverState.moveQueue.push("prev");
            processMoveQueue();
        }
    } else {
        // Edit Mode: Move to Previous 2D Face
        if (cubeEngine.isAnimating) return;
        if (appState.currentFace <= 0) return;

        appState.currentFace--;
        updateMoveUI();
        setEditor2DView();
    }
});

/* Window Resize */
window.addEventListener("resize", () => {
    if (window.cubeEngine) window.cubeEngine.onResize();
});
