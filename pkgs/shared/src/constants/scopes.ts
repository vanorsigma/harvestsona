export const SCOPES = [
  "harvestsona:approve",
  "admin:appoint",
  "admin:remove",
  "user:delete",
  "user:ban"
] as const;

export type Scope = typeof SCOPES[number];
