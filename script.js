(() => {
  const canvas = document.querySelector('#water');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const motion = document.querySelector('#motion');
  const surface = document.querySelector('#surface');
  const status = document.querySelector('#status');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const palettes = [
    ['#fff4ad', '#ffc450', '#e36848'], ['#ffe2c8', '#ff8c8d', '#b83c65'],
    ['#d2fff2', '#66e1d7', '#258bb1'], ['#e7d7ff', '#af8cfa', '#6053bd'],
    ['#fff5d4', '#ffa253', '#e25c42'], ['#e5ffba', '#aade72', '#318880']
  ];
  const fish = Array.from({ length: 9 }, (_, i) => ({
    x: [0.19, 0.39, 0.63, 0.8, 0.54, 0.26, 0.73, 0.42, 0.9][i],
    y: [0.43, 0.32, 0.55, 0.37, 0.68, 0.65, 0.21, 0.49, 0.59][i],
    size: [1.34, 0.94, 1.15, 1.32, 0.82, 0.87, 0.65, 0.68, 0.74][i],
    colors: palettes[i % palettes.length],
    direction: i % 3 ? 1 : -1,
    phase: i * 1.55,
    speed: random(0.034, 0.065),
    reaction: random(.15, .8),
    vx: 0,
    vy: 0,
    pitch: 0,
    biteCooldown: 0
  }));
  const plants = Array.from({ length: 58 }, (_, i) => {
    const beds = [0.035, 0.13, 0.29, 0.66, 0.84, 0.97];
    return {
      x: beds[i % beds.length] + random(-0.034, 0.034),
      height: random(0.065, 0.31), lean: random(-48, 48),
      width: random(5, 16), phase: random(0, 7),
      color: ['#0d5c58', '#17796b', '#318e71', '#58a683', '#247f81'][i % 5]
    };
  });
  const sand = Array.from({ length: 160 }, () => ({
    x: Math.random(), depth: Math.random(), size: random(0.4, 2.2)
  }));
  const bubbles = Array.from({ length: 34 }, (_, i) => ({
    x: i % 3 === 0 ? random(0.08, 0.19) : random(0.68, 0.92),
    y: Math.random(), speed: random(0.025, 0.081), size: random(0.7, 4.8)
  }));
  const food = [];
  const bursts = [];
  let width = 1;
  let height = 1;
  let unit = 1;
  let time = 0;
  let previous;
  let frameId = 0;
  let paused = motionPreference.matches;
  let eaten = 0;

  function ellipse(x, y, rx, ry, color, rotation = 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWater() {
    const water = ctx.createLinearGradient(0, 0, width * 0.24, height);
    water.addColorStop(0, '#348f91');
    water.addColorStop(0.34, '#176373');
    water.addColorStop(1, '#092e43');
    ctx.fillStyle = water;
    ctx.fillRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(width * .45, -height * .2, 0, width * .45, 0, height * .83);
    glow.addColorStop(0, '#bcffe69b');
    glow.addColorStop(1, '#92f7d800');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 9; i++) {
      const x = width * (i * .115 - .13);
      const beam = ctx.createLinearGradient(0, 0, 0, height * .86);
      beam.addColorStop(0, '#ceffe828');
      beam.addColorStop(1, '#ceffe800');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width * .042, 0);
      ctx.lineTo(x + width * .29 + Math.sin(time * .4 + i) * 18, height * .86);
      ctx.lineTo(x + width * .15, height * .86);
      ctx.fill();
    }

    for (let row = 0; row < 5; row++) {
      ctx.beginPath();
      for (let x = 0; x <= width + 12; x += 12) {
        const y = row * 5 + 5 + Math.sin(x * .027 + time * 1.4 + row) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#baffeb35';
      ctx.stroke();
    }
  }

  function floorAt(x) {
    return height * (.89 + .02 * Math.sin(x / width * 9) + .012 * Math.cos(x / width * 18));
  }

  function drawFloor() {
    const gradient = ctx.createLinearGradient(0, height * .86, 0, height);
    gradient.addColorStop(0, '#527d79');
    gradient.addColorStop(1, '#1e4452');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, floorAt(0));
    for (let x = 0; x < width; x += 8) ctx.lineTo(x, floorAt(x));
    ctx.lineTo(width, floorAt(width));
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();
    for (const grain of sand) {
      const x = grain.x * width;
      const floor = floorAt(x);
      ellipse(x, floor + grain.depth * (height - floor), grain.size, grain.size * .4, '#a5c2a34f');
    }
    for (const [x, y, radius] of [[.09, .94, 36], [.15, .95, 19], [.32, .94, 24], [.64, .94, 18], [.82, .93, 40], [.9, .96, 29]]) {
      ellipse(x * width, y * height + 4, radius * unit, radius * .38 * unit, '#142f43');
      ellipse(x * width, y * height, radius * .89 * unit, radius * .36 * unit, '#426873', -.12);
      ellipse(x * width - radius * .19 * unit, y * height - radius * .12 * unit, radius * .46 * unit, radius * .12 * unit, '#618b88', -.12);
    }
  }

  function drawPlant(plant) {
    const x = plant.x * width;
    const y = floorAt(x) + height * .043;
    const rise = height * plant.height;
    const bend = (plant.lean + Math.sin(time * 1.35 + plant.phase) * 15) * unit;
    const blade = plant.width * unit;
    ctx.fillStyle = plant.color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x - blade, y - rise * .43, x + bend - blade * 2, y - rise * .7, x + bend, y - rise);
    ctx.bezierCurveTo(x + bend + blade * .5, y - rise * .57, x + blade, y - rise * .25, x + blade * .15, y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + blade * .14, y - 2);
    ctx.quadraticCurveTo(x - blade * .7, y - rise * .51, x + bend, y - rise + 2);
    ctx.strokeStyle = '#a8df9a36';
    ctx.stroke();
  }

  function drawFish(swimmer) {
    const [light, middle, dark] = swimmer.colors;
    const isTall = swimmer.size > 1.15;
    const scale = swimmer.size * unit;
    const flick = Math.sin(time * 8 + swimmer.phase) * 4;
    ctx.save();
    ctx.translate(swimmer.x * width, swimmer.y * height);
    ctx.scale(swimmer.direction * scale, scale);
    ctx.rotate(swimmer.pitch);
    if (isTall) ctx.scale(1, 1.22);

    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-15, -4);
    ctx.quadraticCurveTo(-24, -5, -34 + flick, -14);
    ctx.quadraticCurveTo(-33 + flick, 1, -35 + flick, 13);
    ctx.quadraticCurveTo(-25, 11, -15, 4);
    ctx.fill();

    ctx.fillStyle = middle;
    ctx.beginPath();
    ctx.moveTo(-15, -7);
    ctx.quadraticCurveTo(-6, -23, 8, -14);
    ctx.lineTo(11, -7);
    ctx.fill();

    const body = ctx.createLinearGradient(0, -13, 0, 14);
    body.addColorStop(0, light);
    body.addColorStop(.44, middle);
    body.addColorStop(1, dark);
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.bezierCurveTo(-10, -16, 16, -17, 24, -2);
    ctx.bezierCurveTo(30, 9, 2, 18, -22, 0);
    ctx.closePath();
    ctx.fillStyle = body;
    ctx.fill();

    ctx.save();
    ctx.clip();
    for (const x of [-11, -2, 7]) {
      ctx.beginPath();
      ctx.moveTo(x, -15);
      ctx.quadraticCurveTo(x - 6, -1, x + 1, 14);
      ctx.lineWidth = isTall ? 3.4 : 1.1;
      ctx.strokeStyle = isTall ? '#fff5db80' : '#ffffff4d';
      ctx.stroke();
    }
    ctx.restore();

    ellipse(4, 4, 7, 2.4, dark, -.28 + flick * .04);
    ellipse(16, -3, 4.4, 4.4, '#fff6e0');
    ellipse(17, -3, 2.6, 2.6, '#102332');
    ellipse(17.7, -4.1, .86, .86, 'white');
    ctx.restore();
  }

  function update(dt) {
    time += dt;
    for (const pellet of food) {
      const activeTime = clamp(time - pellet.release, 0, dt);
      pellet.y += activeTime * pellet.sink;
      pellet.x = clamp(pellet.x + activeTime * pellet.drift / width, .02, .98);
    }

    for (const swimmer of fish) {
      swimmer.biteCooldown = Math.max(0, swimmer.biteCooldown - dt);
      let nearest = null;
      let distance = Infinity;
      for (const pellet of food) {
        if (pellet.eaten || pellet.y > .86 || time < pellet.release + swimmer.reaction) continue;
        const gap = Math.hypot((pellet.x - swimmer.x) * width, (pellet.y - swimmer.y) * height);
        if (gap < distance) {
          nearest = pellet;
          distance = gap;
        }
      }
      const margin = Math.min(.18, 41 * unit / width);
      if (!nearest && swimmer.x < margin) swimmer.direction = 1;
      if (!nearest && swimmer.x > 1 - margin) swimmer.direction = -1;
      let vx = swimmer.direction * swimmer.speed * width;
      let vy = (Math.sin(time * 1.35 + swimmer.phase) * .032 + (.49 - swimmer.y) * .027) * height;

      if (nearest) {
        const dx = (nearest.x - swimmer.x) * width;
        const dy = (nearest.y - swimmer.y) * height;
        const approachSpeed = clamp(distance * 3.2, 28, 172 + swimmer.speed * 650);
        vx = dx / Math.max(distance, 1) * approachSpeed;
        vy = dy / Math.max(distance, 1) * approachSpeed + nearest.sink * height;

        // Give nearby fish room without pushing them away from the food cloud.
        for (const neighbor of fish) {
          const offsetX = (swimmer.x - neighbor.x) * width;
          const offsetY = (swimmer.y - neighbor.y) * height;
          const gap = Math.hypot(offsetX, offsetY);
          const space = (swimmer.size + neighbor.size) * 23 * unit;
          if (gap > 0 && gap < space) {
            const push = (1 - gap / space) * 47;
            vx += offsetX / gap * push;
            vy += offsetY / gap * push;
          }
        }

        const reach = 25 * swimmer.size * unit;
        if (!swimmer.biteCooldown && distance < reach && dx * swimmer.direction > -reach * .35) {
          nearest.eaten = true;
          swimmer.biteCooldown = .27;
          eaten++;
          bursts.push({ x: nearest.x, y: nearest.y, life: .52 });
        }
      }

      const response = 1 - Math.exp(-dt * 4.5);
      swimmer.vx += (vx - swimmer.vx) * response;
      swimmer.vy += (vy - swimmer.vy) * response;
      if (nearest && Math.abs(swimmer.vx) > 9) swimmer.direction = Math.sign(swimmer.vx);
      const pitch = clamp(Math.atan2(swimmer.vy, Math.abs(swimmer.vx) + 25), -.68, .68);
      swimmer.pitch += (pitch - swimmer.pitch) * response;
      swimmer.x = clamp(swimmer.x + swimmer.vx * dt / width, margin * .45, 1 - margin * .45);
      swimmer.y = clamp(swimmer.y + swimmer.vy * dt / height, .09, .84);
    }

    for (let i = food.length - 1; i >= 0; i--) {
      if (food[i].eaten || food[i].y > .86) food.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i--) {
      bursts[i].life -= dt;
      if (bursts[i].life <= 0) bursts.splice(i, 1);
    }
  }

  function draw() {
    drawWater();
    for (const bubble of bubbles) {
      const x = bubble.x * width + Math.sin(time + bubble.y * 29) * 9;
      const y = ((bubble.y - time * bubble.speed) % 1 + 1) % 1 * height;
      ctx.beginPath();
      ctx.arc(x, y, bubble.size, 0, Math.PI * 2);
      ctx.strokeStyle = '#b3f4e65e';
      ctx.stroke();
      ellipse(x - bubble.size * .26, y - bubble.size * .36, .75, .75, '#d5fff29b');
    }
    drawFloor();
    plants.forEach(drawPlant);
    fish.forEach(drawFish);
    for (const pellet of food) {
      if (pellet.release > time) continue;
      ellipse(pellet.x * width, pellet.y * height, 3.3, 3.3, '#fbc679');
      ellipse(pellet.x * width - .8, pellet.y * height - 1, 1.15, 1.15, '#fff0b9');
    }
    for (const burst of bursts) {
      const radius = 5 + (.52 - burst.life) * 34;
      ctx.beginPath();
      ctx.arc(burst.x * width, burst.y * height, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 225, 151, ' + burst.life + ')';
      ctx.stroke();
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    unit = clamp(width / 820, .65, 1.22);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
    draw();
  }

  function animate(timestamp) {
    const dt = previous === undefined ? 0 : Math.min((timestamp - previous) / 1000, .05);
    previous = timestamp;
    const before = eaten;
    update(dt);
    if (before !== eaten) status.textContent = 'Pellets eaten: ' + eaten + '.';
    draw();
    frameId = requestAnimationFrame(animate);
  }

  function setPaused(value) {
    paused = value;
    motion.setAttribute('aria-pressed', String(value));
    motion.innerHTML = value ? '<span aria-hidden="true">▶</span> Resume' : '<span aria-hidden="true">Ⅱ</span> Pause';
    cancelAnimationFrame(frameId);
    previous = undefined;
    if (!paused) frameId = requestAnimationFrame(animate);
  }

  function feed(x) {
    const surfaceY = surface.offsetHeight / height;
    const spacing = 6 * unit / width;
    const edge = .035 + 5.5 * spacing;
    const center = clamp(x, edge, 1 - edge);
    for (let i = 0; i < 12; i++) {
      food.push({
        x: center + (i - 5.5) * spacing,
        y: surfaceY + 4 / height,
        release: time + i * .045,
        drift: random(-6, 6),
        sink: random(.038, .068),
        eaten: false
      });
    }
    if (food.length > 72) food.splice(0, food.length - 72);
    status.textContent = paused ? 'Food added. Resume to watch the fish eat.' : 'Fish food added.';
    if (paused) draw();
  }

  surface.addEventListener('click', event => {
    const bounds = surface.getBoundingClientRect();
    feed(event.detail === 0 ? .5 : (event.clientX - bounds.left) / bounds.width);
  });
  document.querySelector('#feed').addEventListener('click', () => feed(.5));
  motion.addEventListener('click', () => setPaused(!paused));
  motionPreference.addEventListener('change', event => setPaused(event.matches));
  new ResizeObserver(resize).observe(canvas);
  resize();
  setPaused(paused);
})();
