import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { slaOpp } from '@/server/data/felles';
import type {
  Instruction, InstructionAcknowledgement, InstructionAssignment, Site,
} from '@/lib/database.types';

export type InstruksVisning = {
  instruks: Instruction;
  objekt: Site | null;
  tildeling: InstructionAssignment | null;
  bekreftelse: InstructionAcknowledgement | null;
  /** Instruksen krever lesebekreftelse, og gjeldende versjon er ikke bekreftet. */
  mangler: boolean;
};

function byggMangler(
  instruks: Instruction,
  tildeling: InstructionAssignment | null,
  bekreftelse: InstructionAcknowledgement | null,
): boolean {
  const kreves = tildeling?.requires_acknowledgement ?? instruks.requires_acknowledgement;
  if (!kreves) return false;
  return !bekreftelse || bekreftelse.version < instruks.version;
}

/**
 * Instruksene den innloggede ansatte har fatt tildelt.
 *
 * Listen kommer fra databasen slik den er - RLS returnerer utelukkende
 * instrukser med en gyldig tildeling til brukeren.
 */
export async function hentMineInstrukser(brukerId: string): Promise<InstruksVisning[]> {
  const klient = await createClient();

  const { data: instrukser } = await klient
    .from('instructions')
    .select('*')
    .is('deleted_at', null)
    .order('title');

  const liste = instrukser ?? [];
  if (liste.length === 0) return [];

  const [{ data: tildelinger }, { data: bekreftelser }] = await Promise.all([
    klient.from('instruction_assignments').select('*')
      .in('instruction_id', liste.map((i) => i.id)).is('deleted_at', null),
    klient.from('instruction_acknowledgements').select('*')
      .eq('profile_id', brukerId).in('instruction_id', liste.map((i) => i.id)),
  ]);

  const objekter = await slaOpp<Site>(klient, 'sites', liste.map((i) => i.site_id));

  const tildelingPer = new Map<string, InstructionAssignment>();
  for (const t of tildelinger ?? []) {
    // En direkte tildeling til den ansatte veier tyngst.
    const eksisterende = tildelingPer.get(t.instruction_id);
    if (!eksisterende || (t.profile_id && !eksisterende.profile_id)) {
      tildelingPer.set(t.instruction_id, t);
    }
  }

  const bekreftelsePer = new Map<string, InstructionAcknowledgement>();
  for (const b of bekreftelser ?? []) {
    const eksisterende = bekreftelsePer.get(b.instruction_id);
    if (!eksisterende || b.version > eksisterende.version) {
      bekreftelsePer.set(b.instruction_id, b);
    }
  }

  return liste.map((instruks) => {
    const tildeling = tildelingPer.get(instruks.id) ?? null;
    const bekreftelse = bekreftelsePer.get(instruks.id) ?? null;
    return {
      instruks,
      objekt: instruks.site_id ? objekter.get(instruks.site_id) ?? null : null,
      tildeling,
      bekreftelse,
      mangler: byggMangler(instruks, tildeling, bekreftelse),
    };
  });
}

/** En enkelt instruks. Null nar brukeren ikke har tildeling. */
export async function hentInstruks(
  instruksId: string, brukerId: string,
): Promise<InstruksVisning | null> {
  const klient = await createClient();

  const { data: instruks } = await klient
    .from('instructions')
    .select('*')
    .eq('id', instruksId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!instruks) return null;

  const [{ data: tildelinger }, { data: bekreftelser }, objekter] = await Promise.all([
    klient.from('instruction_assignments').select('*')
      .eq('instruction_id', instruksId).is('deleted_at', null),
    klient.from('instruction_acknowledgements').select('*')
      .eq('instruction_id', instruksId).eq('profile_id', brukerId)
      .order('version', { ascending: false }),
    slaOpp<Site>(klient, 'sites', [instruks.site_id]),
  ]);

  const tildeling = (tildelinger ?? []).find((t) => t.profile_id === brukerId)
    ?? (tildelinger ?? [])[0] ?? null;
  const bekreftelse = (bekreftelser ?? [])[0] ?? null;

  return {
    instruks,
    objekt: instruks.site_id ? objekter.get(instruks.site_id) ?? null : null,
    tildeling,
    bekreftelse,
    mangler: byggMangler(instruks, tildeling, bekreftelse),
  };
}

/** Instrukser knyttet til en bestemt vakt eller objektet vakten gjelder. */
export async function hentInstrukserForVakt(
  brukerId: string, vaktId: string, objektId: string | null,
): Promise<InstruksVisning[]> {
  const alle = await hentMineInstrukser(brukerId);
  const klient = await createClient();

  const { data: tildelinger } = await klient
    .from('instruction_assignments')
    .select('instruction_id, shift_id, site_id')
    .is('deleted_at', null);

  const relevante = new Set(
    (tildelinger ?? [])
      .filter((t) => t.shift_id === vaktId || (objektId && t.site_id === objektId))
      .map((t) => t.instruction_id),
  );

  return alle.filter(
    (v) => relevante.has(v.instruks.id) || (objektId && v.instruks.site_id === objektId),
  );
}
