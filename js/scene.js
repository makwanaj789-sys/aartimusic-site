/* One GPU particle field, three scroll-driven forms. No per-frame layout reads.
   Native scrolling stays in charge; quality changes resolution, never scroll speed. */
(function () {
  'use strict';
  var canvas = document.getElementById('scene');
  var button = document.getElementById('sceneToggle');
  var root = document.documentElement;
  function fallback() {
    root.classList.add('no-webgl');
    if (button) button.hidden = true;
  }
  if (!canvas || !window.THREE) { fallback(); return; }
  var preference = matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = preference.matches, paused = false, lost = false;
  var small = innerWidth < 760;
  var weak = (navigator.hardwareConcurrency || 6) < 4 || (navigator.deviceMemory || 8) < 4;
  var saveData = navigator.connection && navigator.connection.saveData;
  var cfg = (window.AARTI && window.AARTI.scene) || {};
  var count = Math.min(cfg.particles || 42000, small ? 14000 : 42000);
  if (weak || saveData) count = 6000;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: false,
      powerPreference: 'default', depth: false, stencil: false});
  } catch (_) { fallback(); return; }
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(46, 1, .1, 100);
  camera.position.z = 18;
  var rig = new THREE.Group();
  scene.add(rig);
  var seeds = new Float32Array(count * 3);
  for (var i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  var geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  var uniforms = {
    time: {value: 0}, form: {value: 0}, pulse: {value: 0},
    pixel: {value: 1}, hue: {value: 0}, day: {value: 0}, aim: {value: new THREE.Vector2()}
  };
  var material = new THREE.ShaderMaterial({
    uniforms: uniforms, transparent: true, depthWrite: false, depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: [
      'uniform float time,form,pulse,pixel; uniform vec2 aim;',
      'varying float tone,light; const float PI=3.14159265;',
      'void main(){',
      'float a=position.x*2.0*PI; float b=position.y*2.0*PI;',
      'float r=3.7+0.85*cos(b)+0.22*sin(a*5.0+time*.6);',
      'vec3 ring=vec3(r*cos(a),r*sin(a),.85*sin(b));',
      'ring.xy*=1.0+pulse*.035;',
      'float z=position.y*2.0-1.0; float sr=sqrt(max(0.0,1.0-z*z));',
      'vec3 sphere=vec3(sr*cos(a),z,sr*sin(a))*(3.6+.18*sin(b*8.0+time));',
      'float x=(position.x-.5)*15.0;',
      'vec3 wave=vec3(x,sin(x*.65+time*.45+b)*1.5,cos(x*.45+b)*2.0);',
      'vec3 p=mix(ring,sphere,smoothstep(0.0,1.0,form));',
      'p=mix(p,wave,smoothstep(1.0,2.0,form));',
      'p+=normalize(p+.001)*(position.z-.5)*.28;',
      'vec2 delta=p.xy-aim*4.0; p.xy+=delta*.22/(1.0+dot(delta,delta));',
      'vec4 mv=modelViewMatrix*vec4(p,1.0);',
      'gl_Position=projectionMatrix*mv;',
      'gl_PointSize=clamp(pixel*(18.0+position.z*26.0)/max(1.0,-mv.z),1.0,4.0*pixel);',
      'tone=position.x+position.y*.2; light=.35+position.z*.65;',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float hue,day; varying float tone,light;',
      'void main(){',
      'vec2 p=gl_PointCoord-.5; float d=dot(p,p); if(d>.25)discard;',
      'vec3 c=.5+.5*cos(6.28318*(tone*.65+hue+vec3(.05,.36,.58)));',
      'c=mix(c,vec3(.12,.9,1.),.22); c=mix(c,c*.45,day);',
      'gl_FragColor=vec4(c,(1.0-smoothstep(.0,.25,d))*light*.68);',
      '}'
    ].join('\n')
  });
  var field = new THREE.Points(geometry, material);
  field.frustumCulled = false;
  rig.add(field);
  // Thin orbital contours give the cloud a readable three-dimensional silhouette.
  var orbits = [];
  for (var j = 0; j < 3; j++) {
    var points = [];
    for (var k = 0; k < 160; k++) {
      var angle = k / 160 * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * (4.9 + j * .3), Math.sin(angle) * (4.9 + j * .3), 0));
    }
    var line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({color: j === 1 ? 0x73f4de : 0x6495ff, transparent: true, opacity: .3}));
    line.rotation.set(j * .62, j * .48, j * .25);
    rig.add(line); orbits.push(line);
  }
  var quality = 1, raf = 0, previous = 0, elapsed = 0, bad = 0, kick = 0;
  var stage = 0, hero = 0, galleryTop = 0, galleryHeight = 1, heroHeight = 1;
  var gallery = document.getElementById('effects');
  var heroEl = document.getElementById('hero');
  function size() {
    small = innerWidth < 760;
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small || weak ? 1.25 : 1.7) * quality);
    renderer.setSize(w, h, false);
    uniforms.pixel.value = renderer.getPixelRatio();
    camera.aspect = w / h; camera.updateProjectionMatrix();
    heroHeight = heroEl ? heroEl.offsetHeight : h;
    if (gallery) {
      galleryTop = gallery.getBoundingClientRect().top + scrollY;
      galleryHeight = Math.max(1, gallery.offsetHeight - h);
    }
    scroll();
  }
  function scroll() {
    hero = Math.min(1, scrollY / Math.max(1, heroHeight));
    stage = hero + Math.max(0, Math.min(1, (scrollY - galleryTop) / galleryHeight));
    request();
  }
  function theme() {
    var day = root.getAttribute('data-theme') === 'day';
    uniforms.day.value = day ? 1 : 0;
    material.blending = day ? THREE.NormalBlending : THREE.AdditiveBlending;
    material.needsUpdate = true; request();
  }
  function label() {
    if (!button) return;
    button.hidden = reduced;
    button.textContent = paused ? 'Resume 3D' : 'Pause 3D';
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume 3D background animation' : 'Pause 3D background animation');
  }
  function frame(now) {
    raf = 0;
    if (document.hidden || lost) return;
    var dt = previous ? Math.min(now - previous, 100) : 16.67;
    previous = now;
    var still = reduced || paused;
    if (!still) elapsed += dt / 1000;
    // Sustained missed frames lower fill cost, without imposing a 30 FPS cap.
    if (!still && dt > 24) bad++; else bad = Math.max(0, bad - 1);
    if (bad > 50 && quality > .6) {
      quality = Math.max(.6, quality - .15); bad = 0; size();
    }
    var motion = window.AARTI_MOTION;
    if (!still && motion && motion.update) motion.update(dt);
    var x = still || !motion ? 0 : motion.x;
    var y = still || !motion ? 0 : motion.y;
    kick *= Math.exp(-dt / 350);
    uniforms.time.value = elapsed;
    uniforms.form.value = reduced ? 0 : stage;
    uniforms.pulse.value = still ? 0 : Math.sin(elapsed * 1.8) * .5 + kick;
    uniforms.aim.value.set(x, y);
    rig.position.set(small ? 0 : (1 - hero) * 4.7, small ? (1 - hero) * 3.3 : 0, 0);
    rig.scale.setScalar(small ? .68 : 1);
    rig.rotation.set(still ? .15 : y * .16, still ? -.25 : -.25 + x * .3 + Math.sin(elapsed * .16) * .25, still ? 0 : elapsed * .035);
    orbits.forEach(function(line, index) {
      line.rotation.y = index * .48 + (still ? 0 : elapsed * .08);
      line.material.opacity = (.22 - hero * .12) * (uniforms.day.value ? .65 : 1);
    });
    renderer.render(scene, camera);
    if (!still) request();
  }
  function request() { if (!raf && !document.hidden && !lost) raf = requestAnimationFrame(frame); }
  if (button) button.addEventListener('click', function() {
    paused = !paused; previous = 0; label(); request();
  });
  function preferenceChanged() { reduced = preference.matches; previous = 0; label(); request(); }
  if (preference.addEventListener) preference.addEventListener('change', preferenceChanged);
  else preference.addListener(preferenceChanged);
  addEventListener('scroll', scroll, {passive: true});
  var resizeTimer;
  addEventListener('resize', function() { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); }, {passive: true});
  addEventListener('load', size);
  if (document.fonts) document.fonts.ready.then(size);
  if (window.ResizeObserver && document.querySelector('main')) new ResizeObserver(size).observe(document.querySelector('main'));
  document.addEventListener('visibilitychange', function() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; previous = 0; request();
  });
  canvas.addEventListener('webglcontextlost', function(e) {
    e.preventDefault(); lost = true; if (raf) cancelAnimationFrame(raf); raf = 0; fallback();
  });
  canvas.addEventListener('webglcontextrestored', function() {
    lost = false; root.classList.remove('no-webgl'); previous = 0; label(); size(); request();
  });
  root.addEventListener('aarti:themechange', theme);
  root.addEventListener('aarti:effect', function(e) {
    kick = 1; uniforms.hue.value = ((e.detail && e.detail.index) || 0) * .075; request();
  });
  label(); size(); theme();
})();
