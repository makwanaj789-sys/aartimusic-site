/* ============================================================
   THEME TOGGLE
   Switches between night and day, and remembers the choice.
   ============================================================ */
(function(){
  var root = document.documentElement;
  var btn  = document.getElementById('themeBtn');

  if (!btn){
    console.warn('theme: #themeBtn not found');
    return;
  }

  function apply(mode){
    root.setAttribute('data-theme', mode);
    btn.setAttribute('aria-pressed', mode === 'day' ? 'true' : 'false');
    if (window.__ringTheme) window.__ringTheme(mode);
  }

  // restore the last choice, if the browser allows storage at all
  var saved = null;
  try { saved = localStorage.getItem('aarti-theme'); } catch(e){}
  if (saved === 'day' || saved === 'night') apply(saved);

  btn.addEventListener('click', function(e){
    e.preventDefault();
    var next = root.getAttribute('data-theme') === 'night' ? 'day' : 'night';
    apply(next);
    try { localStorage.setItem('aarti-theme', next); } catch(e){}
  });
})();