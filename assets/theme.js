/* Furvago theme JS — ported from the single-file build; cart + variants now talk to Shopify */
(function(){
  'use strict';

  /* ---------- MONEY ---------- */
  function money(cents){
    var format = (window.theme && window.theme.moneyFormat) || '${{amount}}';
    var value = (cents / 100).toFixed(2);
    if (format.indexOf('amount_no_decimals') !== -1) value = Math.round(cents / 100).toString();
    if (format.indexOf('amount_with_comma_separator') !== -1) value = value.replace('.', ',');
    return format.replace(/\{\{\s*amount[a-z_]*\s*\}\}/, value);
  }

  /* mirrors Shopify's money_without_trailing_zeros filter: whole-dollar amounts
     drop the decimals, amounts with cents keep them */
  function moneyNoTrailingZeros(cents){
    if (cents % 100 !== 0) return money(cents);
    var format = (window.theme && window.theme.moneyFormat) || '${{amount}}';
    var value = Math.round(cents / 100).toString();
    return format.replace(/\{\{\s*amount[a-z_]*\s*\}\}/, value);
  }

  /* ---------- SCROLL LOCK ----------
     iOS Safari can leave a stale repaint behind the status bar/notch after a
     fixed full-screen overlay (menu, cart drawer) closes if body is locked
     with overflow:hidden alone. Pinning body's position while locked (and
     restoring scroll position after) avoids it. */
  var scrollLockY = 0;
  function lockScroll(){
    scrollLockY = window.scrollY || window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.top = -scrollLockY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
  }
  function unlockScroll(){
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, scrollLockY);
  }

  /* ---------- ANNOUNCEMENT BAR ---------- */
  var announceBar = document.getElementById('announcementBar');
  if(announceBar){
    var announceMsgs = Array.prototype.slice.call(document.querySelectorAll('.announce-msg'));
    if(announceMsgs.length > 1){
      var announceIdx = 0;
      var announceReducedMotion = window.matchMedia('(prefers-reduced-motion:reduce)').matches;

      /* slides the outgoing message up/out while the incoming one slides up/in
         from the opposite edge (direction depends on prev vs next) */
      function showAnnounce(targetIdxRaw, dir){
        var total = announceMsgs.length;
        var targetIdx = (targetIdxRaw + total) % total;
        if(targetIdx === announceIdx) return;
        var current = announceMsgs[announceIdx];
        var next = announceMsgs[targetIdx];

        if(announceReducedMotion){
          current.classList.remove('is-active');
          next.classList.add('is-active');
          announceIdx = targetIdx;
          return;
        }

        next.classList.add('announce-no-transition');
        next.style.transform = 'translateY(' + (dir > 0 ? '100%' : '-100%') + ')';
        void next.offsetHeight;
        next.classList.remove('announce-no-transition');

        current.classList.remove('is-active');
        current.style.transform = 'translateY(' + (dir > 0 ? '-100%' : '100%') + ')';
        next.classList.add('is-active');
        next.style.transform = '';

        announceIdx = targetIdx;
        setTimeout(function(){
          current.classList.add('announce-no-transition');
          current.style.transform = '';
          void current.offsetHeight;
          current.classList.remove('announce-no-transition');
        }, 480);
      }

      var announceTimer = null;
      function restartAnnounceTimer(){
        if(announceReducedMotion) return;
        if(announceTimer) clearInterval(announceTimer);
        announceTimer = setInterval(function(){ showAnnounce(announceIdx + 1, 1); }, 4500);
      }
      restartAnnounceTimer();
      var announcePrev = document.getElementById('announcePrev');
      var announceNext = document.getElementById('announceNext');
      if(announcePrev){
        announcePrev.addEventListener('click', function(){ showAnnounce(announceIdx - 1, -1); restartAnnounceTimer(); });
      }
      if(announceNext){
        announceNext.addEventListener('click', function(){ showAnnounce(announceIdx + 1, 1); restartAnnounceTimer(); });
      }
    }
  }

  /* ---------- MOBILE MENU ---------- */
  var menuBtn = document.getElementById('menuBtn'), mobileMenu = document.getElementById('mobileMenu');
  function closeMenu(){
    if(!menuBtn) return;
    menuBtn.setAttribute('aria-expanded','false');
    mobileMenu.classList.remove('is-open');
    unlockScroll();
  }
  if(menuBtn){
    menuBtn.addEventListener('click', function(){
      var open = menuBtn.getAttribute('aria-expanded')==='true';
      menuBtn.setAttribute('aria-expanded', String(!open));
      mobileMenu.classList.toggle('is-open', !open);
      if(!open){ lockScroll(); } else { unlockScroll(); }
    });
  }

  /* ---------- NAV SCROLL ---------- */
  var nav = document.getElementById('nav');
  if(nav){
    window.addEventListener('scroll', function(){ nav.classList.toggle('is-scrolled', window.scrollY>20); }, {passive:true});
  }

  /* ---------- ACCORDIONS ---------- */
  document.querySelectorAll('.acc').forEach(function(acc){
    acc.querySelectorAll('.acc-item').forEach(function(item){
      var q = item.querySelector('.acc-q');
      if(q) q.addEventListener('click', function(){ item.classList.toggle('open'); });
    });
  });

  /* ---------- SIZE GUIDE JUMP LINKS ---------- */
  function jumpToSizeGuide(){
    var sg = document.getElementById('pdp-sizeguide');
    if(sg) sg.scrollIntoView({behavior:'smooth', block:'start'});
  }
  var openSG = document.getElementById('openSizeGuide');
  if(openSG) openSG.addEventListener('click', jumpToSizeGuide);
  var jumpSGAcc = document.getElementById('jumpSizeGuideAcc');
  if(jumpSGAcc) jumpSGAcc.addEventListener('click', jumpToSizeGuide);

  /* ---------- REVIEWS JUMP LINK (star rating above the title) ----------
     Prefers the Judge.me widget (id it renders its reviews into) since
     that's the real reviews list; falls back to the theme's own "First
     Impressions" section if Judge.me isn't present on the page. */
  var pdpRatingLink = document.getElementById('pdpRatingLink');
  if(pdpRatingLink){
    pdpRatingLink.addEventListener('click', function(){
      var target = document.getElementById('judgeme_product_reviews') || document.getElementById('pdp-reviews');
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  /* ---------- PRODUCT: variants, gallery, options ---------- */
  var productJsonEl = document.getElementById('ProductJson');
  var productData = null, selectedOptions = [], currentVariant = null;

  function findVariant(){
    if(!productData) return null;
    return productData.variants.find(function(v){
      return v.options.every(function(val, i){ return val === selectedOptions[i]; });
    }) || null;
  }

  /* main product image: only the selected color variant's photo(s) — plus any
     image not tied to a specific variant — appear in the scrollable row
     (id="galleryMain"); dots (id="dots-gallery") show position within that set */
  var galleryMain = document.getElementById('galleryMain');
  var gallerySlides = galleryMain ? Array.prototype.slice.call(galleryMain.querySelectorAll('img')) : [];
  var galleryDotsEl = document.getElementById('dots-gallery');
  var galleryVisibleSlides = gallerySlides.slice();
  var galleryDots = [];

  function galleryVariantIdsFor(img){
    var raw = img.dataset.variantIds;
    return raw ? raw.split(',').filter(Boolean).map(Number) : [];
  }

  function buildGalleryDots(){
    if(!galleryDotsEl) return;
    if(galleryVisibleSlides.length < 2){
      galleryDotsEl.innerHTML = '';
      galleryDotsEl.style.display = 'none';
      galleryDots = [];
      return;
    }
    galleryDotsEl.style.display = '';
    galleryDotsEl.innerHTML = galleryVisibleSlides.map(function(_, i){
      return '<button class="dot' + (i === 0 ? ' active' : '') + '" aria-label="Show image ' + (i + 1) + '"></button>';
    }).join('');
    galleryDots = Array.prototype.slice.call(galleryDotsEl.children);
    galleryDots.forEach(function(d, i){
      d.addEventListener('click', function(){
        galleryVisibleSlides[i].scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
      });
    });
  }

  function galleryIndexFromScroll(){
    if(galleryVisibleSlides.length < 2) return 0;
    var step = galleryVisibleSlides[1] ? (galleryVisibleSlides[1].getBoundingClientRect().left - galleryVisibleSlides[0].getBoundingClientRect().left) : 0;
    if(!step) return 0;
    var idx = Math.round(galleryMain.scrollLeft / step);
    return Math.max(0, Math.min(galleryVisibleSlides.length - 1, idx));
  }

  function updateGalleryForVariant(variantId){
    if(!galleryMain || !gallerySlides.length) return;
    galleryVisibleSlides = gallerySlides.filter(function(img){
      var ids = galleryVariantIdsFor(img);
      return ids.length === 0 || (variantId && ids.indexOf(variantId) !== -1);
    });
    if(!galleryVisibleSlides.length) galleryVisibleSlides = gallerySlides;
    gallerySlides.forEach(function(img){
      img.style.display = galleryVisibleSlides.indexOf(img) !== -1 ? '' : 'none';
    });
    galleryMain.scrollLeft = 0;
    buildGalleryDots();
  }

  if(galleryMain){
    galleryMain.addEventListener('scroll', function(){
      window.requestAnimationFrame(function(){
        var idx = galleryIndexFromScroll();
        galleryDots.forEach(function(d, i){ d.classList.toggle('active', i === idx); });
      });
    }, {passive:true});
  }

  function updateProductUI(){
    currentVariant = findVariant();
    var priceEl = document.getElementById('priceCurrent');
    var compareEl = document.getElementById('priceCompare');
    var saveEl = document.getElementById('priceSave');
    var atc = document.getElementById('addToCart');
    var idInput = document.getElementById('variantId');

    if(currentVariant){
      if(idInput) idInput.value = currentVariant.id;
      if(priceEl) priceEl.textContent = money(currentVariant.price);
      var hasCompare = currentVariant.compare_at_price && currentVariant.compare_at_price > currentVariant.price;
      if(compareEl){
        compareEl.style.display = hasCompare ? '' : 'none';
        if(hasCompare) compareEl.textContent = money(currentVariant.compare_at_price);
      }
      if(saveEl){
        saveEl.style.display = hasCompare ? '' : 'none';
        if(hasCompare){
          saveEl.textContent = 'Save ' + moneyNoTrailingZeros(currentVariant.compare_at_price - currentVariant.price);
        }
      }
      if(atc){
        atc.disabled = !currentVariant.available;
        atc.textContent = currentVariant.available ? 'Add to cart' : 'Sold out';
      }
      updateGalleryForVariant(currentVariant.id);
    } else if(atc){
      atc.disabled = true;
      atc.textContent = 'Unavailable';
    }
    updateSticky();
  }

  function updateSticky(){
    var el = document.querySelector('#stickyAtc .sa-price');
    if(!el || !currentVariant) return;
    el.textContent = money(currentVariant.price) + ' · ' + selectedOptions.join(' · ');
  }

  if(productJsonEl){
    try { productData = JSON.parse(productJsonEl.textContent); } catch(e){ productData = null; }
    var optsHost = document.querySelector('[data-selected-options]');
    if(optsHost){
      try { selectedOptions = JSON.parse(optsHost.getAttribute('data-selected-options')); } catch(e){ selectedOptions = []; }
    }

    document.querySelectorAll('[data-option-button]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pos = +btn.dataset.optionPos; /* 1-based */
        selectedOptions[pos - 1] = btn.dataset.value;
        document.querySelectorAll('[data-option-button][data-option-pos="' + pos + '"]').forEach(function(b){
          b.classList.toggle('active', b === btn);
        });
        var nameEl = document.querySelector('[data-option-name="' + pos + '"]');
        if(nameEl) nameEl.textContent = btn.dataset.value;
        updateProductUI();
      });
    });

    updateProductUI();

    var stickyAtc = document.getElementById('stickyAtc');
    if(stickyAtc) stickyAtc.classList.add('show');
  }

  /* ---------- CART (Shopify AJAX API) ---------- */
  var cartVariantCompare = {};
  var cartVariantCompareEl = document.getElementById('CartVariantCompareData');
  if(cartVariantCompareEl){
    try { cartVariantCompare = JSON.parse(cartVariantCompareEl.textContent); } catch(e){ cartVariantCompare = {}; }
  }
  var scrim = document.getElementById('scrim'), drawer = document.getElementById('cartDrawer');
  function openCart(){ if(!drawer) return; scrim.classList.add('show'); drawer.classList.add('open'); drawer.setAttribute('aria-hidden','false'); lockScroll(); }
  function closeCart(){ if(!drawer) return; scrim.classList.remove('show'); drawer.classList.remove('open'); drawer.setAttribute('aria-hidden','true'); unlockScroll(); }
  var cartBtn = document.getElementById('cartBtn');
  if(cartBtn) cartBtn.addEventListener('click', openCart);
  var cartClose = document.getElementById('cartClose');
  if(cartClose) cartClose.addEventListener('click', closeCart);
  if(scrim) scrim.addEventListener('click', closeCart);

  function renderCart(cartJson){
    var body = document.getElementById('cartBody');
    var countEl = document.getElementById('cartCount');
    var subEl = document.getElementById('cartSubtotal');
    if(countEl) countEl.textContent = cartJson.item_count;
    if(subEl) subEl.textContent = money(cartJson.total_price);
    if(!body) return;
    if(cartJson.items.length === 0){
      body.innerHTML = '<div class="cart-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg><p>Your cart is empty.</p></div>';
      return;
    }
    body.innerHTML = cartJson.items.map(function(item, i){
      var img = item.image ? ('<img src="' + item.image + '&width=260" alt=""/>') : '<img src="" alt=""/>';
      if(item.image && item.image.indexOf('?') === -1) img = '<img src="' + item.image + '?width=260" alt=""/>';
      var compareAt = cartVariantCompare[String(item.variant_id)] || 0;
      var priceHtml = '';
      if(compareAt > item.price){
        priceHtml += '<del class="cl-compare">' + money(compareAt * item.quantity) + '</del>';
      }
      priceHtml += '<span class="cl-current">' + money(item.final_line_price) + '</span>';
      return '<div class="cart-line">' + img +
        '<div class="cl-info"><div class="cl-name">' + item.product_title + '</div>' +
        '<div class="cl-variant">' + (item.variant_title || '') + '</div>' +
        '<div class="cl-qty"><button data-act="dec" data-line="' + (i + 1) + '" aria-label="Decrease">–</button><span>' + item.quantity + '</span><button data-act="inc" data-line="' + (i + 1) + '" aria-label="Increase">+</button></div></div>' +
        '<div class="cl-price">' + priceHtml + '</div></div>';
    }).join('');
  }

  function fetchCart(){
    return fetch((window.theme && window.theme.cartUrl || '/cart') + '.js')
      .then(function(r){ return r.json(); })
      .then(function(c){ renderCart(c); return c; });
  }

  function addToCart(){
    var idInput = document.getElementById('variantId');
    if(!idInput || !idInput.value) return;
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: +idInput.value, quantity: 1 })
    }).then(function(r){
      if(!r.ok) throw new Error('add failed');
      return fetchCart();
    }).then(openCart).catch(function(){
      var atc = document.getElementById('addToCart');
      if(atc){ var t = atc.textContent; atc.textContent = 'Could not add — try again'; setTimeout(function(){ atc.textContent = t; }, 2200); }
    });
  }

  var cartBody = document.getElementById('cartBody');
  if(cartBody){
    cartBody.addEventListener('click', function(e){
      var b = e.target.closest('button[data-act]'); if(!b) return;
      var line = +b.dataset.line;
      var qtyEl = b.parentElement.querySelector('span');
      var qty = +qtyEl.textContent + (b.dataset.act === 'inc' ? 1 : -1);
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line: line, quantity: Math.max(0, qty) })
      }).then(function(r){ return r.json(); }).then(renderCart);
    });
  }

  var productForm = document.getElementById('productForm');
  if(productForm){
    productForm.addEventListener('submit', function(e){ e.preventDefault(); addToCart(); });
  }
  var satc = document.getElementById('stickyAdd'); if(satc) satc.addEventListener('click', addToCart);
  var atcExpect = document.getElementById('addToCartExpect'); if(atcExpect) atcExpect.addEventListener('click', addToCart);
  var checkoutBtn = document.getElementById('checkoutBtn');
  if(checkoutBtn) checkoutBtn.addEventListener('click', function(){ window.location.href = '/checkout'; });

  /* ---------- REVEAL + STORM ---------- */
  var io;
  function initReveals(){
    var els = document.querySelectorAll('.reveal:not(.is-visible)');
    if(!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion:reduce)').matches){
      els.forEach(function(el){ el.classList.add('is-visible'); }); return;
    }
    if(!io){ io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, {threshold:0.12}); }
    els.forEach(function(el){ io.observe(el); });
  }
  var stormIO;
  function armStorm(){
    var storms = document.querySelectorAll('.storm');
    if(!storms.length) return;
    if(window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    if(!stormIO){ stormIO = new IntersectionObserver(function(es){
      es.forEach(function(e){ e.target.classList.toggle('is-active', e.isIntersecting); });
    }, {threshold:0.2}); }
    storms.forEach(function(s){ stormIO.observe(s); });
  }

  /* ---------- MOBILE CAROUSEL DOTS ---------- */
  function initCarousels(){
    document.querySelectorAll('[data-carousel]').forEach(function(track){
      if(track.dataset.carouselInit) return;
      var dotsEl = document.getElementById(track.getAttribute('data-carousel'));
      var cards = Array.prototype.slice.call(track.children);
      if(!dotsEl || cards.length < 2) return;
      track.dataset.carouselInit = '1';
      dotsEl.innerHTML = cards.map(function(_, i){
        return '<button class="dot' + (i === 0 ? ' active' : '') + '" aria-label="Go to item ' + (i + 1) + '"></button>';
      }).join('');
      var dots = Array.prototype.slice.call(dotsEl.children);
      function update(){
        var r0 = cards[0].getBoundingClientRect();
        var r1 = cards[1] ? cards[1].getBoundingClientRect() : null;
        var step = r1 ? (r1.left - r0.left) : r0.width;
        var idx = step ? Math.round(track.scrollLeft / step) : 0;
        idx = Math.max(0, Math.min(cards.length - 1, idx));
        dots.forEach(function(d, i){ d.classList.toggle('active', i === idx); });
      }
      track.addEventListener('scroll', function(){ window.requestAnimationFrame(update); }, {passive:true});
      dots.forEach(function(d, i){
        d.addEventListener('click', function(){
          cards[i].scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
        });
      });
    });
  }

  initReveals(); armStorm(); initCarousels();

  /* re-init when the Shopify theme editor re-renders a section */
  document.addEventListener('shopify:section:load', function(){
    initReveals(); armStorm(); initCarousels();
  });
})();
