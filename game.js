const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const messageEl = document.getElementById("message");

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
  if (e.key.toLowerCase() === "r" && state.gameOver) reset();
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

const state = {
  player: { x: W / 2, y: H - 80, r: 8, speed: 240, cooldown: 0 },
  playerBullets: [],
  enemyBullets: [],
  enemies: [],
  score: 0,
  lives: 3,
  time: 0,
  spawnTimer: 0,
  gameOver: false,
  invuln: 0,
};

function reset() {
  state.player.x = W / 2;
  state.player.y = H - 80;
  state.playerBullets = [];
  state.enemyBullets = [];
  state.enemies = [];
  state.score = 0;
  state.lives = 3;
  state.time = 0;
  state.spawnTimer = 0;
  state.gameOver = false;
  state.invuln = 0;
  messageEl.textContent = "ゲーム開始！";
}

function spawnEnemy() {
  const x = 40 + Math.random() * (W - 80);
  state.enemies.push({
    x,
    y: -20,
    hp: 16,
    t: 0,
    fire: 0,
  });
}

function update(dt) {
  if (state.gameOver) return;

  state.time += dt;
  state.spawnTimer -= dt;
  state.player.cooldown -= dt;
  state.invuln -= dt;

  if (state.spawnTimer <= 0) {
    spawnEnemy();
    const interval = Math.max(0.45, 1.2 - state.time * 0.01);
    state.spawnTimer = interval;
  }

  const slow = keys.has("shift") ? 0.5 : 1;
  const vx = (keys.has("arrowright") ? 1 : 0) - (keys.has("arrowleft") ? 1 : 0);
  const vy = (keys.has("arrowdown") ? 1 : 0) - (keys.has("arrowup") ? 1 : 0);

  const len = Math.hypot(vx, vy) || 1;
  state.player.x += (vx / len) * state.player.speed * slow * dt;
  state.player.y += (vy / len) * state.player.speed * slow * dt;

  state.player.x = Math.max(12, Math.min(W - 12, state.player.x));
  state.player.y = Math.max(12, Math.min(H - 12, state.player.y));

  if (keys.has("z") && state.player.cooldown <= 0) {
    state.playerBullets.push({ x: state.player.x, y: state.player.y - 10, vy: -450 });
    state.player.cooldown = 0.09;
  }

  for (const b of state.playerBullets) b.y += b.vy * dt;
  state.playerBullets = state.playerBullets.filter((b) => b.y > -20);

  for (const e of state.enemies) {
    e.t += dt;
    e.fire -= dt;
    e.y += 35 * dt;
    e.x += Math.sin(e.t * 1.4) * 40 * dt;

    if (e.fire <= 0) {
      e.fire = Math.max(0.18, 0.65 - state.time * 0.003);
      const rings = 8;
      const base = e.t * 2.3;
      for (let i = 0; i < rings; i++) {
        const a = base + (Math.PI * 2 * i) / rings;
        const speed = 90 + (i % 2) * 25;
        state.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed + 40, r: 4 });
      }
    }
  }

  for (const b of state.enemyBullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
  }
  state.enemyBullets = state.enemyBullets.filter((b) => b.x > -40 && b.x < W + 40 && b.y > -40 && b.y < H + 40);

  for (const pb of state.playerBullets) {
    for (const e of state.enemies) {
      if (Math.hypot(pb.x - e.x, pb.y - e.y) < 16) {
        e.hp -= 1;
        pb.y = -999;
        if (e.hp <= 0) {
          e.y = H + 999;
          state.score += 150;
        }
      }
    }
  }

  state.enemies = state.enemies.filter((e) => e.y < H + 60);

  if (state.invuln <= 0) {
    for (const b of state.enemyBullets) {
      if (Math.hypot(b.x - state.player.x, b.y - state.player.y) < state.player.r + b.r - 1) {
        hitPlayer();
        break;
      }
    }
  }

  scoreEl.textContent = `SCORE: ${state.score}`;
  livesEl.textContent = `LIVES: ${state.lives}`;
}

function hitPlayer() {
  state.lives -= 1;
  state.invuln = 1.8;
  state.enemyBullets.length = 0;
  state.player.x = W / 2;
  state.player.y = H - 80;
  messageEl.textContent = "被弾！";

  if (state.lives <= 0) {
    state.gameOver = true;
    messageEl.textContent = "ゲームオーバー… Rキーでリスタート";
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  for (let y = 0; y < H; y += 24) {
    ctx.strokeStyle = "#18203a";
    ctx.beginPath();
    ctx.moveTo(0, (y + (state.time * 45) % 24));
    ctx.lineTo(W, (y + (state.time * 45) % 24));
    ctx.stroke();
  }

  for (const b of state.playerBullets) {
    ctx.fillStyle = "#72e4ff";
    ctx.fillRect(b.x - 1.5, b.y - 8, 3, 12);
  }

  for (const b of state.enemyBullets) {
    ctx.fillStyle = "#ff668f";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const e of state.enemies) {
    ctx.fillStyle = "#b57dff";
    ctx.beginPath();
    ctx.arc(e.x, e.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a1d62";
    ctx.fillRect(e.x - 10, e.y - 22, 20, 4);
    ctx.fillStyle = "#85ff8a";
    ctx.fillRect(e.x - 10, e.y - 22, (20 * Math.max(0, e.hp)) / 16, 4);
  }

  const blink = state.invuln > 0 && Math.floor(state.time * 20) % 2 === 0;
  if (!blink) {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(state.player.x, state.player.y - 12);
    ctx.lineTo(state.player.x - 8, state.player.y + 10);
    ctx.lineTo(state.player.x + 8, state.player.y + 10);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "#62ffe8";
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 2.8, 0, Math.PI * 2);
  ctx.fill();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

reset();
requestAnimationFrame(loop);
