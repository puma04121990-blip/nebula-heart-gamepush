(function () {
  var LANG_KEY = 'nebula-heart-lang';
  var FORMS = [
    { need: 0, color: '#7cf6ff' },
    { need: 250, color: '#8ab4ff' },
    { need: 4000, color: '#c084fc' },
    { need: 60000, color: '#ff9ad5' },
    { need: 9e5, color: '#ffb86b' },
    { need: 1.2e7, color: '#7dffb3' }
  ];

  var ORBITS = [
    { base: 15, prod: 0.1 },
    { base: 100, prod: 1 },
    { base: 1100, prod: 8 },
    { base: 12000, prod: 47 },
    { base: 130000, prod: 260 },
    { base: 1.4e6, prod: 1400 }
  ];

  var HARMONIES = [
    { base: 20, kind: 'click', val: 1 },
    { base: 250, kind: 'click', val: 5 },
    { base: 800, kind: 'mult', val: 0.1 },
    { base: 4000, kind: 'click', val: 25 },
    { base: 25000, kind: 'mult', val: 0.25 }
  ];

  var COLLAPSE_NEED = 1e6;
  var OFFLINE_CAP = 8 * 3600;

  var state = {
    dust: 0,
    total: 0,
    orbits: ORBITS.map(function () { return 0; }),
    harms: HARMONIES.map(function () { return 0; }),
    gravity: 0,
    last: Date.now(),
    sound: true,
    lang: 'ru',
    welcome: false
  };

  var paused = false;
  var combo = 0;
  var comboUntil = 0;
  var shopTab = 'orbits';
  var sheetKind = '';
  var lastTick = Date.now();
  var saveTimer = 0;

  var el = {
    boot: document.getElementById('boot'),
    fill: document.getElementById('bootFill'),
    app: document.getElementById('app'),
    dust: document.getElementById('dust'),
    rate: document.getElementById('rate'),
    form: document.getElementById('formName'),
    evo: document.getElementById('evoLabel'),
    evoFill: document.getElementById('evoFill'),
    core: document.getElementById('core'),
    combo: document.getElementById('combo'),
    floats: document.getElementById('floatLayer'),
    sheet: document.getElementById('sheet'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
    toast: document.getElementById('toast')
  };

  function dict() {
    return (window.I18N && window.I18N[state.lang]) || window.I18N.ru;
  }

  function t(key, vars) {
    var s = dict()[key];
    if (s == null) s = key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = String(s).replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ru' || saved === 'en') return saved;
    } catch (e) {}
    var gpLang = typeof GPX !== 'undefined' ? GPX.platformLang() : '';
    if (gpLang === 'ru' || gpLang === 'en') return gpLang;
    var nav = (navigator.language || 'ru').slice(0, 2).toLowerCase();
    return nav === 'en' ? 'en' : 'ru';
  }

  function applyStaticI18n() {
    document.documentElement.lang = state.lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(function (node) {
      node.textContent = t(node.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (node) {
      node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria')));
    });
  }

  function setLang(code) {
    state.lang = code === 'en' ? 'en' : 'ru';
    try { localStorage.setItem(LANG_KEY, state.lang); } catch (e) {}
    if (typeof GPX !== 'undefined') GPX.setLanguage(state.lang);
    applyStaticI18n();
    persist();
    renderHud();
    if (!el.sheet.classList.contains('hidden')) refreshOpenSheet();
  }

  function fmt(n) {
    if (!isFinite(n)) return '0';
    var abs = Math.abs(n);
    if (abs < 1000) return (Math.round(n * 10) / 10).toString();
    var u = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    var i = Math.floor(Math.log10(abs) / 3);
    if (i >= u.length) i = u.length - 1;
    return (n / Math.pow(1000, i)).toFixed(2) + u[i];
  }

  function costOf(base, level) {
    return Math.floor(base * Math.pow(1.15, level));
  }

  function gravityMult() {
    return 1 + state.gravity * 0.5;
  }

  function clickPower() {
    var p = 1;
    HARMONIES.forEach(function (h, i) {
      if (h.kind === 'click') p += h.val * state.harms[i];
    });
    return p * gravityMult() * comboMult();
  }

  function comboMult() {
    if (Date.now() > comboUntil) { combo = 0; return 1; }
    return 1 + Math.min(combo, 16) * 0.08;
  }

  function flowMult() {
    var m = gravityMult();
    HARMONIES.forEach(function (h, i) {
      if (h.kind === 'mult') m *= 1 + h.val * state.harms[i];
    });
    return m;
  }

  function perSec() {
    var s = 0;
    ORBITS.forEach(function (o, i) { s += o.prod * state.orbits[i]; });
    return s * flowMult();
  }

  function formIndex() {
    var idx = 0;
    for (var i = 0; i < FORMS.length; i++) if (state.total >= FORMS[i].need) idx = i;
    return idx;
  }

  function evoProgress() {
    var i = formIndex();
    if (i >= FORMS.length - 1) return 1;
    var a = FORMS[i].need;
    var b = FORMS[i + 1].need;
    return Math.max(0, Math.min(1, (state.total - a) / (b - a)));
  }

  function applyTheme() {
    var i = formIndex();
    document.documentElement.style.setProperty('--core', FORMS[i].color);
    el.form.textContent = t('forms')[i];
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.add('hidden'); }, 2200);
  }

  function beep() {
    if (!state.sound) return;
    try {
      var ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 420 + Math.min(combo, 12) * 28;
      g.gain.value = 0.04;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  function floatText(v) {
    var n = document.createElement('div');
    n.className = 'floater';
    n.textContent = '+' + fmt(v);
    n.style.left = 42 + Math.random() * 16 + '%';
    el.floats.appendChild(n);
    setTimeout(function () { n.remove(); }, 720);
  }

  function addDust(v, show) {
    if (v <= 0) return;
    state.dust += v;
    state.total += v;
    if (show) floatText(v);
  }

  function scoreValue() {
    return Math.floor(Math.log10(state.total + 1) * 1000 + state.gravity * 250);
  }

  function persist() {
    state.last = Date.now();
    var snap = {
      dust: state.dust,
      total: state.total,
      orbits: state.orbits,
      harms: state.harms,
      gravity: state.gravity,
      last: state.last,
      sound: state.sound,
      lang: state.lang,
      welcome: state.welcome
    };
    GPX.saveProgress(snap, scoreValue());
  }

  function hydrate(data) {
    if (!data) return 0;
    state.dust = data.dust || 0;
    state.total = data.total || 0;
    state.orbits = data.orbits || state.orbits;
    state.harms = data.harms || state.harms;
    state.gravity = data.gravity || 0;
    state.sound = data.sound !== false;
    state.welcome = !!data.welcome;
    if (data.lang === 'en' || data.lang === 'ru') state.lang = data.lang;
    var dt = Math.min(OFFLINE_CAP, Math.max(0, (Date.now() - (data.last || Date.now())) / 1000));
    var gained = perSec() * dt;
    if (gained > 1) {
      addDust(gained, false);
      return gained;
    }
    return 0;
  }

  function renderHud() {
    el.dust.textContent = fmt(state.dust);
    el.rate.textContent = fmt(perSec()) + ' ' + t('perSec');
    var p = evoProgress();
    el.evo.textContent = formIndex() >= FORMS.length - 1
      ? t('formCap')
      : (t('phase') + ' ' + Math.floor(p * 100) + '%');
    el.evoFill.style.width = (p * 100) + '%';
    if (Date.now() < comboUntil && combo > 1) {
      el.combo.classList.remove('hidden');
      el.combo.textContent = t('resonance') + ' ×' + comboMult().toFixed(2);
    } else el.combo.classList.add('hidden');
    applyTheme();
  }

  function closeSheet() {
    sheetKind = '';
    el.sheet.classList.add('hidden');
  }

  function openSheet(kind, title, html) {
    sheetKind = kind;
    el.sheetTitle.textContent = title;
    el.sheetBody.innerHTML = html;
    el.sheet.classList.remove('hidden');
  }

  function shopHtml() {
    var tabs = '<div class="tabs">' +
      '<button data-tab="orbits" class="' + (shopTab === 'orbits' ? 'on' : '') + '">' + t('orbits') + '</button>' +
      '<button data-tab="harm" class="' + (shopTab === 'harm' ? 'on' : '') + '">' + t('harmonies') + '</button></div>';
    var list = '';
    if (shopTab === 'orbits') {
      ORBITS.forEach(function (o, i) {
        var c = costOf(o.base, state.orbits[i]);
        var can = state.dust >= c;
        list += '<div class="shop-item"><div><h3>' + t('orbitNames')[i] + ' · ' + state.orbits[i] +
          '</h3><p>' + t('orbitDesc')[i] + ' · +' + fmt(o.prod * flowMult()) + t('perSec') + '</p></div>' +
          '<button data-buy-orbit="' + i + '" class="' + (can ? 'ok' : '') + '">' + fmt(c) + '</button></div>';
      });
    } else {
      HARMONIES.forEach(function (h, i) {
        var c = costOf(h.base, state.harms[i]);
        var can = state.dust >= c;
        list += '<div class="shop-item"><div><h3>' + t('harmNames')[i] + ' · ' + state.harms[i] +
          '</h3><p>' + t('harmDesc')[i] + '</p></div>' +
          '<button data-buy-harm="' + i + '" class="' + (can ? 'ok' : '') + '">' + fmt(c) + '</button></div>';
      });
    }
    return tabs + list;
  }

  function collapseHtml() {
    var ready = state.total >= COLLAPSE_NEED;
    var next = gravityMult() + 0.5;
    return '<p class="note">' + t('collapseNote') + '</p>' +
      '<p>' + t('gravityNow') + ': <strong>×' + gravityMult().toFixed(2) + '</strong></p>' +
      '<p>' + t('gravityAfter') + ': <strong>×' + next.toFixed(2) + '</strong></p>' +
      '<p class="note">' + t('collapseNeed', { need: fmt(COLLAPSE_NEED), now: fmt(state.total) }) + '</p>' +
      (ready
        ? '<button class="menu-item" data-do-collapse="1">' + t('doCollapse') + '</button>'
        : '<p class="warn">' + t('tooLight') + '</p>');
  }

  function menuHtml() {
    return '<button class="menu-item" data-act="settings">' + t('settings') + '</button>' +
      '<button class="menu-item" data-act="board">' + t('board') + '</button>' +
      '<button class="menu-item" data-act="invite">' + t('invite') + '</button>' +
      '<button class="menu-item" data-act="fav">' + t('fav') + '</button>' +
      '<button class="menu-item" data-act="about">' + t('about') + '</button>' +
      '<button class="menu-item" data-act="privacy">' + t('privacy') + '</button>' +
      '<button class="menu-item" data-act="reset">' + t('reset') + '</button>';
  }

  function settingsHtml() {
    return '<div class="set-row">' +
      '<div><strong>' + t('sound') + '</strong><span>' +
      (state.sound ? t('soundOn') : t('soundOff')) + '</span></div>' +
      '<button class="menu-item" data-act="sound" style="width:auto;min-width:88px">' +
      (state.sound ? t('soundOn') : t('soundOff')) + '</button></div>' +
      '<div class="set-row">' +
      '<div><strong>' + t('language') + '</strong></div>' +
      '<div class="lang-switch">' +
      '<button data-lang="ru" class="' + (state.lang === 'ru' ? 'on' : '') + '">' + t('langRu') + '</button>' +
      '<button data-lang="en" class="' + (state.lang === 'en' ? 'on' : '') + '">' + t('langEn') + '</button>' +
      '</div></div>' +
      '<button class="menu-item" data-act="menu">' + t('back') + '</button>';
  }

  function aboutHtml() {
    return '<p class="note"><strong>' + t('title') + '</strong> — ' + t('about1') + '</p>' +
      '<p class="note">' + t('about2') + '</p>' +
      '<p class="note">' + t('about3') + '</p>' +
      '<button class="menu-item" data-act="menu">' + t('back') + '</button>';
  }

  function refreshOpenSheet() {
    if (el.sheet.classList.contains('hidden')) return;
    if (sheetKind === 'shop') openSheet('shop', t('workshop'), shopHtml());
    else if (sheetKind === 'collapse') openSheet('collapse', t('collapse'), collapseHtml());
    else if (sheetKind === 'menu') openSheet('menu', t('menu'), menuHtml());
    else if (sheetKind === 'settings') openSheet('settings', t('settings'), settingsHtml());
    else if (sheetKind === 'about') openSheet('about', t('about'), aboutHtml());
  }

  function refreshShopIfOpen() {
    if (sheetKind === 'shop') el.sheetBody.innerHTML = shopHtml();
  }

  function doCollapse() {
    if (state.total < COLLAPSE_NEED) return;
    state.gravity += 1;
    state.dust = 0;
    state.total = 0;
    state.orbits = ORBITS.map(function () { return 0; });
    state.harms = HARMONIES.map(function () { return 0; });
    combo = 0;
    persist();
    closeSheet();
    toast(t('collapsed', { n: gravityMult().toFixed(2) }));
    renderHud();
    GPX.showFullscreen();
  }

  function hardReset() {
    if (!confirm(t('resetAsk'))) return;
    var keepLang = state.lang;
    var keepSound = state.sound;
    state = {
      dust: 0, total: 0,
      orbits: ORBITS.map(function () { return 0; }),
      harms: HARMONIES.map(function () { return 0; }),
      gravity: 0, last: Date.now(), sound: keepSound, lang: keepLang, welcome: true
    };
    persist();
    closeSheet();
    renderHud();
  }

  el.core.addEventListener('pointerdown', function (ev) {
    ev.preventDefault();
    if (paused) return;
    var now = Date.now();
    if (now < comboUntil) combo += 1;
    else combo = 1;
    comboUntil = now + 520;
    var v = clickPower();
    addDust(v, true);
    beep();
    renderHud();
  });

  document.getElementById('btnShop').addEventListener('click', function () {
    shopTab = 'orbits';
    openSheet('shop', t('workshop'), shopHtml());
  });
  document.getElementById('btnCollapse').addEventListener('click', function () {
    openSheet('collapse', t('collapse'), collapseHtml());
  });
  document.getElementById('btnReward').addEventListener('click', async function () {
    var ok = await GPX.showRewarded();
    if (ok) {
      var gift = Math.max(25, perSec() * 90 + clickPower() * 40);
      addDust(gift, true);
      persist();
      renderHud();
      toast(t('rewardOk', { n: fmt(gift) }));
    } else {
      toast(GPX.has() ? t('rewardFail') : t('rewardNoSdk'));
    }
  });
  document.getElementById('btnMenu').addEventListener('click', function () {
    openSheet('menu', t('menu'), menuHtml());
  });
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  el.sheet.addEventListener('click', function (e) {
    if (e.target === el.sheet) closeSheet();
  });

  el.sheetBody.addEventListener('click', function (e) {
    var node = e.target;
    if (!(node instanceof HTMLElement)) return;
    var tbtn = node.closest('[data-tab],[data-buy-orbit],[data-buy-harm],[data-do-collapse],[data-act],[data-lang]');
    if (!tbtn) return;
    if (tbtn.dataset.tab) {
      shopTab = tbtn.dataset.tab;
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (tbtn.dataset.lang) {
      setLang(tbtn.dataset.lang);
      return;
    }
    if (tbtn.dataset.buyOrbit != null) {
      var i = +tbtn.dataset.buyOrbit;
      var c = costOf(ORBITS[i].base, state.orbits[i]);
      if (state.dust < c) return;
      state.dust -= c;
      state.orbits[i] += 1;
      persist();
      renderHud();
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (tbtn.dataset.buyHarm != null) {
      var j = +tbtn.dataset.buyHarm;
      var ch = costOf(HARMONIES[j].base, state.harms[j]);
      if (state.dust < ch) return;
      state.dust -= ch;
      state.harms[j] += 1;
      persist();
      renderHud();
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (tbtn.dataset.doCollapse) { doCollapse(); return; }
    switch (tbtn.dataset.act) {
      case 'settings':
        openSheet('settings', t('settings'), settingsHtml()); break;
      case 'sound':
        state.sound = !state.sound; persist(); refreshOpenSheet(); break;
      case 'board':
        if (!GPX.openLeaderboard()) toast(t('noBoard'));
        break;
      case 'invite':
        if (!GPX.invite(t('share'))) toast(t('noInvite'));
        break;
      case 'fav':
        if (!GPX.addFavorite()) toast(t('noFav'));
        break;
      case 'about':
        openSheet('about', t('about'), aboutHtml()); break;
      case 'privacy':
        if (!GPX.openPrivacy()) toast(t('noPrivacy'));
        break;
      case 'reset': hardReset(); break;
      case 'menu': openSheet('menu', t('menu'), menuHtml()); break;
    }
  });

  window.addEventListener('nebula:pause', function () { paused = true; });
  window.addEventListener('nebula:resume', function () { paused = false; lastTick = Date.now(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) persist();
    else lastTick = Date.now();
  });

  function tick() {
    var now = Date.now();
    var dt = Math.min(1, (now - lastTick) / 1000);
    lastTick = now;
    if (!paused) addDust(perSec() * dt, false);
    if (now > comboUntil) combo = 0;
    renderHud();
    refreshShopIfOpen();
    if (now - saveTimer > 12000) { saveTimer = now; persist(); }
    requestAnimationFrame(tick);
  }

  function bootAnim(done) {
    var p = 8;
    var tmr = setInterval(function () {
      p += 10 + Math.random() * 18;
      if (p >= 100) { p = 100; clearInterval(tmr); done(); }
      el.fill.style.width = p + '%';
    }, 160);
  }

  state.lang = detectLang();
  applyStaticI18n();

  bootAnim(function () {
    GPX.whenReady(function () {
      if (!localStorage.getItem(LANG_KEY)) {
        var gpLang = GPX.platformLang();
        if (gpLang === 'ru' || gpLang === 'en') state.lang = gpLang;
      }
      var offline = hydrate(GPX.loadProgress());
      applyStaticI18n();
      el.boot.classList.add('hidden');
      el.app.classList.remove('hidden');
      renderHud();
      if (offline > 1) toast(t('offline', { n: fmt(offline) }));
      persist();
      lastTick = Date.now();
      tick();
    });
  });
})();
