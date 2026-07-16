(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // rail progress + active dot + click/keyboard nav
  var dots = Array.prototype.slice.call(document.querySelectorAll('.rail-dot'));
  var targets = dots.map(function(d){ return document.getElementById(d.getAttribute('data-target')); });
  var fill = document.getElementById('railFill');
  var ambientHot = document.getElementById('ambientHot');
  var ambientCool = document.getElementById('ambientCool');
  var HOT_PHASES = {1:1, 5:1};
  var COOL_PHASES = {6:1, 7:1, 9:1};

  function goTo(d){
    var t = document.getElementById(d.getAttribute('data-target'));
    if(t){ t.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'}); }
  }
  dots.forEach(function(d){
    d.addEventListener('click', function(){ goTo(d); });
    d.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); goTo(d); }
    });
  });

  // ---- scroll-scrubbed reveal engine ----
  // every element below animates continuously as a function of its own scroll
  // position, rather than a one-shot fade-in: scrolling back up un-reveals it.
  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  function collect(){
    document.querySelectorAll('.gallery').forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c,i){ c.classList.add('scrub'); c.dataset.delay = i*46; });
    });
    document.querySelectorAll('.obj-list').forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c,i){ c.classList.add('scrub'); c.dataset.delay = i*28; });
    });
    document.querySelectorAll('tbody').forEach(function(g){
      Array.prototype.forEach.call(g.children, function(c,i){ c.classList.add('scrub'); c.dataset.delay = i*34; });
    });
    document.querySelectorAll(
      '.panel h2, .panel-body p, .panel > p, .stat, blockquote, .quote-note, ' +
      '.compare-half, .compare-arrow, .final-hero-img, .obj-general, footer h3, footer p'
    ).forEach(function(el){ el.classList.add('scrub'); if(el.dataset.delay===undefined) el.dataset.delay = 0; });

    document.querySelectorAll('.tilt-inner').forEach(function(el){ el.classList.add('scrub-wipe'); });

    return Array.prototype.slice.call(document.querySelectorAll('.scrub'));
  }
  var scrubEls = collect();
  var wipeEls = Array.prototype.slice.call(document.querySelectorAll('.scrub-wipe'));
  var counters = Array.prototype.slice.call(document.querySelectorAll('[data-count-to]'));
  var nf = new Map();
  function fmt(val, decimals){
    var key = decimals;
    if(!nf.has(key)){ nf.set(key, new Intl.NumberFormat('fr-FR', {minimumFractionDigits:key, maximumFractionDigits:key})); }
    return nf.get(key).format(val);
  }

  function progressFor(el, delayPx){
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight;
    var start = vh*0.92 - (delayPx||0);
    var end = vh*0.46 - (delayPx||0);
    var p = (start - r.top) / (start - end);
    return Math.max(0, Math.min(1, p));
  }

  var heroStage = document.getElementById('heroStage3d');
  var heroCaption = document.querySelector('.hero-3d-caption');
  var heroSection = document.getElementById('p-hero');

  var lastActiveIdx = -1;

  function tick(){
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    var frac = scrollH > 0 ? scrollTop/scrollH : 0;
    fill.style.height = Math.min(100, Math.max(0, frac*100)) + '%';
    window.scrollFrac = frac;

    var viewMid = scrollTop + window.innerHeight*0.4;
    var activeIdx = 0;
    for(var i=0;i<targets.length;i++){
      if(targets[i] && targets[i].offsetTop <= viewMid){ activeIdx = i; }
    }
    if(activeIdx !== lastActiveIdx){
      dots.forEach(function(d,i){ d.classList.toggle('active', i===activeIdx); });
      if(ambientHot) ambientHot.classList.toggle('visible', !!HOT_PHASES[activeIdx]);
      if(ambientCool) ambientCool.classList.toggle('visible', !!COOL_PHASES[activeIdx]);
      lastActiveIdx = activeIdx;
    }

    if(!reduced){
      scrubEls.forEach(function(el){
        var p = easeOutCubic(progressFor(el, parseFloat(el.dataset.delay||0)));
        el.style.opacity = String(p);
        el.style.transform = 'translateY(' + ((1-p)*30) + 'px)';
      });
      wipeEls.forEach(function(el){
        var p = easeOutCubic(progressFor(el, 0));
        el.style.clipPath = 'inset(0 ' + ((1-p)*100) + '% 0 0)';
      });
      if(heroStage && heroSection){
        var hh = heroSection.offsetHeight;
        var hp = Math.min(1, scrollTop/(hh*0.85));
        heroStage.style.opacity = String(1 - hp*0.92);
        heroStage.style.transform = 'scale(' + (1+hp*0.10) + ')';
        if(heroCaption) heroCaption.style.opacity = String(1 - hp*1.4);
      }
    }

    counters.forEach(function(el){
      var p = easeOutCubic(progressFor(el, parseFloat(el.dataset.delay||0)));
      var target = parseFloat(el.dataset.countTo);
      var decimals = parseInt(el.dataset.decimals||'0', 10);
      var suffix = el.dataset.suffix || '';
      el.innerHTML = fmt(target*p, decimals) + suffix;
    });

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // 3D tilt on gallery cards
  if(!reduced && window.matchMedia('(hover: hover)').matches){
    document.querySelectorAll('.tilt-card').forEach(function(card){
      var inner = card.querySelector('.tilt-inner');
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left)/r.width - 0.5;
        var y = (e.clientY - r.top)/r.height - 0.5;
        inner.style.setProperty('--ry', (x*10)+'deg');
        inner.style.setProperty('--rx', (y*-10)+'deg');
      });
      card.addEventListener('mouseleave', function(){
        inner.style.setProperty('--ry','0deg');
        inner.style.setProperty('--rx','0deg');
      });
    });
  }
})();
