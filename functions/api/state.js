// Pages Function — single-row state blob backed by D1.
// GET  /api/state         -> { data: <object>, updated_at: <ms> }
// PUT  /api/state         -> body { data, base?: <ms> }; saves and returns { updated_at }
//
// Auth: when env.APP_PASSCODE is set, requests must send
// `Authorization: Bearer <passcode>`. When unset, the API is open
// (useful in dev / before the secret is configured).

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  })

const checkAuth = (request, env) => {
  const expected = env.APP_PASSCODE
  if (!expected) return null
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (got && got === expected) return null
  return json({ error: 'unauthorized' }, 401)
}

export const onRequestGet = async ({ request, env }) => {
  const denied = checkAuth(request, env); if (denied) return denied
  try {
    const row = await env.DB
      .prepare('SELECT data, updated_at FROM state WHERE id = 1')
      .first()
    if (!row) return json({ data: {}, updated_at: 0 })
    let data = {}
    try { data = JSON.parse(row.data) } catch {}
    return json({ data, updated_at: row.updated_at || 0 })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
}

export const onRequestPut = async ({ request, env }) => {
  const denied = checkAuth(request, env); if (denied) return denied
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }
  if (!body || typeof body.data !== 'object' || body.data === null) {
    return json({ error: 'data must be an object' }, 400)
  }

  if (typeof body.base === 'number') {
    const cur = await env.DB
      .prepare('SELECT updated_at FROM state WHERE id = 1')
      .first()
    if (cur && cur.updated_at > body.base) {
      return json({ error: 'stale', updated_at: cur.updated_at }, 409)
    }
  }

  const updated_at = Date.now()
  const serialized = JSON.stringify(body.data)
  await env.DB
    .prepare('UPDATE state SET data = ?, updated_at = ? WHERE id = 1')
    .bind(serialized, updated_at)
    .run()
  return json({ updated_at })
}

export const onRequestOptions = () =>
  new Response(null, {
    status: 204,
    headers: { allow: 'GET, PUT, OPTIONS' }
  })
