import * as THREE from "three";

export class CubeRotation {

    constructor(rubiksCube) {

        this.cube = rubiksCube;

        this.animating = false;

        this.rotationSpeed = 0.12;

        this.currentQuaternion = this.cube.quaternion.clone();

        this.targetQuaternion = this.cube.quaternion.clone();

        this.currentView = 0;

        this.sequence = [
            "right",
            "up",
            "right",
            "right",
            "up"
        ];

        // History array to store previous target quaternions for reverse operation
        this.history = [];

    }

    // Sequence-la irundhu NEXT step rotate panna
    next() {
        if (this.animating || this.currentView >= this.sequence.length) return;

        const direction = this.sequence[this.currentView];
        
        // Push current target to history before moving to next step
        this.history.push(this.targetQuaternion.clone());
        
        this.rotate(direction);
        this.currentView++;
    }

    // Previous step-ku exact-a REVERSE panna
    previous() {
        if (this.animating || this.history.length === 0) return;

        this.animating = true;
        this.currentQuaternion.copy(this.cube.quaternion);

        // Pop the previous exact quaternion state
        const prevTarget = this.history.pop();
        this.targetQuaternion.copy(prevTarget);

        if (this.currentView > 0) {
            this.currentView--;
        }
    }

    rotate(direction) {

        if (this.animating) return;

        this.animating = true;

        this.currentQuaternion.copy(this.cube.quaternion);

        const rotation = new THREE.Quaternion();

        switch (direction) {

            case "right":
                rotation.setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    -Math.PI / 2
                );
                break;

            case "left":
                rotation.setFromAxisAngle(
                    new THREE.Vector3(0, 1, 0),
                    Math.PI / 2
                );
                break;

            case "up":
                rotation.setFromAxisAngle(
                    new THREE.Vector3(1, 0, 0),
                    Math.PI / 2
                );
                break;

            case "down":
                rotation.setFromAxisAngle(
                    new THREE.Vector3(1, 0, 0),
                    -Math.PI / 2
                );
                break;

            default:
                this.animating = false;
                return;

        }

        // PREMULTIPLY applies screen/camera-relative rotation
        // Idhu dhaan unga Quaternion sequence values-a exact-a matching panna vaikkum
        this.targetQuaternion.copy(this.currentQuaternion);

this.targetQuaternion.premultiply(rotation);

this.targetQuaternion.normalize();

    }

    update() {

        if (!this.animating) return;

        this.cube.quaternion.slerp(
            this.targetQuaternion,
            this.rotationSpeed
        );

        if (
            this.cube.quaternion.angleTo(
                this.targetQuaternion
            ) < 0.01
        ) {

            this.cube.quaternion.copy(
                this.targetQuaternion
            );

            this.animating = false;

        }

    }

        isAnimating() {

        return this.animating;

    }

    // ==========================================
    // NEWLY ADDED: Execute Move for Solver Animation
    // ==========================================
    executeMove(moveStr, callback) {
        if (this.animating) return;
        this.animating = true;

        const face = moveStr.charAt(0);
        const modifier = moveStr.length > 1 ? moveStr.charAt(1) : "";

        let axis = "y";
        let layerCheck = (c) => c.userData.y === 1;
        let angle = -Math.PI / 2;

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

        const pivot = new THREE.Group();
        this.cube.add(pivot);

        const movingCubies = [];
        this.cube.children.forEach(cubie => {
            if (cubie.isMesh && layerCheck(cubie)) {
                movingCubies.push(cubie);
            }
        });

        movingCubies.forEach(cubie => {
            pivot.attach(cubie);
        });

        const duration = 200;
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

                movingCubies.forEach(cubie => {
                    this.cube.attach(cubie);
                    
                    cubie.position.x = Math.round(cubie.position.x);
                    cubie.position.y = Math.round(cubie.position.y);
                    cubie.position.z = Math.round(cubie.position.z);

                    cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
                    cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
                    cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
                });

                this.cube.remove(pivot);
                this.animating = false;

                if (typeof callback === "function") {
                    callback();
                }
            }
        };

        requestAnimationFrame(animateMove);
    }

}


