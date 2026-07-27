/**
==========================================================
Rubik Solver Pro - Cube Rotation & Animation Engine
js/cube-rotation.js
==========================================================
*/

import * as THREE from "three";

export class CubeRotation {
    constructor(rubiksCubeGroup) {
        this.cubeGroup = rubiksCubeGroup;
        this.animating = false;
        this.activeTween = null;
    }

    // கியூப் முழுவதையும் திருப்புவதற்கான மெத்தட் (Editor-ல் Next/Prev face பார்க்கும்போது பயன்படுவது)
    rotate(direction, duration = 300) {
        if (this.animating) return;
        this.animating = true;

        const targetRotation = this.cubeGroup.rotation.clone();

        if (direction === "right") {
            targetRotation.y += Math.PI / 2;
        } else if (direction === "left") {
            targetRotation.y -= Math.PI / 2;
        } else if (direction === "up") {
            targetRotation.x -= Math.PI / 2;
        } else if (direction === "down") {
            targetRotation.x += Math.PI / 2;
        }

        const startTime = performance.now();
        const startRotation = this.cubeGroup.rotation.clone();

        const animateRotation = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Smooth easing
            const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

            this.cubeGroup.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easeProgress;
            this.cubeGroup.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * easeProgress;
            this.cubeGroup.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animateRotation);
            } else {
                this.cubeGroup.rotation.copy(targetRotation);
                this.animating = false;
            }
        };

        requestAnimationFrame(animateRotation);
    }

    // சால்வ் மூவ்ஸ்களை (எ.கா: R, U, R', F2) கியூபில் அனிமேட் செய்து காட்டக்கூடிய மெத்தட்
    executeMove(moveStr, callback) {
        if (this.animating) return;
        this.animating = true;

        const face = moveStr.charAt(0);
        const modifier = moveStr.length > 1 ? moveStr.charAt(1) : "";

        let axis = "y";
        let layerCheck = (c) => c.userData.y === 1;
        let angle = -Math.PI / 2;

        // முகங்களுக்கு ஏற்ப அச்சு (Axis) மற்றும் லேயர்களைத் தீர்மானித்தல்
        switch (face) {
            case "U":
                axis = "y";
                layerCheck = (c) => c.userData.y === 1;
                angle = -Math.PI / 2;
                break;
            case "D":
                axis = "y";
                layerCheck = (c) => c.userData.y === -1;
                angle = Math.PI / 2;
                break;
            case "R":
                axis = "x";
                layerCheck = (c) => c.userData.x === 1;
                angle = -Math.PI / 2;
                break;
            case "L":
                axis = "x";
                layerCheck = (c) => c.userData.x === -1;
                angle = Math.PI / 2;
                break;
            case "F":
                axis = "z";
                layerCheck = (c) => c.userData.z === 1;
                angle = -Math.PI / 2;
                break;
            case "B":
                axis = "z";
                layerCheck = (c) => c.userData.z === -1;
                angle = Math.PI / 2;
                break;
        }

        if (modifier === "'") {
            angle = -angle;
        } else if (modifier === "2") {
            angle = angle * 2;
        }

        // குறிப்பிட்ட லேயர் கியூப்களை மட்டும் ஒரு தற்காலிக குரூப்பில் இணைத்தல்
        const pivot = new THREE.Group();
        this.cubeGroup.add(pivot);

        const movingCubies = [];
        this.cubeGroup.children.forEach(cubie => {
            if (cubie.isMesh && layerCheck(cubie)) {
                movingCubies.push(cubie);
            }
        });

        movingCubies.forEach(cubie => {
            pivot.attach(cubie);
        });

        const duration = 250; // அனிமேஷன் வேகம் (ms)
        const startTime = performance.now();

        const animateMove = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 0.5 - Math.cos(progress * Math.PI) / 2;

            pivot.rotation[axis] = angle * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animateMove);
            } else {
                pivot.rotation[axis] = angle;
                pivot.updateMatrixWorld(true);

                // பொசிஷன்களை மீண்டும் மெயின் கியூபிற்கு மாற்றுதல்
                movingCubies.forEach(cubie => {
                    this.cubeGroup.attach(cubie);
                    
                    // பொசிஷன் மற்றும் ரொட்டேஷனை சரியாக ரவுண்ட் செய்வுதல்
                    cubie.position.x = Math.round(cubie.position.x);
                    cubie.position.y = Math.round(cubie.position.y);
                    cubie.position.z = Math.round(cubie.position.z);

                    cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
                    cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                    cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
                });

                this.cubeGroup.remove(pivot);
                this.animating = false;

                if (typeof callback === "function") {
                    callback();
                }
            }
        };

        requestAnimationFrame(animateMove);
    }

    isAnimating() {
        return this.animating;
    }

    update() {
        // Frame update loop if needed
    }
}
