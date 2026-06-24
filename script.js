/* ============================================================
   din klasseværelsets hjørne — script.js
   Faser: Fluidos · Router · Auth · Tablón · Fremlæggelse
          Ordbog (MyMemory) · Yderligere materiale
   ============================================================ */
(function(){
'use strict';

/* ── ESTADO GLOBAL ─────────────────────────────────────── */
const STATE = { admin:false, currentView:'home', titleClicks:0, titleTimer:null };
const HASH  = 'ec1fc759adf2c89257ef0de95bb2ab4ae41f3ec7b46b73a346597fccbf06b494';
const ADMIN_EMAIL='exploreandsports@gmail.com';

/* ── SUPABASE ──────────────────────────────────────────────── */
const SUPABASE_URL='https://akontludfisgxwlnayvs.supabase.co';
const SUPABASE_KEY='sb_publishable_qQ2lCD9UTN77IGsvNi6X5g_LXBeLTkq';
let _db=null;
function getDb(){
  if(!_db){
    // Single shared client (window._sbClient) — a second createClient with the
    // same storage key triggers GoTrueClient's "multiple instances" warning
    if(window._sbClient)_db=window._sbClient;
    else if(window.supabase)_db=window._sbClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  }
  return _db;
}
// Expuesto para que pinturillo.js (modo WiFi) reutilice el mismo cliente.
window.getDb=getDb;
async function dbGet(key){
  const db=getDb();
  if(!db)return localStorage.getItem(key);
  try{
    const{data,error}=await db.from('config_clase').select('value').eq('key',key).maybeSingle();
    if(error){console.warn('[dbGet] Error leyendo "'+key+'":', error.message);return localStorage.getItem(key);}
    if(!data)return localStorage.getItem(key);
    localStorage.setItem(key,data.value);
    return data.value;
  }catch{return localStorage.getItem(key);}
}
async function dbSet(key,value){
  localStorage.setItem(key,value);
  const db=getDb();
  if(!db)return true;
  try{
    // upsert requires UNIQUE constraint on key (see scratch/supabase_setup.sql)
    const{error:upsertErr}=await db.from('config_clase').upsert({key,value},{onConflict:'key'});
    if(!upsertErr)return true;
    // fallback: try UPDATE then INSERT (for tables without UNIQUE constraint)
    const{data:updated,error:upErr}=await db.from('config_clase').update({value}).eq('key',key).select('id');
    if(!upErr&&updated&&updated.length>0)return true;
    const{error:insErr}=await db.from('config_clase').insert({key,value});
    if(insErr){console.warn('[dbSet] Error guardando "'+key+'":', insErr.message);return false;}
    return true;
  }catch(e){console.warn('[dbSet] Error inesperado:', e);return false;}
}
function formatDateKey(d){
  return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}
function prevOrCurrentWednesday(d){
  const day=d.getDay(); // 0=Dom … 3=Mié
  const diff=(day>=3)?(day-3):(day+4);
  const w=new Date(d);w.setDate(d.getDate()-diff);return w;
}
/* ── TEMARIO ───────────────────────────────────────────────── */
function updateTemarioCard(url){
  const card  = document.getElementById('card-temario');
  const badge = document.getElementById('temario-badge');
  if(!card) return;
  if(url){
    card.classList.remove('temario-no-url');
    if(badge){ badge.textContent='TILGÆNGELIG'; badge.classList.add('badge-ok'); }
  } else {
    card.classList.add('temario-no-url');
    if(badge){ badge.textContent='SNART KLAR'; badge.classList.remove('badge-ok'); }
  }
}
function initTemario(){
  updateTemarioCard(localStorage.getItem('temario_url'));
  const card = document.getElementById('card-temario');
  if(!card) return;
  card.addEventListener('click',()=>{
    const url = localStorage.getItem('temario_url');
    if(url) window.open(url,'_blank','noopener,noreferrer');
  });
}

async function syncFromCloud(){
  const today=new Date();
  const todayKey=formatDateKey(today);
  const wedKey=formatDateKey(prevOrCurrentWednesday(today));

  // Carga el tablón activo (persiste entre días hasta que se publique uno nuevo)
  const activoRaw=await dbGet('tablon_activo');
  if(activoRaw){
    localStorage.setItem('tablon_activo',activoRaw);
    try{
      const activo=JSON.parse(activoRaw);
      const legacyText=(activo.cards||[]).map(c=>c.cuerpo||'').join('\n');
      localStorage.setItem('tablon',legacyText);
      if(activo.vocab)localStorage.setItem('vocab',JSON.stringify(activo.vocab));
    }catch{}
  }
  // Carga la sesión de hoy → principalmente presentaciones del día
  const todayRaw=await dbGet('sesion_'+todayKey);
  let todaySession=null;
  if(todayRaw){try{todaySession=JSON.parse(todayRaw);}catch{}}
  if(todaySession){
    if(todaySession.presentaciones)localStorage.setItem('slides-list',JSON.stringify(todaySession.presentaciones));
    if(!activoRaw){
      if(todaySession.tablon!=null)localStorage.setItem('tablon',todaySession.tablon);
      if(todaySession.vocab)localStorage.setItem('vocab',JSON.stringify(todaySession.vocab));
    }
  } else {
    const sRaw=await dbGet('slides-list');
    if(sRaw)localStorage.setItem('slides-list',sRaw);
    if(!activoRaw){
      const tRaw=await dbGet('tablon');
      if(tRaw)localStorage.setItem('tablon',tRaw);
    }
  }

  // Vocab para flashcards desde sesión del miércoles — solo si no hay tablón activo
  // (el tablón activo tiene prioridad absoluta sobre el vocab para todos los ejercicios)
  if(todayKey!==wedKey && !activoRaw){
    const wedRaw=await dbGet('sesion_'+wedKey);
    if(wedRaw){
      try{const s=JSON.parse(wedRaw);if(s.vocab)localStorage.setItem('vocab',JSON.stringify(s.vocab));}catch{}
    }
  }

  // URL del temario (clave global, no por sesión).
  // Si Supabase devuelve '' (admin borró la URL), limpiamos también localStorage
  // para evitar mostrar un enlace stale en el siguiente renderizado.
  const temarioUrl=await dbGet('temario_url');
  if(temarioUrl) localStorage.setItem('temario_url',temarioUrl);
  else localStorage.removeItem('temario_url');
  updateTemarioCard(temarioUrl||null);
}

/* ── UTILIDADES ────────────────────────────────────────── */
async function sha256(msg) {
  if (window.crypto && window.crypto.subtle) {
    const buf=await window.crypto.subtle.digest('SHA-256',new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  // Fallback for file:// protocol
  function r(n,x){return(x>>>n)|(x<<(32-n))}
  function f(s){
    let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    let k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let m = [], l = s.length*8, i, j, w=[];
    s = unescape(encodeURIComponent(s));
    for(i=0; i<s.length; i++) m[i>>2] |= (s.charCodeAt(i)&0xff)<<(24-(i%4)*8);
    m[s.length>>2] |= 0x80<<(24-(s.length%4)*8);
    m[(((s.length+8)>>6)<<4)+15] = s.length*8;
    for(i=0; i<m.length; i+=16){
      let a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f_=h[5],g=h[6],_h=h[7];
      for(j=0; j<64; j++){
        if(j<16) w[j]=m[i+j]||0;
        else w[j]=(r(17,w[j-2])^r(19,w[j-2])^(w[j-2]>>>10)) + w[j-7] + (r(7,w[j-15])^r(18,w[j-15])^(w[j-15]>>>3)) + w[j-16];
        let t1 = _h + (r(6,e)^r(11,e)^r(25,e)) + ((e&f_)^(~e&g)) + k[j] + w[j];
        let t2 = (r(2,a)^r(13,a)^r(22,a)) + ((a&b)^(a&c)^(b&c));
        _h=g; g=f_; f_=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
      }
      h[0]=(h[0]+a)|0; h[1]=(h[1]+b)|0; h[2]=(h[2]+c)|0; h[3]=(h[3]+d)|0;
      h[4]=(h[4]+e)|0; h[5]=(h[5]+f_)|0; h[6]=(h[6]+g)|0; h[7]=(h[7]+_h)|0;
    }
    return h.map(x=>("00000000"+(x>>>0).toString(16)).slice(-8)).join('');
  }
  return f(msg);
}
function escapeHTML(str){
  if(!str)return'';
  return str.replace(/[&<>"']/g, function(m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#039;';
      default: return m;
    }
  });
}
function $(id){return document.getElementById(id);}
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}
function getVocab(){try{return JSON.parse(localStorage.getItem('vocab')||'[]');}catch{return[];}}
function parseVocabLine(line){
  const raw=line.slice(1).trim();
  const eqIdx=raw.indexOf('=');
  const es=eqIdx>-1?raw.slice(0,eqIdx).trim():raw;
  const dk=eqIdx>-1?raw.slice(eqIdx+1).trim():'';
  return{es,dk};
}
function parseVocab(text){
  return text.split('\n').map(l=>l.trim())
    .filter(l=>l.startsWith('-')&&l.length>1)
    .map(l=>parseVocabLine(l).es).filter(Boolean);
}
function detectGender(word){
  const w=word.toLowerCase().replace(/[^a-záéíóúñü]/g,'');
  const fem=['ión','dad','tad','umbre','sis','itis','triz'];
  const masc=['ama','ema','oma','eta'];
  if(masc.some(s=>w.endsWith(s)))return'masc';
  if(fem.some(s=>w.endsWith(s)))return'fem';
  if(w.endsWith('a'))return'fem';
  if(w.endsWith('o')||w.endsWith('or')||w.endsWith('ón'))return'masc';
  return'neu';
}
function makePlural(word){
  const w=word.toLowerCase();
  if(w.endsWith('z'))return word.slice(0,-1)+'ces';
  if(/[aeiouáéíóú]$/.test(w))return word+'s';
  if(w.endsWith('ión'))return word.slice(0,-3)+'iones';
  return word+'es';
}
function detectLang(text){
  return/[æøåÆØÅ]/.test(text)||
    /\b(og|er|det|en|den|de|jeg|du|han|hun|vi|de|at|på|med|til)\b/i.test(text)?'da':'es';
}

/* ── FLUID CANVAS ──────────────────────────────────────── */
(function initFluid(){
  const canvas=$('fluid-bg');
  const ctx=canvas.getContext('2d');
  const mobile=navigator.maxTouchPoints>0;
  const N=mobile?6:11;
  // En móvil pintamos a media resolución (los blobs son difusos, no se nota)
  // y a 30fps — el CSS estira el canvas al 100% del viewport.
  // En desktop se limita a ~60fps (en pantallas de 120/144Hz pintaba cada frame).
  const SCALE=mobile?.5:1;
  const FRAME_MS=mobile?32:15;
  const STEP=mobile?2:1; // a 30fps cada frame avanza el doble para mantener la velocidad visual
  let W,H,blobs=[];
  function resize(){W=canvas.width=Math.ceil(innerWidth*SCALE);H=canvas.height=Math.ceil(innerHeight*SCALE);}
  resize();window.addEventListener('resize',resize);
  const COLORS=['hsl(210,80%,35%)','hsl(220,70%,28%)','hsl(195,85%,30%)','hsl(240,60%,30%)','hsl(180,70%,22%)','hsl(260,50%,28%)'];
  // El gradiente de cada blob se rasteriza UNA vez a un sprite offscreen;
  // cada frame solo hace drawImage (mucho más barato que crear el gradiente).
  function makeSprite(color,r){
    const off=document.createElement('canvas');
    off.width=off.height=Math.ceil(r*2);
    const c=off.getContext('2d');
    const g=c.createRadialGradient(r,r,0,r,r,r);
    g.addColorStop(0,color.replace('hsl','hsla').replace(')',',0.55)'));
    g.addColorStop(1,'transparent');
    c.fillStyle=g;c.fillRect(0,0,off.width,off.height);
    return off;
  }
  for(let i=0;i<N;i++){
    const r=(120+Math.random()*220)*SCALE;
    const color=COLORS[i%COLORS.length];
    blobs.push({
      x:Math.random()*W,y:Math.random()*H,
      r,sprite:makeSprite(color,r),
      vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,
      ax:Math.random()*Math.PI*2,ay:Math.random()*Math.PI*2,
      ax2:Math.random()*.003+.0015,ay2:Math.random()*.003+.0015,
      stretchX:1,stretchY:1
    });
  }
  let stretchTarget=null,stretchT=0,stretchDur=0;
  function stretchToward(tx,ty,dur){stretchTarget={tx:tx*SCALE,ty:ty*SCALE};stretchT=0;stretchDur=dur;}
  window._fluidStretch=stretchToward;
  let lastPaint=0;
  function idle(){
    // En tema claro, con la pestaña oculta o dentro del juego no se ve el
    // canvas: en vez de un rAF a 60fps, re-chequeamos cada 400ms.
    return document.documentElement.dataset.theme==='light'
      ||document.hidden
      ||document.body.classList.contains('spil-active');
  }
  function loop(t){
    if(idle()){setTimeout(()=>requestAnimationFrame(loop),400);return;}
    if(t-lastPaint<FRAME_MS){requestAnimationFrame(loop);return;}
    lastPaint=t;
    ctx.fillStyle='#0a0f1e';ctx.fillRect(0,0,W,H);
    if(stretchTarget){
      stretchT+=(FRAME_MS||16);
      const p=Math.min(stretchT/stretchDur,1);
      const ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
      blobs.forEach(b=>{
        const dx=stretchTarget.tx-b.x,dy=stretchTarget.ty-b.y;
        const dist=Math.sqrt(dx*dx+dy*dy)||1;
        const pull=ease*(1-Math.min(dist/W,1))*.4;
        b.stretchX=1+(pull*(dx/dist));b.stretchY=1+(pull*(dy/dist));
      });
      if(p>=1)stretchTarget=null;
    } else {
      blobs.forEach(b=>{b.stretchX+=(1-b.stretchX)*.08;b.stretchY+=(1-b.stretchY)*.08;});
    }
    ctx.save();
    ctx.globalCompositeOperation='screen';
    blobs.forEach(b=>{
      b.ax+=b.ax2*STEP;b.ay+=b.ay2*STEP;
      b.x+=Math.sin(b.ax)*b.vx*60*SCALE*STEP;b.y+=Math.cos(b.ay)*b.vy*60*SCALE*STEP;
      if(b.x<-b.r)b.x=W+b.r;if(b.x>W+b.r)b.x=-b.r;
      if(b.y<-b.r)b.y=H+b.r;if(b.y>H+b.r)b.y=-b.r;
      ctx.save();
      ctx.translate(b.x,b.y);ctx.scale(b.stretchX,b.stretchY);
      ctx.drawImage(b.sprite,-b.r,-b.r);
      ctx.restore();
    });
    ctx.restore();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ── FLOATING PARTICLES ───────────────────────────────────── */
(function initParticles(){
  const colors=['rgba(94,234,212,.35)','rgba(129,140,248,.3)','rgba(244,114,182,.25)'];
  for(let i=0;i<12;i++){
    const p=document.createElement('div');
    p.className='particle';
    p.style.left=Math.random()*100+'%';
    p.style.bottom='-10px';
    p.style.width=(2+Math.random()*3)+'px';
    p.style.height=p.style.width;
    p.style.background=colors[i%colors.length];
    p.style.animationDuration=(8+Math.random()*12)+'s';
    p.style.animationDelay=(Math.random()*10)+'s';
    document.body.appendChild(p);
  }
})();

/* ── CARD TILT PARALLAX ───────────────────────────────────── */
(function initCardTilt(){
  document.querySelectorAll('.menu-card').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width-.5;
      const y=(e.clientY-r.top)/r.height-.5;
      const inner=card.querySelector('.card-inner');
      if(inner)inner.style.transform=`perspective(600px) rotateY(${x*6}deg) rotateX(${-y*6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave',()=>{
      const inner=card.querySelector('.card-inner');
      if(inner)inner.style.transform='';
    });
  });
})();

/* ── ROUTER ────────────────────────────────────────────── */
let _parallaxWake=()=>{};
function showView(name,fromCard){
  // Salir del juego si estábamos en él
  if(STATE.currentView==='spil' && name!=='spil'){
    document.body.classList.remove('spil-active');
    if(window.LinguaStrike) window.LinguaStrike.stop();
  }
  // Cerrar el juego Pinturillo (timer + canal Realtime) al salir de su vista
  if(STATE.currentView==='pinturillo' && name!=='pinturillo' && window.__pinturilloTeardown){
    window.__pinturilloTeardown();
  }
  // Cerrar el muro de mensajes (canal Realtime) al salir de Despedida
  if(STATE.currentView==='despedida' && name!=='despedida' && window.__despedidaTeardown){
    window.__despedidaTeardown();
  }
  _parallaxWake();
  const all=document.querySelectorAll('.view');
  all.forEach(v=>v.classList.remove('active'));
  const target=$(('view-'+name));
  if(!target)return;
  target.classList.add('active');
  STATE.currentView=name;
  $('back-btn').hidden=(name==='home');
  if(name!=='home')renderView(name);
}
function renderView(name){
  if(name==='tablon')renderTablon();
  if(name==='fremlaeggelse')renderFremlaeggelse();
  if(name==='ordbog')renderOrdbog();
  if(name==='yderligere')renderYderligere();
  if(name==='spil')renderSpil();
  if(name==='stile')renderStile();
  if(name==='pasapalabra'&&window.renderPasapalabra)window.renderPasapalabra();
  if(name==='pinturillo'&&window.renderPinturillo)window.renderPinturillo();
  if(name==='despedida'&&window.renderDespedida)window.renderDespedida();
}
// game.js (~126KB) solo se parsea cuando el alumno entra al juego,
// no en la carga inicial de la página.
let _gameJsPromise=null;
function loadGameScript(){
  if(window.LinguaStrike)return Promise.resolve();
  if(!_gameJsPromise){
    _gameJsPromise=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='game.js';
      s.onload=resolve;
      s.onerror=()=>{_gameJsPromise=null;reject(new Error('game.js no se pudo cargar'));};
      document.body.appendChild(s);
    });
  }
  return _gameJsPromise;
}
function renderSpil(){
  document.body.classList.add('spil-active');
  loadGameScript().then(()=>{
    // start() es async pero no necesitamos await aquí — el overlay START
    // se muestra y el render del canvas se inicializa solo.
    if(document.body.classList.contains('spil-active'))window.LinguaStrike.start();
  }).catch(()=>{
    console.warn('[hjørne] LinguaStrike no está cargado. ¿Se cargó game.js?');
  });
}

/* ── TRANSITIONS ───────────────────────────────────────── */
function transitionTo(viewName,cardEl){
  const ov=$('transition-overlay');
  if(cardEl&&window._fluidStretch){
    const r=cardEl.getBoundingClientRect();
    window._fluidStretch(r.left+r.width/2,r.top+r.height/2,700);
  }
  ov.classList.add('active');
  setTimeout(()=>{showView(viewName);},320);
  setTimeout(()=>{ov.classList.remove('active');},520);
}

/* ── AUTENTICACIÓN ADMIN ───────────────────────────────── */
/* ── THEME ──────────────────────────────────────────────────── */
function applyTheme(t){
  document.documentElement.dataset.theme=t==='light'?'light':'';
  const btn=document.getElementById('theme-toggle');
  if(btn){btn.textContent=t==='light'?'🌙':'☀️';}
}
function initTheme(){
  const saved=localStorage.getItem('theme')||'light';
  applyTheme(saved);
  document.getElementById('theme-toggle').addEventListener('click',()=>{
    const next=document.documentElement.dataset.theme==='light'?'dark':'light';
    applyTheme(next);
    localStorage.setItem('theme',next);
  });
}

function initAuth(){
  const title=$('title-trigger');
  const modal=$('admin-modal');
  const closeBtn=$('modal-close');
  const submitBtn=$('admin-submit-btn');
  const input=$('admin-password-input');
  const errEl=$('admin-error');
  const badge=$('admin-badge');
  const logoutBtn=$('admin-logout-btn');
  const directBtn=$('direct-admin-btn');
  if(directBtn){
    directBtn.addEventListener('click',()=>{
      if(!STATE.admin){modal.hidden=false;input.value='';errEl.textContent='';setTimeout(()=>input.focus(),100);}
    });
  }
  
  title.addEventListener('click',()=>{
    STATE.titleClicks++;
    clearTimeout(STATE.titleTimer);
    STATE.titleTimer=setTimeout(()=>{STATE.titleClicks=0;},800);
    if(STATE.titleClicks>=3){STATE.titleClicks=0;if(!STATE.admin){modal.hidden=false;input.value='';errEl.textContent='';setTimeout(()=>input.focus(),100);}}
  });
  closeBtn.addEventListener('click',()=>{modal.hidden=true;});
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
  async function doLogin(){
    try {
      const h=await sha256(input.value.trim());
      if(h===HASH){
        const db=getDb();
        if(db) await db.auth.signInWithPassword({email:ADMIN_EMAIL,password:input.value.trim()}).catch(()=>{});
        STATE.admin=true;modal.hidden=true;badge.hidden=false;
        if(STATE.currentView!=='home')renderView(STATE.currentView);
      }
      else{errEl.textContent='Forkert adgangskode. Prøv igen.';input.value='';input.focus();}
    } catch (err) {
      errEl.textContent='Fejl under login. Prøv igen.';
    }
  }
  submitBtn.addEventListener('click',doLogin);
  input.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  logoutBtn.addEventListener('click',()=>{
    STATE.admin=false;badge.hidden=true;
    const db=getDb();
    if(db) db.auth.signOut().catch(()=>{});
    if(STATE.currentView!=='home')renderView(STATE.currentView);
  });
  const panelBtn=$('admin-panel-btn');
  if(panelBtn)panelBtn.addEventListener('click',()=>{transitionTo('tablon');});
}

/* ── HURTIG ORDBOG (QUICK DICT) ───────────────────────── */
function initQuickDict(){
  const fab=$('quick-dict-fab');
  const modal=$('quick-dict-modal');
  const closeBtn=$('qd-close');
  const input=$('qd-input');
  const result=$('qd-result');
  
  if(!fab || !modal) return;
  
  fab.addEventListener('click',()=>{
    modal.hidden=false;
    setTimeout(()=>input.focus(),100);
  });
  
  closeBtn.addEventListener('click',()=>{modal.hidden=true;});
  modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
  
  let debounceTimer;
  input.addEventListener('input',()=>{
    clearTimeout(debounceTimer);
    const val=input.value.trim();
    if(!val){
      result.innerHTML='<span style="color:var(--text-dim);font-size:0.9rem">Skriv et ord for at se oversættelsen</span>';
      return;
    }
    result.innerHTML='<span style="color:var(--text-dim);font-size:0.9rem">Søger...</span>';
    debounceTimer=setTimeout(async()=>{
      try {
        const trans=await myMemoryTranslate(val,'es|da');
        result.innerHTML=`
          <div style="text-align:center;width:100%">
            <p style="font-size:1.4rem;color:var(--glow);font-weight:600;margin-bottom:0.25rem">${trans}</p>
            <p style="font-size:0.85rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">${val}</p>
          </div>
        `;
      } catch(e) {
        result.innerHTML='<span style="color:#ef4444;font-size:0.9rem">Kunne ikke oversætte. Prøv igen.</span>';
      }
    },600);
  });
}

/* ── TABLÓN ────────────────────────────────────────────── */
function getActivoTablon(){
  try{return JSON.parse(localStorage.getItem('tablon_activo')||'null');}catch{return null;}
}
function saveActivoLocal(data){
  localStorage.setItem('tablon_activo',JSON.stringify(data));
  const text=(data.cards||[]).map(c=>c.cuerpo||'').join('\n');
  localStorage.setItem('tablon',text);
  localStorage.setItem('vocab',JSON.stringify(data.vocab||[]));
}
function parseVocabFromCards(cards){
  const words=[];
  for(const c of(cards||[])){const p=parseVocab(c.cuerpo||'');words.push(...p);}
  return[...new Set(words)];
}
function formatDisplayDate(dateStr){
  try{
    const[y,m,d]=dateStr.split('-').map(Number);
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return`${d} de ${months[m-1]} de ${y}`;
  }catch{return dateStr;}
}
function todayISOStr(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function renderTablon(){
  const view=$('view-tablon');
  const activo=getActivoTablon();
  if(STATE.admin){renderTablonAdmin(view,activo);}
  else{renderTablonStudent(view,activo);}
}
// renderTablonAdmin is async — call fires and forgets intentionally

function renderCardBody(card){
  const lines=(card.cuerpo||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const textLines=lines.filter(l=>!l.startsWith('-'));
  const vocabLines=lines.filter(l=>l.startsWith('-'));
  let html='';
  if(textLines.length){
    html+=`<div class="tablon-text">${textLines.map(l=>`<p>${escapeHTML(l)}</p>`).join('')}</div>`;
  }
  if(vocabLines.length){
    const chips=vocabLines.map(l=>{
      const{es,dk}=parseVocabLine(l);
      return`<span class="vocab-chip" data-es="${escapeHTML(es)}" data-dk="${escapeHTML(dk)}" tabindex="0">${escapeHTML(es)}</span>`;
    }).join('');
    html+=`<div class="vocab-chips-wrap${textLines.length?' vocab-chips-wrap--gap':''}">${chips}</div>`;
  }
  return html;
}

function renderTablonStudent(view,activo){
  if(!activo||!(activo.cards||[]).length){
    view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">📋 Tablón</h2>
<p style="color:var(--text-dim);text-align:center;padding:2rem 0">Ingen lektion er tilgængelig endnu.</p>
</div>`;
    return;
  }
  // Newest card first — cards with ts sort by ts desc; legacy cards (no ts) fall to bottom
  const sorted=[...(activo.cards||[])].sort((a,b)=>(b.ts||0)-(a.ts||0));

  // Beautiful date header
  let dateHtml='';
  if(activo.fecha){
    try{
      const[y,m,d]=activo.fecha.split('-').map(Number);
      const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      dateHtml=`<div class="tablon-date-header">
  <div class="tdh-day">${d}</div>
  <div class="tdh-right">
    <span class="tdh-month">${months[m-1]} ${y}</span>
    <span class="tdh-label">Publicado</span>
  </div>
</div>`;
    }catch{}
  }

  const cardsHtml=sorted.map(card=>`
<div class="tablon-card">
  ${card.titulo?`<div class="tablon-card-title">${escapeHTML(card.titulo)}</div>`:''}
  ${renderCardBody(card)}
</div>`).join('');

  view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">📋 Tablón</h2>
${dateHtml}
${cardsHtml}
</div>`;
}

async function renderTablonAdmin(view,activo){
  const cards=activo?(activo.cards||[]).slice():[];
  const fecha=activo?(activo.fecha||todayISOStr()):todayISOStr();

  // Cargar datos necesarios en paralelo
  const todayKey=todayISOStr().replace(/-/g,'');
  const [sesionRaw, temarioUrl, stileItems] = await Promise.all([
    dbGet('sesion_'+todayKey),
    dbGet('temario_url'),
    getStileItems()
  ]);
  let presList=[];
  try{const s=JSON.parse(sesionRaw||'{}');presList=(s.presentaciones||[]).slice();}catch{}
  const stile=[...stileItems].sort((a,b)=>((b.created_at||'')>(a.created_at||'')?1:-1));

  /* ── helpers HTML ── */
  function cardsListHtml(){
    if(!cards.length)return'<p class="tablon-empty-hint">No hay tarjetas. Añade una arriba.</p>';
    return cards.map((c,i)=>`
<div class="tablon-admin-card">
  <div class="tablon-admin-card-header">
    <button class="frem-del tablon-card-del" data-idx="${i}" style="margin-left:auto">🗑️</button>
  </div>
  <div class="tablon-admin-card-body">${renderCardBody(c)}</div>
</div>`).join('');
  }
  function presListHtml(){
    if(!presList.length)return'<p class="tablon-empty-hint">Sin presentaciones para hoy.</p>';
    return presList.map((p,i)=>`
<div class="frem-admin-row">
  <span style="font-size:.85rem;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(p.name)}</span>
  <span style="font-size:.75rem;color:var(--text-dim);flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 .5rem">${escapeHTML(p.url)}</span>
  <button class="frem-del pres-del" data-i="${i}">🗑️</button>
</div>`).join('');
  }
  function stileListHtml(){
    if(!stile.length)return'<p class="tablon-empty-hint">Sin redacciones todavía.</p>';
    return stile.map(r=>`
<div class="frem-admin-row">
  <span style="font-size:.85rem;color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(r.titulo)}</span>
  <span style="font-size:.75rem;color:var(--text-dim);flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 .5rem">${escapeHTML(r.imagen_url)}</span>
  <button class="frem-del stile-del" data-id="${escapeHTML(r.id)}">🗑️</button>
</div>`).join('');
  }

  const activeBadge=activo
    ?`<div class="tablon-active-badge">📌 Tablón activo: <strong>${formatDisplayDate(fecha)}</strong></div>`
    :`<div class="tablon-active-badge tablon-active-badge--none">⚠️ No hay tablón publicado aún</div>`;

  const divider=`<hr style="border:none;border-top:1px solid rgba(255,255,255,.07);margin:2rem 0"/>`;

  view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">🗂️ Administrador</h2>

<!-- ── TABLÓN ── -->
<h3 class="tablon-section-label" style="font-size:1rem;margin-bottom:.5rem">📋 Tablón semanal</h3>
${activeBadge}
<div class="tablon-add-form">
  <textarea class="tablon-textarea tablon-textarea--bordered" id="tablon-card-cuerpo" placeholder="Escribe aquí el contenido de la tarjeta.&#10;Añade vocabulario con un guión:&#10;-rojo&#10;-la ropa&#10;-hablar"></textarea>
  <button class="save-btn" id="tablon-card-add">＋ Añadir tarjeta</button>
</div>
<div id="tablon-cards-list" style="margin-bottom:1rem">${cardsListHtml()}</div>
<div class="tablon-publish-wrap">
  <button class="btn-primary" id="tablon-publish">🚀 Publicar tablón</button>
  <p class="tablon-hint">Al publicar: se guarda en la nube, archiva el anterior y actualiza todos los ejercicios con el nuevo vocabulario.</p>
</div>

${divider}

<!-- ── PRESENTACIONES ── -->
<h3 class="tablon-section-label" style="font-size:1rem;margin-bottom:.75rem">🎞️ Presentaciones de hoy</h3>
<div id="pres-list" style="margin-bottom:.75rem">${presListHtml()}</div>
<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.75rem">
  <input id="pres-name" class="slides-input" placeholder="Nombre del alumno…" style="flex:1;min-width:130px"/>
  <input id="pres-url"  class="slides-input" placeholder="URL de Google Slides…" style="flex:2;min-width:170px"/>
  <button id="pres-add" class="save-btn" style="margin:0;white-space:nowrap">＋ Añadir</button>
</div>
<button class="btn-primary" id="pres-save" style="margin-bottom:.25rem">💾 Guardar presentaciones</button>
<p id="pres-status" style="font-size:.8rem;color:var(--text-dim);min-height:1.2rem;margin-bottom:.5rem"></p>

${divider}

<!-- ── TEMARIO ── -->
<h3 class="tablon-section-label" style="font-size:1rem;margin-bottom:.75rem">📚 Temario (URL global)</h3>
<div style="display:flex;gap:.5rem;margin-bottom:.25rem">
  <input id="temario-url-input" class="slides-input" placeholder="https://docs.google.com/document/d/…" style="flex:1" value="${escapeHTML(temarioUrl||'')}"/>
  <button id="temario-save" class="save-btn" style="margin:0;white-space:nowrap">💾 Guardar</button>
</div>
<p id="temario-status" style="font-size:.8rem;color:var(--text-dim);min-height:1.2rem;margin-bottom:.5rem"></p>

${divider}

<!-- ── STILE ── -->
<h3 class="tablon-section-label" style="font-size:1rem;margin-bottom:.75rem">✍️ Stile — Redacciones</h3>
<div id="stile-admin-list" style="margin-bottom:.75rem">${stileListHtml()}</div>
<div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.25rem">
  <input id="stile-titulo" class="slides-input" placeholder="Título de la redacción…" style="flex:1;min-width:140px"/>
  <input id="stile-url"    class="slides-input" placeholder="URL del documento…" style="flex:2;min-width:170px"/>
  <button id="stile-add" class="save-btn" style="margin:0;white-space:nowrap">＋ Añadir</button>
</div>
<p id="stile-status" style="font-size:.8rem;color:var(--text-dim);min-height:1.2rem"></p>

</div>`;

  /* ── TABLÓN events ── */
  function rebindDelete(){
    view.querySelectorAll('.tablon-card-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        cards.splice(+btn.dataset.idx,1);
        document.getElementById('tablon-cards-list').innerHTML=cardsListHtml();
        rebindDelete();
      });
    });
  }
  rebindDelete();

  document.getElementById('tablon-card-add').addEventListener('click',()=>{
    const cuerpo=document.getElementById('tablon-card-cuerpo').value.trim();
    if(!cuerpo)return;
    const firstTextLine=cuerpo.split('\n').map(l=>l.trim()).find(l=>l&&!l.startsWith('-'))||'';
    const titulo=firstTextLine||'Tarjeta';
    cards.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2),titulo,cuerpo,ts:Date.now()});
    document.getElementById('tablon-card-cuerpo').value='';
    document.getElementById('tablon-cards-list').innerHTML=cardsListHtml();
    rebindDelete();
  });

  document.getElementById('tablon-publish').addEventListener('click',async()=>{
    if(!cards.length){
      const btn=document.getElementById('tablon-publish');
      btn.textContent='⚠️ Añade al menos una tarjeta';
      setTimeout(()=>{btn.textContent='🚀 Publicar tablón';},2200);
      return;
    }
    const btn=document.getElementById('tablon-publish');
    btn.disabled=true;btn.textContent='⏳ Publicando…';

    const vocab=parseVocabFromCards(cards);
    const newTablon={fecha:todayISOStr(),cards:cards.slice(),vocab,publicadoEn:new Date().toISOString()};

    const prevActivo=getActivoTablon();
    if(prevActivo){
      let historial=[];
      try{const h=await dbGet('tablon_historial');historial=JSON.parse(h||'[]');}catch{}
      historial.unshift(prevActivo);
      if(historial.length>30)historial=historial.slice(0,30);
      await dbSet('tablon_historial',JSON.stringify(historial));
    }

    const savedOk=await dbSet('tablon_activo',JSON.stringify(newTablon));
    saveActivoLocal(newTablon);

    let verifiedInCloud=false;
    if(savedOk){
      try{
        const db=getDb();
        if(db){
          const{data}=await db.from('config_clase').select('value').eq('key','tablon_activo').maybeSingle();
          verifiedInCloud=!!(data&&data.value);
        }
      }catch{}
    }

    btn.disabled=false;
    if(verifiedInCloud){
      btn.textContent='✅ Publicado en la nube';
    }else if(savedOk){
      btn.textContent='⚠️ Sin confirmar nube — comprueba en otro dispositivo';
      btn.style.background='var(--warn,#e67e22)';
      setTimeout(()=>{btn.style.background='';btn.textContent='🚀 Publicar tablón';},6000);
    }else{
      btn.textContent='❌ Error — intentar de nuevo';
      btn.style.background='#c0392b';
      setTimeout(()=>{btn.style.background='';btn.textContent='🚀 Publicar tablón';},6000);
    }
    if(verifiedInCloud)setTimeout(()=>{renderTablon();},1600);
  });

  /* ── PRESENTACIONES events ── */
  function rebindPresDel(){
    view.querySelectorAll('.pres-del').forEach(btn=>{
      btn.addEventListener('click',()=>{
        presList.splice(+btn.dataset.i,1);
        document.getElementById('pres-list').innerHTML=presListHtml();
        rebindPresDel();
      });
    });
  }
  rebindPresDel();

  document.getElementById('pres-add').addEventListener('click',()=>{
    const name=document.getElementById('pres-name').value.trim();
    const url=document.getElementById('pres-url').value.trim();
    if(!name||!url)return;
    presList.push({name,url});
    document.getElementById('pres-name').value='';
    document.getElementById('pres-url').value='';
    document.getElementById('pres-list').innerHTML=presListHtml();
    rebindPresDel();
  });

  document.getElementById('pres-save').addEventListener('click',async()=>{
    const st=document.getElementById('pres-status');
    st.style.color='var(--text-dim)';st.textContent='Guardando…';
    let sesion={};
    try{const r=await dbGet('sesion_'+todayKey);if(r)sesion=JSON.parse(r);}catch{}
    sesion.presentaciones=presList;
    const ok=await dbSet('sesion_'+todayKey,JSON.stringify(sesion));
    localStorage.setItem('slides-list',JSON.stringify(presList));
    st.style.color=ok?'#4ade80':'#fca5a5';
    st.textContent=ok?'✅ Guardadas en la nube':'❌ Error al guardar';
    setTimeout(()=>{st.textContent='';},3000);
  });

  /* ── TEMARIO events ── */
  document.getElementById('temario-save').addEventListener('click',async()=>{
    const url=document.getElementById('temario-url-input').value.trim();
    const st=document.getElementById('temario-status');
    st.style.color='var(--text-dim)';st.textContent='Guardando…';
    const ok=await dbSet('temario_url',url);
    if(url)localStorage.setItem('temario_url',url);
    else localStorage.removeItem('temario_url');
    updateTemarioCard(url||null);
    st.style.color=ok?'#4ade80':'#fca5a5';
    st.textContent=ok?'✅ Guardado':'❌ Error al guardar';
    setTimeout(()=>{st.textContent='';},3000);
  });

  /* ── STILE events ── */
  function rebindStileDel(){
    view.querySelectorAll('.stile-del').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const st=document.getElementById('stile-status');
        st.style.color='var(--text-dim)';st.textContent='Eliminando…';
        const all=await getStileItems();
        await saveStileItems(all.filter(x=>x.id!==btn.dataset.id));
        const updated=await getStileItems();
        stile.length=0;updated.sort((a,b)=>((b.created_at||'')>(a.created_at||'')?1:-1)).forEach(x=>stile.push(x));
        document.getElementById('stile-admin-list').innerHTML=stileListHtml();
        rebindStileDel();
        st.textContent='';
      });
    });
  }
  rebindStileDel();

  document.getElementById('stile-add').addEventListener('click',async()=>{
    const titulo=document.getElementById('stile-titulo').value.trim();
    const imagen_url=document.getElementById('stile-url').value.trim();
    const st=document.getElementById('stile-status');
    if(!titulo||!imagen_url){st.style.color='#fca5a5';st.textContent='Rellena título y URL.';setTimeout(()=>{st.textContent='';},2500);return;}
    st.style.color='var(--text-dim)';st.textContent='Guardando…';
    const all=await getStileItems();
    all.unshift({id:Date.now().toString(),titulo,imagen_url,created_at:new Date().toISOString()});
    await saveStileItems(all);
    document.getElementById('stile-titulo').value='';
    document.getElementById('stile-url').value='';
    const updated=await getStileItems();
    stile.length=0;updated.sort((a,b)=>((b.created_at||'')>(a.created_at||'')?1:-1)).forEach(x=>stile.push(x));
    document.getElementById('stile-admin-list').innerHTML=stileListHtml();
    rebindStileDel();
    st.style.color='#4ade80';st.textContent='✅ Añadida.';
    setTimeout(()=>{st.textContent='';},2500);
  });
}

/* ── LIGNENDE ORD — DATA ───────────────────────────────── */
const SPROGBRO_LANGS=[
  {id:'ar',flag:'🇸🇦',colLabel:'🇸🇦 Arabisk',title:'Arabisk → Dansk',
   grad:'linear-gradient(135deg,#064E3B,#065F46,#047857)',
   accent:'#16A34A',accdark:'#15803D',
   cardColor:'rgba(4,120,87,.28)',cardGlow:'rgba(5,150,105,.35)',
   pills:['قهوة → kaffe','سكر → sukker','الجبر → algebra','زرافة → giraf'],
   cardDesc:'Arabisk har givet dansk over 1.000 ord — fra <em>kaffe og sukker</em> til <em>algebra og alkohol</em>.',
   funFact:'Arabisk er et af de vigtigste sprog i verdenshistorien. Araberne var mestre inden for <strong>matematik, astronomi, medicin og handel</strong>. De gav Europa ord som <em>algebra, algoritme, kaffe og sukker</em>. ☕🧮',
   motto:'"Arabisk er ikke et fremmed sprog — det er en del af det dansk, du allerede taler!" 🌟',
   searchPH:'Søg på dansk eller translitteration...',
   hasBadge:true,isRTL:true,
   sections:[
    {ic:'🍽️',ti:'Arabisk i dit køkken',su:'Disse ord gav araberne til resten af verden!',ra:'1–10',
     ws:[{o:'قهوة',t:'qahwa',d:'kaffe',s:'vs'},{o:'سكر',t:'sukkar',d:'sukker',s:'vs'},{o:'شراب',t:'sharāb',d:'sirup',s:'si'},{o:'إسفناخ',t:'isfanākh',d:'spinat',s:'si'},{o:'زعفران',t:"za'farān",d:'safran',s:'si'},{o:'نارنج',t:'nāranj',d:'appelsin',s:'si'},{o:'ليمون',t:'laymūn',d:'citron',s:'si'},{o:'الخرشوف',t:'al-kharshūf',d:'artiskok',s:'si'},{o:'تمر هندي',t:'tamar hindī',d:'tamarind',s:'vs'},{o:'بادنجان',t:'bādhinjān',d:'aubergine',s:'si'}]},
    {ic:'🔬',ti:'Arabisk videnskab ændrede verden',su:'Arabiske lærde opfandt algebra, algoritmer og kemi!',ra:'11–20',
     ws:[{o:'الجبر',t:'al-jabr',d:'algebra',s:'si'},{o:'خوارزم',t:'al-Khwārazmī',d:'algoritme',s:'si'},{o:'الكيمياء',t:"al-kīmiyā'",d:'kemi',s:'si'},{o:'صفر',t:'sifr',d:'ciffer',s:'si'},{o:'صفر',t:'sifr',d:'nul',s:'si'},{o:'ناظر',t:'nādhir',d:'nadir',s:'vs'},{o:'السمت',t:'al-samt',d:'azimut',s:'si'},{o:'الإكسير',t:'al-iksīr',d:'elixir',s:'si'},{o:'القلي',t:'al-qaly',d:'alkali',s:'si'},{o:'المناخ',t:'al-manākh',d:'almanak',s:'si'}]},
    {ic:'🏪',ti:'Handel & Hverdagsliv',su:'Arabiske købmænd rejste hele verden rundt!',ra:'21–30',
     ws:[{o:'تعريفة',t:"ta'rīfah",d:'tarif',s:'si'},{o:'مخازن',t:'makhāzin',d:'magasin',s:'si'},{o:'قيراط',t:'qīrāt',d:'karat',s:'vs'},{o:'مطرح',t:'matrah',d:'madras',s:'si'},{o:'الكحل',t:'al-kuhl',d:'alkohol',s:'si'},{o:'أمير البحر',t:'amīr al-baḥr',d:'admiral',s:'si'},{o:'صفّة',t:'suffah',d:'sofa',s:'si'},{o:'ديوان',t:'dīwān',d:'divan',s:'vs'},{o:'طلسم',t:'tilasm',d:'talisman',s:'si'},{o:'الزهر',t:'az-zahr',d:'hazard',s:'si'}]},
    {ic:'🦒',ti:'Natur, Dyr & Planter',su:'Arabisk er fyldt med smukke ord til naturen!',ra:'31–40',
     ws:[{o:'زرافة',t:'zarāfah',d:'giraf',s:'si'},{o:'غزال',t:'ghazāl',d:'gazelle',s:'si'},{o:'ياسمين',t:'yāsamīn',d:'jasmin',s:'vs'},{o:'عنبر',t:'ʿanbar',d:'amber',s:'si'},{o:'قطن',t:'qutn',d:'bomuld',s:'si'},{o:'موميا',t:'mūmiyā',d:'mumie',s:'vs'},{o:'مسخرة',t:'maskhara',d:'maske',s:'si'},{o:'سفاري',t:'safārī',d:'safari',s:'id'},{o:'لك',t:'lakk',d:'lak',s:'vs'},{o:'طلق',t:'talq',d:'talk',s:'vs'}]},
    {ic:'📱',ti:'Teknologi',su:'Moderne arabisk bruger de samme globale ord som dansk!',ra:'41–50',
     ws:[{o:'إنترنت',t:'internet',d:'internet',s:'id'},{o:'راديو',t:'rādyō',d:'radio',s:'id'},{o:'تليفون',t:'tilifūn',d:'telefon',s:'id'},{o:'فيلم',t:'fīlm',d:'film',s:'id'},{o:'فيديو',t:'vīdyō',d:'video',s:'id'},{o:'كمبيوتر',t:'kombiyūtar',d:'computer',s:'vs'},{o:'تلفزيون',t:'tilifiziyōn',d:'tv/television',s:'si'},{o:'بودكاست',t:'bōdkāst',d:'podcast',s:'vs'},{o:'بلوج',t:'blōj',d:'blog',s:'vs'},{o:'ديجيتال',t:'dījitāl',d:'digital',s:'vs'}]},
    {ic:'🎵',ti:'Musik & Kultur',su:'Musik har ingen grænser — heller ikke i sproget!',ra:'51–60',
     ws:[{o:'موسيقى',t:'mūsīqā',d:'musik',s:'si'},{o:'بيانو',t:'byānō',d:'piano',s:'id'},{o:'روك',t:'rūk',d:'rock',s:'id'},{o:'بوب',t:'bōb',d:'pop',s:'id'},{o:'فستيفال',t:'fastīfāl',d:'festival',s:'vs'},{o:'ألبوم',t:'ālbūm',d:'album',s:'id'},{o:'أرتيست',t:'ārtīst',d:'artist',s:'id'},{o:'ريتم',t:'rītm',d:'rytme',s:'si'},{o:'ديسكو',t:'diskō',d:'disko',s:'id'},{o:'كونشيرتو',t:'kūnshirtō',d:'koncert',s:'si'}]},
    {ic:'⚽',ti:'Sport & Fritid',su:'Sport taler alle sprog — næsten ens overalt!',ra:'61–70',
     ws:[{o:'سبورت',t:'sbōrt',d:'sport',s:'id'},{o:'غولف',t:'ghōlf',d:'golf',s:'id'},{o:'تنس',t:'tans',d:'tenis',s:'id'},{o:'كلوب',t:'klūb',d:'klub',s:'id'},{o:'ريكورد',t:'rīkōrd',d:'rekord',s:'id'},{o:'أرينا',t:'arīnā',d:'arena',s:'id'},{o:'ماراثون',t:'mārāthōn',d:'maraton',s:'vs'},{o:'ستاديوم',t:'stādyūm',d:'stadion',s:'si'},{o:'فاينال',t:'fāynāl',d:'finale',s:'si'},{o:'ميدالية',t:'mīdālya',d:'medalje',s:'si'}]},
    {ic:'🍕',ti:'Mad & Drikke (moderne)',su:'Mad er international — og sproget er det også!',ra:'71–80',
     ws:[{o:'بيتزا',t:'bītzā',d:'pizza',s:'id'},{o:'باستا',t:'bāstā',d:'pasta',s:'id'},{o:'شوكولاتة',t:'shōkōlāta',d:'chokolade',s:'si'},{o:'يوغرت',t:'yōghurt',d:'yoghurt',s:'id'},{o:'تاكو',t:'tākō',d:'taco',s:'id'},{o:'بنانا',t:'banānā',d:'banan',s:'vs'},{o:'كاكاو',t:'kākāw',d:'kakao',s:'id'},{o:'ريستوران',t:'ristōrān',d:'restaurant',s:'vs'},{o:'كافيتيريا',t:'kāfitīryā',d:'cafeteria',s:'vs'},{o:'مينيو',t:'mīnyū',d:'menu',s:'id'}]},
    {ic:'📚',ti:'Skole & Uddannelse',su:'Alle disse skolefag har arabiske eller internationale rødder!',ra:'81–90',
     ws:[{o:'بيولوجيا',t:'biyōlōjyā',d:'biologi',s:'vs'},{o:'فيزياء',t:"fīzyā'",d:'fysik',s:'si'},{o:'جيوغرافيا',t:'jīōghrāfyā',d:'geografi',s:'si'},{o:'هيستوريا',t:'hīstōryā',d:'historie',s:'si'},{o:'فيلوسوفيا',t:'fīlōsōfyā',d:'filosofi',s:'si'},{o:'دبلوم',t:'diblōm',d:'diplom',s:'vs'},{o:'إكسامن',t:'iksāman',d:'eksamen',s:'si'},{o:'أطلس',t:'atlas',d:'atlas',s:'id'},{o:'دكتور',t:'duktūr',d:'doktor',s:'id'},{o:'برفسور',t:'burfasōr',d:'professor',s:'vs'}]},
    {ic:'🌍',ti:'Steder & Transport',su:'Arabiske rejsende opdagede verden — og sproget fulgte med!',ra:'91–100',
     ws:[{o:'هوتيل',t:'hūtayl',d:'hotel',s:'id'},{o:'بنك',t:'bank',d:'bank',s:'id'},{o:'ميترو',t:'mitrō',d:'metro',s:'id'},{o:'موتور',t:'mōtōr',d:'motor',s:'id'},{o:'سيستيم',t:'sistīm',d:'system',s:'vs'},{o:'بارك',t:'bārk',d:'park',s:'id'},{o:'أوشن',t:'ōshan',d:'ocean',s:'si'},{o:'بلانيت',t:'blānit',d:'planet',s:'si'},{o:'كليما',t:'klīmā',d:'klima',s:'vs'},{o:'تمبراتير',t:'tambarātīr',d:'temperatur',s:'si'}]},
   ]},
  {id:'pl',flag:'🇵🇱',colLabel:'🇵🇱 Polsk',title:'Polsk → Dansk',
   grad:'linear-gradient(135deg,#7F1D1D,#B91C1C,#DC2626)',
   accent:'#DC2626',accdark:'#B91C1C',
   cardColor:'rgba(185,28,28,.28)',cardGlow:'rgba(220,38,38,.35)',
   pills:['muzyka → musik','sport → sport','hotel → hotel','historia → historie'],
   cardDesc:'Polsk og dansk deler hundredvis af ord fra <em>latin, græsk og engelsk</em>. Tættere end du tror!',
   funFact:'Polsk og dansk deler masser af ord fra <strong>latin, græsk og engelsk</strong>. Det skyldes, at begge sprog har lånt internationalt ordforråd gennem århundreder. Polsk er faktisk meget tættere på dansk end de fleste tror! 🏰',
   motto:'"Polsk og dansk er ikke så forskellige som du tror — prøv selv!"',
   searchPH:'Søg på polsk eller dansk...',
   hasBadge:false,isRTL:false,
   sections:[
    {ic:'📱',ti:'Teknologi',su:'Disse ord er ens på polsk og dansk — fra engelsk!',ra:'1–10',
     ws:[{o:'internet',d:'internet'},{o:'radio',d:'radio'},{o:'telefon',d:'telefon'},{o:'film',d:'film'},{o:'foto',d:'foto'},{o:'wideo',d:'video'},{o:'blog',d:'blog'},{o:'podcast',d:'podcast'},{o:'komputer',d:'computer'},{o:'digital',d:'digital'}]},
    {ic:'🎵',ti:'Musik & Kultur',su:'Musik og kultur deles på tværs af alle grænser!',ra:'11–20',
     ws:[{o:'muzyka',d:'musik'},{o:'piano',d:'piano'},{o:'gitara',d:'guitar'},{o:'rock',d:'rock'},{o:'pop',d:'pop'},{o:'festiwal',d:'festival'},{o:'koncert',d:'koncert'},{o:'album',d:'album'},{o:'dyskoteka',d:'diskotek'},{o:'rytm',d:'rytme'}]},
    {ic:'⚽',ti:'Sport',su:'Sport-ord rejser fra sprog til sprog uden pas!',ra:'21–30',
     ws:[{o:'sport',d:'sport'},{o:'golf',d:'golf'},{o:'tenis',d:'tenis'},{o:'klub',d:'klub'},{o:'rekord',d:'rekord'},{o:'stadion',d:'stadion'},{o:'maraton',d:'maraton'},{o:'medal',d:'medalje'},{o:'finał',d:'finale'},{o:'arena',d:'arena'}]},
    {ic:'🍕',ti:'Mad & Drikke',su:'Lækker mad har altid de samme navne!',ra:'31–40',
     ws:[{o:'pizza',d:'pizza'},{o:'pasta',d:'pasta'},{o:'banan',d:'banan'},{o:'kakao',d:'kakao'},{o:'jogurt',d:'yoghurt'},{o:'restauracja',d:'restaurant'},{o:'menu',d:'menu'},{o:'czekolada',d:'chokolade'},{o:'taco',d:'taco'},{o:'cukier',d:'sukker'}]},
    {ic:'📚',ti:'Skole & Videnskab',su:'Alle skolefag stammer fra latin og græsk!',ra:'41–50',
     ws:[{o:'biologia',d:'biologi'},{o:'fizyka',d:'fysik'},{o:'matematyka',d:'matematik'},{o:'geografia',d:'geografi'},{o:'historia',d:'historie'},{o:'literatura',d:'litteratur'},{o:'filozofia',d:'filosofi'},{o:'dyplom',d:'diplom'},{o:'egzamin',d:'eksamen'},{o:'atlas',d:'atlas'}]},
    {ic:'🌍',ti:'Steder & Bygninger',su:'Steder hedder næsten det samme overalt i Europa!',ra:'51–60',
     ws:[{o:'hotel',d:'hotel'},{o:'bank',d:'bank'},{o:'teatr',d:'teater'},{o:'muzeum',d:'museum'},{o:'galeria',d:'galleri'},{o:'park',d:'park'},{o:'szpital',d:'hospital'},{o:'metro',d:'metro'},{o:'ocean',d:'ocean'},{o:'centrum',d:'centrum'}]},
    {ic:'👥',ti:'Mennesker & Jobs',su:'Jobnavne er internationale — ligesom jobmarkedet!',ra:'61–70',
     ws:[{o:'doktor',d:'doktor'},{o:'profesor',d:'professor'},{o:'pilot',d:'pilot'},{o:'detektyw',d:'detektiv'},{o:'turysta',d:'turist'},{o:'student',d:'student'},{o:'artysta',d:'artist'},{o:'atleta',d:'atlet'},{o:'policja',d:'politi'},{o:'prezydent',d:'præsident'}]},
    {ic:'✨',ti:'Adjektiver',su:'Beskriv verden på to sprog på én gang!',ra:'71–80',
     ws:[{o:'normalny',d:'normal'},{o:'fantastyczny',d:'fantastisk'},{o:'popularny',d:'populær'},{o:'specjalny',d:'speciel'},{o:'oryginalny',d:'original'},{o:'kulturalny',d:'kulturel'},{o:'centralny',d:'central'},{o:'naturalny',d:'naturlig'},{o:'tropikalny',d:'tropisk'},{o:'arktyczny',d:'arktisk'}]},
    {ic:'🌱',ti:'Natur',su:'Naturen taler et sprog alle forstår!',ra:'81–90',
     ws:[{o:'planeta',d:'planet'},{o:'klimat',d:'klima'},{o:'temperatura',d:'temperatur'},{o:'wulkan',d:'vulkan'},{o:'energia',d:'energi'},{o:'minerał',d:'mineral'},{o:'fossyl',d:'fossil'},{o:'atom',d:'atom'},{o:'elektryczny',d:'elektrisk'},{o:'solarny',d:'solær'}]},
    {ic:'🚗',ti:'Transport & Hverdagsliv',su:'Hverdagsord er de nemmeste at genkende!',ra:'91–100',
     ws:[{o:'motor',d:'motor'},{o:'system',d:'system'},{o:'kontakt',d:'kontakt'},{o:'plan',d:'plan'},{o:'test',d:'test'},{o:'projekt',d:'projekt'},{o:'program',d:'program'},{o:'kamera',d:'kamera'},{o:'parking',d:'parkering'},{o:'skuter',d:'scooter'}]},
   ]},
  {id:'ro',flag:'🇷🇴',colLabel:'🇷🇴 Rumænsk',title:'Rumænsk → Dansk',
   grad:'linear-gradient(135deg,#1E3A8A,#1D4ED8,#2563EB)',
   accent:'#2563EB',accdark:'#1D4ED8',
   cardColor:'rgba(29,78,216,.28)',cardGlow:'rgba(37,99,235,.35)',
   pills:['familie → familie','muzică → musik','doctor → doktor','vulcan → vulkan'],
   cardDesc:'Rumænsk er et <em>romansk sprog</em> — ligesom spansk! Det giver et kæmpe forspring i sprogtimerne. 🌟',
   funFact:'Rumænsk stammer direkte fra <strong>latin</strong> — ligesom spansk, italiensk og fransk. Rumænsktalende elever har et <strong>kæmpe forspring</strong> i spanskundervisningen! Ord som <em>familie, muzică, doctor</em> er næsten identiske på spansk og rumænsk. 🌟',
   motto:'"Rumænsk og spansk er søstersprog — begge fra latin. Det giver dig superkræfter i sprogtimerne!"',
   searchPH:'Søg på rumænsk eller dansk...',
   hasBadge:false,isRTL:false,
   sections:[
    {ic:'📱',ti:'Teknologi',su:'Rumænsk og dansk bruger de samme globale ord!',ra:'1–10',
     ws:[{o:'internet',d:'internet'},{o:'radio',d:'radio'},{o:'telefon',d:'telefon'},{o:'film',d:'film'},{o:'foto',d:'foto'},{o:'video',d:'video'},{o:'blog',d:'blog'},{o:'podcast',d:'podcast'},{o:'computer',d:'computer'},{o:'digital',d:'digital'}]},
    {ic:'🎵',ti:'Muzică & Cultură',su:'Rumænsk og spansk er søstersprog — begge fra latin!',ra:'11–20',
     ws:[{o:'muzică',d:'musik'},{o:'pian',d:'piano'},{o:'rock',d:'rock'},{o:'pop',d:'pop'},{o:'festival',d:'festival'},{o:'concert',d:'koncert'},{o:'album',d:'album'},{o:'discotecă',d:'diskotek'},{o:'ritm',d:'rytme'},{o:'artist',d:'artist'}]},
    {ic:'⚽',ti:'Sport',su:'Sport-ord er identiske i næsten alle sprog!',ra:'21–30',
     ws:[{o:'sport',d:'sport'},{o:'golf',d:'golf'},{o:'tenis',d:'tenis'},{o:'club',d:'klub'},{o:'record',d:'rekord'},{o:'stadion',d:'stadion'},{o:'maraton',d:'maraton'},{o:'medalie',d:'medalje'},{o:'finală',d:'finale'},{o:'arenă',d:'arena'}]},
    {ic:'🍕',ti:'Mâncare & Băutură',su:'Mad er international — og sproget er det samme!',ra:'31–40',
     ws:[{o:'pizza',d:'pizza'},{o:'pastă',d:'pasta'},{o:'banană',d:'banan'},{o:'cacao',d:'kakao'},{o:'iaurt',d:'yoghurt'},{o:'restaurant',d:'restaurant'},{o:'meniu',d:'menu'},{o:'ciocolată',d:'chokolade'},{o:'taco',d:'taco'},{o:'cafea',d:'kaffe'}]},
    {ic:'📚',ti:'Școală & Știință',su:'Latin-rødder giver rumænsk og dansk masser af fælles skolefag!',ra:'41–50',
     ws:[{o:'biologie',d:'biologi'},{o:'fizică',d:'fysik'},{o:'matematică',d:'matematik'},{o:'geografie',d:'geografi'},{o:'istorie',d:'historie'},{o:'literatură',d:'litteratur'},{o:'filozofie',d:'filosofi'},{o:'diplomă',d:'diplom'},{o:'examen',d:'eksamen'},{o:'atlas',d:'atlas'}]},
    {ic:'🌍',ti:'Locuri & Clădiri',su:'Steder hedder næsten det samme i alle latinske sprog!',ra:'51–60',
     ws:[{o:'hotel',d:'hotel'},{o:'bancă',d:'bank'},{o:'teatru',d:'teater'},{o:'muzeu',d:'museum'},{o:'galerie',d:'galleri'},{o:'parc',d:'park'},{o:'spital',d:'hospital'},{o:'metrou',d:'metro'},{o:'ocean',d:'ocean'},{o:'capitală',d:'kapital'}]},
    {ic:'👥',ti:'Oameni & Meserii',su:'Jobnavne er internationale overalt i Europa!',ra:'61–70',
     ws:[{o:'doctor',d:'doktor'},{o:'profesor',d:'professor'},{o:'pilot',d:'pilot'},{o:'detectiv',d:'detektiv'},{o:'turist',d:'turist'},{o:'student',d:'student'},{o:'artist',d:'artist'},{o:'atlet',d:'atlet'},{o:'poliție',d:'politi'},{o:'președinte',d:'præsident'}]},
    {ic:'✨',ti:'Adjective',su:'Rumænsk og dansk adjektiver ligner hinanden vildt meget!',ra:'71–80',
     ws:[{o:'normal',d:'normal'},{o:'fantastic',d:'fantastisk'},{o:'popular',d:'populær'},{o:'special',d:'speciel'},{o:'original',d:'original'},{o:'cultural',d:'kulturel'},{o:'central',d:'central'},{o:'natural',d:'naturlig'},{o:'tropical',d:'tropisk'},{o:'arctic',d:'arktisk'}]},
    {ic:'🌱',ti:'Natură',su:'Naturord stammer fra latin — fælles for rumænsk og dansk!',ra:'81–90',
     ws:[{o:'planetă',d:'planet'},{o:'climă',d:'klima'},{o:'temperatură',d:'temperatur'},{o:'vulcan',d:'vulkan'},{o:'energie',d:'energi'},{o:'mineral',d:'mineral'},{o:'fosil',d:'fossil'},{o:'atom',d:'atom'},{o:'electric',d:'elektrisk'},{o:'solar',d:'solær'}]},
    {ic:'🚗',ti:'Transport & Viața Cotidiană',su:'Hverdagsord er de nemmeste at genkende!',ra:'91–100',
     ws:[{o:'motor',d:'motor'},{o:'sistem',d:'system'},{o:'contact',d:'kontakt'},{o:'plan',d:'plan'},{o:'test',d:'test'},{o:'proiect',d:'projekt'},{o:'program',d:'program'},{o:'cameră',d:'kamera'},{o:'parcare',d:'parkering'},{o:'scooter',d:'scooter'}]},
   ]},
  {id:'es',flag:'🇪🇸',colLabel:'🇪🇸 Spansk',title:'Spansk → Dansk',
   grad:'linear-gradient(135deg,#0F172A,#1E293B,#0F3460)',
   accent:'#7C3AED',accdark:'#6D28D9',
   cardColor:'rgba(109,40,217,.28)',cardGlow:'rgba(124,58,237,.35)',
   pills:['internet → internet','hospital → hospital','música → musik','planet → planet'],
   cardDesc:'Spansk og dansk er ikke så forskellige som du tror — <em>100 ord</em> de deler. Det vil overraske dig! 🤩',
   funFact:'Spansk og dansk deler <strong>hundredvis af lignende ord</strong> takket være <strong>latin, græsk og engelsk</strong>. Disse ord kaldes <em>kognater</em>. At kende dem er din <strong>hemmelige superkraft</strong> til at lære spansk hurtigere! 🦸',
   motto:'"Sproget er en bro til nye verdener — og du har allerede bygget det halve!" 🌉',
   searchPH:'Søg et ord på spansk eller dansk...',
   hasBadge:true,isRTL:false,
   secColors:['#3B82F6','#8B5CF6','#10B981','#F59E0B','#EF4444','#14B8A6','#6366F1','#EC4899','#84CC16','#065F46'],
   sections:[
    {ic:'📱',ti:'Teknologi',su:'Ord vi bruger hver eneste dag 📲',ra:'1–10',
     ws:[{o:'internet',d:'internet',s:'id'},{o:'video',d:'video',s:'id'},{o:'radio',d:'radio',s:'id'},{o:'foto',d:'foto',s:'id'},{o:'blog',d:'blog',s:'id'},{o:'podcast',d:'podcast',s:'id'},{o:'digital',d:'digital',s:'id'},{o:'social',d:'social',s:'id'},{o:'cable',d:'kabel',s:'vs'},{o:'móvil',d:'mobil',s:'vs'}]},
    {ic:'🎵',ti:'Musik',su:'Spansk musik er overalt på Spotify! 🎧',ra:'11–20',
     ws:[{o:'guitarra',d:'guitar',s:'vs'},{o:'piano',d:'piano',s:'id'},{o:'rock',d:'rock',s:'id'},{o:'pop',d:'pop',s:'id'},{o:'disco',d:'disko',s:'vs'},{o:'festival',d:'festival',s:'id'},{o:'concierto',d:'koncert',s:'si'},{o:'álbum',d:'album',s:'vs'},{o:'artista',d:'artist',s:'vs'},{o:'ritmo',d:'rytme',s:'si'}]},
    {ic:'⚽',ti:'Sport',su:'Real Madrid eller FC København? 😄',ra:'21–30',
     ws:[{o:'golf',d:'golf',s:'id'},{o:'tenis',d:'tennis',s:'vs'},{o:'sport',d:'sport',s:'id'},{o:'club',d:'klub',s:'vs'},{o:'récord',d:'rekord',s:'vs'},{o:'final',d:'finale',s:'vs'},{o:'arena',d:'arena',s:'id'},{o:'maratón',d:'maraton',s:'vs'},{o:'campeón',d:'champion',s:'si'},{o:'olimpiada',d:'olympiade',s:'vs'}]},
    {ic:'🐾',ti:'Dyr',su:'Samme navne overalt i verden! 🌍',ra:'31–40',
     ws:[{o:'tigre',d:'tiger',s:'vs'},{o:'elefante',d:'elefant',s:'vs'},{o:'pingüino',d:'pingvin',s:'si'},{o:'cocodrilo',d:'krokodille',s:'si'},{o:'jaguar',d:'jaguar',s:'id'},{o:'panda',d:'panda',s:'id'},{o:'gorila',d:'gorilla',s:'vs'},{o:'camaleón',d:'kamæleon',s:'si'},{o:'canguro',d:'kænguru',s:'vs'},{o:'delfín',d:'delfin',s:'vs'}]},
    {ic:'🍕',ti:'Mad & Drikke',su:'Spansk mad er fantastisk — ¡muy rico! 😋',ra:'41–50',
     ws:[{o:'pizza',d:'pizza',s:'id'},{o:'pasta',d:'pasta',s:'id'},{o:'banana',d:'banan',s:'vs'},{o:'chocolate',d:'chokolade',s:'si'},{o:'café',d:'kaffe',s:'si'},{o:'yogur',d:'yoghurt',s:'vs'},{o:'taco',d:'taco',s:'id'},{o:'vitamina',d:'vitamin',s:'vs'},{o:'menú',d:'menu',s:'vs'},{o:'sopa',d:'suppe',s:'si'}]},
    {ic:'👥',ti:'Mennesker & Jobs',su:'Hvad vil du gerne være? 🌟',ra:'51–60',
     ws:[{o:'doctor',d:'doktor',s:'vs'},{o:'profesor',d:'professor',s:'vs'},{o:'director',d:'direktør',s:'si'},{o:'presidente',d:'præsident',s:'si'},{o:'turista',d:'turist',s:'vs'},{o:'estudiante',d:'student',s:'si'},{o:'policía',d:'politi',s:'si'},{o:'atleta',d:'atlet',s:'vs'},{o:'piloto',d:'pilot',s:'vs'},{o:'detective',d:'detektiv',s:'vs'}]},
    {ic:'🌍',ti:'Steder',su:'Fra Randers til Barcelona! ✈️',ra:'61–70',
     ws:[{o:'hotel',d:'hotel',s:'id'},{o:'restaurante',d:'restaurant',s:'vs'},{o:'hospital',d:'hospital',s:'id'},{o:'parque',d:'park',s:'si'},{o:'capital',d:'kapital',s:'vs'},{o:'océano',d:'ocean',s:'si'},{o:'teatro',d:'teater',s:'si'},{o:'museo',d:'museum',s:'vs'},{o:'galería',d:'galleri',s:'si'},{o:'plaza',d:'plads',s:'si'}]},
    {ic:'📚',ti:'Skole & Videnskab',su:'Spansk er faktisk et rigtig godt skolefag! 🎓',ra:'71–80',
     ws:[{o:'biología',d:'biologi',s:'vs'},{o:'física',d:'fysik',s:'si'},{o:'matemáticas',d:'matematik',s:'si'},{o:'geografía',d:'geografi',s:'vs'},{o:'historia',d:'historie',s:'vs'},{o:'literatura',d:'litteratur',s:'vs'},{o:'filosofía',d:'filosofi',s:'vs'},{o:'diploma',d:'diplom',s:'vs'},{o:'atlas',d:'atlas',s:'id'},{o:'examen',d:'eksamen',s:'vs'}]},
    {ic:'✨',ti:'Adjektiver',su:'Beskriv verden på to sprog på én gang! 🌈',ra:'81–90',
     ws:[{o:'normal',d:'normal',s:'id'},{o:'fantástico',d:'fantastisk',s:'vs'},{o:'perfecto',d:'perfekt',s:'vs'},{o:'moderno',d:'moderne',s:'vs'},{o:'popular',d:'populær',s:'vs'},{o:'especial',d:'speciel',s:'si'},{o:'original',d:'original',s:'id'},{o:'nacional',d:'national',s:'vs'},{o:'central',d:'central',s:'id'},{o:'cultural',d:'kulturel',s:'si'}]},
    {ic:'🌱',ti:'Natur & Planeten',su:'Planeten samler os alle! 🌍💚',ra:'91–100',
     ws:[{o:'planeta',d:'planet',s:'vs'},{o:'clima',d:'klima',s:'vs'},{o:'temperatura',d:'temperatur',s:'vs'},{o:'volcán',d:'vulkan',s:'si'},{o:'energía',d:'energi',s:'vs'},{o:'mineral',d:'mineral',s:'id'},{o:'ártico',d:'arktisk',s:'si'},{o:'tropical',d:'tropisk',s:'vs'},{o:'solar',d:'solær',s:'vs'},{o:'fósil',d:'fossil',s:'vs'}]},
   ]},
];

/* ── EMOJI MAP (Lignende Ord) ───────────────────────────── */
const SB_EMOJI={
  'kaffe':'☕','sukker':'🍬','sirup':'🍯','spinat':'🥬','safran':'🌿',
  'appelsin':'🍊','citron':'🍋','artiskok':'🥦','tamarind':'🍯','aubergine':'🍆',
  'algebra':'📐','algoritme':'🖥️','kemi':'🧪','ciffer':'🔢','nul':'0️⃣',
  'nadir':'🌑','azimut':'🧭','elixir':'✨','alkali':'🧪','almanak':'📅',
  'tarif':'💰','magasin':'🏪','karat':'💎','madras':'🛏️','alkohol':'🍶',
  'admiral':'⚓','sofa':'🛋️','divan':'🛋️','talisman':'🧿','hazard':'🎲',
  'giraf':'🦒','gazelle':'🦌','jasmin':'🌸','amber':'🟡','bomuld':'👕',
  'mumie':'🏺','maske':'🎭','safari':'🦁','lak':'💅','talk':'💬',
  'internet':'🌐','radio':'📻','telefon':'📞','film':'🎬','video':'📹',
  'computer':'💻','tv/television':'📺','podcast':'🎙️','blog':'✍️','digital':'💾',
  'foto':'📸','social':'📲','kabel':'🔌','mobil':'📱',
  'musik':'🎵','piano':'🎹','rock':'🎸','pop':'🎤','festival':'🎪',
  'album':'💿','artist':'🌟','rytme':'🥁','disko':'🪩','diskotek':'🪩',
  'koncert':'🎶','guitar':'🎸',
  'sport':'⚽','golf':'⛳','tenis':'🎾','tennis':'🎾','klub':'🏆',
  'rekord':'🏅','arena':'🏟️','maraton':'🏃','stadion':'🏟️','finale':'🥇',
  'medalje':'🥈','champion':'🏆','olympiade':'🥇',
  'hotel':'🏨','bank':'🏦','metro':'🚇','park':'🌳','ocean':'🌊',
  'teater':'🎭','museum':'🏛️','galleri':'🖼️','hospital':'🏥','centrum':'🏙️',
  'kapital':'🏙️','plads':'🏙️',
  'doktor':'🩺','professor':'🎓','pilot':'✈️','detektiv':'🕵️','turist':'🗺️',
  'student':'🎒','atlet':'🏃','politi':'👮','præsident':'🏛️','direktør':'💼',
  'biologi':'🔬','fysik':'⚛️','matematik':'➗','geografi':'🗺️','historie':'📜',
  'litteratur':'📚','filosofi':'🤔','diplom':'🎓','eksamen':'📝','atlas':'🗺️',
  'pizza':'🍕','pasta':'🍝','chokolade':'🍫','yoghurt':'🥛','taco':'🌮',
  'banan':'🍌','kakao':'☕','restaurant':'🍽️','cafeteria':'🍽️','menu':'📋',
  'vitamin':'💊','suppe':'🍲',
  'planet':'🌍','klima':'🌤️','temperatur':'🌡️','vulkan':'🌋','energi':'⚡',
  'mineral':'💎','fossil':'🦕','atom':'⚛️','elektrisk':'⚡','solær':'☀️',
  'arktisk':'🧊','tropisk':'🌴','naturlig':'🌿',
  'normal':'🙂','fantastisk':'🤩','populær':'🔥','speciel':'✨','original':'💎',
  'kulturel':'🎨','central':'📍','perfekt':'💯','moderne':'🆒','national':'🏳️',
  'motor':'🔧','system':'⚙️','kontakt':'📞','plan':'📋','test':'📝',
  'projekt':'💼','program':'💻','kamera':'📷','parkering':'🚗','scooter':'🛵',
  'tiger':'🐯','elefant':'🐘','pingvin':'🐧','krokodille':'🐊','jaguar':'🐆',
  'panda':'🐼','gorilla':'🦍','kamæleon':'🦎','kænguru':'🦘','delfin':'🐬',
};

/* ── LIGNENDE ORD — RENDER ──────────────────────────────── */
function renderFremlaeggelse(){
  function wEmoji(d){return SB_EMOJI[d.toLowerCase()]?SB_EMOJI[d.toLowerCase()]+' ':''}
  const view=$('view-fremlaeggelse');
  let activeLang=null;

  function simBadge(s){
    const map={id:['IDENTISK','sb-sim-id'],vs:['MEGET LIG.','sb-sim-vs'],si:['LIGNER','sb-sim-si']};
    const [label,cls]=map[s]||['',''];
    return s?`<span class="sb-sim ${cls}">${label}</span>`:'';
  }

  function buildWordRow(w,i,lang){
    const num=`<span class="sb-w-num">${i+1}</span>`;
    if(lang.isRTL){
      return `<div class="sb-word-row sb-wr-ar" data-key="${(w.t||'').toLowerCase()} ${w.d.toLowerCase()}">
        ${num}
        <div class="sb-ar-col"><div class="sb-ar-script" style="color:${lang.accent}">${w.o}</div><div class="sb-ar-trans">${w.t}</div></div>
        <div class="sb-ar-arrow">→</div>
        <span class="sb-w-dan">${escapeHTML(w.d)} ${simBadge(w.s)}</span>
      </div>`;
    }
    const origStyle=`color:${lang.accent}`;
    const key=`${w.o.toLowerCase()} ${w.d.toLowerCase()}`;
    const badge=lang.hasBadge?simBadge(w.s):'';
    return `<div class="sb-word-row" style="border-left-color:${lang.accent}20" data-key="${key}">
      ${num}
      <span class="sb-w-orig" style="${origStyle}">${escapeHTML(w.o)}</span>
      <span class="sb-w-dan">${escapeHTML(w.d)} ${badge}</span>
    </div>`;
  }

  function buildSection(sec,lang,secIdx){
    const hdrBg=lang.secColors?lang.secColors[secIdx%10]:(lang.accent);
    const arColHeader=lang.isRTL?`<span style="text-align:right">${lang.colLabel}</span>`:`<span>${lang.colLabel}</span>`;
    const colGrid=lang.isRTL?'34px 1.4fr 1fr':'34px 1fr 1fr';
    return `
<section class="sb-section" data-sec="${secIdx}">
  <div class="sb-sec-header" style="background:linear-gradient(135deg,${hdrBg},${hdrBg}cc)">
    <span class="sb-sec-icon">${sec.ic}</span>
    <div><div class="sb-sec-title">${sec.ti}</div><div class="sb-sec-sub">${sec.su}</div></div>
    <div class="sb-sec-nums">${sec.ra}</div>
  </div>
  <div class="sb-col-hdr" style="grid-template-columns:${colGrid}">
    <span>#</span>${arColHeader}<span>🇩🇰 Dansk</span>
  </div>
  <div class="sb-words-list">${sec.ws.map((w,wi)=>{
    const idx=(secIdx*10)+wi+1;
    if(lang.isRTL){
      return `<div class="sb-word-row sb-wr-ar" data-key="${(w.t||'').toLowerCase()} ${w.d.toLowerCase()}">
        <span class="sb-w-num">${idx}</span>
        <div class="sb-ar-col"><div class="sb-ar-script" style="color:${lang.accent}">${w.o}</div><div class="sb-ar-trans">${w.t}</div></div>
        <span class="sb-w-dan"><span class="sb-ar-sep">→</span>${wEmoji(w.d)}${escapeHTML(w.d)} ${simBadge(w.s)}</span>
      </div>`;
    }
    return `<div class="sb-word-row" style="border-left-color:${lang.accdark}" data-key="${w.o.toLowerCase()} ${w.d.toLowerCase()}">
      <span class="sb-w-num">${idx}</span>
      <span class="sb-w-orig" style="color:${lang.accent}">${escapeHTML(w.o)}</span>
      <span class="sb-w-dan">${wEmoji(w.d)}${escapeHTML(w.d)}${lang.hasBadge?' '+simBadge(w.s):''}</span>
    </div>`;
  }).join('')}</div>
</section>`;
  }

  function renderHub(){
    const hubDescs={
      ar:'Spansk lånte 4.000+ ord fra arabisk — dit sprog er en genvej! 🚀',
      pl:'Fælles ord fra latin og engelsk — ligner mere end du tror!',
      ro:'Begge romanske sprog fra latin — mega nemt! ⭐'
    };
    const others=SPROGBRO_LANGS.filter(l=>l.id!=='es');

    const mainCard=`
<button class="sprogbro-card sprogbro-card-main" data-lang="es" style="--sb-color:rgba(124,58,237,.2);--sb-glow:rgba(124,58,237,.3)">
  <div class="sprogbro-card-glow"></div>
  <div class="sprogbro-card-inner">
    <div class="sprogbro-card-icon">🇪🇸</div>
    <div class="sprogbro-card-text">
      <div class="sprogbro-card-title">Spansk → Dansk</div>
      <div class="sprogbro-card-desc">100 ord fordelt på 10 emner — saml dem alle!</div>
      <span class="sprogbro-main-badge">⭐ Vigtigste liste</span>
    </div>
    <div class="sprogbro-card-arrow">↗</div>
    <div class="sprogbro-card-shine"></div>
  </div>
</button>`;

    const otherCards=others.map(l=>`
<button class="sprogbro-card" data-lang="${l.id}" style="--sb-color:${l.cardColor};--sb-glow:${l.cardGlow}">
  <div class="sprogbro-card-glow"></div>
  <div class="sprogbro-card-inner">
    <div class="sprogbro-card-icon">${l.flag}</div>
    <div class="sprogbro-card-text">
      <div class="sprogbro-card-title">${l.title}</div>
      <div class="sprogbro-card-desc">${hubDescs[l.id]||''}</div>
    </div>
    <div class="sprogbro-card-arrow">→</div>
    <div class="sprogbro-card-shine"></div>
  </div>
</button>`).join('');

    view.innerHTML=`<div class="content-view active" style="display:flex">
<div class="sb-hub-header">
  <p class="sb-hub-eyebrow">Dit modersmål er din superkraft</p>
  <h2 class="section-title">Lignende <em>Ord</em></h2>
  <p class="sb-hub-tagline">Vælg et sprog og se, hvad du allerede kender</p>
</div>
<div class="sprogbro-hub-wrap">
  ${mainCard}
  <div class="sprogbro-others-grid">${otherCards}</div>
</div>
</div>`;

    view.querySelectorAll('.sprogbro-card[data-lang]').forEach(btn=>{
      btn.addEventListener('click',()=>renderLang(btn.dataset.lang));
    });
  }

  function renderLang(langId){
    activeLang=langId;
    const lang=SPROGBRO_LANGS.find(l=>l.id===langId);
    if(!lang)return renderHub();
    const legendHtml=lang.hasBadge?`
<div class="sb-legend">
  <div class="sb-leg-item"><span class="sb-sim sb-sim-id">IDENTISK</span> Identisk ord</div>
  <div class="sb-leg-item"><span class="sb-sim sb-sim-vs">MEGET LIG.</span> Meget lignende</div>
  <div class="sb-leg-item"><span class="sb-sim sb-sim-si">LIGNER</span> Genkendeligt</div>
</div>`:'';
    const sections=lang.sections.map((s,i)=>buildSection(s,lang,i)).join('');

    view.innerHTML=`<div class="content-view active" style="display:flex">
<button class="save-btn sb-back-btn" id="sb-back">← Tilbage</button>
<div class="sb-lang-header" style="background:${lang.grad}">
  <div class="sb-lang-flags">${lang.flag} 🤝 🇩🇰</div>
  <h2 class="sb-lang-title">${lang.title}</h2>
  <p class="sb-lang-motto">${lang.motto}</p>
</div>
<div class="sprogbro-fact" style="margin-top:1.2rem">
  <span class="sprogbro-fact-icon">💡</span>
  <div><strong>Vidste du det?</strong><br>${lang.funFact}</div>
</div>
<div class="sb-search-wrap">
  <div class="sb-search-box">
    <span class="sb-search-icon">🔍</span>
    <input type="text" id="sb-search-input" placeholder="${lang.searchPH}" autocomplete="off">
    <span id="sb-search-count">100 ord</span>
  </div>
</div>
${legendHtml}
<div id="sb-no-results" class="sb-no-results" style="display:none">🤔 Ingen resultater. Prøv et andet ord!</div>
<div class="sb-sections">${sections}</div>
</div>`;

    document.getElementById('sb-back').addEventListener('click',()=>renderHub());

    const searchInput=document.getElementById('sb-search-input');
    searchInput.addEventListener('input',()=>{
      const q=searchInput.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
      const rows=view.querySelectorAll('.sb-word-row');
      let visible=0;
      rows.forEach(r=>{
        const key=(r.dataset.key||'').normalize('NFD').replace(/[̀-ͯ]/g,'');
        const match=!q||key.includes(q);
        r.classList.toggle('sb-hidden',!match);
        if(match)visible++;
      });
      const total=lang.sections.reduce((n,s)=>n+s.ws.length,0);
      document.getElementById('sb-search-count').textContent=q?(visible+' resultat'+(visible!==1?'er':'')):(total+' ord');
      document.getElementById('sb-no-results').style.display=(visible===0&&q)?'block':'none';
      view.querySelectorAll('.sb-section').forEach(s=>{
        const allHidden=Array.from(s.querySelectorAll('.sb-word-row')).every(r=>r.classList.contains('sb-hidden'));
        s.style.display=allHidden?'none':'';
      });
    });
  }

  renderHub();
}

/* ── ORDBOG (MyMemory API) ─────────────────────────────── */
const ORDBOG_CACHE={};

// Safety filter: block violent/offensive content from translation results
const UNSAFE_WORDS = [
  // Danish – violence, murder, sexual assault, threats, insults
  'myrdet','myrde','mord','dræbt','dræbe','drab','skudt','skyde','skyde','voldtaget','voldtægt',
  'voldtage','trussel','trusler','true','chikane','tortur','overfald','mishandling','lemlæstelse',
  'selvmord','hænge','halshugge','henrette','nedslagte','nedslagtet','lemlæstet',
  'idiot','kælling','luder','tøs','perker','bøsse','retard','fjols','spasser',
  // Spanish – violence, murder, sexual assault, threats, insults
  'matar','mató','asesinado','asesinato','asesinar','violación','violar','violado','violada',
  'amenaza','amenazar','insulto','insultar','golpear','golpeado','abusar','abuso',
  'tortura','torturar','secuestrar','secuestro','asaltar','asalto','homicidio',
  'suicidio','colgar','decapitar','ejecutar','masacrar','masacre',
  'idiota','imbécil','estúpido','puta','puto','mierda','joder','cabrón','zorra',
  // English (in case API returns English)
  'murdered','murder','killed','kill','raped','rape','threat','assault','abuse',
  'suicide','torture','idiot','bitch','slut','bastard','moron','retard'
];

function isSafeTranslation(original, translated) {
  const low = translated.toLowerCase();
  // Block if contains any unsafe word
  for (const w of UNSAFE_WORDS) {
    const re = new RegExp('\\b' + w + '\\b', 'i');
    if (re.test(low)) return false;
  }
  // Block if the API returned a long sentence instead of a word translation
  // (original is 1-2 words but translation is a full sentence)
  const origWords = original.trim().split(/\s+/).length;
  const transWords = translated.trim().split(/\s+/).length;
  if (origWords <= 2 && transWords > 5) return false;
  return true;
}

async function myMemoryTranslate(text,langpair){
  const key=text+'|'+langpair;
  if(ORDBOG_CACHE[key])return ORDBOG_CACHE[key];
  try{
    const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const r=await fetch(url);
    const d=await r.json();
    const t=d.responseData?.translatedText||text;
    // Apply safety filter — if translation fails the check, return the original word
    const safe = isSafeTranslation(text, t) ? t : text;
    ORDBOG_CACHE[key]=safe;return safe;
  }catch{return text;}
}
// Expose globally so game.js can reuse the same translator (and cache).
window.myMemoryTranslate = myMemoryTranslate;
function speakSpanish(text){
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='es-ES';u.rate=0.88;
  function go(){
    const voices=speechSynthesis.getVoices();
    const v=voices.find(v=>v.lang==='es-ES')||voices.find(v=>v.lang.startsWith('es'));
    if(v)u.voice=v;
    // setTimeout(0) avoids Chrome Android's cancel+speak same-task silent-drop bug
    setTimeout(()=>speechSynthesis.speak(u),0);
  }
  if(speechSynthesis.getVoices().length)go();
  else speechSynthesis.addEventListener('voiceschanged',go,{once:true});
}
window.speakSpanish=speakSpanish;
window.playAudio=function(text,lang){
  if(lang&&lang.startsWith('es'))return speakSpanish(text);
  if(!window.speechSynthesis)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=lang||'da-DK';
  window.speechSynthesis.speak(u);
};
function renderOrdbog(){
  const view=$('view-ordbog');
  const vocab=getVocab();
  view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">📖 Ordbog</h2>
<div class="ordbog-search-wrap"><span class="search-icon">🔍</span>
<input class="ordbog-search" id="ordbog-input" placeholder="Skriv et spansk eller dansk ord…" autocomplete="off"/>
</div>
<p class="ordbog-hint">Søger automatisk i spansk og dansk via MyMemory</p>
<div class="ordbog-grid" id="ordbog-grid"></div>
</div>`;
  const grid=document.getElementById('ordbog-grid');
  const input=document.getElementById('ordbog-input');

  function getSearchHistory(){try{return JSON.parse(localStorage.getItem('ordbog_history')||'[]');}catch{return[];}}
  function saveSearchHistory(h){localStorage.setItem('ordbog_history',JSON.stringify(h.slice(0,50)));}

  function makeCard(word,translation,gender,plural,sourceLang){
    const gc=gender==='fem'?'fem':gender==='masc'?'masc':'neu';
    const gLabel=gender==='fem'?'Femenino':gender==='masc'?'Masculino':'Neutro';
    const esWord=sourceLang==='es'?word:translation;
    const daWord=sourceLang==='da'?word:translation;
    const c=el('div',`word-card ${gc}`);
    c.innerHTML=`<div class="wc-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem">
  <div class="wc-word" style="margin-bottom:0">${esWord}</div>
  <button class="wc-audio" onclick="window.speakSpanish('${esWord.replace(/'/g,"\\'")}')\" title="Lyt til udtalen" style="background:none;border:none;font-size:1.1rem;cursor:pointer;opacity:.7;transition:all .2s">🔊</button>
</div>
<div class="wc-translation">${daWord}</div>
<div class="wc-meta">
<span class="wc-tag">Flertal: ${makePlural(esWord)}</span>
<span class="wc-gender ${gc}">${gLabel}</span>
</div>`;
    return c;
  }
  
  async function renderCards(items) {
    grid.innerHTML='<div class="loading-spin"></div>';
    const cards=[];
    for(const item of items) {
      if(item.translation) {
         cards.push(makeCard(item.word, item.translation, item.gender, makePlural(item.word), item.sourceLang));
      } else {
         const t=await myMemoryTranslate(item.word,'es|da');
         cards.push(makeCard(item.word,t,detectGender(item.word),makePlural(item.word),'es'));
      }
    }
    grid.innerHTML='';
    cards.forEach(c=>grid.appendChild(c));
  }

  async function doSearch(query){
    if(!query.trim())return;
    grid.innerHTML='<div class="loading-spin"></div>';
    const lang=detectLang(query);
    const pair=lang==='da'?'da|es':'es|da';
    const translation=await myMemoryTranslate(query,pair);
    
    const history = getSearchHistory();
    const gender = lang==='es'?detectGender(query):detectGender(translation);
    const newItem = { word: query, translation: translation, sourceLang: lang, gender: gender };
    
    // Remove duplicate if exists
    const filteredHistory = history.filter(item => item.word.toLowerCase() !== query.toLowerCase() && item.translation.toLowerCase() !== query.toLowerCase());
    filteredHistory.unshift(newItem);
    saveSearchHistory(filteredHistory);
    
    renderCards(filteredHistory);
    input.value = ''; // clear input after search
  }

  const history = getSearchHistory();
  if(history.length > 0) {
    renderCards(history);
  } else if(vocab.length>0){
    const items = vocab.slice(0,12).map(w => ({ word: w }));
    renderCards(items);
  } else {
    grid.innerHTML=`<div class="empty-state"><span class="es-icon">📖</span><p>Søg efter et ord ovenfor, eller bed læreren om at tilføje ordforråd i Tablón.</p></div>`;
  }
  let debounce;
  input.addEventListener('input',()=>{
    clearTimeout(debounce);
    debounce=setTimeout(()=>doSearch(input.value),600);
  });
  input.addEventListener('keydown',e=>{if(e.key==='Enter')doSearch(input.value);});
}

/* ── YDERLIGERE MATERIALE ──────────────────────────────── */
function renderYderligere(){
  const view=$('view-yderligere');
  const vocab=getVocab();
  if(!vocab.length){
    view.innerHTML=`<div class="content-view active" style="display:flex"><h2 class="section-title">🧩 Øvelser</h2><div class="empty-state"><span class="es-icon">🧩</span><p>Læreren skal tilføje ordforråd i Tablón for at generere øvelser.<br><span style="font-size:.78rem;opacity:.6">Skriv ord med bindestreg: -comida, -pantalones</span></p></div></div>`;
    return;
  }
  view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">🧩 Øvelser</h2>
<div class="exercise-tabs">
<button class="tab-btn active" id="tab-dd">🎯 Køn-sortering</button>
<button class="tab-btn" id="tab-match">🃏 Match-par</button>
<button class="tab-btn" id="tab-listening">🎧 Lytteøvelse</button>
<button class="tab-btn" id="tab-scramble">🔤 Ord-puslespil</button>
<button class="tab-btn" id="tab-flashcards">🗂️ Flashcards</button>
</div>
<div class="exercise-panel active" id="panel-dd"></div>
<div class="exercise-panel" id="panel-match"></div>
<div class="exercise-panel" id="panel-listening"></div>
<div class="exercise-panel" id="panel-scramble"></div>
<div class="exercise-panel" id="panel-flashcards"></div>
</div>`;
  buildDragDrop(vocab);
  buildMatchPairs(vocab);
  buildListening(vocab);
  buildWordScramble(vocab);
  buildFlashcards(vocab);

  const tDD = document.getElementById('tab-dd');
  const tMatch = document.getElementById('tab-match');
  const tList = document.getElementById('tab-listening');
  const tScr = document.getElementById('tab-scramble');
  const tFC = document.getElementById('tab-flashcards');
  const pDD = document.getElementById('panel-dd');
  const pMatch = document.getElementById('panel-match');
  const pList = document.getElementById('panel-listening');
  const pScr = document.getElementById('panel-scramble');
  const pFC = document.getElementById('panel-flashcards');

  function activateTab(activeT, activeP) {
    [tDD,tMatch,tList,tScr,tFC].forEach(t=>t.classList.remove('active'));
    [pDD,pMatch,pList,pScr,pFC].forEach(p=>p.classList.remove('active'));
    activeT.classList.add('active'); activeP.classList.add('active');
  }
  tDD.addEventListener('click',()=>activateTab(tDD,pDD));
  tMatch.addEventListener('click',()=>activateTab(tMatch,pMatch));
  tList.addEventListener('click',()=>activateTab(tList,pList));
  tScr.addEventListener('click',()=>activateTab(tScr,pScr));
  tFC.addEventListener('click',()=>activateTab(tFC,pFC));
}
function buildDragDrop(vocab){
  const panel=document.getElementById('panel-dd');
  const words=vocab.map(w=>({w,g:detectGender(w)}));

  // ── Mobile: one-word-at-a-time tap mode ──────────────────────
  if(window.innerWidth<=640){
    let idx=0,score=0;
    const total=words.length;
    function renderCard(){
      if(idx>=total){
        panel.innerHTML=`
<div class="dd-oneup-result">
  <span class="dd-oneup-score-icon">${score===total?'🎉':'💪'}</span>
  <p class="dd-oneup-score-text">${score} / ${total} korrekt</p>
  <p style="font-size:.82rem;color:var(--text-dim);margin-bottom:1.5rem">${score===total?'Perfekt! Alle ord er rigtige!':'Godt forsøgt — prøv igen!'}</p>
  <button class="save-btn" id="dd-reset">🔄 Genstart</button>
</div>`;
        document.getElementById('dd-reset').addEventListener('click',()=>buildDragDrop(vocab));
        return;
      }
      const {w}=words[idx];
      panel.innerHTML=`
<div class="dd-oneup-wrap">
  <p class="dd-oneup-progress">Ord <strong>${idx+1}</strong> af ${total}</p>
  <div class="dd-oneup-bar"><div class="dd-oneup-bar-fill" style="width:${(idx/total)*100}%"></div></div>
  <div class="dd-oneup-card" id="dd-oneup-card"><span class="dd-oneup-word">${escapeHTML(w)}</span></div>
  <div class="dd-oneup-btns">
    <button class="dd-oneup-btn dd-oneup-btn--fem" data-gender="fem">🌸 Femenino</button>
    <button class="dd-oneup-btn dd-oneup-btn--masc" data-gender="masc">🔷 Masculino</button>
  </div>
</div>`;
      panel.querySelectorAll('.dd-oneup-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const chosen=btn.dataset.gender;
          const correct=words[idx].g;
          const isOk=(chosen===correct)||(correct==='neu'&&chosen==='masc');
          const card=document.getElementById('dd-oneup-card');
          card.classList.add(isOk?'dd-oneup-card--ok':'dd-oneup-card--err');
          panel.querySelectorAll('.dd-oneup-btn').forEach(b=>b.disabled=true);
          if(isOk)score++;
          setTimeout(()=>{idx++;renderCard();},420);
        });
      });
    }
    renderCard();
    return;
  }

  // ── Desktop: drag-and-drop ───────────────────────────────────
  let dragging=null,score=0,total=words.length;
  const wordsHtml=words.map(({w})=>`<div class="dd-word" draggable="true" data-word="${w}">${w}</div>`).join('');
  panel.innerHTML=`
<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1rem">Træk hvert ord til det rigtige køn-felt 🎯</p>
<div class="dd-words" id="dd-source">${wordsHtml}</div>
<div class="dd-buckets">
<div class="dd-bucket fem-bucket" id="bucket-fem" data-gender="fem"><h3>🌸 Femenino</h3></div>
<div class="dd-bucket masc-bucket" id="bucket-masc" data-gender="masc"><h3>🔷 Masculino</h3></div>
</div>
<div id="dd-result"></div>
<button class="save-btn" id="dd-reset" style="margin-top:1.25rem">🔄 Genstart øvelse</button>`;
  function setupDrag(){
    const bucketEls=()=>['bucket-fem','bucket-masc'].map(id=>document.getElementById(id));
    function handleDrop(bucket){
      if(!dragging)return;
      bucket.classList.remove('drag-over');
      const wordText=dragging.dataset.word;
      const correctGender=detectGender(wordText);
      const droppedGender=bucket.dataset.gender;
      const res=document.getElementById('dd-result');
      dragging.style.cursor='default';dragging.setAttribute('draggable','false');
      bucket.appendChild(dragging);
      const isCorrect=(droppedGender===correctGender)||(correctGender==='neu'&&droppedGender==='masc');
      if(isCorrect){score++;dragging.style.background='rgba(34,197,94,.2)';dragging.style.borderColor='#22c55e';}
      else{dragging.style.background='rgba(239,68,68,.2)';dragging.style.borderColor='#ef4444';}
      const placed=panel.querySelectorAll('#bucket-fem .dd-word,#bucket-masc .dd-word').length;
      if(placed>=total)res.innerHTML=`<div class="dd-result ${score===total?'correct':'wrong'}">${score===total?'🎉 Perfekt! Alle ord er korrekt placeret!':score+'/'+total+' ord korrekt. Prøv igen!'}</div>`;
      dragging=null;
    }
    // Mouse / HTML5 drag-and-drop
    panel.querySelectorAll('.dd-word').forEach(word=>{
      word.addEventListener('dragstart',e=>{dragging=word;word.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
      word.addEventListener('dragend',()=>{dragging=null;word.classList.remove('dragging');});
    });
    bucketEls().forEach(bucket=>{
      bucket.addEventListener('dragover',e=>{e.preventDefault();bucket.classList.add('drag-over');});
      bucket.addEventListener('dragleave',()=>bucket.classList.remove('drag-over'));
      bucket.addEventListener('drop',e=>{e.preventDefault();handleDrop(bucket);});
    });
    // Touch drag-and-drop
    let clone=null,offsetX=0,offsetY=0;
    function bucketAt(x,y){return bucketEls().find(b=>{const r=b.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;})||null;}
    panel.querySelectorAll('.dd-word').forEach(word=>{
      word.addEventListener('touchstart',e=>{
        e.preventDefault();
        dragging=word;word.classList.add('dragging');
        const t=e.touches[0],r=word.getBoundingClientRect();
        offsetX=t.clientX-r.left;offsetY=t.clientY-r.top;
        clone=word.cloneNode(true);
        Object.assign(clone.style,{position:'fixed',width:r.width+'px',left:'0',top:'0',transform:`translate(${t.clientX-offsetX}px,${t.clientY-offsetY}px)`,willChange:'transform',pointerEvents:'none',opacity:'0.85',zIndex:'9999',margin:'0'});
        document.body.appendChild(clone);
      },{passive:false});
      word.addEventListener('touchmove',e=>{
        e.preventDefault();
        if(!clone)return;
        const t=e.touches[0];
        clone.style.transform=`translate(${t.clientX-offsetX}px,${t.clientY-offsetY}px)`;
        bucketEls().forEach(b=>{const r=b.getBoundingClientRect();b.classList.toggle('drag-over',t.clientX>=r.left&&t.clientX<=r.right&&t.clientY>=r.top&&t.clientY<=r.bottom);});
      },{passive:false});
      word.addEventListener('touchend',e=>{
        if(clone){clone.remove();clone=null;}
        word.classList.remove('dragging');
        bucketEls().forEach(b=>b.classList.remove('drag-over'));
        const t=e.changedTouches[0];
        const target=bucketAt(t.clientX,t.clientY);
        if(target)handleDrop(target);else dragging=null;
      });
    });
  }
  setupDrag();
  document.getElementById('dd-reset').addEventListener('click',()=>buildDragDrop(vocab));
}
function buildMatchPairs(vocab){
  const panel=document.getElementById('panel-match');
  const MAX=Math.min(vocab.length,8);
  const chosen=vocab.slice(0,MAX);
  panel.innerHTML=`<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1rem">Indlæser oversættelser…</p>`;
  (async()=>{
    const pairs=await Promise.all(chosen.map(async w=>{const t=await myMemoryTranslate(w,'es|da');return{es:w,da:t||w};}));
    const shuffledEs=[...pairs].sort(()=>Math.random()-.5);
    const shuffledDa=[...pairs].sort(()=>Math.random()-.5);
    let selected=null,matched=0;
    function makeItems(arr,lang){
      return arr.map((p,i)=>{
        const d=el('div','match-item match-entering');
        d.dataset.es=p.es;d.dataset.lang=lang;
        d.textContent=lang==='es'?p.es:p.da;
        d.style.animationDelay=(i*0.07)+'s';
        return d;
      });
    }
    const esItems=makeItems(shuffledEs,'es');
    const daItems=makeItems(shuffledDa,'da');
    const scoreEl=el('div','match-score');
    scoreEl.innerHTML=`<span class="match-score-num">0</span>&thinsp;/&thinsp;${pairs.length} par`;
    panel.innerHTML='';
    panel.appendChild(el('p','',`<span style="font-size:.85rem;color:var(--text-dim)">Forbind det spanske ord med den danske oversættelse 🃏</span>`));
    panel.appendChild(scoreEl);
    const grid=el('div','match-grid');
    const col1=el('div','match-col');const col2=el('div','match-col');
    esItems.forEach(i=>col1.appendChild(i));
    daItems.forEach(i=>col2.appendChild(i));
    grid.appendChild(col1);grid.appendChild(col2);
    panel.appendChild(grid);
    function handleClick(item){
      if(item.classList.contains('matched')||item.classList.contains('match-correct')||item.classList.contains('match-wrong'))return;
      if(!selected){selected=item;item.classList.add('selected');return;}
      if(selected===item){selected.classList.remove('selected');selected=null;return;}
      if(selected.dataset.lang===item.dataset.lang){
        selected.classList.remove('selected');selected=item;item.classList.add('selected');return;
      }
      const a=selected,b=item;selected=null;a.classList.remove('selected');
      if(a.dataset.es===b.dataset.es){
        a.classList.add('match-correct');b.classList.add('match-correct');
        setTimeout(()=>{
          a.classList.replace('match-correct','matched');
          b.classList.replace('match-correct','matched');
        },600);
        matched++;
        const n=scoreEl.querySelector('.match-score-num');
        if(n)n.textContent=matched;
        if(matched===pairs.length){
          setTimeout(()=>{
            scoreEl.innerHTML='';
            const win=el('div','match-win','🎉 Perfekt! Alle '+pairs.length+' par fundet!');
            const btn=el('button','match-reset-btn','Prøv igen ↺');
            btn.addEventListener('click',()=>buildMatchPairs(vocab));
            scoreEl.appendChild(win);scoreEl.appendChild(btn);
          },900);
        }
      } else {
        a.classList.add('match-wrong');b.classList.add('match-wrong');
        setTimeout(()=>{a.classList.remove('match-wrong');b.classList.remove('match-wrong');},520);
      }
    }
    [...esItems,...daItems].forEach(i=>i.addEventListener('click',()=>handleClick(i)));
  })();
}

/* ── LYTTEØVELSE (Listening Exercise) ──────────────────── */
function buildListening(vocab){
  const panel=document.getElementById('panel-listening');
  const MAX=Math.min(vocab.length,6);
  const chosen=[...vocab].sort(()=>Math.random()-.5).slice(0,MAX);
  
  panel.innerHTML=`<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1.5rem">Henter oversættelser…</p><div class="loading-spin" style="margin:2rem auto"></div>`;

  (async()=>{
    const questions=await Promise.all(chosen.map(async w=>{const da=await myMemoryTranslate(w,'es|da');return{es:w,da};}));

    let html=`
    <p style="font-size:.9rem;color:var(--text-dim);margin-bottom:1.5rem;line-height:1.6">
      🎧 <strong>Instruksjoner:</strong> Lyt til det spanske ord (ved at klikke på knappen) og vælg den korrekte danske oversættelse.
    </p>
    <div style="display:flex;flex-direction:column;gap:1.5rem">`;
    
    questions.forEach((q)=>{
      const w  = q.es;
      const options=[q.da];
      
      const pool2 = questions.filter(x=>x.da!==q.da).map(x=>x.da);
      pool2.sort(()=>Math.random()-.5);
      for(const rw of pool2){ if(options.length>=4) break; options.push(rw); }
      options.sort(()=>Math.random()-.5);
      
      html+=`<div class="list-q" data-ans="${q.da}" style="background:rgba(255,255,255,.03);padding:1.5rem;border-radius:16px;border:1px solid var(--glass-border)">
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
          <button class="save-btn list-play" data-w="${w}" style="margin:0;border-radius:50%;width:3.5rem;height:3.5rem;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🔊</button>
          <span class="list-reveal" style="font-size:1rem;color:var(--text-dim)">Klik for at lytte</span>
        </div>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem">
          ${options.map(o=>`<button class="tab-btn opt-btn" style="font-size:1rem;padding:.6rem 1.1rem">${o}</button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="list-res" style="font-size:.9rem;font-weight:500"></span>
          <button class="save-btn to-ordbog" data-w="${w}" style="margin:0;padding:.4rem .9rem;font-size:.8rem;display:flex;align-items:center;gap:.4rem"><span>📖</span> Slå op</button>
        </div>
      </div>`;
    });
    
    panel.innerHTML=html+'</div><button class="save-btn" id="list-reset" style="margin-top:1.5rem">🔄 Nye ord</button>';
    
    panel.querySelectorAll('.list-play').forEach(btn=>{
      btn.addEventListener('click',function(){
        speakSpanish(this.dataset.w);
        this.style.transform='scale(0.9)';
        setTimeout(()=>this.style.transform='none', 150);
      });
    });

    panel.querySelectorAll('.opt-btn').forEach(btn=>{
      btn.addEventListener('click',function(){
        const q=this.closest('.list-q');
        if(q.dataset.done)return;
        const ans=q.dataset.ans;
        const res=q.querySelector('.list-res');
        
        q.querySelectorAll('.opt-btn').forEach(b=>{b.style.opacity='.4';b.style.pointerEvents='none';});
        this.style.opacity='1';
        q.dataset.done='true';
        
        // Reveal Spanish word
        const playBtn = q.querySelector('.list-play');
        const span = q.querySelector('.list-reveal');
        span.innerHTML = `<strong style="color:var(--glow);font-size:1.1rem">${playBtn.dataset.w}</strong>`;
        
        if(this.textContent===ans){
          this.style.borderColor='#22c55e';this.style.background='rgba(34,197,94,.12)';this.style.color='#4ade80';
          res.textContent='✅ Korrekt!';res.style.color='#4ade80';
        }else{
          this.style.borderColor='#f87171';this.style.background='rgba(248,113,113,.12)';this.style.color='#f87171';
          res.textContent='❌ Svaret var: '+ans;res.style.color='#fca5a5';
        }
      });
    });
    
    panel.querySelectorAll('.to-ordbog').forEach(btn=>{
      btn.addEventListener('click',function(){
        const w=this.dataset.w;
        transitionTo('ordbog');
        setTimeout(()=>{
          const inp=document.getElementById('ordbog-input');
          if(inp){inp.value=w;inp.dispatchEvent(new Event('input'));inp.focus();}
        },400);
      });
    });
    
    document.getElementById('list-reset').addEventListener('click',()=>buildListening(vocab));
  })();
}

/* ── ORD-PUSLESPIL (Word Scramble) ──────────────────────── */
function buildWordScramble(vocab){
  const panel=document.getElementById('panel-scramble');
  const MAX=Math.min(vocab.length,6);
  const chosen=[...vocab].sort(()=>Math.random()-.5).slice(0,MAX);
  panel.innerHTML=`<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1.5rem">Henter oversættelser…</p><div class="loading-spin" style="margin:2rem auto"></div>`;
  (async()=>{
    const questions=await Promise.all(chosen.map(async w=>{const da=await myMemoryTranslate(w,'es|da');return{es:w,da};}));
    function scramble(word){
      const arr=word.split('');
      for(let tries=0;tries<10;tries++){
        for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
        if(arr.join('')!==word)break;
      }
      return arr.join('');
    }
    const bravos=['Godt klaret!','Fantastisk!','Fremragende!','Perfekt!','Rigtigt!'];
    let score=0;
    const total=questions.length;
    let html=`
    <p style="font-size:.9rem;color:var(--text-dim);margin-bottom:1.5rem;line-height:1.6">
      🔤 <strong>Instruksjoner:</strong> Det blandede spanske ord passer til det danske ord i gult. Skriv bogstaverne i den rigtige rækkefølge.
    </p>
    <div class="scr-score" id="scr-score" style="text-align:center;font-size:1rem;font-weight:600;color:var(--glow);margin-bottom:1rem">Score: 0 / ${total}</div>
    <div style="display:flex;flex-direction:column;gap:1.25rem">`;
    questions.forEach((q,i)=>{
      const scr=scramble(q.es);
      const lettersHtml=scr.split('').map((ch,li)=>`<span class="blandet-letter" data-li="${li}">${ch}</span>`).join('');
      html+=`<div class="sent-q scr-q" data-ans="${q.es}" data-scr="${scr}" data-idx="${i}" style="background:rgba(255,255,255,.03);padding:1.5rem;border-radius:16px;border:1px solid var(--glass-border)">
        <div style="margin-bottom:.75rem">
          <span style="font-size:.85rem;color:var(--text-dim)">Dansk: <strong style="color:var(--glow);font-size:1rem">${q.da}</strong></span>
        </div>
        <div class="blandet">${lettersHtml}</div>
        <input class="scr-input admin-input" type="text" placeholder="Skriv det rigtige ord…"
          style="width:100%;box-sizing:border-box;font-size:1rem;padding:.6rem 1rem;letter-spacing:1px;margin-top:.75rem"
          autocomplete="off" spellcheck="false" />
        <div class="scr-res" style="font-size:.9rem;font-weight:500;min-height:1.4rem;margin-top:.6rem"></div>
      </div>`;
    });
    panel.innerHTML=html+`</div><button class="save-btn" id="scr-reset" style="margin-top:1.5rem">🔄 Nye ord</button>`;
    const scoreEl=document.getElementById('scr-score');
    function updateScore(){scoreEl.textContent='Score: '+score+' / '+total;}
    panel.querySelectorAll('.scr-q').forEach(card=>{
      const inp=card.querySelector('.scr-input');
      const res=card.querySelector('.scr-res');
      const ans=card.dataset.ans;
      const scr=card.dataset.scr;
      const pool=scr.split('').map(ch=>({ch:ch.toLowerCase(),used:false}));
      const letterSpans=Array.from(card.querySelectorAll('.blandet-letter'));
      function syncPool(){
        pool.forEach(p=>p.used=false);
        inp.value.split('').forEach(ch=>{
          const idx=pool.findIndex(p=>p.ch===ch.toLowerCase()&&!p.used);
          if(idx>=0)pool[idx].used=true;
        });
        letterSpans.forEach((span,i)=>span.classList.toggle('used',pool[i].used));
      }
      inp.addEventListener('input',()=>{
        if(card.dataset.done)return;
        syncPool();
        if(inp.value.toLowerCase()===ans.toLowerCase()){
          card.dataset.done='true';
          inp.disabled=true;
          score++; updateScore();
          const bravo=bravos[Math.floor(Math.random()*bravos.length)];
          res.innerHTML=`<span style="color:#4ade80">✅ ${bravo} «${ans}»</span>`;
          inp.style.borderColor='#22c55e';
          card.classList.add('scr-correct');
          setTimeout(()=>card.classList.remove('scr-correct'),600);
          if(score===total){scoreEl.textContent='🎉 Perfekt! Alle '+total+' ord korrekt!';scoreEl.style.color='#4ade80';}
        }
      });
    });
    document.getElementById('scr-reset').addEventListener('click',()=>buildWordScramble(vocab));
  })();
}

/* ── FLASHCARDS ──────────────────────────────────────────── */
function buildFlashcards(vocab){
  const panel=document.getElementById('panel-flashcards');
  const deck=vocab.slice();
  let idx=0;
  const cache={};

  function render(){
    const word=deck[idx];
    panel.innerHTML=`
<p style="font-size:.85rem;color:var(--text-dim);margin-bottom:1.25rem;text-align:center">Klik på kortet for at se den danske oversættelse 🗂️</p>
<div style="display:flex;flex-direction:column;align-items:center;gap:1.5rem">
<div class="fc-scene">
<div class="fc-card" id="fc-card">
<div class="fc-face fc-front">
<span class="fc-word">${word}</span>
<span class="fc-hint">🇪🇸 Español · Klik for at vende</span>
</div>
<div class="fc-face fc-back">
<span class="fc-translation" id="fc-trans">${cache[word]||'…'}</span>
<span class="fc-hint">🇩🇰 Dansk</span>
</div>
</div>
</div>
<div class="fc-counter">Tarjeta ${idx+1} de ${deck.length}</div>
<div style="display:flex;gap:1rem">
<button class="tab-btn" id="fc-prev" style="${idx===0?'opacity:.35;cursor:default':''}">← Anterior</button>
<button class="tab-btn" id="fc-next" style="${idx===deck.length-1?'opacity:.35;cursor:default':''}">Næste →</button>
</div>
</div>`;

    const card=document.getElementById('fc-card');
    card.addEventListener('click',async()=>{
      if(card.classList.contains('flipped')){card.classList.remove('flipped');return;}
      if(!cache[word]){
        const t=await myMemoryTranslate(word,'es|da');
        cache[word]=t;
        const transEl=document.getElementById('fc-trans');
        if(transEl)transEl.textContent=t;
      }
      card.classList.add('flipped');
    });

    document.getElementById('fc-prev').addEventListener('click',()=>{if(idx>0){idx--;render();}});
    document.getElementById('fc-next').addEventListener('click',()=>{if(idx<deck.length-1){idx++;render();}});
  }

  render();
}

/* ── STILE HELPERS ──────────────────────────────────────────── */
// Stile items stored in config_clase under key 'stile_items' as a JSON array.
// Format: [{id, titulo, imagen_url, created_at}, ...]
async function getStileItems(){
  const raw=await dbGet('stile_items');
  try{return JSON.parse(raw||'[]');}catch{return[];}
}
async function saveStileItems(items){
  await dbSet('stile_items',JSON.stringify(items));
}

/* ── STILE ─────────────────────────────────────────────────── */
async function renderStile(){
  const view=$('view-stile');
  view.innerHTML=`<div class="content-view active" style="display:flex">
<h2 class="section-title">✍️ Stile</h2>
<div id="stile-loading" style="display:flex;align-items:center;gap:.75rem;padding:.5rem 0 1.5rem">
  <div class="loading-spin"></div>
  <span style="font-size:.85rem;color:var(--text-dim)">Henter stile…</span>
</div>
<div id="stile-gallery" class="stile-gallery" hidden></div>
<div id="stile-empty" class="stile-empty" hidden>Ingen stile er tilgængelige endnu.</div>
</div>`;
  const items=await getStileItems();
  document.getElementById('stile-loading').hidden=true;
  if(!items.length){document.getElementById('stile-empty').hidden=false;return;}
  const sorted=[...items].sort((a,b)=>((b.created_at||'')>(a.created_at||'')?1:-1));
  const gallery=document.getElementById('stile-gallery');
  gallery.hidden=false;
  gallery.innerHTML=sorted.map(item=>`
<div class="stile-card" style="cursor:pointer" data-url="${escapeHTML(item.imagen_url)}">
  <div class="stile-card-deco" aria-hidden="true">
    <span class="stile-card-deco-icon">✍️</span>
  </div>
  <div class="stile-info">
    <p class="stile-titulo">${escapeHTML(item.titulo)}</p>
    <button class="stile-dl-btn">↗ Åbn</button>
  </div>
</div>`).join('');
  gallery.querySelectorAll('.stile-card').forEach(card=>{
    card.addEventListener('click',()=>window.open(card.dataset.url,'_blank','noopener,noreferrer'));
  });
}

function initAdminPanel(){
  // Panel eliminado — todo está integrado en la vista del Tablón (admin)
}

/* ── INIT ──────────────────────────────────────────────── */
function init(){
  initTheme();
  initAuth();
  initQuickDict();
  initAdminPanel();
  initTemario();
  initParallax();
  initVocabPopup();
  syncFromCloud();
  document.querySelectorAll('.menu-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const view=card.dataset.view;
      if(view)transitionTo(view,card);
    });
  });
  $('back-btn').addEventListener('click',()=>transitionTo('home',null));
}
/* ── VOCAB CHIP POPUP ──────────────────────────────────────── */
function initVocabPopup(){
  const popup=document.createElement('div');
  popup.id='vocab-popup';
  popup.setAttribute('role','tooltip');
  popup.setAttribute('aria-live','polite');
  popup.innerHTML='<div class="vocab-popup-inner"><span class="vpc-es"></span><span class="vpc-arrow">↓</span><span class="vpc-dk"></span></div>';
  document.body.appendChild(popup);

  let active=null;

  function show(chip){
    if(active===chip)return hide();
    active=chip;
    const es=chip.dataset.es||'';
    const dk=chip.dataset.dk||'';
    popup.querySelector('.vpc-es').textContent=es;
    popup.querySelector('.vpc-dk').textContent=dk;
    popup.querySelector('.vpc-arrow').style.display=dk?'inline':'none';
    popup.querySelector('.vpc-dk').style.display=dk?'inline':'none';
    popup.classList.add('visible');

    // position: below the chip, centred (fixed = viewport coords)
    const r=chip.getBoundingClientRect();
    const pw=popup.offsetWidth||180;
    let left=r.left+r.width/2-pw/2;
    let top=r.bottom+8;
    // flip above if too close to bottom
    if(top+120>window.innerHeight)top=r.top-120-8;
    left=Math.max(8,Math.min(left,window.innerWidth-pw-8));
    popup.style.left=left+'px';
    popup.style.top=top+'px';
    chip.classList.add('vocab-chip--active');
  }

  function hide(){
    if(active)active.classList.remove('vocab-chip--active');
    active=null;
    popup.classList.remove('visible');
  }

  document.addEventListener('click',e=>{
    const chip=e.target.closest('.vocab-chip');
    if(chip){e.stopPropagation();show(chip);}
    else hide();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
}

/* ── PARALLAX ──────────────────────────────────────────────── */
function initParallax(){
  const orbs=[
    document.querySelector('.orb-1'),
    document.querySelector('.orb-2'),
    document.querySelector('.orb-3')
  ];
  const noise=document.getElementById('noise-overlay');
  // Max displacement in px per layer — keep it minimal
  const MAX=[14,20,9];

  let tx=[0,0,0],ty=[0,0,0]; // targets
  let cx=[0,0,0],cy=[0,0,0]; // current (lerped)
  const EASE=0.05;
  let rafId=null;

  // El loop solo corre mientras los orbes se mueven; al asentarse se detiene
  // (antes corría a 60fps para siempre, incluso sin puntero).
  function tick(){
    rafId=null;
    const inGame=document.body.classList.contains('spil-active');
    let settled=true;
    for(let i=0;i<3;i++){
      // In game: smoothly drift back to 0
      const dtx=(inGame?0:tx[i])-cx[i];
      const dty=(inGame?0:ty[i])-cy[i];
      cx[i]+=dtx*EASE;
      cy[i]+=dty*EASE;
      if(Math.abs(dtx)>.05||Math.abs(dty)>.05)settled=false;
      if(orbs[i])orbs[i].style.translate=`${cx[i].toFixed(1)}px ${cy[i].toFixed(1)}px`;
    }
    // Noise overlay moves at 25% of orb-2 — barely perceptible depth hint
    if(noise)noise.style.translate=`${(cx[1]*.25).toFixed(1)}px ${(cy[1]*.25).toFixed(1)}px`;
    if(!settled)rafId=requestAnimationFrame(tick);
  }
  function wake(){if(rafId===null)rafId=requestAnimationFrame(tick);}
  _parallaxWake=wake;

  function applyPointer(cx,cy){
    if(document.body.classList.contains('spil-active'))return;
    const nx=(cx/window.innerWidth)-.5;
    const ny=(cy/window.innerHeight)-.5;
    for(let i=0;i<3;i++){tx[i]=nx*MAX[i];ty[i]=ny*MAX[i];}
    wake();
  }
  document.addEventListener('mousemove',e=>applyPointer(e.clientX,e.clientY));
  document.addEventListener('touchmove',e=>{
    if(e.touches.length!==1)return;
    applyPointer(e.touches[0].clientX,e.touches[0].clientY);
  },{passive:true});
  // On touch end, drift back to center
  document.addEventListener('touchend',()=>{
    if(document.body.classList.contains('spil-active'))return;
    for(let i=0;i<3;i++){tx[i]=0;ty[i]=0;}
    wake();
  });

  wake();
}

document.addEventListener('DOMContentLoaded',init);
})();
