/* App lock guard: runs first so locked users never see app screens. */
(function () {
  try {
    var page = location.pathname.split("/").pop() || "index.html";
    var PUBLIC = /^(index|signin|signup|onboarding-\d|permission-notifications|lock-setup|pin-setup|lock)\.html$/;
    var on = localStorage.getItem("gs-lock-on") === "1" && localStorage.getItem("gs-lock-method");
    if (on && !PUBLIC.test(page) && sessionStorage.getItem("gs-unlocked") !== "1")
      location.replace("lock.html?next=" + encodeURIComponent(page + location.search));
    var hiddenAt = 0;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 60000) { sessionStorage.removeItem("gs-unlocked"); if (on && !PUBLIC.test(page)) location.reload(); }
    });
  } catch (e) {}
})();

/* GraceSpring feature scripts (front-end only): share image, chat extras, notifications, app lock.
   Uses helpers exported by main.js on window.GS. */
(function () {
  "use strict";
  var GS = window.GS;
  if (!GS) return;
  var $ = GS.$, $$ = GS.$$, toast = GS.toast, openSheet = GS.openSheet, closeSheets = GS.closeSheets;

  /* ---------- Share sheet: branded image of the post ---------- */
  var share = null;
  var frame = $("[data-share-frame]");

  function absolute(u) { try { return new URL(u, location.href).href; } catch (e) { return u; } }

  function fillPreview(d) {
    var card = $("[data-sf-card]", frame);
    card.className = "scard";
    card.style.backgroundImage = "";
    if (d.img) {
      card.classList.add("has-img");
      card.style.backgroundImage = "linear-gradient(rgba(5,15,106,0.25), rgba(5,15,106,0.88)), url(assets/img/" + d.img + ".jpg)";
    }
    $("[data-sf-text]", frame).textContent = d.text;
    $("[data-sf-credit]", frame).textContent = d.kind === "devotional" ? d.by : "Words by " + d.by;
    $("[data-sf-date]", frame).textContent = d.date;
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-share-btn]");
    if (!b || !frame) return;
    var kind = b.getAttribute("data-share-kind") || "quote";
    share = {
      kind: kind,
      text: b.getAttribute("data-share-text") || "",
      by: b.getAttribute("data-share-by") || "GraceSpring Family Church",
      date: b.getAttribute("data-share-date") || "",
      img: b.getAttribute("data-share-img") || "",
      url: absolute(b.getAttribute("data-share-url") || location.href),
      title: b.getAttribute("data-share-title") || "GraceSpring Family Church"
    };
    if (kind === "quote" || kind === "text") share.img = "";
    fillPreview(share);
    var msg = "From GraceSpring Family Church. Share faith. Share hope.";
    $("[data-share-wa]").href = "https://wa.me/?text=" + encodeURIComponent(share.text + "\n" + msg + "\n" + share.url);
    openSheet("share");
  });

  function loadImage(src) {
    return new Promise(function (res, rej) {
      var im = new Image();
      im.onload = function () { res(im); };
      im.onerror = rej;
      im.src = src;
    });
  }
  function wrap(ctx, text, maxW) {
    var words = text.split(/\s+/), lines = [], line = "";
    words.forEach(function (w) {
      var t = line ? line + " " + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    });
    if (line) lines.push(line);
    return lines;
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* Draws the same frame the preview shows: header, navy card, footer. */
  function renderShareImage(d) {
    var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, system-ui, sans-serif';
    var W = 1080, outer = 40, pad = 36, NAVY = "#050f6a", GOLD = "#e9c46a";
    var cw = W - outer * 2 - pad * 2;
    var pre = document.createElement("canvas").getContext("2d");
    pre.font = "600 56px " + FONT;
    var cardInner = cw - 112;
    var lines = wrap(pre, d.text, cardInner).slice(0, 9);
    var hasImg = !!d.img;
    var cardH = hasImg ? Math.max(620, 220 + lines.length * 70) : 130 + lines.length * 70 + 190;
    var headH = 150, footH = 80;
    var H = outer * 2 + pad * 2 + headH + cardH + footH;
    return Promise.all([
      loadImage("assets/img/mark.png"),
      hasImg ? loadImage("assets/img/" + d.img + ".jpg") : Promise.resolve(null)
    ]).then(function (imgs) {
      var logo = imgs[0], photo = imgs[1];
      var c = document.createElement("canvas"); c.width = W; c.height = H;
      var ctx = c.getContext("2d");
      ctx.fillStyle = "#eef0f6"; ctx.fillRect(0, 0, W, H);
      var fx = outer, fy = outer, fw = W - outer * 2, fh = H - outer * 2;
      ctx.save(); ctx.shadowColor = "rgba(20,20,60,0.12)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
      rr(ctx, fx, fy, fw, fh, 64); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
      // header
      var lx = fx + pad, ly = fy + pad + 10, ls = 104;
      ctx.save(); ctx.beginPath(); ctx.arc(lx + ls / 2, ly + ls / 2, ls / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = NAVY; ctx.fillRect(lx, ly, ls, ls);
      ctx.drawImage(logo, lx + 8, ly + 8, ls - 16, ls - 16); ctx.restore();
      ctx.textBaseline = "alphabetic"; ctx.fillStyle = NAVY; ctx.font = "700 32px " + FONT;
      try { ctx.letterSpacing = "1px"; } catch (e) {}
      ctx.fillText("GRACESPRING FAMILY CHURCH", lx + ls + 24, ly + 46);
      try { ctx.letterSpacing = "0px"; } catch (e) {}
      ctx.fillStyle = "#8a8a94"; ctx.font = "500 30px " + FONT;
      var sub = d.kind === "devotional" ? "Devotional" : "Shared by Raymond Nicholas";
      ctx.fillText(sub, lx + ls + 24, ly + 90);
      ctx.textAlign = "right"; ctx.font = "500 27px " + FONT; ctx.fillText(d.date, fx + fw - pad, ly + 46); ctx.textAlign = "left";
      // card
      var cx = fx + pad, cy = fy + pad + headH, cwid = fw - pad * 2;
      ctx.save(); rr(ctx, cx, cy, cwid, cardH, 44); ctx.clip();
      ctx.fillStyle = NAVY; ctx.fillRect(cx, cy, cwid, cardH);
      if (photo) {
        var r = Math.max(cwid / photo.width, cardH / photo.height), pw = photo.width * r, ph = photo.height * r;
        ctx.drawImage(photo, cx + (cwid - pw) / 2, cy + (cardH - ph) / 2, pw, ph);
        var g = ctx.createLinearGradient(0, cy, 0, cy + cardH);
        g.addColorStop(0, "rgba(5,15,106,0.2)"); g.addColorStop(1, "rgba(5,15,106,0.92)");
        ctx.fillStyle = g; ctx.fillRect(cx, cy, cwid, cardH);
      } else {
        ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2;
        [260, 330].forEach(function (rad) { ctx.beginPath(); ctx.arc(cx + cwid + 20, cy - 20, rad, 0, Math.PI * 2); ctx.stroke(); });
      }
      ctx.restore();
      var tx = cx + 56, ty;
      if (!hasImg) {
        ctx.fillStyle = GOLD; ctx.font = "700 190px Georgia, serif"; ctx.fillText("“", tx - 6, cy + 170);
        ty = cy + 250;
      } else { ty = cy + cardH - 170 - lines.length * 70; }
      ctx.fillStyle = "#fff"; ctx.font = "600 56px " + FONT;
      lines.forEach(function (ln, i) { ctx.fillText(ln, tx, ty + i * 70); });
      var ly2 = ty + lines.length * 70 - 20;
      ctx.fillStyle = GOLD; rr(ctx, tx, ly2 + 20, 120, 8, 4); ctx.fill();
      ctx.font = "700 29px " + FONT; try { ctx.letterSpacing = "3px"; } catch (e) {}
      ctx.fillText((d.kind === "devotional" ? d.by : "WORDS BY " + d.by).toUpperCase(), tx, ly2 + 82);
      try { ctx.letterSpacing = "0px"; } catch (e) {}
      // footer
      var fyy = cy + cardH + 56;
      ctx.fillStyle = "#8a8a94"; ctx.font = "500 22px " + FONT; try { ctx.letterSpacing = "3px"; } catch (e) {}
      ctx.fillText("GRACESPRING FAMILY CHURCH", cx + 8, fyy);
      ctx.textAlign = "right"; ctx.fillStyle = "#b8892a"; ctx.font = "700 22px " + FONT;
      ctx.fillText("SHARE FAITH. SHARE HOPE.", cx + cwid - 8, fyy); ctx.textAlign = "left";
      try { ctx.letterSpacing = "0px"; } catch (e) {}
      return new Promise(function (res, rej) { try { c.toBlob(function (b) { b ? res(b) : rej(new Error("blob")); }, "image/png"); } catch (err) { rej(err); } });
    });
  }
  window.GS.renderShareImage = renderShareImage;

  function download(blob, name) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  var fileName = function () { return "gracespring-" + (share && share.kind || "post") + ".png"; };
  var imageFail = function () { toast("Image sharing needs the site to be hosted. Try again once it is live."); };

  document.addEventListener("click", function (e) {
    if (!share) return;
    if (e.target.closest("[data-share-image]")) {
      renderShareImage(share).then(function (blob) {
        var file = new File([blob], fileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: share.text + "\n" + share.url, title: share.title }).catch(function () {});
        } else { download(blob, fileName()); toast("Image saved. Share it from your gallery."); }
      }).catch(imageFail);
    }
    if (e.target.closest("[data-save-image]")) {
      renderShareImage(share).then(function (blob) { download(blob, fileName()); toast("Image saved."); }).catch(imageFail);
    }
    if (e.target.closest("[data-copy-link]")) {
      var done = function () { closeSheets(); toast("Link copied."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(share.url).then(done, done); else done();
    }
  });
})();

/* ---------- Chat: WhatsApp-style composer, voice notes, files, bot ---------- */
(function () {
  "use strict";
  var GS = window.GS; if (!GS) return;
  var $ = GS.$, $$ = GS.$$, toast = GS.toast, closeSheets = GS.closeSheets;

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-attach-toast]");
    if (a) { closeSheets(); toast(a.getAttribute("data-attach-toast")); }
  });

  /* voice bubble playback (simulated) */
  var playing = null;
  function setBars(w, f) { var bs = w.children, n = Math.round(bs.length * f); for (var i = 0; i < bs.length; i++) bs[i].classList.toggle("on", i < n); }
  function parseDur(s) { var p = String(s).split(":"); return (+p[0] || 0) * 60 + (+p[1] || 0); }
  function stopPlay() {
    if (!playing) return;
    clearInterval(playing.timer); playing.btn.classList.remove("playing");
    setBars(playing.wave, 0); playing = null;
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-voice]"); if (!b) return;
    var same = playing && playing.btn === b; stopPlay(); if (same) return;
    var wave = b.parentNode.querySelector(".wave"), total = Math.max(parseDur(b.getAttribute("data-dur")), 2), t0 = Date.now();
    b.classList.add("playing");
    playing = { btn: b, wave: wave, timer: setInterval(function () {
      var f = (Date.now() - t0) / (total * 1000);
      if (f >= 1) { stopPlay(); return; }
      setBars(wave, f);
    }, 120) };
  });

  var form = $("[data-wa-form]"); if (!form) return;
  var body = $("[data-chat-body]"), input = $("input[type=text]", form), rec = $("[data-rec]");
  var timeEl = $("[data-rec-time]"), isBot = body.hasAttribute("data-bot");
  var now = function () { return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };
  var toEnd = function () { window.scrollTo(0, document.documentElement.scrollHeight); };
  var clear = function () { var em = $("[data-empty]", body); if (em) em.remove(); };
  function fromTpl(id) { return document.getElementById(id).content.firstElementChild.cloneNode(true); }
  function put(node) { clear(); body.appendChild(node); toEnd(); return node; }
  function setTime(n) { var t = $(".msg-time", n); if (t) t.textContent = now(); }

  function addText(text, side) {
    var m = document.createElement("div"); m.className = "msg " + side;
    if (side === "in" && isBot) { var a = fromTpl("tpl-typing"); m.innerHTML = a.firstElementChild.outerHTML; }
    var b = document.createElement("div"); b.className = "bub";
    var p = document.createElement("p"); p.textContent = text;
    var t = document.createElement("span"); t.className = "msg-time"; t.textContent = now();
    b.appendChild(p); b.appendChild(t); m.appendChild(b); return put(m);
  }
  function addLink(label, href) {
    var last = body.lastElementChild; if (!last) return;
    var a = document.createElement("a"); a.className = "bot-link"; a.href = href; a.textContent = label;
    last.querySelector(".bub").insertBefore(a, last.querySelector(".msg-time"));
  }

  /* bot */
  var VERSES = ["\"The Lord is my shepherd; I shall not want.\" Psalm 23:1", "\"Be strong and courageous. Do not be afraid.\" Joshua 1:9", "\"I can do all things through Christ who strengthens me.\" Philippians 4:13", "\"Trust in the Lord with all your heart.\" Proverbs 3:5"];
  var vi = 0;
  var BRAIN = [
    [/service|time|when|sunday|schedule/, "Sunday service is at 9:00 AM in the Main Auditorium. Doors open at 8:30. Midweek prayer is on Wednesday at 6:00 PM.", "See events", "events.html"],
    [/where|locat|address|direction|map/, "We are at 12 Grace Avenue, Ikeja, Lagos. Parking is free behind the main hall.", "Get directions", "events.html"],
    [/give|offering|tithe|donat/, "Online giving is coming soon to the app. For now, please ask a church admin or use the offering box on Sunday."],
    [/verse|bible|scripture/, null],
    [/pray|prayer|help|hurt|sad|sick/, "I am sorry you are going through this. You can send a prayer request and the prayer team will stand with you.", "Request prayer", "prayer.html"],
    [/devotion|read|study/, "Today's devotional is ready for you. It takes about five minutes.", "Read devotional", "devotional.html"],
    [/hi|hello|hey|good morning/, "Hello Raymond. How can I help you today?"],
    [/thank/, "You are welcome. God bless you."]
  ];
  function botReply(q) {
    var s = q.toLowerCase(), hit = null;
    BRAIN.forEach(function (r) { if (!hit && r[0].test(s)) hit = r; });
    var typing = fromTpl("tpl-typing"); put(typing);
    setTimeout(function () {
      typing.remove();
      var text, label, href;
      if (hit && hit[1] === null) { text = VERSES[vi++ % VERSES.length]; }
      else if (hit) { text = hit[1]; label = hit[2]; href = hit[3]; }
      else { text = "I am not sure about that yet. I can help with service times, location, giving, prayer, the devotional and Bible verses. A church admin can help with anything else."; }
      var m = addText(text, "in");
      if (label) addLink(label, href);
    }, 900);
  }

  function sendText() {
    var v = input.value.trim(); if (!v) return;
    addText(v, "out"); input.value = ""; form.classList.remove("has-text");
    if (isBot) botReply(v);
  }
  input.addEventListener("input", function () { form.classList.toggle("has-text", !!input.value.trim()); });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.classList.contains("has-text")) sendText(); else startRec();
  });
  $$("[data-bot-chip]").forEach(function (c) {
    c.addEventListener("click", function () { addText(c.textContent, "out"); botReply(c.textContent); var w = c.parentNode; if (w) w.hidden = true; });
  });

  /* voice recording (simulated) */
  var recTimer = null, recStart = 0;
  function fmt(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function startRec() {
    closeSheets(); form.hidden = true; rec.hidden = false; recStart = Date.now(); timeEl.textContent = "0:00";
    clearInterval(recTimer);
    recTimer = setInterval(function () { timeEl.textContent = fmt(Math.floor((Date.now() - recStart) / 1000)); }, 250);
  }
  function endRec() { clearInterval(recTimer); rec.hidden = true; form.hidden = false; }
  $("[data-rec-cancel]").addEventListener("click", function () { endRec(); toast("Recording deleted."); });
  $("[data-rec-send]").addEventListener("click", function () {
    var secs = Math.max(1, Math.round((Date.now() - recStart) / 1000)); endRec();
    var n = fromTpl("tpl-voice"), btn = $("[data-voice]", n), d = fmt(secs);
    btn.setAttribute("data-dur", d); $(".vdur", n).textContent = d; setTime(n); put(n);
  });
  var attachVoice = $("[data-attach-voice]"); if (attachVoice) attachVoice.addEventListener("click", startRec);
  if (GS.params.get("vm")) { toast("Leave a voicemail. Tap send when done."); startRec(); }

  /* photos and documents */
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  $$("[data-file-image]").forEach(function (f) {
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; if (!file) return; closeSheets();
      var n = fromTpl("tpl-image"); $("img", n).src = URL.createObjectURL(file); setTime(n); put(n); f.value = "";
    });
  });
  $$("[data-file-doc]").forEach(function (f) {
    f.addEventListener("change", function () {
      var file = f.files && f.files[0]; if (!file) return; closeSheets();
      var n = fromTpl("tpl-file"); $("b", n).textContent = file.name;
      var ext = (file.name.split(".").pop() || "file").toUpperCase();
      $("small", n).textContent = size(file.size) + " · " + ext; setTime(n); put(n); f.value = "";
    });
  });
  var cam = $("[data-cam]"); if (cam) cam.addEventListener("click", function () { var f = $("[data-file-image]:nth-of-type(1)", document); var all = $$("[data-file-image]"); (all[1] || all[0]).click(); });
  toEnd();
})();


/* ---------- Notifications banner, app lock, PIN ---------- */
(function () {
  "use strict";
  var GS = window.GS; if (!GS) return;
  var $ = GS.$, $$ = GS.$$, toast = GS.toast, openSheet = GS.openSheet, closeSheets = GS.closeSheets;
  var S = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var tpl = function (id) { var t = document.getElementById(id); return t ? t.innerHTML : ""; };
  var next = function () { var n = GS.params.get("next"); return n && /^[\w\-.?=&%]+$/.test(n) ? n : "home.html"; };

  /* switches (persisted) */
  $$("[data-switch]").forEach(function (sw) {
    var key = "gs-sw-" + sw.getAttribute("data-switch"), saved = S.get(key);
    if (saved !== null) sw.setAttribute("aria-checked", saved);
    sw.addEventListener("click", function () {
      var on = sw.getAttribute("aria-checked") !== "true";
      sw.setAttribute("aria-checked", String(on)); S.set(key, String(on));
      if (sw.getAttribute("data-switch") === "lock-on") {
        if (on && !S.get("gs-lock-method")) { sw.setAttribute("aria-checked", "false"); S.set(key, "false"); toast("Choose Face ID, fingerprint or a PIN first."); return; }
        S.set("gs-lock-on", on ? "1" : "0"); toast(on ? "App lock is on." : "App lock is off.");
      }
      if (sw.getAttribute("data-switch") === "n-all") S.set("gs-notif", on ? "on" : "off");
    });
  });

  /* ---- iOS style banner ---- */
  var banner;
  function showBanner(o) {
    if (banner) banner.remove();
    banner = document.createElement("a");
    banner.className = "ios-banner"; banner.href = o.href || "messages.html";
    banner.innerHTML = '<img src="assets/img/mark.png" alt=""><span class="ib-text"><span class="ib-top"><b>' + (o.app || "GRACESPRING") + '</b><em>now</em></span><strong></strong><span class="ib-body"></span></span>';
    $("strong", banner).textContent = o.title; $(".ib-body", banner).textContent = o.body;
    document.body.appendChild(banner);
    requestAnimationFrame(function () { requestAnimationFrame(function () { banner.classList.add("show"); }); });
    var b = banner, y0 = null;
    var hide = function () { b.classList.remove("show"); setTimeout(function () { b.remove(); }, 400); };
    var timer = setTimeout(hide, 6000);
    b.addEventListener("touchstart", function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    b.addEventListener("touchend", function (e) { if (y0 !== null && y0 - e.changedTouches[0].clientY > 24) { clearTimeout(timer); hide(); } y0 = null; });
    if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
  }
  GS.showBanner = showBanner;
  var notifOn = function () { return S.get("gs-notif") !== "off"; };
  var DEMO = { title: "Pastor James Okafor", body: "Thank you for praying for us. See you on Sunday.", href: "chat-james.html" };
  function realNotification(o) {
    try { if ("Notification" in window && Notification.permission === "granted") new Notification(o.title, { body: o.body, icon: "assets/img/mark.png" }); } catch (e) {}
  }
  var page = location.pathname.split("/").pop();
  if (page === "home.html" && notifOn() && !sessionStorage.getItem("gs-banner")) {
    setTimeout(function () { sessionStorage.setItem("gs-banner", "1"); showBanner(DEMO); }, 5000);
  }
  var test = $("[data-test-notification]");
  if (test) test.addEventListener("click", function () {
    if (!notifOn()) { toast("Turn on Allow notifications first."); return; }
    showBanner({ title: "GraceSpring", body: "This is how notifications will look on your phone.", href: "notification-settings.html" });
    realNotification({ title: "GraceSpring", body: "This is how notifications will look on your phone." });
  });
  var allow = $("[data-allow-notifications]");
  if (allow) allow.addEventListener("click", function () {
    var go = function () { S.set("gs-notif", "on"); location.href = "lock-setup.html"; };
    try { if ("Notification" in window && Notification.requestPermission) { Notification.requestPermission().then(go, go); return; } } catch (e) {}
    go();
  });
  var skipN = $("[data-skip-notifications]"); if (skipN) skipN.addEventListener("click", function () { S.set("gs-notif", "off"); });

  /* ---- biometric sheet (our own prompt) ---- */
  var bioTimer = null;
  function biometric(kind, ok) {
    var wrap = $("[data-bio]"); if (!wrap) { ok(); return; }
    var face = kind === "face";
    $("[data-bio-icon]").innerHTML = tpl(face ? "bio-face" : "bio-finger");
    $("[data-bio-title]").textContent = face ? "Face ID" : "Fingerprint";
    $("[data-bio-msg]").textContent = face ? "Look at your phone to continue." : "Touch the fingerprint sensor.";
    wrap.classList.remove("done"); openSheet("bio");
    clearTimeout(bioTimer);
    bioTimer = setTimeout(function () {
      if (!$("#bio").classList.contains("is-open")) return;
      wrap.classList.add("done"); $("[data-bio-icon]").innerHTML = tpl("bio-ok");
      $("[data-bio-msg]").textContent = "Recognised.";
      bioTimer = setTimeout(function () { closeSheets(); ok(); }, 700);
    }, 1500);
  }
  var bioEl = $("#bio");
  if (bioEl) bioEl.addEventListener("click", function (e) { if (e.target.closest("[data-close]") || e.target === bioEl) clearTimeout(bioTimer); });

  /* ---- choose method (setup + settings) ---- */
  function marks() {
    var m = S.get("gs-lock-method"), on = S.get("gs-lock-on") === "1";
    $$("[data-method-mark]").forEach(function (el) { el.textContent = on && el.getAttribute("data-method-mark") === m ? "On" : (el.getAttribute("data-method-mark") === "pin" && S.get("gs-pin") ? "Set" : ""); });
    var sw = $("[data-switch=lock-on]"); if (sw) sw.setAttribute("aria-checked", String(on));
  }
  marks();
  $$("[data-lock-choose]").forEach(function (b) {
    b.addEventListener("click", function () {
      var kind = b.getAttribute("data-lock-choose");
      biometric(kind, function () {
        S.set("gs-lock-method", kind); S.set("gs-lock-on", "1"); sessionStorage.setItem("gs-unlocked", "1");
        if (!S.get("gs-pin")) { location.href = "pin-setup.html?backup=1&next=" + (page === "lock-setup.html" ? "home.html" : "lock-settings.html"); return; }
        if (page === "lock-setup.html") { toast((kind === "face" ? "Face ID" : "Fingerprint") + " is on."); setTimeout(function () { location.href = "home.html"; }, 800); }
        else { marks(); toast((kind === "face" ? "Face ID" : "Fingerprint") + " is on."); }
      });
    });
  });
  var skipL = $("[data-skip-lock]"); if (skipL) skipL.addEventListener("click", function () { S.set("gs-lock-on", "0"); });

  /* ---- PIN pad: setup + unlock ---- */
  var card = $("[data-pin-mode]");
  if (card) {
    var mode = card.getAttribute("data-pin-mode"), dots = $$("[data-pin-dots] i", card), val = "", first = null;
    var msg = $("[data-pin-msg]", card), title = $("[data-pin-title]", card);
    var paint = function () { dots.forEach(function (d, i) { d.classList.toggle("on", i < val.length); }); };
    var shake = function () { var d = $("[data-pin-dots]", card); d.classList.add("shake"); setTimeout(function () { d.classList.remove("shake"); }, 450); };
    var done = function () {
      if (mode === "setup") {
        if (first === null) { first = val; val = ""; title.textContent = "Confirm your PIN"; msg.textContent = "Enter the same code again."; paint(); return; }
        if (first !== val) { first = null; val = ""; shake(); title.textContent = "Create a PIN"; msg.textContent = "Those did not match. Try again."; paint(); return; }
        S.set("gs-pin", val); if (!S.get("gs-lock-method")) S.set("gs-lock-method", "pin"); S.set("gs-lock-on", "1"); sessionStorage.setItem("gs-unlocked", "1");
        toast("PIN saved. App lock is on."); setTimeout(function () { location.href = next(); }, 900);
      } else {
        if (val === (S.get("gs-pin") || "1234")) { sessionStorage.setItem("gs-unlocked", "1"); location.href = next(); }
        else { shake(); msg.textContent = "Wrong PIN. Try again."; val = ""; setTimeout(paint, 300); }
      }
    };
    card.addEventListener("click", function (e) {
      var k = e.target.closest("[data-key]"); if (!k) return;
      var v = k.getAttribute("data-key");
      if (v === "del") val = val.slice(0, -1); else if (val.length < 4) val += v;
      paint(); if (val.length === 4) setTimeout(done, 180);
    });
    document.addEventListener("keydown", function (e) {
      if (/^\d$/.test(e.key) && val.length < 4) { val += e.key; paint(); if (val.length === 4) setTimeout(done, 180); }
      else if (e.key === "Backspace") { val = val.slice(0, -1); paint(); }
    });
    if (mode === "unlock") {
      var method = S.get("gs-lock-method") || "pin", bioBtn = $("[data-bio-unlock]", card), block = $("[data-pin-block]", card), usePin = $("[data-use-pin]", card);
      var showPin = function () { block.hidden = false; bioBtn.hidden = true; usePin.hidden = true; };
      if (method === "pin") showPin();
      else {
        bioBtn.hidden = false; usePin.hidden = false;
        $("[data-bio-btn-icon]", card).innerHTML = tpl(method === "face" ? "ico-face" : "ico-finger");
        $("[data-bio-btn-label]", card).textContent = method === "face" ? "Unlock with Face ID" : "Unlock with fingerprint";
        var go = function () { biometric(method, function () { sessionStorage.setItem("gs-unlocked", "1"); location.href = next(); }); };
        bioBtn.addEventListener("click", go); usePin.addEventListener("click", showPin);
        setTimeout(go, 500);
      }
      $("[data-forgot]", card).addEventListener("click", function () { sessionStorage.removeItem("gs-unlocked"); });
    }
  }
})();
