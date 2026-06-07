const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// --- Game State ---
let gameWon = false;
const keysPressed = {};

// --- Game Objects ---
const player = {
    x: 100, y: 400,
    width: 20, height: 40,
    dx: 0, dy: 0,
    speed: 5,
    jumpPower: 12,
    onGround: false,
    hasKey: false,
    // For simple animation
    animFrame: 0,
    facingRight: true
};

const gravity = 0.5;

const platforms = [
    { x: 0, y: 550, width: canvas.width, height: 50 }, // Ground
    { x: 200, y: 450, width: 150, height: 20 },
    { x: 450, y: 350, width: 150, height: 20 },
    { x: 200, y: 250, width: 150, height: 20 },
    { x: 50, y: 150, width: 100, height: 20 }
];

const key = {
    x: 70, y: 110,
    width: 20, height: 20,
    isCollected: false
};

const door = {
    x: 500, y: 290,
    width: 40, height: 60
};

// --- Input Handling ---
document.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
document.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

function handleInput() {
    player.dx = 0;
    if (keysPressed['a']) {
        player.dx = -player.speed;
        player.facingRight = false;
    }
    if (keysPressed['d']) {
        player.dx = player.speed;
        player.facingRight = true;
    }
    if (keysPressed['w'] || keysPressed[' ']) {
        if (player.onGround) {
            player.dy = -player.jumpPower;
            player.onGround = false;
        }
    }
}

// --- Game Logic ---
function update() {
    if (gameWon) return;

    handleInput();

    // Apply gravity
    player.dy += gravity;
    player.x += player.dx;
    player.y += player.dy;
    player.onGround = false;

    // Platform collision
    for (const platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Check if landing on top
            if (player.dy > 0 && player.y + player.height - player.dy <= platform.y) {
                player.y = platform.y - player.height;
                player.dy = 0;
                player.onGround = true;
            }
        }
    }

    // Key collision
    if (!key.isCollected && player.x < key.x + key.width && player.x + player.width > key.x &&
        player.y < key.y + key.height && player.y + player.height > key.y) {
        key.isCollected = true;
        player.hasKey = true;
    }

    // Door collision
    if (player.hasKey && player.x < door.x + door.width && player.x + player.width > door.x &&
        player.y < door.y + door.height && player.y + player.height > door.y) {
        gameWon = true;
    }
    
    // Update simple animation frame for walking
    if (player.dx !== 0 && player.onGround) {
        player.animFrame += 0.2;
    } else {
        player.animFrame = 0;
    }
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    ctx.fillStyle = '#8B4513';
    for (const platform of platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw key
    if (!key.isCollected) {
        ctx.fillStyle = 'gold';
        ctx.fillRect(key.x, key.y, key.width, key.height);
        ctx.beginPath();
        ctx.arc(key.x + 5, key.y - 5, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw door
    ctx.fillStyle = player.hasKey ? '#008000' : '#800000';
    ctx.fillRect(door.x, door.y, door.width, door.height);
    ctx.fillStyle = '#333';
    ctx.fillRect(door.x + 5, door.y + 5, door.width - 10, door.height - 10);


    // Draw player
    drawStickman();

    // Draw win message
    if (gameWon) {
        ctx.fillStyle = 'green';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('YOU WIN!', canvas.width / 2, canvas.height / 2);
    }
}

function drawStickman() {
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const headX = player.x + player.width / 2;
    const headY = player.y + 8;
    const bodyY = player.y + 25;

    // Head
    ctx.arc(headX, headY, 8, 0, Math.PI * 2);
    // Body
    ctx.moveTo(headX, player.y + 16);
    ctx.lineTo(headX, bodyY);

    // Animation values
    const anim = Math.sin(player.animFrame);
    const legOffset = player.onGround ? anim * 8 : 0;
    const armOffset = player.onGround ? anim * 6 : 0;
    const armAngle = player.onGround ? 0 : Math.PI / 4;
    const dir = player.facingRight ? 1 : -1;

    // Legs
    ctx.moveTo(headX, bodyY);
    ctx.lineTo(headX - legOffset * dir, player.y + player.height);
    ctx.moveTo(headX, bodyY);
    ctx.lineTo(headX + legOffset * dir, player.y + player.height);

    // Arms
    ctx.moveTo(headX, player.y + 20);
    ctx.lineTo(headX - armOffset * dir - 5 * dir, player.y + 15 + armAngle * 10);
    ctx.moveTo(headX, player.y + 20);
    ctx.lineTo(headX + armOffset * dir - 5 * dir, player.y + 15 - armAngle * 10);

    ctx.stroke();
}


// --- Game Loop ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
