(function () {
  var toggle = document.getElementById('menuToggle');
  var closeBtn = document.getElementById('menuClose');
  var menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var closeTimer = null;
  var MENU_CLOSE_MS = 450;

  function isOpen() {
    return menu.classList.contains('is-open');
  }

  function finishClose() {
    menu.hidden = true;
    menu.setAttribute('aria-hidden', 'true');
  }

  function setOpen(open) {
    if (open && isOpen()) return;
    if (!open && menu.hidden) return;

    clearTimeout(closeTimer);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      menu.hidden = false;
      menu.setAttribute('aria-hidden', 'false');
      if (reduceMotion) {
        menu.classList.add('is-open');
        return;
      }
      requestAnimationFrame(function () {
        menu.classList.add('is-open');
      });
      return;
    }

    menu.classList.remove('is-open');
    if (reduceMotion) {
      finishClose();
      return;
    }
    closeTimer = setTimeout(finishClose, MENU_CLOSE_MS);
  }

  toggle.addEventListener('click', function () {
    setOpen(!isOpen());
  });
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      setOpen(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) setOpen(false);
  });

  menu.querySelectorAll('a[href]').forEach(function (link) {
    link.addEventListener('click', function () {
      setOpen(false);
    });
  });
})();

const observer = new IntersectionObserver(entries => {
  entries.forEach(el => {
    if (el.isIntersecting) {
      el.target.classList.add('visible');
      observer.unobserve(el.target);
    }
  });
}, { threshold: 0.07 });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

(function () {
  var canvas = document.getElementById('growth-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  var years = [1820, 1870, 1913, 1950, 1973, 2000, 2022];
  var series = [
    { label: 'Western Offshoots', color: '#e07a4a', width: 2.8, data: [2521, 4655, 9553, 14768, 24874, 44320, 56567] },
    { label: 'Eastern Europe', color: '#7ec86a', width: 2.8, data: [1052, 1515, 2000, 4129, 8885, 8830, 20660] },
    { label: 'East Asia', color: '#c5d63a', width: 2.0, data: [912, 990, 1093, 1113, 3372, 8149, 21727] },
    { label: 'Latin America', color: '#5ecfc9', width: 2.0, data: [959, 1299, 2249, 3680, 6954, 10129, 14026] },
    { label: 'South & Southeast Asia', color: '#9b7fd4', width: 2.8, data: [912, 851, 1142, 1067, 1633, 3433, 8381] },
    { label: 'Sub-Saharan Africa', color: '#7eb8e8', width: 2.8, data: [1191, 1284, 1683, 1330, 2018, 2010, 3433] }
  ];

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function useDesktopChartLayout() {
    var plotWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    return window.matchMedia('(min-width: 860px)').matches && plotWidth >= 640;
  }

  var endLabelsPlugin = {
    id: 'endLabels',
    afterDatasetsDraw: function (chart) {
      if (!useDesktopChartLayout()) return;
      if (!chart.$lineDrawDone) return;
      var ctx = chart.ctx;
      var fontSize = 12.5;
      var minGap = fontSize + 4;
      ctx.save();
      ctx.font = '600 ' + fontSize + 'px Newsreader, Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      var labels = [];
      chart.data.datasets.forEach(function (dataset, i) {
        var meta = chart.getDatasetMeta(i);
        if (!meta || meta.hidden || !meta.data.length) return;
        var lastVal = dataset.data[dataset.data.length - 1];
        if (lastVal == null) return;
        var pt = meta.data[meta.data.length - 1];
        if (!pt || pt.skip) return;
        labels.push({
          text: dataset.label,
          color: dataset.borderColor,
          x: pt.x + 10,
          y: pt.y
        });
      });

      // Bottom-to-top: keep lower labels on their points; push colliding ones above up.
      labels.sort(function (a, b) { return b.y - a.y; });
      for (var i = 1; i < labels.length; i++) {
        var below = labels[i - 1];
        var current = labels[i];
        if (below.y - current.y < minGap) {
          current.y = below.y - minGap;
        }
      }

      labels.forEach(function (label) {
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, label.x, label.y);
      });
      ctx.restore();
    }
  };

  var lineRevealPlugin = {
    id: 'lineReveal',
    beforeDatasetsDraw: function (chart) {
      var progress = chart.$revealProgress;
      if (progress == null || progress >= 1) return;
      var area = chart.chartArea;
      var ctx = chart.ctx;
      var width = (area.right - area.left) * progress;
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.left, area.top - 2, Math.max(width, 0), area.bottom - area.top + 4);
      ctx.clip();
      chart.$revealClipped = true;
    },
    afterDatasetsDraw: function (chart) {
      if (!chart.$revealClipped) return;
      chart.ctx.restore();
      chart.$revealClipped = false;
    }
  };

  var axisTitlePlugin = {
    id: 'axisTitle',
    afterDraw: function (chart) {
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var isDesktopChart = useDesktopChartLayout();
      ctx.save();
      ctx.fillStyle = '#6B9AE3';
      ctx.textAlign = 'left';
      if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
      if (isDesktopChart) {
        ctx.font = 'italic 400 18px Newsreader, Georgia, serif';
        ctx.textBaseline = 'bottom';
        ctx.fillText('GDP per capita (international $, 2011 prices)', area.left, area.top - 25);
      } else {
        var mobileTitleTop = 20;
        ctx.textBaseline = 'top';
        ctx.font = 'italic 400 12px Newsreader, Georgia, serif';
        ctx.fillText('GDP per capita', area.left, mobileTitleTop);
        ctx.font = 'italic 400 10px Newsreader, Georgia, serif';
        ctx.fillText('(international $, 2011 prices)', area.left, mobileTitleTop + 14);
      }
      ctx.restore();
    }
  };

  function chartLayoutPadding() {
    return useDesktopChartLayout()
      ? { top: 50, right: 168, bottom: 4, left: 4 }
      : { top: 64, right: 12, bottom: 4, left: 4 };
  }

  var isWide = window.matchMedia('(min-width: 1100px)').matches;
  var chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: years,
      datasets: series.map(function (s) {
        return {
          label: s.label,
          data: reduceMotion ? s.data.slice() : s.data.map(function () { return null; }),
          borderColor: s.color,
          backgroundColor: s.color,
          borderWidth: s.width,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: {
        padding: chartLayoutPadding()
      },
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              var v = ctx.parsed.y;
              if (v == null) return ctx.dataset.label;
              if (v >= 1000) return ctx.dataset.label + ': $' + Math.round(v / 1000) + 'k';
              return ctx.dataset.label + ': $' + Math.round(v);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { color: '#8a9bb5', font: { size: 12 } },
          border: { display: false }
        },
        y: {
          min: 0,
          max: 60000,
          grid: { color: '#3a4d6a', drawBorder: false },
          border: { display: false },
          ticks: {
            color: '#be9a7a',
            font: {
              family: 'Newsreader, Georgia, serif',
              size: isWide ? 21 : 14,
              weight: '400',
              lineHeight: isWide ? 23 / 21 : 1.2
            },
            padding: 8,
            crossAlign: 'far',
            stepSize: 20000,
            callback: function (value) {
              return '$' + (value / 1000) + 'k';
            }
          }
        }
      }
    },
    plugins: [lineRevealPlugin, endLabelsPlugin, axisTitlePlugin]
  });

  function syncChartPadding() {
    chart.options.layout.padding = chartLayoutPadding();
    chart.update('none');
  }

  window.addEventListener('resize', syncChartPadding);
  syncChartPadding();

  if (reduceMotion) {
    chart.$lineDrawDone = true;
    chart.$revealProgress = 1;
    return;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function drawChart() {
    chart.$lineDrawDone = false;
    chart.$revealProgress = 0;
    chart.data.datasets.forEach(function (dataset, i) {
      dataset.data = series[i].data.slice();
    });
    chart.options.animation = false;
    chart.update('none');

    var duration = 1800;
    var start = null;
    function frame(now) {
      if (start == null) start = now;
      var t = Math.min(1, (now - start) / duration);
      chart.$revealProgress = easeOutCubic(t);
      chart.options.layout.padding = chartLayoutPadding();
      chart.draw();
      if (t < 1) {
        requestAnimationFrame(frame);
        return;
      }
      chart.$revealProgress = 1;
      chart.$lineDrawDone = true;
      chart.draw();
    }
    requestAnimationFrame(frame);
  }

  var chartObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5) return;
      drawChart();
      chartObserver.disconnect();
    });
  }, { threshold: 0.5 });
  chartObserver.observe(canvas);
})();

(function () {
  const form = document.getElementById('newsletterForm');
  const thanks = document.getElementById('newsletterThanks');
  if (!form || !thanks) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const email = input.value.trim();
    if (!email) return;
    button.disabled = true;
    const originalLabel = button.textContent;
    button.textContent = 'Subscribing…';
    try {
      await fetch('https://script.google.com/macros/s/AKfycbx996LofuZ6IPGdVJ4MtqYq6SJBK2OzXJ1fro6Wvr1bHulzDftMVn7kdGpaDa9KgAmK/exec', {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({ email: email })
      });
      form.style.display = 'none';
      thanks.classList.add('show');
      thanks.classList.remove('hidden');
    } catch (err) {
      button.disabled = false;
      button.textContent = originalLabel;
      thanks.textContent = 'Something went wrong. Try again, or email daniel@thenewforeignassistance.org';
      thanks.classList.add('show');
      thanks.classList.remove('hidden');
    }
  });
})();
