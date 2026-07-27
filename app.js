import CubeEngine from "./cube-engine.js";

document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("cube-container");
    if (!container) return;

    const cube = new CubeEngine();
    cube.initialize(container);

    // Sample Algorithm Moves
    const solutionMoves = ["R", "U", "R'", "U'", "R'", "F", "R2", "U'"];
    let currentIndex = 0;

    const moveDisplay = document.getElementById("current-move-display");
    const counterDisplay = document.getElementById("move-counter");

    function updateUI() {
        if (moveDisplay) moveDisplay.textContent = solutionMoves[currentIndex] || "Done";
        if (counterDisplay) counterDisplay.textContent = `Move ${currentIndex + 1} / ${solutionMoves.length}`;
    }

    // Next Button Click
    document.getElementById("next-btn")?.addEventListener("click", () => {
        if (currentIndex < solutionMoves.length) {
            cube.applyMove(solutionMoves[currentIndex], false);
            currentIndex++;
            updateUI();
        }
    });

    // Previous Button Click
    document.getElementById("prev-btn")?.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            cube.applyMove(solutionMoves[currentIndex], true); // Reverse move
            updateUI();
        }
    });

    updateUI();
});
