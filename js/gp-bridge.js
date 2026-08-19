/*
  Обёртка GamePush.
  Все вызовы безопасны: без токена или на неподдерживаемой площадке игра живёт на localStorage.
  Поля и реклама настраиваются в панели — см. README.
*/
(function (w) {
  var gp = null;
  var ready = false;
  var readyWaiters = [];
  var KEY = 'nebula-heart-save-v1';

  function whenReady(fn) {
    if (ready) fn(gp);
    else readyWaiters.push(fn);
  }

  function markReady(instance) {
    gp = instance || null;
    ready = true;
    readyWaiters.splice(0).forEach(function (fn) { fn(gp); });
  }

  w.onGPInit = async function (instance) {
    try {
      await instance.player.ready;
      try { await instance.ads.showPreloader(); } catch (e) {}
      try { instance.ads.showSticky(); } catch (e) {}
      try { instance.gameStart(); } catch (e) {}
      try { instance.gameplayStart(); } catch (e) {}
      instance.on('pause', function () { w.dispatchEvent(new Event('nebula:pause')); });
      instance.on('resume', function () { w.dispatchEvent(new Event('nebula:resume')); });
      markReady(instance);
    } catch (err) {
      console.warn('[GP] init fallback', err);
      markReady(null);
    }
  };

  /* Если SDK не подключён — не ждём вечно */
  setTimeout(function () {
    if (!ready) markReady(null);
  }, 3500);

  function localLoad() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }
  function localSave(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  w.GPX = {
    whenReady: whenReady,
    has: function () { return !!gp; },
    raw: function () { return gp; },

    loadProgress: function () {
      if (gp) {
        try {
          var raw = gp.player.get('progress');
          if (raw) return JSON.parse(raw);
        } catch (e) {}
      }
      return localLoad();
    },

    saveProgress: async function (data, score) {
      localSave(data);
      if (!gp) return;
      try {
        gp.player.set('progress', JSON.stringify(data));
        if (typeof score === 'number') gp.player.set('score', score);
        await gp.player.sync();
      } catch (e) {
        console.warn('[GP] sync skipped', e);
      }
    },

    openLeaderboard: function () {
      if (!gp || !gp.leaderboard) return false;
      try {
        gp.leaderboard.open({
          orderBy: ['score'],
          order: 'DESC',
          limit: 20,
          withMe: 'last'
        });
        return true;
      } catch (e) { return false; }
    },

    showRewarded: async function () {
      if (!gp || !gp.ads) return false;
      try {
        if (gp.ads.isRewardedAvailable === false) return false;
        var res = await gp.ads.showRewardedVideo({ showFailedOverlay: true });
        return !!(res && (res === true || res.success || res.reward));
      } catch (e) { return false; }
    },

    showFullscreen: async function () {
      if (!gp || !gp.ads) return;
      try {
        if (gp.ads.isFullscreenAvailable === false) return;
        await gp.ads.showFullscreen({ showCountdownOverlay: true });
      } catch (e) {}
    },

    openPrivacy: function () {
      if (!gp || !gp.documents) return false;
      try {
        gp.documents.open({ type: 'PLAYER_PRIVACY_POLICY' });
        return true;
      } catch (e) { return false; }
    },

    invite: function () {
      if (!gp || !gp.socials) return false;
      try {
        if (typeof gp.socials.invite === 'function') { gp.socials.invite(); return true; }
        if (typeof gp.socials.share === 'function') {
          gp.socials.share({ text: 'Собираю звёздную пыль в «Сердце Туманности»' });
          return true;
        }
      } catch (e) {}
      return false;
    },

    addFavorite: function () {
      if (!gp) return false;
      try {
        if (gp.app && typeof gp.app.addShortcut === 'function') { gp.app.addShortcut(); return true; }
        if (gp.socials && typeof gp.socials.addToFavorites === 'function') {
          gp.socials.addToFavorites(); return true;
        }
      } catch (e) {}
      return false;
    }
  };
})(window);
