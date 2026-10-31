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

  // Distinct numbers with no leading zero, e.g. 100-999 for 3 digits.
  function makeNumbers() {
    var min = Math.pow(10, D - 1), max = Math.pow(10, D) - 1, seen = {}, list = [];
    while (list.length < N) {
      var n = String(min + Math.floor(Math.random() * (max - min + 1)));
      if (!seen[n]) { seen[n] = true; list.push(n); }
    }
    return list;
  }

  function digitsOnly(s) { return String(s || "").replace(/\D/g, ""); }

  // Partial credit: share of digits that are correct AND in the right place.
  function digitScore(shown, answer) {
    if (!answer) return 0;
    var hits = 0;
    for (var i = 0; i < shown.length; i++) if (answer[i] === shown[i]) hits++;
    return Math.round((hits / shown.length) * 1000) / 1000;
  }

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
  function progressText() { return "Number " + (state.index + 1) + " of " + N; }

  function showNumber() {
    $("show-progress").textContent = progressText();
    $("show-number").textContent = numbers[state.index];
    show("screen-show");
    state.shownAt = performance.now();
  }

  $("btn-seen").onclick = function () {
    state.viewMs[state.index] = Math.round(performance.now() - state.shownAt);
    $("show-number").textContent = "";
    $("type-progress").textContent = progressText();
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
    var box = $("recall-slots");
    box.innerHTML = "";
    for (var i = 1; i <= N; i++) {
      var label = ordinal(i) + " number" + (i === 1 ? " (first)" : i === N ? " (last)" : "");
      var row = document.createElement("label");
      row.className = "slot";
      row.innerHTML = "<span>" + label + "</span>";
      var inp = document.createElement("input");
      inp.className = "num-input";
      inp.id = "slot-" + i;
      inp.setAttribute("inputmode", "numeric");
      inp.setAttribute("autocomplete", "off");
      row.appendChild(inp);
      box.appendChild(row);
    }
    state.recallAt = performance.now();
    show("screen-recall");
  }

  $("btn-recall-submit").onclick = function () {
    state.recallMs = Math.round(performance.now() - state.recallAt);
    show("screen-followup");
  };

  // ---------- follow-up and save ----------
  function radio(name) {
    var el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }

  $("btn-finish").onclick = function () {
    inProgress = false;
    var row = buildRow();
    saveBackup(row);
    show("screen-done");
    sendRow(row);
    $("btn-download").onclick = function () { download("recall-" + row.participant_id + ".csv", toCsv([row])); };
  };

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
    var unplaced = String($("recall-unplaced").value || "").split(/[\s,;]+/).map(digitsOnly).filter(Boolean);

    // Position 1 = first number seen. "back" = how many numbers back from the end (1 = last seen).
    for (var i = 0; i < N; i++) {
      var p = i + 1;
      row["shown_" + p] = numbers[i];
      row["immediate_" + p] = state.immediate[i];
      row["immediate_correct_" + p] = state.immediate[i] === numbers[i] ? 1 : 0;
      row["view_ms_" + p] = state.viewMs[i];
      row["type_ms_" + p] = state.typeMs[i];
    }
    for (var j = 0; j < N; j++) {
      var q = j + 1, ans = digitsOnly($("slot-" + q).value);
      row["recall_" + q] = ans;
      row["recall_exact_" + q] = ans === numbers[j] ? 1 : 0;
      row["recall_digits_" + q] = digitScore(numbers[j], ans);
      row["unplaced_match_" + q] = unplaced.indexOf(numbers[j]) >= 0 ? 1 : 0;
      row["back_" + q] = N - j;
    }
    row.recall_unplaced = unplaced.join(" ");
    row.recall_ms = state.recallMs;
    row.suspected_test = radio("suspected");
    row.pilot_experience = radio("pilot");
    row.screen = window.innerWidth + "x" + window.innerHeight;
    row.user_agent = navigator.userAgent;
    return row;
  }

  function setStatus(text, cls) {
    var el = $("save-status");
    el.textContent = text;
    el.className = "status " + (cls || "");
  }

  function sendRow(row) {
    if (!CFG.SCRIPT_URL) {
      setStatus("Your responses were saved on this device.", "warn");
      $("btn-download").hidden = false;
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
            $("btn-download").hidden = false;
          });
      });
  }
})();
