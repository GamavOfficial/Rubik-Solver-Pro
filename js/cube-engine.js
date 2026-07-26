/**

==========================================================

Rubik Solver Pro

cube-engine.js

Part 1 - Engine Foundation & Scene Initialization

Three.js r179+

==========================================================
*/


import * as THREE from "three";

export default class CubeEngine {

constructor(options = {}) {  

    // --------------------------------------------------  
    // Version  
    // --------------------------------------------------  
    this.version = "1.0.0";  

    // --------------------------------------------------  
    // DOM  
    // --------------------------------------------------  
    this.container = null;  
    this.canvas = null;  

    // --------------------------------------------------  
    // THREE Core  
    // --------------------------------------------------  
    this.scene = null;  
    this.camera = null;  
    this.renderer = null;  

    // --------------------------------------------------  
    // Cube Objects  
    // --------------------------------------------------  
    this.world = null;  
    this.cubeRoot = null;  
    this.cubies = [];  
    this.stickers = [];  

    // --------------------------------------------------  
    // Groups  
    // --------------------------------------------------  
    this.rotationGroup = null;  

    // --------------------------------------------------  
    // Lights  
    // --------------------------------------------------  
    this.ambientLight = null;  
    this.directionLight = null;  
    this.fillLight = null;  

    // --------------------------------------------------  
    // Raycaster  
    // --------------------------------------------------  
    this.raycaster = new THREE.Raycaster();  
    this.mouse = new THREE.Vector2();  

    // --------------------------------------------------  
    // Clock  
    // --------------------------------------------------  
    this.clock = new THREE.Clock();  

    // --------------------------------------------------  
    // Animation State  
    // --------------------------------------------------  
    this.animationId = null;  
    this.delta = 0;  
    this.elapsed = 0;  
    this.moveProgress = 0;  

    // --------------------------------------------------  
    // Camera Orbit  
    // --------------------------------------------------  
    this.cameraDistance = 8;  
    this.cameraRotation = {  
        x: -0.45,  
        y: 0.75  
    };  

    // --------------------------------------------------  
    // Queue & State Flags  
    // --------------------------------------------------  
    this.moveQueue = [];  
    this.currentMove = null;  
    this.isAnimating = false;  
    this.isPaused = false;  

    // --------------------------------------------------  
    // History  
    // --------------------------------------------------  
    this.undoStack = [];  
    this.redoStack = [];  

    // --------------------------------------------------  
    // Interaction  
    // --------------------------------------------------  
    this.dragging = false;  
    this.rotatingCube = false;  
    this.pointerStart = { x: 0, y: 0 };  
    this.pointerNow = { x: 0, y: 0 };  

    // --------------------------------------------------  
    // Theme Configurations  
    // --------------------------------------------------  
    this.colors = {  
        U: 0xffffff,  
        D: 0xffd500,  
        L: 0xff6b00,  
        R: 0xcc0000,  
        F: 0x00b050,  
        B: 0x0066ff,  
        BODY: 0x111111,  
        EDGE: 0x303030  
    };  

    // --------------------------------------------------  
    // Cube Sizing Configuration  
    // --------------------------------------------------  
    this.size = {  
        cubie: 0.96,  
        gap: 1.02,  
        sticker: 0.84,  
        stickerOffset: 0.02  
    };  

    // --------------------------------------------------  
    // Animation Velocity Config  
    // --------------------------------------------------  
    this.speed = {  
        normal: 280,  
        fast: 180,  
        faster: 120  
    };  
    this.turnSpeed = this.speed.fast;  
    
    // --------------------------------------------------
// Rotation Configuration
// --------------------------------------------------

this.faceAxis = {
    U: "y",
    D: "y",
    L: "x",
    R: "x",
    F: "z",
    B: "z"
};

this.faceLayer = {
    U: 1,
    D: -1,
    L: -1,
    R: 1,
    F: 1,
    B: -1
};

this.faceDirection = {
    U: 1,
    D: -1,
    L: -1,
    R: 1,
    F: 1,
    B: -1
};

this.activeColor = null;

    // --------------------------------------------------  
    // Execution Performance Bindings  
    // --------------------------------------------------  
    this.resizeHandler = this.onResize.bind(this);  
    
    this.pointerDownHandler = this.onPointerDown.bind(this);
this.pointerMoveHandler = this.onPointerMove.bind(this);
this.pointerUpHandler = this.onPointerUp.bind(this);

    // Options Override Custom Configurations  
    Object.assign(this, options);  
}  

// =====================================================  
// Part 1B  
// Scene Initialization & Lifecycle Management  
// =====================================================  

initialize(container) {  
    if (!container) {  
        throw new Error("CubeEngine : Container element not found.");  
    }  

    this.container = container;  

    // -----------------------------------------  
    // Scene Creation  
    // -----------------------------------------  
    this.scene = new THREE.Scene();  
    this.scene.background = null;  

    // -----------------------------------------  
    // Camera Precision Setup  
    // -----------------------------------------  
    const width = container.clientWidth;  
    const height = container.clientHeight;  

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);  
    this.camera.position.set(6.5, 5.5, 7.5);  
    this.camera.lookAt(0, 0, 0);  

    // -----------------------------------------  
    // Production Graphics Renderer  
    // -----------------------------------------  
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
    container.appendChild(this.canvas);  

    // -----------------------------------------  
    // Hierarchy Root Anchors  
    // -----------------------------------------  
    this.world = new THREE.Group();  
    this.scene.add(this.world);  

    this.cubeRoot = new THREE.Group();  
    this.world.add(this.cubeRoot);  

    // -----------------------------------------  
    // Subsystem Component Triggers  
    // -----------------------------------------  
    this.createLights();  

    if (typeof this.buildCube === "function") {  
        this.buildCube();  
    }  

    // -----------------------------------------  
    // Event Listeners Registration  
    // -----------------------------------------  
    window.addEventListener("resize", this.resizeHandler);  

this.canvas.addEventListener("pointerdown", this.pointerDownHandler);
this.canvas.addEventListener("pointermove", this.pointerMoveHandler);
this.canvas.addEventListener("pointerup", this.pointerUpHandler);

    // -----------------------------------------  
    // Execution Lifecycle Start  
    // -----------------------------------------  
    this.clock.start();  
    this.animate();  
}  

createLights() {  
    // Ambient Light Subsystem  
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);  
    this.scene.add(this.ambientLight);  

    // Directional Primary Sunlight Vector  
    this.directionLight = new THREE.DirectionalLight(0xffffff, 1.25);  
    this.directionLight.position.set(5, 8, 6);  
    this.directionLight.castShadow = true;  
    this.directionLight.shadow.mapSize.width = 2048;  
    this.directionLight.shadow.mapSize.height = 2048;  
    this.directionLight.shadow.camera.near = 0.5;  
    this.directionLight.shadow.camera.far = 30;  
    this.scene.add(this.directionLight);  

    // Soft Secondary Chromatic Point Light  
    this.fillLight = new THREE.PointLight(0x66aaff, 0.35);  
    this.fillLight.position.set(-6, 4, -5);  
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
        const durationInSeconds = this.turnSpeed / 1000;  
        this.moveProgress += this.delta / durationInSeconds;  

        if (this.moveProgress >= 1) {  
            if (typeof this.endMove === "function") {  
                this.endMove();  
            } else {  
                this.isAnimating = false;  
                this.currentMove = null;  
            }  
        } else if (this.rotationGroup) {  
            this.rotationGroup.rotation[this.currentMove.axis] = this.currentMove.angle * this.moveProgress;  
        }  
    } else {  
        if (typeof this.processQueue === "function") {  
            this.processQueue();  
        }  
    }  
}  

dispose() {  
    cancelAnimationFrame(this.animationId);  
    window.removeEventListener("resize", this.resizeHandler);  
    
    this.canvas?.removeEventListener("pointerdown", this.onPointerDown);
this.canvas?.removeEventListener("pointermove", this.onPointerMove);
this.canvas?.removeEventListener("pointerup", this.onPointerUp);

    if (this.renderer) {  
        this.renderer.dispose();  
        if (this.canvas && this.canvas.parentNode) {  
            this.canvas.parentNode.removeChild(this.canvas);  
        }  
    }  

    this.scene.clear();  
      
    this.cubies = [];  
    this.stickers = [];  
    this.moveQueue = [];  
    this.currentMove = null;  
}

// =====================================================  
// Part 2A  
// Cube Builder  
// =====================================================  

createSharedGeometry() {  
    this.bodyGeometry = new THREE.BoxGeometry(  
        this.size.cubie,  
        this.size.cubie,  
        this.size.cubie  
    );  

    this.edgeGeometry = new THREE.EdgesGeometry(this.bodyGeometry);  
      
    // செயல்திறனை அதிகரிக்க ஸ்டிக்கர் ஜியோமெட்ரியை இங்கே கேச் செய்கிறோம்  
    this.stickerGeometry = new THREE.PlaneGeometry(  
        this.size.sticker,  
        this.size.sticker  
    );  
}  

createSharedMaterials() {  
    this.bodyMaterial = new THREE.MeshStandardMaterial({  
        color: this.colors.BODY,  
        roughness: 0.70,  
        metalness: 0.10  
    });  

    this.edgeMaterial = new THREE.LineBasicMaterial({  
        color: this.colors.EDGE  
    });  

    // ஒவ்வொரு பக்கத்திற்கும் தேவையான மெட்டீரியல்களை கேச் செய்து மெமரியைச் சேமிக்கிறோம்  
    this.stickerMaterials = {};  
    const faces = ["U", "D", "L", "R", "F", "B"];  
      
    faces.forEach(face => {  
        const color = this.colors[face];  
        this.stickerMaterials[face] = new THREE.MeshStandardMaterial({  
            color: color,  
            roughness: 0.35,  
            metalness: 0.05,  
            emissive: color,  
            emissiveIntensity: 0.18  
        });  
    });  
}  

buildCube() {  
    this.createSharedGeometry();  
    this.createSharedMaterials();  

    this.cubies = [];  
    this.stickers = [];  

    const gap = this.size.gap;  

    // 3x3x3 பரிமாணங்களில் கியூப் கட்டமைப்பு உருவாக்கம்  
    for (let x = -1; x <= 1; x++) {  
        for (let y = -1; y <= 1; y++) {  
            for (let z = -1; z <= 1; z++) {  
                const cubie = this.createCubie(x, y, z);  

                cubie.position.set(  
                    x * gap,  
                    y * gap,  
                    z * gap  
                );  

                cubie.userData.grid = { x, y, z };  

                this.cubeRoot.add(cubie);  
                this.cubies.push(cubie);  
            }  
        }  
    }  
}  

createCubie(x, y, z) {  
    const mesh = new THREE.Mesh(  
        this.bodyGeometry,  
        this.bodyMaterial  
    );  

    mesh.castShadow = true;  
    mesh.receiveShadow = true;  

    const edges = new THREE.LineSegments(  
        this.edgeGeometry,  
        this.edgeMaterial  
    );  
    mesh.add(edges);  

    this.attachStickers(  
        mesh,  
        x,  
        y,  
        z  
    );  

    return mesh;  
}  

// =====================================================  
// Part 2B  
// Sticker Builder  
// =====================================================  

createStickerMaterial(colorKey) {  
    return this.stickerMaterials[colorKey];  
}  

createStickerGeometry() {  
    return this.stickerGeometry;  
}  

attachStickers(mesh, x, y, z) {  
    const offset = this.size.cubie / 2 + this.size.stickerOffset;  

    if (x === 1) {  
        this.addSticker(  
            mesh,  
            "R",  
            this.colors.R,  
            new THREE.Vector3(offset, 0, 0),  
            new THREE.Euler(0, -Math.PI / 2, 0),  
            x, y, z  
        );  
    }  

    if (x === -1) {  
        this.addSticker(  
            mesh,  
            "L",  
            this.colors.L,  
            new THREE.Vector3(-offset, 0, 0),  
            new THREE.Euler(0, Math.PI / 2, 0),  
            x, y, z  
        );  
    }  

    if (y === 1) {  
        this.addSticker(  
            mesh,  
            "U",  
            this.colors.U,  
            new THREE.Vector3(0, offset, 0),  
            new THREE.Euler(-Math.PI / 2, 0, 0),  
            x, y, z  
        );  
    }  

    if (y === -1) {  
        this.addSticker(  
            mesh,  
            "D",  
            this.colors.D,  
            new THREE.Vector3(0, -offset, 0),  
            new THREE.Euler(Math.PI / 2, 0, 0),  
            x, y, z  
        );  
    }  

    if (z === 1) {  
        this.addSticker(  
            mesh,  
            "F",  
            this.colors.F,  
            new THREE.Vector3(0, 0, offset),  
            new THREE.Euler(),  
            x, y, z  
        );  
    }  

    if (z === -1) {  
        this.addSticker(  
            mesh,  
            "B",  
            this.colors.B,  
            new THREE.Vector3(0, 0, -offset),  
            new THREE.Euler(0, Math.PI, 0),  
            x, y, z  
        );  
    }  
}  

addSticker(  
    parent,  
    face,  
    color,  
    position,  
    rotation,  
    gx,  
    gy,  
    gz  
) {  
    const sticker = new THREE.Mesh(  
        this.createStickerGeometry(),  
        this.createStickerMaterial(face)  
    );  

    sticker.position.copy(position);  
    sticker.rotation.copy(rotation);  

    sticker.userData = {  
        initialFace: face,  
        currentFace: face,  
        color: face,  
        grid: {  
            x: gx,  
            y: gy,  
            z: gz  
        },  
        isCenter: Math.abs(gx) + Math.abs(gy) + Math.abs(gz) === 1  
    };  

    parent.add(sticker);  
    this.stickers.push(sticker);  
}

// =====================================================  
// Part 3  
// Rotation Engine Implementation (Revised)  
// =====================================================  

enqueue(move) {  
    if (typeof move === "string" && move.trim() !== "") {  
        this.moveQueue.push(move.trim());  
    } else if (move && typeof move === "object" && move.raw) {  
        this.moveQueue.push(move.raw);  
    }  
}  

processQueue() {  
    if (this.isAnimating || this.isPaused || this.moveQueue.length === 0) {  
        return;  
    }  

    const nextMoveStr = this.moveQueue.shift();  
    const parsedMove = this.parseMove(nextMoveStr);  

    if (parsedMove) {  
        this.startMove(parsedMove);  
    }  
}  

parseMove(moveStr) {  
    const match = moveStr.match(/^([UDFBLR])([2']?)$/);  
    if (!match) return null;  

    const face = match[1];  
    const modifier = match[2];  

    // என்ஜினில் ஏற்கனவே உள்ள கட்டமைப்புகளை நேரடியாகப் பயன்படுத்துகிறது  
    const axis = this.faceAxis[face];  
    const layer = this.faceLayer[face];  
    const direction = this.faceDirection[face];  

    let baseAngle = -Math.PI / 2;  
    let angle = direction * baseAngle;  

    if (modifier === "'") {  
        angle = -angle;  
    } else if (modifier === "2") {  
        angle = Math.PI;  
    }  

    return {  
        raw: moveStr,  
        axis: axis,  
        layer: layer,  
        angle: angle  
    };  
}  

applyAlgorithm(algStr) {  
    if (!algStr) return;  
      
    const moves = algStr.trim().split(/\s+/);  
    moves.forEach(move => {  
        if (move) {  
            this.enqueue(move);  
        }  
    });  
}  

getLayerCubies(axis, layer) {  
    const gap = this.size.gap;  
    const expectedPos = layer * gap;  
    const epsilon = 0.001; // உயர்தர மிதவைப்புள்ளி சகிப்புத்தன்மை எல்லை  

    return this.cubies.filter(cubie => {  
        return Math.abs(cubie.position[axis] - expectedPos) < epsilon;  
    });  
}  

createRotationGroup(layerCubies) {  
    if (this.rotationGroup) {  
        this.cubeRoot.remove(this.rotationGroup);  
    }  

    this.rotationGroup = new THREE.Group();  
    this.cubeRoot.add(this.rotationGroup);  

    layerCubies.forEach(cubie => {  
        this.rotationGroup.attach(cubie);  
    });  
}  

startMove(move) {  
    this.currentMove = move;  
    this.isAnimating = true;  
    this.moveProgress = 0;  

    const layerCubies = this.getLayerCubies(move.axis, move.layer);  
    this.createRotationGroup(layerCubies);  
}  

endMove() {  
    if (!this.currentMove || !this.rotationGroup) return;  

    this.rotationGroup.rotation[this.currentMove.axis] = this.currentMove.angle;  
    this.rotationGroup.updateMatrixWorld(true);  

    const targets = [...this.rotationGroup.children];  
    const gap = this.size.gap;  
    const positionEpsilon = 0.001;  
    const vectorEpsilon = 0.9;  

    const targetQuaternion = new THREE.Quaternion();  
    const xAxis = new THREE.Vector3();  
    const yAxis = new THREE.Vector3();  
    const zAxis = new THREE.Vector3();  
    const rotationMatrix = new THREE.Matrix4();  

    targets.forEach(cubie => {  
        this.cubeRoot.attach(cubie);  

        // 1. கியூப் துண்டின் நிலையை துல்லியமாக ஸ்னாப் செய்கிறது (Position Snapping)  
        cubie.position.x = Math.round(cubie.position.x / gap) * gap;  
        cubie.position.y = Math.round(cubie.position.y / gap) * gap;  
        cubie.position.z = Math.round(cubie.position.z / gap) * gap;  

        // 2. கியூப் துண்டின் சுழற்சியை துல்லியமாக ஸ்னாப் செய்கிறது (Rotation Snapping)  
        rotationMatrix.makeRotationFromQuaternion(cubie.quaternion);  
        rotationMatrix.extractBasis(xAxis, yAxis, zAxis);  

        xAxis.set(Math.round(xAxis.x), Math.round(xAxis.y), Math.round(xAxis.z));  
        yAxis.set(Math.round(yAxis.x), Math.round(yAxis.y), Math.round(yAxis.z));  
        zAxis.set(Math.round(zAxis.x), Math.round(zAxis.y), Math.round(zAxis.z));  

        rotationMatrix.makeBasis(xAxis, yAxis, zAxis);  
        cubie.quaternion.setFromRotationMatrix(rotationMatrix);  
        cubie.rotation.setFromQuaternion(cubie.quaternion);  

        // 3. கியூப் கட்டக் கூறுகளை புதுப்பிக்கிறது  
        cubie.userData.grid.x = Math.round(cubie.position.x / gap);  
        cubie.userData.grid.y = Math.round(cubie.position.y / gap);  
        cubie.userData.grid.z = Math.round(cubie.position.z / gap);  

        // 4. ஸ்டிக்கர்களின் உலகளாவிய நோக்குநிலையை புதுப்பிக்கிறது  
        cubie.children.forEach(child => {  
            if (child.userData && child.userData.currentFace) {  
                // உலகளாவிய குவாட்டர்னியனைப் பயன்படுத்துகிறது  
                child.getWorldQuaternion(targetQuaternion);  
                  
                const normal = new THREE.Vector3(0, 0, 1);  
                normal.applyQuaternion(targetQuaternion);  

                let face = child.userData.currentFace;  

                if (normal.x > vectorEpsilon) face = "R";  
                else if (normal.x < -vectorEpsilon) face = "L";  
                else if (normal.y > vectorEpsilon) face = "U";  
                else if (normal.y < -vectorEpsilon) face = "D";  
                else if (normal.z > vectorEpsilon) face = "F";  
                else if (normal.z < -vectorEpsilon) face = "B";  

                child.userData.currentFace = face;  
                child.userData.grid = { ...cubie.userData.grid };  
            }  
        });  
    });  

    this.cubeRoot.remove(this.rotationGroup);  
    this.rotationGroup = null;  

    this.undoStack.push(this.currentMove.raw);  

    this.isAnimating = false;  
    this.currentMove = null;  
    this.moveProgress = 0;  
}

// =====================================================
// Part 4
// Raycasting & Interaction Engine (Color Input Version)
// =====================================================

onPointerDown(event) {
if (this.isAnimating || this.isPaused || !this.canvas) return;

// தட்டல் துல்லியத்தை சரிபார்க்க தொடக்க புள்ளியை சேமிக்கிறது    
this.pointerStart.x = event.clientX;    
this.pointerStart.y = event.clientY;    
this.dragging = false;

}

onPointerMove(event) {
// புதிய விதிகளின்படி கைமுறையாக இழுக்கும்போது கியூப் சுழலக் கூடாது
this.pointerNow.x = event.clientX;
this.pointerNow.y = event.clientY;
}

onPointerUp(event) {
if (this.isAnimating || this.isPaused || !this.canvas) return;

const deltaX = event.clientX - this.pointerStart.x;    
const deltaY = event.clientY - this.pointerStart.y;    
const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);    

// நகர்வு தூரம் 5 பிக்சல்களுக்கு மேல் இருந்தால் அது தட்டலாக கருதப்படாது (Anti-jitter)    
if (moveDistance > 5) {    
    return;    
}    

const rect = this.canvas.getBoundingClientRect();    
this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;    
this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;    

this.raycaster.setFromCamera(this.mouse, this.camera);    
const intersects = this.raycaster.intersectObjects(this.stickers);    

if (intersects.length > 0) {    
    const clickedSticker = intersects[0].object;    
        
    // app.js அல்லது பிற கோப்புகள் கையாளுவதற்கு ஏதுவாக கால்பேக் இருந்தால் இயக்குகிறது    
    if (typeof this.onStickerTapped === "function") {    
        this.onStickerTapped(clickedSticker);    
    } else if (this.activeColor) {    
        // என்ஜினில் செயலில் உள்ள வண்ணம் (activeColor) இருந்தால் நேரடியாகப் பயன்படுத்துகிறது    
        this.setStickerColor(clickedSticker, this.activeColor);    
    }    
}

}

setStickerColor(sticker, faceColor) {
if (!sticker || !this.stickerMaterials || !this.stickerMaterials[faceColor]) return;

// ஸ்டிக்கரின் காட்சி வண்ணத்தை (Material) மாற்றுகிறது    
sticker.material = this.stickerMaterials[faceColor];    
    
// தர்க்க நிலையை (Logical State) புதுப்பிக்கிறது    
sticker.userData.color = faceColor;    

// ஒட்டுமொத்த நிரல் பயன்பாட்டிற்கான நிகழ்வைத் தூண்டுகிறது    
if (typeof this.onStateChanged === "function") {    
    this.onStateChanged();    
}

}

navigateToFace(faceCode) {
if (!this.world) return;

// ஒவ்வொரு பக்கத்திற்கும் தேவையான துல்லியமான முப்பரிமாண கோணங்கள் (Isometric Perspective)    
const targetRotations = {    
    "F": { x: -0.35, y: 0.45 },    
    "R": { x: -0.35, y: -1.10 },    
    "B": { x: -0.35, y: -2.70 },    
    "L": { x: -0.35, y: 1.95 },    
    "U": { x: -1.20, y: 0.45 },    
    "D": { x: 0.65, y: 0.45 }    
};    

const target = targetRotations[faceCode.toUpperCase()];    
if (!target) return;    

this.isAnimating = true;    

const startX = this.world.rotation.x;    
const startY = this.world.rotation.y;    
    
const startTime = performance.now();    
const duration = 450; // சுழற்சி கால அளவு (மில்லி விநாடிகளில்)    

const animateTransition = (now) => {    
    const progress = Math.min((now - startTime) / duration, 1);    
        
    // சீரான சுழற்சிக்கான Easing கணக்கீடு (Ease-out Quad)    
    const ease = progress * (2 - progress);    

    this.world.rotation.x = startX + (target.x - startX) * ease;    
    this.world.rotation.y = startY + (target.y - startY) * ease;    

    if (progress < 1) {    
        requestAnimationFrame(animateTransition);    
    } else {    
        // இறுதி நிலையை துல்லியமாக ஸ்னாப் செய்கிறது    
        this.world.rotation.x = target.x;    
        this.world.rotation.y = target.y;    
            
        this.cameraRotation.x = target.x;    
        this.cameraRotation.y = target.y;    
            
        this.isAnimating = false;    
    }    
};    

requestAnimationFrame(animateTransition);

}

getFaceStickersCompletedCount(faceCode) {
// குறிப்பிட்ட ஒரு பக்கத்தில் பயனர் நிரப்பியுள்ள ஸ்டிக்கர்களின் எண்ணிக்கையைத் தரும்
return this.stickers.filter(s => s.userData && s.userData.currentFace === faceCode && s.userData.color).length;
}

getTotalStickersCompletedCount() {
// கியூப் முழுவதும் நிரப்பப்பட்டுள்ள மொத்த ஸ்டிக்கர்களின் எண்ணிக்கையைத் தரும் (Max 54)
return this.stickers.filter(s => s.userData && s.userData.color).length;

}

                    }
