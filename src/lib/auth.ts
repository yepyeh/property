interface RuntimeLike {
  env?: {
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_SESSION_TOKEN?: string;
  };
}

export const AUTH_COOKIE = "property_admin_session";

export function getAuthConfig(runtime?: RuntimeLike | null) {
  return {
    email: runtime?.env?.ADMIN_EMAIL ?? "",
    password: runtime?.env?.ADMIN_PASSWORD ?? "",
    sessionToken: runtime?.env?.ADMIN_SESSION_TOKEN ?? "",
  };
}

export function isAuthenticated(runtime: RuntimeLike | null | undefined, cookieValue?: string | null) {
  const { sessionToken } = getAuthConfig(runtime);
  return Boolean(sessionToken) && cookieValue === sessionToken;
}

export function buildSessionCookie(token: string) {
  return `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`;
}

export function clearSessionCookie() {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
