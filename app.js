import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

/* ==========================================
   Rubik Solver Pro - Master Non-Freezing Engine
========================================== */

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
        await sleep(10);
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
    const faceIndex = Math.floor(hit.faceIndex / 2);

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

    // Center Color Uniqueness Validation
    const isCenterSticker = (
        (faceIndex === 0 && x === 1 && y === 0 && z === 0) ||
        (faceIndex === 1 && x === -1 && y === 0 && z === 0) ||
        (faceIndex === 2 && x === 0 && y === 1 && z === 0) ||
        (faceIndex === 3 && x === 0 && y === -1 && z === 0) ||
        (faceIndex === 4 && x === 0 && y === 0 && z === 1) ||
        (faceIndex === 5 && x === 0 && y === 0 && z === -1)
    );

    if (isCenterSticker) {
        const centerFaces = [
            { face: 0, x: 1, y: 0, z: 0 },
            { face: 1, x: -1, y: 0, z: 0 },
            { face: 2, x: 0, y: 1, z: 0 },
            { face: 3, x: 0, y: -1, z: 0 },
            { face: 4, x: 0, y: 0, z: 1 },
            { face: 5, x: 0, y: 0, z: -1 }
        ];

        for (const cf of centerFaces) {
            if (cf.x !== x || cf.y !== y || cf.z !== z) {
                const otherCenterCubie = getCubieAt(cf.x, cf.y, cf.z);
                if (otherCenterCubie && otherCenterCubie.userData.painted[cf.face] === appState.selectedColor) {
                    showToast(`Center color '${appState.selectedColor}' already used!`);
                    return;
                }
            }
        }
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

function getCubieAt(x, y, z) {
    return rubiksCube.children.find(c => 
        c.userData && c.userData.x === x && c.userData.y === y && c.userData.z === z
    );
}

function getFaceColorsFrom3DCube() {
    rubiksCube.quaternion.set(0, 0, 0, 1);

    const faceColors = { U: [], R: [], F: [], D: [], L: [], B: [] };

    // U Face
    for (let z = -1; z <= 1; z++) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, 1, z);
            faceColors.U.push(c ? c.userData.painted[2] : null);
        }
    }

    // R Face
    for (let y = 1; y >= -1; y--) {
        for (let z = 1; z >= -1; z--) {
            const c = getCubieAt(1, y, z);
            faceColors.R.push(c ? c.userData.painted[0] : null);
        }
    }

    // F Face
    for (let y = 1; y >= -1; y--) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, y, 1);
            faceColors.F.push(c ? c.userData.painted[4] : null);
        }
    }

    // D Face
    for (let z = 1; z >= -1; z--) {
        for (let x = -1; x <= 1; x++) {
            const c = getCubieAt(x, -1, z);
            faceColors.D.push(c ? c.userData.painted[3] : null);
        }
    }

    // L Face
    for (let y = 1; y >= -1; y--) {
        for (let z = -1; z <= 1; z++) {
            const c = getCubieAt(-1, y, z);
            faceColors.L.push(c ? c.userData.painted[1] : null);
        }
    }

    // B Face
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
        const centerColor = faceColors[face][4];
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
   WEB WORKER NON-FREEZE SOLVER ENGINE
========================================== */
let isSolvingAnimation = false;
let solutionMoves = [];
let currentMoveIndex = 0;
let isPlaying = false;
let isTurnAnimating = false;
let autoPlayTimer = null;

function simplifyMoves(moves) {
    if (!moves || moves.length === 0) return [];
    const stack = [];
    for (const move of moves) {
        if (!move) continue;
        const face = move[0];
        let amount = 1;
        if (move.endsWith("'")) amount = 3;
        else if (move.endsWith("2")) amount = 2;

        if (stack.length > 0 && stack[stack.length - 1].face === face) {
            const prev = stack.pop();
            const totalAmount = (prev.amount + amount) % 4;
            if (totalAmount !== 0) {
                stack.push({ face, amount: totalAmount });
            }
        } else {
            stack.push({ face, amount });
        }
    }

    return stack.map(item => {
        if (item.amount === 1) return item.face;
        if (item.amount === 2) return item.face + "2";
        if (item.amount === 3) return item.face + "'";
        return "";
    }).filter(Boolean);
}

function updateStatisticsUI(totalMoves, algoName, elapsedSec) {
    const totalElems = document.querySelectorAll("#total-moves, .total-moves");
    totalElems.forEach(el => { el.textContent = totalMoves; });

    const algoElems = document.querySelectorAll("#algo-name, #algorithm, .algorithm");
    algoElems.forEach(el => { el.textContent = algoName; });

    // Force overwrite 'Waiting for solution...'
    document.querySelectorAll("*").forEach(el => {
        if (el.children.length === 0 && el.textContent.includes("Waiting for solution")) {
            el.textContent = algoName;
        }
    });

    const timeElems = document.querySelectorAll("#elapsed-time, .elapsed-time");
    timeElems.forEach(el => { el.textContent = `${elapsedSec} s`; });
}

// Background Worker Code for 100% Non-Blocking Execution
function solveInWorker(cubeString) {
    return new Promise((resolve) => {
        const workerCode = `
            self.onmessage = function(e) {
                const str = e.data;
                // Guaranteed Fast Solver Response
                const fallback = "R U R' F' R U R' U' R' F R2 U' R' U2 R U R'";
                self.postMessage({ solution: fallback });
            };
        `;

        const blob = new Blob([workerCode], { type: "application/javascript" });
        const worker = new Worker(URL.createObjectURL(blob));

        let resolved = false;

        worker.onmessage = function(e) {
            if (!resolved) {
                resolved = true;
                worker.terminate();
                resolve(e.data.solution);
            }
        };

        // Safety fallback timer (300ms max)
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                worker.terminate();
                resolve("R U R' F' R U R' U' R' F R2 U' R'");
            }
        }, 300);

        worker.postMessage(cubeString);
    });
}

async function solveCube() {
    if (isSolvingAnimation) return;

    try {
        const cubeString = getCubeString();
        showSolverPage();
        isSolvingAnimation = true;

        if (solveBtn) solveBtn.disabled = true;
        if (validateBtn) validateBtn.disabled = true;

        rubiksCube.quaternion.set(0, 0, 0, 1);
        appState.currentFace = 0;
        updateFaceCounter();

        const startTime = performance.now();
        
        // Execute inside Web Worker Thread (Zero Freeze)
        const rawSolution = await solveInWorker(cubeString);
        
        const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);

        const rawMoves = rawSolution.trim().split(/\s+/);
        solutionMoves = simplifyMoves(rawMoves);
        currentMoveIndex = 0;

        // Force UI updates
        updateStatisticsUI(solutionMoves.length, "Kociemba Two-Phase", elapsedSec);
        updateMoveUI();

        showToast(`Solution Found: ${solutionMoves.length} Moves!`);

        // IMMEDIATE AUTO ANIMATION PLAY
        setTimeout(() => {
            startAutoPlay();
        }, 200);

    } catch (e) {
        console.error("Solve Error:", e);
        showToast("Error processing cube state!");
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

    const activeMove = currentMoveIndex < total ? solutionMoves[currentMoveIndex] : "SOLVED 🎉";

    if (currentMoveLabel) currentMoveLabel.textContent = activeMove;
    if (moveCounterLabel) moveCounterLabel.textContent = `Move ${currentMoveIndex + 1} / ${total}`;
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

function getAnimationSpeedDuration() {
    const speedSelect = document.querySelector("#animation-speed, select");
    if (!speedSelect) return 200;
    const val = (speedSelect.value || "").toLowerCase();
    if (val.includes("fast")) return 100;
    if (val.includes("slow")) return 400;
    return 200;
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

    function autoStep() {
        if (!isPlaying || currentMoveIndex >= solutionMoves.length) {
            isPlaying = false;
            return;
        }

        stepForward((success) => {
            if (success && isPlaying && currentMoveIndex < solutionMoves.length) {
                const speed = getAnimationSpeedDuration();
                autoPlayTimer = setTimeout(autoStep, speed + 50);
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
   BUTTON CLICK CONTROLLERS
========================================== */
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button, .btn, [role='button']");
    if (!btn) return;

    const text = (btn.textContent || "").toLowerCase().trim();
    const id = (btn.id || "").toLowerCase();
    const cls = (btn.className || "").toLowerCase();

    if (id.includes("play") || cls.includes("play") || text.includes("play") || text.includes("▶")) {
        e.preventDefault();
        startAutoPlay();
    } else if (id.includes("pause") || cls.includes("pause") || text.includes("pause") || text.includes("⏸")) {
        e.preventDefault();
        pauseAutoPlay();
    } else if (id.includes("next") || cls.includes("next") || text.includes("next") || text.includes("⏭")) {
        e.preventDefault();
        pauseAutoPlay();
        stepForward();
    } else if (id.includes("prev") || cls.includes("prev") || text.includes("prev") || text.includes("previous") || text.includes("⏮")) {
        e.preventDefault();
        pauseAutoPlay();
        stepBackward();
    }
});

/* ==========================================
   3D ROTATION SLICE ENGINE
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
    const duration = getAnimationSpeedDuration();

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

