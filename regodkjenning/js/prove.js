// Øvingsprøve for regodkjenning av vektere.
// Trekker tilfeldige spørsmål fra banken på 900, holder styr på svar,
// tid og resultat, og lagrer pågående prøve slik at den overlever refresh.
import { QUESTIONS, TOPICS, getQuestion, getTopicName } from "./bank.js";

const EXAM_COUNT = 80;          // antall spørsmål i en full prøve
const EXAM_MINUTES = 90;        // tidsramme for prøvemodus
const PASS_RATIO = 0.75;        // øvingsgrense for bestått
const ACTIVE_KEY = "desec_prove_aktiv";
const HIST_KEY = "desec_prove_historikk";

const root = document.getElementById("prove-root");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let session = null;   // pågående prøve
let result = null;    // ferdig rettet prøve
let tick = null;      // intervall for nedtelling
let setup = { mode: "prove", count: EXAM_COUNT, topics: new Set(), timed: true, instant: false };

/* ---------- hjelpefunksjoner ---------- */

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickQuestions(count, topicIds) {
  const pool = topicIds && topicIds.size ? QUESTIONS.filter((q) => topicIds.has(q.topic)) : QUESTIONS;
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

function newSession(opts) {
  const picked = pickQuestions(opts.count, opts.topics);
  return {
    mode: opts.mode,
    instant: !!opts.instant,
    startedAt: Date.now(),
    limitMs: opts.timed ? EXAM_MINUTES * 60 * 1000 : null,
    index: 0,
    items: picked.map((q) => ({
      qid: q.id,
      order: shuffle([0, 1, 2, 3]),  // rekkefølgen alternativene vises i
      answer: null,                  // indeks i order-listen
      flagged: false,
    })),
  };
}

const answeredCount = (s) => s.items.filter((it) => it.answer !== null).length;

// Oversetter et svar tilbake til indeksen i det opprinnelige alternativsettet.
const chosenOriginal = (item) => (item.answer === null ? null : item.order[item.answer]);
const isCorrect = (item) => chosenOriginal(item) === getQuestion(item.qid).correct;

function msLeft(s) {
  if (!s.limitMs) return null;
  return Math.max(0, s.startedAt + s.limitMs - Date.now());
}

function fmtClock(ms) {
  const t = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function fmtDate(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} kl. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ---------- lagring ---------- */

function saveActive() {
  try {
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    else localStorage.removeItem(ACTIVE_KEY);
  } catch (e) { /* privat modus e.l. — prøven fungerer uansett */ }
}

function loadActive() {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.items?.length || !s.items.every((it) => getQuestion(it.qid))) return null;
    return s;
  } catch (e) { return null; }
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; } catch (e) { return []; }
}

function saveHistory(entry) {
  try {
    const list = readHistory();
    list.unshift(entry);
    localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 20)));
  } catch (e) { /* ignorer */ }
}

/* ---------- retting ---------- */

function grade(s) {
  const rows = s.items.map((it, i) => {
    const q = getQuestion(it.qid);
    return { no: i + 1, q, item: it, correct: it.answer !== null && isCorrect(it) };
  });
  const right = rows.filter((r) => r.correct).length;
  const byTopic = {};
  rows.forEach((r) => {
    const t = (byTopic[r.q.topic] ||= { total: 0, right: 0 });
    t.total++;
    if (r.correct) t.right++;
  });
  return {
    rows,
    right,
    total: rows.length,
    ratio: rows.length ? right / rows.length : 0,
    passed: rows.length ? right / rows.length >= PASS_RATIO : false,
    byTopic,
    usedMs: Date.now() - s.startedAt,
    mode: s.mode,
    finishedAt: Date.now(),
  };
}

/* ---------- visning: oppsett ---------- */

function viewSetup() {
  stopTimer();
  const resume = loadActive();
  const hist = readHistory();
  const pool = setup.topics.size
    ? QUESTIONS.filter((q) => setup.topics.has(q.topic)).length
    : QUESTIONS.length;
  const max = Math.min(setup.count, pool);

  root.innerHTML = `
    <div class="prove-head">
      <p class="eyebrow">Regodkjenning</p>
      <h1>Øvingsprøve for vektere</h1>
      <p class="lede">
        Prøven trekker ${EXAM_COUNT} tilfeldige spørsmål fra en bank på ${QUESTIONS.length}.
        Du får aldri samme prøve to ganger. Alt kjøres lokalt i nettleseren din —
        ingen svar sendes noe sted.
      </p>
    </div>

    ${resume ? `
      <div class="panel-x">
        <h2>Du har en påbegynt prøve</h2>
        <p>${resume.items.length} spørsmål, ${answeredCount(resume)} besvart. Startet ${fmtDate(resume.startedAt)}.</p>
        <div class="opt-row" style="margin-top:16px;">
          <button class="btn btn-solid btn-sm" id="resume-btn" type="button">Fortsett prøven</button>
          <button class="btn btn-line btn-sm" id="drop-btn" type="button">Forkast og start på nytt</button>
        </div>
      </div>
    ` : ""}

    <div class="mode-grid">
      <button class="mode-card ${setup.mode === "prove" ? "on" : ""}" data-mode="prove" type="button">
        <b>Prøvemodus</b>
        <span>Som den ekte prøven: ${EXAM_COUNT} spørsmål på ${EXAM_MINUTES} minutter. Du ser fasit først når du har levert.</span>
        <em>${EXAM_COUNT} spørsmål · ${EXAM_MINUTES} min · fasit til slutt</em>
      </button>
      <button class="mode-card ${setup.mode === "oving" ? "on" : ""}" data-mode="oving" type="button">
        <b>Øvingsmodus</b>
        <span>Velg antall spørsmål og temaer selv. Du får riktig svar og forklaring med én gang, uten tidspress.</span>
        <em>Fritt antall · ingen klokke · fasit underveis</em>
      </button>
    </div>

    ${setup.mode === "oving" ? `
      <div class="panel-x">
        <h2>Antall spørsmål</h2>
        <div class="opt-row">
          ${[10, 20, 40, 80].map((n) => `
            <button class="chip-btn ${setup.count === n ? "on" : ""}" data-count="${n}" type="button">${n}</button>
          `).join("")}
        </div>
      </div>

      <div class="panel-x">
        <div class="row-between">
          <h2>Temaer</h2>
          <button class="chip-btn" id="topic-all" type="button">${setup.topics.size ? "Nullstill" : "Velg alle"}</button>
        </div>
        <p>Ingen valgt betyr at alle temaer er med. Nå er ${pool} spørsmål tilgjengelig.</p>
        <div class="topic-grid">
          ${TOPICS.map((t) => `
            <label class="topic-pick">
              <input type="checkbox" data-topic="${t.id}" ${setup.topics.has(t.id) ? "checked" : ""} />
              <span>${esc(t.name)}</span>
              <span class="n">${t.count}</span>
            </label>
          `).join("")}
        </div>
      </div>
    ` : `
      <div class="panel-x">
        <h2>Slik fungerer prøvemodus</h2>
        <p>
          Du får ${EXAM_COUNT} spørsmål med fire svaralternativer. Du kan hoppe fram og tilbake,
          merke spørsmål du vil se på igjen, og levere når du vil. Beståttgrensen er satt til
          ${Math.round(PASS_RATIO * 100)} % — det vil si ${Math.ceil(EXAM_COUNT * PASS_RATIO)} av ${EXAM_COUNT} riktige.
          Går tiden ut, leveres prøven automatisk.
        </p>
      </div>
    `}

    <div class="start-bar">
      <button class="btn btn-solid" id="start-btn" type="button">Start prøven</button>
      <span class="start-note">${max} spørsmål trekkes tilfeldig</span>
    </div>

    ${hist.length ? `
      <div class="panel-x" style="margin-top:34px;">
        <div class="row-between">
          <h2>Tidligere forsøk</h2>
          <button class="chip-btn" id="clear-hist" type="button">Tøm</button>
        </div>
        <div class="hist-list" style="margin-top:14px;">
          ${hist.slice(0, 8).map((h) => `
            <div class="hist-row">
              <span class="h-date">${fmtDate(h.at)}</span>
              <span>${h.mode === "prove" ? "Prøve" : "Øving"} · ${h.total} spørsmål</span>
              <span class="h-score">${h.right}/${h.total}</span>
              <span class="h-verdict ${h.passed ? "pass" : "fail"}">${h.passed ? "Bestått" : "Ikke bestått"}</span>
            </div>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <p class="foot-note">
      Dette er øvingsmateriell laget av DeSec, bygget på pensum i vekterutdanningen.
      Det er ikke en offisiell prøve, og ved tvil er det alltid gjeldende lov, forskrift
      og oppdragsgivers instruks som gjelder. Spørsmål eller innspill til innholdet?
      Ta kontakt på <a href="mailto:Oystein@Desec.no">Oystein@Desec.no</a>.
    </p>
  `;

  root.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      setup.mode = b.dataset.mode;
      setup.instant = setup.mode === "oving";
      setup.timed = setup.mode === "prove";
      setup.count = setup.mode === "prove" ? EXAM_COUNT : setup.count;
      viewSetup();
    })
  );
  root.querySelectorAll("[data-count]").forEach((b) =>
    b.addEventListener("click", () => { setup.count = Number(b.dataset.count); viewSetup(); })
  );
  root.querySelectorAll("[data-topic]").forEach((cb) =>
    cb.addEventListener("change", () => {
      if (cb.checked) setup.topics.add(cb.dataset.topic);
      else setup.topics.delete(cb.dataset.topic);
      viewSetup();
    })
  );
  root.querySelector("#topic-all")?.addEventListener("click", () => {
    if (setup.topics.size) setup.topics.clear();
    else TOPICS.forEach((t) => setup.topics.add(t.id));
    viewSetup();
  });
  root.querySelector("#start-btn").addEventListener("click", () => {
    session = newSession(setup);
    result = null;
    saveActive();
    viewExam();
  });
  root.querySelector("#resume-btn")?.addEventListener("click", () => {
    session = resume;
    result = null;
    viewExam();
  });
  root.querySelector("#drop-btn")?.addEventListener("click", () => {
    session = null;
    saveActive();
    viewSetup();
  });
  root.querySelector("#clear-hist")?.addEventListener("click", () => {
    try { localStorage.removeItem(HIST_KEY); } catch (e) { /* ignorer */ }
    viewSetup();
  });
}

/* ---------- visning: prøve ---------- */

function viewExam() {
  const item = session.items[session.index];
  const q = getQuestion(item.qid);
  const done = answeredCount(session);
  const showFacit = session.instant && item.answer !== null;
  const last = session.index === session.items.length - 1;

  root.innerHTML = `
    <div class="exam-bar">
      <span class="exam-count">Spørsmål <b>${session.index + 1}</b> / ${session.items.length}</span>
      <span class="exam-topic">${esc(q.topicName)}</span>
      ${session.limitMs ? `<span class="exam-timer" id="timer">--:--</span>` : `<span class="exam-timer">${done} besvart</span>`}
    </div>

    <div class="bar"><i style="width:${(done / session.items.length) * 100}%"></i></div>

    <div class="q-card">
      <p class="q-text">${esc(q.text)}</p>
      <div class="answers" id="answers">
        ${item.order.map((orig, i) => {
          const chosen = item.answer === i;
          let cls = chosen ? "on" : "";
          if (showFacit) {
            if (orig === q.correct) cls = "right";
            else if (chosen) cls = "wrong";
            else cls = "";
          }
          return `
            <button class="answer ${cls}" data-i="${i}" type="button" ${showFacit ? "disabled" : ""}>
              <span class="key">${"ABCD"[i]}</span>
              <span>${esc(q.options[orig])}</span>
            </button>
          `;
        }).join("")}
      </div>

      ${showFacit ? `
        <div class="explain">
          <b>${isCorrect(item) ? "Riktig" : "Riktig svar: " + "ABCD"[item.order.indexOf(q.correct)]}</b>
          ${esc(q.explanation)}
        </div>
      ` : ""}

      <div class="q-nav">
        <button class="btn btn-line btn-sm" id="prev-btn" type="button" ${session.index === 0 ? "disabled" : ""}>← Forrige</button>
        <button class="btn btn-line btn-sm" id="next-btn" type="button" ${last ? "disabled" : ""}>Neste →</button>
        <button class="flag-btn ${item.flagged ? "on" : ""}" id="flag-btn" type="button">${item.flagged ? "Merket" : "Merk"}</button>
        <span class="spacer"></span>
        <button class="btn btn-solid btn-sm" id="submit-btn" type="button">${session.instant ? "Se resultatet" : "Lever prøven"}</button>
      </div>
    </div>

    <div class="panel-x" style="margin-top:18px;">
      <h2>Oversikt</h2>
      <div class="grid-map" id="map">
        ${session.items.map((it, i) => {
          const graded = session.instant && it.answer !== null;
          const cls = [
            graded ? (isCorrect(it) ? "ok" : "no") : it.answer !== null ? "done" : "",
            it.flagged ? "flag" : "",
            i === session.index ? "now" : "",
          ].filter(Boolean).join(" ");
          return `<button class="${cls}" data-go="${i}" type="button">${i + 1}</button>`;
        }).join("")}
      </div>
      <div class="legend">
        ${session.instant
          ? `<span class="c-ok"><i></i>Riktig</span><span class="c-no"><i></i>Feil</span>`
          : `<span class="c-done"><i></i>Besvart</span>`}
        <span class="c-flag"><i></i>Merket</span>
        <span class="c-open"><i></i>Ubesvart</span>
      </div>
    </div>
  `;

  root.querySelectorAll("#answers .answer").forEach((b) =>
    b.addEventListener("click", () => answer(Number(b.dataset.i)))
  );
  root.querySelector("#prev-btn").addEventListener("click", () => go(session.index - 1));
  root.querySelector("#next-btn").addEventListener("click", () => go(session.index + 1));
  root.querySelector("#flag-btn").addEventListener("click", () => {
    item.flagged = !item.flagged;
    saveActive();
    viewExam();
  });
  root.querySelector("#submit-btn").addEventListener("click", confirmSubmit);
  root.querySelectorAll("[data-go]").forEach((b) =>
    b.addEventListener("click", () => go(Number(b.dataset.go)))
  );

  startTimer();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function answer(i) {
  const item = session.items[session.index];
  if (session.instant && item.answer !== null) return; // fasit er allerede vist
  const wasOpen = item.answer === null;
  item.answer = i;
  saveActive();
  if (session.instant) { viewExam(); return; }
  // Går videre av seg selv første gang et spørsmål besvares, men blir stående
  // hvis man går tilbake og endrer et svar, eller er på siste spørsmål.
  if (wasOpen && session.index < session.items.length - 1) go(session.index + 1);
  else viewExam();
}

function go(i) {
  if (i < 0 || i >= session.items.length) return;
  session.index = i;
  saveActive();
  viewExam();
}

/* ---------- tidtaking ---------- */

function startTimer() {
  stopTimer();
  if (!session?.limitMs) return;
  const paint = () => {
    const el = document.getElementById("timer");
    if (!el) return;
    const left = msLeft(session);
    el.textContent = fmtClock(left);
    el.classList.toggle("low", left < 10 * 60 * 1000);
    el.classList.toggle("crit", left < 2 * 60 * 1000);
    if (left <= 0) { stopTimer(); submit(true); }
  };
  paint();
  tick = setInterval(paint, 1000);
}

function stopTimer() {
  if (tick) { clearInterval(tick); tick = null; }
}

/* ---------- levering ---------- */

function confirmSubmit() {
  const open = session.items.length - answeredCount(session);
  const flagged = session.items.filter((it) => it.flagged).length;
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-h">
      <h3 id="modal-h">${session.instant ? "Avslutte økten?" : "Levere prøven?"}</h3>
      <p>
        ${open ? `Du har <b>${open}</b> ubesvarte spørsmål${flagged ? ` og <b>${flagged}</b> merkede` : ""}. Ubesvarte teller som feil.`
                : `Alle spørsmål er besvart${flagged ? `, men du har <b>${flagged}</b> merkede spørsmål` : ""}.`}
      </p>
      <div class="row">
        <button class="btn btn-solid btn-sm" id="m-yes" type="button">Lever</button>
        <button class="btn btn-line btn-sm" id="m-no" type="button">Fortsett prøven</button>
      </div>
    </div>
  `;
  document.body.appendChild(back);
  const close = () => back.remove();
  back.querySelector("#m-yes").addEventListener("click", () => { close(); submit(false); });
  back.querySelector("#m-no").addEventListener("click", close);
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
}

function submit(auto) {
  stopTimer();
  document.querySelector(".modal-back")?.remove();
  result = grade(session);
  result.auto = !!auto;
  saveHistory({
    at: result.finishedAt,
    right: result.right,
    total: result.total,
    passed: result.passed,
    mode: result.mode,
  });
  session = null;
  saveActive();
  viewResult("alle");
}

/* ---------- visning: resultat ---------- */

function viewResult(filter) {
  const r = result;
  const pct = Math.round(r.ratio * 100);
  const needed = Math.ceil(r.total * PASS_RATIO);
  const wrongRows = r.rows.filter((x) => !x.correct);
  const shown = filter === "feil" ? wrongRows : r.rows;
  const topics = Object.entries(r.byTopic)
    .map(([id, t]) => ({ id, name: getTopicName(id), ...t, pct: Math.round((t.right / t.total) * 100) }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);

  root.innerHTML = `
    <div class="score-hero">
      <p class="score-verdict ${r.passed ? "pass" : "fail"}">${r.passed ? "Bestått" : "Ikke bestått"}${r.auto ? " · tiden gikk ut" : ""}</p>
      <p class="score-num">${r.right}<small> / ${r.total}</small></p>
      <p class="score-sub">${pct} % riktig · ${fmtClock(r.usedMs)} brukt · grense ${needed} av ${r.total}</p>
      <div class="meter">
        <i class="${r.passed ? "pass" : "fail"}" style="width:${pct}%"></i>
        <span class="mark" style="left:${Math.round(PASS_RATIO * 100)}%"></span>
      </div>
      <p class="meter-note">Streken viser beståttgrensen på ${Math.round(PASS_RATIO * 100)} %</p>
    </div>

    <div class="panel-x">
      <h2>Resultat per tema</h2>
      <p>Temaene med lavest andel riktige står øverst — der bør du øve mer.</p>
      <table class="topic-table" style="margin-top:16px;">
        <thead><tr><th>Tema</th><th>Riktige</th></tr></thead>
        <tbody>
          ${topics.map((t) => `
            <tr class="${t.pct < PASS_RATIO * 100 ? "weak" : ""}">
              <td>
                ${esc(t.name)}
                <span class="t-bar"><i style="width:${t.pct}%"></i></span>
              </td>
              <td>${t.right}/${t.total}<br /><span style="color:var(--dim);font-size:.85em;">${t.pct} %</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <div class="start-bar" style="margin-bottom:26px;">
      <button class="btn btn-solid btn-sm" id="again-btn" type="button">Ta en ny prøve</button>
      ${wrongRows.length ? `<button class="btn btn-line btn-sm" id="drill-btn" type="button">Øv på de ${wrongRows.length} du bommet på</button>` : ""}
      <button class="btn btn-line btn-sm" id="home-btn" type="button">Tilbake til start</button>
    </div>

    <div class="panel-x">
      <div class="row-between">
        <h2>Gjennomgang</h2>
        <div class="opt-row" style="margin-top:0;">
          <button class="chip-btn ${filter === "alle" ? "on" : ""}" data-filter="alle" type="button">Alle (${r.total})</button>
          <button class="chip-btn ${filter === "feil" ? "on" : ""}" data-filter="feil" type="button">Kun feil (${wrongRows.length})</button>
        </div>
      </div>
    </div>

    ${shown.length ? shown.map((row) => reviewCard(row)).join("") : `<div class="panel-x">Ingen feil å vise. Godt jobbet.</div>`}
  `;

  root.querySelectorAll("[data-filter]").forEach((b) =>
    b.addEventListener("click", () => viewResult(b.dataset.filter))
  );
  root.querySelector("#again-btn").addEventListener("click", () => {
    session = newSession(setup);
    result = null;
    saveActive();
    viewExam();
  });
  root.querySelector("#drill-btn")?.addEventListener("click", () => {
    const ids = wrongRows.map((x) => x.q.id);
    session = {
      mode: "oving",
      instant: true,
      startedAt: Date.now(),
      limitMs: null,
      index: 0,
      items: shuffle(ids).map((qid) => ({ qid, order: shuffle([0, 1, 2, 3]), answer: null, flagged: false })),
    };
    result = null;
    saveActive();
    viewExam();
  });
  root.querySelector("#home-btn").addEventListener("click", () => { result = null; viewSetup(); });
  window.scrollTo({ top: 0, behavior: "auto" });
}

function reviewCard(row) {
  const { q, item, correct, no } = row;
  const chosen = chosenOriginal(item);
  return `
    <div class="review-item">
      <div class="r-head">
        <span class="r-no">${no}</span>
        <span class="r-mark ${correct ? "ok" : "no"}">${correct ? "Riktig" : item.answer === null ? "Ubesvart" : "Feil"}</span>
        <span class="r-topic">${esc(q.topicName)}</span>
      </div>
      <p class="r-q">${esc(q.text)}</p>
      <ul>
        ${item.order.map((orig) => {
          const isRight = orig === q.correct;
          const isMine = orig === chosen;
          const cls = isRight ? "right" : isMine ? "wrong" : "";
          const tag = isRight ? "Riktig svar" : isMine ? "Ditt svar" : "";
          return `<li class="${cls}">${esc(q.options[orig])}${tag ? `<span class="tag">${tag}</span>` : ""}</li>`;
        }).join("")}
      </ul>
      <div class="explain"><b>Forklaring</b>${esc(q.explanation)}</div>
    </div>
  `;
}

/* ---------- tastatur ---------- */

document.addEventListener("keydown", (e) => {
  if (!session || document.querySelector(".modal-back")) return;
  if (e.target instanceof Element && e.target.matches("input, textarea, select")) return;
  const item = session.items[session.index];
  if (["1", "2", "3", "4"].includes(e.key)) { answer(Number(e.key) - 1); e.preventDefault(); }
  else if (["a", "b", "c", "d"].includes(e.key.toLowerCase())) { answer("abcd".indexOf(e.key.toLowerCase())); e.preventDefault(); }
  else if (e.key === "ArrowRight") { go(session.index + 1); e.preventDefault(); }
  else if (e.key === "ArrowLeft") { go(session.index - 1); e.preventDefault(); }
  else if (e.key.toLowerCase() === "m") { item.flagged = !item.flagged; saveActive(); viewExam(); }
});

// Advar mot å forlate en pågående prøve ved et uhell.
window.addEventListener("beforeunload", (e) => {
  if (session && answeredCount(session) > 0) { e.preventDefault(); e.returnValue = ""; }
});

viewSetup();
