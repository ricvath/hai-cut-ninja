const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const startButton = document.getElementById('startButton');

// Get all sound elements
const sounds = [
    document.getElementById('sound1'),
    document.getElementById('sound2'),
    document.getElementById('sound3')
];

// Handle window resize
function resizeCanvas() {
    canvas.width = window.innerWidth - 40;
    canvas.height = window.innerHeight - 40;
    // Recalculate game parameters based on new size
    calculateGameParameters();
}

// Game parameters that depend on screen size
let gameParams = {
    minHeight: 0,
    maxHeight: 0,
    optimalHeight: 0,
    spawnWidth: 0,
    centerX: 0
};

// Calculate game parameters based on screen size
function calculateGameParameters() {
    gameParams.minHeight = canvas.height * 0.4; // Minimum height fruits should reach
    gameParams.maxHeight = canvas.height * 0.8; // Maximum height fruits should reach
    gameParams.optimalHeight = canvas.height * 0.6; // Target height for most fruits
    gameParams.spawnWidth = canvas.width * 0.8; // Width of the spawn area
    gameParams.centerX = canvas.width / 2; // Center of the screen
}

// Initial setup
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let score = 0;
let fruits = [];
let matrixEffects = [];
let lastTime = 0;
let gameStarted = false;
const FPS = 60;
const frameTime = 1000 / FPS;

[... rest of the constants (japaneseChars, fruitPaths, fruitTypes) remain the same ...]

// Mouse/Touch tracking
let inputTrail = [];
const TRAIL_LENGTH = 10;
let lastInputPos = { x: 0, y: 0 };
let currentInputPos = { x: 0, y: 0 };
let isInputActive = false;

// Input handling functions
function getInputPos(e, isTouch = false) {
    const rect = canvas.getBoundingClientRect();
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function handleInputStart(e, isTouch = false) {
    if (!gameStarted) return;
    isInputActive = true;
    const pos = getInputPos(e, isTouch);
    currentInputPos = pos;
    lastInputPos = pos;
    inputTrail = [pos];
}

function handleInputMove(e, isTouch = false) {
    if (!gameStarted || !isInputActive) return;
    e.preventDefault(); // Prevent scrolling on mobile

    const pos = getInputPos(e, isTouch);
    currentInputPos = pos;
    
    inputTrail.push({ ...pos });
    if (inputTrail.length > TRAIL_LENGTH) {
        inputTrail.shift();
    }

    if (inputTrail.length >= 2) {
        const lastPos = inputTrail[inputTrail.length - 2];
        fruits.forEach(fruit => {
            if (fruit.checkSlice(lastPos.x, lastPos.y, pos.x, pos.y)) {
                score += 10;
                scoreElement.textContent = score;
                playRandomSound();
                
                for (let i = 0; i < 3; i++) {
                    matrixEffects.push(new MatrixEffect(
                        fruit.x + (Math.random() - 0.5) * 50,
                        fruit.y
                    ));
                }
            }
        });
    }

    lastInputPos = { ...pos };
}

function handleInputEnd() {
    isInputActive = false;
    inputTrail = [];
}

// Mouse event listeners
canvas.addEventListener('mousedown', e => handleInputStart(e, false));
canvas.addEventListener('mousemove', e => handleInputMove(e, false));
canvas.addEventListener('mouseup', handleInputEnd);
canvas.addEventListener('mouseout', handleInputEnd);

// Touch event listeners
canvas.addEventListener('touchstart', e => handleInputStart(e, true));
canvas.addEventListener('touchmove', e => handleInputMove(e, true));
canvas.addEventListener('touchend', handleInputEnd);
canvas.addEventListener('touchcancel', handleInputEnd);

class Fruit {
    constructor() {
        const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        
        // Spawn position
        const spawnOffset = gameParams.spawnWidth / 2;
        this.x = gameParams.centerX + (Math.random() - 0.5) * spawnOffset;
        this.y = canvas.height + 50;
        
        // Calculate velocity to reach target height
        const targetHeight = gameParams.optimalHeight + (Math.random() - 0.5) * (gameParams.maxHeight - gameParams.minHeight);
        const time = 1.5; // Time to reach peak height
        this.gravity = 0.4;
        
        // Calculate initial velocity needed to reach target height
        this.speedY = -Math.sqrt(2 * this.gravity * (canvas.height - targetHeight));
        
        // Calculate horizontal speed to move towards center
        const distanceToCenter = gameParams.centerX - this.x;
        this.speedX = (distanceToCenter / (time * 60)) + (Math.random() - 0.5) * 4;
        
        this.name = type.name;
        this.type = type.type;
        this.scale = type.scale;
        this.hitRadius = type.hitRadius;
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.sliced = false;
        this.sliceAngle = 0;
        this.sliceParts = [];
    }

    [... rest of the Fruit class methods remain the same ...]
}

[... rest of the classes (MatrixEffect) and functions remain the same ...]

// Game loop
function gameLoop(currentTime) {
    if (!gameStarted) return;

    if (lastTime === 0) {
        lastTime = currentTime;
    }
    const deltaTime = currentTime - lastTime;

    if (deltaTime >= frameTime) {
        // Clear canvas with trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Spawn new fruits
        if (Math.random() < 0.02) {
            fruits.push(new Fruit());
        }

        // Update and draw fruits
        fruits = fruits.filter(fruit => fruit.y < canvas.height + 100);
        fruits.forEach(fruit => {
            fruit.update();
            fruit.draw();
        });

        // Update and draw Matrix effects
        matrixEffects = matrixEffects.filter(effect => effect.y < canvas.height + 200);
        matrixEffects.forEach(effect => {
            effect.update();
            effect.draw();
        });

        // Draw input trail
        if (isInputActive && inputTrail.length >= 2) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.moveTo(inputTrail[0].x, inputTrail[0].y);
            
            // Create smooth curve through points
            for (let i = 1; i < inputTrail.length - 2; i++) {
                const xc = (inputTrail[i].x + inputTrail[i + 1].x) / 2;
                const yc = (inputTrail[i].y + inputTrail[i + 1].y) / 2;
                ctx.quadraticCurveTo(inputTrail[i].x, inputTrail[i].y, xc, yc);
            }
            
            // Curve through the last two points
            if (inputTrail.length > 2) {
                const last = inputTrail.length - 1;
                ctx.quadraticCurveTo(
                    inputTrail[last - 1].x,
                    inputTrail[last - 1].y,
                    inputTrail[last].x,
                    inputTrail[last].y
                );
            }
            
            ctx.stroke();
            ctx.restore();
        }

        lastTime = currentTime;
    }

    requestAnimationFrame(gameLoop);
}

// Start button handler
startButton.addEventListener('click', () => {
    console.log('Game starting...');
    gameStarted = true;
    startButton.style.display = 'none';
    
    // Initial canvas setup
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Start the game loop
    requestAnimationFrame(gameLoop);
});