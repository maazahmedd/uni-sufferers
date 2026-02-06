const SCREEN_W = 1024;
const SCREEN_H = 768;

const DIR_RIGHT = 1;
const DIR_LEFT = -1;

const IMG_FILES = [
  'assignment.png',
  'anxiety.png',
  'background1.png',
  'brain_bulb.png',
  'brain_waving.png',
  'brain_weights.png',
  'clock.png',
  'faiza.png',
  'final_background.png',
  'gameover_background.png',
  'gpa.png',
  'insta.png',
  'facebook.png',
  'jake.png',
  'netflix.png',
  'ps.png',
  'quiz.png',
  'start_background.png',
  'youtube.png'
];

const images = {};
const sounds = {};
let game;
let audioEnabled = false;
let _audioRetryPending = false;
let gameCanvas;
let touchControlsEnabled = false;
let ignoreMouseClickUntil = 0;
let mobileControlsRoot = null;
let mobileControlsVisible = false;
const mobilePointerKeyById = new Map();

const CONTROL_KEYS = ['left', 'right', 'up', 'down'];
const keyboardInput = { left: false, right: false, up: false, down: false };
const mobileButtonInput = { left: false, right: false, up: false, down: false };

// ── Audio debug overlay (enabled with ?debug=1) ──────────────────────────
const _audioDebugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
const _audioLogEntries = [];
const _AUDIO_LOG_MAX = 8;

function _audioLog(msg) {
  const ts = ((performance.now() / 1000) | 0) + 's';
  _audioLogEntries.push(ts + ' ' + msg);
  if (_audioLogEntries.length > _AUDIO_LOG_MAX) {
    _audioLogEntries.shift();
  }
}

function _createAudioDebugPanel() {
  if (!_audioDebugEnabled) return;
  const el = document.createElement('div');
  el.id = 'audio-debug';
  el.style.cssText =
    'position:fixed;bottom:4px;right:4px;z-index:99999;background:rgba(0,0,0,0.82);' +
    'color:#0f0;font:10px/1.35 monospace;padding:6px 8px;border-radius:6px;' +
    'max-width:340px;pointer-events:none;white-space:pre-wrap;word-break:break-all;';
  document.body.appendChild(el);
}

function _updateAudioDebugPanel() {
  if (!_audioDebugEnabled) return;
  const el = document.getElementById('audio-debug');
  if (!el) return;
  let ctxState = '?';
  try { ctxState = getAudioContext().state; } catch (_) {}
  const introLoaded = !!(game && game.introSound);
  const bgLoaded = !!(game && game.backgroundSound);
  const level = game ? game.level : '-';
  const lines = [
    'ctx.state: ' + ctxState,
    'audioEnabled: ' + audioEnabled,
    '_audioRetryPending: ' + _audioRetryPending,
    'introSound: ' + introLoaded,
    'bgSound: ' + bgLoaded,
    'level: ' + level,
    '── log ──',
  ].concat(_audioLogEntries.length ? _audioLogEntries : ['(none)']);
  el.textContent = lines.join('\n');
}

window.addEventListener(
  'keydown',
  (event) => {
    if (
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === ' '
    ) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener(
  'touchmove',
  (event) => {
    const wrapper = document.getElementById('canvas-wrapper');
    const controls = document.getElementById('mobile-controls');
    if (
      (wrapper && wrapper.contains(event.target)) ||
      (controls && controls.contains(event.target))
    ) {
      event.preventDefault();
    }
  },
  { passive: false }
);

// Native DOM listeners to resume AudioContext inside the user-gesture context.
// iOS Safari requires ctx.resume() to happen synchronously in a gesture handler;
// p5.js callbacks run too late (microtask / rAF) for iOS to accept them.
//
// Event choice:
//   touchend  — the primary activation event on iOS Safari (touchstart does NOT grant activation)
//   mousedown — grants activation on iOS and desktop
//   keydown   — for desktop spacebar
['touchend', 'mousedown', 'keydown'].forEach((evtName) => {
  document.addEventListener(
    evtName,
    () => {
      try {
        const ctx = getAudioContext();
        if (ctx.state !== 'running') {
          _audioLog(evtName + ': ctx.resume() from state=' + ctx.state);
          ctx.resume();
          // Silent-buffer trick: playing a tiny silent buffer helps "warm up"
          // the AudioContext on iOS Safari so it transitions to 'running'.
          try {
            const buf = ctx.createBuffer(1, 1, 22050);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.connect(ctx.destination);
            src.start(0);
          } catch (_b) {}
        }
      } catch (_) {
        // getAudioContext not available yet — ignore
      }
    },
    { once: false, passive: true }
  );
});

// When the page becomes visible again, resume the AudioContext.
// iOS has a non-standard "interrupted" state that can occur on tab switch / standby.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    try {
      const ctx = getAudioContext();
      if (ctx.state !== 'running') {
        _audioLog('visibilitychange: resuming from state=' + ctx.state);
        ctx.resume();
      }
    } catch (_) {}
  }
});

function randInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function positiveMod(n, m) {
  return ((n % m) + m) % m;
}

function markAppReady() {
  if (!document.body) {
    return;
  }
  document.body.classList.remove('app-loading');
  document.body.classList.add('app-ready');
}

function preload() {
  for (const file of IMG_FILES) {
    images[file] = loadImage(`./assets/images/${file}`);
  }
}

function setup() {
  gameCanvas = createCanvas(SCREEN_W, SCREEN_H);
  gameCanvas.parent('canvas-wrapper');
  frameRate(60);
  game = new Game(SCREEN_W, SCREEN_H);
  setupMobileControls();
  updateTouchControlsEnabled();
  applyInputState();
  loadAudioAssets();
  _createAudioDebugPanel();

  // When the AudioContext transitions to 'running' (may happen asynchronously
  // after a user gesture on some browsers), enable audio and start music.
  try {
    const ctx = getAudioContext();
    ctx.addEventListener('statechange', () => {
      _audioLog('statechange: ' + ctx.state);
      if (ctx.state === 'running' && _audioRetryPending) {
        audioEnabled = true;
        _audioRetryPending = false;
        _playMusicForCurrentLevel();
      }
    });
  } catch (_) {
    // getAudioContext may not be ready yet — the draw() fallback will cover it
  }

  markAppReady();
  layoutCanvas();
  // A second pass helps after font/layout settles.
  setTimeout(layoutCanvas, 0);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', layoutCanvas);
    window.visualViewport.addEventListener('scroll', layoutCanvas);
  }
}

function draw() {
  // Safety-net: if a previous enableAudio() couldn't finish synchronously,
  // poll the AudioContext each frame.  Negligible cost (one property read).
  if (_audioRetryPending) {
    try {
      if (getAudioContext().state === 'running') {
        _audioLog('draw() safety-net: ctx now running');
        audioEnabled = true;
        _audioRetryPending = false;
        _playMusicForCurrentLevel();
      }
    } catch (_) {}
  }

  background(255, 255, 255);
  game.display();
  syncMobileControlsVisibility();
  _updateAudioDebugPanel();
}

function layoutCanvas() {
  const wrapper = document.getElementById('canvas-wrapper');
  const main = document.querySelector('main');
  if (!wrapper || !main || !gameCanvas) {
    return;
  }

  // Reset to base size so we can measure non-canvas chrome accurately.
  wrapper.style.width = `${SCREEN_W}px`;
  wrapper.style.height = `${SCREEN_H}px`;
  gameCanvas.style('width', `${SCREEN_W}px`);
  gameCanvas.style('height', `${SCREEN_H}px`);

  const viewportW = window.visualViewport
    ? window.visualViewport.width
    : Math.min(window.innerWidth, document.documentElement.clientWidth || window.innerWidth);
  const viewportH = window.visualViewport
    ? window.visualViewport.height
    : Math.min(window.innerHeight, document.documentElement.clientHeight || window.innerHeight);

  const nonCanvasHeight = Math.max(0, main.scrollHeight - wrapper.offsetHeight);
  const safetyGutter = touchControlsEnabled ? 16 : 0;
  const outerPadding = touchControlsEnabled ? 12 + safetyGutter : 24;
  const availableW = Math.max(200, viewportW - outerPadding);
  const availableH = Math.max(200, viewportH - outerPadding - nonCanvasHeight);
  const scale = Math.max(0.35, Math.min(1, availableW / SCREEN_W, availableH / SCREEN_H));

  const scaledW = Math.round(SCREEN_W * scale);
  const scaledH = Math.round(SCREEN_H * scale);

  wrapper.style.width = `${scaledW}px`;
  wrapper.style.height = `${scaledH}px`;
  gameCanvas.style('width', `${scaledW}px`);
  gameCanvas.style('height', `${scaledH}px`);
}

function windowResized() {
  updateTouchControlsEnabled();
  layoutCanvas();
}

function isAudioContextRunning() {
  return getAudioContext().state === 'running';
}

function enableAudio() {
  _audioLog('enableAudio() called');
  const ctx = getAudioContext();

  // Attempt synchronous resume — this is the call that must happen inside
  // the user-gesture context for iOS Safari.  The native DOM listeners
  // (touchend/mousedown/keydown) already called ctx.resume() earlier in the
  // same event, so by this point the context is very likely 'running'.
  const p = ctx.state !== 'running' ? ctx.resume() : undefined;

  if (ctx.state === 'running') {
    // Immediate path (works on desktop, sometimes iOS)
    _audioLog('enableAudio: immediate running');
    audioEnabled = true;
    _audioRetryPending = false;
    _playMusicForCurrentLevel();
    return;
  }

  // Context hasn't flipped to 'running' yet — mark pending so the
  // statechange listener or the draw() safety-net can pick it up.
  _audioRetryPending = true;
  _audioLog('enableAudio: deferred, ctx.state=' + ctx.state);

  // Deferred path: wait for the resume() Promise to resolve.
  if (p && typeof p.then === 'function') {
    p.then(() => {
      _audioLog('enableAudio: resume promise resolved, state=' + getAudioContext().state);
      if (getAudioContext().state === 'running' && !audioEnabled) {
        audioEnabled = true;
        _audioRetryPending = false;
        _playMusicForCurrentLevel();
      }
    }).catch(() => {});
  }
}

function _playMusicForCurrentLevel() {
  if (!audioEnabled || !game) {
    return;
  }
  if (game.level === 0) {
    _audioLog('_playMusic: intro (lvl 0)');
    game.playIntroLoop();
  } else if (game.level > 0 && game.level < 12) {
    _audioLog('_playMusic: bg (lvl ' + game.level + ')');
    game.playBackgroundLoop();
  }
}

function startGame() {
  if (!game || game.level !== 0) {
    return;
  }

  // Set level BEFORE enableAudio so that enableAudio → _playMusicForCurrentLevel
  // sees level 1 and plays the background track (not the intro).
  game.level = 1;
  enableAudio();
  syncMobileControlsVisibility();
}

function restartGame() {
  if (!game || game.level !== 12) {
    return;
  }

  const wasMuted = game.isMuted;
  if (audioEnabled && game.backgroundSound && game.backgroundSound.isPlaying()) {
    game.backgroundSound.stop();
  }
  game = new Game(SCREEN_W, SCREEN_H);
  game.setMuted(wasMuted);
  applyInputState();
  syncMobileControlsVisibility();
}

function updateTouchControlsEnabled() {
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  touchControlsEnabled =
    hasCoarsePointer ||
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    window.innerWidth <= 900;
  document.body.classList.toggle('mobile-layout', touchControlsEnabled);
  syncMobileControlsVisibility();
}

function clearDirectionalState(inputState) {
  for (const keyName of CONTROL_KEYS) {
    inputState[keyName] = false;
  }
}

function recomputeMobileButtonInput() {
  clearDirectionalState(mobileButtonInput);
  for (const keyName of mobilePointerKeyById.values()) {
    if (Object.prototype.hasOwnProperty.call(mobileButtonInput, keyName)) {
      mobileButtonInput[keyName] = true;
    }
  }
  applyInputState();
  updateMobileControlButtonStates();
}

function applyInputState() {
  if (!game) {
    return;
  }

  for (const keyName of CONTROL_KEYS) {
    const pressed = keyboardInput[keyName] || mobileButtonInput[keyName];
    game.faiza.keyHandler[keyName] = pressed;
    game.anxiety.keyHandler[keyName] = pressed;
    game.anxiety2.keyHandler[keyName] = pressed;
  }
}

function setupMobileControls() {
  mobileControlsRoot = document.getElementById('mobile-controls');
  if (!mobileControlsRoot) {
    return;
  }

  const buttons = Array.from(mobileControlsRoot.querySelectorAll('button[data-key]'));
  const releasePointer = (event) => {
    if (!mobilePointerKeyById.has(event.pointerId)) {
      return;
    }
    mobilePointerKeyById.delete(event.pointerId);
    recomputeMobileButtonInput();
  };

  for (const button of buttons) {
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('pointerdown', (event) => {
      if (!mobileControlsVisible || !touchControlsEnabled) {
        return;
      }
      event.preventDefault();
      if (!audioEnabled || !isAudioContextRunning()) {
        enableAudio();
      }

      const keyName = button.dataset.key;
      if (!keyName) {
        return;
      }

      if (typeof button.setPointerCapture === 'function') {
        button.setPointerCapture(event.pointerId);
      }
      mobilePointerKeyById.set(event.pointerId, keyName);
      recomputeMobileButtonInput();
    });

    button.addEventListener('pointerup', releasePointer);
    button.addEventListener('pointercancel', releasePointer);
    button.addEventListener('lostpointercapture', releasePointer);
  }

  window.addEventListener('blur', () => {
    clearDirectionalState(keyboardInput);
    mobilePointerKeyById.clear();
    recomputeMobileButtonInput();
  });
}

function syncMobileControlsVisibility() {
  if (!mobileControlsRoot) {
    return;
  }

  const shouldShow = touchControlsEnabled && game && game.level > 0 && game.level < 12;
  if (shouldShow !== mobileControlsVisible) {
    mobileControlsVisible = shouldShow;
    mobileControlsRoot.classList.toggle('visible', shouldShow);
    layoutCanvas();
  }

  if (!shouldShow && mobilePointerKeyById.size > 0) {
    mobilePointerKeyById.clear();
    recomputeMobileButtonInput();
  }

  updateMobileControlButtonStates();
}

function updateMobileControlButtonStates() {
  if (!mobileControlsRoot) {
    return;
  }

  const buttons = mobileControlsRoot.querySelectorAll('button[data-key]');
  for (const button of buttons) {
    const keyName = button.dataset.key;
    button.classList.toggle('active', keyName ? mobileButtonInput[keyName] : false);
  }
}

function handlePointerTap(px, py) {
  if (!game) {
    return false;
  }

  if (game.isVolumeButtonHit(px, py)) {
    game.toggleMute();
    return true;
  }

  if (game.level === 0) {
    startGame();
    return true;
  }

  if (game.level === 12) {
    restartGame();
    return true;
  }

  return false;
}

function loadAudioAssets() {
  if (typeof loadSound !== 'function') {
    return;
  }

  sounds.background = loadSound('./assets/sounds/background.mp3', () => {
    if (game) {
      game.backgroundSound = sounds.background;
      game.applyVolumeState();
      if (audioEnabled && game.level > 0) {
        game.playBackgroundLoop();
      }
    }
  });

  sounds.intro = loadSound('./assets/sounds/intro.mp3', () => {
    if (game) {
      game.introSound = sounds.intro;
      game.applyVolumeState();
      if (audioEnabled && game.level === 0) {
        game.playIntroLoop();
      }
    }
  });
}

class Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.vx = 0;
    this.vy = 0;
    this.dir = DIR_RIGHT;
    this.imgName = imgName;
    this.img = images[imgName];
    this.imgW = imgW;
    this.imgH = imgH;
    this.numFrames = numFrames;
    this.frame = 0;
  }

  setImage(imgName) {
    this.imgName = imgName;
    this.img = images[imgName];
  }

  display() {
    this.update();

    if (!this.img) {
      return;
    }

    if (this.dir === DIR_RIGHT) {
      image(
        this.img,
        this.x - this.imgW / 2,
        this.y - this.imgH / 2,
        this.imgW,
        this.imgH,
        this.frame * this.imgW,
        0,
        this.imgW,
        this.imgH
      );
    } else {
      push();
      translate(this.x, this.y);
      scale(-1, 1);
      image(
        this.img,
        -this.imgW / 2,
        -this.imgH / 2,
        this.imgW,
        this.imgH,
        this.frame * this.imgW,
        0,
        this.imgW,
        this.imgH
      );
      pop();
    }
  }

  update() {}
}

class Faiza extends Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames) {
    super(x, y, r, imgName, imgW, imgH, numFrames);
    this.keyHandler = { left: false, right: false, up: false, down: false };
    this.alive = true;
    this.breakdownCnt = 0;
    this.distractionCnt = 0;
  }

  update() {
    if (0 < game.level && game.level <= 5) {
      if (this.keyHandler.left === true) {
        this.vx = -2;
        this.dir = DIR_LEFT;
        if (this.x - this.r + this.vx < 6) {
          this.vx = 0;
        }
        if (
          this.x - this.r > 270 &&
          this.x - this.r + this.vx < 280 &&
          (this.y - this.r < 396 || this.y + this.r > 484)
        ) {
          this.vx = 0;
        }
        if (
          this.x - this.r > 650 &&
          this.x - this.r + this.vx < 660 &&
          this.y - this.r < 286
        ) {
          this.vx = 0;
        }
        if (
          this.x - this.r > 820 &&
          this.x - this.r + this.vx < 830 &&
          this.y + this.r > 244
        ) {
          this.vx = 0;
        }
        this.x += this.vx;
      } else if (this.keyHandler.right === true) {
        this.vx = 2;
        this.dir = DIR_RIGHT;
        if (
          this.x + this.r < 120 &&
          this.x + this.r + this.vx > 110 &&
          (this.y - this.r < 396 || this.y + this.r > 484)
        ) {
          this.vx = 0;
        }
        if (
          this.x + this.r < 750 &&
          this.x + this.r + this.vx > 740 &&
          this.y + this.r > 244
        ) {
          this.vx = 0;
        }
        if (
          this.x + this.r < 920 &&
          this.x + this.r + this.vx > 910 &&
          this.y - this.r < 526
        ) {
          this.vx = 0;
        }
        if (this.x + this.r > 1018) {
          this.vx = 0;
        }
        this.x += this.vx;
      } else {
        this.vx = 0;
      }

      if (this.keyHandler.up === true) {
        this.vy = -2;
        if (this.x + this.r < 120 && this.y - this.r + this.vy < 288) {
          this.vy = 0;
        }
        if (
          this.x + this.r >= 120 &&
          this.x - this.r <= 270 &&
          this.y - this.r + this.vy < 398
        ) {
          this.vy = 0;
        }
        if (
          this.x - this.r > 270 &&
          this.x - this.r <= 650 &&
          this.y - this.r + this.vy < 288
        ) {
          this.vy = 0;
        }
        if (
          this.x - this.r > 650 &&
          this.x + this.r < 920 &&
          this.y - this.r + this.vy < 168
        ) {
          this.vy = 0;
        }
        if (this.x + this.r >= 920 && this.y - this.r + this.vy < 528) {
          this.vy = 0;
        }
        this.y += this.vy;
      } else if (this.keyHandler.down === true) {
        this.vy = 2;
        if (this.x + this.r < 120 && this.y + this.r + this.vy > 613) {
          this.vy = 0;
        }
        if (
          this.x + this.r >= 120 &&
          this.x - this.r <= 270 &&
          this.y + this.r + this.vy > 482
        ) {
          this.vy = 0;
        }
        if (
          this.x - this.r > 270 &&
          this.x + this.r < 750 &&
          this.y + this.r + this.vy > 612
        ) {
          this.vy = 0;
        }
        if (
          this.x + this.r >= 750 &&
          this.x - this.r <= 820 &&
          this.y + this.r + this.vy > 242
        ) {
          this.vy = 0;
        }
        if (
          this.x - this.r > 820 &&
          this.x + this.r <= 1024 &&
          this.y + this.r + this.vy > 612
        ) {
          this.vy = 0;
        }
        this.y += this.vy;
      } else {
        this.vy = 0;
      }
    } else if (game.level >= 6) {
      if (this.keyHandler.left === true) {
        this.vx = -2;
        this.dir = DIR_LEFT;
        if (this.x - this.r + this.vx < 6) {
          this.vx = 0;
        }
        this.x += this.vx;
      } else if (this.keyHandler.right === true) {
        this.vx = 2;
        this.dir = DIR_RIGHT;
        if (this.x + this.r + this.vx > 1018) {
          this.vx = 0;
        }
        this.x += this.vx;
      } else {
        this.vx = 0;
      }

      if (this.keyHandler.up === true) {
        this.vy = -2;
        if (this.y - this.r + this.vy <= 5) {
          this.vy = 0;
        }
        this.y += this.vy;
      } else if (this.keyHandler.down === true) {
        this.vy = 2;
        if (this.y + this.r + this.vy >= 762) {
          this.vy = 0;
        }
        this.y += this.vy;
      } else {
        this.vy = 0;
      }
    }

    if (frameCount % 5 === 0 && (this.vx !== 0 || this.vy !== 0)) {
      this.frame = (this.frame + 1) % (this.numFrames - 1);
    } else if (this.vx === 0 && this.vy === 0) {
      this.frame = 8;
    }

    if (game.level >= 3 && game.level <= 5) {
      for (const q of game.quizlist) {
        if (this.distance(q) <= this.r + q.r) {
          this.breakdownCnt += 1;
          this.alive = false;
        }
      }
    }

    if (game.level >= 2 && game.level <= 5) {
      if (this.distance(game.clock) <= this.r + game.clock.r) {
        this.breakdownCnt += 1;
        this.alive = false;
      }
    }

    if (game.level === 4 || game.level === 5) {
      if (this.distance(game.clock2) <= this.r + game.clock2.r) {
        this.breakdownCnt += 1;
        this.alive = false;
      }
    }

    if (game.level === 5) {
      if (this.distance(game.clock3) <= this.r + game.clock3.r) {
        this.breakdownCnt += 1;
        this.alive = false;
      }
    }

    if (game.level >= 6 && game.level <= 10) {
      for (const q of game.quizlist2) {
        if (this.distance(q) <= this.r + q.r) {
          this.breakdownCnt += 1;
          this.alive = false;
          game.anxiety.alive = false;
          game.anxiety2.alive = false;
        }
      }
    }

    if (game.level === 8) {
      for (const a of game.assignments) {
        if (this.distance(a) <= this.r + a.r) {
          this.breakdownCnt += 1;
          this.alive = false;
          game.anxiety.alive = false;
          game.anxiety2.alive = false;
          game.assignments = [];
        }
      }
    }

    if (game.level === 9) {
      for (const a of game.assignments2) {
        if (this.distance(a) <= this.r + a.r) {
          this.breakdownCnt += 1;
          this.alive = false;
          game.anxiety.alive = false;
          game.anxiety2.alive = false;
          game.assignments2 = [];
        }
      }
    }

    if (game.level === 10) {
      for (const a of game.assignments3) {
        if (this.distance(a) <= this.r + a.r) {
          this.breakdownCnt += 1;
          this.alive = false;
          game.anxiety.alive = false;
          game.anxiety2.alive = false;
          game.assignments3 = [];
        }
      }
    }

    if (game.level === 11 && !(0 <= this.x && this.x <= 100 && 530 <= this.y && this.y <= 640)) {
      for (const d of game.distractions) {
        if (this.distance(d) <= this.r + d.r) {
          this.distractionCnt += 1;
          this.alive = false;
        }
      }
    }

    if (this.distance(game.brain) <= this.r + game.brain.r && game.level <= 5) {
      game.level += 1;
      game.brain = new Brain(
        980,
        570,
        30,
        `brain_${game.brainImages[randInt(0, 2)]}.png`,
        85,
        85,
        2
      );
      game.clock = new Clock(310, 330, 32, 'clock.png', 66, 66, 4, 270, 740);
      game.clock2 = new Clock(695, 570, 32, 'clock.png', 66, 66, 4, 270, 740);
      game.clock3 = new Clock(500, 440, 32, 'clock.png', 66, 66, 4, 270, 740);
      this.alive = false;
    }

    if (this.distance(game.brain2) <= this.r + game.brain2.r && game.level >= 6 && game.level <= 10) {
      game.level += 1;
      game.brain2 = new Brain(
        980,
        50,
        30,
        `brain_${game.brainImages[randInt(0, 2)]}.png`,
        85,
        85,
        2
      );
      this.alive = false;
      game.anxiety.alive = false;
      game.anxiety2.alive = false;
    }

    if (this.distance(game.gpa) <= this.r + game.gpa.r && game.level === 11) {
      game.level += 1;
    }

    if (this.x >= 0) {
      game.xShift += this.vx;
    }
  }

  distance(target) {
    return ((this.x - target.x) ** 2 + (this.y - target.y) ** 2) ** 0.5;
  }
}

class Clock extends Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames, xl, xr) {
    super(x, y, r, imgName, imgW, imgH, numFrames);
    this.xl = xl;
    this.xr = xr;
    this.vx = 3;

    this.dir = random([DIR_LEFT, DIR_RIGHT]);
    if (this.dir === DIR_LEFT) {
      this.vx *= -1;
    }
  }

  update() {
    if (frameCount % 12 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }

    if (this.x - this.r <= this.xl) {
      this.vx *= -1;
      this.dir = DIR_RIGHT;
    }
    if (this.x + this.r >= this.xr) {
      this.vx *= -1;
      this.dir = DIR_LEFT;
    }

    this.x += this.vx;
    this.y += this.vy;
  }
}

class Quiz extends Creature {
  update() {
    if (frameCount % 20 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }
  }
}

class Assignment extends Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames, tx, ty) {
    super(x, y, r, imgName, imgW, imgH, numFrames);
    this.tx = tx;
    this.ty = ty;
    this.dy = this.ty - this.y;
    this.dx = this.tx - this.x;
    this.v = 8;

    if (this.dx === 0 && this.dy === 0) {
      this.angle = 0;
    } else if (this.dx === 0 && this.dy > 0) {
      this.angle = radians(90);
    } else if (this.dx === 0 && this.dy < 0) {
      this.angle = radians(270);
    } else {
      this.angle = atan(this.dy / this.dx);
    }
  }

  update() {
    if (frameCount % 20 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }

    if (this.dx === 0 && this.dy > 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx === 0 && this.dy < 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy === 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy === 0) {
      this.x -= this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy > 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy < 0) {
      this.x -= this.v * cos(this.angle);
      this.y -= this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy > 0) {
      this.x -= this.v * cos(this.angle);
      this.y -= this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy < 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
  }
}

class Anxiety extends Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames, tx, ty, tr) {
    super(x, y, r, imgName, imgW, imgH, numFrames);
    this.tx = tx;
    this.ty = ty;
    this.tr = tr;
    this.vx = 0;
    this.vy = 0;
    this.dir = DIR_RIGHT;
    this.alive = true;
    this.keyHandler = { left: false, right: false, up: false, down: false };
    this.v = 1.7;
  }

  update() {
    if (frameCount % 20 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }

    if (this.keyHandler.left === true) {
      this.vx = -2;
      this.dir = DIR_LEFT;
      if (this.tx - this.tr + this.vx < 6) {
        this.vx = 0;
      }
      this.tx += this.vx;
    } else if (this.keyHandler.right === true) {
      this.vx = 2;
      this.dir = DIR_RIGHT;
      if (this.tx + this.tr + this.vx > 1018) {
        this.vx = 0;
      }
      this.tx += this.vx;
    } else {
      this.vx = 0;
    }

    if (this.keyHandler.up === true) {
      this.vy = -2;
      if (this.ty - this.tr + this.vy <= 5) {
        this.vy = 0;
      }
      this.ty += this.vy;
    } else if (this.keyHandler.down === true) {
      this.vy = 2;
      if (this.ty + this.tr + this.vy >= 762) {
        this.vy = 0;
      }
      this.ty += this.vy;
    } else {
      this.vy = 0;
    }

    this.dy = this.ty - this.y;
    this.dx = this.tx - this.x;

    if (this.dx === 0 && this.dy === 0) {
      this.angle = 0;
    } else if (this.dx === 0 && this.dy > 0) {
      this.angle = radians(90);
    } else if (this.dx === 0 && this.dy < 0) {
      this.angle = radians(270);
    } else {
      this.angle = atan(this.dy / this.dx);
    }

    if (this.dx === 0 && this.dy > 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx === 0 && this.dy < 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy === 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy === 0) {
      this.x -= this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy > 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy < 0) {
      this.x -= this.v * cos(this.angle);
      this.y -= this.v * sin(this.angle);
    }
    if (this.dx < 0 && this.dy > 0) {
      this.x -= this.v * cos(this.angle);
      this.y -= this.v * sin(this.angle);
    }
    if (this.dx > 0 && this.dy < 0) {
      this.x += this.v * cos(this.angle);
      this.y += this.v * sin(this.angle);
    }

    if (this.distance() <= this.r + this.tr && game.level >= 6 && game.level <= 10) {
      this.alive = false;
      game.faiza.breakdownCnt += 1;
      game.faiza.alive = false;
    }
  }

  distance() {
    return ((this.x - this.tx) ** 2 + (this.y - this.ty) ** 2) ** 0.5;
  }

  display() {
    this.update();

    if (!this.img) {
      return;
    }

    image(
      this.img,
      this.x - this.imgW / 2,
      this.y - this.imgH / 2,
      this.imgW,
      this.imgH,
      this.frame * this.imgW,
      0,
      this.imgW,
      this.imgH
    );
  }
}

class Brain extends Creature {
  update() {
    if (frameCount % 20 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }
  }
}

class Distractions extends Creature {
  constructor(x, y, r, imgName, imgW, imgH, numFrames) {
    super(x, y, r, imgName, imgW, imgH, numFrames);
    this.vx = randInt(2, 5);
    this.vy = -1 * randInt(2, 5);
  }

  update() {
    if (frameCount % 12 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }

    if (this.x + this.r >= 1024) {
      this.vx *= -1;
    }
    if (this.x - this.r <= 0) {
      this.vx *= -1;
    }
    if (this.y - this.r <= 10) {
      this.vy *= -1;
    }
    if (this.y + this.r >= 780) {
      this.vy *= -1;
    }

    this.x += this.vx;
    this.y += this.vy;
  }
}

class GPA extends Creature {
  update() {
    if (frameCount % 20 === 0) {
      this.frame = (this.frame + 1) % this.numFrames;
    }
  }
}

class Game {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.xShift = 0;
    this.level = 0;
    this.isMuted = false;
    this.volumeButton = { x: 16, y: 16, w: 40, h: 40 };

    this.quizlist = [];
    this.quizlist2 = [];
    this.assignments = [];
    this.assignments2 = [];
    this.assignments3 = [];
    this.distractions = [];

    this.faiza = new Faiza(34, 585, 27, 'faiza.png', 66, 66, 9);
    this.clock = new Clock(310, 330, 32, 'clock.png', 66, 66, 4, 270, 740);
    this.clock2 = new Clock(695, 570, 32, 'clock.png', 66, 66, 4, 270, 740);
    this.clock3 = new Clock(500, 440, 32, 'clock.png', 66, 66, 4, 270, 740);
    this.quiz = new Quiz(randInt(300, 710), randInt(300, 590), 25, 'quiz.png', 66, 66, 3);
    this.quizlist.push(this.quiz);
    this.quiz2 = new Quiz(randInt(120, 994), randInt(130, 738), 25, 'quiz.png', 66, 66, 3);
    this.quizlist2.push(this.quiz2);
    this.anxiety = new Anxiety(500, 500, 25, 'anxiety.png', 66, 66, 3, 34, 585, this.faiza.r);
    this.anxiety2 = new Anxiety(1000, 700, 25, 'anxiety.png', 66, 66, 3, 34, 585, this.faiza.r);
    this.brainImages = ['weights', 'bulb', 'waving'];
    this.brain = new Brain(980, 570, 30, 'brain_waving.png', 85, 85, 2);
    this.brain2 = new Brain(
      980,
      50,
      30,
      `brain_${this.brainImages[randInt(0, 2)]}.png`,
      85,
      85,
      2
    );
    this.gpa = new GPA(990, 35, 25, 'gpa.png', 70, 56, 1);

    this.img = images['background1.png'];
    this.finalBg = images['final_background.png'];
    this.startBg = images['start_background.png'];
    this.overBg = images['gameover_background.png'];

    this.backgroundSound = sounds.background;
    this.introSound = sounds.intro;
    this.applyVolumeState();
    if (audioEnabled) {
      this.playIntroLoop();
    }

    this.distractions.push(new Distractions(100, 300, 58, 'jake.png', 120, 120, 6));
    this.distractions.push(new Distractions(444, 333, 48, 'insta.png', 100, 100, 1));
    this.distractions.push(new Distractions(900, 120, 48, 'facebook.png', 100, 100, 1));
    this.distractions.push(new Distractions(887, 635, 48, 'netflix.png', 100, 100, 1));
    this.distractions.push(new Distractions(134, 587, 48, 'youtube.png', 100, 100, 1));
    this.distractions.push(new Distractions(55, 100, 48, 'ps.png', 120, 120, 1));
  }

  playIntroLoop() {
    _audioLog('playIntroLoop: enabled=' + audioEnabled + ' sound=' + !!this.introSound);
    if (!audioEnabled || !this.introSound) {
      return;
    }

    if (this.backgroundSound && this.backgroundSound.isPlaying()) {
      this.backgroundSound.stop();
    }

    this.introSound.stop();
    this.introSound.loop();
    this.applyVolumeState();
  }

  playBackgroundLoop() {
    _audioLog('playBgLoop: enabled=' + audioEnabled + ' sound=' + !!this.backgroundSound);
    if (!audioEnabled || !this.backgroundSound) {
      return;
    }

    if (this.introSound && this.introSound.isPlaying()) {
      this.introSound.stop();
    }

    this.backgroundSound.stop();
    this.backgroundSound.loop();
    this.applyVolumeState();
  }

  applyVolumeState() {
    const volume = this.isMuted ? 0 : 1;

    if (this.introSound && typeof this.introSound.setVolume === 'function') {
      this.introSound.setVolume(volume);
    }
    if (this.backgroundSound && typeof this.backgroundSound.setVolume === 'function') {
      this.backgroundSound.setVolume(volume);
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    this.applyVolumeState();
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
  }

  isVolumeButtonHit(px, py) {
    return (
      px >= this.volumeButton.x &&
      px <= this.volumeButton.x + this.volumeButton.w &&
      py >= this.volumeButton.y &&
      py <= this.volumeButton.y + this.volumeButton.h
    );
  }

  drawVolumeButton() {
    const { x, y, w, h } = this.volumeButton;

    push();
    rectMode(CORNER);
    stroke(30, 30, 30, 220);
    strokeWeight(2);
    fill(255, 255, 255, 170);
    rect(x, y, w, h, 8);

    noStroke();
    fill(25);
    // Speaker body
    rect(x + 8, y + 14, 8, 12, 2);
    // Speaker cone
    triangle(x + 16, y + 14, x + 25, y + 10, x + 25, y + 30);

    if (this.isMuted) {
      stroke(190, 25, 25);
      strokeWeight(3);
      line(x + 29, y + 12, x + 35, y + 28);
      line(x + 35, y + 12, x + 29, y + 28);
    } else {
      noFill();
      stroke(25);
      strokeWeight(2);
      arc(x + 27, y + 20, 8, 12, -PI / 4, PI / 4);
      arc(x + 30, y + 20, 13, 18, -PI / 4, PI / 4);
    }
    pop();
  }

  update() {
    if (this.faiza.alive === false) {
      this.faiza.x = 34;
      this.faiza.y = 585;
      this.faiza.alive = true;
    }

    const positionList = [
      [randInt(30, 994), 30],
      [994, randInt(150, 730)],
      [randInt(30, 994), 730],
      [30, randInt(150, 400)]
    ];

    if (this.level === 8) {
      const randInt1 = randInt(0, 3);
      if (frameCount % 200 === 0) {
        this.assignments.push(
          new Assignment(
            positionList[randInt1][0],
            positionList[randInt1][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
    } else if (this.level === 9) {
      const randInt1 = randInt(0, 3);
      const randInt2 = randInt(0, 3);
      if (frameCount % 200 === 0) {
        this.assignments2.push(
          new Assignment(
            positionList[randInt1][0],
            positionList[randInt1][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
      if (frameCount % 201 === 0) {
        this.assignments2.push(
          new Assignment(
            positionList[randInt2][0],
            positionList[randInt2][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
    } else if (this.level === 10) {
      const randInt1 = randInt(0, 3);
      const randInt2 = randInt(0, 3);
      const randInt3 = randInt(0, 3);
      if (frameCount % 200 === 0) {
        this.assignments3.push(
          new Assignment(
            positionList[randInt1][0],
            positionList[randInt1][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
      if (frameCount % 201 === 0) {
        this.assignments3.push(
          new Assignment(
            positionList[randInt2][0],
            positionList[randInt2][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
      if (frameCount % 202 === 0) {
        this.assignments3.push(
          new Assignment(
            positionList[randInt3][0],
            positionList[randInt3][1],
            30,
            'assignment.png',
            66,
            66,
            4,
            this.faiza.x,
            this.faiza.y
          )
        );
      }
    }

    if (this.anxiety.alive === false || this.anxiety2.alive === false) {
      this.anxiety.x = 500;
      this.anxiety2.x = 1000;
      this.anxiety.tx = 34;
      this.anxiety2.tx = 34;
      this.anxiety.y = 500;
      this.anxiety2.y = 700;
      this.anxiety.ty = 585;
      this.anxiety2.ty = 585;
      this.anxiety.alive = true;
      this.anxiety2.alive = true;
    }

    if (frameCount % 300 === 0) {
      this.quizlist = [];
      this.quizlist.push(new Quiz(randInt(300, 710), randInt(300, 590), 30, 'quiz.png', 66, 66, 3));
    }

    if (frameCount % 150 === 0) {
      this.quizlist2 = [];
      this.quizlist2.push(new Quiz(randInt(120, 994), randInt(130, 738), 25, 'quiz.png', 66, 66, 3));
    }
  }

  display() {
    this.update();

    if (this.level === 0) {
      image(this.startBg, 0, 0);
    }

    if (this.level >= 1 && this.level <= 10) {
      const x = this.xShift;
      const widthRight = positiveMod(x, this.w);
      const widthLeft = this.w - widthRight;

      image(this.img, 0, 0, widthLeft, this.h, widthRight, 0, this.w - widthRight, this.h);
      image(this.img, widthLeft, 0, widthRight, this.h, 0, 0, widthRight, this.h);
    }

    if (this.level === 11) {
      image(this.finalBg, 0, 0);
    }

    if (this.level === 12) {
      image(this.overBg, 0, 0);
    }

    if (this.level > 0 && this.level <= 5) {
      stroke(0, 0, 0);
      strokeWeight(7);
      line(0, 100, 1024, 100);
      line(0, 115, 1024, 115);
      strokeWeight(9);
      line(0, 280, 120, 280);
      line(120, 280, 120, 390);
      line(120, 390, 270, 390);
      line(270, 280, 270, 390);
      line(120, 490, 270, 490);
      line(0, 620, 120, 620);
      line(120, 490, 120, 620);
      line(270, 490, 270, 620);
      line(270, 280, 650, 280);
      line(650, 280, 650, 160);
      line(270, 620, 750, 620);
      line(750, 620, 750, 250);
      line(750, 250, 820, 250);
      line(820, 250, 820, 620);
      line(650, 160, 920, 160);
      line(920, 160, 920, 520);
      line(920, 520, 1024, 520);
      line(820, 620, 1024, 620);
    }

    noStroke();

    if (this.level === 0) {
      push();
      textAlign(CENTER, BASELINE);
      textSize(80);
      fill(0);
      text('UNI SUFFERERS', this.w / 2, 80);
      textSize(40);
      fill(255, 213, 43);
      text('Press space or tap to begin playing!', this.w / 2, 650);
      pop();
    }

    if (this.level === 12) {
      textSize(150);
      fill(255, 0, 0);
      text('GAME', 270, 220);
      text('OVER', 290, 350);
      textSize(30);
      text(
        `${this.faiza.breakdownCnt} breakdowns and ${this.faiza.distractionCnt} distractions later,`,
        240,
        550
      );
      text('you finally got that 4.0 GPA!', 240, 590);
      fill(255, 213, 43);
      text('Think you can do better? Tap or click on the', 240, 650);
      text('screen to play again!', 240, 690);
    }

    textSize(40);
    fill(75, 0, 70);
    if (this.level === 1) {
      text('GO SAVE YOUR MENTAL HEALTH!', 180, 70);
    } else if (this.level === 2) {
      text('5 AM CLASSES ARE WAITING!', 210, 70);
    } else if (this.level === 3) {
      text("TOO EASY? LET'S POP THINGS UP!", 170, 70);
    } else if (this.level === 4) {
      text('HAVE MORE OF IT!', 290, 70);
    } else if (this.level === 5) {
      text('AND MORE!', 360, 70);
    } else if (this.level === 6) {
      textSize(35);
      text("SOME THINGS JUST WON'T STOP FOLLOWING YOU", 65, 60);
    } else if (this.level === 7) {
      text("THIS AIN'T GETTING ANY BETTER", 150, 65);
    } else if (this.level === 8) {
      text('WAIT, WHAT? ASSIGNMENT?', 210, 65);
    } else if (this.level === 9) {
      text('WHAT? THERE WERE TWO?', 230, 65);
    } else if (this.level === 10) {
      text("YOU'RE KIDDING ME...", 270, 65);
    } else if (this.level === 11) {
      textSize(40);
      fill(255, 213, 43);
      text('GO, GET THAT 4.0 GPA!', 270, 65);
    }

    if (this.level > 0 && this.level <= 5) {
      this.brain.display();
    }
    if (this.level > 0 && this.level <= 11) {
      this.faiza.display();
    }
    if (this.level >= 3 && this.level <= 5) {
      for (const q of this.quizlist) {
        q.display();
      }
    }
    if (this.level >= 2 && this.level <= 5) {
      this.clock.display();
    }
    if (this.level === 4 || this.level === 5) {
      this.clock2.display();
    }
    if (this.level === 5) {
      this.clock3.display();
    }
    if (this.level >= 6 && this.level <= 10) {
      this.brain2.display();
    }
    if (this.level >= 6 && this.level <= 10) {
      for (const q of this.quizlist2) {
        q.display();
      }
    }
    if (this.level >= 6 && this.level <= 10) {
      this.anxiety.display();
    }
    if (this.level >= 7 && this.level <= 10) {
      this.anxiety2.display();
    }
    if (this.level === 8) {
      for (const a of this.assignments) {
        a.display();
      }
    }
    if (this.level === 9) {
      for (const a of this.assignments2) {
        a.display();
      }
    }
    if (this.level === 10) {
      for (const a of this.assignments3) {
        a.display();
      }
    }
    if (this.level === 11) {
      for (const d of this.distractions) {
        d.display();
      }
      this.gpa.display();
    }

    this.drawVolumeButton();
  }
}

function keyPressed() {
  if (keyCode === 32 && game.level === 0) {
    startGame();
    return false;
  }

  if (keyCode === LEFT_ARROW) {
    keyboardInput.left = true;
  } else if (keyCode === RIGHT_ARROW) {
    keyboardInput.right = true;
  } else if (keyCode === UP_ARROW) {
    keyboardInput.up = true;
  } else if (keyCode === DOWN_ARROW) {
    keyboardInput.down = true;
  }

  applyInputState();
}

function keyReleased() {
  if (keyCode === LEFT_ARROW) {
    keyboardInput.left = false;
  } else if (keyCode === RIGHT_ARROW) {
    keyboardInput.right = false;
  } else if (keyCode === UP_ARROW) {
    keyboardInput.up = false;
  } else if (keyCode === DOWN_ARROW) {
    keyboardInput.down = false;
  }

  applyInputState();
}

function mousePressed() {
  if (!audioEnabled || !isAudioContextRunning()) {
    enableAudio();
  }
}

function mouseClicked() {
  if (Date.now() < ignoreMouseClickUntil) {
    return false;
  }

  if (handlePointerTap(mouseX, mouseY)) {
    return false;
  }
}

function touchStarted() {
  ignoreMouseClickUntil = Date.now() + 500;

  if (!audioEnabled || !isAudioContextRunning()) {
    enableAudio();
  }

  for (const t of touches) {
    if (handlePointerTap(t.x, t.y)) {
      break;
    }
  }

  return false;
}

function touchMoved() {
  return false;
}

function touchEnded() {
  return false;
}
