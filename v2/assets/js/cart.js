/* Voice of I AM — house cart (shared across v2)
 * localStorage-backed. Works on every product page, in the library modal,
 * and on the cart page. Multi-item checkout via Paystack Inline Popup
 * (falls back to a Paystack product-link per-item if the public key is unset).
 */
(function(){
  var KEY = 'voia_cart_v1';
  var PAYSTACK_PUBLIC_KEY = ''; // set this when Paystack upgrades for inline multi-item
  var STORE_CURRENCY = 'NGN';

  function read(){
    try{ var c = JSON.parse(localStorage.getItem(KEY)||'[]'); return Array.isArray(c)?c:[]; }
    catch(e){ return []; }
  }
  function write(c){ localStorage.setItem(KEY, JSON.stringify(c)); notify(); }
  function notify(){ window.dispatchEvent(new CustomEvent('voia:cart', {detail:count()})); }
  function find(sku){ return read().findIndex(function(x){return x.sku===sku}); }

  function add(sku, opts){
    opts = opts||{};
    var c = read();
    var i = find(sku);
    if(i>=0){ c[i].qty = (c[i].qty||1)+(opts.qty||1); }
    else {
      c.push({
        sku: sku,
        title: opts.title || sku,
        price: opts.price || 0,          // in kobo? No — in Naira (integer)
        edition: opts.edition || 'PDF',
        qty: opts.qty||1
      });
    }
    write(c);
    return c;
  }
  function remove(sku){
    var c = read().filter(function(x){return x.sku!==sku});
    write(c); return c;
  }
  function setQty(sku, qty){
    var c=read(); var i=find(sku);
    if(i<0) return c;
    if(qty<=0){ c.splice(i,1); } else { c[i].qty = qty; }
    write(c); return c;
  }
  function clear(){ write([]); }
  function count(){ return read().reduce(function(n,x){return n+(x.qty||1)},0); }
  function total(){ return read().reduce(function(n,x){return n+(x.price||0)*(x.qty||1)},0); }
  function items(){ return read().slice(); }

  /* --- paystack inline checkout (multi-item) --- */
  function checkout(opts){
    opts = opts||{};
    var c = items();
    if(c.length===0){ return false; }
    var amountKobo = total()*100;
    var email = opts.email || '';
    if(!window.PaystackPop && PAYSTACK_PUBLIC_KEY){
      var s=document.createElement('script');
      s.src='https://js.paystack.co/v1/inline.js';
      s.onload=function(){ _doCheckout(amountKobo,email,c); };
      document.head.appendChild(s);
    } else if(window.PaystackPop && PAYSTACK_PUBLIC_KEY){
      _doCheckout(amountKobo,email,c);
    } else {
      // Fallback: for single-item carts, go direct to the Paystack product link.
      // For multi-item carts without inline configured, send to WhatsApp/help.
      _fallbackCheckout(c);
    }
    return true;
  }
  function _doCheckout(amountKobo,email,c){
    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: amountKobo,
      currency: STORE_CURRENCY,
      metadata: {
        cart: c.map(function(x){return {sku:x.sku,title:x.title,qty:x.qty,edition:x.edition}}),
        custom_fields: [
          { display_name: "Items in cart", variable_name: "cart_items", value: c.length+" book(s)" }
        ]
      },
      callback: function(resp){
        // redirect to thank-you with reference
        clear();
        var ref = encodeURIComponent(resp.reference||'');
        window.location.href = '/VOIA-BOOKS/v2/cart/thankyou.html?ref='+ref;
      },
      onClose: function(){ /* user closed */ }
    });
    handler.openIframe();
  }
  function _fallbackCheckout(c){
    if(c.length===1 && c[0].paystackUrl){
      window.open(c[0].paystackUrl,'_blank');
      return;
    }
    // Multi-item without inline — direct to WhatsApp with order summary
    var lines = c.map(function(x,i){ return (i+1)+'. '+x.title+' ×'+x.qty+' — ₦'+(x.price*x.qty).toLocaleString() }).join('%0A');
    var tot = '₦'+total().toLocaleString();
    var msg = encodeURIComponent(
      "Hi VOIA — I'd like to order:\n\n"+
      c.map(function(x,i){return (i+1)+'. '+x.title+' ×'+x.qty+' — ₦'+(x.price*x.qty).toLocaleString()}).join('\n')+
      "\n\nTotal: "+tot+"\n\nPlease send me a checkout link."
    );
    window.open('https://wa.me/2348101265454?text='+msg,'_blank');
  }

  /* --- header cart count binding + cart drawer --- */
  function bindCartCounters(){
    var els = document.querySelectorAll('[data-cart-count]');
    var n = count();
    els.forEach(function(el){ el.textContent = n; });
  }
  window.addEventListener('voia:cart', bindCartCounters);
  document.addEventListener('DOMContentLoaded', bindCartCounters);

  window.VOIA = {
    cart: {add:add, remove:remove, setQty:setQty, clear:clear, count:count, total:total, items:items, checkout:checkout}
  };
})();
