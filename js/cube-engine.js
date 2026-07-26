import * as THREE from 'https://cdn.skypack.dev/three@0.136.0';

/**
 * Rubik's Cube Engine
 * Handles 3D Rendering, Cubie Generation, Sticker State, and String Parsing
 */

export class CubeEngine {
    constructor(scene) {
        this.scene = scene;
        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);

        this.cubies = [];
        this.stickers = [];
        this.size = 3;
        this.spacing = 1.02;

        // Face Colors Mapping (Standard Rubik's Cube Setup)
        this.colorMap = {
            'white': 0xffffff, // U
            'red': 0xd50000,   // R
            'green': 0x00c853, // F
            'yellow': 0xffd600,// D
            'orange': 0xff6d00,// L
            'blue': 0x2979ff   // B
        };

        this.colorToFaceLetter = {
            'white': 'U',
            'red': 'R',
            'green': 'F',
            'yellow': 'D',
            'orange': 'L',
            'blue': 'B'
        };

        this.initCube();
    }

    initCube() {
        // Clear existing group
        while (this.cubeGroup.children.length > 0) {
            this.cubeGroup.remove(this.cubeGroup.children[0]);
        }
        this.cubies = [];
        this.stickers = [];

        const offset = (this.size - 1) / 2;
        const cubeGeometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);

        // Standard Materials for Cubie Base
        const baseMaterial = new THREE.MeshPhongMaterial({
            color: 0x111111,
            shininess: 30,
            roughness: 0.2
        });

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    const cubie = new THREE.Mesh(cubeGeometry, baseMaterial);
                    cubie.position.set(
                        (x - offset) * this.spacing,
                        (y - offset) * this.spacing,
                        (z - offset) * this.spacing
                    );

                    cubie.userData = {
                        gridPos: { x, y, z },
                        initialPos: cubie.position.clone()
                    };
                    cubie.isCubie = true;

                    this.addStickersToCubie(cubie, x, y, z);
                    this.cubeGroup.add(cubie);
                    this.cubies.push(cubie);
                }
            }
        }
    }

    addStickersToCubie(cubie, x, y, z) {
        const stickerGeometry = new THREE.PlaneGeometry(0.84, 0.84);
        const offset = 0.485;

        // Sticker Faces Configuration
        const faces = [
            { name: 'R', pos: [offset, 0, 0], rot: [0, Math.PI / 2, 0], color: 'red', condition: x === 2 },
            { name: 'L', pos: [-offset, 0, 0], rot: [0, -Math.PI / 2, 0], color: 'orange', condition: x === 0 },
            { name: 'U', pos: [0, offset, 0], rot: [-Math.PI / 2, 0, 0], color: 'white', condition: y === 2 },
            { name: 'D', pos: [0, -offset, 0], rot: [Math.PI / 2, 0, 0], color: 'yellow', condition: y === 0 },
            { name: 'F', pos: [0, 0, offset], rot: [0, 0, 0], color: 'green', condition: z === 2 },
            { name: 'B', pos: [0, 0, -offset], rot: [0, Math.PI, 0], color: 'blue', condition: z === 0 }
        ];

        faces.forEach(f => {
            if (f.condition) {
                const mat = new THREE.MeshPhongMaterial({
                    color: this.colorMap[f.color],
                    side: THREE.DoubleSide,
                    polygonOffset: true,
                    polygonOffsetFactor: -1,
                    polygonOffsetUnits: -1
                });

                const sticker = new THREE.Mesh(stickerGeometry, mat);
                sticker.position.set(...f.pos);
                sticker.rotation.set(...f.rot);

                sticker.userData = {
                    face: f.name,
                    colorName: f.color,
                    defaultColor: f.color,
                    parentCubie: cubie
                };

                cubie.add(sticker);
                this.stickers.push(sticker);
            }
        });
    }

    /**
     * Set Sticker Color manually (used by manual editor / color picker)
     */
    setStickerColor(stickerMesh, colorName) {
        if (!stickerMesh || !this.colorMap[colorName]) return;
        stickerMesh.material.color.setHex(this.colorMap[colorName]);
        stickerMesh.userData.colorName = colorName;
    }

    /**
     * Reset Cube to default solved state
     */
    resetCube() {
        this.initCube();
    }

    /**
     * Get World Position for sorting facelets
     */
    getStickerWorldData(sticker) {
        const worldPos = new THREE.Vector3();
        sticker.getWorldPosition(worldPos);

        const worldNormal = new THREE.Vector3(0, 0, 1);
        worldNormal.applyQuaternion(sticker.getWorldQuaternion(new THREE.Quaternion()));

        return {
            sticker: sticker,
            pos: worldPos,
            normal: worldNormal,
            colorName: sticker.userData.colorName || 'white'
        };
    }

    /**
     * FIXED: Generates Exact 54-Character String in U R F D L B Order for Kociemba Solver
     */
    getCubeString() {
        // Strict Order expected by lib/cube.js & lib/solve.js: U -> R -> F -> D -> L -> B
        const faceOrder = ['U', 'R', 'F', 'D', 'L', 'B'];
        let cubeString = "";

        for (const face of faceOrder) {
            const faceStickers = this.getStickersForFace(face);
            
            // Validate sticker count per face
            if (faceStickers.length !== 9) {
                console.error(`Invalid sticker count for face ${face}: expected 9, got ${faceStickers.length}`);
                throw new Error(`Face ${face} has invalid number of stickers.`);
            }

            for (const s of faceStickers) {
                const letter = this.colorToFaceLetter[s.colorName] || 'U';
                cubeString += letter;
            }
        }

        return cubeString;
    }

    /**
     * Collects and sorts 9 stickers for a given face in Top-Left to Bottom-Right order
     */
    getStickersForFace(faceName) {
        const stickerDataList = [];

        this.stickers.forEach(sticker => {
            const data = this.getStickerWorldData(sticker);
            
            // Match face based on normal vector positioning in world space
            let isCurrentFace = false;
            const threshold = 0.5;

            switch (faceName) {
                case 'U': isCurrentFace = data.pos.y > threshold; break;
                case 'D': isCurrentFace = data.pos.y < -threshold; break;
                case 'R': isCurrentFace = data.pos.x > threshold; break;
                case 'L': isCurrentFace = data.pos.x < -threshold; break;
                case 'F': isCurrentFace = data.pos.z > threshold; break;
                case 'B': isCurrentFace = data.pos.z < -threshold; break;
            }

            if (isCurrentFace) {
                stickerDataList.push(data);
            }
        });

        return this.sortStickersGrid(stickerDataList, faceName);
    }

    /**
     * Sorts stickers for a face in Row-Major order (Top-Left to Bottom-Right)
     */
    sortStickersGrid(stickerList, faceName) {
        return stickerList.sort((a, b) => {
            const pA = a.pos;
            const pB = b.pos;

            switch (faceName) {
                case 'U': // Top -> Bottom (-z), Left -> Right (+x)
                    if (Math.abs(pA.z - pB.z) > 0.1) return pA.z - pB.z;
                    return pA.x - pB.x;

                case 'D': // Top -> Bottom (+z), Left -> Right (+x)
                    if (Math.abs(pA.z - pB.z) > 0.1) return pB.z - pA.z;
                    return pA.x - pB.x;

                case 'F': // Top -> Bottom (-y), Left -> Right (+x)
                    if (Math.abs(pA.y - pB.y) > 0.1) return pB.y - pA.y;
                    return pA.x - pB.x;

                case 'B': // Top -> Bottom (-y), Left -> Right (-x)
                    if (Math.abs(pA.y - pB.y) > 0.1) return pB.y - pA.y;
                    return pB.x - pA.x;

                case 'L': // Top -> Bottom (-y), Left -> Right (+z)
                    if (Math.abs(pA.y - pB.y) > 0.1) return pB.y - pA.y;
                    return pA.z - pB.z;

                case 'R': // Top -> Bottom (-y), Left -> Right (-z)
                    if (Math.abs(pA.y - pB.y) > 0.1) return pB.y - pA.y;
                    return pB.z - pA.z;

                default:
                    return 0;
            }
        });
    }

    /**
     * Apply move string directly to 3D Mesh state (non-animated)
     */
    applyMoveString(moveStr) {
        // Move execution logic for quick state sync
        const face = moveStr[0];
        const isPrime = moveStr.includes("'");
        const isDouble = moveStr.includes("2");

        let angle = Math.PI / 2;
        if (isPrime) angle = -Math.PI / 2;
        if (isDouble) angle = Math.PI;

        this.rotateFaceMesh(face, angle);
    }

    rotateFaceMesh(face, angle) {
        const axis = new THREE.Vector3();
        let targetValue = 0;

        switch (face) {
            case 'R': axis.set(1, 0, 0); targetValue = this.spacing; break;
            case 'L': axis.set(1, 0, 0); targetValue = -this.spacing; break;
            case 'U': axis.set(0, 1, 0); targetValue = this.spacing; break;
            case 'D': axis.set(0, 1, 0); targetValue = -this.spacing; break;
            case 'F': axis.set(0, 0, 1); targetValue = this.spacing; break;
            case 'B': axis.set(0, 0, 1); targetValue = -this.spacing; break;
        }

        const rotatingCubies = this.cubies.filter(cubie => {
            const pos = cubie.position;
            if (face === 'R' || face === 'L') return Math.abs(pos.x - targetValue) < 0.2;
            if (face === 'U' || face === 'D') return Math.abs(pos.y - targetValue) < 0.2;
            if (face === 'F' || face === 'B') return Math.abs(pos.z - targetValue) < 0.2;
            return false;
        });

        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.makeRotationAxis(axis, -angle);

        rotatingCubies.forEach(cubie => {
            cubie.position.applyMatrix4(rotationMatrix);
            cubie.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, -angle));
            cubie.updateMatrix();
        });
    }
}
