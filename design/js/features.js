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
