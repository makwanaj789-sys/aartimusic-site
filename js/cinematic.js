/* ============================================================
   CINEMATIC SCROLL SYSTEM
   Keeps the AartiMusic page in one visual world. DOM motion is
   transform/opacity based; the WebGL scene reads the same shared
   progress object from scene.js.
   ============================================================ */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var main = document.querySelector('main');
  var sections = [].slice.call(document.querySelectorAll('.cinematic-section'));
  if (!main || !sections.length) return;

  var state = window.AARTI_SCROLL = { y:0, progress:0, hero:0, chapter:0 };
  var pending = false;
  var raf = 0;

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function smooth(t){ return t*t*(3-2*t); }

  function measure(){
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    state.y = scrollY;
    state.progress = clamp(scrollY / max, 0, 1);
    var vh = innerHeight || 1;
    var heroProgress = clamp(scrollY / (vh * 1.05), 0, 1);
    state.hero = smooth(heroProgress);

    root.style.setProperty('--page-progress', state.progress.toFixed(4));
    root.style.setProperty('--hero-progress', state.hero.toFixed(4));

    if (!reduced){
      sections.forEach(function(section, i){
        var r = section.getBoundingClientRect();
        var center = r.top + r.height * 0.5;
        var local = clamp(1 - Math.abs(center - vh * 0.54) / (vh * 1.15), 0, 1);
        var enter = smooth(clamp((vh - r.top) / (vh * 0.75), 0, 1));
        var leave = smooth(clamp(r.bottom / (vh * 0.75), 0, 1));
        var focus = local * 0.72 + enter * leave * 0.28;
        section.style.setProperty('--focus', focus.toFixed(3));
        section.style.setProperty('--depth', ((i + 1) * 0.08 + (1-focus) * 0.35).toFixed(3));
        section.classList.toggle('is-focus', focus > 0.52);
      });
    }
  }

  function request(){
    if (pending) return;
    pending = true;
    raf = requestAnimationFrame(function(){ pending = false; measure(); });
  }

  window.addEventListener('scroll', request, {passive:true});
  window.addEventListener('resize', request, {passive:true});
  window.addEventListener('orientationchange', request, {passive:true});
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(request);
  measure();

  /* hero choreography: keep the wordmark physically tied to the scene */
  var hero = document.getElementById('hero');
  var heroCopy = hero && hero.querySelector('.hero-copy');
  var art = hero && hero.querySelector('.hero-art-wrap');
  var meta = hero && hero.querySelectorAll('.hero-meta');
  var bottom = hero && hero.querySelector('.hero-bottom');

  function heroFrame(){
    if (!hero || reduced) return;
    var p = state.hero;
    var lift = p * -11;
    var scale = 1 - p * 0.10;
    if (heroCopy) heroCopy.style.transform = 'translate3d(0,' + lift.toFixed(1) + 'vh,0) scale(' + scale.toFixed(3) + ')';
    if (art) art.style.transform = 'translate3d(0,' + (p * -6).toFixed(1) + 'vh,0) scale(' + (1 + p * .12).toFixed(3) + ') rotate(' + (p * -2.5).toFixed(2) + 'deg)';
    if (meta) meta.forEach(function(el,i){ el.style.transform = 'translate3d(' + ((i ? 1 : -1) * p * 4).toFixed(1) + 'vw,' + (p * -4).toFixed(1) + 'vh,0)'; el.style.opacity = String(1 - p * .75); });
    if (bottom) bottom.style.opacity = String(1 - p * 1.5);
  }

  function loop(){
    heroFrame();
    requestAnimationFrame(loop);
  }
  if (!reduced) requestAnimationFrame(loop);

  /* cinematic anchor navigation */
  document.querySelectorAll('.menu a, .brand, .nav-open, .btn, footer a[href^="#"]').forEach(function(link){
    link.addEventListener('click', function(e){
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) !== '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'});
    });
  });
})();
