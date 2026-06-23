import type { HttpClient } from "../http.js";

/** Access to `/v1/gifs/*`. Authenticated with the API key. */
export class GifsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Fetch an exercise GIF as raw bytes.
   *
   * Accepts both "0001" and "0001.gif". On the free plan the API serves a
   * watermarked variant; paid plans get the original. Returns the binary
   * payload — wrap it in `Blob`/`Buffer` as needed.
   */
  async get(filename: string): Promise<ArrayBuffer> {
    const name = /\.gif$/i.test(filename) ? filename : `${filename}.gif`;
    return this.http.request<ArrayBuffer>(`/v1/gifs/${encodeURIComponent(name)}`, {
      raw: true,
    });
  }

  /**
   * Build the direct GIF URL (no request made). Useful for `<img src>`.
   * The API key still needs to be supplied — by default via the `api-key`
   * query param, which works for `<img>` tags that can't set headers.
   */
  url(filename: string, opts: { baseUrl: string; apiKey?: string }): string {
    const name = /\.gif$/i.test(filename) ? filename : `${filename}.gif`;
    const u = new URL(`${opts.baseUrl.replace(/\/$/, "")}/v1/gifs/${encodeURIComponent(name)}`);
    if (opts.apiKey) u.searchParams.set("api-key", opts.apiKey);
    return u.toString();
  }
}
