/* ============================================================
   CARD TILT
   On a desktop the card leans toward the cursor and a light
   follows it. On a phone there's no cursor, so the cards lean
   with the handset itself — whichever way you angle the phone,
   the cards on screen angle with it.

   Only cards currently on screen are updated, so a page full
   of them costs the same as one.
   ============================================================ */
(function(){
  var cfg = (window.AARTI && window.AARTI.tilt) || {};
  if (cfg.enabled === false) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var MAX   = cfg.maxAngle === undefined ? 9  : cfg.maxAngle;   // degrees
  var LIFT  = cfg.lift     === undefined ? 16 : cfg.lift;       // px toward viewer
  var SHINE = cfg.shine    === undefined ? 34 : cfg.shine;      // % accent in the glare

  var cards = document.querySelectorAll('[data-tilt]');
  if (!cards.length) return;

  var touch = window.matchMedia('(hover: none)').matches;

  /* every card gets a glare layer and a shadow layer */
  var all = [];
  cards.forEach(function(el){
    var shine = document.createElement('span'); shine.className = 'shine';
    var edge  = document.createElement('span'); edge.className  = 'edge';
    el.appendChild(shine);
    el.appendChild(edge);
    all.push({ el: el, shine: shine, on: false });
  });

  function paint(item, px, py, strength){
    var rx = (0.5 - py) * MAX * 2 * strength;
    var ry = (px - 0.5) * MAX * 2 * strength;

    item.el.style.transform =
      'rotateX(' + rx.toFixed(2) + 'deg) ' +
      'rotateY(' + ry.toFixed(2) + 'deg) ' +
      'translateZ(' + (LIFT * strength).toFixed(1) + 'px)';

    item.shine.style.opacity = String(0.85 * strength);
    item.shine.style.background =
      'radial-gradient(circle at ' + (px * 100).toFixed(1) + '% ' + (py * 100).toFixed(1) + '%, ' +
      'color-mix(in srgb, var(--flame) ' + SHINE + '%, transparent) 0%, transparent 58%)';
  }

  function rest(item){
    item.el.style.transition = 'transform .55s var(--ease)';
    item.el.style.transform  = '';
    item.shine.style.opacity = '0';
    item.el.classList.remove('is-tilting');
  }

  /* ---------- phones: lean with the handset ---------------- */
  if (touch){
    var motion = window.AARTI_MOTION;
    if (!motion) return;

    // only animate what's actually on screen
    var live = [];
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          var item = all.filter(function(a){ return a.el === en.target; })[0];
          if (!item) return;
          if (en.isIntersecting){
            if (live.indexOf(item) === -1) live.push(item);
            item.el.classList.add('is-tilting');
          } else {
            var i = live.indexOf(item);
            if (i > -1) live.splice(i, 1);
            rest(item);
          }
        });
      }, { threshold: 0.25 });
      all.forEach(function(a){ io.observe(a.el); });
    } else {
      live = all.slice();
    }

    var awake = true;
    document.addEventListener('visibilitychange', function(){
      awake = !document.hidden;
      if (awake) frame();
    });

    function frame(){
      if (!awake) return;
      requestAnimationFrame(frame);
      if (!live.length) return;

      // map -1..1 lean onto the 0..1 the painter expects
      var px = 0.5 + motion.x * 0.5;
      var py = 0.5 + motion.y * 0.5;

      for (var i = 0; i < live.length; i++){
        live[i].el.style.transition = '';   // driven per frame, no easing needed
        paint(live[i], px, py, 0.75);       // gentler than the mouse version
      }
    }
    frame();
    return;
  }

  /* ---------- desktop: follow the cursor ------------------- */
  all.forEach(function(item){
    var el = item.el, rect = null, pending = null;

    el.addEventListener('pointerenter', function(){
      rect = el.getBoundingClientRect();
      el.style.transition = 'transform .16s var(--ease)';
      el.classList.add('is-tilting');
    });

    el.addEventListener('pointermove', function(e){
      if (!rect) rect = el.getBoundingClientRect();
      if (pending) return;                       // one update per frame, no more

      var x = e.clientX, y = e.clientY;
      pending = requestAnimationFrame(function(){
        pending = null;
        paint(item, (x - rect.left) / rect.width, (y - rect.top) / rect.height, 1);
      });
    });

    el.addEventListener('pointerleave', function(){
      if (pending){ cancelAnimationFrame(pending); pending = null; }
      rest(item);
      rect = null;
    });

    window.addEventListener('scroll', function(){ rect = null; }, { passive:true });
  });
})();
