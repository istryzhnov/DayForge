/*
 * Motion for the About page (public/about.html): sections fade in as they
 * scroll into view, and the "builder" sketch switches its modules on one by
 * one until the visitor takes over by clicking a module.
 *
 * A plain deferred script, like about-i18n.js, so it runs under the strict CSP
 * (script-src 'self'). Without it the page is complete and static.
 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal on scroll. */
  var reveals = doc.querySelectorAll('.reveal');
  if (!reduced && 'IntersectionObserver' in window) {
    root.classList.add('motion');
    var seen = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          seen.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    for (var r = 0; r < reveals.length; r++) seen.observe(reveals[r]);
  }

  /* Builder. */
  var mock = doc.querySelector('.mock');
  var buttons = doc.querySelectorAll('.module__btn[data-module]');
  if (!mock || !buttons.length) return;

  var order = [];
  for (var b = 0; b < buttons.length; b++) order.push(buttons[b].getAttribute('data-module'));

  var clock = mock.querySelector('.mock__clock');
  var amount = mock.querySelector('.mock__amount');
  var seconds = 42 * 60 + 17;
  var clockTimer = null;
  var autoTimer = null;
  var autoStep = 0;
  var userTookOver = false;
  var inView = false;

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function showClock() {
    if (!clock) return;
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    clock.textContent = pad(h) + ':' + pad(m) + ':' + pad(seconds % 60);
  }

  function countUp(target) {
    if (!amount) return;
    if (reduced) {
      amount.textContent = target.toLocaleString('en-US');
      return;
    }
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / 900, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      amount.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function isOn(id) {
    return mock.classList.contains('has-' + id);
  }

  function set(id, on) {
    if (isOn(id) === on) return;
    mock.classList.toggle('has-' + id, on);
    var button = doc.querySelector('.module__btn[data-module="' + id + '"]');
    if (button) button.setAttribute('aria-pressed', on ? 'true' : 'false');

    if (id === 'timer') {
      window.clearInterval(clockTimer);
      clockTimer = null;
      if (on && !reduced) {
        clockTimer = window.setInterval(function () {
          seconds += 1;
          showClock();
        }, 1000);
      }
    }
    if (id === 'money' && on) countUp(1240);
  }

  /* One module more every couple of seconds; when all are on, start over. */
  function tick() {
    if (userTookOver || !inView) return;
    if (autoStep < order.length) {
      set(order[autoStep], true);
      autoStep += 1;
      autoTimer = window.setTimeout(tick, 1900);
    } else {
      autoTimer = window.setTimeout(function () {
        if (userTookOver) return;
        order.forEach(function (id) {
          set(id, false);
        });
        autoStep = 0;
        autoTimer = window.setTimeout(tick, 1300);
      }, 3200);
    }
  }

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function (event) {
      var id = event.currentTarget.getAttribute('data-module');
      userTookOver = true;
      window.clearTimeout(autoTimer);
      set(id, !isOn(id));
    });
  }

  showClock();

  // A visitor who prefers less motion sees the whole app at once.
  if (reduced) {
    order.forEach(function (id) {
      set(id, true);
    });
    return;
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        inView = entries[0].isIntersecting;
        window.clearTimeout(autoTimer);
        if (inView && !userTookOver) autoTimer = window.setTimeout(tick, 700);
      },
      { threshold: 0.35 },
    ).observe(mock);
  } else {
    inView = true;
    tick();
  }
})();
