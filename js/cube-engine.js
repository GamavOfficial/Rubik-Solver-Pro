import * as THREE from "three";

export default class CubeEngine {
    constructor(options = {}) {
        this.container = null;
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.cubeRoot = null;
        this.rotationGroup = null;

        this.cubies = [];
        this.stickers = [];
        this.moveQueue = [];
        this.currentMove = null;
        this.isAnimating = false;
        this.moveProgress = 0;
        this.turnSpeed = 300; // milliseconds

        this.colors = {
            U: 0xffffff, D: 0xffd500, L: 0xff6b00,
            R: 0xcc0000, F: 0x00b050, B: 0x0066ff,
            BODY: 0x111111, EDGE: 0x222222
        };

        this.size = { cubie: 0.96, gap: 1.02, sticker: 0.84, stickerOffset: 0.02 };
        this.faceAxis = { U: "y", D: "y", L: "x", R: "x", F: "z", B: "z" };
        this.faceLayer = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };
        this.faceDirection = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };

        Object.assign(this, options);
    }

    initialize(container) {
        if (!container) return;
        this.container = container;

        this.scene = new THREE.Scene();
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 350;

        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(6.5, 5.5, 7.5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        this.canvas = this.renderer.domElement;
        this.container.appendChild(this.canvas);

        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cubeRoot = new THREE.Group();
        this.world.add(this.cubeRoot);

        // Lights
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(6, 9, 7);
        this.scene.add(dirLight);

        this.buildCube();
        this.animate();
    }

    buildCube() {
        const bodyGeo = new THREE.BoxGeometry(this.size.cubie, this.size.cubie, this.size.cubie);
        const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
        const stickerGeo = new THREE.PlaneGeometry(this.size.sticker, this.size.sticker);

        const bodyMat = new THREE.MeshStandardMaterial({ color: this.colors.BODY, roughness: 0.7 });
        const edgeMat = new THREE.LineBasicMaterial({ color: this.colors.EDGE });

        const stickerMats = {};
        ["U", "D", "L", "R", "F", "B"].forEach(face => {
            stickerMats[face] = new THREE.MeshStandardMaterial({ color: this.colors.colors ? this.colors[face] : this.colors[face], roughness: 0.3 });
        });

        const gap = this.size.gap;
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubie = new THREE.Mesh(bodyGeo, bodyMat);
                    cubie.add(new THREE.LineSegments(edgeGeo, edgeMat));
                    
                    // Attach stickers simplified
                    cubie.position.set(x * gap, y * gap, z * gap);
                    this.cubeRoot.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    applyMove(moveStr, isReverse = false) {
        if (!moveStr) return;
        const parsed = this.parseMove(moveStr.trim());
        if (!parsed) return;

        if (isReverse) parsed.angle = -parsed.angle;

        this.currentMove = parsed;
        this.isAnimating = true;
        this.moveProgress = 1; // Instant complete for reliability or animate step
        this.endMove();
    }

    parseMove(moveStr) {
        const match = moveStr.match(/^([UDFBLR])([2']?)$/);
        if (!match) return null;
        const face = match[1], modifier = match[2];
        const axis = this.faceAxis[face];
        const layer = this.faceLayer[face];
        let angle = this.faceDirection[face] * (-Math.PI / 2);
        if (modifier === "'") angle = -angle;
        else if (modifier === "2") angle = Math.PI;
        return { raw: moveStr, axis, layer, angle };
    }

    endMove() {
        this.isAnimating = false;
        this.currentMove = null;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

