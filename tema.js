/* ============================================================
   tema.js — motor compartido de las páginas de tema
   ------------------------------------------------------------
   Cada temaN.html define window.TEMA = { ... } y carga este
   archivo. Aquí NO hay que tocar nada para añadir un tema.

   Todo el contenido está hardcodeado en el archivo del tema:
   cero llamadas a internet, cero localStorage obligatorio,
   cero "no hay material todavía".
   ============================================================ */
(function(){
'use strict';

var T = window.TEMA;
if(!T){ console.error('[tema] Falta window.TEMA en este archivo.'); return; }

/* ── utilidades ─────────────────────────────────────────── */
function esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')
                  .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function shuffle(a){
  var r = a.slice();
  for(var i=r.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=r[i];r[i]=r[j];r[j]=t; }
  return r;
}
function say(text){
  if(!window.speechSynthesis) return;
  try{
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-ES'; u.rate = .9;
    window.speechSynthesis.speak(u);
  }catch(e){}
}
window.temaSay = say;

/* Palabra sin artículo: "el libro" → "libro" */
function sinArt(es){
  return String(es).replace(/^(el|la|los|las|un|una|unos|unas)\s+/i,'').trim();
}
var VOCAB   = T.vocab   || [];
var FRASES  = T.frases  || [];

/* ── 1 · CABECERA ───────────────────────────────────────── */
function renderHero(){
  var tools = '';
  if(T.hoja){
    tools += '<a class="tema-tool" href="'+esc(T.hoja)+'" download>⬇️ Hent arket (til print)</a>';
  }
  tools += '<button class="tema-tool" type="button" id="btn-print">🖨️ Print denne side</button>';
  tools += '<a class="tema-tool" href="#ejercicios">🧩 Gå til øvelserne</a>';

  return ''+
  '<div class="tema-hero">'+
    '<p class="tema-kicker">Tema '+esc(T.num)+'</p>'+
    '<h1 class="tema-h1">'+T.es+'</h1>'+
    '<p class="tema-da">'+esc(T.da)+'</p>'+
    (T.intro ? '<p class="tema-intro">'+T.intro+'</p>' : '')+
    '<div class="tema-tools">'+tools+'</div>'+
  '</div>';
}

/* ── 2 · BLOQUES DE CONTENIDO ───────────────────────────── */
function renderFrases(filas){
  return '<div class="frases">'+ filas.map(function(f){
    return '<div class="frase">'+
      '<button class="frase-play" type="button" data-say="'+esc(f[0])+'" aria-label="Lyt">🔊</button>'+
      '<span class="frase-es">'+esc(f[0])+'</span>'+
      '<span class="frase-da">'+esc(f[1])+'</span>'+
    '</div>';
  }).join('') +'</div>';
}

function renderChips(items){
  return '<div class="chips">'+ items.map(function(v){
    var g = v.gen==='fem' ? 'fem' : 'masc';
    var art = v.gen==='fem' ? 'la' : 'el';
    return '<button class="chip '+g+'" type="button" data-say="'+esc(v.es)+'">'+
      '<span class="chip-art">'+art+'</span>'+
      '<span class="chip-es">'+esc(sinArt(v.es))+'</span>'+
      '<span class="chip-da">'+esc(v.da)+'</span>'+
    '</button>';
  }).join('') +'</div>';
}

function renderNums(items){
  return '<div class="nums">'+ items.map(function(n){
    return '<button class="num" type="button" data-say="'+esc(n[1])+'">'+
      '<b>'+esc(n[0])+'</b><span>'+esc(n[1])+'</span><em>'+esc(n[2])+'</em>'+
    '</button>';
  }).join('') +'</div>';
}

function renderBloque(b){
  var cuerpo = '';
  if(b.frases) cuerpo += renderFrases(b.frases);
  if(b.chips)  cuerpo += renderChips(b.chips);
  if(b.nums)   cuerpo += renderNums(b.nums);
  if(b.html)   cuerpo += '<div class="bloque-html">'+b.html+'</div>';

  return '<section class="bloque">'+
    '<div class="bloque-head">'+
      (b.letra ? '<span class="bloque-letra">'+esc(b.letra)+'</span>' : '')+
      '<span class="bloque-es">'+esc(b.es)+'</span>'+
      (b.da ? '<span class="bloque-da">· '+esc(b.da)+'</span>' : '')+
    '</div>'+
    (b.nota ? '<p class="bloque-nota">'+b.nota+'</p>' : '')+
    cuerpo+
  '</section>';
}

/* ── 3 · MI TARJETA (rellenar y leer en voz alta) ───────── */
function renderTarjeta(){
  if(!T.tarjeta) return '';
  var lineas = T.tarjeta.lineas.map(function(l,i){
    // l = ['Me llamo ', '…', '.']  → texto antes, hueco, texto después
    return '<div class="tarjeta-linea">'+
      '<span class="tarjeta-n">'+(i+1)+'</span>'+
      '<span class="tarjeta-txt">'+
        esc(l[0])+
        (l[1]===null ? '' : '<input class="tarjeta-in" type="text" placeholder="'+esc(l[1]||'')+'" data-i="'+i+'" />')+
        esc(l[2]||'')+
      '</span>'+
    '</div>';
  }).join('');

  return '<section class="bloque" id="bloque-tarjeta">'+
    '<div class="bloque-head">'+
      '<span class="bloque-letra">★</span>'+
      '<span class="bloque-es">'+esc(T.tarjeta.es)+'</span>'+
      '<span class="bloque-da">· '+esc(T.tarjeta.da)+'</span>'+
    '</div>'+
    (T.tarjeta.nota ? '<p class="bloque-nota">'+T.tarjeta.nota+'</p>' : '')+
    '<div class="tarjeta-lineas">'+lineas+'</div>'+
    '<div class="tema-tools" style="margin-top:1.2rem">'+
      '<button class="tema-tool" type="button" id="tarjeta-ver">✅ Saml min tekst</button>'+
      '<button class="tema-tool" type="button" id="tarjeta-oir">🔊 Hør den på spansk</button>'+
    '</div>'+
    '<div class="tarjeta-salida" id="tarjeta-salida"></div>'+
  '</section>';
}

function textoTarjeta(){
  var ins = document.querySelectorAll('#bloque-tarjeta .tarjeta-in');
  return T.tarjeta.lineas.map(function(l,i){
    var val = '';
    for(var k=0;k<ins.length;k++){ if(+ins[k].dataset.i===i) val = ins[k].value.trim(); }
    if(l[1]!==null && !val) val = '…';
    return (l[0]+val+(l[2]||'')).replace(/\s+/g,' ').trim();
  }).join(' ');
}

/* ── 4 · CHECKLIST ──────────────────────────────────────── */
function renderCheck(){
  if(!T.checklist || !T.checklist.length) return '';
  return '<section class="bloque">'+
    '<div class="bloque-head">'+
      '<span class="bloque-letra">✓</span>'+
      '<span class="bloque-es">Al final del tema</span>'+
      '<span class="bloque-da">· Det kan jeg nu</span>'+
    '</div>'+
    '<div class="check-list">'+ T.checklist.map(function(c){
      return '<button class="check" type="button">'+
        '<span class="check-box">✓</span>'+
        '<span class="check-txt"><b>'+esc(c[0])+'</b><span>'+esc(c[1])+'</span></span>'+
      '</button>';
    }).join('') +'</div>'+
  '</section>';
}

/* ============================================================
   EJERCICIOS — todos offline, con las traducciones del tema
   ============================================================ */

/* 🎯 el o la */
function ejGenero(panel){
  var words = VOCAB.filter(function(v){ return v.gen==='masc'||v.gen==='fem'; });
  if(words.length < 4){ panel.innerHTML = '<p class="bloque-nota" style="padding:0">Ingen navneord i dette tema.</p>'; return; }
  words = shuffle(words).slice(0,12);
  var total = words.length, score = 0, placed = 0, dragging = null;

  panel.innerHTML =
    '<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1rem">Træk hvert ord hen til <b>el</b> eller <b>la</b> 🎯</p>'+
    '<div class="dd-words" id="dd-source">'+ words.map(function(v){
      return '<div class="dd-word" draggable="true" data-gen="'+v.gen+'" data-w="'+esc(sinArt(v.es))+'">'+esc(sinArt(v.es))+'</div>';
    }).join('') +'</div>'+
    '<div class="dd-buckets">'+
      '<div class="dd-bucket masc-bucket" data-gender="masc"><h3>🔷 el · masculino</h3></div>'+
      '<div class="dd-bucket fem-bucket"  data-gender="fem"><h3>🌸 la · femenino</h3></div>'+
    '</div>'+
    '<div id="dd-result"></div>'+
    '<button class="save-btn" id="dd-reset" style="margin-top:1.25rem">🔄 Genstart</button>';

  function suelta(bucket, word){
    if(word.dataset.done) return;
    word.dataset.done = '1';
    word.setAttribute('draggable','false');
    word.style.cursor = 'default';
    bucket.appendChild(word);
    var ok = word.dataset.gen === bucket.dataset.gender;
    if(ok){ score++; word.style.background='rgba(34,197,94,.2)'; word.style.borderColor='#22c55e'; }
    else  { word.style.background='rgba(239,68,68,.2)';  word.style.borderColor='#ef4444';
            word.textContent = (word.dataset.gen==='fem'?'la ':'el ') + word.dataset.w; }
    placed++;
    if(placed>=total){
      panel.querySelector('#dd-result').innerHTML =
        '<div class="dd-result '+(score===total?'correct':'wrong')+'">'+
        (score===total ? '🎉 Perfekt! Alle ord er rigtige!' : score+' / '+total+' rigtige. Prøv igen!')+'</div>';
    }
  }

  panel.querySelectorAll('.dd-word').forEach(function(w){
    w.addEventListener('dragstart',function(e){ dragging=w; w.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; });
    w.addEventListener('dragend',  function(){ dragging=null; w.classList.remove('dragging'); });
    // Móvil / tablet: tocar la palabra y luego el cubo
    w.addEventListener('click',function(){
      if(w.dataset.done) return;
      panel.querySelectorAll('.dd-word').forEach(function(x){ x.classList.remove('dragging'); });
      dragging = w; w.classList.add('dragging');
    });
  });
  panel.querySelectorAll('.dd-bucket').forEach(function(b){
    b.addEventListener('dragover',function(e){ e.preventDefault(); b.classList.add('drag-over'); });
    b.addEventListener('dragleave',function(){ b.classList.remove('drag-over'); });
    b.addEventListener('drop',function(e){ e.preventDefault(); b.classList.remove('drag-over'); if(dragging){ suelta(b,dragging); dragging=null; } });
    b.addEventListener('click',function(){ if(dragging){ dragging.classList.remove('dragging'); suelta(b,dragging); dragging=null; } });
  });
  panel.querySelector('#dd-reset').addEventListener('click',function(){ ejGenero(panel); });
}

/* 🃏 Match-par (frases) */
function ejMatch(panel){
  var pool = FRASES.length >= 4 ? FRASES : VOCAB.map(function(v){ return {es:v.es, da:v.da}; });
  var pairs = shuffle(pool).slice(0, Math.min(8, pool.length));
  var score = 0, sel = null;

  panel.innerHTML =
    '<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1rem">Vælg en spansk sætning og derefter den danske 🃏</p>'+
    '<div class="match-grid">'+
      '<div class="match-col">'+ shuffle(pairs).map(function(p,i){
        return '<div class="match-item" data-k="'+esc(p.es)+'" data-l="es">'+esc(p.es)+'</div>'; }).join('') +'</div>'+
      '<div class="match-col">'+ shuffle(pairs).map(function(p){
        return '<div class="match-item" data-k="'+esc(p.es)+'" data-l="da">'+esc(p.da)+'</div>'; }).join('') +'</div>'+
    '</div>'+
    '<p class="match-score" id="m-score">0 / '+pairs.length+' match</p>'+
    '<button class="save-btn" id="m-reset" style="margin-top:1rem">🔄 Bland igen</button>';

  var scoreEl = panel.querySelector('#m-score');
  panel.querySelectorAll('.match-item').forEach(function(it){
    it.addEventListener('click',function(){
      if(it.classList.contains('matched')) return;
      if(!sel){ sel = it; it.classList.add('selected'); return; }
      if(sel === it){ it.classList.remove('selected'); sel = null; return; }
      var a = sel, b = it; a.classList.remove('selected'); sel = null;
      if(a.dataset.k === b.dataset.k && a.dataset.l !== b.dataset.l){
        a.classList.add('matched'); b.classList.add('matched');
        score++;
        scoreEl.textContent = (score === pairs.length)
          ? '🎉 Perfekt! Alle par fundet!' : score+' / '+pairs.length+' match';
        say(a.dataset.k);
      } else {
        a.classList.add('wrong-shake'); b.classList.add('wrong-shake');
        setTimeout(function(){ a.classList.remove('wrong-shake'); b.classList.remove('wrong-shake'); },400);
      }
    });
  });
  panel.querySelector('#m-reset').addEventListener('click',function(){ ejMatch(panel); });
}

/* 🎧 Lytteøvelse */
function ejEscucha(panel){
  var pool = VOCAB.length >= 4 ? VOCAB : FRASES;
  var qs = shuffle(pool).slice(0, Math.min(6, pool.length));
  var todas = pool.map(function(p){ return p.da; });

  panel.innerHTML =
    '<p style="font-size:.9rem;color:var(--text-dim);margin-bottom:1.4rem;line-height:1.6">🎧 Tryk på højttaleren, lyt til det spanske ord og vælg den rigtige danske oversættelse.</p>'+
    '<div style="display:flex;flex-direction:column;gap:1.2rem">'+
    qs.map(function(q){
      var opts = [q.da];
      shuffle(todas.filter(function(d){ return d !== q.da; })).forEach(function(d){ if(opts.length<4 && opts.indexOf(d)<0) opts.push(d); });
      opts = shuffle(opts);
      return '<div class="list-q" data-ans="'+esc(q.da)+'" data-w="'+esc(q.es)+'" style="background:rgba(255,255,255,.03);padding:1.3rem;border-radius:16px;border:1px solid var(--glass-border)">'+
        '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.1rem">'+
          '<button class="frase-play" type="button" data-say="'+esc(q.es)+'" style="width:3rem;height:3rem;font-size:1.3rem">🔊</button>'+
          '<span class="l-reveal" style="font-size:.95rem;color:var(--text-dim)">Klik for at lytte</span>'+
        '</div>'+
        '<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:.8rem">'+
          opts.map(function(o){ return '<button class="opt-btn" type="button">'+esc(o)+'</button>'; }).join('')+
        '</div>'+
        '<span class="l-res" style="font-size:.9rem;font-weight:500"></span>'+
      '</div>';
    }).join('')+
    '</div><button class="save-btn" id="l-reset" style="margin-top:1.4rem">🔄 Nye ord</button>';

  panel.querySelectorAll('.opt-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var q = btn.closest('.list-q');
      if(q.dataset.done) return;
      q.dataset.done = '1';
      q.querySelectorAll('.opt-btn').forEach(function(b){ b.style.opacity='.4'; b.style.pointerEvents='none'; });
      btn.style.opacity = '1';
      q.querySelector('.l-reveal').innerHTML = '<strong style="color:var(--glow);font-size:1.05rem">'+esc(q.dataset.w)+'</strong>';
      var res = q.querySelector('.l-res');
      if(btn.textContent === q.dataset.ans){
        btn.style.borderColor='#22c55e'; btn.style.background='rgba(34,197,94,.12)'; btn.style.color='#4ade80';
        res.textContent = '✅ Korrekt!'; res.style.color = '#4ade80';
      } else {
        btn.style.borderColor='#f87171'; btn.style.background='rgba(248,113,113,.12)'; btn.style.color='#f87171';
        res.textContent = '❌ Svaret var: '+q.dataset.ans; res.style.color = '#fca5a5';
      }
    });
  });
  panel.querySelector('#l-reset').addEventListener('click',function(){ ejEscucha(panel); });
}

/* 🔤 Ord-puslespil */
function ejPuzzle(panel){
  var pool = VOCAB.filter(function(v){ return sinArt(v.es).length >= 3 && sinArt(v.es).indexOf(' ') < 0; });
  if(pool.length < 3) pool = VOCAB;
  var qs = shuffle(pool).slice(0, Math.min(6, pool.length));
  var score = 0, total = qs.length;

  function mezcla(w){
    var a = w.split(''), s = w;
    for(var t=0;t<12 && s===w;t++){ s = shuffle(a).join(''); }
    return s;
  }

  panel.innerHTML =
    '<p style="font-size:.9rem;color:var(--text-dim);margin-bottom:1.2rem;line-height:1.6">🔤 Det blandede spanske ord passer til det danske ord i grønt. Skriv det rigtigt og tryk <em>Tjek</em>.</p>'+
    '<div id="p-score" style="text-align:center;font-size:1rem;font-weight:600;color:var(--glow);margin-bottom:1rem">Score: 0 / '+total+'</div>'+
    '<div style="display:flex;flex-direction:column;gap:1.1rem">'+
    qs.map(function(q){
      var w = sinArt(q.es);
      return '<div class="scr-q" data-ans="'+esc(w)+'" style="background:rgba(255,255,255,.03);padding:1.3rem;border-radius:16px;border:1px solid var(--glass-border)">'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:.8rem">'+
          '<span style="font-size:.85rem;color:var(--text-dim)">Dansk: <strong style="color:var(--glow);font-size:1rem">'+esc(q.da)+'</strong></span>'+
          '<span style="font-size:.85rem;color:var(--text-dim)">Blandet: <strong style="letter-spacing:3px;font-size:1.1rem;color:#a78bfa">'+esc(mezcla(w))+'</strong></span>'+
        '</div>'+
        '<div style="display:flex;gap:.6rem;align-items:center">'+
          '<input class="scr-input admin-input" type="text" placeholder="Skriv ordet…" autocomplete="off" spellcheck="false" style="flex:1;font-size:1rem;padding:.6rem 1rem" />'+
          '<button class="save-btn scr-check" type="button" style="margin:0;padding:.6rem 1.1rem;font-size:.9rem;white-space:nowrap">Tjek ✓</button>'+
        '</div>'+
        '<div class="scr-res" style="font-size:.9rem;font-weight:500;min-height:1.4rem;margin-top:.6rem"></div>'+
      '</div>';
    }).join('')+
    '</div><button class="save-btn" id="p-reset" style="margin-top:1.4rem">🔄 Nye ord</button>';

  var scoreEl = panel.querySelector('#p-score');
  panel.querySelectorAll('.scr-q').forEach(function(card){
    var inp = card.querySelector('.scr-input');
    var res = card.querySelector('.scr-res');
    var ans = card.dataset.ans;
    function check(){
      if(card.dataset.done) return;
      card.dataset.done = '1';
      inp.disabled = true;
      card.querySelector('.scr-check').style.opacity = '.5';
      if(inp.value.trim().toLowerCase() === ans.toLowerCase()){
        score++; res.textContent = '✅ Korrekt! «'+ans+'»'; res.style.color='#4ade80'; inp.style.borderColor='#22c55e'; say(ans);
      } else {
        res.textContent = '❌ Det rigtige ord er: '+ans; res.style.color='#fca5a5'; inp.style.borderColor='#ef4444';
      }
      scoreEl.textContent = (score===total) ? '🎉 Perfekt! Alle '+total+' ord rigtige!' : 'Score: '+score+' / '+total;
      if(score===total) scoreEl.style.color = '#4ade80';
    }
    card.querySelector('.scr-check').addEventListener('click',check);
    inp.addEventListener('keydown',function(e){ if(e.key==='Enter') check(); });
  });
  panel.querySelector('#p-reset').addEventListener('click',function(){ ejPuzzle(panel); });
}

/* ── ZONA DE EJERCICIOS ─────────────────────────────────── */
var EJ = [
  { id:'gen',  ico:'🎯', nom:'el / la',       fn:ejGenero,  ok:function(){ return VOCAB.filter(function(v){return v.gen;}).length >= 4; } },
  { id:'mat',  ico:'🃏', nom:'Match-par',     fn:ejMatch,   ok:function(){ return (FRASES.length+VOCAB.length) >= 4; } },
  { id:'lyt',  ico:'🎧', nom:'Lytteøvelse',   fn:ejEscucha, ok:function(){ return (VOCAB.length+FRASES.length) >= 4; } },
  { id:'puz',  ico:'🔤', nom:'Ord-puslespil', fn:ejPuzzle,  ok:function(){ return VOCAB.length >= 3; } }
];

function renderEjercicios(){
  var act = EJ.filter(function(e){ return e.ok(); });
  if(!act.length) return '';
  return '<div class="ejercicios" id="ejercicios">'+
    '<div class="ejercicios-head">'+
      '<h2>🧩 Øvelser</h2>'+
      '<p>Ekstra træning med ordene fra dette tema. Ingen karakter — bare øv løs.</p>'+
    '</div>'+
    '<div class="exercise-tabs">'+ act.map(function(e,i){
      return '<button class="tab-btn'+(i===0?' active':'')+'" type="button" data-ej="'+e.id+'">'+e.ico+' '+e.nom+'</button>';
    }).join('') +'</div>'+
    act.map(function(e,i){
      return '<div class="exercise-panel'+(i===0?' active':'')+'" id="panel-'+e.id+'"></div>';
    }).join('')+
  '</div>';
}

/* ── MONTAJE ────────────────────────────────────────────── */
var html = renderHero();
(T.bloques||[]).forEach(function(b){ html += renderBloque(b); });
html += renderTarjeta();
html += renderCheck();
html += renderEjercicios();
html += '<div class="tema-footer">'+
          '<a href="index.html">← Alle temaer</a>'+
          '<a href="spil.html">🎮 LinguaStrike</a>'+
        '</div>';

document.getElementById('tema-root').innerHTML = html;
document.title = 'Tema '+T.num+' · '+String(T.es).replace(/<[^>]+>/g,'');

/* audio en todo lo que tenga data-say */
document.getElementById('tema-root').addEventListener('click', function(e){
  var t = e.target.closest('[data-say]');
  if(t) say(t.dataset.say);
});

/* imprimir */
var bp = document.getElementById('btn-print');
if(bp) bp.addEventListener('click', function(){ window.print(); });

/* checklist */
document.querySelectorAll('.check').forEach(function(c){
  c.addEventListener('click', function(){ c.classList.toggle('on'); });
});

/* tarjeta */
var bv = document.getElementById('tarjeta-ver');
var bo = document.getElementById('tarjeta-oir');
if(bv) bv.addEventListener('click', function(){
  document.getElementById('tarjeta-salida').textContent = textoTarjeta();
});
if(bo) bo.addEventListener('click', function(){
  var txt = textoTarjeta();
  document.getElementById('tarjeta-salida').textContent = txt;
  say(txt);
});

/* pestañas de ejercicios */
var act = EJ.filter(function(e){ return e.ok(); });
act.forEach(function(e){ e.fn(document.getElementById('panel-'+e.id)); });
document.querySelectorAll('[data-ej]').forEach(function(tab){
  tab.addEventListener('click', function(){
    document.querySelectorAll('[data-ej]').forEach(function(t){ t.classList.remove('active'); });
    document.querySelectorAll('.exercise-panel').forEach(function(p){ p.classList.remove('active'); });
    tab.classList.add('active');
    document.getElementById('panel-'+tab.dataset.ej).classList.add('active');
  });
});

/* Deja el vocabulario de este tema disponible para LinguaStrike */
try{
  var pares = VOCAB.map(function(v){ return [sinArt(v.es), v.da]; });
  localStorage.setItem('vocab', JSON.stringify(pares.map(function(p){ return p[0]; })));
  var dict = {};
  try{ dict = JSON.parse(localStorage.getItem('dict')||'{}'); }catch(e){ dict = {}; }
  pares.forEach(function(p){ dict[p[0].toLowerCase()] = p[1]; });
  localStorage.setItem('dict', JSON.stringify(dict));
}catch(e){}

})();
