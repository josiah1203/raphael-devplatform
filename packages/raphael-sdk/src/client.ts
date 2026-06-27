import type { PlatformConfig } from "./types.js";

let cachedBase: string | undefined =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ||
  undefined;
let accessToken =
  typeof localStorage !== "undefined" ? localStorage.getItem("raphael_access_token") ?? "" : "";
let orgId =
  typeof localStorage !== "undefined" ? localStorage.getItem("raphael_org_id") ?? "" : "";

function isDevProxy(): boolean {
  return typeof import.meta !== "undefined" && !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;
}

export async function resolveApiBase(): Promise<string> {
  if (cachedBase !== undefined) return cachedBase;
  const envBase = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE;
  if (envBase) {
    cachedBase = envBase;
    return cachedBase;
  }
  if (isDevProxy()) {
    cachedBase = "";
    return cachedBase;
  }
  if (typeof window !== "undefined") {
    cachedBase = "";
    return cachedBase;
  }
  cachedBase = "http://127.0.0.1:8080";
  return cachedBase;
}

export function setApiBase(base: string) {
  cachedBase = base;
}

export function setAccessToken(token: string) {
  accessToken = token;
  if (typeof localStorage !== "undefined") {
    if (token) localStorage.setItem("raphael_access_token", token);
    else localStorage.removeItem("raphael_access_token");
  }
}

export function setOrgId(orgIdValue: string) {
  orgId = orgIdValue;
  if (typeof localStorage !== "undefined") {
    if (orgIdValue) localStorage.setItem("raphael_org_id", orgIdValue);
    else localStorage.removeItem("raphael_org_id");
  }
}

/** @deprecated Use setAccessToken */
export function setApiKey(key: string) {
  setAccessToken(key);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = cachedBase ?? (await resolveApiBase());
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (orgId) headers["X-Raphael-Org-Id"] = orgId;

  const res = await fetch(`${base}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const detail = (err as { detail?: unknown }).detail;
    let message = (err as { error?: string; message?: string }).error ?? (err as { message?: string }).message;
    if (!message && Array.isArray(detail)) {
      message = detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ");
    } else if (!message && typeof detail === "object" && detail && "error" in detail) {
      message = String((detail as { error: string }).error);
    }
    throw new Error(message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const identity = {
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>("/v1/identity/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string, opts?: { name?: string; org_name?: string; org_id?: string }) =>
    request<{ access_token: string; refresh_token: string }>("/v1/identity/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name: opts?.name, org_name: opts?.org_name, org_id: opts?.org_id }),
    }),
  requestPasswordReset: (email: string) =>
    request<{ status: string }>("/v1/identity/password/reset-request", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ status: string }>("/v1/identity/password/change", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
  listApiKeys: () =>
    request<{ keys: { id: string; name: string; prefix: string; created_at: string }[] }>("/v1/identity/api-keys").then(
      (r) => r.keys,
    ),
  createApiKey: (name: string) =>
    request<{ id: string; name: string; key: string; prefix: string }>("/v1/identity/api-keys", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  getProfile: () =>
    request<{ user_id: string; email: string; org_id: string; phone: string | null; phone_verified: boolean }>(
      "/v1/identity/profile",
    ),
  updatePhone: (phone: string) =>
    request<{ user_id: string; email: string; org_id: string; phone: string; phone_verified: boolean }>(
      "/v1/identity/profile",
      { method: "PATCH", body: JSON.stringify({ phone }) },
    ),
  oauthStart: (provider: string, redirectUri: string) =>
    request<{ authorization_url: string; state: string }>(
      `/v1/identity/oauth/${encodeURIComponent(provider)}/start?redirect_uri=${encodeURIComponent(redirectUri)}`,
    ),
  oauthCallback: (provider: string, code: string, state: string) =>
    request<{ access_token: string; refresh_token: string }>(
      `/v1/identity/oauth/${encodeURIComponent(provider)}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    ),
};

const DEFAULT_WS = "default";

export const workspaces = {
  listModules: (workspaceId = DEFAULT_WS) =>
    request<{ modules: import("./types.js").Module[] }>(`/v1/workspaces/${workspaceId}/modules`).then(
      (r) => r.modules ?? (r as { repos?: import("./types.js").Module[] }).repos ?? [],
    ),
  listRepos: (workspaceId = DEFAULT_WS) => workspaces.listModules(workspaceId),
  getModule: (workspaceId: string, moduleId: string) =>
    request<import("./types.js").Module>(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}`),
  createModule: (workspaceId: string, id: string, name: string) =>
    request<import("./types.js").Module>(`/v1/workspaces/${workspaceId}/modules`, {
      method: "POST",
      body: JSON.stringify({ id, name }),
    }),
  forkModule: (workspaceId: string, moduleId: string, id: string, name: string) =>
    request<import("./types.js").Module>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/fork`,
      { method: "POST", body: JSON.stringify({ id, name }) },
    ),
  sliceModule: (workspaceId: string, moduleId: string, id: string, name: string, scope?: string) =>
    request<import("./types.js").Module>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/slice`,
      { method: "POST", body: JSON.stringify({ id, name, scope }) },
    ),
  shareLink: (workspaceId: string, moduleId: string) =>
    request<{ token: string; url: string }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/share-link`,
      { method: "POST", body: "{}" },
    ),
  listBranches: (workspaceId: string, moduleId: string) =>
    request<{ branches: import("./types.js").Branch[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/branches`,
    ).then((r) => r.branches),
  listTags: (workspaceId: string, moduleId: string) =>
    request<{ tags: import("./types.js").Tag[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/tags`,
    ).then((r) => r.tags),
  createTag: (workspaceId: string, moduleId: string, name: string, branch = "main") =>
    request<{ name: string }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/tag`,
      { method: "POST", body: JSON.stringify({ name, branch }) },
    ),
  getLog: (workspaceId: string, moduleId: string, branch?: string) => {
    const q = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    return request<{ commits: import("./types.js").Commit[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/log${q}`,
    ).then((r) => r.commits);
  },
  getCommitDiff: (workspaceId: string, moduleId: string, commitHash: string) =>
    request<import("./types.js").ReviewDiff>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/commits/${encodeURIComponent(commitHash)}/diff`,
    ),
  merge: (workspaceId: string, moduleId: string, source: string, target: string) =>
    request<{ status: string }>(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/merge`, {
      method: "POST",
      body: JSON.stringify({ source, target }),
    }),
  commit: (
    workspaceId: string,
    moduleId: string,
    body: { message: string; branch?: string; events?: Record<string, unknown>[]; intent_summary?: string },
  ) =>
    request<import("./types.js").Commit>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/commit`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getFileTree: (workspaceId: string, moduleId: string, branch: string, path = "") => {
    const sp = new URLSearchParams({ branch });
    if (path) sp.set("path", path);
    return request<{ entries: import("./types.js").FileTreeEntry[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/files/tree?${sp}`,
    ).then((r) => r.entries);
  },
  getFileBlob: (workspaceId: string, moduleId: string, branch: string, path: string) => {
    const sp = new URLSearchParams({ branch, path });
    return request<import("./types.js").FileContent>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/files/blob?${sp}`,
    );
  },
  putFileBlob: (
    workspaceId: string,
    moduleId: string,
    body: { branch: string; path: string; content: string; message: string },
  ) =>
    request<import("./types.js").Commit>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/files/blob`,
      { method: "PUT", body: JSON.stringify(body) },
    ),
  getSettings: (workspaceId: string, moduleId: string) =>
    request<import("./types.js").RepoSettings>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/settings`,
    ),
  patchSettings: (workspaceId: string, moduleId: string, body: Partial<import("./types.js").RepoSettings>) =>
    request<import("./types.js").RepoSettings>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/settings`,
      { method: "PATCH", body: JSON.stringify(body) },
    ),
  listCollaborators: (workspaceId: string, moduleId: string) =>
    request<{ collaborators: import("./types.js").Collaborator[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/settings/collaborators`,
    ).then((r) => r.collaborators),
  listBranchProtection: (workspaceId: string, moduleId: string) =>
    request<{ rules: import("./types.js").BranchProtectionRule[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/settings/branch-protection`,
    ).then((r) => r.rules),
  listWebhooks: (workspaceId: string, moduleId: string) =>
    request<{ webhooks: import("./types.js").WebhookConfig[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/settings/webhooks`,
    ).then((r) => r.webhooks),
};

export const artifacts = {
  list: (moduleId?: string) => {
    const q = moduleId ? `?module_id=${encodeURIComponent(moduleId)}` : "";
    return request<{ artifacts: import("./types.js").Artifact[] }>(`/v1/artifacts${q}`).then((r) => r.artifacts);
  },
  ingest: (kind: "kicad" | "bom" | "altium" | "solidworks" | "simulation", body: Record<string, unknown>) =>
    request<{ artifact: import("./types.js").Artifact; parsed: Record<string, unknown> }>(
      `/v1/artifacts/ingest/${kind}`,
      { method: "POST", body: JSON.stringify(body) },
    ),
  getObject: (objectId: string) =>
    request<import("./types.js").Artifact>(`/v1/artifacts/objects/${encodeURIComponent(objectId)}`),
  getObjectContent: (objectId: string) =>
    request<string>(`/v1/artifacts/objects/${encodeURIComponent(objectId)}/content`),
};

export const projects = {
  list: () => request<{ projects: import("./types.js").Project[] }>("/v1/projects").then((r) => r.projects),
  get: (id: string) => request<import("./types.js").Project>(`/v1/projects/${encodeURIComponent(id)}`),
};

export const intelligence = {
  getStatus: () =>
    request<import("./types.js").IntelligenceStatus>("/v1/intelligence/status"),
  ask: (question: string, opts?: { workspace_id?: string; project_id?: string }) =>
    request<import("./types.js").IntelligenceAskResponse>("/v1/intelligence/ask", {
      method: "POST",
      body: JSON.stringify({ question, workspace_id: opts?.workspace_id ?? DEFAULT_WS, project_id: opts?.project_id }),
    }),
  plan: (question: string, opts?: { workspace_id?: string; project_id?: string }) =>
    request<import("./types.js").IntelligencePlanResponse>("/v1/intelligence/plan", {
      method: "POST",
      body: JSON.stringify({ question, workspace_id: opts?.workspace_id ?? DEFAULT_WS, project_id: opts?.project_id }),
    }),
  squashLabel: (body: { ops?: Record<string, unknown>[]; events?: Record<string, unknown>[]; message?: string }) =>
    request<import("./types.js").SquashLabelResponse>("/v1/intelligence/squash/label", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addConvention: (convention: string, opts?: { workspace_id?: string; project_id?: string }) =>
    request<import("./types.js").WorkspaceMemory>("/v1/intelligence/memory/conventions", {
      method: "POST",
      body: JSON.stringify({
        convention,
        workspace_id: opts?.workspace_id ?? DEFAULT_WS,
        project_id: opts?.project_id,
      }),
    }),
  getMemory: (workspaceId = DEFAULT_WS, projectId?: string) => {
    const q = projectId ? `?workspace_id=${workspaceId}&project_id=${projectId}` : `?workspace_id=${workspaceId}`;
    return request<import("./types.js").WorkspaceMemory>(`/v1/intelligence/memory${q}`);
  },
  getSuggestions: () =>
    request<{ suggestions: import("./types.js").IntelligenceSuggestion[] }>("/v1/intelligence/suggestions").then(
      (r) => r.suggestions,
    ),
  draftWorkflow: (description: string) =>
    request<{ draft: import("./types.js").AutomationDraft }>("/v1/intelligence/workflows/draft", {
      method: "POST",
      body: JSON.stringify({ description }),
    }),
  listSummaries: (workspaceId = DEFAULT_WS) =>
    request<{ summaries: import("./types.js").EventSummary[] }>(`/v1/intelligence/summaries?workspace_id=${workspaceId}`).then(
      (r) => r.summaries,
    ),
  regenerateMemory: (opts?: { workspace_id?: string; project_id?: string }) =>
    request<import("./types.js").WorkspaceMemory>("/v1/intelligence/memory/regenerate", {
      method: "POST",
      body: JSON.stringify({ workspace_id: opts?.workspace_id ?? DEFAULT_WS, project_id: opts?.project_id }),
    }),
  generateSummary: (opts?: { workspace_id?: string; events?: Record<string, unknown>[] }) =>
    request<import("./types.js").EventSummary>("/v1/intelligence/summaries/generate", {
      method: "POST",
      body: JSON.stringify({ workspace_id: opts?.workspace_id ?? DEFAULT_WS, events: opts?.events ?? [] }),
    }),
};

export const comments = {
  list: (targetType?: string, targetId?: string) => {
    const q = targetType && targetId ? `?target_type=${encodeURIComponent(targetType)}&target_id=${encodeURIComponent(targetId)}` : "";
    return request<{ comments: import("./types.js").PlatformComment[] }>(`/v1/comments${q}`).then((r) => r.comments);
  },
  create: (body: {
    target_type: string;
    target_id: string;
    body: string;
    author?: string;
    parent_id?: string;
    anchor?: Record<string, string | number>;
    acl?: { roles?: string[]; users?: string[] };
  }) =>
    request<import("./types.js").PlatformComment>("/v1/comments", { method: "POST", body: JSON.stringify(body) }),
};

export const analytics = {
  overview: (workspaceId = DEFAULT_WS) =>
    request<import("./types.js").AnalyticsOverview>(`/v1/analytics/overview?workspace_id=${workspaceId}`),
};

export const graph = {
  impact: (nodeId: string) => request<{ node_id: string; impact_set: string[] }>(`/v1/graph/impact/${encodeURIComponent(nodeId)}`),
  lineage: (nodeId: string) => request<{ node_id: string; lineage: unknown[] }>(`/v1/graph/lineage/${encodeURIComponent(nodeId)}`),
  listEdges: (params?: { from_id?: string; to_id?: string }) => {
    const sp = new URLSearchParams();
    if (params?.from_id) sp.set("from_id", params.from_id);
    if (params?.to_id) sp.set("to_id", params.to_id);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ edges: Record<string, unknown>[] }>(`/v1/graph/edges${q}`).then((r) => r.edges);
  },
};

export const reviews = {
  list: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ reviews: import("./types.js").Review[] }>(`/v1/reviews${q}`).then((r) => r.reviews);
  },
  create: (body: {
    module_id?: string;
    repo_id?: string;
    title: string;
    source_branch: string;
    target_branch?: string;
    assignee?: string;
  }) =>
    request<import("./types.js").Review>("/v1/reviews", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getDiff: (id: string) => request<import("./types.js").ReviewDiff>(`/v1/reviews/${encodeURIComponent(id)}/diff`),
  merge: (id: string) =>
    request<{ status: string }>(`/v1/reviews/${encodeURIComponent(id)}/merge`, { method: "POST", body: "{}" }),
  listComments: (reviewId: string) =>
    request<{ comments: import("./types.js").ReviewComment[] }>(`/v1/reviews/${encodeURIComponent(reviewId)}/comments`).then(
      (r) => r.comments,
    ),
  addComment: (reviewId: string, body: string, author?: string) =>
    request<import("./types.js").ReviewComment>(`/v1/reviews/${encodeURIComponent(reviewId)}/comments`, {
      method: "POST",
      body: JSON.stringify({ body, author }),
    }),
};

export const connectors = {
  list: () =>
    request<{ connected: unknown[]; available: unknown[] }>("/v1/connectors").then((r) => r),
  connect: (tool: string) =>
    request<{ tool: string; status: string }>(`/v1/connectors/${encodeURIComponent(tool)}/connect`, {
      method: "POST",
      body: "{}",
    }),
};

export const automations = {
  list: () => request<{ automations: import("./types.js").Automation[] }>("/v1/automations").then((r) => r.automations),
  create: (body: { name: string; trigger_type: string; action: string }) =>
    request<import("./types.js").Automation>("/v1/automations", { method: "POST", body: JSON.stringify(body) }),
  listRuns: () => request<{ runs: import("./types.js").AutomationRun[] }>("/v1/automations/runs").then((r) => r.runs),
  toggle: (id: string, enabled: boolean) =>
    request<import("./types.js").Automation>(`/v1/automations/${encodeURIComponent(id)}/toggle`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),
  trigger: (id: string) =>
    request<{ status: string; run_id?: string }>(`/v1/automations/${encodeURIComponent(id)}/trigger`, {
      method: "POST",
      body: "{}",
    }),
};

export const orgs = {
  list: () =>
    request<{ orgs: import("./types.js").Organization[] }>("/v1/orgs").then((r) => r.orgs),
  create: (body: { name: string; id?: string; plan?: string; region?: string }) =>
    request<import("./types.js").Organization>("/v1/orgs", { method: "POST", body: JSON.stringify(body) }),
  join: (key: string) =>
    request<{ status: string; org_id: string; org_name: string }>("/v1/orgs/join", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
  invite: (orgId: string, email: string, role = "member") =>
    request<{ status: string; org_id: string; email: string; invite_id: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/invites`,
      { method: "POST", body: JSON.stringify({ email, role }) },
    ),
  listInvites: (orgId: string) =>
    request<{ invites: { id: string; email: string; role: string; created_at: string }[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/invites`,
    ).then((r) => r.invites),
  revokeInvite: (orgId: string, inviteId: string) =>
    request<{ status: string }>(`/v1/orgs/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(inviteId)}`, {
      method: "DELETE",
    }),
  listMembers: (orgId: string) =>
    request<{ members: { user_id: string; email?: string; role: string }[] }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/members`,
    ).then((r) => r.members),
  updateMemberRole: (orgId: string, userId: string, role: string) =>
    request<{ status: string }>(`/v1/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  listConnectionKeys: (orgId: string) =>
    request<{
      keys: {
        id: string;
        key_type: string;
        key_prefix: string;
        masked_key: string;
        label?: string;
        created_at: string;
      }[];
    }>(`/v1/orgs/${encodeURIComponent(orgId)}/connection-keys`).then((r) => r.keys),
  createConnectionKey: (orgId: string, type: "join" | "ingest" = "join") =>
    request<{ id: string; key_type: string; key: string; key_prefix: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/connection-keys`,
      { method: "POST", body: JSON.stringify({ type }) },
    ),
  rotateConnectionKey: (orgId: string, keyId: string) =>
    request<{ id: string; key: string; key_prefix: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/connection-keys/${encodeURIComponent(keyId)}/rotate`,
      { method: "POST", body: "{}" },
    ),
  revokeConnectionKey: (orgId: string, keyId: string) =>
    request<{ status: string }>(
      `/v1/orgs/${encodeURIComponent(orgId)}/connection-keys/${encodeURIComponent(keyId)}`,
      { method: "DELETE" },
    ),
  saveSettings: (orgId: string, settings: Record<string, unknown>) =>
    request<{ status: string }>(`/v1/orgs/${encodeURIComponent(orgId)}/settings`, {
      method: "PATCH",
      body: JSON.stringify(settings),
    }),
};

export const admin = {
  billing: () => request<{ plan: string; stripe_configured: boolean; metronome_configured: boolean }>("/v1/admin/billing"),
  createCheckout: (body: { plan: string; success_url?: string; cancel_url?: string; email?: string }) =>
    request<{ checkout_url: string; session_id: string }>("/v1/admin/billing/checkout", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  billingPortal: (returnUrl?: string) =>
    request<{ portal_url: string }>(
      `/v1/admin/billing/portal${returnUrl ? `?return_url=${encodeURIComponent(returnUrl)}` : ""}`,
    ),
  holds: () => request<{ holds: { entity_id: string; created_at: string }[] }>("/v1/admin/iam/holds").then((r) => r.holds),
  createHold: (entityId: string) =>
    request<{ status: string; entity_id: string }>("/v1/admin/iam/holds", {
      method: "POST",
      body: JSON.stringify({ entity_id: entityId }),
    }),
  gdprDelete: (subjectId: string) =>
    request<{ status: string; subject_id: string }>("/v1/admin/gdpr-delete", {
      method: "POST",
      body: JSON.stringify({ subject_id: subjectId }),
    }),
  getSubject: (subjectId: string) =>
    request<import("./types.js").ComplianceSubject>(`/v1/admin/subjects/${encodeURIComponent(subjectId)}`),
  licenseTemplates: () =>
    request<{ templates: { id: string; name: string; seats: number }[] }>("/v1/admin/licensing/templates").then(
      (r) => r.templates,
    ),
  verifyDomain: (domain: string) =>
    request<{ domain: string; txt_record: string; status: string }>("/v1/admin/domain/verify", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
};

export const ops = {
  status: () => request<import("./types.js").OpsStatus>("/v1/ops"),
  backup: (label?: string) =>
    request<import("./types.js").OpsBackup>("/v1/ops/backup", {
      method: "POST",
      body: JSON.stringify(label ? { label } : {}),
    }),
  verifyIntegrity: () => request<import("./types.js").OpsIntegrityResult>("/v1/ops/verify-integrity"),
  replay: (eventIds: string[]) =>
    request<{ status: string; events: number; replayed_at: string }>("/v1/ops/replay", {
      method: "POST",
      body: JSON.stringify({ event_ids: eventIds }),
    }),
};

export const rwu = {
  getBalance: () => request<import("./types.js").RWUBalance>("/v1/rwu/balance"),
  reserve: (amount: number) =>
    request<{ org_id: string; reserved: number; status: string }>("/v1/rwu/reserve", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
  consume: (amount: number, reason?: string) =>
    request<{ org_id: string; consumed: number; balance: number }>("/v1/rwu/consume", {
      method: "POST",
      body: JSON.stringify({ amount, reason: reason ?? "usage" }),
    }),
};

export const sync = {
  getStatus: () => request<import("./types.js").SyncStatus>("/v1/sync"),
};

export const ai = {
  listJobs: (tenantId?: string) => {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return request<{ jobs: import("./types.js").AIJob[] }>(`/v1/ai/jobs${q}`).then((r) => r.jobs);
  },
  createJob: (body: { tenant_id?: string; job_type?: string; model_type?: string; module_id?: string }) =>
    request<import("./types.js").AIJob>("/v1/ai/jobs", { method: "POST", body: JSON.stringify(body) }),
};

export const notifications = {
  list: () => request<{ notifications: unknown[] }>("/v1/notifications").then((r) => r.notifications),
  markRead: (notificationId: string) =>
    request<{ id: string; read: boolean }>(`/v1/notifications/${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
    }),
  markAllRead: () =>
    request<{ status: string; count: number }>("/v1/notifications/mark-all-read", { method: "POST", body: "{}" }),
  getPreferences: () => request<Record<string, boolean>>("/v1/notifications/preferences"),
  patchPreferences: (prefs: Record<string, boolean>) =>
    request<Record<string, boolean>>("/v1/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

export const messaging = {
  inbox: (workspaceId?: string) => {
    const q = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
    return request<{ conversations: import("./types.js").MessagingConversation[]; twilio_configured: boolean }>(
      `/v1/messaging${q}`,
    );
  },
  listConversations: (workspaceId?: string) => messaging.inbox(workspaceId).then((r) => r.conversations),
  createConversation: (body: {
    workspace_id?: string;
    target_type?: string;
    target_id?: string;
    name?: string;
  }) => request<import("./types.js").MessagingConversation>("/v1/messaging", { method: "POST", body: JSON.stringify(body) }),
  listMessages: (conversationId: string) =>
    request<{ messages: Record<string, unknown>[] }>(`/v1/messaging/${encodeURIComponent(conversationId)}/messages`).then(
      (r) => r.messages,
    ),
  sendMessage: (conversationId: string, body: string, author?: string) =>
    request<Record<string, unknown>>(`/v1/messaging/${encodeURIComponent(conversationId)}/messages`, {
      method: "POST",
      body: JSON.stringify({ body, author }),
    }),
};

export const links = {
  list: () => request<{ items: import("./types.js").PlatformLink[] }>("/v1/links").then((r) => r.items),
  create: (body: {
    id?: string;
    name: string;
    source_type: string;
    source_id: string;
    target_type: string;
    target_id: string;
    link_type?: string;
    metadata?: Record<string, unknown>;
  }) => request<import("./types.js").PlatformLink>("/v1/links", { method: "POST", body: JSON.stringify(body) }),
  get: (id: string) => request<import("./types.js").PlatformLink>(`/v1/links/${encodeURIComponent(id)}`),
};

export const registry = {
  list: () => request<{ items: import("./types.js").RegistryEntry[] }>("/v1/registry").then((r) => r.items),
  create: (body: {
    id?: string;
    name: string;
    version?: string;
    manifest?: Record<string, unknown>;
    module_pins?: Array<{ module_id: string; ref: string }>;
  }) => request<import("./types.js").RegistryEntry>("/v1/registry", { method: "POST", body: JSON.stringify(body) }),
  get: (id: string) => request<import("./types.js").RegistryEntry>(`/v1/registry/${encodeURIComponent(id)}`),
};

export const environments = {
  list: (stage?: string) => {
    const q = stage ? `?stage=${encodeURIComponent(stage)}` : "";
    return request<{ items: import("./types.js").EnvironmentEntry[] }>(`/v1/environments${q}`).then((r) => r.items);
  },
  create: (body: {
    id?: string;
    name: string;
    stage?: string;
    config?: Record<string, unknown>;
    automation_triggers?: string[];
  }) => request<import("./types.js").EnvironmentEntry>("/v1/environments", { method: "POST", body: JSON.stringify(body) }),
  get: (id: string) => request<import("./types.js").EnvironmentEntry>(`/v1/environments/${encodeURIComponent(id)}`),
};

export const audit = {
  getTimeline: (params?: { project_id?: string; since?: string; limit?: number; cursor?: string }) => {
    const sp = new URLSearchParams();
    if (params?.project_id) sp.set("project_id", params.project_id);
    if (params?.since) sp.set("since", params.since);
    if (params?.limit) sp.set("limit", String(params.limit));
    if (params?.cursor) sp.set("cursor", params.cursor);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ events: Record<string, unknown>[]; next_cursor?: string | null; has_more?: boolean }>(
      `/v1/audit/timeline${q}`,
    );
  },
  verify: () =>
    request<{
      valid: boolean;
      events_checked: number;
      events_with_chain: number;
      verified_links: number;
      failures: string[];
    }>("/v1/audit/verify"),
};

export const client = {
  setAccessToken,
  setOrgId,
  setApiKey,
  setApiBase: setApiBase,
  getConfig: () => request<PlatformConfig>("/v1/config"),
  listProjects: () => projects.list().then((p) => p.map((x) => x.id)),
  listRepos: () => workspaces.listModules(),
  listModules: (ws?: string) => workspaces.listModules(ws),
  getRepo: (id: string) => workspaces.getModule(DEFAULT_WS, id),
  forkModule: (moduleId: string, newId: string, name: string) => workspaces.forkModule(DEFAULT_WS, moduleId, newId, name),
  sliceModule: (moduleId: string, newId: string, name: string, scope?: string) =>
    workspaces.sliceModule(DEFAULT_WS, moduleId, newId, name, scope),
  shareModuleLink: (moduleId: string) => workspaces.shareLink(DEFAULT_WS, moduleId),
  listBranches: (repoId: string) => workspaces.listBranches(DEFAULT_WS, repoId),
  listTags: (repoId: string) => workspaces.listTags(DEFAULT_WS, repoId),
  getRepoLog: (repoId: string, branch?: string) => workspaces.getLog(DEFAULT_WS, repoId, branch),
  getCommitDiff: (repoId: string, hash: string) => workspaces.getCommitDiff(DEFAULT_WS, repoId, hash),
  createRepo: (id: string, name: string) => workspaces.createModule(DEFAULT_WS, id, name),
  createBranch: (repoId: string, name: string, from = "main") =>
    request(`/v1/workspaces/${DEFAULT_WS}/modules/${encodeURIComponent(repoId)}/branch`, {
      method: "POST",
      body: JSON.stringify({ name, from }),
    }),
  createTag: (repoId: string, name: string, branch = "main") => workspaces.createTag(DEFAULT_WS, repoId, name, branch),
  mergeBranches: (repoId: string, source: string, target: string) =>
    workspaces.merge(DEFAULT_WS, repoId, source, target),
  createCommit: (
    repoId: string,
    message: string,
    opts?: { branch?: string; events?: Record<string, unknown>[]; intent_summary?: string },
  ) =>
    workspaces.commit(DEFAULT_WS, repoId, {
      message,
      branch: opts?.branch ?? "main",
      events: opts?.events ?? [],
      intent_summary: opts?.intent_summary,
    }),
  listArtifacts: (moduleId?: string) => artifacts.list(moduleId),
  ingestArtifact: artifacts.ingest,
  getArtifact: artifacts.getObject,
  listReviews: reviews.list,
  getReview: (id: string) => request(`/v1/reviews/${id}`),
  createReview: reviews.create,
  getReviewDiff: reviews.getDiff,
  mergeReview: reviews.merge,
  getTimeline: (params?: { project_id?: string; since?: string; limit?: number; cursor?: string }) =>
    audit.getTimeline(params),
  getEvent: (id: string) => request(`/v1/audit/events/${encodeURIComponent(id)}`),
  listAdapters: () => connectors.list(),
  connectAdapter: connectors.connect,
  listAutomations: automations.list,
  createAutomation: automations.create,
  listAutomationRuns: automations.listRuns,
  toggleAutomation: automations.toggle,
  intelligenceAsk: intelligence.ask,
  getWorkspaceMemory: intelligence.getMemory,
  getGraphImpact: (nodeId: string) => graph.impact(nodeId),
  getFileTree: (repoId: string, branch: string, path?: string) =>
    workspaces.getFileTree(DEFAULT_WS, repoId, branch, path),
  getFileBlob: (repoId: string, branch: string, path: string) =>
    workspaces.getFileBlob(DEFAULT_WS, repoId, branch, path),
  putFileBlob: (
    repoId: string,
    body: { branch: string; path: string; content: string; message: string },
  ) => workspaces.putFileBlob(DEFAULT_WS, repoId, body),
  getRepoSettings: (repoId: string) => workspaces.getSettings(DEFAULT_WS, repoId),
  updateRepoSettings: (repoId: string, body: Partial<import("./types.js").RepoSettings>) =>
    workspaces.patchSettings(DEFAULT_WS, repoId, body),
  listRepoCollaborators: (repoId: string) => workspaces.listCollaborators(DEFAULT_WS, repoId),
  listBranchProtection: (repoId: string) => workspaces.listBranchProtection(DEFAULT_WS, repoId),
  listBranchProtectionRules: (repoId: string) => workspaces.listBranchProtection(DEFAULT_WS, repoId),
  listRepoWebhooks: (repoId: string) => workspaces.listWebhooks(DEFAULT_WS, repoId),
};

export * from "./types.js";
