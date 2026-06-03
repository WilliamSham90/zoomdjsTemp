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

  /* ---- Mobile menu ---- */
  var burger = document.getElementById('burger');
  var links  = document.getElementById('navLinks');
  burger.addEventListener('click', function(){
    links.classList.toggle('open');
    burger.classList.toggle('active');
  });
  links.addEventListener('click', function(e){
    if (e.target.tagName === 'A') links.classList.remove('open');
  });

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

  /* ---- Testimonial rotator ---- */
  var quotes = Array.prototype.slice.call(document.querySelectorAll('.quote'));
  var dotsWrap = document.getElementById('qdots');
  if (quotes.length && dotsWrap){
    var idx = 0, timer;
    quotes.forEach(function(_, i){
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Testimonial ' + (i+1));
      if (i === 0) b.classList.add('on');
      b.addEventListener('click', function(){ go(i); reset(); });
      dotsWrap.appendChild(b);
    });
    var dots = dotsWrap.children;
    function go(n){
      quotes[idx].classList.remove('active');
      dots[idx].classList.remove('on');
      idx = (n + quotes.length) % quotes.length;
      quotes[idx].classList.add('active');
      dots[idx].classList.add('on');
    }
    function reset(){ clearInterval(timer); timer = setInterval(function(){ go(idx + 1); }, 6500); }
    reset();
  }

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

  /* ---- Packages slider (responsive, swipe + arrows + loop) ---- */
  var track = document.getElementById('pkgTrack');
  if (track){
    var prev = document.getElementById('pkgPrev');
    var next = document.getElementById('pkgNext');
    var step = function(){
      var card = track.querySelector('.pkg');
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || 22) || 22;
      return card.getBoundingClientRect().width + gap;
    };
    var maxScroll = function(){ return track.scrollWidth - track.clientWidth; };

    /* animate scrollLeft directly (no CSS smooth / no snap — those block it) */
    var raf = null;
    var animateTo = function(target){
      target = Math.max(0, Math.min(target, maxScroll()));
      if (raf) cancelAnimationFrame(raf);
      if (reduce){ track.scrollLeft = target; return; }
      var start = track.scrollLeft, dist = target - start, t0 = null, dur = 440;
      if (Math.abs(dist) < 1){ track.scrollLeft = target; return; }
      var frame = function(ts){
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        track.scrollLeft = start + dist * e;
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    var goNext = function(){
      if (track.scrollLeft >= maxScroll() - 4) animateTo(0);
      else animateTo(track.scrollLeft + step());
    };
    var goPrev = function(){
      if (track.scrollLeft <= 4) animateTo(maxScroll());
      else animateTo(track.scrollLeft - step());
    };
    if (next) next.addEventListener('click', goNext);
    if (prev) prev.addEventListener('click', goPrev);

    /* drag-to-scroll */
    var down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener('pointerdown', function(e){
      down = true; moved = false; startX = e.clientX; startL = track.scrollLeft;
      if (raf) cancelAnimationFrame(raf);
      track.style.cursor = 'grabbing';
    });
    track.addEventListener('pointermove', function(e){
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      track.scrollLeft = startL - dx;
    });
    var endDrag = function(){ down = false; track.style.cursor = ''; };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointerleave', endDrag);
    track.addEventListener('click', function(e){ if (moved){ e.preventDefault(); e.stopPropagation(); } }, true);

    /* gentle autoplay; pauses on interaction */
    if (!reduce){
      var auto = setInterval(goNext, 5200);
      var pause = function(){ if (auto){ clearInterval(auto); auto = null; } };
      ['pointerenter','pointerdown','focusin'].forEach(function(ev){ track.addEventListener(ev, pause); });
      [prev, next].forEach(function(b){ if (b) b.addEventListener('click', pause); });
    }
  }
})();
