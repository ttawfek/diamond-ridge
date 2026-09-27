/* Diamond Ridge — "Book your showing" modal
   Calendar + enquiry form. On submit, POSTs to Netlify Forms, which records the
   submission and emails it out automatically. If that fails (e.g. the page is
   opened as a local file, or the site isn't on Netlify), it falls back to
   opening the visitor's mail app so a request is never lost. */
(function () {
  var RECIPIENT = 'tariktawfek71@hotmail.com';
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
      if (d < today) btn.disabled = true;
      if (d.getTime() === today.getTime()) btn.classList.add('today');
      if (selDate && d.getTime() === selDate.getTime()) btn.classList.add('sel');
      btn.addEventListener('click', (function (dd) {
        return function () {
          selDate = dd;
          renderCal();
          updateSummary();
          err.classList.remove('on');
        };
      })(d));
      grid.appendChild(btn);
    }
    prev.disabled = (viewY === today.getFullYear() && viewM === today.getMonth());
  }

  SLOTS.forEach(function (s) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'slot';
    b.textContent = s;
    b.addEventListener('click', function () {
      selSlot = (selSlot === s) ? null : s;
      Array.prototype.forEach.call(slotRow.children, function (c) { c.classList.remove('sel'); });
      if (selSlot) b.classList.add('sel');
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

  function open() { overlay.classList.add('on'); document.body.style.overflow = 'hidden'; }
  function close() { overlay.classList.remove('on'); document.body.style.overflow = ''; }

  document.querySelectorAll('[data-book]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });
  document.getElementById('bkClose').addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  function showDone(msg) {
    form.style.display = 'none';
    document.getElementById('bkCalWrap').style.display = 'none';
    document.querySelector('.bk-head').style.display = 'none';
    if (msg) document.getElementById('bkDoneMsg').textContent = msg;
    done.classList.add('on');
  }

  function mailtoFallback(p) {
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
    window.location.href = 'mailto:' + RECIPIENT +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
    showDone('Your email app should have opened with the request ready to send \u2014 just hit send. If nothing opened, call or WhatsApp 1 (403) 636-1855.');
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

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending\u2026';

    var encoded = new URLSearchParams({
      'form-name': 'showing-request',
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      date: payload.date,
      time: payload.time || 'No preference',
      interest: payload.interest,
      notes: payload.notes,
      'bot-field': payload.company
    }).toString();

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encoded
    })
      .then(function (r) { return r.ok; })
      .then(function (ok) {
        if (ok) {
          showDone('Thanks \u2014 your showing request has been sent. We\u2019ll confirm your appointment within one business day.');
        } else {
          mailtoFallback(payload);
        }
      })
      .catch(function () {
        mailtoFallback(payload);
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request this showing';
      });
  });

  renderCal();
  updateSummary();
})();
