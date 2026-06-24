/* ════════════════════════════════════════════════════════════════
   DESPEDIDA · Farvel — último día de clase
   Tres herramientas:
     1) Adiós   → página emotiva proyectable (mensaje, lo aprendido, dinámica, canción).
     2) Diplomas→ generador de diplomas A1 descargables (PNG), con nº de palabras.
     3) Muro    → muro de mensajes en vivo, MODERADO (profe aprueba) y SIN enlaces.
   Expone window.renderDespedida(), llamado por el router de script.js.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────────── */
  function h(t, c, html) { const e = document.createElement(t); if (c) e.className = c; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid() { return Math.random().toString(36).slice(2, 9); }
  function roomCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 4; i++) s += c[Math.floor(Math.random() * c.length)]; return s; }
  function getVocab() { try { return JSON.parse(localStorage.getItem('vocab') || '[]'); } catch (e) { return []; } }
  function getClient() { if (window._sbClient) return window._sbClient; if (window.getDb) { try { return window.getDb(); } catch (e) {} } return null; }

  /* ── Moderación completa del muro ───────────────────────────────
     Capas: (1) bloqueo de enlaces/QR/@, (2) anti-ofuscación,
     (3) filtro automático de lenguaje ofensivo (da/es/en) y, encima,
     (4) la aprobación manual del profe. Devuelve {ok, reason, text}. */
  const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|dk|es|io|gg|me|ly|app|link|info|xyz|tk|cc|co|tv|qr)\b|\bqr\b|@[a-z0-9_]{2,})/i;
  // Palabras malsonantes/ofensivas frecuentes (da/es/en). No exhaustivo:
  // la aprobación del profe es la última barrera (como en Facebook).
  // Listas en forma "normalizada": minúsculas, sin acentos, ñ→n (å→a, æ/ø se mantienen).
  // OJO danés: NO incluir "slut" (=fin) ni "fag" (=asignatura) → serían falsos positivos.
  const BADWORDS = [
    // dansk
    'luder', 'fisse', 'kælling', 'pik', 'røvhul', 'perker', 'neger', 'spasser', 'svans', 'bøsserøv', 'fucking', 'fuck',
    // español (normalizado: sin tildes, ñ→n)
    'puta', 'puto', 'mierda', 'cabron', 'gilipollas', 'polla', 'maricon', 'zorra', 'joder', 'follar', 'pendejo', 'verga', 'mamon', 'putada',
    // english
    'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'retard', 'nigger', 'nigga', 'faggot'
  ];
  // Sólo términos inequívocos para detección por subcadena (pilla "f u c k").
  const STRONG = ['fuck', 'cunt', 'nigger', 'nigga', 'faggot', 'asshole', 'bitch'];
  function normMod(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[0@]/g, 'o').replace(/[1!|]/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/[5$]/g, 's').replace(/7/g, 't');
  }
  function scanBad(s) {
    const spaced = s.replace(/[^a-zæø ]+/g, ' ').replace(/\s+/g, ' ').trim();
    for (const w of spaced.split(' ')) if (BADWORDS.includes(w)) return true;
    const collapsed = spaced.replace(/ /g, '');
    for (const x of STRONG) if (collapsed.includes(x)) return true; // pilla "f u c k"
    return false;
  }
  function hasProfanity(text) {
    const base = normMod(text);
    // base (mantiene dobles, p.ej. "pussy") + variante con repeticiones colapsadas ("puuuuta"→"puta")
    return scanBad(base) || scanBad(base.replace(/(.)\1+/g, '$1'));
  }
  function checkMessage(text) {
    const t = (text || '').trim();
    if (!t) return { ok: false, reason: 'tom' };
    if (t.length > 120) return { ok: false, reason: 'lang' };
    if (URL_RE.test(t)) return { ok: false, reason: 'link' };
    if (/\S{26,}/.test(t)) return { ok: false, reason: 'suspekt' }; // cadena larga sin espacios
    if (hasProfanity(t)) return { ok: false, reason: 'upassende' };
    return { ok: true, text: t };
  }
  function reasonText(code) {
    return ({
      link: '🚫 Links og QR er ikke tilladt.',
      lang: '🚫 Beskeden er for lang (maks. 120 tegn).',
      upassende: '🚫 Upassende sprog er ikke tilladt.',
      suspekt: '🚫 Mistænkelig tekst — skriv normalt.',
      tom: '🚫 Skriv en besked først.'
    })[code] || '🚫 Skriv en gyldig besked.';
  }

  let VIEW = null, CUR = null, TAB = 'adios';
  function teardown() { if (CUR && CUR.destroy) { try { CUR.destroy(); } catch (e) {} } CUR = null; }

  /* ── Shell con pestañas ──────────────────────────────────────── */
  function renderShell() {
    teardown();
    VIEW.innerHTML = `
<div class="dp-wrap">
  <div class="dp-tabs">
    <button class="dp-tab ${TAB === 'adios' ? 'active' : ''}" data-t="adios">👋 Adiós</button>
    <button class="dp-tab ${TAB === 'diplomas' ? 'active' : ''}" data-t="diplomas">🎓 Diplomas</button>
    <button class="dp-tab ${TAB === 'muro' ? 'active' : ''}" data-t="muro">💬 Muro</button>
  </div>
  <div id="dp-body"></div>
</div>`;
    VIEW.querySelectorAll('.dp-tab').forEach(b => b.addEventListener('click', () => { TAB = b.dataset.t; renderShell(); }));
    const body = VIEW.querySelector('#dp-body');
    if (TAB === 'adios') renderAdios(body);
    else if (TAB === 'diplomas') renderDiplomas(body);
    else renderMuro(body);
  }

  /* ════════════════════════════════════════════════════════════
     1) ADIÓS — página emotiva proyectable
     ════════════════════════════════════════════════════════════ */
  function renderAdios(body) {
    const wordsLine = 'Juntos hemos aprendido <b>muchísimas</b> palabras en español.';
    const starters = [
      ['Gracias por…', 'Tak for…'],
      ['Me gustó cuando…', 'Jeg kunne lide, da…'],
      ['Nunca voy a olvidar…', 'Jeg vil aldrig glemme…'],
      ['Te deseo…', 'Jeg ønsker dig…'],
      ['Eres muy…', 'Du er meget…']
    ];
    // Frases clave de «Color Esperanza» (no la letra completa) → danés, para enseñar/cantar.
    const LYRIC_KEYS = [
      ['Color esperanza', 'Håbets farve'],
      ['Saber que se puede', 'At vide at man kan'],
      ['Querer que se pueda', 'At ville at det lykkes'],
      ['Quitarse los miedos', 'Slippe af med frygten'],
      ['Pintarse la cara', 'Male ansigtet'],
      ['Entrar al futuro con el corazón', 'Gå ind i fremtiden med hjertet'],
      ['Lo imposible se puede lograr', 'Det umulige kan lykkes'],
      ['La vida cambia y cambiará', 'Livet ændrer sig og vil ændre sig']
    ];
    const ytQuery = encodeURIComponent('Diego Torres Color Esperanza letra');
    const lyricQuery = encodeURIComponent('Color Esperanza Diego Torres letra oficial');
    body.innerHTML = `
<div class="dp-adios">
  <div class="dp-hero">
    <div class="dp-hero-emoji">🌿✨</div>
    <h1 class="dp-hero-title">¡Hasta siempre!</h1>
    <p class="dp-hero-da">Farvel og tak — det har været en fornøjelse</p>
  </div>

  <div class="dp-card dp-msg">
    <p class="dp-msg-es">Queridos alumnos:</p>
    <p class="dp-msg-es">${wordsLine} Pero sobre todo, hemos reído, jugado y compartido. Gracias por cada clase. Os voy a echar de menos. Cuidaos mucho y no dejéis de hablar español. 💚</p>
    <p class="dp-msg-da">Kære elever: vi har lært en masse spansk sammen — men vigtigst af alt har vi grinet, leget og delt gode stunder. Tak for hver time. Jeg vil savne jer. Pas på jer selv, og bliv ved med at tale spansk.</p>
    <p class="dp-sign">— ${esc('Jonathan')} 🌟</p>
  </div>

  <div class="dp-card dp-statbox">
    <span class="dp-statbig">+80%</span>
    <p>Mere end 80% giver op, før de når A1 i et nyt sprog — <b>men I nåede det!</b> Vær stolte. 🌟
    <span class="dp-note-da">Más del 80% lo deja y no llega al A1. Vosotros sí lo conseguisteis. ¡Sentíos orgullosos!</span></p>
  </div>

  <div class="dp-card">
    <h3 class="dp-h3">🕸️ La telaraña — di algo bonito en español</h3>
    <p class="dp-note">En círculo, lanzad el ovillo de lana y completad una frase. Al final, todos quedáis unidos por el hilo. <span class="dp-note-da">Sig en sætning på spansk, og kast garnnøglet videre.</span></p>
    <div class="dp-starters">
      ${starters.map(s => `<div class="dp-starter"><b>${esc(s[0])}</b><span>${esc(s[1])}</span></div>`).join('')}
    </div>
  </div>

  <div class="dp-card dp-song">
    <h3 class="dp-h3">🎵 Canción de despedida</h3>
    <p class="dp-note">Sugerencia: <b>«Color Esperanza»</b> (Diego Torres) — habla de seguir adelante y tener esperanza. Alternativa más alegre: <b>«Vivir Mi Vida»</b> (Marc Anthony).</p>
    <div class="dp-song-btns">
      <a class="dp-yt" href="https://www.youtube.com/results?search_query=${ytQuery}" target="_blank" rel="noopener">▶ YouTube</a>
      <button class="dp-yt dp-lyrics-btn" id="dp-lyrics-toggle" type="button">📜 Lyrics</button>
    </div>
    <div class="dp-lyrics" id="dp-lyrics" hidden>
      <p class="dp-note" style="margin-bottom:.6rem">Nøglesætninger / frases clave (español → dansk), para cantar y entender:</p>
      <div class="dp-lyric-list">
        ${LYRIC_KEYS.map(l => `<div class="dp-lyric-row"><b>${esc(l[0])}</b><span>${esc(l[1])}</span></div>`).join('')}
      </div>
      <a class="dp-yt" style="margin-top:.7rem" href="https://www.youtube.com/results?search_query=${lyricQuery}" target="_blank" rel="noopener">📜 Letra completa (oficial)</a>
    </div>
  </div>

  <div class="dp-card dp-next">
    <p>Cuando queráis, id a <b>🎓 Diplomas</b> para entregar el diploma a cada uno, y a <b>💬 Muro</b> para dejar mensajes todos juntos.</p>
  </div>
</div>`;
    const lt = body.querySelector('#dp-lyrics-toggle');
    if (lt) lt.addEventListener('click', () => { const p = body.querySelector('#dp-lyrics'); if (p) p.hidden = !p.hidden; });
  }

  /* ════════════════════════════════════════════════════════════
     2) DIPLOMAS — generador descargable (canvas)
     ════════════════════════════════════════════════════════════ */
  function renderDiplomas(body) {
    const vocab = getVocab().filter(w => typeof w === 'string' && w.trim());
    // Palabras a mostrar: vocab de clase + las que les gustan ('me gusta', 'papi chulo')
    const base = vocab.length ? vocab.slice() : ['hola', 'gracias', 'adiós', 'casa', 'perro', 'gato', 'rojo', 'azul'];
    ['me gusta', 'papi chulo'].forEach(w => { if (!base.includes(w)) base.push(w); });
    const defWords = base.join(', ');
    body.innerHTML = `
<div class="dp-diploma-tool">
  <div class="dp-card dp-form">
    <h3 class="dp-h3">🎓 Lav et diplom</h3>
    <div class="dp-field"><label class="dp-lbl">Elevens navn <span class="dp-req">*</span></label>
      <input class="dp-input" id="dp-name" maxlength="24" placeholder="Skriv elevens navn" /></div>
    <div class="dp-field"><label class="dp-lbl">Antal ord eleven kan (tal på diplomet)</label>
      <input class="dp-input" id="dp-count" type="number" min="1" max="9999" value="300" /></div>
    <div class="dp-field"><label class="dp-lbl">Ord at vise (eksempler, adskil med komma)</label>
      <textarea class="dp-input dp-textarea" id="dp-words" placeholder="hola, gracias, me gusta, papi chulo…">${esc(defWords)}</textarea>
      <span class="dp-wordcount" id="dp-wc">0 ord vist</span></div>
    <div class="dp-btns">
      <button class="dp-btn dp-btn-go" id="dp-make">✨ Lav diplom</button>
      <button class="dp-btn dp-btn-dl" id="dp-dl" disabled>⬇️ Download PNG</button>
    </div>
    <p class="dp-err" id="dp-derr"></p>
    <p class="dp-note">Navnet <b>skal</b> udfyldes. «Antal ord» er tallet på diplomet (fx 300). Eleven kan downloade sit eget diplom. 🎉</p>
  </div>
  <div class="dp-preview">
    <canvas id="dp-canvas" width="1000" height="760" aria-label="Diploma"></canvas>
  </div>
</div>`;
    const canvas = body.querySelector('#dp-canvas');
    const nameI = body.querySelector('#dp-name');
    const countI = body.querySelector('#dp-count');
    const wordsI = body.querySelector('#dp-words');
    const dlBtn = body.querySelector('#dp-dl');
    const errEl = body.querySelector('#dp-derr');
    const wcEl = body.querySelector('#dp-wc');

    function parseWords() { return wordsI.value.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean); }
    function getCount() { return Math.max(1, parseInt(countI.value, 10) || 0) || 300; }
    function updWC() { wcEl.textContent = parseWords().length + ' ord vist'; }
    wordsI.addEventListener('input', updWC); updWC();

    async function draw() {
      const name = nameI.value.trim();
      if (!name) { errEl.textContent = '⚠ Skriv elevens navn først.'; nameI.focus(); dlBtn.disabled = true; return; }
      errEl.textContent = '';
      try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) {}
      paintDiploma(canvas, { name, count: getCount(), words: parseWords() });
      dlBtn.disabled = false;
    }
    body.querySelector('#dp-make').addEventListener('click', draw);
    dlBtn.addEventListener('click', () => {
      if (!nameI.value.trim()) return;
      const a = document.createElement('a');
      a.download = 'Diplom_' + nameI.value.trim().replace(/\s+/g, '_') + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    });
    // vista previa inicial (placeholder hasta que escriban el nombre)
    paintDiploma(canvas, { name: 'Elevens navn', count: getCount(), words: parseWords(), placeholder: true });
  }

  // Reparte palabras en líneas centradas; si no caben todas, añade "(+N flere)".
  function layoutWords(ctx, tokens, sep, maxW, maxLines) {
    const lines = []; let cur = [];
    for (let i = 0; i < tokens.length; i++) {
      cur.push(tokens[i]);
      if (cur.length > 1 && ctx.measureText(cur.join(sep)).width > maxW) {
        cur.pop(); lines.push(cur.join(sep)); cur = [tokens[i]];
        if (lines.length === maxLines) {
          const remaining = tokens.length - i; // tokens[i] aún no colocado
          lines[maxLines - 1] += '   (+' + remaining + ' flere)';
          return lines;
        }
      }
    }
    if (cur.length) lines.push(cur.join(sep));
    return lines;
  }
  function paintDiploma(canvas, d) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const year = new Date().getFullYear();
    // Fondo crema
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#fffdf7'); bg.addColorStop(1, '#fef3f9');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // Marco doble
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 10; ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = '#ec4899'; ctx.lineWidth = 3; ctx.strokeRect(42, 42, W - 84, H - 84);
    // Confeti (decoración determinista, bordes)
    const cols = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#fb923c'];
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 22; i++) {
      const x = 70 + rnd() * (W - 140), y = 70 + rnd() * (H - 140);
      if (x > 110 && x < 890 && y > 130 && y < 660) { i--; continue; }
      ctx.fillStyle = cols[i % cols.length]; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.arc(x, y, 5 + rnd() * 5, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
    // Cinta superior
    ctx.fillStyle = '#0f766e'; ctx.font = '700 24px Inter, sans-serif';
    ctx.fillText('★  din klasseværelsets hjørne  ★', W / 2, 104);
    // Título (danés)
    ctx.fillStyle = '#0b1220'; ctx.font = '700 italic 74px "Playfair Display", Georgia, serif';
    ctx.fillText('Diplom', W / 2, 178);
    ctx.fillStyle = '#ec4899'; ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText('Spansk · Niveau A1', W / 2, 216);
    // Tildeles til (otorgado a)
    ctx.fillStyle = '#475569'; ctx.font = '400 22px Inter, sans-serif';
    ctx.fillText('Dette diplom tildeles / Para:', W / 2, 268);
    ctx.fillStyle = d.placeholder ? '#b8c0cc' : '#0b1220';
    ctx.font = '700 italic 54px "Playfair Display", Georgia, serif';
    ctx.fillText(d.name, W / 2, 326);
    ctx.strokeStyle = '#5eead4'; ctx.lineWidth = 3;
    const nameW = Math.min(560, Math.max(200, ctx.measureText(d.name).width));
    ctx.beginPath(); ctx.moveTo(W / 2 - nameW / 2, 344); ctx.lineTo(W / 2 + nameW / 2, 344); ctx.stroke();
    // Dato motivador en danés (banda destacada)
    ctx.fillStyle = '#fff4e0'; ctx.fillRect(120, 368, W - 240, 46);
    ctx.strokeStyle = '#f6c177'; ctx.lineWidth = 2; ctx.strokeRect(120, 368, W - 240, 46);
    ctx.fillStyle = '#b45309'; ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('Mere end 80% når aldrig A1 — men det gjorde DU! 🎉', W / 2, 398);
    // Cuántas palabras saben (número del formulario)
    const count = d.count || (d.words ? d.words.length : 0);
    ctx.fillStyle = '#0f766e'; ctx.font = '700 26px Inter, sans-serif';
    ctx.fillText(count > 0 ? ('Du kan allerede ' + count + ' spanske ord — bl.a.:') : 'Du kan allerede en masse spanske ord!', W / 2, 456);
    // Lista de palabras escritas (ejemplos)
    if (d.words && d.words.length) {
      ctx.fillStyle = '#334155'; ctx.font = '400 21px Inter, sans-serif';
      const lines = layoutWords(ctx, d.words, '  ·  ', W - 260, 3);
      lines.forEach((ln, i) => ctx.fillText(ln, W / 2, 492 + i * 32));
    }
    // Pie
    ctx.fillStyle = '#475569'; ctx.font = '400 20px Inter, sans-serif';
    ctx.fillText('Tillykke! · ¡Felicidades! · ' + year, W / 2, H - 150);
    // Sello / medalla (abajo-derecha, sin solapar la firma ni el pie)
    ctx.save(); ctx.translate(W - 150, H - 92);
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(0, 0, 42, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff7e6'; ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.fill();
    ctx.fillStyle = '#b45309'; ctx.textAlign = 'center';
    ctx.font = '700 24px Inter, sans-serif'; ctx.fillText('A1', 0, -3);
    ctx.font = '700 13px Inter, sans-serif'; ctx.fillText('¡OLÉ!', 0, 16);
    ctx.restore();
    // Firma (abajo-izquierda)
    ctx.textAlign = 'left'; ctx.fillStyle = '#0b1220'; ctx.font = '600 italic 26px "Playfair Display", Georgia, serif';
    ctx.fillText('Jonathan Ponce de León', 150, H - 96);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(140, H - 80); ctx.lineTo(470, H - 80); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '400 17px Inter, sans-serif'; ctx.fillText('Spansklærer · Profesor', 150, H - 58);
  }

  /* ════════════════════════════════════════════════════════════
     3) MURO — mensajes en vivo, moderados, sin enlaces
     ════════════════════════════════════════════════════════════ */
  function renderMuro(body) {
    body.innerHTML = `
<div class="dp-muro-entry">
  <div class="dp-card">
    <h3 class="dp-h3">💬 Muro de mensajes</h3>
    <p class="dp-note">Los alumnos escriben un mensaje en español y aparece en el muro <b>después de que tú lo apruebes</b>. Sin enlaces ni QR. <span class="dp-note-da">Beskeder vises først, når læreren godkender dem.</span></p>
    <div class="dp-role">
      <button class="dp-btn dp-btn-go" id="dp-teacher">👩‍🏫 Soy la profe (proyectar + moderar)</button>
      <button class="dp-btn dp-btn-alt" id="dp-student">🙋 Soy alumno (enviar mensaje)</button>
    </div>
  </div>
</div>`;
    body.querySelector('#dp-teacher').addEventListener('click', () => startMuro(body, true));
    body.querySelector('#dp-student').addEventListener('click', () => studentJoin(body));
  }

  function studentJoin(body) {
    const client = getClient();
    body.innerHTML = `
<div class="dp-muro-entry"><div class="dp-card">
  <h3 class="dp-h3">🙋 Enviar mensaje</h3>
  ${client ? '' : '<p class="dp-err">⚠ Ingen forbindelse. Tjek WiFi.</p>'}
  <div class="dp-field"><label class="dp-lbl">Dit navn</label><input class="dp-input" id="dp-sname" maxlength="14" placeholder="F.eks. Sofie"/></div>
  <div class="dp-field"><label class="dp-lbl">Rumkode (fra læreren)</label><input class="dp-input" id="dp-scode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase"/></div>
  <button class="dp-btn dp-btn-go" id="dp-sgo">Fortsæt</button>
  <button class="dp-back" id="dp-sback">← Tilbage</button>
</div></div>`;
    body.querySelector('#dp-sback').addEventListener('click', () => renderMuro(body));
    body.querySelector('#dp-sgo').addEventListener('click', () => {
      const name = body.querySelector('#dp-sname').value.trim();
      const code = (body.querySelector('#dp-scode').value || '').trim().toUpperCase();
      if (!getClient()) return;
      if (!name) { body.querySelector('#dp-sname').focus(); return; }
      if (code.length < 3) { body.querySelector('#dp-scode').focus(); return; }
      startMuro(body, false, name, code);
    });
  }

  function startMuro(body, isTeacher, studentName, joinCode) {
    teardown();
    const client = getClient();
    if (!client) { renderMuro(body); return; }
    const myId = uid();
    const code = isTeacher ? roomCode() : joinCode;
    let approved = [];   // mensajes aprobados (todos los ven)
    let pending = [];    // cola del profe
    const channel = client.channel('muro:' + code, { config: { broadcast: { self: false } } });

    const G = { destroy() { try { client.removeChannel(channel); } catch (e) {} } };
    CUR = G;
    function bc(event, payload) { channel.send({ type: 'broadcast', event, payload: payload || {} }); }

    /* --- Profe: moderar + proyectar --- */
    function teacherUI() {
      body.innerHTML = `
<div class="dp-muro">
  <div class="dp-muro-head">
    <div>Rumkode: <span class="dp-code">${esc(code)}</span> <small>— eleverne skriver koden ind</small></div>
    <button class="dp-back" id="dp-leave">← Tilbage</button>
  </div>
  <div class="dp-muro-cols">
    <div class="dp-pending-col">
      <h4 class="dp-col-title">⏳ Til godkendelse (<span id="dp-pcount">0</span>)</h4>
      <div id="dp-pending" class="dp-pending"></div>
    </div>
    <div class="dp-wall-col">
      <h4 class="dp-col-title">🧱 Muro (projektér dette)</h4>
      <div id="dp-wall" class="dp-wall"></div>
    </div>
  </div>
</div>`;
      body.querySelector('#dp-leave').addEventListener('click', () => { teardown(); renderMuro(body); });
      renderPending(); renderWall();
    }
    function renderPending() {
      const box = body.querySelector('#dp-pending'); if (!box) return;
      body.querySelector('#dp-pcount').textContent = pending.length;
      box.innerHTML = pending.length ? '' : '<p class="dp-empty">Ingen ventende beskeder…</p>';
      pending.forEach(m => {
        const card = h('div', 'dp-pend-card');
        card.innerHTML = `<div class="dp-pend-txt"><b>${esc(m.name)}:</b> ${esc(m.text)}</div>
          <div class="dp-pend-btns"><button class="dp-ok">✓</button><button class="dp-no">✕</button></div>`;
        card.querySelector('.dp-ok').addEventListener('click', () => approve(m));
        card.querySelector('.dp-no').addEventListener('click', () => reject(m));
        box.appendChild(card);
      });
    }
    function renderWall() {
      const wall = body.querySelector('#dp-wall'); if (!wall) return;
      wall.innerHTML = approved.length ? '' : '<p class="dp-empty">Godkendte beskeder vises her ✨</p>';
      approved.forEach((m, i) => {
        const card = h('div', 'dp-wall-card', `<button class="dp-wall-del" title="Fjern">✕</button><span class="dp-wall-txt">${esc(m.text)}</span><span class="dp-wall-name">— ${esc(m.name)}</span>`);
        card.style.setProperty('--i', (i % 6));
        card.querySelector('.dp-wall-del').addEventListener('click', () => removeMsg(m.mid));
        wall.appendChild(card);
      });
      wall.scrollTop = wall.scrollHeight;
    }
    function approve(m) {
      pending = pending.filter(p => p.mid !== m.mid);
      const safe = checkMessage(m.text);
      if (!safe.ok) { renderPending(); return; } // doble seguridad automática
      const item = { mid: m.mid, name: m.name, text: m.text };
      approved.push(item);
      bc('approved', item);
      renderPending(); renderWall();
    }
    function reject(m) { pending = pending.filter(p => p.mid !== m.mid); renderPending(); }
    function removeMsg(mid) {
      approved = approved.filter(a => a.mid !== mid);
      bc('remove', { mid });
      renderWall();
    }

    /* --- Alumno: enviar --- */
    function studentUI() {
      body.innerHTML = `
<div class="dp-muro">
  <div class="dp-muro-head"><div>Rum: <span class="dp-code">${esc(code)}</span></div><button class="dp-back" id="dp-leave">← Tilbage</button></div>
  <div class="dp-card dp-send">
    <label class="dp-lbl">Din besked på spansk (maks. 120 tegn, ingen links)</label>
    <textarea class="dp-input dp-textarea" id="dp-msg" maxlength="120" placeholder="F.eks. ¡Gracias, profe! Me gustó mucho la clase."></textarea>
    <button class="dp-btn dp-btn-go" id="dp-send">Send besked</button>
    <p class="dp-send-status" id="dp-status"></p>
  </div>
  <div class="dp-wall-col">
    <h4 class="dp-col-title">🧱 Muro</h4>
    <div id="dp-wall" class="dp-wall"></div>
  </div>
</div>`;
      body.querySelector('#dp-leave').addEventListener('click', () => { teardown(); renderMuro(body); });
      const msg = body.querySelector('#dp-msg'), status = body.querySelector('#dp-status');
      body.querySelector('#dp-send').addEventListener('click', () => {
        const chk = checkMessage(msg.value);
        if (!chk.ok) {
          status.textContent = reasonText(chk.reason);
          status.className = 'dp-send-status dp-err'; return;
        }
        bc('submit', { mid: uid(), name: studentName, text: chk.text });
        status.textContent = '✅ Sendt! Venter på lærerens godkendelse.'; status.className = 'dp-send-status dp-ok-txt';
        msg.value = '';
      });
      renderWallStudent();
    }
    function renderWallStudent() {
      const wall = body.querySelector('#dp-wall'); if (!wall) return;
      wall.innerHTML = approved.length ? '' : '<p class="dp-empty">Beskederne vises her, når de er godkendt ✨</p>';
      approved.forEach((m, i) => {
        const card = h('div', 'dp-wall-card', `<span class="dp-wall-txt">${esc(m.text)}</span><span class="dp-wall-name">— ${esc(m.name)}</span>`);
        card.style.setProperty('--i', (i % 6)); wall.appendChild(card);
      });
      wall.scrollTop = wall.scrollHeight;
    }

    /* --- Eventos --- */
    channel.on('broadcast', { event: 'submit' }, ({ payload }) => {
      if (!isTeacher) return;
      const chk = checkMessage(payload.text);
      if (!chk.ok) return; // filtra enlaces aunque vengan manipulados
      pending.push({ mid: payload.mid || uid(), name: payload.name || '?', text: chk.text });
      renderPending();
    });
    channel.on('broadcast', { event: 'approved' }, ({ payload }) => {
      if (payload.mid && approved.some(a => a.mid === payload.mid)) return; // evitar duplicados
      approved.push({ mid: payload.mid, name: payload.name, text: payload.text });
      if (isTeacher) renderWall(); else renderWallStudent();
    });
    channel.on('broadcast', { event: 'remove' }, ({ payload }) => {
      approved = approved.filter(a => a.mid !== payload.mid);
      if (isTeacher) renderWall(); else renderWallStudent();
    });
    // cuando entra alguien nuevo, el profe reenvía el muro aprobado
    channel.on('broadcast', { event: 'hello' }, () => { if (isTeacher) approved.forEach(m => bc('approved', m)); });

    body.innerHTML = `<div class="dp-muro-entry"><div class="dp-card"><h3 class="dp-h3">💬 Muro</h3><p class="dp-note">Forbinder…</p><div class="dp-spin"></div></div></div>`;
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        if (isTeacher) teacherUI();
        else { studentUI(); bc('hello', {}); }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        body.innerHTML = `<div class="dp-muro-entry"><div class="dp-card"><p class="dp-err">⚠ Kunne ikke forbinde. Tjek WiFi.</p><button class="dp-btn dp-btn-go" id="dp-rb">← Tilbage</button></div></div>`;
        const rb = body.querySelector('#dp-rb'); if (rb) rb.addEventListener('click', () => renderMuro(body));
      }
    });
  }

  /* ── Entrada pública (router) ────────────────────────────────── */
  window.renderDespedida = function () {
    VIEW = document.getElementById('view-despedida');
    if (!VIEW) return;
    TAB = 'adios';
    renderShell();
  };
  window.__despedidaTeardown = teardown;
  window.__despedidaCheck = checkMessage; // para tests
})();
// v3: Jonathan Ponce de León, contador ~300, me gusta/papi chulo, botón Lyrics, sin solapamientos
