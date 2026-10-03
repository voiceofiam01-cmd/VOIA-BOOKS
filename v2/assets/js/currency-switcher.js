/* Currency switcher — injects a <select> into any element with [data-currency-switcher]
 * and binds VOIA.money events to re-render any element with data-price-usd on the page.
 */
(function(){
  function fmtMoney(usd){
    return window.VOIA && window.VOIA.money ? VOIA.money.fmt(usd) : ('$'+usd);
  }
  function renderPrices(){
    var els = document.querySelectorAll('[data-price-usd]');
    els.forEach(function(el){
      var usd = parseFloat(el.getAttribute('data-price-usd'));
      if(isNaN(usd)) return;
      el.textContent = fmtMoney(usd);
    });
    var wasEls = document.querySelectorAll('[data-pricewas-usd]');
    wasEls.forEach(function(el){
      var usd = parseFloat(el.getAttribute('data-pricewas-usd'));
      if(isNaN(usd)) return;
      el.textContent = fmtMoney(usd);
    });
    var notes = document.querySelectorAll('[data-charge-note]');
    var note = window.VOIA && VOIA.money ? VOIA.money.chargeNote() : '';
    notes.forEach(function(el){ el.textContent = note; });
  }
  function makeSwitcher(container){
    if(container.dataset.swInit) return;
    container.dataset.swInit='1';
    container.innerHTML = '<select aria-label="Currency" style="appearance:none;background:transparent;border:1px solid rgba(255,255,255,.18);color:var(--gold-soft,#d4a84b);font-family:var(--sans,Inter),sans-serif;font-size:12px;font-weight:600;padding:6px 26px 6px 10px;border-radius:2px;cursor:pointer;background-image:url(\'data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2210%22 height=%226%22 viewBox=%220 0 10 6%22><path d=%22M0 0l5 6 5-6z%22 fill=%22%23d4a84b%22/></svg>\');background-repeat:no-repeat;background-position:right 8px center">'+
      (['USD','NGN','GBP','EUR','CAD','ZAR'].map(c=>'<option value="'+c+'">'+c+'</option>').join(''))+
    '</select>';
    var sel=container.querySelector('select');
    sel.value = (VOIA.money&&VOIA.money.get())||'USD';
    sel.addEventListener('change',function(){ VOIA.money.set(sel.value); });
  }
  function init(){
    document.querySelectorAll('[data-currency-switcher]').forEach(makeSwitcher);
    renderPrices();
  }
  window.addEventListener('voia:currency', renderPrices);
  window.addEventListener('voia:rates', renderPrices);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
  // re-run a second later when live rates come back
  setTimeout(renderPrices,1500);
})();
