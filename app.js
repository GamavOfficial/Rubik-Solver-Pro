import CubeEngine from "./cube-engine.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("cube-container");
    const loadingScreen = document.getElementById("loading-screen");

    if (!container) return;

    const cube = new CubeEngine();
    cube.initialize(container);

    // Hide Loading Screen smoothly
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.style.opacity = "0";
            setTimeout(() => loadingScreen.remove(), 500);
        }
    }, 500);

    const solutionMoves = ["R", "U", "R'", "U'", "R'", "F", "R2", "U'", "R", "U", "R'", "U'", "R'", "F'", "R"];
    let currentIndex = 0;
    let isPlaying = false;
    let playInterval = null;

    const moveDisplay = document.getElementById("current-move-display");
    const counterDisplay = document.getElementById("move-counter");
    const algorithmText = document.getElementById("algorithm-text");
    const totalMovesText = document.getElementById("total-moves");

    if (algorithmText) algorithmText.textContent = solutionMoves.join(" ");
    if (totalMovesText) totalMovesText.textContent = solutionMoves.length;

    function updateUI() {
        if (moveDisplay) moveDisplay.textContent = solutionMoves[currentIndex] || "Done";
        if (counterDisplay) counterDisplay.textContent = `Move ${currentIndex} / ${solutionMoves.length}`;
    }

    // Next Move
    document.getElementById("next-btn")?.addEventListener("click", () => {
        if (currentIndex < solutionMoves.length && !cube.isAnimating) {
            cube.applyMove(solutionMoves[currentIndex], false);
            currentIndex++;
            updateUI();
        }
    });

    // Previous Move
    document.getElementById("prev-btn")?.addEventListener("click", () => {
        if (currentIndex > 0 && !cube.isAnimating) {
            currentIndex--;
            cube.applyMove(solutionMoves[currentIndex], true);
            updateUI();
        }
    });

    // Play Automation
    document.getElementById("play-btn")?.addEventListener("click", () => {
        if (isPlaying) return;
        isPlaying = true;
        
        playInterval = setInterval(() => {
            if (currentIndex < solutionMoves.length) {
                if (!cube.isAnimating) {
                    cube.applyMove(solutionMoves[currentIndex], false);
                    currentIndex++;
                    updateUI();
                }
            } else {
                clearInterval(playInterval);
                isPlaying = false;
            }
        }, 400);
    });

    // Pause Automation
    document.getElementById("pause-btn")?.addEventListener("click", () => {
        isPlaying = false;
        if (playInterval) clearInterval(playInterval);
    });

    updateUI();
});
