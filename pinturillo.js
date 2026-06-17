/* ════════════════════════════════════════════════════════════════
   PINTURILLO · Tegn og gæt (dibuja y adivina) — español A1
   Dos modos:
     1) "Én enhed pr. gruppe"  → local, sin internet (1 dispositivo por grupo).
     2) "Rum med kode (WiFi)"  → multijugador entre dispositivos vía Supabase Realtime.
   Vocabulario A1: animales/comida, acciones/naturaleza, cuerpo/ropa, colores.
   Expone window.renderPinturillo(), llamado por el router de script.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────────── */
  function h(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function say(t) { try { if (window.speakSpanish) window.speakSpanish(t); } catch (e) {} }
  function fmt(s) { const m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; }
  // Normaliza para comparar respuestas (sin acentos, sin artículo, minúsculas)
  function norm(s) {
    return String(s).toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/^(el|la|los|las|un|una|unos|unas)\s+/, '')
      .replace(/[^a-zñ0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function roomCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }

  /* ── Banco de palabras A1 ────────────────────────────────────── */
  // cat = etiqueta de categoría en danés (pista para quien adivina)
  const THEMES = {
    dyrmad:  { label: 'Dyr & mad',        cat: 'Dyr / mad' },
    natur:   { label: 'Handlinger & natur', cat: 'Handling / natur' },
    kroptoj: { label: 'Krop & tøj',       cat: 'Krop / tøj' },
    farver:  { label: 'Farver',           cat: 'Farve' }
  };
  const WORDS = {
    dyrmad: [
      { es: 'perro', da: 'hund' }, { es: 'gato', da: 'kat' }, { es: 'pez', da: 'fisk' },
      { es: 'pájaro', da: 'fugl' }, { es: 'caballo', da: 'hest' }, { es: 'vaca', da: 'ko' },
      { es: 'pan', da: 'brød' }, { es: 'manzana', da: 'æble' }, { es: 'plátano', da: 'banan' },
      { es: 'queso', da: 'ost' }, { es: 'leche', da: 'mælk' }, { es: 'pizza', da: 'pizza' },
      { es: 'huevo', da: 'æg' }, { es: 'pollo', da: 'kylling' }, { es: 'helado', da: 'is' },
      { es: 'pastel', da: 'kage' }
    ],
    natur: [
      { es: 'correr', da: 'at løbe' }, { es: 'dormir', da: 'at sove' }, { es: 'comer', da: 'at spise' },
      { es: 'beber', da: 'at drikke' }, { es: 'bailar', da: 'at danse' }, { es: 'saltar', da: 'at hoppe' },
      { es: 'llorar', da: 'at græde' }, { es: 'sol', da: 'sol' }, { es: 'luna', da: 'måne' },
      { es: 'árbol', da: 'træ' }, { es: 'flor', da: 'blomst' }, { es: 'lluvia', da: 'regn' },
      { es: 'estrella', da: 'stjerne' }, { es: 'montaña', da: 'bjerg' }, { es: 'nube', da: 'sky' },
      { es: 'mar', da: 'hav' }
    ],
    kroptoj: [
      { es: 'ojo', da: 'øje' }, { es: 'mano', da: 'hånd' }, { es: 'pie', da: 'fod' },
      { es: 'cabeza', da: 'hoved' }, { es: 'boca', da: 'mund' }, { es: 'nariz', da: 'næse' },
      { es: 'pelo', da: 'hår' }, { es: 'diente', da: 'tand' }, { es: 'camiseta', da: 'T-shirt' },
      { es: 'zapato', da: 'sko' }, { es: 'pantalón', da: 'bukser' }, { es: 'gorro', da: 'hue' },
      { es: 'vestido', da: 'kjole' }, { es: 'falda', da: 'nederdel' }, { es: 'gafas', da: 'briller' },
      { es: 'calcetín', da: 'sok' }
    ],
    farver: [
      { es: 'rojo', da: 'rød' }, { es: 'azul', da: 'blå' }, { es: 'verde', da: 'grøn' },
      { es: 'amarillo', da: 'gul' }, { es: 'negro', da: 'sort' }, { es: 'blanco', da: 'hvid' },
      { es: 'naranja', da: 'orange' }, { es: 'rosa', da: 'lyserød' }, { es: 'morado', da: 'lilla' },
      { es: 'marrón', da: 'brun' }, { es: 'gris', da: 'grå' }
    ]
  };
  function buildDeck(themeKeys) {
    let pool = [];
    themeKeys.forEach(k => { if (WORDS[k]) pool = pool.concat(WORDS[k].map(w => Object.assign({ theme: k, cat: THEMES[k].cat }, w))); });
    if (!pool.length) Object.keys(WORDS).forEach(k => pool = pool.concat(WORDS[k].map(w => Object.assign({ theme: k, cat: THEMES[k].cat }, w))));
    return shuffle(pool);
  }

  /* ── Máscara de pista: "_ a _ a" con letras reveladas ─────────── */
  function maskWord(word, revealSet) {
    return word.split('').map((ch, i) => {
      if (ch === ' ') return '&nbsp;&nbsp;';
      if (revealSet && revealSet.has(i)) return '<b>' + esc(ch) + '</b>';
      return '<span class="pn-blank">_</span>';
    }).join(' ');
  }
  // Devuelve índices de letras (no espacios) para revelar progresivamente
  function letterIndices(word) {
    const idx = []; for (let i = 0; i < word.length; i++) if (word[i] !== ' ') idx.push(i); return idx;
  }

  /* ── Motor de dibujo (canvas) ────────────────────────────────── */
  function DrawBoard(opts) {
    opts = opts || {};
    const wrap = h('div', 'pn-board');
    const canvas = h('canvas', 'pn-canvas');
    wrap.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let enabled = false, down = false, last = null;
    let color = '#1a1a2e', size = 6, eraser = false;
    const ops = []; // log normalizado para repintar / sincronizar

    function cssSize() {
      const r = canvas.getBoundingClientRect();
      return { w: r.width || 600, h: r.height || 450 };
    }
    function resize(replay) {
      const { w, h: hh } = cssSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(hh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      paintBg();
      if (replay !== false) ops.forEach(drawOp);
    }
    function paintBg() { const { w, h: hh } = cssSize(); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore(); }
    function drawSeg(x0, y0, x1, y1, col, sz) {
      const { w, h: hh } = cssSize();
      ctx.strokeStyle = col; ctx.lineWidth = sz;
      ctx.beginPath(); ctx.moveTo(x0 * w, y0 * hh); ctx.lineTo(x1 * w, y1 * hh); ctx.stroke();
    }
    function drawOp(op) {
      if (op.t === 'seg') drawSeg(op.a, op.b, op.c, op.d, op.k, op.s);
      else if (op.t === 'clear') { paintBg(); }
    }
    // API remota: aplica operación recibida por red
    function applyOp(op) { if (op.t === 'clear') ops.length = 0; ops.push(op); drawOp(op); }
    function loadOps(arr) { ops.length = 0; paintBg(); (arr || []).forEach(op => { ops.push(op); drawOp(op); }); }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / (r.width || 1);
      const y = (e.clientY - r.top) / (r.height || 1);
      return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }
    function onDown(e) {
      if (!enabled) return;
      e.preventDefault(); down = true; last = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
    }
    function onMove(e) {
      if (!enabled || !down) return;
      e.preventDefault();
      const p = pos(e);
      const col = eraser ? '#ffffff' : color;
      const sz = eraser ? size * 3 : size;
      const op = { t: 'seg', a: last.x, b: last.y, c: p.x, d: p.y, k: col, s: sz };
      ops.push(op); drawOp(op);
      if (opts.onOp) opts.onOp(op);
      last = p;
    }
    function onUp(e) { down = false; last = null; }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    function clear(emit) {
      const op = { t: 'clear' };
      ops.length = 0; ops.push(op); drawOp(op);
      if (emit && opts.onOp) opts.onOp(op);
    }

    // Barra de herramientas (solo para quien dibuja)
    const palette = ['#1a1a2e', '#ef4444', '#fb923c', '#f59e0b', '#22c55e', '#0ea5e9', '#6366f1', '#ec4899', '#7c4a1e', '#9ca3af', '#ffffff'];
    const toolbar = h('div', 'pn-tools');
    const colorsWrap = h('div', 'pn-colors');
    palette.forEach((c, i) => {
      const b = h('button', 'pn-color' + (i === 0 ? ' active' : ''));
      b.style.background = c; b.dataset.c = c;
      if (c === '#ffffff') b.classList.add('pn-color-white');
      b.addEventListener('click', () => {
        eraser = false; color = c;
        colorsWrap.querySelectorAll('.pn-color').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        toolbar.querySelector('#pn-eraser').classList.remove('active');
      });
      colorsWrap.appendChild(b);
    });
    toolbar.appendChild(colorsWrap);
    const sizesWrap = h('div', 'pn-sizes');
    [[3, 'S'], [6, 'M'], [12, 'L'], [22, 'XL']].forEach((s, i) => {
      const b = h('button', 'pn-size' + (i === 1 ? ' active' : ''), '<span style="width:' + Math.min(s, 16) + 'px;height:' + Math.min(s, 16) + 'px"></span>');
      b.addEventListener('click', () => { size = s[0]; sizesWrap.querySelectorAll('.pn-size').forEach(x => x.classList.remove('active')); b.classList.add('active'); });
      sizesWrap.appendChild(b);
    });
    toolbar.appendChild(sizesWrap);
    const eraserBtn = h('button', 'pn-tool', '🩹 Viskelæder'); eraserBtn.id = 'pn-eraser';
    eraserBtn.addEventListener('click', () => { eraser = !eraser; eraserBtn.classList.toggle('active', eraser); });
    toolbar.appendChild(eraserBtn);
    const clearBtn = h('button', 'pn-tool', '🗑️ Ryd');
    clearBtn.addEventListener('click', () => clear(true));
    toolbar.appendChild(clearBtn);

    return {
      wrap, toolbar,
      setEnabled(v) { enabled = v; wrap.classList.toggle('pn-board--draw', v); },
      resize, clear, applyOp, loadOps,
      snapshot() { return ops.slice(); },
      mountResize() {
        // primer layout
        requestAnimationFrame(() => resize(true));
        const ro = new ResizeObserver(() => resize(true));
        ro.observe(wrap);
        this._ro = ro;
      },
      destroy() { try { this._ro && this._ro.disconnect(); } catch (e) {} window.removeEventListener('pointerup', onUp); }
    };
  }

  /* ── Estado global del módulo ────────────────────────────────── */
  let VIEW = null;     // sección DOM
  let CUR = null;      // controlador activo (local o wifi), con .destroy()

  function teardown() {
    if (CUR && CUR.destroy) { try { CUR.destroy(); } catch (e) {} }
    CUR = null;
  }

  /* ════════════════════════════════════════════════════════════
     MODO LOCAL — un dispositivo por grupo
     ════════════════════════════════════════════════════════════ */
  function startLocal(players, settings) {
    teardown();
    const deck = buildDeck(settings.themes);
    let deckPos = 0;
    const totalTurns = players.length * settings.rounds;
    let turn = 0;          // 0..totalTurns-1
    let drawerIdx = 0;     // índice en players
    let timer = null;
    let board = null;
    const G = { destroy() { if (timer) clearInterval(timer); if (board) board.destroy(); } };
    CUR = G;

    function nextWordChoices() {
      const choices = [];
      for (let i = 0; i < 3 && deckPos < deck.length; i++) choices.push(deck[deckPos++]);
      if (!choices.length) { // recicla la baraja
        const d2 = shuffle(deck); deck.length = 0; deck.push(...d2); deckPos = 0;
        for (let i = 0; i < 3 && deckPos < deck.length; i++) choices.push(deck[deckPos++]);
      }
      return choices;
    }

    function handoff() {
      if (turn >= totalTurns) return results();
      const drawer = players[drawerIdx];
      const round = Math.floor(turn / players.length) + 1;
      VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-handoff">
    <div class="pn-round-pill">Runde ${round} / ${settings.rounds}</div>
    <div class="pn-handoff-ico">🙈➡️✏️</div>
    <h2 class="pn-h2">Giv enheden til<br><span class="pn-drawer-name">${esc(drawer.name)}</span></h2>
    <p class="pn-sub">De andre må ikke kigge! ${esc(drawer.name)} vælger et ord og tegner det.</p>
    <button class="pn-btn pn-btn-go" id="pn-see">Jeg er ${esc(drawer.name)} — vis mit ord</button>
  </div>
</div>`;
      VIEW.querySelector('#pn-see').addEventListener('click', chooseWord);
    }

    function chooseWord() {
      const choices = nextWordChoices();
      const drawer = players[drawerIdx];
      VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-choose">
    <p class="pn-sub">${esc(drawer.name)}, vælg et ord at tegne:</p>
    <div class="pn-choice-cards">
      ${choices.map((w, i) => `<button class="pn-choice" data-i="${i}">
        <span class="pn-choice-es">${esc(w.es)}</span>
        <span class="pn-choice-da">${esc(w.da)} · ${esc(w.cat)}</span>
      </button>`).join('')}
    </div>
  </div>
</div>`;
      VIEW.querySelectorAll('.pn-choice').forEach(b => {
        b.addEventListener('click', () => playTurn(choices[+b.dataset.i]));
      });
    }

    function playTurn(word) {
      const drawer = players[drawerIdx];
      const others = players.filter((_, i) => i !== drawerIdx);
      const T = settings.secs;
      let timeLeft = T;
      const letters = letterIndices(word.es);
      const reveal = new Set();
      const round = Math.floor(turn / players.length) + 1;

      VIEW.innerHTML = `
<div class="pn-wrap pn-play">
  <div class="pn-topbar">
    <div class="pn-tb-left"><span class="pn-tb-round">R${round}/${settings.rounds}</span> ✏️ <b>${esc(drawer.name)}</b> tegner</div>
    <div class="pn-tb-word"><span class="pn-cat">${esc(word.cat)}</span> <span id="pn-mask">${maskWord(word.es, reveal)}</span></div>
    <div class="pn-tb-timer" id="pn-timer">${fmt(timeLeft)}</div>
  </div>
  <div class="pn-secret" id="pn-secret">Dit ord: <b>${esc(word.es)}</b> <span class="pn-secret-da">(${esc(word.da)})</span> · 🔊 <button id="pn-hear" class="pn-mini">hør</button> <button id="pn-hide" class="pn-mini">skjul</button></div>
  <div id="pn-boardslot"></div>
  <div class="pn-guesspanel">
    <p class="pn-gp-title">Hvem gættede ordet rigtigt?</p>
    <div class="pn-winners">
      ${others.map((p) => `<button class="pn-winner" data-name="${esc(p.name)}">${esc(p.name)}</button>`).join('')}
      <button class="pn-winner pn-winner-none" data-none="1">⏱️ Ingen / tiden er gået</button>
    </div>
  </div>
</div>`;

      board = DrawBoard({});
      const slot = VIEW.querySelector('#pn-boardslot');
      slot.appendChild(board.wrap);
      slot.appendChild(board.toolbar);
      board.setEnabled(true);
      board.mountResize();

      VIEW.querySelector('#pn-hear').addEventListener('click', () => say(word.es));
      const secret = VIEW.querySelector('#pn-secret');
      VIEW.querySelector('#pn-hide').addEventListener('click', () => secret.classList.toggle('pn-secret--hidden'));

      // Revelado progresivo de letras: 2 pistas durante el turno
      const revealAt = [Math.floor(T * 0.55), Math.floor(T * 0.30)];

      function updateMask() { const m = VIEW.querySelector('#pn-mask'); if (m) m.innerHTML = maskWord(word.es, reveal); }
      function endTurn(winnerName) {
        clearInterval(timer); timer = null;
        let pts = 0;
        if (winnerName) {
          pts = 30 + Math.round(70 * timeLeft / T);
          const wp = players.find(p => p.name === winnerName); if (wp) wp.score += pts;
          drawer.score += 25; // bonus al dibujante
        }
        showResult(word, winnerName, pts);
      }

      timer = setInterval(() => {
        timeLeft--;
        const tEl = VIEW.querySelector('#pn-timer');
        if (tEl) { tEl.textContent = fmt(timeLeft); tEl.classList.toggle('pn-low', timeLeft <= 10); }
        if (revealAt.includes(timeLeft) && reveal.size < letters.length - 1) {
          const hidden = letters.filter(i => !reveal.has(i));
          if (hidden.length > 1) { reveal.add(hidden[Math.floor(Math.random() * hidden.length)]); updateMask(); }
        }
        if (timeLeft <= 0) endTurn(null);
      }, 1000);

      VIEW.querySelectorAll('.pn-winner').forEach(b => {
        b.addEventListener('click', () => endTurn(b.dataset.none ? null : b.dataset.name));
      });
    }

    function showResult(word, winnerName, pts) {
      if (board) { board.destroy(); board = null; }
      say(word.es);
      const sorted = players.slice().sort((a, b) => b.score - a.score);
      VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-result">
    <div class="pn-result-word">Ordet var: <b>${esc(word.es)}</b> <span class="pn-secret-da">(${esc(word.da)})</span></div>
    ${winnerName
        ? `<div class="pn-result-win">🎉 <b>${esc(winnerName)}</b> gættede rigtigt! +${pts} point<br><span class="pn-sub">${esc(players[drawerIdx].name)} (tegner) +25</span></div>`
        : `<div class="pn-result-win">⏱️ Ingen gættede ordet denne gang.</div>`}
    <div class="pn-mini-scores">
      ${sorted.map(p => `<div class="pn-ms-row"><span>${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}
    </div>
    <button class="pn-btn pn-btn-go" id="pn-next">Næste tur →</button>
  </div>
</div>`;
      VIEW.querySelector('#pn-next').addEventListener('click', () => {
        turn++; drawerIdx = (drawerIdx + 1) % players.length;
        handoff();
      });
    }

    function results() {
      const sorted = players.slice().sort((a, b) => b.score - a.score);
      const top = sorted[0];
      VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-final">
    <div class="pn-logo">PINTURILLO</div>
    <div class="pn-trophy">🏆</div>
    <h2 class="pn-h2">${esc(top.name)} vinder!</h2>
    <div class="pn-final-scores">
      ${sorted.map((p, i) => `<div class="pn-fs-row ${i === 0 ? 'pn-fs-1' : ''}"><span class="pn-fs-pos">${i + 1}</span><span class="pn-fs-name">${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}
    </div>
    <button class="pn-btn pn-btn-go" id="pn-again">↺ Spil igen</button>
  </div>
</div>`;
      VIEW.querySelector('#pn-again').addEventListener('click', () => renderEntry());
    }

    handoff();
  }

  /* ── Pantalla de configuración del modo local ────────────────── */
  function setupLocal() {
    let players = ['', '', ''];
    function draw() {
      VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-setup">
    <button class="pn-back" id="pn-back">← Tilbage</button>
    <div class="pn-logo">PINTURILLO</div>
    <h2 class="pn-h2">Én enhed pr. gruppe</h2>
    <p class="pn-sub">Skriv navnene på spillerne i gruppen. Én tegner, resten gætter højt — tryk så på hvem der gættede rigtigt.</p>

    <div class="pn-field"><span class="pn-field-lbl">Spillere</span>
      <div id="pn-players">
        ${players.map((p, i) => `<div class="pn-prow"><input class="pn-input pn-pname" data-i="${i}" maxlength="14" placeholder="Spiller ${i + 1}" value="${esc(p)}"/>${players.length > 2 ? `<button class="pn-del" data-i="${i}">✕</button>` : ''}</div>`).join('')}
      </div>
      <button class="pn-add" id="pn-add">+ Tilføj spiller</button>
    </div>

    <div class="pn-field"><span class="pn-field-lbl">Runder (hver spiller tegner pr. runde) <small id="pn-rounds-lbl">2</small></span>
      <input type="range" id="pn-rounds" class="pn-range" min="1" max="5" step="1" value="2"/></div>
    <div class="pn-field"><span class="pn-field-lbl">Tid pr. tur <small id="pn-secs-lbl">1:00</small></span>
      <input type="range" id="pn-secs" class="pn-range" min="40" max="120" step="10" value="60"/></div>

    ${themePicker()}

    <p class="pn-err" id="pn-err"></p>
    <button class="pn-btn pn-btn-go" id="pn-start">▶ Start spillet</button>
  </div>
</div>`;
      bindThemePicker();
      VIEW.querySelector('#pn-back').addEventListener('click', renderEntry);
      const sync = () => { VIEW.querySelectorAll('.pn-pname').forEach(inp => { players[+inp.dataset.i] = inp.value; }); };
      VIEW.querySelectorAll('.pn-pname').forEach(inp => inp.addEventListener('input', () => { players[+inp.dataset.i] = inp.value; }));
      VIEW.querySelectorAll('.pn-del').forEach(b => b.addEventListener('click', () => { sync(); players.splice(+b.dataset.i, 1); draw(); }));
      VIEW.querySelector('#pn-add').addEventListener('click', () => { sync(); if (players.length < 8) players.push(''); draw(); });
      const rR = VIEW.querySelector('#pn-rounds'), rL = VIEW.querySelector('#pn-rounds-lbl');
      rR.addEventListener('input', () => rL.textContent = rR.value);
      const sR = VIEW.querySelector('#pn-secs'), sL = VIEW.querySelector('#pn-secs-lbl');
      sR.addEventListener('input', () => sL.textContent = fmt(+sR.value));
      VIEW.querySelector('#pn-start').addEventListener('click', () => {
        sync();
        const names = players.map(p => p.trim()).filter(Boolean);
        const err = VIEW.querySelector('#pn-err');
        if (names.length < 2) { err.textContent = 'Skriv mindst 2 spillere.'; return; }
        const themes = getPickedThemes();
        startLocal(names.map(n => ({ name: n, score: 0 })), { rounds: +rR.value, secs: +sR.value, themes });
      });
    }
    draw();
  }

  /* ── Selector de temas (compartido) ──────────────────────────── */
  function themePicker() {
    return `<div class="pn-field"><span class="pn-field-lbl">Temaer</span>
      <div class="pn-themes" id="pn-themes">
        ${Object.keys(THEMES).map(k => `<button class="pn-theme active" data-k="${k}">${esc(THEMES[k].label)}</button>`).join('')}
      </div></div>`;
  }
  function bindThemePicker() {
    VIEW.querySelectorAll('.pn-theme').forEach(b => b.addEventListener('click', () => b.classList.toggle('active')));
  }
  function getPickedThemes() {
    const ks = Array.from(VIEW.querySelectorAll('.pn-theme.active')).map(b => b.dataset.k);
    return ks.length ? ks : Object.keys(THEMES);
  }

  /* ════════════════════════════════════════════════════════════
     MODO WiFi — salas en tiempo real (Supabase Realtime)
     ════════════════════════════════════════════════════════════ */
  function getClient() {
    if (window._sbClient) return window._sbClient;
    if (window.getDb) { try { return window.getDb(); } catch (e) {} }
    return null;
  }

  function maskFromPattern(pattern, revealed) {
    const rev = {}; (revealed || []).forEach(r => { rev[r.i] = r.ch; });
    return pattern.split('').map((ch, i) => {
      if (ch === ' ') return '&nbsp;&nbsp;';
      if (rev[i] != null) return '<b>' + esc(rev[i]) + '</b>';
      return '<span class="pn-blank">_</span>';
    }).join(' ');
  }

  /* ── Lobby / configuración WiFi ──────────────────────────────── */
  function setupWifi() {
    const client = getClient();
    VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-setup">
    <button class="pn-back" id="pn-back">← Tilbage</button>
    <div class="pn-logo">PINTURILLO</div>
    <h2 class="pn-h2">Rum med kode (WiFi)</h2>
    ${client ? '' : '<p class="pn-err">⚠ Kan ikke forbinde til serveren. Tjek internet/WiFi og prøv igen.</p>'}
    <p class="pn-sub">Lav et rum og del koden, eller skriv en kode for at deltage. Alle skal være på internet/WiFi.</p>

    <div class="pn-field"><span class="pn-field-lbl">Dit navn</span>
      <input class="pn-input" id="pn-name" maxlength="14" placeholder="F.eks. Sofie"/></div>

    <button class="pn-btn pn-btn-go" id="pn-create">➕ Opret nyt rum</button>

    <div class="pn-or">eller</div>

    <div class="pn-field"><span class="pn-field-lbl">Deltag med kode</span>
      <div class="pn-joinrow">
        <input class="pn-input pn-code-in" id="pn-code" maxlength="4" placeholder="ABCD" style="text-transform:uppercase"/>
        <button class="pn-btn pn-btn-join" id="pn-join">Deltag</button>
      </div></div>

    ${themePicker()}
    <p class="pn-sub" style="opacity:.6;font-size:.74rem">Temaer vælges af den, der opretter rummet.</p>
    <p class="pn-err" id="pn-err"></p>
  </div>
</div>`;
    bindThemePicker();
    VIEW.querySelector('#pn-back').addEventListener('click', renderEntry);
    const nameI = VIEW.querySelector('#pn-name');
    const errEl = VIEW.querySelector('#pn-err');
    function need() {
      if (!getClient()) { errEl.textContent = 'Ingen forbindelse til serveren.'; return null; }
      const n = nameI.value.trim();
      if (!n) { errEl.textContent = 'Skriv dit navn først.'; return null; }
      return n;
    }
    VIEW.querySelector('#pn-create').addEventListener('click', () => {
      const n = need(); if (!n) return;
      startWifi(n, roomCode(), true, getPickedThemes());
    });
    VIEW.querySelector('#pn-join').addEventListener('click', () => {
      const n = need(); if (!n) return;
      const code = (VIEW.querySelector('#pn-code').value || '').trim().toUpperCase();
      if (code.length < 3) { errEl.textContent = 'Skriv en gyldig rumkode.'; return; }
      startWifi(n, code, false, null);
    });
  }

  /* ── Partida WiFi ────────────────────────────────────────────── */
  function startWifi(myName, code, isHost, themes) {
    teardown();
    const client = getClient();
    if (!client) { renderEntry(); return; }
    const myId = uid();
    const settings = { rounds: 3, secs: 70, themes: themes || Object.keys(THEMES) };

    let STATE = null;          // estado autoritario (lo posee el host)
    let myWord = null;         // {es,da} solo si soy el dibujante
    let board = null;
    let ticker = null;
    let chatLog = [];
    let renderKey = '';
    let deck = isHost ? buildDeck(settings.themes) : [];
    let deckPos = 0;
    let presence = {};         // id -> name

    const channel = client.channel('pinturillo:' + code, {
      config: { broadcast: { self: false }, presence: { key: myId } }
    });

    const G = {
      destroy() {
        if (ticker) clearInterval(ticker);
        if (board) board.destroy();
        try { client.removeChannel(channel); } catch (e) {}
      }
    };
    CUR = G;

    function bc(event, payload) { channel.send({ type: 'broadcast', event, payload: payload || {} }); }

    /* ---------- HOST: lógica del juego ---------- */
    function presentIds() { return Object.keys(presence); }
    function pickWord() {
      if (deckPos >= deck.length) { deck = shuffle(buildDeck(settings.themes)); deckPos = 0; }
      return deck[deckPos++];
    }
    function hostStartGame() {
      const ids = presentIds();
      if (ids.length < 2) return;
      STATE = {
        hostId: myId, phase: 'draw', round: 1, totalRounds: settings.rounds, secs: settings.secs,
        order: shuffle(ids), di: 0,
        drawerId: null, drawerName: '', cat: '', pattern: '', revealed: [], timeLeft: settings.secs,
        players: ids.map(id => ({ id, name: presence[id] || '?', score: 0 })),
        correctIds: [], result: null
      };
      hostBeginTurn();
    }
    function hostBeginTurn() {
      // limpiar jugadores que se fueron del orden
      STATE.order = STATE.order.filter(id => presence[id]);
      if (STATE.order.length < 2) { hostEndGame(); return; }
      if (STATE.di >= STATE.order.length) { STATE.di = 0; STATE.round++; }
      if (STATE.round > STATE.totalRounds) { hostEndGame(); return; }
      const w = pickWord();
      myWord = null;
      STATE.phase = 'draw';
      STATE.drawerId = STATE.order[STATE.di];
      STATE.drawerName = presence[STATE.drawerId] || '?';
      STATE.cat = w.cat;
      STATE.pattern = w.es.replace(/[^ ]/g, '_');
      STATE.revealed = [];
      STATE.timeLeft = settings.secs;
      STATE.correctIds = [];
      STATE.result = null;
      STATE._word = { es: w.es, da: w.da }; // privado del host, se quita al difundir
      // sincronizar lista de jugadores con presencia (mantener puntuación)
      syncPlayers();
      // enviar palabra solo al dibujante
      if (STATE.drawerId === myId) myWord = { es: w.es, da: w.da };
      else bc('yourword', { to: STATE.drawerId, es: w.es, da: w.da });
      pushState();
      hostTick();
    }
    function syncPlayers() {
      const byId = {}; STATE.players.forEach(p => byId[p.id] = p);
      STATE.players = presentIds().map(id => ({ id, name: presence[id] || '?', score: byId[id] ? byId[id].score : 0 }));
    }
    function hostTick() {
      if (ticker) clearInterval(ticker);
      ticker = setInterval(() => {
        if (!STATE || STATE.phase !== 'draw') return;
        STATE.timeLeft--;
        const letters = []; for (let i = 0; i < STATE.pattern.length; i++) if (STATE.pattern[i] !== ' ') letters.push(i);
        const T = settings.secs;
        if ((STATE.timeLeft === Math.floor(T * 0.55) || STATE.timeLeft === Math.floor(T * 0.30)) && STATE.revealed.length < letters.length - 1) {
          const hidden = letters.filter(i => !STATE.revealed.some(r => r.i === i));
          if (hidden.length > 1) { const i = hidden[Math.floor(Math.random() * hidden.length)]; STATE.revealed.push({ i, ch: STATE._word.es[i] }); }
        }
        if (STATE.timeLeft <= 0) { hostEndTurn(false); return; }
        pushState();
      }, 1000);
    }
    function hostHandleGuess(g) {
      if (!STATE || STATE.phase !== 'draw' || !STATE._word) return;
      if (g.id === STATE.drawerId) return;
      if (STATE.correctIds.includes(g.id)) return;
      if (norm(g.text) === norm(STATE._word.es)) {
        STATE.correctIds.push(g.id);
        const pts = 30 + Math.round(70 * Math.max(0, STATE.timeLeft) / settings.secs);
        const gp = STATE.players.find(p => p.id === g.id); if (gp) gp.score += pts;
        const dp = STATE.players.find(p => p.id === STATE.drawerId); if (dp) dp.score += 20;
        hostChat({ kind: 'good', name: g.name, text: 'gættede rigtigt! +' + pts });
        const guessers = STATE.order.filter(id => id !== STATE.drawerId && presence[id]);
        if (guessers.every(id => STATE.correctIds.includes(id))) { hostEndTurn(true); return; }
        pushState();
      } else {
        hostChat({ kind: 'try', name: g.name, text: g.text });
      }
    }
    function hostEndTurn(allGuessed) {
      STATE.phase = 'reveal';
      STATE.result = { es: STATE._word.es, da: STATE._word.da, allGuessed: !!allGuessed };
      if (ticker) { clearInterval(ticker); ticker = null; }
      pushState();
      setTimeout(() => { if (!STATE) return; STATE.di++; hostBeginTurn(); }, 5500);
    }
    function hostEndGame() {
      STATE.phase = 'over';
      if (ticker) { clearInterval(ticker); ticker = null; }
      pushState();
    }
    function hostChat(msg) { chatLog.push(msg); if (chatLog.length > 40) chatLog.shift(); bc('chat', msg); appendChat(msg); }
    function pushState() {
      const pub = Object.assign({}, STATE); delete pub._word;
      bc('state', pub);
      STATE && applyState(pub); // el host también se pinta
    }

    /* ---------- CLIENTE: pintar desde el estado ---------- */
    function applyState(s) {
      if (!isHost) STATE = s; // el host conserva su STATE (con _word secreto)
      const key = s.phase + '|' + s.drawerId + '|' + s.round;
      if (key !== renderKey) { renderKey = key; fullRender(s); }
      else { patch(s); }
    }
    function amDrawer(s) { return s.drawerId === myId; }

    function fullRender(s) {
      if (board) { board.destroy(); board = null; }
      if (s.phase === 'over') return renderOver(s);
      if (s.phase === 'reveal' || s.phase === 'draw') return renderPlay(s);
      renderLobby();
    }

    function renderPlay(s) {
      const drawer = amDrawer(s);
      VIEW.innerHTML = `
<div class="pn-wrap pn-play">
  <div class="pn-topbar">
    <div class="pn-tb-left"><span class="pn-tb-round">R${s.round}/${s.totalRounds}</span> ✏️ <b>${esc(s.drawerName)}</b></div>
    <div class="pn-tb-word"><span class="pn-cat">${esc(s.cat)}</span> <span id="pn-mask">${maskFromPattern(s.pattern, s.revealed)}</span></div>
    <div class="pn-tb-timer" id="pn-timer">${fmt(s.timeLeft)}</div>
  </div>
  ${drawer ? `<div class="pn-secret" id="pn-secret">Dit ord: <b id="pn-myword">${myWord ? esc(myWord.es) : '…'}</b> <span class="pn-secret-da" id="pn-myword-da">${myWord ? '(' + esc(myWord.da) + ')' : ''}</span> · <button id="pn-hear" class="pn-mini">🔊 hør</button></div>` : ''}
  <div class="pn-game2col">
    <div id="pn-boardslot" class="pn-boardcol"></div>
    <div class="pn-sidecol">
      <div class="pn-scorebox" id="pn-scores">${scoresHtml(s)}</div>
      <div class="pn-chat" id="pn-chat">${chatLog.map(chatRow).join('')}</div>
      ${drawer ? '<div class="pn-drawer-note">Du tegner — de andre gætter 🎨</div>'
        : `<form class="pn-guessform" id="pn-gform"><input class="pn-input" id="pn-guess" maxlength="20" placeholder="Skriv dit gæt på spansk…" autocomplete="off"/><button class="pn-btn pn-btn-join" type="submit">Gæt</button></form>`}
    </div>
  </div>
  <div class="pn-roomtag">Rum: <b>${esc(code)}</b></div>
</div>`;

      board = DrawBoard({ onOp: (op) => bc('draw', op) });
      const slot = VIEW.querySelector('#pn-boardslot');
      slot.appendChild(board.wrap);
      if (drawer) { slot.appendChild(board.toolbar); board.setEnabled(true); }
      else board.setEnabled(false);
      board.mountResize();
      // el dibujante reenvía su dibujo cuando alguien entra
      if (drawer) setTimeout(() => bc('sync', { ops: board.snapshot() }), 300);

      if (drawer) {
        const hb = VIEW.querySelector('#pn-hear'); if (hb) hb.addEventListener('click', () => myWord && say(myWord.es));
      } else {
        const f = VIEW.querySelector('#pn-gform');
        if (f) f.addEventListener('submit', (e) => {
          e.preventDefault();
          const inp = VIEW.querySelector('#pn-guess'); const t = inp.value.trim(); if (!t) return; inp.value = '';
          submitGuess(t);
        });
      }
      if (s.phase === 'reveal') showRevealOverlay(s);
    }

    function showRevealOverlay(s) {
      const note = h('div', 'pn-reveal-banner');
      note.innerHTML = `Ordet var: <b>${esc(s.result.es)}</b> <span class="pn-secret-da">(${esc(s.result.da)})</span>`;
      const tb = VIEW.querySelector('.pn-play'); if (tb) tb.appendChild(note);
      say(s.result.es);
    }

    function renderOver(s) {
      const sorted = s.players.slice().sort((a, b) => b.score - a.score);
      const top = sorted[0] || { name: '?' };
      VIEW.innerHTML = `
<div class="pn-wrap"><div class="pn-final">
  <div class="pn-logo">PINTURILLO</div><div class="pn-trophy">🏆</div>
  <h2 class="pn-h2">${esc(top.name)} vinder!</h2>
  <div class="pn-final-scores">
    ${sorted.map((p, i) => `<div class="pn-fs-row ${i === 0 ? 'pn-fs-1' : ''}"><span class="pn-fs-pos">${i + 1}</span><span class="pn-fs-name">${esc(p.name)}</span><b>${p.score}</b></div>`).join('')}
  </div>
  ${isHost ? '<button class="pn-btn pn-btn-go" id="pn-restart">↺ Spil igen</button>' : '<p class="pn-sub">Venter på at værten starter igen…</p>'}
  <button class="pn-leave" id="pn-leave">Forlad rum</button>
</div></div>`;
      const rb = VIEW.querySelector('#pn-restart'); if (rb) rb.addEventListener('click', () => { deck = shuffle(buildDeck(settings.themes)); deckPos = 0; hostStartGame(); });
      VIEW.querySelector('#pn-leave').addEventListener('click', renderEntry);
    }

    function scoresHtml(s) {
      const sorted = s.players.slice().sort((a, b) => b.score - a.score);
      return sorted.map(p => `<div class="pn-sc-row ${p.id === s.drawerId ? 'pn-sc-draw' : ''} ${s.correctIds && s.correctIds.includes(p.id) ? 'pn-sc-ok' : ''}">
        <span>${p.id === s.drawerId ? '✏️ ' : ''}${esc(p.name)}${p.id === myId ? ' (dig)' : ''}</span><b>${p.score}</b></div>`).join('');
    }
    function chatRow(m) {
      if (m.kind === 'good') return `<div class="pn-chat-row pn-chat-good"><b>${esc(m.name)}</b> ${esc(m.text)}</div>`;
      if (m.kind === 'sys') return `<div class="pn-chat-row pn-chat-sys">${esc(m.text)}</div>`;
      return `<div class="pn-chat-row"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>`;
    }
    function appendChat(m) {
      const c = VIEW.querySelector('#pn-chat'); if (!c) return;
      c.insertAdjacentHTML('beforeend', chatRow(m)); c.scrollTop = c.scrollHeight;
    }
    function patch(s) {
      const t = VIEW.querySelector('#pn-timer'); if (t) { t.textContent = fmt(s.timeLeft); t.classList.toggle('pn-low', s.timeLeft <= 10); }
      const m = VIEW.querySelector('#pn-mask'); if (m) m.innerHTML = maskFromPattern(s.pattern, s.revealed);
      const sc = VIEW.querySelector('#pn-scores'); if (sc) sc.innerHTML = scoresHtml(s);
    }

    function submitGuess(text) {
      const g = { id: myId, name: myName, text };
      if (isHost) hostHandleGuess(g);
      else bc('guess', g);
    }

    function renderLobby() {
      const ids = presentIds();
      VIEW.innerHTML = `
<div class="pn-wrap"><div class="pn-lobby">
  <div class="pn-logo">PINTURILLO</div>
  <h2 class="pn-h2">Venterum</h2>
  <div class="pn-codebox">Rumkode<br><span class="pn-codebig">${esc(code)}</span><small>Del koden med din gruppe</small></div>
  <div class="pn-field"><span class="pn-field-lbl">Spillere (${ids.length})</span>
    <div class="pn-lobby-players">${ids.map(id => `<div class="pn-lp">${esc(presence[id] || '?')}${id === myId ? ' (dig)' : ''}${id === myId && isHost ? ' 👑' : ''}</div>`).join('')}</div>
  </div>
  ${isHost
        ? `<button class="pn-btn pn-btn-go" id="pn-startwifi" ${ids.length < 2 ? 'disabled' : ''}>${ids.length < 2 ? 'Venter på flere spillere…' : '▶ Start spillet'}</button>`
        : '<p class="pn-sub">Venter på, at værten starter spillet…</p>'}
  <button class="pn-leave" id="pn-leave">Forlad rum</button>
</div></div>`;
      const sb = VIEW.querySelector('#pn-startwifi');
      if (sb) sb.addEventListener('click', hostStartGame);
      VIEW.querySelector('#pn-leave').addEventListener('click', renderEntry);
    }

    /* ---------- Eventos del canal ---------- */
    channel.on('broadcast', { event: 'state' }, ({ payload }) => { if (!isHost) applyState(payload); });
    channel.on('broadcast', { event: 'draw' }, ({ payload }) => { if (!amDrawer(STATE || {}) && board) board.applyOp(payload); });
    channel.on('broadcast', { event: 'sync' }, ({ payload }) => { if (STATE && !amDrawer(STATE) && board) board.loadOps(payload.ops); });
    channel.on('broadcast', { event: 'yourword' }, ({ payload }) => {
      if (payload.to !== myId) return;
      myWord = { es: payload.es, da: payload.da };
      const w = VIEW.querySelector('#pn-myword'); if (w) w.textContent = myWord.es;
      const wd = VIEW.querySelector('#pn-myword-da'); if (wd) wd.textContent = '(' + myWord.da + ')';
    });
    channel.on('broadcast', { event: 'guess' }, ({ payload }) => { if (isHost) hostHandleGuess(payload); });
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => { chatLog.push(payload); if (chatLog.length > 40) chatLog.shift(); appendChat(payload); });

    channel.on('presence', { event: 'sync' }, () => {
      const st = channel.presenceState();
      presence = {};
      Object.keys(st).forEach(k => { const meta = st[k] && st[k][0]; presence[k] = (meta && meta.name) || '?'; });
      // refrescar lobby / lista de jugadores
      if (!STATE || STATE.phase === undefined) renderLobby();
      else if (STATE.phase === 'over') { /* nada */ }
      if (isHost && STATE && STATE.phase && STATE.phase !== 'over') { syncPlayers(); pushState(); }
      if (!STATE) renderLobby();
    });
    channel.on('presence', { event: 'join' }, () => {
      // el dibujante reenvía su lienzo a quien entra
      if (STATE && amDrawer(STATE) && board) setTimeout(() => bc('sync', { ops: board.snapshot() }), 400);
    });

    // Pantalla de "conectando…"
    VIEW.innerHTML = `<div class="pn-wrap"><div class="pn-lobby"><div class="pn-logo">PINTURILLO</div><p class="pn-sub">Forbinder til rum <b>${esc(code)}</b>…</p><div class="pn-spin"></div></div></div>`;

    channel.subscribe(async (status, err) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: myName, id: myId });
        renderLobby();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        VIEW.innerHTML = `<div class="pn-wrap"><div class="pn-lobby"><div class="pn-logo">PINTURILLO</div><p class="pn-err">⚠ Kunne ikke forbinde til rummet.<br>Tjek WiFi og prøv igen.</p><button class="pn-btn pn-btn-go" id="pn-retry">← Tilbage</button></div></div>`;
        const r = VIEW.querySelector('#pn-retry'); if (r) r.addEventListener('click', renderEntry);
      }
    });
  }

  /* ── Pantalla de entrada (elección de modo) ──────────────────── */
  function renderEntry() {
    teardown();
    VIEW.innerHTML = `
<div class="pn-wrap">
  <div class="pn-entry">
    <div class="pn-logo">PINTURILLO</div>
    <h2 class="pn-title">Tegn & gæt på spansk</h2>
    <p class="pn-sub">Én tegner et ord, resten gætter. Hurtige gæt giver flere point! ✏️🎨</p>
    <div class="pn-modes">
      <button class="pn-mode" id="pn-mode-local">
        <span class="pn-mode-ico">📱</span>
        <span class="pn-mode-name">Én enhed pr. gruppe</span>
        <span class="pn-mode-desc">Uden internet. Én telefon/tablet pr. gruppe — giv den videre på skift.</span>
      </button>
      <button class="pn-mode" id="pn-mode-wifi">
        <span class="pn-mode-ico">🌐</span>
        <span class="pn-mode-name">Rum med kode (WiFi)</span>
        <span class="pn-mode-desc">Hver elev på sin egen enhed. Lav et rum og del koden. Kræver WiFi.</span>
      </button>
    </div>
  </div>
</div>`;
    VIEW.querySelector('#pn-mode-local').addEventListener('click', setupLocal);
    VIEW.querySelector('#pn-mode-wifi').addEventListener('click', setupWifi);
  }

  /* ── Entrada pública (router) ────────────────────────────────── */
  window.renderPinturillo = function () {
    VIEW = document.getElementById('view-pinturillo');
    if (!VIEW) return;
    renderEntry();
  };
  window.__pinturilloTeardown = teardown;

  // Exponer utilidades para tests / modo wifi
  window.__pinturillo = { norm, maskWord, letterIndices, buildDeck, DrawBoard, WORDS, THEMES, fmt };
})();
