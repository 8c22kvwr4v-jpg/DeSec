// Samler alle temafiler til én spørsmålsbank.
// Hvert spørsmål får en stabil id (tema + nummer) slik at pågående prøver
// kan lagres og gjenopptas selv om siden lastes på nytt.
import regelverk from "./data/01-regelverk.js";
import rolle from "./data/02-rolle.js";
import jus from "./data/03-jus.js";
import pagripelse from "./data/04-pagripelse.js";
import politi from "./data/05-politi.js";
import etikk from "./data/06-etikk.js";
import konflikt from "./data/07-konflikt.js";
import rapport from "./data/08-rapport.js";
import personvern from "./data/09-personvern.js";
import brann from "./data/10-brann.js";
import forstehjelp from "./data/11-forstehjelp.js";
import hms from "./data/12-hms.js";
import adgang from "./data/13-adgang.js";
import rondering from "./data/14-rondering.js";
import alarm from "./data/15-alarm.js";
import butikk from "./data/16-butikk.js";
import arrangement from "./data/17-arrangement.js";

const RAW = [
  ["regelverk", "Vaktvirksomhetsloven og regelverk", regelverk],
  ["rolle", "Vekterens rolle og plikter", rolle],
  ["jus", "Nødverge, nødrett og selvtekt", jus],
  ["pagripelse", "Pågripelse og maktbruk", pagripelse],
  ["politi", "Politi og nødetater", politi],
  ["etikk", "Etikk og diskriminering", etikk],
  ["konflikt", "Konflikthåndtering", konflikt],
  ["rapport", "Rapportskriving", rapport],
  ["personvern", "Personvern og taushetsplikt", personvern],
  ["brann", "Brannvern", brann],
  ["forstehjelp", "Førstehjelp", forstehjelp],
  ["hms", "HMS og arbeidsmiljø", hms],
  ["adgang", "Adgangskontroll og resepsjon", adgang],
  ["rondering", "Rondering og objektsikring", rondering],
  ["alarm", "Alarm og utrykning", alarm],
  ["butikk", "Butikkontroll og verditransport", butikk],
  ["arrangement", "Arrangement og ordensvakt", arrangement],
];

export const TOPICS = RAW.map(([id, name, items]) => ({ id, name, count: items.length }));

export const QUESTIONS = RAW.flatMap(([id, name, items]) =>
  items.map(([text, options, correct, explanation], i) => ({
    id: `${id}-${i + 1}`,
    topic: id,
    topicName: name,
    text,
    options,
    correct,
    explanation,
  }))
);

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export const getQuestion = (id) => BY_ID.get(id);
export const getTopicName = (id) => TOPICS.find((t) => t.id === id)?.name || id;
