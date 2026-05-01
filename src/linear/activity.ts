type ActivityState = {
  pending: number
  lastError: string | null
}

let snapshot: ActivityState = {
  pending: 0,
  lastError: null,
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function getActivitySnapshot(): ActivityState {
  return snapshot
}

export function subscribeActivity(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function beginRequest(): () => void {
  let ended = false
  snapshot = { ...snapshot, pending: snapshot.pending + 1 }
  emit()
  return () => {
    if (ended) return
    ended = true
    snapshot = { ...snapshot, pending: Math.max(0, snapshot.pending - 1) }
    emit()
  }
}

export function recordError(error: unknown): string {
  const message = String(error instanceof Error ? error.message : error)
  snapshot = { ...snapshot, lastError: message }
  emit()
  return message
}

export async function trackRequest<T>(fn: () => Promise<T>): Promise<T> {
  const end = beginRequest()
  try {
    return await fn()
  } catch (e) {
    recordError(e)
    throw e
  } finally {
    end()
  }
}
