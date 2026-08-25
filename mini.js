/* ============================================================
   din klasseværelsets hjørne — script.js (común a todas las páginas)
   ------------------------------------------------------------
   Solo tres cosas: el fondo animado, las partículas y la
   ordbog rápida. Nada de admin, nada de tablón, nada que
   dependa de que la profesora rellene algo antes de clase.
   ============================================================ */
(function(){
'use strict';

function $(id){ return document.getElementById(id); }

/* ── FONDO FLUIDO ───────────────────────────────────────── */
(function initFluid(){
  var canvas = $('fluid-bg');
  if(!canvas) return;
  var ctx = canvas.getContext('2d');
  var mobile = navigator.maxTouchPoints > 0;
  var N = mobile ? 6 : 11;
  var W, H, blobs = [];
  function resize(){ W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize(); window.addEventListener('resize', resize);
  var COLORS = ['hsl(210,80%,35%)','hsl(220,70%,28%)','hsl(195,85%,30%)','hsl(240,60%,30%)','hsl(180,70%,22%)','hsl(260,50%,28%)'];
  for(var i=0;i<N;i++){
    blobs.push({
      x:Math.random()*innerWidth, y:Math.random()*innerHeight,
      r:120+Math.random()*220,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      ax:Math.random()*Math.PI*2, ay:Math.random()*Math.PI*2,
      ax2:Math.random()*.003+.0015, ay2:Math.random()*.003+.0015,
      color:COLORS[i%COLORS.length]
    });
  }
  function loop(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#0a0f1e'; ctx.fillRect(0,0,W,H);
    ctx.save();
    blobs.forEach(function(b){
      b.ax += b.ax2; b.ay += b.ay2;
      b.x += Math.sin(b.ax)*b.vx*60; b.y += Math.cos(b.ay)*b.vy*60;
      if(b.x < -b.r) b.x = W+b.r; if(b.x > W+b.r) b.x = -b.r;
      if(b.y < -b.r) b.y = H+b.r; if(b.y > H+b.r) b.y = -b.r;
      ctx.save();
      ctx.translate(b.x,b.y);
      var g = ctx.createRadialGradient(0,0,0,0,0,b.r);
      g.addColorStop(0, b.color.replace('hsl','hsla').replace(')',',0.55)'));
      g.addColorStop(1,'transparent');
      ctx.globalCompositeOperation = 'screen';
      ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();
      ctx.restore();
    });
    ctx.restore();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ── PARTÍCULAS ─────────────────────────────────────────── */
(function initParticles(){
  var colors = ['rgba(94,234,212,.35)','rgba(129,140,248,.3)','rgba(244,114,182,.25)'];
  for(var i=0;i<10;i++){
    var p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random()*100+'%';
    p.style.bottom = '-10px';
    p.style.width = (2+Math.random()*3)+'px';
    p.style.height = p.style.width;
    p.style.background = colors[i%colors.length];
    p.style.animationDuration = (8+Math.random()*12)+'s';
    p.style.animationDelay = (Math.random()*10)+'s';
    document.body.appendChild(p);
  }
})();

/* ── INCLINACIÓN DE LAS TARJETAS ────────────────────────── */
(function initCardTilt(){
  document.querySelectorAll('.menu-card').forEach(function(card){
    card.addEventListener('mousemove', function(e){
      var r = card.getBoundingClientRect();
      var x = (e.clientX-r.left)/r.width-.5;
      var y = (e.clientY-r.top)/r.height-.5;
      var inner = card.querySelector('.card-inner');
      if(inner) inner.style.transform = 'perspective(600px) rotateY('+(x*6)+'deg) rotateX('+(-y*6)+'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', function(){
      var inner = card.querySelector('.card-inner');
      if(inner) inner.style.transform = '';
    });
  });
})();

/* ── TRADUCTOR ──────────────────────────────────────────────
   1º mira el diccionario local (las palabras de los temas que
      el alumno ya ha abierto) → instantáneo y sin internet
   2º si no está, prueba MyMemory → si falla, lo dice y ya
   ────────────────────────────────────────────────────────── */
var CACHE = {};
function localDict(){
  try{ return JSON.parse(localStorage.getItem('dict')||'{}'); }catch(e){ return {}; }
}
async function translate(text, langpair){
  var key = text.toLowerCase().trim();
  if(!key) return '';
  var d = localDict();
  if(langpair === 'es|da' && d[key]) return d[key];
  if(langpair === 'da|es'){
    for(var k in d){ if(d[k].toLowerCase() === key) return k; }
  }
  var ck = key+'|'+langpair;
  if(CACHE[ck]) return CACHE[ck];
  var url = 'https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+langpair;
  var r = await fetch(url);
  var j = await r.json();
  var t = (j.responseData && j.responseData.translatedText) || null;
  if(!t) throw new Error('sin resultado');
  CACHE[ck] = t;
  return t;
}
window.myMemoryTranslate = function(text, langpair){
  return translate(text, langpair).catch(function(){ return text; });
};

function detectLang(text){
  return /[æøåÆØÅ]/.test(text) ||
    /\b(og|er|det|en|den|de|jeg|du|han|hun|vi|at|på|med|til|ikke|hvad|hvor)\b/i.test(text) ? 'da' : 'es';
}

/* ── ORDBOG RÁPIDA ──────────────────────────────────────── */
(function initQuickDict(){
  var fab    = $('quick-dict-fab');
  var modal  = $('quick-dict-modal');
  var closeB = $('qd-close');
  var input  = $('qd-input');
  var result = $('qd-result');
  var opener = $('open-dict');
  if(!modal || !input) return;

  function open(){ modal.hidden = false; setTimeout(function(){ input.focus(); },100); }
  if(fab)    fab.addEventListener('click', open);
  if(opener) opener.addEventListener('click', open);
  if(closeB) closeB.addEventListener('click', function(){ modal.hidden = true; });
  modal.addEventListener('click', function(e){ if(e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') modal.hidden = true; });

  var timer;
  input.addEventListener('input', function(){
    clearTimeout(timer);
    var val = input.value.trim();
    if(!val){
      result.innerHTML = '<span style="color:var(--text-dim);font-size:.9rem">Skriv et ord for at se oversættelsen</span>';
      return;
    }
    result.innerHTML = '<span style="color:var(--text-dim);font-size:.9rem">Søger…</span>';
    timer = setTimeout(async function(){
      var lang = detectLang(val);
      var pair = lang === 'da' ? 'da|es' : 'es|da';
      try{
        var t = await translate(val, pair);
        result.innerHTML =
          '<div style="text-align:center;width:100%">'+
            '<p style="font-size:1.4rem;color:var(--glow);font-weight:600;margin-bottom:.25rem">'+t+'</p>'+
            '<p style="font-size:.85rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">'+val+'</p>'+
            (lang === 'es' ? '<button class="save-btn" id="qd-say" style="margin-top:.9rem;padding:.4rem .9rem;font-size:.8rem">🔊 Hør det</button>' : '')+
          '</div>';
        var sb = $('qd-say');
        if(sb) sb.addEventListener('click', function(){
          if(!window.speechSynthesis) return;
          var u = new SpeechSynthesisUtterance(val); u.lang = 'es-ES'; u.rate = .9;
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
        });
      }catch(err){
        result.innerHTML = '<span style="color:#fca5a5;font-size:.9rem">Ingen forbindelse. Ordet findes ikke i ugens ordliste.</span>';
      }
    },600);
  });
})();

})();
