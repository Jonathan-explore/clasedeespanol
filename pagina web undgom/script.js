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
function $(id){return document.getElementById(id);}
function el(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html)e.innerHTML=html;return e;}
function getVocab(){try{return JSON.parse(localStorage.getItem('vocab')||'[]');}catch{return[];}}
function parseVocab(text){
  return text.split('\n').map(l=>l.trim())
    .filter(l=>l.startsWith('-')&&l.length>1)
    .map(l=>l.slice(1).trim()).filter(Boolean);
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
  let W,H,blobs=[];
  function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;}
  resize();window.addEventListener('resize',resize);
  const COLORS=['hsl(210,80%,35%)','hsl(220,70%,28%)','hsl(195,85%,30%)','hsl(240,60%,30%)','hsl(180,70%,22%)','hsl(260,50%,28%)'];
  for(let i=0;i<N;i++){
    blobs.push({
      x:Math.random()*innerWidth,y:Math.random()*innerHeight,
      r:120+Math.random()*220,
      vx:(Math.random()-.5)*.4,vy:(Math.random()-.5)*.4,
      ax:Math.random()*Math.PI*2,ay:Math.random()*Math.PI*2,
      ax2:Math.random()*.003+.0015,ay2:Math.random()*.003+.0015,
      color:COLORS[i%COLORS.length],
      stretchX:1,stretchY:1
    });
  }
  let stretchTarget=null,stretchT=0,stretchDur=0;
  function stretchToward(tx,ty,dur){stretchTarget={tx,ty};stretchT=0;stretchDur=dur;}
  window._fluidStretch=stretchToward;
  function loop(t){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#0a0f1e';ctx.fillRect(0,0,W,H);
    if(stretchTarget){
      stretchT+=16;
      const p=Math.min(stretchT/stretchDur,1);
      const ease=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;
      const pBack=p>=1?1:0;
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
    blobs.forEach(b=>{
      b.ax+=b.ax2;b.ay+=b.ay2;
      b.x+=Math.sin(b.ax)*b.vx*60;b.y+=Math.cos(b.ay)*b.vy*60;
      if(b.x<-b.r)b.x=W+b.r;if(b.x>W+b.r)b.x=-b.r;
      if(b.y<-b.r)b.y=H+b.r;if(b.y>H+b.r)b.y=-b.r;
      ctx.save();
      ctx.translate(b.x,b.y);ctx.scale(b.stretchX,b.stretchY);
      const g=ctx.createRadialGradient(0,0,0,0,0,b.r);
      g.addColorStop(0,b.color.replace('hsl','hsla').replace(')',',0.55)'));
      g.addColorStop(1,'transparent');
      ctx.globalCompositeOperation='screen';
      ctx.beginPath();ctx.arc(0,0,b.r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
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
function showView(name,fromCard){
  // Salir del juego si estábamos en él
  if(STATE.currentView==='spil' && name!=='spil'){
    document.body.classList.remove('spil-active');
    if(window.LinguaStrike) window.LinguaStrike.stop();
  }
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
}
function renderSpil(){
  document.body.classList.add('spil-active');
  if(window.LinguaStrike){
    // start() es async pero no necesitamos await aquí — el overlay START
    // se muestra y el render del canvas se inicializa solo.
    window.LinguaStrike.start();
  } else {
    console.warn('[hjørne] LinguaStrike no está cargado. ¿Se cargó game.js?');
  }
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
      if(h===HASH){STATE.admin=true;modal.hidden=true;badge.hidden=false;if(STATE.currentView!=='home')renderView(STATE.currentView);}
      else{errEl.textContent='Forkert adgangskode. Prøv igen.';input.value='';input.focus();}
    } catch (err) {
      errEl.textContent='Fejl under login. Prøv igen.';
    }
  }
  submitBtn.addEventListener('click',doLogin);
  input.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  logoutBtn.addEventListener('click',()=>{STATE.admin=false;badge.hidden=true;if(STATE.currentView!=='home')renderView(STATE.currentView);});
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
function renderTablon(){
  const view=$('view-tablon');
  const stored=localStorage.getItem('tablon')||'';
  if(STATE.admin){
    view.innerHTML=`
<div class="content-view active" style="display:flex">
<h2 class="section-title">📋 Tablón — Admin</h2>
<div class="tablon-board">
<textarea class="tablon-textarea" id="tablon-ta" placeholder="Skriv dagens lektion her...\nBrug bindestreg for ordforråd:\n-comida\n-pantalones">${stored}</textarea>
</div>
<p class="tablon-hint">💡 Ord med - gemmes automatisk som ordforråd til øvelser</p>
<button class="save-btn" id="tablon-save">💾 Gem lektion</button>
</div>`;
    document.getElementById('tablon-save').addEventListener('click',()=>{
      const txt=document.getElementById('tablon-ta').value;
      localStorage.setItem('tablon',txt);
      const words=parseVocab(txt);
      localStorage.setItem('vocab',JSON.stringify(words));
      const btn=document.getElementById('tablon-save');
      btn.textContent='✅ Gemt!';setTimeout(()=>{btn.textContent='💾 Gem lektion';},1800);
    });
  } else {
    const html=stored?stored.split('\n').map(l=>{
      const t=l.trim();
      if(!t)return'<br>';
      if(t.startsWith('-'))return`<span class="vocab-chip">${t.slice(1).trim()}</span>`;
      return`<span>${t}</span><br>`;
    }).join(''):'<span style="color:var(--text-dim)">Ingen lektion er tilgængelig endnu.</span>';
    view.innerHTML=`<div class="content-view active" style="display:flex"><h2 class="section-title">📋 Tablón</h2><div class="tablon-board"><div class="tablon-content">${html}</div></div></div>`;
  }
}

/* ── FREMLÆGGELSE ──────────────────────────────────────── */
function renderFremlaeggelse(){
  const view=$('view-fremlaeggelse');
  const saved=localStorage.getItem('slides-url')||'';
  function toEmbed(url){
    try{
      if(url.includes('/pub'))return url.includes('embedded=true')?url:url+'&embedded=true';
      const m=url.match(/\/d\/([^\/]+)/);
      if(m)return`https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false&delayms=5000`;
    }catch{}return null;
  }
  const embedUrl=toEmbed(saved);
  const adminSection=STATE.admin?`
<div class="slides-input-wrap">
<input class="slides-input" id="slides-url-input" placeholder="Indsæt Google Slides deling-link her…" value="${saved}"/>
<button class="save-btn" id="slides-save" style="white-space:nowrap">Gem link</button>
</div>`:'';
  const frameSection=embedUrl?`<div class="slides-frame-wrap"><iframe src="${embedUrl}" allowfullscreen title="Google Slides præsentation"></iframe></div>`
  :`<div class="slides-frame-wrap"><div class="slides-placeholder"><span>🎞️</span><p>Ingen præsentation tilgængelig endnu.</p>${STATE.admin?'<p style="font-size:.78rem;color:var(--text-dim)">Indsæt et link ovenfor for at starte.</p>':''}</div></div>`;
  view.innerHTML=`<div class="content-view active" style="display:flex"><h2 class="section-title">🎞️ Fremlæggelse</h2>${adminSection}${frameSection}</div>`;
  if(STATE.admin){
    document.getElementById('slides-save').addEventListener('click',()=>{
      const url=document.getElementById('slides-url-input').value.trim();
      localStorage.setItem('slides-url',url);renderFremlaeggelse();
    });
  }
}

/* ── ORDBOG (MyMemory API) ─────────────────────────────── */
const ORDBOG_CACHE={};
async function myMemoryTranslate(text,langpair){
  const key=text+'|'+langpair;
  if(ORDBOG_CACHE[key])return ORDBOG_CACHE[key];
  try{
    const url=`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
    const r=await fetch(url);
    const d=await r.json();
    const t=d.responseData?.translatedText||text;
    ORDBOG_CACHE[key]=t;return t;
  }catch{return text;}
}
// Expose globally so game.js can reuse the same translator (and cache).
window.myMemoryTranslate = myMemoryTranslate;
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
  
  window.playAudio = function(text, lang) {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    window.speechSynthesis.speak(u);
  };
  function makeCard(word,translation,gender,plural,sourceLang){
    const gc=gender==='fem'?'fem':gender==='masc'?'masc':'neu';
    const gLabel=gender==='fem'?'Femenino':gender==='masc'?'Masculino':'Neutro';
    const esWord=sourceLang==='es'?word:translation;
    const daWord=sourceLang==='da'?word:translation;
    const c=el('div',`word-card ${gc}`);
    c.innerHTML=`<div class="wc-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.3rem">
  <div class="wc-word" style="margin-bottom:0">${esWord}</div>
  <button class="wc-audio" onclick="window.playAudio('${esWord.replace(/'/g,"\\'")}','es-ES')" title="Lyt til udtalen" style="background:none;border:none;font-size:1.1rem;cursor:pointer;opacity:.7;transition:all .2s">🔊</button>
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
    panel.querySelectorAll('.dd-word').forEach(word=>{
      word.addEventListener('dragstart',e=>{dragging=word;word.classList.add('dragging');e.dataTransfer.effectAllowed='move';});
      word.addEventListener('dragend',()=>{dragging=null;word.classList.remove('dragging');});
    });
    ['bucket-fem','bucket-masc'].forEach(id=>{
      const bucket=document.getElementById(id);
      bucket.addEventListener('dragover',e=>{e.preventDefault();bucket.classList.add('drag-over');});
      bucket.addEventListener('dragleave',()=>bucket.classList.remove('drag-over'));
      bucket.addEventListener('drop',e=>{
        e.preventDefault();bucket.classList.remove('drag-over');
        if(!dragging)return;
        const word=dragging.dataset.word;
        const correctGender=detectGender(word);
        const droppedGender=bucket.dataset.gender;
        const res=document.getElementById('dd-result');
        dragging.style.cursor='default';dragging.setAttribute('draggable','false');
        bucket.appendChild(dragging);
        const isCorrect=(droppedGender===correctGender)||(correctGender==='neu'&&droppedGender==='masc');
        if(isCorrect){score++;dragging.style.background='rgba(34,197,94,.2)';dragging.style.borderColor='#22c55e';}
        else{dragging.style.background='rgba(239,68,68,.2)';dragging.style.borderColor='#ef4444';}
        const placed=panel.querySelectorAll('#bucket-fem .dd-word,#bucket-masc .dd-word').length;
        if(placed>=total)res.innerHTML=`<div class="dd-result ${score===total?'correct':'wrong'}">${score===total?'🎉 Perfekt! Alle ord er korrekt placeret!':score+'/'+total+' ord korrekt. Prøv igen!'}</div>`;
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
    const pairs=[];
    for(const w of chosen){
      const t=await myMemoryTranslate(w,'es|da');
      pairs.push({es:w,da:t});
    }
    const shuffledEs=[...pairs].sort(()=>Math.random()-.5);
    const shuffledDa=[...pairs].sort(()=>Math.random()-.5);
    let selected=null,matched=0,score=0;
    function makeItems(arr,lang){
      return arr.map(p=>{
        const d=el('div','match-item');
        d.dataset.es=p.es;d.dataset.lang=lang;
        d.textContent=lang==='es'?p.es:p.da;
        return d;
      });
    }
    const esItems=makeItems(shuffledEs,'es');
    const daItems=makeItems(shuffledDa,'da');
    const scoreEl=el('p','match-score','0 / '+pairs.length+' match');
    panel.innerHTML='';
    const grid=el('div','match-grid');
    const col1=el('div','match-col');const col2=el('div','match-col');
    esItems.forEach(i=>col1.appendChild(i));
    daItems.forEach(i=>col2.appendChild(i));
    grid.appendChild(col1);grid.appendChild(col2);
    panel.appendChild(el('p','',`<span style="font-size:.85rem;color:var(--text-dim)">Vælg et spansk ord og derefter dets danske oversættelse 🃏</span>`));
    panel.appendChild(grid);panel.appendChild(scoreEl);
    function handleClick(item){
      if(item.classList.contains('matched'))return;
      if(!selected){selected=item;item.classList.add('selected');}
      else if(selected===item){selected.classList.remove('selected');selected=null;}
      else{
        const a=selected,b=item;
        a.classList.remove('selected');
        const aEs=a.dataset.lang==='es'?a.dataset.es:b.dataset.es;
        const bEs=b.dataset.lang==='es'?b.dataset.es:a.dataset.es;
        if(aEs===bEs){
          a.classList.add('matched');b.classList.add('matched');
          matched++;score++;
          scoreEl.textContent=score+' / '+pairs.length+' match';
          if(matched===pairs.length)scoreEl.textContent='🎉 Perfekt! Alle par fundet!';
        } else {
          a.classList.add('wrong-shake');b.classList.add('wrong-shake');
          setTimeout(()=>{a.classList.remove('wrong-shake');b.classList.remove('wrong-shake');},400);
        }
        selected=null;
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
    const questions=[];
    for(const w of chosen){
      const da=await myMemoryTranslate(w,'es|da');
      questions.push({es:w,da:da});
    }

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
        const w=this.dataset.w;
        if(window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(w);
          u.lang = 'es-ES';
          window.speechSynthesis.speak(u);
        }
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
    const questions=[];
    for(const w of chosen){
      const da=await myMemoryTranslate(w,'es|da');
      questions.push({es:w,da:da});
    }
    
    function scramble(word){
      const arr=word.split('');
      // Ensure scrambled !== original (try up to 10 times)
      for(let tries=0;tries<10;tries++){
        for(let i=arr.length-1;i>0;i--){
          const j=Math.floor(Math.random()*(i+1));
          [arr[i],arr[j]]=[arr[j],arr[i]];
        }
        if(arr.join('')!==word)break;
      }
      return arr.join('');
    }
    
    let score=0;
    const total=questions.length;
    
    let html=`
    <p style="font-size:.9rem;color:var(--text-dim);margin-bottom:1.5rem;line-height:1.6">
      🔤 <strong>Instruksjoner:</strong> Det blandede spanske ord passer til det danske ord i gult. Skriv det rigtige ord og tryk <em>Tjek</em>.
    </p>
    <div class="scr-score" id="scr-score" style="text-align:center;font-size:1rem;font-weight:600;color:var(--glow);margin-bottom:1rem">Score: 0 / ${total}</div>
    <div style="display:flex;flex-direction:column;gap:1.25rem">`;
    
    questions.forEach((q,i)=>{
      const scr=scramble(q.es);
      html+=`<div class="sent-q scr-q" data-ans="${q.es}" data-idx="${i}" style="background:rgba(255,255,255,.03);padding:1.5rem;border-radius:16px;border:1px solid var(--glass-border)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem">
          <span style="font-size:.85rem;color:var(--text-dim)">Dansk: <strong style="color:var(--glow);font-size:1rem">${q.da}</strong></span>
          <span style="font-size:.85rem;color:var(--text-dim)">Blandet: <strong style="letter-spacing:3px;font-size:1.1rem;color:#a78bfa">${scr}</strong></span>
        </div>
        <div style="display:flex;gap:.6rem;align-items:center">
          <input class="scr-input admin-input" type="text" placeholder="Skriv det rigtige ord…"
            style="flex:1;font-size:1rem;padding:.6rem 1rem;letter-spacing:1px"
            autocomplete="off" spellcheck="false" />
          <button class="save-btn scr-check" style="margin:0;padding:.6rem 1.1rem;font-size:.9rem;white-space:nowrap">Tjek ✓</button>
        </div>
        <div class="scr-res" style="font-size:.9rem;font-weight:500;min-height:1.4rem;margin-top:.6rem"></div>
      </div>`;
    });
    
    panel.innerHTML=html+`</div><button class="save-btn" id="scr-reset" style="margin-top:1.5rem">🔄 Nye ord</button>`;
    
    const scoreEl=document.getElementById('scr-score');
    function updateScore(){ scoreEl.textContent='Score: '+score+' / '+total; }
    
    panel.querySelectorAll('.scr-q').forEach(card=>{
      const inp=card.querySelector('.scr-input');
      const btn=card.querySelector('.scr-check');
      const res=card.querySelector('.scr-res');
      const ans=card.dataset.ans;
      
      function check(){
        if(card.dataset.done)return;
        const val=inp.value.trim().toLowerCase();
        card.dataset.done='true';
        inp.disabled=true;
        btn.disabled=true;
        btn.style.opacity='.5';
        if(val===ans.toLowerCase()){
          score++; updateScore();
          res.textContent='✅ Korrekt! «'+ans+'»';
          res.style.color='#4ade80';
          inp.style.borderColor='#22c55e';
        } else {
          res.textContent='❌ Det rigtige ord er: '+ans;
          res.style.color='#fca5a5';
          inp.style.borderColor='#ef4444';
        }
        if(score===total){
          scoreEl.textContent='🎉 Perfekt! Alle '+total+' ord korrekt!';
          scoreEl.style.color='#4ade80';
        }
      }
      
      btn.addEventListener('click',check);
      
inp.addEventListener('keydown',e=>{if(e.key==='Enter')check();});
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

/* ── INIT ──────────────────────────────────────────────── */
function init(){
  initAuth();
  initQuickDict();
  document.querySelectorAll('.menu-card').forEach(card=>{
    card.addEventListener('click',()=>{
      const view=card.dataset.view;
      if(view)transitionTo(view,card);
    });
  });
  $('back-btn').addEventListener('click',()=>transitionTo('home',null));
}
document.addEventListener('DOMContentLoaded',init);
})();
