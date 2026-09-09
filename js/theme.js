/* ============================================================
   AARTIMUSIC THEME CONTROLLER
   One source of truth for Night / Day.
   - updates <html data-theme>
   - persists to localStorage
   - notifies WebGL and cinematic layers through one event
   - works whether the script runs before or after DOMContentLoaded
   ============================================================ */
(function(){
  'use strict';

  var root = document.documentElement;
  var KEY = 'aarti-theme';
  var DEFAULT = 'night';
  var META_COLOR = { night:'#080706', day:'#F4EFE9' };
  var initialized = false;

  function valid(mode){ return mode === 'day' || mode === 'night'; }

  function readSaved(){
    try {
      var value = localStorage.getItem(KEY);
      return valid(value) ? value : null;
    } catch(e) { return null; }
  }

  function writeSaved(mode){
    try { localStorage.setItem(KEY, mode); } catch(e) {}
  }

  function getButton(){
    return document.getElementById('themeBtn') || document.querySelector('[data-theme-toggle]');
  }

  function updateButton(mode){
    var btn = getButton();
    if (!btn) return;
    var day = mode === 'day';
    btn.setAttribute('aria-pressed', day ? 'true' : 'false');
    btn.setAttribute('aria-label', day ? 'Switch to night mode' : 'Switch to day mode');
    btn.setAttribute('title', day ? 'Switch to night mode' : 'Switch to day mode');
    btn.dataset.themeState = mode;
  }

  function updateMeta(mode){
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', META_COLOR[mode]);
    root.style.colorScheme = mode === 'day' ? 'light' : 'dark';
  }

  function emit(mode){
    var detail = { mode: mode };
    try {
      root.dispatchEvent(new CustomEvent('aarti:themechange', { detail: detail }));
    } catch(e) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('aarti:themechange', false, false, detail);
      root.dispatchEvent(evt);
    }
    // Keep the legacy hook available for the existing WebGL scene.
    if (typeof window.__sceneTheme === 'function') window.__sceneTheme(mode);
  }

  function apply(mode, persist){
    mode = valid(mode) ? mode : DEFAULT;
    root.setAttribute('data-theme', mode);
    root.dataset.theme = mode;
    updateButton(mode);
    updateMeta(mode);
    if (persist !== false) writeSaved(mode);
    emit(mode);
    return mode;
  }

  function current(){
    var attr = root.getAttribute('data-theme');
    return valid(attr) ? attr : DEFAULT;
  }

  function toggle(){
    return apply(current() === 'night' ? 'day' : 'night', true);
  }

  window.AARTI_THEME = {
    get: current,
    set: function(mode){ return apply(mode, true); },
    toggle: toggle
  };

  // Apply persisted state immediately, before the rest of the visual system boots.
  apply(readSaved() || current(), false);

  function bind(){
    if (initialized) {
      updateButton(current());
      return;
    }
    initialized = true;
    var btn = getButton();
    if (!btn) {
      // The script is intentionally tolerant of markup timing.
      updateButton(current());
      return;
    }
    btn.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      toggle();
    }, { passive:false });
    updateButton(current());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once:true });
  } else {
    bind();
  }

  // Keep multiple tabs/windows in sync without creating a second theme system.
  window.addEventListener('storage', function(e){
    if (e.key === KEY && valid(e.newValue)) apply(e.newValue, false);
  });
})();
