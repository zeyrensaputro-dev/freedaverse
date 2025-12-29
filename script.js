/* ===============================
   FREEDAVERSE — FINAL (FULL FIX)
   - Setup BO dulu -> Difficulty
   - Cinematic "Match dimulai..."
   - Hard = prediksi frekuensi history (8), default "lempar" 5%
   - MATCH POINT banner
   - Cooldown + tombol bener-bener disabled
   - Export/Import save (no modal random)
================================ */

(() => {
  // ---- HARD STOP: PAKSA MODAL NGGA MUNCUL PAS LOAD ----
  const forceHideModal = () => {
    const m = document.getElementById("saveModal");
    if (m) m.classList.add("hidden");
    if (m) m.setAttribute("aria-hidden", "true");
  };
  document.addEventListener("DOMContentLoaded", forceHideModal);
  window.addEventListener("pageshow", forceHideModal); // anti bfcache mobile

  // ---------- Typing ----------
  const lines = [
    "Apa yang khe cari di sini?",
    "Nggak ada apa-apa kok 😹",
    "Tapi kalau mau main suit, khe harus ikutin aturan dulu."
  ];

  function typeInto(el, text, speed = 28) {
    return new Promise((res) => {
      el.textContent = "";
      let i = 0;
      const t = setInterval(() => {
        el.textContent += text[i] || "";
        i++;
        if (i >= text.length) {
          clearInterval(t);
          res();
        }
      }, speed);
    });
  }

  async function bootTyping() {
    await typeInto(document.getElementById("line1"), lines[0]);
    await typeInto(document.getElementById("line2"), lines[1]);
    await typeInto(document.getElementById("line3"), lines[2]);
  }

  // ---------- State ----------
  let bo = null;
  let need = 0;
  let diff = null;

  let scoreYou = 0, scoreBot = 0, scoreDraw = 0;
  let matchYou = 0, matchBot = 0, streak = 0;

  let locked = false;
  let cooldown = false;

  // history untuk hard prediction
  let history = []; // max 8

  // ---------- Elements ----------
  const hero = document.getElementById("hero");
  const startBtn = document.getElementById("startBtn");
  const setup = document.getElementById("setup");
  const arena = document.getElementById("arena");
  const diffBlock = document.getElementById("diffBlock");

  const boHint = document.getElementById("boHint");
  const diffHint = document.getElementById("diffHint");

  const chipMatch = document.getElementById("chipMatch");
  const chipDiff = document.getElementById("chipDiff");
  const chipIQ = document.getElementById("chipIQ");
  const chipCD = document.getElementById("chipCD");

  const scoreYouEl = document.getElementById("scoreYou");
  const scoreBotEl = document.getElementById("scoreBot");
  const scoreDrawEl = document.getElementById("scoreDraw");

  const matchScoreEl = document.getElementById("matchScore");
  const streakEl = document.getElementById("streak");

  const banner = document.getElementById("matchBanner");
  const youPickEl = document.getElementById("youPick");
  const botPickEl = document.getElementById("botPick");
  const resultTextEl = document.getElementById("resultText");

  const pickBtns = [...document.querySelectorAll(".pick")];

  // modal save
  const saveModal = document.getElementById("saveModal");
  const saveText = document.getElementById("saveText");
  const closeSave = document.getElementById("closeSave");
  const copySave = document.getElementById("copySave");

  // ---------- Helpers ----------
  const MOVES = ["rock", "paper", "scissors"];
  const moveLabel = { rock: "✊ Batu", paper: "✋ Kertas", scissors: "✌️ Gunting" };
  const beats = { rock: "scissors", paper: "rock", scissors: "paper" };

  function rnd() {
    return MOVES[Math.floor(Math.random() * 3)];
  }

  function counterOf(predictedPlayerMove) {
    // return move bot yang menang lawan predicted
    return Object.keys(beats).find((m) => beats[m] === predictedPlayerMove);
  }

  function judge(you, bot) {
    if (you === bot) return "draw";
    return beats[you] === bot ? "win" : "lose";
  }

  function setPicksDisabled(disabled) {
    pickBtns.forEach((b) => (b.disabled = disabled));
  }

  function showBanner(text, ms = 1200) {
    banner.textContent = text;
    banner.classList.remove("hidden");
    if (ms > 0) setTimeout(() => banner.classList.add("hidden"), ms);
  }

  function updateUI(res = null) {
    scoreYouEl.textContent = String(scoreYou);
    scoreBotEl.textContent = String(scoreBot);
    scoreDrawEl.textContent = String(scoreDraw);

    matchScoreEl.textContent = `Match: ${matchYou} - ${matchBot}`;
    streakEl.textContent = `Streak: ${streak}`;

    if (res) {
      resultTextEl.textContent =
        res === "win" ? "KHE MENANG 😼⚡" :
        res === "lose" ? "KHE KALAH 😹💀" :
        "SERI 😐";
    }
  }

  function resetMatchOnly() {
    matchYou = 0;
    matchBot = 0;
    locked = false;
    cooldown = false;
    history = [];
    setPicksDisabled(false);
    chipCD.textContent = "Ready";
    youPickEl.textContent = "Khe: -";
    botPickEl.textContent = "Bot: -";
    resultTextEl.textContent = "Pilih move 😼";
    banner.classList.add("hidden");
    updateUI();
  }

  function resetAll() {
    scoreYou = 0; scoreBot = 0; scoreDraw = 0; streak = 0;
    resetMatchOnly();
  }

  function checkMatchPoint() {
    if (locked) return;
    const anyoneAt = Math.max(matchYou, matchBot);
    if (anyoneAt === need - 1 && (matchYou !== matchBot)) {
      showBanner("⚡ MATCH POINT! ⚡", 1100);
    }
  }

  function checkMatchEnd() {
    if (matchYou >= need || matchBot >= need) {
      locked = true;
      setPicksDisabled(true);
      showBanner(matchYou > matchBot ? "🔥 KHE MENANG MATCH 🔥" : "☠️ BOT MENANG MATCH ☠️", 0);
      chipCD.textContent = "LOCKED";
    }
  }

  // ---------- Bot AI ----------
  function botEasy() {
    // easy = random + sering ngaco
    if (Math.random() < 0.18) return counterOf(rnd()); // kadang blunder
    return rnd();
  }

  function botMedium() {
    // medium = campuran random + sedikit hard
    if (history.length >= 3 && Math.random() < 0.45) return botHard();
    return rnd();
  }

  function botHard() {
    // 5% lempar (chance) supaya masih ada celah
    if (Math.random() < 0.05) return rnd();

    // kalau history kosong, random
    if (history.length === 0) return rnd();

    // frekuensi 8 terakhir
    const freq = { rock: 0, paper: 0, scissors: 0 };
    for (const m of history) freq[m]++;

    // cari max freq
    let predicted = "rock";
    let best = -1;
    for (const m of MOVES) {
      if (freq[m] > best) {
        best = freq[m];
        predicted = m;
      }
    }

    // tie-break: kalau seri, pakai last move player
    const ties = MOVES.filter((m) => freq[m] === best);
    if (ties.length > 1) predicted = history[history.length - 1];

    // bot counter prediksi
    return counterOf(predicted);
  }

  function botMove() {
    if (diff === "easy") return botEasy();
    if (diff === "medium") return botMedium();
    return botHard();
  }

  // ---------- Flow ----------
  startBtn.addEventListener("click", () => {
    hero.classList.add("hidden");
    setup.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // pilih BO
  document.querySelectorAll(".setupBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      bo = Number(btn.dataset.bo);
      need = bo === 3 ? 2 : 3;

      document.querySelectorAll(".setupBtn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      diffBlock.classList.remove("disabled");
      boHint.textContent = `BO${bo} dipilih (need ${need})`;
      diffHint.textContent = "Sekarang pilih difficulty";
    });
  });

  // pilih difficulty -> masuk arena
  document.querySelectorAll(".setupBtn2").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!bo) {
        boHint.textContent = "Pilih BO dulu, khe 😹";
        return;
      }
      diff = btn.dataset.diff;

      document.querySelectorAll(".setupBtn2").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      setup.classList.add("hidden");
      arena.classList.remove("hidden");
      initArenaAndStart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  function initArenaAndStart() {
    chipMatch.textContent = `Match: BO${bo} (need ${need})`;
    chipDiff.textContent = `Difficulty: ${diff}`;
    chipIQ.textContent = `BOT IQ: ${diff === "hard" ? "HIGH" : "NORMAL"}`;

    // cinematic sebelum bisa main
    setPicksDisabled(true);
    chipCD.textContent = "Starting...";
    showBanner("Match dimulai. Semoga beruntung, khe 😼", 1300);

    setTimeout(() => {
      chipCD.textContent = "Ready";
      if (!locked) setPicksDisabled(false);
    }, 1350);

    updateUI();
  }

  // ---------- Click Suit ----------
  pickBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (locked || cooldown) return;

      cooldown = true;
      setPicksDisabled(true);
      chipCD.textContent = "Cooldown...";

      setTimeout(() => {
        cooldown = false;
        if (!locked) {
          setPicksDisabled(false);
          chipCD.textContent = "Ready";
        }
      }, 600);

      const you = btn.dataset.move;
      const bot = botMove();

      history.push(you);
      if (history.length > 8) history.shift();

      youPickEl.textContent = `Khe: ${moveLabel[you]}`;
      botPickEl.textContent = `Bot: ${moveLabel[bot]}`;

      const res = judge(you, bot);

      if (res === "win") {
        scoreYou++; matchYou++; streak++;
      } else if (res === "lose") {
        scoreBot++; matchBot++; streak = 0;
      } else {
        scoreDraw++;
      }

      updateUI(res);
      checkMatchPoint();
      checkMatchEnd();
    });
  });

  // ---------- Reset ----------
  document.getElementById("resetMatch").addEventListener("click", () => {
    resetMatchOnly();
    showBanner("Match di-reset. Gas 😼", 900);
  });

  document.getElementById("resetAll").addEventListener("click", () => {
    resetAll();
    showBanner("Semua skor di-reset 😹", 900);
  });

  // ---------- Save Modal ----------
  function openModal(text) {
    saveText.value = text;
    saveModal.classList.remove("hidden");
    saveModal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    saveModal.classList.add("hidden");
    saveModal.setAttribute("aria-hidden", "true");
  }

  closeSave.addEventListener("click", closeModal);
  saveModal.addEventListener("click", (e) => { if (e.target === saveModal) closeModal(); });

  document.getElementById("exportSave").addEventListener("click", () => {
    // biar ga kosong-kosong amat
    if ((scoreYou + scoreBot + scoreDraw) === 0 && streak === 0) {
      showBanner("Belum ada data buat disave 😼", 1000);
      return;
    }
    const payload = {
      v: 1,
      scoreYou, scoreBot, scoreDraw, streak,
      bo, need, diff,
      ts: Date.now()
    };
    const code = "FREEDAVERSE:" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    openModal(code);
  });

  copySave.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(saveText.value);
      showBanner("Copied ✅", 900);
    } catch {
      showBanner("Gagal copy (izin browser) 😹", 1100);
    }
  });

  document.getElementById("importSave").addEventListener("click", () => {
    const v = prompt("Paste save code (FREEDAVERSE:...)");
    if (!v) return;

    try {
      const raw = v.startsWith("FREEDAVERSE:") ? v.slice("FREEDAVERSE:".length) : v;
      const obj = JSON.parse(decodeURIComponent(escape(atob(raw))));

      if (obj && obj.v === 1) {
        scoreYou = Number(obj.scoreYou || 0);
        scoreBot = Number(obj.scoreBot || 0);
        scoreDraw = Number(obj.scoreDraw || 0);
        streak = Number(obj.streak || 0);

        // ga usah maksa balik ke setup, tapi info diset kalau ada
        if (obj.bo) bo = Number(obj.bo);
        if (obj.need) need = Number(obj.need);
        if (obj.diff) diff = String(obj.diff);

        updateUI();
        showBanner("Save loaded ✅", 1100);
      } else {
        showBanner("Kode save nggak valid 😹", 1100);
      }
    } catch {
      showBanner("Kode save rusak / salah 😹", 1100);
    }
  });

  // ---------- Background particles ----------
  const c = document.getElementById("bg");
  const ctx = c.getContext("2d");
  let ps = [];

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    c.width = Math.floor(innerWidth * dpr);
    c.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(160, Math.floor((innerWidth * innerHeight) / 12000));
    ps = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.28,
      r: 1 + Math.random() * 2.4
    }));
  }
  window.addEventListener("resize", resize);
  resize();

  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // soft gradient
    const g = ctx.createRadialGradient(innerWidth*0.35, innerHeight*0.2, 60, innerWidth*0.6, innerHeight*0.6, Math.max(innerWidth, innerHeight));
    g.addColorStop(0, "rgba(124,77,255,0.10)");
    g.addColorStop(0.45, "rgba(0,255,213,0.06)");
    g.addColorStop(0.75, "rgba(255,43,214,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0.60)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    // particles
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = innerWidth + 10;
      if (p.x > innerWidth + 10) p.x = -10;
      if (p.y < -10) p.y = innerHeight + 10;
      if (p.y > innerHeight + 10) p.y = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,255,213,0.18)";
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  draw();

  // mouse glow
  const glow = document.getElementById("mouseGlow");
  window.addEventListener("mousemove", (e) => {
    glow.style.left = e.clientX + "px";
    glow.style.top = e.clientY + "px";
  });

  // boot
  bootTyping();
})();
