window.onload = function () {
  // 1) Referencias DOM (asegúrate: <button id="start-button"> y <canvas id="my-canvas">)
  const canvas = document.getElementById("my-canvas");
  const startBtn = document.getElementById("start-button");
  if (!canvas) {
    console.error('❌ No encuentro <canvas id="my-canvas"> en el HTML.');
    return;
  }
  if (!startBtn) {
    console.error('❌ No encuentro <button id="start-button"> en el HTML.');
    return;
  }
  const ctx = canvas.getContext("2d");

  // 2) Tamaño de juego
  canvas.width = 500;
  canvas.height = 600;

  // 3) Carga opcional de imágenes (si fallan, se dibujan rectángulos)
  const IMAGES = {
    bg: "images/bg.png",
    bird: "images/flappy.png",
    top: "images/obstacle_top.png",
    bottom: "images/obstacle_bottom.png",
  };
  const assets = {};
  function loadAssets() {
    return Promise.all(
      Object.entries(IMAGES).map(([k, src]) =>
        new Promise((res) => {
          const img = new Image();
          img.onload = () => {
            assets[k] = img;
            res();
          };
          img.onerror = () => {
            console.warn(`⚠️ No se pudo cargar ${src}. Usaré dibujo por defecto.`);
            assets[k] = null;
            res();
          };
          img.src = src;
        })
      )
    );
  }

  // 4) Física y estado
  const G = 0.45; // gravedad
  const FLAP = -8; // salto
  const OBST_SPEED = 2; // velocidad de obstáculos
  const GAP = 140; // hueco entre tubos

  let player = null;
  let obstacles = [];
  let frame = 0;
  let score = 0;
  let running = false;
  let rafId = null;

  class Bird {
    constructor() {
      this.w = 40;
      this.h = 30;
      this.x = 50;
      this.y = 150;
      this.vy = 0;
    }
    flap() {
      this.vy = FLAP;
    }
    update() {
      this.vy += G;
      this.y += this.vy;
    }
    draw() {
      if (assets.bird) {
        ctx.drawImage(assets.bird, this.x, this.y, this.w, this.h);
      } else {
        // fallback
        ctx.fillStyle = "#f5a623";
        ctx.fillRect(this.x, this.y, this.w, this.h);
      }
    }
    get top() { return this.y; }
    get bottom() { return this.y + this.h; }
    get left() { return this.x; }
    get right() { return this.x + this.w; }
  }

  function drawBg() {
    if (assets.bg) {
      ctx.drawImage(assets.bg, 0, 0, canvas.width, canvas.height);
    } else {
      // fondo fallback
      ctx.fillStyle = "#9be7ff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function createObstaclePair() {
    const minTop = 40;
    const maxTop = canvas.height - GAP - 80;
    const topHeight = Math.floor(Math.random() * (maxTop - minTop + 1) + minTop);
    const x = canvas.width;
    const w = 60;

    // guardamos como dos rectángulos
    obstacles.push({
      x, y: 0, w, h: topHeight, type: "top",
    });
    obstacles.push({
      x, y: topHeight + GAP, w, h: canvas.height - (topHeight + GAP), type: "bottom",
    });
  }

  function drawObstacle(o) {
    if (o.type === "top" && assets.top) {
      ctx.drawImage(assets.top, o.x, o.y, o.w, o.h);
    } else if (o.type === "bottom" && assets.bottom) {
      ctx.drawImage(assets.bottom, o.x, o.y, o.w, o.h);
    } else {
      // fallback
      ctx.fillStyle = "#2e7d32";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = "#1b5e20";
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }
  }

  function rectsCollide(a, b) {
    return !(
      a.right <= b.x ||
      a.left >= b.x + b.w ||
      a.bottom <= b.y ||
      a.top >= b.y + b.h
    );
  }

  function drawScore() {
    ctx.font = "24px system-ui, sans-serif";
    ctx.fillStyle = "#111";
    ctx.fillText("Puntos: " + score, 12, 28);
  }

  function gameOver() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "20px system-ui, sans-serif";
    ctx.fillText("Pulsa START para reiniciar", canvas.width / 2, canvas.height / 2 + 24);
  }

  function update() {
    if (!running) return;

    // limpiar y fondo
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBg();

    frame++;

    // nuevos obstáculos cada ~90 frames
    if (frame % 90 === 0) createObstaclePair();

    // mover obstáculos
    obstacles.forEach(o => o.x -= OBST_SPEED);
    // dibujar obstáculos
    obstacles.forEach(drawObstacle);
    // eliminar fuera de pantalla
    obstacles = obstacles.filter(o => o.x + o.w > 0);

    // actualizar jugador
    player.update();
    // colisiones con tubos
    for (const o of obstacles) {
      const birdRect = { left: player.left, right: player.right, top: player.top, bottom: player.bottom };
      if (rectsCollide(birdRect, o)) {
        gameOver();
        return;
      }
    }
    // colisión con suelo/techo
    if (player.top < 0 || player.bottom > canvas.height) {
      gameOver();
      return;
    }
    player.draw();

    // puntuación
    score = Math.max(score, Math.floor(frame / 10));
    drawScore();

    rafId = requestAnimationFrame(update);
  }

  function startGame() {
    // estado inicial
    player = new Bird();
    obstacles = [];
    frame = 0;
    score = 0;
    running = true;
    if (rafId) cancelAnimationFrame(rafId);
    update();
  }

  // 5) Eventos
  startBtn.onclick = () => startGame();

  // SPACE = salto (evitamos scroll de la página)
  document.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (!running || !player) return;
        player.flap();
      }
    },
    { passive: false }
  );

  // 6) Cargar imágenes y pintar splash
  loadAssets().then(() => {
    // Pantalla de espera:
    drawBg();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.fillRect(40, 60, canvas.width - 80, 120);
    ctx.fillStyle = "#06365f";
    ctx.font = "bold 28px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Pulsa START para jugar", canvas.width / 2, 120);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText("Controles: Barra espaciadora para saltar", canvas.width / 2, 150);
  });
};
