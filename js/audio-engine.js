/*
 * Lightweight audio layer for Atlas of Echoes.

  Music starts only after a player gesture. Effects are synthesized through Web Audio.
*/
(function (w) {
  var context = null;
  var master = null;
  var unlocked = false;
  var paused = false;
  var settings = { music: true, effects: true };
  var music = new Audio('assets/atlas-echoes-nocturne.mp3');
  music.loop = true;
  music.preload = 'metadata';
  music.volume = 0.16;

  function ensureContext() {
    if (context) return context;
    var Ctx = w.AudioContext || w.webkitAudioContext;
    if (!Ctx) return null;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = 0.72;
    master.connect(context.destination);
    return context;
  }
  function applyMusic() {
    if (!unlocked || paused || !settings.music) {
      music.pause();
      return;
    }
    // A first user gesture authorizes both Web Audio and HTML media. Explicitly
    // loading here makes the music request reliable in embedded WebViews too.
    if (music.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      try { music.load(); } catch (e) {}
    }
    music.play().catch(function () {});
  }
  function unlock(nextSettings) {
    if (nextSettings) setSettings(nextSettings);
    unlocked = true;
    var ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
    applyMusic();
  }
  function setSettings(next) {
    settings.music = !next || next.music !== false;
    settings.effects = !next || next.effects !== false;
    applyMusic();
  }
  function tone(frequency, duration, kind, volume, endFrequency) {
    if (!unlocked || paused || !settings.effects) return;
    var ctx = ensureContext();
    if (!ctx || !master) return;
    var start = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = kind || 'sine';
    osc.frequency.setValueAtTime(frequency, start);
    if (endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume || 0.035, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
  function chord(notes, duration, volume) {
    notes.forEach(function (note, index) {
      setTimeout(function () { tone(note, duration, 'sine', volume || 0.025, note * 1.008); }, index * 35);
    });
  }

  w.NebulaAudio = {
    setSettings: setSettings,
    unlock: unlock,
    tap: function (kind) { tone(kind === 'crit' ? 760 : 430, kind === 'crit' ? .15 : .07, 'sine', kind === 'crit' ? .055 : .026, kind === 'crit' ? 1120 : 520); },
    purchase: function () { tone(520, .08, 'triangle', .03, 660); setTimeout(function () { tone(780, .12, 'sine', .028, 930); }, 55); },
    research: function () { chord([392, 494, 587], .22, .028); },
    riftOpen: function () { tone(210, .34, 'sawtooth', .02, 720); },
    rift: function () { chord([523, 659, 784], .25, .04); },
    reward: function () { chord([440, 554, 659, 880], .28, .03); },
    discovery: function () { chord([330, 415, 494, 659], .5, .032); },
    collapse: function () { tone(170, .55, 'sine', .06, 42); setTimeout(function () { tone(740, .38, 'triangle', .035, 300); }, 240); },
    pause: function () {
      paused = true;
      music.pause();
      if (context && context.state === 'running') context.suspend().catch(function () {});
    },
    resume: function () {
      paused = false;
      if (unlocked && context && context.state === 'suspended') context.resume().catch(function () {});
      applyMusic();
    },
    getMusicStatus: function () {
      return {
        unlocked: unlocked,
        enabled: settings.music,
        paused: music.paused,
        networkState: music.networkState,
        readyState: music.readyState,
        source: music.currentSrc || music.src,
        error: music.error ? music.error.message : ''
      };
    }
  };
})(window);
