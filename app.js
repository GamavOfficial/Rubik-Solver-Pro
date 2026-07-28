import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

/* ==========================================
   Rubik Solver Pro - Final Fixed Core Engine
========================================== */

// Kociemba Initialization
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

// Color Picker
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

/* ==========================================
   CENTER COLOR LOCK SYSTEM
========================================== */

const centerColorLock = {
    white: false,
    yellow: false,
    red: false,
    orange: false,
    blue: false,
    green: false
};

function isCenterSticker(faceLetter, stickerIndex) {
    return stickerIndex === 4;
}

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

// Cube State Data
const cubeState = {
    U: Array(9).fill(null),
    R: Array(9).fill(null),
    F: Array(9).fill(null),
    D: Array(9).fill(null),
    L: Array(9).fill(null),
    B: Array(9).fill(null)
};

const filledCount = document.getElementById("filled-count");
const validateBtn = document.getElementById("validate-btn");
const solveBtn = document.getElementById("solve-btn");
const previousFaceBtn = document.getElementById("previous-face");
const nextFaceBtn = document.getElementById("next-face");

const editorPage = document.getElementById("editor-page");
const solverPage = document.getElementById("solver-page");

const colorPicker = document.getElementById("color-picker");
const progressBox = document.querySelector(".progress-box");
const editorControls = document.querySelector(".editor-controls");
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
    Object.values(cubeState).forEach(face => {
        face.forEach(sticker => {
            if (sticker !== null) total++;
        });
    });

    appState.filledStickers = total;
    if (filledCount) filledCount.textContent = `${total} / 54`;
}

function updateValidateButton() {
    if (validateBtn) validateBtn.disabled = appState.filledStickers !== 54;
}

function validateCube() {
    const counts = { white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0 };

    for (const face of Object.keys(cubeState)) {
        for (const sticker of cubeState[face]) {
            if (sticker === null) {
                showToast("Fill all 54 stickers first.");
                return false;
            }
            if (sticker in counts) {
                counts[sticker]++;
            }
        }
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

function refreshEditor() {
    updateFaceCounter();
    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();
}

refreshEditor();
if (solveBtn) solveBtn.disabled = true;

/* ==========================================
   Precision 3D Sticker Indexing
========================================== */
function getStickerIndex(cubie, faceLetter) {
    const x = cubie.userData.x;
    const y = cubie.userData.y;
    const z = cubie.userData.z;

    switch (faceLetter) {
        case "U": return (z + 1) * 3 + (x + 1);
        case "D": return (1 - z) * 3 + (x + 1);
        case "F": return (1 - y) * 3 + (x + 1);
        case "B": return (1 - y) * 3 + (1 - x);
        case "R": return (1 - y) * 3 + (1 - z);
        case "L": return (1 - y) * 3 + (z + 1);
        default: return -1;
    }
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
                painted: [null, null, null, null, null, null]
            };

            rubiksCube.add(cubie);
        }
    }
}

scene.add(rubiksCube);
const cubeRotation = new CubeRotation(rubiksCube);

// Raycaster Click Handler
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
    const faceIndex = Math.floor(hit.faceIndex / 2);
    const previousColor = cubie.userData.painted[faceIndex];
    const faceLetter = ["R", "L", "U", "D", "F", "B"][faceIndex];

    const x = cubie.userData.x;
    const y = cubie.userData.y;
    const z = cubie.userData.z;

    if (
        (faceLetter === "R" && x !== 1) ||
        (faceLetter === "L" && x !== -1) ||
        (faceLetter === "U" && y !== 1) ||
        (faceLetter === "D" && y !== -1) ||
        (faceLetter === "F" && z !== 1) ||
        (faceLetter === "B" && z !== -1)
    ) {
        return;
    }

    if (previousColor !== appState.selectedColor && colorUsage[appState.selectedColor] >= 9) {
        showToast(appState.selectedColor + " limit reached (9/9)");
        return;
    }

    if (previousColor === appState.selectedColor) return;

    const stickerIndex = getStickerIndex(cubie, faceLetter);
    
    // Center color restriction
    if (isCenterSticker(faceLetter, stickerIndex)) {

        if (
            previousColor !== appState.selectedColor &&
            centerColorLock[appState.selectedColor]
        ) {
            showToast(appState.selectedColor + " already assigned to another center.");
            return;
        }

        if (previousColor) {
            centerColorLock[previousColor] = false;
        }

        centerColorLock[appState.selectedColor] = true;
    }

    if (previousColor) colorUsage[previousColor]--;

    cubie.userData.painted[faceIndex] = appState.selectedColor;
    colorUsage[appState.selectedColor]++;
    cubie.material[faceIndex].color.setHex(colorMap[appState.selectedColor]);
    
    // Store exact color name
    cubeState[faceLetter][stickerIndex] = appState.selectedColor;

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
   DYNAMIC CENTER KOCIEMBA CONVERTER
========================================== */
function getCubeString() {
    const faces = ["U", "R", "F", "D", "L", "B"];
    
    const centerToFaceMap = {};
    for (const face of faces) {
        const centerColor = cubeState[face][4];
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
            const color = cubeState[face][i];
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

    const activeViewer =
        solverPage && !solverPage.classList.contains("hidden")
            ? solverViewer
            : viewer;

    if (!activeViewer) return;

    camera.aspect = activeViewer.clientWidth / activeViewer.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(
        activeViewer.clientWidth,
        activeViewer.clientHeight
    );

}

function showSolverPage() {

    if (editorPage) {
        editorPage.classList.add("hidden");
    }

    if (solverPage) {
        solverPage.classList.remove("hidden");
    }

    if (solverViewer && renderer.domElement.parentNode !== solverViewer) {
        solverViewer.appendChild(renderer.domElement);
    }

    resizeRenderer();
    
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

}
    
let isSolvingAnimation = false;
let solutionMoves = [];
let currentMoveIndex = 0;
let animationState = "idle"; 
let animationSpeed = 1;
let animationTimer = null;

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

        // Reset View Orientation before starting animation
        rubiksCube.quaternion.set(0, 0, 0, 1);
        if (cubeRotation) {
            if (cubeRotation.targetQuaternion) cubeRotation.targetQuaternion.set(0, 0, 0, 1);
            if (cubeRotation.currentQuaternion) cubeRotation.currentQuaternion.set(0, 0, 0, 1);
        }
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

                const moves = solution.trim().split(/\s+/);
                solutionMoves = moves;
                currentMoveIndex = 0;
                animationState = "playing";
                showToast(`Solved in ${moves.length} moves! Animating...`);

                playSolutionQueue(moves);
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

    if (currentMoveLabel) {
        currentMoveLabel.textContent =
            solutionMoves[currentMoveIndex] || "-";
    }

    if (moveCounterLabel) {
        moveCounterLabel.textContent =
            `${currentMoveIndex + 1} / ${solutionMoves.length}`;
    }

    if (moveProgress) {
        moveProgress.max = solutionMoves.length || 1;
        moveProgress.value = currentMoveIndex;
    }

}

function resetSolveState() {
    isSolvingAnimation = false;
    if (solveBtn) solveBtn.disabled = false;
    if (validateBtn) validateBtn.disabled = false;
}

/* ==========================================
   3D SLICE ROTATION ENGINE (FULLY FIXED)
========================================== */
function playSolutionQueue(moves) {
    let index = 0;

    function nextMove() {
        if (index >= moves.length) {
            animationState = "finished";
            updateMoveUI();
            showToast("Cube Solved Successfully! 🎉");
            resetSolveState();
            appState.cubeSolved = true;
            return;
        }

        const move = moves[index];
        currentMoveIndex = index;
        updateMoveUI();
        index++;
        rotateSlice(move, () => setTimeout(nextMove, 180));
    }

    nextMove();
}

function rotateSlice(moveStr, callback) {
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

    targets.forEach(c => pivot.attach(c));

    let start = null;
    const duration = 200;

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
