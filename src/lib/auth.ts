interface D1Like {
  prepare(query: string): {
    bind: (...values: unknown[]) => {
      first: <T = unknown>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
  };
}

interface RuntimeLike {
  env?: {
    DB?: D1Like;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
  };
}

export interface OwnerAccount {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  plan_tier: string;
}

export type AccountRole = "owner" | "buyer" | "admin";

interface SessionRow extends OwnerAccount {
  token: string;
  expires_at: string;
}

export const AUTH_COOKIE = "property_owner_session";

function getDB(runtime?: RuntimeLike | null) {
  return runtime?.env?.DB;
}

async function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function ensureBootstrapAdmin(runtime?: RuntimeLike | null) {
  const db = getDB(runtime);
  const email = runtime?.env?.ADMIN_EMAIL?.trim().toLowerCase();
  const password = runtime?.env?.ADMIN_PASSWORD ?? "";

  if (!db || !email || !password) return;

  const existing = await db
    .prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`)
    .bind(email)
    .first<{ id: number }>();

  if (existing) return;

  await db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, phone, role, plan_tier)
       VALUES (?, ?, ?, ?, 'admin', 'enterprise')`
    )
    .bind(email, await hashPassword(password), "Platform Admin", null)
    .run();
}

export async function createOwnerAccount(
  runtime: RuntimeLike | null | undefined,
  input: { email: string; password: string; fullName: string; phone?: string | null; role?: AccountRole }
) {
  const db = getDB(runtime);
  if (!db) throw new Error("D1 database binding missing");

  await ensureBootstrapAdmin(runtime);

  const email = input.email.trim().toLowerCase();
  const existing = await db
    .prepare(`SELECT id FROM users WHERE email = ? LIMIT 1`)
    .bind(email)
    .first<{ id: number }>();

  if (existing) return { ok: false as const, error: "exists" };

  const role = input.role === "buyer" ? "buyer" : "owner";
  const planTier = role === "buyer" ? "buyer" : "starter";

  await db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, phone, role, plan_tier)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(email, await hashPassword(input.password), input.fullName.trim(), input.phone?.trim() || null, role, planTier)
    .run();

  return { ok: true as const, role };
}

export async function authenticateOwner(runtime: RuntimeLike | null | undefined, email: string, password: string) {
  const db = getDB(runtime);
  if (!db) return null;

  await ensureBootstrapAdmin(runtime);

  const user = await db
    .prepare(
      `SELECT id, email, full_name, phone, role, plan_tier, password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`
    )
    .bind(email.trim().toLowerCase())
    .first<OwnerAccount & { password_hash: string }>();

  if (!user) return null;
  if (user.password_hash !== await hashPassword(password)) return null;

  const { password_hash: _ignored, ...owner } = user;
  return owner;
}

export async function createSession(runtime: RuntimeLike | null | undefined, userId: number) {
  const db = getDB(runtime);
  if (!db) throw new Error("D1 database binding missing");

  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  await db
    .prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(token, userId, expiresAt)
    .run();

  return token;
}

export async function getOwnerFromSession(runtime: RuntimeLike | null | undefined, token?: string | null) {
  if (!token) return null;

  const db = getDB(runtime);
  if (!db) return null;

  await ensureBootstrapAdmin(runtime);

  const row = await db
    .prepare(
      `SELECT s.token, s.expires_at, u.id, u.email, u.full_name, u.phone, u.role, u.plan_tier
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ?
       LIMIT 1`
    )
    .bind(token)
    .first<SessionRow>();

  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    await db.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
    return null;
  }

  const { token: _token, expires_at: _expiresAt, ...owner } = row;
  return owner;
}

export async function destroySession(runtime: RuntimeLike | null | undefined, token?: string | null) {
  const db = getDB(runtime);
  if (!db || !token) return;

  await db.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
}

export function buildSessionCookie(token: string) {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getDefaultRedirectForRole(role: string) {
  if (role === "buyer") return "/buyer/dashboard/";
  return "/owner/dashboard/";
}
