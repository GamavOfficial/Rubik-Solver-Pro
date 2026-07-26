/**
 * Solver Integration Module
 * Solves the cube state string without freezing browser main thread
 */

let initialized = false;

export function initSolver() {
    if (!initialized && typeof Cube !== 'undefined' && Cube.initSolver) {
        Cube.initSolver();
        initialized = true;
    }
}

export async function solveCube(cubeString) {
    return new Promise((resolve, reject) => {
        try {
            initSolver();

            // Asynchronous Execution via Event Loop
            setTimeout(() => {
                try {
                    const cube = Cube.fromString(cubeString);

                    if (cube.isSolved()) {
                        resolve([]);
                        return;
                    }

                    // Solve execution call
                    const solution = cube.solve();

                    if (!solution) {
                        reject(new Error("No solution found for current cube permutation."));
                        return;
                    }

                    const moves = solution.trim().split(/\s+/);
                    resolve(moves);
                } catch (err) {
                    reject(err);
                }
            }, 30);
        } catch (err) {
            reject(err);
        }
    });
}
