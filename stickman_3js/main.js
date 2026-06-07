import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class Character {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.keysPressed = {};
        this.joints = {};
        this.state = 'IDLE';
        this.baseFigureY = 1.1;

        this.buildController();
        this.buildModel();
        this.addEventListeners();
    }

    buildController() {
        const shape = new CANNON.Capsule(0.35, 0.8);
        this.body = new CANNON.Body({ mass: 20, shape, position: new CANNON.Vec3(0, 5, 0) });
        this.body.angularDamping = 0.95;
        this.world.addBody(this.body);
    }

    buildModel() {
        this.model = new THREE.Group();
        const material = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.3,
            metalness: 0.6,
        });
        const limbRadius = 0.1, jointRadius = 0.15, headRadius = 0.35;

        const torso = new THREE.Group();
        const torsoMesh = this.createLimb(1.5);
        torsoMesh.position.y = 0.75;
        torso.add(torsoMesh);

        this.joints.neck = new THREE.Group();
        this.joints.neck.position.y = 1.6;
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 32, 16), material);
        headMesh.position.y = headRadius;
        this.joints.neck.add(headMesh);
        torso.add(this.joints.neck);

        const clavicleL = this.createLimbSegment(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(-0.5, 1.4, 0), material);
        const clavicleR = this.createLimbSegment(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(0.5, 1.4, 0), material);
        torso.add(clavicleL, clavicleR);

        const createArm = (side) => {
            const shoulder = this.createJoint(side * -0.5, 1.4, material);
            const upperArm = this.createLimbGroup(0.8, material);
            const elbow = this.createJoint(0, -0.8, material);
            const lowerArm = this.createLimbGroup(0.7, material);
            const hand = this.createJoint(0, -0.7, material);
            lowerArm.add(hand); elbow.add(lowerArm); upperArm.add(elbow); shoulder.add(upperArm);
            torso.add(shoulder);
            this.joints[`shoulder${side > 0 ? 'R' : 'L'}`] = shoulder;
            this.joints[`elbow${side > 0 ? 'R' : 'L'}`] = elbow;
        };
        createArm(1); createArm(-1);

        const createLeg = (side) => {
            const hip = this.createJoint(side * -0.2, 0, material);
            const upperLeg = this.createLimbGroup(1.0, material);
            const knee = this.createJoint(0, -1.0, material);
            const lowerLeg = this.createLimbGroup(0.9, material);
            const foot = this.createJoint(0, -0.9, material);
            lowerLeg.add(foot); knee.add(lowerLeg); upperLeg.add(knee); hip.add(upperLeg);
            torso.add(hip);
            this.joints[`hip${side > 0 ? 'R' : 'L'}`] = hip;
            this.joints[`knee${side > 0 ? 'R' : 'L'}`] = knee;
        };
        createLeg(1); createLeg(-1);

        this.model.add(torso);
        this.scene.add(this.model);
    }
    
    update(deltaTime, time) {
        this.handleInput();
        this.updateAnimation(time);
        this.syncModelToBody();
    }

    handleInput() {
        const moveSpeed = 5;
        const rotateSpeed = 3;
        let isMoving = false;

        if (this.keysPressed['w']) {
            const forward = new CANNON.Vec3();
            this.body.quaternion.vmult(new CANNON.Vec3(0, 0, -1), forward);
            this.body.velocity.x = forward.x * moveSpeed;
            this.body.velocity.z = forward.z * moveSpeed;
            isMoving = true;
        }
        if (this.keysPressed['s']) {
            const backward = new CANNON.Vec3();
            this.body.quaternion.vmult(new CANNON.Vec3(0, 0, 1), backward);
            this.body.velocity.x = backward.x * moveSpeed;
            this.body.velocity.z = backward.z * moveSpeed;
            isMoving = true;
        }
        if (this.keysPressed['a']) this.body.angularVelocity.y = rotateSpeed;
        if (this.keysPressed['d']) this.body.angularVelocity.y = -rotateSpeed;
        if (!this.keysPressed['a'] && !this.keysPressed['d']) this.body.angularVelocity.y = 0;
        
        if (!this.keysPressed['w'] && !this.keysPressed['s']) {
            this.body.velocity.x *= 0.9;
            this.body.velocity.z *= 0.9;
        }

        if (this.keysPressed[' ']) this.jump();

        this.state = isMoving ? 'WALKING' : 'IDLE';
    }

    jump() {
        // Simple ground check - extend this for more robust checks
        if (Math.abs(this.body.velocity.y) < 0.1) {
            this.body.applyImpulse(new CANNON.Vec3(0, 100, 0));
        }
    }

    updateAnimation(time) {
        const walkSpeed = 8, swingAmp = 0.7, idleSpeed = 1, idleAmp = 0.05;
        let hipR_x = 0, hipL_x = 0, shoulderR_x = 0, shoulderL_x = 0;
        let kneeR_x = 0, kneeL_x = 0, elbowR_x = 0, elbowL_x = 0;
        let neck_y = 0;

        if (this.state === 'WALKING') {
            const legSwing = Math.sin(time * walkSpeed) * swingAmp;
            hipR_x = legSwing;
            hipL_x = -legSwing;
            shoulderR_x = -legSwing;
            shoulderL_x = legSwing;
            kneeR_x = Math.max(0, Math.sin(time * walkSpeed - 1)) * 1.2;
            kneeL_x = Math.max(0, Math.sin(time * walkSpeed * -1 - 1)) * 1.2;
            elbowR_x = Math.max(0, Math.sin(time * walkSpeed * -1 - 0.5)) * 0.8;
            elbowL_x = Math.max(0, Math.sin(time * walkSpeed - 0.5)) * 0.8;
        } else { // IDLE
            const idleSway = Math.sin(time * idleSpeed) * idleAmp;
            hipR_x = idleSway;
            hipL_x = idleSway;
            shoulderR_x = -idleSway;
            shoulderL_x = -idleSway;
            neck_y = idleSway * 2;
        }

        // Smoothly interpolate to target rotations (animation blending)
        const lerpFactor = 0.1;
        this.lerpJoint('hipR', hipR_x, 0, 0, lerpFactor);
        this.lerpJoint('hipL', hipL_x, 0, 0, lerpFactor);
        this.lerpJoint('shoulderR', shoulderR_x, 0, 0, lerpFactor);
        this.lerpJoint('shoulderL', shoulderL_x, 0, 0, lerpFactor);
        this.lerpJoint('kneeR', kneeR_x, 0, 0, lerpFactor);
        this.lerpJoint('kneeL', kneeL_x, 0, 0, lerpFactor);
        this.lerpJoint('elbowR', elbowR_x, 0, 0, lerpFactor);
        this.lerpJoint('elbowL', elbowL_x, 0, 0, lerpFactor);
        this.lerpJoint('neck', 0, neck_y, 0, lerpFactor);
    }

    syncModelToBody() {
        this.model.position.copy(this.body.position).y -= this.baseFigureY;
        this.model.quaternion.copy(this.body.quaternion);
    }
    
    // --- Helpers ---
    addEventListeners() {
        document.addEventListener('keydown', (e) => { this.keysPressed[e.key.toLowerCase()] = true; });
        document.addEventListener('keyup', (e) => { this.keysPressed[e.key.toLowerCase()] = false; });
    }
    createJoint(x, y, mat) {
        const jointGroup = new THREE.Group();
        const jointMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), mat);
        jointGroup.add(jointMesh);
        jointGroup.position.set(x, y, 0);
        return jointGroup;
    }
    createLimb(length, mat) { return new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, length, 8), mat); }
    createLimbGroup(length, mat) {
        const group = new THREE.Group();
        const mesh = this.createLimb(length, mat);
        mesh.position.y = -length / 2;
        group.add(mesh);
        return group;
    }
    createLimbSegment(p1, p2, mat) {
        const distance = p1.distanceTo(p2);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * 0.8, 0.1 * 0.8, distance, 8), mat);
        const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        limb.position.copy(midpoint);
        limb.lookAt(p2);
        limb.rotateX(Math.PI / 2);
        return limb;
    }
    lerpJoint(name, x, y, z, alpha) {
        const joint = this.joints[name];
        if (!joint) return;
        joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, x, alpha);
        joint.rotation.y = THREE.MathUtils.lerp(joint.rotation.y, y, alpha);
        joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, z, alpha);
    }
}

class World {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.objectsToUpdate = [];
        this.build();
    }

    build() {
        // Ground
        const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
        const grid = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
        this.scene.add(grid);

        // Interactive Objects
        for (let i = 0; i < 20; i++) {
            const size = Math.random() * 0.5 + 0.2;
            const pos = { x: (Math.random() - 0.5) * 20, y: Math.random() * 5 + 2, z: (Math.random() - 0.5) * 20 };
            if (Math.random() > 0.5) {
                this.addBox(size, size, size, pos);
            } else {
                this.addSphere(size, pos);
            }
        }
    }

    addBox(width, height, depth, position) {
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({ mass: width*height*depth*5, position: new CANNON.Vec3(position.x, position.y, position.z), shape });
        this.world.addBody(body);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.objectsToUpdate.push({ mesh, body });
    }

    addSphere(radius, position) {
        const shape = new CANNON.Sphere(radius);
        const body = new CANNON.Body({ mass: radius*5, position: new CANNON.Vec3(position.x, position.y, position.z), shape });
        this.world.addBody(body);
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius), new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff }));
        mesh.castShadow = true;
        this.scene.add(mesh);
        this.objectsToUpdate.push({ mesh, body });
    }
}

// --- Main Application ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d2935);
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xadd8e6, 0x444444, 2);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 3);
dirLight.position.set(10, 20, 5);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 15;
dirLight.shadow.camera.bottom = -15;
dirLight.shadow.camera.left = -15;
dirLight.shadow.camera.right = 15;
scene.add(dirLight);

const appWorld = new World(scene, world);
const character = new Character(scene, world);

const clock = new THREE.Clock();
function animate() {
    const deltaTime = clock.getDelta();
    const time = clock.getElapsedTime();

    world.step(1 / 60, deltaTime);
    character.update(deltaTime, time);

    for (const obj of appWorld.objectsToUpdate) {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    }

    const cameraOffset = new THREE.Vector3(0, 4, 7);
    const characterPos = new THREE.Vector3().copy(character.body.position);
    const cameraTarget = characterPos.clone().add(cameraOffset);
    camera.position.lerp(cameraTarget, 0.05);
    controls.target.lerp(characterPos, 0.05);
    controls.update();

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
