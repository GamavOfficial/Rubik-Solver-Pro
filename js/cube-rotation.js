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

    /* ==========================================
       Solver Mode-க்காக சேர்க்கப்பட்ட புதிய முறைகள்
    ========================================== */

    // Solver தொடங்கும்போது 3D Perspective View-க்கு மாற்ற
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

    // Solve Moves-க்கான (U, R, F, D, L, B) அனிமேஷன்
    applyAlgorithm(move) {
        return new Promise((resolve) => {
            if (!move) return resolve();

            const face = move[0];
            const isPrime = move.includes("'");
            const isDouble = move.includes("2");

            let angle = -Math.PI / 2;
            if (isPrime) angle = Math.PI / 2;
            if (isDouble) angle = -Math.PI;

            // D மற்றும் L திருப்பங்களின் திசையைச் சரிசெய்ய
            if (face === 'D' || face === 'L' || face === 'B') {
                angle = -angle;
            }

            const axisMap = {
                'U': new THREE.Vector3(0, 1, 0),
                'D': new THREE.Vector3(0, -1, 0),
                'R': new THREE.Vector3(1, 0, 0),
                'L': new THREE.Vector3(-1, 0, 0),
                'F': new THREE.Vector3(0, 0, 1),
                'B': new THREE.Vector3(0, 0, -1)
            };

            const axis = axisMap[face] || new THREE.Vector3(0, 1, 0);
            const rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);

            this.history.push(this.targetQuaternion.clone());
            this.targetQuaternion.premultiply(rotation);
            this.targetQuaternion.normalize();
            this.animating = true;

            // அனிமேஷன் முடியும் வரை காத்திருக்க செய்யும் செக் (Loop check)
            const checkAnimation = setInterval(() => {
                if (!this.animating) {
                    clearInterval(checkAnimation);
                    resolve();
                }
            }, 30);
        });
    }

}

