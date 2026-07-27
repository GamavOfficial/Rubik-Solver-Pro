import * as THREE from "three";
//import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import CubeEngine from "./js/cube-engine.js";
import { CubeRotation } from "./js/cube-rotation.js";




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

// ---------- [NEW ADD] Animation & Playback State ----------
let cubeAnimation = null;
let solverMoves = [];
let currentMoveIndex = 0;

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

    camera.aspect =
        viewer.clientWidth /
        viewer.clientHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        viewer.clientWidth,
        viewer.clientHeight
    );

    renderer.render(scene, camera);

}, 100);

showToast("Welcome to Rubik Solver Pro");

}

// ---------- Start App ----------

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

    currentTheme =
        currentTheme === "dark"
            ? "light"
            : "dark";

    applyTheme(currentTheme);

});

function applyTheme(theme) {

    document.body.setAttribute(
        "data-theme",
        theme
    );

    localStorage.setItem(
        "theme",
        theme
    );

    themeBtn.textContent =
        theme === "dark"
            ? "🌙"
            : "☀️";

}

/* ==========================================
   Settings Button
========================================== */

const settingsBtn =
document.getElementById("settings-btn");

settingsBtn.addEventListener("click", () => {

    showToast(
        "Settings coming soon..."
    );

});

/* ==========================================
   Install PWA
========================================== */

const installBtn =
document.getElementById("install-btn");

let deferredPrompt = null;

window.addEventListener(
    "beforeinstallprompt",
    (event) => {

        event.preventDefault();

        deferredPrompt = event;

        installBtn.style.display = "inline-flex";

    }
);

installBtn.addEventListener(
    "click",
    async () => {

        if (!deferredPrompt) {

            showToast(
                "Install not available."
            );

            return;

        }

        deferredPrompt.prompt();

        await deferredPrompt.userChoice;

        deferredPrompt = null;

        installBtn.style.display = "none";

    }
);

window.addEventListener(
    "appinstalled",
    () => {

        showToast(
            "Rubik Solver installed!"
        );

        installBtn.style.display = "none";

    }
);
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

// Default selected color
setActiveColor("white");

colorButtons.forEach(button => {

    button.addEventListener("click", () => {

        const color = button.dataset.color;

        setActiveColor(color);

    });

});

function setActiveColor(color) {

    appState.selectedColor = color;

    colorButtons.forEach(btn => {

        btn.classList.remove("active");

    });

    document
        .querySelector(`[data-color="${color}"]`)
        .classList.add("active");

}

function updateColorCounters() {

    Object.keys(colorUsage).forEach(color => {

        colorCounters[color].textContent =
            `${colorUsage[color]}/9`;

        const button =
            document.querySelector(`[data-color="${color}"]`);

        button.disabled =
            colorUsage[color] >= 9;

    });

}
/* ==========================================
   Cube Data
========================================== */

const FACE_NAMES = [
    "U",
    "R",
    "F",
    "D",
    "L",
    "B"
];

const cubeState = {

    U: Array(9).fill(null),
    R: Array(9).fill(null),
    F: Array(9).fill(null),
    D: Array(9).fill(null),
    L: Array(9).fill(null),
    B: Array(9).fill(null)

};

const filledCount =
document.getElementById("filled-count");

const validateBtn =
document.getElementById("validate-btn");

const solveBtn =
document.getElementById("solve-btn");

const previousFaceBtn =
document.getElementById("previous-face");

const nextFaceBtn =
document.getElementById("next-face");

/* ==========================================
   Face Counter
========================================== */

function updateFaceCounter() {

    document.getElementById("face-counter").textContent =
        `${appState.currentFace + 1} / ${appState.totalFaces}`;

    document.getElementById("face-progress").value =
        appState.currentFace + 1;

}

/* ==========================================
   Filled Counter
========================================== */

function updateFilledCounter() {

    let total = 0;

    Object.values(cubeState).forEach(face => {

        face.forEach(sticker => {

            if (sticker !== null) {

                total++;

            }

        });

    });

    appState.filledStickers = total;

    filledCount.textContent =
        `${total} / 54`;

}

/* ==========================================
   Validate Button
========================================== */

function updateValidateButton() {

    if (appState.filledStickers === 54) {

        validateBtn.disabled = false;

    } else {

        validateBtn.disabled = true;

    }

}

/* ==========================================
   Cube Validation
========================================== */

function validateCube() {

    console.log("validateCube called");

    const counts = {
        U: 0,
        R: 0,
        F: 0,
        D: 0,
        L: 0,
        B: 0
    };

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
            showToast(`Validation Failed: ${face} needs 9 stickers.`);
            return false;
        }
    }

    appState.cubeValidated = true;
    showToast("Cube validation successful.");
    return true;


}

/* ==========================================
   Validate Button Event
========================================== */

validateBtn.addEventListener("click", () => {


    console.log("Validate button clicked");

    if (validateCube()) {


        solveBtn.disabled = false;
        solveBtn.classList.remove("hidden");

    }

});

/* ==========================================
   Solve Button Event (Fixed Non-Blocking & Page Switch)
========================================== */

solveBtn.addEventListener("click", async () => {
    if (!appState.cubeValidated) {
        showToast("Validate cube first.");
        return;
    }

    const cubeString = window.getCubeString();

    if (!cubeString || cubeString.length !== 54 || cubeString.includes("null")) {
        showToast("Cube stickers incomplete!");
        return;
    }

    showToast("Calculating Solution... Please wait");
    solveBtn.disabled = true;

    // UI பிரவுசர் ஹேங் ஆகாமல் இருக்க சிறிது இடைவெளி தருகிறது
    await sleep(50);

    setTimeout(() => {
        try {
            if (typeof Cube !== "undefined" && typeof Cube.initSolver === "function") {
                Cube.initSolver();
            }

            const parsedCube = Cube.fromString(cubeString);

            if (parsedCube.isSolved()) {
                showToast("Cube is already solved!");
                solveBtn.disabled = false;
                return;
            }

            const solution = parsedCube.solve(22); // Maximum 22 moves

            if (solution) {
                const moves = solution.trim().split(/\s+/);
                window.loadSolution(moves);
            } else {
                showToast("No solution found for this cube configuration.");
                solveBtn.disabled = false;
            }

                } catch (err) {

            console.error("Solver Error:", err);
            showToast("Invalid Cube Layout! Check sticker colors.");
            solveBtn.disabled = false;
        }
    }, 50);
});



/* ==========================================
   Refresh UI
========================================== */

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
        case "U":
            return (z + 1) * 3 + (x + 1);

        case "D":
            return (1 - z) * 3 + (1 - x);

        case "F":
            return (1 - y) * 3 + (x + 1);

        case "B":
            return (1 - y) * 3 + (1 - x);

        case "R":
            return (1 - y) * 3 + (z + 1);

        case "L":
            return (1 - y) * 3 + (1 - z);

        default:
            return -1;
    }
}
/* ==========================================
   Three.js Scene Setup
========================================== */

const viewer = document.getElementById("viewer");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101826);

const camera = new THREE.PerspectiveCamera(
    35,
    viewer.clientWidth / viewer.clientHeight,
    0.1,
    1000
);

camera.position.set(4.5,4.5,4.5);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setPixelRatio(window.devicePixelRatio);

renderer.setSize(
    viewer.clientWidth,
    viewer.clientHeight
);

viewer.appendChild(renderer.domElement);

camera.position.set(0, 0, 8);
camera.lookAt(0, 0, 0);

/* ==========================================
   Lights
========================================== */

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    2
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    3
);

directionalLight.position.set(5, 10, 7);

scene.add(directionalLight);

/* ==========================================
   Orbit Controls
========================================== */
/*
const controls = new OrbitControls(
    camera,
    renderer.domElement
);

controls.target.set(0, 0, 0);
controls.update();

controls.enableDamping = false;

controls.enableRotate = false;
controls.enableZoom = false;
controls.enablePan = false;

camera.position.set(0,0,8);
camera.lookAt(0,0,0);*/


/* ==========================================
   Rubik's Cube (27 Cubies)
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

            const materials = [

    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 }),
    new THREE.MeshStandardMaterial({ color: 0x222222 })

];

            const cubie = new THREE.Mesh(
                new THREE.BoxGeometry(
                    cubieSize,
                    cubieSize,
                    cubieSize
                ),
                materials
            );

            cubie.position.set(
    x * (cubieSize + gap),
    y * (cubieSize + gap),
    z * (cubieSize + gap)
);

const isCenterCubie =
    x === 0 &&
    y === 0 &&
    z === 0;
    
    if (isCenterCubie) {
    console.log("Center Cubie Created");
}

cubie.userData = {
    x,
    y,
    z,

    painted: [null, null, null, null, null, null],
    original: [null, null, null, null, null, null],

    stickers: [
        { face: "R", index: -1 },
        { face: "L", index: -1 },
        { face: "U", index: -1 },
        { face: "D", index: -1 },
        { face: "F", index: -1 },
        { face: "B", index: -1 }
    ]
};

rubiksCube.add(cubie);

        }
    }
}

scene.add(rubiksCube);

rubiksCube.position.set(0, 0, 0);

const cubeRotation = new CubeRotation(rubiksCube);

// ---------- [NEW ADD] Initialize Mock Engine bridge for Animation ----------


const stickers = [];


const stickerSize = 0.82;

/* ==========================================
   Cube Orientation
========================================== */




/* ==========================================
   Raycaster
========================================== */

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

renderer.domElement.addEventListener(
    "pointerdown",
    onPointerDown
);

function onPointerDown(event) {

    const rect = renderer.domElement.getBoundingClientRect();

    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(rubiksCube.children);

    if (intersects.length === 0) return;

    const hit = intersects[0];
    const cubie = hit.object;

    // எந்த face-ஐ click செய்தோம்?
const faceIndex = Math.floor(hit.faceIndex / 2);

const previousColor = cubie.userData.painted[faceIndex];

const faceLetter = ["R","L","U","D","F","B"][faceIndex];

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

if (
    previousColor !== appState.selectedColor &&
    colorUsage[appState.selectedColor] >= 9
) {
    showToast(appState.selectedColor + " limit reached (9/9)");
    return;
}

if (previousColor === appState.selectedColor) {
    return;
}

if (previousColor) {
    colorUsage[previousColor]--;
}

cubie.userData.painted[faceIndex] = appState.selectedColor;

colorUsage[appState.selectedColor]++;

cubie.material[faceIndex].color.setHex(
    colorMap[appState.selectedColor]
);

const stickerIndex = getStickerIndex(cubie, faceLetter);

cubeState[faceLetter][stickerIndex] =
    COLOR_TO_FACE[appState.selectedColor];
    

updateFilledCounter();
updateValidateButton();
updateColorCounters();

showToast(appState.selectedColor + " Applied");

}

/* ==========================================
   Animation Loop
========================================== */

let firstFrame = true;

function animate() {

    if (firstFrame) {
    
        firstFrame = false;
    }

    requestAnimationFrame(animate);

    cubeRotation.update();

    // ---------- [NEW ADD] Update Animation Engine ----------

    renderer.render(scene, camera);

}



animate();

const faceRotations = [
    null,
    "right",
    "up",
    "right",
    "right",
    "up"
];

function debugRotation(move) {
    console.log(
        "Face:",
        appState.currentFace,
        "Move:",
        move,
        "Quaternion:",
        rubiksCube.quaternion.toArray()
    );
}

function showCurrentFace() {
    updateFaceCounter();
}

nextFaceBtn.addEventListener("click", () => {

    if (cubeRotation.isAnimating()) return;

    if (appState.currentFace >= 5) return;

    appState.currentFace++;

    const move = faceRotations[appState.currentFace];

    if (move) {
    debugRotation(move);
    cubeRotation.rotate(move);
}

    showCurrentFace();

});

previousFaceBtn.addEventListener("click", () => {

    if (cubeRotation.isAnimating()) return;

    if (appState.currentFace <= 0) return;

    const move = faceRotations[appState.currentFace];

    if (move === "right") {
        cubeRotation.rotate("left");
    } else if (move === "up") {
        cubeRotation.rotate("down");
    }

    appState.currentFace--;

    showCurrentFace();

});

/* ==========================================
   Window Resize
========================================== */

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            viewer.clientWidth /
            viewer.clientHeight;

        camera.updateProjectionMatrix();

        renderer.setSize(
            viewer.clientWidth,
            viewer.clientHeight
        );

    }
);


/* ==========================================
   Global Window Methods for Solver & Animation
========================================== */

window.getCubeString = function() {
    let result = "";
    const order = ["U", "R", "F", "D", "L", "B"];
    for (const face of order) {
        result += cubeState[face].join("");
    }
    return result;
};

// ---------- Safe Solution Handler (No Freezing) ----------
window.loadSolution = function(moves) {
    if (!moves || moves.length === 0) {
        showToast("No solution found!");
        solveBtn.disabled = false;
        return;
    }

    // 1. Editor பேஜை மறைத்துவிட்டு Solver பேஜுக்கு மாற்றுவது
    if (editorPage && solverPage) {
        editorPage.style.display = "none";
        solverPage.style.display = "block";
        editorPage.classList.add("hidden");
        solverPage.classList.remove("hidden");
    }

    // 2. UI-ல் மூவ்களைக் காட்டுவது
    const moveCounter = document.getElementById("move-counter");
    const statsMoves = document.getElementById("stats-moves");
    const algorithmList = document.getElementById("algorithm-list");
    const currentMoveEl = document.getElementById("current-move");

    if (moveCounter) moveCounter.textContent = `Move 1 / ${moves.length}`;
    if (statsMoves) statsMoves.textContent = moves.length;
    if (algorithmList) algorithmList.textContent = moves.join(" ");
    if (currentMoveEl) currentMoveEl.textContent = moves[0] || "-";

    showToast(`Solution found! ${moves.length} moves.`);

    // 3. Solve Again பட்டன் வேலை செய்ய வைப்பது
    const solveAgainBtn = document.getElementById("solve-again");
    if (solveAgainBtn) {
        solveAgainBtn.onclick = () => window.location.reload();
    }
};
