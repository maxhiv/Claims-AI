export type FetcherOpts = { method?: string; body?: any; headers?: Record<string,string> };
const BASE = process.env.NEXT_PUBLIC_API_BASE || '/api';

export async function api<T=any>(path: string, opts: FetcherOpts = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.headers||{}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function getAssignments(adjusterId: string) {
  const since = new Date(Date.now() - 1000*60*60*24).toISOString();
  return api(`/claims/assignments?adjusterId=${encodeURIComponent(adjusterId)}&since=${encodeURIComponent(since)}`);
}

export async function listAppointments(claimId: string) {
  return api(`/claims/${encodeURIComponent(claimId)}/appointments`);
}

export async function upsertAppointment(claimId: string, payload: any) {
  return api(`/claims/${encodeURIComponent(claimId)}/appointments`, { method:'POST', body: payload });
}

export async function logCommunication(claimId: string, payload: any) {
  return api(`/claims/${encodeURIComponent(claimId)}/communications`, { method:'POST', body: payload });
}

export async function patchStage(claimId: string, payload: any) {
  return api(`/claims/${encodeURIComponent(claimId)}/stage`, { method:'PATCH', body: payload });
}

export async function optimizeRoute(stops: Array<{lat:number,lng:number,address?:string}>) {
  return api(`/routing/optimize`, { method:'POST', body: { stops } });
}
