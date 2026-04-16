/**
 * Wrapper for fetch that handles errors consistently.
 * Returns { data, error } instead of throwing.
 */
export async function apiFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { data: null, error: body.error || `Erro ${res.status}` };
    }
    const data = await res.json();
    return { data, error: null };
  } catch {
    return { data: null, error: 'Erro de conexão. Verifique sua internet.' };
  }
}
