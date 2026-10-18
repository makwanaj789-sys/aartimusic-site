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

  // Native anchor navigation keeps scroll continuity, history and keyboard behavior.
})();
