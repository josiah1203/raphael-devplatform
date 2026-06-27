export type PlatformConfig = {
  api_base: string;
  ui_port: number;
  mode: string;
  platform_name?: string;
  version?: string;
  features?: { reviews: boolean; automations: boolean; connectors: boolean; intelligence?: boolean };
};

export type Module = {
  id: string;
  name: string;
  description?: string | null;
  parent_module_id?: string;
  slice_attribution?: string;
};
/** @deprecated Use Module */
export type Repo = Module;

export type Branch = { name: string; commit_hash: string | null };
export type Tag = { name: string; commit_hash: string };
export type Commit = {
  hash: string;
  parent_hash?: string | null;
  author?: string;
  timestamp?: string;
  message?: string;
  ops?: string | unknown[];
  intent_summary?: string | null;
};

export type FileTreeEntry = {
  name: string;
  path: string;
  type: "file" | "dir";
  size?: number;
  last_commit_message?: string;
  updated_at?: string;
};

export type FileContent = {
  path: string;
  content: string;
  size: number;
  binary: boolean;
  language?: string;
  encoding?: string;
};

export type RepoSettings = {
  name: string;
  description?: string | null;
  default_branch: string;
  visibility: "private" | "internal" | "public";
  artifact_type?: string;
  license?: string | null;
  topics?: string[];
};

export type Collaborator = {
  user_id: string;
  email?: string;
  name?: string;
  role: string;
  pending?: boolean;
};

export type BranchProtectionRule = {
  id: string;
  pattern: string;
  require_pr?: boolean;
  require_reviews?: number;
  restrict_push?: boolean;
};

export type WebhookConfig = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  last_delivery_status?: number | null;
};

export type Project = {
  id: string;
  name: string;
  module_count?: number;
  open_reviews?: number;
  compliance_score?: number;
  fidelity_score?: number;
};

export type WorkspaceMemory = {
  workspace_id: string;
  project_id?: string | null;
  goal?: string;
  milestone?: string;
  risks?: string[];
  recent_accomplishments?: string[];
  conventions_observed?: string[];
  generated_at?: string;
  source_event_cursor?: string;
};

export type AnalyticsOverview = {
  workspace_id: string;
  modules: number;
  events_total: number;
  automations: number;
  reviews: number;
  health: string;
};

export type PlatformComment = {
  id: string;
  target_type: string;
  target_id: string;
  author?: string;
  body: string;
  parent_id?: string;
  anchor?: Record<string, string | number>;
  allowed_viewers?: string[];
  created_at?: string;
};

export type PlatformLink = {
  id: string;
  name: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  link_type?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
};

export type RegistryEntry = {
  id: string;
  name: string;
  version: string;
  manifest?: Record<string, unknown>;
  module_pins?: Array<{ module_id: string; ref: string }>;
  created_at?: string;
};

export type EnvironmentEntry = {
  id: string;
  name: string;
  stage: string;
  config?: Record<string, unknown>;
  automation_triggers?: string[];
  created_at?: string;
};

export type MessagingConversation = {
  id: string;
  workspace_id: string;
  name?: string;
  target_type?: string;
  target_id?: string;
  last_message?: string;
  created_at?: string;
};

export type IntelligenceStatus = {
  service: string;
  model_version: string;
  backend: string;
  model: string;
  available: boolean;
  tier: "live" | "cached" | "rule_stub";
  detail: string;
  downstream?: Record<string, { reachable?: boolean; status_code?: number; error?: string }>;
};

export type PlannerIR = {
  intent: string;
  filters?: { field: string; op: string; value: string }[];
  graph_hops?: { from: string; edge?: string; depth?: number }[];
  time_range?: { since?: string; until?: string };
  sources: string[];
  limit?: number;
};

export type IntelligenceAskResponse = {
  plan_id: string;
  plan: PlannerIR;
  answer: string;
  citations: { source?: string; id?: string; summary?: string }[];
  errors: string[];
  model_version: string;
  model_tier: "live" | "cached" | "rule_stub";
  sources?: string[];
};

export type IntelligencePlanResponse = {
  plan_id: string;
  plan: PlannerIR;
  model_version: string;
  model_tier: "live" | "cached" | "rule_stub";
};

export type SquashLabelResponse = {
  intent_summary: string;
  model_version: string;
  model_tier: "live" | "cached" | "rule_stub";
};

export type IntelligenceSuggestion = {
  id: string;
  kind: string;
  message: string;
  draft?: { trigger_type?: string; action?: string };
  created_at?: string;
};

export type EventSummary = {
  id: string;
  title: string;
  bullets: string[];
  event_count: number;
  created_at?: string;
};

export type AutomationDraft = {
  name: string;
  trigger_type: string;
  action: string;
  conditions?: string[];
  draft?: boolean;
};

export type Review = {
  id: string;
  repo_id: string;
  module_id?: string;
  title: string;
  source_branch: string;
  target_branch: string;
  status: string;
  assignee?: string;
  summary?: string;
  created_at?: string;
};

export type ReviewComment = {
  id: string;
  review_id: string;
  author?: string;
  body: string;
  created_at?: string;
};

export type ReviewDiff = {
  bom: { change: string; reference: string; value: string }[];
  drc: { rule: string; severity: string; message: string }[];
  electrical: { net: string; change: string }[] | unknown[];
  schematic: { change: string; element: string; detail: string }[];
  layout: { change: string; element: string; detail: string }[];
  ops: unknown[];
  intent_summary?: string | null;
  summary: Record<string, number>;
};

export type Automation = {
  id: string;
  name: string;
  trigger_type: string;
  action: string;
  enabled: boolean;
  last_run_status?: string | null;
};

export type AutomationRun = {
  id: string;
  automation_id: string;
  name: string;
  status: string;
  trigger: string;
  duration_ms: number | null;
  started_at: string;
  error?: string | null;
};

export type Artifact = {
  id: string;
  module_id?: string | null;
  kind: string;
  metadata?: Record<string, unknown> | string | null;
  blob_key?: string | null;
  created_at?: string;
};

export type Organization = {
  id: string;
  name: string;
  plan?: string;
  region?: string;
};

export type ComplianceSubject = {
  subject_id?: string;
  id?: string;
  status?: string;
  pii_fields?: string[];
  holds?: boolean;
  has_hold?: boolean;
};

export type OpsStatus = {
  service: string;
  status: string;
  backups: number;
};

export type OpsBackup = {
  id: string;
  label: string;
  created_at: string;
  location?: string;
  event_count?: number;
};

export type OpsIntegrityResult = {
  status: string;
  chain_valid: boolean;
  checked_at: string;
  audit?: Record<string, unknown>;
};

export type RWUBalance = {
  org_id: string;
  balance: number;
  reserved: number;
  available: number;
};

export type SyncStatus = {
  service?: string;
  status: string;
  queued_events?: number;
  last_sync?: string;
};

export type AIJob = {
  job_id?: string;
  id?: string;
  tenant_id?: string;
  model_type?: string;
  status?: string;
  created_at?: string;
  metrics?: Record<string, unknown>;
};
