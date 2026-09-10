/* ============================================================
   BACKDROP VIDEO
   Two silent clips sit behind content. Neither downloads until
   its section is near the viewport, and both pause the moment it
   leaves — a video playing off screen costs battery and data for
   nothing, and on mobile data that is somebody's money.

   The audio track is stripped from the files themselves, so
   there is nothing to unmute even by accident.
   ============================================================ */
(function(){
  var cfg = (window.AARTI && window.AARTI.video) || {};
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wanted = cfg.onMobile !== false || window.innerWidth >= 900;

  /* Pick the lightest format this browser actually accepts, rather
     than shipping two <source> tags and letting it guess. */
  function pick(entry){
    if (!entry) return '';
    if (typeof entry === 'string') return entry;
    var probe = document.createElement('video');
    if (entry.webm && probe.canPlayType('video/webm; codecs="vp9"')) return entry.webm;
    if (entry.mp4  && probe.canPlayType('video/mp4; codecs="avc1.4d401f"')) return entry.mp4;
    return entry.mp4 || entry.webm || '';
  }

  function mount(el, entry){
    if (!el) return;
    var src = pick(entry);
    if (!src || reduced || !wanted){
      // Take the element out entirely rather than leaving a black
      // box the poster has to cover.
      el.parentNode && el.parentNode.classList.add('no-vid');
      el.remove();
      return;
    }

    el.muted = true;                 // belt and braces; the file has no track
    el.setAttribute('muted','');
    el.playsInline = true;

    var loaded = false;
    function play(){
      var p = el.play();
      if (p && p.catch) p.catch(function(){});   // autoplay refusal is fine
    }

    if (!('IntersectionObserver' in window)){
      el.src = src; play();
      return;
    }

    new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){
          if (!loaded){ el.src = src; loaded = true; }
          play();
          el.classList.add('on');
        } else if (loaded){
          el.pause();
        }
      });
    }, { rootMargin: '25% 0px' }).observe(el);

    // A decode failure should cost the flourish, not leave a hole.
    el.addEventListener('error', function(){
      el.parentNode && el.parentNode.classList.add('no-vid');
      el.remove();
    });

    document.addEventListener('visibilitychange', function(){
      if (document.hidden) el.pause();
      else if (loaded) play();
    });
  }

  mount(document.getElementById('railBg'),    cfg.ribbons);
  mount(document.getElementById('momentVid'), cfg.moment);
})();
