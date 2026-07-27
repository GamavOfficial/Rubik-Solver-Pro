/**
==========================================================
Rubik Solver Pro - Advanced Core Engine (Upgraded v2.1.0)
cube-engine.js
Three.js r179+ Professional Implementation
==========================================================
*/

import * as THREE from "three";

export default class CubeEngine {
    constructor(options = {}) {
        this.version = "2.1.0";

        // DOM Elements
        this.container = null;
        this.canvas = null;

        // Three.js Core Instances
        this.scene = null;
        this.camera = null;
        this.renderer = null;

        // Group Nodes
        this.world = null;
        this.cubeRoot = null;
        this.rotationGroup = null;

        // Collections
        this.cubies = [];
        this.stickers = [];

        // Lighting System
        this.ambientLight = null;
        this.directionLight = null;
        this.fillLight = null;

        // Raycasting & Interaction Vectors
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.clock = new THREE.Clock();

        // Animation & Queue Controllers
        this.animationId = null;
        this.delta = 0;
        this.elapsed = 0;
        this.moveProgress = 0;
        this.moveQueue = [];
        this.currentMove = null;
        this.isAnimating = false;
        this.isPaused = false;

        // History Stacks
        this.undoStack = [];
        this.redoStack = [];

        // Interactive States
        this.dragging = false;
        this.pointerStart = { x: 0, y: 0 };
        this.pointerNow = { x: 0, y: 0 };
        this.cameraRotation = { x: -0.45, y: 0.75 };

        // Configuration Themes & Color Archetypes
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

        // Dimension Metrics
        this.size = {
            cubie: 0.96,
            gap: 1.02,
            sticker: 0.84,
            stickerOffset: 0.02
        };

        // Speed Configuration (Milliseconds per move)
        this.speed = {
            normal: 300,
            fast: 180,
            instant: 0
        };
        this.turnSpeed = this.speed.fast;

        // Axis Mapping Rules for Rubik Face Notation
        this.faceAxis = { U: "y", D: "y", L: "x", R: "x", F: "z", B: "z" };
        this.faceLayer = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };
        this.faceDirection = { U: 1, D: -1, L: -1, R: 1, F: 1, B: -1 };

        this.activeColor = null;
        this.colorToFaceLetter = {
            "white": "U", "U": "U",
            "yellow": "D", "D": "D",
            "orange": "L", "L": "L",
            "red": "R", "R": "R",
            "green": "F", "F": "F",
            "blue": "B", "B": "B"
        };

        // Event Bindings
        this.resizeHandler = this.onResize.bind(this);
        this.pointerDownHandler = this.onPointerDown.bind(this);
        this.pointerMoveHandler = this.onPointerMove.bind(this);
        this.pointerUpHandler = this.onPointerUp.bind(this);

        Object.assign(this, options);
    }

    // =====================================================
    // Lifecycle Management & Scene Bootstrapping
    // =====================================================

    initialize(container) {
        if (!container) throw new Error("CubeEngine: Target container is missing.");
        this.container = container;

        this.scene = new THREE.Scene();
        this.scene.background = null;

        const width = container.clientWidth;
        const height = container.clientHeight;

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
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.canvas = this.renderer.domElement;
        this.container.appendChild(this.canvas);

        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cubeRoot = new THREE.Group();
        this.world.add(this.cubeRoot);

        this.initLights();
        this.buildCube();

        window.addEventListener("resize", this.resizeHandler);
        this.canvas.addEventListener("pointerdown", this.pointerDownHandler);
        this.canvas.addEventListener("pointermove", this.pointerMoveHandler);
        this.canvas.addEventListener("pointerup", this.pointerUpHandler);

        this.clock.start();
        this.animate();
    }

    initLights() {
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        this.directionLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.directionLight.position.set(6, 9, 7);
        this.directionLight.castShadow = true;
        this.scene.add(this.directionLight);

        this.fillLight = new THREE.PointLight(0x77bbff, 0.4);
        this.fillLight.position.set(-7, 5, -6);
        this.scene.add(this.fillLight);
    }

    onResize() {
        if (!this.renderer || !this.container) return;
        const w = this.container.clientWidth;
        const h = this.container.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    render() {
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.delta = this.clock.getDelta();
        this.elapsed = this.clock.elapsedTime;

        if (!this.isPaused) {
            this.update();
        }
        this.render();
    }

    update() {
        if (this.isAnimating && this.currentMove) {
            if (this.turnSpeed === 0) {
                this.moveProgress = 1;
            } else {
                const duration = this.turnSpeed / 1000;
                this.moveProgress += this.delta / duration;
            }

            if (this.moveProgress >= 1) {
                this.endMove();
            } else if (this.rotationGroup) {
                this.rotationGroup.rotation[this.currentMove.axis] = this.currentMove.angle * this.moveProgress;
            }
        } else {
            this.processQueue();
        }
    }

    // =====================================================
    // Procedural Cube Builder
    // =====================================================

    buildCube() {
        this.bodyGeometry = new THREE.BoxGeometry(this.size.cubie, this.size.cubie, this.size.cubie);
        this.edgeGeometry = new THREE.EdgesGeometry(this.bodyGeometry);
        this.stickerGeometry = new THREE.PlaneGeometry(this.size.sticker, this.size.sticker);

        this.bodyMaterial = new THREE.MeshStandardMaterial({ color: this.colors.BODY, roughness: 0.7, metalness: 0.1 });
        this.edgeMaterial = new THREE.LineBasicMaterial({ color: this.colors.EDGE });

        this.stickerMaterials = {};
        ["U", "D", "L", "R", "F", "B"].forEach(face => {
            const col = this.colors[face];
            this.stickerMaterials[face] = new THREE.MeshStandardMaterial({
                color: col,
                roughness: 0.3,
                metalness: 0.05,
                emissive: col,
                emissiveIntensity: 0.15
            });
        });

        this.cubies = [];
        this.stickers = [];
        const gap = this.size.gap;

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    const cubie = new THREE.Mesh(this.bodyGeometry, this.bodyMaterial);
                    cubie.castShadow = true;
                    cubie.receiveShadow = true;

                    const edges = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
                    cubie.add(edges);

                    this.attachStickers(cubie, x, y, z);

                    cubie.position.set(x * gap, y * gap, z * gap);
                    cubie.userData.grid = { x, y, z };

                    this.cubeRoot.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    attachStickers(cubie, x, y, z) {
        const offset = this.size.cubie / 2 + this.size.stickerOffset;

        const createStickerChild = (face, pos, rot) => {
            const sticker = new THREE.Mesh(this.stickerGeometry, this.stickerMaterials[face]);
            sticker.position.copy(pos);
            sticker.rotation.copy(rot);
            sticker.userData = {
                initialFace: face,
                currentFace: face,
                color: face,
                grid: { x, y, z }
            };
            cubie.add(sticker);
            this.stickers.push(sticker);
        };

        if (x === 1) createStickerChild("R", new THREE.Vector3(offset, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
        if (x === -1) createStickerChild("L", new THREE.Vector3(-offset, 0, 0), new THREE.Euler(0, Math.PI / 2, 0));
        if (y === 1) createStickerChild("U", new THREE.Vector3(0, offset, 0), new THREE.Euler(-Math.PI / 2, 0, 0));
        if (y === -1) createStickerChild("D", new THREE.Vector3(0, -offset, 0), new THREE.Euler(Math.PI / 2, 0, 0));
        if (z === 1) createStickerChild("F", new THREE.Vector3(0, 0, offset), new THREE.Euler(0, 0, 0));
        if (z === -1) createStickerChild("B", new THREE.Vector3(0, 0, -offset), new THREE.Euler(0, Math.PI, 0));
    }

    // =====================================================
    // Upgraded: Direct Single Move Execution Handler
    // =====================================================

    applyMove(moveStr, isReverse = false) {
        if (!moveStr || typeof moveStr !== "string") return;
        const parsed = this.parseMove(moveStr.trim());
        if (!parsed) return;

        // If reverse is requested, invert the target angle direction
        if (isReverse) {
            parsed.angle = -parsed.angle;
        }

        // Instantly process current move for step-by-step navigation
        this.currentMove = parsed;
        this.isAnimating = true;
        this.moveProgress = 0;

        const layerCubies = this.getLayerCubies(parsed.axis, parsed.layer);
        if (this.rotationGroup) this.cubeRoot.remove(this.rotationGroup);

        this.rotationGroup = new THREE.Group();
        this.cubeRoot.add(this.rotationGroup);
        layerCubies.forEach(c => this.rotationGroup.attach(c));

        // Force complete animation frame instantly if turnSpeed is zero
        if (this.turnSpeed === 0) {
            this.moveProgress = 1;
            this.endMove();
        }
    }

    // =====================================================
    // Robust Execution & Rotation Engine
    // =====================================================

    enqueue(move) {
        if (typeof move === "string" && move.trim() !== "") {
            this.moveQueue.push(move.trim());
        }
    }

    processQueue() {
        if (this.isAnimating || this.isPaused || this.moveQueue.length === 0) return;
        const nextMove = this.moveQueue.shift();
        this.applyMove(nextMove, false);
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

    applyAlgorithm(algStr) {
        if (!algStr) return;
        algStr.trim().split(/\s+/).forEach(m => {
            if (m) this.enqueue(m);
        });
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
        const vEps = 0.85;
        const quat = new THREE.Quaternion();
        const xAxis = new THREE.Vector3(), yAxis = new THREE.Vector3(), zAxis = new THREE.Vector3();
        const matrix = new THREE.Matrix4();

        targets.forEach(cubie => {
            this.cubeRoot.attach(cubie);

            cubie.position.x = Math.round(cubie.position.x / gap) * gap;
            cubie.position.y = Math.round(cubie.position.y / gap) * gap;
            cubie.position.z = Math.round(cubie.position.z / gap) * gap;

            matrix.makeRotationFromQuaternion(cubie.quaternion);
            matrix.extractBasis(xAxis, yAxis, zAxis);
            xAxis.set(Math.round(xAxis.x), Math.round(xAxis.y), Math.round(xAxis.z));
            yAxis.set(Math.round(yAxis.x), Math.round(yAxis.y), Math.round(yAxis.z));
            zAxis.set(Math.round(zAxis.x), Math.round(zAxis.y), Math.round(zAxis.z));
            matrix.makeBasis(xAxis, yAxis, zAxis);

            cubie.quaternion.setFromRotationMatrix(matrix);
            cubie.rotation.setFromQuaternion(cubie.quaternion);

            cubie.userData.grid.x = Math.round(cubie.position.x / gap);
            cubie.userData.grid.y = Math.round(cubie.position.y / gap);
            cubie.userData.grid.z = Math.round(cubie.position.z / gap);

            cubie.children.forEach(child => {
                if (child.userData && child.userData.currentFace) {
                    child.getWorldQuaternion(quat);
                    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
                    let detectedFace = child.userData.currentFace;

                    if (normal.x > vEps) detectedFace = "R";
                    else if (normal.x < -vEps) detectedFace = "L";
                    else if (normal.y > vEps) detectedFace = "U";
                    else if (normal.y < -vEps) detectedFace = "D";
                    else if (normal.z > vEps) detectedFace = "F";
                    else if (normal.z < -vEps) detectedFace = "B";

                    child.userData.currentFace = detectedFace;
                    child.userData.grid = { ...cubie.userData.grid };
                }
            });
        });

        this.cubeRoot.remove(this.rotationGroup);
        this.rotationGroup = null;

        this.isAnimating = false;
        this.currentMove = null;
        this.moveProgress = 0;
    }

    // =====================================================
    // Scrambling, Reset & History Actions
    // =====================================================

    scramble(count = 20) {
        const faces = ["U", "D", "L", "R", "F", "B"];
        const modifiers = ["", "'", "2"];
        let lastFace = "";
        let alg = "";

        for (let i = 0; i < count; i++) {
            let f;
            do {
                f = faces[Math.floor(Math.random() * faces.length)];
            } while (f === lastFace);
            lastFace = f;
            alg += `${f}${modifiers[Math.floor(Math.random() * modifiers.length)]} `;
        }

        this.applyAlgorithm(alg.trim());
        return alg.trim();
    }

    resetCube() {
        if (this.world) this.scene.remove(this.world);
        this.world = new THREE.Group();
        this.scene.add(this.world);

        this.cubeRoot = new THREE.Group();
        this.world.add(this.cubeRoot);

        this.cubies = [];
        this.stickers = [];
        this.moveQueue = [];
        this.undoStack = [];
        this.redoStack = [];
        this.currentMove = null;
        this.isAnimating = false;

        this.buildCube();
    }

    // =====================================================
    // Pointer Interactivity & Raycasting Handling
    // =====================================================

    onPointerDown(event) {
        if (this.isAnimating || this.isPaused || !this.canvas) return;
        this.dragging = true;
        this.pointerStart.x = event.clientX;
        this.pointerStart.y = event.clientY;
    }

    onPointerMove(event) {
        if (!this.dragging || !this.world) return;
        this.pointerNow.x = event.clientX;
        this.pointerNow.y = event.clientY;

        const deltaX = this.pointerNow.x - this.pointerStart.x;
        const deltaY = this.pointerNow.y - this.pointerStart.y;

        this.world.rotation.y += deltaX * 0.008;
        this.world.rotation.x += deltaY * 0.008;

        this.pointerStart.x = this.pointerNow.x;
        this.pointerStart.y = this.pointerNow.y;
    }

    onPointerUp(event) {
        this.dragging = false;
        if (this.isAnimating || this.isPaused || !this.canvas) return;

        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.stickers);

        if (intersects.length > 0) {
            const clickedSticker = intersects[0].object;
            if (typeof this.onStickerTapped === "function") {
                this.onStickerTapped(clickedSticker);
            } else if (this.activeColor) {
                this.setStickerColor(clickedSticker, this.activeColor);
            }
        }
    }

    setStickerColor(sticker, faceColor) {
        if (!sticker || !this.stickerMaterials || !this.stickerMaterials[faceColor]) return;
        sticker.material = this.stickerMaterials[faceColor];
        sticker.userData.color = faceColor;
        if (typeof this.onStateChanged === "function") this.onStateChanged();
    }

    // =====================================================
    // Resource Disposal & Cleanup
    // =====================================================

    dispose() {
        cancelAnimationFrame(this.animationId);
        window.removeEventListener("resize", this.resizeHandler);
        if (this.canvas) {
            this.canvas.removeEventListener("pointerdown", this.pointerDownHandler);
            this.canvas.removeEventListener("pointermove", this.pointerMoveHandler);
            this.canvas.removeEventListener("pointerup", this.pointerUpHandler);
        }

        if (this.renderer) {
            this.renderer.dispose();
            if (this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
            }
        }

        if (this.scene) this.scene.clear();
        this.cubies = [];
        this.stickers = [];
        this.moveQueue = [];
    }
}
