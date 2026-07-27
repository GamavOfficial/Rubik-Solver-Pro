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

}

