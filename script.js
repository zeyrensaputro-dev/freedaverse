/* ===============================
   0) State
================================ */
let audioCtx = null;
let sfxOn = true;

let autoOn = true;
let autoTimer = null;

const STORAGE_KEY = "tyos_rps_scores_v1";
const STREAK_KEY = "tyos_rps_streak_v1";

/* ===============================
   1) WebAudio SFX (no mp3)
================================ */
function ensureAudio(){
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function beep({freq=440, dur=0.08, type="sine", gain=0.04} = {}){
  if (!sfxOn) return;
  ensureAudio();
  const t0 = audioCtx.currentTime;

  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function sfxClick(){ beep({freq:740, dur:0.06, type:"triangle", gain:0.035}); }
function sfxWin(){ beep({freq:523.25, dur:0.09, type:"sine", gain:0.05}); setTimeout(()=>beep({freq:659.25, dur:0.10, type:"sine", gain:0.05}), 95); }
function sfxLose(){ beep({freq:220, dur:0.12, type:"sawtooth", gain:0.04}); setTimeout(()=>beep({freq:196, dur:0.12, type:"sawtooth", gain:0.04}), 120); }
function sfxDraw(){ beep({freq:392, dur:0.08, type:"square", gain:0.035}); }

/* unlock audio on first gesture */
window.addEventListener("pointerdown", () => { try{ ensureAudio(); }catch{} }, { once:true });

/* ===============================
   2) Typing cinematic (improved text)
================================ */
const line1Text = "Apa yang kamu cari di sini? Nggak ada apa-apa kok 😹";
const line2Text = "Tapi kalau mau main suit, klik tombol atau pilih ikon di bawah—nanti lawan bot, awok 😼";

function typeInto(el, text, speed=32){
  return new Promise((resolve)=>{
    let i=0;
    const timer = setInterval(()=>{
      el.textContent += text[i] || "";
      i++;
      if (i >= text.length){
        clearInterval(timer);
        el.classList.add("done");
        resolve();
      }
    }, speed);
  });
}

/* ===============================
   3) Auto-scroll cinematic
================================ */
function startAutoScroll(){
  stopAutoScroll();
  autoTimer = setTimeout(()=>{
    if (!autoOn) return;
    document.querySelector("#suit").scrollIntoView({behavior:"smooth"});
    autoTimer = setTimeout(()=>{
      if (!autoOn) return;
      window.scrollTo({top:0, behavior:"smooth"});
      startAutoScroll();
    }, 12000);
  }, 9000);
}
function stopAutoScroll(){
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = null;
}

/* ===============================
   4) RPS + local save + streak
================================ */
const MOVES = ["rock","paper","scissors"];
const emoji = { rock:"✊ Batu", paper:"✋ Kertas", scissors:"✌️ Gunting" };

const scoreYouEl = document.getElementById("scoreYou");
const scoreBotEl = document.getElementById("scoreBot");
const scoreDrawEl = document.getElementById("scoreDraw");

const youPickEl = document.getElementById("youPick");
const botPickEl = document.getElementById("botPick");
const resultTextEl = document.getElementById("resultText");
const resultBox = document.getElementById("resultBox");
const streakEl = document.getElementById("streak");

let scoreYou = 0, scoreBot = 0, scoreDraw = 0, streak = 0;

function loadScores(){
  try{
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    scoreYou = Number(s.you || 0);
    scoreBot = Number(s.bot || 0);
    scoreDraw = Number(s.draw || 0);
    streak = Number(localStorage.getItem(STREAK_KEY) || 0);
  }catch{}
  updateScore();
}

function saveScores(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify({you:scoreYou, bot:scoreBot, draw:scoreDraw}));
  localStorage.setItem(STREAK_KEY, String(streak));
}

function updateScore(){
  scoreYouEl.textContent = String(scoreYou);
  scoreBotEl.textContent = String(scoreBot);
  scoreDrawEl.textContent = String(scoreDraw);
  streakEl.textContent = "Streak: " + String(streak);
}

function botMove(){
  return MOVES[Math.floor(Math.random()*MOVES.length)];
}

function judge(you, bot){
  if (you === bot) return "draw";
  if (
    (you === "rock" && bot === "scissors") ||
    (you === "paper" && bot === "rock") ||
    (you === "scissors" && bot === "paper")
  ) return "win";
  return "lose";
}

function flashBox(kind){
  resultBox.classList.remove("flashWin","flashLose","flashDraw","shake");
  void resultBox.offsetWidth;
  resultBox.classList.add("shake");
  if (kind === "win") resultBox.classList.add("flashWin");
  if (kind === "lose") resultBox.classList.add("flashLose");
  if (kind === "draw") resultBox.classList.add("flashDraw");
}

document.querySelectorAll(".pick").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    sfxClick();

    const you = btn.dataset.move;
    const bot = botMove();
    const res = judge(you, bot);

    youPickEl.textContent = "Kamu: " + emoji[you];
    botPickEl.textContent = "Bot: " + emoji[bot];

    if (res === "win"){
      scoreYou++; streak++;
      resultTextEl.textContent = "KAMU MENANG 😼⚡";
      flashBox("win"); sfxWin();
    } else if (res === "lose"){
      scoreBot++; streak = 0;
      resultTextEl.textContent = "KAMU KALAH 😹💀";
      flashBox("lose"); sfxLose();
    } else {
      scoreDraw++;
      resultTextEl.textContent = "SERI 😐✨";
      flashBox("draw"); sfxDraw();
    }

    updateScore();
    saveScores();
  });
});

document.getElementById("resetScore").addEventListener("click", ()=>{
  sfxClick();
  scoreYou = scoreBot = scoreDraw = 0; streak = 0;
  updateScore(); saveScores();
  resultTextEl.textContent = "Skor di-reset. Run it back 😼";
  flashBox("draw");
});

/* ===============================
   5) Nav buttons
================================ */
document.getElementById("toSuit").addEventListener("click", ()=>{
  sfxClick();
  document.querySelector("#suit").scrollIntoView({behavior:"smooth"});
});

document.getElementById("backTop").addEventListener("click", ()=>{
  sfxClick();
  window.scrollTo({top:0, behavior:"smooth"});
});

document.getElementById("toggleAuto").addEventListener("click", (e)=>{
  sfxClick();
  autoOn = !autoOn;
  e.target.textContent = "Auto Scroll: " + (autoOn ? "ON" : "OFF");
  if (autoOn) startAutoScroll();
  else stopAutoScroll();
});

/* ===============================
   6) SFX toggle
================================ */
document.getElementById("muteBtn").addEventListener("click", (e)=>{
  sfxClick();
  sfxOn = !sfxOn;
  e.target.textContent = "SFX: " + (sfxOn ? "ON" : "OFF");
});

/* ===============================
   7) Cyberpunk background particles
================================ */
const canvas = document.getElementById("bg");
const ctx = canvas.getContext("2d");

function resize(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener("resize", ()=>{ resize(); rebuildParticles(); });
resize();

let particles = [];
function rand(a,b){ return a + Math.random()*(b-a); }

function rebuildParticles(){
  const PCOUNT = Math.min(160, Math.floor((window.innerWidth*window.innerHeight)/12000));
  particles = [];
  for (let i=0;i<PCOUNT;i++){
    particles.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      r: rand(1.1, 3.0),
      vx: rand(-0.28, 0.28),
      vy: rand(-0.22, 0.22),
      tw: rand(0, Math.PI*2),
      hue: Math.random() < 0.55 ? "neon" : "pink"
    });
  }
}
rebuildParticles();

function draw(){
  // base wash
  ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
  const g = ctx.createRadialGradient(
    window.innerWidth*0.35, window.innerHeight*0.25, 60,
    window.innerWidth*0.55, window.innerHeight*0.55, Math.max(window.innerWidth, window.innerHeight)
  );
  g.addColorStop(0, "rgba(124,77,255,0.12)");
  g.addColorStop(0.42, "rgba(0,255,213,0.07)");
  g.addColorStop(0.7, "rgba(255,43,214,0.05)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,window.innerWidth, window.innerHeight);

  // particles
  for (const p of particles){
    p.tw += 0.03;
    p.x += p.vx + Math.sin(p.tw)*0.05;
    p.y += p.vy + Math.cos(p.tw)*0.05;

    if (p.x < -20) p.x = window.innerWidth + 20;
    if (p.x > window.innerWidth + 20) p.x = -20;
    if (p.y < -20) p.y = window.innerHeight + 20;
    if (p.y > window.innerHeight + 20) p.y = -20;

    const alpha = 0.18 + (Math.sin(p.tw)*0.06);
    const color = p.hue === "neon"
      ? `rgba(0,255,213,${alpha})`
      : `rgba(255,43,214,${alpha*0.9})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  // connecting lines
  for (let i=0;i<particles.length;i++){
    for (let j=i+1;j<particles.length;j++){
      const a = particles[i], b = particles[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const d = Math.hypot(dx,dy);
      if (d < 130){
        const a2 = (1 - d/130) * 0.10;
        ctx.strokeStyle = `rgba(0,255,213,${a2})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x,a.y);
        ctx.lineTo(b.x,b.y);
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}
draw();

/* ===============================
   8) Mouse glow follower
================================ */
const glow = document.getElementById("mouseGlow");
window.addEventListener("mousemove", (e)=>{
  glow.style.left = e.clientX + "px";
  glow.style.top = e.clientY + "px";
});

/* ===============================
   9) Terminal mode
================================ */
const overlay = document.getElementById("terminalOverlay");
const out = document.getElementById("terminalOut");
const input = document.getElementById("terminalIn");

function termPrint(line){
  const div = document.createElement("div");
  div.textContent = line;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function openTerminal(){
  sfxClick();
  overlay.classList.remove("hidden");
  input.focus();
  if (!out.dataset.booted){
    out.dataset.booted = "1";
    termPrint("TYOS:// booting...");
    termPrint("Ketik 'help' buat lihat command.");
    termPrint("—");
  }
}
function closeTerminal(){
  sfxClick();
  overlay.classList.add("hidden");
}

document.getElementById("openTerminal").addEventListener("click", openTerminal);
document.getElementById("closeTerminal").addEventListener("click", closeTerminal);
overlay.addEventListener("click", (e)=>{ if (e.target === overlay) closeTerminal(); });

input.addEventListener("keydown", (e)=>{
  if (e.key !== "Enter") return;
  const cmd = input.value.trim().toLowerCase();
  input.value = "";
  if (!cmd) return;

  termPrint("> " + cmd);

  if (cmd === "help"){
    termPrint("Command list:");
    termPrint("- about : info website");
    termPrint("- suit  : scroll ke arena suit");
    termPrint("- top   : balik ke atas");
    termPrint("- clear : bersihin terminal");
    termPrint("- sfx   : toggle sound");
  } else if (cmd === "about"){
    termPrint("Website ini dibuat oleh King Tyos.");
    termPrint("Di sini nggak ada apa-apa... kecuali suit lawan bot 😹");
  } else if (cmd === "suit"){
    closeTerminal();
    document.querySelector("#suit").scrollIntoView({behavior:"smooth"});
  } else if (cmd === "top"){
    closeTerminal();
    window.scrollTo({top:0, behavior:"smooth"});
  } else if (cmd === "clear"){
    out.innerHTML = "";
  } else if (cmd === "sfx"){
    sfxOn = !sfxOn;
    document.getElementById("muteBtn").textContent = "SFX: " + (sfxOn ? "ON" : "OFF");
    termPrint("SFX => " + (sfxOn ? "ON" : "OFF"));
  } else {
    termPrint("Unknown command. ketik 'help'.");
  }
});

/* ===============================
   10) Boot
================================ */
window.addEventListener("load", async ()=>{
  // typing
  const l1 = document.getElementById("line1");
  const l2 = document.getElementById("line2");
  await typeInto(l1, line1Text, 30);
  await typeInto(l2, line2Text, 24);

  // load saved scores
  loadScores();

  // auto scroll loop
  if (autoOn) startAutoScroll();
});
