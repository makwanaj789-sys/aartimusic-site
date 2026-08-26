/* ============================================================
   THE FLAME RING
   A circle of bars that breathes like a diya flame and reads
   like an equaliser. Colours and size come from config.js.
   Skipped entirely if the visitor prefers reduced motion.
   ============================================================ */
(function(){
  if (typeof THREE === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cfg    = (window.AARTI && window.AARTI.ring) || {};
  var COUNT  = cfg.bars   || 72;
  var RADIUS = cfg.radius || 6.2;
  var SPEED  = (cfg.speed === undefined) ? 0.085 : cfg.speed;
  var FOLLOW = cfg.follow !== false;

  var canvas = document.getElementById('ring');
  if (!canvas) return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas:canvas, antialias:true, alpha:true });
  } catch(e){ return; }   // no WebGL — the page still works, just flat

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  var scene  = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);

  var group = new THREE.Group();
  scene.add(group);

  var cHot  = new THREE.Color(cfg.hot  || '#FFD166');
  var cMid  = new THREE.Color(cfg.mid  || '#FF9B3D');
  var cCool = new THREE.Color(cfg.cool || '#E2504A');

  var bars = [];

  for (var i = 0; i < COUNT; i++){
    var t   = i / COUNT;
    var geo = new THREE.BoxGeometry(0.17, 1, 0.17);
    geo.translate(0, 0.5, 0);                 // grow upward from the base

    var col = (t > 0.5)
      ? cMid.clone().lerp(cHot, (t - 0.5) * 2)
      : cCool.clone().lerp(cMid, t * 2);

    var mat = new THREE.MeshBasicMaterial({ color:col, transparent:true, opacity:0.85 });
    var bar = new THREE.Mesh(geo, mat);

    var a = t * Math.PI * 2;
    bar.position.set(Math.cos(a) * RADIUS, 0, Math.sin(a) * RADIUS);
    bar.rotation.y = -a;

    group.add(bar);
    bars.push({ mesh:bar, phase:t * Math.PI * 4 });
  }

  // faint ground ring, for depth
  var ringMat = new THREE.MeshBasicMaterial({
    color:cfg.mid || '#FF9B3D', transparent:true, opacity:0.16, side:THREE.DoubleSide
  });
  var ground = new THREE.Mesh(
    new THREE.RingGeometry(RADIUS - 0.08, RADIUS + 0.08, 128), ringMat
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  window.__ringTheme = function(mode){
    var o = (mode === 'day') ? 0.55 : 0.85;
    bars.forEach(function(b){ b.mesh.material.opacity = o; });
    ringMat.opacity = (mode === 'day') ? 0.10 : 0.16;
  };
  window.__ringTheme(document.documentElement.getAttribute('data-theme'));

  function resize(){
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w < 640 ? 20  : 15;    // pull back so it fits on phones
    camera.position.y = w < 640 ? 8.5 : 7.2;
    camera.lookAt(0, 0.4, 0);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // the ring leans toward the pointer, easing rather than snapping
  var aimX = 0, aimY = 0, leanX = 0, leanY = 0;
  if (FOLLOW && !window.matchMedia('(hover: none)').matches){
    window.addEventListener('pointermove', function(e){
      aimY = (e.clientX / window.innerWidth  - 0.5) * 0.42;
      aimX = (e.clientY / window.innerHeight - 0.5) * 0.30;
    }, { passive:true });
  }

  // stop rendering when the tab is hidden — saves battery
  var running = true;
  document.addEventListener('visibilitychange', function(){
    running = !document.hidden;
    if (running) tick();
  });

  var t0 = performance.now();
  function tick(){
    if (!running) return;
    requestAnimationFrame(tick);

    var t = (performance.now() - t0) / 1000;

    leanX += (aimX - leanX) * 0.045;          // ease toward the pointer
    leanY += (aimY - leanY) * 0.045;

    group.rotation.y = t * SPEED + leanY;
    group.rotation.x = leanX;

    for (var i = 0; i < bars.length; i++){
      var b    = bars[i];
      var wave = Math.sin(t * 1.15 + b.phase) * 0.5 + 0.5;
      var slow = Math.sin(t * 0.42 + b.phase * 0.35) * 0.5 + 0.5;
      b.mesh.scale.y = 0.5 + wave * 1.7 + slow * 1.1;
    }
    renderer.render(scene, camera);
  }
  tick();
})();