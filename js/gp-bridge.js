/*
  GamePush platform bridge.
  The game remains fully playable without SDK credentials and uses localStorage in that case.
*/
(function (w) {
  var gp = null;
  var ready = false;
  var readyWaiters = [];
  var orientationWaiters = [];
  var KEY = 'nebula-heart-save-v2';
  var LEGACY_KEY = 'nebula-heart-save-v1';
  var syncTail = Promise.resolve();

  function whenReady(fn) {
    if (ready) fn(gp);
    else readyWaiters.push(fn);
  }

  function markReady(instance) {
    if (ready) return;
    gp = instance || null;
    ready = true;
    readyWaiters.splice(0).forEach(function (fn) {
      try { fn(gp); } catch (e) { console.warn('[GP] ready callback skipped', e); }
    });
  }

  function emitOrientation(value) {
    orientationWaiters.forEach(function (fn) {
      try { fn(!!value); } catch (e) {}
    });
    w.dispatchEvent(new CustomEvent('nebula:orientation', { detail: { portrait: !!value } }));
  }

  w.onGPInit = async function (instance) {
    try {
      await instance.player.ready;
      try { if (instance.ads && instance.ads.isPreloaderAvailable !== false) await instance.ads.showPreloader(); } catch (e) {}
      try { if (instance.ads && instance.ads.isStickyAvailable !== false) instance.ads.showSticky(); } catch (e) {}
      try { instance.gameStart(); } catch (e) {}
      try { instance.gameplayStart(); } catch (e) {}
      try { instance.on('pause', function () { w.dispatchEvent(new Event('nebula:pause')); }); } catch (e) {}
      try { instance.on('resume', function () { w.dispatchEvent(new Event('nebula:resume')); }); } catch (e) {}
      try { instance.on('change:orientation', emitOrientation); } catch (e) {}
      try {
        if (instance.ads && typeof instance.ads.on === 'function') {
          instance.ads.on('start', function () { w.dispatchEvent(new Event('nebula:pause')); });
          instance.ads.on('close', function () { w.dispatchEvent(new Event('nebula:resume')); });
        }
      } catch (e) {}
      markReady(instance);
      emitOrientation(instance.isPortrait);
    } catch (err) {
      console.warn('[GP] initialization fallback', err);
      markReady(null);
    }
  };

  setTimeout(function () { markReady(null); }, 3800);

  function localLoad() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY) || 'null');
    } catch (e) { return null; }
  }
  function localSave(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function serverNow() {
    if (gp && gp.serverTime) {
      var stamped = new Date(gp.serverTime).getTime();
      if (isFinite(stamped)) return stamped;
    }
    return Date.now();
  }

  w.GPX = {
    whenReady: whenReady,
    has: function () { return !!gp; },
    raw: function () { return gp; },
    now: serverNow,

    platformLang: function () {
      if (gp && gp.language) return String(gp.language).slice(0, 2).toLowerCase();
      return '';
    },

    device: function () {
      return {
        mobile: gp ? !!gp.isMobile : /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
        portrait: gp && typeof gp.isPortrait === 'boolean' ? gp.isPortrait : w.matchMedia('(orientation: portrait)').matches
      };
    },

    onOrientation: function (fn) {
      if (typeof fn !== 'function') return;
      orientationWaiters.push(fn);
    },

    setLanguage: function (code) {
      if (!gp || typeof gp.changeLanguage !== 'function') return;
      try { gp.changeLanguage(code); } catch (e) {}
    },

    loadProgress: function () {
      if (gp) {
        try {
          var raw = gp.player.get('progress');
          if (raw) return JSON.parse(raw);
        } catch (e) {}
      }
      return localLoad();
    },

    saveProgress: function (data, score) {
      localSave(data);
      if (!gp) return Promise.resolve(false);
      syncTail = syncTail.catch(function () {}).then(function () {
        try {
          gp.player.set('progress', JSON.stringify(data));
          if (typeof score === 'number' && isFinite(score)) gp.player.set('score', Math.max(0, Math.floor(score)));
          return Promise.resolve(gp.player.sync()).then(function () { return true; });
        } catch (e) {
          console.warn('[GP] sync skipped', e);
          return false;
        }
      });
      return syncTail;
    },

    openLeaderboard: function () {
      if (!gp || !gp.leaderboard) return false;
      try {
        gp.leaderboard.open({ orderBy: ['score'], order: 'DESC', limit: 20, withMe: 'last', showNearest: 3 });
        return true;
      } catch (e) { return false; }
    },

    showRewarded: async function () {
      if (!gp || !gp.ads) return false;
      try {
        if (gp.ads.isRewardedAvailable === false) return false;
        var result = await gp.ads.showRewardedVideo({ showFailedOverlay: true });
        return !!(result === true || (result && (result.success || result.reward)));
      } catch (e) { return false; }
    },

    showFullscreen: async function () {
      if (!gp || !gp.ads) return false;
      try {
        if (gp.ads.isFullscreenAvailable === false) return false;
        await gp.ads.showFullscreen({ showCountdownOverlay: true });
        return true;
      } catch (e) { return false; }
    },

    openPrivacy: function () {
      if (!gp || !gp.documents) return false;
      try { gp.documents.open({ type: 'PLAYER_PRIVACY_POLICY' }); return true; } catch (e) { return false; }
    },

    invite: function (text) {
      if (!gp || !gp.socials) return false;
      try {
        if (typeof gp.socials.invite === 'function') { gp.socials.invite(); return true; }
        if (typeof gp.socials.share === 'function') { gp.socials.share({ text: text || '' }); return true; }
      } catch (e) {}
      return false;
    },

    share: function (payload) {
      if (!gp || !gp.socials || typeof gp.socials.share !== 'function') return false;
      try { gp.socials.share(payload || {}); return true; } catch (e) { return false; }
    },

    addFavorite: function () {
      if (!gp) return false;
      try {
        if (gp.app && typeof gp.app.addShortcut === 'function') { gp.app.addShortcut(); return true; }
        if (gp.socials && typeof gp.socials.addToFavorites === 'function') { gp.socials.addToFavorites(); return true; }
      } catch (e) {}
      return false;
    }
  };
})(window);
