/* ============================================================
   ENTRANCES
   What arrives on screen should arrive, rather than simply be
   there. Two things happen here:

     - headings are split into words and each word rises out of
       its own overflow box, staggered
     - grouped cards tilt up into place one after another

   Everything is transform and opacity, so the compositor handles
   it without laying the page out again, and every element is
   unobserved the moment it has played — an entrance that repeats
   on every pass stops being an entrance and becomes a twitch.
   ============================================================ */
(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var supported = 'IntersectionObserver' in window;

  /* ---------- 1. split headings ---------------------------- */
  var heads = [].slice.call(document.querySelectorAll('h2, [data-split]'));

  function split(el){
    if (el.dataset.splitDone) return;
    var text = el.textContent.trim();
    if (!text || text.length > 90) return;      // don't shred paragraphs
    el.dataset.splitDone = '1';
    el.setAttribute('aria-label', text);

    var frag = document.createDocumentFragment();
    text.split(/\s+/).forEach(function(word, i){
      var mask = document.createElement('span');
      mask.className = 'w-mask';
      mask.setAttribute('aria-hidden', 'true');
      var inner = document.createElement('span');
      inner.className = 'w-in';
      inner.textContent = word;
      inner.style.transitionDelay = (i * 70) + 'ms';
      mask.appendChild(inner);
      frag.appendChild(mask);
      frag.appendChild(document.createTextNode(' '));
    });
    el.textContent = '';
    el.appendChild(frag);
  }

  if (!reduced && supported){
    heads.forEach(split);
    var headObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (!en.isIntersecting) return;
        en.target.classList.add('w-in-play');
        headObs.unobserve(en.target);
      });
    }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
    heads.forEach(function(el){ if (el.dataset.splitDone) headObs.observe(el); });
  } else {
    heads.forEach(function(el){ el.classList.add('w-in-play'); });
  }

  /* ---------- 2. staggered card entrances ------------------ *
     The stagger is read from the element's position in its own
     group, so adding a card to the markup needs no other change. */
  var GROUPS = '.stat-grid, .feat-list, .edit-row, .cmd-grid, .contact-grid';

  if (!reduced && supported){
    var cardObs = new IntersectionObserver(function(entries){
      entries
        .filter(function(e){ return e.isIntersecting; })
        .forEach(function(en){
          var el = en.target;
          var sibs = [].slice.call(el.parentNode.children);
          el.style.transitionDelay = (sibs.indexOf(el) * 85) + 'ms';
          el.classList.add('rise-in');
          cardObs.unobserve(el);
          // Clear the delay afterwards so hover stays instant.
          setTimeout(function(){ el.style.transitionDelay = ''; },
                     sibs.indexOf(el) * 85 + 1000);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll(GROUPS).forEach(function(group){
      [].slice.call(group.children).forEach(function(child){
        child.classList.add('rise');
        cardObs.observe(child);
      });
    });
  }
})();
