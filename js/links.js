/* ============================================================
   LINKS
   Fills every href from config.js, so a username only ever
   needs changing in one place. Contact cards with no value
   configured are removed instead of linking nowhere.
   ============================================================ */
(function(){
  var c = window.AARTI || {};

  var urls = {
    bot:      c.botUsername    ? 'https://t.me/' + c.botUsername : '',
    addGroup: c.botUsername    ? 'https://t.me/' + c.botUsername + '?startgroup=true' : '',
    owner:    c.ownerHandle    ? 'https://t.me/' + c.ownerHandle : '',
    updates:  c.updatesChannel ? 'https://t.me/' + c.updatesChannel : '',
    support:  c.supportGroup   ? 'https://t.me/' + c.supportGroup : '',
    email:    c.email          ? 'mailto:' + c.email : ''
  };

  document.querySelectorAll('[data-link]').forEach(function(el){
    var url = urls[el.dataset.link];

    if (!url){
      // nothing configured — drop the card, or just neutralise the link
      if (el.classList.contains('card')) el.remove();
      else el.removeAttribute('href');
      return;
    }

    el.setAttribute('href', url);
    if (url.indexOf('http') === 0){
      el.setAttribute('rel', 'noopener');
    }
  });

  // show the handle itself on the contact cards where there's a slot for it
  var handleSlots = {
    owner:   c.ownerHandle    ? '@' + c.ownerHandle    : '',
    updates: c.updatesChannel ? '@' + c.updatesChannel : '',
    support: c.supportGroup   ? '@' + c.supportGroup   : '',
    email:   c.email || ''
  };
  document.querySelectorAll('[data-handle]').forEach(function(el){
    var v = handleSlots[el.dataset.handle];
    if (v) el.textContent = v;
  });

  // footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();