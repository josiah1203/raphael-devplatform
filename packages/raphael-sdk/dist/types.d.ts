export type PlatformConfig = {
    api_base: string;
    ui_port: number;
    mode: string;
    platform_name?: string;
    version?: string;
    features?: {
        reviews: boolean;
        automations: boolean;
        connectors: boolean;
    };
};
export type Module = {
    id: string;
    name: string;
    description?: string | null;
};
/** @deprecated Use Module */
export type Repo = Module;
export type Branch = {
    name: string;
    commit_hash: string | null;
};
export type Tag = {
    name: string;
    commit_hash: string;
};
export type Commit = {
    hash: string;
    parent_hash?: string | null;
    author?: string;
    timestamp?: string;
    message?: string;
    ops?: string | unknown[];
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
export type ReviewDiff = {
    bom: {
        change: string;
        reference: string;
        value: string;
    }[];
    drc: {
        rule: string;
        severity: string;
        message: string;
    }[];
    electrical: {
        net: string;
        change: string;
    }[];
    schematic: {
        change: string;
        element: string;
        detail: string;
    }[];
    layout: {
        change: string;
        element: string;
        detail: string;
    }[];
    ops: unknown[];
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
