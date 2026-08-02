import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

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

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
    viewer.clientWidth,
    viewer.clientHeight
);

// Premium physically-correct color output
renderer.outputColorSpace = THREE.SRGBColorSpace;

// High-end cinematic tone mapping
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

// Better transparent/gloss rendering
renderer.sortObjects = true;

if (viewer) {
    viewer.appendChild(renderer.domElement);
}

/* ==========================================
   PREMIUM PRODUCT STUDIO LIGHTING
========================================== */

// Soft global illumination
const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x182030,
    1.65
);
scene.add(ambientLight);


// ------------------------------------------
// LARGE TOP-LEFT SOFTBOX
// Main glossy reflection
// ------------------------------------------
const keyLight = new THREE.RectAreaLight(
    0xffffff,
    7.5,
    5.0,
    5.0
);

keyLight.position.set(-4.5, 6.0, 5.5);
keyLight.lookAt(0, 0, 0);
scene.add(keyLight);


// ------------------------------------------
// RIGHT SOFTBOX
// Gives side-face reflections
// ------------------------------------------
const fillLight = new THREE.RectAreaLight(
    0xddeeff,
    5.0,
    4.0,
    5.0
);

fillLight.position.set(5.5, 2.5, 4.0);
fillLight.lookAt(0, 0, 0);
scene.add(fillLight);


// ------------------------------------------
// TOP SOFTBOX
// Highlights upper stickers
// ------------------------------------------
const topLight = new THREE.RectAreaLight(
    0xffffff,
    5.5,
    4.5,
    3.0
);

topLight.position.set(0, 7, 1);
topLight.lookAt(0, 0, 0);
scene.add(topLight);


// ------------------------------------------
// BACK RIM LIGHT
// Separates black cube from background
// ------------------------------------------
const rimLight = new THREE.DirectionalLight(
    0xbfd8ff,
    3.0
);

rimLight.position.set(-4, 4, -6);
scene.add(rimLight);


// ------------------------------------------
// FRONT BEAUTY LIGHT
// Keeps sticker colors vivid
// ------------------------------------------
const beautyLight = new THREE.DirectionalLight(
    0xffffff,
    2.2
);

beautyLight.position.set(2, 3, 7);
scene.add(beautyLight);

/* ==========================================
   PROCEDURAL STUDIO ENVIRONMENT
   UV / CLEARCOAT REFLECTION SYSTEM
========================================== */

const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

const studioScene = new THREE.Scene();

studioScene.background = new THREE.Color(0x080b10);

// Large white studio panels.
// These become visible as reflections on clearcoat.

function addReflectionPanel(
    position,
    scale,
    intensity = 1
) {
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(
            intensity,
            intensity,
            intensity
        ),
        side: THREE.DoubleSide
    });

    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(
            scale[0],
            scale[1]
        ),
        material
    );

    panel.position.set(
        position[0],
        position[1],
        position[2]
    );

    panel.lookAt(0, 0, 0);

    studioScene.add(panel);
}


// ------------------------------------------
// TOP LARGE SOFTBOX
// ------------------------------------------

addReflectionPanel(
    [-2.5, 5.5, 3.0],
    [5.5, 2.2],
    3.0
);


// ------------------------------------------
// LEFT VERTICAL SOFTBOX
// ------------------------------------------

addReflectionPanel(
    [-5.0, 1.0, 2.0],
    [2.0, 5.5],
    2.2
);


// ------------------------------------------
// RIGHT VERTICAL SOFTBOX
// ------------------------------------------

addReflectionPanel(
    [5.0, 1.5, 1.5],
    [1.8, 5.0],
    1.8
);


// ------------------------------------------
// FRONT STRIP REFLECTION
// Creates premium long highlight
// ------------------------------------------

addReflectionPanel(
    [1.5, 2.5, 6.0],
    [5.0, 0.65],
    2.8
);


// ------------------------------------------
// TOP STRIP
// ------------------------------------------

addReflectionPanel(
    [0, 6.0, -1.5],
    [4.5, 1.0],
    2.0
);


// Generate filtered environment map

const studioEnvironment =
    pmremGenerator.fromScene(
        studioScene,
        0.04
    ).texture;

scene.environment = studioEnvironment;

// Reflection rotation
scene.environmentRotation.set(
    0,
    Math.PI * 0.08,
    0
);

// Rubik's Cube Mesh Group
const rubiksCube = new THREE.Group();
const cubieSize = 0.95;
const gap = 0.05;

// Premium rounded glossy cubie geometry
function createRoundedCubieGeometry(size, radius = 0.11) {
    const half = size / 2;

    const shape = new THREE.Shape();

    // Bottom edge
    shape.moveTo(-half + radius, -half);
    shape.lineTo(half - radius, -half);

    // Bottom-right rounded corner
    shape.quadraticCurveTo(
        half, -half,
        half, -half + radius
    );

    // Right edge
    shape.lineTo(half, half - radius);

    // Top-right rounded corner
    shape.quadraticCurveTo(
        half, half,
        half - radius, half
    );

    // Top edge
    shape.lineTo(-half + radius, half);

    // Top-left rounded corner
    shape.quadraticCurveTo(
        -half, half,
        -half, half - radius
    );

    // Left edge
    shape.lineTo(-half, -half + radius);

    // Bottom-left rounded corner
    shape.quadraticCurveTo(
        -half, -half,
        -half + radius, -half
    );

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: size,

        bevelEnabled: true,

        // Deeper premium rounded outer edges
        bevelThickness: 0.055,
        bevelSize: 0.055,

        // Smoother curved edges
        bevelSegments: 8,
        curveSegments: 12,

        steps: 1
    });

    geometry.center();
    geometry.computeVertexNormals();

    return geometry;
}

const premiumCubieGeometry =
    createRoundedCubieGeometry(cubieSize);
    
const colorMap = {
    white: 0xffffff,
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    blue: 0x0000ff,
    green: 0x00aa00
};

/* ==========================================
   PREMIUM UV COATED ROUNDED STICKERS
========================================== */

const stickerSize = cubieSize * 0.80;
const stickerOffset = cubieSize / 2 + 0.084;

// Rounded-square sticker geometry
function createRoundedStickerGeometry(size, radius = 0.105) {

    const half = size / 2;
    const shape = new THREE.Shape();

    shape.moveTo(-half + radius, -half);

    shape.lineTo(half - radius, -half);
    shape.quadraticCurveTo(
        half, -half,
        half, -half + radius
    );

    shape.lineTo(half, half - radius);
    shape.quadraticCurveTo(
        half, half,
        half - radius, half
    );

    shape.lineTo(-half + radius, half);
    shape.quadraticCurveTo(
        -half, half,
        -half, half - radius
    );

    shape.lineTo(-half, -half + radius);
    shape.quadraticCurveTo(
        -half, -half,
        -half + radius, -half
    );

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.035,

        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.018,

        bevelSegments: 5,
        curveSegments: 10,
        steps: 1
    });

    geometry.center();
    geometry.computeVertexNormals();

    return geometry;
}

const stickerGeometry =
    createRoundedStickerGeometry(stickerSize);


// Create individual UV sticker
function createSticker(faceIndex) {

    const material = new THREE.MeshPhysicalMaterial({

        color: 0x222222,

        // UV coated glossy surface
        roughness: 0.08,
        metalness: 0.0,

        clearcoat: 1.0,
        clearcoatRoughness: 0.035,

        reflectivity: 1.0,

        side: THREE.DoubleSide
    });

    const sticker =
        new THREE.Mesh(stickerGeometry, material);

    sticker.userData.isSticker = true;
    sticker.userData.faceIndex = faceIndex;

    switch (faceIndex) {

        // RIGHT
        case 0:
            sticker.position.x = stickerOffset;
            sticker.rotation.y = Math.PI / 2;
            break;

        // LEFT
        case 1:
            sticker.position.x = -stickerOffset;
            sticker.rotation.y = -Math.PI / 2;
            break;

        // UP
        case 2:
            sticker.position.y = stickerOffset;
            sticker.rotation.x = -Math.PI / 2;
            break;

        // DOWN
        case 3:
            sticker.position.y = -stickerOffset;
            sticker.rotation.x = Math.PI / 2;
            break;

        // FRONT
        case 4:
            sticker.position.z = stickerOffset;
            break;

        // BACK
        case 5:
            sticker.position.z = -stickerOffset;
            sticker.rotation.y = Math.PI;
            break;
    }

    return sticker;
}


for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {

            // Premium piano-black UV coated cubie body
const bodyMaterial = new THREE.MeshPhysicalMaterial({
    // Deep black ABS plastic
    color: 0x050505,

    // Smooth premium plastic
    roughness: 0.16,
    metalness: 0.0,

    // Glossy transparent coating
    clearcoat: 1.0,
    clearcoatRoughness: 0.075,

    // Studio environment reflections
    envMapIntensity: 1.35,

    // Plastic surface reflection
    reflectivity: 0.65,

    // Realistic dielectric plastic
    ior: 1.48
});

            const cubie = new THREE.Mesh(
                premiumCubieGeometry,
                bodyMaterial
            );

            cubie.position.set(
                x * (cubieSize + gap),
                y * (cubieSize + gap),
                z * (cubieSize + gap)
            );

            cubie.userData = {
                x,
                y,
                z,
                painted: [null, null, null, null, null, null],
                stickers: []
            };

            // R
            if (x === 1) {
                const sticker = createSticker(0);
                cubie.add(sticker);
                cubie.userData.stickers[0] = sticker;
            }

            // L
            if (x === -1) {
                const sticker = createSticker(1);
                cubie.add(sticker);
                cubie.userData.stickers[1] = sticker;
            }

            // U
            if (y === 1) {
                const sticker = createSticker(2);
                cubie.add(sticker);
                cubie.userData.stickers[2] = sticker;
            }

            // D
            if (y === -1) {
                const sticker = createSticker(3);
                cubie.add(sticker);
                cubie.userData.stickers[3] = sticker;
            }

            // F
            if (z === 1) {
                const sticker = createSticker(4);
                cubie.add(sticker);
                cubie.userData.stickers[4] = sticker;
            }

            // B
            if (z === -1) {
                const sticker = createSticker(5);
                cubie.add(sticker);
                cubie.userData.stickers[5] = sticker;
            }

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
    const intersects =
    raycaster.intersectObjects(rubiksCube.children, true);

    if (intersects.length === 0) return;

    const hit = intersects[0];

// ------------------------------------------
// Find clicked sticker / parent cubie
// ------------------------------------------
let sticker = null;
let cubie = null;
let faceIndex = null;

// Direct sticker hit
if (hit.object.userData && hit.object.userData.isSticker) {
    sticker = hit.object;
    cubie = sticker.parent;
    faceIndex = sticker.userData.faceIndex;
}
// Rounded cubie body hit
else {
    cubie = hit.object;

    if (!cubie.userData || !cubie.userData.painted) {
        return;
    }

    // Convert hit normal into cubie's local direction
    const normal = hit.face.normal.clone();

    const ax = Math.abs(normal.x);
    const ay = Math.abs(normal.y);
    const az = Math.abs(normal.z);

    if (ax >= ay && ax >= az) {
        faceIndex = normal.x > 0 ? 0 : 1;
    } else if (ay >= ax && ay >= az) {
        faceIndex = normal.y > 0 ? 2 : 3;
    } else {
        faceIndex = normal.z > 0 ? 4 : 5;
    }

    sticker = cubie.userData.stickers?.[faceIndex];

    // Internal/non-visible side
    if (!sticker) {
        return;
    }
}

if (!cubie || faceIndex === null || !sticker) {
    return;
}

const { x, y, z } = cubie.userData;

// ------------------------------------------
// Outer face protection
// ------------------------------------------
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

const previousColor =
    cubie.userData.painted[faceIndex];

// ------------------------------------------
// Maximum 9 stickers per color
// ------------------------------------------
if (
    previousColor !== appState.selectedColor &&
    colorUsage[appState.selectedColor] >= 9
) {
    showToast(
        appState.selectedColor +
        " limit reached (9/9)"
    );
    return;
}

if (previousColor === appState.selectedColor) {
    return;
}

// Remove old color count
if (previousColor) {
    colorUsage[previousColor]--;
}

// Save logical cube state
cubie.userData.painted[faceIndex] =
    appState.selectedColor;

colorUsage[appState.selectedColor]++;

// ------------------------------------------
// Paint actual sticker mesh
// ------------------------------------------
sticker.material.color.setHex(
    colorMap[appState.selectedColor]
);

sticker.material.needsUpdate = true;

// Update UI
updateFilledCounter();
updateValidateButton();
updateColorCounters();

showToast(
    appState.selectedColor + " Applied"
);
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
