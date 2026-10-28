/* GraceSpring Family Church — UI interactions (front-end only, nothing is saved or sent) */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Toast ---------- */
  var toastEl, toastTimer;
  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-show"); }, 2200);
  }
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-toast]");
    if (t) { e.preventDefault(); toast(t.getAttribute("data-toast")); }
  });

  /* ---------- Theme (dark mode) ---------- */
  function setTheme(mode) {
    if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("gs-theme", mode); } catch (err) { /* private mode */ }
    $$("[data-theme-switch]").forEach(function (s) { s.setAttribute("aria-checked", String(mode === "dark")); });
  }
  $$("[data-theme-switch]").forEach(function (s) {
    s.setAttribute("aria-checked", String(document.documentElement.getAttribute("data-theme") === "dark"));
    s.addEventListener("click", function () {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  });

  /* ---------- Tabs / segmented controls ---------- */
  $$("[data-tabs]").forEach(function (group) {
    var name = group.getAttribute("data-tabs");
    var buttons = $$("[data-tab]", group);
    function show(id) {
      buttons.forEach(function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-tab") === id)); });
      $$('[data-panel-group="' + name + '"]').forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== id; });
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { show(b.getAttribute("data-tab")); });
    });
  });

  /* ---------- Toggle buttons (follow, join, save, like...) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-toggle]");
    if (!t) return;
    var on = t.classList.toggle("is-on");
    t.setAttribute("aria-pressed", String(on));
    var label = on ? t.getAttribute("data-on") : t.getAttribute("data-off");
    var target = t.querySelector("[data-label]") || (t.hasAttribute("data-on") && !t.querySelector(".i") ? t : null);
    if (label && target) target.textContent = label;
    var counter = t.querySelector("[data-count]");
    if (counter) {
      var n = parseInt(counter.getAttribute("data-count"), 10) || 0;
      counter.textContent = String(n + (on ? 1 : 0));
    }
    var msg = on ? t.getAttribute("data-toast-on") : t.getAttribute("data-toast-off");
    if (msg) toast(msg);
  });

  /* ---------- Collapse (comments, read more) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-collapse]");
    if (!t) return;
    var target = document.getElementById(t.getAttribute("data-collapse"));
    if (!target) return;
    target.hidden = !target.hidden;
    var label = t.querySelector("[data-label]");
    if (label && t.hasAttribute("data-open-text")) {
      label.textContent = target.hidden ? t.getAttribute("data-closed-text") : t.getAttribute("data-open-text");
    }
    t.setAttribute("aria-expanded", String(!target.hidden));
  });

  /* ---------- Sheets / dialogs ---------- */
  var lastFocus;
  function openSheet(id) {
    var el = document.getElementById(id);
    if (!el) return;
    lastFocus = document.activeElement;
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    var focusable = $("input, textarea, button, a", el.querySelector(".sheet"));
    if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 60);
  }
  function closeSheets() {
    $$(".backdrop.is-open").forEach(function (b) { b.classList.remove("is-open"); b.setAttribute("aria-hidden", "true"); });
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  document.addEventListener("click", function (e) {
    var open = e.target.closest("[data-open]");
    if (open) { e.preventDefault(); openSheet(open.getAttribute("data-open")); return; }
    if (e.target.closest("[data-close]") || e.target.classList.contains("backdrop")) closeSheets();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheets(); });

  /* ---------- Password show/hide ---------- */
  $$("[data-pass]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.parentElement.querySelector("input");
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      $$("[data-eye]", btn).forEach(function (n) { n.hidden = show; });
      $$("[data-eye-off]", btn).forEach(function (n) { n.hidden = !show; });
    });
  });

  /* ---------- Forms that only show a message (no backend) ---------- */
  $$("form[data-toast-submit]").forEach(function (f) {
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      f.reset();
      closeSheets();
      toast(f.getAttribute("data-toast-submit"));
    });
  });

  /* ---------- Demo content looked up from the link (?t=… / ?e=…) ---------- */
  var params = new URLSearchParams(location.search);
  var TRACKS = {
    power: ["The Power of God's Word", "Latest message", "Pastor James Okafor", 43],
    waiting: ["Faith in the Waiting", "Faith in Action · Episode 1", "Pastor James Okafor", 45],
    trusting: ["Trusting God's Plan", "Faith in Action · Episode 2", "Pastor James Okafor", 42],
    fear: ["Overcoming Fear", "Faith in Action · Episode 3", "Pastor Bayo Adeyemi", 36],
    obedience: ["Walking in Obedience", "Faith in Action · Episode 4", "Pastor James Okafor", 40],
    promise: ["Living the Promise", "Faith in Action · Episode 5", "Pastor Bayo Adeyemi", 38],
    walking: ["Walking in Faith", "Sermon", "Pastor James Okafor", 38],
    "prayer-talk": ["Prayer Changes Things", "Sermon", "Pastor Bayo Adeyemi", 36],
    transformed: ["Living a Transformed Life", "Sermon", "Pastor James Okafor", 41],
    glory: ["Beholding His Glory", "Sermon", "Pastor Bayo Adeyemi", 39],
    love: ["Rooted in Love", "Sermon", "Pastor James Okafor", 37]
  };
  var EVENTS = {
    sunday: ["Sunday Service", "Nov 1, 2025 · 9:00 AM", "Join us for a powerful time of worship, God's Word and fellowship.", "Main Auditorium", "Ages 12+", "Refreshments will be served"],
    bible: ["Bible Study", "Nov 5, 2025 · 6:00 PM", "Deep dive into God's Word. Bring your Bible and a question or two.", "Youth Hall", "All ages welcome", "Come as you are"],
    anniversary: ["Church Anniversary", "Nov 8, 2025 · 10:00 AM", "Celebrating God's faithfulness across the years, together as one family.", "Main Auditorium", "All ages welcome", "Lunch to follow"],
    "prayer-night": ["Prayer Night", "Nov 15, 2025 · 7:00 PM", "Together in prayer. Come to pray, or come to be prayed for.", "Prayer Room", "Ages 12+", "Come as you are"],
    "worship-night": ["Worship Night", "Nov 22, 2025 · 6:00 PM", "A night of worship and gratitude.", "Main Auditorium", "All ages welcome", "Come as you are"],
    baptism: ["Baptism Sunday", "Oct 12, 2025 · 9:00 AM", "Eleven people confessed Christ in the water.", "Main Auditorium", "All ages welcome", "Photos shared afterwards"],
    outreach: ["Neighborhood Outreach", "Oct 4, 2025 · 8:00 AM", "Food, prayer, and conversations on the street.", "North Gate", "Ages 14+", "Breakfast provided"]
  };
  var evBox = $("[data-event-detail]");
  if (evBox && EVENTS[params.get("e")]) {
    var ev = EVENTS[params.get("e")];
    $("[data-e-title]").textContent = ev[0];
    var when = ev[1].split(" · ");
    $("[data-e-date]").textContent = when[0];
    $("[data-e-time]").textContent = when[1];
    $("[data-e-summary]").textContent = ev[2];
    $("[data-e-place]").textContent = ev[3];
    $("[data-e-ages]").textContent = ev[4];
    $("[data-e-note]").textContent = ev[5];
    document.title = ev[0] + " · GraceSpring";
  }
  /* Greeting on Home depends on the time of day */
  var greet = $("[data-greeting]");
  if (greet) {
    var hr = new Date().getHours();
    greet.textContent = (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + ", Raymond";
  }

  var kind = params.get("kind");
  if (kind) { var kb = $('[data-tab="' + kind + '"]'); if (kb) kb.click(); }

  /* ---------- Create post: image/audio panels ---------- */
  var addImage = $("[data-add-image]");
  if (addImage) {
    addImage.addEventListener("click", function () {
      $("[data-upload]").hidden = true;
      $("[data-preview]").hidden = false;
    });
    $("[data-remove-image]").addEventListener("click", function () {
      $("[data-upload]").hidden = false;
      $("[data-preview]").hidden = true;
    });
  }
  var rec = $("[data-record]");
  if (rec) {
    rec.addEventListener("click", function () {
      var on = rec.classList.toggle("is-on");
      $("[data-record-idle]").hidden = on;
      $("[data-record-live]").hidden = !on;
    });
  }

  /* ---------- Prayer: filters + new request (visual only) ---------- */
  var filterChips = $$("[data-filter]");
  if (filterChips.length) {
    filterChips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        filterChips.forEach(function (c) { c.setAttribute("aria-pressed", String(c === chip)); });
        var f = chip.getAttribute("data-filter");
        var visible = 0;
        $$("[data-audience]").forEach(function (item) {
          var show = f === "all" || item.getAttribute("data-audience") === f;
          item.hidden = !show;
          if (show && item.closest("[data-panel]") && !item.closest("[data-panel]").hidden) visible++;
        });
        var empty = $("[data-empty]");
        if (empty) empty.hidden = visible > 0;
      });
    });
  }
  var prayerForm = $("[data-prayer-form]");
  if (prayerForm) {
    prayerForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = prayerForm.elements.body.value.trim();
      if (!text) return;
      var aud = prayerForm.elements.audience.value;
      var tpl = $("#prayer-template").innerHTML;
      var labels = { shared: "Shared", private: "Private", leaders: "For Leaders" };
      var html = tpl.replace("{{audience}}", aud).replace(/\{\{label\}\}/g, labels[aud]).replace("{{text}}", "");
      var li = document.createElement("li");
      li.setAttribute("data-audience", aud);
      li.innerHTML = html;
      li.querySelector("[data-text]").textContent = text;
      $("[data-prayer-list]").prepend(li);
      prayerForm.reset();
      closeSheets();
      toast("Your prayer request was added.");
    });
  }

  /* ---------- Search page ---------- */
  var q = $("[data-search-input]");
  if (q) {
    var scope = "all";
    var results = $$(".result");
    var recent = $("[data-recent]");
    var resultsBox = $("[data-results]");
    var none = $("[data-none]");
    var chips = $$("[data-scope]");
    var run = function () {
      var term = q.value.trim().toLowerCase();
      if (!term) { recent.hidden = false; resultsBox.hidden = true; return; }
      recent.hidden = true; resultsBox.hidden = false;
      var shown = 0;
      results.forEach(function (r) {
        var ok = r.getAttribute("data-text").indexOf(term) !== -1 && (scope === "all" || r.getAttribute("data-kind") === scope);
        r.hidden = !ok;
        if (ok) shown++;
      });
      none.hidden = shown > 0;
    };
    q.addEventListener("input", run);
    chips.forEach(function (c) {
      c.addEventListener("click", function () {
        scope = c.getAttribute("data-scope");
        chips.forEach(function (x) { x.setAttribute("aria-pressed", String(x === c)); });
        run();
      });
    });
    $$("[data-term]").forEach(function (b) {
      b.addEventListener("click", function () { q.value = b.getAttribute("data-term"); run(); q.focus(); });
    });
    var clear = $("[data-clear-recent]");
    if (clear) clear.addEventListener("click", function () { $$("[data-term]").forEach(function (b) { b.parentElement.remove(); }); clear.hidden = true; });
    var preset = new URLSearchParams(location.search).get("q");
    if (preset) { q.value = preset; run(); }
  }

  /* ---------- Ministries filter ---------- */
  var mq = $("[data-ministry-search]");
  if (mq) {
    mq.addEventListener("input", function () {
      var term = mq.value.trim().toLowerCase();
      var n = 0;
      $$("[data-ministry]").forEach(function (m) {
        var ok = m.getAttribute("data-ministry").toLowerCase().indexOf(term) !== -1;
        m.hidden = !ok;
        if (ok) n++;
      });
      $("[data-ministry-none]").hidden = n > 0;
    });
  }

  /* ---------- Audio player (visual only) ---------- */
  var player = $("[data-player]");
  if (player) {
    var total = parseInt(player.getAttribute("data-total"), 10);
    var scrub = $("[data-scrub]", player);
    var trk = TRACKS[params.get("t")];
    if (trk) {
      total = trk[3] * 60;
      $("[data-title]", player).textContent = trk[0];
      $("[data-sub]", player).textContent = trk[1];
      $("[data-by]", player).textContent = trk[2];
      $("[data-total-label]", player).textContent = trk[3] + ":00";
      scrub.max = total;
      scrub.value = Math.round(total * 0.28);
      document.title = trk[0] + " · GraceSpring";
    }
    var now = $("[data-now]", player);
    var speeds = [1, 1.25, 1.5, 2, 0.75];
    var si = 0, pos = parseInt(scrub.value, 10), timer = null;
    var clock = function (s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
    var paint = function () {
      scrub.value = pos;
      scrub.style.setProperty("--p", (pos / total * 100) + "%");
      now.textContent = clock(pos);
    };
    var play = function () {
      player.classList.remove("is-paused");
      clearInterval(timer);
      timer = setInterval(function () { pos = Math.min(total, pos + speeds[si]); paint(); if (pos >= total) pause(); }, 1000);
    };
    var pause = function () { player.classList.add("is-paused"); clearInterval(timer); };
    $("[data-playpause]", player).addEventListener("click", function () { player.classList.contains("is-paused") ? play() : pause(); });
    $("[data-back15]", player).addEventListener("click", function () { pos = Math.max(0, pos - 15); paint(); });
    $("[data-fwd15]", player).addEventListener("click", function () { pos = Math.min(total, pos + 15); paint(); });
    scrub.addEventListener("input", function () { pos = parseInt(scrub.value, 10); paint(); });
    $("[data-speed]", player).addEventListener("click", function (e) { si = (si + 1) % speeds.length; e.currentTarget.textContent = speeds[si] + "x"; });
    paint();
    /* starts paused so nothing moves until the visitor presses play */
  }
  /* Hero progress on audio page: play button just navigates, nothing else needed */

  /* ---------- Share sheet (devotional) ---------- */
  var shareInfo = null;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-share-btn]");
    if (!b) return;
    var url = new URL(b.getAttribute("data-share-url"), location.href).href;
    var title = b.getAttribute("data-share-title");
    shareInfo = { title: title, url: url, text: "“" + title + "”, a devotional from GraceSpring Family Church" };
    $("#share [data-share-title]").textContent = title;
    $("#share [data-share-cover]").src = "assets/img/" + b.getAttribute("data-share-cover") + ".jpg";
    $("#share [data-share-wa]").href = "https://wa.me/?text=" + encodeURIComponent(shareInfo.text + " " + url);
    openSheet("share");
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-copy-link]") && shareInfo) {
      var done = function () { closeSheets(); toast("Link copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(shareInfo.url).then(done, done);
      else done();
    }
    if (e.target.closest("[data-native-share]") && shareInfo) {
      if (navigator.share) navigator.share({ title: shareInfo.title, text: shareInfo.text, url: shareInfo.url }).catch(function () {});
      else toast("Sharing isn't available on this device.");
    }
  });

  /* ---------- Confirm sheet (delete) ---------- */
  function confirmDelete(title, message, yes, label) {
    var el = document.getElementById("confirm");
    if (!el) {
      el = document.createElement("div");
      el.className = "backdrop"; el.id = "confirm"; el.setAttribute("aria-hidden", "true"); el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
      el.innerHTML = '<div class="sheet"><h2 data-ct></h2><p data-cm></p><div class="btn-row"><button class="btn btn-outline" type="button" data-close>Cancel</button><button class="btn btn-danger" type="button" data-confirm-yes>Delete</button></div></div>';
      document.body.appendChild(el);
    }
    $("[data-ct]", el).textContent = title;
    $("[data-cm]", el).textContent = message;
    var old = $("[data-confirm-yes]", el), fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    fresh.textContent = label || "Delete";
    fresh.addEventListener("click", function () { closeSheets(); yes(); });
    openSheet("confirm");
  }

  /* ---------- Comments: add, reply, like, edit, delete (front-end only) ---------- */
  var cRoot = $("[data-comments]");
  if (cRoot) {
    var cTpl = $("#comment-template");
    var cForm = $("[data-comment-form]");
    var part = function (li, sel) { return li.querySelector(":scope > .c-main > " + sel); };
    var count = function () { $$("[data-comment-total]").forEach(function (n) { n.textContent = String($$("[data-comment]", cRoot).length); }); };
    var make = function (text, isReply) {
      var li = cTpl.content.firstElementChild.cloneNode(true);
      part(li, "[data-c-text]").textContent = text;
      if (isReply) {
        li.classList.add("reply");
        var rf = part(li, "[data-reply-form]"), rl = part(li, "[data-replies]");
        if (rf) rf.remove();
        if (rl) rl.remove();
      }
      return li;
    };

    var cInput = $("input", cForm), cBtn = $("button[type=submit]", cForm);
    cInput.addEventListener("input", function () { cBtn.disabled = !cInput.value.trim(); });
    cForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = cInput.value.trim();
      if (!text) return;
      cRoot.prepend(make(text, false));
      cInput.value = ""; cBtn.disabled = true;
      count(); toast("Comment posted.");
    });

    cRoot.addEventListener("click", function (e) {
      var li = e.target.closest("[data-comment]");
      if (!li) return;
      var like = e.target.closest("[data-c-like]");
      if (like) {
        var on = like.classList.toggle("is-on");
        like.setAttribute("aria-pressed", String(on));
        var n = like.querySelector("[data-c-count]");
        n.textContent = String((parseInt(n.textContent, 10) || 0) + (on ? 1 : -1));
        return;
      }
      if (e.target.closest("[data-c-reply]")) {
        var top = li.classList.contains("reply") ? li.parentElement.closest("[data-comment]") : li;
        var rform = part(top, "[data-reply-form]");
        var rin = $("input", rform);
        rform.hidden = false;
        rin.value = "@" + part(li, ".c-head b").textContent + " ";
        rin.focus();
        return;
      }
      if (e.target.closest("[data-c-edit]")) {
        var box = part(li, "[data-c-edit-box]"), ta = $("textarea", box);
        ta.value = part(li, "[data-c-text]").textContent;
        li.classList.add("is-editing");
        part(li, "[data-c-text]").hidden = true; box.hidden = false; ta.focus();
        return;
      }
      if (e.target.closest("[data-c-cancel]")) {
        li.classList.remove("is-editing");
        part(li, "[data-c-text]").hidden = false; part(li, "[data-c-edit-box]").hidden = true;
        return;
      }
      if (e.target.closest("[data-c-save]")) {
        var val = $("textarea", part(li, "[data-c-edit-box]")).value.trim();
        if (!val) { toast("A comment can't be empty."); return; }
        part(li, "[data-c-text]").textContent = val;
        part(li, ".c-head [data-c-edited]").hidden = false;
        li.classList.remove("is-editing");
        part(li, "[data-c-text]").hidden = false; part(li, "[data-c-edit-box]").hidden = true;
        toast("Comment updated.");
        return;
      }
      if (e.target.closest("[data-c-delete]")) {
        var hasReplies = !li.classList.contains("reply") && part(li, "[data-replies]").children.length > 0;
        confirmDelete("Delete this comment?", hasReplies ? "This comment and its replies will be removed." : "This can't be undone.", function () {
          li.remove(); count(); toast("Comment deleted.");
        });
      }
    });
    cRoot.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-reply-form]");
      if (!f) return;
      e.preventDefault();
      var li = f.closest("[data-comment]"), inp = $("input", f), text = inp.value.trim();
      if (!text) return;
      var ul = part(li, "[data-replies]");
      ul.hidden = false; ul.appendChild(make(text, true));
      inp.value = ""; f.hidden = true;
      count(); toast("Reply posted.");
    });
  }

  /* ---------- Admin: delete rows + devotional form ---------- */
  document.addEventListener("click", function (e) {
    var d = e.target.closest("[data-admin-delete]");
    if (!d) return;
    var row = d.closest("[data-admin-row]");
    confirmDelete("Delete this devotional?", "“" + d.getAttribute("data-title") + "” will be removed for all members. This can't be undone.", function () {
      row.remove(); toast("Devotional deleted.");
    });
  });

  var devoForm = $("[data-devo-form]");
  if (devoForm) {
    var devos = JSON.parse($("#devo-data").textContent);
    var f = devoForm.elements;
    var serSel = $("[data-series-select]"), catSel = $("[data-cat-select]");
    var liveImg = $("[data-live-img]");
    var editing = params.get("edit");
    var live = function () {
      var name = serSel.value === "new" ? (f.newseries.value.trim() || "New series") : serSel.options[serSel.selectedIndex].text;
      $("[data-live-series]").textContent = name + ", Episode " + (f.ep.value || "1");
      $("[data-live-title]").textContent = f.title.value.trim() || "Your title appears here";
      $("[data-live-text]").textContent = f.preview.value.trim() || "The short preview appears here.";
      $("[data-count-left]").textContent = (160 - f.preview.value.length) + " left";
    };
    serSel.addEventListener("change", function () {
      $("[data-new-series]").hidden = serSel.value !== "new";
      var opt = serSel.options[serSel.selectedIndex];
      if (opt.getAttribute("data-cat")) catSel.value = opt.getAttribute("data-cat");
      live();
    });
    devoForm.addEventListener("input", live);
    $("[data-cover-input]").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      liveImg.src = URL.createObjectURL(file);
      $("[data-cover-label]").textContent = file.name;
    });
    if (editing) {
      var item = devos.filter(function (d) { return d.id === editing; })[0];
      if (item) {
        $("[data-form-title]").textContent = "Edit devotional";
        $("[data-publish]").textContent = "Save changes";
        f.cat.value = item.cat; f.series.value = item.series; f.ep.value = item.ep;
        f.title.value = item.title; f.preview.value = item.preview; f.body.value = item.body;
        liveImg.src = "assets/img/" + item.cover + ".jpg";
        document.title = "Edit devotional · GraceSpring";
      }
    }
    live();
    var leave = function (msg) { toast(msg); setTimeout(function () { location.href = "admin-devotional.html"; }, 1000); };
    devoForm.addEventListener("submit", function (e) { e.preventDefault(); leave(editing ? "Changes saved." : "Devotional published."); });
    $("[data-save-draft]").addEventListener("click", function () { leave("Saved as a draft."); });
  }

  /* ---------- Messages, verse cards, calls (front-end only) ---------- */
  var openTab = location.hash.slice(1);
  if (openTab) { var tabBtn = $('[data-tabs] [data-tab="' + openTab + '"]'); if (tabBtn) tabBtn.click(); }

  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-confirm]");
    if (!c) return;
    confirmDelete(c.getAttribute("data-confirm"), c.getAttribute("data-confirm-msg"), function () {
      toast(c.getAttribute("data-confirm-done"));
      var go = c.getAttribute("data-confirm-go");
      if (go) setTimeout(function () { location.href = go; }, 900);
    }, c.getAttribute("data-confirm-label") || "Confirm");
  });

  $$("[data-filter]").forEach(function (inp) {
    var scope = inp.getAttribute("data-filter-scope");
    var list = $('[data-filter-list="' + scope + '"]');
    inp.addEventListener("input", function () {
      var q = inp.value.trim().toLowerCase();
      $$("[data-filter-item]", list).forEach(function (it) {
        var hit = !q || (it.getAttribute("data-text") || "").indexOf(q) !== -1;
        (it.closest("li") || it).hidden = !hit;
      });
    });
  });

  var chatForm = $("[data-chat-form]");
  if (chatForm) {
    var chatBody = $("[data-chat-body]"), chatIn = $("input", chatForm), chatBtn = $("button[type=submit]", chatForm);
    var toEnd = function () { window.scrollTo(0, document.documentElement.scrollHeight); };
    chatIn.addEventListener("input", function () { chatBtn.disabled = !chatIn.value.trim(); });
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = chatIn.value.trim();
      if (!text) return;
      var empty = $("[data-empty]", chatBody); if (empty) empty.remove();
      var m = document.createElement("div"); m.className = "msg out";
      var b = document.createElement("div"); b.className = "bub";
      var p = document.createElement("p"); p.textContent = text;
      var t = document.createElement("span"); t.className = "msg-time";
      t.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      b.appendChild(p); b.appendChild(t); m.appendChild(b); chatBody.appendChild(m);
      chatIn.value = ""; chatBtn.disabled = true; toEnd();
    });
    toEnd();
  }

  var groupForm = $("[data-group-form]");
  if (groupForm) {
    var gName = $("input[name=gname]", groupForm), gBtn = $("button[type=submit]", groupForm);
    var gUpdate = function () {
      var n = $$("[data-pick]:checked", groupForm).length;
      $("[data-pick-count]").textContent = n + " selected";
      gBtn.disabled = !(gName.value.trim() && n);
    };
    groupForm.addEventListener("input", gUpdate); groupForm.addEventListener("change", gUpdate);
    groupForm.addEventListener("submit", function (e) {
      e.preventDefault(); toast("Group created.");
      setTimeout(function () { location.href = "messages.html"; }, 900);
    });
  }

  var maker = $("[data-card-maker]");
  if (maker) {
    var vcard = $("[data-v-card]"), fv = $("textarea[name=verse]", maker), fr = $("input[name=ref]", maker), fn = $("input[name=note]", maker);
    var paint = function () {
      $("[data-v-verse]", vcard).textContent = fv.value.trim() || "Your verse appears here";
      $("[data-v-ref]", vcard).textContent = fr.value.trim();
      var n = $("[data-v-note]", vcard); n.textContent = fn.value.trim(); n.hidden = !fn.value.trim();
    };
    [fv, fr, fn].forEach(function (f) { f.addEventListener("input", paint); });
    $$("[data-tpl]", maker).forEach(function (s) {
      s.addEventListener("click", function () {
        $$("[data-tpl]", maker).forEach(function (o) { o.setAttribute("aria-pressed", String(o === s)); });
        vcard.className = vcard.className.replace(/tpl-\S+/, "tpl-" + s.getAttribute("data-tpl"));
      });
    });
    $$("[data-verse]", maker).forEach(function (c) {
      c.addEventListener("click", function () {
        $$("[data-verse]", maker).forEach(function (o) { o.setAttribute("aria-pressed", String(o === c)); });
        fv.value = c.getAttribute("data-verse"); fr.value = c.getAttribute("data-ref"); paint();
      });
    });
    $$("[data-vstyle]", maker).forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-vstyle]", maker).forEach(function (o) { o.setAttribute("aria-selected", String(o === b)); });
        vcard.classList.toggle("vstyle-sans", b.getAttribute("data-vstyle") === "sans");
      });
    });
    var sendBtn = $("[data-send-card]");
    var boxes = $$("[data-recipient]");
    var recount = function () {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      sendBtn.disabled = !n; sendBtn.textContent = n ? "Send to " + n : "Send";
    };
    boxes.forEach(function (b) { b.addEventListener("change", recount); });
    var to = params.get("to");
    if (to) { var pre = boxes.filter(function (b) { return b.getAttribute("data-rid") === to; })[0]; if (pre) { pre.checked = true; recount(); } }
    sendBtn.addEventListener("click", function () {
      var n = boxes.filter(function (b) { return b.checked; }).length;
      closeSheets(); toast("Card sent to " + n + (n === 1 ? " person." : " chats."));
      setTimeout(function () { location.href = "messages.html#cards"; }, 1100);
    });
    paint();
  }

  var call = $("[data-call]");
  if (call) {
    var people = JSON.parse($("#people-data").textContent);
    var pid = params.get("p"); if (!people[pid]) pid = "sarah";
    var who = people[pid];
    $$("[data-call-name]").forEach(function (n) { n.textContent = who[0]; });
    var avBox = $("[data-call-av]");
    if (avBox) {
      if (who[1]) { var im = document.createElement("img"); im.src = "assets/img/avatars/" + pid + ".jpg"; im.alt = ""; avBox.appendChild(im); }
      else avBox.textContent = who[0].split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("");
    }
    var bg = $("[data-call-bg]");
    if (bg) { if (who[1]) bg.src = "assets/img/avatars/" + pid + ".jpg"; else bg.remove(); }
    $$("[data-call-switch]").forEach(function (a) { a.href = a.getAttribute("href").split("?")[0] + "?p=" + pid; });
    var st = $("[data-dial]");
    if (st) {
      st.textContent = "Calling...";
      setTimeout(function () { st.textContent = "Ringing..."; }, 1200);
      setTimeout(function () {
        var s = 0;
        var tick = function () { var m = Math.floor(s / 60), r = s % 60; st.textContent = (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; s++; };
        tick(); setInterval(tick, 1000);
      }, 3200);
    }
    $$("[data-cam]").forEach(function (b) {
      b.addEventListener("click", function () { $("[data-self]").classList.toggle("is-off", !b.classList.contains("is-on")); });
    });
  }
})();
