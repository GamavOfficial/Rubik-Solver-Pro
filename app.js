import * as THREE from "three";
import CubeEngine from "./js/cube-engine.js";

Cube.initSolver();

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
        if (window.cubeEngine) {
            window.cubeEngine.onResize();
        }
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
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(currentTheme);
});

function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
}

/* ==========================================
   Settings Button
========================================== */

const settingsBtn = document.getElementById("settings-btn");
settingsBtn.addEventListener("click", () => {
    showToast("Settings coming soon...");
});

/* ==========================================
   Install PWA
========================================== */

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
    colorButtons.forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelector(`[data-color="${color}"]`).classList.add("active");
}

function updateColorCounters() {
    Object.keys(colorUsage).forEach(color => {
        colorCounters[color].textContent = `${colorUsage[color]}/9`;
        const button = document.querySelector(`[data-color="${color}"]`);
        button.disabled = colorUsage[color] >= 9;
    });
}

/* ==========================================
   Cube Data & Controls Setup
========================================== */

const filledCount = document.getElementById("filled-count");
const validateBtn = document.getElementById("validate-btn");
const solveBtn = document.getElementById("solve-btn");
const previousFaceBtn = document.getElementById("previous-face");
const nextFaceBtn = document.getElementById("next-face");

function updateFaceCounter() {
    document.getElementById("face-counter").textContent = `${appState.currentFace + 1} / ${appState.totalFaces}`;
    document.getElementById("face-progress").value = appState.currentFace + 1;
}

function updateValidateButton() {
    validateBtn.disabled = appState.filledStickers !== 54;
}

function refreshEditor() {
    updateFaceCounter();
    updateValidateButton();
    updateColorCounters();
}

refreshEditor();
solveBtn.disabled = true;

const COLOR_TO_FACE = {
    white: "U",
    red: "R",
    green: "F",
    yellow: "D",
    orange: "L",
    blue: "B"
};

/* ==========================================
   CubeEngine Integration
========================================== */

const viewer = document.getElementById("viewer");

const cubeEngine = new CubeEngine({
    turnSpeed: 200
});

cubeEngine.initialize(viewer);
window.cubeEngine = cubeEngine;

cubeEngine.onStickerTapped = function(sticker) {
    const activeColorKey = appState.selectedColor;
    const faceLetter = COLOR_TO_FACE[activeColorKey];

    const currentStickerColor = sticker.userData.color;

    if (currentStickerColor !== faceLetter) {
        if (colorUsage[activeColorKey] >= 9) {
            showToast(activeColorKey + " limit reached (9/9)");
            return;
        }

        if (currentStickerColor) {
            const oldColorKey = Object.keys(COLOR_TO_FACE).find(key => COLOR_TO_FACE[key] === currentStickerColor);
            if (oldColorKey && colorUsage[oldColorKey] > 0) {
                colorUsage[oldColorKey]--;
            }
        }

        cubeEngine.setStickerColor(sticker, faceLetter);
        colorUsage[activeColorKey]++;

        updateFilledCounterFromEngine();
        updateValidateButton();
        updateColorCounters();

        showToast(activeColorKey + " Applied");
    }
};

function updateFilledCounterFromEngine() {
    const total = cubeEngine.getTotalStickersCompletedCount();
    appState.filledStickers = total;
    filledCount.textContent = `${total} / 54`;
}

/* ==========================================
   Face Navigation
========================================== */

const faceOrderList = ["F", "R", "B", "L", "U", "D"];

function showCurrentFace() {
    updateFaceCounter();
    const targetFace = faceOrderList[appState.currentFace];
    cubeEngine.navigateToFace(targetFace);
}

nextFaceBtn.addEventListener("click", () => {
    if (cubeEngine.isAnimating) return;
    if (appState.currentFace >= 5) return;

    appState.currentFace++;
    showCurrentFace();
});

previousFaceBtn.addEventListener("click", () => {
    if (cubeEngine.isAnimating) return;
    if (appState.currentFace <= 0) return;

    appState.currentFace--;
    showCurrentFace();
});

/* ==========================================
   Validation & Solve Execution
========================================== */

validateBtn.addEventListener("click", () => {
    if (appState.filledStickers !== 54) {
        showToast("Complete all 54 stickers.");
        return;
    }

    appState.cubeValidated = true;
    solveBtn.disabled = false;
    solveBtn.classList.remove("hidden");
    showToast("Cube validation successful.");
});

solveBtn.addEventListener("click", () => {
    if (!appState.cubeValidated) {
        showToast("Validate cube first.");
        return;
    }
    solveCube();
});

async function solveCube() {
    try {
        const cubeString = cubeEngine.getCubeString();
        console.log("Kociemba Cube String:", cubeString);

        if (!cubeString || cubeString.length !== 54) {
            showToast("Invalid Cube State!");
            return;
        }

        const cube = Cube.fromString(cubeString);

        if (cube.isSolved()) {
            showToast("Cube is already solved!");
            return;
        }

        const solution = cube.solve(22);

        if (solution) {
            showToast("Solution Found! Animating...");
            cubeEngine.applyAlgorithm(solution);
        } else {
            showToast("No solution found for this cube configuration.");
        }

    } catch (e) {
        alert("Solver Error: " + e.message);
        console.error(e);
    }
}

/* ==========================================
   Window Resize Handling
========================================== */

window.addEventListener("resize", () => {
    if (window.cubeEngine) {
        window.cubeEngine.onResize();
    }
});
