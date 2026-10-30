/* Diamond Ridge — "Book your showing" modal
   Calendar + enquiry form. On submit, the request goes to /api/send (Resend), which
   emails the sales inbox and sends the visitor a confirmation. If that fails, the
   visitor can still send it from their own mail app. */
(function () {
  var RECIPIENT = 'info@diamondridgeliving.ca';
  var ENDPOINT = '/api/send';
  var SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOW = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var viewY = today.getFullYear(), viewM = today.getMonth();
  var selDate = null, selSlot = null;

  var overlay = document.getElementById('bkOverlay');
  if (!overlay) return;

  var grid = document.getElementById('bkGrid');
  var label = document.getElementById('bkMonth');
  var prev = document.getElementById('bkPrev');
  var next = document.getElementById('bkNext');
  var slotRow = document.getElementById('bkSlots');
  var summary = document.getElementById('bkSummary');
  var err = document.getElementById('bkErr');
  var form = document.getElementById('bkForm');
  var done = document.getElementById('bkDone');
  var submitBtn = document.getElementById('bkSubmit');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  // local calendar date as YYYY-MM-DD (the server formats it for the emails)
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  function fmt(d) {
    return d.toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function updateSummary() {
    if (!selDate) { summary.textContent = 'No date selected yet'; return; }
    summary.textContent = fmt(selDate) + (selSlot ? ' \u00b7 ' + selSlot : ' \u00b7 time to be confirmed');
  }

  function renderCal() {
    label.textContent = MONTHS[viewM] + ' ' + viewY;
    grid.innerHTML = '';
    DOW.forEach(function (d) {
      var el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      grid.appendChild(el);
    });
    var first = new Date(viewY, viewM, 1).getDay();
    var days = new Date(viewY, viewM + 1, 0).getDate();
    for (var i = 0; i < first; i++) grid.appendChild(document.createElement('div'));
    for (var day = 1; day <= days; day++) {
      var d = new Date(viewY, viewM, day); d.setHours(0, 0, 0, 0);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = day;
      btn.setAttribute('aria-label', fmt(d));
      btn.setAttribute('aria-pressed', 'false');
      if (d < today) btn.disabled = true;
      if (d.getTime() === today.getTime()) { btn.classList.add('today'); btn.setAttribute('aria-current', 'date'); }
      if (selDate && d.getTime() === selDate.getTime()) { btn.classList.add('sel'); btn.setAttribute('aria-pressed', 'true'); }
      btn.addEventListener('click', (function (dd) {
        return function () {
          selDate = dd;
          renderCal();
          syncSlots();
          updateSummary();
          err.classList.remove('on');
          var picked = grid.querySelector('.cal-day.sel');
          if (picked) picked.focus();
        };
      })(d));
      grid.appendChild(btn);
    }
    prev.disabled = (viewY === today.getFullYear() && viewM === today.getMonth());
  }

  // minutes since midnight for a slot label like '2:30 PM'
  function slotMinutes(s) {
    var m = /^(\d+):(\d+) (AM|PM)$/.exec(s);
    return (Number(m[1]) % 12 + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
  }

  // disable time slots that have already passed when today is the chosen date
  function syncSlots() {
    var now = new Date();
    var isToday = selDate && selDate.getTime() === today.getTime();
    Array.prototype.forEach.call(slotRow.children, function (b) {
      var past = !!isToday && slotMinutes(b.textContent) <= now.getHours() * 60 + now.getMinutes();
      b.disabled = past;
      if (past && selSlot === b.textContent) {
        selSlot = null;
        b.classList.remove('sel');
        b.setAttribute('aria-pressed', 'false');
      }
    });
  }

  SLOTS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.textContent = s;
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      selSlot = (selSlot === s) ? null : s;
      Array.prototype.forEach.call(slotRow.children, function (c) { c.classList.remove('sel'); c.setAttribute('aria-pressed', 'false'); });
      if (selSlot) { b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); }
      updateSummary();
    });
    slotRow.appendChild(b);
  });

  prev.addEventListener('click', function () {
    viewM--; if (viewM < 0) { viewM = 11; viewY--; }
    renderCal();
  });
  next.addEventListener('click', function () {
    viewM++; if (viewM > 11) { viewM = 0; viewY++; }
    renderCal();
  });

  var closeBtn = document.getElementById('bkClose');
  var lastFocus = null;
  var openedAt = 0;

  function isOpen() { return overlay.classList.contains('on'); }

  // after a completed request, re-opening starts a fresh booking
  function resetIfDone() {
    if (!done.classList.contains('on')) return;
    done.classList.remove('on');
    form.style.display = '';
    document.getElementById('bkCalWrap').style.display = '';
    document.querySelector('.bk-head').style.display = '';
    ['bkName', 'bkPhone', 'bkEmail', 'bkNotes', 'bkCompany'].forEach(function (id) { document.getElementById(id).value = ''; });
    document.getElementById('bkInterest').selectedIndex = 0;
    selDate = null; selSlot = null;
    Array.prototype.forEach.call(slotRow.children, function (c) { c.classList.remove('sel'); c.setAttribute('aria-pressed', 'false'); c.disabled = false; });
    viewY = today.getFullYear(); viewM = today.getMonth();
    renderCal();
    updateSummary();
  }

  function open() {
    resetIfDone();
    lastFocus = document.activeElement;
    openedAt = Date.now();
    overlay.classList.add('on');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    if (!isOpen()) return;
    overlay.classList.remove('on');
    document.body.style.overflow = '';
    // drop the #book deep-link hash so a reload doesn't reopen the dialog
    if (location.hash === '#book' && window.history && history.replaceState) {
      history.replaceState(null, '', location.pathname + location.search);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  // keep keyboard focus inside the dialog while it is open
  function trapFocus(e) {
    var nodes = Array.prototype.filter.call(
      overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
      function (n) { return !n.disabled && n.tabIndex !== -1 && n.offsetParent !== null; }
    );
    if (!nodes.length) return;
    var first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
  }

  document.querySelectorAll('[data-book]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) {
    if (!isOpen()) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'Tab') trapFocus(e);
  });

  function showDone(msg) {
    form.style.display = 'none';
    document.getElementById('bkCalWrap').style.display = 'none';
    document.querySelector('.bk-head').style.display = 'none';
    if (msg) document.getElementById('bkDoneMsg').textContent = msg;
    done.classList.add('on');
    var doneTitle = done.querySelector('h2');
    if (doneTitle) doneTitle.focus();
  }

  // fallback when the server can't send: the same request, pre-filled in the visitor's mail app
  function mailtoHref(p) {
    var subject = 'Showing request \u2014 ' + p.name + ' \u2014 ' + p.date;
    var body =
      'SHOWING REQUEST' +
      '\n\nPreferred date: ' + p.date +
      '\nPreferred time: ' + (p.time || 'No preference') +
      '\n\nName: ' + p.name +
      '\nPhone: ' + (p.phone || 'Not provided') +
      '\nEmail: ' + p.email +
      '\nInterested in: ' + p.interest +
      '\n\nNotes: ' + (p.notes || 'None');
    return 'mailto:' + RECIPIENT +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  function showSendError(p) {
    err.textContent = 'Sorry, we couldn\u2019t send your request just now. Please call or WhatsApp 1 (403) 636-1855, or ';
    var a = document.createElement('a');
    a.href = mailtoHref(p);
    a.textContent = 'send it from your email app';
    err.appendChild(a);
    err.appendChild(document.createTextNode('.'));
    err.classList.add('on');
  }

  function send(p) {
    var label = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending\u2026';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form: 'showing',
        name: p.name, phone: p.phone, email: p.email, interest: p.interest, notes: p.notes,
        company: p.company,
        date: isoDate(selDate),
        time: p.time,
        elapsed: Date.now() - openedAt
      })
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (out) {
          if (!r.ok || !out.ok) throw new Error(out.error || 'HTTP ' + r.status);
        });
      })
      .then(function () {
        showDone('Thanks \u2014 your showing request has been sent. A confirmation is on its way to ' + p.email + ', and we\u2019ll confirm your appointment within one business day.');
      })
      .catch(function () { showSendError(p); })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      });
  }

  submitBtn.addEventListener('click', function () {
    var payload = {
      name: document.getElementById('bkName').value.trim(),
      phone: document.getElementById('bkPhone').value.trim(),
      email: document.getElementById('bkEmail').value.trim(),
      interest: document.getElementById('bkInterest').value,
      notes: document.getElementById('bkNotes').value.trim(),
      company: document.getElementById('bkCompany').value,
      date: selDate ? fmt(selDate) : '',
      time: selSlot || ''
    };

    if (!payload.name || !payload.email || !selDate) {
      err.textContent = 'Please add your name, email, and pick a date.';
      err.classList.add('on');
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
      err.textContent = 'That email address doesn\u2019t look right.';
      err.classList.add('on');
      return;
    }
    err.classList.remove('on');

    // honeypot filled in: a bot, so skip the email but look successful
    if (payload.company) { showDone(); return; }

    send(payload);
  });

  renderCal();
  updateSummary();

  // deep link from other pages: index.html#book opens the booking dialog
  if (location.hash === '#book') open();
})();
