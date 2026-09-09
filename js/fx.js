/* ============================================================
   INTERFACE EFFECTS
   The things that make the page feel built rather than
   assembled: the loading counter, a cursor that reacts, headings
   that scramble into place, the running ticker, and buttons that
   pull toward the pointer.

   Everything here checks for a pointer or for reduced motion
   first. On a phone most of it simply doesn't run — a custom
   cursor on a touchscreen is dead weight.
   ============================================================ */
(function(){

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch   = window.matchMedia('(hover: none)').matches;

  /* ---------- 1. loader -------------------------------------
     Counts to 100 while the page settles, then lifts away. Capped
     at two seconds: a loader that outstays the load is worse than
     no loader at all.                                          */
  (function loader(){
    var el = document.getElementById('loader');
    if (!el) return;

    if (reduced){ el.remove(); document.body.classList.add('ready'); return; }

    var num = el.querySelector('.load-num');
    var bar = el.querySelector('.load-bar span');
    var n = 0, started = performance.now();

    function step(){
      var elapsed = performance.now() - started;
      var target  = Math.min(100, (elapsed / 1400) * 100);
      n += (target - n) * 0.12;

      if (num) num.textContent = String(Math.round(n)).padStart(3, '0');
      if (bar) bar.style.transform = 'scaleX(' + (n / 100) + ')';

      if (n < 99.4 && elapsed < 2000){
        requestAnimationFrame(step);
      } else {
        if (num) num.textContent = '100';
        if (bar) bar.style.transform = 'scaleX(1)';
        setTimeout(function(){
          el.classList.add('gone');
          document.body.classList.add('ready');
          setTimeout(function(){ el.remove(); }, 900);
        }, 260);
      }
    }
    requestAnimationFrame(step);
  })();

  /* ---------- 2. cursor --------------------------------------
     Event-driven: the trailing ring schedules frames only while
     the pointer is moving. It never owns an idle RAF loop. */
  (function cursor(){
    if (touch || reduced) return;

    var dot  = document.createElement('div'); dot.className  = 'cur-dot';
    var ring = document.createElement('div'); ring.className = 'cur-ring';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, frame = 0;

    function follow(){
      frame = 0;
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      if (Math.abs(mx-rx) > 0.25 || Math.abs(my-ry) > 0.25){
        frame = requestAnimationFrame(follow);
      }
    }

    window.addEventListener('pointermove', function(e){
      if (e.pointerType === 'touch') return;
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      if (!frame) frame = requestAnimationFrame(follow);
    }, { passive:true });

    document.querySelectorAll('a, button, [data-tilt]').forEach(function(el){
      el.addEventListener('pointerenter', function(){ ring.classList.add('grow'); });
      el.addEventListener('pointerleave', function(){ ring.classList.remove('grow'); });
    });
  })();

  /* ---------- 3. scramble text ------------------------------
     Headings resolve out of noise the first time they scroll
     into view. Runs once each — repeating it on every pass turns
     a flourish into a nuisance.                                */
  (function scramble(){
    var targets = document.querySelectorAll('[data-scramble]');
    if (!targets.length || reduced || !('IntersectionObserver' in window)) return;

    var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\#@*';

    function run(el){
      var final = el.textContent;
      var frame = 0;
      var queue = final.split('').map(function(ch, i){
        return { ch: ch, start: Math.floor(i * 1.6), end: Math.floor(i * 1.6) + 14 };
      });

      function step(){
        var out = '', done = 0;
        queue.forEach(function(q){
          if (frame >= q.end){ out += q.ch; done++; }
          else if (frame >= q.start){
            out += CHARS[Math.floor(Math.random() * CHARS.length)];
          } else {
            out += q.ch === ' ' ? ' ' : '';
          }
        });
        el.textContent = out;
        if (done < queue.length){ frame++; requestAnimationFrame(step); }
        else el.textContent = final;
      }
      step();
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        run(en.target);
      });
    }, { threshold: 0.5 });

    targets.forEach(function(el){ io.observe(el); });
  })();

  /* ---------- 4. marquee ------------------------------------
     The track is duplicated so the loop has no seam. Width comes
     from the content, so changing the words needs no other edit. */
  (function marquee(){
    document.querySelectorAll('[data-marquee]').forEach(function(el){
      var track = el.querySelector('.mq-track');
      if (!track) return;
      track.innerHTML += track.innerHTML;
      if (reduced) el.style.setProperty('--mq-play', 'paused');
    });
  })();

  /* ---------- 5. magnetic buttons --------------------------- */
  (function magnetic(){
    if (touch || reduced) return;
    var PULL = 0.32;

    document.querySelectorAll('[data-magnet]').forEach(function(el){
      var rect = null, pending = null;

      el.addEventListener('pointerenter', function(){
        rect = el.getBoundingClientRect();
      });

      el.addEventListener('pointermove', function(e){
        if (!rect) rect = el.getBoundingClientRect();
        if (pending) return;
        var x = e.clientX, y = e.clientY;
        pending = requestAnimationFrame(function(){
          pending = null;
          var dx = (x - (rect.left + rect.width / 2)) * PULL;
          var dy = (y - (rect.top + rect.height / 2)) * PULL;
          el.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
        });
      });

      el.addEventListener('pointerleave', function(){
        if (pending){ cancelAnimationFrame(pending); pending = null; }
        el.style.transform = '';
        rect = null;
      });
    });
  })();

  /* Scroll progress and nav state are updated by cinematic.js so
     there is one scroll scheduler for all DOM choreography. */

  /* ---------- 7. video -------------------------------------
     Both clips are held back until they are needed.

     The showcase only starts downloading when it scrolls into
     view, and pauses again when it leaves — a video playing
     off-screen costs battery and data for nothing.

     The page overlay is heavier still, so it is off on phones by
     default. Most visitors here arrive on mobile data, and a
     background flourish is not worth ten megabytes of it.      */
  (function video(){
    var cfg = (window.AARTI && window.AARTI.video) || {};

    /* --- showcase --- */
    var show = document.getElementById('showcaseVid');
    if (show){
      if (!cfg.showcase){
        var stage = show.closest('.fx-stage');
        if (stage) stage.classList.add('no-video');
        show.remove();
      } else if ('IntersectionObserver' in window){
        var loaded = false;
        new IntersectionObserver(function(entries){
          entries.forEach(function(en){
            if (en.isIntersecting){
              if (!loaded){ show.src = cfg.showcase; loaded = true; }
              var p = show.play();
              if (p && p.catch) p.catch(function(){});
            } else if (loaded){
              show.pause();
            }
          });
        }, { threshold: 0.25 }).observe(show);
      } else {
        show.src = cfg.showcase;
      }
    }

    /* --- page overlay --- */
    var ov = document.getElementById('overlayVid');
    if (!ov) return;

    var wanted = cfg.overlay && !reduced &&
                 (cfg.onMobile !== false || window.innerWidth >= 900);

    if (!wanted){ ov.remove(); return; }

    ov.style.setProperty('--ov-op', String(cfg.overlayOpacity || 0.30));
    ov.src = cfg.overlay;

    ov.addEventListener('loadeddata', function(){
      ov.classList.add('on');                 // fade in once it can actually play
      var p = ov.play();
      if (p && p.catch) p.catch(function(){});
    });

    // a decode failure should cost the flourish, not leave a black sheet
    ov.addEventListener('error', function(){ ov.remove(); });

    document.addEventListener('visibilitychange', function(){
      if (document.hidden) ov.pause();
      else { var p = ov.play(); if (p && p.catch) p.catch(function(){}); }
    });
  })();

  /* Parallax is measured and updated by cinematic.js together with
     section geometry, avoiding duplicate scroll RAFs and layout reads. */

  /* ---------- 9. effect selector ----------------------------- */
  (function effectSelector(){
    var buttons = document.querySelectorAll('.effect-select');
    if (!buttons.length) return;
    var title = document.getElementById('effectTitle');
    var copy = document.getElementById('effectCopy');
    var stage = document.querySelector('.fx-stage');
    var current = 0;

    function activate(btn, instant){
      buttons.forEach(function(b){ b.classList.toggle('active', b === btn); });
      current = [].indexOf.call(buttons, btn);
      if (title) {
        title.classList.remove('fx-text-in');
        if (!instant) void title.offsetWidth;
        title.textContent = String(btn.dataset.effect || '').toUpperCase();
        title.classList.add('fx-text-in');
      }
      if (copy) copy.textContent = btn.dataset.copy || '';
      if (stage) stage.style.setProperty('--effect-index', current);
    }
    buttons.forEach(function(btn){
      btn.addEventListener('click', function(){ activate(btn, false); });
      btn.addEventListener('pointerenter', function(){ if (!touch && !reduced) activate(btn, false); });
    });
    activate(buttons[0], true);
  })();

  /* ---------- 10. section chapter labels -------------------- */
  (function chapters(){
    var items = document.querySelectorAll('.cinematic-section');
    if (!items.length || reduced) return;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        entry.target.classList.toggle('chapter-active', entry.isIntersecting && entry.intersectionRatio > .38);
      });
    }, {threshold:[0,.38,.65]});
    items.forEach(function(el){ io.observe(el); });
  })();

})();
