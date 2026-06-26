import type { PlatformConfig } from "./types.js";

let cachedBase: string | undefined =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE) ||
  undefined;
let accessToken =
  typeof localStorage !== "undefined" ? localStorage.getItem("raphael_access_token") ?? "" : "";

function isDevProxy(): boolean {
  return typeof import.meta !== "undefined" && !!(import.meta as { env?: { DEV?: boolean } }).env?.DEV;
}

export async function resolveApiBase(): Promise<string> {
  if (cachedBase) return cachedBase;
  const envBase = (import.meta as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE;
  if (envBase) {
    cachedBase = envBase;
    return cachedBase;
  }
  if (isDevProxy()) {
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
  register: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>("/v1/identity/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
};

const DEFAULT_WS = "default";

export const workspaces = {
  listModules: (workspaceId = DEFAULT_WS) =>
    request<{ modules: import("./types.js").Module[] }>(`/v1/workspaces/${workspaceId}/modules`).then(
      (r) => r.modules ?? (r as { repos?: import("./types.js").Module[] }).repos ?? [],
    ),
  /** @deprecated Use listModules */
  listRepos: (workspaceId = DEFAULT_WS) => workspaces.listModules(workspaceId),
  getModule: (workspaceId: string, moduleId: string) =>
    request<import("./types.js").Module>(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}`),
  createModule: (workspaceId: string, id: string, name: string) =>
    request<import("./types.js").Module>(`/v1/workspaces/${workspaceId}/modules`, {
      method: "POST",
      body: JSON.stringify({ id, name }),
    }),
  listBranches: (workspaceId: string, moduleId: string) =>
    request<{ branches: import("./types.js").Branch[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/branches`,
    ).then((r) => r.branches),
  getLog: (workspaceId: string, moduleId: string, branch?: string) => {
    const q = branch ? `?branch=${encodeURIComponent(branch)}` : "";
    return request<{ commits: import("./types.js").Commit[] }>(
      `/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/log${q}`,
    ).then((r) => r.commits);
  },
  merge: (workspaceId: string, moduleId: string, source: string, target: string) =>
    request<{ status: string }>(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/merge`, {
      method: "POST",
      body: JSON.stringify({ source, target }),
    }),
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
};

export const connectors = {
  list: () =>
    request<{ connected: unknown[]; available: unknown[] }>("/v1/connectors").then((r) => r),
  /** @deprecated */
  listAdapters: () => connectors.list(),
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
};

export const notifications = {
  list: () => request<{ notifications: unknown[] }>("/v1/notifications").then((r) => r.notifications),
  getPreferences: () => request<Record<string, boolean>>("/v1/notifications/preferences"),
  patchPreferences: (prefs: Record<string, boolean>) =>
    request<Record<string, boolean>>("/v1/notifications/preferences", {
      method: "PATCH",
      body: JSON.stringify(prefs),
    }),
};

export const audit = {
  getTimeline: (params?: { project_id?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.project_id) sp.set("project_id", params.project_id);
    if (params?.limit) sp.set("limit", String(params.limit));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ events: Record<string, unknown>[] }>(`/v1/audit/timeline${q}`);
  },
};

export const client = {
  setAccessToken,
  setApiKey,
  setApiBase: setApiBase,
  getConfig: () => request<PlatformConfig>("/v1/config"),
  listProjects: () => Promise.resolve(["default"]),
  listRepos: () => workspaces.listModules(),
  listModules: (ws?: string) => workspaces.listModules(ws),
  getRepo: (id: string) => workspaces.getModule(DEFAULT_WS, id),
  listBranches: (repoId: string) => workspaces.listBranches(DEFAULT_WS, repoId),
  listTags: (_repoId: string) => Promise.resolve([] as import("./types.js").Tag[]),
  getRepoLog: (repoId: string, branch?: string) => workspaces.getLog(DEFAULT_WS, repoId, branch),
  getCommitDiff: (_repoId: string, _hash: string) => reviews.getDiff("stub"),
  createRepo: (id: string, name: string) => workspaces.createModule(DEFAULT_WS, id, name),
  createBranch: (repoId: string, name: string, from = "main") =>
    request(`/v1/workspaces/${DEFAULT_WS}/modules/${encodeURIComponent(repoId)}/branch`, {
      method: "POST",
      body: JSON.stringify({ name, from }),
    }),
  createTag: () => Promise.resolve({ name: "v0" }),
  mergeBranches: (repoId: string, source: string, target: string) =>
    workspaces.merge(DEFAULT_WS, repoId, source, target),
  listReviews: reviews.list,
  getReview: (id: string) => request(`/v1/reviews/${id}`),
  createReview: reviews.create,
  getReviewDiff: reviews.getDiff,
  mergeReview: reviews.merge,
  getTimeline: (params?: { project_id?: string; since?: string; limit?: number; cursor?: string }) =>
    audit.getTimeline({ project_id: params?.project_id, limit: params?.limit }),
  getEvent: (id: string) => request(`/v1/audit/events/${encodeURIComponent(id)}`),
  listAdapters: () => connectors.list(),
  connectAdapter: connectors.connect,
  listAutomations: automations.list,
  createAutomation: automations.create,
  listAutomationRuns: automations.listRuns,
  toggleAutomation: automations.toggle,
};

export * from "./types.js";
