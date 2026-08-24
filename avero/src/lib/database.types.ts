/**
 * Typer for databasen.
 *
 * Skrevet for hand slik at prosjektet kan bygges uten a vaere koblet til et
 * Supabase-prosjekt. Nar prosjektet er satt opp kan filen erstattes med
 * `npx supabase gen types typescript --linked > src/lib/database.types.ts`.
 */

export type Rolle = 'ansatt' | 'operativ_leder' | 'administrator';

export type Vaktstatus =
  | 'planlagt' | 'ledig' | 'tildelt' | 'pagaende' | 'fullfort' | 'avlyst';

export type Tildelingsstatus =
  | 'tildelt' | 'godkjent' | 'soknad' | 'avslatt' | 'trukket';

export type Vakttype =
  | 'stasjonaer' | 'rundering' | 'arrangement' | 'utrykning' | 'resepsjon' | 'verditransport';

export type Rapporttype =
  | 'avvik' | 'hendelse' | 'utrykning' | 'maktbruk' | 'skade' | 'vaktrapport';

export type Rapportstatus = 'utkast' | 'innsendt' | 'under_behandling' | 'ferdigbehandlet';

export type Journalstatus = 'apen' | 'avsluttet';

export type Journalposttype =
  | 'vakt_start' | 'vakt_slutt' | 'kontrollrunde' | 'apning' | 'lasing'
  | 'observasjon' | 'hendelse' | 'avvik' | 'notat' | 'rettelse';

export type Kvalifikasjonstype = 'kurs' | 'godkjenning' | 'dokument';

export type Varseltype = 'info' | 'vakt' | 'instruks' | 'rapport' | 'kurs' | 'avvik';

type Sporing = {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Company = {
  id: string;
  name: string;
  org_number: string | null;
  open_shifts_enabled: boolean;
  journal_open_before_minutes: number;
  journal_open_after_minutes: number;
} & Sporing;

export type Role = { key: Rolle; name: string; description: string | null; level: number };

export type Department = {
  id: string; company_id: string; name: string; description: string | null;
} & Sporing;

export type Profile = {
  id: string;
  company_id: string;
  department_id: string | null;
  employee_number: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  role: Rolle;
  is_active: boolean;
  deactivated_at: string | null;
} & Sporing;

export type Customer = {
  id: string; company_id: string; name: string; org_number: string | null;
  contact_name: string | null; contact_phone: string | null; contact_email: string | null;
  notes: string | null;
} & Sporing;

export type Site = {
  id: string; company_id: string; customer_id: string; department_id: string | null;
  name: string; code: string | null; address: string | null; postal_code: string | null;
  city: string | null; meeting_point: string | null; map_url: string | null; notes: string | null;
} & Sporing;

export type SiteContact = {
  id: string; company_id: string; site_id: string; name: string;
  role_description: string | null; phone: string | null; email: string | null;
  visible_to_employee: boolean;
} & Sporing;

export type ManagerScope = {
  id: string; company_id: string; manager_id: string;
  department_id: string | null; site_id: string | null;
} & Sporing;

export type EmployeeSiteAccess = {
  id: string; company_id: string; profile_id: string; site_id: string;
  valid_from: string; valid_to: string | null; granted_by: string | null;
} & Sporing;

export type Shift = {
  id: string; company_id: string; site_id: string; department_id: string | null;
  shift_type: Vakttype; starts_at: string; ends_at: string; status: Vaktstatus;
  meeting_point: string | null; notes: string | null; created_by: string | null;
} & Sporing;

export type ShiftAssignment = {
  id: string; company_id: string; shift_id: string; employee_id: string;
  status: Tildelingsstatus; assigned_by: string | null; assigned_at: string; note: string | null;
} & Sporing;

export type Journal = {
  id: string; company_id: string; shift_id: string; employee_id: string;
  status: Journalstatus; started_at: string; ended_at: string | null;
  created_at: string; updated_at: string;
};

export type JournalEntry = {
  id: string; company_id: string; journal_id: string; author_id: string;
  entry_type: Journalposttype; occurred_at: string; body: string; location: string | null;
  attachment_paths: string[]; corrects_entry_id: string | null; created_at: string;
};

export type Report = {
  id: string; company_id: string; report_number: string; report_type: Rapporttype;
  status: Rapportstatus; site_id: string | null; shift_id: string | null; reporter_id: string;
  occurred_at: string; title: string; description: string | null;
  sequence_of_events: string | null; actions_taken: string | null; notified: string | null;
  witnesses: string | null;
  personal_injury: boolean; personal_injury_details: string | null;
  material_damage: boolean; material_damage_details: string | null;
  physical_force: boolean; physical_force_details: string | null;
  police_notified: boolean;
  submitted_at: string | null; handler_id: string | null; handling_note: string | null;
  closed_at: string | null;
} & Sporing;

export type ReportAttachment = {
  id: string; company_id: string; report_id: string; storage_path: string; file_name: string;
  mime_type: string | null; size_bytes: number | null; uploaded_by: string;
  created_at: string; deleted_at: string | null;
};

export type ReportShare = {
  id: string; company_id: string; report_id: string; profile_id: string;
  granted_by: string | null; created_at: string; deleted_at: string | null;
};

export type Instruction = {
  id: string; company_id: string; title: string; summary: string | null; body: string | null;
  site_id: string | null; version: number; valid_from: string; valid_to: string | null;
  requires_acknowledgement: boolean; document_path: string | null; created_by: string | null;
} & Sporing;

export type InstructionAssignment = {
  id: string; company_id: string; instruction_id: string;
  profile_id: string | null; site_id: string | null; shift_id: string | null;
  department_id: string | null; site_role: Rolle | null;
  valid_from: string; valid_to: string | null; requires_acknowledgement: boolean;
  assigned_by: string | null;
} & Sporing;

export type InstructionAcknowledgement = {
  id: string; company_id: string; instruction_id: string; profile_id: string;
  version: number; acknowledged_at: string; created_at: string;
};

export type Qualification = {
  id: string; company_id: string; profile_id: string; name: string; kind: Kvalifikasjonstype;
  issuer: string | null; certificate_number: string | null;
  issued_on: string | null; expires_on: string | null; document_path: string | null;
} & Sporing;

export type Notification = {
  id: string; company_id: string; profile_id: string; title: string; body: string | null;
  kind: Varseltype; link: string | null; read_at: string | null;
  created_at: string; deleted_at: string | null;
};

export type AuditLog = {
  id: string; company_id: string | null; actor_id: string | null; action: string;
  table_name: string; row_id: string | null;
  old_value: Record<string, unknown> | null; new_value: Record<string, unknown> | null;
  created_at: string;
};

type Tabell<Row, Påkrevd extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Påkrevd> & Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      companies: Tabell<Company, 'name'>;
      roles: Tabell<Role, 'key' | 'name' | 'level'>;
      departments: Tabell<Department, 'company_id' | 'name'>;
      profiles: Tabell<Profile, 'id' | 'company_id' | 'first_name' | 'last_name' | 'email'>;
      customers: Tabell<Customer, 'company_id' | 'name'>;
      sites: Tabell<Site, 'company_id' | 'customer_id' | 'name'>;
      site_contacts: Tabell<SiteContact, 'company_id' | 'site_id' | 'name'>;
      manager_scopes: Tabell<ManagerScope, 'company_id' | 'manager_id'>;
      employee_site_access: Tabell<EmployeeSiteAccess, 'company_id' | 'profile_id' | 'site_id'>;
      shifts: Tabell<Shift, 'company_id' | 'site_id' | 'starts_at' | 'ends_at'>;
      shift_assignments: Tabell<ShiftAssignment, 'company_id' | 'shift_id' | 'employee_id'>;
      journals: Tabell<Journal, 'company_id' | 'shift_id' | 'employee_id'>;
      journal_entries: Tabell<
        JournalEntry, 'company_id' | 'journal_id' | 'author_id' | 'entry_type' | 'body'>;
      reports: Tabell<Report, 'company_id' | 'report_type' | 'reporter_id' | 'title'>;
      report_attachments: Tabell<
        ReportAttachment, 'company_id' | 'report_id' | 'storage_path' | 'file_name' | 'uploaded_by'>;
      report_shares: Tabell<ReportShare, 'company_id' | 'report_id' | 'profile_id'>;
      instructions: Tabell<Instruction, 'company_id' | 'title'>;
      instruction_assignments: Tabell<InstructionAssignment, 'company_id' | 'instruction_id'>;
      instruction_acknowledgements: Tabell<
        InstructionAcknowledgement, 'company_id' | 'instruction_id' | 'profile_id' | 'version'>;
      qualifications: Tabell<Qualification, 'company_id' | 'profile_id' | 'name'>;
      notifications: Tabell<Notification, 'company_id' | 'profile_id' | 'title'>;
      audit_logs: Tabell<AuditLog, 'action' | 'table_name'>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
