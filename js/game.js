(function () {
  var FORMS = [
    { name: 'Искра пустоты', need: 0, color: '#7cf6ff' },
    { name: 'Туманный сгусток', need: 250, color: '#8ab4ff' },
    { name: 'Пульсарное сердце', need: 4000, color: '#c084fc' },
    { name: 'Страж новы', need: 60000, color: '#ff9ad5' },
    { name: 'Галактическое ядро', need: 9e5, color: '#ffb86b' },
    { name: 'Вечная туманность', need: 1.2e7, color: '#7dffb3' }
  ];

  var ORBITS = [
    { name: 'Пылевой вихрь', desc: 'Мелкая орбита собирает пыль', base: 15, prod: 0.1 },
    { name: 'Осколок звезды', desc: 'Осколки падают в ядро', base: 100, prod: 1 },
    { name: 'Кольцо пульсара', desc: 'Ритмичный поток энергии', base: 1100, prod: 8 },
    { name: 'Квазарный колодец', desc: 'Тяжёлые частицы из ядра галактики', base: 12000, prod: 47 },
    { name: 'Горизонт событий', desc: 'Гравитация тянет пыль из пустоты', base: 130000, prod: 260 },
    { name: 'Ткацкий станок', desc: 'Плетёт рукава млечного пути', base: 1.4e6, prod: 1400 }
  ];

  var HARMONIES = [
    { name: 'Мягкий импульс', desc: '+1 к силе настройки', base: 20, kind: 'click', val: 1 },
    { name: 'Фокус линзы', desc: '+5 к силе настройки', base: 250, kind: 'click', val: 5 },
    { name: 'Гравитационный хор', desc: '+10% ко всему потоку', base: 800, kind: 'mult', val: 0.1 },
    { name: 'Синхротрон фаз', desc: '+25 к силе настройки', base: 4000, kind: 'click', val: 25 },
    { name: 'Кольцо согласия', desc: '+25% ко всему потоку', base: 25000, kind: 'mult', val: 0.25 }
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
    welcome: false
  };

  var paused = false;
  var combo = 0;
  var comboUntil = 0;
  var shopTab = 'orbits';
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
    var f = FORMS[formIndex()];
    document.documentElement.style.setProperty('--core', f.color);
    el.form.textContent = f.name;
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
    el.rate.textContent = fmt(perSec()) + ' / сек';
    var p = evoProgress();
    el.evo.textContent = formIndex() >= FORMS.length - 1 ? 'Предел формы' : ('Фаза ' + Math.floor(p * 100) + '%');
    el.evoFill.style.width = (p * 100) + '%';
    if (Date.now() < comboUntil && combo > 1) {
      el.combo.classList.remove('hidden');
      el.combo.textContent = 'резонанс ×' + comboMult().toFixed(2);
    } else el.combo.classList.add('hidden');
    applyTheme();
  }

  function closeSheet() { el.sheet.classList.add('hidden'); }

  function openSheet(title, html) {
    el.sheetTitle.textContent = title;
    el.sheetBody.innerHTML = html;
    el.sheet.classList.remove('hidden');
  }

  function shopHtml() {
    var tabs = '<div class="tabs">' +
      '<button data-tab="orbits" class="' + (shopTab === 'orbits' ? 'on' : '') + '">Орбиты</button>' +
      '<button data-tab="harm" class="' + (shopTab === 'harm' ? 'on' : '') + '">Гармонии</button></div>';
    var list = '';
    if (shopTab === 'orbits') {
      ORBITS.forEach(function (o, i) {
        var c = costOf(o.base, state.orbits[i]);
        var can = state.dust >= c;
        list += '<div class="shop-item"><div><h3>' + o.name + ' · ' + state.orbits[i] +
          '</h3><p>' + o.desc + ' · +' + fmt(o.prod * flowMult()) + '/сек</p></div>' +
          '<button data-buy-orbit="' + i + '" class="' + (can ? 'ok' : '') + '">' + fmt(c) + '</button></div>';
      });
    } else {
      HARMONIES.forEach(function (h, i) {
        var c = costOf(h.base, state.harms[i]);
        var can = state.dust >= c;
        list += '<div class="shop-item"><div><h3>' + h.name + ' · ' + state.harms[i] +
          '</h3><p>' + h.desc + '</p></div>' +
          '<button data-buy-harm="' + i + '" class="' + (can ? 'ok' : '') + '">' + fmt(c) + '</button></div>';
      });
    }
    return tabs + list;
  }

  function refreshShopIfOpen() {
    if (el.sheet.classList.contains('hidden')) return;
    if (el.sheetTitle.textContent === 'Мастерская') {
      el.sheetBody.innerHTML = shopHtml();
    }
  }

  function collapseHtml() {
    var ready = state.total >= COLLAPSE_NEED;
    var next = gravityMult() + 0.5;
    return '<p class="note">Сжать ядро в сингулярность. Текущая пыль и орбиты обнулятся, но гравитация останется навсегда.</p>' +
      '<p>Текущая гравитация: <strong>×' + gravityMult().toFixed(2) + '</strong></p>' +
      '<p>После коллапса: <strong>×' + next.toFixed(2) + '</strong></p>' +
      '<p class="note">Нужно собрать ' + fmt(COLLAPSE_NEED) + ' пыли за этот цикл · сейчас: ' + fmt(state.total) + '</p>' +
      (ready
        ? '<button class="menu-item" data-do-collapse="1">Запустить коллапс (+0.5×)</button>'
        : '<p class="warn">Ядро ещё слишком лёгкое для сжатия.</p>');
  }

  function menuHtml() {
    return '<button class="menu-item" data-act="sound">Звук: ' + (state.sound ? 'вкл' : 'выкл') + '</button>' +
      '<button class="menu-item" data-act="board">Таблица лидеров</button>' +
      '<button class="menu-item" data-act="invite">Пригласить</button>' +
      '<button class="menu-item" data-act="fav">В избранное</button>' +
      '<button class="menu-item" data-act="about">О игре</button>' +
      '<button class="menu-item" data-act="privacy">Политика конфиденциальности</button>' +
      '<button class="menu-item" data-act="reset">Сбросить прогресс</button>';
  }

  function aboutHtml() {
    return '<p class="note"><strong>Сердце Туманности</strong> — idle-игра: настраивайте живое ядро, раскручивайте орбиты и сжимайте станцию в коллапсе.</p>' +
      '<p class="note">Резонанс усиливает серию быстрых настроек. Возраст 0+ · версия 1.0</p>' +
      '<p class="note">Прогресс сохраняется локально и в облаке GamePush, если SDK подключён.</p>' +
      '<button class="menu-item" data-act="menu">Назад</button>';
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
    toast('Коллапс состоялся. Гравитация ×' + gravityMult().toFixed(2));
    renderHud();
    GPX.showFullscreen();
  }

  function hardReset() {
    if (!confirm('Обнулить всё, включая гравитацию?')) return;
    state = {
      dust: 0, total: 0,
      orbits: ORBITS.map(function () { return 0; }),
      harms: HARMONIES.map(function () { return 0; }),
      gravity: 0, last: Date.now(), sound: state.sound, welcome: true
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
    openSheet('Мастерская', shopHtml());
  });
  document.getElementById('btnCollapse').addEventListener('click', function () {
    openSheet('Коллапс', collapseHtml());
  });
  document.getElementById('btnReward').addEventListener('click', async function () {
    var ok = await GPX.showRewarded();
    if (ok) {
      var gift = Math.max(25, perSec() * 90 + clickPower() * 40);
      addDust(gift, true);
      persist();
      renderHud();
      toast('Квант принёс +' + fmt(gift) + ' пыли');
    } else {
      toast(GPX.has() ? 'Ролик недоступен' : 'Подключите GamePush, чтобы смотреть ролик');
    }
  });
  document.getElementById('btnMenu').addEventListener('click', function () {
    openSheet('Меню', menuHtml());
  });
  document.getElementById('sheetClose').addEventListener('click', closeSheet);
  el.sheet.addEventListener('click', function (e) {
    if (e.target === el.sheet) closeSheet();
  });

  el.sheetBody.addEventListener('click', function (e) {
    var t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.dataset.tab) {
      shopTab = t.dataset.tab;
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (t.dataset.buyOrbit != null) {
      var i = +t.dataset.buyOrbit;
      var c = costOf(ORBITS[i].base, state.orbits[i]);
      if (state.dust < c) return;
      state.dust -= c;
      state.orbits[i] += 1;
      persist();
      renderHud();
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (t.dataset.buyHarm != null) {
      var j = +t.dataset.buyHarm;
      var ch = costOf(HARMONIES[j].base, state.harms[j]);
      if (state.dust < ch) return;
      state.dust -= ch;
      state.harms[j] += 1;
      persist();
      renderHud();
      el.sheetBody.innerHTML = shopHtml();
      return;
    }
    if (t.dataset.doCollapse) { doCollapse(); return; }
    switch (t.dataset.act) {
      case 'sound':
        state.sound = !state.sound; persist(); el.sheetBody.innerHTML = menuHtml(); break;
      case 'board':
        if (!GPX.openLeaderboard()) toast('Лидерборд появится после подключения GamePush');
        break;
      case 'invite':
        if (!GPX.invite()) toast('Приглашение доступно на социальных площадках');
        break;
      case 'fav':
        if (!GPX.addFavorite()) toast('Избранное добавит площадка');
        break;
      case 'about':
        openSheet('О игре', aboutHtml()); break;
      case 'privacy':
        if (!GPX.openPrivacy()) toast('Документ включается в панели GamePush');
        break;
      case 'reset': hardReset(); break;
      case 'menu': openSheet('Меню', menuHtml()); break;
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
    var t = setInterval(function () {
      p += 10 + Math.random() * 18;
      if (p >= 100) { p = 100; clearInterval(t); done(); }
      el.fill.style.width = p + '%';
    }, 160);
  }

  bootAnim(function () {
    GPX.whenReady(function () {
      var offline = hydrate(GPX.loadProgress());
      el.boot.classList.add('hidden');
      el.app.classList.remove('hidden');
      renderHud();
      if (offline > 1) toast('Пока вас не было, ядро собрало ' + fmt(offline) + ' пыли');
      persist();
      lastTick = Date.now();
      tick();
    });
  });
})();
