/* ════════════════════════════════════════════════════════════════
   FORLØB 2026/27 · 8.–9. klasse
   Tres módulos nuevos del curso, en un solo archivo (igual que
   despedida.js agrupa sus tres herramientas):

     1) Mit Fremskridt → progreso individual: alias, XP, racha de
        semanas y palabras dominadas. TODO en localStorage: no se
        escribe nada en Supabase, así que ningún alumno puede pisar
        los datos de otro ni tocar el tablón.
     2) Prøve          → examen autocorregible con la escala danesa
        de 7 trin (12, 10, 7, 4, 02, 00, -3).
     3) Kultur         → cultura hispana con textos glosados y
        preguntas de comprensión.

   Expone window.renderFremskridt() / renderProeve() / renderKultur(),
   llamados por el router de script.js, y window.Fremskridt como API
   de puntos para los ejercicios que ya existían.
   ════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────────────── */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function $id(id) { return document.getElementById(id); }
  function shuffle(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
    return r;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, n); }
  function getVocab() { try { return JSON.parse(localStorage.getItem('vocab') || '[]'); } catch (e) { return []; } }

  /* Semana ISO — la racha se cuenta por semanas de clase, no por días,
     porque el español es una vez a la semana. */
  function weekKey(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;               // lunes=1 … domingo=7
    t.setUTCDate(t.getUTCDate() + 4 - day);       // jueves de esa semana
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const wk = Math.ceil(((t - y0) / 86400000 + 1) / 7);
    return t.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
  }

  /* ════════════════════════════════════════════════════════════
     1 · MIT FREMSKRIDT
     ════════════════════════════════════════════════════════════ */

  const KEY = 'elev_forloeb_v1';
  const WEEK_GOAL = 120;   // XP por semana para cerrar el objetivo
  const MASTER_HITS = 3;   // aciertos necesarios para "dominada"
  const MASTER_BONUS = 25; // XP extra al dominar una palabra

  const RANKS = [
    { xp: 0,    es: 'Principiante',  da: 'Nybegynder' },
    { xp: 250,  es: 'Explorador',    da: 'Opdagelsesrejsende' },
    { xp: 600,  es: 'Viajero',       da: 'Rejsende' },
    { xp: 1100, es: 'Conversador',   da: 'Samtalepartner' },
    { xp: 1800, es: 'Charlatán',     da: 'Snakkehoved' },
    { xp: 2800, es: 'Casi nativo',   da: 'Næsten indfødt' },
    { xp: 4200, es: 'Maestro',       da: 'Mester' }
  ];

  function normalize(s) {
    s = s && typeof s === 'object' ? s : {};
    return {
      alias:      typeof s.alias === 'string' ? s.alias : '',
      xp:         Number(s.xp) || 0,
      words:      (s.words && typeof s.words === 'object') ? s.words : {},
      weeks:      Array.isArray(s.weeks) ? s.weeks : [],
      streak:     Number(s.streak) || 0,
      bestStreak: Number(s.bestStreak) || 0,
      lastWeek:   typeof s.lastWeek === 'string' ? s.lastWeek : '',
      weekXp:     Number(s.weekXp) || 0,
      answers:    Number(s.answers) || 0,
      proeves:    Array.isArray(s.proeves) ? s.proeves : [],
      kultur:     Array.isArray(s.kultur) ? s.kultur : []
    };
  }
  function load() {
    try { return normalize(JSON.parse(localStorage.getItem(KEY))); }
    catch (e) { return normalize(null); }
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* cuota llena: no rompemos la clase */ }
  }

  /* Marca actividad en la semana actual y actualiza la racha.
     Racha = semanas consecutivas con actividad. Si se salta una, vuelve a 1. */
  function touchWeek(s) {
    const now = new Date();
    const wk = weekKey(now);
    if (s.lastWeek === wk) return;
    const prev = weekKey(new Date(now.getTime() - 7 * 86400000));
    s.streak = (s.lastWeek === prev) ? s.streak + 1 : 1;
    if (s.streak > s.bestStreak) s.bestStreak = s.streak;
    s.lastWeek = wk;
    s.weekXp = 0;                                   // nueva semana, objetivo a cero
    if (!s.weeks.includes(wk)) {
      s.weeks.push(wk);
      if (s.weeks.length > 26) s.weeks.shift();     // medio curso de historial basta
    }
  }

  /* Vista con la semana ya caducada. touchWeek() solo corre al PUNTUAR, así
     que sin esto el panel enseñaba la meta y la racha congeladas en la última
     semana con actividad: quien ganó 200 XP hace tres semanas seguía viendo
     "200/120 · meta alcanzada" y su racha intacta. No persiste nada: es una
     copia solo para pintar, y touchWeek hará el cambio real al siguiente punto. */
  function withCurrentWeek(s) {
    const wk = weekKey(new Date());
    if (s.lastWeek === wk) return s;
    const prev = weekKey(new Date(Date.now() - 7 * 86400000));
    return Object.assign({}, s, {
      weekXp: 0,
      // la racha sigue viva si la última actividad fue la semana pasada
      streak: s.lastWeek === prev ? s.streak : 0
    });
  }

  function rankOf(xp) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k;
    return { idx: i, level: i + 1, rank: RANKS[i], next: RANKS[i + 1] || null };
  }

  /* API pública de puntos. Los ejercicios que ya existían llaman aquí. */
  const Fremskridt = {
    /* xp sueltos, sin palabra asociada (juego, cultura…) */
    addXp(n, _source) {
      n = Math.max(0, Math.round(Number(n) || 0));
      if (!n) return;
      const s = load();
      touchWeek(s);
      s.xp += n; s.weekXp += n;
      save(s);
    },
    /* un acierto: suma XP y cuenta la palabra hacia "dominada" */
    award(word, xp) {
      const s = load();
      touchWeek(s);
      const gain = Math.max(0, Math.round(Number(xp) || 5));
      s.xp += gain; s.weekXp += gain; s.answers += 1;
      if (word) {
        // Se normaliza el artículo: "la comida" y "comida" son la misma palabra,
        // si no, el mismo sustantivo contaría dos veces hacia "dominada".
        const w = String(word).trim().toLowerCase().replace(/^(el|la|los|las|un|una) +/, '');
        if (w && w.length < 40) {
          const before = s.words[w] || 0;
          s.words[w] = before + 1;
          // el bonus se paga una sola vez, justo al alcanzar el umbral
          if (before < MASTER_HITS && s.words[w] >= MASTER_HITS) {
            s.xp += MASTER_BONUS; s.weekXp += MASTER_BONUS;
          }
        }
      }
      save(s);
    },
    /* resultado de una prøve */
    logProeve(pct, grade) {
      const s = load();
      touchWeek(s);
      s.proeves.push({ d: new Date().toISOString().slice(0, 10), pct, grade });
      if (s.proeves.length > 40) s.proeves.shift();
      save(s);
    },
    markKultur(id) {
      const s = load();
      if (s.kultur.includes(id)) return false;
      touchWeek(s);
      s.kultur.push(id);
      save(s);
      return true;
    },
    get() { return load(); },
    hasAlias() { return !!load().alias; }
  };
  window.Fremskridt = Fremskridt;

  /* ── Vista ──────────────────────────────────────────────────── */
  function renderFremskridt() {
    const view = $id('view-fremskridt');
    if (!view) return;
    const s = withCurrentWeek(load());
    if (!s.alias) { renderOnboard(view); return; }
    renderDashboard(view, s);
  }

  function renderOnboard(view) {
    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📈 Mit Fremskridt</h2>
<p class="section-subtitle">Følg dit eget fremskridt gennem skoleåret: point, uger i træk og de ord, du har styr på.</p>
<div class="fl-card fs-onboard">
  <span class="fs-onboard-icon">🎒</span>
  <h3>Vælg et kaldenavn</h3>
  <p class="fl-note">Det bruges kun til at vise dit fremskridt på denne enhed.</p>
  <input id="fs-alias-input" class="fs-onboard-input" type="text" maxlength="18"
         placeholder="fx Nova, ElTigre, Sofie23" autocomplete="off" spellcheck="false" />
  <button id="fs-alias-go" class="fl-btn fl-btn-primary" style="width:100%">Kom i gang →</button>
  <p class="fs-privacy">🔒 <b>Privatliv:</b> brug et kaldenavn — ikke dit fulde navn.
  Alt gemmes kun i din egen browser, sendes ikke nogen steder, og læreren kan ikke se det.</p>
</div>
</div>`;
    const input = $id('fs-alias-input');
    const go = () => {
      const v = (input.value || '').trim();
      if (!v) { input.focus(); return; }
      const s = load();
      s.alias = v.slice(0, 18);
      save(s);
      renderFremskridt();
    };
    $id('fs-alias-go').addEventListener('click', go);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    setTimeout(() => input.focus(), 120);
  }

  function renderDashboard(view, s) {
    const { level, rank, next } = rankOf(s.xp);
    const floor = rank.xp;
    const ceil = next ? next.xp : rank.xp;
    const pct = next ? Math.min(100, Math.round(((s.xp - floor) / (ceil - floor)) * 100)) : 100;

    const words = Object.keys(s.words);
    const mastered = words.filter(w => s.words[w] >= MASTER_HITS);
    const learning = words.filter(w => s.words[w] < MASTER_HITS)
      .sort((a, b) => s.words[b] - s.words[a]).slice(0, 24);

    const goalPct = Math.min(100, Math.round((s.weekXp / WEEK_GOAL) * 100));

    // Últimas 8 semanas: punto encendido = semana con actividad
    const dots = [];
    for (let i = 7; i >= 0; i--) {
      const k = weekKey(new Date(Date.now() - i * 7 * 86400000));
      dots.push({ k, on: s.weeks.includes(k), n: k.split('W')[1] });
    }

    const bestProeve = s.proeves.length ? s.proeves.reduce((a, b) => (b.pct > a.pct ? b : a)) : null;

    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📈 Mit Fremskridt</h2>

<div class="fs-hero">
  <div class="fs-ring" style="--p:${pct}">
    <div class="fs-ring-inner">
      <div class="fs-ring-lv">${level}</div>
      <div class="fs-ring-lbl">Niveau</div>
    </div>
  </div>
  <div class="fs-hero-body">
    <div class="fs-alias">${esc(s.alias)}</div>
    <div class="fs-rank">${esc(rank.es)} <small>· ${esc(rank.da)}</small></div>
    <div class="fs-xpbar"><div class="fs-xpbar-fill" style="width:${pct}%"></div></div>
    <div class="fs-xp-txt">
      <span>${s.xp.toLocaleString('da-DK')} XP</span>
      <span>${next ? (ceil - s.xp).toLocaleString('da-DK') + ' XP til ' + esc(next.es) : 'Højeste niveau nået 🏆'}</span>
    </div>
    <button id="fs-edit" class="fs-edit-alias" style="margin-top:.6rem">Skift kaldenavn</button>
  </div>
</div>

<div class="fs-stats">
  <div class="fs-stat">
    <span class="fs-stat-ico">🔥</span>
    <span class="fs-stat-val">${s.streak}</span>
    <span class="fs-stat-lbl">uger i træk<br><small style="opacity:.6">bedste: ${s.bestStreak}</small></span>
  </div>
  <div class="fs-stat">
    <span class="fs-stat-ico">✅</span>
    <span class="fs-stat-val">${mastered.length}</span>
    <span class="fs-stat-lbl">ord du har styr på</span>
  </div>
  <div class="fs-stat">
    <span class="fs-stat-ico">🎯</span>
    <span class="fs-stat-val">${s.answers.toLocaleString('da-DK')}</span>
    <span class="fs-stat-lbl">rigtige svar i alt</span>
  </div>
  <div class="fs-stat">
    <span class="fs-stat-ico">📝</span>
    <span class="fs-stat-val">${bestProeve ? bestProeve.grade : '–'}</span>
    <span class="fs-stat-lbl">bedste prøve${bestProeve ? '<br><small style="opacity:.6">' + bestProeve.pct + '%</small>' : ''}</span>
  </div>
</div>

<div class="fl-card fs-goal">
  <div class="fs-goal-head">
    <span class="fs-goal-title">🗓️ Ugens mål</span>
    <span class="fs-goal-num">${s.weekXp} / ${WEEK_GOAL} XP</span>
  </div>
  <div class="fs-goal-bar"><div class="fs-goal-fill" style="width:${goalPct}%"></div></div>
  ${s.weekXp >= WEEK_GOAL
    ? '<p class="fs-goal-done">🎉 Ugens mål er nået! ¡Muy bien!</p>'
    : '<p class="fl-note" style="margin-top:.6rem">Lav øvelser, spil eller en prøve for at samle point.</p>'}
  <div class="fs-weeks">
    ${dots.map(d => `<span class="fs-week-dot ${d.on ? 'on' : ''}" title="Uge ${esc(d.n)}">${esc(d.n)}</span>`).join('')}
  </div>
  <p class="fl-note" style="margin-top:.5rem">De sidste 8 uger — grøn = du har øvet dig.</p>
</div>

<h3 class="fs-subhead">✅ Ord du har styr på <span class="fl-note">(${mastered.length})</span></h3>
${mastered.length
  ? `<div class="fs-words">${mastered.slice(0, 60).map(w => `<span class="fs-word mastered">${esc(w)}</span>`).join('')}</div>`
  : '<p class="fl-note">Endnu ingen. Et ord tæller som "styr på" efter ' + MASTER_HITS + ' rigtige svar.</p>'}

<h3 class="fs-subhead">📚 Ord du er i gang med</h3>
${learning.length
  ? `<div class="fs-words">${learning.map(w => `<span class="fs-word">${esc(w)}<span class="fs-word-count">${s.words[w]}/${MASTER_HITS}</span></span>`).join('')}</div>`
  : '<p class="fl-note">Lav nogle øvelser under 🧩 Øvelser, så dukker de op her.</p>'}

<div style="margin-top:2.5rem;display:flex;gap:.7rem;flex-wrap:wrap">
  <button id="fs-reset" class="fl-btn fl-btn-ghost">Nulstil mit fremskridt</button>
</div>
</div>`;

    $id('fs-edit').addEventListener('click', () => {
      const cur = load();
      const v = prompt('Nyt kaldenavn:', cur.alias);
      if (v === null) return;
      const t = v.trim();
      if (!t) return;
      cur.alias = t.slice(0, 18);
      save(cur);
      renderFremskridt();
    });

    $id('fs-reset').addEventListener('click', () => {
      if (!confirm('Sikker? Alle point, uger og ord nulstilles. Det kan ikke fortrydes.')) return;
      localStorage.removeItem(KEY);
      renderFremskridt();
    });
  }

  /* ════════════════════════════════════════════════════════════
     2 · PRØVE
     ════════════════════════════════════════════════════════════ */

  /* Banco propio: la prøve NO puede depender de la API de traducción
     (MyMemory) ni de que el profe haya publicado vocabulario ese día.
     Nivel A2, temas de 8.–9. klasse. */
  const GLOSER = [
    // Mad
    ['la comida', 'maden'], ['el desayuno', 'morgenmaden'], ['la cena', 'aftensmaden'],
    ['la carne', 'kødet'], ['el pescado', 'fisken'], ['las verduras', 'grøntsagerne'],
    ['la fruta', 'frugten'], ['el queso', 'osten'], ['el pan', 'brødet'], ['la leche', 'mælken'],
    // Skole
    ['la escuela', 'skolen'], ['el profesor', 'læreren'], ['el alumno', 'eleven'],
    ['el examen', 'prøven'], ['los deberes', 'lektierne'], ['la asignatura', 'faget'],
    ['el horario', 'skemaet'], ['la nota', 'karakteren'], ['el recreo', 'frikvarteret'],
    ['la mochila', 'rygsækken'],
    // Fritid
    ['el deporte', 'sporten'], ['la música', 'musikken'], ['la película', 'filmen'],
    ['el videojuego', 'computerspillet'], ['la fiesta', 'festen'],
    ['el fin de semana', 'weekenden'], ['el viaje', 'rejsen'], ['el dinero', 'pengene'],
    // Familie
    ['la familia', 'familien'], ['el hermano', 'broren'], ['la hermana', 'søsteren'],
    ['los padres', 'forældrene'], ['el abuelo', 'bedstefaren'], ['la abuela', 'bedstemoren'],
    ['el amigo', 'vennen'], ['el novio', 'kæresten'],
    // Verber
    ['hablar', 'at tale'], ['comer', 'at spise'], ['vivir', 'at bo'], ['ser', 'at være'],
    ['tener', 'at have'], ['hacer', 'at lave'], ['poder', 'at kunne'], ['querer', 'at ville'],
    ['saber', 'at vide'], ['venir', 'at komme'], ['salir', 'at gå ud'], ['ver', 'at se'],
    ['dar', 'at give'], ['decir', 'at sige'], ['comprar', 'at købe'], ['escuchar', 'at lytte'],
    // Adjektiver
    ['grande', 'stor'], ['pequeño', 'lille'], ['bonito', 'flot'], ['feo', 'grim'],
    ['caro', 'dyr'], ['barato', 'billig'], ['difícil', 'svær'], ['fácil', 'nem'],
    ['divertido', 'sjov'], ['aburrido', 'kedelig'], ['cansado', 'træt'], ['contento', 'glad'],
    ['enfadado', 'vred'], ['rápido', 'hurtig'], ['lento', 'langsom'],
    // By & rejse
    ['la ciudad', 'byen'], ['el pueblo', 'landsbyen'], ['la playa', 'stranden'],
    ['la calle', 'gaden'], ['la tienda', 'butikken'], ['la estación', 'stationen'],
    ['el aeropuerto', 'lufthavnen'], ['el billete', 'billetten'], ['la habitación', 'værelset'],
    // Tid
    ['hoy', 'i dag'], ['mañana', 'i morgen'], ['ayer', 'i går'], ['siempre', 'altid'],
    ['nunca', 'aldrig'], ['a veces', 'nogle gange'], ['ahora', 'nu'],
    ['temprano', 'tidligt'], ['tarde', 'sent']
  ];

  const GRAMMATIK = [
    ['Yo ___ español todos los días.', 'hablo', ['hablas', 'habla', 'hablamos']],
    ['Nosotros ___ en Dinamarca.', 'vivimos', ['vivo', 'vives', 'viven']],
    ['Mi hermana ___ quince años.', 'tiene', ['es', 'está', 'hace']],
    ['¿De dónde ___ tú?', 'eres', ['estás', 'es', 'tienes']],
    ['Los libros ___ en la mesa.', 'están', ['son', 'hay', 'tienen']],
    ['Mi profesor ___ muy simpático.', 'es', ['está', 'tiene', 'hay']],
    ['Hoy ___ (yo) muy cansado.', 'estoy', ['soy', 'tengo', 'hago']],
    ['A mí me ___ el fútbol.', 'gusta', ['gustan', 'gusto', 'gustas']],
    ['A nosotros nos ___ las películas de terror.', 'gustan', ['gusta', 'gustamos', 'gusto']],
    ['Ayer yo ___ al cine con mis amigos.', 'fui', ['voy', 'iré', 'iba']],
    ['El año pasado ___ (nosotros) a España.', 'viajamos', ['viajo', 'viajaré', 'viajad']],
    ['¿Tú ___ los deberes ayer?', 'hiciste', ['haces', 'harás', 'hacía']],
    ['Ellos ___ mucho los fines de semana.', 'salen', ['sale', 'sales', 'salgo']],
    ['La casa de María es muy ___.', 'bonita', ['bonito', 'bonitos', 'bonitas']],
    ['Los chicos de mi clase son ___.', 'altos', ['alto', 'alta', 'altas']],
    ['Voy ___ colegio en bici.', 'al', ['a la', 'el', 'en el']],
    ['Vengo ___ Dinamarca.', 'de', ['a', 'en', 'por']],
    ['Estoy ___ Madrid este fin de semana.', 'en', ['a', 'de', 'por']],
    ['Tengo que ___ los deberes esta tarde.', 'hacer', ['hago', 'haciendo', 'hecho']],
    ['¿Qué hora ___?', 'es', ['son', 'está', 'hace']],
    ['___ las tres y media.', 'Son', ['Es', 'Está', 'Hay']],
    ['___ hermanos son muy altos.', 'Mis', ['Mi', 'Su', 'Tu']],
    ['Este es ___ libro favorito.', 'mi', ['mis', 'me', 'yo']],
    ['Nosotros ___ una película muy buena ayer.', 'vimos', ['vemos', 'veremos', 'veíamos']],
    ['No como ___ carne, soy vegetariano.', 'nunca', ['siempre', 'también', 'mucho']],
    ['En mi ciudad ___ un parque muy grande.', 'hay', ['es', 'está', 'tiene']],
    ['Me levanto ___ las siete de la mañana.', 'a', ['en', 'de', 'por']],
    ['___ frío en Dinamarca en invierno.', 'Hace', ['Es', 'Está', 'Tiene']],
    ['Mi madre ___ profesora en un instituto.', 'es', ['está', 'hay', 'tiene']],
    ['¿___ (tú) ayudarme, por favor?', 'Puedes', ['Puedo', 'Podéis', 'Pueden']]
  ];

  const SAETNINGER = [
    ['Jeg hedder Ana.', 'Me llamo Ana.', ['Me llama Ana.', 'Yo soy llamo Ana.', 'Mi nombre Ana.']],
    ['Hvor gammel er du?', '¿Cuántos años tienes?', ['¿Cuántos años eres?', '¿Qué edad haces?', '¿Cómo años tienes?']],
    ['Jeg kan godt lide at spille fodbold.', 'Me gusta jugar al fútbol.', ['Me gustan jugar al fútbol.', 'Yo gusto el fútbol.', 'Me gusta juego fútbol.']],
    ['Hvad laver du i weekenden?', '¿Qué haces el fin de semana?', ['¿Qué eres el fin de semana?', '¿Cómo haces la semana?', '¿Qué hace tú el finde?']],
    ['Jeg bor i Danmark.', 'Vivo en Dinamarca.', ['Vivo a Dinamarca.', 'Soy en Dinamarca.', 'Estoy vivo Dinamarca.']],
    ['Hvor meget koster det?', '¿Cuánto cuesta?', ['¿Cuánto es costa?', '¿Qué cuesta mucho?', '¿Cómo cuesta esto?']],
    ['Jeg forstår ikke.', 'No entiendo.', ['No entender.', 'Yo no entiende.', 'No comprendo nada bien.']],
    ['Kan du gentage det?', '¿Puedes repetirlo?', ['¿Puedes repites?', '¿Podéis repetir tú?', '¿Puedo repetirlo?']],
    ['Jeg har en bror og to søstre.', 'Tengo un hermano y dos hermanas.', ['Tengo un hermano y dos hermanos.', 'Soy un hermano y dos hermanas.', 'Tiene un hermano y dos hermanas.']],
    ['Vi skal i biografen i morgen.', 'Vamos al cine mañana.', ['Vamos a la cine mañana.', 'Vamos al cine ayer.', 'Van al cine mañana.']],
    ['Hun er meget sjov.', 'Ella es muy divertida.', ['Ella está muy divertida.', 'Ella es muy divertido.', 'Ella tiene muy divertida.']],
    ['Jeg står op klokken syv.', 'Me levanto a las siete.', ['Me levanto en las siete.', 'Yo levanto a las siete.', 'Me levanta a las siete.']],
    ['Det er koldt i dag.', 'Hace frío hoy.', ['Es frío hoy.', 'Está frío hoy.', 'Tiene frío hoy.']],
    ['Jeg er sulten.', 'Tengo hambre.', ['Soy hambre.', 'Estoy hambre.', 'Hago hambre.']],
    ['Min far arbejder på et hospital.', 'Mi padre trabaja en un hospital.', ['Mi padre trabaja a un hospital.', 'Mi padre trabajo en un hospital.', 'Su padre trabaja en un hospital.']],
    ['Hvad er klokken?', '¿Qué hora es?', ['¿Qué hora son?', '¿Cuál hora es?', '¿Cómo es la hora?']]
  ];

  /* Escala danesa de 7 trin. El corte por porcentaje es el habitual
     en pruebas hechas por el profesor. */
  const SCALE = [
    { min: 90, g: '12',  txt: 'Fremragende — ¡excelente!' },
    { min: 80, g: '10',  txt: 'Fortrinlig — muy bien.' },
    { min: 65, g: '7',   txt: 'God — bien, con algunos fallos.' },
    { min: 50, g: '4',   txt: 'Jævn — aprobado justo.' },
    { min: 35, g: '02',  txt: 'Tilstrækkelig — lo mínimo.' },
    { min: 15, g: '00',  txt: 'Utilstrækkelig — hay que repasar.' },
    { min: 0,  g: '-3',  txt: 'Ringe — empieza otra vez con calma.' }
  ];
  function gradeFor(pct) { return SCALE.find(x => pct >= x.min) || SCALE[SCALE.length - 1]; }

  /* Genera las preguntas según lo elegido en el setup */
  function buildQuestions(cfg) {
    const pools = [];
    const vocab = getVocab();

    if (cfg.sections.gloser) {
      const pairs = sample(GLOSER, Math.min(GLOSER.length, cfg.count));
      pairs.forEach(([es, da], i) => {
        const toDa = i % 2 === 0;                                   // alterna dirección
        const others = sample(GLOSER.filter(p => p[0] !== es), 3);
        pools.push({
          sec: 'Gloser',
          q: toDa ? `Hvad betyder <em>${esc(es)}</em>?` : `Hvordan siger man <em>${esc(da)}</em> på spansk?`,
          correct: toDa ? da : es,
          options: shuffle([toDa ? da : es].concat(others.map(p => (toDa ? p[1] : p[0])))),
          word: es
        });
      });
    }

    if (cfg.sections.koen) {
      /* El artículo que ya viene en el dato ES la respuesta correcta. NUNCA
         se deduce con detectGender: esa heurística devuelve 'neu' para todo
         lo acabado en -e/-s y calificaría mal "la calle", "la carne" o
         "la leche". Como efecto secundario, exigir artículo deja fuera
         verbos y adjetivos del vocabulario del profe ("hablar", "grande"),
         que no admiten pregunta de género.
         Solo singular: el enunciado pregunta "el eller la". */
      const withArticle = raw => {
        const m = String(raw).trim().match(/^(el|la)\s+(.+)$/i);
        if (!m) return null;
        const w = m[2].trim();
        return w ? { art: m[1].toLowerCase(), w } : null;
      };
      const fromVocab = vocab.map(withArticle).filter(Boolean);
      const nouns = fromVocab.length ? fromVocab : GLOSER.map(p => withArticle(p[0])).filter(Boolean);
      sample(nouns, Math.min(nouns.length, cfg.count)).forEach(({ art, w }) => {
        pools.push({
          sec: 'Køn',
          q: `Hedder det <em>el</em> eller <em>la</em> ${esc(w)}?`,
          correct: art,
          options: ['el', 'la'],
          word: w
        });
      });
    }

    if (cfg.sections.grammatik) {
      sample(GRAMMATIK, Math.min(GRAMMATIK.length, cfg.count)).forEach(([q, correct, wrong]) => {
        pools.push({ sec: 'Grammatik', q: esc(q).replace('___', '<em>___</em>'), correct, options: shuffle([correct].concat(wrong)) });
      });
    }

    if (cfg.sections.saetninger) {
      sample(SAETNINGER, Math.min(SAETNINGER.length, cfg.count)).forEach(([da, correct, wrong]) => {
        pools.push({ sec: 'Sætninger', q: `Oversæt: <em>${esc(da)}</em>`, correct, options: shuffle([correct].concat(wrong)) });
      });
    }

    return sample(pools, Math.min(pools.length, cfg.count));
  }

  let PR = null;          // estado del examen en curso
  let PR_TIMER = null;

  function proeveTeardown() {
    if (PR_TIMER) { clearInterval(PR_TIMER); PR_TIMER = null; }
  }
  window.__proeveTeardown = proeveTeardown;

  /* Punto de entrada del router. NO destruye un examen a medias: se entra
     aquí cada vez que se abre la vista, y salir un momento al menú (a mirar
     una palabra en el Ordbog) no debe borrar las respuestas ya dadas. */
  function renderProeve() {
    if (PR && !PR.finished && PR.qs && PR.i < PR.qs.length && PR.answers.length) { renderResume(); return; }
    renderSetup();
  }

  function renderResume() {
    const view = $id('view-proeve');
    if (!view) return;
    proeveTeardown();
    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📝 Prøve</h2>
<div class="fl-card" style="max-width:480px">
  <p style="font-size:1rem;color:var(--text);line-height:1.6;margin-bottom:.5rem">
    Du har en prøve i gang.</p>
  <p class="fl-note" style="margin-bottom:1.4rem">
    Spørgsmål ${PR.i + 1} af ${PR.qs.length} · ${PR.answers.length} svar er gemt.${
    PR.deadline ? '<br>⏱️ Tiden løber stadig — prøven har en tidsgrænse.' : ''}</p>
  <div style="display:flex;gap:.7rem;flex-wrap:wrap">
    <button id="pr-resume" class="fl-btn fl-btn-primary">Fortsæt prøven →</button>
    <button id="pr-restart" class="fl-btn fl-btn-ghost">Start forfra</button>
  </div>
</div>
</div>`;
    $id('pr-resume').addEventListener('click', () => runQuestion());
    $id('pr-restart').addEventListener('click', () => {
      if (!confirm('Start forfra? Dine ' + PR.answers.length + ' svar slettes.')) return;
      renderSetup();
    });
  }

  function renderSetup() {
    proeveTeardown();
    PR = null;
    const view = $id('view-proeve');
    if (!view) return;
    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📝 Prøve</h2>
<p class="section-subtitle">Test dig selv og få en karakter efter 7-trins-skalaen. Prøven retter sig selv med det samme.</p>
<div class="pr-setup">

  <div class="pr-fieldset">
    <span class="pr-legend">Hvor mange spørgsmål?</span>
    <div class="pr-opts-row" id="pr-count">
      <button class="pr-pill" data-v="10">10</button>
      <button class="pr-pill on" data-v="20">20</button>
      <button class="pr-pill" data-v="30">30</button>
    </div>
  </div>

  <div class="pr-fieldset">
    <span class="pr-legend">Emner</span>
    <div class="pr-opts-row" id="pr-sections">
      <button class="pr-pill on" data-s="gloser">📖 Gloser</button>
      <button class="pr-pill on" data-s="koen">⚥ Køn (el/la)</button>
      <button class="pr-pill on" data-s="grammatik">🔧 Grammatik</button>
      <button class="pr-pill on" data-s="saetninger">💬 Sætninger</button>
    </div>
  </div>

  <div class="pr-fieldset">
    <span class="pr-legend">Tid</span>
    <div class="pr-opts-row" id="pr-time">
      <button class="pr-pill on" data-v="0">Uden tid</button>
      <button class="pr-pill" data-v="600">10 min</button>
      <button class="pr-pill" data-v="1200">20 min</button>
    </div>
  </div>

  <div class="pr-fieldset">
    <span class="pr-legend">Tilstand</span>
    <div class="pr-opts-row" id="pr-mode">
      <button class="pr-pill on" data-v="test">🎓 Prøve — svar først, facit til sidst</button>
      <button class="pr-pill" data-v="practice">💪 Øv — se svaret med det samme</button>
    </div>
  </div>

  <button id="pr-start" class="fl-btn fl-btn-primary" style="align-self:flex-start">▶ Start prøven</button>
  <p class="fl-note">Rigtige svar giver point til <b>📈 Mit Fremskridt</b>.</p>
</div>
</div>`;

    // Los grupos de "pill" son de selección única salvo Emner, que es múltiple
    ['pr-count', 'pr-time', 'pr-mode'].forEach(gid => {
      const g = $id(gid);
      g.addEventListener('click', e => {
        const b = e.target.closest('.pr-pill'); if (!b) return;
        g.querySelectorAll('.pr-pill').forEach(p => p.classList.remove('on'));
        b.classList.add('on');
      });
    });
    const secs = $id('pr-sections');
    secs.addEventListener('click', e => {
      const b = e.target.closest('.pr-pill'); if (!b) return;
      b.classList.toggle('on');
      // nunca dejar los cuatro apagados
      if (!secs.querySelector('.pr-pill.on')) b.classList.add('on');
    });

    $id('pr-start').addEventListener('click', () => {
      const sel = gid => $id(gid).querySelector('.pr-pill.on');
      const cfg = {
        count: Number(sel('pr-count').dataset.v),
        seconds: Number(sel('pr-time').dataset.v),
        mode: sel('pr-mode').dataset.v,
        sections: {
          gloser:     !!secs.querySelector('[data-s="gloser"].on'),
          koen:       !!secs.querySelector('[data-s="koen"].on'),
          grammatik:  !!secs.querySelector('[data-s="grammatik"].on'),
          saetninger: !!secs.querySelector('[data-s="saetninger"].on')
        }
      };
      const qs = buildQuestions(cfg);
      if (!qs.length) { alert('Vælg mindst ét emne.'); return; }
      const now = Date.now();
      PR = { cfg, qs, i: 0, answers: [], startedAt: now, deadline: cfg.seconds ? now + cfg.seconds * 1000 : 0 };
      runQuestion();
    });
  }

  function runQuestion() {
    const view = $id('view-proeve');
    const q = PR.qs[PR.i];
    const pct = Math.round((PR.i / PR.qs.length) * 100);

    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📝 Prøve</h2>
<div class="pr-runner-head">
  <span class="pr-counter">Spørgsmål ${PR.i + 1} af ${PR.qs.length} · ${esc(q.sec)}</span>
  ${PR.cfg.seconds ? '<span class="pr-timer" id="pr-clock">--:--</span>' : ''}
</div>
<div class="pr-progress"><div class="pr-progress-fill" style="width:${pct}%"></div></div>

<div class="pr-q">
  <span class="pr-q-pill">${esc(q.sec)}</span>
  <div class="pr-q-text">${q.q}</div>
  <div class="pr-answers" id="pr-answers">
    ${q.options.map((o, i) => `<button class="pr-ans" data-i="${i}">${esc(o)}</button>`).join('')}
  </div>
  <div class="pr-feedback" id="pr-fb"></div>
  <div class="pr-actions">
    <button id="pr-next" class="fl-btn fl-btn-primary" disabled>${PR.i + 1 === PR.qs.length ? 'Se resultat →' : 'Næste →'}</button>
    <button id="pr-quit" class="fl-btn fl-btn-ghost">Afbryd</button>
  </div>
</div>
</div>`;

    startClock();

    const grid = $id('pr-answers');
    const next = $id('pr-next');
    const fb = $id('pr-fb');
    let answered = false;

    grid.addEventListener('click', e => {
      const b = e.target.closest('.pr-ans');
      if (!b || answered) return;
      answered = true;
      const chosen = q.options[Number(b.dataset.i)];
      const ok = chosen === q.correct;
      PR.answers.push({ q: q.q, sec: q.sec, chosen, correct: q.correct, ok });
      if (ok) Fremskridt.award(q.word || '', 6);

      grid.querySelectorAll('.pr-ans').forEach(x => { x.disabled = true; });

      if (PR.cfg.mode === 'practice') {
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) {
          const right = Array.from(grid.querySelectorAll('.pr-ans'))
            .find(x => q.options[Number(x.dataset.i)] === q.correct);
          if (right) right.classList.add('correct');
        }
        fb.className = 'pr-feedback ' + (ok ? 'ok' : 'err');
        fb.textContent = ok ? '✅ Rigtigt!' : '❌ Rigtigt svar: ' + q.correct;
      } else {
        b.style.borderColor = 'var(--glow)';
        fb.className = 'pr-feedback';
        fb.textContent = 'Svar registreret. Facit kommer til sidst.';
      }
      next.disabled = false;
    });

    next.addEventListener('click', () => {
      if (!answered) return;
      PR.i++;
      if (PR.i >= PR.qs.length) finishProeve();
      else runQuestion();
    });
    $id('pr-quit').addEventListener('click', () => {
      if (!confirm('Afbryd prøven? Dine svar gemmes ikke.')) return;
      renderSetup();               // ya confirmado: no pasar por renderResume
    });
  }

  /* El tiempo restante se calcula contra PR.deadline (reloj de pared), no
     contando ticks: startClock() se reinicia en cada pregunta, y con un
     contador de ticks se perdía la fracción de segundo en curso — quien
     respondía en menos de un segundo por pregunta congelaba el reloj. */
  function startClock() {
    proeveTeardown();
    if (!PR || !PR.deadline) return;
    const paint = () => {
      const left = Math.max(0, Math.ceil((PR.deadline - Date.now()) / 1000));
      const el = $id('pr-clock');
      if (el) {                              // null si se ha salido de la vista
        el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        el.classList.toggle('low', left <= 60);
      }
      return left;
    };
    if (paint() <= 0) { finishProeve(true); return; }
    PR_TIMER = setInterval(() => {
      if (!PR) { proeveTeardown(); return; }
      if (paint() <= 0) { proeveTeardown(); finishProeve(true); }
    }, 250);
  }

  function finishProeve(timeout) {
    proeveTeardown();
    PR.finished = true;    // al agotarse el tiempo PR.i sigue < qs.length
    const view = $id('view-proeve');
    const total = PR.qs.length;
    const right = PR.answers.filter(a => a.ok).length;
    const pct = Math.round((right / total) * 100);
    const g = gradeFor(pct);
    const tier = ['12', '10'].includes(g.g) ? 'top' : (['00', '-3'].includes(g.g) ? 'low' : '');

    // Bonus de XP por nota, además de los puntos ya dados por acierto
    const bonus = { '12': 60, '10': 40, '7': 25, '4': 12 }[g.g] || 0;
    if (bonus) Fremskridt.addXp(bonus, 'proeve');
    Fremskridt.logProeve(pct, g.g);

    // Desglose por sección
    const bySec = {};
    PR.answers.forEach(a => {
      bySec[a.sec] = bySec[a.sec] || { ok: 0, n: 0 };
      bySec[a.sec].n++; if (a.ok) bySec[a.sec].ok++;
    });

    const mins = Math.max(1, Math.round((Date.now() - PR.startedAt) / 60000));

    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">📝 Resultat</h2>
${timeout ? '<p class="section-subtitle" style="color:var(--fl-err)">⏰ Tiden løb ud — ubesvarede spørgsmål tæller som forkerte.</p>' : ''}
<div class="pr-result">
  <div class="pr-grade" ${tier ? `data-tier="${tier}"` : ''}>
    <div>
      <div class="pr-grade-val">${esc(g.g)}</div>
      <div class="pr-grade-lbl">Karakter</div>
    </div>
  </div>
  <p class="pr-score-line">${right} / ${total} rigtige · ${pct}%</p>
  <p class="pr-verdict">${esc(g.txt)}${bonus ? ` <br><b style="color:var(--glow)">+${bonus} bonus-XP</b> til dit fremskridt.` : ''}</p>

  <div class="pr-breakdown">
    ${Object.keys(bySec).map(k => `
      <div class="pr-bd">
        <div class="pr-bd-name">${esc(k)}</div>
        <div class="pr-bd-val">${bySec[k].ok}/${bySec[k].n}</div>
      </div>`).join('')}
    <div class="pr-bd">
      <div class="pr-bd-name">Tid brugt</div>
      <div class="pr-bd-val">${mins} min</div>
    </div>
  </div>

  <div style="display:flex;gap:.7rem;flex-wrap:wrap;justify-content:center">
    <button id="pr-again" class="fl-btn fl-btn-primary">↺ Tag en ny prøve</button>
    <button id="pr-toggle-review" class="fl-btn">👁️ Se dine svar</button>
  </div>

  <div class="pr-review" id="pr-review" hidden>
    ${PR.answers.map(a => `
      <div class="pr-rev-item ${a.ok ? 'ok' : ''}">
        <div class="pr-rev-q">${a.q}</div>
        <div class="pr-rev-a">${a.ok
          ? '✅ <b>' + esc(a.correct) + '</b>'
          : '❌ <s>' + esc(a.chosen) + '</s> → <b>' + esc(a.correct) + '</b>'}</div>
      </div>`).join('')}
  </div>
</div>
</div>`;

    // renderSetup, no renderProeve: al agotarse el tiempo PR.i sigue < qs.length,
    // y renderProeve ofrecería "continuar" un examen ya terminado.
    $id('pr-again').addEventListener('click', renderSetup);
    const rev = $id('pr-review');
    $id('pr-toggle-review').addEventListener('click', e => {
      rev.hidden = !rev.hidden;
      e.currentTarget.textContent = rev.hidden ? '👁️ Se dine svar' : '🙈 Skjul svar';
    });
  }

  /* ════════════════════════════════════════════════════════════
     3 · KULTUR
     ════════════════════════════════════════════════════════════
     NIVEAU: 8.–9. årgang læser A1–A2, ikke B1. Derfor er BRØDTEKSTEN PÅ
     DANSK, og spansk optræder kun som korte øer: enkelte ord og faste
     vendinger, markeret med {spansk|dansk} og oversat ved klik.
     Kulturen skal kunne forstås af alle; sproget øves i små bidder.
     Skriv aldrig hele afsnit på spansk her. */

  const KULTUR = [
    {
      id: 'mundo', ico: '🌎',
      t: 'Den spansktalende verden', tes: 'El mundo hispano',
      sub: '500 millioner mennesker, 21 lande',
      text: [
        'Spansk er modersmål for mere end 500 millioner mennesker. Det er officielt sprog i 21 lande: Spanien, næsten hele Latinamerika og Ækvatorialguinea i Afrika.',
        'Det land, der har flest spansktalende, er ikke Spanien, men Mexico med omkring 130 millioner. I USA bor der over 40 millioner mennesker, som taler spansk.',
        'Det betyder én ting for dig: med spansk kan du rejse gennem den halve verden og forstå folk. Du skal bare kunne sige {hola|hej} og {¿qué tal?|hvordan går det?}.'
      ],
      fact: 'Spansk er verdens næstmest talte modersmål. Kun kinesisk er større — engelsk er nummer tre.',
      vocab: [['hola', 'hej'], ['¿qué tal?', 'hvordan går det?'], ['el mundo', 'verden'], ['el país', 'landet']],
      quiz: [
        ['Hvor mange lande har spansk som officielt sprog?', '21', ['12', '35', '7']],
        ['Hvilket land har flest spansktalende?', 'Mexico', ['Spanien', 'Argentina', 'Colombia']],
        ['Hvad betyder «hola»?', 'Hej', ['Farvel', 'Tak', 'Undskyld']]
      ]
    },
    {
      id: 'fiestas', ico: '🎉',
      t: 'Vilde fester', tes: 'Fiestas increíbles',
      sub: 'La Tomatina, Día de Muertos, Las Fallas',
      text: [
        'I den spansktalende verden findes der fester, der lyder helt opfundne. I byen Buñol i Spanien holder man La Tomatina: i én time kaster 20.000 mennesker tomater efter hinanden. Der bliver brugt 150.000 kilo {tomates|tomater}.',
        'I Mexico er Día de Muertos — de dødes dag — ikke en trist dag. Familierne mindes de døde med orange blomster, musik og kranier af sukker. UNESCO beskytter festen som verdensarv.',
        'Og i Valencia brænder man i marts kæmpestore figurer af træ af midt på gaden. Festen hedder Las Fallas: et helt års arbejde, brændt af på én nat. Man råber {¡qué fuerte!|hvor vildt!}'
      ],
      fact: 'Día de Muertos var inspirationen til Pixar-filmen «Coco».',
      vocab: [['la fiesta', 'festen'], ['el tomate', 'tomaten'], ['la flor', 'blomsten'], ['¡qué fuerte!', 'hvor vildt!']],
      quiz: [
        ['Hvad kaster man med til La Tomatina?', 'Tomater', ['Appelsiner', 'Mel', 'Vand']],
        ['I hvilket land fejrer man Día de Muertos?', 'Mexico', ['Spanien', 'Peru', 'Chile']],
        ['Hvad sker der med figurerne til Las Fallas?', 'De bliver brændt af', ['De bliver solgt', 'De bliver gemt', 'De bliver spist']]
      ]
    },
    {
      id: 'comida', ico: '🍽️',
      t: 'Maden', tes: 'La comida',
      sub: 'Tapas, tacos, arepas, asado, ceviche',
      text: [
        'Glem tex-mex. Maden i den spansktalende verden er meget mere varieret. I Spanien spiser man {tapas|små retter, man deler}: små retter, som alle ved bordet deler. Paella kommer fra Valencia — og den ægte udgave er med kanin og kylling, ikke skaldyr.',
        'I Mexico har man tacos, men også mole: en sovs lavet med chokolade og chili. I Colombia og Venezuela spiser man arepas af majs. I Argentina er asado næsten en religion: hele familien samlet om kødet om søndagen.',
        'I Peru findes ceviche: rå fisk, der kun bliver «kogt» i limesaft. Smager det godt, siger man {¡está buenísimo!|det smager fantastisk!}'
      ],
      fact: 'Chokolade, tomat, kartoffel, majs og chili kommer alle fra Amerika. Før 1492 fandtes de slet ikke i Europa — forestil dig en italiensk pizza uden tomat.',
      vocab: [['la comida', 'maden'], ['el pescado', 'fisken'], ['la carne', 'kødet'], ['¡está buenísimo!', 'det smager fantastisk!']],
      quiz: [
        ['Hvor kommer paella fra?', 'Fra Valencia', ['Fra Madrid', 'Fra Mexico', 'Fra Peru']],
        ['Hvad bliver ceviche «kogt» i?', 'Limesaft', ['Varm olie', 'Salt', 'Mælk']],
        ['Hvad er arepas lavet af?', 'Majs', ['Hvede', 'Kartofler', 'Ris']]
      ]
    },
    {
      id: 'musica', ico: '🎵',
      t: 'Musikken', tes: 'La música',
      sub: 'Reggaetón, flamenco, salsa, bachata',
      text: [
        'Den reggaetón, du hører, kommer fra Puerto Rico og Panama. Bad Bunny er en af verdens mest streamede kunstnere, og han synger kun på spansk.',
        'Men der er meget mere. Flamenco kommer fra Sydspanien: guitar, klap og en stemme, der gør ondt. Salsa opstod mellem Cuba, Puerto Rico og New York. Bachata er fra Den Dominikanske Republik, og tango er fra Argentina.',
        'At høre musik på spansk er den nemmeste måde at lære sproget på: din hjerne husker teksterne helt af sig selv. Syng med — {¡vamos!|kom så!}'
      ],
      fact: '«Despacito» var den første video, der nåede 5 milliarder visninger på YouTube. Den er på spansk.',
      vocab: [['la música', 'musikken'], ['la canción', 'sangen'], ['bailar', 'at danse'], ['¡vamos!', 'kom så!']],
      quiz: [
        ['Hvor kommer reggaetón fra?', 'Puerto Rico og Panama', ['Spanien', 'Argentina', 'Mexico']],
        ['Hvilket land kommer tango fra?', 'Argentina', ['Cuba', 'Chile', 'Spanien']],
        ['Hvilket sprog synger Bad Bunny på?', 'Spansk', ['Engelsk', 'Portugisisk', 'Fransk']]
      ]
    },
    {
      id: 'deporte', ico: '⚽',
      t: 'Sporten', tes: 'El deporte',
      sub: 'El Clásico, Nadal, Messi, baseball',
      text: [
        'Fodbold er nærmest en religion. Når Real Madrid møder FC Barcelona, hedder kampen El Clásico, og 500 millioner mennesker ser med. Gaderne bliver helt tomme.',
        'Men Spanien er ikke kun fodbold. Rafael Nadal vandt Roland Garros fjorten gange — ingen har vundet den samme turnering så mange gange. I basketball har Spanien været verdensmester.',
        'I Latinamerika vandt Argentina og Messi VM i 2022. Og på Cuba og i Den Dominikanske Republik er baseball vigtigere end fodbold. Når der bliver scoret, råber alle {¡gol!|mål!}'
      ],
      fact: 'Håndbold er stort i Spanien ligesom i Danmark: begge landshold er blandt verdens bedste. Et rigtig godt samtaleemne med en spanier.',
      vocab: [['el fútbol', 'fodbold'], ['el equipo', 'holdet'], ['ganar', 'at vinde'], ['¡gol!', 'mål!']],
      quiz: [
        ['Hvad hedder kampen mellem Real Madrid og FC Barcelona?', 'El Clásico', ['El Derbi', 'La Final', 'La Copa']],
        ['Hvilken sport er mest populær på Cuba?', 'Baseball', ['Fodbold', 'Tennis', 'Basketball']],
        ['Hvem vandt VM i fodbold i 2022?', 'Argentina', ['Frankrig', 'Spanien', 'Brasilien']]
      ]
    },
    {
      id: 'variantes', ico: '🗣️',
      t: 'Samme sprog, tusind former', tes: 'El mismo idioma, mil formas',
      sub: 'Spanien og Latinamerika',
      text: [
        'Spansk lyder ikke ens alle steder — og det er helt fint.',
        'I Spanien siger man «vosotros», når man taler til flere. I Latinamerika siger man det aldrig; der hedder det «ustedes». I Argentina og Uruguay bruger man «vos» i stedet for «tú».',
        'Ordene skifter også. {el coche|bilen} i Spanien hedder el carro eller el auto i Amerika. {el móvil|mobilen} hedder el celular. Computeren hedder el ordenador i Spanien og la computadora i Amerika. Hvilken slags spansk skal du lære? Den, du har lyst til — alle forstår hinanden fint.'
      ],
      fact: 'I Spanien betyder «coger» bare «at tage», men i Argentina og Mexico er det et meget grimt ord. Det er den klassiske fejl, spanske turister laver.',
      vocab: [['el coche / el carro', 'bilen'], ['el móvil / el celular', 'mobilen'], ['ustedes', 'I (flertal)'], ['hablar', 'at tale']],
      quiz: [
        ['Hvad siger man i Latinamerika i stedet for «vosotros»?', 'Ustedes', ['Vos', 'Tú', 'Nosotros']],
        ['Hvad hedder «el móvil» i Amerika?', 'El celular', ['El ordenador', 'El carro', 'El zumo']],
        ['I hvilke lande bruger man «vos»?', 'Argentina og Uruguay', ['Spanien og Mexico', 'Peru og Chile', 'Cuba og Panama']]
      ]
    }
  ];

  /* {palabra|dansk} → <span class="ku-gloss" data-da="dansk">palabra</span> */
  function glossify(raw) {
    let out = '';
    let last = 0;
    const re = /\{([^{}|]+)\|([^{}|]+)\}/g;
    let m;
    while ((m = re.exec(raw)) !== null) {
      out += esc(raw.slice(last, m.index));
      out += `<span class="ku-gloss" data-da="${esc(m[2])}" role="button" tabindex="0">${esc(m[1])}</span>`;
      last = m.index + m[0].length;
    }
    out += esc(raw.slice(last));
    return out;
  }

  function renderKultur() {
    const view = $id('view-kultur');
    if (!view) return;
    const done = load().kultur;
    view.innerHTML = `<div class="content-view active" style="display:flex">
<h2 class="section-title">🌍 Kultur</h2>
<p class="section-subtitle">Seks emner om den spansktalende verden. Teksterne er på dansk, og undervejs møder du spanske ord — klik på dem for at se, hvad de betyder.</p>
<div class="ku-grid">
  ${KULTUR.map(k => `
  <button class="ku-card ${done.includes(k.id) ? 'done' : ''}" data-id="${esc(k.id)}">
    <div class="ku-card-glow"></div>
    <span class="ku-card-ico">${k.ico}</span>
    <span class="ku-card-title">${esc(k.t)}</span>
    <span class="ku-card-sub">${esc(k.sub)}</span>
    <span class="ku-card-meta">${k.quiz.length} spørgsmål</span>
  </button>`).join('')}
</div>
</div>`;
    view.querySelectorAll('.ku-card').forEach(c => {
      c.addEventListener('click', () => openKultur(c.dataset.id));
    });
  }

  function openKultur(id) {
    const k = KULTUR.find(x => x.id === id);
    if (!k) return;
    const view = $id('view-kultur');

    view.innerHTML = `<div class="content-view active" style="display:flex">
<button id="ku-back" class="fl-btn fl-btn-ghost" style="align-self:flex-start;margin-bottom:1.2rem">← Alle emner</button>
<div class="ku-article">
  <div class="ku-art-head">
    <span class="ku-art-ico">${k.ico}</span>
    <h2 class="ku-art-title">${esc(k.t)}</h2>
    <p class="ku-art-title-da">${esc(k.tes)}</p>
  </div>

  <div class="ku-text">${k.text.map(p => `<p>${glossify(p)}</p>`).join('')}</div>
  <p class="fl-note" style="margin:-0.6rem 0 1.4rem">💡 De <span style="color:var(--glow)">farvede ord</span> er spanske — klik på dem for at se, hvad de betyder.</p>

  <h3 class="fs-subhead" style="margin-top:0">🗒️ Ord fra teksten</h3>
  <div class="ku-vocab" style="margin-bottom:1.7rem">
    ${k.vocab.map(([es, da]) => `<span class="ku-vocab-chip"><b>${esc(es)}</b> <span>· ${esc(da)}</span></span>`).join('')}
  </div>

  <div class="ku-fact">
    <span class="ku-fact-lbl">Vidste du det?</span>
    ${esc(k.fact)}
  </div>

  <h3 class="fs-subhead" style="margin-top:0">❓ Forstod du det?</h3>
  <div id="ku-quiz">
    ${k.quiz.map((q, qi) => `
    <div class="ku-quiz-q" data-qi="${qi}">
      <div class="ku-quiz-txt">${qi + 1}. ${esc(q[0])}</div>
      <div class="ku-quiz-opts">
        ${shuffle([q[1]].concat(q[2])).map(o => `<button class="ku-quiz-opt" data-v="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>
    </div>`).join('')}
  </div>
  <p class="fl-note" id="ku-score" style="margin-top:1rem"></p>
</div>
</div>`;

    $id('ku-back').addEventListener('click', renderKultur);

    // Glosas: clic (o Enter) muestra el danés al lado
    view.querySelectorAll('.ku-gloss').forEach(g => {
      const toggle = () => {
        if (g.classList.contains('shown')) return;
        g.classList.add('shown');
        const s = document.createElement('span');
        s.className = 'ku-gloss-da';
        s.textContent = '(' + g.dataset.da + ')';
        g.after(s);
      };
      g.addEventListener('click', toggle);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });

    // Quiz de comprensión
    let right = 0, answered = 0;
    const scoreEl = $id('ku-score');
    view.querySelectorAll('.ku-quiz-q').forEach(box => {
      const qi = Number(box.dataset.qi);
      const correct = k.quiz[qi][1];
      box.querySelectorAll('.ku-quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          if (box.dataset.done) return;
          box.dataset.done = '1';
          answered++;
          const ok = btn.dataset.v === correct;
          if (ok) { right++; Fremskridt.award('', 8); }
          btn.classList.add(ok ? 'correct' : 'wrong');
          box.querySelectorAll('.ku-quiz-opt').forEach(b => {
            b.disabled = true;
            if (!ok && b.dataset.v === correct) b.classList.add('correct');
          });
          scoreEl.textContent = `${right} / ${answered} rigtige`;
          if (answered === k.quiz.length) {
            if (right === k.quiz.length && Fremskridt.markKultur(k.id)) {
              Fremskridt.addXp(30, 'kultur');
              scoreEl.innerHTML = `🎉 Alle rigtige! Emnet er markeret som færdigt <b style="color:var(--glow)">(+30 XP)</b>.`;
            } else {
              scoreEl.textContent = `${right} / ${k.quiz.length} rigtige. Læs teksten igen og prøv et andet emne.`;
            }
          }
        });
      });
    });
  }

  /* ── Exportación al router ──────────────────────────────────── */
  window.renderFremskridt = renderFremskridt;
  window.renderProeve = renderProeve;
  window.renderKultur = renderKultur;
})();
