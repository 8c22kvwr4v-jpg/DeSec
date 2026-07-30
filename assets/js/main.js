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
  // kaskade for barn i lister/rutenett
  document.querySelectorAll(".tiles, .svc, .creds, .tl").forEach(function (grp) {
    Array.prototype.forEach.call(grp.children, function (c, i) {
      c.style.setProperty("--j", i);
    });
  });

  function countUp(root) {
    root.querySelectorAll(".num").forEach(function (n) {
      var to = parseInt(n.dataset.to, 10);
      var pad = parseInt(n.dataset.pad || "0", 10);
      if (isNaN(to) || reduced) return;
      var t0 = performance.now(), dur = 900;
      (function step(now) {
        var k = Math.min((now - t0) / dur, 1);
        var v = Math.round(to * (1 - Math.pow(1 - k, 3)));
        n.textContent = pad ? String(v).padStart(pad, "0") : v;
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
  }

  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        if (e.target.querySelector(".num")) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });
    ups.forEach(function (el) { io.observe(el); });
  } else {
    ups.forEach(function (el) { el.classList.add("in"); });
  }

  /* ----------------------------------------------------------
     Lesefremdrift
     ---------------------------------------------------------- */
  var bar = document.getElementById("progress");
  if (bar && !reduced) {
    var raf = false;
    var paint = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
      raf = false;
    };
    window.addEventListener("scroll", function () {
      if (!raf) { raf = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  }

  /* ----------------------------------------------------------
     Lykt i hero
     ---------------------------------------------------------- */
  var hero = document.querySelector(".hero");
  if (hero && !reduced) {
    var fine = window.matchMedia("(pointer: fine)").matches;

    if (fine) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    } else {
      // uten mus: la lyset vandre sakte av seg selv
      var t = 0;
      (function drift() {
        t += 0.004;
        hero.style.setProperty("--mx", (52 + Math.cos(t) * 26) + "%");
        hero.style.setProperty("--my", (46 + Math.sin(t * 1.35) * 20) + "%");
        requestAnimationFrame(drift);
      })();
    }
  }

  /* ----------------------------------------------------------
     Magnetiske knapper + lys i rutene
     ---------------------------------------------------------- */
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".mag").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.transform = "translate(" + (dx * 7).toFixed(2) + "px," +
                             (dy * 5).toFixed(2) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });

    document.querySelectorAll(".tile").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--tx", (e.clientX - r.left) + "px");
        el.style.setProperty("--ty", (e.clientY - r.top) + "px");
      });
    });
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
     Adgangskontroll
     ---------------------------------------------------------- */
  var gate = document.getElementById("gate");
  if (gate) (function () {
    var elType = document.getElementById("pass-type");
    var elMug = document.getElementById("pass-mug");
    var elName = document.getElementById("pass-name");
    var elRows = document.getElementById("pass-rows");
    var elRules = document.getElementById("rules-list");
    var elScore = document.getElementById("g2-score");
    var elAcc = document.getElementById("g2-acc");
    var elClock = document.getElementById("g2-clock");
    var elTime = document.getElementById("g2-time");
    var elFb = document.getElementById("gate-fb");
    var bDeny = document.getElementById("btn-deny");
    var bAdmit = document.getElementById("btn-admit");
    var veil = document.getElementById("gate-veil");
    var vTag = document.getElementById("gate-veil-tag");
    var vTitle = document.getElementById("gate-veil-title");
    var vBody = document.getElementById("gate-veil-body");
    var vBtn = document.getElementById("gate-veil-btn");
    var timeCell = elTime.closest(".hud-cell");

    var FIRST = ["Mari", "Jonas", "Ingrid", "Sindre", "Camilla", "Ole", "Hedda",
                 "Kristian", "Tuva", "Espen", "Silje", "Andreas", "Nora",
                 "Håkon", "Linn", "Magnus", "Vetle", "Ida"];
    var LAST = ["Haugen", "Nilsen", "Berg", "Solheim", "Lund", "Vik", "Aas",
                "Fjeldstad", "Moen", "Rygg", "Dahl", "Ness", "Strand", "Bakke",
                "Hjelle", "Tveit", "Osland", "Mjelde"];
    var FIRMS = ["Vestland Rør AS", "BKK Elektro", "Nordvest Ventilasjon",
                 "Bergen Kulde AS", "Fana Malerservice", "Hordaland Heis"];

    var ALL_RULES = [
      { id: "exp",   text: "Adgangskortet må være gyldig." },
      { id: "wo",    text: "Leverandør må ha arbeidsordre." },
      { id: "host",  text: "Besøkende må ha navngitt vert." },
      { id: "night", text: "Etter kl. 22:00 slippes kun ansatte inn." }
    ];

    var DUR = 60;
    var state = "idle";
    var score = 0, right = 0, total = 0, timeLeft = DUR, streak = 0;
    var rules = [], person = null, mins = 0, tId = null;

    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function pad(n) { return String(n).padStart(2, "0"); }

    function clockStr() {
      var t = 20 * 60 + 40 + mins;
      return pad(Math.floor(t / 60) % 24) + ":" + pad(t % 60);
    }
    function isNight() { return (20 * 60 + 40 + mins) >= 22 * 60; }

    function hasRule(id) {
      return rules.some(function (r) { return r.id === id; });
    }

    function makePerson() {
      var type = pick(["ANSATT", "LEVERANDØR", "BESØKENDE"]);
      var p = {
        type: type,
        first: pick(FIRST),
        last: pick(LAST),
        cardId: "DS-" + (1000 + Math.floor(Math.random() * 8999)),
        expired: Math.random() < 0.26,
        firm: type === "LEVERANDØR" ? pick(FIRMS) : null,
        wo: Math.random() < 0.68,
        host: Math.random() < 0.66 ? pick(FIRST) + " " + pick(LAST) : null
      };
      var d = new Date(2026, 2, 12);
      d.setDate(d.getDate() + (p.expired ? -(3 + Math.floor(Math.random() * 300))
                                          : (14 + Math.floor(Math.random() * 500))));
      p.until = pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + String(d.getFullYear()).slice(2);
      return p;
    }

    // Fasit: returnerer om personen skal slippes inn, og hvilken regel som evt. brytes
    function judge(p) {
      if (hasRule("exp") && p.expired)
        return { admit: false, why: "Kortet er utløpt." };
      if (hasRule("night") && isNight() && p.type !== "ANSATT")
        return { admit: false, why: "Etter 22:00 slippes kun ansatte inn." };
      if (hasRule("wo") && p.type === "LEVERANDØR" && !p.wo)
        return { admit: false, why: "Leverandør uten arbeidsordre." };
      if (hasRule("host") && p.type === "BESØKENDE" && !p.host)
        return { admit: false, why: "Besøkende uten navngitt vert." };
      return { admit: true, why: "" };
    }

    function drawRules(freshId) {
      elRules.innerHTML = "";
      rules.forEach(function (r) {
        var li = document.createElement("li");
        li.textContent = r.text;
        if (r.id === freshId) li.className = "fresh";
        elRules.appendChild(li);
      });
    }

    function row(k, v, bad) {
      var d = document.createElement("div");
      var dt = document.createElement("dt");
      dt.textContent = k;
      var dd = document.createElement("dd");
      dd.textContent = v;
      if (bad) dd.className = "bad";
      d.appendChild(dt); d.appendChild(dd);
      return d;
    }

    function show(p) {
      elType.textContent = p.type.charAt(0) + p.type.slice(1).toLowerCase();
      elType.setAttribute("data-t", p.type);
      elName.textContent = p.first + " " + p.last;
      elMug.textContent = p.first.charAt(0) + p.last.charAt(0);

      elRows.innerHTML = "";
      elRows.appendChild(row("Kort-ID", p.cardId));
      elRows.appendChild(row("Gyldig til", p.until, p.expired));
      if (p.type === "LEVERANDØR") {
        elRows.appendChild(row("Firma", p.firm));
        elRows.appendChild(row("Arbeidsordre", p.wo ? "AO-" + (200 + Math.floor(Math.random() * 799)) : "Mangler", !p.wo));
      } else if (p.type === "BESØKENDE") {
        elRows.appendChild(row("Vert", p.host || "Ikke oppgitt", !p.host));
      } else {
        elRows.appendChild(row("Avdeling", pick(["Drift", "Lager", "Resepsjon", "Teknisk", "Renhold"])));
      }
    }

    function next() {
      mins += 18 + Math.floor(Math.random() * 14);
      elClock.textContent = clockStr();
      person = makePerson();
      show(person);
    }

    function hud() {
      elScore.textContent = score;
      elAcc.textContent = right + "/" + total;
      elTime.textContent = Math.max(0, Math.ceil(timeLeft));
      timeCell.classList.toggle("low", timeLeft <= 10);
    }

    function decide(admit) {
      if (state !== "run" || !person) return;
      var v = judge(person);
      var who = person.first + " " + person.last;
      total++;

      if (v.admit === admit) {
        right++; streak++;
        score += 100 + Math.min(streak, 5) * 20;
        elFb.className = "gate-fb ok";
        elFb.textContent = admit
          ? "Riktig — " + who + " sluppet inn." + (streak > 1 ? "  Rekke: " + streak : "")
          : "Riktig — " + who + " avvist. " + v.why;
      } else {
        streak = 0;
        timeLeft = Math.max(0, timeLeft - 2);
        elFb.className = "gate-fb no";
        elFb.textContent = v.admit
          ? "Feil — " + who + " skulle vært sluppet inn."
          : "Feil — " + who + ": " + v.why.toLowerCase();
      }

      // ny regel hver femte avgjørelse
      if (total % 5 === 0 && rules.length < ALL_RULES.length) {
        var nr = ALL_RULES[rules.length];
        rules.push(nr);
        drawRules(nr.id);
        elFb.className = "gate-fb";
        elFb.textContent = "Ny regel: " + nr.text;
      }

      hud();
      next();
    }

    function over() {
      state = "over";
      clearInterval(tId);
      var pct = total ? Math.round((right / total) * 100) : 0;
      var verdict = pct >= 90 ? "Det er sånn en port skal stå."
                  : pct >= 70 ? "Godkjent, men noen slapp forbi."
                  : "Her hadde det blitt en samtale etter skiftet.";
      vTag.textContent = "Skiftet er over";
      vTitle.textContent = score + " poeng";
      vBody.innerHTML = verdict + " <b>" + right + "</b> av <b>" + total +
        "</b> riktige avgjørelser (" + pct + " %), med <b>" + rules.length +
        "</b> regler i spill.";
      vBtn.textContent = "Ta et nytt skift";
      veil.hidden = false;
    }

    function start() {
      score = 0; right = 0; total = 0; streak = 0;
      timeLeft = DUR; mins = 0;
      rules = [ALL_RULES[0]];
      drawRules();
      elFb.className = "gate-fb";
      elFb.innerHTML = "&nbsp;";
      elClock.textContent = clockStr();
      hud();
      next();
      state = "run";
      veil.hidden = true;

      clearInterval(tId);
      tId = setInterval(function () {
        if (state !== "run") return;
        timeLeft -= 0.1;
        if (timeLeft <= 0) { timeLeft = 0; hud(); over(); return; }
        hud();
      }, 100);
    }

    bDeny.addEventListener("click", function () { decide(false); });
    bAdmit.addEventListener("click", function () { decide(true); });
    vBtn.addEventListener("click", start);

    document.addEventListener("keydown", function (e) {
      if (state !== "run") return;
      var r = gate.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); decide(false); }
      if (e.key === "ArrowRight") { e.preventDefault(); decide(true); }
    });

    rules = [ALL_RULES[0]];
    drawRules();
    show(makePerson());
    hud();
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
