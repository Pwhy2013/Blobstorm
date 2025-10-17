let boss;
let shopPanels = []; // store clickable panel info
let dashSpeed = 25;
let bossActive = false;
let fadeAlpha = 175; // fully opaque at start
let isStarting = false; 
let player;
let bullets = [];
let enemies = [];
let bulletSpeed = 5;
let enemySpeed = 1;
let score = 0;
let enemyBullets = [];
let spawnInterval = 120;
let isPaused = false;
let aoeExplosions = [];
let droneChoicePending = false;
let Dronelimit = 30;
let startGame = false; 
let particles = [];
let shopOpen = false;
let isReloading = false;
let reloadTime = 2000;  // 2 seconds to reload
let reloadStart = 0;
let dronesOwned=0;
let upgradeOptions = [
  { name: "Increase Max Health", cost: 50, action: () => {
    if (player.maxHealth<2000){
        player.maxHealth += 25;}
    else {
      return;
    }
  }},
  { name: "Increase Damage", cost: 50, action: () => { 
    if (player.bulletDamage<25) {
      player.bulletDamage += 1; }
  else {
    player.bulletDamage = 25;}
  }},
  { name: "Faster Fire Rate", cost: 50, action: () => { player.fireRate = max(10, player.fireRate - 10); } },
  { name: "Increase Speed", cost: 50, action: () => {
    if (player.speed<20){
      player.speed += 1; } 
    else {
      return;
    }
  }
  },
  { name: "Heal", cost: 100, action: () => { player.health = player.maxHealth; } },
  { name: "Increase Magazine Size",cost: 50,action: () => {
  if (!player.magazineSize) player.magazineSize = 30;
  if (player.magazineSize < 300) {  
  player.magazineSize += 5;
  player.ammo = player.magazineSize;
  }}},
  {name: "Buy Drone",
    cost: 100,
    action: () => {
      if (dronesOwned < Dronelimit) {
        droneChoicePending = true;
        dronesOwned += 1;
      } else {
        console.log("Drone limit reached!");
 }}},
];

function setup() {
  createCanvas(windowWidth, windowHeight);
  player = new Player();
  startGame = false;
  textFont('Helvetica');
}

function draw() {
  background(175);

  // --- Start Screen ---
if (!startGame) {
  drawTitleScreen();

  // Press SPACE to trigger fade-out
  if (keyIsDown(32)) {
    isStarting = true;
  }

  // Smooth easing fade
  if (isStarting) {
    fadeAlpha = lerp(fadeAlpha, 0, 0.08); // easing speed (0.05–0.1 works well)
    fill(0, fadeAlpha);
    noStroke();
    rect(0, 0, width, height);

    // Once nearly transparent, switch to game
    if (fadeAlpha < 2) {
      fadeAlpha = 0;
      startGame = true;
      isStarting = false;
    }
  }

  return;
}


  // --- Game Over ---
  if (player.health <= 0) {
    drawGameOverScreen();
    return;
  }

  // --- Drone Choice (pause updates but keep drawing) ---
if (droneChoicePending) {
  // Dark overlay
  fill(0, 180);
  rect(0, 0, width, height);

  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  text("Choose Your Drone", width / 2, height / 2 - 180);

  // Drone cards
  let cardWidth = 200;
  let cardHeight = 120;
  let spacing = 50;
  let startX = width / 2 - cardWidth - spacing;
  let startY = height / 2 - cardHeight / 2;

  let drones = [
    { name: "Ace Drone", desc: "Fast shooter", color: color(0, 200, 255) },
    { name: "Laser Drone", desc: "Beam attack", color: color(0, 255, 0) },
    { name: "AOE Drone", desc: "Explodes on contact", color: color(255, 0, 255)}
  ];

  for (let i = 0; i < drones.length; i++) {
    let d = drones[i];
    let x = startX + i * (cardWidth + spacing);
    fill(d.color.levels[0], d.color.levels[1], d.color.levels[2], 180);
    rect(x, startY, cardWidth, cardHeight, 12);

    fill(255);
    textSize(20);
    text(d.name, x + cardWidth / 2, startY + 30);
    textSize(16);
    text(d.desc, x + cardWidth / 2, startY + 65);
  }

  return; // stop game updates while choosing
}


  // --- Pause ---
  if (isPaused) {
    fill(0);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("PAUSED", width / 2, height / 2);
    return;
  }

  // --- Shop Open ---
  if (shopOpen) {
    drawShop();
    return;
  }

if (isReloading) {
  if (millis() - reloadStart >= reloadTime) {
   player.ammo = player.magazineSize;
    isReloading = false;
  }
}

  // --- Game Logic ---
  player.update();
  player.display();

  // Enemy Bullets
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    let enemyBullet = enemyBullets[i];
    enemyBullet.update();
    enemyBullet.display();

    if (enemyBullet.checkCollision(player)) {
      player.takeDamage(enemyBullet.damage);
      enemyBullets.splice(i, 1);
      continue;
    }

    if (enemyBullet.offscreen()) {
      enemyBullets.splice(i, 1);
    }
  }
  
score = max(0, score);
player.position.add(player.velocity);

// Add friction so the dash slows down
player.velocity.mult(0.9);

  drawAmmoBar();
  // Enemies
for (let i = enemies.length - 1; i >= 0; i--) {
  let enemy = enemies[i];
  enemy.update();
  enemy.display();

  if (enemy.markedForRemoval) continue;
  if (
    dist(player.position.x, player.position.y, enemy.position.x, enemy.position.y) <
    player.size / 2 + enemy.size / 2
  ) {
    // use enemy-specific damage (default to 10 if not defined)
    let dmg = enemy.damage ? enemy.damage : 10;
    player.takeDamage(dmg);
    enemy.markedForRemoval = true;
  }
}
  
  checkBossSpawn();
  // Health bar & Info Panel
  displayHealthBar();
  displayLevelInfo();
  displayReloadBar();
  // AOE Explosions
  for (let i = aoeExplosions.length - 1; i >= 0; i--) {
    aoeExplosions[i].update();
    aoeExplosions[i].display();
    if (aoeExplosions[i].isExpired()) {
      aoeExplosions.splice(i, 1);
    }
  }

  // Bullets -> update, draw, collision
  for (let i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.update();
    bullet.display();

    // check enemies (skip already-removed)
    for (let j = 0; j < enemies.length; j++) {
      let enemy = enemies[j];
      if (!enemy || enemy.markedForRemoval) continue;
      if (bullet.checkCollision(enemy)) {
  bullet.toRemove = true;
  enemy.takeDamage(bullet.damage);
  spawnParticles(bullet.position.x, bullet.position.y, 5);

        break;
      }
    }
    if (bullet.offscreen()) bullet.toRemove = true;
    if (bullet.toRemove) bullets.splice(i, 1);
  }

  // remove any dead enemies after bullets processed
  enemies = enemies.filter(e => !e.markedForRemoval);

  // --- PARTICLE SYSTEM (single loop) ---
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }

  // spawn enemies (difficulty scaling inside)
  spawnEnemies();
  
if (bossActive) {
  boss.display();
  boss.update(); 
   boss.checkPlayerCollision(player);
  // Check collisions with player bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    let b = bullets[i];
    let bPos = b.position;
if (bPos.x > boss.position.x && bPos.x < boss.position.x + boss.width &&
    bPos.y > boss.position.y && bPos.y < boss.position.y + boss.height) {
  boss.takeDamage(b.damage);
  bullets.splice(i, 1);
}
      if (boss.health <= 0) {
        bossActive = false;
        score += 5000;
      }
    }
  
}


}
function checkBossSpawn() {
  if (!bossActive && player.level % 10 === 0 && player.bossSpawned === false) { // example threshold
    bossActive = true;
    boss = new Boss(width / 2, 50);
    player.bossSpawned = true;
  }
}


function spawnEnemies() {
  if (frameCount % spawnInterval === 0) {
    let x, y;
    if (random() < 0.5) {
      x = random(width);
      y = random() < 0.5 ? 0 : height;
    } else {
      x = random() < 0.5 ? 0 : width;
      y = random(height);
    }

    // weighted random enemy selection
    let r = random();
    if (r < 0.35) {
      enemies.push(new NormalEnemy(x, y, enemySpeed));
    } else if (r < 0.55) {
      enemies.push(new FastEnemy(x, y, enemySpeed * 1.5));
    } else if (r < 0.75) {
      enemies.push(new ZigZagEnemy(x, y, enemySpeed * 1.2));
    } else if (r < 0.9) {
      enemies.push(new ShootingEnemy(x, y, enemySpeed));
    } else {
      enemies.push(new TankEnemy(x, y, enemySpeed * 0.6));
    }
  }

  // difficulty scaling
  if (frameCount % (spawnInterval * 20) === 0 && spawnInterval > 30) {
    spawnInterval -= 5;
  }
 
}


function displayLevelInfo() {
  let panelX = 20, panelY = 20, panelW = 170, panelH = 120;
  fill(0, 140);
  rect(panelX + 4, panelY + 4, panelW, panelH + 15, 18);
  fill(30, 195);
  rect(panelX, panelY, panelW, panelH + 15, 16);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(17);
  textStyle(BOLD);
  text("PLAYER", panelX + 16, panelY + 10);

  textStyle(NORMAL);
  textSize(15);
  let y = panelY + 35, dy = 20;
  text("🧬 Level:     " + player.level, panelX + 16, y); y += dy;
  text("⭐ XP:        " + player.xp, panelX + 16, y); y += dy;
  text("💵 Money:     " + score, panelX + 16, y); y += dy;
  text("🩸 Health:    " + player.health + "/" + player.maxHealth, panelX + 16, y);
}
function displayReloadBar() {
  if (!isReloading) return;
  let barWidth = 200;
  let barHeight = 10;
  let x = 20;
  let y = height - barHeight - 75;
  let progress = (millis() - reloadStart) / reloadTime;
  progress = constrain(progress, 0, 1);
  
  noStroke();
  fill(0, 60);
  rect(x, y, barWidth, barHeight, 8);
  fill(50, 150, 250);
  rect(x, y, barWidth * progress, barHeight, 8);
  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("Reloading...", x + 5, y + barHeight / 2);
}

class Player {
  constructor() {
    this.position = createVector(width / 2, height / 2);
    this.isInvincible = false;
    this.invincibilityTimer = 0;

    this.dashCooldown = 1000; // milliseconds
    this.lastDashTime = -Infinity;
    this.size = 20;
    this.speed = 5;
    this.maxHealth = 100;
    this.health = 100;
    this.xp = 0;
    this.level = 1;
    this.bulletSpeed = bulletSpeed;
    this.bulletDamage = 1;
    this.fireRate = 200;
    this.lastShotTime = 0;
    this.multiShotActive = false;
    this.armorLevel = 0;
    this.hasDrone = false;
    this.drones = [];
    this.velocity = createVector(0, 0);
    this.didShoot = false;
    this.magazineSize = 30;
    this.ammo = 30;
    this.bossSpawned = false;
  }
  takeDamage(amount) {
    let reduced = amount;
    if (this.armorLevel === 1) reduced *= 0.8;
    else if (this.armorLevel === 2) reduced *= 0.6;
    else if (this.armorLevel === 3) reduced *= 0.4;
    this.health -= reduced;
    this.health = max(0, this.health);
  }
  update() {
    let move = createVector(0, 0);
    if (keyIsDown(87)) move.y -= 1;
    if (keyIsDown(83)) move.y += 1;
    if (keyIsDown(65)) move.x -= 1;
    if (keyIsDown(68)) move.x += 1;
    if (move.mag() > 0) move.normalize().mult(this.speed);
    this.position.add(move);
    this.aim();
    for (let i = this.drones.length - 1; i >= 0; i--) {
      // update drones, but skip removed-targets etc.
      let d = this.drones[i];
      if (d) d.update();
    }
     this.position.add(this.velocity);
    this.velocity.mult(0.9); // friction

    // Handle invincibility timer
    if (this.isInvincible) {
      this.invincibilityTimer -= deltaTime;
      if (this.invincibilityTimer <= 0) this.isInvincible = false;
    }
    this.constrain();
    if (millis() - this.lastShotTime > this.fireRate && (mouseIsPressed || keyIsDown(32))) {
      this.shoot();
      this.lastShotTime = millis();
    }
  }
  display() {
    const angle = atan2(mouseY - this.position.y, mouseX - this.position.x);
    const shooting = mouseIsPressed || keyIsDown(32);
    const armored = this.level >= 3;
    for (let drone of this.drones) if (drone) drone.display();
    let helmetStyle = "basic";
    if (this.level >= 5) helmetStyle = "military";
    if (this.level >= 10) helmetStyle = "riot";
    drawPlayerCharacter(this.position.x, this.position.y, angle, shooting, armored, helmetStyle);
  }
  aim() {
    let mousePos = createVector(mouseX, mouseY);
    let angle = atan2(mousePos.y - this.position.y, mousePos.x - this.position.x);
    push();
    translate(this.position.x, this.position.y);
    rotate(angle);
    fill(0, 200, 100);
    rect(0, -5, this.size, 10);
    pop();
  }
  shoot() {
  if (isReloading || this.ammo <= 0) {
    this.didShoot = false;
    return;
  }

  this.ammo--; // consume one bullet
  triggerFlash();

  let angle = atan2(mouseY - this.position.y, mouseX - this.position.x);
  let gunForwardOffset = 16;
  let gunLength = 24;
  let tipX = this.position.x + (gunForwardOffset + gunLength) * cos(angle);
  let tipY = this.position.y + (gunForwardOffset + gunLength) * sin(angle);

  if (this.multiShotActive) {
    for (let i = -1; i <= 1; i++) {
      let angleOffset = radians(15 * i);
      bullets.push(new Bullet(tipX, tipY, mouseX, mouseY, this.bulletSpeed, this.bulletDamage, angleOffset));
    }
  } else {
    bullets.push(new Bullet(tipX, tipY, mouseX, mouseY, this.bulletSpeed, this.bulletDamage));
  }

  this.didShoot = true;

  // Handle reload
  if (this.ammo <= 0) {
    isReloading = true;
    reloadStart = millis();
  }
}

  activateMultiShot() {
    this.multiShotActive = true;
  }
  constrain() {
    this.position.x = constrain(this.position.x, this.size / 2, width - this.size / 2);
    this.position.y = constrain(this.position.y, this.size / 2, height - this.size / 2);
  }
  increaseXP(amount) {
    this.xp += amount;
    this.checkLevelUp();
  }
  checkLevelUp() {
  let xpNeeded = this.level * 100;
  while (this.xp >= xpNeeded) {
    this.level++;
    this.xp -= xpNeeded;  // ✅ keep leftover XP
    this.upgradeWeapon();
    xpNeeded = this.level * 100; // ✅ recalc for next level
    this.bossSpawned = false;
  }
}

  
  upgradeWeapon() {

    if (this.level === 4) {
      this.bulletSpeed=7;
    } else if (this.level === 6) {
      this.multiShotActive = true;
      this.armorLevel = 1;
    } 
    else if (this.level === 10) {
      this.armorLevel = 2;
       this.bulletSpeed=10;
    } else if (this.level === 15) {
      this.armorLevel = 3;
    }
  
  }}
// --- Particle class ---
class Particle {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 4));
    this.lifespan = 60; // frames
    this.size = random(3, 7);
    this.col = color(random(150, 255), random(50, 200), random(50, 200));
  }

  update() {
    this.pos.add(this.vel);
    this.vel.mult(0.95);
    this.lifespan--;
  }

  display() {
    noStroke();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan * 4);
    ellipse(this.pos.x, this.pos.y, this.size);
  }

  isDead() {
    return this.lifespan <= 0;
  }
}

// --- helper to spawn multiple particles ---
function spawnParticles(x, y, count = 10) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x + random(-6,6), y + random(-6,6)));
  }
}


class Bullet {
  constructor(x, y, targetX, targetY, speed, damage, angleOffset = 0) {
    this.position = createVector(x, y);
    this.velocity = createVector(targetX - x, targetY - y);
    this.velocity.normalize().mult(speed);
    this.velocity.rotate(angleOffset);
    this.size = 10;
    this.damage = damage;
    this.toRemove = false;

    this.trail = []; // store past positions for trail
    this.maxTrailLength = 8; // adjust for longer/shorter trail
  }

  update() {
    // add current position to trail
    this.trail.push(this.position.copy());
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift(); // remove oldest point
    }

    this.position.add(this.velocity);
  }

  display() {
    // draw trail
    noFill();
    stroke(200, 100);
    strokeWeight(this.size / 2);
    beginShape();
    for (let v of this.trail) {
      vertex(v.x, v.y);
    }
    endShape();

    // draw bullet
    noStroke();
    fill(255, 0, 0);
    ellipse(this.position.x, this.position.y, this.size);
  }

  offscreen() {
    return (
      this.position.x < -10 ||
      this.position.x > width + 10 ||
      this.position.y < -10 ||
      this.position.y > height + 10
    );
  }

 checkCollision(enemy) {
    if (!enemy) return false;
    let d = dist(this.position.x, this.position.y, enemy.position.x, enemy.position.y);
    return d < this.size / 2 + enemy.size / 2;
  }

}

// ---------------- BASE ENEMY ----------------
class Enemy {
  constructor(x, y, speed) {
    this.position = createVector(x, y);
    this.speed = speed;
    this.size = 30;
    this.health = 1;
    this.velocity = createVector();
    this.markedForRemoval = false;
    // ✅ Default rewards
    this.xpValue = 10;
    this.moneyValue = 10;
  
  }

  update() {
    if (!player) return;
    let angle = atan2(player.position.y - this.position.y, player.position.x - this.position.x);
    this.velocity = createVector(cos(angle), sin(angle)).mult(this.speed);
    this.position.add(this.velocity);
  }

  display() {
    fill(200, 0, 0);
    ellipse(this.position.x, this.position.y, this.size);
  }

  takeDamage(amount) {
  if (this.markedForRemoval) return false;
  this.health -= amount;
  if (this.health <= 0) {
    if (player) player.increaseXP(this.xpValue * (1 + player.level * 0.1));
    score += this.moneyValue * (1 + player.level * 0.1);
    spawnParticles(this.position.x, this.position.y, 20);
    this.markedForRemoval = true;
    return true;
  }
  return false;
}

}
class Boss extends Enemy{
  constructor(x, y, w = 150, h = 80,  health = 50 * (player.level ** 1.5) , damage = 200, speed = 1) {
    super(x, y, speed);
    this.width = w;
    this.height = h;
    this.maxHealth = health;
    this.health = health;
    this.damage = damage;
    this.speed = speed;  // ✅ Fix added
    this.velocity = createVector(0, 0);
  }

  display() {
    fill(255, 0, 0);
    rect(this.position.x, this.position.y, this.width, this.height, 8);
    
    // Health bar
    fill(0);
    rect(this.position.x, this.position.y - 12, this.width, 6);
    fill(0, 255, 0);
    let healthWidth = map(this.health, 0, this.maxHealth, 0, this.width);
    rect(this.position.x, this.position.y - 12, healthWidth, 6);
  }

  update() {
    if (!player) return;
    let angle = atan2(player.position.y - this.position.y, player.position.x - this.position.x);
    this.velocity = createVector(cos(angle), sin(angle)).mult(this.speed);
    this.position.add(this.velocity);
  }

  checkPlayerCollision(player) {
    if (
      player.position.x + player.size / 2 > this.position.x &&
      player.position.x - player.size / 2 < this.position.x + this.width &&
      player.position.y + player.size / 2 > this.position.y &&
      player.position.y - player.size / 2 < this.position.y + this.height
    ) {
      player.takeDamage(this.damage);
    }
  }

  checkBulletCollision(bullet) {
    let b = bullet.position;
    if (
      b.x > this.position.x && b.x < this.position.x + this.width &&
      b.y > this.position.y && b.y < this.position.y + this.height
    ) {
      this.takeDamage(bullet.damage);
      return true; // bullet hit
    }
    return false; // no hit
  }

  takeDamage(amount) {
    this.health -= amount;
    spawnParticles(this.position.x + this.width/2, this.position.y + this.height/2, 30);
    if (this.health <= 0) {
      this.health = 0;
      bossActive = false; // boss defeated
      score += 5000;
      player.increaseXP(5000);
      spawnParticles(this.position.x + this.width/2, this.position.y + this.height/2, 300);
    }
  }

  isDead() {
    return this.health <= 0;
  }
}


// ---------------- NORMAL ENEMY ----------------
class NormalEnemy extends Enemy {
  constructor(x, y, speed) {
    super(x, y, speed);
    this.size = 35;
    this.health = this.health = 5 * (player.level ** 1.5);
    this.damage = this.health;
    this.xpValue = 10;
    this.moneyValue = 15;
  }

  display() {
    push();
    translate(this.position.x, this.position.y);

    fill(180, 80, 80);
    stroke(100, 30, 30);
    strokeWeight(2);
    ellipse(0, 0, this.size);

    // Eyes
    fill(255);
    noStroke();
    ellipse(-7, -3, 10, 10);
    ellipse(7, -3, 10, 10);

    fill(0);
    ellipse(-7, -3, 5, 5);
    ellipse(7, -3, 5, 5);
    pop();
  }
}

// ---------------- FAST ENEMY ----------------
class FastEnemy extends Enemy {
  constructor(x, y, speed) {
    super(x, y, speed * 2);
    this.size = 30;
    this.health = 3 * (player.level ** 1.5);
    this.rotation = random(TWO_PI);
    this.xpValue = 15;
    this.moneyValue = 5;
    this.damage = this.health;
  }

  display() {
    push();
    translate(this.position.x, this.position.y);
    rotate(this.rotation + frameCount * 0.15);

    fill(255, 220, 120);
    stroke(255, 180, 60);
    strokeWeight(2);
    beginShape();
    for (let a = 0; a < TWO_PI; a += PI / 6) {
      let r = (a % (PI / 3) === 0) ? this.size : this.size / 2;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    pop();
  }
}

// ---------------- ZIGZAG ENEMY ----------------
class ZigZagEnemy extends Enemy {
  constructor(x, y, speed) {
    super(x, y, speed);
    this.size = 32;
    this.health = 4 * (player.level ** 1.5);
    this.angleOffset = random(TWO_PI);
    this.zigSpeed = 0.04;
    this.damage = this.health;
    this.xpValue = 20;
    this.moneyValue = 20;
  }
  update() {
    if (!player) return;
    // move toward player with a perpendicular oscillation
    let angleToPlayer = atan2(player.position.y - this.position.y, player.position.x - this.position.x);
    let perp = angleToPlayer + HALF_PI;
    let zig = sin(frameCount * this.zigSpeed + this.angleOffset) * 2;
    let vx = cos(angleToPlayer) * this.speed + cos(perp) * zig;
    let vy = sin(angleToPlayer) * this.speed + sin(perp) * zig;
    this.position.x += vx;
    this.position.y += vy;
  }
  display() {
    push();
    translate(this.position.x, this.position.y);
    fill(220, 120, 180);
    stroke(140, 50, 100);
    ellipse(0, 0, this.size);
    pop();
  }
}

// ---------------- TANK ENEMY ----------------
class TankEnemy extends Enemy {
  constructor(x, y, speed) {
    super(x, y, speed * 0.5);
    this.size = 50;
    this.health = 10 * (player.level ** 1.5);
    this.damage = this.health/2;  
      this.xpValue = 200;
    this.moneyValue = 150;
  }
 
  display() {
    push();
    rectMode(CENTER);
    translate(this.position.x, this.position.y);

    fill(80, 80, 130);
    stroke(40, 40, 80);
    strokeWeight(4);
    rect(0, 0, this.size, this.size, 8);

    noStroke();
    fill(200, 50, 50, 180);
    ellipse(0, 0, this.size * 0.4);

    stroke(255, 80);
    strokeWeight(2);
    line(-this.size/2, 0, this.size/2, 0);
    line(0, -this.size/2, 0, this.size/2);
    pop();
  }
}


class ShootingEnemy extends Enemy {
  constructor(x, y, speed) {
    super(x, y, speed);
    this.size = 40;
    this.health = 8 * (player.level ** 1.5);
    this.damage = this.health;
    this.orbitRadius = random(80, 120);
    this.orbitAngle = 0;
    this.orbitSpeed = 0.02; // slower orbit
    this.orbitDuration = 60; // frames to orbit
    this.orbitTimer = 0;

    this.state = "approach"; // 'approach', 'orbit'
  }

  update() {
    if (!player) return;

    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const distance = dist(this.position.x, this.position.y, player.position.x, player.position.y);

    if (this.state === "approach") {
      // Move toward player
      const moveSpeed = 1.5; // slower approach
      this.position.x += (dx / distance) * moveSpeed;
      this.position.y += (dy / distance) * moveSpeed;

      // Start orbit briefly if close enough
      if (distance < this.orbitRadius + 20) {
        this.state = "orbit";
        this.orbitAngle = atan2(this.position.y - player.position.y, this.position.x - player.position.x);
        this.orbitTimer = this.orbitDuration;
      }
    } 
    else if (this.state === "orbit") {
      // Smooth sliding orbit
      let targetX = player.position.x + this.orbitRadius * cos(this.orbitAngle);
      let targetY = player.position.y + this.orbitRadius * sin(this.orbitAngle);

      // Move towards orbit position smoothly
      const slideFactor = 0.05; // smaller = slower, smoother
      this.position.x += (targetX - this.position.x) * slideFactor;
      this.position.y += (targetY - this.position.y) * slideFactor;

      // Advance orbit angle
      this.orbitAngle += this.orbitSpeed;

      this.orbitTimer--;

      // Stop orbiting if timer ends or player moves significantly
      if (this.orbitTimer <= 0 || (abs(player.velocity.x) > 0.3 || abs(player.velocity.y) > 0.3)) {
        this.state = "approach";
        this.orbitRadius = random(80, 120); // randomize next orbit distance
      }
    }

    // Shooting at player
    if (frameCount % 90 === 0) {
      enemyBullets.push(new EnemyBullet(
        this.position.x, this.position.y,
        player.position.x, player.position.y,
        4, 5
      ));
    }
  }

  display() {
    push();
    translate(this.position.x, this.position.y);

    // --- Main body ---
    fill(80, 140, 230);
    stroke(40, 90, 180);
    strokeWeight(2.5);
    ellipse(0, 0, this.size);

    // --- Cannon barrel ---
    let angle = atan2(player.position.y - this.position.y, player.position.x - this.position.x);
    push();
    rotate(angle);
    fill(60, 100, 200);
    rectMode(CENTER);
    rect(this.size * 0.35, 0, this.size * 0.7, this.size * 0.25, 4);
    pop();

    // --- Eye / core ---
    noStroke();
    fill(255, 255, 255, 220);
    ellipse(0, 0, this.size * 0.4);

    fill(255, 50, 50, 200);
    ellipse(0, 0, this.size * 0.25);

    // --- Charging effect ---
    if (this.isCharging) {
      let t = frameCount - this.chargeStart;
      let pulse = this.size * (0.9 + 0.15 * sin(t * 0.3));
      noFill();
      stroke(255, 80, 80, map(sin(t * 0.3), -1, 1, 50, 180));
      strokeWeight(3);
      ellipse(0, 0, pulse + 15);

      // glowing aura
      fill(255, 80, 80, 80);
      ellipse(0, 0, pulse + 25);
    }

    pop();
  }
}


function resetGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  score = 0;
  enemyBullets = [];
  aoeExplosions = [];
  spawnInterval = 120;
  particles = [];
  shopOpen = false;
  isPaused = false;
  droneChoicePending = false;
  Dronelimit = 30;
  startGame = false; 
  boss = null;
  player.size = 20;
  player.speed = 5;
  player.maxHealth = 100;
  player.health = 100;
  player.xp = 0;
  player.level = 1;
  player.bulletSpeed = bulletSpeed;
  player.bulletDamage = 1;
  player.fireRate = 200;
  player.multiShotActive = false;
  player.armorLevel = 0;
  player.hasDrone = false;
  player.drones = [];
  player.magazineSize = 30;
  player.ammo = 30;
  player.bossSpawned = false;
  }


class EnemyBullet {
  constructor(x, y, targetX, targetY, speed, damage) {
    this.position = createVector(x, y);
    this.velocity = createVector(targetX - x, targetY - y);
    this.velocity.normalize().mult(speed);
    this.size = 10;
    this.damage = damage;
  }
  update() {
    this.position.add(this.velocity);
  }
  display() {
    fill(255, 165, 0);
    noStroke();
    ellipse(this.position.x, this.position.y, this.size);
  }
  offscreen() {
    return (
      this.position.x < -10 ||
      this.position.x > width + 10 ||
      this.position.y < -10 ||
      this.position.y > height + 10
    );
  }
  checkCollision(player) {
    let d = dist(this.position.x, this.position.y, player.position.x, player.position.y);
    return d < this.size / 2 + player.size / 2;
  }
}

function drawAmmoBar() {
  let barWidth = 200;
  let barHeight = 12;
  let x = 20;
  let y = height - 70; // higher up so health goes below it

  noStroke();
  fill(0, 60);
  rect(x, y, barWidth, barHeight, 8);

  let ammoPercent = player.ammo / player.magazineSize;
  fill(255, 200, 50);
  rect(x, y, barWidth * ammoPercent, barHeight, 8);

  fill(255);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("Ammo: " + player.ammo + " / " + player.magazineSize, x + 5 , y + barHeight / 2);
}
function displayHealthBar() {
  let barWidth = 220;
  let barHeight = 22;
  let x = 20, y = height - barHeight - 30;
  let healthPercentage = constrain(player.health / player.maxHealth, 0, 1);
  noStroke();
  fill(0, 60);
  rect(x + 3, y + 3, barWidth, barHeight, 12);
  fill(60);
  rect(x, y, barWidth, barHeight, 10);
  let c1 = color(60, 220, 58);
  let c2 = color(255, 220, 40);
  let c3 = color(235, 50, 50);
  let healthColor = lerpColor(c1, c2, map(healthPercentage, 1, 0.5, 0, 1));
  if (healthPercentage < 0.5) {
    healthColor = lerpColor(c2, c3, map(healthPercentage, 0.5, 0, 0, 1));
  }
  fill(healthColor);
  rect(x, y, barWidth * healthPercentage, barHeight, 10);
  noFill();
  stroke(0, 180);
  strokeWeight(2);
  rect(x, y, barWidth, barHeight, 10);
  noStroke();
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(`Health: ${Math.round(player.health)} / ${player.maxHealth}`, x + barWidth / 2, y + barHeight / 2);
}


// --- Drones ---

class Drone {
  constructor(player, angleOffset = 0) {
    this.player = player;
    this.orbitRadius = 50;
    this.angle = angleOffset;
    this.angleOffset = angleOffset;
    this.size = 15;
    this.fireRate = 500; // ms
    this.lastShotTime = 0;
    this.bulletSpeed = 4;
    this.bulletDamage = 1;
    this.position = createVector(player.position.x, player.position.y);
    this.isAOE = false;
  }
  update() {
    let target = this.getClosestTarget();
    // make rotation frame-rate independent
    let fpsScale = (typeof deltaTime !== 'undefined' && deltaTime > 0) ? (deltaTime / 16.67) : 1;
    this.angle += 0.03 * fpsScale;
    this.position = createVector(
      this.player.position.x + this.orbitRadius * cos(this.angle),
      this.player.position.y + this.orbitRadius * sin(this.angle)
    );

    if (!target) return;

    if (millis() - this.lastShotTime > this.fireRate && enemies.length > 0) {
      if (this.isAOE) {
        let d = dist(this.position.x, this.position.y, target.position.x, target.position.y);
        if (d < 30) {
          aoeExplosions.push(new AOEExplosion(this.position.x, this.position.y, 60, 3));
          this.lastShotTime = millis();
        }
      } else {
        let bullet = new Bullet(
          this.position.x,
          this.position.y,
          target.position.x,
          target.position.y,
          this.bulletSpeed,
          this.bulletDamage
        );
        bullets.push(bullet);
        this.lastShotTime = millis();
      }
    }
  }
  display() {
    push();
    noStroke();
    fill(0, 200, 255, 80);
    ellipse(this.position.x, this.position.y, this.size + 10);
    fill(0, 200, 255);
    ellipse(this.position.x, this.position.y, this.size);
    pop();
  }
  getClosestTarget() {
  let closest = null;
  let minDist = Infinity;

  // 🔹 Check all enemies first
  for (let enemy of enemies) {
    if (!enemy || enemy.markedForRemoval) continue;
    let d = dist(this.position.x, this.position.y, enemy.position.x, enemy.position.y);
    if (d < minDist) {
      closest = enemy;
      minDist = d;
    }
  }


  return closest;
}
}
function addDrone(newDrone) {
  if (!player) return;
  if (player.drones.length >= Dronelimit) {
    player.drones.shift();
  }
  player.drones.push(newDrone);
  droneChoicePending = false;
}

class AceDrone extends Drone {
  constructor(player, angleOffset = 0) {
    super(player, angleOffset);
    this.fireRate = 90;
    this.bulletSpeed = 10;
    this.bulletDamage = 0.25;
  }
}

class LaserDrone extends Drone {
  constructor(player, angleOffset = 0) {
    super(player, angleOffset);
    this.beamLength = 2000000;
    this.damagePerSecond = 3;
  }
  update() {
    // frame-rate independent rotation
    let fpsScale = (typeof deltaTime !== 'undefined' && deltaTime > 0) ? (deltaTime / 16.67) : 1;
    this.angle += 0.03 * fpsScale;
    this.position = createVector(
      this.player.position.x + this.orbitRadius * cos(this.angle),
      this.player.position.y + this.orbitRadius * sin(this.angle)
    );
    let target = this.getClosestTarget();
    if (target) {
      // damage scaled by deltaTime (seconds)
      let damageThisFrame = this.damagePerSecond * (deltaTime / 1000);
      target.takeDamage(damageThisFrame);
    }
  }
  display() {
    fill(0, 255, 0);
    ellipse(this.position.x, this.position.y, this.size);
    let target = this.getClosestTarget();
    if (target) {
      stroke(0, 255, 0);
      strokeWeight(2);
      line(this.position.x, this.position.y, target.position.x, target.position.y);
      noStroke();
      fill(144, 238, 144,120);
      ellipse(this.position.x, this.position.y, this.size + 10);
    }
  }
}

class AOEDrone extends Drone {
  constructor(player, angleOffset = 0) {
    super(player, angleOffset);
    this.fireRate = 1000;
    this.isAOE = true;
    this.radius = 60;
    this.damage = 15;
    this.lastShotTime = 0;
  }
  update() {
    let fpsScale = (typeof deltaTime !== 'undefined' && deltaTime > 0) ? (deltaTime / 16.67) : 1;
    this.angle += 0.03 * fpsScale;
    this.position = createVector(
      this.player.position.x + this.orbitRadius * cos(this.angle),
      this.player.position.y + this.orbitRadius * sin(this.angle)
    );
    if (millis() - this.lastShotTime > this.fireRate) {
      // check if any enemy is within trigger radius
      for (let enemy of enemies) {
        if (!enemy || enemy.markedForRemoval) continue;
        if (dist(this.position.x, this.position.y, enemy.position.x, enemy.position.y) < 20) {
          aoeExplosions.push(new AOEExplosion(this.position.x, this.position.y, this.radius, this.damage));
          this.lastShotTime = millis();
          break;
        }
      }
    }
  }
  display() {
    fill(255, 0, 255);
    ellipse(this.position.x, this.position.y, this.size);
  }
}

class AOEExplosion {
  constructor(x, y, radius, damage) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.damage = damage;
    this.createdAt = millis();
    this.duration = 300;
    this.hasDamaged = false;
  }
  
  update() {
    if (!this.hasDamaged) {
      // damage all valid enemies inside radius once
      for (let enemy of enemies) {
        if (!enemy || enemy.markedForRemoval) continue;
        let d = dist(this.x, this.y, enemy.position.x, enemy.position.y);
        if (d < this.radius) {
          enemy.takeDamage(this.damage);
        }
      }
      // spawn visible particles for the explosion
      spawnParticles(this.x, this.y, 20);
      this.hasDamaged = true;
    }
  }
  
  display() {
    let elapsed = millis() - this.createdAt;
    let alpha = map(elapsed, 0, this.duration, 150, 0);
    noFill();
    stroke(255, 150, 0, alpha);
    strokeWeight(3);
    ellipse(this.x, this.y, this.radius * 2);
  }
  isExpired() {
    return millis() - this.createdAt > this.duration;
  }
}
function drawShop() {
  background(50, 100, 150, 220);

  fill(255);
  textAlign(CENTER, CENTER);
  textSize(36);
  text("SHOP", width / 2, 60);

  textSize(18);
  text("Press P to Exit", width / 2, 100);

  textAlign(LEFT, TOP);
  let startY = 150;
  let spacing = 60;
  let panelW = 360;
  let panelH = 50;

  shopPanels = []; // clear previous frame panels

  for (let i = 0; i < upgradeOptions.length; i++) {
    let option = upgradeOptions[i];
    let panelX = width / 2 - panelW / 2;
    let panelY = startY + i * spacing;

    // Save panel info for clicks
    shopPanels.push({
      x: panelX,
      y: panelY,
      w: panelW,
      h: panelH,
      option: option
    });

    // Background panel
    fill(30, 150);
    rect(panelX, panelY, panelW, panelH, 12);

    // Check affordability
    let affordable = score >= option.cost;
    fill(affordable ? 255 : 150);
    textSize(20);
    text(`${i + 1}. ${option.name}`, panelX + 20, panelY + 5);

    // Show cost
    textSize(16);
    text(`Cost: ${option.cost}`, panelX + panelW - 100, panelY + 10);

    // Show current value dynamically
    textSize(14);
    let current = getCurrentValue(option.name);
    text(`Current: ${current}`, panelX + 20, panelY + 28);
  }
}

// Helper function to get current upgrade value
function getCurrentValue(name) {
  switch(name) {
    case "Increase Max Health":
      return player.maxHealth;
    case "Increase Damage":
      return player.bulletDamage + "/25";
    case "Faster Fire Rate":
      return player.fireRate + " ms"; // lower is better
    case "Increase Speed":
      return player.speed;
    case "Heal":
      return player.health + "/" + player.maxHealth;
    case "Increase Magazine Size":
      return player.magazineSize ? player.magazineSize : 30;
    case "Buy Drone":
      return dronesOwned + "/" + Dronelimit; // show current drones and cap
    default:
      return "-";
  }
}
function mousePressed() {
  if (shopOpen) {
    for (let panel of shopPanels) {
      if (mouseX > panel.x && mouseX < panel.x + panel.w &&
          mouseY > panel.y && mouseY < panel.y + panel.h) {
        
        if (score >= panel.option.cost) {
          panel.option.action();  // apply upgrade
          score -= panel.option.cost; // deduct cost
        }
      }
    }
  }

  // Drone selection click
  if (droneChoicePending) {
    handleDroneClick();
  }
    // Check if mouse clicked near the link
  if (mouseX > linkX - linkW/2 && mouseX < linkX + linkW/2 &&
      mouseY > linkY - linkH/2 && mouseY < linkY + linkH/2) {
    window.open(githubLink, "_blank");
  }
}
function handleDroneClick() {
  let cardWidth = 200;
  let cardHeight = 120;
  let spacing = 50;
  let startX = width / 2 - cardWidth - spacing;
  let startY = height / 2 - cardHeight / 2;

  let drones = [
    { name: "Ace Drone", color: color(0, 200, 255) },
    { name: "Laser Drone", color: color(0, 255, 0) },
    { name: "AOE Drone", color: color(255, 0, 255) }
  ];

  for (let i = 0; i < drones.length; i++) {
    let x = startX + i * (cardWidth + spacing);
    let y = startY;

    if (mouseX > x && mouseX < x + cardWidth &&
        mouseY > y && mouseY < y + cardHeight) {
      
      if (drones[i].name === "Ace Drone") addDrone(new AceDrone(player));
      if (drones[i].name === "Laser Drone") addDrone(new LaserDrone(player));
      if (drones[i].name === "AOE Drone") addDrone(new AOEDrone(player));
    }
  }
}


function keyPressed() {
  // --- SHOP TOGGLE ---
  if (key === "p" || key === "P") {
    shopOpen = !shopOpen;
    return;
  }

  // --- EXIT SHOP (ESC) ---
  if (shopOpen && keyCode === ESCAPE) {
    shopOpen = false;
    return;
  }



  // --- GAME OVER RESTART ---
  if (player.health <= 0 && (key === "r" || key === "R")) {
    resetGame();
    return;
  }


  // --- PAUSE ---
  if (keyCode === ESCAPE) {
    isPaused = !isPaused;
    return;
  }
  
  if (key === "e"|| key === "E") {
  dashPlayer(player, createVector(mouseX, mouseY));
}

}
function dashPlayer(player, target, dashSpeed = 15, invincibilityDuration = 300) {
  if (!player) return;

  // Check cooldown
  if (millis() - player.lastDashTime < player.dashCooldown) return;

  // Dash direction
  let direction = p5.Vector.sub(target, player.position).normalize();

  // Apply dash velocity
  player.velocity = direction.mult(dashSpeed);

  // Temporary invincibility
  player.isInvincible = true;
  player.invincibilityTimer = invincibilityDuration;

  // Update last dash time
  player.lastDashTime = millis();

  // Spawn dash particles along dash direction
  for (let i = 0; i < 8; i++) {
    let angle = direction.heading() + random(-PI / 6, PI / 6);
    let speed = random(2, 6);
    let vel = p5.Vector.fromAngle(angle).mult(speed);
    particles.push(new Particle(player.position.x, player.position.y, vel));
  }
}


function drawHelmet(style = "basic") {
  push();
  noStroke();
  let helmetSize = 25; // slightly smaller than player body (34)
  switch (style) {
    case "military":
      fill(30, 100, 30); // dark green
      break;
    case "riot":
      fill(80, 80, 80); // gray
      break;
    default: // basic
      fill(100); // light gray
      break;
  }
  ellipse(0, 0, helmetSize, helmetSize);
  pop();
}

// Track last flash timing
let lastFlashTime = 0;
const flashDuration = 100; // milliseconds

function triggerFlash() {
  lastFlashTime = millis();
}

function shouldShowFlash() {
  return millis() - lastFlashTime < flashDuration;
}
function drawPlayerCharacter(
  x,
  y,
  direction,
  isShooting = false,
  hasArmor = false,
  helmetType = "military"
) {
  push();
  translate(x, y);


  // --- Body (upright, no rotation) ---
  fill(105, 180, 240);
  stroke(30);
  strokeWeight(2.5);
  ellipse(0, 0, 34);

  // --- Helmet (upright) ---
  drawHelmet(helmetType);

  // --- Rotate for gun + arms only ---
  // --- Rotate for gun + arms only ---
push();
rotate(direction);

// Gun
let gunForwardOffset = 19; // increase this to move the gun further out
// only apply recoil if shot actually fired
let recoilOffset = 0;
if (isShooting && player.didShoot) {
  recoilOffset = map(sin(frameCount * 0.5), -1, 1, -2, 2);
}
translate(gunForwardOffset - recoilOffset, 0); // move gun forward
fill(50);
stroke(20);
strokeWeight(1.5);
rect(0, -4, 24, 8, 3);

// Hands
let gunLength = 24;
let handOffsetY = 6;
fill(200, 180, 150);
noStroke();
ellipse(0 - recoilOffset, -handOffsetY, 8, 8); // left hand above gun
ellipse(gunLength - recoilOffset, handOffsetY, 8, 8); // right hand below gun

// Muzzle flash
if (isShooting && shouldShowFlash()) {
  push();
  translate(gunLength, 0);
  let t = map(millis() - lastFlashTime, 0, flashDuration, 1, 0);
  fill(255, 255, 0, 200 * t);
  noStroke();
  ellipse(12, 0, 12 * t, 8 * t);
  pop();
}

pop(); // end gun/arms rotation

  pop(); // end player transform
}
let githubLink = "https://github.com/Pwhy2013/Blobstorm/discussions";
let linkX, linkY, linkW, linkH;

function drawTitleScreen() {
  background(20);
  
  // --- Floating particles ---
  for (let i = 0; i < 40; i++) {
    let x = (frameCount * 0.3 + i * 80) % width;
    let y = (i * 200 + frameCount * 0.7) % height;
    noStroke();
    fill(100 + sin(frameCount * 0.02 + i) * 80, 150, 255, 120);
    ellipse(x, y, 6 + sin(frameCount * 0.05 + i) * 3);
  }

  // --- Title ---
  textAlign(CENTER, CENTER);
  let glow = abs(sin(frameCount * 0.05)) * 180 + 75;
  textSize(80);
  fill(0, glow, 255);
  textStyle(BOLD);
  text("!!BLOB GAME!!", width / 2, height / 2 - 120);

  // --- Subtitle ---
  textSize(28);
  fill(200);
  text("Objective: DONT DIE!!!!", width / 2, height / 2 - 60);

  // --- Controls Box ---
  let boxW = 320, boxH = 160;
  fill(30, 180);
  rect(width / 2 - boxW/2, height / 2 - boxH/2 + 40, boxW, boxH, 18);

  textSize(18);
  fill(255);
  textAlign(LEFT, TOP);
  let bx = width/2 - boxW/2 + 20;
  let by = height/2 - boxH/2 + 55;
  text("🕹️ Controls:", bx, by); by += 28;
  text("WASD - Move", bx, by); by += 22;
  text("Mouse / left click - Shoot", bx, by); by += 22;
  text("ESC - Pause / P - Shop", bx, by); by += 22;
  text("E - Dash towards mouse", bx, by); by += 22;

  // --- Start Prompt ---
  textAlign(CENTER, CENTER);
  textSize(24);
  let alpha = map(sin(frameCount * 0.05), -1, 1, 100, 255);
  fill(255, alpha);
  text("Press SPACE to Start", width / 2, height - 100);

  // --- GitHub Link with Hover Effect ---
  textSize(16);
  textStyle(NORMAL);
  linkX = width / 2;
  linkY = height - 50;
  linkW = textWidth("Report bugs and issues here!");
  linkH = 16;

  // Change color on hover
  if (mouseX > linkX - linkW/2 && mouseX < linkX + linkW/2 &&
      mouseY > linkY - linkH/2 && mouseY < linkY + linkH/2) {
    fill(50, 200, 255); // brighter color
    stroke(50, 200, 255);
    strokeWeight(1.5);
  } else {
    fill(100, 200, 255); // normal color
    noStroke();
  }
  text("Report bugs and issues here!", linkX, linkY);
}

function drawGameOverScreen() {
  // dark overlay
  fill(0, 180);
  rect(0, 0, width, height);

  // GAME OVER title
  textAlign(CENTER, CENTER);
  textSize(80);
  fill(255, 0, 0);
  stroke(0);
  strokeWeight(6);
  text("GAME OVER", width / 2, height / 2 - 100);

  // final stats
  noStroke();
  textSize(32);
  fill(255);
  text("Final Score: " + score, width / 2, height / 2);
  text("Highest Level: " + player.level, width / 2, height / 2 + 50);

  // restart prompt
  textSize(24);
  fill(200);
  text("Press R to Restart", width / 2, height / 2 + 120);

  // little flashing effect on restart text
  if (frameCount % 60 < 30) {
    fill(255, 200, 200);
    text("Press R to Restart", width / 2, height / 2 + 120);
  }
}


function drawAmmo() {
  let x = 20;
  let y = height - 90; // higher up so health goes below it
  fill(255);
  textSize(16);
  if (isReloading) {
    text("Reloading...", x + 5, y + barHeight / 2);
  } 
}
