/* ============================================================
   THEME TOGGLE
   Remembers the choice between visits.
   ============================================================ */
(function(){
  var root = document.documentElement;
  var btn  = document.getElementById('themeBtn');
  if (!btn) return;

  var saved = null;
  try { saved = localStorage.getItem('aarti-theme'); } catch(e){}
  if (saved) root.setAttribute('data-theme', saved);

  btn.addEventListener('click', function(){
    var next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('aarti-theme', next); } catch(e){}
    if (window.__ringTheme) window.__ringTheme(next);
  });
})();