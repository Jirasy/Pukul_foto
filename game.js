/* =============================================
   PUKUL BAHLIL - game.js
   ============================================= */

(function () {
  "use strict";

  // ---- State ----
  let hits = 0;
  let score = 0;
  let combo = 1;
  let comboTimer = null;
  let lastHitTime = 0;
  const COMBO_WINDOW = 1400; // ms untuk combo aktif

  // ---- Kata FX ----
  const HIT_WORDS = [
    "BAM!", "POW!", "ZAP!", "KRAK!", "BLAM!",
    "AARRGH!", "TRAK!", "BWAH!", "KAPOW!", "CRASH!",
    "PUKUL!", "RASAIN!", "SIKAT!", "HAJAR!", "BABLAS!",
    "GEDEBUG!", "PLAK!", "JEPRET!", "TONJOK!", "BUK!"
  ];

  const COMBO_LABELS = [
    "", "", "DOUBLE!", "TRIPLE!", "QUADRUPLE!",
    "PENTA!", "HEXA!", "LUCKY!", "GILA!", "DEWA PUKUL!"
  ];

  const RANT_LIST = [
    "Bikin kesal!", "Semena-mena!", "Tidak transparan!",
    "Urus diri sendiri!", "Ngomong apa sih?", "Tidak kompeten!",
    "Curang!", "Omong kosong!", "Tidak becus!", "Mau menang sendiri!",
    "Janji palsu!", "Koruptor!", "Pencitraan melulu!", "Kebijakan absurd!",
    "Rakyat diabaikan!", "Tidak bertanggung jawab!"
  ];

  const MILESTONES = {
    10:  { text: "LUMAYAN!", sub: "10 pukulan sudah!" },
    25:  { text: "MANTAP!", sub: "25 kali gebuk!" },
    50:  { text: "GILA!", sub: "50 pukulan!" },
    100: { text: "LEGENDA!", sub: "100 pukulan! Lo serius?" },
    250: { text: "DEWA PUKUL!", sub: "250 pukulan. Perlu healing?" },
    500: { text: "GILA LO!", sub: "500 pukulan. Cuti dulu kali." }
  };

  // ---- DOM refs ----
  const targetImg    = document.getElementById("targetImg");
  const targetFrame  = document.getElementById("targetFrame");
  const targetInner  = document.getElementById("targetInner");
  const targetWrapper= document.getElementById("targetWrapper");
  const hitOverlay   = document.getElementById("hitOverlay");
  const fxContainer  = document.getElementById("fxContainer");
  const btnHit       = document.getElementById("btnHit");
  const btnReset     = document.getElementById("btnReset");
  const btnDefault   = document.getElementById("btnDefault");
  const fileInput    = document.getElementById("fileInput");
  const hitCountEl   = document.getElementById("hitCount");
  const comboCountEl = document.getElementById("comboCount");
  const scoreCountEl = document.getElementById("scoreCount");
  const angerFill    = document.getElementById("angerFill");
  const rantGrid     = document.getElementById("rantGrid");

  // ---- Setup rant chips ----
  function setupRants() {
    RANT_LIST.forEach(function (text) {
      var chip = document.createElement("button");
      chip.className = "rant-chip";
      chip.textContent = text;
      chip.addEventListener("click", function () {
        chip.classList.toggle("active-rant");
        triggerHit(chip.getBoundingClientRect());
      });
      rantGrid.appendChild(chip);
    });
  }

  // ---- Update score display ----
  function updateDisplay() {
    hitCountEl.textContent  = hits;
    scoreCountEl.textContent = score;
    comboCountEl.textContent = "x" + combo;

    // Anger bar (caps at 500 hits for 100%)
    var pct = Math.min((hits / 500) * 100, 100);
    angerFill.style.width = pct + "%";

    // Anger color shift
    if (pct < 30) {
      angerFill.style.background = "linear-gradient(90deg, #ff9900, #ffcc00)";
    } else if (pct < 60) {
      angerFill.style.background = "linear-gradient(90deg, #ff6a00, #e8190a)";
    } else {
      angerFill.style.background = "linear-gradient(90deg, #cc0000, #7a0000)";
    }
  }

  // ---- Spawn floating FX word ----
  function spawnFX(x, y) {
    var word = HIT_WORDS[Math.floor(Math.random() * HIT_WORDS.length)];
    var el = document.createElement("span");
    el.className = "fx-word";
    el.textContent = word;

    // Random rotation -25 to 25 deg
    var rot = (Math.random() * 50 - 25).toFixed(1) + "deg";
    el.style.setProperty("--rot", rot);

    // Clamp position so it stays on screen
    var fx_x = Math.max(20, Math.min(window.innerWidth - 120, x - 40));
    var fx_y = Math.max(60, Math.min(window.innerHeight - 80, y - 30));

    el.style.left = fx_x + "px";
    el.style.top  = fx_y + "px";

    // Alternate colors for variety
    var colors = ["#e8190a", "#1a3cff", "#ff6a00", "#006600"];
    el.style.color = colors[Math.floor(Math.random() * colors.length)];

    fxContainer.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  // ---- Spawn combo label ----
  function spawnComboLabel(x, y) {
    if (combo < 3 || combo >= COMBO_LABELS.length) return;
    var label = COMBO_LABELS[Math.min(combo, COMBO_LABELS.length - 1)];
    if (!label) return;

    var el = document.createElement("span");
    el.className = "fx-word";
    el.textContent = label + " x" + combo;
    el.style.setProperty("--rot", "0deg");
    el.style.color = "#FFD400";
    el.style.fontSize = "clamp(1.6rem, 7vw, 3rem)";
    el.style.textShadow = "3px 3px 0 #000, -1px -1px 0 #e8190a";

    var fx_x = Math.max(20, Math.min(window.innerWidth - 160, x - 60));
    var fx_y = Math.max(30, Math.min(window.innerHeight - 100, y - 60));
    el.style.left = fx_x + "px";
    el.style.top  = fx_y + "px";

    fxContainer.appendChild(el);
    setTimeout(function () { el.remove(); }, 900);
  }

  // ---- Frame shake + overlay ----
  function animateHit() {
    targetFrame.classList.remove("hit-anim");
    // Force reflow so animation restarts
    void targetFrame.offsetWidth;
    targetFrame.classList.add("hit-anim");
    setTimeout(function () { targetFrame.classList.remove("hit-anim"); }, 350);
  }

  // ---- Screen shake for big combos ----
  function screenShake() {
    document.body.classList.remove("screen-shake");
    void document.body.offsetWidth;
    document.body.classList.add("screen-shake");
    setTimeout(function () { document.body.classList.remove("screen-shake"); }, 380);
  }

  // ---- Milestone flash ----
  function showMilestone(data) {
    var overlay = document.createElement("div");
    overlay.className = "milestone-flash";

    var txt = document.createElement("div");
    txt.className = "milestone-text";
    txt.textContent = data.text;

    var sub = document.createElement("div");
    sub.className = "milestone-sub";
    sub.textContent = data.sub;

    overlay.appendChild(txt);
    overlay.appendChild(sub);
    document.body.appendChild(overlay);

    // Trigger animation
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add("show");
      });
    });

    setTimeout(function () { overlay.remove(); }, 1150);
  }

  // ---- Core hit logic ----
  function triggerHit(boundsOrEvent) {
    var now = Date.now();
    hits++;
    
    // Combo logic
    if (now - lastHitTime < COMBO_WINDOW) {
      combo = Math.min(combo + 1, 10);
      clearTimeout(comboTimer);
    } else {
      combo = 1;
    }
    lastHitTime = now;

    // Reset combo after window
    comboTimer = setTimeout(function () { combo = 1; updateDisplay(); }, COMBO_WINDOW);

    score += 10 * combo;
    updateDisplay();

    // Animate combo display
    comboCountEl.classList.remove("combo-pop");
    void comboCountEl.offsetWidth;
    comboCountEl.classList.add("combo-pop");

    // Get center coords of frame for FX spawn
    var rect = targetFrame.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;

    // Random offset within frame
    var rx = cx + (Math.random() * rect.width * 0.6 - rect.width * 0.3);
    var ry = cy + (Math.random() * rect.height * 0.6 - rect.height * 0.3);

    animateHit();
    spawnFX(rx, ry);

    if (combo >= 3) {
      spawnComboLabel(cx, cy - 40);
    }

    if (combo >= 5) {
      screenShake();
    }

    // Milestone check
    if (MILESTONES[hits]) {
      showMilestone(MILESTONES[hits]);
    }
  }

  // ---- Button hit ----
  btnHit.addEventListener("click", function (e) {
    triggerHit(e);
  });

  // Also tap directly on the frame
  targetFrame.addEventListener("click", function (e) {
    triggerHit(e);
  });

  // Touch for mobile (prevent ghost click)
  targetFrame.addEventListener("touchend", function (e) {
    e.preventDefault();
    triggerHit(e.changedTouches[0] || e);
  }, { passive: false });

  btnHit.addEventListener("touchend", function (e) {
    e.preventDefault();
    triggerHit(e.changedTouches[0] || e);
  }, { passive: false });

  // ---- Reset ----
  btnReset.addEventListener("click", function () {
    hits = 0; score = 0; combo = 1;
    clearTimeout(comboTimer);
    lastHitTime = 0;
    updateDisplay();
    // Reset anger bar
    angerFill.style.width = "0%";
  });

  // ---- Image size adapting ----
  function adaptFrameToImage(img) {
    // Natural size of the image
    var natW = img.naturalWidth || img.width || 220;
    var natH = img.naturalHeight || img.height || 220;
    var aspect = natW / natH;

    // Max frame size allowed (responsive)
    var maxW = Math.min(window.innerWidth * 0.78, 340);
    var maxH = Math.min(window.innerHeight * 0.45, 420);

    var frameW, frameH;

    if (aspect >= 1) {
      // Landscape or square: width-constrained
      frameW = Math.min(natW, maxW);
      frameH = frameW / aspect;
      if (frameH > maxH) { frameH = maxH; frameW = frameH * aspect; }
    } else {
      // Portrait: height-constrained
      frameH = Math.min(natH, maxH);
      frameW = frameH * aspect;
      if (frameW > maxW) { frameW = maxW; frameH = frameW / aspect; }
    }

    // Enforce minimum
    frameW = Math.max(frameW, 160);
    frameH = Math.max(frameH, 160);

    targetFrame.style.width  = frameW + "px";
    targetFrame.style.height = frameH + "px";

    // Update ring sizes
    document.documentElement.style.setProperty("--img-w", frameW + "px");
    document.documentElement.style.setProperty("--img-h", frameH + "px");
  }

  // ---- Upload custom photo ----
  fileInput.addEventListener("change", function () {
    var file = fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      targetImg.src = e.target.result;
      targetImg.onload = function () {
        adaptFrameToImage(targetImg);
      };
    };
    reader.readAsDataURL(file);
  });

  // ---- Default photo ----
  btnDefault.addEventListener("click", function () {
    targetImg.src = "bahlil.jpg";
    targetImg.onload = function () {
      adaptFrameToImage(targetImg);
    };
    // Reset file input so same file can be re-selected later
    fileInput.value = "";
  });

  // ---- Init ----
  function init() {
    setupRants();
    updateDisplay();

    // Adapt once image loads
    if (targetImg.complete && targetImg.naturalWidth) {
      adaptFrameToImage(targetImg);
    } else {
      targetImg.addEventListener("load", function () {
        adaptFrameToImage(targetImg);
      });
      // Fallback if image fails (no Bahlil photo provided)
      targetImg.addEventListener("error", function () {
        // Show placeholder text
        targetImg.style.display = "none";
        var placeholder = document.createElement("div");
        placeholder.style.cssText =
          "width:100%;height:100%;display:flex;align-items:center;justify-content:center;" +
          "background:#222;color:#FFD400;font-family:Bangers,cursive;font-size:1.2rem;" +
          "text-align:center;padding:12px;";
        placeholder.textContent = "Taruh foto bahlil.jpg di folder img/";
        targetInner.appendChild(placeholder);
      });
    }

    // Keyboard shortcut: Space or Enter = pukul
    document.addEventListener("keydown", function (e) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        triggerHit(e);
      }
    });
  }

  init();

})();
