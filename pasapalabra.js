/* ════════════════════════════════════════════════════════════════
   PASAPALABRA · EL ROSCO
   Juego autónomo para clase de español (proyectable).
   - Modo "Hel klasse" (cooperativo, un reloj) y "Hold mod hold" (2 equipos).
   - Banco de palabras de principiante con traducción al danés incorporado,
     así funciona sin configurar nada.
   - Opción de usar el vocabulario de la clase (Tablón) si existe.
   Expone window.renderPasapalabra(), llamado por el router de script.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Mini-helpers (autónomos, no dependen de script.js) ──────────
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
  function say(text) {
    try { if (window.speakSpanish) window.speakSpanish(text); } catch (e) {}
  }
  function fmtTime(s) {
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  // ── Banco de palabras (principiante). type: 'starts' | 'contains' ──
  // es = palabra en español (respuesta) · da = pista en danés.
  const BANK = [
    { L: 'A', type: 'starts',   es: 'agua',    da: 'vand' },
    { L: 'B', type: 'starts',   es: 'bueno',   da: 'god' },
    { L: 'C', type: 'starts',   es: 'casa',    da: 'hus' },
    { L: 'D', type: 'starts',   es: 'día',     da: 'dag' },
    { L: 'E', type: 'starts',   es: 'escuela', da: 'skole' },
    { L: 'F', type: 'starts',   es: 'familia', da: 'familie' },
    { L: 'G', type: 'starts',   es: 'gato',    da: 'kat' },
    { L: 'H', type: 'starts',   es: 'hola',    da: 'hej' },
    { L: 'I', type: 'starts',   es: 'isla',    da: 'ø' },
    { L: 'J', type: 'starts',   es: 'jugar',   da: 'at lege / spille' },
    { L: 'K', type: 'starts',   es: 'kilo',    da: 'kilo' },
    { L: 'L', type: 'starts',   es: 'libro',   da: 'bog' },
    { L: 'M', type: 'starts',   es: 'madre',   da: 'mor' },
    { L: 'N', type: 'starts',   es: 'naranja', da: 'appelsin' },
    { L: 'Ñ', type: 'contains', es: 'niño',    da: 'dreng (barn)' },
    { L: 'O', type: 'starts',   es: 'ojo',     da: 'øje' },
    { L: 'P', type: 'starts',   es: 'perro',   da: 'hund' },
    { L: 'Q', type: 'starts',   es: 'queso',   da: 'ost' },
    { L: 'R', type: 'starts',   es: 'rojo',    da: 'rød (farve)' },
    { L: 'S', type: 'starts',   es: 'sol',     da: 'sol (på himlen)' },
    { L: 'T', type: 'starts',   es: 'tarde',   da: 'eftermiddag' },
    { L: 'U', type: 'starts',   es: 'uno',     da: 'én – tallet 1' },
    { L: 'V', type: 'starts',   es: 'verde',   da: 'grøn (farve)' },
    { L: 'X', type: 'contains', es: 'examen',  da: 'eksamen / prøve' },
    { L: 'Y', type: 'contains', es: 'ayer',    da: 'i går' },
    { L: 'Z', type: 'starts',   es: 'zapato',  da: 'sko' }
  ];

  // ── Construir rosco desde el vocabulario de clase (si lo hay) ──────
  // Toma una palabra por letra inicial; la pista danesa se traduce on-line.
  function getClassVocab() {
    try { return JSON.parse(localStorage.getItem('vocab') || '[]'); } catch (e) { return []; }
  }
  async function buildBankFromVocab() {
    const vocab = getClassVocab().filter(w => typeof w === 'string' && w.trim());
    if (!vocab.length) return null;
    const byLetter = {};
    vocab.forEach(w => {
      const L = w.trim().charAt(0).toUpperCase();
      if (!byLetter[L]) byLetter[L] = w.trim();
    });
    const letters = Object.keys(byLetter).sort((a, b) => a.localeCompare(b, 'es'));
    if (letters.length < 4) return null; // muy pocas; mejor el banco fijo
    const translate = window.myMemoryTranslate;
    const out = [];
    for (const L of letters) {
      const es = byLetter[L];
      let da = '';
      try { da = translate ? await translate(es, 'es|da') : ''; } catch (e) { da = ''; }
      out.push({ L, type: 'starts', es, da: da || '(?)' });
    }
    return out;
  }

  // ── Estado del juego ──────────────────────────────────────────────
  let S = null;
  let tick = null;

  function freshTeam(bank) {
    return {
      status: bank.map(() => 'pending'), // pending|correct|wrong|passed
      idx: 0,
      time: S.secs,
      done: false
    };
  }

  function clearTick() { if (tick) { clearInterval(tick); tick = null; } }

  // ── Pantalla de configuración ─────────────────────────────────────
  function renderSetup(view) {
    clearTick();
    const hasVocab = getClassVocab().filter(w => typeof w === 'string' && w.trim()).length >= 4;
    view.innerHTML = `
<div class="pp-wrap">
  <div class="pp-setup">
    <div class="pp-logo">PASAPALABRA</div>
    <h2 class="pp-title">El Rosco</h2>
    <p class="pp-sub">Gæt det spanske ord ud fra den danske ledetråd. Hele alfabetet, ét bogstav ad gangen ⏱️</p>

    <div class="pp-field">
      <span class="pp-field-lbl">Spiltilstand</span>
      <div class="pp-seg" id="pp-mode">
        <button class="pp-seg-btn active" data-mode="class">👥 Hel klasse</button>
        <button class="pp-seg-btn" data-mode="teams">⚔️ Hold A mod B</button>
      </div>
    </div>

    <div class="pp-field">
      <span class="pp-field-lbl">Tid <small id="pp-secs-lbl">(2:30)</small></span>
      <input type="range" id="pp-secs" min="60" max="360" step="30" value="150" class="pp-range" />
    </div>

    <label class="pp-check ${hasVocab ? '' : 'pp-check--off'}">
      <input type="checkbox" id="pp-usevocab" ${hasVocab ? '' : 'disabled'} />
      <span>Brug klassens ordforråd ${hasVocab ? '' : '<small>(tilføj ord i Tablón først)</small>'}</span>
    </label>

    <button class="pp-btn pp-btn-go" id="pp-start">▶ Start spillet</button>

    <div class="pp-how">
      <p><strong>Sådan spiller I:</strong> Læreren læser ledetråden højt. Klassen råber det spanske ord.
      Tryk <b style="color:var(--pp-ok)">Rigtigt</b>, <b style="color:var(--pp-err)">Forkert</b> eller <b style="color:var(--pp-pass)">Pasapalabra</b> (spring over og kom tilbage senere).</p>
    </div>
  </div>
</div>`;

    // Tiempo
    const range = view.querySelector('#pp-secs');
    const lbl = view.querySelector('#pp-secs-lbl');
    const updLbl = () => { lbl.textContent = '(' + fmtTime(+range.value) + ')'; };
    range.addEventListener('input', updLbl); updLbl();

    // Modo
    let mode = 'class';
    view.querySelectorAll('#pp-mode .pp-seg-btn').forEach(b => {
      b.addEventListener('click', () => {
        view.querySelectorAll('#pp-mode .pp-seg-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        mode = b.dataset.mode;
      });
    });

    // Empezar
    view.querySelector('#pp-start').addEventListener('click', async () => {
      const secs = +range.value;
      const useVocab = view.querySelector('#pp-usevocab').checked;
      let bank = BANK;
      if (useVocab) {
        const btn = view.querySelector('#pp-start');
        btn.disabled = true; btn.textContent = '⏳ Henter ord…';
        try {
          const vb = await buildBankFromVocab();
          if (vb && vb.length >= 4) bank = vb;
        } catch (e) {}
      }
      startGame(view, mode, secs, bank);
    });
  }

  // ── Iniciar partida ───────────────────────────────────────────────
  function startGame(view, mode, secs, bank) {
    S = { view, mode, secs, bank, revealed: false };
    if (mode === 'teams') {
      S.teams = [freshTeam(bank), freshTeam(bank)];
      S.active = 0;
    } else {
      S.team = freshTeam(bank);
    }
    renderPlay();
    startTimer();
  }

  function curTeam() { return S.mode === 'teams' ? S.teams[S.active] : S.team; }

  function startTimer() {
    clearTick();
    tick = setInterval(() => {
      const t = curTeam();
      if (!t || t.done) return;
      t.time--;
      updateTimerUI();
      if (t.time <= 0) { t.time = 0; finishTeam(); }
    }, 1000);
  }

  // ── Avanzar al siguiente bogstav pendiente o saltado ──────────────
  function nextIndex(t) {
    const n = S.bank.length;
    for (let k = 1; k <= n; k++) {
      const i = (t.idx + k) % n;
      if (t.status[i] === 'pending' || t.status[i] === 'passed') return i;
    }
    return -1; // ninguno
  }

  function remaining(t) {
    return t.status.filter(s => s === 'pending' || s === 'passed').length;
  }

  // ── Acción del profesor ───────────────────────────────────────────
  function answer(result) {
    const t = curTeam();
    if (!t || t.done) return;
    S.revealed = false;
    if (result === 'correct') t.status[t.idx] = 'correct';
    else if (result === 'wrong') t.status[t.idx] = 'wrong';
    else t.status[t.idx] = 'passed';

    const cont = (result === 'correct'); // si acierta, sigue el mismo equipo
    const ni = nextIndex(t);

    if (ni === -1) { finishTeam(); return; }
    t.idx = ni;

    if (S.mode === 'teams' && !cont) {
      // cambiar de turno si el otro equipo aún juega
      const other = S.teams[1 - S.active];
      if (!other.done) { clearTick(); S.active = 1 - S.active; startTimer(); }
    }
    renderPlay();
  }

  function finishTeam() {
    clearTick();
    const t = curTeam();
    t.done = true;
    if (S.mode === 'teams') {
      const other = S.teams[1 - S.active];
      if (!other.done && remaining(other) > 0) {
        S.active = 1 - S.active;
        renderPlay();
        startTimer();
        return;
      }
    }
    renderResults();
  }

  // ── Render del tablero de juego ───────────────────────────────────
  function renderPlay() {
    const t = curTeam();
    const e = S.bank[t.idx];
    const correct = t.status.filter(s => s === 'correct').length;
    const wrong = t.status.filter(s => s === 'wrong').length;

    let scoreboard = '';
    if (S.mode === 'teams') {
      const a = S.teams[0], b = S.teams[1];
      const ca = a.status.filter(s => s === 'correct').length;
      const cb = b.status.filter(s => s === 'correct').length;
      scoreboard = `
<div class="pp-teams">
  <div class="pp-team ${S.active === 0 ? 'pp-team--on' : ''}">
    <span class="pp-team-name">🔵 Hold A</span><span class="pp-team-score">${ca}</span>
    <span class="pp-team-time">${fmtTime(a.time)}</span>
  </div>
  <div class="pp-vs">VS</div>
  <div class="pp-team ${S.active === 1 ? 'pp-team--on' : ''}">
    <span class="pp-team-name">🔴 Hold B</span><span class="pp-team-score">${cb}</span>
    <span class="pp-team-time">${fmtTime(b.time)}</span>
  </div>
</div>`;
    } else {
      scoreboard = `
<div class="pp-classbar">
  <div class="pp-cb-item"><span>✅ Rigtige</span><b id="pp-correct">${correct}</b></div>
  <div class="pp-cb-item pp-cb-timer"><span>⏱️ Tid</span><b id="pp-time">${fmtTime(t.time)}</b></div>
  <div class="pp-cb-item"><span>❌ Forkerte</span><b>${wrong}</b></div>
</div>`;
    }

    const label = e.type === 'starts'
      ? `Empieza por <b>${esc(e.L)}</b>`
      : `Contiene la <b>${esc(e.L)}</b>`;
    const labelDa = e.type === 'starts' ? `Begynder med ${esc(e.L)}` : `Indeholder ${esc(e.L)}`;

    S.view.innerHTML = `
<div class="pp-wrap">
  ${scoreboard}
  <div class="pp-board">
    <div class="pp-rosco" id="pp-rosco"></div>
    <div class="pp-center">
      <div class="pp-clue-label">${label} <span class="pp-clue-da">· ${labelDa}</span></div>
      <div class="pp-clue-word">${esc(e.da)}</div>
      <div class="pp-answer" id="pp-answer">${S.revealed ? '👉 ' + esc(e.es) : ''}</div>
      <button class="pp-reveal" id="pp-reveal">🔊 Vis / hør svar</button>
    </div>
  </div>
  <div class="pp-controls">
    <button class="pp-btn pp-btn-ok"   id="pp-ok">✅ Rigtigt</button>
    <button class="pp-btn pp-btn-pass" id="pp-pass">↻ Pasapalabra</button>
    <button class="pp-btn pp-btn-err"  id="pp-err">❌ Forkert</button>
  </div>
  <button class="pp-restart" id="pp-restart">↺ Nyt spil</button>
</div>`;

    buildRosco(t);

    S.view.querySelector('#pp-ok').addEventListener('click', () => answer('correct'));
    S.view.querySelector('#pp-err').addEventListener('click', () => answer('wrong'));
    S.view.querySelector('#pp-pass').addEventListener('click', () => answer('pass'));
    S.view.querySelector('#pp-reveal').addEventListener('click', () => {
      S.revealed = true;
      const a = S.view.querySelector('#pp-answer');
      if (a) a.textContent = '👉 ' + e.es;
      say(e.es);
    });
    S.view.querySelector('#pp-restart').addEventListener('click', () => { clearTick(); renderSetup(S.view); });
  }

  // ── Rosco circular ────────────────────────────────────────────────
  function buildRosco(t) {
    const box = S.view.querySelector('#pp-rosco');
    if (!box) return;
    const n = S.bank.length;
    const R = 44; // radio en % del contenedor
    S.bank.forEach((e, i) => {
      const ang = (-90 + i * (360 / n)) * Math.PI / 180;
      const x = 50 + R * Math.cos(ang);
      const y = 50 + R * Math.sin(ang);
      const st = t.status[i];
      const cls = ['pp-letter', 'pp-' + st, (i === t.idx ? 'pp-current' : '')].join(' ');
      const d = h('div', cls, esc(e.L));
      d.style.left = x + '%';
      d.style.top = y + '%';
      box.appendChild(d);
    });
  }

  function updateTimerUI() {
    const t = curTeam();
    if (S.mode === 'teams') {
      const times = S.view.querySelectorAll('.pp-team-time');
      if (times[0]) times[0].textContent = fmtTime(S.teams[0].time);
      if (times[1]) times[1].textContent = fmtTime(S.teams[1].time);
    } else {
      const el = S.view.querySelector('#pp-time');
      if (el) {
        el.textContent = fmtTime(t.time);
        el.classList.toggle('pp-time-low', t.time <= 15);
      }
    }
  }

  // ── Resultados ────────────────────────────────────────────────────
  function renderResults() {
    clearTick();
    let body;
    if (S.mode === 'teams') {
      const a = S.teams[0], b = S.teams[1];
      const ca = a.status.filter(s => s === 'correct').length;
      const cb = b.status.filter(s => s === 'correct').length;
      const wa = a.status.filter(s => s === 'wrong').length;
      const wb = b.status.filter(s => s === 'wrong').length;
      let winner;
      if (ca > cb || (ca === cb && wa < wb)) winner = '🔵 Hold A vinder!';
      else if (cb > ca || (cb === ca && wb < wa)) winner = '🔴 Hold B vinder!';
      else winner = '🤝 Uafgjort!';
      body = `
<div class="pp-win-title">${winner}</div>
<div class="pp-result-teams">
  <div class="pp-rt"><span>🔵 Hold A</span><b>${ca}</b><small>${ca} rigtige · ${wa} forkerte</small></div>
  <div class="pp-rt"><span>🔴 Hold B</span><b>${cb}</b><small>${cb} rigtige · ${wb} forkerte</small></div>
</div>`;
    } else {
      const t = S.team;
      const c = t.status.filter(s => s === 'correct').length;
      const w = t.status.filter(s => s === 'wrong').length;
      const total = S.bank.length;
      const msg = c === total ? '🏆 Perfekt rosco! Utroligt!' :
                  c >= total * 0.7 ? '🌟 Rigtig flot!' :
                  c >= total * 0.4 ? '💪 Godt gået!' : '📚 Øvelse gør mester!';
      body = `
<div class="pp-win-title">${msg}</div>
<div class="pp-bigscore">${c} / ${total}</div>
<div class="pp-result-sub">${c} rigtige · ${w} forkerte</div>`;
    }

    S.view.innerHTML = `
<div class="pp-wrap">
  <div class="pp-results">
    <div class="pp-logo">PASAPALABRA</div>
    ${body}
    <button class="pp-btn pp-btn-go" id="pp-again">↺ Spil igen</button>
  </div>
</div>`;
    S.view.querySelector('#pp-again').addEventListener('click', () => renderSetup(S.view));
  }

  // ── Entrada pública (la llama el router) ───────────────────────────
  window.renderPasapalabra = function () {
    const view = document.getElementById('view-pasapalabra');
    if (!view) return;
    clearTick();
    renderSetup(view);
  };

  // Si el usuario sale de la vista, parar el reloj.
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearTick(); });
})();
