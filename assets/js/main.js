(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     Meny
     ---------------------------------------------------------- */
  var head = document.getElementById("head");
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");

  if (burger && head && nav) {
    burger.addEventListener("click", function () {
      var open = head.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Lukk meny" : "Åpne meny");
    });
    nav.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        head.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        burger.setAttribute("aria-label", "Åpne meny");
      });
    });
  }

  window.addEventListener("scroll", function () {
    if (head) head.classList.toggle("stuck", window.scrollY > 12);
  }, { passive: true });

  /* ----------------------------------------------------------
     Reveal + scrollspy
     ---------------------------------------------------------- */
  var ups = document.querySelectorAll(".up");
  document.querySelectorAll(".hero .up").forEach(function (el, i) {
    el.style.setProperty("--i", i);
  });

  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    ups.forEach(function (el) { io.observe(el); });
  } else {
    ups.forEach(function (el) { el.classList.add("in"); });
  }

  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav a"));
  var secs = navLinks
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if ("IntersectionObserver" in window && secs.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach(function (s) { spy.observe(s); });
  }

  /* ----------------------------------------------------------
     Klokke (Bergen) + år
     ---------------------------------------------------------- */
  var clock = document.getElementById("clock");
  if (clock) {
    var fmt = new Intl.DateTimeFormat("nb-NO", {
      timeZone: "Europe/Oslo",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
    });
    var tick = function () { clock.textContent = fmt.format(new Date()); };
    tick();
    setInterval(tick, 1000);
  }

  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ----------------------------------------------------------
     Markise
     ---------------------------------------------------------- */
  var mq = document.getElementById("marquee");
  if (mq) {
    var terms = ["Stasjonært vakthold", "Rondering", "Alarmutrykning", "Arrangementsvakt",
                 "Adgangskontroll", "Risikovurdering", "ISPS-havn", "Byggeplass"];
    var html = "";
    for (var r = 0; r < 2; r++) {
      terms.forEach(function (t) { html += "<span>" + t + "</span>"; });
    }
    mq.innerHTML = html;
  }

  /* ----------------------------------------------------------
     Radar
     ---------------------------------------------------------- */
  var radar = document.getElementById("radar");
  if (radar && !reduced) {
    var rc = radar.getContext("2d");
    var ang = 0, blips = [], rw = 0;

    for (var b = 0; b < 7; b++) {
      blips.push({ a: Math.random() * Math.PI * 2, d: 0.28 + Math.random() * 0.62, lit: 0 });
    }

    var sizeRadar = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var cs = radar.getBoundingClientRect();
      if (!cs.width) return;
      rw = cs.width;
      radar.width = Math.round(cs.width * dpr);
      radar.height = Math.round(cs.width * dpr);
      rc.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var drawRadar = function () {
      if (!rw) { requestAnimationFrame(drawRadar); return; }
      var s = rw, c = s / 2, R = s * 0.46;
      rc.clearRect(0, 0, s, s);

      rc.strokeStyle = "rgba(61,220,255,.13)";
      rc.lineWidth = 1;
      for (var i = 1; i <= 4; i++) {
        rc.beginPath();
        rc.arc(c, c, R * (i / 4), 0, Math.PI * 2);
        rc.stroke();
      }
      rc.strokeStyle = "rgba(255,255,255,.055)";
      for (var k = 0; k < 12; k++) {
        var a = (k / 12) * Math.PI * 2;
        rc.beginPath();
        rc.moveTo(c, c);
        rc.lineTo(c + Math.cos(a) * R, c + Math.sin(a) * R);
        rc.stroke();
      }

      if (rc.createConicGradient) {
        var g = rc.createConicGradient(ang, c, c);
        g.addColorStop(0, "rgba(61,220,255,.11)");
        g.addColorStop(0.02, "rgba(61,220,255,.075)");
        g.addColorStop(0.05, "rgba(61,220,255,.04)");
        g.addColorStop(0.09, "rgba(61,220,255,.018)");
        g.addColorStop(0.15, "rgba(61,220,255,.005)");
        g.addColorStop(0.22, "rgba(61,220,255,0)");
        g.addColorStop(1, "rgba(61,220,255,0)");
        rc.fillStyle = g;
        rc.beginPath();
        rc.arc(c, c, R, 0, Math.PI * 2);
        rc.fill();
      }
      rc.strokeStyle = "rgba(61,220,255,.3)";
      rc.beginPath();
      rc.moveTo(c, c);
      rc.lineTo(c + Math.cos(ang) * R, c + Math.sin(ang) * R);
      rc.stroke();

      blips.forEach(function (p) {
        var da = Math.abs(((ang - p.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (da > Math.PI - 0.09) p.lit = 1;
        p.lit *= 0.985;
        if (p.lit < 0.01) return;
        var x = c + Math.cos(p.a) * R * p.d;
        var y = c + Math.sin(p.a) * R * p.d;
        rc.fillStyle = "rgba(61,220,255," + (p.lit * 0.85) + ")";
        rc.beginPath();
        rc.arc(x, y, 2.6, 0, Math.PI * 2);
        rc.fill();
      });

      ang += 0.0075;
      requestAnimationFrame(drawRadar);
    };

    sizeRadar();
    window.addEventListener("resize", sizeRadar);
    requestAnimationFrame(drawRadar);
  }

  /* ----------------------------------------------------------
     Dekningskart
     ---------------------------------------------------------- */
  var hexes = document.querySelectorAll(".hex");
  var cName = document.getElementById("cover-name");
  var cNote = document.getElementById("cover-note");

  if (hexes.length && cName && cNote) {
    var pick = function (g) {
      hexes.forEach(function (h) { h.classList.remove("sel"); });
      g.classList.add("sel");
      cName.textContent = g.dataset.name;
      cNote.textContent = g.dataset.note;
    };
    hexes.forEach(function (g) {
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", g.dataset.name + ". " + g.dataset.note);
      g.addEventListener("mouseenter", function () { pick(g); });
      g.addEventListener("focus", function () { pick(g); });
      g.addEventListener("click", function () { pick(g); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(g); }
      });
    });
    if (hexes[1]) hexes[1].classList.add("sel");
  }

  /* ----------------------------------------------------------
     Årvåkenhetstest
     ---------------------------------------------------------- */
  var feed = document.getElementById("feed");
  if (feed) (function () {
    var ctx = feed.getContext("2d");
    var veil = document.getElementById("veil");
    var vTag = document.getElementById("veil-tag");
    var vTitle = document.getElementById("veil-title");
    var vBody = document.getElementById("veil-body");
    var vBtn = document.getElementById("veil-btn");
    var eScore = document.getElementById("hud-score");
    var eLevel = document.getElementById("hud-level");
    var eReact = document.getElementById("hud-react");
    var eTime = document.getElementById("hud-time");
    var timeCell = eTime.closest(".hud-cell");

    var DUR = 60;
    var cols = 4, rows = 3, cw = 0, ch = 0, W = 0, H = 0;
    var tiles = [];
    var state = "idle";
    var score = 0, level = 1, hits = 0, missed = 0;
    var timeLeft = DUR, reacts = [];
    var anom = null, nextAt = 0, last = 0, flash = null;
    var resizeTimer = null;

    function build() {
      var n = cols * rows;
      tiles = [];
      for (var i = 0; i < n; i++) {
        var dots = [];
        var dn = 3 + Math.floor(Math.random() * 3);
        for (var d = 0; d < dn; d++) {
          dots.push({
            x: Math.random(), y: Math.random(),
            vx: (Math.random() - 0.5) * 0.055,
            vy: (Math.random() - 0.5) * 0.055
          });
        }
        tiles.push({ dots: dots });
      }
      if (anom && anom.tile >= n) anom = null;
    }

    function layout() {
      var w = feed.parentElement.clientWidth;
      if (!w) return;
      if (w >= 900) { cols = 4; rows = 3; }
      else if (w >= 620) { cols = 3; rows = 3; }
      else { cols = 2; rows = 4; }

      cw = w / cols;
      ch = cw / 1.6;
      W = w; H = ch * rows;

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      feed.style.width = w + "px";
      feed.style.height = H + "px";
      feed.width = Math.round(w * dpr);
      feed.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      build();
    }

    function avgReact() {
      if (!reacts.length) return 0;
      var s = 0;
      for (var i = 0; i < reacts.length; i++) s += reacts[i];
      return Math.round(s / reacts.length);
    }

    function hud() {
      eScore.textContent = score;
      eLevel.textContent = level;
      eTime.textContent = Math.max(0, Math.ceil(timeLeft));
      timeCell.classList.toggle("low", timeLeft <= 10);
      var a = avgReact();
      eReact.textContent = a ? a + " ms" : "—";
    }

    function reset() {
      score = 0; level = 1; hits = 0; missed = 0;
      timeLeft = DUR; reacts = []; anom = null; flash = null;
      nextAt = 700;
      hud();
    }

    function windowMs() { return Math.max(850, 2400 - (level - 1) * 145); }

    function spawn() {
      anom = {
        tile: Math.floor(Math.random() * tiles.length),
        x: 0.2 + Math.random() * 0.6,
        y: 0.2 + Math.random() * 0.6,
        born: performance.now(),
        win: windowMs()
      };
    }

    function resolve(ok, ms) {
      if (ok) {
        hits++;
        reacts.push(ms);
        score += 60 + Math.round(140 * Math.max(0, 1 - ms / anom.win));
        if (hits % 4 === 0) level++;
        flash = { c: "61,220,255", t: 1 };
      } else {
        missed++;
        flash = { c: "255,71,87", t: 1 };
      }
      anom = null;
      nextAt = 480 + Math.random() * 780;
      hud();
    }

    function over() {
      state = "over";
      var a = avgReact();
      var verdict = a && a < 620 ? "Skarpt blikk."
                  : a && a < 900 ? "Godt nok til å bli lagt merke til."
                  : "Det tar trening.";
      vTag.textContent = "Resultat";
      vTitle.textContent = score + " poeng";
      vBody.innerHTML = verdict + " Du fanget <b>" + hits + "</b> av <b>" +
        (hits + missed) + "</b> avvik" + (a ? ", snitt <b>" + a + " ms</b>" : "") + ".";
      vBtn.textContent = "Prøv igjen";
      veil.hidden = false;
    }

    function start() {
      reset();
      state = "run";
      veil.hidden = true;
    }

    feed.addEventListener("pointerdown", function (e) {
      if (state !== "run") return;
      var r = feed.getBoundingClientRect();
      var cx = Math.floor((e.clientX - r.left) / cw);
      var cy = Math.floor((e.clientY - r.top) / ch);
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return;
      var idx = cy * cols + cx;

      if (anom && anom.tile === idx) {
        resolve(true, performance.now() - anom.born);
      } else {
        score = Math.max(0, score - 60);
        timeLeft = Math.max(0, timeLeft - 1.5);
        flash = { c: "255,71,87", t: 0.7 };
        hud();
      }
    });

    function draw(now, dt) {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);

      for (var i = 0; i < tiles.length; i++) {
        var col = i % cols, row = Math.floor(i / cols);
        var x = col * cw, y = row * ch;
        var t = tiles[i];
        var isA = anom && anom.tile === i;

        ctx.fillStyle = "#0a0d12";
        ctx.fillRect(x, y, cw, ch);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 1, y + 1, cw - 2, ch - 2);
        ctx.clip();

        for (var d = 0; d < t.dots.length; d++) {
          var p = t.dots[d];
          if (state === "run") {
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < 0.05 || p.x > 0.95) p.vx *= -1;
            if (p.y < 0.08 || p.y > 0.92) p.vy *= -1;
          }
          ctx.fillStyle = "rgba(139,148,167,.42)";
          ctx.beginPath();
          ctx.arc(x + p.x * cw, y + p.y * ch, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isA) {
          var age = (now - anom.born) / anom.win;
          var ax = x + anom.x * cw, ay = y + anom.y * ch;
          var pulse = 1 + Math.sin(now / 90) * 0.16;

          ctx.strokeStyle = "rgba(255,71,87," + (0.5 * (1 - age)) + ")";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(ax, ay, (9 + age * 16) * pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = age < 0.45 ? "#ffb020" : "#ff4757";
          ctx.beginPath();
          ctx.arc(ax, ay, 4.4 * pulse, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = "rgba(0,0,0,.16)";
        for (var sy = y; sy < y + ch; sy += 3) ctx.fillRect(x, sy, cw, 1);
        ctx.restore();

        ctx.strokeStyle = isA ? "rgba(255,71,87,.55)" : "rgba(255,255,255,.07)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);

        ctx.fillStyle = isA ? "rgba(255,71,87,.9)" : "rgba(139,148,167,.5)";
        ctx.font = "500 9px 'Plex Mono', monospace";
        ctx.fillText("CAM-" + String(i + 1).padStart(2, "0"), x + 9, y + 16);

        if (isA) {
          var barW = (cw - 18) * Math.max(0, 1 - (now - anom.born) / anom.win);
          ctx.fillStyle = "rgba(255,71,87,.75)";
          ctx.fillRect(x + 9, y + ch - 12, barW, 2);
        }
      }

      if (flash) {
        ctx.fillStyle = "rgba(" + flash.c + "," + (flash.t * 0.13) + ")";
        ctx.fillRect(0, 0, W, H);
        flash.t -= dt * 3.2;
        if (flash.t <= 0) flash = null;
      }
    }

    function frame(now) {
      var dt = last ? Math.min((now - last) / 1000, 0.06) : 0;
      last = now;

      if (state === "run") {
        timeLeft -= dt;
        if (timeLeft <= 0) { timeLeft = 0; over(); }

        if (!anom) {
          nextAt -= dt * 1000;
          if (nextAt <= 0) spawn();
        } else if (now - anom.born > anom.win) {
          resolve(false, 0);
        }
        hud();
      }

      draw(now, dt);
      requestAnimationFrame(frame);
    }

    vBtn.addEventListener("click", start);

    layout();
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 160);
    });
    hud();
    requestAnimationFrame(frame);
  })();

  /* ----------------------------------------------------------
     Skjema
     ---------------------------------------------------------- */
  var form = document.getElementById("form");
  var note = document.getElementById("form-note");

  if (form && note) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(form);
      var navn = (f.get("navn") || "").toString().trim();
      var kon = (f.get("kontakt") || "").toString().trim();
      var msg = (f.get("melding") || "").toString().trim();

      if (!navn || !kon || !msg) {
        note.textContent = "Fyll ut alle feltene, så sender vi den videre.";
        note.classList.add("err");
        return;
      }

      note.classList.remove("err");
      var subject = "Forespørsel om tilbud — " + navn;
      var body = "Navn: " + navn + "\nKontakt: " + kon + "\n\n" + msg;
      window.location.href = "mailto:Oystein@Desec.no?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      note.textContent = "Åpner e-postklienten din med forespørselen ferdig utfylt.";
    });
  }
})();
