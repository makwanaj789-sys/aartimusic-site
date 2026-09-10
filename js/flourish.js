/* ============================================================
   FLOURISHES
   The two motion presets that need behaviour rather than styling:
   a pause control for the ticker, and the wipe that covers a jump
   between sections.
   ============================================================ */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- ticker controls (preset 17) ------------------
     Moving content has to be stoppable. Hover and focus are
     handled in CSS; this adds the explicit button, and stops the
     animation outright while the tab is hidden. */
  document.querySelectorAll('[data-marquee]').forEach(function(m){
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mq-pause';
    btn.setAttribute('aria-label', 'Pause the scrolling list');
    btn.textContent = '❚❚';

    function set(paused){
      m.dataset.paused = paused ? 'true' : 'false';
      btn.textContent = paused ? '▶' : '❚❚';
      btn.setAttribute('aria-label', paused ? 'Resume the scrolling list'
                                            : 'Pause the scrolling list');
    }
    btn.addEventListener('click', function(){
      set(m.dataset.paused !== 'true');
    });
    set(reduced);
    m.appendChild(btn);

    // A ticker nobody can see should not be animating.
    document.addEventListener('visibilitychange', function(){
      var track = m.querySelector('.mq-track');
      if (track) track.style.animationPlayState =
        document.hidden ? 'paused' : (m.dataset.paused === 'true' ? 'paused' : '');
    });
  });

  /* ---------- section wipe (preset 11) ---------------------
     An in-page jump is instant, which reads as a glitch. The wipe
     covers the jump: cover, move, uncover. Exit is deliberately
     faster than entry so arriving never drags.

     Nothing here hijacks the scroll — the browser still does the
     scrolling, and the wipe only hides the seam. */
  if (reduced) return;

  var wipe = document.createElement('div');
  wipe.className = 'wipe';
  wipe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(wipe);

  var busy = false;

  function go(target){
    if (busy) return;
    busy = true;
    wipe.classList.remove('out');
    wipe.classList.add('in');

    setTimeout(function(){
      /* 'auto' defers to CSS scroll-behavior, which is smooth on
         this page — the jump has to be instant while the wipe is
         covering it, or the wipe lifts mid-scroll. */
      try {
        target.scrollIntoView({ behavior: 'instant', block: 'start' });
      } catch (err) {
        var prev = document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = 'auto';
        target.scrollIntoView({ block: 'start' });
        document.documentElement.style.scrollBehavior = prev;
      }
      wipe.classList.remove('in');
      wipe.classList.add('out');
      setTimeout(function(){
        wipe.classList.remove('out');
        busy = false;
      }, 360);
    }, 430);
  }

  document.addEventListener('click', function(e){
    var link = e.target.closest('a[href^="#"]');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href || href === '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    go(target);
  });
})();
