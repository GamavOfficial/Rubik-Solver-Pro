import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

const viewer = document.getElementById("viewer");

const cubeEngine = new CubeEngine();

cubeEngine.initialize(viewer);

/* ==========================================
   Rubik Solver Pro - Full Master Engine
========================================== */

// Kociemba Solver Initialization
if (typeof Cube !== 'undefined' && Cube.initSolver) {
    try {
        Cube.initSolver();
    } catch (e) {
        console.warn("Cube Solver init issue:", e);
    }
}

// DOM Elements
const splashScreen = document.getElementById("splash-screen");
const mainApp = document.getElementById("main-app");
const loadingProgress = document.getElementById("loading-progress");
const toast = document.getElementById("toast");

// App State
const appState = {
    currentFace: 0,
    totalFaces: 6,
    selectedColor: "white",
    filledStickers: 0,
    cubeValidated: false,
    cubeSolved: false,
    solving: false
};

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

// Splash Screen
async function startSplash() {
    let progress = 0;
    while (progress <= 100) {
        if (loadingProgress) loadingProgress.style.width = progress + "%";
        await sleep(15);
        progress++;
    }

    if (splashScreen) splashScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");

    setTimeout(() => {
        camera.aspect = viewer.clientWidth / viewer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewer.clientWidth, viewer.clientHeight);
        renderer.render(scene, camera);
    }, 100);

    showToast("Welcome to Rubik Solver Pro");
}

window.addEventListener("load", () => {
    startSplash();
});

// Theme System
const themeBtn = document.getElementById("theme-btn");
let currentTheme = localStorage.getItem("theme") || "dark";
applyTheme(currentTheme);

if (themeBtn) {
    themeBtn.addEventListener("click", () => {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(currentTheme);
    });
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    if (themeBtn) themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

// Color Picker System
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

function updateFilledCounter() {
    let total = 0;
    rubiksCube.children.forEach(cubie => {
        if (cubie.userData && cubie.userData.painted) {
            cubie.userData.painted.forEach(color => {
                if (color !== null) total++;
            });
        }
    });

    appState.filledStickers = total;
    if (filledCount) filledCount.textContent = `${total} / 54`;
}

function updateValidateButton() {
    if (validateBtn) validateBtn.disabled = appState.filledStickers !== 54;
}

function validateCube() {
    const counts = { white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0 };
    let totalStickers = 0;

    rubiksCube.children.forEach(cubie => {
        if (cubie.userData && cubie.userData.painted) {
            cubie.userData.painted.forEach(color => {
                if (color !== null) {
                    totalStickers++;
                    if (color in counts) counts[color]++;
                }
            });
        }
    });

    if (totalStickers !== 54) {
        showToast("Fill all 54 stickers first.");
        return false;
    }

    for (const color of Object.keys(counts)) {
        if (counts[color] !== 9) {
            showToast(`Each color must be exactly 9! ${color}: ${counts[color]}`);
            return false;
        }
    }

    appState.cubeValidated = true;
    showToast("Validation successful!");
    return true;
}

if (validateBtn) {
    validateBtn.addEventListener("click", () => {
        if (validateCube()) {
            if (solveBtn) {
                solveBtn.disabled = false;
                solveBtn.classList.remove("hidden");
            }
        }
    });
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

// Three.js Scene Setup
const viewer = document.getElementById("viewer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101826);

const camera = new THREE.PerspectiveCamera(35, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
if (viewer) viewer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

// Rubik's Cube Mesh Group
const rubiksCube = new THREE.Group();
const cubieSize = 0.95;
const gap = 0.05;

const colorMap = {
    white: 0xffffff,
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    blue: 0x0000ff,
    green: 0x00aa00
};

for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
            const materials = Array(6).fill().map(() => new THREE.MeshStandardMaterial({ color: 0x222222 }));
            const cubie = new THREE.Mesh(new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize), materials);
            cubie.position.set(x * (cubieSize + gap), y * (cubieSize + gap), z * (cubieSize + gap));

            cubie.userData = {
                x, y, z,
                painted: [null, null, null, null, null, null] // 0:R, 1:L, 2:U, 3:D, 4:F, 5:B
            };

            rubiksCube.add(cubie);
        }
    }
}

scene.add(rubiksCube);
const cubeRotation = new CubeRotation(rubiksCube);

// Pointer Painting System
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", onPointerDown);

function onPointerDown(event) {
    if (isSolvingAnimation) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(rubiksCube.children);

    if (intersects.length === 0) return;

    const hit = intersects[0];
    const cubie = hit.object;
    const faceIndex = Math.floor(hit.faceIndex / 2); // Local Material Index 0..5

    const { x, y, z } = cubie.userData;

    // Outer face protection
    if (
        (faceIndex === 0 && x !== 1) ||
        (faceIndex === 1 && x !== -1) ||
        (faceIndex === 2 && y !== 1) ||
        (faceIndex === 3 && y !== -1) ||
        (faceIndex === 4 && z !== 1) ||
        (faceIndex === 5 && z !== -1)
    ) {
        return;
    }

    const previousColor = cubie.userData.painted[faceIndex];

    if (previousColor !== appState.selectedColor && colorUsage[appState.selectedColor] >= 9) {
        showToast(appState.selectedColor + " limit reached (9/9)");
        return;
    }

    if (previousColor === appState.selectedColor) return;

    if (previousColor) colorUsage[previousColor]--;

    cubie.userData.painted[faceIndex] = appState.selectedColor;
    colorUsage[appState.selectedColor]++;
    cubie.material[faceIndex].color.setHex(colorMap[appState.selectedColor]);

    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();

    showToast(appState.selectedColor + " Applied");
}

function animate() {
    requestAnimationFrame(animate);
    cubeRotation.update();
    renderer.render(scene, camera);
}
animate();

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
   DIRECT 3D CUBE STATE READER
========================================== */
function getCubieAt(x, y, z) {
    return rubiksCube.children.find(c => 
        c.userData && c.userData.x === x && c.userData.y === y && c.userData.z === z
    );
}

function getFaceColorsFrom3DCube() {
    rubiksCube.quaternion.set(0, 0, 0, 1); // Reset view angle to base

    const faceColors = { U: [], R: [], F: [], D: [], L: [], B: [] };

    // U Face (y = 1, Material 2)
    for (let z = -1; z <= 1; z++) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, 1, z);
            faceColors.U.push(c ? c.userData.painted[2] : null);
        }
    }

    // R Face (x = 1, Material 0)
    for (let y = 1; y >= -1; y--) {
        for (let z = 1; z >= -1; z--) {
            const c = getCubieAt(1, y, z);
            faceColors.R.push(c ? c.userData.painted[0] : null);
        }
    }

    // F Face (z = 1, Material 4)
    for (let y = 1; y >= -1; y--) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, y, 1);
            faceColors.F.push(c ? c.userData.painted[4] : null);
        }
    }

    // D Face (y = -1, Material 3)
    for (let z = 1; z >= -1; z--) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, -1, z);
            faceColors.D.push(c ? c.userData.painted[3] : null);
        }
    }

    // L Face (x = -1, Material 1)
    for (let y = 1; y >= -1; y--) {
        for (let z = -1; z <= 1; z++) {
            const c = getCubieAt(-1, y, z);
            faceColors.L.push(c ? c.userData.painted[1] : null);
        }
    }

    // B Face (z = -1, Material 5)
    for (let y = 1; y >= -1; y--) {
        for (let x = 1; x >= -1; x--) {
            const c = getCubieAt(x, y, -1);
            faceColors.B.push(c ? c.userData.painted[5] : null);
        }
    }

    return faceColors;
}

function getCubeString() {
    const faceColors = getFaceColorsFrom3DCube();
    const faces = ["U", "R", "F", "D", "L", "B"];

    const centerToFaceMap = {};
    for (const face of faces) {
        const centerColor = faceColors[face][4]; // Center sticker
        if (!centerColor) {
            throw new Error(`Center color for face ${face} is missing!`);
        }
        centerToFaceMap[centerColor] = face;
    }

    if (Object.keys(centerToFaceMap).length !== 6) {
        throw new Error("Each face center must have a unique color!");
    }

    let kociembaString = "";
    for (const face of faces) {
        for (let i = 0; i < 9; i++) {
            const color = faceColors[face][i];
            if (!color) {
                throw new Error(`Unpainted sticker found on face ${face}`);
            }
            const facelet = centerToFaceMap[color];
            if (!facelet) {
                throw new Error(`Unmapped color detected on face ${face}`);
            }
            kociembaString += facelet;
        }
    }

    return kociembaString;
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

    rotateSlice(move, () => {
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
    });
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

    if (isPlaying) pauseAutoPlay();

    isTurnAnimating = true;
    const lastMove = solutionMoves[currentMoveIndex - 1];
    const inverseMove = getInverseMove(lastMove);

    rotateSlice(inverseMove, () => {
        currentMoveIndex--;
        isTurnAnimating = false;
        updateMoveUI();
        if (callback) callback(true);
    });
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

    let axis = "y";
    let layerVal = cubieSize + gap;
    let baseAngle = 0;

    switch (face) {
        case "U":
            axis = "y";
            layerVal = cubieSize + gap;
            baseAngle = -Math.PI / 2;
            break;
        case "D":
            axis = "y";
            layerVal = -(cubieSize + gap);
            baseAngle = Math.PI / 2;
            break;
        case "R":
            axis = "x";
            layerVal = cubieSize + gap;
            baseAngle = -Math.PI / 2;
            break;
        case "L":
            axis = "x";
            layerVal = -(cubieSize + gap);
            baseAngle = Math.PI / 2;
            break;
        case "F":
            axis = "z";
            layerVal = cubieSize + gap;
            baseAngle = -Math.PI / 2;
            break;
        case "B":
            axis = "z";
            layerVal = -(cubieSize + gap);
            baseAngle = Math.PI / 2;
            break;
        default:
            if (callback) callback();
            return;
    }

    let angle = baseAngle;
    if (modifier === "'") angle = -baseAngle;
    if (modifier === "2") angle = baseAngle * 2;

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

            const cell = cubieSize + gap;

            targets.forEach(c => {
                rubiksCube.attach(c);
                c.position.x = Math.round(c.position.x * 100) / 100;
                c.position.y = Math.round(c.position.y * 100) / 100;
                c.position.z = Math.round(c.position.z * 100) / 100;

                c.userData.x = Math.round(c.position.x / cell);
                c.userData.y = Math.round(c.position.y / cell);
                c.userData.z = Math.round(c.position.z / cell);
            });

            rubiksCube.remove(pivot);
            if (callback) callback();
        }
    }

    requestAnimationFrame(animateTurn);
}
