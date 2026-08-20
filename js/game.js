(function () {
  'use strict';

  var SAVE_VERSION = 4;
  var LANG_KEY = 'nebula-heart-lang';
  var TYPES = ['pulse', 'whisper', 'beacon', 'mirror', 'ash', 'comet'];
  var POSITIONS = [[20,68],[25,26],[48,17],[75,27],[80,67],[49,79],[61,45]];
  var SIGNALS = {
    pulse: { name: 'sigPulse', trait: 'traitRhythm', tone: 430 },
    whisper: { name: 'sigWhisper', trait: 'traitAttraction', tone: 520 },
    beacon: { name: 'sigBeacon', trait: 'traitDirection', tone: 620 },
    mirror: { name: 'sigMirror', trait: 'traitReflection', tone: 730 },
    ash: { name: 'sigAsh', trait: 'traitFragility', tone: 310 },
    comet: { name: 'sigComet', trait: 'traitPassing', tone: 810 }
  };
  var CHAPTERS = [
    { id: 'silence', name: 'chSilence', pool: ['pulse','whisper','beacon','ash'] },
    { id: 'tide', name: 'chTide', pool: ['pulse','whisper','mirror','beacon','ash'] },
    { id: 'garden', name: 'chGarden', pool: ['whisper','beacon','mirror','ash','comet'] },
    { id: 'deep', name: 'chDeep', pool: TYPES.slice() }
  ];
  var ANOMALIES = [
    { id: 'voice', minLinks: 3, seal: '◉', title: 'anomalyVoiceTitle', intro: 'anomalyVoiceIntro', keep: 'anomalyVoiceKeep', keepHint: 'anomalyVoiceKeepHint', release: 'anomalyVoiceRelease', releaseHint: 'anomalyVoiceReleaseHint', keepStory: 'anomalyVoiceKeepStory', releaseStory: 'anomalyVoiceReleaseStory' },
    { id: 'blind', minLinks: 3, seal: '◐', title: 'anomalyBlindTitle', intro: 'anomalyBlindIntro', keep: 'anomalyBlindKeep', keepHint: 'anomalyBlindKeepHint', release: 'anomalyBlindRelease', releaseHint: 'anomalyBlindReleaseHint', keepStory: 'anomalyBlindKeepStory', releaseStory: 'anomalyBlindReleaseStory' },
    { id: 'letter', minLinks: 4, seal: '✦', title: 'anomalyLetterTitle', intro: 'anomalyLetterIntro', keep: 'anomalyLetterKeep', keepHint: 'anomalyLetterKeepHint', release: 'anomalyLetterRelease', releaseHint: 'anomalyLetterReleaseHint', keepStory: 'anomalyLetterKeepStory', releaseStory: 'anomalyLetterReleaseStory' }
  ];
  var LENSES = [
    { id: 'echo', symbol: '≈', title: 'lensEcho', desc: 'lensEchoD', cost: 1 },
    { id: 'mirror', symbol: '◌', title: 'lensMirror', desc: 'lensMirrorD', cost: 2 },
    { id: 'horizon', symbol: '⌒', title: 'lensHorizon', desc: 'lensHorizonD', cost: 3 },
    { id: 'hush', symbol: '∵', title: 'lensHush', desc: 'lensHushD', cost: 4 }
  ];
  var MOTIFS = {
    first: { id: 'first', glyph: '⟡', name: 'motifFirst', hint: 'motifFirstHint', mark: 'markFirst' },
    warm: { id: 'warm', glyph: '☉', name: 'motifWarm', hint: 'motifWarmHint', mark: 'markWarm' },
    loop: { id: 'loop', glyph: '◌', name: 'motifLoop', hint: 'motifLoopHint', mark: 'markLoop' },
    mirror: { id: 'mirror', glyph: '⌘', name: 'motifMirror', hint: 'motifMirrorHint', mark: 'markMirror' },
    comet: { id: 'comet', glyph: '✦', name: 'motifComet', hint: 'motifCometHint', mark: 'markComet' }
  };

  var state;
  var mode = 'field-ready';
  var selectedId = '';
  var linkSource = '';
  var paused = false;
  var currentSheet = '';
  var sheetData = null;
  var lastFocus = null;
  var toastTimer = 0;
  var demoMode = /(?:[?&])demo(?:=1)?(?:&|$)/.test(window.location.search);

  var el = {
    boot: document.getElementById('boot'), fill: document.getElementById('bootFill'), app: document.getElementById('app'),
    chapterName: document.getElementById('chapterName'), fieldDay: document.getElementById('fieldDay'), fieldCount: document.getElementById('fieldCount'),
    briefEyebrow: document.getElementById('briefEyebrow'), briefTitle: document.getElementById('briefTitle'), briefMeta: document.getElementById('briefMeta'), briefLetter: document.getElementById('briefLetter'), briefFill: document.getElementById('briefFill'),
    sky: document.getElementById('sky'), signalLayer: document.getElementById('signalLayer'), threadSvg: document.getElementById('threadSvg'), anomaly: document.getElementById('anomalyNode'), fieldPrompt: document.getElementById('fieldPrompt'),
    listen: document.getElementById('actListen'), connect: document.getElementById('actConnect'), witness: document.getElementById('actWitness'),
    menu: document.getElementById('btnMenu'), chapter: document.getElementById('btnChapter'), brief: document.getElementById('btnBrief'), atlas: document.getElementById('btnAtlas'), lenses: document.getElementById('btnLenses'), encounters: document.getElementById('btnEncounters'),
    sheet: document.getElementById('sheet'), sheetCard: document.querySelector('.sheet-card'), sheetKicker: document.getElementById('sheetKicker'), sheetTitle: document.getElementById('sheetTitle'), sheetBody: document.getElementById('sheetBody'), sheetClose: document.getElementById('sheetClose'), toast: document.getElementById('toast')
  };

  function n(value, fallback) { value = Number(value); return isFinite(value) && value >= 0 ? value : (fallback || 0); }
  function int(value, fallback) { return Math.floor(n(value, fallback)); }
  function bool(value, fallback) { return value == null ? !!fallback : value !== false; }
  function now() { return window.GPX && GPX.now ? GPX.now() : Date.now(); }
  function getDict() { return (window.I18N && window.I18N[state && state.lang]) || window.I18N.ru; }
  function t(key, vars) {
    var value = getDict()[key];
    if (value == null) return key;
    value = String(value);
    Object.keys(vars || {}).forEach(function (name) { value = value.replace(new RegExp('\\{' + name + '\}', 'g'), vars[name]); });
    return value;
  }
  function haptic(pattern) { if (state && state.settings.haptics && navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} } }
  function audio(method, arg) { var engine = window.NebulaAudio; if (engine && typeof engine[method] === 'function') { try { engine[method](arg); } catch (e) {} } }
  function unlockAudio() { if (state) audio('unlock', state.settings); }
  function hash(value) { var h = 2166136261; String(value).split('').forEach(function (c) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }); return h >>> 0; }
  function seeded(seed) { var x = (seed >>> 0) || 1; return function () { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; }
  function shuffle(list, rnd) { var a = list.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var q = a[i]; a[i] = a[j]; a[j] = q; } return a; }
  function languageSaved() { try { var value = localStorage.getItem(LANG_KEY); return value === 'ru' || value === 'en' ? value : ''; } catch (e) { return ''; } }
  function detectLanguage() {
    var saved = languageSaved();
    if (saved) return saved;
    var platform = window.GPX && GPX.platformLang ? GPX.platformLang() : '';
    if (platform === 'ru' || platform === 'en') return platform;
    return (navigator.language || 'ru').slice(0, 2).toLowerCase() === 'en' ? 'en' : 'ru';
  }
  function defaultSettings(source) { source = source || {}; return { music: bool(source.music, true), effects: bool(source.effects, true), haptics: bool(source.haptics, true), motion: bool(source.motion, true) }; }
  function dayIndex() { return Math.floor(now() / 86400000); }
  function chapterAt(index) { return CHAPTERS[Math.max(0, Math.min(CHAPTERS.length - 1, index || 0))]; }
  function anomalyById(id) { return ANOMALIES.filter(function (item) { return item.id === id; })[0] || ANOMALIES[0]; }
  function chooseAnomaly(seed, chapter) { return ANOMALIES[Math.abs(int(seed) + int(chapter) * 7) % ANOMALIES.length]; }
  function activeAnomaly() { return anomalyById(activeField().anomaly && activeField().anomaly.id); }
  function motifById(id) { return MOTIFS[id] || MOTIFS.first; }
  function hasSignalType(signals, type) { return signals.some(function (signal) { return signal.type === type; }); }
  function availableMotifs(signals) {
    var list = ['first', 'loop'];
    if (hasSignalType(signals, 'ash') && hasSignalType(signals, 'beacon')) list.push('warm');
    if (hasSignalType(signals, 'mirror')) list.push('mirror');
    if (hasSignalType(signals, 'comet')) list.push('comet');
    return list;
  }
  function motifIdFor(seed, signals, requested) {
    var list = availableMotifs(signals);
    if (requested && list.indexOf(requested) >= 0) return requested;
    return list[Math.abs(int(seed) + list.length * 13) % list.length];
  }
  function activeMotif(field) { field = field || activeField(); return motifById(field.motif); }
  function linksInclude(field, first, second) {
    return field.links.some(function (link) { var a = findSignal(link.a), b = findSignal(link.b); return a && b && ((a.type === first && b.type === second) || (a.type === second && b.type === first)); });
  }
  function motifAchieved(field) {
    var motif = activeMotif(field);
    if (motif.id === 'first') return field.links.length >= 1;
    if (motif.id === 'warm') return linksInclude(field, 'ash', 'beacon');
    if (motif.id === 'loop') return familyOf(field) === 'loop';
    if (motif.id === 'mirror') return field.links.filter(function (link) { var a = findSignal(link.a), b = findSignal(link.b); return (a && a.type === 'mirror') || (b && b.type === 'mirror'); }).length >= 2;
    if (motif.id === 'comet') return field.links.some(function (link) { var a = findSignal(link.a), b = findSignal(link.b); return (a && a.type === 'comet') || (b && b.type === 'comet'); });
    return false;
  }

  function freshState(language, settings) {
    var seed = hash('first:' + dayIndex());
    var fresh = {
      version: SAVE_VERSION, lang: language || 'ru', settings: defaultSettings(settings), legacyDust: 0,
      chapter: 0, chapterProgress: { resolved: 0, witnesses: 0 }, lenses: { echo: 0, mirror: 0, horizon: 0, hush: 0 }, insight: 0,
      currentField: null, atlas: [], anomalyMemory: {}, encounters: [],
      stats: { observations: 0, links: 0, constellations: 0, shared: 0, imported: 0, witnessed: 0 }, lastFieldAt: now(), welcome: false
    };
    fresh.currentField = createField(seed, 0, false, '', 'first');
    return fresh;
  }

  function normaliseField(raw, chapter) {
    if (!raw || !Array.isArray(raw.signals) || raw.signals.length < 4) return null;
    var signals = raw.signals.slice(0, 7).map(function (item, index) {
      var type = SIGNALS[item.type] ? item.type : TYPES[index % TYPES.length];
      var pos = POSITIONS[index];
      return { id: String(item.id || ('s' + index)), type: type, x: n(item.x, pos[0]), y: n(item.y, pos[1]) };
    });
    var ids = {}; signals.forEach(function (s) { ids[s.id] = true; });
    var links = Array.isArray(raw.links) ? raw.links.filter(function (link) { return link && ids[link.a] && ids[link.b] && link.a !== link.b; }).slice(0, 12).map(function (link) { return { a: String(link.a), b: String(link.b) }; }) : [];
    var listened = Array.isArray(raw.listened) ? raw.listened.filter(function (id) { return ids[id]; }).slice(0, signals.length) : [];
    var storedAnomaly = anomalyById(raw.anomaly && raw.anomaly.id);
    var seed = int(raw.seed, hash(now()));
    return { id: String(raw.id || ('field-' + now())), seed: seed, chapter: int(raw.chapter, chapter), signals: signals, links: links, listened: listened, anomaly: { id: storedAnomaly.id, needed: Math.max(2, int(raw.anomaly && raw.anomaly.needed, storedAnomaly.minLinks)) }, motif: motifIdFor(seed, signals, raw.motif), mirrorEcho: !!raw.mirrorEcho, status: raw.status === 'resolved' ? 'resolved' : 'ready', imported: !!raw.imported, challengeFamily: typeof raw.challengeFamily === 'string' ? raw.challengeFamily : '', createdAt: n(raw.createdAt, now()) };
  }

  function migrate(data) {
    if (!data || typeof data !== 'object') return freshState(detectLanguage());
    if (int(data.version) >= 3 && data.currentField) {
      var stateV3 = freshState(data.lang === 'en' || data.lang === 'ru' ? data.lang : detectLanguage(), data.settings);
      stateV3.legacyDust = n(data.legacyDust);
      stateV3.chapter = Math.min(CHAPTERS.length - 1, int(data.chapter));
      stateV3.chapterProgress = { resolved: int(data.chapterProgress && data.chapterProgress.resolved), witnesses: int(data.chapterProgress && data.chapterProgress.witnesses) };
      LENSES.forEach(function (lens) { stateV3.lenses[lens.id] = Math.min(1, int(data.lenses && data.lenses[lens.id])); });
      stateV3.insight = int(data.insight);
      stateV3.stats = Object.assign(stateV3.stats, data.stats || {});
      stateV3.atlas = Array.isArray(data.atlas) ? data.atlas.filter(function (card) { return card && typeof card === 'object' && Array.isArray(card.signals); }).slice(0, 48) : [];
      stateV3.anomalyMemory = data.anomalyMemory && typeof data.anomalyMemory === 'object' ? data.anomalyMemory : {};
      stateV3.encounters = Array.isArray(data.encounters) ? data.encounters.slice(0, 12) : [];
      stateV3.currentField = normaliseField(data.currentField, stateV3.chapter) || createField(hash('recover:' + now()), stateV3.chapter, false);
      stateV3.lastFieldAt = n(data.lastFieldAt, now()); stateV3.welcome = !!data.welcome;
      return stateV3;
    }
    var migrated = freshState(data.lang === 'en' || data.lang === 'ru' ? data.lang : detectLanguage(), data.settings || { music: data.sound !== false, effects: data.sound !== false });
    migrated.legacyDust = n(data.total || data.dust);
    migrated.stats.observations = Math.max(0, int(data.stats && data.stats.collapses));
    if (migrated.legacyDust > 0) {
      migrated.atlas.push({ id: 'legacy-' + now(), seed: hash('legacy:' + migrated.legacyDust), chapter: 0, signals: ['pulse','whisper','beacon'], links: [{a:'s0',b:'s1'},{a:'s1',b:'s2'}], family: 'bridge', decision: 'preserve', title: 'familyBridge', timestamp: now(), legacy: true });
      migrated.insight = 1;
    }
    return migrated;
  }

  function createField(seed, chapter, imported, forcedAnomalyId, forcedMotifId) {
    var rnd = seeded(seed); var ch = chapterAt(chapter); var anomaly = forcedAnomalyId ? anomalyById(forcedAnomalyId) : chooseAnomaly(seed, chapter); var count = 5 + ((state && state.lenses.horizon && rnd() > .42) ? 1 : 0);
    var types = shuffle(ch.pool, rnd); var positions = shuffle(POSITIONS, rnd); var signals = [];
    for (var i = 0; i < count; i++) signals.push({ id: 's' + i, type: types[i % types.length], x: positions[i][0] + Math.round((rnd() - .5) * 4), y: positions[i][1] + Math.round((rnd() - .5) * 4) });
    return { id: 'field-' + seed + '-' + now(), seed: seed, chapter: chapter, signals: signals, links: [], listened: [], anomaly: { id: anomaly.id, needed: Math.max(2, anomaly.minLinks - (state && state.lenses.hush ? 1 : 0)) }, motif: motifIdFor(seed, signals, forcedMotifId), mirrorEcho: false, status: 'ready', imported: !!imported, challengeFamily: '', createdAt: now() };
  }

  function activeField() { return state.currentField; }
  function findSignal(id) { return activeField().signals.filter(function (signal) { return signal.id === id; })[0] || null; }
  function isListened(id) { return activeField().listened.indexOf(id) >= 0; }
  function hasLink(a, b) { return activeField().links.some(function (link) { return (link.a === a && link.b === b) || (link.a === b && link.b === a); }); }
  function legalLink(a, b) {
    if (!a || !b || a.id === b.id || hasLink(a.id, b.id)) return false;
    // The first connection is an onboarding promise: two listened voices must always be able to meet.
    if (!activeField().links.length) return true;
    var ai = TYPES.indexOf(a.type), bi = TYPES.indexOf(b.type);
    return ((ai + bi + activeField().seed) % 5 !== 0) || !!state.lenses.echo;
  }
  function compatibleIds(sourceId) {
    var source = findSignal(sourceId); if (!source) return [];
    return activeField().signals.filter(function (signal) { return isListened(signal.id) && legalLink(source, signal); }).map(function (signal) { return signal.id; });
  }
  function familyOf(field) {
    var links = field.links; if (links.length < 2) return 'line';
    var nodes = {}; links.forEach(function (link) { nodes[link.a] = (nodes[link.a] || 0) + 1; nodes[link.b] = (nodes[link.b] || 0) + 1; });
    var degree = Object.keys(nodes).map(function (key) { return nodes[key]; });
    if (links.length >= 3 && degree.some(function (value) { return value >= 3; })) return 'star';
    if (links.length >= 3 && Object.keys(nodes).length <= links.length) return 'loop';
    if (links.length >= 3) return 'bridge';
    return 'line';
  }
  function familyKey(family) { return 'family' + family.charAt(0).toUpperCase() + family.slice(1); }
  function patternKey(family) { return 'pattern' + family.charAt(0).toUpperCase() + family.slice(1); }
  function soundFor(signal) { var type = signal && SIGNALS[signal.type]; audio('tap', type && type.type === 'ash' ? 'crit' : 'normal'); }

  function applyStaticI18n() {
    document.documentElement.lang = state.lang;
    document.title = t('title');
    document.querySelectorAll('[data-i18n]').forEach(function (node) { node.textContent = t(node.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (node) { node.setAttribute('aria-label', t(node.getAttribute('data-i18n-aria'))); });
  }
  function setLanguage(code) {
    if (code !== 'ru' && code !== 'en') return;
    state.lang = code; try { localStorage.setItem(LANG_KEY, code); } catch (e) {}
    if (window.GPX) GPX.setLanguage(code); applyStaticI18n(); renderAll(); refreshSheet(); persist(); toast(t('languageChanged', { name: t(code === 'ru' ? 'langRu' : 'langEn') }));
  }
  function persist() { if (!demoMode && window.GPX) GPX.saveProgress(state, state.stats.observations); }
  function toast(message) { clearTimeout(toastTimer); el.toast.textContent = message; el.toast.classList.remove('hidden'); toastTimer = setTimeout(function () { el.toast.classList.add('hidden'); }, 3000); }

  function renderHud() {
    var ch = chapterAt(state.chapter); var field = activeField();
    el.chapterName.textContent = t(ch.name); el.fieldDay.textContent = t(field.imported ? 'sourceEcho' : 'fieldWindow'); el.fieldCount.textContent = t('records', { count: state.atlas.length });
    var progress = Math.min(100, Math.round((field.links.length / field.anomaly.needed) * 100));
    el.briefEyebrow.textContent = t(field.imported ? 'sourceEcho' : 'observation');
    if (field.links.length >= field.anomaly.needed) { el.briefTitle.textContent = t(activeAnomaly().title); el.briefMeta.textContent = t('anomalyReady'); }
    else if (!field.listened.length) { el.briefTitle.textContent = t('listenSky'); el.briefMeta.textContent = t('chooseSignal'); }
    else { el.briefTitle.textContent = t('connect'); el.briefMeta.textContent = t('linksCount', { count: field.links.length }); }
    var motif = activeMotif(field), achieved = motifAchieved(field);
    el.briefLetter.textContent = motif.glyph + ' ' + t(achieved ? 'motifComplete' : 'nightLetter', { name: t(motif.name) });
    el.briefLetter.classList.toggle('is-complete', achieved);
    el.briefFill.style.width = progress + '%';
  }

  function renderThreads() {
    var field = activeField(); var pathData = '';
    field.links.forEach(function (link) {
      var a = findSignal(link.a), b = findSignal(link.b); if (!a || !b) return;
      var family = familyOf(field); pathData += '<path class="family-' + family + '" d="M ' + a.x + ' ' + a.y + ' L ' + b.x + ' ' + b.y + '"></path><circle cx="' + a.x + '" cy="' + a.y + '" r=".75"></circle><circle cx="' + b.x + '" cy="' + b.y + '" r=".75"></circle>';
    });
    if (field.mirrorEcho && field.links.length) { var last = field.links[field.links.length - 1], ma = findSignal(last.a), mb = findSignal(last.b); if (ma && mb) pathData += '<circle class="mirror-glint" cx="' + ((ma.x + mb.x) / 2) + '" cy="' + ((ma.y + mb.y) / 2) + '" r="1.7"></circle>'; }
    el.threadSvg.innerHTML = pathData;
    el.sky.classList.toggle('motif-awake', motifAchieved(field));
    el.sky.setAttribute('data-motif', activeMotif(field).id);
  }
  function promptForField() {
    var field = activeField(); var selected = findSignal(selectedId);
    if (field.links.length >= field.anomaly.needed) return t(activeAnomaly().title) + ' — ' + t('anomalyReady');
    if (mode === 'link-source') return t('chooseLinkSource');
    if (mode === 'link-target') return t('chooseLinkTarget');
    if (selected && isListened(selected.id)) return t('listenedSignal', { name: t(SIGNALS[selected.type].name), trait: t(SIGNALS[selected.type].trait) });
    if (selected) return t('selectedSignal', { name: t(SIGNALS[selected.type].name) });
    return t('fieldStart');
  }
  function renderField() {
    var field = activeField(); var compatible = mode === 'link-target' ? compatibleIds(linkSource) : [];
    el.signalLayer.innerHTML = field.signals.map(function (signal) {
      var classes = ['signal', signal.type];
      if (signal.id === selectedId || signal.id === linkSource) classes.push('is-selected');
      if (isListened(signal.id)) classes.push('is-listened');
      if (field.links.some(function (link) { return link.a === signal.id || link.b === signal.id; })) classes.push('is-linked');
      if (compatible.indexOf(signal.id) >= 0) classes.push('is-compatible');
      var name = t(SIGNALS[signal.type].name), trait = t(SIGNALS[signal.type].trait);
      return '<button type="button" class="' + classes.join(' ') + '" data-signal="' + signal.id + '" style="left:' + signal.x + '%;top:' + signal.y + '%" aria-label="' + name + (isListened(signal.id) ? ': ' + trait : '') + '"><span class="signal-orb" aria-hidden="true"></span><span class="signal-label">' + name + '<small>' + trait + '</small></span></button>';
    }).join('');
    renderThreads(); el.anomaly.classList.toggle('hidden', field.links.length < field.anomaly.needed);
    var motif = activeMotif(field), achieved = motifAchieved(field);
    el.fieldPrompt.textContent = achieved ? motif.glyph + ' ' + t('motifAwake', { name: t(motif.name) }) : motif.glyph + ' ' + t(motif.hint);
    el.fieldPrompt.classList.toggle('is-motif-awake', achieved);
    var noSelection = !selectedId || !isListened(selectedId);
    el.listen.disabled = paused || !selectedId || isListened(selectedId) || field.status === 'resolved';
    el.connect.disabled = paused || field.status === 'resolved' || (mode !== 'link-source' && (field.listened.length < 2));
    el.witness.disabled = paused || field.status === 'resolved' || field.links.length < field.anomaly.needed;
    el.listen.classList.toggle('is-active', !!selectedId && !isListened(selectedId));
    el.connect.classList.toggle('is-active', mode === 'link-source' || mode === 'link-target');
    el.witness.classList.toggle('is-active', field.links.length >= field.anomaly.needed);
    el.sky.classList.toggle('motion-off', !state.settings.motion);
  }
  function renderAll() { renderHud(); renderField(); }

  function selectSignal(id) {
    if (paused || activeField().status === 'resolved') return;
    unlockAudio(); var signal = findSignal(id); if (!signal) return;
    if (mode === 'link-source') {
      if (!isListened(id)) { toast(t('needListen')); return; }
      linkSource = id; selectedId = id; mode = 'link-target'; haptic(10); renderField(); return;
    }
    if (mode === 'link-target') {
      var source = findSignal(linkSource);
      if (id === linkSource) { mode = 'field-ready'; linkSource = ''; renderField(); return; }
      if (!isListened(id)) { toast(t('needListen')); return; }
      if (!legalLink(source, signal)) { toast(t('invalidLink')); haptic([12,30,12]); return; }
      activeField().links.push({ a: linkSource, b: id }); if (state.lenses.mirror && !activeField().mirrorEcho && (source.type === 'mirror' || signal.type === 'mirror')) activeField().mirrorEcho = true; state.stats.links++; selectedId = id; linkSource = ''; mode = 'field-ready'; audio('rift'); haptic(16);
      if (activeField().links.length >= activeField().anomaly.needed) audio('riftOpen');
      renderAll(); persist(); return;
    }
    selectedId = id; mode = 'field-ready'; soundFor(signal); haptic(6); renderField();
  }
  function listenSelected() {
    if (paused || !selectedId) { toast(t('chooseSignal')); return; }
    var signal = findSignal(selectedId); if (!signal || isListened(signal.id)) return;
    unlockAudio(); activeField().listened.push(signal.id); mode = 'field-ready'; audio('research'); haptic(12); renderField(); persist();
  }
  function beginConnect() {
    if (paused) return;
    unlockAudio(); if (mode === 'link-source' || mode === 'link-target') { mode = 'field-ready'; linkSource = ''; renderField(); return; }
    if (activeField().listened.length < 2) { toast(t('needTwoSignals')); return; }
    mode = 'link-source'; linkSource = ''; renderField();
  }
  function openAnomaly() { if (activeField().links.length < activeField().anomaly.needed) { toast(t('needMoreLinks', { count: activeField().anomaly.needed - activeField().links.length })); return; } openSheet('anomaly'); }
  function resolveAnomaly(decision) {
    var field = activeField(), family = familyOf(field), anomaly = activeAnomaly(), motif = activeMotif(field), marked = motifAchieved(field), duet = '';
    if (field.imported && field.challengeFamily) duet = family === field.challengeFamily ? 'harmony' : 'counterpoint';
    var card = {
      id: 'card-' + now() + '-' + Math.round(Math.random() * 999), seed: field.seed, chapter: field.chapter, signals: field.signals.map(function (s) { return s.type; }), links: field.links.slice(), family: family, anomaly: anomaly.id, decision: decision, title: familyKey(family), motif: motif.id, marked: marked, duet: duet, timestamp: now(), imported: field.imported
    };
    field.status = 'resolved'; state.atlas.unshift(card); state.atlas = state.atlas.slice(0, 48); state.insight++; state.stats.observations++; state.stats.constellations++; state.stats.witnessed++; state.chapterProgress.resolved++; state.chapterProgress.witnesses++;
    var memory = state.anomalyMemory[anomaly.id] || { seen: 0, preserved: 0, released: 0 }; memory.seen++; if (decision === 'preserve') memory.preserved++; else memory.released++; state.anomalyMemory[anomaly.id] = memory;
    if (field.imported) { state.stats.imported++; state.encounters.unshift({ source: card.seed, response: card.id, motif: motif.id, relation: duet, timestamp: now() }); state.encounters = state.encounters.slice(0,12); }
    if (state.chapter < CHAPTERS.length - 1 && state.chapterProgress.resolved >= 4) { state.chapter++; state.chapterProgress = { resolved: 0, witnesses: 0 }; toast(t('newChapter', { name: t(chapterAt(state.chapter).name) })); audio('discovery'); }
    else audio('reward'); haptic([10,28,18]); persist(); openSheet('result', card); renderAll();
  }
  function nextField() { var nextSeed = hash('field:' + state.chapter + ':' + state.stats.observations + ':' + dayIndex() + ':' + now()); state.currentField = createField(nextSeed, state.chapter, false); selectedId = ''; linkSource = ''; mode = 'field-ready'; closeSheet(); renderAll(); persist(); }

  function openSheet(kind, data) {
    lastFocus = document.activeElement; currentSheet = kind; sheetData = data || null; el.sheet.classList.remove('hidden'); el.sheet.setAttribute('aria-hidden','false'); refreshSheet(); setTimeout(function () { el.sheetCard.focus(); }, 0);
  }
  function closeSheet() { el.sheet.classList.add('hidden'); el.sheet.setAttribute('aria-hidden','true'); currentSheet = ''; sheetData = null; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function setSheet(kicker, title, content) { el.sheetKicker.textContent = kicker || ''; el.sheetTitle.textContent = title; el.sheetBody.innerHTML = content; }
  function refreshSheet() {
    if (!currentSheet) return;
    if (currentSheet === 'atlas') renderAtlasSheet();
    else if (currentSheet === 'lenses') renderLensesSheet();
    else if (currentSheet === 'encounters') renderEncountersSheet();
    else if (currentSheet === 'menu') renderMenuSheet();
    else if (currentSheet === 'settings') renderSettingsSheet();
    else if (currentSheet === 'anomaly') renderAnomalySheet();
    else if (currentSheet === 'result') renderResultSheet(sheetData);
    else if (currentSheet === 'record') renderRecordSheet(sheetData);
    else if (currentSheet === 'chapter') renderChapterSheet();
  }

  function miniLines(card) { var count = Math.min(4, card.links.length); var html = '<div class="mini-sky"></div>'; for (var i=0;i<count;i++) html += '<i class="mini-line" style="left:' + (18+i*11) + '%;top:' + (34+i*10) + '%;width:' + (34-i*3) + '%;transform:rotate(' + (-18+i*29) + 'deg)"></i>'; return html; }
  function motifBadge(card) { var motif = motifById(card && card.motif); return '<span class="motif-badge ' + (card && card.marked ? 'is-marked' : '') + '"><i>' + motif.glyph + '</i><span>' + t(card && card.marked ? motif.mark : motif.name) + '</span></span>'; }
  function duetNote(card) { if (!card || !card.duet) return ''; return '<p class="duet-note ' + card.duet + '"><span>' + (card.duet === 'harmony' ? '≈' : '↗') + '</span>' + t(card.duet === 'harmony' ? 'duetHarmony' : 'duetCounterpoint') + '</p>'; }
  function renderAtlasSheet() {
    var cards = state.atlas.map(function (card) { return '<button type="button" class="atlas-card" data-card="' + card.id + '" style="--card-glow:' + (card.decision === 'preserve' ? 'rgba(117,228,239,.22)' : 'rgba(170,139,255,.22)') + '">' + miniLines(card) + '<span class="card-top"><span>' + t('recordKicker') + '</span><span>' + t(familyKey(card.family)) + '</span></span><strong>' + t(card.title) + '</strong>' + motifBadge(card) + '<small>' + t('recordSignals',{count:card.signals.length,links:card.links.length}) + '</small></button>'; }).join('');
    var memoryRows = ANOMALIES.filter(function (anomaly) { return state.anomalyMemory[anomaly.id]; }).map(function (anomaly) { var memory = state.anomalyMemory[anomaly.id]; return '<div class="encounter-row"><span class="lens-seal">' + anomaly.seal + '</span><div><strong>' + t(anomaly.title) + '</strong><p>' + t('witnessCount',{count:memory.seen}) + ' · ' + t(anomaly.keep) + ': ' + memory.preserved + ' · ' + t(anomaly.release) + ': ' + memory.released + '</p></div></div>'; }).join('');
    setSheet(t('atlas'), t('atlasTitle'), '<p class="sheet-intro">' + t('atlasIntro') + '</p>' + (cards ? '<div class="atlas-grid">' + cards + '</div>' : '<div class="empty">' + t('noAtlas') + '</div>') + '<span class="section-label">' + t('memory') + '</span>' + (memoryRows ? '<div class="encounter-list">' + memoryRows + '</div>' : '<div class="empty">' + t('memoryEmpty') + '</div>'));
  }
  function renderRecordSheet(card) {
    if (!card) { openSheet('atlas'); return; }
    var anomaly = anomalyById(card.anomaly); var story = t(card.decision === 'preserve' ? anomaly.keepStory : anomaly.releaseStory, { pattern: t(patternKey(card.family)) });
    setSheet(t('recordKicker'), t(card.title), '<div class="result-seal">' + anomaly.seal + '</div><h3 class="result-title">' + t('recordOf',{name:t(card.title)}) + '</h3>' + motifBadge(card) + '<p class="result-story">' + story + '</p>' + duetNote(card) + '<div class="encounter-row"><span class="lens-seal">' + anomaly.seal + '</span><div><strong>' + t(anomaly.title) + '</strong><p>' + t('recordSignals',{count:card.signals.length,links:card.links.length}) + '</p></div></div><div class="result-actions"><button type="button" class="secondary-btn" data-share-card="' + card.id + '">' + t('shareEcho') + '</button><button type="button" class="primary-btn" data-next-field="1">' + t('nextSky') + '</button></div>');
  }
  function renderLensesSheet() {
    var rows = LENSES.map(function (lens) { var unlocked = !!state.lenses[lens.id]; var enough = state.insight >= lens.cost; return '<div class="lens-row"><span class="lens-seal">' + lens.symbol + '</span><div><strong>' + t(lens.title) + '</strong><p>' + t(lens.desc) + '</p></div><button type="button" data-lens="' + lens.id + '" ' + (unlocked || !enough ? 'disabled' : '') + '>' + (unlocked ? t('unlocked') : t('unlock',{count:lens.cost})) + '</button></div>'; }).join('');
    setSheet(t('lenses'), t('lensesTitle'), '<p class="sheet-intro">' + t('lensesIntro') + ' <strong>' + t('insight') + ': ' + state.insight + '</strong>.</p><div class="lens-list">' + rows + '</div>');
  }
  function renderEncountersSheet() {
    var list = state.encounters.length ? state.encounters.map(function (encounter) { var motif = motifById(encounter.motif); var relation = encounter.relation === 'harmony' ? t('duetHarmony') : encounter.relation === 'counterpoint' ? t('duetCounterpoint') : t('yourEcho'); return '<div class="encounter-row"><span class="lens-seal">' + motif.glyph + '</span><div><strong>' + t('sourceEcho') + '</strong><p>' + relation + ' · ' + new Date(encounter.timestamp).toLocaleDateString(state.lang) + '</p></div></div>'; }).join('') : '<div class="empty">' + t('noEncounters') + '</div>';
    setSheet(t('encounters'), t('encountersTitle'), '<p class="sheet-intro">' + t('encountersIntro') + '</p><div class="share-code"><input id="echoCode" autocomplete="off" placeholder="AE3.…" aria-label="' + t('importCode') + '"><button type="button" class="primary-btn" data-import-echo="1">' + t('import') + '</button></div><span class="section-label">' + t('encounters') + '</span><div class="encounter-list">' + list + '</div>');
  }
  function renderAnomalySheet() { var anomaly = activeAnomaly(); setSheet(t('anomaly'), t(anomaly.title), '<p class="sheet-intro">' + t(anomaly.intro) + '</p><div class="decision-grid"><button type="button" class="decision preserve" data-decision="preserve"><span class="decision-mark">' + anomaly.seal + '</span><strong>' + t(anomaly.keep) + '</strong><p>' + t(anomaly.keepHint) + '</p></button><button type="button" class="decision release" data-decision="release"><span class="decision-mark">✧</span><strong>' + t(anomaly.release) + '</strong><p>' + t(anomaly.releaseHint) + '</p></button></div>'); }
  function renderResultSheet(card) { var anomaly = anomalyById(card.anomaly); var story = t(card.decision === 'preserve' ? anomaly.keepStory : anomaly.releaseStory,{pattern:t(patternKey(card.family))}); var markStory = card.marked ? '<p class="mark-story">' + t('markRevealed', { name:t(motifById(card.motif).mark) }) + '</p>' : ''; setSheet(t('recordKicker'), t('recordCreated'), '<div class="result-seal">' + anomaly.seal + '</div><h3 class="result-title">' + t(card.title) + '</h3>' + motifBadge(card) + markStory + '<p class="result-story">' + story + '</p>' + duetNote(card) + '<div class="result-actions"><button type="button" class="secondary-btn" data-share-card="' + card.id + '">' + t('shareEcho') + '</button><button type="button" class="primary-btn" data-next-field="1">' + t('nextSky') + '</button></div>'); }
  function renderChapterSheet() { var ch = chapterAt(state.chapter); setSheet(t('chapter'), t(ch.name), '<p class="sheet-intro">' + t('chapterIntro') + '</p><div class="encounter-row"><span class="lens-seal">◌</span><div><strong>' + t('observationCount',{count:state.stats.observations}) + '</strong><p>' + t('linksCount',{count:state.stats.links}) + '</p></div></div>'); }
  function renderMenuSheet() { setSheet(t('menu'), t('menuTitle'), '<p class="sheet-intro">' + t('menuIntro') + '</p><div class="menu-list"><div class="menu-row"><span class="lens-seal">⚙</span><div><strong>' + t('settings') + '</strong><p>' + t('language') + ' · ' + t('music') + '</p></div><button type="button" data-menu-action="settings">›</button></div><div class="menu-row"><span class="lens-seal">⌁</span><div><strong>' + t('leaderboard') + '</strong><p>' + t('observationCount',{count:state.stats.observations}) + '</p></div><button type="button" data-menu-action="leaderboard">›</button></div><div class="menu-row"><span class="lens-seal">★</span><div><strong>' + t('favorite') + '</strong><p>' + t('atlas') + '</p></div><button type="button" data-menu-action="favorite">›</button></div><div class="menu-row"><span class="lens-seal">⊙</span><div><strong>' + t('privacy') + '</strong><p>GamePush</p></div><button type="button" data-menu-action="privacy">›</button></div><div class="menu-row"><span class="lens-seal">↺</span><div><strong>' + t('reset') + '</strong><p>' + t('retry') + '</p></div><button type="button" data-menu-action="reset">›</button></div></div>'); }
  function renderSettingsSheet() {
    function toggle(id, title, hint) { var on = state.settings[id] !== false; return '<div class="set-row"><div><strong>' + t(title) + '</strong><span>' + t(hint) + '</span></div><button type="button" class="setting-switch ' + (on ? 'is-on' : '') + '" role="switch" aria-checked="' + on + '" data-setting="' + id + '"><span>' + t(on ? 'on' : 'off') + '</span><i class="switch-track"><b class="switch-thumb"></b></i></button></div>'; }
    var lang = function (code) { var active = state.lang === code; return '<button type="button" class="language-option ' + (active ? 'is-active' : '') + '" data-lang="' + code + '" aria-pressed="' + active + '"><span class="language-code">' + code.toUpperCase() + '</span><span class="language-name">' + t(code === 'ru' ? 'langRu' : 'langEn') + '</span><span class="language-check">' + (active ? '✓' : '') + '</span></button>'; };
    setSheet(t('settings'), t('settings'), '<div class="settings-group"><h3>' + t('language') + '</h3><p class="sheet-intro">' + t('languageHint') + '</p><div class="lang-switch">' + lang('ru') + lang('en') + '</div></div><div class="settings-group"><h3>' + t('menuTitle') + '</h3>' + toggle('music','music','musicHint') + toggle('effects','effects','effectsHint') + toggle('haptics','haptics','hapticsHint') + toggle('motion','motion','motionHint') + '</div>');
  }

  function unlockLens(id) { var lens = LENSES.filter(function (item) { return item.id === id; })[0]; if (!lens || state.lenses[id] || state.insight < lens.cost) return; state.insight -= lens.cost; state.lenses[id] = 1; audio('discovery'); haptic([10,28,10]); persist(); refreshSheet(); renderField(); }
  function toggleSetting(id) { if (!(id in state.settings)) return; state.settings[id] = !state.settings[id]; audio('setSettings', state.settings); persist(); renderField(); refreshSheet(); }

  function encodeEcho(card) { var payload = { v: 4, seed: int(card.seed), chapter: int(card.chapter), family: String(card.family || 'line'), anomaly: anomalyById(card.anomaly).id, motif: motifById(card.motif).id }; try { return 'AE3.' + btoa(JSON.stringify(payload)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); } catch (e) { return ''; } }
  function decodeEcho(code) { try { var raw = String(code || '').trim(); if (raw.indexOf('AE3.') !== 0) return null; var body = raw.slice(4).replace(/-/g,'+').replace(/_/g,'/'); while (body.length % 4) body += '='; var value = JSON.parse(atob(body)); if (!value || (value.v !== 3 && value.v !== 4) || !isFinite(value.seed) || value.chapter < 0 || value.chapter >= CHAPTERS.length || !ANOMALIES.some(function (item) { return item.id === value.anomaly; })) return null; return { seed:int(value.seed), chapter:int(value.chapter), family: typeof value.family === 'string' ? value.family : 'line', anomaly:value.anomaly, motif: value.v === 4 && MOTIFS[value.motif] ? value.motif : '' }; } catch (e) { return null; } }
  function echoCardBlob(card, code) {
    return new Promise(function (resolve) {
      try {
        var canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350; var ctx = canvas.getContext('2d'); if (!ctx) { resolve(null); return; }
        var anomaly = anomalyById(card.anomaly); var glow = card.decision === 'preserve' ? '#75e4ef' : '#aa8bff';
        var background = ctx.createLinearGradient(0, 0, 1080, 1350); background.addColorStop(0, '#101f48'); background.addColorStop(.48, '#0a1430'); background.addColorStop(1, '#060a15'); ctx.fillStyle = background; ctx.fillRect(0, 0, 1080, 1350);
        ctx.strokeStyle = 'rgba(239,200,117,.42)'; ctx.lineWidth = 3; ctx.strokeRect(42, 42, 996, 1266); ctx.strokeStyle = 'rgba(117,228,239,.19)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(540, 590, 355, 0, Math.PI * 2); ctx.stroke();
        var points = [[305,742],[354,388],[540,300],[745,398],[790,720],[540,845],[660,585]]; var signalCount = Math.min(points.length, card.signals.length || 5); ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.shadowBlur = 18; ctx.shadowColor = glow;
        (card.links || []).forEach(function (link, index) { var a = points[Number(String(link.a || '').replace(/\D/g,'')) % signalCount], b = points[Number(String(link.b || '').replace(/\D/g,'')) % signalCount]; if (!a || !b) return; ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke(); });
        for (var i = 0; i < signalCount; i++) { var p = points[i]; var radial = ctx.createRadialGradient(p[0]-4,p[1]-4,2,p[0],p[1],23); radial.addColorStop(0,'#fff'); radial.addColorStop(.3,glow); radial.addColorStop(1,'rgba(117,228,239,0)'); ctx.fillStyle=radial; ctx.beginPath(); ctx.arc(p[0],p[1],23,0,Math.PI*2); ctx.fill(); }
        var motif = motifById(card.motif); ctx.shadowBlur=0; ctx.fillStyle='#efc875'; ctx.font='700 32px Manrope, Arial'; ctx.textAlign='center'; ctx.fillText(t('title').toUpperCase(),540,135); ctx.fillStyle=card.marked ? '#efc875' : '#c5c9d8'; ctx.font='600 26px Manrope, Arial'; ctx.fillText(motif.glyph + ' ' + t(card.marked ? motif.mark : motif.name),540,950); ctx.fillStyle='#f4f0df'; ctx.font='700 74px Georgia, serif'; ctx.fillText(t(card.title),540,1015); ctx.fillStyle='#c5c9d8'; ctx.font='500 28px Manrope, Arial'; ctx.fillText(t(anomaly.title),540,1063); ctx.fillStyle='#efc875'; ctx.font='700 24px Manrope, Arial'; ctx.fillText(code,540,1215); ctx.fillStyle='#8e98b6'; ctx.font='500 21px Manrope, Arial'; ctx.fillText(t('encounters'),540,1254);
        canvas.toBlob(function (blob) { resolve(blob); }, 'image/png');
      } catch (e) { resolve(null); }
    });
  }
  async function shareCard(id) {
    var card = state.atlas.filter(function (item) { return item.id === id; })[0]; if (!card) { toast(t('cannotShare')); return; }
    var code = encodeEcho(card); if (!code) return; var text = t('shareText',{code:code}); state.stats.shared++; persist();
    if (window.GPX && GPX.share && GPX.share({ title:t('title'), text:text })) { toast(t('shareSent')); return; }
    var blob = await echoCardBlob(card, code); var file = blob ? new File([blob], 'atlas-echo-' + card.id + '.png', { type:'image/png' }) : null;
    try {
      if (file && navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))) { await navigator.share({ title:t('title'), text:text, files:[file] }); toast(t('shareSent')); return; }
      if (navigator.share) { await navigator.share({ title:t('title'), text:text }); toast(t('shareSent')); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(function () { toast(t('copied')); }).catch(function () { toast(t('shareUnavailable')); }); return; }
    toast(t('shareUnavailable'));
  }
  function importEcho() { var input = document.getElementById('echoCode'); var payload = decodeEcho(input && input.value); if (!payload) { toast(t('invalidCode')); return; } state.currentField = createField(payload.seed, payload.chapter, true, payload.anomaly, payload.motif); state.currentField.imported = true; state.currentField.challengeFamily = payload.family; selectedId=''; linkSource=''; mode='field-ready'; state.stats.imported++; persist(); closeSheet(); renderAll(); toast(t('importedWithMotif', { name:t(activeMotif().name) })); }

  function menuAction(action) {
    if (action === 'settings') { currentSheet = 'settings'; refreshSheet(); return; }
    if (action === 'leaderboard') { if (!(window.GPX && GPX.openLeaderboard && GPX.openLeaderboard())) toast(t('shareUnavailable')); return; }
    if (action === 'favorite') { if (!(window.GPX && GPX.addFavorite && GPX.addFavorite())) toast(t('shareUnavailable')); return; }
    if (action === 'privacy') { if (!(window.GPX && GPX.openPrivacy && GPX.openPrivacy())) toast(t('shareUnavailable')); return; }
    if (action === 'reset') { if (window.confirm(t('resetConfirm'))) { state = freshState(state.lang, state.settings); selectedId=''; linkSource=''; mode='field-ready'; persist(); closeSheet(); renderAll(); } }
  }

  function bindEvents() {
    el.signalLayer.addEventListener('click', function (event) { var button = event.target.closest('[data-signal]'); if (button) selectSignal(button.getAttribute('data-signal')); });
    el.listen.addEventListener('click', listenSelected); el.connect.addEventListener('click', beginConnect); el.witness.addEventListener('click', openAnomaly); el.anomaly.addEventListener('click', openAnomaly);
    el.menu.addEventListener('click', function () { openSheet('menu'); }); el.chapter.addEventListener('click', function () { openSheet('chapter'); }); el.brief.addEventListener('click', function () { openSheet('chapter'); }); el.atlas.addEventListener('click', function () { openSheet('atlas'); }); el.lenses.addEventListener('click', function () { openSheet('lenses'); }); el.encounters.addEventListener('click', function () { openSheet('encounters'); }); el.sheetClose.addEventListener('click', closeSheet);
    el.sheet.addEventListener('click', function (event) { if (event.target === el.sheet) closeSheet(); });
    el.sheetBody.addEventListener('click', function (event) {
      var node = event.target.closest('button'); if (!node) return;
      if (node.hasAttribute('data-card')) { var card = state.atlas.filter(function (item) { return item.id === node.getAttribute('data-card'); })[0]; currentSheet='record'; sheetData=card; refreshSheet(); }
      else if (node.hasAttribute('data-lens')) unlockLens(node.getAttribute('data-lens'));
      else if (node.hasAttribute('data-decision')) resolveAnomaly(node.getAttribute('data-decision'));
      else if (node.hasAttribute('data-next-field')) nextField();
      else if (node.hasAttribute('data-share-card')) shareCard(node.getAttribute('data-share-card'));
      else if (node.hasAttribute('data-import-echo')) importEcho();
      else if (node.hasAttribute('data-setting')) toggleSetting(node.getAttribute('data-setting'));
      else if (node.hasAttribute('data-lang')) setLanguage(node.getAttribute('data-lang'));
      else if (node.hasAttribute('data-menu-action')) menuAction(node.getAttribute('data-menu-action'));
    });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && currentSheet) closeSheet(); });
    window.addEventListener('nebula:pause', function () { paused=true; audio('pause'); renderField(); }); window.addEventListener('nebula:resume', function () { paused=false; audio('resume'); renderField(); });
    window.addEventListener('visibilitychange', function () { if (document.hidden) { paused=true; audio('pause'); } else { paused=false; audio('resume'); } renderField(); });
    window.addEventListener('nebula:orientation', function () { renderField(); });
  }

  function demoState() {
    var sample = freshState(detectLanguage(), {music:true,effects:true,haptics:true,motion:true}); sample.chapter=2; sample.insight=5; sample.lenses={echo:1,mirror:1,horizon:1,hush:0}; sample.stats={observations:9,links:25,constellations:9,shared:2,imported:1,witnessed:9};
    sample.atlas = [
      {id:'demo-1',seed:1425,chapter:1,signals:['pulse','whisper','beacon','ash'],links:[{a:'s0',b:'s1'},{a:'s1',b:'s2'},{a:'s2',b:'s3'}],family:'bridge',anomaly:'voice',decision:'preserve',title:'familyBridge',motif:'warm',marked:true,timestamp:now()-86400000},
      {id:'demo-2',seed:8264,chapter:2,signals:['mirror','comet','whisper'],links:[{a:'s0',b:'s1'},{a:'s1',b:'s2'},{a:'s2',b:'s0'}],family:'loop',anomaly:'letter',decision:'release',title:'familyLoop',motif:'loop',marked:true,duet:'counterpoint',timestamp:now()-3600000}
    ]; sample.currentField=createField(553189, sample.chapter, false, 'blind', 'loop'); sample.currentField.listened=['s0','s1','s2']; sample.currentField.links=[{a:'s0',b:'s1'},{a:'s1',b:'s2'},{a:'s2',b:'s0'}]; return sample;
  }

  function start() {
    if (demoMode) state = demoState(); else state = migrate(window.GPX && GPX.loadProgress ? GPX.loadProgress() : null);
    applyStaticI18n(); audio('setSettings', state.settings); bindEvents(); renderAll(); el.fill.style.width='100%'; setTimeout(function () { el.boot.classList.add('hidden'); el.app.classList.remove('hidden'); }, 230); state.welcome = true; if (!demoMode) persist();
  }
  el.fill.style.width='28%';
  if (window.GP_PROJECT_ID && window.GP_PROJECT_ID !== 'YOUR_PROJECT_ID' && window.GPX && GPX.whenReady) GPX.whenReady(start); else setTimeout(start, 90);
})();
