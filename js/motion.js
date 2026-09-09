/* ============================================================
   MOTION INPUT
   One place that answers "which way is the visitor leaning?"
   Reads a mouse, a dragging finger, or the phone's own tilt,
   and hands back two smoothed numbers between -1 and 1.

   scene.js and tilt.js both read from here, so the whole page
   leans together instead of each piece guessing separately.

   window.AARTI_MOTION
     .x  .y        smoothed lean, -1 .. 1
     .source       'idle' | 'pointer' | 'touch' | 'gyro'
     .active       true once any real input has arrived
   ============================================================ */
(function(){

  var M = window.AARTI_MOTION = { x:0, y:0, source:'idle', active:false };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cfg  = (window.AARTI && window.AARTI.motion) || {};
  var EASE = cfg.ease === undefined ? 0.075 : cfg.ease;
  var GYRO = cfg.gyro !== false;

  var aimX = 0, aimY = 0, lastTouch = 0;

  function clamp(v){ return v < -1 ? -1 : (v > 1 ? 1 : v); }

  window.addEventListener('pointermove', function(e){
    if (e.pointerType === 'touch') return;     // fingers handled below
    aimX = clamp((e.clientX / window.innerWidth  - 0.5) * 2);
    aimY = clamp((e.clientY / window.innerHeight - 0.5) * 2);
    M.source = 'pointer'; M.active = true;
  }, { passive:true });

  /* A drag anywhere steers the scene, and beats gyro for a couple
     of seconds after — so a deliberate swipe isn't fighting the
     hand holding the phone. */
  function fromTouch(e){
    var t = e.touches && e.touches[0];
    if (!t) return;
    aimX = clamp((t.clientX / window.innerWidth  - 0.5) * 2);
    aimY = clamp((t.clientY / window.innerHeight - 0.5) * 2);
    lastTouch = Date.now();
    M.source = 'touch'; M.active = true;
  }
  window.addEventListener('touchstart', fromTouch, { passive:true });
  window.addEventListener('touchmove',  fromTouch, { passive:true });

  function onOrient(e){
    if (e.gamma === null || e.beta === null) return;
    if (Date.now() - lastTouch < 2200) return;   // a recent drag wins

    // gamma: left/right roll. beta: front/back pitch, where 45deg is
    // roughly how people hold a phone while reading.
    aimX = clamp(e.gamma / 32);
    aimY = clamp((e.beta - 45) / 32);
    M.source = 'gyro'; M.active = true;
  }

  function listenGyro(){
    window.addEventListener('deviceorientation', onOrient, { passive:true });
  }

  if (GYRO && window.DeviceOrientationEvent){
    if (typeof DeviceOrientationEvent.requestPermission === 'function'){
      // iOS 13+ needs a real tap before it hands over the sensor
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

  /* Raw input is jittery, especially a gyroscope. Easing toward
     the target every frame turns it into drift. */
  var running = true;
  document.addEventListener('visibilitychange', function(){
    running = !document.hidden;
    if (running) loop();
  });

  function loop(){
    if (!running) return;
    requestAnimationFrame(loop);
    M.x += (aimX - M.x) * EASE;
    M.y += (aimY - M.y) * EASE;
  }
  loop();
})();
