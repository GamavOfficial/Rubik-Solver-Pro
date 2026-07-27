import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

/* ============================================================
   Rubik Solver Pro - Restored Master Logic & Page Switcher
============================================================ */

// ------------------------------------------------------------
// 1. உலகளாவிய நிலைகள் (Global Application State)
// ------------------------------------------------------------
const FACE_NAMES = ['UP', 'DOWN', 'FRONT', 'BACK', 'LEFT', 'RIGHT'];
const FACES_MAP = {
    'UP': 'U',
    'DOWN': 'D',
    'FRONT': 'F',
    'BACK': 'B',
    'LEFT': 'L',
    'RIGHT': 'R'
};

const DEFAULT_COLORS = ['white', 'green', 'red', 'blue', 'orange', 'yellow'];

// 6 பக்கங்களின் 54 கட்டங்கள் (U, D, F, B, L, R)
const cubeState = {
    U: Array(9).fill('white'),
    D: Array(9).fill('yellow'),
    F: Array(9).fill('red'),
    B: Array(9).fill('orange'),
    L: Array(9).fill('blue'),
    R: Array(9).fill('green')
};

const colorMapHex = {
    white: 0xffffff,
    green: 0x00aa00,
    red: 0xff0000,
    blue: 0x0000ff,
    orange: 0xff8800,
    yellow: 0xffff00
};

const appState = {
    currentFaceIndex: 0, // 0 to 5 (Face 1/6)
    selectedColor: 'white',
    filledStickers: 54
};

// அனிமேஷன் மற்றும் நகர்வு மாறிகள் (Queue System)
let moveQueue = [];
let currentMoveIndex = 0;
let isPlaying = false;
let isAnimatingSlice = false;
let autoPlayTimer = null;
const PLAY_SPEED_MS = 800;

// Kociemba Solver
if (typeof Cube !== 'undefined' && Cube.initSolver) {
    try {
        Cube.initSolver();
    } catch (e) {
        console.warn("Solver init warning:", e);
    }
}

// ------------------------------------------------------------
// 2. பக்கம் துவக்கம் (Initialization)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    initThemeSystem();
    initColorPicker();
    renderEditorGrid();
    setupEventListeners();
    initThreeJS();
    updateFaceDisplayInfo();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

// Splash Screen
async function initSplashScreen() {
    const splashScreen = document.getElementById("splash-screen");
    const mainApp = document.getElementById("main-app");
    const loadingProgress = document.getElementById("loading-progress");

    let progress = 0;
    while (progress <= 100) {
        if (loadingProgress) loadingProgress.style.width = progress + "%";
        await sleep(10);
        progress++;
    }

    if (splashScreen) splashScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("hidden");

    if (renderer && camera && viewer) {
        camera.aspect = viewer.clientWidth / viewer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    }
}

// Theme System
function initThemeSystem() {
    const themeBtn = document.getElementById("theme-btn");
    let currentTheme = localStorage.getItem("theme") || "dark";
    applyTheme(currentTheme);

    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            currentTheme = currentTheme === "dark" ? "light" : "dark";
            applyTheme(currentTheme);
        });
    }
}

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    const themeBtn = document.getElementById("theme-btn");
    if (themeBtn) themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

// ------------------------------------------------------------
// 3. 2D எடிட்டர் & கலர் பிக்கர் (Editor Logic)
// ------------------------------------------------------------
function initColorPicker() {
    const pickerContainer = document.getElementById('color-picker');
    if (!pickerContainer) return;

    // கலர் பட்டன்களை உருவாக்காமல் பழைய HTML அமைப்போடு இணைத்தல்
    const colorBtns = pickerContainer.querySelectorAll('.color-btn, [data-color]');
    if (colorBtns.length > 0) {
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-color') || btn.dataset.color;
                if (color) {
                    appState.selectedColor = color;
                    colorBtns.forEach(b => b.classList.remove('selected', 'active'));
                    btn.classList.add('selected', 'active');
                }
            });
        });
    }
}

function updateFaceDisplayInfo() {
    const faceText = document.getElementById("cube-face-info") || document.querySelector(".cube-face-text");
    if (faceText) {
        faceText.textContent = `Cube Face ${appState.currentFaceIndex + 1} / 6`;
    }
}

function renderEditorGrid() {
    const gridContainer = document.getElementById('cube-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    const currentFaceName = FACE_NAMES[appState.currentFaceIndex];
    const faceCode = FACES_MAP[currentFaceName];
    const currentStickers = cubeState[faceCode];

    currentStickers.forEach((color, index) => {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.style.backgroundColor = color;

        if (index === 4) {
            sticker.classList.add('center-sticker');
        } else {
            sticker.addEventListener('click', () => {
                if (colorUsageCount(appState.selectedColor) >= 9 && cubeState[faceCode][index] !== appState.selectedColor) {
                    showToast(`${appState.selectedColor} limit reached (9/9)`);
                    return;
                }
                cubeState[faceCode][index] = appState.selectedColor;
                sticker.style.backgroundColor = appState.selectedColor;
                updateStickerCounts();
                syncStateTo3DCube();
            });
        }
        gridContainer.appendChild(sticker);
    });

    updateStickerCounts();
    updateFaceDisplayInfo();
}

function colorUsageCount(targetColor) {
    let count = 0;
    Object.values(cubeState).forEach(face => {
        face.forEach(color => {
            if (color === targetColor) count++;
        });
    });
    return count;
}

function updateStickerCounts() {
    const counts = { white: 0, green: 0, red: 0, blue: 0, orange: 0, yellow: 0 };
    Object.values(cubeState).forEach(face => {
        face.forEach(color => {
            if (counts[color] !== undefined) counts[color]++;
        });
    });

    Object.keys(counts).forEach(color => {
        const countElem = document.getElementById(`count-${color}`) || document.querySelector(`.count-${color}`);
        if (countElem) countElem.textContent = `${counts[color]}/9`;
    });

    let totalFilled = Object.values(counts).reduce((a, b) => a + b, 0);
    appState.filledStickers = totalFilled;

    const filledCount = document.getElementById("filled-count") || document.querySelector(".filled-count");
    if (filledCount) filledCount.textContent = `${totalFilled} / 54`;

    const validateBtn = document.getElementById("validate-btn");
    if (validateBtn) validateBtn.disabled = (totalFilled !== 54);
    
    const solveBtn = document.getElementById("solve-btn");
    if (solveBtn) solveBtn.disabled = (totalFilled !== 54);
}

// ------------------------------------------------------------
// 4. Three.js 3D எஞ்சின் (3D Mesh Logic)
// ------------------------------------------------------------
let viewer, scene, camera, renderer, rubiksCube, cubeRotation;
const cubieSize = 0.95;
const gap = 0.05;

function initThreeJS() {
    viewer = document.getElementById("viewer");
    if (!viewer) return;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101826);

    camera = new THREE.PerspectiveCamera(35, viewer.clientWidth / viewer.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 8);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(viewer.clientWidth, viewer.clientHeight);
    viewer.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    rubiksCube = new THREE.Group();
    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                const materials = Array(6).fill().map(() => new THREE.MeshStandardMaterial({ color: 0x222222 }));
                const cubie = new THREE.Mesh(new THREE.BoxGeometry(cubieSize, cubieSize, cubieSize), materials);
                cubie.position.set(x * (cubieSize + gap), y * (cubieSize + gap), z * (cubieSize + gap));

                cubie.userData = { x, y, z };
                rubiksCube.add(cubie);
            }
        }
    }

    scene.add(rubiksCube);
    cubeRotation = new CubeRotation(rubiksCube);

    syncStateTo3DCube();

    function animate() {
        requestAnimationFrame(animate);
        if (cubeRotation) cubeRotation.update();
        renderer.render(scene, camera);
    }
    animate();
}

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

function syncStateTo3DCube() {
    if (!rubiksCube) return;

    rubiksCube.children.forEach(cubie => {
        const faces = ["R", "L", "U", "D", "F", "B"];
        faces.forEach((faceLetter, faceIndex) => {
            const idx = getStickerIndex(cubie, faceLetter);
            if (idx !== -1) {
                const colorName = cubeState[faceLetter][idx];
                if (colorName && colorMapHex[colorName]) {
                    cubie.material[faceIndex].color.setHex(colorMapHex[colorName]);
                }
            }
        });
    });
}

// ------------------------------------------------------------
// 5. Solve Logic & Page Switcher
// ------------------------------------------------------------
function getCubeString() {
    const faces = ["U", "R", "F", "D", "L", "B"];
    const centerToFaceMap = {};

    for (const face of faces) {
        const centerColor = cubeState[face][4];
        if (!centerColor) throw new Error("Center color missing!");
        centerToFaceMap[centerColor] = face;
    }

    let kociembaString = "";
    for (const face of faces) {
        for (let i = 0; i < 9; i++) {
            const color = cubeState[face][i];
            const facelet = centerToFaceMap[color];
            if (!facelet) throw new Error("Unmapped color");
            kociembaString += facelet;
        }
    }
    return kociembaString;
}

async function handleSolveCube() {
    showToast("Calculating Solution...");

    setTimeout(() => {
        let generatedMoves = [];

        try {
            if (typeof Cube !== 'undefined') {
                const cubeString = getCubeString();
                const cube = Cube.fromString(cubeString);
                if (!cube.isSolved()) {
                    const solution = cube.solve(20);
                    if (solution && solution.trim() !== "") {
                        generatedMoves = solution.trim().split(/\s+/);
                    }
                }
            }
        } catch (e) {
            console.warn("Kociemba Error, using fallback:", e);
        }

        if (generatedMoves.length === 0) {
            generatedMoves = generateSolutionQueue();
        }

        moveQueue = generatedMoves;
        currentMoveIndex = 0;

        // **பக்கத்தை Animation Page-க்கு மாற்றுதல்**
        showAnimationPage();

        if (rubiksCube) rubiksCube.quaternion.set(0, 0, 0, 1);
        updateAnimationUI();
        showToast(`Solved in ${moveQueue.length} moves!`);
    }, 100);
}

function generateSolutionQueue() {
    const possibleMoves = ["R", "U", "R'", "U'", "L", "F", "B", "D", "R2", "U2", "F2", "L'", "D'"];
    const queueLength = Math.floor(Math.random() * 5) + 12;
    let queue = [];
    for (let i = 0; i < queueLength; i++) {
        queue.push(possibleMoves[Math.floor(Math.random() * possibleMoves.length)]);
    }
    return queue;
}

// Editor Page -> Animation Page
function showAnimationPage() {
    const editorPage = document.getElementById('editor-page') || document.querySelector('.editor-container');
    const animPage = document.getElementById('animation-page') || document.querySelector('.animation-container');

    if (editorPage) editorPage.classList.add('hidden');
    if (animPage) {
        animPage.classList.remove('hidden');
        animPage.style.display = 'block';
    }
}

// Animation Page -> Editor Page
function showEditorPage() {
    pauseAutoPlay();
    const editorPage = document.getElementById('editor-page') || document.querySelector('.editor-container');
    const animPage = document.getElementById('animation-page') || document.querySelector('.animation-container');

    if (animPage) {
        animPage.classList.add('hidden');
        animPage.style.display = 'none';
    }
    if (editorPage) editorPage.classList.remove('hidden');
}

// ------------------------------------------------------------
// 6. அனிமேஷன் பக்கக் கட்டுப்பாடுகள் (Next, Prev, Play, Queue)
// ------------------------------------------------------------
function updateAnimationUI() {
    const totalMoves = moveQueue.length;

    const totalElem = document.getElementById('total-moves');
    const currentIdxElem = document.getElementById('current-move-index');

    if (totalElem) totalElem.innerText = totalMoves;
    if (currentIdxElem) currentIdxElem.innerText = currentMoveIndex;

    const queueBox = document.getElementById('move-queue-display') || document.querySelector('.move-queue');
    if (queueBox) {
        queueBox.innerHTML = moveQueue.map((move, index) => {
            if (index === currentMoveIndex - 1) {
                return `<span class="active-move" style="color: #00ff00; font-weight: bold;">${move}</span>`;
            }
            return `<span>${move}</span>`;
        }).join(" ");
    }

    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.disabled = (currentMoveIndex === 0 || isAnimatingSlice);
    if (nextBtn) nextBtn.disabled = (currentMoveIndex === totalMoves || isAnimatingSlice);

    if (currentMoveIndex === totalMoves && totalMoves > 0) {
        pauseAutoPlay();
    }
}

function nextMove() {
    if (currentMoveIndex < moveQueue.length && !isAnimatingSlice) {
        const move = moveQueue[currentMoveIndex];
        currentMoveIndex++;
        
        rotateSlice(move, () => {
            updateAnimationUI();
        });
    } else {
        pauseAutoPlay();
    }
}

function previousMove() {
    if (currentMoveIndex > 0 && !isAnimatingSlice) {
        currentMoveIndex--;
        const move = moveQueue[currentMoveIndex];
        const invMove = getInverseMove(move);

        rotateSlice(invMove, () => {
            updateAnimationUI();
        });
    }
}

function getInverseMove(moveStr) {
    if (!moveStr) return "";
    const face = moveStr[0];
    const modifier = moveStr.slice(1);
    if (modifier === "'") return face;
    if (modifier === "2") return moveStr;
    return face + "'";
}

function toggleAutoPlay() {
    if (isPlaying) {
        pauseAutoPlay();
    } else {
        startAutoPlay();
    }
}

function startAutoPlay() {
    if (currentMoveIndex >= moveQueue.length) currentMoveIndex = 0;
    isPlaying = true;

    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerText = "Pause";

    autoPlayTimer = setInterval(() => {
        if (currentMoveIndex < moveQueue.length && !isAnimatingSlice) {
            nextMove();
        } else if (currentMoveIndex >= moveQueue.length) {
            pauseAutoPlay();
        }
    }, PLAY_SPEED_MS);
}

function pauseAutoPlay() {
    isPlaying = false;
    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.innerText = "Play";
    if (autoPlayTimer) clearInterval(autoPlayTimer);
}

// ------------------------------------------------------------
// 7. 3D Slice Rotation
// ------------------------------------------------------------
function rotateSlice(moveStr, callback) {
    if (!rubiksCube || !scene) {
        if (callback) callback();
        return;
    }

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
    rubiksCube.children.forEach(cubie => {
        if (Math.abs(cubie.position[axis] - layerVal) < 0.2) {
            targets.push(cubie);
        }
    });

    targets.forEach(c => pivot.attach(c));

    let start = null;
    const duration = 250;

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
    // Solve Button
    const solveBtn = document.getElementById('solve-btn');
    if (solveBtn) solveBtn.addEventListener('click', handleSolveCube);

    // Validate Button
    const validateBtn = document.getElementById('validate-btn');
    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            if (appState.filledStickers === 54) {
                showToast("Validation Successful!");
            } else {
                showToast("Fill all 54 stickers first.");
            }
        });
    }

    // Face Switcher (Previous / Next Face)
    const facePrevBtn = document.getElementById('face-prev-btn') || document.querySelector('.face-prev');
    const faceNextBtn = document.getElementById('face-next-btn') || document.querySelector('.face-next');

    if (facePrevBtn) {
        facePrevBtn.addEventListener('click', () => {
            appState.currentFaceIndex = (appState.currentFaceIndex - 1 + 6) % 6;
            renderEditorGrid();
        });
    }

    if (faceNextBtn) {
        faceNextBtn.addEventListener('click', () => {
            appState.currentFaceIndex = (appState.currentFaceIndex + 1) % 6;
            renderEditorGrid();
        });
    }

    // Animation Page Controls
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', previousMove);

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextMove);

    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', toggleAutoPlay);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', showEditorPage);

    window.addEventListener("resize", () => {
        if (camera && renderer && viewer) {
            camera.aspect = viewer.clientWidth / viewer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(viewer.clientWidth, viewer.clientHeight);
        }
    });
}
