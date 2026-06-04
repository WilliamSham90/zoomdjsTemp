/* =========================================================
   ZOOM DJs — interactions & scroll animations
   ========================================================= */
(function(){
  'use strict';

  /* ---- Sticky nav state ---- */
  var nav = document.getElementById('nav');
  var onScroll = function(){
    if (window.scrollY > 24) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive:true });

  /* ---- Mobile drawer menu ---- */
  var burger   = document.getElementById('burger');
  var drawer   = document.getElementById('mDrawer');
  var backdrop = document.getElementById('mBackdrop');
  var mClose   = document.getElementById('mClose');
  var mLinks   = document.getElementById('mLinks');
  if (burger && drawer){
    var openDrawer = function(){
      drawer.classList.add('open'); if (backdrop) backdrop.classList.add('open');
      burger.classList.add('active'); drawer.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    var closeDrawer = function(){
      drawer.classList.remove('open'); if (backdrop) backdrop.classList.remove('open');
      burger.classList.remove('active'); drawer.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', function(){
      drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });
    if (mClose)   mClose.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    if (mLinks)   mLinks.addEventListener('click', function(e){ if (e.target.closest('a')) closeDrawer(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });
  }

  /* ---- Scroll reveal ---- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce){
    document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting){
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold:0.16, rootMargin:'0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });
  }

  /* ---- Count-up stat (15+) ---- */
  var counted = false;
  var countEl = document.querySelector('[data-count]');
  if (countEl){
    var startCount = function(){
      if (counted) return; counted = true;
      var target = parseInt(countEl.getAttribute('data-count'), 10);
      var suffix = countEl.getAttribute('data-suffix') || '';
      var t0 = null, dur = 1100;
      var step = function(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        countEl.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (reduce){ countEl.textContent = countEl.getAttribute('data-count') + (countEl.getAttribute('data-suffix')||''); }
    else {
      var io2 = new IntersectionObserver(function(e){ if (e[0].isIntersecting) startCount(); }, { threshold:0.6 });
      io2.observe(countEl);
    }
  }

  /* ---- Review stars + 3-up carousel (arrows, dots, auto 5s) ---- */
  (function(){
    var track = document.getElementById('revTrack');
    var viewport = document.getElementById('revViewport');
    if (!track || !viewport) return;

    function starSvg(on){
      return '<svg class="' + (on ? 's-on' : 's-off') + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
             '<path d="M12 2.5l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.6l-5.9 3.1 1.13-6.57L2.46 9.44l6.6-.96L12 2.5z"/></svg>';
    }
    function halfStarSvg(id){
      return '<svg viewBox="0 0 24 24" aria-hidden="true">' +
             '<defs><linearGradient id="' + id + '"><stop offset="50%" stop-color="#1668DB"/><stop offset="50%" stop-color="#D7DCE3"/></linearGradient></defs>' +
             '<path fill="url(#' + id + ')" d="M12 2.5l2.95 5.98 6.6.96-4.77 4.65 1.13 6.57L12 17.6l-5.9 3.1 1.13-6.57L2.46 9.44l6.6-.96L12 2.5z"/></svg>';
    }
    var hid = 0;
    Array.prototype.forEach.call(track.querySelectorAll('.stars'), function(el){
      var r = parseFloat(el.getAttribute('data-rating')) || 5, html = '';
      for (var i = 1; i <= 5; i++){
        if (r >= i) html += starSvg(true);
        else if (r >= i - 0.5) html += halfStarSvg('hg' + (hid++));
        else html += starSvg(false);
      }
      el.innerHTML = html;
      el.setAttribute('aria-label', r + ' out of 5 stars');
    });

    var prevBtn = document.getElementById('revPrev');
    var nextBtn = document.getElementById('revNext');
    var dotsWrap = document.getElementById('revDots');
    var originals = Array.prototype.slice.call(track.children);
    var N = originals.length;

    // clone the full set once so we can advance one card at a time and wrap seamlessly
    originals.forEach(function(c){ track.appendChild(c.cloneNode(true)); });

    var idx = 0, timer = null;

    function perPage(){
      var w = window.innerWidth;
      if (w <= 600) return 1;
      if (w <= 900) return 2;
      return 3;
    }
    function stepPx(){
      var card = track.children[0];
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 22;
      return card.getBoundingClientRect().width + gap;
    }
    function apply(animate){
      track.style.transition = animate ? 'transform .6s cubic-bezier(.22,.61,.36,1)' : 'none';
      track.style.transform = 'translateX(' + (-idx * stepPx()) + 'px)';
    }
    function buildDots(){
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (var i = 0; i < N; i++){
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Go to review ' + (i + 1));
        (function(i){ b.addEventListener('click', function(){ go(i); restart(); }); })(i);
        dotsWrap.appendChild(b);
      }
      syncDots();
    }
    function syncDots(){
      if (!dotsWrap) return;
      var active = ((idx % N) + N) % N;
      Array.prototype.forEach.call(dotsWrap.children, function(d, i){
        d.classList.toggle('on', i === active);
      });
    }
    function go(n){ idx = n; apply(true); syncDots(); }
    function next(){
      idx++;
      apply(true); syncDots();
      if (idx >= N){
        setTimeout(function(){ idx = 0; apply(false); syncDots(); }, 620);
      }
    }
    function prev(){
      if (idx <= 0){
        idx = N; apply(false); void track.offsetWidth; // jump into clone region
      }
      idx--; apply(true); syncDots();
    }
    function restart(){
      if (reduce) return;
      clearInterval(timer);
      timer = setInterval(next, 5000);
    }

    if (nextBtn) nextBtn.addEventListener('click', function(){ next(); restart(); });
    if (prevBtn) prevBtn.addEventListener('click', function(){ prev(); restart(); });

    // pause on hover
    viewport.addEventListener('mouseenter', function(){ clearInterval(timer); });
    viewport.addEventListener('mouseleave', restart);

    // touch swipe
    var sx = 0, dx = 0, swiping = false;
    viewport.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; dx = 0; swiping = true; clearInterval(timer); }, {passive:true});
    viewport.addEventListener('touchmove', function(e){ if (swiping) dx = e.touches[0].clientX - sx; }, {passive:true});
    viewport.addEventListener('touchend', function(){
      if (swiping && Math.abs(dx) > 45){ dx < 0 ? next() : prev(); }
      swiping = false; restart();
    });

    var rt;
    window.addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ apply(false); }, 150); }, {passive:true});

    buildDots();
    apply(false);
    restart();
  })();

  /* (Music genres are static — no active-state cycling) */

  /* ---- Booking form (demo submit) ---- */
  var form = document.getElementById('bookForm');
  if (form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function(f){
        if (!f.value.trim()){ ok = false; f.style.borderColor = '#E0414B'; }
        else { f.style.borderColor = ''; }
      });
      if (!ok) return;
      document.getElementById('formOk').classList.add('show');
      form.querySelector('button[type=submit]').textContent = 'Request sent ✓';
      setTimeout(function(){ form.reset(); }, 300);
    });
  }

  /* ---- Subtle hero parallax ---- */
  if (!reduce){
    var heroImg = document.querySelector('.hero__bg img');
    if (heroImg){
      window.addEventListener('scroll', function(){
        var y = window.scrollY;
        if (y > 0 && y < window.innerHeight){
          heroImg.style.transform = 'scale(1.04) translateY(' + (y * 0.16) + 'px)';
        }
      }, { passive:true });
    }
  }

  /* ---- Scrollspy: highlight the nav link of the section in view ---- */
  var spyLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  if (spyLinks.length){
    var linkFor = {};
    spyLinks.forEach(function(a){
      var id = a.getAttribute('href').slice(1);
      if (id) linkFor[id] = a;
    });
    var spied = Object.keys(linkFor)
      .map(function(id){ return document.getElementById(id); })
      .filter(Boolean);
    var setActive = function(id){
      spyLinks.forEach(function(a){ a.classList.remove('active'); });
      if (linkFor[id]) linkFor[id].classList.add('active');
    };
    var spyObs = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting) setActive(en.target.id);
      });
    }, { rootMargin:'-45% 0px -50% 0px', threshold:0 });
    spied.forEach(function(s){ spyObs.observe(s); });
  }

  /* ---- Genre chips: staggered pop-in ---- */
  var genres = document.getElementById('genres');
  if (genres && !reduce){
    var chips = genres.querySelectorAll('.genre');
    var gObs = new IntersectionObserver(function(e){
      if (e[0].isIntersecting){
        chips.forEach(function(c, i){ c.style.animationDelay = (i * 45) + 'ms'; });
        genres.classList.add('in');
        gObs.disconnect();
      }
    }, { threshold:0.2 });
    gObs.observe(genres);
  }

  /* ---- Packages slider (responsive: swipe + arrows + dots; nav hidden when all cards fit) ---- */
  (function(){
    var track = document.getElementById('pkgTrack');
    if (!track) return;
    var carousel = document.getElementById('pkgCarousel');
    var prev = document.getElementById('pkgPrev');
    var next = document.getElementById('pkgNext');
    var dotsWrap = document.getElementById('pkgDots');

    var maxScroll  = function(){ return track.scrollWidth - track.clientWidth; };
    var hasOverflow= function(){ return maxScroll() > 4; };
    function gapPx(){ return parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 22; }
    function cardStep(){ var c = track.querySelector('.pkg'); return c ? c.getBoundingClientRect().width + gapPx() : track.clientWidth; }
    function perView(){ return Math.max(1, Math.round((track.clientWidth + gapPx()) / cardStep())); }
    function pageCount(){ var n = track.querySelectorAll('.pkg').length; return Math.max(1, n - perView() + 1); }
    function curPage(){ return Math.min(pageCount() - 1, Math.max(0, Math.round(track.scrollLeft / cardStep()))); }

    var animateTo = function(target){
      target = Math.max(0, Math.min(target, maxScroll()));
      try { track.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' }); }
      catch (e){ track.scrollLeft = target; }
      setTimeout(updateDots, 80);
    };
    var goNext = function(){
      if (track.scrollLeft >= maxScroll() - 4) animateTo(0);
      else animateTo(track.scrollLeft + cardStep());
    };
    var goPrev = function(){
      if (track.scrollLeft <= 4) animateTo(maxScroll());
      else animateTo(track.scrollLeft - cardStep());
    };
    if (next) next.addEventListener('click', function(){ goNext(); pause(); });
    if (prev) prev.addEventListener('click', function(){ goPrev(); pause(); });

    /* dots — one per page (rebuilt on resize) */
    function buildDots(){
      if (!dotsWrap) return;
      var n = pageCount();
      dotsWrap.innerHTML = '';
      for (var i = 0; i < n; i++){
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Go to package set ' + (i + 1));
        (function(i){ b.addEventListener('click', function(){ animateTo(i * cardStep()); pause(); }); })(i);
        dotsWrap.appendChild(b);
      }
      updateDots();
    }
    function updateDots(){
      if (!dotsWrap) return;
      var active = curPage();
      Array.prototype.forEach.call(dotsWrap.children, function(d, i){ d.classList.toggle('on', i === active); });
    }
    track.addEventListener('scroll', function(){ updateDots(); }, { passive:true });

    /* show/hide arrows + dots based on overflow (wide screens fit all 4 → no nav) */
    function syncNav(){
      if (carousel) carousel.classList.toggle('no-nav', !hasOverflow());
      buildDots();
    }

    /* drag-to-scroll */
    var down=false, startX=0, startL=0, moved=false;
    track.addEventListener('pointerdown', function(e){ down=true; moved=false; startX=e.clientX; startL=track.scrollLeft; track.style.cursor='grabbing'; pause(); });
    track.addEventListener('pointermove', function(e){ if(!down)return; var dx=e.clientX-startX; if(Math.abs(dx)>4)moved=true; track.scrollLeft=startL-dx; });
    var endDrag=function(){ down=false; track.style.cursor=''; };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('click', function(e){ if(moved){ e.preventDefault(); e.stopPropagation(); } }, true);

    /* gentle autoplay; pauses on interaction, only when there's something to scroll */
    var auto=null;
    function startAuto(){ if(reduce || !hasOverflow()) return; clearInterval(auto); auto=setInterval(goNext, 5200); }
    function pause(){ if(auto){ clearInterval(auto); auto=null; } }
    track.addEventListener('pointerenter', pause);
    track.addEventListener('focusin', pause);

    var prt;
    window.addEventListener('resize', function(){ clearTimeout(prt); prt=setTimeout(syncNav, 150); }, { passive:true });

    syncNav();
    startAuto();
  })();

  /* ---- Our Work: masonry gallery slider (arrows + dots + swipe) + lightbox ---- */
  (function(){
    var galTrack = document.getElementById('galTrack');
    var galView  = document.getElementById('galViewport');
    if (!galTrack || !galView) return;

    /* Gallery photos — edit titles/subs freely; swap any "imageN" to re-order.
       Tiles are grouped 6 per page to fill the masonry layout exactly. */
    var galleryImages = [
      { f:'image2.jpg',  t:'Lights up',    s:'Reception' },
      { f:'image4.jpg',  t:'Full house',   s:'Reception' },
      { f:'image5.jpg',  t:'Blue hour',    s:'Party' },
      { f:'image10.jpg', t:'The ceremony', s:'Wedding' },
      { f:'image12.jpg', t:'On the floor', s:'Reception' },
      { f:'image13.jpg', t:'Chill lounge', s:'Corporate' },
      { f:'image14.jpg', t:'The setup',    s:'Marquee' },
      { f:'image15.jpg', t:'Garden party', s:'Wedding' },
      { f:'image16.jpg', t:'Purple haze',  s:'Reception' },
      { f:'image17.jpg', t:'Peak hour',    s:'Party' },
      { f:'image18.jpg', t:'The venue',    s:'Daylight' },
      { f:'image19.jpg', t:'After dark',   s:'Party' },
      { f:'image20.jpg', t:'Marquee nights', s:'Wedding' },
      { f:'image21.jpg', t:'Under canvas', s:'Reception' },
      { f:'image23.jpg', t:'First dance',  s:'Wedding' },
      { f:'image24.jpg', t:'Full floor',   s:'Party' },
      { f:'image25.jpg', t:'Timeless',     s:'Reception' },
      { f:'image26.jpg', t:'Grand hall',   s:'Venue' },
      { f:'image28.jpg', t:'I do',         s:'Ceremony' },
      { f:'image29.jpg', t:'Set & ready',  s:'Venue' },
      { f:'image30.jpg', t:'Garden vows',  s:'Ceremony' },
      { f:'image31.jpg', t:'The couple',   s:'Wedding' },
      { f:'image32.jpg', t:'Lounge vibes', s:'Corporate' },
      { f:'image33.jpg', t:'Fairy lights', s:'Reception' },
      { f:'image34.jpg', t:'Pink room',    s:'Party' },
      { f:'image35.jpg', t:'On the tiles', s:'Dancefloor' },
      { f:'image36.jpg', t:'Ready to go',  s:'Marquee' },
      { f:'image37.jpg', t:'Big screen',   s:'Corporate' },
      { f:'image40.jpg', t:'Neon nights',  s:'Party' },
      { f:'image42.jpg', t:'Laser show',   s:'Party' },
      { f:'image44.jpg', t:'Late night',   s:'Reception' },
      { f:'image46.jpg', t:'On the night', s:'Party' },
      { f:'image47.jpg', t:'Blue lights',  s:'Reception' },
      { f:'image48.jpg', t:'Table glow',   s:'Wedding' },
      { f:'image53.jpg', t:'Packed out',   s:'Party' },
      { f:'image54.jpg', t:'Red room',     s:'Party' }
    ];

    var gPrev   = document.getElementById('galPrev');
    var gNext   = document.getElementById('galNext');
    var dotsWrap= document.getElementById('galDots');
    var pages = [], N = 0, gi = 0, gTimer = null, curPer = 0, tiles = [];

    function esc(str){ return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function perPage(){ return window.innerWidth <= 560 ? 3 : 6; }

    function buildGallery(){
      curPer = perPage();
      var html = '';
      for (var i = 0; i < galleryImages.length; i += curPer){
        html += '<div class="gal-page">';
        for (var j = i; j < Math.min(i + curPer, galleryImages.length); j++){
          var g = galleryImages[j], src = 'Images/' + g.f, cap = esc(g.t) + ' \u2014 ' + esc(g.s);
          html += '<button type="button" class="gtile" data-full="' + src + '" data-title="' + esc(g.t) + '" data-sub="' + esc(g.s) + '">'
                +   '<img src="' + src + '" alt="' + cap + '" loading="lazy" />'
                +   '<span class="gcap"><b>' + esc(g.t) + '</b><span>' + esc(g.s) + '</span></span>'
                + '</button>';
        }
        html += '</div>';
      }
      galTrack.innerHTML = html;
      pages = Array.prototype.slice.call(galTrack.children);
      N = pages.length;
      gi = Math.max(0, Math.min(gi, N - 1));
      buildDots();
      wireTiles();
      apply(false);
    }

    function setHeight(){
      /* Desktop (>=901px): the masonry page derives its height FROM the viewport
         (CSS sets .gal-viewport height:560px). Reading page.offsetHeight back would
         lock a collapsed height — so clear the inline height and let CSS govern. */
      if (window.innerWidth >= 901){ galView.style.height = ''; return; }
      var p = pages[gi], h = p && p.offsetHeight;
      if (h) galView.style.height = h + 'px';
    }
    function syncDots(){
      if (!dotsWrap) return;
      Array.prototype.forEach.call(dotsWrap.children, function(d, i){ d.classList.toggle('on', i === gi); });
    }
    function apply(animate){
      galTrack.style.transition = animate ? 'transform .6s cubic-bezier(.22,.61,.36,1)' : 'none';
      galTrack.style.transform = 'translateX(' + (-gi * 100) + '%)';
      setHeight(); syncDots();
    }
    function go(n){ gi = ((n % N) + N) % N; apply(true); }
    function gNextFn(){ go(gi + 1); }
    function gPrevFn(){ go(gi - 1); }

    function buildDots(){
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      for (var i = 0; i < N; i++){
        var b = document.createElement('button');
        b.setAttribute('aria-label', 'Go to gallery page ' + (i + 1));
        (function(i){ b.addEventListener('click', function(){ go(i); restart(); }); })(i);
        dotsWrap.appendChild(b);
      }
    }
    if (gNext) gNext.addEventListener('click', function(){ gNextFn(); restart(); });
    if (gPrev) gPrev.addEventListener('click', function(){ gPrevFn(); restart(); });

    function restart(){ if (reduce) return; clearInterval(gTimer); gTimer = setInterval(gNextFn, 6500); }
    galView.addEventListener('mouseenter', function(){ clearInterval(gTimer); });
    galView.addEventListener('mouseleave', restart);

    /* touch swipe */
    var sx = 0, dx = 0, sw = false;
    galView.addEventListener('touchstart', function(e){ sx = e.touches[0].clientX; dx = 0; sw = true; clearInterval(gTimer); }, {passive:true});
    galView.addEventListener('touchmove',  function(e){ if (sw) dx = e.touches[0].clientX - sx; }, {passive:true});
    galView.addEventListener('touchend',   function(){ if (sw && Math.abs(dx) > 45){ dx < 0 ? gNextFn() : gPrevFn(); } sw = false; restart(); });

    var grt;
    window.addEventListener('resize', function(){ clearTimeout(grt); grt = setTimeout(function(){ if (perPage() !== curPer) buildGallery(); else apply(false); }, 150); }, {passive:true});

    /* ---- lightbox ---- */
    var lb       = document.getElementById('lightbox');
    var lbImg    = document.getElementById('lbImg');
    var lbTitle  = document.getElementById('lbTitle');
    var lbSub    = document.getElementById('lbSub');
    var lbIdx = 0, lastFocus = null;

    function renderLb(){
      var t = tiles[lbIdx], im = t.querySelector('img');
      lbImg.src = t.getAttribute('data-full') || (im ? im.src : '');
      lbImg.alt = im ? im.alt : '';
      lbTitle.textContent = t.getAttribute('data-title') || '';
      lbSub.textContent   = t.getAttribute('data-sub') || '';
    }
    function openLb(i){
      lbIdx = i; renderLb();
      lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      clearInterval(gTimer);
      lastFocus = document.activeElement;
      var c = document.getElementById('lbClose'); if (c) c.focus();
    }
    function closeLb(){
      lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      restart();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function lbNext(){ lbIdx = (lbIdx + 1) % tiles.length; renderLb(); }
    function lbPrev(){ lbIdx = (lbIdx - 1 + tiles.length) % tiles.length; renderLb(); }

    function wireTiles(){
      tiles = Array.prototype.slice.call(galTrack.querySelectorAll('.gtile'));
      tiles.forEach(function(t, i){ t.onclick = function(){ openLb(i); }; });
    }

    if (lb){
      document.getElementById('lbClose').addEventListener('click', closeLb);
      document.getElementById('lbNext').addEventListener('click', lbNext);
      document.getElementById('lbPrev').addEventListener('click', lbPrev);
      lb.addEventListener('click', function(e){ if (e.target === lb) closeLb(); });
      document.addEventListener('keydown', function(e){
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') closeLb();
        else if (e.key === 'ArrowRight') lbNext();
        else if (e.key === 'ArrowLeft') lbPrev();
      });
    }

    /* init */
    buildGallery();
    window.addEventListener('load', function(){ apply(false); });
    setTimeout(function(){ apply(false); }, 300);
    restart();
  })();
})();
