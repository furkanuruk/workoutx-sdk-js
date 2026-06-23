import type { HttpClient } from "../http.js";
import type { JsonObject } from "../types.js";

/** Result of {@link AuthResource.login}. */
export interface AuthLoginResult extends JsonObject {
  token: string;
  user: JsonObject;
  apiKeys: JsonObject[];
}

/**
 * Account, API-key, and webhook management (`/v1/auth/*`).
 *
 * `register`, `login`, `forgotPassword`, `resetPassword`, `verifyEmail`, and
 * `resendVerification` are public — no token needed. Everything else
 * requires the Bearer token returned by `login` (see {@link WorkoutX.setScanToken}
 * or pass `scan: { email, password }` to the client for automatic login).
 *
 * Google OAuth (`/v1/auth/google`) is a browser-redirect flow and is not
 * wrapped here — it only makes sense from a web app, not an SDK call.
 */
export class AuthResource {
  constructor(
    private readonly http: HttpClient,
    private readonly onLogin?: (token: string) => void,
  ) {}

  /** Create a new account. Sends a verification email; no token is issued yet. */
  register(params: { email: string; password: string; name?: string }): Promise<JsonObject> {
    return this.http.request("/v1/auth/register", { method: "POST", body: params });
  }

  /** Log in and receive a Bearer token (also used by `scan.*`). */
  async login(email: string, password: string): Promise<AuthLoginResult> {
    const result = await this.http.request<AuthLoginResult>("/v1/auth/login", {
      method: "POST",
      body: { email, password },
    });
    this.onLogin?.(result.token);
    return result;
  }

  /** Get the current user's profile. */
  me(): Promise<JsonObject> {
    return this.http.request("/v1/auth/me", { auth: "bearer" });
  }

  /** Update the current user's display name. */
  updateMe(name: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/me", { auth: "bearer", method: "PATCH", body: { name } });
  }

  /** Change the current user's password. */
  changePassword(currentPassword: string, newPassword: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/change-password", {
      auth: "bearer",
      method: "POST",
      body: { currentPassword, newPassword },
    });
  }

  /** List the current user's API keys (exercises/gifs/workout/supplements product). */
  listKeys(): Promise<JsonObject[]> {
    return this.http.request("/v1/auth/keys", { auth: "bearer" });
  }

  /** Create a new API key. */
  createKey(name?: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/keys", { auth: "bearer", method: "POST", body: { name } });
  }

  /** Delete an API key by ID. */
  deleteKey(id: string): Promise<JsonObject> {
    return this.http.request(`/v1/auth/keys/${encodeURIComponent(id)}`, {
      auth: "bearer",
      method: "DELETE",
    });
  }

  /** Change the plan assigned to an API key. */
  updateKeyPlan(id: string, planId: string): Promise<JsonObject> {
    return this.http.request(`/v1/auth/keys/${encodeURIComponent(id)}/plan`, {
      auth: "bearer",
      method: "PATCH",
      body: { planId },
    });
  }

  /** Usage statistics for the current user (optionally filtered to one API key). */
  usage(params: { days?: number; apiKey?: string } = {}): Promise<JsonObject> {
    return this.http.request("/v1/auth/usage", { auth: "bearer", query: { ...params } });
  }

  /** Request a password-reset email. Always succeeds (no email enumeration). */
  forgotPassword(email: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/forgot-password", { method: "POST", body: { email } });
  }

  /** Complete a password reset using the token emailed by `forgotPassword`. */
  resetPassword(token: string, password: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/reset-password", {
      method: "POST",
      body: { token, password },
    });
  }

  /** Verify an email address using the token from the verification email. */
  verifyEmail(token: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/verify-email", { query: { token } });
  }

  /** Resend the verification email. Always succeeds (no email enumeration). */
  resendVerification(email: string): Promise<JsonObject> {
    return this.http.request("/v1/auth/resend-verification", {
      method: "POST",
      body: { email },
    });
  }

  /** Get the current user's registered webhook URL. */
  getWebhook(): Promise<{ webhookUrl: string | null }> {
    return this.http.request("/v1/auth/webhook", { auth: "bearer" });
  }

  /** Set (or clear, with `null`) the webhook URL. */
  setWebhook(webhookUrl: string | null): Promise<JsonObject> {
    return this.http.request("/v1/auth/webhook", {
      auth: "bearer",
      method: "PATCH",
      body: { webhookUrl },
    });
  }

  /** Send a test event to the registered webhook URL. */
  testWebhook(): Promise<JsonObject> {
    return this.http.request("/v1/auth/webhook/test", { auth: "bearer", method: "POST" });
  }
}
