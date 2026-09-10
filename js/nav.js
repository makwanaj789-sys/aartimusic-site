/* ============================================================
   MOBILE MENU
   The bar collapses to a pill on phones, so the section links
   live behind a button instead of being dropped — a nav that is
   display:none below 760px is a nav a phone visitor doesn't have.

   Kept deliberately small: no focus-trap library, just the three
   things a panel like this actually owes the user — Escape
   closes it, focus lands inside when it opens and returns to the
   button when it shuts, and the page behind it doesn't scroll.
   ============================================================ */
(function(){
  var burger = document.getElementById('burger');
  var panel  = document.getElementById('navPanel');
  if (!burger || !panel) return;

  var open = false;

  function setOpen(next){
    if (next === open) return;
    open = next;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    burger.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-locked', open);

    if (open){
      panel.hidden = false;
      // Let the element paint hidden-but-present for one frame so
      // the transition has something to animate from.
      requestAnimationFrame(function(){ panel.classList.add('is-open'); });
      var first = panel.querySelector('a');
      if (first) first.focus({ preventScroll:true });
    } else {
      panel.classList.remove('is-open');
      var done = function(){ if (!open) panel.hidden = true; };
      panel.addEventListener('transitionend', done, { once:true });
      setTimeout(done, 420);              // in case the transition never fires
      burger.focus({ preventScroll:true });
    }
  }

  burger.addEventListener('click', function(){ setOpen(!open); });

  // Any link inside is a navigation, so the panel gets out of the way.
  panel.addEventListener('click', function(e){
    if (e.target.closest('a')) setOpen(false);
  });

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && open) setOpen(false);
  });

  // Rotating to a width that shows the full menu should not leave
  // a phone-shaped overlay covering it.
  window.addEventListener('resize', function(){
    if (open && window.innerWidth > 760) setOpen(false);
  }, { passive:true });
})();
