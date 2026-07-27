/**
==========================================================
Rubik Solver Pro - Advanced Core Engine
cube-engine.js
Three.js Professional Implementation
==========================================================
*/

import * as THREE from "three";

export default class CubeEngine {
    constructor(options = {}) {
        this.version = "2.1.0";
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
        this.isPaused = false;

        this.clock = new THREE.Clock();
        this.animationId = null;
        this.delta = 0;
        this.elapsed = 0;
        this.moveProgress = 0;

        this.colors = {
            U: 0xffffff, // White
            D: 0xffd500, // Yellow
            L: 0xff6b00, // Orange
            R: 0xcc0000, // Red
            F: 0x00b050, // Green
            B: 0x0066ff, // Blue
            BODY: 0x111111,
            EDGE: 0x222222
        };

        this.size = {
            cubie: 0.96,
            gap: 1.02,
            sticker: 0.84,
            stickerOffset: 0.02
        };

        this.turnSpeed = 300; // ms per move

        this.faceAxis = { U: "y", D: "y", L: "x", R: "x", F: "z", B: "z" };
        this.faceLayer = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };
        this.faceDirection = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };

        Object.assign(this, options);
    }

    initialize(container) {
        if (!container) throw new Error("CubeEngine: Target container is missing.");
        this.container = container;

        this.scene = new THREE.Scene();
        const width = container.clientWidth || 300;
        const height = container.clientHeight || 350;

        this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        this.camera.position.set(6.5, 5.5, 7.5);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.canvas = this.renderer.domElement;
        this.container.appendChild(this.canvas);

        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cubeRoot = new THREE.Group();
        this.world.add(this.cubeRoot);

        this.initLights();
        this.buildCube();

        this.clock.start();
        this.animate();
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionLight.position.set(6, 9, 7);
        this.scene.add(directionLight);

        const fillLight = new THREE.PointLight(0x77bbff, 0.4);
        fillLight.position.set(-7, 5, -6);
        this.scene.add(fillLight);
    }

    buildCube() {
        const bodyGeo = new THREE.BoxGeometry(this.size.cubie, this.size.cubie, this.size.cubie);
        const edgeGeo = new THREE.EdgesGeometry(bodyGeo);
        const stickerGeo = new THREE.PlaneGeometry(this.size.sticker, this.size.sticker);

        const bodyMat = new THREE.MeshStandardMaterial({ color: this.colors.BODY, roughness: 0.7 });
        const edgeMat = new THREE.LineBasicMaterial({ color: this.colors.EDGE });

        const stickerMats = {};
        ["U", "D", "L", "R", "F", "B"].forEach(face => {
            const col = this.colors[face];
            stickerMats[face] = new THREE.MeshStandardMaterial({
                color: col,
                roughness: 0.3,
                emissive: col,
                emissiveIntensity: 0.15
            });
        });

        const gap = this.size.gap;
        const offset = this.size.cubie / 2 + this.size.stickerOffset;

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubie = new THREE.Mesh(bodyGeo, bodyMat);
                    cubie.add(new THREE.LineSegments(edgeGeo, edgeMat));

                    const createSticker = (face, pos, rot) => {
                        const sticker = new THREE.Mesh(stickerGeo, stickerMats[face]);
                        sticker.position.copy(pos);
                        sticker.rotation.copy(rot);
                        sticker.userData = { currentFace: face };
                        cubie.add(sticker);
                        this.stickers.push(sticker);
                    };

                    if (x === 1) createSticker("R", new THREE.Vector3(offset, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
                    if (x === -1) createSticker("L", new THREE.Vector3(-offset, 0, 0), new THREE.Euler(0, Math.PI / 2, 0));
                    if (y === 1) createSticker("U", new THREE.Vector3(0, offset, 0), new THREE.Euler(-Math.PI / 2, 0, 0));
                    if (y === -1) createSticker("D", new THREE.Vector3(0, -offset, 0), new THREE.Euler(Math.PI / 2, 0, 0));
                    if (z === 1) createSticker("F", new THREE.Vector3(0, 0, offset), new THREE.Euler(0, 0, 0));
                    if (z === -1) createSticker("B", new THREE.Vector3(0, 0, -offset), new THREE.Euler(0, 0, Math.PI));

                    cubie.position.set(x * gap, y * gap, z * gap);
                    cubie.userData.grid = { x, y, z };
                    this.cubeRoot.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    applyMove(moveStr, isReverse = false) {
        if (!moveStr || typeof moveStr !== "string") return;
        const parsed = this.parseMove(moveStr.trim());
        if (!parsed) return;

        if (isReverse) {
            parsed.angle = -parsed.angle;
        }

        this.currentMove = parsed;
        this.isAnimating = true;
        this.moveProgress = 0;

        const layerCubies = this.getLayerCubies(parsed.axis, parsed.layer);
        if (this.rotationGroup) this.cubeRoot.remove(this.rotationGroup);

        this.rotationGroup = new THREE.Group();
        this.cubeRoot.add(this.rotationGroup);
        layerCubies.forEach(c => this.rotationGroup.attach(c));

        if (this.turnSpeed === 0) {
            this.moveProgress = 1;
            this.endMove();
        }
    }

    parseMove(moveStr) {
        const match = moveStr.match(/^([UDFBLR])([2']?)$/);
        if (!match) return null;

        const face = match[1];
        const modifier = match[2];
        const axis = this.faceAxis[face];
        const layer = this.faceLayer[face];
        const direction = this.faceDirection[face];

        let angle = direction * (-Math.PI / 2);
        if (modifier === "'") angle = -angle;
        else if (modifier === "2") angle = Math.PI;

        return { raw: moveStr, axis, layer, angle };
    }

    getLayerCubies(axis, layer) {
        const gap = this.size.gap;
        const targetCoord = layer * gap;
        const eps = 0.01;
        return this.cubies.filter(c => Math.abs(c.position[axis] - targetCoord) < eps);
    }

    endMove() {
        if (!this.currentMove || !this.rotationGroup) return;

        this.rotationGroup.rotation[this.currentMove.axis] = this.currentMove.angle;
        this.rotationGroup.updateMatrixWorld(true);

        const targets = [...this.rotationGroup.children];
        const gap = this.size.gap;

        targets.forEach(cubie => {
            this.cubeRoot.attach(cubie);

            cubie.position.x = Math.round(cubie.position.x / gap) * gap;
            cubie.position.y = Math.round(cubie.position.y / gap) * gap;
            cubie.position.z = Math.round(cubie.position.z / gap) * gap;

            cubie.rotation.x = Math.round(cubie.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
            cubie.rotation.y = Math.round(cubie.rotation.y / (Math.PI / 2)) * (Math.PI / 2);
            cubie.rotation.z = Math.round(cubie.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
        });

        this.cubeRoot.remove(this.rotationGroup);
        this.rotationGroup = null;

        this.isAnimating = false;
        this.currentMove = null;
        this.moveProgress = 0;
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.delta = this.clock.getDelta();

        if (this.isAnimating && this.currentMove) {
            const duration = this.turnSpeed / 1000;
            this.moveProgress += this.delta / duration;

            if (this.moveProgress >= 1) {
                this.endMove();
            } else if (this.rotationGroup) {
                this.rotationGroup.rotation[this.currentMove.axis] = this.currentMove.angle * this.moveProgress;
            }
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
