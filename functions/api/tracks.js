export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "Database binding DB is not configured." }), {
      status: 503, headers
    });
  }

  if (request.method === "GET") {
    try {
      const result = await env.DB.prepare(
        "SELECT payload FROM library WHERE id = 1"
      ).first();
      const tracks = result ? JSON.parse(result.payload) : [];
      return new Response(JSON.stringify({ tracks }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Could not load library." }), {
        status: 500, headers
      });
    }
  }

  if (request.method === "PUT") {
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON." }), {
        status: 400, headers
      });
    }

    if (!body || !Array.isArray(body.tracks) || body.tracks.length > 10000) {
      return new Response(JSON.stringify({ error: "Expected a tracks array (maximum 10,000 items)." }), {
        status: 400, headers
      });
    }

    const clean = [];
    for (const track of body.tracks) {
      if (!track || typeof track.title !== "string" || typeof track.url !== "string") continue;
      let parsed;
      try { parsed = new URL(track.url); } catch { continue; }
      if (!["http:", "https:"].includes(parsed.protocol)) continue;
      clean.push({
        id: String(track.id || crypto.randomUUID()),
        url: parsed.href,
        title: track.title.slice(0, 500),
        artist: String(track.artist || "").slice(0, 500),
        cover: String(track.cover || "").slice(0, 2000),
        group: String(track.group || "").slice(0, 200),
        note: String(track.note || "").slice(0, 2000),
        favorite: Boolean(track.favorite),
        added: Number(track.added) || Date.now(),
        aiClassification: track.aiClassification && typeof track.aiClassification === "object" ? track.aiClassification : null
      });
    }

    try {
      await env.DB.prepare(
        "INSERT INTO library (id, payload, updated_at) VALUES (1, ?1, datetime('now')) " +
        "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')"
      ).bind(JSON.stringify(clean)).run();
      return new Response(JSON.stringify({ ok: true, count: clean.length }), { status: 200, headers });
    } catch {
      return new Response(JSON.stringify({ error: "Could not save library." }), {
        status: 500, headers
      });
    }
  }

  return new Response(JSON.stringify({ error: "Method not allowed." }), {
    status: 405, headers: { ...headers, "Allow": "GET, PUT" }
  });
}
