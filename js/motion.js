/* ============================================================
   MOTION INPUT
   Input is event-driven. The WebGL scene is the single animation
   scheduler and smooths these targets while it renders, so this
   module never owns an always-running RAF loop.
   ============================================================ */
(function(){
  var M = window.AARTI_MOTION = {
    x:0, y:0, source:'idle', active:false,
    targetX:0, targetY:0
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cfg  = (window.AARTI && window.AARTI.motion) || {};
  M.ease  = cfg.ease === undefined ? 0.075 : cfg.ease;
  var GYRO = cfg.gyro !== false;
  var aimX = 0, aimY = 0, lastTouch = 0;

  function clamp(v){ return v < -1 ? -1 : (v > 1 ? 1 : v); }
  function setAim(x, y, source){
    aimX = clamp(x); aimY = clamp(y);
    M.targetX = aimX; M.targetY = aimY;
    M.source = source; M.active = true;
  }

  window.addEventListener('pointermove', function(e){
    if (e.pointerType === 'touch') return;
    setAim((e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
           (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
           'pointer');
  }, { passive:true });

  function fromTouch(e){
    var t = e.touches && e.touches[0];
    if (!t) return;
    lastTouch = Date.now();
    setAim((t.clientX / Math.max(1, window.innerWidth) - 0.5) * 2,
           (t.clientY / Math.max(1, window.innerHeight) - 0.5) * 2,
           'touch');
  }
  window.addEventListener('touchstart', fromTouch, { passive:true });
  window.addEventListener('touchmove',  fromTouch, { passive:true });

  function onOrient(e){
    if (e.gamma === null || e.beta === null) return;
    if (Date.now() - lastTouch < 2200) return;
    setAim(e.gamma / 32, (e.beta - 45) / 32, 'gyro');
  }

  function listenGyro(){
    window.addEventListener('deviceorientation', onOrient, { passive:true });
  }

  if (GYRO && window.DeviceOrientationEvent){
    if (typeof DeviceOrientationEvent.requestPermission === 'function'){
      var ask = function(){
        DeviceOrientationEvent.requestPermission()
          .then(function(s){ if (s === 'granted') listenGyro(); })
          .catch(function(){});
        window.removeEventListener('touchend', ask);
        window.removeEventListener('click', ask);
      };
      window.addEventListener('touchend', ask, { once:true });
      window.addEventListener('click', ask, { once:true });
    } else {
      listenGyro();
    }
  }

  // The scene scheduler calls this once per rendered frame.
  M.update = function(){
    M.x += (M.targetX - M.x) * M.ease;
    M.y += (M.targetY - M.y) * M.ease;
  };
})();
