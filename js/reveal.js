/* ============================================================
   SCROLL REVEAL
   Cards and rows ease in as they scroll into view, staggered
   within each group so they arrive one after another rather
   than all at once.

   Works on touch as well as desktop — unlike tilt, this needs
   no pointer.
   ============================================================ */
(function(){
  var items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  function showAll(){
    items.forEach(function(el){ el.classList.add('is-in'); });
  }

  // old browser, or the visitor asked for less motion
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    showAll();
    return;
  }

  var STEP = 70;   // ms between neighbours in the same group

  var observer = new IntersectionObserver(function(entries){
    // entries can arrive out of order; sort so the stagger reads top-to-bottom
    entries
      .filter(function(e){ return e.isIntersecting; })
      .sort(function(a, b){
        return a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top;
      })
      .forEach(function(entry, i){
        var el = entry.target;
        el.style.transitionDelay = (i * STEP) + 'ms';
        el.classList.add('is-in');
        observer.unobserve(el);          // once revealed, leave it alone

        // clear the delay afterwards so hover transitions stay instant
        setTimeout(function(){ el.style.transitionDelay = ''; }, i * STEP + 800);
      });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  items.forEach(function(el){ observer.observe(el); });
})();