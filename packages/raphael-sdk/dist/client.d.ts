import type { PlatformConfig } from "./types.js";
export declare function resolveApiBase(): Promise<string>;
export declare function setApiBase(base: string): void;
export declare function setAccessToken(token: string): void;
/** @deprecated Use setAccessToken */
export declare function setApiKey(key: string): void;
export declare const identity: {
    login: (email: string, password: string) => Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    register: (email: string, password: string) => Promise<{
        access_token: string;
        refresh_token: string;
    }>;
};
export declare const workspaces: {
    listModules: (workspaceId?: string) => Promise<import("./types.js").Module[]>;
    /** @deprecated Use listModules */
    listRepos: (workspaceId?: string) => Promise<import("./types.js").Module[]>;
    getModule: (workspaceId: string, moduleId: string) => Promise<import("./types.js").Module>;
    createModule: (workspaceId: string, id: string, name: string) => Promise<import("./types.js").Module>;
    listBranches: (workspaceId: string, moduleId: string) => Promise<import("./types.js").Branch[]>;
    getLog: (workspaceId: string, moduleId: string, branch?: string) => Promise<import("./types.js").Commit[]>;
    merge: (workspaceId: string, moduleId: string, source: string, target: string) => Promise<{
        status: string;
    }>;
};
export declare const reviews: {
    list: (status?: string) => Promise<import("./types.js").Review[]>;
    create: (body: {
        module_id?: string;
        repo_id?: string;
        title: string;
        source_branch: string;
        target_branch?: string;
        assignee?: string;
    }) => Promise<import("./types.js").Review>;
    getDiff: (id: string) => Promise<import("./types.js").ReviewDiff>;
    merge: (id: string) => Promise<{
        status: string;
    }>;
};
export declare const connectors: {
    list: () => Promise<{
        connected: unknown[];
        available: unknown[];
    }>;
    /** @deprecated */
    listAdapters: () => Promise<{
        connected: unknown[];
        available: unknown[];
    }>;
    connect: (tool: string) => Promise<{
        tool: string;
        status: string;
    }>;
};
export declare const automations: {
    list: () => Promise<import("./types.js").Automation[]>;
    create: (body: {
        name: string;
        trigger_type: string;
        action: string;
    }) => Promise<import("./types.js").Automation>;
    listRuns: () => Promise<import("./types.js").AutomationRun[]>;
    toggle: (id: string, enabled: boolean) => Promise<import("./types.js").Automation>;
};
export declare const notifications: {
    list: () => Promise<unknown[]>;
    getPreferences: () => Promise<Record<string, boolean>>;
    patchPreferences: (prefs: Record<string, boolean>) => Promise<Record<string, boolean>>;
};
export declare const audit: {
    getTimeline: (params?: {
        project_id?: string;
        limit?: number;
    }) => Promise<{
        events: Record<string, unknown>[];
    }>;
};
export declare const client: {
    setAccessToken: typeof setAccessToken;
    setApiKey: typeof setApiKey;
    setApiBase: typeof setApiBase;
    getConfig: () => Promise<PlatformConfig>;
    listProjects: () => Promise<string[]>;
    listRepos: () => Promise<import("./types.js").Module[]>;
    listModules: (ws?: string) => Promise<import("./types.js").Module[]>;
    getRepo: (id: string) => Promise<import("./types.js").Module>;
    listBranches: (repoId: string) => Promise<import("./types.js").Branch[]>;
    listTags: (_repoId: string) => Promise<import("./types.js").Tag[]>;
    getRepoLog: (repoId: string, branch?: string) => Promise<import("./types.js").Commit[]>;
    getCommitDiff: (_repoId: string, _hash: string) => Promise<import("./types.js").ReviewDiff>;
    createRepo: (id: string, name: string) => Promise<import("./types.js").Module>;
    createBranch: (repoId: string, name: string, from?: string) => Promise<unknown>;
    createTag: () => Promise<{
        name: string;
    }>;
    mergeBranches: (repoId: string, source: string, target: string) => Promise<{
        status: string;
    }>;
    listReviews: (status?: string) => Promise<import("./types.js").Review[]>;
    getReview: (id: string) => Promise<unknown>;
    createReview: (body: {
        module_id?: string;
        repo_id?: string;
        title: string;
        source_branch: string;
        target_branch?: string;
        assignee?: string;
    }) => Promise<import("./types.js").Review>;
    getReviewDiff: (id: string) => Promise<import("./types.js").ReviewDiff>;
    mergeReview: (id: string) => Promise<{
        status: string;
    }>;
    getTimeline: (params?: {
        project_id?: string;
        since?: string;
        limit?: number;
        cursor?: string;
    }) => Promise<{
        events: Record<string, unknown>[];
    }>;
    getEvent: (id: string) => Promise<unknown>;
    listAdapters: () => Promise<{
        connected: unknown[];
        available: unknown[];
    }>;
    connectAdapter: (tool: string) => Promise<{
        tool: string;
        status: string;
    }>;
    listAutomations: () => Promise<import("./types.js").Automation[]>;
    createAutomation: (body: {
        name: string;
        trigger_type: string;
        action: string;
    }) => Promise<import("./types.js").Automation>;
    listAutomationRuns: () => Promise<import("./types.js").AutomationRun[]>;
    toggleAutomation: (id: string, enabled: boolean) => Promise<import("./types.js").Automation>;
};
export * from "./types.js";
