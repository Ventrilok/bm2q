import { Client } from "colyseus.js";

let client: Client | null = null;

export function getClient(): Client {
  if (!client && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.hostname;
    const port = window.location.port;
    client = new Client(`${protocol}://${host}${port ? `:${port}` : ""}`);
  }
  return client!;
}
