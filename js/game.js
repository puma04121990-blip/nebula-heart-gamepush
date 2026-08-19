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
  var SIGNALS = [
    { key: 'Metro', base: 180 },
    { key: 'Lens', base: 900 },
    { key: 'Beacon', base: 2200 },
    { key: 'Prism', base: 3500 }
  ];
  var REMS = [
    { id: 'echo', name: 'remEcho', desc: 'remEchoD' },
    { id: 'well', name: 'remWell', desc: 'remWellD' },
    { id: 'span', name: 'remSpan', desc: 'remSpanD' },
    { id: 'sight', name: 'remSight', desc: 'remSightD' }
  ];
  var COLLAPSE_NEED = 1e6;

  function emptyState(lang, sound) {
    return {
      dust: 0,
      total: 0,
      orbits: ORBITS.map(function () { return 0; }),
      harms: HARMONIES.map(function () { return 0; }),
      signals: SIGNALS.map(function () { return 0; }),
      remnants: 0,
      rem: { echo: 0, well: 0, span: 0, sight: 0 },
      gravity: 0,
      maxForm: 0,
      last: Date.now(),
      sound: sound !== false,
      lang: lang || 'ru',
      welcome: false
    };
  }

  var state = emptyState('ru', true);
  var paused = false;
  var combo = 0;
  var comboUntil = 0;
  var shopTab = 'orbits';
  var sheetKind = '';
  var lastTick = Date.now();
  var saveTimer = 0;
  var tideAt = Date.now();
  var nextRift = Date.now() + 20000;
  var riftUntil = 0;
  var metroAt = 0;
  var riftAnnounced = false;

  var el = {
    boot: document.getElementById('boot'),
    fill: document.getElementById('bootFill'),
    app: document.getElementById('app'),
    dust: document.getElementById('dust'),
    rate: document.getElementById('rate'),
    form: document.getElementById('formName'),
    tide: document.getElementById('tideChip'),
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
  function gravityMult() { return 1 + state.gravity * 0.5; }
  function rem(id) { return (state.rem && state.rem[id]) || 0; }

  function tidePhase(now) {
    var part = ((now - tideAt) % 24000) / 24000;
    if (part < 0.38) return 'high';
    if (part < 0.72) return 'calm';
    return 'ebb';
  }
  function tideMult() {
    var p = tidePhase(Date.now());
    var lens = 1 + 0.1 * (state.signals[1] || 0);
    if (p === 'high') return 1.32 * lens;
    if (p === 'ebb') return 0.76;
    return 1;
  }
  function chorusMult() {
    var kinds = 0;
    state.orbits.forEach(function (n) { if (n > 0) kinds += 1; });
    if (kinds <= 2) return 1;
    return 1 + (kinds - 2) * 0.08;
  }
  function comboMult() {
    if (Date.now() > comboUntil) { combo = 0; return 1; }
    return 1 + Math.min(combo, 16) * 0.08;
  }
  function clickPower() {
    var p = 1;
    HARMONIES.forEach(function (h, i) {
      if (h.kind === 'click') p += h.val * state.harms[i];
    });
    return p * gravityMult() * (1 + rem('echo') * 0.06) * comboMult() * tideMult();
  }
  function flowMult() {
    var m = gravityMult() * (1 + rem('well') * 0.06) * chorusMult() * tideMult();
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
  function critChance() {
    var base = combo >= 5 ? 0.12 : 0;
    return Math.min(0.55, base + (state.signals[3] || 0) * 0.08);
  }
  function formIndex() {
    var idx = 0;
    for (var i = 0; i < FORMS.length; i++) if (state.total >= FORMS[i].need) idx = i;
    return idx;
  }
  function evoProgress() {
    var i = formIndex();
    if (i >= FORMS.length - 1) return 1;
    return Math.max(0, Math.min(1, (state.total - FORMS[i].need) / (FORMS[i + 1].need - FORMS[i].need)));
  }
  function offlineCap() {
    return (8 + rem('span') * 2) * 3600;
  }
  function riftActive() { return Date.now() < riftUntil; }
  function scheduleRift(from) {
    var wait = Math.max(12000, 42000 - (state.signals[2] || 0) * 5000);
    nextRift = from + wait + Math.random() * 18000;
  }

  function applyTheme() {
    var i = formIndex();
    document.documentElement.style.setProperty('--core', FORMS[i].color);
    el.form.textContent = t('forms')[i];
    if (i > state.maxForm) {
      state.maxForm = i;
      addDust(Math.max(20, FORMS[i].need * 0.04), true);
      toast(t('formUp', { n: t('forms')[i] }));
    }
  }

  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.toast.classList.add('hidden'); }, 2200);
  }
  function beep(freq) {
    if (!state.sound) return;
    try {
      var ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq || (420 + Math.min(combo, 12) * 28);
      g.gain.value = 0.04;
      o.connect(g); g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }
  function floatText(v, crit) {
    var n = document.createElement('div');
    n.className = 'floater' + (crit ? ' crit' : '');
    n.textContent = (crit ? t('crit') + ' ' : '') + '+' + fmt(v);
    n.style.left = 42 + Math.random() * 16 + '%';
    el.floats.appendChild(n);
    setTimeout(function () { n.remove(); }, 720);
  }
  function addDust(v, show, crit) {
    if (v <= 0) return;
    state.dust += v;
    state.total += v;
    if (show) floatText(v, crit);
  }

  function harvest(fromAuto) {
    if (paused) return;
    var now = Date.now();
    if (!fromAuto) {
      if (now < comboUntil) combo += 1;
      else combo = 1;
      comboUntil = now + 520;
    }
    var v = clickPower();
    var crit = Math.random() < critChance();
    if (crit) v *= 3;
    if (riftActive()) {
      var bonus = Math.max(v * 8, perSec() * 12) * (1 + rem('sight') * 0.25);
      addDust(bonus, true, true);
      riftUntil = 0;
      riftAnnounced = false;
      scheduleRift(now);
      toast(t('riftHit', { n: fmt(bonus) }));
      beep(760);
      el.core.classList.remove('rift');
    } else {
      addDust(v, !fromAuto, crit);
      if (!fromAuto) beep(crit ? 880 : 0);
    }
    renderHud();
  }

  function scoreValue() {
    return Math.floor(Math.log10(state.total + 1) * 1000 + state.gravity * 250 + state.remnants * 80);
  }
  function persist() {
    state.last = Date.now();
    GPX.saveProgress({
      dust: state.dust,
      total: state.total,
      orbits: state.orbits,
      harms: state.harms,
      signals: state.signals,
      remnants: state.remnants,
      rem: state.rem,
      gravity: state.gravity,
      maxForm: state.maxForm,
      last: state.last,
      sound: state.sound,
      lang: state.lang,
      welcome: state.welcome
    }, scoreValue());
  }
  function hydrate(data) {
    if (!data) return 0;
    state.dust = data.dust || 0;
    state.total = data.total || 0;
    state.orbits = data.orbits || state.orbits;
    state.harms = data.harms || state.harms;
    state.signals = data.signals || SIGNALS.map(function () { return 0; });
    while (state.signals.length < SIGNALS.length) state.signals.push(0);
    state.remnants = data.remnants || 0;
    state.rem = data.rem || { echo: 0, well: 0, span: 0, sight: 0 };
    state.gravity = data.gravity || 0;
    state.maxForm = data.maxForm || 0;
    state.sound = data.sound !== false;
    state.welcome = !!data.welcome;
    if (data.lang === 'en' || data.lang === 'ru') state.lang = data.lang;
    var dt = Math.min(offlineCap(), Math.max(0, (Date.now() - (data.last || Date.now())) / 1000));
    var gained = perSec() * dt;
    if (gained > 1) { addDust(gained, false); return gained; }
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
    var phase = tidePhase(Date.now());
    var tm = tideMult();
    el.tide.className = 'chip ' + phase + (riftActive() ? ' rift' : '');
    if (riftActive()) el.tide.textContent = t('riftOpen');
    else if (phase === 'high') el.tide.textContent = t('tideHigh', { n: tm.toFixed(2) });
    else if (phase === 'ebb') el.tide.textContent = t('tideEbb', { n: tm.toFixed(2) });
    else el.tide.textContent = chorusMult() > 1 ? t('chorus', { n: chorusMult().toFixed(2) }) : t('tideCalm');
    if (Date.now() < comboUntil && combo > 1) {
      el.combo.classList.remove('hidden');
      el.combo.textContent = t('resonance') + ' ×' + comboMult().toFixed(2);
    } else el.combo.classList.add('hidden');
    if (riftActive()) el.core.classList.add('rift');
    else el.core.classList.remove('rift');
    applyTheme();
  }

  function closeSheet() { sheetKind = ''; el.sheet.classList.add('hidden'); }
  function openSheet(kind, title, html) {
    sheetKind = kind;
    el.sheetTitle.textContent = title;
    el.sheetBody.innerHTML = html;
    el.sheet.classList.remove('hidden');
  }

  function shopHtml() {
    var tabs = '<div class="tabs">' +
      '<button data-tab="orbits" class="' + (shopTab === 'orbits' ? 'on' : '') + '">' + t('orbits') + '</button>' +
      '<button data-tab="harm" class="' + (shopTab === 'harm' ? 'on' : '') + '">' + t('harmonies') + '</button>' +
      '<button data-tab="sig" class="' + (shopTab === 'sig' ? 'on' : '') + '">' + t('signals') + '</button></div>';
    var list = '';
    if (shopTab === 'orbits') {
      ORBITS.forEach(function (o, i) {
        var c = costOf(o.base, state.orbits[i]);
        list += itemHtml(t('orbitNames')[i] + ' · ' + state.orbits[i], t('orbitDesc')[i] + ' · +' + fmt(o.prod * flowMult()) + t('perSec'), c, 'data-buy-orbit="' + i + '"');
      });
    } else if (shopTab === 'harm') {
      HARMONIES.forEach(function (h, i) {
        var c = costOf(h.base, state.harms[i]);
        list += itemHtml(t('harmNames')[i] + ' · ' + state.harms[i], t('harmDesc')[i], c, 'data-buy-harm="' + i + '"');
      });
    } else {
      SIGNALS.forEach(function (s, i) {
        var c = costOf(s.base, state.signals[i]);
        list += itemHtml(t('sig' + s.key) + ' · ' + state.signals[i], t('sig' + s.key + 'D'), c, 'data-buy-sig="' + i + '"');
      });
    }
    return tabs + list;
  }
  function itemHtml(title, desc, cost, attr) {
    var can = state.dust >= cost;
    return '<div class="shop-item"><div><h3>' + title + '</h3><p>' + desc + '</p></div>' +
      '<button ' + attr + ' class="' + (can ? 'ok' : '') + '">' + fmt(cost) + '</button></div>';
  }

  function collapseHtml() {
    var ready = state.total >= COLLAPSE_NEED;
    var next = gravityMult() + 0.5;
    var html = '<p class="note">' + t('collapseNote') + '</p>' +
      '<p>' + t('gravityNow') + ': <strong>×' + gravityMult().toFixed(2) + '</strong></p>' +
      '<p>' + t('gravityAfter') + ': <strong>×' + next.toFixed(2) + '</strong></p>' +
      '<p class="note">' + t('collapseNeed', { need: fmt(COLLAPSE_NEED), now: fmt(state.total) }) + '</p>' +
      (ready
        ? '<button class="menu-item" data-do-collapse="1">' + t('doCollapse') + '</button>'
        : '<p class="warn">' + t('tooLight') + '</p>');
    html += '<p><strong>' + t('remnants') + '</strong></p>';
    html += '<p class="note">' + t('remnantsHave', { n: state.remnants }) + '. ' + t('remnantsHint') + '</p>';
    REMS.forEach(function (r) {
      var lv = rem(r.id);
      var can = state.remnants > 0;
      html += '<div class="shop-item"><div><h3>' + t(r.name) + ' · ' + lv + '</h3><p>' + t(r.desc) +
        '</p></div><button data-buy-rem="' + r.id + '" class="' + (can ? 'ok' : '') + '">' +
        (can ? t('remnantBuy') : t('remnantNeed')) + '</button></div>';
    });
    return html;
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
    return '<div class="set-row"><div><strong>' + t('sound') + '</strong><span>' +
      (state.sound ? t('soundOn') : t('soundOff')) + '</span></div>' +
      '<button class="menu-item" data-act="sound" style="width:auto;min-width:88px">' +
      (state.sound ? t('soundOn') : t('soundOff')) + '</button></div>' +
      '<div class="set-row"><div><strong>' + t('language') + '</strong></div><div class="lang-switch">' +
      '<button data-lang="ru" class="' + (state.lang === 'ru' ? 'on' : '') + '">' + t('langRu') + '</button>' +
      '<button data-lang="en" class="' + (state.lang === 'en' ? 'on' : '') + '">' + t('langEn') + '</button>' +
      '</div></div><button class="menu-item" data-act="menu">' + t('back') + '</button>';
  }
  function aboutHtml() {
    return '<p class="note"><strong>' + t('title') + '</strong> — ' + t('about1') + '</p>' +
      '<p class="note">' + t('about2') + '</p><p class="note">' + t('about3') + '</p>' +
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
    var gain = 1 + (formIndex() >= 3 ? 1 : 0);
    state.gravity += 1;
    state.remnants += gain;
    state.dust = 0;
    state.total = 0;
    state.orbits = ORBITS.map(function () { return 0; });
    state.harms = HARMONIES.map(function () { return 0; });
    state.signals = SIGNALS.map(function () { return 0; });
    combo = 0;
    riftUntil = 0;
    persist();
    closeSheet();
    toast(t('collapsed', { n: gravityMult().toFixed(2), r: gain }));
    renderHud();
    GPX.showFullscreen();
  }
  function hardReset() {
    if (!confirm(t('resetAsk'))) return;
    state = emptyState(state.lang, state.sound);
    state.welcome = true;
    persist();
    closeSheet();
    renderHud();
  }

  el.core.addEventListener('pointerdown', function (ev) {
    ev.preventDefault();
    harvest(false);
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
      var gift = Math.max(25, perSec() * 90 + clickPower() * 40) * tideMult();
      addDust(gift, true);
      persist();
      renderHud();
      toast(t('rewardOk', { n: fmt(gift) }));
    } else toast(GPX.has() ? t('rewardFail') : t('rewardNoSdk'));
  });
  document.getElementById('btnMenu').addEventListener('click', function () {
    openSheet('menu', t('menu'), menuHtml());
  });
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  el.sheet.addEventListener('click', function (e) { if (e.target === el.sheet) closeSheet(); });

  el.sheetBody.addEventListener('click', function (e) {
    var node = e.target;
    if (!(node instanceof HTMLElement)) return;
    var btn = node.closest('[data-tab],[data-buy-orbit],[data-buy-harm],[data-buy-sig],[data-buy-rem],[data-do-collapse],[data-act],[data-lang]');
    if (!btn) return;
    if (btn.dataset.tab) { shopTab = btn.dataset.tab; el.sheetBody.innerHTML = shopHtml(); return; }
    if (btn.dataset.lang) { setLang(btn.dataset.lang); return; }
    if (btn.dataset.buyOrbit != null) {
      var i = +btn.dataset.buyOrbit;
      var c = costOf(ORBITS[i].base, state.orbits[i]);
      if (state.dust < c) return;
      state.dust -= c; state.orbits[i] += 1; persist(); renderHud(); el.sheetBody.innerHTML = shopHtml(); return;
    }
    if (btn.dataset.buyHarm != null) {
      var j = +btn.dataset.buyHarm;
      var ch = costOf(HARMONIES[j].base, state.harms[j]);
      if (state.dust < ch) return;
      state.dust -= ch; state.harms[j] += 1; persist(); renderHud(); el.sheetBody.innerHTML = shopHtml(); return;
    }
    if (btn.dataset.buySig != null) {
      var k = +btn.dataset.buySig;
      var cs = costOf(SIGNALS[k].base, state.signals[k]);
      if (state.dust < cs) return;
      state.dust -= cs; state.signals[k] += 1; persist(); renderHud(); el.sheetBody.innerHTML = shopHtml(); return;
    }
    if (btn.dataset.buyRem) {
      if (state.remnants < 1) return;
      state.remnants -= 1;
      state.rem[btn.dataset.buyRem] = rem(btn.dataset.buyRem) + 1;
      persist(); renderHud(); el.sheetBody.innerHTML = collapseHtml(); return;
    }
    if (btn.dataset.doCollapse) { doCollapse(); return; }
    switch (btn.dataset.act) {
      case 'settings': openSheet('settings', t('settings'), settingsHtml()); break;
      case 'sound': state.sound = !state.sound; persist(); refreshOpenSheet(); break;
      case 'board': if (!GPX.openLeaderboard()) toast(t('noBoard')); break;
      case 'invite': if (!GPX.invite(t('share'))) toast(t('noInvite')); break;
      case 'fav': if (!GPX.addFavorite()) toast(t('noFav')); break;
      case 'about': openSheet('about', t('about'), aboutHtml()); break;
      case 'privacy': if (!GPX.openPrivacy()) toast(t('noPrivacy')); break;
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
    if (!paused) {
      addDust(perSec() * dt, false);
      if (now >= nextRift && !riftActive()) {
        riftUntil = now + 7000 + (state.signals[2] || 0) * 1200;
        if (!riftAnnounced) { riftAnnounced = true; toast(t('riftOpen')); }
      }
      if (riftAnnounced && !riftActive() && now > riftUntil) {
        riftAnnounced = false;
        scheduleRift(now);
      }
      if ((state.signals[0] || 0) > 0 && now - metroAt > Math.max(700, 1600 - state.signals[0] * 80)) {
        metroAt = now;
        harvest(true);
      }
    }
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
  scheduleRift(Date.now());

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
