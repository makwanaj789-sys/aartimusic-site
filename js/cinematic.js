/* ============================================================
   CINEMATIC SCROLL SYSTEM
   Scroll-driven only: no infinite RAF. Section geometry is cached
   and recalculated on resize/content changes, then scroll position
   is converted directly into transform/opacity values.
   ============================================================ */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var main = document.querySelector('main');
  var sections = [].slice.call(document.querySelectorAll('.cinematic-section'));
  if (!main || !sections.length) return;

  var state = window.AARTI_SCROLL = { y:0, progress:0, hero:0, chapter:0 };
  var sectionMetrics = [];
  var pending = false;
  var resizePending = false;
  var parallaxItems = [];
  var parallaxMetrics = [];

  // Queried once instead of on every scroll frame.
  var progressBar = document.getElementById('progress');
  var nav = document.querySelector('.nav');

  // Last values actually written to the DOM, so an unchanged frame is free.
  var lastProgress = '', lastHero = '', lastSolid = null;

  function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
  function smooth(t){ return t*t*(3-2*t); }

  function cacheSections(){
    sectionMetrics = sections.map(function(section, i){
      var r = section.getBoundingClientRect();
      return { section:section, top:r.top + window.scrollY, height:r.height, index:i };
    });
    parallaxItems = [].slice.call(document.querySelectorAll('[data-parallax]'));
    parallaxMetrics = parallaxItems.map(function(el){
      var r = el.getBoundingClientRect();
      return { el:el, top:r.top + window.scrollY, speed:parseFloat(el.dataset.parallax) || 0.1 };
    });
    resizePending = false;
    update();
  }

  function update(){
    pending = false;
    var max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    var y = window.scrollY || window.pageYOffset || 0;
    var vh = innerHeight || 1;
    state.y = y;
    state.progress = clamp(y / max, 0, 1);
    state.hero = smooth(clamp(y / (vh * 1.05), 0, 1));

    var pg = state.progress.toFixed(4), hp = state.hero.toFixed(4);
    if (pg !== lastProgress){ lastProgress = pg; root.style.setProperty('--page-progress', pg); }
    if (hp !== lastHero){ lastHero = hp; root.style.setProperty('--hero-progress', hp); }

    if (!reduced){
      sectionMetrics.forEach(function(m){
        var top = m.top - y;
        var bottom = top + m.height;
        var center = top + m.height * 0.5;
        var local = clamp(1 - Math.abs(center - vh * 0.54) / (vh * 1.15), 0, 1);
        var enter = smooth(clamp((vh - top) / (vh * 0.75), 0, 1));
        var leave = smooth(clamp(bottom / (vh * 0.75), 0, 1));
        var focus = local * 0.72 + enter * leave * 0.28;

        // Writing a custom property invalidates style for the whole
        // subtree, identical value or not. At five sections a frame
        // that was most of the scroll cost, so only changes go out.
        var f = focus.toFixed(3);
        if (f !== m.lastFocus){
          m.lastFocus = f;
          m.section.style.setProperty('--focus', f);
          m.section.style.setProperty('--depth', ((m.index + 1) * 0.08 + (1-focus) * 0.35).toFixed(3));
          var on = focus > 0.52;
          if (on !== m.lastOn){
            m.lastOn = on;
            m.section.classList.toggle('is-focus', on);
          }
        }
      });

      var mid = vh * 0.5;
      parallaxMetrics.forEach(function(m){
        var off = (((m.top - y) - mid) * m.speed).toFixed(1) + 'px';
        if (off === m.last) return;
        m.last = off;
        m.el.style.setProperty('--parallax-y', off);
      });
    }

    if (progressBar) progressBar.style.transform = 'scaleX(' + pg + ')';
    var solid = y > 40;
    if (nav && solid !== lastSolid){ lastSolid = solid; nav.classList.toggle('solid', solid); }

    heroFrame();
  }

  function requestUpdate(){
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }

  function requestResize(){
    if (resizePending) return;
    resizePending = true;
    requestAnimationFrame(cacheSections);
  }

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

  window.addEventListener('scroll', requestUpdate, {passive:true});
  window.addEventListener('resize', requestResize, {passive:true});
  window.addEventListener('orientationchange', requestResize, {passive:true});
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestResize);
  cacheSections();

  /* In-page anchor scrolling now belongs to flourish.js, which
     covers the jump with a wipe. Two handlers on the same links —
     one smooth-scrolling, one wiping — fought each other. */
})();
