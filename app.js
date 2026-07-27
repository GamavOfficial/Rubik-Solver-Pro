import * as THREE from "three";
//import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

if (typeof Cube !== 'undefined' && Cube.initSolver) {
    try {
        Cube.initSolver();
    } catch (e) {
        console.warn("Cube Solver init issue:", e);
    }
}

/* ==========================================
   Rubik Solver Pro
   App Initialization
========================================== */

// ---------- DOM Elements ----------

const splashScreen = document.getElementById("splash-screen");
const mainApp = document.getElementById("main-app");
const loadingProgress = document.getElementById("loading-progress");

const editorPage = document.getElementById("editor-page");
const loadingPage = document.getElementById("loading-page");
const solverPage = document.getElementById("solver-page");
const finishPage = document.getElementById("finish-page");

const toast = document.getElementById("toast");

// ---------- App State ----------

const appState = {
    currentFace: 0,
    totalFaces: 6,
    selectedColor: "white",
    filledStickers: 0,
    cubeValidated: false,
    cubeSolved: false,
    solving: false
};

// ---------- Utility ----------

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------- Toast ----------

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// ---------- Splash Loading ----------

async function startSplash() {
    let progress = 0;
    while (progress <= 100) {
        loadingProgress.style.width = progress + "%";
        await sleep(25);
        progress++;
    }

    splashScreen.classList.add("hidden");
    mainApp.classList.remove("hidden");

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

/* ==========================================
   Theme System
========================================== */

const themeBtn = document.getElementById("theme-btn");
let currentTheme = localStorage.getItem("theme") || "dark";
applyTheme(currentTheme);

themeBtn.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
});

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

/* ==========================================
   Settings & PWA
========================================== */

const settingsBtn = document.getElementById("settings-btn");
settingsBtn.addEventListener("click", () => {
    showToast("Settings coming soon...");
});

const installBtn = document.getElementById("install-btn");
let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installBtn.style.display = "inline-flex";
});

installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) {
        showToast("Install not available.");
        return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = "none";
});

window.addEventListener("appinstalled", () => {
    showToast("Rubik Solver installed!");
    installBtn.style.display = "none";
});

/* ==========================================
   Color Picker
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
    document.querySelector(`[data-color="${color}"]`).classList.add("active");
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
   Cube Data
========================================== */

const FACE_NAMES = ["U", "R", "F", "D", "L", "B"];

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

function updateFaceCounter() {
    document.getElementById("face-counter").textContent = `${appState.currentFace + 1} / ${appState.totalFaces}`;
    document.getElementById("face-progress").value = appState.currentFace + 1;
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
    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };

    for (const face of Object.keys(cubeState)) {
        for (const sticker of cubeState[face]) {
            if (sticker === null) {
                showToast("Complete all 54 stickers.");
                return false;
            }
            if (!(sticker in counts)) {
                showToast("Invalid sticker detected.");
                return false;
            }
            counts[sticker]++;
        }
    }

    for (const face of Object.keys(counts)) {
        if (counts[face] !== 9) {
            showToast(`${face} face count is incorrect.`);
            return false;
        }
    }

    appState.cubeValidated = true;
    showToast("Cube validation successful.");
    return true;
}

validateBtn.addEventListener("click", () => {
    if (validateCube()) {
        solveBtn.disabled = false;
        solveBtn.classList.remove("hidden");
    }
});

solveBtn.addEventListener("click", () => {
    if (!appState.cubeValidated) {
        showToast("Validate cube first.");
        return;
    }
    solveCube();
});

function refreshEditor() {
    updateFaceCounter();
    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();
}

refreshEditor();
solveBtn.disabled = true;

/* ==========================================
   Cube State Mapping
========================================== */

const COLOR_TO_FACE = {
    white: "U",
    red: "R",
    green: "F",
    yellow: "D",
    orange: "L",
    blue: "B"
};

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

/* ==========================================
   Three.js Scene Setup
========================================== */

const viewer = document.getElementById("viewer");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101826);

const camera = new THREE.PerspectiveCamera(35, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(viewer.clientWidth, viewer.clientHeight);
viewer.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(5, 10, 7);
scene.add(directionalLight);

/* ==========================================
   Rubik's Cube Setup
========================================== */

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

/* ==========================================
   Raycaster & Click Events
========================================== */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener("pointerdown", onPointerDown);

function onPointerDown(event) {
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

    if (previousColor) colorUsage[previousColor]--;

    cubie.userData.painted[faceIndex] = appState.selectedColor;
    colorUsage[appState.selectedColor]++;
    cubie.material[faceIndex].color.setHex(colorMap[appState.selectedColor]);

    const stickerIndex = getStickerIndex(cubie, faceLetter);
    cubeState[faceLetter][stickerIndex] = COLOR_TO_FACE[appState.selectedColor];

    updateFilledCounter();
    updateValidateButton();
    updateColorCounters();

    showToast(appState.selectedColor + " Applied");
}

/* ==========================================
   Animation Loop & Controls
========================================== */

function animate() {
    requestAnimationFrame(animate);
    cubeRotation.update();
    renderer.render(scene, camera);
}
animate();

const faceRotations = [null, "right", "up", "right", "right", "up"];

nextFaceBtn.addEventListener("click", () => {
    if (cubeRotation.isAnimating() || appState.currentFace >= 5) return;
    appState.currentFace++;
    const move = faceRotations[appState.currentFace];
    if (move) cubeRotation.rotate(move);
    updateFaceCounter();
});

previousFaceBtn.addEventListener("click", () => {
    if (cubeRotation.isAnimating() || appState.currentFace <= 0) return;
    const move = faceRotations[appState.currentFace];
    if (move === "right") cubeRotation.rotate("left");
    else if (move === "up") cubeRotation.rotate("down");
    appState.currentFace--;
    updateFaceCounter();
});

window.addEventListener("resize", () => {
    camera.aspect = viewer.clientWidth / viewer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
});

/* ==========================================
   Kociemba Solver & 3D Animation Integration
========================================== */

function getCubeString() {
    const order = ["U", "R", "F", "D", "L", "B"];
    let result = "";

    for (const face of order) {
        if (!cubeState[face] || cubeState[face].includes(null)) {
            throw new Error(`Face ${face} is incomplete!`);
        }
        result += cubeState[face].join("");
    }

    return result;
}

let isSolvingAnimation = false;

async function solveCube() {
    if (isSolvingAnimation) return;

    try {
        if (typeof Cube === 'undefined') {
            showToast("Solver library not loaded!");
            return;
        }

        const cubeString = getCubeString();
        console.log("Kociemba String:", cubeString);

        showToast("Calculating Solution...");

        setTimeout(() => {
            try {
                const cube = Cube.fromString(cubeString);

                if (cube.isSolved()) {
                    showToast("Cube is already solved!");
                    return;
                }

                const solution = cube.solve();
                console.log("Solution Moves:", solution);

                if (!solution || solution.trim() === "") {
                    showToast("Cube is already solved!");
                    return;
                }

                const moves = solution.trim().split(/\s+/);
                showToast(`Solved in ${moves.length} moves! Animating...`);

                playSolutionQueue(moves);
            } catch (solveErr) {
                console.error("Solve Error:", solveErr);
                showToast("Invalid Cube configuration! Check sticker colors.");
            }
        }, 100);

    } catch (e) {
        console.error("Parsing Error:", e);
        showToast("Please fill all 54 stickers correctly!");
    }
}

function playSolutionQueue(moves) {
    isSolvingAnimation = true;
    solveBtn.disabled = true;
    validateBtn.disabled = true;

    let index = 0;

    function nextMove() {
        if (index >= moves.length) {
            showToast("Cube Solved Successfully!");
            isSolvingAnimation = false;
            solveBtn.disabled = false;
            validateBtn.disabled = false;
            appState.cubeSolved = true;
            return;
        }

        const move = moves[index++];
        rotateSlice(move, () => setTimeout(nextMove, 180));
    }

    nextMove();
}

function rotateSlice(moveStr, callback) {
    const face = moveStr[0];
    const modifier = moveStr.slice(1);

    let angle = -Math.PI / 2;
    if (modifier === "'") angle = Math.PI / 2;
    if (modifier === "2") angle = -Math.PI;

    let axis = "y";
    let layerVal = cubieSize + gap;

    if (face === "U") { axis = "y"; layerVal = cubieSize + gap; angle = -angle; }
    if (face === "D") { axis = "y"; layerVal = -(cubieSize + gap); }
    if (face === "R") { axis = "x"; layerVal = cubieSize + gap; angle = -angle; }
    if (face === "L") { axis = "x"; layerVal = -(cubieSize + gap); }
    if (face === "F") { axis = "z"; layerVal = cubieSize + gap; angle = -angle; }
    if (face === "B") { axis = "z"; layerVal = -(cubieSize + gap); }

    const pivot = new THREE.Group();
    scene.add(pivot);

    const targets = [];
    rubiksCube.children.forEach(cubie => {
        const wPos = new THREE.Vector3();
        cubie.getWorldPosition(wPos);
        if (Math.abs(wPos[axis] - layerVal) < 0.2) {
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

            targets.forEach(c => {
                rubiksCube.attach(c);
                c.position.x = Math.round(c.position.x * 100) / 100;
                c.position.y = Math.round(c.position.y * 100) / 100;
                c.position.z = Math.round(c.position.z * 100) / 100;
            });

            scene.remove(pivot);
            if (callback) callback();
        }
    }

    requestAnimationFrame(animateTurn);
}
