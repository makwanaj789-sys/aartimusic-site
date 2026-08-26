/* ============================================================
   LIVE STATS
   Reads statsApi from config.js. If it isn't set or the server
   can't be reached, the tiles say so rather than showing
   numbers nobody counted.
   ============================================================ */
(function(){
  var cfg   = window.AARTI || {};
  var base  = cfg.statsApi || '';
  var note  = document.getElementById('statNote');
  var cells = document.querySelectorAll('[data-stat]');
  if (!note || !cells.length) return;

  function markStale(){
    cells.forEach(function(c){ c.closest('.stat').classList.add('is-stale'); });
  }

  if (!base){
    note.textContent = 'Stats endpoint not connected yet.';
    markStale();
    return;
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function countTo(el, target){
    if (reduced){ el.textContent = target.toLocaleString('en-IN'); return; }

    var start = performance.now(), dur = 900;
    function step(now){
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-IN');
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function load(){
    fetch(base.replace(/\/$/, '') + '/api/stats', { cache:'no-store' })
      .then(function(r){
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(d){
        cells.forEach(function(el){
          var v = d[el.dataset.stat];
          if (typeof v === 'number'){
            el.closest('.stat').classList.remove('is-stale');
            countTo(el, v);
          }
        });

        if (d.updated_at){
          var when = new Date(d.updated_at * 1000);
          note.textContent = 'Counted ' +
            when.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) +
            ' at ' + when.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
        } else {
          note.textContent = 'Updated once a day.';
        }
      })
      .catch(function(){
        note.textContent = "Couldn't reach the server just now.";
        markStale();
      });
  }

  load();
  var mins = cfg.statsRefreshMinutes || 30;
  setInterval(load, mins * 60 * 1000);
})();