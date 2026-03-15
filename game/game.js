// === AI Ethics Quest - Game Engine ===

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
    answering: false
  },

  init() {
    const best = localStorage.getItem('aiq-best-score');
    if (best) {
      document.getElementById('returning-stats').style.display = 'block';
      document.getElementById('best-score').textContent = best;
    }
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
      this.state.chapter++;
      this.state.sceneIndex = 0;
      this.renderAdventureScene();
      return;
    }

    const scene = scenes[this.state.sceneIndex];
    const el = document.getElementById('adventure-scene');
    const letters = ['A', 'B', 'C', 'D'];

    document.getElementById('adv-score').textContent = this.state.score;
    document.getElementById('adv-chapter').textContent = (this.state.chapter + 1) + '/5';
    document.getElementById('adv-trust').style.width = Math.max(0, Math.min(100, this.state.trust)) + '%';

    let choicesHTML = scene.choices.map((c, i) =>
      `<button class="btn-choice" onclick="Game.answerAdventure(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(c)}
      </button>`
    ).join('');

    el.innerHTML = `
      <div class="scene-narrative">${scene.narrative}</div>
      <div class="scene-question">
        <p style="font-weight:600; margin-bottom:12px;">${this.escapeHtml(scene.question)}</p>
      </div>
      <div class="scene-choices" id="adv-choices">${choicesHTML}</div>
    `;

    this.state.answering = false;
  },

  answerAdventure(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const chapter = GAME_DATA.adventure[this.state.chapter];
    const scene = chapter.scenes[this.state.sceneIndex];
    const isCorrect = idx === scene.correct;

    this.state.total++;
    const buttons = document.querySelectorAll('#adv-choices .btn-choice');
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === scene.correct) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      const points = 100 * (1 + Math.floor(this.state.combo / 3) * 0.5);
      this.state.score += points;
      this.state.trust = Math.min(100, this.state.trust + (scene.trustDelta || 10));
      this.showToast('correct', `+${points} points!`);
    } else {
      this.state.combo = 0;
      this.state.trust = Math.max(0, this.state.trust - 10);
      this.state.missed.push({
        question: scene.question,
        correctAnswer: scene.choices[scene.correct]
      });
      this.showToast('incorrect', 'Not quite...');
    }

    document.getElementById('adv-score').textContent = this.state.score;
    document.getElementById('adv-trust').style.width = Math.max(0, Math.min(100, this.state.trust)) + '%';

    // Show feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `
      <strong>${isCorrect ? 'Correct!' : 'Not quite.'}</strong>
      <div class="explanation">${this.escapeHtml(scene.explanation)}</div>
    `;

    const continueDiv = document.createElement('div');
    continueDiv.className = 'scene-continue';
    continueDiv.innerHTML = `<button class="btn btn-primary" onclick="Game.nextAdventureScene()">Continue</button>`;

    const container = document.getElementById('adventure-scene');
    container.appendChild(feedbackDiv);
    container.appendChild(continueDiv);
  },

  nextAdventureScene() {
    this.state.sceneIndex++;
    this.renderAdventureScene();
  },

  // === QUIZ BLITZ ===
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
      timerEl.textContent = this.state.quizTimeLeft;
      if (this.state.quizTimeLeft <= 10) {
        timerEl.classList.add('timer-urgent');
      }
      if (this.state.quizTimeLeft <= 0) {
        clearInterval(this.state.quizTimer);
        this.showResults();
      }
    }, 1000);
  },

  renderQuizQuestion() {
    if (this.state.quizQuestionIndex >= this.state.quizQuestions.length) {
      clearInterval(this.state.quizTimer);
      this.showResults();
      return;
    }

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    const letters = ['A', 'B', 'C', 'D'];

    document.getElementById('quiz-score').textContent = this.state.score;
    document.getElementById('quiz-combo').textContent = `x${Math.max(1, this.state.combo)}`;
    document.getElementById('quiz-qnum').textContent =
      `${this.state.quizQuestionIndex + 1}/${this.state.quizQuestions.length}`;

    const comboFill = document.getElementById('combo-fill');
    comboFill.style.width = `${Math.min(100, this.state.combo * 20)}%`;

    let choicesHTML = q.choices.map((c, i) =>
      `<button class="btn-choice" onclick="Game.answerQuiz(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(c)}
      </button>`
    ).join('');

    document.getElementById('quiz-question').innerHTML = `
      <span class="question-category">${q.category}</span>
      <div class="question-text">${this.escapeHtml(q.question)}</div>
      <div class="scene-choices" id="quiz-choices">${choicesHTML}</div>
    `;

    this.state.answering = false;
  },

  answerQuiz(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const q = this.state.quizQuestions[this.state.quizQuestionIndex];
    const isCorrect = idx === q.correct;
    this.state.total++;

    const buttons = document.querySelectorAll('#quiz-choices .btn-choice');
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === q.correct) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.combo++;
      this.state.maxCombo = Math.max(this.state.maxCombo, this.state.combo);
      const multiplier = Math.max(1, this.state.combo);
      const points = 50 * multiplier;
      this.state.score += points;
      this.state.quizTimeLeft += 3; // Bonus time

      if (this.state.combo >= 5) {
        this.showToast('combo', `COMBO x${this.state.combo}! +${points}`);
        const comboFill = document.getElementById('combo-fill');
        comboFill.classList.add('flash');
        setTimeout(() => comboFill.classList.remove('flash'), 500);
      } else {
        this.showToast('correct', `+${points}`);
      }
    } else {
      this.state.combo = 0;
      this.state.missed.push({
        question: q.question,
        correctAnswer: q.choices[q.correct]
      });
      this.showToast('incorrect', 'Combo lost!');
    }

    document.getElementById('quiz-score').textContent = this.state.score;
    document.getElementById('quiz-combo').textContent = `x${Math.max(1, this.state.combo)}`;

    // Show explanation briefly then auto-advance
    const explanationDiv = document.createElement('div');
    explanationDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    explanationDiv.style.marginTop = '16px';
    explanationDiv.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong>
      <div class="explanation">${this.escapeHtml(q.explanation)}</div>`;
    document.getElementById('quiz-question').appendChild(explanationDiv);

    setTimeout(() => {
      this.state.quizQuestionIndex++;
      this.renderQuizQuestion();
    }, 2200);
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
    document.getElementById('scenario-num').textContent =
      `${this.state.scenarioIndex + 1}/${scenarios.length}`;

    if (scenario.type === 'matching') {
      this.renderMatchingScenario(scenario);
    } else {
      this.renderQuestionScenario(scenario);
    }
  },

  renderQuestionScenario(scenario) {
    const q = scenario.questions[this.state.scenarioQIndex];
    if (!q) {
      this.state.scenarioIndex++;
      this.state.scenarioQIndex = 0;
      this.renderScenario();
      return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    let choicesHTML = q.choices.map((c, i) =>
      `<button class="btn-choice" onclick="Game.answerScenario(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(c)}
      </button>`
    ).join('');

    document.getElementById('scenario-content').innerHTML = `
      <h3 style="color: var(--accent-cyan); margin-bottom:8px;">${this.escapeHtml(scenario.title)}</h3>
      <p style="color: var(--text-secondary); margin-bottom:16px;">${this.escapeHtml(scenario.description)}</p>
      ${scenario.visual}
      <div style="margin-top:20px;">
        <p style="font-weight:600; margin-bottom:12px;">
          Question ${this.state.scenarioQIndex + 1} of ${scenario.questions.length}:
          ${this.escapeHtml(q.question)}
        </p>
        <div class="scene-choices" id="scenario-choices">${choicesHTML}</div>
      </div>
    `;

    this.state.answering = false;
  },

  answerScenario(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const scenario = GAME_DATA.scenarios[this.state.scenarioIndex];
    const q = scenario.questions[this.state.scenarioQIndex];
    const isCorrect = idx === q.correct;
    this.state.total++;

    const buttons = document.querySelectorAll('#scenario-choices .btn-choice');
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === q.correct) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.score += 150;
      this.showToast('correct', '+150 points!');
    } else {
      this.state.missed.push({
        question: q.question,
        correctAnswer: q.choices[q.correct]
      });
      this.showToast('incorrect', 'Not quite...');
    }

    document.getElementById('scenario-score').textContent = this.state.score;

    // Show feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `<strong>${isCorrect ? 'Correct!' : 'Incorrect.'}</strong>
      <div class="explanation">${this.escapeHtml(q.explanation)}</div>`;

    const continueBtn = document.createElement('div');
    continueBtn.className = 'scene-continue';
    continueBtn.innerHTML = `<button class="btn btn-primary" onclick="Game.nextScenarioQuestion()">Continue</button>`;

    document.getElementById('scenario-content').appendChild(feedbackDiv);
    document.getElementById('scenario-content').appendChild(continueBtn);
  },

  nextScenarioQuestion() {
    this.state.scenarioQIndex++;
    const scenario = GAME_DATA.scenarios[this.state.scenarioIndex];
    if (scenario.type !== 'matching' && this.state.scenarioQIndex >= scenario.questions.length) {
      this.state.scenarioIndex++;
      this.state.scenarioQIndex = 0;
    }
    this.renderScenario();
  },

  // Matching scenario
  renderMatchingScenario(scenario) {
    const pairs = this.shuffleArray([...scenario.pairs]);
    const rightItems = this.shuffleArray(pairs.map(p => p.right));

    this.matchState = {
      pairs: pairs,
      rightItems: rightItems,
      selectedLeft: null,
      matched: new Set(),
      attempts: 0
    };

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
        <div class="match-column">
          <h4>Terms</h4>
          ${leftHTML}
        </div>
        <div class="match-column">
          <h4>Definitions</h4>
          ${rightHTML}
        </div>
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

    const leftIdx = this.matchState.selectedLeft;
    const pair = this.matchState.pairs[leftIdx];
    const selectedRight = this.matchState.rightItems[idx];
    this.matchState.attempts++;
    this.state.total++;

    if (pair.right === selectedRight) {
      // Correct match
      this.state.correct++;
      this.state.score += 100;
      this.matchState.matched.add(leftIdx);

      document.getElementById(`match-left-${leftIdx}`).classList.remove('selected');
      document.getElementById(`match-left-${leftIdx}`).classList.add('matched');
      document.getElementById(`match-right-${idx}`).classList.add('matched');
      this.matchState.selectedLeft = null;
      this.showToast('correct', '+100 match!');

      document.getElementById('scenario-score').textContent = this.state.score;

      // Check if all matched
      if (this.matchState.matched.size === this.matchState.pairs.length) {
        setTimeout(() => {
          this.state.scenarioIndex++;
          this.state.scenarioQIndex = 0;
          this.renderScenario();
        }, 800);
      }
    } else {
      // Wrong match
      const rightEl = document.getElementById(`match-right-${idx}`);
      rightEl.classList.add('wrong');
      setTimeout(() => rightEl.classList.remove('wrong'), 500);
      this.showToast('incorrect', 'Try again!');
    }
  },

  // === BOSS BATTLE ===
  renderBossBattle() {
    const bosses = GAME_DATA.bosses;
    if (this.state.bossIndex >= bosses.length) {
      this.showResults();
      return;
    }

    const boss = bosses[this.state.bossIndex];
    if (this.state.bossAttackIndex >= boss.attacks.length) {
      // Boss defeated
      this.state.badges.push(
        this.state.bossIndex === 0 ? 'dragonSlayer' : 'sphinxSolver'
      );
      this.state.bossIndex++;
      this.state.bossAttackIndex = 0;
      this.state.bossHP = 100;

      if (this.state.bossIndex >= bosses.length) {
        this.showResults();
      } else {
        this.state.playerHP = Math.min(100, this.state.playerHP + 25);
        this.renderBossBattle();
      }
      return;
    }

    const attack = boss.attacks[this.state.bossAttackIndex];
    const letters = ['A', 'B', 'C', 'D'];

    document.getElementById('boss-name').textContent = boss.name;
    this.updateBossHP();
    this.updatePlayerHP();

    let choicesHTML = attack.choices.map((c, i) =>
      `<button class="btn-choice" onclick="Game.answerBoss(${i})">
        <span class="choice-letter">${letters[i]}</span>${this.escapeHtml(c)}
      </button>`
    ).join('');

    document.getElementById('boss-battle-area').innerHTML = `
      <div class="boss-attack">
        <h3>${this.escapeHtml(attack.name)}</h3>
        <p>${this.escapeHtml(attack.description)}</p>
      </div>
      <div class="question-text" style="margin-bottom:16px;">${this.escapeHtml(attack.question)}</div>
      <div class="scene-choices" id="boss-choices">${choicesHTML}</div>
    `;

    this.state.answering = false;
  },

  answerBoss(idx) {
    if (this.state.answering) return;
    this.state.answering = true;

    const boss = GAME_DATA.bosses[this.state.bossIndex];
    const attack = boss.attacks[this.state.bossAttackIndex];
    const isCorrect = idx === attack.correct;
    this.state.total++;

    const buttons = document.querySelectorAll('#boss-choices .btn-choice');
    buttons.forEach((b, i) => {
      b.classList.add('disabled');
      if (i === attack.correct) b.classList.add('correct');
      if (i === idx && !isCorrect) b.classList.add('incorrect');
    });

    if (isCorrect) {
      this.state.correct++;
      this.state.bossHP -= (attack.damage || 25);
      this.state.score += 200;
      this.showToast('correct', `Critical hit! -${attack.damage || 25} HP!`);
    } else {
      this.state.playerHP -= 20;
      this.state.missed.push({
        question: attack.question,
        correctAnswer: attack.choices[attack.correct]
      });
      this.showToast('incorrect', 'You take 20 damage!');

      if (this.state.playerHP <= 0) {
        setTimeout(() => {
          this.state.playerHP = 50; // Revive with half HP
          this.showResults();
        }, 1500);
        return;
      }
    }

    this.updateBossHP();
    this.updatePlayerHP();

    // Show feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = `scene-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedbackDiv.innerHTML = `<strong>${isCorrect ? 'Direct hit!' : 'The boss strikes back!'}</strong>
      <div class="explanation">${this.escapeHtml(attack.explanation)}</div>`;

    const continueBtn = document.createElement('div');
    continueBtn.className = 'scene-continue';
    continueBtn.innerHTML = `<button class="btn btn-primary" onclick="Game.nextBossAttack()">
      ${this.state.bossHP <= 0 ? 'Victory!' : 'Continue Battle'}
    </button>`;

    document.getElementById('boss-battle-area').appendChild(feedbackDiv);
    document.getElementById('boss-battle-area').appendChild(continueBtn);
  },

  nextBossAttack() {
    this.state.bossAttackIndex++;
    this.renderBossBattle();
  },

  updateBossHP() {
    const hp = Math.max(0, this.state.bossHP);
    document.getElementById('boss-health').style.width = `${hp}%`;
    document.getElementById('boss-hp-text').textContent = `HP: ${hp}/100`;
  },

  updatePlayerHP() {
    const hp = Math.max(0, this.state.playerHP);
    document.getElementById('player-health').style.width = `${hp}%`;
    document.getElementById('player-hp-text').textContent = `HP: ${hp}/100`;
  },

  // === RESULTS ===
  showResults() {
    if (this.state.quizTimer) clearInterval(this.state.quizTimer);

    const pct = this.state.total > 0 ? Math.round((this.state.correct / this.state.total) * 100) : 0;

    // Determine badges
    if (pct === 100) this.state.badges.push('fullMarks');
    if (pct >= 90 && this.state.missed.length === 0) this.state.badges.push('noMistakes');
    if (this.state.maxCombo >= 5) this.state.badges.push('comboMaster');
    if (this.state.mode === 'quiz-blitz' && this.state.quizTimeLeft > 30) this.state.badges.push('speedDemon');

    // Save best score
    const best = parseInt(localStorage.getItem('aiq-best-score') || '0');
    if (this.state.score > best) {
      localStorage.setItem('aiq-best-score', this.state.score);
    }

    // Determine icon and title
    let icon, title;
    if (pct >= 90) { icon = '\u{1F3C6}'; title = 'Outstanding!'; }
    else if (pct >= 70) { icon = '\u{1F31F}'; title = 'Great Job!'; }
    else if (pct >= 50) { icon = '\u{1F4AA}'; title = 'Good Effort!'; }
    else { icon = '\u{1F4DA}'; title = 'Keep Learning!'; }

    document.getElementById('results-icon').textContent = icon;
    document.getElementById('results-title').textContent = title;

    document.getElementById('results-stats').innerHTML = `
      <div class="result-stat">
        <div class="label">Score</div>
        <div class="value">${this.state.score}</div>
      </div>
      <div class="result-stat">
        <div class="label">Accuracy</div>
        <div class="value">${pct}%</div>
      </div>
      <div class="result-stat">
        <div class="label">Correct</div>
        <div class="value">${this.state.correct}/${this.state.total}</div>
      </div>
      <div class="result-stat">
        <div class="label">Max Combo</div>
        <div class="value">x${this.state.maxCombo}</div>
      </div>
    `;

    // Badges
    const uniqueBadges = [...new Set(this.state.badges)];
    document.getElementById('results-badges').innerHTML = uniqueBadges.map(b => {
      const badge = GAME_DATA.badges[b];
      if (!badge) return '';
      return `<div class="badge">
        <span class="badge-icon">${badge.icon}</span>
        <span>${badge.name}</span>
      </div>`;
    }).join('');

    // Review missed questions
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

    // Send score to LTI if available
    if (typeof LTI !== 'undefined' && LTI.isLTIContext()) {
      LTI.sendScore(pct / 100);
    }

    this.showScreen('screen-results');
  },

  // === UTILITIES ===
  showToast(type, text) {
    const toast = document.getElementById('feedback-toast');
    const iconMap = { correct: '\u2705', incorrect: '\u274C', combo: '\u{1F525}' };
    toast.className = `feedback-toast ${type}`;
    document.getElementById('feedback-icon').textContent = iconMap[type] || '';
    document.getElementById('feedback-text').textContent = text;

    setTimeout(() => toast.classList.add('hidden'), 1800);
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Game.init());
