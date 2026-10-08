const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const shieldDisplay = document.getElementById("shield");
const finalScoreDisplay = document.getElementById("finalScore");
const highScoreDisplay = document.getElementById("highScore");
const levelDisplay = document.getElementById("level");
const message = document.getElementById("message");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const playBtn = document.getElementById("playBtn");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let player;
let bullets = [];
let enemies = [];
let asteroids = [];
let powerUps = [];
let particles = [];
let stars = [];

let score = 0;
let lives = 3;
let level = 1;
let highScore = loadHighScore();

let running = false;
let gameOver = false;

let enemyTimer = 0;
let asteroidTimer = 0;
let powerUpTimer = 0;
let lastTime = 0;

const keys = {};

highScoreDisplay.textContent = highScore;

// Create background stars
for (let i = 0; i < 120; i++) {
    stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 35 + 15,
        alpha: Math.random() * 0.7 + 0.3
    });
}

function loadHighScore() {
    try {
        return Number(localStorage.getItem("solarHighScore")) || 0;
    } catch {
        return 0;
    }
}

function saveHighScore() {
    try {
        localStorage.setItem("solarHighScore", highScore);
    } catch {
        // Game still works if browser storage is unavailable.
    }
}

function resetGame() {
    player = {
        x: WIDTH / 2 - 18,
        y: HEIGHT - 85,
        width: 36,
        height: 42,
        speed: 300,
        cooldown: 0,
        shield: 0,
        rapidFire: 0,
        invulnerable: 0
    };

    bullets = [];
    enemies = [];
    asteroids = [];
    powerUps = [];
    particles = [];

    score = 0;
    lives = 3;
    level = 1;

    enemyTimer = 0;
    asteroidTimer = 0;
    powerUpTimer = 0;

    gameOver = false;

    updateHUD();
}

function startGame() {
    resetGame();
    running = true;
    message.classList.add("hidden");
    lastTime = performance.now();
}

function updateHUD() {
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    shieldDisplay.textContent = player && player.shield > 0
        ? "ON"
        : "OFF";

    finalScoreDisplay.textContent = score;
    levelDisplay.textContent = level;

    if (score > highScore) {
        highScore = score;
        highScoreDisplay.textContent = highScore;
        saveHighScore();
    }
}

// Draw the background
function drawBackground(dt) {
    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);

    gradient.addColorStop(0, "#07152e");
    gradient.addColorStop(0.55, "#10133a");
    gradient.addColorStop(1, "#030817");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Nebula-like glow
    const glow = ctx.createRadialGradient(
        WIDTH * 0.7, HEIGHT * 0.4, 10,
        WIDTH * 0.7, HEIGHT * 0.4, 260
    );

    glow.addColorStop(0, "rgba(88, 28, 135, 0.18)");
    glow.addColorStop(1, "rgba(3, 7, 18, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Moving stars
    for (const star of stars) {
        if (running) {
            star.y += star.speed * dt;

            if (star.y > HEIGHT) {
                star.y = 0;
                star.x = Math.random() * WIDTH;
            }
        }

        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = "#bae6fd";
        ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    ctx.globalAlpha = 1;
}

// Draw the player spaceship
function drawPlayer() {
    if (!player) return;

    if (
        player.invulnerable > 0 &&
        Math.floor(performance.now() / 100) % 2 === 0
    ) {
        return;
    }

    ctx.save();

    ctx.translate(
        player.x + player.width / 2,
        player.y + player.height / 2
    );

    // Engine flame
    ctx.shadowBlur = 18;
    ctx.shadowColor = "#fb923c";

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-7, 13);
    ctx.lineTo(0, 30 + Math.random() * 7);
    ctx.lineTo(7, 13);
    ctx.closePath();
    ctx.fill();

    // Ship body
    ctx.shadowColor = "#22d3ee";
    ctx.shadowBlur = 15;

    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(17, 16);
    ctx.lineTo(8, 12);
    ctx.lineTo(0, 17);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-17, 16);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = "#0284c7";

    ctx.beginPath();
    ctx.moveTo(-8, 3);
    ctx.lineTo(-22, 17);
    ctx.lineTo(-9, 14);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(8, 3);
    ctx.lineTo(22, 17);
    ctx.lineTo(9, 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = "#2563eb";
    ctx.beginPath();
    ctx.ellipse(0, -5, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Shield effect
    if (player.shield > 0) {
        ctx.save();

        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.shadowBlur = 18;
        ctx.shadowColor = "#34d399";

        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2,
            player.y + player.height / 2,
            30,
            0,
            Math.PI * 2
        );

        ctx.stroke();
        ctx.restore();
    }
}

// Shoot a bullet
function shoot() {
    if (!player || player.cooldown > 0) return;

    bullets.push({
        x: player.x + player.width / 2 - 3,
        y: player.y - 12,
        width: 6,
        height: 16,
        speed: 480
    });

    player.cooldown = player.rapidFire > 0 ? 0.12 : 0.25;
}

// Create an enemy ship
function spawnEnemy() {
    const size = 28 + Math.random() * 10;

    enemies.push({
        x: Math.random() * (WIDTH - size),
        y: -size,
        width: size,
        height: size,
        speed: 65 + Math.random() * 45 + level * 8,
        hp: Math.random() < 0.2 + Math.min(level * 0.02, 0.15) ? 2 : 1,
        phase: Math.random() * Math.PI * 2,
        color: ["#f472b6", "#a78bfa", "#34d399", "#fb7185"][
            Math.floor(Math.random() * 4)
        ]
    });
}

// Draw an enemy
function drawEnemy(enemy) {
    ctx.save();

    ctx.translate(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2
    );

    ctx.shadowBlur = 15;
    ctx.shadowColor = enemy.color;

    // Body
    ctx.fillStyle = enemy.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, enemy.width / 2, enemy.height / 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ffffff";

    ctx.beginPath();
    ctx.arc(-6, -2, 3, 0, Math.PI * 2);
    ctx.arc(6, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    // Antennas
    ctx.strokeStyle = enemy.color;
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(-12, -15);
    ctx.moveTo(7, -8);
    ctx.lineTo(12, -15);
    ctx.stroke();

    // Wings
    ctx.fillStyle = "#ef4444";

    ctx.beginPath();
    ctx.moveTo(-10, 1);
    ctx.lineTo(-enemy.width / 2, 10);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(10, 1);
    ctx.lineTo(enemy.width / 2, 10);
    ctx.lineTo(7, 8);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

// Draw asteroids
function drawAsteroid(asteroid) {
    ctx.save();

    ctx.translate(
        asteroid.x + asteroid.size / 2,
        asteroid.y + asteroid.size / 2
    );

    ctx.rotate(asteroid.rotation);

    ctx.fillStyle = "#78758f";
    ctx.strokeStyle = "#c4b5fd";
    ctx.lineWidth = 2;

    ctx.beginPath();

    for (let i = 0; i < 9; i++) {
        const angle = i * Math.PI * 2 / 9;
        const radius = asteroid.size * (
            0.38 + 0.12 * Math.sin(i * 4)
        );

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#44415a";

    ctx.beginPath();
    ctx.arc(-5, -4, 3, 0, Math.PI * 2);
    ctx.arc(6, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// Create power-ups
function spawnPowerUp() {
    const types = ["shield", "rapid", "life"];

    powerUps.push({
        x: 25 + Math.random() * (WIDTH - 50),
        y: -20,
        size: 24,
        speed: 85,
        type: types[Math.floor(Math.random() * types.length)]
    });
}

// Draw power-ups
function drawPowerUp(powerUp) {
    const colors = {
        shield: "#34d399",
        rapid: "#c084fc",
        life: "#facc15"
    };

    const symbols = {
        shield: "◆",
        rapid: "⚡",
        life: "★"
    };

    ctx.save();

    ctx.shadowBlur = 20;
    ctx.shadowColor = colors[powerUp.type];

    ctx.fillStyle = colors[powerUp.type];
    ctx.font = "bold 27px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(
        symbols[powerUp.type],
        powerUp.x,
        powerUp.y
    );

    ctx.restore();
}

// Particle effects
function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 140;

        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.5 + Math.random() * 0.4,
            maxLife: 0.9,
            color
        });
    }
}

function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];

        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.life -= dt;

        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.globalAlpha = 1;
}

// Collision detection
function collides(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function powerUpCollision(powerUp) {
    return (
        player.x < powerUp.x + powerUp.size / 2 &&
        player.x + player.width > powerUp.x - powerUp.size / 2 &&
        player.y < powerUp.y + powerUp.size / 2 &&
        player.y + player.height > powerUp.y - powerUp.size / 2
    );
}

// Player takes damage
function takeDamage() {
    if (player.invulnerable > 0) return;

    if (player.shield > 0) {
        player.shield = 0;
        createExplosion(
            player.x + player.width / 2,
            player.y + player.height / 2,
            "#34d399"
        );
        updateHUD();
        return;
    }

    lives--;

    player.invulnerable = 1.4;

    createExplosion(
        player.x + player.width / 2,
        player.y + player.height / 2,
        "#fb7185"
    );

    updateHUD();

    if (lives <= 0) {
        endGame();
    }
}

// Update game objects
function update(dt) {
    if (!running) return;

    // Gradually increase difficulty
    level = 1 + Math.floor(score / 150);

    player.cooldown = Math.max(0, player.cooldown - dt);
    player.shield = Math.max(0, player.shield - dt);
    player.rapidFire = Math.max(0, player.rapidFire - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    // Movement
    let dx = 0;
    let dy = 0;

    if (keys.ArrowLeft || keys.a) dx--;
    if (keys.ArrowRight || keys.d) dx++;
    if (keys.ArrowUp || keys.w) dy--;
    if (keys.ArrowDown || keys.s) dy++;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }

    player.x += dx * player.speed * dt;
    player.y += dy * player.speed * dt;

    player.x = Math.max(0, Math.min(WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(HEIGHT - player.height, player.y));

    if (keys.Space) {
        shoot();
    }

    // Spawn enemies
    enemyTimer += dt;

    if (enemyTimer >= Math.max(0.3, 0.9 - level * 0.04)) {
        enemyTimer = 0;
        spawnEnemy();
    }

    // Spawn asteroids
    asteroidTimer += dt;

    if (asteroidTimer >= 2.2) {
        asteroidTimer = 0;

        const size = 28 + Math.random() * 20;

        asteroids.push({
            x: Math.random() * (WIDTH - size),
            y: -size,
            size,
            speed: 90 + Math.random() * 70,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 2
        });
    }

    // Spawn power-ups
    powerUpTimer += dt;

    if (powerUpTimer >= 8) {
        powerUpTimer = 0;
        spawnPowerUp();
    }

    // Update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed * dt;

        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }

    // Update enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        enemy.y += enemy.speed * dt;
        enemy.x += Math.sin(performance.now() / 300 + enemy.phase) * 35 * dt;

        if (enemy.y > HEIGHT) {
            enemies.splice(i, 1);
            takeDamage();
            continue;
        }

        if (collides(player, enemy)) {
            enemies.splice(i, 1);
            createExplosion(enemy.x, enemy.y, enemy.color);
            takeDamage();
            continue;
        }
    }

    // Update asteroids
    for (let i = asteroids.length - 1; i >= 0; i--) {
        const asteroid = asteroids[i];

        asteroid.y += asteroid.speed * dt;
        asteroid.rotation += asteroid.rotationSpeed * dt;

        if (asteroid.y > HEIGHT) {
            asteroids.splice(i, 1);
            continue;
        }

        const asteroidBox = {
            x: asteroid.x,
            y: asteroid.y,
            width: asteroid.size,
            height: asteroid.size
        };

        if (collides(player, asteroidBox)) {
            asteroids.splice(i, 1);
            createExplosion(asteroid.x, asteroid.y, "#a78bfa");
            takeDamage();
        }
    }

    // Bullet and enemy collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
        let hit = false;

        for (let j = enemies.length - 1; j >= 0; j--) {
            if (collides(bullets[i], enemies[j])) {
                const enemy = enemies[j];

                enemy.hp--;

                createExplosion(
                    bullets[i].x,
                    bullets[i].y,
                    enemy.color
                );

                bullets.splice(i, 1);
                hit = true;

                if (enemy.hp <= 0) {
                    createExplosion(
                        enemy.x,
                        enemy.y,
                        enemy.color
                    );

                    enemies.splice(j, 1);
                    score += 10;
                }

                break;
            }
        }

        if (hit) continue;
    }

    // Update power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];

        powerUp.y += powerUp.speed * dt;

        if (powerUp.y > HEIGHT + 30) {
            powerUps.splice(i, 1);
            continue;
        }

        if (powerUpCollision(powerUp)) {
            if (powerUp.type === "shield") {
                player.shield = 6;
            }

            if (powerUp.type === "rapid") {
                player.rapidFire = 6;
            }

            if (powerUp.type === "life") {
                lives = Math.min(5, lives + 1);
            }

            score += 25;

            createExplosion(
                powerUp.x,
                powerUp.y,
                "#facc15"
            );

            powerUps.splice(i, 1);
        }
    }

    updateParticles(dt);
    updateHUD();
}

// Draw everything
function draw() {
    drawBackground(0);

    for (const bullet of bullets) {
        ctx.save();

        ctx.shadowBlur = 18;
        ctx.shadowColor = "#22d3ee";
        ctx.fillStyle = "#67e8f9";

        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );

        ctx.restore();
    }

    for (const enemy of enemies) {
        drawEnemy(enemy);
    }

    for (const asteroid of asteroids) {
        drawAsteroid(asteroid);
    }

    for (const powerUp of powerUps) {
        drawPowerUp(powerUp);
    }

    drawParticles();
    drawPlayer();
}

// End the game
function endGame() {
    running = false;
    gameOver = true;

    updateHUD();

    message.classList.remove("hidden");

    message.innerHTML = `
        <h2>MISSION FAILED 💥</h2>
        <p>Your final score: <strong>${score}</strong></p>
        <p>You reached level ${level}.</p>
        <button id="playAgainBtn">Try Again 🚀</button>
    `;

    document.getElementById("playAgainBtn").addEventListener(
        "click",
        startGame
    );
}

// Main game loop
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);

    lastTime = timestamp;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

// Keyboard controls
window.addEventListener("keydown", function (event) {
    const key = event.code === "Space"
        ? "Space"
        : event.key.length === 1
            ? event.key.toLowerCase()
            : event.key;

    if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]
            .includes(event.code === "Space" ? "Space" : event.key)
    ) {
        event.preventDefault();
    }

    keys[key] = true;
});

window.addEventListener("keyup", function (event) {
    const key = event.code === "Space"
        ? "Space"
        : event.key.length === 1
            ? event.key.toLowerCase()
            : event.key;

    keys[key] = false;
});

window.addEventListener("blur", function () {
    for (const key in keys) {
        keys[key] = false;
    }
});

// Buttons
startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);
playBtn.addEventListener("click", startGame);

// Mobile controls
function bindHoldButton(id, key) {
    const button = document.getElementById(id);

    button.addEventListener("pointerdown", function (event) {
        event.preventDefault();
        keys[key] = true;

        try {
            button.setPointerCapture(event.pointerId);
        } catch {}
    });

    function release() {
        keys[key] = false;
    }

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", event => event.preventDefault());
}

bindHoldButton("leftBtn", "ArrowLeft");
bindHoldButton("rightBtn", "ArrowRight");
bindHoldButton("upBtn", "ArrowUp");
bindHoldButton("downBtn", "ArrowDown");
bindHoldButton("fireBtn", "Space");

// Initialize and start the animation loop
resetGame();
message.classList.remove("hidden");

requestAnimationFrame(function (timestamp) {
    lastTime = timestamp;
    gameLoop(timestamp);
});