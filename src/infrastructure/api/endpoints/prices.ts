import type { HttpClient } from '../client/HttpClient.js';

export async function getPrice(client: HttpClient, token: string, chainId: number): Promise<string> {
  return client.get<string>(`/prices/${encodeURIComponent(token)}/${chainId}`);
}
