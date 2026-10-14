import { HttpClient } from "./http.js";
import { ExercisesResource } from "./resources/exercises.js";
import { GifsResource } from "./resources/gifs.js";
import { WorkoutResource } from "./resources/workout.js";
import { SupplementsResource } from "./resources/supplements.js";
import { ScanResource } from "./resources/scan.js";
import { AuthResource } from "./resources/auth.js";
import { BillingResource } from "./resources/billing.js";
import { V2Resource } from "./resources/v2.js";

export const DEFAULT_BASE_URL = "https://api.workoutxapp.com";

/** Credentials for the Body Scan product. */
export type ScanAuth =
  /** A ready-to-use JWT from a prior login. */
  | { token: string }
  /** Credentials used to log in automatically on first scan call. */
  | { email: string; password: string };

export interface WorkoutXOptions {
  /**
   * API key (starts with `wx_`) for exercises, gifs, workout, supplements.
   * Required unless you only use public endpoints (e.g. `scan.packs`).
   */
  apiKey?: string;
  /** Credentials for the Body Scan product. Omit if you don't use `scan`. */
  scan?: ScanAuth;
  /** Override the API base URL. Defaults to https://api.workoutxapp.com */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 30000. */
  timeout?: number;
  /** Max retries on transient errors (429/5xx/network). Default 2. */
  maxRetries?: number;
  /** Extra headers added to every request. */
  headers?: Record<string, string>;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

/**
 * The WorkoutX API client. One instance covers both products:
 *
 * ```ts
 * const wx = new WorkoutX({ apiKey: "wx_...", scan: { token: "eyJ..." } });
 * await wx.exercises.byName("lunges");
 * await wx.scan.credits();
 * ```
 */
export class WorkoutX {
  readonly exercises: ExercisesResource;
  readonly gifs: GifsResource;
  readonly workout: WorkoutResource;
  readonly supplements: SupplementsResource;
  readonly scan: ScanResource;
  readonly auth: AuthResource;
  readonly billing: BillingResource;
  /** API v2: the new exercise catalog with signed, expiring media links. */
  readonly v2: V2Resource;

  private readonly http: HttpClient;
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private cachedToken?: string;
  private loginInFlight?: Promise<string>;
  private readonly scanAuth?: ScanAuth;

  constructor(opts: WorkoutXOptions = {}) {
    const fetchImpl = opts.fetch ?? globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "No global fetch available. Use Node 18+ or pass a `fetch` implementation in options.",
      );
    }

    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this.scanAuth = opts.scan;
    if (opts.scan && "token" in opts.scan) this.cachedToken = opts.scan.token;

    this.http = new HttpClient({
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      getBearer: () => this.getBearerToken(),
      timeout: opts.timeout ?? 30_000,
      maxRetries: opts.maxRetries ?? 2,
      defaultHeaders: { "User-Agent": "workoutx-sdk-js/0.2.0", ...opts.headers },
      fetch: fetchImpl.bind(globalThis),
    });

    this.exercises = new ExercisesResource(this.http);
    this.gifs = new GifsResource(this.http);
    this.workout = new WorkoutResource(this.http);
    this.supplements = new SupplementsResource(this.http);
    this.scan = new ScanResource(this.http);
    // A successful auth.login() caches the token so scan.* works without
    // re-supplying credentials.
    this.auth = new AuthResource(this.http, (token) => this.setScanToken(token));
    this.billing = new BillingResource(this.http);
    this.v2 = new V2Resource(this.http);
  }

  /** Build a direct GIF URL with the API key baked into the query string. */
  gifUrl(filename: string): string {
    return this.gifs.url(filename, { baseUrl: this.baseUrl, apiKey: this.apiKey });
  }

  /** Manually set/replace the body-scan Bearer token. */
  setScanToken(token: string): void {
    this.cachedToken = token;
  }

  /** Resolve a Bearer token, logging in with email/password if needed. */
  private async getBearerToken(): Promise<string | undefined> {
    if (this.cachedToken) return this.cachedToken;
    if (!this.scanAuth || !("email" in this.scanAuth)) return undefined;

    // De-dupe concurrent logins.
    if (!this.loginInFlight) {
      const creds = this.scanAuth;
      this.loginInFlight = this.auth
        .login(creds.email, creds.password)
        .then((res) => res.token)
        .finally(() => {
          this.loginInFlight = undefined;
        });
    }
    return this.loginInFlight;
  }
}
