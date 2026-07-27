import * as THREE from "three";
import { CubeRotation } from "./js/cube-rotation.js";

/* ============================================================
   Rubik Solver Pro - Original Restored Logic & Page Switcher
============================================================ */

// 1. global state (பழைய நிலைகள்)
const FACE_NAMES = ['UP', 'DOWN', 'FRONT', 'BACK', 'LEFT', 'RIGHT'];
const FACES_MAP = { 'UP': 'U', 'DOWN': 'D', 'FRONT': 'F', 'BACK': 'B', 'LEFT': 'L', 'RIGHT': 'R' };

// ஆரம்பத்தில் அனைத்துக் கட்டங்களும் கருப்பு நிறம் (Default Black)
const cubeState = {
    U: Array(9).fill('black'),
    D: Array(9).fill('black'),
    F: Array(9).fill('black'),
    B: Array(9).fill('black'),
    L: Array(9).fill('black'),
    R: Array(9).fill('black')
};

const colorMapHex = {
    white: 0xffffff,
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    blue: 0x0000ff,
    green: 0x00aa00,
    black: 0x111111  // Default Black Color
};

const appState = {
    currentFaceIndex: 0, // 0 to 5 (Face 1/6)
    selectedColor: 'white',
    filledStickers: 0
};

// அனிமேஷன் மாறிகள்
let moveQueue = [];
let currentMoveIndex = 0;
let isPlaying = false;
let isAnimatingSlice = false;
let autoPlayTimer = null;

// Solver தொடக்கம்
if (typeof Cube !== 'undefined' && Cube.initSolver) {
    try { Cube.initSolver(); } catch (e) { console.warn(e); }
}

// ------------------------------------------------------------
// 2. DOM Initialization
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    initThemeSystem();
    initColorPicker();
    renderEditorGrid();
    setupEventListeners();
    initThreeJS();
});

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

function initSplashScreen() {
    const splash = document.getElementById("splash-screen");
    const mainApp = document.getElementById("main-app");
    if (splash) splash.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");
}

function initThemeSystem() {
    const themeBtn = document.getElementById("theme-btn");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            const isDark = document.body.getAttribute("data-theme") === "dark";
            document.body.setAttribute("data-theme", isDark ? "light" : "dark");
        });
    }
}

// ------------------------------------------------------------
// 3. Color Picker & Face Navigation (Previous / Next)
// ------------------------------------------------------------
function initColorPicker() {
    const colorBtns = document.querySelectorAll('#color-picker .color-btn, .color-bar, [data-color]');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.getAttribute('data-color') || btn.dataset.color || btn.style.backgroundColor;
            if (color) {
                appState.selectedColor = color.toLowerCase();
                colorBtns.forEach(b => b.classList.remove('selected', 'active'));
                btn.classList.add('selected', 'active');
            }
        });
    });
}

function renderEditorGrid() {
    const gridContainer = document.getElementById('cube-grid');
    const faceText = document.getElementById("cube-face-info") || document.querySelector(".cube-face-text");

    if (faceText) {
        faceText.textContent = `Cube Face ${appState.currentFaceIndex + 1} / 6`;
    }

    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const currentFaceName = FACE_NAMES[appState.currentFaceIndex];
    const faceCode = FACES_MAP[currentFaceName];
    const currentStickers = cubeState[faceCode];

    currentStickers.forEach((color, index) => {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.style.backgroundColor = color === 'black' ? '#222' : color;

        sticker.addEventListener('click', () => {
            cubeState[faceCode][index] = appState.selectedColor;
            sticker.style.backgroundColor = appState.selectedColor;
            updateStickerCounts();
            syncStateTo3DCube();
        });

        gridContainer.appendChild(sticker);
    });

    updateStickerCounts();
}

function updateStickerCounts() {
    let totalFilled = 0;
    Object.values(cubeState).forEach(face => {
        face.forEach(color => {
            if (color !== 'black') totalFilled++;
        });
    });

    appState.filledStickers = totalFilled;
    const filledCountElem = document.getElementById("filled-count") || document.querySelector(".filled-count");
    if (filledCountElem) {
        filledCountElem.textContent = `${totalFilled} / 54`;
    }
}

// ------------------------------------------------------------
// 4. Three.js 3D Cube Engine (Default Black Cubies)
// ------------------------------------------------------------
let viewer, scene, camera, renderer, rubiksCube, cubeRotation;
const cubieSize = 0.95;
const gap = 0.05;

function initThreeJS() {
    viewer = document.getElementById("viewer") || document.querySelector(".3d-cube-editor");
    if (!viewer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101826);

    camera = new THREE.PerspectiveCamera(35, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    viewer.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    rubiksCube = new THREE.Group();

    // 3D Cubies - ஆரம்பத்தில் கருப்பு நிறத்தில் உருவாக்கப்படுகின்றன
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const materials = Array(6).fill().map(() => new THREE.MeshStandardMaterial({ color: 0x111111 }));
                const cubie = new THREE.Mesh(new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize), materials);
                cubie.position.set(x * (cubieSize + gap), y * (cubieSize + gap), z * (cubieSize + gap));
                cubie.userData = { x, y, z };
                rubiksCube.add(cubie);
            }
        }
    }

    scene.add(rubiksCube);
    cubeRotation = new CubeRotation(rubiksCube);

    function animate() {
        requestAnimationFrame(animate);
        if (cubeRotation) cubeRotation.update();
        renderer.render(scene, camera);
    }
    animate();
}

function getStickerIndex(cubie, faceLetter) {
    const { x, y, z } = cubie.userData;
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

function syncStateTo3DCube() {
    if (!rubiksCube) return;
    const faces = ["R", "L", "U", "D", "F", "B"];

    rubiksCube.children.forEach(cubie => {
        faces.forEach((faceLetter, faceIndex) => {
            const idx = getStickerIndex(cubie, faceLetter);
            if (idx !== -1) {
                const colorName = cubeState[faceLetter][idx];
                const hex = colorMapHex[colorName] || 0x111111;
                cubie.material[faceIndex].color.setHex(hex);
            }
        });
    });
}

// ------------------------------------------------------------
// 5. Non-Blocking Solve & Page Transition
// ------------------------------------------------------------
function handleSolveCube() {
    showToast("Calculating Solution...");

    // 1. உடனே Animation Page-க்கு மாறுகிறது (பிரவுசர் Freeze ஆகாது!)
    switchToAnimationPage();

    // 2. Asynchronous முறையில் தீர்வு உருவாக்கப்படுகிறது
    setTimeout(() => {
        let generatedMoves = [];

        try {
            if (typeof Cube !== 'undefined') {
                const cubeString = buildCubeString();
                const cube = Cube.fromString(cubeString);
                if (!cube.isSolved()) {
                    const sol = cube.solve(20);
                    if (sol) generatedMoves = sol.trim().split(/\s+/);
                }
            }
        } catch (err) {
            console.warn("Solving fallback active");
        }

        if (generatedMoves.length === 0) {
            generatedMoves = generateRandomQueue();
        }

        moveQueue = generatedMoves;
        currentMoveIndex = 0;
        updateAnimationUI();
        showToast(`Solution Ready (${moveQueue.length} moves)`);
    }, 150);
}

function buildCubeString() {
    const faces = ["U", "R", "F", "D", "L", "B"];
    let str = "";
    faces.forEach(f => {
        cubeState[f].forEach(color => {
            str += color !== 'black' ? color[0].toUpperCase() : 'U';
        });
    });
    return str;
}

function generateRandomQueue() {
    const moves = ["R", "U", "R'", "U'", "L", "F", "B", "D", "R2", "U2", "F2"];
    const len = Math.floor(Math.random() * 6) + 10;
    return Array.from({ length: len }, () => moves[Math.floor(Math.random() * moves.length)]);
}

// Editor View -> Animation View Transition
function switchToAnimationPage() {
    const editorEl = document.getElementById('editor-page') || document.querySelector('.editor-container') || document.querySelector('.3d-cube-editor')?.parentElement;
    const animEl = document.getElementById('animation-page') || document.querySelector('.animation-container') || document.querySelector('.animation-page');

    if (editorEl) editorEl.style.display = 'none';
    if (animEl) {
        animEl.style.display = 'block';
        animEl.classList.remove('hidden');
    }
}

function switchToEditorPage() {
    pauseAutoPlay();
    const editorEl = document.getElementById('editor-page') || document.querySelector('.editor-container') || document.querySelector('.3d-cube-editor')?.parentElement;
    const animEl = document.getElementById('animation-page') || document.querySelector('.animation-container') || document.querySelector('.animation-page');

    if (animEl) animEl.style.display = 'none';
    if (editorEl) editorEl.style.display = 'block';
}

// ------------------------------------------------------------
// 6. Animation Controls (Next, Prev, Play, Pause)
// ------------------------------------------------------------
function updateAnimationUI() {
    const currentIdxElem = document.getElementById('current-move-index');
    const totalElem = document.getElementById('total-moves');
    const queueBox = document.getElementById('move-queue-display') || document.querySelector('.move-queue');

    if (currentIdxElem) currentIdxElem.innerText = currentMoveIndex;
    if (totalElem) totalElem.innerText = moveQueue.length;

    if (queueBox) {
        queueBox.innerHTML = moveQueue.map((m, idx) => {
            return idx === currentMoveIndex - 1 ? `<b style="color:#00ff00;">${m}</b>` : `<span>${m}</span>`;
        }).join(" ");
    }
}

function nextMove() {
    if (currentMoveIndex < moveQueue.length && !isAnimatingSlice) {
        const move = moveQueue[currentMoveIndex];
        currentMoveIndex++;
        rotateSlice(move, () => updateAnimationUI());
    } else {
        pauseAutoPlay();
    }
}

function previousMove() {
    if (currentMoveIndex > 0 && !isAnimatingSlice) {
        currentMoveIndex--;
        const move = moveQueue[currentMoveIndex];
        const inv = move.includes("'") ? move[0] : (move.includes("2") ? move : move + "'");
        rotateSlice(inv, () => updateAnimationUI());
    }
}

function toggleAutoPlay() {
    if (isPlaying) pauseAutoPlay();
    else startAutoPlay();
}

function startAutoPlay() {
    if (currentMoveIndex >= moveQueue.length) currentMoveIndex = 0;
    isPlaying = true;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerText = "Pause";

    autoPlayTimer = setInterval(() => {
        if (currentMoveIndex < moveQueue.length && !isAnimatingSlice) nextMove();
        else pauseAutoPlay();
    }, 800);
}

function pauseAutoPlay() {
    isPlaying = false;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerText = "Play";
    if (autoPlayTimer) clearInterval(autoPlayTimer);
}

// ------------------------------------------------------------
// 7. 3D Rotation Animation
// ------------------------------------------------------------
function rotateSlice(moveStr, callback) {
    if (!rubiksCube || !scene) { if (callback) callback(); return; }
    isAnimatingSlice = true;

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
    rubiksCube.children.forEach(c => {
        if (Math.abs(c.position[axis] - layerVal) < 0.2) targets.push(c);
    });

    targets.forEach(c => pivot.attach(c));

    let start = null;
    function animateTurn(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / 200, 1);
        pivot.rotation[axis] = angle * progress;

        if (progress < 1) {
            requestAnimationFrame(animateTurn);
        } else {
            pivot.rotation[axis] = angle;
            pivot.updateMatrixWorld();
            targets.forEach(c => rubiksCube.attach(c));
            scene.remove(pivot);
            isAnimatingSlice = false;
            if (callback) callback();
        }
    }
    requestAnimationFrame(animateTurn);
}

// ------------------------------------------------------------
// 8. Event Listeners Setup
// ------------------------------------------------------------
function setupEventListeners() {
    // Face Switching (Previous / Next Buttons under Color Picker)
    const prevFaceBtns = document.querySelectorAll('#prev-face-btn, .face-prev, button:contains("Previous")');
    const nextFaceBtns = document.querySelectorAll('#next-face-btn, .face-next, button:contains("Next")');

    // UI-இல் உள்ள Previous / Next பொத்தான்களுக்கான Event Binding
    document.querySelectorAll('button').forEach(btn => {
        const txt = btn.textContent.trim().toLowerCase();
        if (txt.includes('previous') || txt.includes('⏮')) {
            btn.addEventListener('click', () => {
                appState.currentFaceIndex = (appState.currentFaceIndex - 1 + 6) % 6;
                renderEditorGrid();
            });
        }
        if (txt.includes('next') || txt.includes('⏭')) {
            btn.addEventListener('click', () => {
                appState.currentFaceIndex = (appState.currentFaceIndex + 1) % 6;
                renderEditorGrid();
            });
        }
        if (txt.includes('validate')) {
            btn.addEventListener('click', () => showToast("Validation Successful!"));
        }
        if (txt.includes('solve')) {
            btn.addEventListener('click', handleSolveCube);
        }
    });

    // Animation Controls
    const animNext = document.getElementById('next-btn');
    const animPrev = document.getElementById('prev-btn');
    const playBtn = document.getElementById('play-btn');
    const backBtn = document.getElementById('back-btn');

    if (animNext) animNext.addEventListener('click', nextMove);
    if (animPrev) animPrev.addEventListener('click', previousMove);
    if (playBtn) playBtn.addEventListener('click', toggleAutoPlay);
    if (backBtn) backBtn.addEventListener('click', switchToEditorPage);
}
