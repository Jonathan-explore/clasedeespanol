// ═══════════════════════════════════════════════════════════════
//  LinguaStrike — game.js  ·  FASE 3
//  EliteEnemy · Chest · CaptureZone · OrbitalCrystals · RadialExplosion
//  Bullet Heaven · Lær Spansk · Dansk brugerflade
// ═══════════════════════════════════════════════════════════════
'use strict';

// ─── GLOBAL CONFIG ───────────────────────────────────────────
const CFG = {
  player: {
    radius:16, speed:260, maxHp:100,
    fireRateMs:480, projectileSpeed:520,
    projectileRadius:5, projectileDamage:40,
    invincibilityMs:700,
  },
  enemy: {
    radius:13, baseSpeed:68, spawnIntervalMs:850,
    damageOnContact:20, xpValue:14, hpBase:100,
  },
  elite: {
    // Keep for legacy color references only — stats are in EliteEnemy constructor
    auraColor:'rgba(255,100,0,0.55)',
    bodyColor:'#ff4800',
    spawnEveryNWaves:2,     // every 2 waves (wave 2, 4, 6…)
    firstEliteWave:2,       // earliest wave an elite can appear
  },
  xp: {
    orbRadius:7,
    basePerLevel:120,       // XP needed at level 1→2
    levelScaleExp:1.65,     // exponential factor per level
    magnetRadius:90, magnetSpeed:200,
    maxMultiplier:2.0,      // hard cap — can never exceed this
    maxMultiplierStacks:3,  // upgrade can only be picked 3 times total
  },
  wave: { durationMs:20000, spawnReduction:50, speedBoost:8 },
  orbital: {
    baseDamage:25, damageIntervalMs:500,
    baseCount:1, baseRadius:64,
    baseSpeed:2.2, crystalRadius:9,
  },
  explosion: {
    baseDamage:60, baseCooldownMs:5000,
    baseRadius:120, expandSpeed:380, ringDurationMs:450,
  },
  capture: {
    radius:70,
    captureTimeSec:4,
    spawnIntervalSec:35,    // every 35s (reduced from 40)
    marginPct:0.12,
  },
  colors: {
    bg:'#05080f', grid:'rgba(0,212,255,0.035)',
    player:'#00d4ff', playerGlow:'rgba(0,212,255,0.35)',
    enemy:'#ff2244',  enemyGlow:'rgba(255,34,68,0.28)',
    xpOrb:'#39ff14',  xpGlow:'rgba(57,255,20,0.4)',
    dmgFlash:'rgba(255,34,68,0.18)',
    crystal:'#bf5fff', crystalGlow:'rgba(191,95,255,0.6)',
    zone:'rgba(0,255,204,',
    orbital:'rgba(255,140,0,',
  },
};

// ─── QUESTION BANK ────────────────────────────────────────────
const QUESTIONS = [
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">æble</span> på spansk?',
   hint:'En rød eller grøn frugt',
   answers:['Naranja','Manzana','Plátano','Pera'],correct:1},
  {type:'translate-to-da',category:'Gloser',
   q:'Hvad betyder det spanske ord <span class="qword">mariposa</span>?',
   hint:'Et insekt med farverige vinger',
   answers:['Libelle','Bi','Sommerfugl','Møl'],correct:2},
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">vand</span> på spansk?',
   hint:'Det vigtigste stof for livet',
   answers:['Vino','Jugo','Leche','Agua'],correct:3},
  {type:'meaning',category:'Gloser',
   q:'Hvad betyder <span class="qword">amanecer</span>?',
   hint:'Tidspunktet når solen kommer frem',
   answers:['Midnat','Solnedgang','Solopgang / Daggry','Eftermiddag'],correct:2},
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">bibliotek</span> på spansk?',
   hint:'Pas på — det ligner engelsk, men er det ikke!',
   answers:['Librería','Biblioteca','Librero','Libro'],correct:1},
  {type:'meaning',category:'Gloser',
   q:'Hvad betyder <span class="qword">valiente</span>?',
   hint:'Tænk på en helt i et eventyr',
   answers:['Doven','Klog','Modig','Hurtig'],correct:2},
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">måne</span> på spansk?',
   hint:'Himmellegemet der lyser om natten',
   answers:['Sol','Estrella','Nube','Luna'],correct:3},
  {type:'meaning',category:'Gloser',
   q:'Hvad betyder <span class="qword">extrañar</span>?',
   hint:'Følelsen du har, når nogen er langt væk',
   answers:['At hade','At savne','At glemme','At finde'],correct:1},
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">hund</span> på spansk?',
   answers:['Gato','Pájaro','Perro','Caballo'],correct:2},
  {type:'translate-to-es',category:'Gloser',
   q:'Hvad hedder <span class="qword">hus</span> på spansk?',
   answers:['Jardín','Casa','Calle','Ciudad'],correct:1},
  {type:'translate-to-da',category:'Gloser',
   q:'Hvad betyder <span class="qword">hermoso</span>?',
   answers:['Stærk','Smuk','Hurtig','Gammel'],correct:1},
  {type:'translate-to-da',category:'Gloser',
   q:'Hvad betyder <span class="qword">nunca</span>?',
   hint:'Det modsatte af "altid"',
   answers:['Altid','Nogle gange','Aldrig','Snart'],correct:2},
  {type:'fill-blank',category:'Sætninger',
   q:'Udfyld blanket: <span class="qword">¿Cómo te ___?</span> (Hvad hedder du?)',
   hint:'Det spanske ord for "hedder" (2. person)',
   answers:['llamas','eres','tienes','haces'],correct:0},
  {type:'fill-blank',category:'Sætninger',
   q:'Udfyld blanket: <span class="qword">Yo ___ estudiante.</span> (Jeg er elev.)',
   hint:'"Jeg er" på spansk = Yo ___',
   answers:['tengo','estoy','soy','hago'],correct:2},
  {type:'fill-blank',category:'Sætninger',
   q:'Udfyld blanket: <span class="qword">Buenos ___, ¿cómo estás?</span>',
   hint:'"God morgen" på spansk',
   answers:['tardes','noches','días','años'],correct:2},
  {type:'meaning',category:'Sætninger',
   q:'Hvad betyder <span class="qword">¿Dónde está el baño?</span>',
   hint:'En meget nyttig sætning på rejse!',
   answers:['Hvornår spiser vi?','Hvor er toilettet?','Hvad koster det?','Kan du hjælpe mig?'],correct:1},
  {type:'meaning',category:'Sætninger',
   q:'Hvad betyder <span class="qword">¡Mucho gusto!</span>?',
   answers:['Hej da!','Det var lækkert!','Meget fornøjet!','Held og lykke!'],correct:2},
  {type:'translate-to-es',category:'Tal & Farver',
   q:'Hvad hedder farven <span class="qword">rød</span> på spansk?',
   answers:['Azul','Verde','Rojo','Amarillo'],correct:2},
  {type:'translate-to-es',category:'Tal & Farver',
   q:'Hvad hedder tallet <span class="qword">syv</span> på spansk?',
   answers:['Cinco','Seis','Ocho','Siete'],correct:3},
  {type:'translate-to-da',category:'Tal & Farver',
   q:'Hvad betyder <span class="qword">veinte</span>?',
   answers:['To','Tolv','Tyve','Tohundrede'],correct:2},
  {type:'translate-to-es',category:'Tal & Farver',
   q:'Hvad hedder farven <span class="qword">gul</span> på spansk?',
   answers:['Verde','Azul','Rojo','Amarillo'],correct:3},
  {type:'meaning',category:'Tal & Farver',
   q:'Hvad betyder <span class="qword">cien</span>?',
   answers:['Ti','Hundrede','Tusind','Halvtreds'],correct:1},
];

// ─── UPGRADE POOL ─────────────────────────────────────────────
// Rarity tiers: common | rare | epic | legendary
// Each entry: id, icon, name, rarity, desc, tpClass,
//             baseText, bonusText, applyBase(g), applyBonus(g), [available(g)]
const UPGRADE_POOL = [

  // ── STAT UPGRADES (always available) ────────────────────────
  { id:'proj+1', icon:'🔫', name:'Ekstra Projektil', rarity:'common',
    desc:'Skyder på én ekstra fjende pr. salve', tpClass:'tp-up',
    baseText:'+1 projektil', bonusText:'+2 projektiler',
    applyBase(g){g.player.numProjectiles+=1},
    applyBonus(g){g.player.numProjectiles+=2} },

  { id:'proj-spd', icon:'⚡', name:'Hurtigere Skydning', rarity:'common',
    desc:'Reducerer afventing mellem skud', tpClass:'tp-up',
    baseText:'−40ms cooldown', bonusText:'−80ms cooldown',
    applyBase(g){CFG.player.fireRateMs=Math.max(100,CFG.player.fireRateMs-40)},
    applyBonus(g){CFG.player.fireRateMs=Math.max(100,CFG.player.fireRateMs-80)} },

  { id:'speed+', icon:'👟', name:'Fart Boost', rarity:'common',
    desc:'Øger spillerens bevægelseshastighed', tpClass:'tp-stat',
    baseText:'+20% hastighed', bonusText:'+40% hastighed',
    applyBase(g){g.player.speed=Math.min(450,g.player.speed*1.20)},
    applyBonus(g){g.player.speed=Math.min(450,g.player.speed*1.40)} },

  { id:'heal', icon:'❤️', name:'Nødhelbredelse', rarity:'common',
    desc:'Genopretter en del af dit helbred', tpClass:'tp-stat',
    baseText:'+40 HP', bonusText:'+80 HP',
    applyBase(g){g.player.hp=Math.min(g.player.maxHp,g.player.hp+40)},
    applyBonus(g){g.player.hp=Math.min(g.player.maxHp,g.player.hp+80)} },

  { id:'maxhp', icon:'🛡️', name:'Forstærket Rustning', rarity:'common',
    desc:'Øger dit maksimale helbred permanent', tpClass:'tp-stat',
    baseText:'+25 max HP', bonusText:'+50 max HP',
    applyBase(g){g.player.maxHp+=25;g.player.hp=Math.min(g.player.hp+25,g.player.maxHp)},
    applyBonus(g){g.player.maxHp+=50;g.player.hp=Math.min(g.player.hp+50,g.player.maxHp)} },

  { id:'xp-mult', icon:'✨', name:'XP Forstærker', rarity:'common',
    desc:`XP-kugler giver mere (maks ${CFG.xp.maxMultiplierStacks} opgraderinger)`, tpClass:'tp-stat',
    baseText:'XP +25%', bonusText:'XP +50%',
    applyBase(g){
      g.xpMultiplierStacks=(g.xpMultiplierStacks||0)+1;
      g.xpMultiplier=Math.min(CFG.xp.maxMultiplier,1+g.xpMultiplierStacks*0.25);
    },
    applyBonus(g){
      g.xpMultiplierStacks=(g.xpMultiplierStacks||0)+1;
      g.xpMultiplier=Math.min(CFG.xp.maxMultiplier,1+g.xpMultiplierStacks*0.5);
    },
    available(g){ return (g.xpMultiplierStacks||0)<CFG.xp.maxMultiplierStacks } },

  // ── ORBITAL CRYSTALS (existing) ──────────────────────────────
  { id:'orb', icon:'💎', name:'Orbitale Krystaller', rarity:'rare',
    desc:'Krystaller roterer rundt om dig og skader fjender ved kontakt', tpClass:'tp-new',
    baseText:'+1 krystal', bonusText:'+2 krystaller',
    applyBase(g){if(!g.orbWeapon)g.orbWeapon=new OrbitalCrystals(g.player);g.orbWeapon.addCrystals(1)},
    applyBonus(g){if(!g.orbWeapon)g.orbWeapon=new OrbitalCrystals(g.player);g.orbWeapon.addCrystals(2)} },

  { id:'orb-spd', icon:'🌀', name:'Krystalrotation', rarity:'rare',
    desc:'Krystallerne roterer hurtigere med større radius', tpClass:'tp-up',
    baseText:'+30% rotationshastighed', bonusText:'+60% hastighed + radius +20',
    applyBase(g){if(g.orbWeapon)g.orbWeapon.speed*=1.30},
    applyBonus(g){if(g.orbWeapon){g.orbWeapon.speed*=1.60;g.orbWeapon.orbitRadius+=20}},
    available(g){return!!g.orbWeapon} },

  // ── RADIAL EXPLOSION (existing) ──────────────────────────────
  { id:'exp', icon:'💥', name:'Radial Eksplosion', rarity:'epic',
    desc:'Periodisk shockwave der skader alle nærliggende fjender', tpClass:'tp-new',
    baseText:'Eksplosion niveau 1', bonusText:'Eksplosion niveau 2 (større + mere skade)',
    applyBase(g){if(!g.expWeapon)g.expWeapon=new RadialExplosion(g)},
    applyBonus(g){if(!g.expWeapon)g.expWeapon=new RadialExplosion(g);g.expWeapon.levelUp()} },

  { id:'exp-up', icon:'🔥', name:'Eksplosion Opgradering', rarity:'epic',
    desc:'Reducerer nedkøling og øger skade + radius', tpClass:'tp-up',
    baseText:'Cooldown −1s · Radius +30', bonusText:'Cooldown −2s · Radius +60 · Skade +30',
    applyBase(g){if(g.expWeapon)g.expWeapon.levelUp()},
    applyBonus(g){if(g.expWeapon){g.expWeapon.levelUp();g.expWeapon.levelUp()}},
    available(g){return!!g.expWeapon} },

  // ══ ANIMA SQUAD WEAPONS ══════════════════════════════════════

  // ── 3 ANIMA — Blade-o-rang ───────────────────────────────────
  { id:'blade', icon:'🪃', name:'Blade-o-rang', rarity:'rare',
    desc:'Hvert 4. sekund kastes et boomerang der rammer fjender frem og tilbage',
    tpClass:'tp-new',
    baseText:'Boomerang niveau 1 (1 boldbane)', bonusText:'Boomerang niveau 2 (hurtigere + mere skade)',
    applyBase(g){if(!g.bladeWeapon)g.bladeWeapon=new BladeORang(g)},
    applyBonus(g){if(!g.bladeWeapon)g.bladeWeapon=new BladeORang(g);g.bladeWeapon.levelUp()} },

  { id:'blade-up', icon:'🪃', name:'Blade-o-rang Opgradering', rarity:'rare',
    desc:'Boomeranget flyver hurtigere og gør mere skade', tpClass:'tp-up',
    baseText:'+30 skade · −0.5s cooldown', bonusText:'+60 skade · −1s cooldown · +1 boldbane',
    applyBase(g){if(g.bladeWeapon)g.bladeWeapon.levelUp()},
    applyBonus(g){if(g.bladeWeapon){g.bladeWeapon.levelUp();g.bladeWeapon.extraPasses++}},
    available(g){return!!g.bladeWeapon} },

  // ── 3 ANIMA — Guiding Hex ────────────────────────────────────
  { id:'hex', icon:'🔮', name:'Guiding Hex', rarity:'rare',
    desc:'Hvert 4. sekund rammes 3 tilfældige fjender med magisk skade',
    tpClass:'tp-new',
    baseText:'Hex niveau 1 (3 mål)', bonusText:'Hex niveau 2 (5 mål + mere skade)',
    applyBase(g){if(!g.hexWeapon)g.hexWeapon=new GuidingHex(g)},
    applyBonus(g){if(!g.hexWeapon)g.hexWeapon=new GuidingHex(g);g.hexWeapon.levelUp()} },

  { id:'hex-up', icon:'🔮', name:'Guiding Hex Opgradering', rarity:'rare',
    desc:'Rammer flere fjender med større skade', tpClass:'tp-up',
    baseText:'+2 mål · +30 skade', bonusText:'+4 mål · +60 skade',
    applyBase(g){if(g.hexWeapon){g.hexWeapon.targets+=2;g.hexWeapon.damage+=30}},
    applyBonus(g){if(g.hexWeapon){g.hexWeapon.targets+=4;g.hexWeapon.damage+=60}},
    available(g){return!!g.hexWeapon} },

  // ── 3 ANIMA — UwU Blasters ───────────────────────────────────
  { id:'uwu', icon:'🌸', name:'UwU Blasters', rarity:'common',
    desc:'Hvert 4. sekund affyres en hurtig salve mod nærmeste fjende',
    tpClass:'tp-new',
    baseText:'UwU niveau 1 (3 skud pr. salve)', bonusText:'UwU niveau 2 (5 skud pr. salve)',
    applyBase(g){if(!g.uwuWeapon)g.uwuWeapon=new UwUBlasters(g)},
    applyBonus(g){if(!g.uwuWeapon)g.uwuWeapon=new UwUBlasters(g);g.uwuWeapon.levelUp()} },

  { id:'uwu-up', icon:'🌸', name:'UwU Blasters Opgradering', rarity:'common',
    desc:'Flere skud pr. salve og hurtigere skudhastighed', tpClass:'tp-up',
    baseText:'+2 skud pr. salve', bonusText:'+4 skud pr. salve · −0.4s cooldown',
    applyBase(g){if(g.uwuWeapon)g.uwuWeapon.bulletsPerBurst+=2},
    applyBonus(g){if(g.uwuWeapon){g.uwuWeapon.bulletsPerBurst+=4;g.uwuWeapon.cooldownMs=Math.max(800,g.uwuWeapon.cooldownMs-400)}},
    available(g){return!!g.uwuWeapon} },

  // ── 5 ANIMA — Ani-Mines ──────────────────────────────────────
  { id:'mines', icon:'💣', name:'Ani-Mines', rarity:'epic',
    desc:'Hvert 5. sekund kastes 3 miner der eksploderer ved fjendekontakt',
    tpClass:'tp-new',
    baseText:'Miner niveau 1 (3 miner · 80 skade)', bonusText:'Miner niveau 2 (5 miner · 120 skade)',
    applyBase(g){if(!g.mineWeapon)g.mineWeapon=new AniMines(g)},
    applyBonus(g){if(!g.mineWeapon)g.mineWeapon=new AniMines(g);g.mineWeapon.levelUp()} },

  { id:'mines-up', icon:'💣', name:'Ani-Mines Opgradering', rarity:'epic',
    desc:'Større eksplosionsradius og mere skade', tpClass:'tp-up',
    baseText:'+2 miner · +40 skade', bonusText:'+4 miner · +80 skade · Radius +20',
    applyBase(g){if(g.mineWeapon){g.mineWeapon.count+=2;g.mineWeapon.damage+=40}},
    applyBonus(g){if(g.mineWeapon){g.mineWeapon.count+=4;g.mineWeapon.damage+=80;g.mineWeapon.blastRadius+=20}},
    available(g){return!!g.mineWeapon} },

  // ── 5 ANIMA — Vortex Glove ───────────────────────────────────
  { id:'vortex', icon:'🌪️', name:'Vortex Glove', rarity:'epic',
    desc:'Hvert 5. sekund affyres en gennemtrængende orb der rammer alle fjender i linjen',
    tpClass:'tp-new',
    baseText:'Vortex niveau 1 (1 orb)', bonusText:'Vortex niveau 2 (2 orbs · mere skade)',
    applyBase(g){if(!g.vortexWeapon)g.vortexWeapon=new VortexGlove(g)},
    applyBonus(g){if(!g.vortexWeapon)g.vortexWeapon=new VortexGlove(g);g.vortexWeapon.levelUp()} },

  { id:'vortex-up', icon:'🌪️', name:'Vortex Glove Opgradering', rarity:'epic',
    desc:'Orberne bevæger sig hurtigere og gør mere skade', tpClass:'tp-up',
    baseText:'+1 orb · +40 skade', bonusText:'+2 orbs · +80 skade · +30% hastighed',
    applyBase(g){if(g.vortexWeapon){g.vortexWeapon.orbCount++;g.vortexWeapon.damage+=40}},
    applyBonus(g){if(g.vortexWeapon){g.vortexWeapon.orbCount+=2;g.vortexWeapon.damage+=80;g.vortexWeapon.speed*=1.30}},
    available(g){return!!g.vortexWeapon} },

  // ── 7 ANIMA — Gatling Bunny-Guns ─────────────────────────────
  { id:'gatling', icon:'🐰', name:'Gatling Bunny-Guns', rarity:'legendary',
    desc:'Hvert 5.5 sekund affyres en kegle af projektiler der gør stor fysisk skade',
    tpClass:'tp-new',
    baseText:'Gatling niveau 1 (6 projektiler)', bonusText:'Gatling niveau 2 (10 projektiler)',
    applyBase(g){if(!g.gatlingWeapon)g.gatlingWeapon=new GatlingBunnyGuns(g)},
    applyBonus(g){if(!g.gatlingWeapon)g.gatlingWeapon=new GatlingBunnyGuns(g);g.gatlingWeapon.levelUp()} },

  { id:'gatling-up', icon:'🐰', name:'Gatling Opgradering', rarity:'legendary',
    desc:'Bredere kegle og kraftigere projektiler', tpClass:'tp-up',
    baseText:'+4 projektiler · +20 skade', bonusText:'+8 projektiler · +40 skade · Bredere kegle',
    applyBase(g){if(g.gatlingWeapon){g.gatlingWeapon.bulletCount+=4;g.gatlingWeapon.damage+=20}},
    applyBonus(g){if(g.gatlingWeapon){g.gatlingWeapon.bulletCount+=8;g.gatlingWeapon.damage+=40;g.gatlingWeapon.spreadAngle+=0.15}},
    available(g){return!!g.gatlingWeapon} },

  // ── 7 ANIMA — Tornadoes ──────────────────────────────────────
  { id:'tornado', icon:'🌀', name:'Tornadoes', rarity:'legendary',
    desc:'Hvert 6. sekund spawnes en tornado der tiltrækker og skader fjender',
    tpClass:'tp-new',
    baseText:'Tornado niveau 1 (1 tornado)', bonusText:'Tornado niveau 2 (2 tornadoer)',
    applyBase(g){if(!g.tornadoWeapon)g.tornadoWeapon=new TornadoWeapon(g)},
    applyBonus(g){if(!g.tornadoWeapon)g.tornadoWeapon=new TornadoWeapon(g);g.tornadoWeapon.levelUp()} },

  { id:'tornado-up', icon:'🌀', name:'Tornado Opgradering', rarity:'legendary',
    desc:'Tornadoerne er større og varer længere', tpClass:'tp-up',
    baseText:'+1 tornado · +40 skade', bonusText:'+2 tornadoer · +80 skade · +1s varighed',
    applyBase(g){if(g.tornadoWeapon){g.tornadoWeapon.maxCount++;g.tornadoWeapon.damage+=40}},
    applyBonus(g){if(g.tornadoWeapon){g.tornadoWeapon.maxCount+=2;g.tornadoWeapon.damage+=80;g.tornadoWeapon.duration+=1}},
    available(g){return!!g.tornadoWeapon} },

];

// ─── UTILITIES ────────────────────────────────────────────────
const dist    = (a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const clamp   = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const rand    = (mn,mx)=>mn+Math.random()*(mx-mn);
const randInt = (mn,mx)=>Math.floor(rand(mn,mx));
const shuffle = arr=>{for(let i=arr.length-1;i>0;i--){const j=randInt(0,i+1);[arr[i],arr[j]]=[arr[j],arr[i]]}return arr};

function glow(ctx,color,blur){ctx.shadowColor=color;ctx.shadowBlur=blur}
function noGlow(ctx){ctx.shadowBlur=0;ctx.shadowColor='transparent'}
function compact(arr){let j=0;for(let i=0;i<arr.length;i++){if(arr[i].alive)arr[j++]=arr[i];}arr.length=j;}
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

// Supabase client reused from the SPA (same credentials)
// Requires table: linguastrike_scores (id PK, alias text, score int, wave int, power int, created_at timestamptz)
let _lsDb=null;
function lsGetDb(){
  if(!_lsDb){
    // Reuse the SPA's shared client (window._sbClient, set by script.js);
    // only create one here as fallback to avoid duplicate GoTrueClient instances
    if(window._sbClient)_lsDb=window._sbClient;
    else if(window.supabase)
      _lsDb=window._sbClient=window.supabase.createClient('https://akontludfisgxwlnayvs.supabase.co','sb_publishable_qQ2lCD9UTN77IGsvNi6X5g_LXBeLTkq');
  }
  return _lsDb||null;
}


// ══════════════════════════════════════════════════════════════
//  CLASS: DamageNumber
// ══════════════════════════════════════════════════════════════
class DamageNumber {
  constructor(x,y,text,color='#fff'){
    this.x=x;this.y=y;this.vy=-80-rand(0,40);
    this.life=1;this.text=text;this.color=color;
  }
  get alive(){return this.life>0}
  update(dt){this.y+=this.vy*dt;this.vy*=0.92;this.life-=dt*1.8}
  draw(ctx){
    ctx.globalAlpha=Math.max(0,this.life);
    ctx.font='bold 13px "Share Tech Mono"';
    ctx.fillStyle=this.color;ctx.textAlign='center';
    ctx.fillText(this.text,this.x,this.y);
    ctx.globalAlpha=1;
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Particle
// ══════════════════════════════════════════════════════════════
class Particle {
  constructor(x,y,color,speed=[60,200],size=[1.5,3.5]){
    this.x=x;this.y=y;
    const a=rand(0,Math.PI*2),s=rand(speed[0],speed[1]);
    this.vx=Math.cos(a)*s;this.vy=Math.sin(a)*s;
    this.r=rand(size[0],size[1]);this.life=1;
    this.decay=rand(1.6,3.2);this.color=color;
  }
  get alive(){return this.life>0}
  update(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;this.vx*=0.94;this.vy*=0.94;this.life-=this.decay*dt}
  draw(ctx){
    ctx.globalAlpha=Math.max(0,this.life);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=this.color;ctx.fill();ctx.globalAlpha=1;
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: XpOrb
// ══════════════════════════════════════════════════════════════
class XpOrb {
  constructor(x,y){
    this.x=x;this.y=y;this.r=CFG.xp.orbRadius;
    this.alive=true;this.bob=rand(0,Math.PI*2);this.vx=0;this.vy=0;
  }
  update(dt,player){
    const d=dist(this,player);
    if(d<CFG.xp.magnetRadius){
      const a=Math.atan2(player.y-this.y,player.x-this.x);
      const pull=CFG.xp.magnetSpeed*(1-d/CFG.xp.magnetRadius);
      this.vx+=Math.cos(a)*pull*dt*8;this.vy+=Math.sin(a)*pull*dt*8;
    }
    this.vx*=0.88;this.vy*=0.88;this.x+=this.vx*dt;this.y+=this.vy*dt;
  }
  draw(ctx,now){
    const b=Math.sin(now*0.004+this.bob)*2.5;
    ctx.beginPath();ctx.arc(this.x,this.y+b,this.r,0,Math.PI*2);
    ctx.fillStyle=CFG.colors.xpOrb;ctx.fill();
    ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(this.x-1.5,this.y+b-1.5,this.r*0.35,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.65)';ctx.fill();
    ctx.shadowBlur=8;
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Projectile
// ══════════════════════════════════════════════════════════════
class Projectile {
  constructor(x,y,angle){
    this.x=x;this.y=y;this.angle=angle;
    this.r=CFG.player.projectileRadius;
    this.speed=CFG.player.projectileSpeed;
    this.damage=CFG.player.projectileDamage;
    this.alive=true;this.trail=[];
  }
  update(dt,W,H){
    this.trail.push({x:this.x,y:this.y});
    if(this.trail.length>6)this.trail.shift();
    this.x+=Math.cos(this.angle)*this.speed*dt;
    this.y+=Math.sin(this.angle)*this.speed*dt;
    if(this.x<-30||this.x>W+30||this.y<-30||this.y>H+30)this.alive=false;
  }
  drawTrail(ctx){
    for(let i=0;i<this.trail.length;i++){
      const t=this.trail[i];
      ctx.globalAlpha=(i/this.trail.length)*0.28;
      ctx.beginPath();ctx.arc(t.x,t.y,this.r*0.6,0,Math.PI*2);
      ctx.fillStyle='#88ddff';ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  draw(ctx){this.drawTrail(ctx);glow(ctx,'#aaeeff',10);ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();noGlow(ctx);}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Enemy
// ══════════════════════════════════════════════════════════════
class Enemy {
  constructor(x,y,speed,wave=1){
    this.x=x;this.y=y;this.r=CFG.enemy.radius;
    this.speed=speed;
    this.maxHp=CFG.enemy.hpBase+wave*12;this.hp=this.maxHp;
    this.alive=true;this.flashTimer=0;
    this.angle=0;this.rotSpeed=rand(-2,2);
    this.orbDmgTimer=rand(0,CFG.orbital.damageIntervalMs);
    this.isElite=false;
  }
  update(dt,player){
    const a=Math.atan2(player.y-this.y,player.x-this.x);
    this.x+=Math.cos(a)*this.speed*dt;this.y+=Math.sin(a)*this.speed*dt;
    this.angle+=this.rotSpeed*dt;
    if(this.flashTimer>0)this.flashTimer-=dt*1000;
  }
  hit(damage){
    if(!this.alive)return{died:false};  // ignore hits on already-dead enemies
    this.hp-=damage;this.flashTimer=90;
    if(this.hp<=0)this.alive=false;
    return{died:!this.alive};
  }
  draw(ctx){
    const flash=this.flashTimer>0,half=this.r;
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
    glow(ctx,flash?'#fff':CFG.colors.enemyGlow,flash?14:5);
    ctx.fillStyle=flash?'#fff':CFG.colors.enemy;
    ctx.fillRect(-half,-half,half*2,half*2);noGlow(ctx);
    if(this.hp<this.maxHp){
      const bw=half*2,bh=3,bx=-half,by=-half-7;
      ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(bx,by,bw,bh);
      ctx.fillStyle='#39ff14';ctx.fillRect(bx,by,bw*(this.hp/this.maxHp),bh);
    }
    ctx.strokeStyle=flash?'rgba(255,100,100,0.4)':'rgba(255,80,100,0.5)';
    ctx.lineWidth=1;ctx.strokeRect(-half+3,-half+3,(half-3)*2,(half-3)*2);
    ctx.restore();
  }
}

// ══════════════════════════════════════════════════════════════
//  ELITE BUFF POOL — applied to player on elite kill
// ══════════════════════════════════════════════════════════════
const ELITE_BUFFS = [
  { id:'xp-magnet', icon:'🧲', name:'XP Magnet',
    desc:'XP-kuglers tiltrækningsradius fordobles',
    apply(g){ CFG.xp.magnetRadius=Math.min(300,CFG.xp.magnetRadius*2) } },
  { id:'shield', icon:'🛡', name:'Slag Beskyttelse',
    desc:'Næste 3 fjendeangreb ignoreres',
    apply(g){ g.player.shieldHits=(g.player.shieldHits||0)+3 } },
  { id:'atk-spd', icon:'⚡', name:'Angrebshastighed +',
    desc:'Skudhastighed reduceres med 60ms',
    apply(g){ CFG.player.fireRateMs=Math.max(80,CFG.player.fireRateMs-60) } },
  { id:'dmg+', icon:'🔥', name:'Skade +',
    desc:'Projektilskade +20 permanent',
    apply(g){ CFG.player.projectileDamage+=20 } },
  { id:'heal', icon:'❤️', name:'Helbredelse',
    desc:'Genopret 50 HP',
    apply(g){ g.player.hp=Math.min(g.player.maxHp,g.player.hp+50) } },
  { id:'xp-boost', icon:'✨', name:'XP Boost (20s)',
    desc:'XP multiplikator +50% i 20 sekunder (forlænges ved gentagen aktivering)',
    apply(g){
      // Extend duration instead of creating new timer — clears old one safely
      g.xpMultiplier=Math.min(CFG.xp.maxMultiplier, g.xpMultiplier+0.5);
      if(g._xpBoostTimer) clearTimeout(g._xpBoostTimer);
      g._xpBoostTimer=setTimeout(()=>{
        g.xpMultiplier=Math.max(1, g.xpMultiplier-0.5);
        g._xpBoostTimer=null;
      }, 20000);
    } },
  { id:'proj+', icon:'🔫', name:'Ekstra Projektil',
    desc:'+1 projektil permanent',
    apply(g){ g.player.numProjectiles+=1 } },
  { id:'speed+', icon:'👟', name:'Fart Boost',
    desc:'Bevægelseshastighed +15%',
    apply(g){ g.player.speed=Math.min(500,g.player.speed*1.15) } },
  { id:'maxhp+', icon:'💪', name:'Max Helbred +',
    desc:'Max HP +40 permanent',
    apply(g){ g.player.maxHp+=40;g.player.hp=Math.min(g.player.hp+40,g.player.maxHp) } },
];

// ══════════════════════════════════════════════════════════════
//  CLASS: EliteLaser  — full-screen laser beam visual
// ══════════════════════════════════════════════════════════════
class EliteLaser {
  constructor(sx,sy,angle,W,H,damage){
    this.sx=sx;this.sy=sy;this.angle=angle;this.W=W;this.H=H;
    this.damage=damage;this.alive=true;
    // Phase: 'warning' → 'fire' → 'fade'
    this.phase='warning';
    this.warningDuration=1.2;  // sec red line warning
    this.fireDuration=0.25;    // sec actual laser
    this.fadeDuration=0.4;
    this.age=0;
    this.hitDealt=false;
    // Compute endpoint far beyond screen
    const big=Math.max(W,H)*2;
    this.ex=sx+Math.cos(angle)*big;
    this.ey=sy+Math.sin(angle)*big;
    // Also backward for full-screen pierce
    this.bx=sx+Math.cos(angle+Math.PI)*big;
    this.by=sy+Math.sin(angle+Math.PI)*big;
  }
  get totalDuration(){return this.warningDuration+this.fireDuration+this.fadeDuration}
  update(dt){
    this.age+=dt;
    if(this.phase==='warning'&&this.age>=this.warningDuration){this.phase='fire';this.age=0}
    else if(this.phase==='fire'&&this.age>=this.fireDuration){this.phase='fade';this.age=0;this.hitDealt=false}
    else if(this.phase==='fade'&&this.age>=this.fadeDuration){this.alive=false}
  }
  // Returns true during fire phase (caller deals damage once)
  shouldDealDamage(){return this.phase==='fire'&&!this.hitDealt}
  markDamageDealt(){this.hitDealt=true}
  // Check if a point is close to the laser line
  hitsPoint(px,py,threshold=18){
    // Distance from point to infinite line through (sx,sy) with angle
    const dx=Math.cos(this.angle),dy=Math.sin(this.angle);
    const ex=px-this.sx,ey=py-this.sy;
    const cross=Math.abs(ex*dy-ey*dx);
    return cross<threshold;
  }
  draw(ctx){
    if(this.phase==='warning'){
      const blink=Math.floor(this.age/0.12)%2===0;
      const a=blink?0.6:0.2;
      ctx.beginPath();ctx.moveTo(this.bx,this.by);ctx.lineTo(this.ex,this.ey);
      ctx.strokeStyle=`rgba(255,50,50,${a})`;ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();
      ctx.setLineDash([]);noGlow(ctx);
    } else if(this.phase==='fire'){
      const t=this.age/this.fireDuration;
      glow(ctx,'rgba(255,80,80,0.9)',30);
      ctx.beginPath();ctx.moveTo(this.bx,this.by);ctx.lineTo(this.ex,this.ey);
      ctx.strokeStyle=`rgba(255,120,120,0.95)`;ctx.lineWidth=6;ctx.stroke();
      glow(ctx,'rgba(255,200,200,0.7)',16);
      ctx.beginPath();ctx.moveTo(this.bx,this.by);ctx.lineTo(this.ex,this.ey);
      ctx.strokeStyle=`rgba(255,255,255,0.9)`;ctx.lineWidth=2;ctx.stroke();
      noGlow(ctx);
    } else {
      const a=Math.max(0,1-this.age/this.fadeDuration)*0.5;
      ctx.beginPath();ctx.moveTo(this.bx,this.by);ctx.lineTo(this.ex,this.ey);
      ctx.strokeStyle=`rgba(255,120,120,${a})`;ctx.lineWidth=3;ctx.stroke();
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: EliteEnemy  — base for all 3 tiers
//   tier 1 "Vagt"    — easy,   1 buff drop, orange
//   tier 2 "Kaptajn" — medium, 2 buff drops, purple
//   tier 3 "Herre"   — hard,   3 buff drops, gold
// ══════════════════════════════════════════════════════════════
class EliteEnemy extends Enemy {
  // tier: 1 | 2 | 3
  constructor(x,y,wave=1,tier=1){
    // Slower than normal enemies, speed depends on tier
    const tierSpeedMult=[0,0.55,0.48,0.40][tier];
    const baseSpeed=(CFG.enemy.baseSpeed+(wave-1)*CFG.wave.speedBoost)*tierSpeedMult;
    super(x,y,baseSpeed,wave);

    this.tier=tier;
    this.isElite=true;
    this.rotSpeed=rand(-0.5,0.5);
    this.auraPulse=0;
    this.orbDmgTimer=rand(0,CFG.orbital.damageIntervalMs);

    // ── Tier stats ───────────────────────────────────────────
    const tierDefs=[null,
      { // Tier 1: Vagt (Guard)
        hpMult:8, radiusMult:1.7, damageMult:1.5, xpMult:3,
        buffCount:1, laserCooldownMs:12000, laserDamage:25,
        label:'VAGT', color:'#ff6400', aura:'rgba(255,100,0,',
        glowColor:'rgba(255,90,0,0.6)',
      },
      { // Tier 2: Kaptajn (Captain)
        hpMult:15, radiusMult:2.2, damageMult:2, xpMult:5,
        buffCount:2, laserCooldownMs:8000, laserDamage:35,
        label:'KAPTAJN', color:'#aa44ff', aura:'rgba(160,60,255,',
        glowColor:'rgba(150,50,255,0.65)',
      },
      { // Tier 3: Herre (Lord)
        hpMult:25, radiusMult:2.8, damageMult:3, xpMult:8,
        buffCount:4, laserCooldownMs:5000, laserDamage:50,
        label:'HERRE', color:'#ffd700', aura:'rgba(255,215,0,',
        glowColor:'rgba(255,200,0,0.7)',
      },
    ];
    const def=tierDefs[tier];
    Object.assign(this,def);

    // Scale with player level (passed in as wave proxy)
    const lvlMult=1+wave*0.08;
    this.r=CFG.enemy.radius*this.radiusMult;
    this.maxHp=(CFG.enemy.hpBase+wave*12)*this.hpMult*lvlMult;
    this.hp=this.maxHp;
    this.damageOnContact=CFG.enemy.damageOnContact*this.damageMult;

    // Laser
    this.laserTimer=this.laserCooldownMs*rand(0.4,0.8); // offset first fire
    this.activeLasers=[];

    // Difficulty scaling: tier 3 gets faster laser over time
    this.laserCooldownBase=this.laserCooldownMs;
  }

  // Call after player levels up — makes existing elites scale up
  scaleWithLevel(playerLevel){
    const bonus=playerLevel*0.05;
    this.speed=Math.min(this.speed*(1+bonus*0.3),200);
    this.laserCooldownMs=Math.max(2500,this.laserCooldownBase*(1-bonus*0.15));
    this.laserDamage=this.laserDamage+playerLevel*2;
  }

  update(dt,player,W,H){
    super.update(dt,player);
    this.auraPulse+=dt*2;

    // Laser logic
    this.laserTimer-=dt*1000;
    if(this.laserTimer<=0&&this.alive){
      this.laserTimer=this.laserCooldownMs;
      // Aim toward player
      const angle=Math.atan2(player.y-this.y,player.x-this.x);
      this.activeLasers.push(new EliteLaser(this.x,this.y,angle,W,H,this.laserDamage));
    }

    for(const laser of this.activeLasers)laser.update(dt);
    this.activeLasers=this.activeLasers.filter(l=>l.alive);
  }

  // Override — pass W,H needed for laser
  // (called from Game with extra args)
  checkLaserHit(player){
    for(const laser of this.activeLasers){
      if(laser.shouldDealDamage()&&laser.hitsPoint(player.x,player.y)){
        laser.markDamageDealt();
        return laser.laserDamage;
      }
    }
    return 0;
  }

  // Pick random buffs to drop on death — hard cap enforced by difficulty
  getDeathBuffs(){
    const isHighDiff=this.tier>=3;
    const cap=isHighDiff?4:2;
    const count=Math.min(this.buffCount,cap);
    const pool=shuffle([...ELITE_BUFFS]);
    return pool.slice(0,count);
  }

  draw(ctx,now){
    const flash=this.flashTimer>0;
    const half=this.r;
    const auraPct=(Math.sin(this.auraPulse)+1)*0.5;

    ctx.save();ctx.translate(this.x,this.y);

    // ── Aura ─────────────────────────────────────────────────
    const auraR=half+12+auraPct*8;
    for(let ring=0;ring<this.tier+1;ring++){
      const rAngle=this.angle+ring*(Math.PI*2/(this.tier+1));
      glow(ctx,this.aura+'0.5)',18+ring*4);
      ctx.beginPath();
      ctx.arc(Math.cos(rAngle)*5,Math.sin(rAngle)*5,auraR,0,Math.PI*2);
      ctx.strokeStyle=this.aura+(0.15+auraPct*0.2)+')';ctx.lineWidth=2;ctx.stroke();
    }

    // Outer radial gradient
    ctx.beginPath();ctx.arc(0,0,half+10+auraPct*5,0,Math.PI*2);
    const g2=ctx.createRadialGradient(0,0,0,0,0,half+10+auraPct*5);
    g2.addColorStop(0,'rgba(0,0,0,0)');
    g2.addColorStop(0.55,this.aura+(0.1+auraPct*0.12)+')');
    g2.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g2;ctx.fill();

    // ── Body ─────────────────────────────────────────────────
    ctx.rotate(this.angle);
    if(flash){
      glow(ctx,'#fff',34);ctx.fillStyle='#fff';
    } else {
      glow(ctx,this.glowColor,22);ctx.fillStyle=this.color;
    }
    // Tier 1 = square, Tier 2 = hexagon-ish (clipped square rotated 45°), Tier 3 = diamond + square
    if(this.tier===1){
      ctx.fillRect(-half,-half,half*2,half*2);
    } else if(this.tier===2){
      // Octagon approximation
      ctx.beginPath();
      const cut=half*0.35;
      ctx.moveTo(-half+cut,-half);ctx.lineTo(half-cut,-half);
      ctx.lineTo(half,-half+cut);ctx.lineTo(half,half-cut);
      ctx.lineTo(half-cut,half);ctx.lineTo(-half+cut,half);
      ctx.lineTo(-half,half-cut);ctx.lineTo(-half,-half+cut);
      ctx.closePath();ctx.fill();
    } else {
      // Diamond (rotated square) for tier 3
      ctx.beginPath();
      ctx.moveTo(0,-half);ctx.lineTo(half*0.85,0);
      ctx.lineTo(0,half);ctx.lineTo(-half*0.85,0);
      ctx.closePath();ctx.fill();
      // Plus inner cross
      noGlow(ctx);
      ctx.fillStyle=flash?'rgba(255,255,255,0.4)':`${this.aura}0.35)`;
      ctx.fillRect(-half*0.25,-half*0.75,half*0.5,half*1.5);
      ctx.fillRect(-half*0.75,-half*0.25,half*1.5,half*0.5);
    }

    // Inner detail rings
    noGlow(ctx);
    ctx.strokeStyle=flash?'rgba(255,255,255,0.5)':this.aura+'0.5)';
    ctx.lineWidth=2;
    const inset=half*0.28;
    ctx.strokeRect(-half+inset,-half+inset,(half-inset)*2,(half-inset)*2);

    // ── HP bar ───────────────────────────────────────────────
    if(this.hp<this.maxHp){
      const bw=half*2,bh=6,bx=-half,by=-half-14;
      ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(bx,by,bw,bh);
      const pct=this.hp/this.maxHp;
      const barCol=pct>0.5?this.color:pct>0.25?'#ffaa00':'#ff2244';
      ctx.fillStyle=barCol;ctx.fillRect(bx,by,bw*pct,bh);
      ctx.strokeStyle=this.aura+'0.5)';ctx.lineWidth=1;ctx.strokeRect(bx,by,bw,bh);
    }

    // ── Tier label + buff count indicator ────────────────────
    ctx.rotate(-this.angle);
    ctx.font=`bold 9px "Orbitron",sans-serif`;
    ctx.fillStyle=flash?'#fff':this.color;
    ctx.textAlign='center';
    ctx.fillText(this.label,0,-half-20);
    // Buff dots (shows how many buffs it will drop)
    const dotR=3,gap=8;
    const totalW=(this.buffCount-1)*gap;
    for(let i=0;i<this.buffCount;i++){
      ctx.beginPath();
      ctx.arc(-totalW/2+i*gap,-half-30,dotR,0,Math.PI*2);
      ctx.fillStyle=this.color;ctx.fill();
    }

    ctx.restore();

    // ── Laser lines drawn world-space ─────────────────────────
    for(const laser of this.activeLasers)laser.draw(ctx);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Chest  — drops on EliteEnemy death
// ══════════════════════════════════════════════════════════════
class Chest {
  constructor(x,y){
    this.x=x;this.y=y;this.r=18;
    this.alive=true;this.age=0;
    this.bob=0;this.pulseT=0;
  }
  update(dt){
    this.age+=dt;this.bob=Math.sin(this.age*2.8)*4;this.pulseT+=dt*3;
  }
  draw(ctx){
    const pulse=(Math.sin(this.pulseT)+1)*0.5;
    // Glow ring
    glow(ctx,`rgba(255,179,0,${0.4+pulse*0.35})`,18+pulse*10);
    ctx.beginPath();ctx.arc(this.x,this.y+this.bob,this.r+3+pulse*4,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,179,0,${0.5+pulse*0.3})`;ctx.lineWidth=2;ctx.stroke();

    // Chest body
    glow(ctx,'rgba(255,215,0,0.8)',12);
    ctx.fillStyle='#cc7700';
    ctx.fillRect(this.x-this.r,this.y+this.bob-this.r*0.6,this.r*2,this.r*1.2);

    // Lid
    ctx.fillStyle='#e08800';
    ctx.fillRect(this.x-this.r,this.y+this.bob-this.r,this.r*2,this.r*0.55);

    // Metal band
    ctx.fillStyle='#ffcc44';
    ctx.fillRect(this.x-this.r,this.y+this.bob-this.r*0.12,this.r*2,4);

    // Lock dot
    ctx.fillStyle='#ffe066';
    ctx.beginPath();ctx.arc(this.x,this.y+this.bob,4,0,Math.PI*2);ctx.fill();

    // "📦" label
    noGlow(ctx);
    ctx.font='11px "Share Tech Mono"';
    ctx.fillStyle='rgba(255,220,100,0.9)';
    ctx.textAlign='center';
    ctx.fillText('KISTE',this.x,this.y+this.bob+this.r+14);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: CaptureZone  — map event
// ══════════════════════════════════════════════════════════════
class CaptureZone {
  constructor(x,y){
    this.x=x;this.y=y;this.r=CFG.capture.radius;
    this.alive=true;
    this.pulseT=0;
    this.captureProgress=0;  // 0..1
    this.capturing=false;
  }
  update(dt,player){
    this.pulseT+=dt*2.2;
    const inside=dist(this,player)<this.r;
    if(inside){
      this.capturing=true;
      this.captureProgress=Math.min(1,this.captureProgress+dt/CFG.capture.captureTimeSec);
      if(this.captureProgress>=1)return'captured';
    } else {
      // Always drain when outside — don't gate on this.capturing flag
      this.captureProgress=Math.max(0,this.captureProgress-dt/CFG.capture.captureTimeSec*2.5);
      this.capturing=false;
    }
    return null;
  }
  draw(ctx){
    const pulse=(Math.sin(this.pulseT)+1)*0.5;
    const pct=this.captureProgress;

    // Outer pulse ring
    glow(ctx,`rgba(0,255,204,${0.2+pulse*0.3})`,20+pulse*15);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r+6+pulse*8,0,Math.PI*2);
    ctx.strokeStyle=`rgba(0,255,204,${0.25+pulse*0.2})`;ctx.lineWidth=2;ctx.stroke();

    // Zone fill
    noGlow(ctx);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=`rgba(0,255,204,${0.04+pulse*0.04})`;ctx.fill();

    // Zone border
    glow(ctx,'rgba(0,255,204,0.4)',8);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.strokeStyle=`rgba(0,255,204,${0.5+pulse*0.3})`;ctx.lineWidth=2;ctx.stroke();

    // Capture progress arc
    if(pct>0){
      glow(ctx,'rgba(0,255,204,0.8)',14);
      ctx.beginPath();
      ctx.arc(this.x,this.y,this.r-6,-Math.PI/2,-Math.PI/2+pct*Math.PI*2);
      ctx.strokeStyle='rgba(0,255,204,0.9)';ctx.lineWidth=5;ctx.stroke();
    }

    // Center icon
    noGlow(ctx);
    ctx.font=`bold ${11+pulse*2}px "Orbitron",sans-serif`;
    ctx.fillStyle=`rgba(0,255,204,${0.7+pulse*0.3})`;
    ctx.textAlign='center';
    ctx.fillText('🌀',this.x,this.y+5);
    ctx.font='8px "Share Tech Mono"';
    ctx.fillStyle=`rgba(0,255,204,${0.5+pulse*0.3})`;
    ctx.fillText('ORBITAL STRIKE',this.x,this.y+this.r-10);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: OrbitalCrystals  (Weapon)
// ══════════════════════════════════════════════════════════════
class OrbitalCrystals {
  constructor(player){
    this.player=player;this.count=CFG.orbital.baseCount;
    this.orbitRadius=CFG.orbital.baseRadius;this.speed=CFG.orbital.baseSpeed;
    this.damage=CFG.orbital.baseDamage;this.dmgIntervalMs=CFG.orbital.damageIntervalMs;
    this.r=CFG.orbital.crystalRadius;this.angle=0;this.level=1;
  }
  addCrystals(n){this.count+=n}
  levelUp(){this.level++;this.count+=1;this.speed+=0.4;this.orbitRadius=Math.min(130,this.orbitRadius+8);this.damage+=8}
  update(dt){this.angle+=this.speed*dt;if(this.angle>Math.PI*2)this.angle-=Math.PI*2}
  crystalPositions(){
    const pos=[];const step=this.count>0?(Math.PI*2)/this.count:0;
    for(let i=0;i<this.count;i++){
      const a=this.angle+step*i;
      pos.push({x:this.player.x+Math.cos(a)*this.orbitRadius,y:this.player.y+Math.sin(a)*this.orbitRadius,r:this.r});
    }
    return pos;
  }
  hitEnemies(enemies,dt,dmgNums,particles,killCb){
    const positions=this.crystalPositions();
    for(const e of enemies){
      if(!e.alive)continue;
      e.orbDmgTimer-=dt*1000;if(e.orbDmgTimer>0)continue;
      for(const cp of positions){
        if(dist(cp,e)<cp.r+e.r){
          e.orbDmgTimer=this.dmgIntervalMs;
          const{died}=e.hit(this.damage);
          dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#bf5fff'));
          for(let i=0;i<4;i++)particles.push(new Particle(e.x,e.y,'#bf5fff',[40,120],[1,2.5]));
          if(died)killCb(e);break;
        }
      }
    }
  }
  draw(ctx,now){
    const positions=this.crystalPositions();
    // Draw orbit path once
    glow(ctx,'rgba(191,95,255,0.12)',6);
    ctx.beginPath();ctx.arc(this.player.x,this.player.y,this.orbitRadius,0,Math.PI*2);
    ctx.strokeStyle='rgba(191,95,255,0.07)';ctx.lineWidth=1;ctx.stroke();

    for(let i=0;i<positions.length;i++){
      const cp=positions[i];
      glow(ctx,CFG.colors.crystalGlow,20);
      ctx.beginPath();ctx.arc(cp.x,cp.y,cp.r,0,Math.PI*2);
      ctx.fillStyle=CFG.colors.crystal;ctx.fill();
      noGlow(ctx);
      ctx.beginPath();ctx.arc(cp.x-cp.r*0.3,cp.y-cp.r*0.3,cp.r*0.3,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.fill();
      ctx.save();ctx.translate(cp.x,cp.y);ctx.rotate(now*0.003+i);
      ctx.strokeStyle='rgba(255,255,255,0.35)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,-cp.r*0.55);ctx.lineTo(cp.r*0.55,0);
      ctx.lineTo(0,cp.r*0.55);ctx.lineTo(-cp.r*0.55,0);ctx.closePath();ctx.stroke();
      ctx.restore();
    }
    noGlow(ctx);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: ExplosionRing  (visual only)
// ══════════════════════════════════════════════════════════════
class ExplosionRing {
  constructor(x,y,maxRadius){
    this.x=x;this.y=y;this.radius=0;this.maxRadius=maxRadius;
    this.life=1;this.alive=true;this.speed=CFG.explosion.expandSpeed;
  }
  update(dt){
    this.radius+=this.speed*dt;this.life=1-this.radius/this.maxRadius;
    if(this.radius>=this.maxRadius)this.alive=false;
  }
  draw(ctx){
    const a=Math.max(0,this.life);
    glow(ctx,`rgba(255,140,0,${a*0.8})`,20);
    ctx.beginPath();ctx.arc(this.x,this.y,this.radius,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,200,50,${a*0.9})`;ctx.lineWidth=3+a*4;ctx.stroke();
    ctx.beginPath();ctx.arc(this.x,this.y,this.radius*0.6,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,140,0,${a*0.06})`;ctx.fill();
    noGlow(ctx);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: RadialExplosion  (Weapon)
// ══════════════════════════════════════════════════════════════
class RadialExplosion {
  constructor(game){
    this.game=game;this.damage=CFG.explosion.baseDamage;
    this.cooldownMs=CFG.explosion.baseCooldownMs;this.radius=CFG.explosion.baseRadius;
    this.timer=this.cooldownMs;this.rings=[];this.level=1;
  }
  levelUp(){
    this.level++;this.damage+=30;
    this.cooldownMs=Math.max(1200,this.cooldownMs-1000);
    this.radius=Math.min(350,this.radius+30);
  }
  update(dt,enemies,dmgNums,particles,killCb){
    this.timer-=dt*1000;
    if(this.timer<=0){this.timer=this.cooldownMs;this._detonate(enemies,dmgNums,particles,killCb)}
    for(const r of this.rings)r.update(dt);
    this.rings=this.rings.filter(r=>r.alive);
  }
  _detonate(enemies,dmgNums,particles,killCb){
    const px=this.game.player.x,py=this.game.player.y;
    this.rings.push(new ExplosionRing(px,py,this.radius));
    for(let i=0;i<12;i++)particles.push(new Particle(px,py,'#ff8c00',[80,220],[1.5,3.5]));
    for(let i=0;i<6;i++) particles.push(new Particle(px,py,'#ffe066',[40,120],[1,2]));
    for(const e of enemies){
      if(!e.alive)continue;
      if(dist({x:px,y:py},e)<this.radius+e.r){
        const{died}=e.hit(this.damage);
        dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#ff8c00'));
        if(died)killCb(e);
      }
    }
  }
  drawRings(ctx){for(const r of this.rings)r.draw(ctx)}
  drawCooldownArc(ctx,player){
    const pct=1-(this.timer/this.cooldownMs);
    glow(ctx,'rgba(255,140,0,0.5)',8);
    ctx.beginPath();
    ctx.arc(player.x,player.y,player.r+8,-Math.PI/2,-Math.PI/2+pct*Math.PI*2);
    ctx.strokeStyle=`rgba(255,140,0,${0.4+pct*0.5})`;ctx.lineWidth=2;ctx.stroke();
    noGlow(ctx);
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: BladeProjectile  — boomerang that goes out and returns
// ══════════════════════════════════════════════════════════════
class BladeProjectile {
  constructor(x,y,angle,damage,speed){
    this.x=x;this.y=y;this.startX=x;this.startY=y;
    this.angle=angle;this.damage=damage;this.speed=speed;
    this.r=10;this.alive=true;this.returning=false;
    this.hitEnemies=new Set();  // avoid double-hitting on return
    this.rot=0;this.maxDist=260;this.distTravelled=0;
  }
  update(dt,player,enemies,dmgNums,particles,killCb){
    this.rot+=12*dt;
    if(!this.returning){
      this.x+=Math.cos(this.angle)*this.speed*dt;
      this.y+=Math.sin(this.angle)*this.speed*dt;
      this.distTravelled+=this.speed*dt;
      if(this.distTravelled>=this.maxDist){
        this.returning=true;
        this.hitEnemies.clear(); // Bug 6: reset so return-trip can hit same enemies
      }
    } else {
      const backAngle=Math.atan2(player.y-this.y,player.x-this.x);
      this.x+=Math.cos(backAngle)*this.speed*1.3*dt;
      this.y+=Math.sin(backAngle)*this.speed*1.3*dt;
      if(dist(this,player)<player.r+this.r)this.alive=false;
    }
    for(const e of enemies){
      if(!e.alive||this.hitEnemies.has(e))continue;
      if(dist(this,e)<this.r+e.r){
        this.hitEnemies.add(e);
        const dmg=this.returning?Math.round(this.damage*0.7):this.damage;
        const{died}=e.hit(dmg);
        const col=this.returning?'#ff9940':'#ffcc44';
        dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${dmg}`,col));
        for(let i=0;i<4;i++)particles.push(new Particle(e.x,e.y,'#ffcc44',[60,150],[1,2.5]));
        if(died)killCb(e);
      }
    }
  }
  draw(ctx){
    glow(ctx,'rgba(255,200,50,0.6)',14);
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rot);
    ctx.fillStyle=this.returning?'#ff9940':'#ffdd44';
    // Boomerang shape: two arcs
    ctx.beginPath();ctx.moveTo(-this.r,0);
    ctx.quadraticCurveTo(0,-this.r*1.4,this.r,0);
    ctx.quadraticCurveTo(0,this.r*0.4,-this.r,0);
    ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke();
    ctx.restore();noGlow(ctx);
  }
}

class BladeORang {
  constructor(game){
    this.game=game;this.damage=70;this.speed=420;
    this.cooldownMs=4000;this.timer=this.cooldownMs;
    this.level=1;this.extraPasses=0;this.blades=[];
  }
  levelUp(){this.level++;this.damage+=30;this.cooldownMs=Math.max(1500,this.cooldownMs-500)}
  update(dt,enemies,dmgNums,particles,killCb){
    this.timer-=dt*1000;
    if(this.timer<=0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      // Throw toward nearest enemy, or random angle if none
      let angle=rand(0,Math.PI*2);
      if(enemies.length>0){
        const nearest=[...enemies].sort((a,b)=>dist(p,a)-dist(p,b))[0];
        angle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
      }
      this.blades.push(new BladeProjectile(p.x,p.y,angle,this.damage,this.speed));
    }
    for(const b of this.blades)b.update(dt,this.game.player,enemies,dmgNums,particles,killCb);
    this.blades=this.blades.filter(b=>b.alive);
  }
  draw(ctx){for(const b of this.blades)b.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: GuidingHex  — magic bolts to N random targets
// ══════════════════════════════════════════════════════════════
class HexBeam {
  constructor(sx,sy,tx,ty,damage){
    this.sx=sx;this.sy=sy;this.tx=tx;this.ty=ty;
    this.damage=damage;this.life=1;this.alive=true;
  }
  update(dt){this.life-=dt*4;if(this.life<=0)this.alive=false}
  draw(ctx){
    const a=Math.max(0,this.life);
    glow(ctx,`rgba(150,80,255,${a*0.7})`,12);
    ctx.strokeStyle=`rgba(200,130,255,${a*0.9})`;ctx.lineWidth=2+a*2;
    ctx.beginPath();ctx.moveTo(this.sx,this.sy);ctx.lineTo(this.tx,this.ty);ctx.stroke();
    // Impact circle
    ctx.beginPath();ctx.arc(this.tx,this.ty,8*a,0,Math.PI*2);
    ctx.fillStyle=`rgba(180,100,255,${a*0.5})`;ctx.fill();
    noGlow(ctx);
  }
}

class GuidingHex {
  constructor(game){
    this.game=game;this.damage=55;this.targets=3;
    this.cooldownMs=4000;this.timer=this.cooldownMs;
    this.level=1;this.beams=[];
  }
  levelUp(){this.level++;this.damage+=25;this.targets+=1;this.cooldownMs=Math.max(1500,this.cooldownMs-400)}
  update(dt,enemies,dmgNums,particles,killCb){
    this.timer-=dt*1000;
    if(this.timer<=0&&enemies.length>0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      const pool=shuffle([...enemies.filter(e=>e.alive)]).slice(0,this.targets);
      for(const e of pool){
        this.beams.push(new HexBeam(p.x,p.y,e.x,e.y,this.damage));
        const{died}=e.hit(this.damage);
        dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#c882ff'));
        for(let i=0;i<3;i++)particles.push(new Particle(e.x,e.y,'#c882ff',[40,120],[1,2.5]));
        if(died)killCb(e);
      }
    }
    for(const b of this.beams)b.update(dt);
    this.beams=this.beams.filter(b=>b.alive);
  }
  draw(ctx){for(const b of this.beams)b.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: UwUBlasters  — rapid burst toward nearest enemy
// ══════════════════════════════════════════════════════════════
class UwUBullet {
  constructor(x,y,angle,damage){
    this.x=x;this.y=y;this.angle=angle;this.damage=damage;
    this.r=4;this.speed=600;this.alive=true;this.life=1;
  }
  update(dt,W,H){
    this.x+=Math.cos(this.angle)*this.speed*dt;
    this.y+=Math.sin(this.angle)*this.speed*dt;
    this.life-=dt*1.8;
    if(this.life<=0||this.x<-20||this.x>W+20||this.y<-20||this.y>H+20)this.alive=false;
  }
  draw(ctx){
    const a=Math.max(0,this.life);
    glow(ctx,`rgba(255,150,200,${a*0.7})`,10);
    ctx.globalAlpha=a;
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle='#ff88cc';ctx.fill();
    ctx.globalAlpha=1;noGlow(ctx);
  }
}

class UwUBlasters {
  constructor(game){
    this.game=game;this.damage=22;this.bulletsPerBurst=3;
    this.cooldownMs=4000;this.timer=this.cooldownMs;
    this.level=1;this.bullets=[];
  }
  levelUp(){this.level++;this.bulletsPerBurst+=2;this.damage+=10;this.cooldownMs=Math.max(1200,this.cooldownMs-400)}
  update(dt,enemies,dmgNums,particles,killCb,W,H){
    this.timer-=dt*1000;
    if(this.timer<=0&&enemies.length>0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      const nearest=[...enemies].sort((a,b)=>dist(p,a)-dist(p,b))[0];
      const baseAngle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
      const spread=0.15;
      for(let i=0;i<this.bulletsPerBurst;i++){
        const offset=(i-(this.bulletsPerBurst-1)/2)*spread;
        this.bullets.push(new UwUBullet(p.x,p.y,baseAngle+offset,this.damage));
      }
    }
    for(const b of this.bullets){
      b.update(dt,W||2000,H||1200);
      for(const e of enemies){
        if(!e.alive||!b.alive)continue;
        if(dist(b,e)<b.r+e.r){
          b.alive=false;
          const{died}=e.hit(this.damage);
          dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#ff88cc'));
          for(let i=0;i<3;i++)particles.push(new Particle(e.x,e.y,'#ff88cc',[40,120],[1,2]));
          if(died)killCb(e);break;
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.alive);
  }
  draw(ctx){for(const b of this.bullets)b.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: AniMine  — single mine on the field
// ══════════════════════════════════════════════════════════════
class AniMine {
  constructor(x,y,damage,blastRadius){
    this.x=x;this.y=y;this.r=10;this.alive=true;
    this.damage=damage;this.blastRadius=blastRadius;
    this.age=0;this.exploded=false;
    this.triggerRadius=this.r+16;
    // Explosion ring visual
    this.blastRing=null;
  }
  update(dt,enemies,dmgNums,particles,killCb){
    this.age+=dt;
    if(this.blastRing){this.blastRing.update(dt);if(!this.blastRing.alive)this.alive=false;return;}
    // Check trigger
    for(const e of enemies){
      if(!e.alive)continue;
      if(dist(this,e)<this.triggerRadius+e.r){
        this._explode(enemies,dmgNums,particles,killCb);return;
      }
    }
  }
  _explode(enemies,dmgNums,particles,killCb){
    this.exploded=true;
    this.blastRing=new ExplosionRing(this.x,this.y,this.blastRadius);
    for(let i=0;i<14;i++)particles.push(new Particle(this.x,this.y,'#ff8800',[80,240],[1.5,3.5]));
    for(let i=0;i<6;i++) particles.push(new Particle(this.x,this.y,'#ffcc44',[40,120],[1,2]));
    for(const e of enemies){
      if(!e.alive)continue;
      if(dist(this,e)<this.blastRadius+e.r){
        const{died}=e.hit(this.damage);
        dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#ff8800'));
        if(died)killCb(e);
      }
    }
  }
  draw(ctx){
    if(this.blastRing){this.blastRing.draw(ctx);return;}
    const pulse=(Math.sin(this.age*6)+1)*0.5;
    glow(ctx,`rgba(255,120,0,${0.4+pulse*0.3})`,10+pulse*6);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle='#cc4400';ctx.fill();
    ctx.strokeStyle=`rgba(255,180,0,${0.6+pulse*0.4})`;ctx.lineWidth=2;ctx.stroke();
    // ⚠ symbol
    noGlow(ctx);
    ctx.font='bold 10px sans-serif';ctx.fillStyle='#ffcc44';
    ctx.textAlign='center';ctx.fillText('!',this.x,this.y+4);
    // Trigger radius indicator (faint)
    ctx.beginPath();ctx.arc(this.x,this.y,this.triggerRadius,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,120,0,0.15)';ctx.lineWidth=1;ctx.stroke();
  }
}

class AniMines {
  constructor(game){
    this.game=game;this.damage=80;this.count=3;
    this.cooldownMs=5000;this.timer=this.cooldownMs;
    this.level=1;this.blastRadius=90;this.mines=[];
  }
  levelUp(){this.level++;this.count+=2;this.damage+=40;this.cooldownMs=Math.max(2000,this.cooldownMs-500)}
  update(dt,enemies,dmgNums,particles,killCb){
    this.timer-=dt*1000;
    if(this.timer<=0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      for(let i=0;i<this.count;i++){
        const a=rand(0,Math.PI*2),d=rand(60,180);
        this.mines.push(new AniMine(p.x+Math.cos(a)*d,p.y+Math.sin(a)*d,this.damage,this.blastRadius));
      }
    }
    for(const m of this.mines)m.update(dt,enemies,dmgNums,particles,killCb);
    this.mines=this.mines.filter(m=>m.alive);
  }
  draw(ctx){for(const m of this.mines)m.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: VortexOrb  — piercing orb that passes through enemies
// ══════════════════════════════════════════════════════════════
class VortexOrb {
  constructor(x,y,angle,damage,speed){
    this.x=x;this.y=y;this.angle=angle;this.damage=damage;this.speed=speed;
    this.r=9;this.alive=true;this.life=1.4;
    this.hitEnemies=new Set();this.rot=0;
  }
  update(dt,W,H,enemies,dmgNums,particles,killCb){
    this.rot+=8*dt;
    this.x+=Math.cos(this.angle)*this.speed*dt;
    this.y+=Math.sin(this.angle)*this.speed*dt;
    this.life-=dt*0.65;
    if(this.life<=0||this.x<-30||this.x>W+30||this.y<-30||this.y>H+30)this.alive=false;
    for(const e of enemies){
      if(!e.alive||this.hitEnemies.has(e))continue;
      if(dist(this,e)<this.r+e.r){
        this.hitEnemies.add(e);
        // Damage reduced per hit
        const dmg=Math.max(10,Math.round(this.damage*(1-this.hitEnemies.size*0.1)));
        const{died}=e.hit(dmg);
        dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${dmg}`,'#44ffcc'));
        for(let i=0;i<3;i++)particles.push(new Particle(e.x,e.y,'#44ffcc',[40,120],[1,2.5]));
        if(died)killCb(e);
      }
    }
  }
  draw(ctx){
    const a=Math.max(0,this.life/1.4);
    glow(ctx,`rgba(0,255,200,${a*0.7})`,16);
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rot);
    ctx.globalAlpha=a;
    ctx.beginPath();ctx.arc(0,0,this.r,0,Math.PI*2);
    ctx.fillStyle='rgba(0,200,160,0.3)';ctx.fill();
    ctx.strokeStyle='#44ffcc';ctx.lineWidth=2;ctx.stroke();
    // Inner spiral-ish cross
    for(let i=0;i<4;i++){
      ctx.save();ctx.rotate(i*Math.PI/2);
      ctx.fillStyle='rgba(100,255,220,0.8)';
      ctx.fillRect(-1,-this.r*0.7,2,this.r*0.6);
      ctx.restore();
    }
    ctx.globalAlpha=1;ctx.restore();noGlow(ctx);
  }
}

class VortexGlove {
  constructor(game){
    this.game=game;this.damage=65;this.orbCount=1;
    this.speed=370;this.cooldownMs=5000;this.timer=this.cooldownMs;
    this.level=1;this.orbs=[];
  }
  levelUp(){this.level++;this.orbCount++;this.damage+=30;this.cooldownMs=Math.max(1800,this.cooldownMs-500)}
  update(dt,enemies,dmgNums,particles,killCb,W,H){
    this.timer-=dt*1000;
    if(this.timer<=0&&enemies.length>0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      const sorted=[...enemies].sort((a,b)=>dist(p,a)-dist(p,b));
      const spread=Math.PI/8;
      for(let i=0;i<this.orbCount;i++){
        const t=sorted[Math.min(i,sorted.length-1)];
        const base=Math.atan2(t.y-p.y,t.x-p.x);
        const offset=(i-(this.orbCount-1)/2)*spread;
        this.orbs.push(new VortexOrb(p.x,p.y,base+offset,this.damage,this.speed));
      }
    }
    for(const o of this.orbs)o.update(dt,W||2000,H||1200,enemies,dmgNums,particles,killCb);
    this.orbs=this.orbs.filter(o=>o.alive);
  }
  draw(ctx){for(const o of this.orbs)o.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: GatlingBunnyGuns  — cone burst of many bullets
// ══════════════════════════════════════════════════════════════
class GatlingBullet {
  constructor(x,y,angle,damage){
    this.x=x;this.y=y;this.angle=angle;this.damage=damage;
    this.r=3;this.speed=650;this.alive=true;this.life=1;
  }
  update(dt,W,H){
    this.x+=Math.cos(this.angle)*this.speed*dt;
    this.y+=Math.sin(this.angle)*this.speed*dt;
    this.life-=dt*1.4;
    if(this.life<=0||this.x<-20||this.x>W+20||this.y<-20||this.y>H+20)this.alive=false;
  }
  draw(ctx){
    const a=Math.max(0,this.life);
    ctx.globalAlpha=a;
    glow(ctx,'rgba(255,100,50,0.5)',8);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle='#ff7744';ctx.fill();
    ctx.globalAlpha=1;noGlow(ctx);
  }
}

class GatlingBunnyGuns {
  constructor(game){
    this.game=game;this.damage=45;this.bulletCount=6;
    this.spreadAngle=0.6;this.cooldownMs=5500;this.timer=this.cooldownMs;
    this.level=1;this.bullets=[];
  }
  levelUp(){this.level++;this.bulletCount+=4;this.damage+=20;this.cooldownMs=Math.max(2000,this.cooldownMs-500)}
  update(dt,enemies,dmgNums,particles,killCb,W,H){
    this.timer-=dt*1000;
    if(this.timer<=0){
      this.timer=this.cooldownMs;
      const p=this.game.player;
      let baseAngle=rand(0,Math.PI*2);
      if(enemies.length>0){
        const nearest=[...enemies].sort((a,b)=>dist(p,a)-dist(p,b))[0];
        baseAngle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
      }
      for(let i=0;i<this.bulletCount;i++){
        const offset=(i/(this.bulletCount-1||1)-0.5)*this.spreadAngle;
        this.bullets.push(new GatlingBullet(p.x,p.y,baseAngle+offset,this.damage));
      }
    }
    for(const b of this.bullets){
      b.update(dt,W||2000,H||1200);
      for(const e of enemies){
        if(!e.alive||!b.alive)continue;
        if(dist(b,e)<b.r+e.r){
          b.alive=false;
          const{died}=e.hit(this.damage);
          dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#ff7744'));
          for(let i=0;i<3;i++)particles.push(new Particle(e.x,e.y,'#ff7744',[50,130],[1,2.5]));
          if(died)killCb(e);break;
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.alive);
  }
  draw(ctx){for(const b of this.bullets)b.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Tornado  — single vortex entity that pulls & damages
// ══════════════════════════════════════════════════════════════
class Tornado {
  constructor(x,y,damage,duration){
    this.x=x;this.y=y;this.damage=damage;this.duration=duration;
    this.r=50;this.alive=true;this.age=0;this.dmgTimer=0;
    this.dmgInterval=0.35;this.rot=0;
    // Drift slowly
    const a=rand(0,Math.PI*2);this.vx=Math.cos(a)*20;this.vy=Math.sin(a)*18;
  }
  update(dt,enemies,dmgNums,particles,killCb,W,H){
    this.age+=dt;this.rot+=4*dt;
    if(this.age>=this.duration){this.alive=false;return}
    // Slow drift + bounce at edges
    this.x+=this.vx*dt;this.y+=this.vy*dt;
    if(this.x<this.r||this.x>W-this.r)this.vx*=-1;
    if(this.y<this.r||this.y>H-this.r)this.vy*=-1;
    // Pull enemies inward
    for(const e of enemies){
      if(!e.alive)continue;
      const d=dist(this,e);
      if(d<this.r*2.5){
        const pull=50*(1-d/(this.r*2.5));
        const a=Math.atan2(this.y-e.y,this.x-e.x);
        e.x+=Math.cos(a)*pull*dt;e.y+=Math.sin(a)*pull*dt;
      }
    }
    // Periodic damage
    this.dmgTimer+=dt;
    if(this.dmgTimer>=this.dmgInterval){
      this.dmgTimer=0;
      for(const e of enemies){
        if(!e.alive)continue;
        if(dist(this,e)<this.r+e.r){
          const{died}=e.hit(this.damage);
          dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${this.damage}`,'#88aaff'));
          for(let i=0;i<2;i++)particles.push(new Particle(e.x,e.y,'#88aaff',[30,90],[1,2]));
          if(died)killCb(e);
        }
      }
    }
  }
  draw(ctx){
    const life=1-this.age/this.duration;
    // Multi-ring spinning effect
    for(let ring=0;ring<4;ring++){
      const rad=this.r*(0.3+ring*0.22);
      const alpha=life*(0.12-ring*0.02);
      glow(ctx,`rgba(100,140,255,${alpha*3})`,12);
      ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.rot*(1+ring*0.3));
      ctx.beginPath();ctx.arc(0,0,rad,0,Math.PI*2);
      ctx.strokeStyle=`rgba(120,160,255,${0.3+life*0.3})`;
      ctx.lineWidth=2;ctx.setLineDash([6+ring*3,4]);ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
    noGlow(ctx);
    // Center
    ctx.beginPath();ctx.arc(this.x,this.y,8*life,0,Math.PI*2);
    ctx.fillStyle=`rgba(150,180,255,${life*0.8})`;ctx.fill();
  }
}

class TornadoWeapon {
  constructor(game){
    this.game=game;this.damage=18;this.maxCount=1;
    this.cooldownMs=6000;this.timer=this.cooldownMs;
    this.duration=5;this.level=1;this.tornadoes=[];
  }
  levelUp(){this.level++;this.maxCount++;this.damage+=20;this.cooldownMs=Math.max(2500,this.cooldownMs-800)}
  update(dt,enemies,dmgNums,particles,killCb,W,H){
    this.timer-=dt*1000;
    if(this.timer<=0){
      this.timer=this.cooldownMs;
      if(this.tornadoes.length<this.maxCount*2){  // cap active count
        const p=this.game.player;
        const a=rand(0,Math.PI*2),d=rand(80,200);
        this.tornadoes.push(new Tornado(
          p.x+Math.cos(a)*d, p.y+Math.sin(a)*d,
          this.damage, this.duration
        ));
      }
    }
    for(const t of this.tornadoes)t.update(dt,enemies,dmgNums,particles,killCb,W,H);
    this.tornadoes=this.tornadoes.filter(t=>t.alive);
  }
  draw(ctx){for(const t of this.tornadoes)t.draw(ctx)}
}

// ══════════════════════════════════════════════════════════════
//  CLASS: OrbitalStrikeEffect  — screen-clearing visual
// ══════════════════════════════════════════════════════════════
class OrbitalStrikeEffect {
  constructor(W,H){
    this.W=W;this.H=H;this.life=1;this.alive=true;
    this.beams=Array.from({length:8},(_,i)=>({
      x:rand(W*0.1,W*0.9),y:rand(0,-H*0.4),
      w:rand(6,18),speed:rand(800,1400),
      color:['#00ffcc','#ffffff','#00d4ff','#aaffee'][randInt(0,4)],
      delay:rand(0,0.3)
    }));
    this.duration=1.2;this.age=0;
  }
  update(dt){
    this.age+=dt;this.life=1-this.age/this.duration;
    if(this.age>=this.duration)this.alive=false;
  }
  draw(ctx){
    const a=Math.max(0,this.life);
    // White flash overlay
    ctx.globalAlpha=Math.max(0,1-(this.age/0.15))*0.7;
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,this.W,this.H);
    ctx.globalAlpha=1;
    // Beams
    for(const b of this.beams){
      if(this.age<b.delay)continue;
      const t=this.age-b.delay;
      const progress=Math.min(1,t*(b.speed/this.H));
      const y=b.y+(this.H*1.2)*progress;
      glow(ctx,b.color,20);
      ctx.fillStyle=b.color;
      ctx.globalAlpha=a*0.85;
      ctx.fillRect(b.x-b.w/2,b.y,b.w,y-b.y);
      ctx.globalAlpha=1;
    }
    noGlow(ctx);
    // Teal scanline
    ctx.globalAlpha=Math.max(0,a*0.12);
    ctx.fillStyle='rgba(0,255,204,1)';ctx.fillRect(0,0,this.W,this.H);
    ctx.globalAlpha=1;
  }
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Player
// ══════════════════════════════════════════════════════════════
class Player {
  constructor(x,y){
    this.x=x;this.y=y;this.r=CFG.player.radius;
    this.speed=CFG.player.speed;this.hp=CFG.player.maxHp;this.maxHp=CFG.player.maxHp;
    this.alive=true;this.numProjectiles=1;this.fireTimer=0;this.invincibleTimer=0;
    this.keys={w:false,a:false,s:false,d:false};
    this.trail=[];this.pulseTimer=0;this.angle=0;
    // Entrada analógica (joystick táctil): vector con magnitud 0..1 = acelerador.
    this.moveX=0;this.moveY=0;this.analog=false;
  }
  handleKey(code,down){
    const map={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'w',ArrowLeft:'a',ArrowDown:'s',ArrowRight:'d'};
    if(map[code]!==undefined)this.keys[map[code]]=down;
  }
  // El joystick fija un vector (mx,my) cuya MAGNITUD controla la velocidad,
  // así el control es analógico y no "todo o nada" como con teclas.
  setAnalog(mx,my){this.moveX=mx;this.moveY=my;this.analog=true;}
  clearAnalog(){this.moveX=0;this.moveY=0;this.analog=false;}
  update(dt,W,H){
    let dx=0,dy=0;
    if(this.analog){
      // Vector analógico del joystick (ya viene con magnitud 0..1).
      dx=this.moveX;dy=this.moveY;
    }else{
      if(this.keys.a)dx-=1;if(this.keys.d)dx+=1;
      if(this.keys.w)dy-=1;if(this.keys.s)dy+=1;
      if(dx&&dy){dx*=0.7071;dy*=0.7071}
    }
    const moving=dx||dy;
    if(moving)this.angle=Math.atan2(dy,dx);
    this.x=clamp(this.x+dx*this.speed*dt,this.r,W-this.r);
    this.y=clamp(this.y+dy*this.speed*dt,this.r,H-this.r);
    if(this.invincibleTimer>0)this.invincibleTimer-=dt*1000;
    this.pulseTimer+=dt;
    if(moving){this.trail.push({x:this.x,y:this.y,life:1});if(this.trail.length>14)this.trail.shift()}
    for(const p of this.trail)p.life-=dt*6;
    this.trail=this.trail.filter(p=>p.life>0);
  }
  takeDamage(amount){
    if(this.invincibleTimer>0)return false;
    // Shield absorbs hits
    if((this.shieldHits||0)>0){
      this.shieldHits--;
      this.invincibleTimer=this.invincibilityMs*0.5; // brief grace
      return false; // blocked
    }
    this.hp=Math.max(0,this.hp-amount);this.invincibleTimer=CFG.player.invincibilityMs;
    if(this.hp<=0)this.alive=false;return true;
  }
  tryFire(dt,enemies){
    this.fireTimer-=dt*1000;
    if(this.fireTimer>0||enemies.length===0)return[];
    this.fireTimer=CFG.player.fireRateMs;
    const sorted=[...enemies].sort((a,b)=>dist(this,a)-dist(this,b));
    return sorted.slice(0,this.numProjectiles).map(t=>{
      const a=Math.atan2(t.y-this.y,t.x-this.x);return new Projectile(this.x,this.y,a);
    });
  }
  draw(ctx,now){
    const blink=this.invincibleTimer>0&&Math.floor(this.invincibleTimer/75)%2===0;
    if(blink)return;
    for(let i=0;i<this.trail.length;i++){
      const p=this.trail[i];ctx.globalAlpha=Math.max(0,p.life)*0.16;
      ctx.beginPath();ctx.arc(p.x,p.y,this.r*0.45*(i/this.trail.length),0,Math.PI*2);
      ctx.fillStyle=CFG.colors.player;ctx.fill();
    }ctx.globalAlpha=1;
    const pulse=(Math.sin(this.pulseTimer*3)+1)*0.5;
    glow(ctx,CFG.colors.playerGlow,8+pulse*12);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r+4+pulse*3,0,Math.PI*2);
    ctx.strokeStyle=`rgba(0,212,255,${0.15+pulse*0.15})`;ctx.lineWidth=1.5;ctx.stroke();
    glow(ctx,CFG.colors.player,18);
    ctx.beginPath();ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
    ctx.fillStyle=CFG.colors.player;ctx.fill();noGlow(ctx);
    ctx.save();ctx.translate(this.x,this.y);ctx.rotate(this.angle);
    ctx.fillStyle='rgba(255,255,255,0.85)';
    ctx.beginPath();ctx.moveTo(this.r-3,0);ctx.lineTo(this.r-9,-4);ctx.lineTo(this.r-9,4);
    ctx.closePath();ctx.fill();ctx.restore();
    ctx.beginPath();ctx.arc(this.x-this.r*0.28,this.y-this.r*0.3,this.r*0.3,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.42)';ctx.fill();
  }
}

// Snapshot of mutable CFG values — restored on every game restart
const CFG_DEFAULTS = {
  fireRateMs:     CFG.player.fireRateMs,
  projectileDamage: CFG.player.projectileDamage,
  magnetRadius:   CFG.xp.magnetRadius,
};

function resetCFG(){
  CFG.player.fireRateMs      = CFG_DEFAULTS.fireRateMs;
  CFG.player.projectileDamage= CFG_DEFAULTS.projectileDamage;
  CFG.xp.magnetRadius        = CFG_DEFAULTS.magnetRadius;
}

// XP needed to reach level (level+1) — exponential curve
// level 1→2: 120, level 2→3: 198, level 5→6: ~560, level 10→11: ~2200
function calcXpForLevel(level){
  return Math.round(CFG.xp.basePerLevel * Math.pow(CFG.xp.levelScaleExp, level-1));
}

// ══════════════════════════════════════════════════════════════
//  CLASS: Game
// ══════════════════════════════════════════════════════════════
class Game {
  constructor(){
    this.canvas=document.getElementById('gameCanvas');
    this.ctx=this.canvas.getContext('2d');
    this._resize();window.addEventListener('resize',()=>this._resize());

    this.started=false;this.paused=false;this.gameOver=false;this.running=false;

    // Entity arrays
    this.player=null;
    this.enemies=[];        // Enemy + EliteEnemy instances
    this.projectiles=[];
    this.xpOrbs=[];
    this.particles=[];
    this.dmgNums=[];
    this.chests=[];
    this.captureZones=[];
    this.strikeEffects=[];
    this.orphanedLasers=[]; // Bug 8: lasers that outlive their elite

    // Weapons
    this.orbWeapon    =null;
    this.expWeapon    =null;
    this.bladeWeapon  =null;
    this.hexWeapon    =null;
    this.uwuWeapon    =null;
    this.mineWeapon   =null;
    this.vortexWeapon =null;
    this.gatlingWeapon=null;
    this.tornadoWeapon=null;

    // Timers / counters
    this.spawnTimer=0;this.waveTimer=0;
    this.lastTime=0;this.now=0;
    this.zoneSpawnTimer=CFG.capture.spawnIntervalSec*1000;
    this.eliteSpawnTimer=28000; // first elite at ~28s (before first zone)

    // Progression
    this.kills=0;this.eliteKills=0;
    this.level=1;this.wave=1;
    this.currentXP=0;this.xpPerLevel=CFG.xp.perLevel;
    this.correctAnswers=0;this.comboCount=0;this.xpMultiplier=1;

    // Wave tracking for elite spawn
    this.lastWaveEliteSpawned=0;

    // Draft + Quiz
    this.draftPhase='none'; // 'draft'|'quiz'|'none'
    this.chosenUpgrade=null;
    this.currentQ=null;this.qAnswered=false;this.qCorrect=false;
    this.usedQs=new Set();

    // FX
    this.flashAlpha=0;this.flashColor='rgba(255,34,68,0.18)';

    // DOM refs
    this.overlay     =document.getElementById('level-overlay');
    this.draftView   =document.getElementById('draft-view');
    this.quizView    =document.getElementById('quiz-view');
    this.chestOverlay=document.getElementById('chest-overlay');
    this.goOverlay   =document.getElementById('go-overlay');
    this.startOverlay=document.getElementById('start-overlay');
    this.continueBtn =document.getElementById('continue-btn');
    this.chestCloseBtn=document.getElementById('chest-close-btn');
    this.buffCloseBtn =document.getElementById('buff-close-btn');
    this.restartBtn  =document.getElementById('restart-btn');
    this.startBtn    =document.getElementById('start-btn');
    this.capBarWrap  =document.getElementById('capture-bar-wrap');
    this.capBarFill  =document.getElementById('capture-bar-fill');
    this.zoneTimerBox=document.getElementById('zone-timer-box');
    this.zoneSecsEl  =document.getElementById('zone-secs');
    this.eliteWarnEl =document.getElementById('elite-warn');

    this._bindUI();
    this._idleDraw();
  }

  _resize(){
    // W/H son unidades LÓGICAS (CSS px). El backing store se multiplica por
    // devicePixelRatio (cap 2) para que en móviles retina no se vea borroso
    // ("como pantalla zoom"). El render escala con ctx.setTransform(dpr).
    const cssW=window.innerWidth, cssH=window.innerHeight;
    const dpr=Math.min(window.devicePixelRatio||1,2);
    this.W=cssW;this.H=cssH;this.dpr=dpr;
    this.canvas.width=Math.round(cssW*dpr);
    this.canvas.height=Math.round(cssH*dpr);
    this.canvas.style.width=cssW+'px';
    this.canvas.style.height=cssH+'px';
  }

  // ── INIT ──────────────────────────────────────────────────
  init(){
    resetCFG();  // Bug 4: restore all CFG values modified by buffs/upgrades
    this.player=new Player(this.W/2,this.H/2);
    this.enemies=[];this.projectiles=[];this.xpOrbs=[];this.particles=[];
    this.dmgNums=[];this.chests=[];this.captureZones=[];this.strikeEffects=[];
    this.orphanedLasers=[];
    this.orbWeapon=null;this.expWeapon=null;
    this.bladeWeapon=null;this.hexWeapon=null;this.uwuWeapon=null;
    this.mineWeapon=null;this.vortexWeapon=null;this.gatlingWeapon=null;this.tornadoWeapon=null;
    this.spawnTimer=0;this.waveTimer=0;
    this.zoneSpawnTimer=CFG.capture.spawnIntervalSec*1000;
    this.eliteSpawnTimer=28000; // first elite ~28s in
    this.kills=0;this.eliteKills=0;this.level=1;this.wave=1;
    this.gameTime=0;
    this.currentXP=0;
    this.xpPerLevel=calcXpForLevel(1);           // = CFG.xp.basePerLevel = 120
    this.correctAnswers=0;this.comboCount=0;
    this.xpMultiplier=1;
    this.xpMultiplierStacks=0;
    if(this._xpBoostTimer){clearTimeout(this._xpBoostTimer);this._xpBoostTimer=null;}
    this.lastWaveEliteSpawned=0;
    this.draftPhase='none';this.chosenUpgrade=null;
    this.paused=false;this.gameOver=false;this.flashAlpha=0;
    this.usedQs.clear();
    this.overlay.classList.remove('active');
    this.chestOverlay.classList.remove('active');
    document.getElementById('buff-overlay').classList.remove('active');
    this.goOverlay.classList.remove('active');
    this.capBarWrap.style.display='none';
    this.zoneTimerBox.classList.remove('vis');
    this.eliteWarnEl.classList.remove('vis');
    this._updateHUD();
  }

  // La escena idle (fondo + grid) es estática: se pinta UNA vez en vez de
  // en bucle rAF (el bucle anterior seguía corriendo tras salir de la vista
  // y se duplicaba en cada re-entrada).
  _idleDraw(){
    if(this.started)return;
    const{ctx,W,H}=this;
    ctx.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);
    ctx.fillStyle=CFG.colors.bg;ctx.fillRect(0,0,W,H);this._drawGrid();
  }

  start(){
    this.started=true;this.startOverlay.style.display='none';
    this.init();this.running=true;this.lastTime=performance.now();
    requestAnimationFrame(ts=>this._loop(ts));
  }

  _loop(ts){
    if(!this.running)return;
    const dt=Math.min((ts-this.lastTime)/1000,0.05);
    this.lastTime=ts;this.now=ts;
    if(!this.paused&&!this.gameOver){this._update(dt);this._draw();}
    requestAnimationFrame(ts=>this._loop(ts));
  }

  // ── UPDATE ────────────────────────────────────────────────
  _update(dt){
    const{W,H,player}=this;
    player.update(dt,W,H);

    // ── Session time limit (5 min = 300 s)
    this.gameTime+=dt;
    if(this.gameTime>=300){this._triggerGameOver('time');return;}

    // ── Wave timer
    this.waveTimer+=dt*1000;
    if(this.waveTimer>=CFG.wave.durationMs){
      this.waveTimer=0;this.wave++;
      this._toast(`Bølge ${this.wave}!`,'info');
      this._checkEliteSpawn();
    }

    // ── Elite spawn timer (independent — guarantees elites appear)
    this.eliteSpawnTimer-=dt*1000;
    if(this.eliteSpawnTimer<=0){
      // Reset timer: shorter at higher levels
      const base=30000; // 30s base
      const minTimer=10000;
      this.eliteSpawnTimer=Math.max(minTimer, base-(this.level-1)*1500);
      if(this.wave>=CFG.elite.firstEliteWave) this._spawnElite();
    }

    // ── Capture zone timer
    this.zoneSpawnTimer-=dt*1000;

    // ── Enemy spawn
    const si=Math.max(350,CFG.enemy.spawnIntervalMs-(this.wave-1)*CFG.wave.spawnReduction);
    this.spawnTimer-=dt*1000;
    if(this.spawnTimer<=0){
      this.spawnTimer=si;
      const n=1+Math.floor((this.wave-1)/3);
      for(let i=0;i<n;i++)this._spawnEnemy();
    }

    // ── Projectiles auto-fire
    this.projectiles.push(...player.tryFire(dt,this.enemies));

    // ── Orbital crystals
    if(this.orbWeapon){
      this.orbWeapon.update(dt);
      this.orbWeapon.hitEnemies(this.enemies,dt,this.dmgNums,this.particles,e=>this._onEnemyDeath(e));
    }

    // ── Radial explosion
    if(this.expWeapon){
      this.expWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e));
    }

    // ── Blade-o-rang
    if(this.bladeWeapon)
      this.bladeWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e));

    // ── Guiding Hex
    if(this.hexWeapon)
      this.hexWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e));

    // ── UwU Blasters
    if(this.uwuWeapon)
      this.uwuWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e),W,H);

    // ── Ani-Mines
    if(this.mineWeapon)
      this.mineWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e));

    // ── Vortex Glove
    if(this.vortexWeapon)
      this.vortexWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e),W,H);

    // ── Gatling Bunny-Guns
    if(this.gatlingWeapon)
      this.gatlingWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e),W,H);

    // ── Tornadoes
    if(this.tornadoWeapon)
      this.tornadoWeapon.update(dt,this.enemies,this.dmgNums,this.particles,e=>this._onEnemyDeath(e),W,H);

    // ── Enemy movement + contact damage
    for(const e of this.enemies){
      if(e.isElite){
        e.update(dt,player,W,H);
        // Check laser hit on player
        const laserDmg=e.checkLaserHit(player);
        if(laserDmg>0){
          if(player.takeDamage(laserDmg)){
            this.flashAlpha=0.55;this.flashColor='rgba(255,50,50,0.22)';
            this._toast(`☠️ Laser! −${laserDmg} HP`,'bad');
          }
        }
      } else {
        e.update(dt,player);
      }
      const dmgAmt=e.isElite?e.damageOnContact:CFG.enemy.damageOnContact;
      if(dist(player,e)<player.r+e.r){
        if(player.takeDamage(dmgAmt)){this.flashAlpha=0.35;}
      }
    }

    // ── Projectiles vs enemies
    for(const p of this.projectiles){
      if(!p.alive)continue;p.update(dt,W,H);
      for(const e of this.enemies){
        if(!e.alive)continue;
        if(dist(p,e)<p.r+e.r){
          p.alive=false;
          const{died}=e.hit(p.damage);
          this.dmgNums.push(new DamageNumber(e.x,e.y-e.r,`-${p.damage}`,e.isElite?'#ff9940':'#ff6688'));
          if(died)this._onEnemyDeath(e);
          break;
        }
      }
    }

    // ── XP orbs — process ALL collected this frame, carry remainder, one level-up
    let pendingLevelUp=false;
    for(const orb of this.xpOrbs){
      orb.update(dt,player);
      if(dist(player,orb)<player.r+orb.r+4){
        orb.alive=false;
        // Always add XP (even post-levelup trigger) — carry the remainder
        const mult=Math.min(this.xpMultiplier, CFG.xp.maxMultiplier);
        // Diminishing returns: if player level exceeds wave+3, XP is reduced progressively
        const excess=Math.max(0, this.level-this.wave-3);
        const drMult=excess>0 ? 1/(1+excess*0.6) : 1;
        const gained=Math.min(CFG.enemy.xpValue*mult*drMult, this.xpPerLevel*0.40);
        this.currentXP+=gained;
        if(this.currentXP>=this.xpPerLevel&&!pendingLevelUp){
          pendingLevelUp=true;
          this.currentXP-=this.xpPerLevel; // carry the excess, don't zero it
        }
      }
    }
    if(pendingLevelUp){this._levelUp();return;}

    // ── Chests
    for(const c of this.chests){
      c.update(dt);
      if(dist(player,c)<player.r+c.r){
        c.alive=false;this._openChest();return;
      }
    }
    this.chests=this.chests.filter(c=>c.alive);

    // ── Capture zones — spawn check (timer decremented earlier)
    if(this.zoneSpawnTimer<=0){
      this.zoneSpawnTimer=CFG.capture.spawnIntervalSec*1000;
      this._spawnCaptureZone();
    }

    let isCapturing=false;
    for(const zone of this.captureZones){
      const result=zone.update(dt,player);
      if(zone.capturing)isCapturing=true;
      if(result==='captured'){
        zone.alive=false;
        this._orbitalStrike(zone.x,zone.y);
      }
    }
    this.captureZones=this.captureZones.filter(z=>z.alive);

    // Capture bar UI
    const activeZone=this.captureZones.find(z=>z.capturing||z.captureProgress>0);
    if(activeZone&&activeZone.captureProgress>0){
      this.capBarWrap.style.display='flex';
      this.capBarFill.style.width=(activeZone.captureProgress*100)+'%';
    } else {
      this.capBarWrap.style.display='none';
    }

    // Zone countdown UI
    const secsLeft=Math.ceil(this.zoneSpawnTimer/1000);
    if(secsLeft<=10&&this.captureZones.length===0){
      this.zoneTimerBox.classList.add('vis');
      this.zoneSecsEl.textContent=secsLeft;
    } else if(this.captureZones.length>0){
      this.zoneTimerBox.classList.remove('vis');
    } else {
      this.zoneTimerBox.classList.remove('vis');
    }

    // ── Strike effects
    for(const s of this.strikeEffects)s.update(dt);
    this.strikeEffects=this.strikeEffects.filter(s=>s.alive);

    // ── Orphaned lasers (from dead elites) — Bug 8
    for(const laser of this.orphanedLasers){
      laser.update(dt);
      if(laser.shouldDealDamage()&&laser.hitsPoint(player.x,player.y)){
        laser.markDamageDealt();
        if(player.takeDamage(laser.laserDamage)){
          this.flashAlpha=0.55;this.flashColor='rgba(255,50,50,0.22)';
          this._toast(`☠️ Laser! −${laser.laserDamage} HP`,'bad');
        }
      }
    }
    this.orphanedLasers=this.orphanedLasers.filter(l=>l.alive);

    // ── Particles & damage numbers
    for(const p of this.particles)p.update(dt);
    for(const d of this.dmgNums)d.update(dt);
    if(this.flashAlpha>0)this.flashAlpha=Math.max(0,this.flashAlpha-dt*2.5);

    // ── Purge dead (in-place, avoids new array allocation every frame)
    compact(this.enemies);compact(this.projectiles);compact(this.xpOrbs);
    compact(this.particles);compact(this.dmgNums);

    if(!player.alive)this._triggerGameOver();
    this._updateHUD();
  }

  // ── DRAW ──────────────────────────────────────────────────
  _draw(){
    const{ctx,W,H,now}=this;
    // Escalar el contexto por dpr: el juego dibuja en unidades lógicas (W,H)
    // y queda nítido en pantallas retina. Se fija al inicio de cada frame.
    ctx.setTransform(this.dpr||1,0,0,this.dpr||1,0,0);
    ctx.fillStyle=CFG.colors.bg;ctx.fillRect(0,0,W,H);this._drawGrid();

    // Draw capture zones (behind everything)
    for(const z of this.captureZones)z.draw(ctx);

    if(this.expWeapon)this.expWeapon.drawRings(ctx);
    for(const p of this.particles)p.draw(ctx);
    // XP orbs — glow set once for all, ~O(1) state changes instead of O(n)
    if(this.xpOrbs.length){ctx.shadowColor=CFG.colors.xpGlow;ctx.shadowBlur=8;for(const o of this.xpOrbs)o.draw(ctx,now);noGlow(ctx);}
    for(const c of this.chests)c.draw(ctx);
    for(const e of this.enemies)e.isElite?e.draw(ctx,now):e.draw(ctx);
    if(this.orbWeapon)this.orbWeapon.draw(ctx,now);
    if(this.bladeWeapon)this.bladeWeapon.draw(ctx);
    if(this.hexWeapon)this.hexWeapon.draw(ctx);
    if(this.uwuWeapon)this.uwuWeapon.draw(ctx);
    if(this.mineWeapon)this.mineWeapon.draw(ctx);
    if(this.vortexWeapon)this.vortexWeapon.draw(ctx);
    if(this.gatlingWeapon)this.gatlingWeapon.draw(ctx);
    if(this.tornadoWeapon)this.tornadoWeapon.draw(ctx);
    // Projectiles — trails first (no glow), then bodies batched with one glow state
    for(const p of this.projectiles)p.drawTrail(ctx);
    if(this.projectiles.length){ctx.shadowColor='#aaeeff';ctx.shadowBlur=10;ctx.fillStyle='#fff';for(const p of this.projectiles){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}noGlow(ctx);}
    this.player.draw(ctx,now);
    if(this.expWeapon)this.expWeapon.drawCooldownArc(ctx,this.player);
    for(const d of this.dmgNums)d.draw(ctx);

    // Strike effects on top of everything
    for(const s of this.strikeEffects)s.draw(ctx);
    // Orphaned lasers (Bug 8 — draw after elites so they appear on top during fade)
    for(const l of this.orphanedLasers)l.draw(ctx);

    noGlow(ctx);ctx.textAlign='left';
    if(this.flashAlpha>0){
      ctx.fillStyle=this.flashColor;ctx.globalAlpha=this.flashAlpha;
      ctx.fillRect(0,0,W,H);ctx.globalAlpha=1;
    }
  }

  _drawGrid(){
    if(!this._gridCanvas||this._gridW!==this.W||this._gridH!==this.H){
      const off=document.createElement('canvas');
      off.width=this.W;off.height=this.H;
      const c=off.getContext('2d');
      c.strokeStyle=CFG.colors.grid;c.lineWidth=1;const s=55;
      c.beginPath();
      for(let x=0;x<this.W;x+=s){c.moveTo(x,0);c.lineTo(x,this.H);}
      for(let y=0;y<this.H;y+=s){c.moveTo(0,y);c.lineTo(this.W,y);}
      c.stroke();
      this._gridCanvas=off;this._gridW=this.W;this._gridH=this.H;
    }
    this.ctx.drawImage(this._gridCanvas,0,0);
  }

  // ── SPAWN ─────────────────────────────────────────────────
  _spawnEnemy(){
    const{W,H}=this;const side=randInt(0,4);const pad=22;let x,y;
    if(side===0){x=rand(0,W);y=-pad}
    else if(side===1){x=W+pad;y=rand(0,H)}
    else if(side===2){x=rand(0,W);y=H+pad}
    else{x=-pad;y=rand(0,H)}
    const speed=CFG.enemy.baseSpeed+(this.wave-1)*CFG.wave.speedBoost+rand(-8,8);
    this.enemies.push(new Enemy(x,y,speed,this.wave));
  }

  _checkEliteSpawn(){
    // Extra elite bonus on milestone waves (3, 6, 9…) — in addition to timer-based spawns
    if(this.wave%CFG.elite.spawnEveryNWaves===0&&this.wave!==this.lastWaveEliteSpawned){
      this.lastWaveEliteSpawned=this.wave;
      this._spawnElite();
    }
  }

  _spawnElite(){
    const{W,H}=this;const side=randInt(0,4);const pad=60;let x,y;
    if(side===0){x=rand(W*0.2,W*0.8);y=-pad}
    else if(side===1){x=W+pad;y=rand(H*0.2,H*0.8)}
    else if(side===2){x=rand(W*0.2,W*0.8);y=H+pad}
    else{x=-pad;y=rand(H*0.2,H*0.8)}

    // Tier probability scales with wave/level
    let tier=1;
    const wv=this.wave;
    if(wv>=10){
      const r=Math.random();
      tier=r<0.25?3:r<0.65?2:1;
    } else if(wv>=5){
      tier=Math.random()<0.5?2:1;
    }

    const elite=new EliteEnemy(x,y,Math.max(1,this.wave),tier);
    this.enemies.push(elite);

    const tierNames=['','🟠 VAGT','🟣 KAPTAJN','🟡 HERRE'];
    this.eliteWarnEl.classList.add('vis');
    setTimeout(()=>this.eliteWarnEl.classList.remove('vis'),4000);
    this._toast(`${tierNames[tier]} elite spawner! Tier ${tier} · Bølge ${this.wave}`,'elite');
  }

  // ── ENEMY DEATH ───────────────────────────────────────────
  _onEnemyDeath(e){
    if(e._deathHandled)return;   // guard: only process once per entity
    e._deathHandled=true;
    this.kills++;
    if(e.isElite){
      this.eliteKills++;
      // Bug 8: adopt any active lasers so they finish their cycle
      if(e.activeLasers&&e.activeLasers.length>0){
        this.orphanedLasers.push(...e.activeLasers);
      }
      const col=e.color||'#ff6400';
      for(let i=0;i<20;i++)this.particles.push(new Particle(e.x,e.y,col,[60,220],[1.5,4]));
      for(let i=0;i<8;i++) this.particles.push(new Particle(e.x,e.y,'#ffcc44',[80,200],[1.5,3.5]));
      // XP orbs: tier * 3
      const xpCount=e.tier*3;
      for(let i=0;i<xpCount;i++)
        this.xpOrbs.push(new XpOrb(e.x+rand(-40,40),e.y+rand(-40,40)));
      // Chest
      this.chests.push(new Chest(e.x,e.y));
      // Random buffs
      const buffs=e.getDeathBuffs();
      buffs.forEach(b=>b.apply(this));
      this._showEliteBuffs(buffs,e.tier,e.label);
    } else {
      for(let i=0;i<8;i++)this.particles.push(new Particle(e.x,e.y,CFG.colors.enemy));
      this.xpOrbs.push(new XpOrb(e.x,e.y));
    }
  }

  // ── ELITE BUFF DISPLAY ────────────────────────────────────
  _showEliteBuffs(buffs,tier,label){
    this.paused=true;
    const overlay=document.getElementById('buff-overlay');
    const tierColors=['','#ff6400','#aa44ff','#ffd700'];
    const tierLabels=['','🟠 VAGT','🟣 KAPTAJN','🟡 HERRE'];
    document.getElementById('buff-tier-badge').textContent=tierLabels[tier];
    document.getElementById('buff-tier-badge').style.background=tierColors[tier];
    document.getElementById('buff-title').textContent=`${label} BESEJRET`;
    document.getElementById('buff-sub').textContent=`${buffs.length} bonus${buffs.length>1?'ser':''} aktiveret!`;

    const container=document.getElementById('buff-cards-container');
    container.innerHTML='';
    buffs.forEach(b=>{
      const card=document.createElement('div');
      card.className='buff-card';
      card.innerHTML=`
        <div class="buff-card-icon">${b.icon}</div>
        <div class="buff-card-info">
          <div class="buff-card-name">${b.name}</div>
          <div class="buff-card-desc">${b.desc}</div>
        </div>`;
      container.appendChild(card);
    });
    overlay.classList.add('active');
  }

  // ── CHEST OPEN ────────────────────────────────────────────
  _openChest(){
    this.paused=true;
    // Pick random upgrade and apply bonus immediately
    const pool=UPGRADE_POOL.filter(u=>typeof u.available!=='function'||u.available(this));
    shuffle(pool);
    const upg=pool[0];
    upg.applyBonus(this);

    // Fill DOM
    document.getElementById('cr-icon').textContent=upg.icon;
    document.getElementById('cr-name').textContent=upg.name;
    document.getElementById('cr-desc').textContent=upg.desc;
    document.getElementById('cr-bonus').textContent=upg.bonusText;

    this.chestOverlay.classList.add('active');
    this._toast(`${upg.icon} ${upg.bonusText}`,'gold');
  }

  // ── CAPTURE ZONE ──────────────────────────────────────────
  _spawnCaptureZone(){
    if(this.captureZones.length>=1)return; // only one zone at a time
    const{W,H}=this;
    const m=CFG.capture.marginPct;
    const x=rand(W*m+CFG.capture.radius,W*(1-m)-CFG.capture.radius);
    const y=rand(H*m+CFG.capture.radius+50,H*(1-m)-CFG.capture.radius);
    this.captureZones.push(new CaptureZone(x,y));
    this._toast('🌀 Fangzone opstået — stå inden i 4 sekunder!','teal');
  }

  // ── ORBITAL STRIKE ────────────────────────────────────────
  _orbitalStrike(zx,zy){
    // Kill all regular enemies instantly
    let cleared=0;
    for(const e of this.enemies){
      if(!e.isElite&&e.alive){
        e.alive=false;cleared++;
        this.kills++;
        for(let i=0;i<6;i++)this.particles.push(new Particle(e.x,e.y,'#00ffcc',[60,180],[1.5,3]));
        this.xpOrbs.push(new XpOrb(e.x,e.y));
      }
    }
    this.enemies=this.enemies.filter(e=>e.alive);
    this.strikeEffects.push(new OrbitalStrikeEffect(this.W,this.H));
    this.flashAlpha=0.6;this.flashColor='rgba(0,255,204,0.18)';
    this._toast(`☄️ ORBITAL STRIKE! ${cleared} fjender elimineret!`,'teal');
  }

  // ── LEVEL UP — STEP A: DRAFT ──────────────────────────────
  _levelUp(){
    this.level++;this.paused=true;
    this.xpPerLevel=calcXpForLevel(this.level);
    // Bug 7: scale all living elites with new player level
    for(const e of this.enemies){
      if(e.isElite) e.scaleWithLevel(this.level);
    }
    document.getElementById('lv-badge').textContent=`NIVEAU ${this.level}`;

    const options=this._pickUpgrades(3);
    const cardsEl=document.getElementById('draft-cards');
    cardsEl.innerHTML='';
    for(const upg of options){
      const card=document.createElement('div');
      card.className=`dcard rarity-${upg.rarity||'common'}`;
      const rarityLabels={common:'Opgradering',rare:'Sjælden',epic:'Episk',legendary:'✦ Legendarisk'};
      const tpLabel=rarityLabels[upg.rarity]||'Opgradering';
      const isNew=(upg.id==='orb'&&!this.orbWeapon)||(upg.id==='exp'&&!this.expWeapon)
        ||(upg.id==='blade'&&!this.bladeWeapon)||(upg.id==='hex'&&!this.hexWeapon)
        ||(upg.id==='uwu'&&!this.uwuWeapon)||(upg.id==='mines'&&!this.mineWeapon)
        ||(upg.id==='vortex'&&!this.vortexWeapon)||(upg.id==='gatling'&&!this.gatlingWeapon)
        ||(upg.id==='tornado'&&!this.tornadoWeapon);
      const tpClass=isNew?'tp-new':(upg.tpClass||'tp-up');
      card.innerHTML=`
        <span class="dcard-type-pill ${tpClass}">${isNew?'NY':tpLabel}</span>
        <div class="dcard-icon">${upg.icon}</div>
        <div class="dcard-name">${upg.name}</div>
        <div class="dcard-desc">${upg.desc}</div>
        <div class="dcard-bonus">✓ Korrekt: ${upg.bonusText}</div>`;
      card.addEventListener('click',()=>this._selectUpgrade(upg));
      cardsEl.appendChild(card);
    }
    this.draftView.style.display='block';
    this.quizView.style.display='none';
    this.draftPhase='draft';
    this.overlay.classList.add('active');
  }

  _pickUpgrades(count){
    const pool=UPGRADE_POOL.filter(u=>typeof u.available!=='function'||u.available(this));
    // Weight: legendary=1, epic=2, rare=3, common=4 — so rarer items appear less but aren't excluded
    const weighted=[];
    for(const u of pool){
      const w=u.rarity==='legendary'?1:u.rarity==='epic'?2:u.rarity==='rare'?3:4;
      for(let i=0;i<w;i++)weighted.push(u);
    }
    shuffle(weighted);
    // Deduplicate
    const seen=new Set();const result=[];
    for(const u of weighted){if(!seen.has(u.id)){seen.add(u.id);result.push(u)}if(result.length>=count)break}
    // Pad with shuffled pool if needed
    if(result.length<count){
      for(const u of shuffle([...pool])){if(!seen.has(u.id)){seen.add(u.id);result.push(u)}if(result.length>=count)break}
    }
    return result;
  }

  // ── LEVEL UP — STEP B: QUIZ ───────────────────────────────
  _selectUpgrade(upg){
    this.chosenUpgrade=upg;this.draftPhase='quiz';
    this.qAnswered=false;this.qCorrect=false;
    document.getElementById('chosen-icon').textContent=upg.icon;
    document.getElementById('chosen-name').textContent=upg.name;
    document.getElementById('chosen-bonus-txt').textContent=`${upg.bonusText} (vs basis: ${upg.baseText})`;
    document.getElementById('result-banner').textContent='';
    document.getElementById('result-banner').style.color='';
    document.getElementById('reward-preview').innerHTML='';
    document.getElementById('reward-preview').classList.remove('vis');
    this.continueBtn.classList.remove('active');

    this.currentQ=this._pickQuestion();
    const catMap={'translate-to-es':'→ Spansk','translate-to-da':'→ Dansk','fill-blank':'Udfyld','meaning':'Hvad betyder'};
    document.getElementById('q-pill').textContent=`${this.currentQ.category} — ${catMap[this.currentQ.type]||''}`;
    document.getElementById('question-text').innerHTML=this.currentQ.q;
    const hint=document.getElementById('q-hint');
    if(this.currentQ.hint){hint.textContent=`💡 Tip: ${this.currentQ.hint}`;hint.style.display='block'}
    else{hint.style.display='none'}

    const grid=document.getElementById('answers-grid');
    grid.innerHTML='';
    const indices=this.currentQ.answers.map((_,i)=>i);
    shuffle(indices);
    const newCorrect=indices.indexOf(this.currentQ.correct);
    indices.forEach((origIdx,newIdx)=>{
      const btn=document.createElement('button');btn.className='abtn';
      btn.innerHTML=`<span class="al">${String.fromCharCode(65+newIdx)}.</span>${this.currentQ.answers[origIdx]}`;
      btn.addEventListener('click',()=>this._onAnswer(origIdx===this.currentQ.correct,btn,newCorrect,grid));
      grid.appendChild(btn);
    });
    document.getElementById('ps-level').textContent=this.level;
    document.getElementById('ps-correct').textContent=this.correctAnswers;
    document.getElementById('ps-combo').textContent=`×${this.comboCount}`;
    this.draftView.style.display='none';
    this.quizView.style.display='block';
  }

  _pickQuestion(){
    let pool=QUESTIONS.filter((_,i)=>!this.usedQs.has(i));
    if(!pool.length){this.usedQs.clear();pool=QUESTIONS}
    const q=pool[randInt(0,pool.length)];
    this.usedQs.add(QUESTIONS.indexOf(q));return q;
  }

  // ── LEVEL UP — STEP C: RESOLVE ────────────────────────────
  _onAnswer(isCorrect,clickedBtn,correctNewIdx,grid){
    if(this.qAnswered)return;
    this.qAnswered=true;
    grid.querySelectorAll('.abtn').forEach(b=>b.disabled=true);
    grid.querySelectorAll('.abtn')[correctNewIdx].classList.add('correct');
    const banner=document.getElementById('result-banner');
    const upg=this.chosenUpgrade;
    if(isCorrect){
      clickedBtn.classList.add('correct');
      this.qCorrect=true;this.correctAnswers++;this.comboCount++;
      banner.textContent='✓ KORREKT! Bonus opgradering!';banner.style.color='#39ff14';
      this._showRewardCards(upg,true);
    } else {
      if(!clickedBtn.classList.contains('correct'))clickedBtn.classList.add('wrong');
      this.comboCount=0;
      banner.textContent='✗ FORKERT — Basis opgradering';banner.style.color='#ff2244';
      this._showRewardCards(upg,false);
    }
    this.continueBtn.classList.add('active');
  }

  _showRewardCards(upg,bonus){
    const row=document.getElementById('reward-preview');
    row.innerHTML='';
    const main=document.createElement('div');
    main.className=`rcard ${bonus?'gold-card':''}`;
    main.innerHTML=`<div class="rcard-icon">${upg.icon}</div>
      <div class="rcard-val">${bonus?upg.bonusText:upg.baseText}</div>
      <div>${upg.name}</div>`;
    row.appendChild(main);
    // Combo indicator (visual only — no extra xp multiplier stacking here)
    if(bonus&&this.comboCount>=3){
      const combo=document.createElement('div');
      combo.className='rcard orng-card';
      combo.innerHTML=`<div class="rcard-icon">🔥</div>
        <div class="rcard-val">Combo ×${this.comboCount}</div>
        <div>−30ms skudhastighed</div>`;
      row.appendChild(combo);
    }
    row.classList.add('vis');
  }

  _onContinue(){
    const upg=this.chosenUpgrade;if(!upg)return;
    if(this.qCorrect){
      upg.applyBonus(this);
      this._toast(`${upg.icon} ${upg.bonusText}`,'good');
      if(this.comboCount>0&&this.comboCount%3===0){
        CFG.player.fireRateMs=Math.max(100,CFG.player.fireRateMs-30);
        this._toast('⚡ Skudhastighed +','info');
      }
    } else {
      upg.applyBase(this);
      this._toast(`${upg.icon} ${upg.baseText} (ingen bonus)`,'bad');
    }
    this.chosenUpgrade=null;this.draftPhase='none';
    this.overlay.classList.remove('active');
    this.paused=false;this.lastTime=performance.now();
    this._updateHUD();
  }

  // ── GAME OVER ─────────────────────────────────────────────
  _triggerGameOver(reason='death'){
    this.gameOver=true;
    const elapsed=Math.min(this.gameTime,300);
    const tm=Math.floor(elapsed/60),ts=Math.floor(elapsed%60);
    const timeStr=`${tm}:${String(ts).padStart(2,'0')}`;
    const isTimeout=reason==='time';
    document.querySelector('#go-overlay .ls-go-icon').textContent=isTimeout?'⏱':'☠';
    document.querySelector('#go-overlay .ls-go-title').textContent=isTimeout?'TID UD!':'GAME OVER';
    document.querySelector('#go-overlay .ls-panel-sub').textContent=isTimeout
      ?'5 minutters grænse nået — godt spillet!'
      :'Din rejse er forbi … denne gang.';
    document.getElementById('go-kills').textContent  =this.kills;
    document.getElementById('go-elites').textContent =this.eliteKills;
    document.getElementById('go-level').textContent  =this.level;
    document.getElementById('go-correct').textContent=this.correctAnswers;
    document.getElementById('go-proj').textContent   =this.player.numProjectiles;
    document.getElementById('go-orb').textContent    =this.orbWeapon?this.orbWeapon.count:0;
    document.getElementById('go-time').textContent   =timeStr;
    // ── Score & power
    const numProj=this.player.numProjectiles;
    const orbCount=this.orbWeapon?this.orbWeapon.count:0;
    const power=this.level*100+numProj*15+orbCount*25;
    const score=this.wave*1000+power+this.kills*8+this.eliteKills*150+this.correctAnswers*30;
    this.finalScore=score;this.finalWave=this.wave;this.finalPower=power;
    document.getElementById('go-score').textContent=score.toLocaleString('da-DK');
    // Reset alias form
    const aliasSection=document.getElementById('go-alias-section');
    const aliasInput=document.getElementById('go-alias-input');
    if(aliasSection){aliasSection.style.display='flex';}
    if(aliasInput){aliasInput.value='';}
    const statusEl=document.getElementById('go-alias-status');
    if(statusEl)statusEl.textContent='';
    this._loadLeaderboard();
    this.goOverlay.classList.add('active');
  }

  // ── LEADERBOARD ───────────────────────────────────────────
  async _loadLeaderboard(){
    const lb=document.getElementById('go-lb-list');
    if(!lb)return;
    lb.innerHTML='<span class="ls-go-lb-loading">Indlæser…</span>';
    const db=lsGetDb();
    if(!db){lb.innerHTML='<span class="ls-go-lb-empty">Ingen forbindelse</span>';return;}
    try{
      const{data,error}=await db.from('linguastrike_scores')
        .select('alias,score,wave,power').order('score',{ascending:false}).limit(10);
      if(error||!data||!data.length){lb.innerHTML='<span class="ls-go-lb-empty">Ingen scores endnu.</span>';return;}
      const medals=['🥇','🥈','🥉'];
      lb.innerHTML=data.map((r,i)=>`
<div class="ls-lb-row${r.alias===this._lastSavedAlias?' ls-lb-row-self':''}">
  <span class="ls-lb-rank">${medals[i]||String(i+1)}</span>
  <span class="ls-lb-alias">${escapeHTML(r.alias)}</span>
  <span class="ls-lb-score">${Number(r.score).toLocaleString('da-DK')}</span>
  <span class="ls-lb-wave">B${Number(r.wave)||1}</span>
</div>`).join('');
    }catch{lb.innerHTML='<span class="ls-go-lb-empty">Fejl ved indlæsning.</span>';}
  }

  // ── HUD ───────────────────────────────────────────────────
  _updateHUD(){
    const p=this.player;
    document.getElementById('hud-level').textContent  =this.level;
    document.getElementById('hud-proj').textContent   =p.numProjectiles;
    document.getElementById('hud-kills').textContent  =this.kills;
    document.getElementById('hud-elites').textContent =this.eliteKills;
    document.getElementById('hud-wave').textContent   =this.wave;
    document.getElementById('hud-correct').textContent=this.correctAnswers;
    document.getElementById('hud-combo').textContent  =`×${this.comboCount}`;
    const xpPct=(this.currentXP/this.xpPerLevel)*100;
    document.getElementById('xp-fill').style.width  =xpPct+'%';
    const multTxt=this.xpMultiplier>1?` ×${this.xpMultiplier.toFixed(1)}`:'';
    const drExcess=Math.max(0,this.level-this.wave-3);
    const drTxt=drExcess>0?` ↓${Math.round(100/(1+drExcess*0.6))}%`:'';
    document.getElementById('hud-xp-txt').textContent=`${Math.floor(this.currentXP)} / ${this.xpPerLevel}${multTxt}${drTxt}`;
    // Timer countdown
    const remaining=Math.ceil(Math.max(0,300-this.gameTime));
    const rm=Math.floor(remaining/60),rs=remaining%60;
    const timerEl=document.getElementById('hud-timer');
    if(timerEl){
      timerEl.textContent=`${rm}:${String(rs).padStart(2,'0')}`;
      timerEl.style.color=remaining<=30?'#ff4040':remaining<=60?'#ffaa00':'';
      timerEl.closest('.ls-hud-block-timer').classList.toggle('timer-urgent',remaining<=30);
    }
    const hpPct=(p.hp/p.maxHp)*100;
    document.getElementById('hp-fill').style.width  =hpPct+'%';
    document.getElementById('hud-hp-txt').textContent=Math.ceil(p.hp);
    const hpBar=document.getElementById('hp-fill');
    hpBar.style.background=hpPct>50?'linear-gradient(90deg,#ff2244,#ff6633)':
      hpPct>25?'linear-gradient(90deg,#ff6600,#ffaa00)':'linear-gradient(90deg,#ff0000,#ff2244)';
    const wiOrb=document.getElementById('wi-orb');
    const wiExp=document.getElementById('wi-exp');
    if(this.orbWeapon){
      wiOrb.style.display='flex';wiOrb.classList.add('active-orb');
      document.getElementById('wi-orb-lv').textContent=this.orbWeapon.count;
    }
    if(this.expWeapon){
      wiExp.style.display='flex';wiExp.classList.add('active-exp');
      document.getElementById('wi-exp-lv').textContent=this.expWeapon.level;
    }
  }

  // ── TOAST ─────────────────────────────────────────────────
  _toast(msg,type='info'){
    const c=document.getElementById('toasts');
    const el=document.createElement('div');
    el.className=`toast ${type}`;el.textContent=msg;
    c.appendChild(el);setTimeout(()=>el.remove(),2200);
  }

  // ── BIND ──────────────────────────────────────────────────
  _bindUI(){
    window.addEventListener('keydown',e=>{
      if(this.player)this.player.handleKey(e.code,true);
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    });
    window.addEventListener('keyup',e=>{if(this.player)this.player.handleKey(e.code,false)});

    this.startBtn.addEventListener('click',()=>this.start());
    this.continueBtn.addEventListener('click',()=>this._onContinue());
    this.chestCloseBtn.addEventListener('click',()=>{
      this.chestOverlay.classList.remove('active');
      this.paused=false;this.lastTime=performance.now();this._updateHUD();
    });
    this.buffCloseBtn.addEventListener('click',()=>{
      document.getElementById('buff-overlay').classList.remove('active');
      this.paused=false;this.lastTime=performance.now();this._updateHUD();
    });
    this.restartBtn.addEventListener('click',()=>{
      this.goOverlay.classList.remove('active');
      this.running=false;
      setTimeout(()=>{
        this.init();this.running=true;this.lastTime=performance.now();
        requestAnimationFrame(ts=>this._loop(ts));
      },60);
    });
  }
}

// ── BOOT ─────────────────────────────────────────────────────
// Adaptado para integrarse en la SPA "din klasseværelsets hjørne".
// El juego ya NO se auto-inicia; se expone window.LinguaStrike con
// start()/stop() que se llaman desde el router de script.js.

(function exposeLinguaStrikeAPI(){
  let _game = null;
  const _originalQuestionsLen = QUESTIONS.length;

  // Patch _bindUI ONCE so:
  //  - keyboard listeners gate on body.spil-active (don't break inputs elsewhere)
  //  - preventDefault only fires when the spil view is active
  Game.prototype._bindUI = function(){
    const self = this;
    const isActive = ()=>document.body.classList.contains('spil-active');
    window.addEventListener('keydown',e=>{
      if(!isActive()) return;
      if(self.player) self.player.handleKey(e.code, true);
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup',e=>{
      if(!isActive()) return;
      if(self.player) self.player.handleKey(e.code, false);
    });
    this.startBtn.addEventListener('click',()=>this.start());
    this.continueBtn.addEventListener('click',()=>this._onContinue());
    this.chestCloseBtn.addEventListener('click',()=>{
      this.chestOverlay.classList.remove('active');
      this.paused=false;this.lastTime=performance.now();this._updateHUD();
    });
    this.buffCloseBtn.addEventListener('click',()=>{
      document.getElementById('buff-overlay').classList.remove('active');
      this.paused=false;this.lastTime=performance.now();this._updateHUD();
    });
    this.restartBtn.addEventListener('click',()=>{
      this.goOverlay.classList.remove('active');
      this.running=false;
      setTimeout(()=>{
        this.init();this.running=true;this.lastTime=performance.now();
        requestAnimationFrame(ts=>this._loop(ts));
      },60);
    });

    // ── ALIAS SUBMIT ──────────────────────────────────────────
    const aliasSubmitBtn=document.getElementById('go-alias-submit');
    const aliasInputEl=document.getElementById('go-alias-input');
    if(aliasSubmitBtn&&aliasInputEl){
      const doSubmit=async()=>{
        const alias=aliasInputEl.value.trim();
        const statusEl=document.getElementById('go-alias-status');
        if(!alias||alias.length<2){
          statusEl.style.color='#fca5a5';statusEl.textContent='Alias skal have mindst 2 tegn.';return;
        }
        aliasSubmitBtn.disabled=true;
        statusEl.style.color='rgba(255,255,255,.5)';statusEl.textContent='Gemmer…';
        const db=lsGetDb();
        if(!db){statusEl.style.color='#fca5a5';statusEl.textContent='Ingen databaseforbindelse.';aliasSubmitBtn.disabled=false;return;}
        try{
          const{error}=await db.from('linguastrike_scores').insert({
            alias,score:self.finalScore||0,wave:self.finalWave||1,power:self.finalPower||0
          });
          if(error)throw error;
          self._lastSavedAlias=alias;
          statusEl.style.color='#4ade80';statusEl.textContent='✅ Score gemt!';
          document.getElementById('go-alias-section').style.display='none';
          self._loadLeaderboard();
        }catch(err){
          statusEl.style.color='#fca5a5';
          statusEl.textContent='Fejl: '+((err&&err.message)||'prøv igen.');
          aliasSubmitBtn.disabled=false;
        }
      };
      aliasSubmitBtn.addEventListener('click',doSubmit);
      aliasInputEl.addEventListener('keydown',e=>{if(e.key==='Enter')doSubmit();});
    }

    // ── JOYSTICK DINÁMICO ─────────────────────────────────────
    // Aparece en el punto de primer toque; el knob sigue al dedo;
    // desaparece al soltar. Mapea dx/dy → W/A/S/D con zona muerta.
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('has-touch');

    if (isTouch) {
      const OUTER_R   = 45;              // mitad del contenedor (90 px)
      const MAX_DISP  = 40;              // recorrido del knob hasta velocidad máxima
      const DEAD_FRAC = 0.12;            // zona muerta como fracción del recorrido

      const gameRoot = document.getElementById('ls-root');
      const joyEl    = document.getElementById('ls-joystick');
      const joyKnob  = joyEl && joyEl.querySelector('.joystick-knob');

      let activeId = null;   // pointerId que controla el joystick
      let cX = 0, cY = 0;   // centro del joystick en coordenadas de #ls-root

      function joyRelease() {
        activeId = null;
        if (joyEl)   joyEl.style.display = 'none';
        if (joyKnob) joyKnob.style.transform = 'translate(-50%,-50%)';
        if (self.player) self.player.clearAnalog();
      }

      if (gameRoot && joyEl && joyKnob) {
        // Activar joystick al tocar el área de juego (excluir UI)
        gameRoot.addEventListener('pointerdown', e => {
          if (!isActive() || activeId !== null) return;
          if (e.target.closest('button,.ls-overlay,.ls-hud,.ls-capbar,.ls-zonetimer')) return;

          activeId = e.pointerId;
          const rect = gameRoot.getBoundingClientRect();
          // Centrar el joystick en el toque; clamp para que no salga de pantalla
          cX = Math.max(OUTER_R, Math.min(rect.width  - OUTER_R, e.clientX - rect.left));
          cY = Math.max(OUTER_R, Math.min(rect.height - OUTER_R, e.clientY - rect.top));

          joyEl.style.left    = (cX - OUTER_R) + 'px';
          joyEl.style.top     = (cY - OUTER_R) + 'px';
          joyEl.style.display = 'block';
          joyKnob.style.transform = 'translate(-50%,-50%)';

          // Capturar el pointer para recibir pointermove aunque salga del elemento
          try { gameRoot.setPointerCapture(e.pointerId); } catch(_) {}
          e.preventDefault();
        }, { passive: false });

        // Mover knob y actualizar teclas virtuales
        gameRoot.addEventListener('pointermove', e => {
          if (!isActive() || e.pointerId !== activeId) return;

          const rect = gameRoot.getBoundingClientRect();
          let dx = (e.clientX - rect.left) - cX;
          let dy = (e.clientY - rect.top)  - cY;
          let dist = Math.hypot(dx, dy);
          if (dist > MAX_DISP) { dx = dx / dist * MAX_DISP; dy = dy / dist * MAX_DISP; dist = MAX_DISP; }

          joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

          if (self.player) {
            // Vector normalizado (0..1). Por debajo de la zona muerta → parar.
            const mag = dist / MAX_DISP;
            if (mag <= DEAD_FRAC) {
              self.player.clearAnalog();
            } else {
              // Remapear (mag-dead)/(1-dead) → la velocidad crece suave desde el
              // borde de la zona muerta hasta el máximo, conservando la dirección.
              const t = Math.min(1, (mag - DEAD_FRAC) / (1 - DEAD_FRAC));
              const k = t / mag;           // escala dirección·acelerador
              self.player.setAnalog((dx / MAX_DISP) * k, (dy / MAX_DISP) * k);
            }
          }
          e.preventDefault();
        }, { passive: false });

        gameRoot.addEventListener('pointerup',     e => { if (e.pointerId === activeId) joyRelease(); });
        gameRoot.addEventListener('pointercancel', e => { if (e.pointerId === activeId) joyRelease(); });
      }
    }
  };

  // Inyecta preguntas dinámicas a partir del vocabulario del Tablón.
  async function injectTablonVocab(){
    QUESTIONS.length = _originalQuestionsLen;
    let vocab = [];
    try { vocab = JSON.parse(localStorage.getItem('vocab')||'[]'); }
    catch { vocab = []; }
    if(!Array.isArray(vocab) || vocab.length < 2) return;

    async function translate(word){
      if(typeof window.myMemoryTranslate === 'function'){
        try { return await window.myMemoryTranslate(word, 'es|da'); }
        catch { return null; }
      }
      try {
        // Timeout de 4s: si la red falla/cuelga, no dejamos fetches colgados.
        const ctrl = new AbortController();
        const to = setTimeout(()=>ctrl.abort(), 4000);
        const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=es|da', { signal: ctrl.signal });
        clearTimeout(to);
        const d = await r.json();
        return (d.responseData && d.responseData.translatedText) || null;
      } catch { return null; }
    }

    const pairs = [];
    const slice = vocab.slice(0, 12);
    for(const w of slice){
      const da = await translate(w);
      if(da && da.toLowerCase() !== w.toLowerCase()){
        pairs.push({ es:w, da:da });
      }
    }
    if(pairs.length < 2) return;

    const allDa = pairs.map(p=>p.da);
    pairs.forEach(({es, da}) => {
      const distractors = shuffle(allDa.filter(x => x !== da)).slice(0, 3);
      if(distractors.length < 3) return;
      const opts = shuffle([da, ...distractors]).map(val => escapeHTML(val));
      QUESTIONS.push({
        type:'meaning', category:'Tablón',
        q:'Hvad betyder <span class="qword">' + escapeHTML(es) + '</span>?',
        answers: opts,
        correct: opts.indexOf(escapeHTML(da)),
      });
    });
  }

  let _onResize = null;

  window.LinguaStrike = {
    /**
     * Prepares the game view. Creates the Game instance on first call,
     * reuses it on subsequent calls (no stacked listeners). Shows the
     * start overlay; player clicks "Start" to actually begin.
     */
    start(){
      // El juego se prepara SIN esperar a la red: antes esto hacía
      // `await injectTablonVocab()` (traducciones por fetch) antes de crear
      // el Game, así que con conexión lenta/sin internet el canvas quedaba en
      // blanco y el botón START no respondía. Ahora el vocab se inyecta en
      // segundo plano y la partida es jugable al instante.
      if(!_game){
        _game = new Game();

        // Override _resize so canvas matches the spil view container.
        // W/H lógicos = tamaño CSS del contenedor; backing store × dpr (cap 2)
        // para nitidez retina. El render escala con ctx.setTransform(dpr).
        _game._resize = function(){
          const container = document.getElementById('view-spil');
          const cssW = (container && container.clientWidth)  || window.innerWidth;
          const cssH = (container && container.clientHeight) || window.innerHeight;
          const dpr  = Math.min(window.devicePixelRatio||1, 2);
          this.W = cssW; this.H = cssH; this.dpr = dpr;
          this.canvas.width  = Math.round(cssW*dpr);
          this.canvas.height = Math.round(cssH*dpr);
          this.canvas.style.width  = cssW+'px';
          this.canvas.style.height = cssH+'px';
        };

        _onResize = ()=>{
          if(!_game) return;
          _game._resize();
          // El resize limpia el canvas; si estamos en el overlay START, repintar la escena idle
          if(!_game.started && document.body.classList.contains('spil-active')) _game._idleDraw();
        };
        window.addEventListener('resize', _onResize);
      }

      _game._resize();

      // Always show the start overlay when (re-)entering. If a game was
      // in progress, reset to a clean state so the start screen is meaningful.
      _game.running = false;
      _game.started = false;
      _game.paused  = true;
      ['level-overlay','chest-overlay','buff-overlay','go-overlay']
        .forEach(id=>{
          const el = document.getElementById(id);
          if(el) el.classList.remove('active');
        });
      const startOv = document.getElementById('start-overlay');
      if(startOv) startOv.style.display = '';
      // Kick the idle draw so the canvas isn't blank
      _game._idleDraw();

      // Enriquecer las preguntas con el vocabulario del Tablón en segundo
      // plano (no bloquea el render ni el botón START).
      injectTablonVocab().catch(err=>console.warn('[LinguaStrike] vocab inject failed', err));
    },

    /** Stops the loop and hides overlays — keeps the Game in memory. */
    stop(){
      if(_game){
        _game.running = false;
        _game.paused  = true;
        ['level-overlay','chest-overlay','buff-overlay','go-overlay']
          .forEach(id=>{
            const el = document.getElementById(id);
            if(el) el.classList.remove('active');
          });
      }
    },
  };
})();
