export function triggerConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    document.body.removeChild(canvas);
    return;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces: {
    x: number;
    y: number;
    color: string;
    size: number;
    vx: number;
    vy: number;
    angle: number;
    va: number;
    alpha: number;
  }[] = [];

  const colors = ['#f43f5e', '#ec4899', '#38bdf8', '#10b981', '#fbbf24'];

  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * 150,
      y: canvas.height * 0.6 + (Math.random() - 0.5) * 60,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 14 - 6,
      angle: Math.random() * 360,
      va: (Math.random() - 0.5) * 10,
      alpha: 1,
    });
  }

  let animationFrameId: number;
  let startTime = Date.now();

  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const elapsed = Date.now() - startTime;
    let alive = false;

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4; // gravity
      p.angle += p.va;
      if (elapsed > 1200) {
        p.alpha -= 0.02;
      }

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (alive && elapsed < 3000) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  render();
}
