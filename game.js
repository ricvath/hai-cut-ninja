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
    gameParams.minHeight = canvas.height * 0.4;
    gameParams.maxHeight = canvas.height * 0.8;
    gameParams.optimalHeight = canvas.height * 0.6;
    gameParams.spawnWidth = canvas.width * 0.8;
    gameParams.centerX = canvas.width / 2;
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

// Japanese characters for Matrix effect
const japaneseChars = "゠アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンヴヵヶ";

// SVG Paths for fruits
const fruitPaths = {
    apple: {
        color: "#ff0000",
        shadowColor: "#8b0000",
        path: [
            "M 0,-30 C -20,-30 -30,-15 -30,0 C -30,20 -15,35 0,35 C 15,35 30,20 30,0 C 30,-15 20,-30 0,-30",
            "M -2,-30 C -2,-35 2,-35 2,-30 L 0,-25 Z"
        ],
        slicedPaths: {
            left: [
                "M 0,-30 C -20,-30 -30,-15 -30,0 C -30,20 -15,35 0,35 L 0,-30 Z",
                "M -2,-30 C -2,-35 0,-35 0,-30"
            ],
            right: [
                "M 0,-30 C 20,-30 30,-15 30,0 C 30,20 15,35 0,35 L 0,-30 Z",
                "M 0,-30 C 2,-35 2,-35 2,-30"
            ]
        }
    },
    orange: {
        color: "#ffa500",
        shadowColor: "#cc7000",
        path: [
            "M 0,-25 C -25,-25 -25,25 0,25 C 25,25 25,-25 0,-25",
            "M -15,-15 C -5,-5 5,-5 15,-15",
            "M -15,15 C -5,5 5,5 15,15"
        ],
        slicedPaths: {
            left: ["M 0,-25 C -25,-25 -25,25 0,25 L 0,-25 Z"],
            right: ["M 0,-25 C 25,-25 25,25 0,25 L 0,-25 Z"]
        }
    },
    banana: {
        color: "#ffff00",
        shadowColor: "#ccc000",
        path: [
            "M -30,0 C -20,-20 20,-20 30,0 C 20,20 -20,20 -30,0 Z"
        ],
        slicedPaths: {
            left: ["M -30,0 C -20,-20 0,-20 0,0 C 0,20 -20,20 -30,0 Z"],
            right: ["M 0,0 C 20,-20 30,-20 30,0 C 20,20 0,20 0,0 Z"]
        }
    },
    grape: {
        color: "#800080",
        shadowColor: "#4b004b",
        path: [
            "M -20,-20 C -35,-35 -35,5 -20,-20",
            "M 0,-30 C -15,-45 -15,-5 0,-30",
            "M 20,-20 C 5,-35 5,5 20,-20",
            "M -30,10 C -45,-5 -45,35 -30,10",
            "M 0,20 C -15,5 -15,45 0,20",
            "M 30,10 C 15,-5 15,35 30,10"
        ],
        slicedPaths: {
            left: [
                "M -20,-20 C -35,-35 -35,5 -20,-20",
                "M 0,-30 C -15,-45 -15,-5 0,-30",
                "M -30,10 C -45,-5 -45,35 -30,10",
                "M 0,20 C -15,5 -15,45 0,20"
            ],
            right: [
                "M 20,-20 C 5,-35 5,5 20,-20",
                "M 0,-30 C 15,-45 15,-5 0,-30",
                "M 30,10 C 15,-5 15,35 30,10",
                "M 0,20 C 15,5 15,45 0,20"
            ]
        }
    }
};

// Fruit types with Japanese names
const fruitTypes = [
    { 
        name: "りんご", 
        type: "apple",
        scale: 2.0,
        hitRadius: 50
    },
    { 
        name: "オレンジ", 
        type: "orange",
        scale: 2.2,
        hitRadius: 50
    },
    { 
        name: "バナナ", 
        type: "banana",
        scale: 2.0,
        hitRadius: 45
    },
    { 
        name: "ぶどう", 
        type: "grape",
        scale: 2.5,
        hitRadius: 45
    }
];

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
    e.preventDefault();

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

// Draw SVG path helper
function drawSVGPath(path, color, shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 10;
    ctx.fillStyle = color;
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = 2;

    const pathObj = new Path2D(path);
    ctx.fill(pathObj);
    ctx.stroke(pathObj);
}

class Fruit {
    constructor() {
        const type = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
        
        // Spawn position
        const spawnOffset = gameParams.spawnWidth / 2;
        this.x = gameParams.centerX + (Math.random() - 0.5) * spawnOffset;
        this.y = canvas.height + 50;
        
        // Calculate velocity to reach target height
        const targetHeight = gameParams.optimalHeight + (Math.random() - 0.5) * (gameParams.maxHeight - gameParams.minHeight);
        const time = 1.5;
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

    update() {
        if (!this.sliced) {
            this.speedY += this.gravity;
            this.y += this.speedY;
            this.x += this.speedX;
            this.rotation += this.rotationSpeed;
        } else {
            this.sliceParts.forEach(part => {
                part.x += part.speedX;
                part.y += part.speedY;
                part.speedY += this.gravity;
                part.rotation += part.rotationSpeed;
            });
        }
    }

    draw() {
        const fruitStyle = fruitPaths[this.type];

        if (!this.sliced) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.scale(this.scale, this.scale);

            fruitStyle.path.forEach(path => {
                drawSVGPath(path, fruitStyle.color, fruitStyle.shadowColor);
            });

            ctx.restore();

            // Draw Japanese text
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText(this.name, this.x - 20, this.y);
        } else {
            this.sliceParts.forEach(part => {
                ctx.save();
                ctx.translate(part.x, part.y);
                ctx.rotate(part.rotation);
                ctx.scale(this.scale, this.scale);

                const paths = part.isLeft ? 
                    fruitStyle.slicedPaths.left : 
                    fruitStyle.slicedPaths.right;

                paths.forEach(path => {
                    drawSVGPath(path, fruitStyle.color, fruitStyle.shadowColor);
                });

                ctx.restore();
            });
        }
    }

    slice(angle) {
        if (!this.sliced) {
            this.sliced = true;
            this.sliceAngle = angle;
            
            const part1 = {
                x: this.x,
                y: this.y,
                speedX: this.speedX - 2,
                speedY: this.speedY - 2,
                rotation: this.rotation,
                rotationSpeed: this.rotationSpeed - 0.1,
                isLeft: true
            };
            
            const part2 = {
                x: this.x,
                y: this.y,
                speedX: this.speedX + 2,
                speedY: this.speedY - 2,
                rotation: this.rotation,
                rotationSpeed: this.rotationSpeed + 0.1,
                isLeft: false
            };
            
            this.sliceParts = [part1, part2];
        }
    }

    checkSlice(x1, y1, x2, y2) {
        if (!this.sliced) {
            const centerX = this.x;
            const centerY = this.y;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const fx = x1 - centerX;
            const fy = y1 - centerY;
            
            const a = dx * dx + dy * dy;
            const b = 2 * (fx * dx + fy * dy);
            const c = (fx * fx + fy * fy) - (this.hitRadius * this.hitRadius);
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant >= 0) {
                const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
                const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
                
                if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
                    const angle = Math.atan2(dy, dx);
                    this.slice(angle);
                    return true;
                }
            }
        }
        return false;
    }
}

class MatrixEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.chars = [];
        this.speed = Math.random() * 2 + 1;
        for (let i = 0; i < 20; i++) {
            this.chars.push({
                char: japaneseChars[Math.floor(Math.random() * japaneseChars.length)],
                alpha: 1 - (i * 0.05)
            });
        }
    }

    update() {
        this.y += this.speed;
        if (Math.random() < 0.1) {
            this.chars.forEach(c => {
                c.char = japaneseChars[Math.floor(Math.random() * japaneseChars.length)];
            });
        }
    }

    draw() {
        ctx.font = "20px Arial";
        this.chars.forEach((char, i) => {
            ctx.fillStyle = `rgba(0, 255, 0, ${char.alpha})`;
            ctx.fillText(char.char, this.x, this.y - (i * 20));
        });
    }
}

function playRandomSound() {
    const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
    if (randomSound) {
        randomSound.currentTime = 0;
        randomSound.play().catch(error => console.log("Audio play failed:", error));
    }
}

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