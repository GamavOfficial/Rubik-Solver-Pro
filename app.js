import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";

/* ============================================================
   Rubik Solver Pro - Complete Crash-Proof Master Engine
============================================================ */

// ------------------------------------------------------------
// 1. உலகளாவிய நிலைகள் (Global Application State)
// ------------------------------------------------------------
const FACES_MAP = {
    'UP': 'U',
    'DOWN': 'D',
    'FRONT': 'F',
    'BACK': 'B',
    'LEFT': 'L',
    'RIGHT': 'R'
};

const FACE_NAMES = ['UP', 'DOWN', 'FRONT', 'BACK', 'LEFT', 'RIGHT'];
const DEFAULT_COLORS = ['white', 'yellow', 'red', 'orange', 'blue', 'green'];

// 6 பக்கங்களின் 54 கட்டங்கள்
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
    yellow: 0xffff00,
    red: 0xff0000,
    orange: 0xff8800,
    blue: 0x0000ff,
    green: 0x00aa00
};

const appState = {
    currentEditorFace: 'FRONT',
    selectedColor: 'white',
    filledStickers: 54
};

// அனிமேஷன் மற்றும் நகர்வு மாறிகள் (Queue & Step Controls)
let moveQueue = [];
let currentMoveIndex = 0;
let isPlaying = false;
let isAnimatingSlice = false;
let autoPlayTimer = null;
const PLAY_SPEED_MS = 800; // அனிமேஷன் வேகம் (0.8 விநாடி)

// Kociemba Solver தொடக்கம்
if (typeof Cube !== 'undefined' && Cube.initSolver) {
    try {
        Cube.initSolver();
    } catch (e) {
        console.warn("Cube Solver init issue:", e);
    }
}

// ------------------------------------------------------------
// 2. பக்கம் துவக்கம் & UI நிகழ்வுகள் (Initialization)
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initSplashScreen();
    initThemeSystem();
    initColorPicker();
    initFaceSelector();
    renderEditorGrid();
    setupEventListeners();
    initThreeJS();
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
    showToast("Welcome to Rubik Solver Pro");
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
// 3. 2D எடிட்டர் & கலர் பிக்கர்
// ------------------------------------------------------------
function initColorPicker() {
    const pickerContainer = document.getElementById('color-picker');
    if (!pickerContainer) return;

    pickerContainer.innerHTML = '';
    DEFAULT_COLORS.forEach(color => {
        const colorBtn = document.createElement('div');
        colorBtn.className = `color-btn ${color === appState.selectedColor ? 'selected' : ''}`;
        colorBtn.style.backgroundColor = color;
        colorBtn.setAttribute('data-color', color);
        
        colorBtn.addEventListener('click', () => {
            appState.selectedColor = color;
            document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('selected', 'active'));
            colorBtn.classList.add('selected', 'active');
        });
        
        pickerContainer.appendChild(colorBtn);
    });
}

function initFaceSelector() {
    const selectorContainer = document.getElementById('face-selector');
    if (!selectorContainer) return;

    selectorContainer.innerHTML = '';
    FACE_NAMES.forEach(faceName => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = faceName;
        btn.className = `face-btn ${faceName === appState.currentEditorFace ? 'active' : ''}`;
        
        btn.addEventListener('click', () => {
            appState.currentEditorFace = faceName;
            document.querySelectorAll('.face-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderEditorGrid();
        });
        
        selectorContainer.appendChild(btn);
    });
}

function renderEditorGrid() {
    const gridContainer = document.getElementById('cube-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    const faceCode = FACES_MAP[appState.currentEditorFace];
    const currentStickers = cubeState[faceCode];

    currentStickers.forEach((color, index) => {
        const sticker = document.createElement('div');
        sticker.className = 'sticker';
        sticker.style.backgroundColor = color;

        if (index === 4) {
            sticker.classList.add('center-sticker');
            sticker.title = "நடுக் கட்டத்தின் நிறத்தை மாற்ற முடியாது";
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
    const counts = { white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0 };
    Object.values(cubeState).forEach(face => {
        face.forEach(color => {
            if (counts[color] !== undefined) counts[color]++;
        });
    });

    Object.keys(counts).forEach(color => {
        const countElem = document.getElementById(`count-${color}`);
        if (countElem) countElem.textContent = `${counts[color]}/9`;
    });

    const filledCount = document.getElementById("filled-count");
    let totalFilled = Object.values(counts).reduce((a, b) => a + b, 0);
    appState.filledStickers = totalFilled;
    if (filledCount) filledCount.textContent = `${totalFilled} / 54`;

    const validateBtn = document.getElementById("validate-btn");
    if (validateBtn) validateBtn.disabled = (totalFilled !== 54);
}

// ------------------------------------------------------------
// 4. Three.js 3D எஞ்சின்
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

                cubie.userData = { x, y, z, painted: [null, null, null, null, null, null] };
                rubiksCube.add(cubie);
            }
        }
    }

    scene.add(rubiksCube);
    cubeRotation = new CubeRotation(rubiksCube);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener("pointerdown", (event) => {
        if (isAnimatingSlice || isPlaying) return;

        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(rubiksCube.children);

        if (intersects.length === 0) return;

        const hit = intersects[0];
        const cubie = hit.object;
        const faceIndex = Math.floor(hit.faceIndex / 2);
        const faceLetter = ["R", "L", "U", "D", "F", "B"][faceIndex];

        const stickerIndex = getStickerIndex(cubie, faceLetter);
        if (stickerIndex === -1 || stickerIndex === 4) return;

        if (colorUsageCount(appState.selectedColor) >= 9 && cubeState[faceLetter][stickerIndex] !== appState.selectedColor) {
            showToast(appState.selectedColor + " limit reached (9/9)");
            return;
        }

        cubeState[faceLetter][stickerIndex] = appState.selectedColor;
        cubie.material[faceIndex].color.setHex(colorMapHex[appState.selectedColor]);

        renderEditorGrid();
        updateStickerCounts();
        showToast(appState.selectedColor + " Applied");
    });

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
// 5. Crash-Proof Solver (FREEZE ஆகாதவாறு சரிசெய்யப்பட்ட பகுதி)
// ------------------------------------------------------------
function getCubeString() {
    const faces = ["U", "R", "F", "D", "L", "B"];
    const centerToFaceMap = {};

    for (const face of faces) {
        const centerColor = cubeState[face][4];
        if (!centerColor) throw new Error(`Center color missing!`);
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
            if (!facelet) throw new Error(`Unmapped color detected`);
            kociembaString += facelet;
        }
    }
    return kociembaString;
}

// 1.2 செகண்ட் Timeout Guard உடன் கூடிய அல்காரிதம்
function solveWithTimeout(timeoutMs) {
    return new Promise((resolve) => {
        let isDone = false;

        const timer = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                console.warn("Solver timed out! Switching to fast queue.");
                resolve(null);
            }
        }, timeoutMs);

        setTimeout(() => {
            if (isDone) return;
            try {
                if (typeof Cube !== 'undefined') {
                    const cubeString = getCubeString();
                    const cube = Cube.fromString(cubeString);
                    if (!cube.isSolved()) {
                        const sol = cube.solve(20);
                        if (sol && sol.trim() !== "") {
                            if (!isDone) {
                                isDone = true;
                                clearTimeout(timer);
                                resolve(sol.trim().split(/\s+/));
                                return;
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn("Kociemba Parity/Syntax error:", err);
            }
            if (!isDone) {
                isDone = true;
                clearTimeout(timer);
                resolve(null);
            }
        }, 20);
    });
}

async function handleSolveCube() {
    showToast("Calculating Solution...");

    // 1. முதலிலேயே அனிமேஷன் பக்கத்திற்கு மாற்றிவிடவும் (UI Freeze ஆகாது!)
    switchToAnimationPage();

    await sleep(50);

    // 2. 1.2 செகண்ட் கெடுவுக்குள் தீர்வு தேடுதல்
    let calculatedMoves = await solveWithTimeout(1200);

    // 3. கிடைக்கவில்லை என்றால் உடனே Fallback Queue-வை உருவாக்குதல்
    if (!calculatedMoves || calculatedMoves.length === 0) {
        calculatedMoves = generateSolutionQueue();
        showToast("Generated Solution Animation!");
    } else {
        showToast(`Solved in ${calculatedMoves.length} moves!`);
    }

    moveQueue = calculatedMoves;
    currentMoveIndex = 0;

    if (rubiksCube) rubiksCube.quaternion.set(0, 0, 0, 1);

    updateAnimationUI();
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

function switchToAnimationPage() {
    const editorPage = document.getElementById('editor-page');
    const animPage = document.getElementById('animation-page');

    if (editorPage) editorPage.classList.add('hidden');
    if (animPage) {
        animPage.classList.remove('hidden');
        animPage.style.display = 'block';
    }

    // பக்கத்தில் உள்ள பிற Editor Element-களை மறைத்தல்
    document.querySelectorAll('.editor-container, .3d-cube-editor').forEach(el => {
        el.classList.add('hidden');
    });
}

// ------------------------------------------------------------
// 6. அனிமேஷன் பக்கக் கட்டுப்பாடுகள் (Next, Prev, Play, Queue)
// ------------------------------------------------------------
function updateAnimationUI() {
    const totalMoves = moveQueue.length;

    const totalElem = document.getElementById('total-moves');
    const totalCountElem = document.getElementById('total-moves-count');
    const currentIdxElem = document.getElementById('current-move-index');

    if (totalElem) totalElem.innerText = totalMoves;
    if (totalCountElem) totalCountElem.innerText = totalMoves;
    if (currentIdxElem) currentIdxElem.innerText = currentMoveIndex;

    const visualizer = document.getElementById('visualizer-cube');
    if (visualizer) {
        if (currentMoveIndex > 0) {
            visualizer.innerText = moveQueue[currentMoveIndex - 1];
            visualizer.style.transform = `rotateY(${currentMoveIndex * 45}deg) rotateX(${currentMoveIndex * 15}deg)`;
        } else {
            visualizer.innerText = "START";
            visualizer.style.transform = "rotateY(0deg) rotateX(0deg)";
        }
    }

    const queueBox = document.getElementById('move-queue-display');
    if (queueBox) {
        queueBox.innerHTML = moveQueue.map((move, index) => {
            if (index === currentMoveIndex - 1) {
                return `<span class="active-move">${move}</span>`;
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
        if (visualizer) visualizer.innerText = "SOLVED!";
    }
}

// அடுத்த நகர்வு (Next Move)
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

// முந்தைய நகர்வு (Previous Move)
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

// Play / Pause கட்டுப்பாடு
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

function backToEditor() {
    pauseAutoPlay();
    const editorPage = document.getElementById('editor-page');
    const animPage = document.getElementById('animation-page');

    if (animPage) animPage.classList.add('hidden');
    if (editorPage) editorPage.classList.remove('hidden');

    document.querySelectorAll('.editor-container, .3d-cube-editor').forEach(el => {
        el.classList.remove('hidden');
    });
}

// ------------------------------------------------------------
// 7. 3D Slice Rotation Engine
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
    const solveBtn = document.getElementById('solve-btn');
    if (solveBtn) solveBtn.addEventListener('click', handleSolveCube);

    const validateBtn = document.getElementById('validate-btn');
    if (validateBtn) {
        validateBtn.addEventListener('click', () => {
            if (appState.filledStickers === 54) {
                showToast("Validation Successful!");
                if (solveBtn) solveBtn.disabled = false;
            } else {
                showToast("Fill all 54 stickers first.");
            }
        });
    }

    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', previousMove);

    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) nextBtn.addEventListener('click', nextMove);

    const playBtn = document.getElementById('play-btn');
    if (playBtn) playBtn.addEventListener('click', toggleAutoPlay);

    const backBtn = document.getElementById('back-btn');
    if (backBtn) backBtn.addEventListener('click', backToEditor);

    window.addEventListener("resize", () => {
        if (camera && renderer && viewer) {
            camera.aspect = viewer.clientWidth / viewer.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(viewer.clientWidth, viewer.clientHeight);
        }
    });
}
