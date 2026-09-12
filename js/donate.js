/* ============================================================
   DONATIONS
   A UPI address rather than a payment gateway. The link opens
   whatever UPI app the visitor already has; the QR beside it is
   for people on a computer, who have no app to open.

   The address and the QR both come from config.js, so the two can
   never drift apart — a QR that points at an old account is worse
   than no QR at all.
   ============================================================ */
(function(){
  var c = (window.AARTI && window.AARTI.donate) || {};
  var section = document.getElementById('support');
  if (!section) return;

  // No address configured means no section, rather than a section
  // with a dead button in it.
  if (!c.upi){ section.remove(); return; }

  var text = document.getElementById('upiText');
  var copy = document.getElementById('upiCopy');
  var pay  = document.getElementById('upiPay');

  if (text) text.textContent = c.upi;

  var uri = 'upi://pay?pa=' + encodeURIComponent(c.upi) +
            '&pn=' + encodeURIComponent(c.name || 'AartiMusic') +
            '&cu=INR' +
            (c.note ? '&tn=' + encodeURIComponent(c.note) : '');
  if (pay) pay.setAttribute('href', uri);

  /* A upi:// link has nothing to open on a desktop — it either does
     nothing or throws up a "no app" dialog, which reads as broken.
     There the button copies the address instead and says so. */
  var hasApp = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!hasApp && pay){
    pay.querySelector('span').textContent = 'Copy UPI ID';
    pay.setAttribute('href', '#');
    pay.addEventListener('click', function(e){ e.preventDefault(); doCopy(pay); });
  }

  function doCopy(btn){
    var done = function(){
      btn.classList.add('copied');
      var label = btn.querySelector('.upi-copy-hint') || btn.querySelector('span');
      var was = label.textContent;
      label.textContent = 'Copied';
      setTimeout(function(){ label.textContent = was; btn.classList.remove('copied'); }, 1600);
    };
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(c.upi).then(done, function(){ fallback(done); });
    } else {
      fallback(done);
    }
  }

  // Older browsers, and any page served without a secure context,
  // have no clipboard API.
  function fallback(done){
    var ta = document.createElement('textarea');
    ta.value = c.upi;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch(e){}
    document.body.removeChild(ta);
  }

  if (copy) copy.addEventListener('click', function(){ doCopy(copy); });
})();
