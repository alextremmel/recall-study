(function () {
  "use strict";

  var CFG = window.STUDY_CONFIG;
  var N = CFG.NUM_ITEMS;
  var D = CFG.DIGITS;
  var params = new URLSearchParams(location.search);
  var TEST = params.get("test") === "1";
  var BACKUP_KEY = "recallStudyBackups";

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }

  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== id; });
    var first = document.querySelector("#" + id + " input:not([type=radio]):not([type=checkbox])");
    if (first) first.focus();
  }

  function ordinal(n) {
    var s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function makeId() {
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", out = "";
    for (var i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // Random numbers with no leading zero, chosen so that no two numbers share
  // two digits in the same places (positions 1+2, 2+3, or 1+3). That way any
  // answer with 2+ digits in the right places can only match one number.
  function makeNumbers() {
    var min = Math.pow(10, D - 1), max = Math.pow(10, D) - 1;
    for (var attempt = 0; attempt < 1000; attempt++) {
      var list = [], tries = 0;
      while (list.length < N && tries < 5000) {
        tries++;
        var n = String(min + Math.floor(Math.random() * (max - min + 1)));
        if (list.every(function (m) { return placeMatches(m, n) < 2; })) list.push(n);
      }
      if (list.length === N) return list;
    }
    throw new Error("Could not generate numbers");
  }

  // How many digits of `answer` (array or string, "" = blank) equal `shown` in the same place.
  function placeMatches(shown, answer) {
    var hits = 0;
    for (var i = 0; i < shown.length; i++) if (answer[i] && answer[i] === shown[i]) hits++;
    return hits;
  }

  function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }

  function loadBackups() {
    try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveBackup(row) {
    try {
      var all = loadBackups(); all.push(row);
      localStorage.setItem(BACKUP_KEY, JSON.stringify(all));
    } catch (e) { /* storage blocked: the download button is the fallback */ }
  }
  function markBackupSent(id) {
    try {
      var all = loadBackups();
      all.forEach(function (r) { if (r.participant_id === id) r.sent_to_sheet = "yes"; });
      localStorage.setItem(BACKUP_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    var cols = Object.keys(rows[0]);
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    var esc = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    return [cols.join(",")].concat(rows.map(function (r) { return cols.map(function (c) { return esc(r[c]); }).join(","); })).join("\n");
  }

  function download(name, text) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  }

  // ---------- backup export page: add ?export=1 to the URL ----------
  if (params.get("export") === "1") {
    var rows = loadBackups();
    document.querySelector("main").innerHTML =
      '<section class="screen"><h1>Responses saved on this device</h1><p>' + rows.length +
      ' response(s) are stored in this browser as a backup.</p><button id="dl">Download CSV</button></section>';
    $("dl").onclick = function () { download("recall-study-backup.csv", toCsv(rows)); };
    $("dl").disabled = !rows.length;
    return;
  }

  // ---------- state ----------
  var numbers = makeNumbers();
  var state = {
    id: makeId(),
    startedAt: new Date(),
    index: 0,
    shownAt: 0,
    typeAt: 0,
    viewMs: [],
    typeMs: [],
    immediate: [],
  };
  var inProgress = false;

  if (TEST) $("test-banner").hidden = false;

  window.addEventListener("beforeunload", function (e) {
    if (inProgress) { e.preventDefault(); e.returnValue = ""; }
  });

  // ---------- welcome / instructions ----------
  $("consent").addEventListener("change", function () { $("btn-start").disabled = !this.checked; });
  $("btn-start").onclick = function () { show("screen-instructions"); };
  $("btn-begin").onclick = function () { inProgress = true; showNumber(); };

  // ---------- sequence ----------
  function showNumber() {
    $("show-number").textContent = numbers[state.index];
    show("screen-show");
    state.shownAt = performance.now();
  }

  $("btn-seen").onclick = function () {
    state.viewMs[state.index] = Math.round(performance.now() - state.shownAt);
    $("show-number").textContent = "";
    $("type-input").value = "";
    show("screen-type");
    state.typeAt = performance.now();
  };

  function submitTyped() {
    var val = digitsOnly($("type-input").value);
    if (!val) { $("type-input").focus(); return; }
    state.typeMs[state.index] = Math.round(performance.now() - state.typeAt);
    state.immediate[state.index] = val;
    state.index++;
    if (state.index < N) showNumber(); else buildRecall();
  }
  $("btn-type-submit").onclick = submitTyped;
  $("type-input").addEventListener("keydown", function (e) { if (e.key === "Enter") submitTyped(); });

  // ---------- surprise recall ----------
  function buildRecall() {
    var box = $("recall-rows");
    box.innerHTML = "";
    var all = [];
    for (var r = 1; r <= N; r++) {
      var row = document.createElement("div");
      row.className = "row";
      for (var c = 1; c <= D; c++) {
        var inp = document.createElement("input");
        inp.className = "digit";
        inp.id = "d-" + r + "-" + c;
        inp.maxLength = 1;
        inp.setAttribute("inputmode", "numeric");
        inp.setAttribute("autocomplete", "off");
        inp.setAttribute("aria-label", "Row " + r + ", digit " + c);
        row.appendChild(inp);
        all.push(inp);
      }
      box.appendChild(row);
    }
    // Typing a digit jumps to the next box; Backspace in an empty box goes back.
    all.forEach(function (inp, k) {
      inp.addEventListener("input", function () {
        inp.value = digitsOnly(inp.value).slice(-1);
        if (inp.value && all[k + 1]) all[k + 1].focus();
      });
      inp.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !inp.value && all[k - 1]) { all[k - 1].focus(); e.preventDefault(); }
        if (e.key === "ArrowRight" && all[k + 1]) all[k + 1].focus();
        if (e.key === "ArrowLeft" && all[k - 1]) all[k - 1].focus();
      });
    });
    state.recallAt = performance.now();
    show("screen-recall");
    all[0].focus();
  }

  $("btn-recall-submit").onclick = function () {
    state.recallMs = Math.round(performance.now() - state.recallAt);
    inProgress = false;
    var row = buildRow();
    saveBackup(row);
    showResults(row);
    show("screen-done");
    sendRow(row);
  };

  // ---------- results shown to the participant ----------
  function showResults(row) {
    var body = $("results-body"), exact = 0, partial = 0;
    body.innerHTML = "";
    for (var p = 1; p <= N; p++) {
      var entered = "";
      for (var k = 1; k <= N; k++) {
        if (row["answer_" + k + "_matches_position"] === p) { entered = row["answer_" + k]; break; }
      }
      var cls = row["recall_exact_" + p] ? "hit" : row["recall_partial_or_exact_" + p] ? "partial" : "miss";
      if (cls === "hit") exact++; else if (cls === "partial") partial++;
      var tr = document.createElement("tr");
      tr.className = cls;
      tr.innerHTML = "<td>" + ordinal(p) + "</td><td class=\"num\">" + row["shown_" + p] +
        "</td><td class=\"num\">" + (entered ? entered : "—") + "</td>";
      body.appendChild(tr);
    }
    $("results-summary").textContent = "You remembered " + exact + " of " + N + " numbers exactly" +
      (partial ? ", and " + partial + " partially." : ".");
    var extras = [];
    for (var j = 1; j <= N; j++) {
      if (row["answer_" + j] && !row["answer_" + j + "_matches_position"]) extras.push(row["answer_" + j]);
    }
    if (extras.length) {
      $("results-extra").innerHTML = "Other entries that didn't match a number: " + extras.map(function (x) { return "<span class=\"nowrap\">" + x + "</span>"; }).join(", ");
      $("results-extra").hidden = false;
    }
  }

  function buildRow() {
    var row = {
      participant_id: state.id,
      test_run: TEST ? "yes" : "no",
      version: CFG.VERSION,
      started_at: state.startedAt.toISOString(),
      finished_at: new Date().toISOString(),
      num_items: N,
      digits: D,
    };
    // Position 1 = first number seen. back_N = how many numbers back from the end (1 = last seen).
    for (var i = 0; i < N; i++) {
      var p = i + 1;
      row["shown_" + p] = numbers[i];
      row["immediate_" + p] = state.immediate[i];
      row["immediate_correct_" + p] = state.immediate[i] === numbers[i] ? 1 : 0;
      row["view_ms_" + p] = state.viewMs[i];
      row["type_ms_" + p] = state.typeMs[i];
    }

    // Recall answers, in the order the participant entered them. "_" = blank digit.
    var best = numbers.map(function () { return 0; });
    var answers = 0;
    for (var r = 1; r <= N; r++) {
      var digits = [];
      for (var c = 1; c <= D; c++) digits.push(digitsOnly($("d-" + r + "-" + c).value).slice(-1));
      var text = digits.map(function (d) { return d || "_"; }).join("");
      var matched = "";
      if (digits.some(Boolean)) {
        answers++;
        // At most one shown number can have 2+ digits in place (see makeNumbers).
        for (var k = 0; k < N; k++) {
          var hits = placeMatches(numbers[k], digits);
          if (hits >= 2) { matched = k + 1; best[k] = Math.max(best[k], hits); break; }
        }
      }
      row["answer_" + r] = digits.some(Boolean) ? text : "";
      row["answer_" + r + "_matches_position"] = matched;
    }
    row.answers_entered = answers;

    // Scores per shown position: exact (all digits right), partial (2+ digits right and in place, exact included).
    for (var j = 0; j < N; j++) {
      var q = j + 1;
      row["back_" + q] = N - j;
      row["recall_digits_in_place_" + q] = best[j];
      row["recall_exact_" + q] = best[j] === D ? 1 : 0;
      row["recall_partial_or_exact_" + q] = best[j] >= 2 ? 1 : 0;
    }
    row.recall_ms = state.recallMs;
    row.screen = window.innerWidth + "x" + window.innerHeight;
    row.user_agent = navigator.userAgent;
    return row;
  }

  // Participants don't see a save message; results are also kept on the device as a backup.
  function setStatus() {}

  function sendRow(row) {
    if (!CFG.SCRIPT_URL) {
      setStatus("Your responses were saved on this device.", "warn");
      return;
    }
    var body = JSON.stringify(row);
    // text/plain avoids a CORS preflight, which Apps Script does not answer.
    fetch(CFG.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) { markBackupSent(row.participant_id); setStatus("Your responses were saved.", "ok"); }
        else throw new Error("bad response");
      })
      .catch(function () {
        // Fallback: send without reading the reply. Data usually still arrives.
        fetch(CFG.SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body })
          .then(function () { setStatus("Your responses were sent.", "ok"); })
          .catch(function () {
            setStatus("We couldn't reach the server, but your responses were saved on this device.", "warn");
          });
      });
  }
})();
