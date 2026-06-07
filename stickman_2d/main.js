// --- Matter.js Modules ---
const { Engine, Render, Runner, World, Bodies, Body, Composite, Constraint } = Matter;

// --- Setup ---
const engine = Engine.create();
const world = engine.world;

const canvas = document.createElement('canvas');
document.body.insertBefore(canvas, document.body.firstChild);
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext('2d');

// --- World Creation ---
const ground = Bodies.rectangle(canvas.width / 2, canvas.height - 30, canvas.width, 60, { isStatic: true });
const platform = Bodies.rectangle(canvas.width * 0.7, canvas.height - 200, 300, 40, { isStatic: true });
const box = Bodies.rectangle(canvas.width * 0.2, 100, 80, 80);
World.add(world, [ground, platform, box]);

// --- Ragdoll Stickman Creation ---
function createStickman(x, y) {
    const group = Body.nextGroup(true);
    const category = Body.nextCategory();
    const torso = Bodies.rectangle(x, y, 40, 80, { collisionFilter: { group, category } });
    const head = Bodies.circle(x, y - 60, 30, { collisionFilter: { group, category } });

    const createLimb = (xOffset, yOffset, width, height, isUpper) => {
        return Bodies.rectangle(x + xOffset, y + yOffset, width, height, {
            collisionFilter: { group, category },
            friction: 0.9
        });
    };

    const upperArmL = createLimb(-50, -20, 20, 60);
    const lowerArmL = createLimb(-50, 20, 20, 60);
    const upperArmR = createLimb(50, -20, 20, 60);
    const lowerArmR = createLimb(50, 20, 20, 60);
    const upperLegL = createLimb(-15, 80, 20, 80);
    const lowerLegL = createLimb(-15, 140, 20, 80);
    const upperLegR = createLimb(15, 80, 20, 80);
    const lowerLegR = createLimb(15, 140, 20, 80);

    const parts = [
        torso, head, upperArmL, lowerArmL, upperArmR, lowerArmR,
        upperLegL, lowerLegL, upperLegR, lowerLegR
    ];

    const createJoint = (bodyA, bodyB, pointA, pointB, stiffness = 0.4) => {
        return Constraint.create({ bodyA, bodyB, pointA, pointB, stiffness, damping: 0.1 });
    };

    const constraints = [
        createJoint(torso, head, { x: 0, y: -45 }, { x: 0, y: 0 }),
        createJoint(torso, upperArmL, { x: -20, y: -30 }, { x: 0, y: -20 }),
        createJoint(upperArmL, lowerArmL, { x: 0, y: 30 }, { x: 0, y: -20 }),
        createJoint(torso, upperArmR, { x: 20, y: -30 }, { x: 0, y: -20 }),
        createJoint(upperArmR, lowerArmR, { x: 0, y: 30 }, { x: 0, y: -20 }),
        createJoint(torso, upperLegL, { x: -10, y: 40 }, { x: 0, y: -30 }),
        createJoint(upperLegL, lowerLegL, { x: 0, y: 40 }, { x: 0, y: -30 }),
        createJoint(torso, upperLegR, { x: 10, y: 40 }, { x: 0, y: -30 }),
        createJoint(upperLegR, lowerLegR, { x: 0, y: 40 }, { x: 0, y: -30 }),
    ];

    const stickman = Composite.create({ bodies: parts, constraints });
    World.add(world, stickman);
    return torso; // Return the main body for control
}

const mainController = createStickman(canvas.width / 2, canvas.height / 2 - 200);

// --- Control ---
const keysPressed = {};
document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

function handleControl() {
    const forceMagnitude = 0.03;
    if (keysPressed['a']) {
        Body.applyForce(mainController, mainController.position, { x: -forceMagnitude, y: 0 });
    }
    if (keysPressed['d']) {
        Body.applyForce(mainController, mainController.position, { x: forceMagnitude, y: 0 });
    }
    if (keysPressed['w'] || keysPressed[' ']) {
        // A simple ground check by raycasting or checking velocity could be added here
        Body.applyForce(mainController, mainController.position, { x: 0, y: -forceMagnitude * 2 });
    }
}

// --- Custom Renderer ---
function render() {
    const bodies = Composite.allBodies(engine.world);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    for (let i = 0; i < bodies.length; i++) {
        const vertices = bodies[i].vertices;
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let j = 1; j < vertices.length; j++) {
            ctx.lineTo(vertices[j].x, vertices[j].y);
        }
        ctx.lineTo(vertices[0].x, vertices[0].y);
    }
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#34495e';
    ctx.fillStyle = '#bdc3c7';
    ctx.fill();
    ctx.stroke();

    handleControl();
    requestAnimationFrame(render);
}

// --- Run ---
const runner = Runner.create();
Runner.run(runner, engine);
render();

// --- Resize ---
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Could reposition bodies here if needed
});
