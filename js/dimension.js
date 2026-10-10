/* Scroll choreography uses native scroll and cached geometry, never wheel interception. */
(function () {
  'use strict';
  var section = document.getElementById('dimension');
  if (!section) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  var captions = [].slice.call(section.querySelectorAll('.dimension-caption'));
  var meter = section.querySelector('.dimension-meter i');
  var count = document.getElementById('dimensionCount');
  var panels = [].slice.call(document.querySelectorAll('.feat'));
  var metrics = [], top = 0, distance = 1, frame = 0, current = -1;
  var title = section.querySelector('.dimension-title');
  function measure() {
    panels.forEach(function(el) { el.style.transform = ''; });
    top = section.getBoundingClientRect().top + scrollY;
    distance = Math.max(1, section.offsetHeight - section.querySelector('.dimension-pin').offsetHeight);
    metrics = panels.map(function(el) { return {el:el, top:el.getBoundingClientRect().top + scrollY, height:el.offsetHeight}; });
    update();
  }
  function update() {
    frame = 0;
    if (reduced.matches || document.documentElement.classList.contains('no-webgl')) {
      section.classList.add('dimension-static');
      captions.forEach(function(el) { el.style.opacity = ''; el.style.transform = ''; el.removeAttribute('aria-hidden'); el.style.visibility = ''; });
      panels.forEach(function(el) {el.style.transform = '';});
      title.style.transform = ''; return;
    }
    section.classList.remove('dimension-static');
    var p = Math.max(0, Math.min(1, (scrollY - top) / distance));
    var active = Math.min(2, Math.floor(p * 3));
    captions.forEach(function(el, i) {
      var local = p * 3 - i;
      el.style.opacity = i === active ? '1' : '0';
      el.style.visibility = i === active ? 'visible' : 'hidden';
      el.setAttribute('aria-hidden', String(i !== active));
      el.style.transform = 'translate3d(0,' + (i === active ? (1 - Math.min(1, local * 4)) * 22 : 22) + 'px,0)';
    });
    if (current !== active) { current = active; count.textContent = '0' + (active + 1) + ' / 03'; }
    meter.style.transform = 'scaleX(' + p + ')';
    title.style.transform = 'translate3d(' + (-p * 10) + '%,0,0) rotateY(' + (p * -18) + 'deg)';
    metrics.forEach(function(m, index) {
      var position = m.top - scrollY;
      if (position > innerHeight * 1.2 || position + m.height < -100) return;
      var delta = Math.max(-1, Math.min(1, (position + m.height * .5 - innerHeight * .5) / innerHeight));
      var side = index % 2 ? -1 : 1;
      m.el.style.transform = 'perspective(1100px) rotateY(' + (delta * side * 16) + 'deg) rotateX(' + (delta * -7) + 'deg) translateZ(' + (-Math.abs(delta) * 65) + 'px)';
    });
  }
  function request() { if (!frame) frame = requestAnimationFrame(update); }
  addEventListener('scroll', request, {passive:true});
  addEventListener('resize', measure, {passive:true});
  addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  if (reduced.addEventListener) reduced.addEventListener('change', measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(document.querySelector('main'));
  measure();
})();
