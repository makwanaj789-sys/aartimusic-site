/* ============================================================
   CARD TILT
   Cards lean toward the pointer, with a light that follows it.
   Deliberately skipped on touch screens — without a hovering
   cursor the effect only fires after a tap, which reads as a
   glitch rather than depth.
   ============================================================ */
(function(){
  var cfg = (window.AARTI && window.AARTI.tilt) || {};
  if (cfg.enabled === false) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  var MAX   = cfg.maxAngle === undefined ? 9  : cfg.maxAngle;   // degrees
  var LIFT  = cfg.lift     === undefined ? 16 : cfg.lift;       // px toward viewer
  var SHINE = cfg.shine    === undefined ? 34 : cfg.shine;      // % accent in the glare

  document.querySelectorAll('[data-tilt]').forEach(function(el){

    // the glare, and a separate layer for the drop shadow
    var shine = document.createElement('span');
    shine.className = 'shine';
    var edge = document.createElement('span');
    edge.className = 'edge';
    el.appendChild(shine);
    el.appendChild(edge);

    var rect = null, frame = null;

    el.addEventListener('pointerenter', function(){
      rect = el.getBoundingClientRect();
      el.style.transition = 'transform .16s var(--ease)';
      el.classList.add('is-tilting');
    });

    el.addEventListener('pointermove', function(e){
      if (!rect) rect = el.getBoundingClientRect();
      if (frame) return;                      // one update per frame, no more

      var x = e.clientX, y = e.clientY;
      frame = requestAnimationFrame(function(){
        frame = null;

        var px = (x - rect.left) / rect.width;
        var py = (y - rect.top)  / rect.height;

        var rx = (0.5 - py) * MAX * 2;        // pointer high  -> card leans back
        var ry = (px - 0.5) * MAX * 2;        // pointer right -> card turns right

        el.style.transform =
          'rotateX(' + rx.toFixed(2) + 'deg) ' +
          'rotateY(' + ry.toFixed(2) + 'deg) ' +
          'translateZ(' + LIFT + 'px)';

        shine.style.opacity = '1';
        shine.style.background =
          'radial-gradient(circle at ' + (px * 100).toFixed(1) + '% ' + (py * 100).toFixed(1) + '%, ' +
          'color-mix(in srgb, var(--flame) ' + SHINE + '%, transparent) 0%, transparent 58%)';
      });
    });

    el.addEventListener('pointerleave', function(){
      if (frame){ cancelAnimationFrame(frame); frame = null; }
      el.style.transition = 'transform .55s var(--ease)';
      el.style.transform  = '';
      shine.style.opacity = '0';
      el.classList.remove('is-tilting');
      rect = null;
    });

    // a scroll mid-hover invalidates the cached rectangle
    window.addEventListener('scroll', function(){ rect = null; }, { passive:true });
  });
})();