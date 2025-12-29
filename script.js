/* ===============================
   FREEDAVERSE RPS FINAL
================================ */

// ---------- Typing ----------
const lines = [
  "Apa yang khe cari di sini?",
  "Nggak ada apa-apa kok 😹",
  "Tapi kalau mau main suit, khe harus ikutin aturan dulu."
];
async function typeAll(){
  for(let i=0;i<lines.length;i++){
    await typeInto(document.getElementById("line"+(i+1)), lines[i]);
  }
}
function typeInto(el,text){
  return new Promise(res=>{
    let i=0; const t=setInterval(()=>{
      el.textContent+=text[i++]||""; if(i>=text.length){clearInterval(t);res();}
    },30);
  });
}

// ---------- State ----------
let bo=null, need=0, diff=null;
let scoreYou=0, scoreBot=0, scoreDraw=0;
let matchYou=0, matchBot=0, streak=0;
let locked=false, cooldown=false;
let history=[];

// ---------- Elements ----------
const startBtn=document.getElementById("startBtn");
const setup=document.getElementById("setup");
const arena=document.getElementById("arena");
const diffBlock=document.getElementById("diffBlock");
const picks=[...document.querySelectorAll(".pick")];
const banner=document.getElementById("matchBanner");

// ---------- Start ----------
startBtn.onclick=()=>{
  document.querySelector(".hero").classList.add("hidden");
  setup.classList.remove("hidden");
};

// ---------- BO PICK ----------
document.querySelectorAll(".setupBtn").forEach(b=>{
  b.onclick=()=>{
    bo=+b.dataset.bo;
    need=bo===3?2:3;
    diffBlock.classList.remove("disabled");
    document.getElementById("boHint").textContent=`BO${bo} dipilih`;
  };
});

// ---------- DIFF PICK ----------
document.querySelectorAll(".setupBtn2").forEach(b=>{
  b.onclick=()=>{
    if(!bo)return;
    diff=b.dataset.diff;
    setup.classList.add("hidden");
    arena.classList.remove("hidden");
    initArena();
  };
});

// ---------- INIT ARENA ----------
function initArena(){
  document.getElementById("chipMatch").textContent=`Match: BO${bo} (need ${need})`;
  document.getElementById("chipDiff").textContent=`Difficulty: ${diff}`;
  document.getElementById("chipIQ").textContent=`BOT IQ: ${diff==="hard"?"HIGH":"NORMAL"}`;
  banner.textContent="Match dimulai. Semoga beruntung, khe 😼";
  banner.classList.remove("hidden");
  setTimeout(()=>banner.classList.add("hidden"),1500);
}

// ---------- GAME LOGIC ----------
const beats={rock:"scissors",paper:"rock",scissors:"paper"};
function botHard(){
  if(Math.random()<0.05) return rnd();
  if(history.length===0) return rnd();
  const freq={rock:0,paper:0,scissors:0};
  history.forEach(m=>freq[m]++);
  let pred=Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0];
  return Object.keys(beats).find(k=>beats[k]===pred);
}
function botMove(){
  if(diff==="easy") return rnd();
  if(diff==="medium") return Math.random()<.5?rnd():botHard();
  return botHard();
}
function rnd(){
  return ["rock","paper","scissors"][Math.floor(Math.random()*3)];
}
function judge(y,b){
  if(y===b) return "draw";
  return beats[y]===b?"win":"lose";
}

// ---------- PICK ----------
picks.forEach(p=>{
  p.onclick=()=>{
    if(locked||cooldown)return;
    cooldown=true; setTimeout(()=>cooldown=false,600);
    const you=p.dataset.move;
    const bot=botMove();
    history.push(you); if(history.length>8)history.shift();
    const res=judge(you,bot);

    document.getElementById("youPick").textContent="Khe: "+you;
    document.getElementById("botPick").textContent="Bot: "+bot;

    if(res==="win"){scoreYou++;matchYou++;streak++;}
    else if(res==="lose"){scoreBot++;matchBot++;streak=0;}
    else scoreDraw++;

    updateUI(res);
    checkMatch();
  };
});

// ---------- UI ----------
function updateUI(res){
  document.getElementById("scoreYou").textContent=scoreYou;
  document.getElementById("scoreBot").textContent=scoreBot;
  document.getElementById("scoreDraw").textContent=scoreDraw;
  document.getElementById("matchScore").textContent=`Match: ${matchYou} - ${matchBot}`;
  document.getElementById("streak").textContent=`Streak: ${streak}`;
  document.getElementById("resultText").textContent=
    res==="win"?"KHE MENANG 😼⚡":res==="lose"?"KHE KALAH 😹💀":"SERI 😐";

  if(matchYou===need-1||matchBot===need-1){
    banner.textContent="⚡ MATCH POINT! ⚡";
    banner.classList.remove("hidden");
    setTimeout(()=>banner.classList.add("hidden"),1200);
  }
}

// ---------- MATCH END ----------
function checkMatch(){
  if(matchYou>=need||matchBot>=need){
    locked=true;
    banner.textContent=matchYou>matchBot?"🔥 KHE MENANG MATCH 🔥":"☠️ BOT MENANG MATCH ☠️";
    banner.classList.remove("hidden");
  }
}

// ---------- RESET ----------
document.getElementById("resetMatch").onclick=()=>{
  matchYou=matchBot=0;locked=false;history=[];
  banner.classList.add("hidden");
};
document.getElementById("resetAll").onclick=()=>{
  scoreYou=scoreBot=scoreDraw=streak=0;
  document.getElementById("resetMatch").click();
};

// ---------- SAVE ----------
document.getElementById("exportSave").onclick=()=>{
  const data=btoa(JSON.stringify({scoreYou,scoreBot,scoreDraw,streak}));
  document.getElementById("saveText").value=data;
  document.getElementById("saveModal").classList.remove("hidden");
};
document.getElementById("importSave").onclick=()=>{
  const v=prompt("Paste save code");
  try{
    const d=JSON.parse(atob(v));
    Object.assign({scoreYou,scoreBot,scoreDraw,streak},d);
  }catch{}
};
document.getElementById("closeSave").onclick=()=>{
  document.getElementById("saveModal").classList.add("hidden");
};
document.getElementById("copySave").onclick=()=>{
  navigator.clipboard.writeText(document.getElementById("saveText").value);
};

// ---------- BG ----------
const c=document.getElementById("bg"),ctx=c.getContext("2d");
function resize(){c.width=innerWidth;c.height=innerHeight}
resize();window.onresize=resize;
let ps=[...Array(120)].map(()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight}));
(function draw(){
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle="rgba(0,255,213,.3)";
  ps.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,2,0,Math.PI*2);ctx.fill();});
  requestAnimationFrame(draw);
})();

window.onmousemove=e=>{
  const g=document.getElementById("mouseGlow");
  g.style.left=e.clientX+"px";g.style.top=e.clientY+"px";
};

// BOOT
typeAll();
