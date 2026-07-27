import * as THREE from "three";

export class CubeRotation {

    constructor(rubiksCube) {

        this.cubeGroup = rubiksCube; // Main Rubiks Cube Group
        this.animating = false;
        this.rotationSpeed = 0.12;

        this.currentQuaternion = this.cubeGroup.quaternion.clone();
        this.targetQuaternion = this.cubeGroup.quaternion.clone();
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
        
        this.rotateView(direction);
        this.currentView++;
    }

    // Previous step-ku exact-a REVERSE panna
    previous() {
        if (this.animating || this.history.length === 0) return;

        this.animating = true;
        this.currentQuaternion.copy(this.cubeGroup.quaternion);

        // Pop the previous exact quaternion state
        const prevTarget = this.history.pop();
        this.targetQuaternion.copy(prevTarget);

        if (this.currentView > 0) {
            this.currentView--;
        }
    }

    rotateView(direction) {
        if (this.animating) return;

        this.animating = true;
        this.currentQuaternion.copy(this.cubeGroup.quaternion);

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

    // [UPGRADED]: கியூப் சால்வ் மூவ்ஸ்களை (எ.கா: R, U, R', F2) லேயர் வாரியாக அனிமேட் செய்யும் பகுதி
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

        // தற்காலிகமாக குறிப்பிட்ட லேயரை மட்டும் திருப்புவதற்காக Pivot உருவாக்குதல்
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

        const duration = 250; // Animation Speed (ms)
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
                    this.cubeGroup.attach(cubie);
                    
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

    update() {
        // Viewer-ன் முழு கியூப் ரொட்டேஷனுக்கான slerp அப்டேட்
        if (this.cubeGroup.quaternion.angleTo(this.targetQuaternion) > 0.001) {
            this.cubeGroup.quaternion.slerp(
                this.targetQuaternion,
                this.rotationSpeed
            );
            this.animating = true;
        } else {
            this.cubeGroup.quaternion.copy(this.targetQuaternion);
            // layer animation இல்லாத போது மட்டும் animating false செய்யப்படும்
        }
    }

    isAnimating() {
        return this.animating;
    }

}

