import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

/* ==========================================
   Rubik Solver Pro - Full Master Engine
========================================== */

// ==========================================
// DOM CORE
// ==========================================

const viewer = document.getElementById("viewer");

const splashScreen = document.getElementById("splash-screen");
const mainApp = document.getElementById("main-app");
const loadingProgress = document.getElementById("loading-progress");
const toast = document.getElementById("toast");

// ==========================================
// CUBE ENGINE INITIALIZATION
// ==========================================

const cubeEngine = new CubeEngine();

cubeEngine.initialize(viewer);

// CubeEngine தான் இனிமேல் Three.js core-ஐ வைத்திருக்கும்.
const scene = cubeEngine.scene;
const camera = cubeEngine.camera;
const renderer = cubeEngine.renderer;

// Main 3D cube root
const rubiksCube = cubeEngine.cubeRoot;

// ==========================================
// KOCIEMBA SOLVER INITIALIZATION
// ==========================================

if (typeof Cube !== "undefined" && Cube.initSolver) {
    try {
        Cube.initSolver();
    } catch (e) {
        console.warn("Cube Solver init issue:", e);
    }
}

// ==========================================
// APP STATE
// ==========================================

const appState = {
    currentFace: 0,
    totalFaces: 6,
    selectedColor: "white",
    filledStickers: 0,
    cubeValidated: false,
    cubeSolved: false,
    solving: false
};

// ==========================================
// GENERAL HELPERS
// ==========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// ==========================================
// SPLASH SCREEN
// ==========================================

async function startSplash() {

    let progress = 0;

    while (progress <= 100) {

        if (loadingProgress) {
            loadingProgress.style.width = progress + "%";
        }

        await sleep(15);
        progress++;
    }

    if (splashScreen) {
        splashScreen.classList.add("hidden");
    }

    if (mainApp) {
        mainApp.classList.remove("hidden");
    }

    setTimeout(() => {

        if (!viewer || !camera || !renderer) {
            return;
        }

        const width = viewer.clientWidth;
        const height = viewer.clientHeight;

        if (width > 0 && height > 0) {

            camera.aspect = width / height;
            camera.updateProjectionMatrix();

            renderer.setSize(width, height);
            renderer.render(scene, camera);
        }

    }, 100);

    showToast("Welcome to Rubik Solver Pro");
}

window.addEventListener("load", () => {
    startSplash();
});

// ==========================================
// THEME SYSTEM
// ==========================================

const themeBtn = document.getElementById("theme-btn");

let currentTheme =
    localStorage.getItem("theme") || "dark";

applyTheme(currentTheme);

if (themeBtn) {

    themeBtn.addEventListener("click", () => {

        currentTheme =
            currentTheme === "dark"
                ? "light"
                : "dark";

        applyTheme(currentTheme);
    });
}

function applyTheme(theme) {

    document.body.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "theme",
        theme
    );

    if (themeBtn) {

        themeBtn.textContent =
            theme === "dark"
                ? "🌙"
                : "☀️";
    }
}

// ==========================================
// COLOR PICKER SYSTEM
// ==========================================

const colorButtons =
    document.querySelectorAll(".color-btn");

const colorCounters = {
    white: document.getElementById("count-white"),
    yellow: document.getElementById("count-yellow"),
    red: document.getElementById("count-red"),
    orange: document.getElementById("count-orange"),
    blue: document.getElementById("count-blue"),
    green: document.getElementById("count-green")
};

const colorUsage = {
    white: 0,
    yellow: 0,
    red: 0,
    orange: 0,
    blue: 0,
    green: 0
};

setActiveColor("white");

colorButtons.forEach(button => {
    button.addEventListener("click", () => {
        const color = button.dataset.color;
        setActiveColor(color);
    });
});

function setActiveColor(color) {

    appState.selectedColor = color;

    colorButtons.forEach(btn =>
        btn.classList.remove("active")
    );

    const activeBtn =
        document.querySelector(
            `[data-color="${color}"]`
        );

    if (activeBtn) {
        activeBtn.classList.add("active");
    }

    if (
        typeof syncActiveColorToEngine ===
        "function"
    ) {
        syncActiveColorToEngine();
    }
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

const filledCount = document.getElementById("filled-count");
const validateBtn = document.getElementById("validate-btn");
const solveBtn = document.getElementById("solve-btn");
const previousFaceBtn = document.getElementById("previous-face");
const nextFaceBtn = document.getElementById("next-face");

const editorPage = document.getElementById("editor-page");
const solverPage = document.getElementById("solver-page");
const solverViewer = document.getElementById("solver-viewer");

const currentMoveLabel = document.getElementById("current-move");
const moveCounterLabel = document.getElementById("move-counter");
const moveProgress = document.getElementById("move-progress");

function updateFaceCounter() {
    const fc = document.getElementById("face-counter");
    const fp = document.getElementById("face-progress");
    if (fc) fc.textContent = `${appState.currentFace + 1} / ${appState.totalFaces}`;
    if (fp) fp.value = appState.currentFace + 1;
}

/* ==========================================
   CUBE ENGINE STATE / VALIDATION BRIDGE
========================================== */

function getEngineStickers() {

    if (!rubiksCube) {
        return [];
    }

    const stickers = [];

    rubiksCube.traverse(object => {

        if (
            object &&
            object.userData &&
            object.userData.color !== undefined
        ) {
            stickers.push(object);
        }

    });

    return stickers;
}

function rebuildColorUsage() {

    Object.keys(colorUsage).forEach(color => {
        colorUsage[color] = 0;
    });

    const stickers = getEngineStickers();

    stickers.forEach(sticker => {

        const faceCode =
            sticker.userData.color;

        const colorName =
            faceToColorName[faceCode];

        if (
            colorName &&
            colorUsage[colorName] !== undefined
        ) {
            colorUsage[colorName]++;
        }

    });
}

function updateFilledCounter() {

    rebuildColorUsage();

    let total = 0;

    Object.values(colorUsage).forEach(count => {
        total += count;
    });

    appState.filledStickers = total;

    if (filledCount) {
        filledCount.textContent =
            `${total} / 54`;
    }
}

function updateValidateButton() {

    if (!validateBtn) {
        return;
    }

    validateBtn.disabled =
        appState.filledStickers !== 54;
}

function validateCube() {

    rebuildColorUsage();

    let totalStickers = 0;

    Object.values(colorUsage).forEach(count => {
        totalStickers += count;
    });

    appState.filledStickers =
        totalStickers;

    if (filledCount) {
        filledCount.textContent =
            `${totalStickers} / 54`;
    }

    if (totalStickers !== 54) {

        showToast(
            "Fill all 54 stickers first."
        );

        appState.cubeValidated = false;

        return false;
    }

    const colors = [
        "white",
        "yellow",
        "red",
        "orange",
        "blue",
        "green"
    ];

    for (const color of colors) {

        if (colorUsage[color] !== 9) {

            showToast(
                `Each color must be exactly 9! ${color}: ${colorUsage[color]}`
            );

            appState.cubeValidated = false;

            return false;
        }
    }

    appState.cubeValidated = true;

    showToast(
        "Validation successful!"
    );

    return true;
}

if (validateBtn) {

    validateBtn.addEventListener(
        "click",
        () => {

            if (!validateCube()) {
                return;
            }

            if (solveBtn) {

                solveBtn.disabled = false;

                solveBtn.classList.remove(
                    "hidden"
                );
            }
        }
    );
}

if (solveBtn) {
    solveBtn.addEventListener("click", () => {
        if (!appState.cubeValidated) {
            showToast("Validate face first.");
            return;
        }
        solveCube();
    });
}

/* ==========================================
   CUBE ENGINE BRIDGE
   CubeEngine is the single 3D source
========================================== */

// ------------------------------------------
// Color name <-> Cube face conversion
// ------------------------------------------

const colorNameToFace = {
    white: "U",
    yellow: "D",
    orange: "L",
    red: "R",
    green: "F",
    blue: "B"
};

const faceToColorName = {
    U: "white",
    D: "yellow",
    L: "orange",
    R: "red",
    F: "green",
    B: "blue"
};

// ------------------------------------------
// Activate currently selected UI color
// inside CubeEngine
// ------------------------------------------

function syncActiveColorToEngine() {

    const faceCode =
        colorNameToFace[appState.selectedColor];

    if (!faceCode) return;

    cubeEngine.activeColor = faceCode;
}

syncActiveColorToEngine();

// ------------------------------------------
// Sticker tap bridge
// ------------------------------------------

cubeEngine.onStickerTapped = function(sticker) {

    if (!sticker) return;

    if (isSolvingAnimation) {
        return;
    }

    const selectedColor =
        appState.selectedColor;

    const selectedFace =
        colorNameToFace[selectedColor];

    if (!selectedFace) {
        return;
    }

    const previousFace =
        sticker.userData.color;

    const previousColor =
        faceToColorName[previousFace];

    // Same color already applied
    if (previousFace === selectedFace) {
        return;
    }

    // Selected color maximum = 9
    if (
        colorUsage[selectedColor] >= 9
    ) {
        showToast(
            selectedColor +
            " limit reached (9/9)"
        );

        return;
    }

    // Remove previous color usage
    if (
        previousColor &&
        colorUsage[previousColor] > 0
    ) {
        colorUsage[previousColor]--;
    }

    // Apply new sticker color through CubeEngine
    cubeEngine.setStickerColor(
        sticker,
        selectedFace
    );

    colorUsage[selectedColor]++;

    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();

    showToast(
        selectedColor +
        " Applied"
    );
};

// ------------------------------------------
// State change callback
// ------------------------------------------

cubeEngine.onStateChanged = function() {

    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();
};

// ------------------------------------------
// Cube view rotation controller
// ------------------------------------------

const cubeRotation =
    new CubeRotation(cubeEngine.world);

// CubeEngine already owns its own
// requestAnimationFrame render loop.
// DO NOT create another animate() loop here.

const faceRotations = [null, "right", "up", "right", "right", "up"];

if (nextFaceBtn) {
    nextFaceBtn.addEventListener("click", () => {
        if (cubeRotation.isAnimating() || appState.currentFace >= 5) return;
        appState.currentFace++;
        const move = faceRotations[appState.currentFace];
        if (move) cubeRotation.rotate(move);
        updateFaceCounter();
    });
}

if (previousFaceBtn) {
    previousFaceBtn.addEventListener("click", () => {
        if (cubeRotation.isAnimating() || appState.currentFace <= 0) return;
        const move = faceRotations[appState.currentFace];
        if (move === "right") cubeRotation.rotate("left");
        else if (move === "up") cubeRotation.rotate("down");
        appState.currentFace--;
        updateFaceCounter();
    });
}

window.addEventListener("resize", resizeRenderer);

/* ==========================================
   CUBE ENGINE STATE READER
========================================== */

function getStickerFaceCode(sticker) {

    if (
        !sticker ||
        !sticker.userData
    ) {
        return null;
    }

    return sticker.userData.color || null;
}

function getCubeString() {

    const stickers =
        getEngineStickers();

    if (stickers.length !== 54) {
        throw new Error(
            `Expected 54 stickers, found ${stickers.length}`
        );
    }

    const faceGroups = {
        U: [],
        R: [],
        F: [],
        D: [],
        L: [],
        B: []
    };

    stickers.forEach(sticker => {

        const data =
            sticker.userData;

        if (!data) {
            return;
        }

        const face =
    data.currentFace ||
    data.initialFace;

        if (
            face &&
            faceGroups[face]
        ) {
            faceGroups[face].push(
                sticker
            );
        }
    });

    const faces = [
        "U",
        "R",
        "F",
        "D",
        "L",
        "B"
    ];

    for (const face of faces) {

        if (
            faceGroups[face].length !== 9
        ) {
            throw new Error(
                `Face ${face} does not contain 9 stickers`
            );
        }
    }

    let cubeString = "";

    for (const face of faces) {

        const faceStickers =
            faceGroups[face];

        faceStickers.sort((a, b) => {

    const ag = a.userData.grid;
    const bg = b.userData.grid;

    function getOrder(g) {

        switch (face) {

            case "U":
                return (g.z + 1) * 3 + (g.x + 1);

            case "R":
                return (1 - g.y) * 3 + (1 - g.z);

            case "F":
                return (1 - g.y) * 3 + (g.x + 1);

            case "D":
                return (1 - g.z) * 3 + (g.x + 1);

            case "L":
                return (1 - g.y) * 3 + (g.z + 1);

            case "B":
                return (1 - g.y) * 3 + (1 - g.x);

            default:
                return 0;
        }
    }

    return getOrder(ag) - getOrder(bg);
});

        for (const sticker of faceStickers) {

            const colorCode =
                getStickerFaceCode(
                    sticker
                );

            if (!colorCode) {
                throw new Error(
                    `Unpainted sticker found on face ${face}`
                );
            }

            cubeString +=
                colorCode;
        }
    }

    if (cubeString.length !== 54) {
        throw new Error(
            `Invalid cube string length: ${cubeString.length}`
        );
    }

    return cubeString;
}

function resizeRenderer() {
    const activeViewer = solverPage && !solverPage.classList.contains("hidden") ? solverViewer : viewer;
    if (!activeViewer) return;

    camera.aspect = activeViewer.clientWidth / activeViewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(activeViewer.clientWidth, activeViewer.clientHeight);
}

function showSolverPage() {
    if (editorPage) editorPage.classList.add("hidden");
    if (solverPage) solverPage.classList.remove("hidden");

    if (solverViewer && renderer.domElement.parentNode !== solverViewer) {
        solverViewer.appendChild(renderer.domElement);
    }

    resizeRenderer();
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
}

/* ==========================================
   SOLVER CONTROLLER & PLAYBACK ENGINE
========================================== */
let isSolvingAnimation = false;
let solutionMoves = [];
let currentMoveIndex = 0;
let isPlaying = false;
let isTurnAnimating = false;
let autoPlayTimer = null;

async function solveCube() {
    if (isSolvingAnimation) return;

    try {
        if (typeof Cube === 'undefined') {
            showToast("Solver library not loaded!");
            return;
        }

        const cubeString = getCubeString();
        console.log("Generated Kociemba String:", cubeString);

        showToast("Calculating Solution...");
        showSolverPage();
        isSolvingAnimation = true;
        if (solveBtn) solveBtn.disabled = true;
        if (validateBtn) validateBtn.disabled = true;

        rubiksCube.quaternion.set(0, 0, 0, 1);
        appState.currentFace = 0;
        updateFaceCounter();

        setTimeout(() => {
            try {
                const cube = Cube.fromString(cubeString);

                if (cube.isSolved()) {
                    showToast("Cube is already solved!");
                    resetSolveState();
                    return;
                }

                const solution = cube.solve(22);
                console.log("Solution:", solution);

                if (!solution || solution.trim() === "") {
                    showToast("Cube is already solved!");
                    resetSolveState();
                    return;
                }

                solutionMoves = solution.trim().split(/\s+/);
                currentMoveIndex = 0;
                updateMoveUI();
                showToast(`Solved in ${solutionMoves.length} moves!`);

                // Auto Play directly on solve
                startAutoPlay();

            } catch (solveErr) {
                console.error("Solve Execution Error:", solveErr);
                showToast("Invalid Cube Layout! Please check sticker colors.");
                resetSolveState();
            }
        }, 150);

    } catch (e) {
        console.error("String Build Error:", e.message);
        showToast(e.message || "Ensure all 54 stickers are filled!");
        resetSolveState();
    }
}

function updateMoveUI() {
    const total = solutionMoves.length;
    if (total === 0) {
        if (currentMoveLabel) currentMoveLabel.textContent = "-";
        if (moveCounterLabel) moveCounterLabel.textContent = "0 / 0";
        if (moveProgress) { moveProgress.max = 1; moveProgress.value = 0; }
        return;
    }

    const activeMove = currentMoveIndex < total ? solutionMoves[currentMoveIndex] : "DONE";
    if (currentMoveLabel) {
        currentMoveLabel.textContent = activeMove;
    }
    if (moveCounterLabel) {
        moveCounterLabel.textContent = `${currentMoveIndex} / ${total}`;
    }
    if (moveProgress) {
        moveProgress.max = total;
        moveProgress.value = currentMoveIndex;
    }
}

function resetSolveState() {
    isSolvingAnimation = false;
    isPlaying = false;
    if (solveBtn) solveBtn.disabled = false;
    if (validateBtn) validateBtn.disabled = false;
}

function getInverseMove(move) {
    if (!move) return "";
    if (move.endsWith("'")) return move.slice(0, -1);
    if (move.endsWith("2")) return move;
    return move + "'";
}

function stepForward(callback) {
    if (isTurnAnimating) {
        if (callback) callback(false);
        return;
    }

    if (currentMoveIndex >= solutionMoves.length) {
        isPlaying = false;
        if (callback) callback(false);
        return;
    }

    isTurnAnimating = true;

    const move = solutionMoves[currentMoveIndex];

    const finishMove = () => {
        currentMoveIndex++;
        isTurnAnimating = false;
        updateMoveUI();

        if (currentMoveIndex >= solutionMoves.length) {
            isPlaying = false;
            showToast("Cube Solved Successfully! 🎉");
            appState.cubeSolved = true;
            resetSolveState();
        }

        if (callback) callback(true);
    };

    if (move.endsWith("2")) {
        const singleMove = move[0];

        rotateSlice(singleMove, () => {
            rotateSlice(singleMove, finishMove);
        });

        return;
    }

    rotateSlice(move, finishMove);
}

function stepBackward(callback) {
    if (isTurnAnimating) {
        if (callback) callback(false);
        return;
    }

    if (currentMoveIndex <= 0) {
        if (callback) callback(false);
        return;
    }

    if (isPlaying) {
        pauseAutoPlay();
    }

    isTurnAnimating = true;

    const lastMove =
        solutionMoves[currentMoveIndex - 1];

    const finishBackward = () => {
        currentMoveIndex--;
        isTurnAnimating = false;
        updateMoveUI();

        if (callback) {
            callback(true);
        }
    };

    // R2, U2, F2, L2, D2, B2
    // இரண்டு 90° turns ஆக reverse செய்யும்
    if (lastMove.endsWith("2")) {
        const singleMove = lastMove[0];

        rotateSlice(singleMove, () => {
            rotateSlice(singleMove, finishBackward);
        });

        return;
    }

    const inverseMove =
        getInverseMove(lastMove);

    rotateSlice(
        inverseMove,
        finishBackward
    );
}

function startAutoPlay() {
    if (isPlaying || currentMoveIndex >= solutionMoves.length) return;

    isPlaying = true;
    showToast("Playing...");

    function autoStep() {
        if (!isPlaying || currentMoveIndex >= solutionMoves.length) {
            isPlaying = false;
            return;
        }

        stepForward((success) => {
            if (success && isPlaying && currentMoveIndex < solutionMoves.length) {
                autoPlayTimer = setTimeout(autoStep, 220);
            } else {
                isPlaying = false;
            }
        });
    }

    autoStep();
}

function pauseAutoPlay() {
    isPlaying = false;
    if (autoPlayTimer) {
        clearTimeout(autoPlayTimer);
        autoPlayTimer = null;
    }
    showToast("Paused");
}

/* ==========================================
   ROBUST EXPLICIT DOM BINDINGS FOR PLAY/PAUSE/PREV/NEXT
========================================== */
const playBtn = document.getElementById("play-btn") || document.querySelector(".play-btn") || document.querySelector("[data-action='play']");
const pauseBtn = document.getElementById("pause-btn") || document.querySelector(".pause-btn") || document.querySelector("[data-action='pause']");
const nextStepBtn = document.getElementById("next-step-btn") || document.getElementById("next-move") || document.querySelector(".next-btn") || document.querySelector("[data-action='next']");
const prevStepBtn = document.getElementById("prev-step-btn") || document.getElementById("prev-move") || document.querySelector(".prev-btn") || document.querySelector("[data-action='prev']");

if (playBtn) {
    playBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startAutoPlay();
    });
}

if (pauseBtn) {
    pauseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        pauseAutoPlay();
    });
}

if (nextStepBtn) {
    nextStepBtn.addEventListener("click", (e) => {
        e.preventDefault();
        pauseAutoPlay();
        stepForward();
    });
}

if (prevStepBtn) {
    prevStepBtn.addEventListener("click", (e) => {
        e.preventDefault();
        pauseAutoPlay();
        stepBackward();
    });
}

// Fallback / Supplemental Global Event Delegation for dynamic buttons
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button, a, div, span");
    if (!btn) return;

    const id = (btn.id || "").toLowerCase();
    const text = (btn.innerText || btn.textContent || "").toLowerCase().trim();
    const cls = (btn.className || "").toLowerCase();

    // Avoid double triggering if explicit ID listeners already caught it
    if (btn === playBtn || btn === pauseBtn || btn === nextStepBtn || btn === prevStepBtn) return;

    // Check Previous Button
    if (id.includes("prev") || text.includes("previous") || text.includes("prev") || text.includes("<<") || cls.includes("prev")) {
        e.preventDefault();
        pauseAutoPlay();
        stepBackward();
        return;
    }

    // Check Next Button
    if (id.includes("next") || text.includes("next") || text.includes(">>") || cls.includes("next")) {
        e.preventDefault();
        pauseAutoPlay();
        stepForward();
        return;
    }

    // Check Play Button
    if (id.includes("play") || text.includes("play") || text.includes("▶") || cls.includes("play")) {
        e.preventDefault();
        startAutoPlay();
        return;
    }

    // Check Pause Button
    if (id.includes("pause") || text.includes("pause") || text.includes("⏸") || cls.includes("pause")) {
        e.preventDefault();
        pauseAutoPlay();
        return;
    }
});

/* ==========================================
   3D SLICE ROTATION ENGINE
========================================== */
function rotateSlice(moveStr, callback) {
    if (!moveStr) {
        if (callback) callback();
        return;
    }

    const face = moveStr[0];
    const modifier = moveStr.slice(1);

    let axis = cubeEngine.faceAxis[face];
let layerVal = cubeEngine.faceLayer[face] * cubeEngine.size.gap;
let baseAngle = 0;

switch (face) {
    case "U":
        baseAngle = -Math.PI / 2;
        break;

    case "D":
        baseAngle = Math.PI / 2;
        break;

    case "R":
        baseAngle = -Math.PI / 2;
        break;

    case "L":
        baseAngle = Math.PI / 2;
        break;

    case "F":
        baseAngle = -Math.PI / 2;
        break;

    case "B":
        baseAngle = Math.PI / 2;
        break;

    default:
        if (callback) callback();
        return;
}

    let angle = baseAngle;

if (modifier === "'") {
    angle = -baseAngle;
}

    const pivot = new THREE.Group();
    rubiksCube.add(pivot);

    const targets = [];
    rubiksCube.children.forEach(cubie => {
        if (cubie !== pivot && Math.abs(cubie.position[axis] - layerVal) < 0.2) {
            targets.push(cubie);
        }
    });

    if (targets.length === 0) {
        rubiksCube.remove(pivot);
        if (callback) callback();
        return;
    }

    targets.forEach(c => pivot.attach(c));

    let start = null;
    const duration = 180; // Animation speed in ms

    function animateTurn(timestamp) {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);

        pivot.rotation[axis] = angle * progress;

        if (progress < 1) {
            requestAnimationFrame(animateTurn);
        } else {
            pivot.rotation[axis] = angle;
            pivot.updateMatrixWorld();

            const cell = cubeEngine.size.gap;

            targets.forEach(c => {
    rubiksCube.attach(c);

    c.position.x =
        Math.round(c.position.x / cell) * cell;

    c.position.y =
        Math.round(c.position.y / cell) * cell;

    c.position.z =
        Math.round(c.position.z / cell) * cell;

    if (!c.userData.grid) {
        c.userData.grid = {};
    }

    c.userData.grid.x =
        Math.round(c.position.x / cell);

    c.userData.grid.y =
        Math.round(c.position.y / cell);

    c.userData.grid.z =
        Math.round(c.position.z / cell);
});

            rubiksCube.remove(pivot);
            if (callback) callback();
        }
    }

    requestAnimationFrame(animateTurn);
}
