/* ============================================================
   SCROLL GALLERY
   The effects section pins itself and the seven cards fly through
   it in perspective — near ones large and face-on, far ones small
   and turned away — so scrolling reads as travelling past them
   rather than as a list moving up.

   HOW IT STAYS CHEAP
   Scroll position maps straight to a transform per card. Nothing
   is measured inside the loop: the section's geometry is cached
   and only recomputed on resize, and each card writes transform
   and opacity only, which the compositor can do without laying
   the page out again. One rAF, shared by every card, and it stops
   entirely while the section is off screen.
   ============================================================ */
(function(){
  var section = document.getElementById('effects');
  var rail    = document.getElementById('galleryRail');
  if (!section || !rail) return;

  var cards = [].slice.call(rail.querySelectorAll('.g-card'));
  if (!cards.length) return;

  var cfg    = (window.AARTI && window.AARTI.gallery) || {};
  var dots   = [].slice.call(section.querySelectorAll('.g-dot'));
  var count  = document.getElementById('galleryCount');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var n = cards.length;

  /* Reduced motion gets the same content as a plain readable
     stack — no pinning, no travel, no scroll hijack. */
  /* A rail of 3D-transformed layers is the expensive half of this
     page on a phone. Measured on a throttled device it costs about
     a frame and a half a second, so a weak device — and anyone who
     sets gallery.flat — gets the same cards travelling flat, which
     is most of the effect at a fraction of the compositing. */
  var cores = navigator.hardwareConcurrency || 4;
  var mem   = navigator.deviceMemory || 4;
  var flat  = cfg.flat === true || (cfg.flat !== false && (cores <= 4 || mem <= 4));

  if (reduced || cfg.enabled === false){
    section.classList.add('is-static');
    cards.forEach(function(c){ c.style.opacity = 1; });
    if (count) count.textContent = '01 / 0' + n;
    return;
  }

  var angle = 38;      // deg turned away per step (set in measure)
  var depth = 680;     // px pushed back per step (set in measure)

  /* Step, falloff and how many neighbours are worth drawing all
     depend on how much room there is. A phone card is 80vw, so a
     step measured as a fraction of the viewport buries the active
     card under its neighbours — narrow screens need a step wider
     than the card and a much steeper fade. */
  var step = 0, fade = 0.16, range = 3.05;

  cards.forEach(function(c){ c.style.willChange = 'auto'; });

  var top = 0, height = 1, vw = 0, active = -1;
  var ticking = false, onScreen = false;

  function measure(){
    var r = section.getBoundingClientRect();
    top = r.top + window.scrollY;
    height = Math.max(1, section.offsetHeight - window.innerHeight);
    vw = window.innerWidth;

    var narrow = vw <= 760;
    var cardW = cards[0].offsetWidth || vw * 0.7;
    step  = narrow ? cardW * 1.05 : Math.min(vw * 0.40, cardW * 1.12);
    fade  = narrow ? 0.48 : 0.16;
    range = narrow ? 1.6 : 3.05;

    /* A card turned in 3D has to be rasterised and then resampled
       at an angle, which is the expensive half of this effect. A
       phone keeps a shallow turn and draws fewer neighbours; the
       rail still reads as depth, at about half the compositing. */
    angle = flat ? 0 : (narrow ? 14 : 38);
    depth = flat ? 0 : (narrow ? 300 : 680);
    if (flat) range = Math.min(range, 1.35);
    render();
  }

  function render(){
    ticking = false;
    var raw = (window.scrollY - top) / height;
    var p = raw < 0 ? 0 : (raw > 1 ? 1 : raw);

    // Where the rail is, in card units.
    var head = p * (n - 1);

    for (var i = 0; i < n; i++){
      var d = i - head;                 // signed distance from centre
      var ad = Math.abs(d);
      var card = cards[i];

      // Anything past the visible range is not worth drawing.
      if (ad > range){
        if (card.style.visibility !== 'hidden'){
          card.style.visibility = 'hidden';
          card.style.opacity = '0';
          // Release the layer: a card three steps away is not
          // about to animate, and the texture is not free.
          card.style.willChange = 'auto';
        }
        continue;
      }
      if (card.style.visibility === 'hidden'){
        card.style.visibility = '';
        card.style.willChange = 'transform,opacity';
      }

      var x = d * step;
      var z = -ad * depth;
      var ry = -d * angle;
      var scale = 1 - Math.min(ad * 0.10, 0.42);
      var op = Math.max(0, Math.min(1, 1 - ad * fade)) * Math.min(1, (range - ad) / 0.6);

      card.style.transform =
        'translate3d(' + x.toFixed(1) + 'px,' + (Math.sin(d * 0.9) * 26).toFixed(1) + 'px,' +
        z.toFixed(0) + 'px) rotateY(' + ry.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      card.style.opacity = op.toFixed(3);
      card.style.zIndex = String(100 - Math.round(ad * 10));
    }

    var now = Math.round(head);
    if (now !== active){
      active = now;
      for (var k = 0; k < n; k++) cards[k].classList.toggle('is-active', k === active);
      for (var j = 0; j < dots.length; j++) dots[j].classList.toggle('on', j === active);
      if (count) count.textContent = '0' + (active + 1) + ' / 0' + n;

      /* Tell the rest of the page which effect is in front, so the
         nebula and anything else can answer to it. */
      var card = cards[active];
      if (card){
        document.documentElement.dispatchEvent(new CustomEvent('aarti:effect', {
          detail: { index: active, effect: card.dataset.effect, copy: card.dataset.copy }
        }));
      }
    }
  }

  function onScroll(){
    if (ticking || !onScreen) return;
    ticking = true;
    requestAnimationFrame(render);
  }

  window.addEventListener('scroll', onScroll, { passive:true });

  var resizeTimer = 0;
  window.addEventListener('resize', function(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measure, 140);
  }, { passive:true });

  // Nothing runs while the section is nowhere near the viewport.
  if ('IntersectionObserver' in window){
    new IntersectionObserver(function(e){
      onScreen = e[0].isIntersecting;
      if (onScreen) render();
    }, { rootMargin: '20% 0px' }).observe(section);
  } else {
    onScreen = true;
  }

  // The dots scroll to a card rather than jumping the rail, so the
  // page and the gallery never disagree about where they are.
  dots.forEach(function(dot){
    dot.addEventListener('click', function(){
      var i = parseInt(dot.dataset.go, 10) || 0;
      window.scrollTo({ top: top + (i / (n - 1)) * height, behavior: 'smooth' });
    });
  });

  cards.forEach(function(card, i){
    card.addEventListener('click', function(){
      if (i === active) return;
      window.scrollTo({ top: top + (i / (n - 1)) * height, behavior: 'smooth' });
    });
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);
  measure();
})();
