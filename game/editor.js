// === AI Ethics Quest - Content Editor ===

const Editor = {
  data: null,
  activeSection: null,   // 'adventure' | 'quiz' | 'scenarios' | 'bosses'
  activePath: null,       // e.g. { chapter: 0, scene: 2 }
  dirty: false,
  autosaveTimer: null,
  toastTimer: null,
  searchFilter: '',
  collapsedSections: {},

  // ── Initialization ──────────────────────────────────────────
  init() {
    // Try to restore autosave
    const saved = localStorage.getItem('aiq-editor-autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.adventure && parsed.quizQuestions && parsed.scenarios && parsed.bosses) {
          if (confirm('Restore unsaved editor session?')) {
            this.data = parsed;
          }
        }
      } catch (e) { /* ignore */ }
    }
    if (!this.data) {
      this.data = JSON.parse(JSON.stringify(GAME_DATA));
    }
    this.renderSidebar();
    window.addEventListener('beforeunload', (e) => {
      if (this.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  // ── Toast ───────────────────────────────────────────────────
  toast(msg, type) {
    const el = document.getElementById('editor-toast');
    el.textContent = msg;
    el.className = 'editor-toast visible ' + (type || '');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.className = 'editor-toast'; }, 2500);
  },

  // ── Dirty / Autosave ───────────────────────────────────────
  markDirty() {
    this.dirty = true;
    clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => this.autosave(), 1000);
  },

  autosave() {
    this.saveCurrentForm();
    localStorage.setItem('aiq-editor-autosave', JSON.stringify(this.data));
    const el = document.getElementById('autosave-indicator');
    el.textContent = 'Saved';
    setTimeout(() => { el.textContent = ''; }, 1500);
  },

  // ── Modal ──────────────────────────────────────────────────
  confirmDelete(message, callback) {
    const modal = document.getElementById('editor-modal');
    document.getElementById('modal-message').textContent = message;
    document.getElementById('modal-confirm').onclick = () => {
      this.closeModal();
      callback();
    };
    modal.style.display = 'flex';
  },

  closeModal() {
    document.getElementById('editor-modal').style.display = 'none';
  },

  showHTMLPreview(html) {
    const modal = document.getElementById('preview-modal');
    const iframe = document.getElementById('preview-frame');
    const doc = `<!DOCTYPE html><html><head><style>body{background:#1a1a2e;color:#e0e0e0;padding:16px;margin:0;font-family:system-ui,sans-serif;line-height:1.6;}h1,h2,h3,h4{color:#4e8cff;}p{margin:0 0 8px;}em{color:#00d4ff;}strong{color:#ff9100;}code{background:#0d0d1a;padding:2px 6px;border-radius:4px;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #333;padding:8px;text-align:left;}th{background:#0d0d1a;}</style></head><body>${html}</body></html>`;
    iframe.srcdoc = doc;
    modal.style.display = 'flex';
  },

  closePreviewModal() {
    document.getElementById('preview-modal').style.display = 'none';
    document.getElementById('preview-frame').srcdoc = '';
  },

  // ── Sidebar ────────────────────────────────────────────────
  renderSidebar() {
    const container = document.getElementById('sidebar-sections');
    let html = '';

    // Adventure
    html += this.renderSidebarSection('adventure', 'Adventure', () => {
      let items = '';
      this.data.adventure.forEach((ch, ci) => {
        items += `<button class="sidebar-item ${this.isActive('adventure', { chapter: ci }) ? 'active' : ''}"
          onclick="Editor.selectItem('adventure', {chapter:${ci}})"
          data-search="${this.esc(ch.title)}">Ch ${ci + 1}: ${this.esc(this.truncate(ch.title, 25))}</button>`;
        if (!this.collapsedSections['adv-ch-' + ci]) {
          (ch.scenes || []).forEach((sc, si) => {
            const label = sc.type ? sc.type : this.truncate(sc.question || 'Scene ' + (si + 1), 22);
            items += `<button class="sidebar-item indent ${this.isActive('adventure', { chapter: ci, scene: si }) ? 'active' : ''}"
              onclick="Editor.selectItem('adventure', {chapter:${ci}, scene:${si}})"
              data-search="${this.esc(sc.question || sc.type || '')}">Scene ${si + 1}: ${this.esc(label)}</button>`;
          });
          items += `<button class="sidebar-add-btn indent" onclick="Editor.addScene(${ci})">+ Add Scene</button>`;
        }
      });
      items += `<button class="sidebar-add-btn" onclick="Editor.addChapter()">+ Add Chapter</button>`;
      return items;
    });

    // Quiz
    html += this.renderSidebarSection('quiz', 'Quiz Questions', () => {
      let items = '';
      this.data.quizQuestions.forEach((q, i) => {
        const label = q.question ? this.truncate(q.question, 30) : 'Question ' + (i + 1);
        items += `<button class="sidebar-item ${this.isActive('quiz', { questionIndex: i }) ? 'active' : ''}"
          onclick="Editor.selectItem('quiz', {questionIndex:${i}})"
          data-search="${this.esc(q.question || '')} ${this.esc(q.category || '')}">Q${i + 1}: ${this.esc(label)}</button>`;
      });
      items += `<button class="sidebar-add-btn" onclick="Editor.addQuizQuestion()">+ Add Question</button>`;
      return items;
    });

    // Scenarios
    html += this.renderSidebarSection('scenarios', 'Scenarios', () => {
      let items = '';
      this.data.scenarios.forEach((s, i) => {
        items += `<button class="sidebar-item ${this.isActive('scenarios', { scenarioIndex: i }) ? 'active' : ''}"
          onclick="Editor.selectItem('scenarios', {scenarioIndex:${i}})"
          data-search="${this.esc(s.title || '')}">S${i + 1}: ${this.esc(this.truncate(s.title || 'Scenario', 25))}</button>`;
      });
      items += `<button class="sidebar-add-btn" onclick="Editor.addScenario()">+ Add Scenario</button>`;
      return items;
    });

    // Bosses
    html += this.renderSidebarSection('bosses', 'Bosses', () => {
      let items = '';
      this.data.bosses.forEach((b, i) => {
        items += `<button class="sidebar-item ${this.isActive('bosses', { bossIndex: i }) ? 'active' : ''}"
          onclick="Editor.selectItem('bosses', {bossIndex:${i}})"
          data-search="${this.esc(b.name || '')}">B${i + 1}: ${this.esc(this.truncate(b.name || 'Boss', 25))}</button>`;
        if (!this.collapsedSections['boss-' + i]) {
          (b.attacks || []).forEach((a, ai) => {
            items += `<button class="sidebar-item indent ${this.isActive('bosses', { bossIndex: i, attackIndex: ai }) ? 'active' : ''}"
              onclick="Editor.selectItem('bosses', {bossIndex:${i}, attackIndex:${ai}})"
              data-search="${this.esc(a.name || '')}">Atk ${ai + 1}: ${this.esc(this.truncate(a.name || 'Attack', 20))}</button>`;
          });
          items += `<button class="sidebar-add-btn indent" onclick="Editor.addBossAttack(${i})">+ Add Attack</button>`;
        }
      });
      items += `<button class="sidebar-add-btn" onclick="Editor.addBoss()">+ Add Boss</button>`;
      return items;
    });

    container.innerHTML = html;
    this.applySearchFilter();
  },

  renderSidebarSection(key, title, bodyFn) {
    const collapsed = this.collapsedSections[key];
    return `<div class="sidebar-section ${collapsed ? 'collapsed' : ''}" data-section="${key}">
      <div class="sidebar-section-header" onclick="Editor.toggleSection('${key}')">
        <span>${title}</span>
        <span class="chevron">&#x25BC;</span>
      </div>
      <div class="sidebar-section-body">${bodyFn()}</div>
    </div>`;
  },

  toggleSection(key) {
    this.collapsedSections[key] = !this.collapsedSections[key];
    this.renderSidebar();
  },

  filterSidebar(value) {
    this.searchFilter = value.toLowerCase();
    this.applySearchFilter();
  },

  applySearchFilter() {
    if (!this.searchFilter) {
      document.querySelectorAll('.sidebar-item, .sidebar-add-btn').forEach(el => el.style.display = '');
      return;
    }
    document.querySelectorAll('.sidebar-item').forEach(el => {
      const text = (el.getAttribute('data-search') || el.textContent).toLowerCase();
      el.style.display = text.includes(this.searchFilter) ? '' : 'none';
    });
  },

  isActive(section, path) {
    if (this.activeSection !== section || !this.activePath) return false;
    return JSON.stringify(path) === JSON.stringify(this.activePath);
  },

  // ── Selection ──────────────────────────────────────────────
  selectItem(section, path) {
    this.saveCurrentForm();
    this.activeSection = section;
    this.activePath = path;
    this.renderSidebar();
    this.renderForm();
  },

  // ── Form Rendering ─────────────────────────────────────────
  renderForm() {
    const main = document.getElementById('editor-main');
    if (!this.activeSection || !this.activePath) {
      main.innerHTML = '<div class="editor-empty"><div class="empty-icon">&#x270F;&#xFE0F;</div><h2>Select an item to edit</h2></div>';
      return;
    }
    switch (this.activeSection) {
      case 'adventure': this.renderAdventureForm(main); break;
      case 'quiz': this.renderQuizForm(main); break;
      case 'scenarios': this.renderScenarioForm(main); break;
      case 'bosses': this.renderBossForm(main); break;
    }
  },

  // ── Adventure Form ─────────────────────────────────────────
  renderAdventureForm(main) {
    const { chapter: ci, scene: si } = this.activePath;
    const ch = this.data.adventure[ci];
    if (!ch) return;

    // Chapter-level edit (no scene selected)
    if (si === undefined) {
      main.innerHTML = `
        <div class="form-header">
          <span class="form-title">Chapter ${ci + 1}</span>
          <div class="form-actions">
            <button class="btn btn-danger btn-sm" onclick="Editor.deleteChapter(${ci})">Delete Chapter</button>
          </div>
        </div>
        <div class="form-group">
          <label>Chapter Title</label>
          <input type="text" id="f-ch-title" value="${this.escAttr(ch.title || '')}">
        </div>
        <div class="form-group">
          <label>Chapter Number</label>
          <input type="number" id="f-ch-number" value="${ch.chapter || ci + 1}" min="1">
        </div>
        <p style="color:var(--text-dim);font-size:0.85rem;margin-top:12px;">This chapter has ${(ch.scenes || []).length} scene(s). Click a scene in the sidebar to edit it.</p>`;
      return;
    }

    // Scene-level edit
    const scene = ch.scenes[si];
    if (!scene) return;
    const sceneType = scene.type || 'mcq';
    const interactiveTypes = ['tree-trace', 'shap-build', 'lime-highlight', 'feedback-loop', 'spot-bias'];
    const isInteractive = interactiveTypes.includes(sceneType);

    let html = `
      <div class="form-header">
        <span class="form-title">Ch ${ci + 1}, Scene ${si + 1}</span>
        <div class="form-actions">
          <button class="btn btn-secondary btn-sm" onclick="Editor.previewGame()">Preview</button>
          <button class="btn btn-danger btn-sm" onclick="Editor.deleteScene(${ci}, ${si})">Delete</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Scene Type</label>
          <select id="f-scene-type" onchange="Editor.onSceneTypeChange()">
            <option value="mcq" ${sceneType === 'mcq' ? 'selected' : ''}>MCQ (Default)</option>
            ${interactiveTypes.map(t => `<option value="${t}" ${sceneType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <input type="text" id="f-scene-category" value="${this.escAttr(scene.category || '')}">
        </div>
        <div class="form-group">
          <label>Trust Delta</label>
          <input type="number" id="f-scene-trust" value="${scene.trustDelta || 0}">
        </div>
      </div>
      <div class="form-group">
        <div class="label-with-action">
          <label>Narrative (HTML)</label>
          <button class="label-action-btn" onclick="Editor.showHTMLPreview(document.getElementById('f-scene-narrative').value)">Preview</button>
        </div>
        <textarea id="f-scene-narrative" class="tall">${this.esc(scene.narrative || '')}</textarea>
      </div>`;

    if (!isInteractive) {
      // MCQ fields
      html += `
        <div class="form-group">
          <label>Question</label>
          <textarea id="f-scene-question">${this.esc(scene.question || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Choices (select the correct answer)</label>
          <div class="choice-list" id="f-scene-choices">
            ${(scene.choices || []).map((c, i) => `
              <div class="choice-item ${i === scene.correct ? 'correct' : ''}">
                <input type="radio" name="scene-correct" value="${i}" ${i === scene.correct ? 'checked' : ''} onchange="Editor.updateChoiceHighlight('f-scene-choices')">
                <input type="text" value="${this.escAttr(typeof c === 'string' ? c : c.text || '')}">
                <button class="choice-remove" onclick="Editor.removeChoice('scene', ${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addChoice('scene')">+ Add Choice</button>
        </div>
        <div class="form-group">
          <label>Explanation</label>
          <textarea id="f-scene-explanation">${this.esc(scene.explanation || '')}</textarea>
        </div>`;
    } else {
      // Interactive: show common fields + JSON editor for type-specific data
      html += `
        <div class="form-subsection">Interactive Data (${sceneType})</div>
        <div class="form-group">
          <label>Explanation</label>
          <textarea id="f-scene-explanation">${this.esc(scene.explanation || '')}</textarea>
        </div>
        <div class="form-group">
          <div class="label-with-action">
            <label>Type-Specific JSON</label>
            <span class="form-hint" style="margin:0">Edit the raw data for this interactive type</span>
          </div>
          <textarea id="f-scene-json" class="json-editor tall">${this.esc(JSON.stringify(this.getInteractiveData(scene, sceneType), null, 2))}</textarea>
          <div class="json-error" id="f-scene-json-error"></div>
        </div>`;
    }

    main.innerHTML = html;
  },

  getInteractiveData(scene, type) {
    // Extract only the type-specific fields (not common ones)
    const common = ['type', 'narrative', 'category', 'trustDelta', 'explanation'];
    const data = {};
    for (const key of Object.keys(scene)) {
      if (!common.includes(key)) data[key] = scene[key];
    }
    return data;
  },

  onSceneTypeChange() {
    this.saveCurrentForm();
    this.renderForm();
  },

  // ── Quiz Form ──────────────────────────────────────────────
  renderQuizForm(main) {
    const { questionIndex: qi } = this.activePath;
    const q = this.data.quizQuestions[qi];
    if (!q) return;

    const qType = q.type || 'mcq';
    let html = `
      <div class="form-header">
        <span class="form-title">Quiz Question ${qi + 1}</span>
        <div class="form-actions">
          <button class="btn btn-secondary btn-sm" onclick="Editor.previewGame()">Preview</button>
          <button class="btn btn-danger btn-sm" onclick="Editor.deleteQuizQuestion(${qi})">Delete</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Type</label>
          <select id="f-quiz-type" onchange="Editor.saveCurrentForm();Editor.renderForm()">
            <option value="mcq" ${qType === 'mcq' ? 'selected' : ''}>MCQ</option>
            <option value="slider" ${qType === 'slider' ? 'selected' : ''}>Slider</option>
            <option value="order" ${qType === 'order' ? 'selected' : ''}>Order</option>
            <option value="rapid-tap" ${qType === 'rapid-tap' ? 'selected' : ''}>Rapid Tap</option>
            <option value="matching" ${qType === 'matching' ? 'selected' : ''}>Matching</option>
          </select>
        </div>
        <div class="form-group">
          <label>Category</label>
          <input type="text" id="f-quiz-category" value="${this.escAttr(q.category || '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Question</label>
        <textarea id="f-quiz-question">${this.esc(q.question || '')}</textarea>
      </div>`;

    if (qType === 'mcq' || !qType) {
      html += `
        <div class="form-group">
          <label>Choices (select the correct answer)</label>
          <div class="choice-list" id="f-quiz-choices">
            ${(q.choices || []).map((c, i) => `
              <div class="choice-item ${i === q.correct ? 'correct' : ''}">
                <input type="radio" name="quiz-correct" value="${i}" ${i === q.correct ? 'checked' : ''} onchange="Editor.updateChoiceHighlight('f-quiz-choices')">
                <input type="text" value="${this.escAttr(typeof c === 'string' ? c : c.text || '')}">
                <button class="choice-remove" onclick="Editor.removeChoice('quiz', ${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addChoice('quiz')">+ Add Choice</button>
        </div>`;
    } else if (qType === 'slider') {
      html += `
        <div class="form-row">
          <div class="form-group"><label>Min</label><input type="number" id="f-quiz-min" value="${q.min ?? 0}" step="any"></div>
          <div class="form-group"><label>Max</label><input type="number" id="f-quiz-max" value="${q.max ?? 1}" step="any"></div>
          <div class="form-group"><label>Correct Value</label><input type="number" id="f-quiz-correctValue" value="${q.correctValue ?? 0}" step="any"></div>
          <div class="form-group"><label>Tolerance</label><input type="number" id="f-quiz-tolerance" value="${q.tolerance ?? 0.05}" step="any"></div>
        </div>`;
    } else if (qType === 'order') {
      html += `
        <div class="form-group">
          <label>Items (in display order)</label>
          <div class="items-list" id="f-quiz-items">
            ${(q.items || []).map((item, i) => `
              <div class="item-row">
                <input type="text" value="${this.escAttr(item)}">
                <button class="item-remove" onclick="Editor.removeOrderItem(${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addOrderItem()">+ Add Item</button>
        </div>
        <div class="form-group">
          <label>Correct Order (items in correct sequence)</label>
          <div class="items-list" id="f-quiz-correct-order">
            ${(q.correctOrder || []).map((item, i) => `
              <div class="item-row">
                <input type="text" value="${this.escAttr(item)}">
                <button class="item-remove" onclick="Editor.removeCorrectOrderItem(${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addCorrectOrderItem()">+ Add Item</button>
        </div>`;
    } else if (qType === 'rapid-tap') {
      html += `
        <div class="form-group">
          <label>Time Limit (seconds)</label>
          <input type="number" id="f-quiz-timeLimit" value="${q.timeLimit != null ? q.timeLimit : 8}" min="1">
        </div>
        <div class="form-group">
          <label>Items (check the correct ones)</label>
          <div class="items-list" id="f-quiz-tap-items">
            ${(q.items || []).map((item, i) => `
              <div class="item-row">
                <input type="checkbox" ${item.isCorrect ? 'checked' : ''}>
                <input type="text" value="${this.escAttr(item.text || '')}">
                <button class="item-remove" onclick="Editor.removeTapItem(${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addTapItem()">+ Add Item</button>
        </div>`;
    } else if (qType === 'matching') {
      html += `
        <div class="form-group">
          <label>Pairs (left = term, right = definition)</label>
          <div id="f-quiz-pairs">
            ${(q.pairs || []).map((p, i) => `
              <div class="pair-row">
                <input type="text" value="${this.escAttr(p.left || p[0] || '')}">
                <span>&harr;</span>
                <input type="text" value="${this.escAttr(p.right || p[1] || '')}">
                <button class="item-remove" onclick="Editor.removeMatchPair(${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addMatchPair()">+ Add Pair</button>
        </div>`;
    }

    html += `
      <div class="form-group">
        <label>Explanation</label>
        <textarea id="f-quiz-explanation">${this.esc(q.explanation || '')}</textarea>
      </div>`;

    main.innerHTML = html;
  },

  // ── Scenario Form ──────────────────────────────────────────
  renderScenarioForm(main) {
    const { scenarioIndex: si } = this.activePath;
    const s = this.data.scenarios[si];
    if (!s) return;

    const sType = s.type || 'default';
    let html = `
      <div class="form-header">
        <span class="form-title">Scenario ${si + 1}</span>
        <div class="form-actions">
          <button class="btn btn-secondary btn-sm" onclick="Editor.previewGame()">Preview</button>
          <button class="btn btn-danger btn-sm" onclick="Editor.deleteScenario(${si})">Delete</button>
        </div>
      </div>
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="f-scn-title" value="${this.escAttr(s.title || '')}">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="f-scn-desc">${this.esc(s.description || '')}</textarea>
      </div>
      <div class="form-group">
        <div class="label-with-action">
          <label>Visual HTML</label>
          <button class="label-action-btn" onclick="Editor.showHTMLPreview(document.getElementById('f-scn-visual').value)">Preview</button>
        </div>
        <textarea id="f-scn-visual" class="tall">${this.esc(s.visual || '')}</textarea>
      </div>`;

    // Type selector (detect from data)
    const hasMatching = !!s.pairs;
    const hasScale = s.type === 'scale' || s.alpha !== undefined;

    if (hasMatching) {
      html += `
        <div class="form-subsection">Matching Pairs</div>
        <div id="f-scn-pairs">
          ${(s.pairs || []).map((p, i) => `
            <div class="pair-row">
              <input type="text" value="${this.escAttr(p.left || p[0] || '')}">
              <span>&harr;</span>
              <input type="text" value="${this.escAttr(p.right || p[1] || '')}">
              <button class="item-remove" onclick="Editor.removeScnPair(${i})">&times;</button>
            </div>
          `).join('')}
        </div>
        <button class="add-choice-btn" onclick="Editor.addScnPair()">+ Add Pair</button>`;
    }

    if (hasScale) {
      html += `
        <div class="form-subsection">Scale Challenge</div>
        <div class="form-row">
          <div class="form-group"><label>Alpha</label><input type="number" id="f-scn-alpha" value="${s.alpha ?? ''}" step="any"></div>
        </div>
        <div class="form-group">
          <label>Challenge Text</label>
          <textarea id="f-scn-challenge">${this.esc(s.challenge || '')}</textarea>
        </div>`;
    }

    // Questions
    html += `<div class="form-subsection">Questions</div>`;
    (s.questions || []).forEach((q, qi) => {
      html += `
        <div class="nested-card">
          <div class="nested-card-header">
            <span class="nested-card-title">Question ${qi + 1}</span>
            <button class="btn btn-danger btn-sm" onclick="Editor.removeScnQuestion(${si}, ${qi})">Remove</button>
          </div>
          <div class="form-group">
            <label>Question</label>
            <textarea class="scn-q-text">${this.esc(q.question || '')}</textarea>
          </div>
          <div class="form-group">
            <label>Choices</label>
            <div class="choice-list scn-q-choices">
              ${(q.choices || []).map((c, ci) => `
                <div class="choice-item ${ci === q.correct ? 'correct' : ''}">
                  <input type="radio" name="scn-q-${qi}-correct" value="${ci}" ${ci === q.correct ? 'checked' : ''} onchange="Editor.updateChoiceHighlight(this.closest('.choice-list'))">
                  <input type="text" value="${this.escAttr(typeof c === 'string' ? c : c.text || '')}">
                  <button class="choice-remove" onclick="Editor.removeScnChoice(${si}, ${qi}, ${ci})">&times;</button>
                </div>
              `).join('')}
            </div>
            <button class="add-choice-btn" onclick="Editor.addScnChoice(this)">+ Add Choice</button>
          </div>
          <div class="form-group">
            <label>Explanation</label>
            <textarea class="scn-q-explanation">${this.esc(q.explanation || '')}</textarea>
          </div>
        </div>`;
    });
    html += `<button class="add-choice-btn" onclick="Editor.addScnQuestion(${si})">+ Add Question</button>`;

    main.innerHTML = html;
  },

  // ── Boss Form ──────────────────────────────────────────────
  renderBossForm(main) {
    const { bossIndex: bi, attackIndex: ai } = this.activePath;
    const boss = this.data.bosses[bi];
    if (!boss) return;

    if (ai !== undefined) {
      // Attack form
      const atk = boss.attacks[ai];
      if (!atk) return;
      main.innerHTML = `
        <div class="form-header">
          <span class="form-title">${this.esc(boss.name)} - Attack ${ai + 1}</span>
          <div class="form-actions">
            <button class="btn btn-danger btn-sm" onclick="Editor.deleteBossAttack(${bi}, ${ai})">Delete Attack</button>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Attack Name</label>
            <input type="text" id="f-atk-name" value="${this.escAttr(atk.name || '')}">
          </div>
          <div class="form-group">
            <label>Tag</label>
            <input type="text" id="f-atk-tag" value="${this.escAttr(atk.tag || '')}">
          </div>
          <div class="form-group">
            <label>Damage</label>
            <input type="number" id="f-atk-damage" value="${atk.damage != null ? atk.damage : 25}" min="0">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="f-atk-desc">${this.esc(atk.description || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Question</label>
          <textarea id="f-atk-question">${this.esc(atk.question || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Choices (select the correct answer)</label>
          <div class="choice-list" id="f-atk-choices">
            ${(atk.choices || []).map((c, i) => `
              <div class="choice-item ${i === atk.correct ? 'correct' : ''}">
                <input type="radio" name="atk-correct" value="${i}" ${i === atk.correct ? 'checked' : ''} onchange="Editor.updateChoiceHighlight('f-atk-choices')">
                <input type="text" value="${this.escAttr(typeof c === 'string' ? c : c.text || '')}">
                <button class="choice-remove" onclick="Editor.removeChoice('atk', ${i})">&times;</button>
              </div>
            `).join('')}
          </div>
          <button class="add-choice-btn" onclick="Editor.addChoice('atk')">+ Add Choice</button>
        </div>
        <div class="form-group">
          <label>Explanation</label>
          <textarea id="f-atk-explanation">${this.esc(atk.explanation || '')}</textarea>
        </div>`;
      return;
    }

    // Boss top-level form
    main.innerHTML = `
      <div class="form-header">
        <span class="form-title">Boss: ${this.esc(boss.name || 'Unnamed')}</span>
        <div class="form-actions">
          <button class="btn btn-secondary btn-sm" onclick="Editor.previewGame()">Preview</button>
          <button class="btn btn-danger btn-sm" onclick="Editor.deleteBoss(${bi})">Delete Boss</button>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input type="text" id="f-boss-name" value="${this.escAttr(boss.name || '')}">
        </div>
        <div class="form-group">
          <label>HP</label>
          <input type="number" id="f-boss-hp" value="${boss.hp != null ? boss.hp : 100}" min="1">
        </div>
        <div class="form-group">
          <label>Weakness</label>
          <input type="text" id="f-boss-weakness" value="${this.escAttr(boss.weakness || '')}">
        </div>
      </div>
      <p style="color:var(--text-dim);font-size:0.85rem;margin-top:12px;">This boss has ${(boss.attacks || []).length} attack(s). Click an attack in the sidebar to edit it.</p>`;
  },

  // ── Save Current Form ──────────────────────────────────────
  saveCurrentForm() {
    if (!this.activeSection || !this.activePath) return;

    switch (this.activeSection) {
      case 'adventure': this.saveAdventureForm(); break;
      case 'quiz': this.saveQuizForm(); break;
      case 'scenarios': this.saveScenarioForm(); break;
      case 'bosses': this.saveBossForm(); break;
    }
  },

  saveAdventureForm() {
    const { chapter: ci, scene: si } = this.activePath;
    const ch = this.data.adventure[ci];
    if (!ch) return;

    if (si === undefined) {
      const title = this.val('f-ch-title');
      const num = this.val('f-ch-number');
      if (title !== null) ch.title = title;
      if (num !== null) ch.chapter = parseInt(num) || ci + 1;
      return;
    }

    const scene = ch.scenes[si];
    if (!scene) return;

    const type = this.val('f-scene-type');
    if (type !== null) {
      if (type === 'mcq') delete scene.type;
      else scene.type = type;
    }

    const narrative = this.val('f-scene-narrative');
    if (narrative !== null) scene.narrative = narrative;
    const category = this.val('f-scene-category');
    if (category !== null) scene.category = category;
    const trust = this.val('f-scene-trust');
    if (trust !== null) scene.trustDelta = parseInt(trust) || 0;
    const explanation = this.val('f-scene-explanation');
    if (explanation !== null) scene.explanation = explanation;

    const interactiveTypes = ['tree-trace', 'shap-build', 'lime-highlight', 'feedback-loop', 'spot-bias'];
    if (!interactiveTypes.includes(scene.type || 'mcq')) {
      // MCQ
      const question = this.val('f-scene-question');
      if (question !== null) scene.question = question;
      this.saveChoices(scene, 'f-scene-choices', 'scene-correct');
    } else {
      // Interactive JSON
      const jsonEl = document.getElementById('f-scene-json');
      if (jsonEl) {
        try {
          const parsed = JSON.parse(jsonEl.value);
          const common = ['type', 'narrative', 'category', 'trustDelta', 'explanation'];
          // Remove old type-specific keys
          for (const key of Object.keys(scene)) {
            if (!common.includes(key)) delete scene[key];
          }
          // Only assign known scene properties, not prototype-polluting keys
          for (const [key, val] of Object.entries(parsed)) {
            if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype') {
              scene[key] = val;
            }
          }
          const errEl = document.getElementById('f-scene-json-error');
          if (errEl) errEl.textContent = '';
        } catch (e) {
          const errEl = document.getElementById('f-scene-json-error');
          if (errEl) errEl.textContent = 'Invalid JSON: ' + e.message;
        }
      }
    }
    this.markDirty();
  },

  saveQuizForm() {
    const { questionIndex: qi } = this.activePath;
    const q = this.data.quizQuestions[qi];
    if (!q) return;

    const type = this.val('f-quiz-type');
    if (type !== null) {
      if (type === 'mcq') delete q.type;
      else q.type = type;
    }
    const category = this.val('f-quiz-category');
    if (category !== null) q.category = category;
    const question = this.val('f-quiz-question');
    if (question !== null) q.question = question;
    const explanation = this.val('f-quiz-explanation');
    if (explanation !== null) q.explanation = explanation;

    const qType = q.type || 'mcq';
    if (qType === 'mcq') {
      this.saveChoices(q, 'f-quiz-choices', 'quiz-correct');
    } else if (qType === 'slider') {
      const min = this.val('f-quiz-min'); if (min !== null) q.min = parseFloat(min);
      const max = this.val('f-quiz-max'); if (max !== null) q.max = parseFloat(max);
      const cv = this.val('f-quiz-correctValue'); if (cv !== null) q.correctValue = parseFloat(cv);
      const tol = this.val('f-quiz-tolerance'); if (tol !== null) q.tolerance = parseFloat(tol);
    } else if (qType === 'order') {
      q.items = this.collectTextInputs('f-quiz-items');
      q.correctOrder = this.collectTextInputs('f-quiz-correct-order');
    } else if (qType === 'rapid-tap') {
      const tl = this.val('f-quiz-timeLimit'); if (tl !== null) q.timeLimit = parseInt(tl);
      q.items = this.collectTapItems('f-quiz-tap-items');
    } else if (qType === 'matching') {
      q.pairs = this.collectPairs('f-quiz-pairs');
    }
    this.markDirty();
  },

  saveScenarioForm() {
    const { scenarioIndex: si } = this.activePath;
    const s = this.data.scenarios[si];
    if (!s) return;

    const title = this.val('f-scn-title'); if (title !== null) s.title = title;
    const desc = this.val('f-scn-desc'); if (desc !== null) s.description = desc;
    const visual = this.val('f-scn-visual'); if (visual !== null) s.visual = visual;

    if (s.alpha !== undefined) {
      const alpha = this.val('f-scn-alpha'); if (alpha !== null) s.alpha = parseFloat(alpha);
      const challenge = this.val('f-scn-challenge'); if (challenge !== null) s.challenge = challenge;
    }

    if (s.pairs) {
      s.pairs = this.collectPairsFromEl('f-scn-pairs');
    }

    // Save nested questions
    const cards = document.querySelectorAll('.nested-card');
    if (cards.length > 0 && s.questions) {
      cards.forEach((card, qi) => {
        if (!s.questions[qi]) return;
        const qText = card.querySelector('.scn-q-text');
        if (qText) s.questions[qi].question = qText.value;
        const expEl = card.querySelector('.scn-q-explanation');
        if (expEl) s.questions[qi].explanation = expEl.value;

        const choiceList = card.querySelector('.scn-q-choices');
        if (choiceList) {
          const items = choiceList.querySelectorAll('.choice-item');
          const choices = [];
          let correct = 0;
          items.forEach((item, ci) => {
            const radio = item.querySelector('input[type="radio"]');
            const text = item.querySelector('input[type="text"]');
            if (radio && radio.checked) correct = ci;
            if (text) choices.push(text.value);
          });
          s.questions[qi].choices = choices;
          s.questions[qi].correct = correct;
        }
      });
    }
    this.markDirty();
  },

  saveBossForm() {
    const { bossIndex: bi, attackIndex: ai } = this.activePath;
    const boss = this.data.bosses[bi];
    if (!boss) return;

    if (ai !== undefined) {
      const atk = boss.attacks[ai];
      if (!atk) return;
      const name = this.val('f-atk-name'); if (name !== null) atk.name = name;
      const tag = this.val('f-atk-tag'); if (tag !== null) atk.tag = tag;
      const damage = this.val('f-atk-damage'); if (damage !== null) atk.damage = parseInt(damage);
      const desc = this.val('f-atk-desc'); if (desc !== null) atk.description = desc;
      const question = this.val('f-atk-question'); if (question !== null) atk.question = question;
      const explanation = this.val('f-atk-explanation'); if (explanation !== null) atk.explanation = explanation;
      this.saveChoices(atk, 'f-atk-choices', 'atk-correct');
    } else {
      const name = this.val('f-boss-name'); if (name !== null) boss.name = name;
      const hp = this.val('f-boss-hp'); if (hp !== null) boss.hp = parseInt(hp);
      const weakness = this.val('f-boss-weakness'); if (weakness !== null) boss.weakness = weakness;
    }
    this.markDirty();
  },

  // ── Choice helpers ─────────────────────────────────────────
  saveChoices(obj, containerId, radioName) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const items = container.querySelectorAll('.choice-item');
    const choices = [];
    let correct = 0;
    items.forEach((item, i) => {
      const radio = item.querySelector('input[type="radio"]');
      const text = item.querySelector('input[type="text"]');
      if (radio && radio.checked) correct = i;
      if (text) choices.push(text.value);
    });
    obj.choices = choices;
    obj.correct = correct;
  },

  updateChoiceHighlight(containerOrId) {
    const container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId) : containerOrId;
    if (!container) return;
    container.querySelectorAll('.choice-item').forEach(item => {
      const radio = item.querySelector('input[type="radio"]');
      item.classList.toggle('correct', radio && radio.checked);
    });
  },

  addChoice(prefix) {
    this.saveCurrentForm();
    if (prefix === 'scene') {
      const { chapter: ci, scene: si } = this.activePath;
      const scene = this.data.adventure[ci].scenes[si];
      if (!scene.choices) scene.choices = [];
      scene.choices.push('New choice');
    } else if (prefix === 'quiz') {
      const q = this.data.quizQuestions[this.activePath.questionIndex];
      if (!q.choices) q.choices = [];
      q.choices.push('New choice');
    } else if (prefix === 'atk') {
      const { bossIndex: bi, attackIndex: ai } = this.activePath;
      const atk = this.data.bosses[bi].attacks[ai];
      if (!atk.choices) atk.choices = [];
      atk.choices.push('New choice');
    }
    this.markDirty();
    this.renderForm();
  },

  removeChoice(prefix, index) {
    this.saveCurrentForm();
    let obj;
    if (prefix === 'scene') {
      const { chapter: ci, scene: si } = this.activePath;
      obj = this.data.adventure[ci].scenes[si];
    } else if (prefix === 'quiz') {
      obj = this.data.quizQuestions[this.activePath.questionIndex];
    } else if (prefix === 'atk') {
      const { bossIndex: bi, attackIndex: ai } = this.activePath;
      obj = this.data.bosses[bi].attacks[ai];
    }
    if (obj && obj.choices) {
      const wasCorrect = obj.correct === index;
      obj.choices.splice(index, 1);
      if (wasCorrect) {
        // Deleted the correct choice — reset to first remaining choice
        obj.correct = 0;
      } else if (obj.correct > index) {
        obj.correct--;
      }
      if (obj.correct >= obj.choices.length) obj.correct = Math.max(0, obj.choices.length - 1);
    }
    this.markDirty();
    this.renderForm();
  },

  // ── Order / Rapid-tap / Matching helpers ───────────────────
  collectTextInputs(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll('input[type="text"]')).map(i => i.value);
  },

  collectTapItems(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll('.item-row')).map(row => ({
      text: row.querySelector('input[type="text"]').value,
      isCorrect: row.querySelector('input[type="checkbox"]').checked
    }));
  },

  collectPairs(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll('.pair-row')).map(row => {
      const inputs = row.querySelectorAll('input[type="text"]');
      return { left: inputs[0].value, right: inputs[1].value };
    });
  },

  collectPairsFromEl(containerId) {
    return this.collectPairs(containerId);
  },

  addOrderItem() {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (!q.items) q.items = [];
    q.items.push('New item');
    this.markDirty();
    this.renderForm();
  },

  removeOrderItem(i) {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (q.items) q.items.splice(i, 1);
    this.markDirty();
    this.renderForm();
  },

  addCorrectOrderItem() {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (!q.correctOrder) q.correctOrder = [];
    q.correctOrder.push('New item');
    this.markDirty();
    this.renderForm();
  },

  removeCorrectOrderItem(i) {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (q.correctOrder) q.correctOrder.splice(i, 1);
    this.markDirty();
    this.renderForm();
  },

  addTapItem() {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (!q.items) q.items = [];
    q.items.push({ text: 'New item', isCorrect: false });
    this.markDirty();
    this.renderForm();
  },

  removeTapItem(i) {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (q.items) q.items.splice(i, 1);
    this.markDirty();
    this.renderForm();
  },

  addMatchPair() {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (!q.pairs) q.pairs = [];
    q.pairs.push({ left: 'Term', right: 'Definition' });
    this.markDirty();
    this.renderForm();
  },

  removeMatchPair(i) {
    this.saveCurrentForm();
    const q = this.data.quizQuestions[this.activePath.questionIndex];
    if (q.pairs) q.pairs.splice(i, 1);
    this.markDirty();
    this.renderForm();
  },

  // Scenario pairs
  addScnPair() {
    this.saveCurrentForm();
    const s = this.data.scenarios[this.activePath.scenarioIndex];
    if (!s.pairs) s.pairs = [];
    s.pairs.push({ left: 'Term', right: 'Definition' });
    this.markDirty();
    this.renderForm();
  },

  removeScnPair(i) {
    this.saveCurrentForm();
    const s = this.data.scenarios[this.activePath.scenarioIndex];
    if (s.pairs) s.pairs.splice(i, 1);
    this.markDirty();
    this.renderForm();
  },

  addScnChoice(btn) {
    // Add choice to the nearest scenario question's choice list
    this.saveCurrentForm();
    const card = btn.closest('.nested-card');
    const cards = Array.from(document.querySelectorAll('.nested-card'));
    const qi = cards.indexOf(card);
    const s = this.data.scenarios[this.activePath.scenarioIndex];
    if (s.questions[qi]) {
      if (!s.questions[qi].choices) s.questions[qi].choices = [];
      s.questions[qi].choices.push('New choice');
    }
    this.markDirty();
    this.renderForm();
  },

  addScnQuestion(si) {
    this.saveCurrentForm();
    const s = this.data.scenarios[si];
    if (!s.questions) s.questions = [];
    s.questions.push({ question: 'New question', choices: ['Choice A', 'Choice B'], correct: 0, explanation: '' });
    this.markDirty();
    this.renderForm();
  },

  removeScnQuestion(si, qi) {
    this.saveCurrentForm();
    const s = this.data.scenarios[si];
    if (s.questions) s.questions.splice(qi, 1);
    this.markDirty();
    this.renderForm();
  },

  removeScnChoice(si, qi, ci) {
    this.saveCurrentForm();
    const q = this.data.scenarios[si]?.questions?.[qi];
    if (!q || !q.choices) return;
    const wasCorrect = q.correct === ci;
    q.choices.splice(ci, 1);
    if (wasCorrect) {
      q.correct = 0;
    } else if (q.correct > ci) {
      q.correct--;
    }
    if (q.correct >= q.choices.length) q.correct = Math.max(0, q.choices.length - 1);
    this.markDirty();
    this.renderForm();
  },

  // ── CRUD: Add/Delete ───────────────────────────────────────
  addChapter() {
    this.saveCurrentForm();
    const num = this.data.adventure.length + 1;
    this.data.adventure.push({
      chapter: num,
      title: 'New Chapter',
      scenes: [{
        narrative: '<h3>New Scene</h3><p>Enter your narrative here.</p>',
        question: 'Enter your question here',
        choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
        correct: 0,
        explanation: 'Explain why this is correct.',
        trustDelta: 10,
        category: 'General'
      }]
    });
    this.markDirty();
    this.activeSection = 'adventure';
    this.activePath = { chapter: num - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteChapter(ci) {
    this.confirmDelete(`Delete Chapter ${ci + 1} and all its scenes?`, () => {
      this.data.adventure.splice(ci, 1);
      this.markDirty();
      this.activeSection = null;
      this.activePath = null;
      this.renderSidebar();
      this.renderForm();
    });
  },

  addScene(ci) {
    this.saveCurrentForm();
    const ch = this.data.adventure[ci];
    if (!ch.scenes) ch.scenes = [];
    ch.scenes.push({
      narrative: '<p>New scene narrative.</p>',
      question: 'New question?',
      choices: ['Choice A', 'Choice B'],
      correct: 0,
      explanation: '',
      trustDelta: 10,
      category: 'General'
    });
    this.markDirty();
    this.activeSection = 'adventure';
    this.activePath = { chapter: ci, scene: ch.scenes.length - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteScene(ci, si) {
    this.confirmDelete(`Delete Scene ${si + 1} from Chapter ${ci + 1}?`, () => {
      this.data.adventure[ci].scenes.splice(si, 1);
      this.markDirty();
      this.activeSection = 'adventure';
      this.activePath = { chapter: ci };
      this.renderSidebar();
      this.renderForm();
    });
  },

  addQuizQuestion() {
    this.saveCurrentForm();
    this.data.quizQuestions.push({
      category: 'General',
      question: 'New quiz question?',
      choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
      correct: 0,
      explanation: ''
    });
    this.markDirty();
    this.activeSection = 'quiz';
    this.activePath = { questionIndex: this.data.quizQuestions.length - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteQuizQuestion(qi) {
    this.confirmDelete(`Delete Quiz Question ${qi + 1}?`, () => {
      this.data.quizQuestions.splice(qi, 1);
      this.markDirty();
      this.activeSection = null;
      this.activePath = null;
      this.renderSidebar();
      this.renderForm();
    });
  },

  addScenario() {
    this.saveCurrentForm();
    this.data.scenarios.push({
      title: 'New Scenario',
      description: 'Describe the scenario.',
      visual: '<div class="scenario-visual"><p>Visual content here</p></div>',
      questions: [{ question: 'Question?', choices: ['A', 'B'], correct: 0, explanation: '' }]
    });
    this.markDirty();
    this.activeSection = 'scenarios';
    this.activePath = { scenarioIndex: this.data.scenarios.length - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteScenario(si) {
    this.confirmDelete(`Delete Scenario ${si + 1}?`, () => {
      this.data.scenarios.splice(si, 1);
      this.markDirty();
      this.activeSection = null;
      this.activePath = null;
      this.renderSidebar();
      this.renderForm();
    });
  },

  addBoss() {
    this.saveCurrentForm();
    this.data.bosses.push({
      name: 'New Boss',
      hp: 100,
      weakness: 'general',
      attacks: [{
        name: 'New Attack',
        tag: 'general',
        description: 'The boss attacks!',
        question: 'Question?',
        choices: ['A', 'B', 'C', 'D'],
        correct: 0,
        damage: 25,
        explanation: ''
      }]
    });
    this.markDirty();
    this.activeSection = 'bosses';
    this.activePath = { bossIndex: this.data.bosses.length - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteBoss(bi) {
    this.confirmDelete(`Delete boss "${this.data.bosses[bi].name}"?`, () => {
      this.data.bosses.splice(bi, 1);
      this.markDirty();
      this.activeSection = null;
      this.activePath = null;
      this.renderSidebar();
      this.renderForm();
    });
  },

  addBossAttack(bi) {
    this.saveCurrentForm();
    const boss = this.data.bosses[bi];
    if (!boss.attacks) boss.attacks = [];
    boss.attacks.push({
      name: 'New Attack',
      tag: 'general',
      description: 'Attack description.',
      question: 'Question?',
      choices: ['A', 'B', 'C', 'D'],
      correct: 0,
      damage: 25,
      explanation: ''
    });
    this.markDirty();
    this.activeSection = 'bosses';
    this.activePath = { bossIndex: bi, attackIndex: boss.attacks.length - 1 };
    this.renderSidebar();
    this.renderForm();
  },

  deleteBossAttack(bi, ai) {
    this.confirmDelete(`Delete attack "${this.data.bosses[bi].attacks[ai].name}"?`, () => {
      this.data.bosses[bi].attacks.splice(ai, 1);
      this.markDirty();
      this.activeSection = 'bosses';
      this.activePath = { bossIndex: bi };
      this.renderSidebar();
      this.renderForm();
    });
  },

  // ── Export / Import ────────────────────────────────────────
  exportJSON() {
    this.saveCurrentForm();
    const blob = new Blob([JSON.stringify(this.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gamedata-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.toast('Exported gamedata-export.json', 'success');
  },

  importJSON() {
    document.getElementById('import-input').click();
  },

  handleImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.adventure || !parsed.quizQuestions || !parsed.scenarios || !parsed.bosses) {
          this.toast('Invalid file: missing required keys (adventure, quizQuestions, scenarios, bosses)', 'error');
          return;
        }
        this.data = parsed;
        this.activeSection = null;
        this.activePath = null;
        this.markDirty();
        this.renderSidebar();
        this.renderForm();
        this.toast('Imported successfully!', 'success');
      } catch (err) {
        this.toast('Invalid JSON file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    document.getElementById('import-input').value = '';
  },

  // ── Preview ────────────────────────────────────────────────
  previewGame() {
    this.saveCurrentForm();
    localStorage.setItem('aiq-preview-data', JSON.stringify(this.data));
    window.open('index.html?preview=1', '_blank');
  },

  // ── Utility ────────────────────────────────────────────────
  val(id) {
    const el = document.getElementById(id);
    return el ? el.value : null;
  },

  esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  escAttr(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Editor.init());
