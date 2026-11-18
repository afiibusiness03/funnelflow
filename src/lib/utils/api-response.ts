// Never treat an HTML error/login page (including a 200 redirect) as API success.
export async function readApiResponse(response: Response): Promise<Record<string, any>> {
  if (response.redirected) throw new Error('Your session may have expired. Refresh the page and sign in again.')
  const fallback = response.status === 401
    ? 'Your session has expired. Sign in again.'
    : `The server returned an unexpected response (HTTP ${response.status}). Please refresh the page and try again.`
  if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error(fallback)
  let result
  try { result = await response.json() } catch { throw new Error(fallback) }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error(fallback)
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback)
  return result
}
