/* Voice of I AM — multi-currency pricing
 * Base is USD. Rates are fetched from exchangerate.host on load, with hard
 * fallbacks. Default currency is guessed from the visitor's locale/timezone;
 * user override stored in localStorage. NGN is what Paystack actually charges
 * today; other currencies are display-only at checkout (note shown).
 */
(function(){
  var FALLBACK_RATES = {
    USD: 1, NGN: 1550, GBP: 0.78, EUR: 0.92, CAD: 1.37, ZAR: 18.4, GHS: 15.8, KES: 129
  };
  var SYMBOLS = {USD:'$', NGN:'₦', GBP:'£', EUR:'€', CAD:'C$', ZAR:'R', GHS:'GH₵', KES:'KSh'};
  var CURRENCIES = ['USD','NGN','GBP','EUR','CAD','ZAR'];
  var CHARGE_CURRENCY = 'NGN';  // Paystack charges NGN for now

  var rates = Object.assign({}, FALLBACK_RATES);
  var selected = localStorage.getItem('voia_currency') || guessDefault();
  var listeners = [];

  function guessDefault(){
    try{
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      var lang = (navigator.language||'en-US').toLowerCase();
      if(tz.indexOf('Lagos')!==-1 || lang.indexOf('ng')!==-1) return 'NGN';
      if(lang.indexOf('gb')!==-1) return 'GBP';
      if(lang.indexOf('za')!==-1) return 'ZAR';
      if(lang.indexOf('gh')!==-1) return 'GHS';
      if(lang.indexOf('ke')!==-1) return 'KES';
      if(lang.indexOf('ca')!==-1) return 'CAD';
      if(lang.indexOf('de')!==-1||lang.indexOf('fr')!==-1||lang.indexOf('es')!==-1||lang.indexOf('it')!==-1||lang.indexOf('nl')!==-1||lang.indexOf('pt')!==-1) return 'EUR';
      return 'USD';
    }catch(e){ return 'USD'; }
  }

  // Fetch live rates (USD base). Try open.er-api.com first, then fall back to
  // exchangerate.host. Fail silently to hardcoded FALLBACK_RATES on any error.
  function applyRates(d){
    if(!d) return;
    // open.er-api.com returns {rates:{...}}; exchangerate.host same shape.
    var r = d.rates || (d.data && d.data.rates);
    if(r){ rates = Object.assign({}, FALLBACK_RATES, r); emit(); }
  }
  function fetchJson(url){
    return fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('bad status');return r.json()});
  }
  try{
    var syms = Object.keys(FALLBACK_RATES).join(',');
    fetchJson('https://open.er-api.com/v6/latest/USD')
      .then(applyRates)
      .catch(function(){
        return fetchJson('https://api.exchangerate.host/latest?base=USD&symbols='+syms).then(applyRates);
      })
      .catch(function(){});
  }catch(e){}

  function emit(){ listeners.forEach(function(fn){try{fn(selected)}catch(e){}}); }
  function on(fn){ listeners.push(fn); }

  function set(c){
    if(!SYMBOLS[c]) return;
    selected = c;
    localStorage.setItem('voia_currency', c);
    emit();
    window.dispatchEvent(new CustomEvent('voia:currency',{detail:c}));
  }
  function get(){ return selected; }
  function symbol(c){ return SYMBOLS[c||selected]||'$'; }
  function rate(c){ return rates[c||selected]||1; }
  // Convert USD amount to selected currency (integer-ish, rounded nicely)
  function convert(usd, c){
    c = c||selected;
    var raw = usd * (rates[c]||1);
    if(c==='NGN') return Math.round(raw/50)*50;     // round to nearest ₦50
    if(c==='ZAR'||c==='KES'||c==='GHS') return Math.round(raw/10)*10;
    if(c==='USD'||c==='CAD') return Math.round(raw*100)/100;
    return Math.round(raw*100)/100;
  }
  function fmt(usd, c){
    c=c||selected;
    var v = convert(usd,c);
    var s = SYMBOLS[c]||'$';
    if(c==='NGN'||c==='ZAR'||c==='KES'||c==='GHS') return s+Number(Math.round(v)).toLocaleString();
    return s+v.toFixed(2);
  }
  function chargeNote(){
    if(selected===CHARGE_CURRENCY) return '';
    return 'You will be charged in Nigerian Naira (₦) — your bank converts at its own rate.';
  }

  window.VOIA = window.VOIA||{};
  window.VOIA.money = {
    CURRENCIES:CURRENCIES, CHARGE_CURRENCY:CHARGE_CURRENCY,
    get:get, set:set, symbol:symbol, rate:rate, convert:convert, fmt:fmt, on:on,
    chargeNote:chargeNote,
    _rates:function(){return rates;}
  };

  // Initial emit on next tick so subscribers can attach
  setTimeout(emit, 0);
})();
