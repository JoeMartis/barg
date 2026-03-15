// === AI Ethics Quest - Visual Effects Engine ===
// Particles, screen shake, score flyups, combo fire, boss damage flash

const Effects = {
  canvas: null,
  ctx: null,
  particles: [],
  animating: false,
  reducedMotion: false,

  init() {
    this.canvas = document.getElementById('fx-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  // Spawn particle burst from an element's position
  burst(element, color, count) {
    if (!this.canvas || this.reducedMotion) return;
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    for (let i = 0; i < (count || 20); i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: 3 + Math.random() * 5,
        color: color || '#00e676',
        type: 'circle'
      });
    }
    this.startAnimation();
  },

  // Star burst for level-ups and big achievements
  starBurst(x, y, count) {
    if (!this.canvas || this.reducedMotion) return;
    const colors = ['#ffd700', '#ff9100', '#ffeb3b', '#ffffff'];
    for (let i = 0; i < (count || 30); i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x: x || window.innerWidth / 2,
        y: y || window.innerHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        decay: 0.01 + Math.random() * 0.015,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'star'
      });
    }
    this.startAnimation();
  },

  // Continuous emitter (for combo fire)
  emitFrom(element, color, rate) {
    if (!element || this.reducedMotion) return;
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < (rate || 3); i++) {
      this.particles.push({
        x: rect.left + Math.random() * rect.width,
        y: rect.top + rect.height,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 3,
        life: 1,
        decay: 0.03 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        color: color || '#ff9100',
        type: 'circle'
      });
    }
    this.startAnimation();
  },

  // Falling debris (boss damage)
  debris(element, color) {
    if (!this.canvas || !element || this.reducedMotion) return;
    const rect = element.getBoundingClientRect();
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: rect.left + Math.random() * rect.width,
        y: rect.top,
        vx: (Math.random() - 0.5) * 3,
        vy: 1 + Math.random() * 4,
        life: 1,
        decay: 0.02,
        size: 3 + Math.random() * 4,
        color: color || '#ff5252',
        type: 'square'
      });
    }
    this.startAnimation();
  },

  startAnimation() {
    if (this.animating) return;
    this.animating = true;
    this.animate();
  },

  animate() {
    if (!this.ctx || this.particles.length === 0) {
      this.animating = false;
      if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;

      if (p.type === 'star') {
        this.drawStar(p.x, p.y, p.size);
      } else if (p.type === 'square') {
        this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.globalAlpha = 1;
    requestAnimationFrame(() => this.animate());
  },

  drawStar(x, y, size) {
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const innerAngle = angle + Math.PI / 5;
      if (i === 0) this.ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      else this.ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
      this.ctx.lineTo(x + Math.cos(innerAngle) * size * 0.4, y + Math.sin(innerAngle) * size * 0.4);
    }
    this.ctx.closePath();
    this.ctx.fill();
  },

  // Screen shake
  shake(intensity, duration) {
    if (this.reducedMotion) return;
    const el = document.getElementById('app');
    if (!el) return;
    const str = intensity || 6;
    const dur = duration || 400;
    const start = Date.now();

    const doShake = () => {
      const elapsed = Date.now() - start;
      if (elapsed > dur) {
        el.style.transform = '';
        return;
      }
      const decay = 1 - elapsed / dur;
      const x = (Math.random() - 0.5) * str * 2 * decay;
      const y = (Math.random() - 0.5) * str * 2 * decay;
      el.style.transform = `translate(${x}px, ${y}px)`;
      requestAnimationFrame(doShake);
    };
    doShake();
  },

  // Score flyup from element
  flyup(text, element, color) {
    if (this.reducedMotion) return;
    const rect = element ? element.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0 };
    const flyEl = document.createElement('div');
    flyEl.className = 'fx-flyup';
    flyEl.textContent = text;
    flyEl.style.left = (rect.left + rect.width / 2) + 'px';
    flyEl.style.top = rect.top + 'px';
    if (color) flyEl.style.color = color;
    document.body.appendChild(flyEl);
    setTimeout(() => flyEl.remove(), 1000);
  },

  // Flash screen border (damage taken)
  flashBorder(color, duration) {
    if (this.reducedMotion) return;
    const el = document.getElementById('app');
    if (!el) return;
    el.style.boxShadow = `inset 0 0 60px ${color || 'rgba(255,82,82,0.5)'}`;
    setTimeout(() => { el.style.boxShadow = ''; }, duration || 300);
  },

  // Full-screen flash (combo milestone, level up)
  screenFlash(color, duration) {
    if (this.reducedMotion) return;
    const flash = document.createElement('div');
    flash.className = 'fx-screen-flash';
    flash.style.background = color || 'rgba(255,255,255,0.2)';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), duration || 300);
  },

  // Ripple effect from element center
  ripple(element, color) {
    if (!element || this.reducedMotion) return;
    const rect = element.getBoundingClientRect();
    const ripEl = document.createElement('div');
    ripEl.className = 'fx-ripple';
    ripEl.style.left = (rect.left + rect.width / 2) + 'px';
    ripEl.style.top = (rect.top + rect.height / 2) + 'px';
    ripEl.style.borderColor = color || '#00e676';
    document.body.appendChild(ripEl);
    setTimeout(() => ripEl.remove(), 600);
  },

  // Combo streak text overlay
  streakText(text) {
    if (this.reducedMotion) return;
    const el = document.createElement('div');
    el.className = 'fx-streak-text';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
};

document.addEventListener('DOMContentLoaded', () => Effects.init());
