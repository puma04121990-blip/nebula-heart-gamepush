(function () {
  'use strict';

  var SAVE_VERSION = 2;
  var LANG_KEY = 'nebula-heart-lang';
  var BASE_COLLAPSE_NEED = 1000000;
  var FORMS = [
    { need: 0, color: '#7cf6ff' },
    { need: 250, color: '#8ab4ff' },
    { need: 4000, color: '#c084fc' },
    { need: 60000, color: '#ff9ad5' },
    { need: 900000, color: '#ffb86b' },
    { need: 12000000, color: '#7dffb3' }
  ];
  var ORBITS = [
    { base: 15, prod: 0.1 }, { base: 100, prod: 1 }, { base: 1100, prod: 8 },
    { base: 12000, prod: 47 }, { base: 130000, prod: 260 }, { base: 1400000, prod: 1400 }
  ];
  var HARMONIES = [
    { base: 20, kind: 'click', val: 1 }, { base: 250, kind: 'click', val: 5 },
    { base: 800, kind: 'mult', val: 0.1 }, { base: 4000, kind: 'click', val: 25 },
    { base: 25000, kind: 'mult', val: 0.25 }
  ];
  var SIGNALS = [
    { key: 'Metro', base: 180 }, { key: 'Lens', base: 900 },
    { key: 'Beacon', base: 2200 }, { key: 'Prism', base: 3500 }
  ];
  var REMS = [
    { id: 'echo', name: 'remEcho', desc: 'remEchoD' }, { id: 'well', name: 'remWell', desc: 'remWellD' },
    { id: 'span', name: 'remSpan', desc: 'remSpanD' }, { id: 'sight', name: 'remSight', desc: 'remSightD' }
  ];
  var RESEARCH = [
    { base: 1 }, { base: 1 }, { base: 2 }, { base: 2 }, { base: 3 }, { base: 4 }
  ];
  var EXPEDITIONS = [
    { id: 'drift', mins: 15, reward: 'dust' }, { id: 'beacon', mins: 30, reward: 'key' }, { id: 'archive', mins: 45, reward: 'focus' }
  ];

  function n(value, fallback) {
    value = Number(value);
    return isFinite(value) && value >= 0 ? value : (fallback || 0);
  }
  function int(value, fallback) { return Math.floor(n(value, fallback)); }
  function arr(source, length) {
    var out = [];
    for (var i = 0; i < length; i++) out.push(int(source && source[i], 0));
    return out;
  }
  function dayKey(time) {
    return new Date(time).toISOString().slice(0, 10);
  }
  function now() {
    return typeof GPX !== 'undefined' && GPX.now ? GPX.now() : Date.now();
  }
  function defaultSettings(previous) {
    previous = previous || {};
    return {
      music: previous.music !== false,
      effects: previous.effects !== false,
      haptics: previous.haptics !== false,
      motion: previous.motion !== false
    };
  }
  function emptyState(lang, settings) {
    return {
      version: SAVE_VERSION,
      dust: 0,
      total: 0,
      orbits: arr(null, ORBITS.length),
      harms: arr(null, HARMONIES.length),
      signals: arr(null, SIGNALS.length),
      remnants: 0,
      rem: { echo: 0, well: 0, span: 0, sight: 0 },
      gravity: 0,
      focus: 0,
      keys: 0,
      research: arr(null, RESEARCH.length),
      expedition: null,
      contracts: { day: dayKey(now()), claimed: false },
      daily: { clicks: 0, rifts: 0, dust: 0 },
      stats: { clicks: 0, rifts: 0, collapses: 0, expeditions: 0, lifeDust: 0 },
      discoveries: arr(null, FORMS.length),
      maxForm: 0,
      last: now(),
      lang: lang || 'ru',
      settings: defaultSettings(settings),
      welcome: false
    };
  }

  var state = emptyState('ru');
  var paused = false;
  var combo = 0;
  var comboUntil = 0;
  var shopTab = 'orbits';
  var sheetKind = '';
  var lastTick = Date.now();
  var lastHud = 0;
  var lastSheetRefresh = 0;
  var saveTimer = 0;
  var tideAt = Date.now();
  var nextRift = Date.now() + 18000;
  var riftUntil = 0;
  var riftChain = 0;
  var riftChainUntil = 0;
  var metroAt = 0;
  var rewardBusy = false;
  var previousFocus = null;
  var demoMode = /(?:[?&])demo(?:=1)?(?:&|$)/.test(window.location.search);

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
    activityKicker: document.getElementById('activityKicker'),
    activityTitle: document.getElementById('activityTitle'),
    activityMeta: document.getElementById('activityMeta'),
    activityFill: document.getElementById('activityFill'),
    objectives: document.getElementById('btnObjectives'),
    shop: document.getElementById('btnShop'),
    collapse: document.getElementById('btnCollapse'),
    reward: document.getElementById('btnReward'),
    menu: document.getElementById('btnMenu'),
    sheet: document.getElementById('sheet'),
    sheetCard: document.querySelector('.sheet-card'),
    sheetTitle: document.getElementById('sheetTitle'),
    sheetBody: document.getElementById('sheetBody'),
    sheetClose: document.getElementById('sheetClose'),
    toast: document.getElementById('toast')
  };

  function dict() { return (window.I18N && window.I18N[state.lang]) || window.I18N.ru; }
  function t(key, vars) {
    var value = dict()[key];
    if (value == null) value = key;
    if (vars) Object.keys(vars).forEach(function (name) {
      value = String(value).replace(new RegExp('\\{' + name + '\\}', 'g'), vars[name]);
    });
    return value;
  }
  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'ru' || saved === 'en') return saved;
    } catch (e) {}
    var platform = typeof GPX !== 'undefined' ? GPX.platformLang() : '';
    if (platform === 'ru' || platform === 'en') return platform;
    return (navigator.language || 'ru').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'ru';
  }
  function applyStaticI18n() {
    document.documentElement.lang = state.lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(function (node) { node.textContent = t(node.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (node) { node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria'))); });
  }
  function setLang(code) {
    state.lang = code === 'en' ? 'en' : 'ru';
    try { localStorage.setItem(LANG_KEY, state.lang); } catch (e) {}
    if (typeof GPX !== 'undefined') GPX.setLanguage(state.lang);
    applyStaticI18n();
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function fmt(value) {
    if (!isFinite(value)) return '0';
    var abs = Math.abs(value);
    if (abs < 1000) return (Math.round(value * 10) / 10).toString();
    var units = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi'];
    var index = Math.min(units.length - 1, Math.floor(Math.log10(abs) / 3));
    return (value / Math.pow(1000, index)).toFixed(2) + units[index];
  }
  function fmtTime(seconds) {
    seconds = Math.max(0, Math.ceil(seconds));
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    if (h) return h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    return m + ':' + String(s).padStart(2, '0');
  }
  function costOf(base, level) { return Math.floor(base * Math.pow(1.15, level)); }
  function rem(id) { return int(state.rem && state.rem[id], 0); }
  function research(index) { return int(state.research[index], 0); }
  function audio(method, arg) {
    var engine = window.NebulaAudio;
    if (engine && typeof engine[method] === 'function') {
      try { engine[method](arg); } catch (e) {}
    }
  }
  function haptic(pattern) {
    if (state.settings.haptics && navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) {}
    }
  }

  function demoState() {
    var sample = emptyState(detectLang(), { music: false, effects: true, haptics: true, motion: true });
    sample.dust = 30000000;
    sample.total = 30000000;
    sample.orbits = [25, 16, 10, 6, 3, 1];
    sample.harms = [8, 5, 4, 3, 2];
    sample.signals = [4, 3, 2, 2];
    sample.remnants = 8;
    sample.rem = { echo: 2, well: 2, span: 1, sight: 1 };
    sample.gravity = 4;
    sample.focus = 3;
    sample.keys = 10;
    sample.research = [2, 1, 1, 1, 0, 0];
    sample.contracts = { day: dayKey(now()), claimed: true };
    sample.daily = { clicks: 25, rifts: 1, dust: 600 };
    sample.stats = { clicks: 250, rifts: 20, collapses: 3, expeditions: 4, lifeDust: 50000000 };
    sample.discoveries = [1, 1, 1, 1, 1, 1];
    sample.maxForm = FORMS.length - 1;
    return sample;
  }
  function migrate(data) {
    if (!data || typeof data !== 'object') return emptyState(detectLang());
    var settings = data.settings || { effects: data.sound !== false, music: data.sound !== false, haptics: true, motion: true };
    var fresh = emptyState(data.lang === 'en' || data.lang === 'ru' ? data.lang : detectLang(), settings);
    fresh.dust = n(data.dust);
    fresh.total = n(data.total);
    fresh.orbits = arr(data.orbits, ORBITS.length);
    fresh.harms = arr(data.harms, HARMONIES.length);
    fresh.signals = arr(data.signals, SIGNALS.length);
    fresh.remnants = int(data.remnants);
    fresh.rem = {
      echo: int(data.rem && data.rem.echo), well: int(data.rem && data.rem.well),
      span: int(data.rem && data.rem.span), sight: int(data.rem && data.rem.sight)
    };
    fresh.gravity = int(data.gravity);
    fresh.focus = int(data.focus);
    fresh.keys = int(data.keys);
    fresh.research = arr(data.research, RESEARCH.length);
    fresh.maxForm = Math.min(FORMS.length - 1, int(data.maxForm));
    fresh.discoveries = arr(data.discoveries, FORMS.length);
    fresh.last = n(data.last, now());
    fresh.welcome = !!data.welcome;
    fresh.stats = {
      clicks: int(data.stats && data.stats.clicks), rifts: int(data.stats && data.stats.rifts),
      collapses: int(data.stats && data.stats.collapses), expeditions: int(data.stats && data.stats.expeditions),
      lifeDust: n(data.stats && data.stats.lifeDust, n(data.total))
    };
    fresh.daily = {
      clicks: int(data.daily && data.daily.clicks), rifts: int(data.daily && data.daily.rifts), dust: n(data.daily && data.daily.dust)
    };
    fresh.contracts = {
      day: data.contracts && typeof data.contracts.day === 'string' ? data.contracts.day : dayKey(now()),
      claimed: !!(data.contracts && data.contracts.claimed)
    };
    if (data.expedition && typeof data.expedition.id === 'string') {
      var known = EXPEDITIONS.some(function (item) { return item.id === data.expedition.id; });
      if (known) fresh.expedition = { id: data.expedition.id, ends: n(data.expedition.ends), started: n(data.expedition.started), claimed: false };
    }
    fresh.version = SAVE_VERSION;
    return fresh;
  }
  function ensureDaily() {
    var today = dayKey(now());
    if (state.contracts.day !== today) {
      state.contracts = { day: today, claimed: false };
      state.daily = { clicks: 0, rifts: 0, dust: 0 };
      return true;
    }
    return false;
  }

  function gravityMult() { return 1 + state.gravity * 0.5; }
  function focusMult() { return 1 + state.focus * 0.02; }
  function tidePhase(time) {
    var part = ((time - tideAt) % 24000) / 24000;
    if (part < 0.38) return 'high';
    if (part < 0.72) return 'calm';
    return 'ebb';
  }
  function tideMult() {
    var phase = tidePhase(Date.now());
    var lens = 1 + 0.1 * state.signals[1];
    if (phase === 'high') return 1.32 * lens;
    if (phase === 'ebb') return 0.76;
    return 1;
  }
  function chorusMult() {
    var kinds = state.orbits.filter(function (level) { return level > 0; }).length;
    return kinds <= 2 ? 1 : 1 + (kinds - 2) * 0.08;
  }
  function comboWindow() { return 520 + research(3) * 75; }
  function comboMult() {
    if (Date.now() > comboUntil) { combo = 0; return 1; }
    return 1 + Math.min(combo, 16) * 0.08;
  }
  function clickPower() {
    var power = 1;
    HARMONIES.forEach(function (item, index) { if (item.kind === 'click') power += item.val * state.harms[index]; });
    return power * gravityMult() * focusMult() * (1 + rem('echo') * 0.06) * (1 + research(2) * 0.08) * comboMult() * tideMult();
  }
  function flowMult() {
    var multiplier = gravityMult() * focusMult() * (1 + rem('well') * 0.06) * (1 + research(0) * 0.04) * chorusMult() * tideMult();
    HARMONIES.forEach(function (item, index) { if (item.kind === 'mult') multiplier *= 1 + item.val * state.harms[index]; });
    return multiplier;
  }
  function perSec() {
    var total = 0;
    ORBITS.forEach(function (item, index) { total += item.prod * state.orbits[index]; });
    return total * flowMult();
  }
  function critChance() {
    var base = combo >= 5 ? 0.12 : 0;
    return Math.min(0.55, base + state.signals[3] * 0.08);
  }
  function formIndex() {
    var index = 0;
    for (var i = 0; i < FORMS.length; i++) if (state.total >= FORMS[i].need) index = i;
    return index;
  }
  function evoProgress() {
    var index = formIndex();
    if (index >= FORMS.length - 1) return 1;
    return Math.max(0, Math.min(1, (state.total - FORMS[index].need) / (FORMS[index + 1].need - FORMS[index].need)));
  }
  function offlineCap() { return (8 + rem('span') * 2 + research(4)) * 3600; }
  function collapseNeed() { return Math.floor(BASE_COLLAPSE_NEED * Math.pow(1.38, state.stats.collapses)); }
  function collapseReward() {
    var raw = 1 + Math.floor(formIndex() / 2) + Math.floor(state.stats.collapses / 3);
    return Math.max(1, Math.floor(raw * (1 + research(5) * 0.05)));
  }
  function riftActive() { return Date.now() < riftUntil; }
  function scheduleRift(from) {
    var factor = Math.max(0.42, 1 - research(1) * 0.08);
    var wait = Math.max(11000, (42000 - state.signals[2] * 5000) * factor);
    nextRift = from + wait + Math.random() * 16000;
  }

  function checkDiscoveries() {
    var index = formIndex();
    if (index <= state.maxForm) return;
    state.maxForm = index;
    state.discoveries[index] = 1;
    if (index > 0) {
      state.keys += 1;
      toast(t('discovery', { name: t('forms')[index] }) + ' · ' + t('keys') + ' +1');
      audio('discovery');
    }
  }
  function applyTheme() {
    var index = formIndex();
    document.documentElement.style.setProperty('--core', FORMS[index].color);
    el.form.textContent = t('forms')[index];
    checkDiscoveries();
  }
  function toast(text) {
    el.toast.textContent = text;
    el.toast.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.toast.classList.add('hidden'); }, 2600);
  }
  function floatText(value, kind) {
    var node = document.createElement('div');
    node.className = 'floater' + (kind === 'crit' ? ' crit' : '') + (kind === 'rift' ? ' rift' : '');
    node.textContent = (kind === 'crit' ? t('crit') + ' ' : '') + '+' + fmt(value);
    node.style.left = 40 + Math.random() * 20 + '%';
    node.style.top = 48 + Math.random() * 8 + '%';
    el.floats.appendChild(node);
    setTimeout(function () { node.remove(); }, 820);
  }
  function addDust(value, display, kind, trackDaily) {
    if (!isFinite(value) || value <= 0) return;
    state.dust += value;
    state.total += value;
    state.stats.lifeDust += value;
    if (trackDaily) state.daily.dust += value;
    if (display) floatText(value, kind);
  }

  function harvest(fromAuto) {
    if (paused) return;
    var time = Date.now();
    audio('unlock', state.settings);
    if (!fromAuto) {
      combo = time < comboUntil ? combo + 1 : 1;
      comboUntil = time + comboWindow();
      state.stats.clicks += 1;
      state.daily.clicks += 1;
    }
    var value = clickPower();
    var critical = Math.random() < critChance();
    if (critical) value *= 3;
    if (riftActive()) {
      if (time < riftChainUntil) riftChain += 1;
      else riftChain = 1;
      riftChainUntil = time + 75000;
      var chainMult = 1 + Math.min(4, riftChain - 1) * 0.25;
      var bonus = Math.max(value * 8, perSec() * 12) * (1 + rem('sight') * 0.25) * chainMult;
      addDust(bonus, true, 'rift', true);
      riftUntil = 0;
      state.stats.rifts += 1;
      state.daily.rifts += 1;
      scheduleRift(time);
      toast(t('riftHit', { n: fmt(bonus) }) + (riftChain > 1 ? ' · ' + t('riftChain', { n: riftChain }) : ''));
      audio('rift');
      haptic([14, 20, 20]);
    } else {
      addDust(value, !fromAuto, critical ? 'crit' : '', !fromAuto);
      if (!fromAuto) {
        audio('tap', critical ? 'crit' : 'tap');
        haptic(critical ? [8, 22, 12] : 7);
      }
    }
    renderHud(true);
  }

  function scoreValue() {
    return Math.floor(Math.log10(state.stats.lifeDust + 1) * 1000 + state.gravity * 250 + state.remnants * 80 + state.keys * 90);
  }
  function serializableState() {
    state.version = SAVE_VERSION;
    state.last = now();
    return state;
  }
  function persist() {
    if (demoMode) return;
    serializableState();
    if (typeof GPX !== 'undefined') GPX.saveProgress(state, scoreValue());
  }
  function hydrate(data) {
    state = migrate(data);
    var changedDay = ensureDaily();
    var elapsed = Math.min(offlineCap(), Math.max(0, (now() - state.last) / 1000));
    var gained = perSec() * elapsed;
    if (gained > 1) addDust(gained, false, '', false);
    if (changedDay) persist();
    return gained;
  }

  function missionList() {
    return [
      { id: 'clicks', key: 'missionClicks', desc: 'missionClicksD', need: 25, now: state.daily.clicks },
      { id: 'rifts', key: 'missionRifts', desc: 'missionRiftsD', need: 1, now: state.daily.rifts },
      { id: 'dust', key: 'missionDust', desc: 'missionDustD', need: 250, now: state.daily.dust }
    ];
  }
  function contractsComplete() { return missionList().every(function (mission) { return mission.now >= mission.need; }); }
  function activitySummary() {
    var missions = missionList();
    var completed = missions.filter(function (mission) { return mission.now >= mission.need; }).length;
    if (contractsComplete() && !state.contracts.claimed) return { kicker: t('contracts'), title: t('missionClaim'), meta: t('ready'), progress: 1 };
    if (!state.contracts.claimed) {
      var next = missions.find(function (mission) { return mission.now < mission.need; }) || missions[0];
      return { kicker: t('contracts'), title: t(next.key), meta: Math.min(next.now, next.need) + ' / ' + next.need, progress: Math.min(1, next.now / next.need) };
    }
    var expedition = expeditionInfo();
    if (expedition) {
      if (expedition.ready) return { kicker: t('expeditions'), title: t('expeditionClaim'), meta: t('ready'), progress: 1 };
      return { kicker: t('expeditions'), title: t('exp' + capitalize(expedition.id)), meta: fmtTime((expedition.ends - now()) / 1000), progress: expedition.progress };
    }
    return { kicker: t('expeditions'), title: t('expeditionNo'), meta: t('contractsProgress', { n: completed, all: missions.length }), progress: completed / missions.length };
  }
  function renderActivity() {
    var summary = activitySummary();
    el.activityKicker.textContent = summary.kicker;
    el.activityTitle.textContent = summary.title;
    el.activityMeta.textContent = summary.meta;
    el.activityFill.style.width = Math.round(summary.progress * 100) + '%';
  }
  function renderHud(force) {
    var time = Date.now();
    if (!force && time - lastHud < 120) return;
    lastHud = time;
    ensureDaily();
    el.dust.textContent = fmt(state.dust);
    el.rate.textContent = fmt(perSec()) + ' ' + t('perSec');
    var progress = evoProgress();
    el.evo.textContent = formIndex() >= FORMS.length - 1 ? t('formCap') : t('phase') + ' ' + Math.floor(progress * 100) + '%';
    el.evoFill.style.width = (progress * 100) + '%';
    var phase = tidePhase(time);
    var multiplier = tideMult();
    el.tide.className = 'chip ' + phase + (riftActive() ? ' rift' : '');
    if (riftActive()) el.tide.textContent = t('riftOpen');
    else if (phase === 'high') el.tide.textContent = t('tideHigh', { n: multiplier.toFixed(2) });
    else if (phase === 'ebb') el.tide.textContent = t('tideEbb', { n: multiplier.toFixed(2) });
    else el.tide.textContent = chorusMult() > 1 ? t('chorus', { n: chorusMult().toFixed(2) }) : t('tideCalm');
    if (time < comboUntil && combo > 1) {
      el.combo.classList.remove('hidden');
      el.combo.textContent = t('resonance') + ' ×' + comboMult().toFixed(2);
    } else el.combo.classList.add('hidden');
    el.core.classList.toggle('rift', riftActive());
    el.reward.disabled = rewardBusy;
    renderActivity();
    applyTheme();
  }

  function setSheetContent(html) { el.sheetBody.innerHTML = html; }
  function openSheet(kind, title, html) {
    previousFocus = document.activeElement;
    sheetKind = kind;
    el.sheetTitle.textContent = title;
    setSheetContent(html);
    el.sheet.classList.remove('hidden');
    el.sheet.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () { el.sheetCard.focus(); });
  }
  function closeSheet() {
    sheetKind = '';
    el.sheet.classList.add('hidden');
    el.sheet.setAttribute('aria-hidden', 'true');
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    previousFocus = null;
  }
  function refreshOpenSheet() {
    if (el.sheet.classList.contains('hidden')) return;
    if (sheetKind === 'shop') { el.sheetTitle.textContent = t('workshop'); setSheetContent(shopHtml()); }
    else if (sheetKind === 'collapse') { el.sheetTitle.textContent = t('collapse'); setSheetContent(collapseHtml()); }
    else if (sheetKind === 'objectives') { el.sheetTitle.textContent = t('contracts'); setSheetContent(objectivesHtml()); }
    else if (sheetKind === 'menu') { el.sheetTitle.textContent = t('menu'); setSheetContent(menuHtml()); }
    else if (sheetKind === 'settings') { el.sheetTitle.textContent = t('settings'); setSheetContent(settingsHtml()); }
    else if (sheetKind === 'about') { el.sheetTitle.textContent = t('about'); setSheetContent(aboutHtml()); }
  }
  function itemHtml(title, desc, cost, attr, extra) {
    var can = state.dust >= cost;
    return '<div class="shop-item"><div><h3>' + title + '</h3><p>' + desc + '</p>' + (extra || '') + '</div><button ' + attr + ' class="' + (can ? 'ok' : '') + '"' + (can ? '' : ' aria-disabled="true"') + '>' + fmt(cost) + '</button></div>';
  }
  function shopHtml() {
    var tabs = '<div class="tabs" style="--tabs:4">' +
      tab('orbits', t('orbits')) + tab('harm', t('harmonies')) + tab('sig', t('signals')) + tab('research', t('research')) + '</div>';
    var list = '';
    if (shopTab === 'orbits') {
      ORBITS.forEach(function (item, index) {
        var cost = costOf(item.base, state.orbits[index]);
        list += itemHtml(t('orbitNames')[index] + ' · ' + state.orbits[index], t('orbitDesc')[index], cost, 'data-buy-orbit="' + index + '"', '<span class="item-stat">+' + fmt(item.prod * flowMult()) + ' ' + t('perSec') + '</span>');
      });
    } else if (shopTab === 'harm') {
      HARMONIES.forEach(function (item, index) {
        var cost = costOf(item.base, state.harms[index]);
        list += itemHtml(t('harmNames')[index] + ' · ' + state.harms[index], t('harmDesc')[index], cost, 'data-buy-harm="' + index + '"');
      });
    } else if (shopTab === 'sig') {
      SIGNALS.forEach(function (item, index) {
        var cost = costOf(item.base, state.signals[index]);
        list += itemHtml(t('sig' + item.key) + ' · ' + state.signals[index], t('sig' + item.key + 'D'), cost, 'data-buy-sig="' + index + '"');
      });
    } else list = researchHtml();
    return tabs + list;
  }
  function tab(id, label) { return '<button data-tab="' + id + '" class="' + (shopTab === id ? 'on' : '') + '">' + label + '</button>'; }
  function researchHtml() {
    var html = '<p class="section-lead">' + t('researchLead') + '</p><p class="note"><strong>' + t('keys') + ':</strong> ' + state.keys + '</p><div class="research-grid">';
    RESEARCH.forEach(function (item, index) {
      var level = research(index);
      var cost = item.base + Math.floor(level / 2);
      var can = state.keys >= cost;
      var maxed = level >= 8;
      html += '<button class="research-node ' + (maxed ? 'maxed' : can ? 'available' : 'locked') + '" data-buy-research="' + index + '"' + (maxed ? ' disabled' : '') + '><h3>' + t('researchNames')[index] + ' · ' + t('level') + ' ' + level + '</h3><p>' + t('researchDesc')[index] + '</p><span class="node-cost">' + (maxed ? t('maxed') : cost + ' ' + t('keys')) + '</span></button>';
    });
    return html + '</div>';
  }
  function remnantHtml() {
    var html = '<p class="section-title">' + t('remnants') + '</p><p class="note">' + t('remnantsHave', { n: state.remnants }) + '. ' + t('remnantsHint') + '</p>';
    REMS.forEach(function (item) {
      var level = rem(item.id);
      var can = state.remnants > 0;
      html += '<div class="shop-item"><div><h3>' + t(item.name) + ' · ' + level + '</h3><p>' + t(item.desc) + '</p></div><button data-buy-rem="' + item.id + '" class="' + (can ? 'ok' : '') + '">' + (can ? t('remnantBuy') : t('remnantNeed')) + '</button></div>';
    });
    return html;
  }
  function collapseHtml() {
    var need = collapseNeed();
    var ready = state.total >= need;
    return '<p class="section-lead">' + t('collapseNote') + '</p>' +
      '<div class="collapse-summary"><div><span>' + t('gravityNow') + '</span><strong>×' + gravityMult().toFixed(2) + '</strong></div><div><span>' + t('gravityAfter') + '</span><strong>×' + (gravityMult() + .5).toFixed(2) + '</strong></div><div><span>' + t('collapseReward') + '</span><strong>+' + collapseReward() + '</strong></div><div><span>' + t('collapseCount') + '</span><strong>' + state.stats.collapses + '</strong></div></div>' +
      '<p class="note">' + t('collapseNeed', { need: fmt(need), now: fmt(state.total) }) + '</p>' +
      (ready ? '<button class="menu-item" data-do-collapse="1">' + t('doCollapse') + ' (+0.5×)</button>' : '<p class="warn">' + t('tooLight') + '</p>') + remnantHtml();
  }
  function expeditionInfo() {
    if (!state.expedition) return null;
    var info = EXPEDITIONS.find(function (item) { return item.id === state.expedition.id; });
    if (!info) return null;
    var left = state.expedition.ends - now();
    return { id: info.id, info: info, ends: state.expedition.ends, ready: left <= 0, progress: Math.max(0, Math.min(1, 1 - left / (info.mins * 60000))) };
  }
  function missionHtml(mission) {
    var done = mission.now >= mission.need;
    var amount = Math.min(mission.now, mission.need);
    return '<div class="mission-row ' + (done ? 'done' : '') + '"><div class="progress-row"><div><h3>' + t(mission.key) + '</h3><p>' + t(mission.desc, { need: mission.need }) + '</p></div><strong>' + amount + ' / ' + mission.need + '</strong><div class="thin-progress"><b style="width:' + Math.round(Math.min(1, mission.now / mission.need) * 100) + '%"></b></div></div></div>';
  }
  function objectivesHtml() {
    var missions = missionList();
    var html = '<p class="section-lead">' + t('contractsLead') + '</p>';
    missions.forEach(function (mission) { html += missionHtml(mission); });
    if (contractsComplete() && !state.contracts.claimed) html += '<button class="claim-button ok" data-claim-contract="1">' + t('missionClaim') + ' · ' + t('keys') + ' +1</button>';
    else if (state.contracts.claimed) html += '<p class="good">' + t('contractsDone', { n: 1 }) + '</p>';
    html += '<p class="section-title">' + t('expeditions') + '</p><p class="section-lead">' + t('expeditionsLead') + '</p>';
    var active = expeditionInfo();
    if (active) {
      html += '<div class="expedition-card ' + (active.ready ? 'ready' : 'active') + '"><h3>' + t('exp' + capitalize(active.id)) + '</h3><p>' + t('exp' + capitalize(active.id) + 'D') + '</p><div class="thin-progress"><b style="width:' + Math.round(active.progress * 100) + '%"></b></div><p class="' + (active.ready ? 'good' : 'note') + '">' + (active.ready ? t('expeditionReady') : t('expeditionActive', { time: fmtTime((active.ends - now()) / 1000) })) + '</p>' + (active.ready ? '<button class="claim-button ok" data-claim-expedition="1">' + t('expeditionClaim') + '</button>' : '') + '</div>';
    } else {
      EXPEDITIONS.forEach(function (item) {
        var reward = item.reward === 'dust' ? t('expRewardDust', { n: fmt(Math.max(500, perSec() * 240)) }) : item.reward === 'key' ? t('expRewardKey', { n: 1 }) : t('expRewardFocus');
        html += '<div class="expedition-card"><h3>' + t('exp' + capitalize(item.id)) + '</h3><p>' + t('exp' + capitalize(item.id) + 'D') + '</p><span class="reward-pill">' + reward + ' · ' + item.mins + ' мин</span><button data-start-expedition="' + item.id + '">' + t('expeditionStart') + '</button></div>';
      });
    }
    return html;
  }
  function menuHtml() {
    return '<button class="menu-item" data-act="objectives">' + t('contracts') + ' · ' + t('expeditions') + '</button>' +
      '<button class="menu-item" data-act="settings">' + t('settings') + '</button>' +
      '<button class="menu-item" data-act="board">' + t('board') + '</button>' +
      '<button class="menu-item" data-act="invite">' + t('invite') + '</button>' +
      '<button class="menu-item" data-act="fav">' + t('fav') + '</button>' +
      '<button class="menu-item" data-act="about">' + t('about') + '</button>' +
      '<button class="menu-item" data-act="privacy">' + t('privacy') + '</button>' +
      '<button class="menu-item danger" data-act="reset">' + t('reset') + '</button>';
  }
  function settingRow(label, value, action) {
    return '<div class="set-row"><div><strong>' + label + '</strong><span>' + (value ? t('on') : t('off')) + '</span></div><button class="menu-item" data-act="' + action + '">' + (value ? t('on') : t('off')) + '</button></div>';
  }
  function settingsHtml() {
    return settingRow(t('music'), state.settings.music, 'toggle-music') +
      settingRow(t('effects'), state.settings.effects, 'toggle-effects') +
      settingRow(t('haptics'), state.settings.haptics, 'toggle-haptics') +
      settingRow(t('motion'), state.settings.motion, 'toggle-motion') +
      '<div class="set-row"><div><strong>' + t('language') + '</strong></div><div class="lang-switch"><button data-lang="ru" class="' + (state.lang === 'ru' ? 'on' : '') + '">' + t('langRu') + '</button><button data-lang="en" class="' + (state.lang === 'en' ? 'on' : '') + '">' + t('langEn') + '</button></div></div>' +
      '<button class="menu-item" data-act="menu">' + t('back') + '</button>';
  }
  function aboutHtml() {
    return '<div class="about-card"><p class="note"><strong>' + t('title') + '</strong> — ' + t('about1') + '</p><p class="note">' + t('about2') + '</p><p class="note">' + t('about3') + '</p></div><button class="menu-item" data-act="menu">' + t('back') + '</button>';
  }
  function capitalize(value) { return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''; }

  function buy(array, config, index) {
    var cost = costOf(config[index].base, array[index]);
    if (state.dust < cost) { haptic(10); return false; }
    state.dust -= cost;
    array[index] += 1;
    audio('purchase');
    haptic([7, 16, 7]);
    persist();
    renderHud(true);
    refreshOpenSheet();
    return true;
  }
  function buyResearch(index) {
    var level = research(index);
    if (level >= 8) return;
    var cost = RESEARCH[index].base + Math.floor(level / 2);
    if (state.keys < cost) { haptic(10); return; }
    state.keys -= cost;
    state.research[index] += 1;
    audio('research');
    haptic([8, 20, 10]);
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function buyRemnant(id) {
    if (state.remnants < 1) { haptic(10); return; }
    state.remnants -= 1;
    state.rem[id] = rem(id) + 1;
    audio('purchase');
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function claimContracts() {
    if (!contractsComplete() || state.contracts.claimed) return;
    state.contracts.claimed = true;
    state.keys += 1;
    toast(t('contractsDone', { n: 1 }));
    audio('discovery');
    haptic([12, 24, 12]);
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function startExpedition(id) {
    if (state.expedition) return;
    var item = EXPEDITIONS.find(function (row) { return row.id === id; });
    if (!item) return;
    state.expedition = { id: item.id, started: now(), ends: now() + item.mins * 60000, claimed: false };
    toast(t('expeditionStart') + ': ' + t('exp' + capitalize(item.id)));
    audio('purchase');
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function claimExpedition() {
    var active = expeditionInfo();
    if (!active || !active.ready) return;
    var reward;
    if (active.info.reward === 'dust') {
      var dust = Math.max(500, perSec() * 240 + clickPower() * 80) * gravityMult();
      addDust(dust, true, '', true);
      reward = t('expRewardDust', { n: fmt(dust) });
    } else if (active.info.reward === 'key') {
      state.keys += 1;
      reward = t('expRewardKey', { n: 1 });
    } else {
      state.focus += 1;
      reward = t('expRewardFocus');
    }
    state.stats.expeditions += 1;
    var label = t('exp' + capitalize(active.id));
    state.expedition = null;
    toast(t('expeditionReturned', { name: label, reward: reward }));
    audio('discovery');
    haptic([12, 28, 12]);
    persist();
    renderHud(true);
    refreshOpenSheet();
  }
  function doCollapse() {
    if (state.total < collapseNeed()) return;
    var gain = collapseReward();
    state.gravity += 1;
    state.remnants += gain;
    state.stats.collapses += 1;
    state.dust = 0;
    state.total = 0;
    state.orbits = arr(null, ORBITS.length);
    state.harms = arr(null, HARMONIES.length);
    state.signals = arr(null, SIGNALS.length);
    combo = 0;
    riftUntil = 0;
    riftChain = 0;
    scheduleRift(Date.now());
    persist();
    closeSheet();
    toast(t('collapsed', { n: gravityMult().toFixed(2), r: gain }));
    audio('collapse');
    haptic([20, 40, 32]);
    renderHud(true);
    setTimeout(function () { if (typeof GPX !== 'undefined') GPX.showFullscreen(); }, 550);
  }
  function hardReset() {
    if (!confirm(t('resetAsk'))) return;
    var lang = state.lang;
    var settings = state.settings;
    state = emptyState(lang, settings);
    state.welcome = true;
    scheduleRift(Date.now());
    persist();
    closeSheet();
    renderHud(true);
  }

  function handleAction(action) {
    switch (action) {
      case 'objectives': openSheet('objectives', t('contracts'), objectivesHtml()); break;
      case 'settings': openSheet('settings', t('settings'), settingsHtml()); break;
      case 'toggle-music': state.settings.music = !state.settings.music; audio('setSettings', state.settings); persist(); refreshOpenSheet(); break;
      case 'toggle-effects': state.settings.effects = !state.settings.effects; audio('setSettings', state.settings); persist(); refreshOpenSheet(); break;
      case 'toggle-haptics': state.settings.haptics = !state.settings.haptics; persist(); refreshOpenSheet(); break;
      case 'toggle-motion': state.settings.motion = !state.settings.motion; document.body.classList.toggle('motion-off', !state.settings.motion); persist(); refreshOpenSheet(); break;
      case 'board': if (!GPX.openLeaderboard()) toast(t('noBoard')); break;
      case 'invite': if (!GPX.invite(t('share'))) toast(t('noInvite')); break;
      case 'fav': if (!GPX.addFavorite()) toast(t('noFav')); break;
      case 'about': openSheet('about', t('about'), aboutHtml()); break;
      case 'privacy': if (!GPX.openPrivacy()) toast(t('noPrivacy')); break;
      case 'reset': hardReset(); break;
      case 'menu': openSheet('menu', t('menu'), menuHtml()); break;
    }
  }

  el.core.addEventListener('pointerdown', function (event) { event.preventDefault(); harvest(false); });
  el.objectives.addEventListener('click', function () { openSheet('objectives', t('contracts'), objectivesHtml()); });
  el.shop.addEventListener('click', function () { shopTab = 'orbits'; openSheet('shop', t('workshop'), shopHtml()); });
  el.collapse.addEventListener('click', function () { openSheet('collapse', t('collapse'), collapseHtml()); });
  el.reward.addEventListener('click', async function () {
    if (rewardBusy) return;
    rewardBusy = true;
    renderHud(true);
    var success = await GPX.showRewarded();
    rewardBusy = false;
    if (success) {
      var gift = Math.max(25, perSec() * 90 + clickPower() * 40) * tideMult();
      addDust(gift, true, '', true);
      persist();
      renderHud(true);
      toast(t('rewardOk', { n: fmt(gift) }));
      audio('reward');
      haptic([9, 19, 9]);
    } else {
      toast(GPX.has() ? t('rewardFail') : t('rewardNoSdk'));
      renderHud(true);
    }
  });
  el.menu.addEventListener('click', function () { openSheet('menu', t('menu'), menuHtml()); });
  el.sheetClose.addEventListener('click', closeSheet);
  el.sheet.addEventListener('click', function (event) { if (event.target === el.sheet) closeSheet(); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !el.sheet.classList.contains('hidden')) closeSheet(); });

  el.sheetBody.addEventListener('click', function (event) {
    var button = event.target instanceof HTMLElement ? event.target.closest('[data-tab],[data-buy-orbit],[data-buy-harm],[data-buy-sig],[data-buy-rem],[data-buy-research],[data-do-collapse],[data-act],[data-lang],[data-claim-contract],[data-start-expedition],[data-claim-expedition]') : null;
    if (!button) return;
    if (button.dataset.tab) { shopTab = button.dataset.tab; refreshOpenSheet(); return; }
    if (button.dataset.lang) { setLang(button.dataset.lang); return; }
    if (button.dataset.buyOrbit != null) { buy(state.orbits, ORBITS, +button.dataset.buyOrbit); return; }
    if (button.dataset.buyHarm != null) { buy(state.harms, HARMONIES, +button.dataset.buyHarm); return; }
    if (button.dataset.buySig != null) { buy(state.signals, SIGNALS, +button.dataset.buySig); return; }
    if (button.dataset.buyRem) { buyRemnant(button.dataset.buyRem); return; }
    if (button.dataset.buyResearch != null) { buyResearch(+button.dataset.buyResearch); return; }
    if (button.dataset.claimContract) { claimContracts(); return; }
    if (button.dataset.startExpedition) { startExpedition(button.dataset.startExpedition); return; }
    if (button.dataset.claimExpedition) { claimExpedition(); return; }
    if (button.dataset.doCollapse) { doCollapse(); return; }
    if (button.dataset.act) handleAction(button.dataset.act);
  });

  function setPaused(value) {
    paused = value;
    if (value) audio('pause');
    else { lastTick = Date.now(); audio('resume'); }
  }
  window.addEventListener('nebula:pause', function () { setPaused(true); });
  window.addEventListener('nebula:resume', function () { setPaused(false); });
  window.addEventListener('nebula:orientation', function () { renderHud(true); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { persist(); setPaused(true); }
    else setPaused(false);
  });

  function tick() {
    var time = Date.now();
    var delta = Math.min(1, Math.max(0, (time - lastTick) / 1000));
    lastTick = time;
    if (!paused) {
      addDust(perSec() * delta, false, '', false);
      if (!riftActive() && riftUntil > 0) {
        riftUntil = 0;
        scheduleRift(time);
      }
      if (time >= nextRift && !riftActive() && riftUntil === 0) {
        riftUntil = time + 7000 + state.signals[2] * 1200;
        toast(t('riftOpen'));
        audio('riftOpen');
      }
      if (state.signals[0] > 0 && time - metroAt > Math.max(700, 1600 - state.signals[0] * 80)) {
        metroAt = time;
        harvest(true);
      }
    }
    if (time > comboUntil) combo = 0;
    if (time > riftChainUntil) riftChain = 0;
    renderHud(false);
    if (!el.sheet.classList.contains('hidden') && time - lastSheetRefresh > 900) {
      lastSheetRefresh = time;
      if (sheetKind === 'objectives' || sheetKind === 'collapse') refreshOpenSheet();
    }
    if (time - saveTimer > 15000) { saveTimer = time; persist(); }
    requestAnimationFrame(tick);
  }
  function bootAnim(done) {
    var progress = 8;
    var timer = setInterval(function () {
      progress += 10 + Math.random() * 16;
      if (progress >= 100) { progress = 100; clearInterval(timer); done(); }
      el.fill.style.width = progress + '%';
    }, 130);
  }

  state.lang = detectLang();
  applyStaticI18n();
  scheduleRift(Date.now());
  bootAnim(function () {
    GPX.whenReady(function () {
      if (!localStorage.getItem(LANG_KEY)) {
        var platformLang = GPX.platformLang();
        if (platformLang === 'ru' || platformLang === 'en') state.lang = platformLang;
      }
      var offline = hydrate(demoMode ? demoState() : GPX.loadProgress());
      ensureDaily();
      applyStaticI18n();
      document.body.classList.toggle('motion-off', !state.settings.motion);
      audio('setSettings', state.settings);
      el.boot.classList.add('hidden');
      el.app.classList.remove('hidden');
      renderHud(true);
      if (offline > 1) toast(t('offline', { n: fmt(offline) }));
      persist();
      lastTick = Date.now();
      tick();
    });
  });
})();
