let cachedBase = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
    undefined;
let accessToken = typeof localStorage !== "undefined" ? localStorage.getItem("raphael_access_token") ?? "" : "";
function isDevProxy() {
    return typeof import.meta !== "undefined" && !!import.meta.env?.DEV;
}
export async function resolveApiBase() {
    if (cachedBase)
        return cachedBase;
    const envBase = import.meta.env?.VITE_API_BASE;
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
export function setApiBase(base) {
    cachedBase = base;
}
export function setAccessToken(token) {
    accessToken = token;
    if (typeof localStorage !== "undefined") {
        if (token)
            localStorage.setItem("raphael_access_token", token);
        else
            localStorage.removeItem("raphael_access_token");
    }
}
/** @deprecated Use setAccessToken */
export function setApiKey(key) {
    setAccessToken(key);
}
async function request(path, init) {
    const base = cachedBase ?? (await resolveApiBase());
    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...init?.headers,
    };
    if (accessToken)
        headers["Authorization"] = `Bearer ${accessToken}`;
    const res = await fetch(`${base}${path}`, { ...init, headers });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        const message = err.error ?? err.message ?? `HTTP ${res.status}`;
        throw new Error(message);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
export const identity = {
    login: (email, password) => request("/v1/identity/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    }),
    register: (email, password) => request("/v1/identity/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    }),
};
const DEFAULT_WS = "default";
export const workspaces = {
    listModules: (workspaceId = DEFAULT_WS) => request(`/v1/workspaces/${workspaceId}/modules`).then((r) => r.modules ?? r.repos ?? []),
    /** @deprecated Use listModules */
    listRepos: (workspaceId = DEFAULT_WS) => workspaces.listModules(workspaceId),
    getModule: (workspaceId, moduleId) => request(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}`),
    createModule: (workspaceId, id, name) => request(`/v1/workspaces/${workspaceId}/modules`, {
        method: "POST",
        body: JSON.stringify({ id, name }),
    }),
    listBranches: (workspaceId, moduleId) => request(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/branches`).then((r) => r.branches),
    getLog: (workspaceId, moduleId, branch) => {
        const q = branch ? `?branch=${encodeURIComponent(branch)}` : "";
        return request(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/log${q}`).then((r) => r.commits);
    },
    merge: (workspaceId, moduleId, source, target) => request(`/v1/workspaces/${workspaceId}/modules/${encodeURIComponent(moduleId)}/merge`, {
        method: "POST",
        body: JSON.stringify({ source, target }),
    }),
};
export const reviews = {
    list: (status) => {
        const q = status ? `?status=${encodeURIComponent(status)}` : "";
        return request(`/v1/reviews${q}`).then((r) => r.reviews);
    },
    create: (body) => request("/v1/reviews", {
        method: "POST",
        body: JSON.stringify(body),
    }),
    getDiff: (id) => request(`/v1/reviews/${encodeURIComponent(id)}/diff`),
    merge: (id) => request(`/v1/reviews/${encodeURIComponent(id)}/merge`, { method: "POST", body: "{}" }),
};
export const connectors = {
    list: () => request("/v1/connectors").then((r) => r),
    /** @deprecated */
    listAdapters: () => connectors.list(),
    connect: (tool) => request(`/v1/connectors/${encodeURIComponent(tool)}/connect`, {
        method: "POST",
        body: "{}",
    }),
};
export const automations = {
    list: () => request("/v1/automations").then((r) => r.automations),
    create: (body) => request("/v1/automations", { method: "POST", body: JSON.stringify(body) }),
    listRuns: () => request("/v1/automations/runs").then((r) => r.runs),
    toggle: (id, enabled) => request(`/v1/automations/${encodeURIComponent(id)}/toggle`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
    }),
};
export const notifications = {
    list: () => request("/v1/notifications").then((r) => r.notifications),
    getPreferences: () => request("/v1/notifications/preferences"),
    patchPreferences: (prefs) => request("/v1/notifications/preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
    }),
};
export const audit = {
    getTimeline: (params) => {
        const sp = new URLSearchParams();
        if (params?.project_id)
            sp.set("project_id", params.project_id);
        if (params?.limit)
            sp.set("limit", String(params.limit));
        const q = sp.toString() ? `?${sp}` : "";
        return request(`/v1/audit/timeline${q}`);
    },
};
export const client = {
    setAccessToken,
    setApiKey,
    setApiBase: setApiBase,
    getConfig: () => request("/v1/config"),
    listProjects: () => Promise.resolve(["default"]),
    listRepos: () => workspaces.listModules(),
    listModules: (ws) => workspaces.listModules(ws),
    getRepo: (id) => workspaces.getModule(DEFAULT_WS, id),
    listBranches: (repoId) => workspaces.listBranches(DEFAULT_WS, repoId),
    listTags: (_repoId) => Promise.resolve([]),
    getRepoLog: (repoId, branch) => workspaces.getLog(DEFAULT_WS, repoId, branch),
    getCommitDiff: (_repoId, _hash) => reviews.getDiff("stub"),
    createRepo: (id, name) => workspaces.createModule(DEFAULT_WS, id, name),
    createBranch: (repoId, name, from = "main") => request(`/v1/workspaces/${DEFAULT_WS}/modules/${encodeURIComponent(repoId)}/branch`, {
        method: "POST",
        body: JSON.stringify({ name, from }),
    }),
    createTag: () => Promise.resolve({ name: "v0" }),
    mergeBranches: (repoId, source, target) => workspaces.merge(DEFAULT_WS, repoId, source, target),
    listReviews: reviews.list,
    getReview: (id) => request(`/v1/reviews/${id}`),
    createReview: reviews.create,
    getReviewDiff: reviews.getDiff,
    mergeReview: reviews.merge,
    getTimeline: (params) => audit.getTimeline({ project_id: params?.project_id, limit: params?.limit }),
    getEvent: (id) => request(`/v1/audit/events/${encodeURIComponent(id)}`),
    listAdapters: () => connectors.list(),
    connectAdapter: connectors.connect,
    listAutomations: automations.list,
    createAutomation: automations.create,
    listAutomationRuns: automations.listRuns,
    toggleAutomation: automations.toggle,
};
export * from "./types.js";
