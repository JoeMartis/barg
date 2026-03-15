// === AI Ethics Quest - Game Engine v2 ===
// Now with interactive mini-games, XP progression, power-ups, and juice!

const Game = {
  state: {
    mode: null,
    score: 0,
    trust: 50,
    chapter: 0,
    sceneIndex: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    total: 0,
    missed: [],
    badges: [],
    quizTimer: null,
    quizTimeLeft: 0,
    quizQuestionIndex: 0,
    quizQuestions: [],
    scenarioIndex: 0,
    scenarioQIndex: 0,
    bossIndex: 0,
    bossAttackIndex: 0,
    bossHP: 100,
    playerHP: 100,
    answering: false,
    autoAdvanceTimeout: null,
    // Progression
    xp: 0,
    level: 1,
    totalSessions: 0,
    // Power-ups
    powerups: { fiftyFifty: 2, hint: 1, shield: 1, timeFreeze: 1 }
  },

  LEVEL_THRESHOLDS: [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000],
  LEVEL_TITLES: [
    'Intern', 'Junior Auditor', 'AI Auditor', 'Senior Auditor',
    'Ethics Lead', 'Chief Auditor', 'AI Guardian', 'Ethics Champion',
    'Master Auditor', 'Legendary Sage'
  ],
  STREAK_MESSAGES: [
    null, null, null, 'Nice!', null, 'Excellent!', null, 'Amazing!',
    null, null, 'UNSTOPPABLE!'
  ],

  init() {
    // Load persistent state
    this.state.xp = parseInt(localStorage.getItem('aiq-xp') || '0', 10) || 0;
    this.state.level = this.calcLevel(this.state.xp);
    this.state.totalSessions = parseInt(localStorage.getItem('aiq-sessions') || '0', 10) || 0;
    try {
      this.state.powerups = JSON.parse(localStorage.getItem('aiq-powerups')) || { fiftyFifty: 2, hint: 1, shield: 1, timeFreeze: 1 };
    } catch (e) {
      this.state.powerups = { fiftyFifty: 2, hint: 1, shield: 1, timeFreeze: 1 };
    }
    this.loadAchievements();

    const best = localStorage.getItem('aiq-best-score');
    if (best) {
      document.getElementById('returning-stats').style.display = 'block';
      document.getElementById('best-score').textContent = best;
    }
    this.updateXPBar();

    // Load reduce-motion preference
    const reduceMotion = localStorage.getItem('aiq-reduce-motion') === 'true';
    const toggle = document.getElementById('reduce-motion-toggle');
    if (toggle) toggle.checked = reduceMotion;
    if (reduceMotion) {
      Effects.reducedMotion = true;
      document.documentElement.classList.add('reduce-motion');
    }
  },

  calcLevel(xp) {
    for (let i = this.LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVEL_THRESHOLDS[i]) return i + 1;
    }
    return 1;
  },

  updateXPBar() {
    const bar = document.getElementById('xp-bar');
    if (!bar) return;
    const level = this.state.level;
    const currentThreshold = this.LEVEL_THRESHOLDS[level - 1] || 0;
    const isMaxLevel = level >= this.LEVEL_THRESHOLDS.length;
    const nextThreshold = this.LEVEL_THRESHOLDS[level] || currentThreshold;
    const progress = isMaxLevel ? 100 : ((this.state.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    const title = this.LEVEL_TITLES[level - 1] || 'Sage';

    bar.innerHTML = `
      <div class="xp-info">
        <span class="xp-level">Lv.${level} ${title}</span>
        <span class="xp-numbers">${isMaxLevel ? 'MAX' : `${this.state.xp}/${nextThreshold} XP`}</span>
      </div>
      <div class="xp-track"><div class="xp-fill" style="width:${Math.min(100, progress)}%"></div></div>
    `;
    bar.style.display = 'block';
  },

  awardXP(amount) {
    const oldLevel = this.state.level;
    this.state.xp += amount;
    this.state.level = this.calcLevel(this.state.xp);
    localStorage.setItem('aiq-xp', this.state.xp);
    this.updateXPBar();

    if (this.state.level > oldLevel) {
      this.showLevelUp(this.state.level);
    }
  },

  showLevelUp(level) {
    const title = this.LEVEL_TITLES[level - 1] || 'Sage';
    const overlay = document.getElementById('levelup-overlay');
    if (!overlay) return;
    overlay.querySelector('.levelup-level').textContent = `Level ${level}`;
    overlay.querySelector('.levelup-title').textContent = title;
    overlay.classList.add('active');
    Effects.starBurst(window.innerWidth / 2, window.innerHeight / 2, 40);
    Effects.screenFlash('rgba(255, 215, 0, 0.2)');
    setTimeout(() => overlay.classList.remove('active'), 2500);
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) screen.classList.add('active');
  },

  resetState() {
    this.state.score = 0;
    this.state.trust = 50;
    this.state.combo = 0;
    this.state.maxCombo = 0;
    this.state.correct = 0;
    this.state.total = 0;
    this.state.missed = [];
    this.state.badges = [];
    this.state.answering = false;
    this.state.shieldActive = false;
    if (this.state.autoAdvanceTimeout) clearTimeout(this.state.autoAdvanceTimeout);
    this.state.autoAdvanceTimeout = null;
    if (this.state.quizTimer) clearInterval(this.state.quizTimer);
    this.state.quizTimer = null;
    if (this.state.freezeTimeout) clearTimeout(this.state.freezeTimeout);
    this.state.freezeTimeout = null;
    if (this.tapState && this.tapState.tapTimer) clearInterval(this.tapState.tapTimer);
    if (this.toastTimeout) { clearTimeout(this.toastTimeout); this.toastTimeout = null; }
    this.state.totalSessions++;
    localStorage.setItem('aiq-sessions', this.state.totalSessions);
  },

  // === POWER-UPS ===
  renderPowerups(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const p = this.state.powerups;
    el.innerHTML = `
      <div class="powerup-bar">
        <button class="powerup-btn ${p.fiftyFifty <= 0 ? 'empty' : ''}" onclick="Game.usePowerup('fiftyFifty')" title="Remove 2 wrong answers">
          <span class="powerup-icon">50/50</span><span class="powerup-count">${p.fiftyFifty}</span>
        </button>
        <button class="powerup-btn ${p.hint <= 0 ? 'empty' : ''}" onclick="Game.usePowerup('hint')" title="Show a hint">
          <span class="powerup-icon">?</span><span class="powerup-count">${p.hint}</span>
        </button>
        ${this.state.mode === 'boss-battle' ? `
        <button class="powerup-btn ${p.shield <= 0 ? 'empty' : ''}" onclick="Game.usePowerup('shield')" title="Block next damage">
          <span class="powerup-icon">&#x1F6E1;</span><span class="powerup-count">${p.shield}</span>
        </button>` : ''}
        ${this.state.mode === 'quiz-blitz' ? `
        <button class="powerup-btn ${p.timeFreeze <= 0 ? 'empty' : ''}" onclick="Game.usePowerup('timeFreeze')" title="Freeze timer 10s">
          <span class="powerup-icon">&#x2744;</span><span class="powerup-count">${p.timeFreeze}</span>
        </button>` : ''}
      </div>
    `;
  },

  usePowerup(type) {
    if (this.state.answering) return;
    if (this.state.powerups[type] <= 0) return;

    this.state.powerups[type]--;
    localStorage.setItem('aiq-powerups', JSON.stringify(this.state.powerups));

    switch (type) {
      case 'fiftyFifty':
        this.applyFiftyFifty();
        break;
      case 'hint':
        this.applyHint();
        break;
      case 'shield':
        this.state.shieldActive = true;
        this.showToast('combo', 'Shield activated!');
        break;
      case 'timeFreeze':
        this.applyTimeFreeze();
        break;
    }
    // Re-render powerup bar
    const bar = document.querySelector('.powerup-bar');
    if (bar) this.renderPowerups(bar.parentElement.id);
  },

  applyFiftyFifty() {
    // Find the correct index for the current question
    let correctIdx = -1;
    if (this.state.mode === 'adventure') {
      correctIdx = this._advCorrectIdx != null ? this._advCorrectIdx :
        GAME_DATA.adventure[this.state.chapter].scenes[this.state.sceneIndex].correct;
    } else if (this.state.mode === 'quiz-blitz') {
      correctIdx = this._quizCorrectIdx != null ? this._quizCorrectIdx :
        this.state.quizQuestions[this.state.quizQuestionIndex].correct;
    } else if (this.state.mode === 'boss-battle') {
      correctIdx = this._bossCorrectIdx != null ? this._bossCorrectIdx :
        (this._shuffledBosses || GAME_DATA.bosses)[this.state.bossIndex].attacks[this.state.bossAttackIndex].correct;
    } else if (this.state.mode === 'scenario-lab') {
      correctIdx = this._scenarioCorrectIdx != null ? this._scenarioCorrectIdx :
        GAME_DATA.scenarios[this.state.scenarioIndex].questions[this.state.scenarioQIndex].correct;
    }

    const buttons = document.querySelectorAll('.scene-choices .btn-choice:not(.disabled)');
    let removed = 0;
    const indices = this.shuffleArray([...Array(buttons.length).keys()]);
    for (const i of indices) {
      if (removed >= 2) break;
      if (i === correctIdx) continue; // Protect correct answer
      buttons[i].style.opacity = '0.2';
      buttons[i].style.pointerEvents = 'none';
      removed++;
    }
    Effects.screenFlash('rgba(78, 140, 255, 0.15)');
    this.showToast('combo', '50/50 activated!');
  },

  applyHint() {
    let explanation = '';
    if (this.state.mode === 'adventure') {
      const ch = GAME_DATA.adventure[this.state.chapter];
      const scene = ch.scenes[this.state.sceneIndex];
      explanation = scene.explanation;
    } else if (this.state.mode === 'quiz-blitz') {
      const q = this.state.quizQuestions[this.state.quizQuestionIndex];
      explanation = q.explanation;
    }
    if (explanation) {
      const hint = explanation.split('.').slice(0, 1).join('.') + '.';
      const hintEl = document.createElement('div');
      hintEl.className = 'hint-box';
      hintEl.innerHTML = `<strong>Hint:</strong> ${this.escapeHtml(hint)}`;
      const choices = document.querySelector('.scene-choices');
      if (choices) choices.parentElement.insertBefore(hintEl, choices);
    }
    this.showToast('combo', 'Hint revealed!');
  },

  applyTimeFreeze() {
    if (this.state.quizTimer) {
      clearInterval(this.state.quizTimer);
      const timerEl = document.getElementById('quiz-timer');
      if (!timerEl) return;
      timerEl.classList.add('timer-frozen');
      this.showToast('combo', 'Time frozen for 10s!');
      this.state.freezeTimeout = setTimeout(() => {
        if (this.state.mode !== 'quiz-blitz') return;
        if (timerEl) timerEl.classList.remove('timer-frozen');
        this.startQuizTimer();
      }, 10000);
    }
  },

  // === ADVENTURE MODE ===
  startAdventure() { this.startMode('adventure'); },

  startMode(mode) {
    this.resetState();
    this.state.mode = mode;
    switch (mode) {
      case 'adventure':
        this.state.chapter = 0;
        this.state.sceneIndex = 0;
        this.showScreen('screen-adventure');
        this.renderAdventureScene();
        break;
      case 'quiz-blitz':
        this.startQuizBlitz();
        break;
      case 'scenario-lab':
        this.state.scenarioIndex = 0;
        this.state.scenarioQIndex = 0;
        this.showScreen('screen-scenario');
        this.renderScenario();
        break;
      case 'boss-battle':
        this.state.bossIndex = 0;
        this.state.bossAttackIndex = 0;
        this.state.bossHP = 100;
        this.state.playerHP = 100;
        // Shuffle boss order and attack order within each boss
        this._shuffledBosses = this.shuffleArray(GAME_DATA.bosses.map(b => ({
          ...b,
          attacks: this.shuffleArray([...b.attacks])
        })));
        this.showScreen('screen-boss');
        this.renderBossBattle();
        break;
    }
  },

  renderAdventureScene() {
    const chapters = GAME_DATA.adventure;
    if (this.state.chapter >= chapters.length) {
      this.showResults();
      return;
    }
    const chapter = chapters[this.state.chapter];
    const scenes = chapter.scenes;
    if (this.state.sceneIndex >= scenes.length) {
      // Show checkpoint between chapters
      this.showCheckpoint();
      return;
    }
    const scene = scenes[this.state.sceneIndex];
    const el = document.getElementById('adventure-scene');

    document.getElementById('adv-score').textContent = this.state.score;
    document.getElementById('adv-chapter').textContent = (this.state.chapter + 1) + '/' + GAME_DATA.adventure.length;
    document.getElementById('adv-trust').style.width = Math.max(0, Math.min(100, this.state.trust)) + '%';

    // Route to appropriate renderer based on scene type
    if (scene.type === 'tree-trace') {
      this.renderTreeTrace(scene, el);
    } else if (scene.type === 'shap-build') {
      this.renderShapBuild(scene, el);
    } else if (scene.type === 'feedback-loop') {
      this.renderFeedbackLoop(scene, el);
    } else if (scene.type === 'lime-highlight') {
      this.renderLimeHighlight(scene, el);
    } else if (scene.type === 'spot-bias') {
      this.renderSpotBias(scene, el);
    } else {
      this.renderMCQScene(scene, el);
    }
    this.state.answering = false;
  },

  showCheckpoint() {
    const el = document.getElementById('adventure-scene');
    const chapter = GAME_DATA.adventure[this.state.chapter];
    const correctInChapter = this.state.correct; // approximate
    el.innerHTML = `
      <div class="checkpoint">
        <div class="checkpoint-icon">&#x1F3C1;</div>
        <h3>Chapter ${this.state.chapter + 1} Complete!</h3>
        <p class="checkpoint-title">${this.escapeHtml(chapter.title)}</p>
        <div class="checkpoint-stats">
          <div class="result-stat"><div class="label">Score</div><div class="value">${this.state.score}</div></div>
          <div class="result-stat"><div class="label">Trust Level</div><div class="value">${this.state.trust}%</div></div>
          <div class="result-stat"><div class="label">Combo</div><div class="value">x${this.state.combo}</div></div>
        </div>
        <button class="btn btn-primary" onclick="Game.advanceChapter()">Continue to Next Chapter</button>
      </div>
    `;
    Effects.starBurst(window.innerWidth / 2, window.innerHeight / 3, 25);
  },

  advanceChapter() {
    this.state.chapter++;
    this.state.sceneIndex = 0;
    this.renderAdventureScene();
  },

  renderMCQScene(scene, el) {
    const letters = ['A', 'B', 'C', 'D'];
    // Shuffle choices while tracking the correct answer's new index
    const indices = scene.choices.map((_, i) => i);
    this.shuffleArray(indices);
    this._advCorrectIdx = indices.indexOf(scene.correct);
    this._advChoiceMap = indices;
    let choicesHTML = indices.map((origIdx, i) =>
      `<button class="btn-choice" onclick="Game.answerAdventure(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(scene.choices[origIdx])}
      </button>`
    ).join('');

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="scene-question">
        <p style="font-weight:600; margin-bottom:12px;">${this.escapeHtml(scene.question)}</p>
      </div>
      <div id="adv-powerups"></div>
      <div class="scene-choices" id="adv-choices">${choicesHTML}</div>
    `;
    this.renderPowerups('adv-powerups');
  },

  // === INTERACTIVE: Decision Tree Tracer ===
  renderTreeTrace(scene, el) {
    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="tree-trace-container">
        <div class="tree-patient-info">
          <h4>Patient Values:</h4>
          ${Object.entries(scene.patientValues).map(([k, v]) =>
            `<span class="patient-chip"><code>${this.escapeHtml(k)}</code> = ${this.escapeHtml(String(v))}</span>`
          ).join('')}
        </div>
        <div class="tree-visual" id="tree-visual"></div>
        <div class="tree-path-display">
          <span class="tree-path-label">Your path:</span>
          <div id="tree-path-chips"></div>
        </div>
        <p class="tree-instruction">Click the nodes to trace the correct path through the tree!</p>
      </div>
    `;
    this.treeState = {
      nodes: scene.treeNodes,
      correctPath: scene.correctPath,
      currentStep: 0,
      mistakes: 0,
      patientValues: scene.patientValues
    };
    this.renderTreeNodes(scene.treeNodes);
  },

  renderTreeNodes(nodes) {
    const container = document.getElementById('tree-visual');
    if (!container) return;
    container.innerHTML = nodes.map((node, i) => {
      const isLeaf = node.type === 'leaf';
      const depthClass = `tree-depth-${node.depth || 0}`;
      const leafClass = isLeaf ? (node.prediction === 'Disease' ? 'tree-node-disease' : 'tree-node-healthy') : '';
      return `<div class="tree-node-box ${depthClass} ${leafClass} ${i === 0 ? 'tree-node-active' : ''}"
                   id="tree-node-${i}" onclick="Game.clickTreeNode(${i})"
                   style="margin-left:${(node.depth || 0) * 30}px">
        <span class="tree-node-label">${this.escapeHtml(node.label)}</span>
        ${!isLeaf ? `<span class="tree-node-condition">${this.escapeHtml(node.condition || '')}</span>` : ''}
      </div>`;
    }).join('');
  },

  clickTreeNode(idx) {
    if (this.state.answering) return;
    const node = this.treeState.nodes[idx];
    const expectedIdx = this.treeState.correctPath[this.treeState.currentStep];

    if (idx === expectedIdx) {
      // Correct node clicked
      const el = document.getElementById(`tree-node-${idx}`);
      el.classList.add('tree-node-visited');
      el.classList.remove('tree-node-active');

      // Add to path chips
      const chips = document.getElementById('tree-path-chips');
      const chip = document.createElement('span');
      chip.className = 'path-chip correct';
      chip.textContent = node.label;
      chips.appendChild(chip);

      Effects.burst(el, '#00e676', 12);
      Effects.ripple(el, '#00e676');

      this.treeState.currentStep++;

      // Highlight next expected node
      const nextIdx = this.treeState.correctPath[this.treeState.currentStep];
      if (nextIdx !== undefined) {
        const nextEl = document.getElementById(`tree-node-${nextIdx}`);
        if (nextEl) nextEl.classList.add('tree-node-active');
      }

      // Check if path complete
      if (this.treeState.currentStep >= this.treeState.correctPath.length) {
        this.state.answering = true;
        this.state.total++;
        this.state.correct++;
        const points = this.treeState.mistakes === 0 ? 200 : 100;
        this.state.score += points;
        this.awardXP(25);
        this.handleCombo(true);
        this.showToast('correct', `Path complete! +${points}`);

        const container = document.querySelector('.tree-trace-container');
        const feedback = document.createElement('div');
        feedback.className = 'scene-feedback correct';
        const lastNode = this.treeState.nodes[idx];
        feedback.innerHTML = `<strong>Perfect trace!</strong><div class="explanation">${this.escapeHtml(lastNode.type === 'leaf' ? `The patient reaches: ${lastNode.prediction}. ${lastNode.explanation || ''}` : '')}</div>`;
        container.appendChild(feedback);
        const cont = document.createElement('div');
        cont.className = 'scene-continue';
        cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
        container.appendChild(cont);
      }
    } else {
      // Wrong node
      const el = document.getElementById(`tree-node-${idx}`);
      el.classList.add('tree-node-wrong');
      setTimeout(() => el.classList.remove('tree-node-wrong'), 600);
      Effects.shake(4, 300);
      this.treeState.mistakes++;
      this.showToast('incorrect', 'Wrong node! Try again.');
    }
  },

  // === INTERACTIVE: SHAP Force Plot Builder ===
  renderShapBuild(scene, el) {
    this.shapState = {
      features: this.shuffleArray([...scene.features]),
      placed: [],
      basePrediction: scene.basePrediction,
      targetPrediction: scene.targetPrediction,
      currentPrediction: scene.basePrediction,
      explanation: scene.explanation || 'Each SHAP value shows how much a feature pushes the prediction up or down from the base rate. The final prediction is the sum of all contributions.'
    };

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="shap-build-container">
        <div class="shap-prediction-display">
          <span class="shap-label">Current Prediction:</span>
          <span class="shap-value" id="shap-current">${scene.basePrediction.toFixed(2)}</span>
          <span class="shap-target">Target: ${scene.targetPrediction.toFixed(2)}</span>
        </div>
        <div class="shap-number-line" id="shap-line">
          <div class="shap-marker" id="shap-marker" style="left:${scene.basePrediction * 100}%"></div>
          <div class="shap-target-marker" style="left:${scene.targetPrediction * 100}%"></div>
        </div>
        <div class="shap-waterfall" id="shap-waterfall"></div>
        <p class="shap-instruction">Drag features to the force plot. Red features push risk UP, blue push it DOWN.</p>
        <div class="shap-chips" id="shap-chips">
          ${this.shapState.features.map((f, i) =>
            `<div class="shap-chip ${f.shapValue >= 0 ? 'shap-chip-pos' : 'shap-chip-neg'}"
                  draggable="true" id="shap-feat-${i}"
                  ondragstart="Game.shapDragStart(event, ${i})"
                  onclick="Game.shapClickPlace(${i})">
              <span class="shap-feat-name">${this.escapeHtml(f.name)}</span>
              <span class="shap-feat-val">${f.shapValue >= 0 ? '+' : ''}${f.shapValue.toFixed(2)}</span>
            </div>`
          ).join('')}
        </div>
      </div>
    `;
  },

  shapDragStart(event, idx) {
    event.dataTransfer.setData('text/plain', idx);
  },

  shapClickPlace(idx) {
    if (this.state.answering) return;
    const feat = this.shapState.features[idx];
    if (this.shapState.placed.includes(idx)) return;

    this.shapState.placed.push(idx);
    this.shapState.currentPrediction += feat.shapValue;

    // Update visual
    const chip = document.getElementById(`shap-feat-${idx}`);
    chip.classList.add('shap-chip-placed');
    chip.style.pointerEvents = 'none';

    // Update waterfall
    const waterfall = document.getElementById('shap-waterfall');
    const bar = document.createElement('div');
    bar.className = `shap-waterfall-bar ${feat.shapValue >= 0 ? 'shap-bar-pos' : 'shap-bar-neg'}`;
    bar.innerHTML = `<span>${this.escapeHtml(feat.name)}</span><span>${feat.shapValue >= 0 ? '+' : ''}${feat.shapValue.toFixed(2)}</span>`;
    bar.style.width = `${Math.abs(feat.shapValue) * 300}px`;
    waterfall.appendChild(bar);

    // Update prediction marker
    const marker = document.getElementById('shap-marker');
    const current = document.getElementById('shap-current');
    marker.style.left = `${Math.max(0, Math.min(100, this.shapState.currentPrediction * 100))}%`;
    current.textContent = this.shapState.currentPrediction.toFixed(2);

    Effects.burst(chip, feat.shapValue >= 0 ? '#ff5252' : '#4e8cff', 8);

    // Check if all placed
    if (this.shapState.placed.length === this.shapState.features.length) {
      this.state.answering = true;
      this.state.total++;
      const diff = Math.abs(this.shapState.currentPrediction - this.shapState.targetPrediction);
      const isClose = diff < 0.03;

      if (isClose) {
        this.state.correct++;
        this.state.score += 250;
        this.awardXP(30);
        this.handleCombo(true);
        this.showToast('correct', 'Force plot built! +250');
        Effects.starBurst(window.innerWidth / 2, window.innerHeight / 2, 20);
      } else {
        this.handleCombo(false);
        this.showToast('incorrect', `Off by ${diff.toFixed(2)}`);
      }

      const container = document.querySelector('.shap-build-container');
      const feedback = document.createElement('div');
      feedback.className = `scene-feedback ${isClose ? 'correct' : 'incorrect'}`;
      feedback.innerHTML = `<strong>${isClose ? 'Great job!' : 'Close!'}</strong>
        <div class="explanation">${this.escapeHtml(this.shapState.explanation)}</div>`;
      container.appendChild(feedback);
      const cont = document.createElement('div');
      cont.className = 'scene-continue';
      cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
      container.appendChild(cont);
    }
  },

  // === INTERACTIVE: Feedback Loop Breaker ===
  renderFeedbackLoop(scene, el) {
    this.loopState = { stages: scene.stages, correctBreak: scene.correctBreak, broken: false };

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="feedback-loop-container">
        <div class="loop-ring" id="loop-ring">
          ${scene.stages.map((s, i) => {
            const angle = (i / scene.stages.length) * Math.PI * 2 - Math.PI / 2;
            const x = 50 + 35 * Math.cos(angle);
            const y = 50 + 35 * Math.sin(angle);
            return `<div class="loop-stage" style="left:${x}%;top:${y}%" id="loop-stage-${i}">
              <span>${this.escapeHtml(s)}</span>
            </div>`;
          }).join('')}
          ${scene.stages.map((s, i) => {
            const nextI = (i + 1) % scene.stages.length;
            return `<div class="loop-arrow" id="loop-arrow-${i}" onclick="Game.breakLoop(${i})">
              <span class="loop-break-btn" title="Break here">&#x2702;</span>
            </div>`;
          }).join('')}
          <div class="loop-flow-indicator" id="loop-flow">&#x27F3;</div>
        </div>
        <p class="loop-instruction">The feedback loop is amplifying bias! Click the scissors &#x2702; on the connection you'd break to stop it.</p>
      </div>
    `;
  },

  breakLoop(connectionIdx) {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const isCorrect = connectionIdx === this.loopState.correctBreak;
    const arrow = document.getElementById(`loop-arrow-${connectionIdx}`);

    if (isCorrect) {
      this.state.correct++;
      this.state.score += 200;
      this.awardXP(25);
      this.handleCombo(true);
      arrow.classList.add('loop-arrow-broken');
      document.getElementById('loop-flow').classList.add('loop-stopped');
      this.showToast('correct', 'Loop broken! +200');
      Effects.burst(arrow, '#00e676', 15);
    } else {
      this.handleCombo(false);
      arrow.classList.add('loop-arrow-wrong');
      document.getElementById('loop-flow').classList.add('loop-faster');
      this.showToast('incorrect', 'Loop accelerated!');
      Effects.shake(8, 500);
      // Show correct one
      setTimeout(() => {
        const correctArrow = document.getElementById(`loop-arrow-${this.loopState.correctBreak}`);
        if (correctArrow) correctArrow.classList.add('loop-arrow-broken');
        document.getElementById('loop-flow').classList.remove('loop-faster');
        document.getElementById('loop-flow').classList.add('loop-stopped');
      }, 1000);
    }

    const container = document.querySelector('.feedback-loop-container');
    const feedback = document.createElement('div');
    feedback.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Not quite.'}</strong>
      <div class="explanation">${this.escapeHtml(GAME_DATA.adventure[this.state.chapter].scenes[this.state.sceneIndex].explanation || '')}</div>`;
    container.appendChild(feedback);
    const cont = document.createElement('div');
    cont.className = 'scene-continue';
    cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
    container.appendChild(cont);
  },

  // === INTERACTIVE: LIME Word Highlighter ===
  renderLimeHighlight(scene, el) {
    this.limeState = { words: scene.words, correctIndices: new Set(scene.highlightIndices), selected: new Set() };

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="lime-container">
        <div class="lime-message-label">Message classified as: <strong class="lime-spam">SPAM</strong></div>
        <div class="lime-message" id="lime-message">
          ${scene.words.map((w, i) =>
            `<span class="lime-word" id="lime-word-${i}" onclick="Game.toggleLimeWord(${i})">${this.escapeHtml(w)}</span>`
          ).join(' ')}
        </div>
        <p class="lime-instruction">Click the words you think LIME identifies as pushing toward SPAM. Then submit!</p>
        <button class="btn btn-primary" id="lime-submit" onclick="Game.submitLimeHighlight()">Check My Selection</button>
      </div>
    `;
  },

  toggleLimeWord(idx) {
    if (this.state.answering) return;
    const el = document.getElementById(`lime-word-${idx}`);
    if (this.limeState.selected.has(idx)) {
      this.limeState.selected.delete(idx);
      el.classList.remove('lime-word-selected');
    } else {
      this.limeState.selected.add(idx);
      el.classList.add('lime-word-selected');
    }
  },

  submitLimeHighlight() {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const correct = this.limeState.correctIndices;
    const selected = this.limeState.selected;
    let hits = 0;
    for (const idx of selected) {
      if (correct.has(idx)) hits++;
    }
    const precision = selected.size > 0 ? hits / selected.size : 0;
    const recall = correct.size > 0 ? hits / correct.size : 0;
    const f1 = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    // Show correct highlights
    for (const idx of correct) {
      document.getElementById(`lime-word-${idx}`).classList.add('lime-word-correct');
    }
    for (const idx of selected) {
      if (!correct.has(idx)) {
        document.getElementById(`lime-word-${idx}`).classList.add('lime-word-wrong');
      }
    }

    const isGood = f1 >= 0.5;
    if (isGood) {
      this.state.correct++;
      const points = Math.round(f1 * 250);
      this.state.score += points;
      this.awardXP(20);
      this.handleCombo(true);
      this.showToast('correct', `${Math.round(f1 * 100)}% match! +${points}`);
    } else {
      this.handleCombo(false);
      this.showToast('incorrect', `Only ${Math.round(f1 * 100)}% match`);
    }

    document.getElementById('lime-submit').disabled = true;
    const scene = GAME_DATA.adventure[this.state.chapter].scenes[this.state.sceneIndex];
    const container = document.querySelector('.lime-container');
    const feedback = document.createElement('div');
    feedback.className = `scene-feedback ${isGood ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<strong>${isGood ? 'Good eye!' : 'Review the highlights above.'}</strong>
      <div class="explanation">${this.escapeHtml(scene.explanation || '')}</div>`;
    container.appendChild(feedback);
    const cont = document.createElement('div');
    cont.className = 'scene-continue';
    cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
    container.appendChild(cont);
  },

  // === INTERACTIVE: Spot the Bias ===
  renderSpotBias(scene, el) {
    this.biasState = { correctCells: new Set(scene.biasCells), selected: new Set() };

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="bias-container">
        <table class="bias-table">
          <thead><tr>${scene.columns.map(c => `<th>${this.escapeHtml(c)}</th>`).join('')}</tr></thead>
          <tbody>
            ${scene.rows.map((row, ri) =>
              `<tr>${row.map((cell, ci) =>
                `<td class="bias-cell" id="bias-${ri}-${ci}" onclick="Game.toggleBiasCell(${ri},${ci})">${this.escapeHtml(String(cell))}</td>`
              ).join('')}</tr>`
            ).join('')}
          </tbody>
        </table>
        <p class="bias-instruction">Click the cells that show evidence of bias in this dataset. Then submit!</p>
        <button class="btn btn-primary" onclick="Game.submitSpotBias()">Check Selection</button>
      </div>
    `;
  },

  toggleBiasCell(ri, ci) {
    if (this.state.answering) return;
    const key = `${ri}-${ci}`;
    const el = document.getElementById(`bias-${ri}-${ci}`);
    if (this.biasState.selected.has(key)) {
      this.biasState.selected.delete(key);
      el.classList.remove('bias-cell-selected');
    } else {
      this.biasState.selected.add(key);
      el.classList.add('bias-cell-selected');
    }
  },

  submitSpotBias() {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const correct = this.biasState.correctCells;
    const selected = this.biasState.selected;
    let hits = 0;
    for (const key of selected) { if (correct.has(key)) hits++; }

    for (const key of correct) {
      const [r, c] = key.split('-');
      document.getElementById(`bias-${r}-${c}`).classList.add('bias-cell-correct');
    }

    const isGood = hits >= correct.size * 0.6;
    if (isGood) {
      this.state.correct++;
      this.state.score += 200;
      this.awardXP(25);
      this.handleCombo(true);
      this.showToast('correct', 'Bias detected! +200');
    } else {
      this.handleCombo(false);
      this.showToast('incorrect', 'Missed some bias patterns');
    }

    const scene = GAME_DATA.adventure[this.state.chapter].scenes[this.state.sceneIndex];
    const container = document.querySelector('.bias-container');
    const feedback = document.createElement('div');
    feedback.className = `scene-feedback ${isGood ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<strong>${isGood ? 'Well spotted!' : 'Look at the highlighted cells.'}</strong>
      <div class="explanation">${this.escapeHtml(scene.explanation || '')}</div>`;
    container.appendChild(feedback);
    const cont = document.createElement('div');
    cont.className = 'scene-continue';
    cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
    container.appendChild(cont);
  },

  answerAdventure(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const chapter = GAME_DATA.adventure[this.state.chapter];
    const scene = chapter.scenes[this.state.sceneIndex];
    const correctIdx = this._advCorrectIdx != null ? this._advCorrectIdx : scene.correct;
    const isCorrect = idx === correctIdx;
    this.state.total++;

    const buttons = document.querySelectorAll('#adv-choices .btn-choice');
    const clickedBtn = buttons[idx];

    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === correctIdx) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.handleCombo(true);
      const points = 100 * (1 + Math.floor(this.state.combo / 3) * 0.5);
      this.state.score += points;
      this.state.trust = Math.min(100, this.state.trust + (scene.trustDelta || 10));
      this.awardXP(20);
      this.showToast('correct', `+${points} points!`);
      Effects.burst(clickedBtn, '#00e676', 18);
      Effects.ripple(clickedBtn, '#00e676');
      Effects.flyup(`+${points}`, clickedBtn, '#00e676');
    } else {
      this.state.trust = Math.max(0, this.state.trust - 10);
      this.handleCombo(false);
      this.state.missed.push({ question: scene.question, correctAnswer: scene.choices[scene.correct] });
      this.showToast('incorrect', 'Not quite...');
      Effects.shake(6, 400);
      Effects.flashBorder('rgba(255,82,82,0.5)');
    }

    document.getElementById('adv-score').textContent = this.state.score;
    document.getElementById('adv-trust').style.width = Math.max(0, Math.min(100, this.state.trust)) + '%';

    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Not quite.'}</strong>
      <div class="explanation">${this.escapeHtml(scene.explanation)}</div>`;
    const continueDiv = document.createElement('div');
    continueDiv.className = 'scene-continue';
    continueDiv.innerHTML = '<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>';
    document.getElementById('adventure-scene').appendChild(feedbackDiv);
    document.getElementById('adventure-scene').appendChild(continueDiv);
  },

  nextAdventureScene() {
    this.state.sceneIndex++;
    this.renderAdventureScene();
  },

  handleCombo(correct) {
    if (correct) {
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      const msg = this.STREAK_MESSAGES[Math.min(this.state.combo, this.STREAK_MESSAGES.length - 1)];
      if (msg) {
        Effects.streakText(msg);
        if (this.state.combo >= 5) Effects.screenFlash('rgba(255,145,0,0.15)');
        if (this.state.combo >= 10) Effects.starBurst(window.innerWidth / 2, window.innerHeight / 2, 35);
      }
    } else {
      this.state.combo = 0;
    }
  },

  // === QUIZ BLITZ with mixed question types ===
  startQuizBlitz() {
    this.state.quizQuestions = this.shuffleArray([...GAME_DATA.quizQuestions]).slice(0, 20);
    this.state.quizQuestionIndex = 0;
    this.state.quizTimeLeft = 90;
    this.showScreen('screen-quiz');
    this.renderQuizQuestion();
    this.startQuizTimer();
  },

  startQuizTimer() {
    if (this.state.quizTimer) clearInterval(this.state.quizTimer);
    this.state.quizTimer = setInterval(() => {
      this.state.quizTimeLeft--;
      const timerEl = document.getElementById('quiz-timer');
      if (!timerEl) { clearInterval(this.state.quizTimer); return; }
      timerEl.textContent = this.state.quizTimeLeft;
      if (this.state.quizTimeLeft <= 10) {
        timerEl.classList.add('timer-urgent');
        Effects.flashBorder('rgba(255,82,82,0.2)');
      } else {
        timerEl.classList.remove('timer-urgent');
      }
      if (this.state.quizTimeLeft <= 0) {
        clearInterval(this.state.quizTimer);
        this.showResults();
      }
    }, 1000);
  },

  renderQuizQuestion() {
    if (this.state.autoAdvanceTimeout) { clearTimeout(this.state.autoAdvanceTimeout); this.state.autoAdvanceTimeout = null; }
    if (this.state.quizQuestionIndex >= this.state.quizQuestions.length) {
      clearInterval(this.state.quizTimer);
      this.showResults();
      return;
    }

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    document.getElementById('quiz-score').textContent = this.state.score;
    document.getElementById('quiz-combo').textContent = `x${Math.max(1, this.state.combo)}`;
    document.getElementById('quiz-qnum').textContent = `${this.state.quizQuestionIndex + 1}/${this.state.quizQuestions.length}`;
    const comboFill = document.getElementById('combo-fill');
    comboFill.style.width = `${Math.min(100, this.state.combo * 20)}%`;
    if (this.state.combo >= 3) comboFill.classList.add('combo-fire');
    else comboFill.classList.remove('combo-fire');

    // Route to appropriate renderer
    if (q.type === 'slider') {
      this.renderSliderQuestion(q);
    } else if (q.type === 'order') {
      this.renderOrderQuestion(q);
    } else if (q.type === 'rapid-tap') {
      this.renderRapidTapQuestion(q);
    } else {
      this.renderStandardQuizQuestion(q);
    }
    this.state.answering = false;
  },

  renderStandardQuizQuestion(q) {
    const letters = ['A', 'B', 'C', 'D'];
    const indices = q.choices.map((_, i) => i);
    this.shuffleArray(indices);
    this._quizCorrectIdx = indices.indexOf(q.correct);
    let choicesHTML = indices.map((origIdx, i) =>
      `<button class="btn-choice" onclick="Game.answerQuiz(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(q.choices[origIdx])}
      </button>`
    ).join('');

    document.getElementById('quiz-question').innerHTML = `
      <span class="question-category">${this.escapeHtml(q.category)}</span>
      <div class="question-text">${this.escapeHtml(q.question)}</div>
      <div id="quiz-powerups"></div>
      <div class="scene-choices" id="quiz-choices">${choicesHTML}</div>
    `;
    this.renderPowerups('quiz-powerups');
  },

  // === INTERACTIVE QUIZ: Slider ===
  renderSliderQuestion(q) {
    document.getElementById('quiz-question').innerHTML = `
      <span class="question-category">${this.escapeHtml(q.category)}</span>
      <div class="question-text">${this.escapeHtml(q.question)}</div>
      <div class="slider-container">
        <div class="slider-formula" id="slider-formula">${this.escapeHtml(q.displayFormula || '')}</div>
        <input type="range" class="slider-input" id="quiz-slider"
               min="${q.min}" max="${q.max}" step="${q.step || 0.01}"
               value="${(q.min + q.max) / 2}"
               oninput="Game.updateSlider(this.value)">
        <div class="slider-value" id="slider-value">${((q.min + q.max) / 2).toFixed(2)}</div>
        <button class="btn btn-primary" onclick="Game.submitSlider()">Lock In</button>
      </div>
    `;
  },

  updateSlider(val) {
    document.getElementById('slider-value').textContent = parseFloat(val).toFixed(2);
  },

  submitSlider() {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    const val = parseFloat(document.getElementById('quiz-slider').value);
    const isCorrect = val >= q.correctRange[0] && val <= q.correctRange[1];

    if (isCorrect) {
      this.state.correct++;
      this.handleCombo(true);
      const multiplier = Math.max(1, this.state.combo);
      const points = 50 * multiplier;
      this.state.score += points;
      this.state.quizTimeLeft += 3;
      this.awardXP(10);
      this.showToast('correct', `+${points}`);
      Effects.screenFlash('rgba(0,230,118,0.15)');
    } else {
      this.handleCombo(false);
      this.state.missed.push({ question: q.question, correctAnswer: `Range: ${q.correctRange[0]}-${q.correctRange[1]}` });
      this.showToast('incorrect', 'Not in range!');
      Effects.shake(4, 300);
    }

    document.getElementById('quiz-score').textContent = this.state.score;
    const el = document.getElementById('quiz-question');
    const fb = document.createElement('div');
    fb.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    fb.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong><div class="explanation">${this.escapeHtml(q.explanation)}</div>`;
    el.appendChild(fb);

    this.state.autoAdvanceTimeout = setTimeout(() => { this.state.quizQuestionIndex++; this.renderQuizQuestion(); }, 2200);
  },

  // === INTERACTIVE QUIZ: Ordering ===
  renderOrderQuestion(q) {
    const shuffled = this.shuffleArray([...q.items]);
    this.orderState = { items: shuffled, correctOrder: q.correctOrder };

    document.getElementById('quiz-question').innerHTML = `
      <span class="question-category">${this.escapeHtml(q.category)}</span>
      <div class="question-text">${this.escapeHtml(q.question)}</div>
      <div class="order-container" id="order-container">
        ${shuffled.map((item, i) =>
          `<div class="order-item" draggable="true" id="order-item-${i}"
                ondragstart="Game.orderDragStart(event, ${i})"
                ondragover="Game.orderDragOver(event)"
                ondrop="Game.orderDrop(event, ${i})">
            <span class="order-handle">&#x2630;</span>
            <span>${this.escapeHtml(item)}</span>
          </div>`
        ).join('')}
      </div>
      <button class="btn btn-primary" onclick="Game.submitOrder()">Lock In Order</button>
    `;
  },

  orderDragStart(event, idx) {
    event.dataTransfer.setData('text/plain', idx);
    event.target.classList.add('order-dragging');
    event.target.addEventListener('dragend', () => event.target.classList.remove('order-dragging'), { once: true });
  },

  orderDragOver(event) {
    event.preventDefault();
  },

  orderDrop(event, targetIdx) {
    event.preventDefault();
    const sourceIdx = parseInt(event.dataTransfer.getData('text/plain'), 10);
    if (sourceIdx === targetIdx) return;

    // Swap items
    const temp = this.orderState.items[sourceIdx];
    this.orderState.items[sourceIdx] = this.orderState.items[targetIdx];
    this.orderState.items[targetIdx] = temp;

    // Re-render
    const container = document.getElementById('order-container');
    container.innerHTML = this.orderState.items.map((item, i) =>
      `<div class="order-item" draggable="true" id="order-item-${i}"
            ondragstart="Game.orderDragStart(event, ${i})"
            ondragover="Game.orderDragOver(event)"
            ondrop="Game.orderDrop(event, ${i})">
        <span class="order-handle">&#x2630;</span>
        <span>${this.escapeHtml(item)}</span>
      </div>`
    ).join('');
  },

  submitOrder() {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    let correctCount = 0;
    this.orderState.items.forEach((item, i) => {
      const el = document.getElementById(`order-item-${i}`);
      if (item === this.orderState.correctOrder[i]) {
        el.classList.add('order-correct');
        correctCount++;
      } else {
        el.classList.add('order-wrong');
      }
    });

    const isCorrect = correctCount === this.orderState.correctOrder.length;
    if (isCorrect) {
      this.state.correct++;
      this.handleCombo(true);
      const points = 50 * Math.max(1, this.state.combo);
      this.state.score += points;
      this.state.quizTimeLeft += 3;
      this.awardXP(10);
      this.showToast('correct', `+${points}`);
    } else {
      this.handleCombo(false);
      this.state.missed.push({ question: q.question, correctAnswer: this.orderState.correctOrder.join(' > ') });
      this.showToast('incorrect', `${correctCount}/${this.orderState.correctOrder.length} correct`);
    }

    document.getElementById('quiz-score').textContent = this.state.score;
    this.state.autoAdvanceTimeout = setTimeout(() => { this.state.quizQuestionIndex++; this.renderQuizQuestion(); }, 2200);
  },

  // === INTERACTIVE QUIZ: Rapid Tap ===
  renderRapidTapQuestion(q) {
    this.tapState = { items: q.items, tapped: new Set(), tapTimer: null, timeLeft: q.timeLimit || 8 };

    document.getElementById('quiz-question').innerHTML = `
      <span class="question-category">${this.escapeHtml(q.category)}</span>
      <div class="question-text">${this.escapeHtml(q.question)}</div>
      <div class="tap-timer">Time: <span id="tap-timer">${this.tapState.timeLeft}</span>s</div>
      <div class="tap-arena" id="tap-arena">
        ${q.items.map((item, i) => {
          const x = 10 + Math.random() * 70;
          const y = 10 + Math.random() * 70;
          return `<div class="tap-bubble" id="tap-bubble-${i}"
                       style="left:${x}%;top:${y}%"
                       onclick="Game.tapBubble(${i})">
            ${this.escapeHtml(item.text)}
          </div>`;
        }).join('')}
      </div>
    `;

    // Pause quiz timer during rapid-tap to avoid double-timer race
    if (this.state.quizTimer) clearInterval(this.state.quizTimer);

    // Start tap timer
    this.tapState.tapTimer = setInterval(() => {
      this.tapState.timeLeft--;
      const tel = document.getElementById('tap-timer');
      if (tel) tel.textContent = this.tapState.timeLeft;
      if (this.tapState.timeLeft <= 0) {
        clearInterval(this.tapState.tapTimer);
        this.finishRapidTap();
      }
    }, 1000);
  },

  tapBubble(idx) {
    if (this.state.answering || this.tapState.tapped.has(idx)) return;
    this.tapState.tapped.add(idx);

    const item = this.tapState.items[idx];
    const el = document.getElementById(`tap-bubble-${idx}`);

    if (item.isCorrect) {
      el.classList.add('tap-correct');
      Effects.burst(el, '#00e676', 10);
    } else {
      el.classList.add('tap-wrong');
      Effects.shake(3, 200);
      this.tapState.timeLeft = Math.max(0, this.tapState.timeLeft - 1);
    }
  },

  finishRapidTap() {
    if (this.state.answering) return; // Prevent double-fire from race
    if (this.state.mode !== 'quiz-blitz') return; // Guard against mode change
    if (this.tapState && this.tapState.tapTimer) clearInterval(this.tapState.tapTimer);
    // Resume quiz timer
    this.startQuizTimer();
    this.state.answering = true;
    this.state.total++;

    const items = this.tapState.items;
    let correctTapped = 0, wrongTapped = 0, totalCorrect = 0;
    items.forEach((item, i) => {
      if (item.isCorrect) {
        totalCorrect++;
        if (this.tapState.tapped.has(i)) correctTapped++;
      } else {
        if (this.tapState.tapped.has(i)) wrongTapped++;
      }
    });

    const score = Math.max(0, correctTapped - wrongTapped);
    const isGood = score >= totalCorrect * 0.6;

    if (isGood) {
      this.state.correct++;
      this.handleCombo(true);
      const points = 50 * Math.max(1, this.state.combo);
      this.state.score += points;
      this.state.quizTimeLeft += 3;
      this.awardXP(10);
      this.showToast('correct', `+${points}`);
    } else {
      this.handleCombo(false);
      this.showToast('incorrect', `${correctTapped}/${totalCorrect} found`);
    }

    // Show which were correct
    items.forEach((item, i) => {
      const el = document.getElementById(`tap-bubble-${i}`);
      if (item.isCorrect && !this.tapState.tapped.has(i)) el.classList.add('tap-missed');
    });

    document.getElementById('quiz-score').textContent = this.state.score;
    this.state.autoAdvanceTimeout = setTimeout(() => { this.state.quizQuestionIndex++; this.renderQuizQuestion(); }, 2500);
  },

  answerQuiz(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    const correctIdx = this._quizCorrectIdx != null ? this._quizCorrectIdx : q.correct;
    const isCorrect = idx === correctIdx;
    this.state.total++;

    const buttons = document.querySelectorAll('#quiz-choices .btn-choice');
    const clickedBtn = buttons[idx];
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === correctIdx) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.handleCombo(true);
      const multiplier = Math.max(1, this.state.combo);
      const points = 50 * multiplier;
      this.state.score += points;
      this.state.quizTimeLeft += 3;
      this.awardXP(10);
      this.showToast(this.state.combo >= 5 ? 'combo' : 'correct', `${this.state.combo >= 5 ? 'COMBO x' + this.state.combo + '! ' : ''}+${points}`);
      Effects.burst(clickedBtn, '#00e676', 15);
      Effects.flyup(`+${points}`, clickedBtn);
    } else {
      this.handleCombo(false);
      this.state.missed.push({ question: q.question, correctAnswer: q.choices[q.correct] });
      this.showToast('incorrect', 'Combo lost!');
      Effects.shake(4, 300);
    }

    document.getElementById('quiz-score').textContent = this.state.score;
    document.getElementById('quiz-combo').textContent = `x${Math.max(1, this.state.combo)}`;

    const explanationDiv = document.createElement('div');
    explanationDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    explanationDiv.style.marginTop = '16px';
    explanationDiv.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong>
      <div class="explanation">${this.escapeHtml(q.explanation)}</div>`;
    document.getElementById('quiz-question').appendChild(explanationDiv);

    this.state.autoAdvanceTimeout = setTimeout(() => { this.state.quizQuestionIndex++; this.renderQuizQuestion(); }, 2200);
  },

  // === SCENARIO LAB ===
  renderScenario() {
    const scenarios = GAME_DATA.scenarios;
    if (this.state.scenarioIndex >= scenarios.length) {
      this.showResults();
      return;
    }
    const scenario = scenarios[this.state.scenarioIndex];
    document.getElementById('scenario-score').textContent = this.state.score;
    document.getElementById('scenario-num').textContent = `${this.state.scenarioIndex + 1}/${scenarios.length}`;

    if (scenario.type === 'matching') this.renderMatchingScenario(scenario);
    else if (scenario.type === 'scale') this.renderScaleScenario(scenario);
    else this.renderQuestionScenario(scenario);
  },

  renderQuestionScenario(scenario) {
    const q = scenario.questions[this.state.scenarioQIndex];
    if (!q) { this.state.scenarioIndex++; this.state.scenarioQIndex = 0; this.renderScenario(); return; }
    const letters = ['A', 'B', 'C', 'D'];
    const indices = q.choices.map((_, i) => i);
    this.shuffleArray(indices);
    this._scenarioCorrectIdx = indices.indexOf(q.correct);
    let choicesHTML = indices.map((origIdx, i) =>
      `<button class="btn-choice" onclick="Game.answerScenario(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(q.choices[origIdx])}
      </button>`
    ).join('');

    document.getElementById('scenario-content').innerHTML = `
      <h3 style="color: var(--accent-cyan); margin-bottom:8px;">${this.escapeHtml(scenario.title)}</h3>
      <p style="color: var(--text-secondary); margin-bottom:16px;">${this.escapeHtml(scenario.description)}</p>
      ${scenario.visual || ''}
      <div style="margin-top:20px;">
        <p style="font-weight:600; margin-bottom:12px;">Question ${this.state.scenarioQIndex + 1} of ${scenario.questions.length}: ${this.escapeHtml(q.question)}</p>
        <div class="scene-choices" id="scenario-choices">${choicesHTML}</div>
      </div>
    `;
    this.state.answering = false;
  },

  // === INTERACTIVE SCENARIO: Fairness Scale ===
  renderScaleScenario(scenario) {
    this.scaleState = { alpha: scenario.alpha, groupA: 50, groupB: 50 };

    document.getElementById('scenario-content').innerHTML = `
      <h3 style="color: var(--accent-cyan); margin-bottom:8px;">${this.escapeHtml(scenario.title)}</h3>
      <p style="color: var(--text-secondary); margin-bottom:16px;">${this.escapeHtml(scenario.description)}</p>
      <div class="scale-container">
        <div class="scale-visual">
          <div class="scale-beam" id="scale-beam">
            <div class="scale-pan scale-pan-left">
              <div class="scale-bar-fill" id="scale-bar-a" style="height:50%"></div>
              <span class="scale-group-label">Group A</span>
              <span class="scale-rate" id="scale-rate-a">50%</span>
            </div>
            <div class="scale-fulcrum"></div>
            <div class="scale-pan scale-pan-right">
              <div class="scale-bar-fill" id="scale-bar-b" style="height:50%"></div>
              <span class="scale-group-label">Group B</span>
              <span class="scale-rate" id="scale-rate-b">50%</span>
            </div>
          </div>
          <div class="scale-alpha-zone">
            <span>Alpha threshold: ${scenario.alpha}</span>
            <span class="scale-diff" id="scale-diff">Difference: 0.00</span>
            <span class="scale-verdict" id="scale-verdict">Not biased</span>
          </div>
        </div>
        <div class="scale-controls">
          <label>Group A rate: <input type="range" min="0" max="100" value="50" oninput="Game.updateScale('a', this.value)"></label>
          <label>Group B rate: <input type="range" min="0" max="100" value="50" oninput="Game.updateScale('b', this.value)"></label>
        </div>
        <div class="scale-challenge">
          <p><strong>Challenge:</strong> ${this.escapeHtml(scenario.challenge)}</p>
          <div class="scale-choices" id="scale-choices">
            ${scenario.choices.map((c, i) =>
              `<button class="btn-choice" onclick="Game.answerScale(${i})">
                <span class="choice-letter">${['A','B','C','D'][i]}</span>${this.escapeHtml(c)}
              </button>`
            ).join('')}
          </div>
        </div>
      </div>
    `;
    this.state.answering = false;
  },

  updateScale(group, val) {
    const v = parseInt(val, 10);
    if (group === 'a') this.scaleState.groupA = v;
    else this.scaleState.groupB = v;

    document.getElementById(`scale-bar-${group}`).style.height = `${v}%`;
    document.getElementById(`scale-rate-${group}`).textContent = `${v}%`;

    const diff = Math.abs(this.scaleState.groupA - this.scaleState.groupB) / 100;
    const isBiased = diff >= this.scaleState.alpha;
    document.getElementById('scale-diff').textContent = `Difference: ${diff.toFixed(2)}`;
    const verdict = document.getElementById('scale-verdict');
    verdict.textContent = isBiased ? 'BIASED' : 'Not biased';
    verdict.className = `scale-verdict ${isBiased ? 'scale-biased' : 'scale-fair'}`;

    // Tilt the beam
    const beam = document.getElementById('scale-beam');
    const tilt = (this.scaleState.groupA - this.scaleState.groupB) * 0.1;
    beam.style.transform = `rotate(${Math.max(-8, Math.min(8, tilt))}deg)`;
  },

  answerScale(idx) {
    if (this.state.answering) return;
    this.state.answering = true;
    this.state.total++;

    const scenario = GAME_DATA.scenarios[this.state.scenarioIndex];
    const isCorrect = idx === scenario.correct;
    const buttons = document.querySelectorAll('#scale-choices .btn-choice');
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === scenario.correct) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.score += 150;
      this.awardXP(25);
      this.handleCombo(true);
      this.showToast('correct', '+150 points!');
    } else {
      this.handleCombo(false);
      this.showToast('incorrect', 'Not quite...');
    }

    document.getElementById('scenario-score').textContent = this.state.score;
    const container = document.querySelector('.scale-container');
    const fb = document.createElement('div');
    fb.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    fb.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong><div class="explanation">${this.escapeHtml(scenario.explanation)}</div>`;
    container.appendChild(fb);
    const cont = document.createElement('div');
    cont.className = 'scene-continue';
    cont.innerHTML = '<button class="btn btn-primary" onclick="Game.nextScenarioQuestion()">Continue</button>';
    container.appendChild(cont);
  },

  answerScenario(idx) {
    if (this.state.answering) return;
    this.state.answering = true;
    const scenario = GAME_DATA.scenarios[this.state.scenarioIndex];
    const q = scenario.questions[this.state.scenarioQIndex];
    const correctIdx = this._scenarioCorrectIdx != null ? this._scenarioCorrectIdx : q.correct;
    const isCorrect = idx === correctIdx;
    this.state.total++;

    const buttons = document.querySelectorAll('#scenario-choices .btn-choice');
    const clickedBtn = buttons[idx];
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === correctIdx) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.score += 150;
      this.awardXP(25);
      this.handleCombo(true);
      this.showToast('correct', '+150 points!');
      Effects.burst(clickedBtn, '#00e676', 12);
    } else {
      this.handleCombo(false);
      this.state.missed.push({ question: q.question, correctAnswer: q.choices[q.correct] });
      this.showToast('incorrect', 'Not quite...');
      Effects.shake(4, 300);
    }

    document.getElementById('scenario-score').textContent = this.state.score;
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong><div class="explanation">${this.escapeHtml(q.explanation)}</div>`;
    const continueBtn = document.createElement('div');
    continueBtn.className = 'scene-continue';
    continueBtn.innerHTML = '<button class="btn btn-primary" onclick="Game.nextScenarioQuestion()">Continue</button>';
    document.getElementById('scenario-content').appendChild(feedbackDiv);
    document.getElementById('scenario-content').appendChild(continueBtn);
  },

  nextScenarioQuestion() {
    this.state.scenarioQIndex++;
    const scenario = GAME_DATA.scenarios[this.state.scenarioIndex];
    if (scenario.type !== 'matching' && scenario.type !== 'scale' && this.state.scenarioQIndex >= scenario.questions.length) {
      this.state.scenarioIndex++;
      this.state.scenarioQIndex = 0;
    } else if (scenario.type === 'matching' || scenario.type === 'scale') {
      this.state.scenarioIndex++;
      this.state.scenarioQIndex = 0;
    }
    this.renderScenario();
  },

  renderMatchingScenario(scenario) {
    const pairs = this.shuffleArray([...scenario.pairs]);
    const rightItems = this.shuffleArray(pairs.map(p => p.right));
    this.matchState = { pairs, rightItems, selectedLeft: null, matched: new Set(), matchedRight: new Set(), attempts: 0 };

    let leftHTML = pairs.map((p, i) =>
      `<div class="match-item" id="match-left-${i}" onclick="Game.selectMatchLeft(${i})">${this.escapeHtml(p.left)}</div>`
    ).join('');
    let rightHTML = rightItems.map((r, i) =>
      `<div class="match-item" id="match-right-${i}" onclick="Game.selectMatchRight(${i})">${this.escapeHtml(r)}</div>`
    ).join('');

    document.getElementById('scenario-content').innerHTML = `
      <h3 style="color: var(--accent-cyan); margin-bottom:8px;">${this.escapeHtml(scenario.title)}</h3>
      <p style="color: var(--text-secondary); margin-bottom:16px;">${this.escapeHtml(scenario.description)}</p>
      <p style="color: var(--text-dim); font-size:0.85rem; margin-bottom:16px;">Click a term on the left, then its matching definition on the right.</p>
      <div class="match-container">
        <div class="match-column"><h4>Terms</h4>${leftHTML}</div>
        <div class="match-column"><h4>Definitions</h4>${rightHTML}</div>
      </div>
    `;
  },

  selectMatchLeft(idx) {
    if (this.matchState.matched.has(idx)) return;
    document.querySelectorAll('.match-column:first-child .match-item').forEach(el => el.classList.remove('selected'));
    document.getElementById(`match-left-${idx}`).classList.add('selected');
    this.matchState.selectedLeft = idx;
  },

  selectMatchRight(idx) {
    if (this.matchState.selectedLeft === null) return;
    if (this.matchState.matchedRight && this.matchState.matchedRight.has(idx)) return;
    const leftIdx = this.matchState.selectedLeft;
    const pair = this.matchState.pairs[leftIdx];
    const selectedRight = this.matchState.rightItems[idx];
    this.matchState.attempts++;

    if (pair.right === selectedRight) {
      this.handleCombo(true);
      this.state.correct++;
      this.state.total++;
      this.state.score += 100;
      this.awardXP(15);
      this.matchState.matched.add(leftIdx);
      if (!this.matchState.matchedRight) this.matchState.matchedRight = new Set();
      this.matchState.matchedRight.add(idx);
      const leftEl = document.getElementById(`match-left-${leftIdx}`);
      const rightEl = document.getElementById(`match-right-${idx}`);
      leftEl.classList.remove('selected');
      leftEl.classList.add('matched');
      rightEl.classList.add('matched');
      this.matchState.selectedLeft = null;
      this.showToast('correct', '+100 match!');
      Effects.burst(rightEl, '#00e676', 10);
      document.getElementById('scenario-score').textContent = this.state.score;
      if (this.matchState.matched.size === this.matchState.pairs.length) {
        setTimeout(() => { this.state.scenarioIndex++; this.state.scenarioQIndex = 0; this.renderScenario(); }, 800);
      }
    } else {
      this.handleCombo(false);
      const rightEl = document.getElementById(`match-right-${idx}`);
      rightEl.classList.add('wrong');
      setTimeout(() => rightEl.classList.remove('wrong'), 500);
      this.showToast('incorrect', 'Try again!');
      Effects.shake(3, 200);
    }
  },

  // === BOSS BATTLE with weakness system ===
  renderBossBattle() {
    const bosses = this._shuffledBosses || GAME_DATA.bosses;
    if (this.state.bossIndex >= bosses.length) { this.showResults(); return; }

    const boss = bosses[this.state.bossIndex];
    if (this.state.bossAttackIndex >= boss.attacks.length) {
      // Boss defeated!
      this.state.badges.push(boss.name.includes('Dragon') ? 'dragonSlayer' : 'sphinxSolver');
      this.awardXP(100);
      this.showBossDefeat(boss);
      return;
    }

    const attack = boss.attacks[this.state.bossAttackIndex];
    const letters = ['A', 'B', 'C', 'D'];
    document.getElementById('boss-name').textContent = boss.name;
    this.updateBossHP();
    this.updatePlayerHP();

    // Boss idle animation intensity based on HP
    const bossArea = document.getElementById('boss-battle-area');
    bossArea.classList.remove('boss-desperate', 'boss-angry');
    if (this.state.bossHP <= 25) bossArea.classList.add('boss-desperate');
    else if (this.state.bossHP <= 50) bossArea.classList.add('boss-angry');

    // Shuffle answer choices for this attack
    const indices = attack.choices.map((_, i) => i);
    this.shuffleArray(indices);
    this._bossCorrectIdx = indices.indexOf(attack.correct);
    let choicesHTML = indices.map((origIdx, i) =>
      `<button class="btn-choice" onclick="Game.answerBoss(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(attack.choices[origIdx])}
      </button>`
    ).join('');

    bossArea.innerHTML = `
      <div class="boss-attack">
        <h3>${this.escapeHtml(attack.name)}</h3>
        <p>${this.escapeHtml(attack.description)}</p>
      </div>
      <div class="question-text" style="margin-bottom:16px;">${this.escapeHtml(attack.question)}</div>
      <div id="boss-powerups"></div>
      <div class="scene-choices" id="boss-choices">${choicesHTML}</div>
    `;
    this.renderPowerups('boss-powerups');
    this.state.answering = false;
  },

  showBossDefeat(boss) {
    const bossArea = document.getElementById('boss-battle-area');
    bossArea.innerHTML = `
      <div class="boss-defeat">
        <div class="boss-defeat-icon">&#x1F4A5;</div>
        <h2>${this.escapeHtml(boss.name)} Defeated!</h2>
        <p>Your knowledge of AI ethics proved too powerful!</p>
        <div class="boss-rewards">
          <div class="badge"><span class="badge-icon">&#x1F3C6;</span><span>+100 XP</span></div>
          <div class="badge"><span class="badge-icon">&#x1F6E1;</span><span>+1 Shield</span></div>
        </div>
      </div>
    `;
    // Award shield powerup
    this.state.powerups.shield++;
    localStorage.setItem('aiq-powerups', JSON.stringify(this.state.powerups));

    Effects.starBurst(window.innerWidth / 2, window.innerHeight / 3, 40);
    Effects.screenFlash('rgba(255,215,0,0.3)');

    setTimeout(() => {
      this.state.bossIndex++;
      this.state.bossAttackIndex = 0;
      this.state.bossHP = 100;
      const bosses = this._shuffledBosses || GAME_DATA.bosses;
      if (this.state.bossIndex >= bosses.length) {
        this.showResults();
      } else {
        this.state.playerHP = Math.min(100, this.state.playerHP + 25);
        this.renderBossBattle();
      }
    }, 3000);
  },

  answerBoss(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const bosses = this._shuffledBosses || GAME_DATA.bosses;
    const boss = bosses[this.state.bossIndex];
    const attack = boss.attacks[this.state.bossAttackIndex];
    const correctIdx = this._bossCorrectIdx != null ? this._bossCorrectIdx : attack.correct;
    const isCorrect = idx === correctIdx;
    this.state.total++;

    // Check weakness for bonus damage
    const isWeakness = attack.tag && boss.weakness === attack.tag;
    const damage = isCorrect ? ((attack.damage || 25) * (isWeakness ? 1.5 : 1)) : 0;

    const buttons = document.querySelectorAll('#boss-choices .btn-choice');
    const clickedBtn = buttons[idx];
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === correctIdx) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.bossHP -= damage;
      this.state.score += 200;
      this.awardXP(40);
      this.handleCombo(true);

      if (isWeakness) {
        this.showToast('combo', `CRITICAL HIT! -${damage} HP!`);
        Effects.starBurst(window.innerWidth / 2, window.innerHeight / 4, 20);
        Effects.screenFlash('rgba(255,215,0,0.2)');
      } else {
        this.showToast('correct', `Hit! -${damage} HP!`);
      }
      Effects.burst(clickedBtn, '#00e676', 18);
      Effects.debris(document.getElementById('boss-health'), '#ff5252');
    } else {
      const playerDamage = this.state.shieldActive ? 0 : 20;
      this.state.shieldActive = false;
      this.state.playerHP -= playerDamage;
      this.handleCombo(false);
      this.state.missed.push({ question: attack.question, correctAnswer: attack.choices[attack.correct] });

      if (playerDamage > 0) {
        this.showToast('incorrect', `You take ${playerDamage} damage!`);
        Effects.flashBorder('rgba(255,82,82,0.6)');
        Effects.shake(8, 500);
      } else {
        this.showToast('combo', 'Shield absorbed the hit!');
      }

      if (this.state.playerHP <= 0) {
        setTimeout(() => { this.state.playerHP = 50; this.showResults(); }, 1500);
        return;
      }
    }

    this.updateBossHP();
    this.updatePlayerHP();

    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `<strong>${isCorrect ? (isWeakness ? 'SUPER EFFECTIVE!' : 'Direct hit!') : 'The boss strikes back!'}</strong>
      <div class="explanation">${this.escapeHtml(attack.explanation)}</div>`;
    const continueBtn = document.createElement('div');
    continueBtn.className = 'scene-continue';
    continueBtn.innerHTML = `<button class="btn btn-primary" onclick="Game.nextBossAttack()">${this.state.bossHP <= 0 ? 'Victory!' : 'Continue Battle'}</button>`;
    document.getElementById('boss-battle-area').appendChild(feedbackDiv);
    document.getElementById('boss-battle-area').appendChild(continueBtn);
  },

  nextBossAttack() {
    // If boss HP is depleted, skip remaining attacks
    if (this.state.bossHP <= 0) {
      const bosses = this._shuffledBosses || GAME_DATA.bosses;
      this.state.bossAttackIndex = bosses[this.state.bossIndex].attacks.length;
    } else {
      this.state.bossAttackIndex++;
    }
    // renderBossBattle handles defeat detection at line 1514
    this.renderBossBattle();
  },

  updateBossHP() {
    const hp = Math.max(0, this.state.bossHP);
    document.getElementById('boss-health').style.width = `${hp}%`;
    document.getElementById('boss-hp-text').textContent = `HP: ${Math.round(hp)}/100`;
  },

  updatePlayerHP() {
    const hp = Math.max(0, this.state.playerHP);
    document.getElementById('player-health').style.width = `${hp}%`;
    document.getElementById('player-hp-text').textContent = `HP: ${hp}/100`;
  },

  // === ACHIEVEMENTS ===
  achievements: {},
  ACHIEVEMENT_DEFS: {
    firstSteps: { icon: '&#x1F463;', name: 'First Steps', desc: 'Complete any mode' },
    dragonSlayer: { icon: '&#x1F409;', name: 'Dragon Slayer', desc: 'Defeat the Bias Dragon' },
    sphinxSolver: { icon: '&#x1F9E0;', name: 'Sphinx Solver', desc: 'Defeat the Black Box Sphinx' },
    comboKing: { icon: '&#x1F525;', name: 'Combo King', desc: 'Reach a 10x combo' },
    speedDemon: { icon: '&#x26A1;', name: 'Speed Demon', desc: 'Finish Quiz Blitz with 30s+ left' },
    perfectAudit: { icon: '&#x2B50;', name: 'Perfect Audit', desc: '100% in any mode' },
    biasDetective: { icon: '&#x1F50D;', name: 'Bias Detective', desc: 'Spot all bias correctly' },
    persistent: { icon: '&#x1F4AA;', name: 'Persistent Learner', desc: 'Play 5 sessions' },
    nightOwl: { icon: '&#x1F989;', name: 'Night Owl', desc: 'Play after midnight' }
  },

  loadAchievements() {
    try {
      this.achievements = JSON.parse(localStorage.getItem('aiq-achievements')) || {};
    } catch (e) {
      this.achievements = {};
    }
  },

  unlockAchievement(id) {
    if (this.achievements[id]) return;
    this.achievements[id] = true;
    localStorage.setItem('aiq-achievements', JSON.stringify(this.achievements));
    const def = this.ACHIEVEMENT_DEFS[id];
    if (!def) return;

    // Show notification
    const notif = document.createElement('div');
    notif.className = 'achievement-popup';
    notif.innerHTML = `<span class="achievement-icon">${def.icon}</span><div><strong>Achievement Unlocked!</strong><br>${this.escapeHtml(def.name)}</div>`;
    document.body.appendChild(notif);
    Effects.starBurst(window.innerWidth - 100, 60, 15);
    setTimeout(() => notif.remove(), 3500);
  },

  checkAchievements() {
    const pct = this.state.total > 0 ? (this.state.correct / this.state.total) * 100 : 0;
    this.unlockAchievement('firstSteps');
    if (pct === 100 && this.state.total >= 5) this.unlockAchievement('perfectAudit');
    if (this.state.maxCombo >= 10) this.unlockAchievement('comboKing');
    if (this.state.mode === 'quiz-blitz' && this.state.quizTimeLeft > 30) this.unlockAchievement('speedDemon');
    if (this.state.totalSessions >= 5) this.unlockAchievement('persistent');
    if (new Date().getHours() >= 0 && new Date().getHours() < 5) this.unlockAchievement('nightOwl');
    for (const b of this.state.badges) {
      if (this.ACHIEVEMENT_DEFS[b]) this.unlockAchievement(b);
    }
  },

  // === RESULTS ===
  showResults() {
    if (this.state.quizTimer) clearInterval(this.state.quizTimer);
    if (this.state.autoAdvanceTimeout) clearTimeout(this.state.autoAdvanceTimeout);
    if (this.tapState && this.tapState.tapTimer) clearInterval(this.tapState.tapTimer);

    const pct = this.state.total > 0 ? Math.round((this.state.correct / this.state.total) * 100) : 0;
    this.checkAchievements();

    // Save best score
    const best = parseInt(localStorage.getItem('aiq-best-score') || '0', 10);
    if (this.state.score > best) localStorage.setItem('aiq-best-score', this.state.score);

    // Award bonus powerups based on performance
    if (pct >= 80) { this.state.powerups.fiftyFifty++; this.state.powerups.hint++; }
    if (pct >= 90) { this.state.powerups.timeFreeze++; }
    localStorage.setItem('aiq-powerups', JSON.stringify(this.state.powerups));

    let icon, title;
    if (pct >= 90) { icon = '\u{1F3C6}'; title = 'Outstanding!'; }
    else if (pct >= 70) { icon = '\u{1F31F}'; title = 'Great Job!'; }
    else if (pct >= 50) { icon = '\u{1F4AA}'; title = 'Good Effort!'; }
    else { icon = '\u{1F4DA}'; title = 'Keep Learning!'; }

    document.getElementById('results-icon').textContent = icon;
    document.getElementById('results-title').textContent = title;

    document.getElementById('results-stats').innerHTML = `
      <div class="result-stat"><div class="label">Score</div><div class="value">${this.state.score}</div></div>
      <div class="result-stat"><div class="label">Accuracy</div><div class="value">${pct}%</div></div>
      <div class="result-stat"><div class="label">Correct</div><div class="value">${this.state.correct}/${this.state.total}</div></div>
      <div class="result-stat"><div class="label">Max Combo</div><div class="value">x${this.state.maxCombo}</div></div>
      <div class="result-stat"><div class="label">Level</div><div class="value">${this.LEVEL_TITLES[this.state.level - 1]}</div></div>
      <div class="result-stat"><div class="label">XP</div><div class="value">${this.state.xp}</div></div>
    `;

    // Badges + unlocked achievements
    const allBadges = [...new Set(this.state.badges)];
    const badgesHTML = allBadges.map(b => {
      const badge = GAME_DATA.badges[b] || this.ACHIEVEMENT_DEFS[b];
      if (!badge) return '';
      return `<div class="badge"><span class="badge-icon">${badge.icon}</span><span>${this.escapeHtml(badge.name)}</span></div>`;
    }).join('');

    const earnedPowerups = [];
    if (pct >= 80) earnedPowerups.push('+1 50/50', '+1 Hint');
    if (pct >= 90) earnedPowerups.push('+1 Time Freeze');
    const powerupHTML = earnedPowerups.length > 0
      ? `<div style="margin-top:12px;color:var(--accent-orange);">Earned: ${earnedPowerups.join(', ')}</div>` : '';

    document.getElementById('results-badges').innerHTML = badgesHTML + powerupHTML;

    if (this.state.missed.length > 0) {
      document.getElementById('results-review').innerHTML = `
        <h3>Review These Topics</h3>
        ${this.state.missed.slice(0, 5).map(m => `
          <div class="review-item">
            <div class="review-q">${this.escapeHtml(m.question)}</div>
            <div class="review-answer">Correct: ${this.escapeHtml(m.correctAnswer)}</div>
          </div>
        `).join('')}
      `;
    } else {
      document.getElementById('results-review').innerHTML = '';
    }

    if (typeof LTI !== 'undefined' && LTI.isLTIContext()) LTI.sendScore(pct / 100);

    this.showScreen('screen-results');
    if (pct >= 90) Effects.starBurst(window.innerWidth / 2, window.innerHeight / 3, 30);
  },

  // === UTILITIES ===
  toastTimeout: null,
  showToast(type, text) {
    const toast = document.getElementById('feedback-toast');
    if (!toast) return;
    const iconMap = { correct: '\u2705', incorrect: '\u274C', combo: '\u{1F525}' };
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    toast.className = `feedback-toast ${type}`;
    document.getElementById('feedback-icon').textContent = iconMap[type] || '';
    document.getElementById('feedback-text').textContent = text;
    this.toastTimeout = setTimeout(() => toast.classList.add('hidden'), 1800);
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  toggleReduceMotion(enabled) {
    Effects.reducedMotion = enabled;
    localStorage.setItem('aiq-reduce-motion', enabled);
    document.documentElement.classList.toggle('reduce-motion', enabled);
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

document.addEventListener('DOMContentLoaded', () => Game.init());
