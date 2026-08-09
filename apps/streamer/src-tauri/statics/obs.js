(function () {
  var RECONNECT_DELAY = 2000;
  var leftHarvestsona = document.getElementById('leftHarvestsona');
  var rightHarvestsona = document.getElementById('rightHarvestsona');
  var leftImg = leftHarvestsona.querySelector('.dude');
  var rightImg = rightHarvestsona.querySelector('.dude');
  var ws = null;
  var reconnectTimer = null;

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    ws = new WebSocket('ws://' + location.host + '/ws');

    ws.onmessage = function (event) {
      try {
        var data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('Invalid WS message:', e);
      }
    };

    ws.onclose = function () {
      scheduleReconnect();
    };

    ws.onerror = function () {
      ws.close();
    };
  }

  function scheduleReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY);
  }

  var pendingUnload = { left: null, right: null };

  function handleMessage(data) {
    var side = data.side;
    var username = data.username;
    var show = data.show;

    var badge = side === 'left' ? leftHarvestsona : rightHarvestsona;
    var img = side === 'left' ? leftImg : rightImg;

    if (!badge || !img) return;

    cancelUnload(side);

    if (show) {
      var newSrc = '/harvestsona/' + encodeURIComponent(username) + '?t=' + Date.now();
      if (img.src !== newSrc) {
        img.src = newSrc;
      }
      revealWhenLoaded(badge, img);
    } else {
      badge.classList.remove('show');
      scheduleUnload(side, badge, img);
    }
  }

  function revealWhenLoaded(badge, img) {
    function doReveal() {
      badge.classList.remove('show');
      void badge.offsetWidth;
      badge.classList.add('show');
    }
    if (img.complete && img.naturalWidth > 0) {
      doReveal();
    } else {
      var onDone = function () {
        img.removeEventListener('load', onDone);
        img.removeEventListener('error', onDone);
        doReveal();
      };
      img.addEventListener('load', onDone);
      img.addEventListener('error', onDone);
    }
  }

  function scheduleUnload(side, badge, img) {
    var done = false;
    function unload() {
      if (done) return;
      done = true;
      badge.removeEventListener('transitionend', onEnd);
      clearTimeout(timer);
      img.src = '';
      pendingUnload[side] = null;
    }
    function onEnd(e) {
      if (e.propertyName === 'transform') unload();
    }
    badge.addEventListener('transitionend', onEnd);
    var timer = setTimeout(unload, 520);
    pendingUnload[side] = { unload: unload, timer: timer, listener: onEnd, badge: badge };
  }

  function cancelUnload(side) {
    var h = pendingUnload[side];
    if (h) {
      h.badge.removeEventListener('transitionend', h.listener);
      clearTimeout(h.timer);
      pendingUnload[side] = null;
    }
  }

  connect();
})();
