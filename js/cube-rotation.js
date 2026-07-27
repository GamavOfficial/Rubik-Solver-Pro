import * as THREE from "three";

export class CubeRotation {

    constructor(rubiksCube) {
        this.cube = rubiksCube;
        this.animating = false;
        this.rotationSpeed = 0.12;

        this.currentQuaternion = this.cube.quaternion.clone();
        this.targetQuaternion = this.cube.quaternion.clone();

        this.currentView = 0;
        this.sequence = ["right", "up", "right", "right", "up"];
        this.history = [];

        // Layer Animation State
        this.isLayerRotating = false;
        this.activeGroup = null;
        this.targetLayerAngle = 0;
        this.currentLayerAngle = 0;
        this.rotationAxis = new THREE.Vector3();
    }

    // Sequence-la irundhu NEXT step rotate panna
    next() {
        if (this.animating || this.currentView >= this.sequence.length) return;
        const direction = this.sequence[this.currentView];
        this.history.push(this.targetQuaternion.clone());
        this.rotate(direction);
        this.currentView++;
    }

    // Previous step-ku exact-a REVERSE panna
    previous() {
        if (this.animating || this.history.length === 0) return;
        this.animating = true;
        this.currentQuaternion.copy(this.cube.quaternion);

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
                rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
                break;
            case "left":
                rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
                break;
            case "up":
                rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
                break;
            case "down":
                rotation.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
                break;
            default:
                this.animating = false;
                return;
        }

        this.targetQuaternion.copy(this.currentQuaternion);
        this.targetQuaternion.premultiply(rotation);
        this.targetQuaternion.normalize();
    }

    update() {
        // Whole Cube Rotation Update
        if (this.animating) {
            this.cube.quaternion.slerp(this.targetQuaternion, this.rotationSpeed);
            if (this.cube.quaternion.angleTo(this.targetQuaternion) < 0.01) {
                this.cube.quaternion.copy(this.targetQuaternion);
                this.animating = false;
            }
        }

        // Individual Layer Rotation Update
        if (this.isLayerRotating && this.activeGroup) {
            const delta = (this.targetLayerAngle - this.currentLayerAngle) * this.rotationSpeed;
            this.currentLayerAngle += delta;

            this.activeGroup.rotateOnAxis(this.rotationAxis, delta);

            if (Math.abs(this.targetLayerAngle - this.currentLayerAngle) < 0.01) {
                // Finalize layer rotation
                const remaining = this.targetLayerAngle - this.currentLayerAngle;
                this.activeGroup.rotateOnAxis(this.rotationAxis, remaining);

                // Clear Pivot & re-attach cubies to main cube
                this.activeGroup.updateMatrixWorld();
                const children = [...this.activeGroup.children];

                children.forEach(cubie => {
                    this.cube.attach(cubie);
                    // Position and rotation snap
                    cubie.position.x = Math.round(cubie.position.x * 10) / 10;
                    cubie.position.y = Math.round(cubie.position.y * 10) / 10;
                    cubie.position.z = Math.round(cubie.position.z * 10) / 10;
                });

                this.cube.remove(this.activeGroup);
                this.activeGroup = null;
                this.isLayerRotating = false;
            }
        }
    }

    isAnimating() {
        return this.animating || this.isLayerRotating;
    }

    setPerspective3DView() {
        const perspectiveRot = new THREE.Quaternion();
        const euler = new THREE.Euler(
            THREE.MathUtils.degToRad(-25),
            THREE.MathUtils.degToRad(45),
            0,
            "YXZ"
        );
        perspectiveRot.setFromEuler(euler);

        this.history.push(this.targetQuaternion.clone());
        this.targetQuaternion.copy(perspectiveRot);
        this.animating = true;
    }

    // Individual Face Layer Moves (U, R, F, D, L, B)
    applyAlgorithm(move) {
        return new Promise((resolve) => {
            if (!move || this.isLayerRotating) return resolve();

            const face = move[0];
            const isPrime = move.includes("'");
            const isDouble = move.includes("2");

            let angle = -Math.PI / 2;
            if (isPrime) angle = Math.PI / 2;
            if (isDouble) angle = -Math.PI;

            if (face === 'D' || face === 'L' || face === 'B') {
                angle = -angle;
            }

            // Pivot Group Creation
            this.activeGroup = new THREE.Group();
            this.cube.add(this.activeGroup);

            const cubiesToRotate = [];

            // Filter Cubies based on Face Layer
            this.cube.children.forEach(child => {
                if (child === this.activeGroup) return;

                const pos = child.position;
                let match = false;

                if (face === 'U' && pos.y > 0.5) match = true;
                if (face === 'D' && pos.y < -0.5) match = true;
                if (face === 'R' && pos.x > 0.5) match = true;
                if (face === 'L' && pos.x < -0.5) match = true;
                if (face === 'F' && pos.z > 0.5) match = true;
                if (face === 'B' && pos.z < -0.5) match = true;

                if (match) cubiesToRotate.push(child);
            });

            cubiesToRotate.forEach(cubie => this.activeGroup.attach(cubie));

            const axisMap = {
                'U': new THREE.Vector3(0, 1, 0),
                'D': new THREE.Vector3(0, 1, 0),
                'R': new THREE.Vector3(1, 0, 0),
                'L': new THREE.Vector3(1, 0, 0),
                'F': new THREE.Vector3(0, 0, 1),
                'B': new THREE.Vector3(0, 0, 1)
            };

            this.rotationAxis = axisMap[face] || new THREE.Vector3(0, 1, 0);
            this.targetLayerAngle = angle;
            this.currentLayerAngle = 0;
            this.isLayerRotating = true;

            const checkLayerAnimation = setInterval(() => {
                if (!this.isLayerRotating) {
                    clearInterval(checkLayerAnimation);
                    resolve();
                }
            }, 30);
        });
    }

}

