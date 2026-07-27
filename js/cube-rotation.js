// =====================================================
// js/cube-rotation.js (Complete & Untouched Logic)
// =====================================================

import * as THREE from "three";

export class CubeRotation {
    constructor(rubiksCube) {
        this.cube = rubiksCube;
        this.animating = false;
        this.rotationSpeed = 0.12;
        
        if (this.cube && this.cube.quaternion) {
            this.currentQuaternion = this.cube.quaternion.clone();
            this.targetQuaternion = this.cube.quaternion.clone();
        } else {
            this.currentQuaternion = new THREE.Quaternion();
            this.targetQuaternion = new THREE.Quaternion();
        }

        this.currentView = 0;
        this.sequence = [
            "right",
            "up",
            "right",
            "right",
            "up"
        ];
        this.history = [];
    }

    next() {
        if (this.animating || this.currentView >= this.sequence.length) return;
        const direction = this.sequence[this.currentView];
        
        if (this.targetQuaternion) {
            this.history.push(this.targetQuaternion.clone());
        }
        
        this.rotate(direction);
        this.currentView++;
    }

    previous() {
        if (this.animating || this.history.length === 0 || !this.cube) return;

        this.animating = true;
        this.currentQuaternion.copy(this.cube.quaternion);

        const prevTarget = this.history.pop();
        if (prevTarget) {
            this.targetQuaternion.copy(prevTarget);
        }

        if (this.currentView > 0) {
            this.currentView--;
        }
    }

    rotate(direction) {
        if (this.animating || !this.cube) return;

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

        this.targetQuaternion.copy(this.currentQuaternion);
        this.targetQuaternion.premultiply(rotation);
        this.targetQuaternion.normalize();
    }

    update() {
        if (!this.animating || !this.cube) return;

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
