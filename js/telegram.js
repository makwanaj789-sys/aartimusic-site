/* ============================================================
   TELEGRAM MINI APP
   Runs only inside Telegram. In a normal browser this file
   does nothing at all, so the public site is unaffected.

   Three jobs:

   1. Tell Telegram the page is alive. Without ready() the app
      sits on a spinner and never reveals the page — this is
      the usual reason a Mini App "won't load".

   2. Stop a downward drag from closing the app. This site is
      steered by dragging, and Telegram reads a downward drag
      as "close me" unless you say otherwise.

   3. Ease off the heavy effects. A webview is slower than
      Chrome, so the ring loses some bars and most of its
      embers in here. It still looks like itself.

   Load order matters: this has to run AFTER js/config.js
   (it edits AARTI) and BEFORE js/scene.js reads those values.
   ============================================================ */
(function(){

  var tg = window.Telegram && window.Telegram.WebApp;

  // not in Telegram — leave everything exactly as it is
  if (!tg || !tg.initData && !tg.platform) return;

  document.documentElement.classList.add('in-telegram');

  /* ---------- 1. wake up --------------------------------- */
  try { tg.ready();  } catch(e){}
  try { tg.expand(); } catch(e){}

  /* ---------- 2. don't close on a drag -------------------- *
     Added in Bot API 7.7, so older clients just skip it.     */
  try { if (typeof tg.disableVerticalSwipes === 'function') tg.disableVerticalSwipes(); } catch(e){}
  try { if (typeof tg.enableClosingConfirmation === 'function') tg.disableClosingConfirmation(); } catch(e){}

  /* ---------- chrome colours ------------------------------ *
     Match Telegram's header and background to the page, so
     the app doesn't sit in a mismatched frame.               */
  function paintChrome(){
    var night = document.documentElement.getAttribute('data-theme') !== 'day';
    var bg    = night ? '#05050B' : '#F4EFE9';
    try { if (tg.setHeaderColor)     tg.setHeaderColor(bg); } catch(e){}
    try { if (tg.setBackgroundColor) tg.setBackgroundColor(bg); } catch(e){}
  }
  paintChrome();

  // theme.js flips the attribute; follow it
  if (window.MutationObserver){
    new MutationObserver(paintChrome).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  /* ---------- 3. lighten the load ------------------------- */
  var A = window.AARTI = window.AARTI || {};

  A.ring = A.ring || {};
  if (A.ring.bars)   A.ring.bars   = Math.max(24, Math.round(A.ring.bars * 0.55));
  A.ring.embers = 24;
  A.ring.depth  = 0.7;
  A.ring.halo   = false;

  // the gyroscope is usually blocked in a webview; dragging
  // still works, and asking for a sensor we can't get just
  // costs a permission prompt for nothing
  A.motion = A.motion || {};
  A.motion.gyro = false;

  /* ---------- safety net ---------------------------------- *
     If a script stalls in here, the intro loader would hang
     forever. index.html already clears it at 3.2s; inside
     Telegram we don't wait that long.                        */
  setTimeout(function(){
    document.body.classList.add('ready');
    var l = document.getElementById('loader');
    if (l) l.classList.add('gone');
  }, 1400);

})();
