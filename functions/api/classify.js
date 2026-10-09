export async function onRequest(context) {
  const { request, env } = context;
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405, headers: { ...headers, "Allow": "POST" }
    });
  }

  if (!env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "AI chưa được cấu hình. Hãy thêm GEMINI_API_KEY trong phần secrets của Cloudflare Pages." }), {
      status: 503, headers
    });
  }

  let body;
  try { body = await request.json(); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON." }), { status: 400, headers });
  }

  const title = String(body?.title || "").trim().slice(0, 300);
  if (!title) {
    return new Response(JSON.stringify({ error: "Missing track title." }), { status: 400, headers });
  }

  const metadata = {
    title,
    artist: String(body.artist || "").slice(0, 300),
    existingGroup: String(body.group || "").slice(0, 150),
    userNote: String(body.note || "").slice(0, 500),
    source: String(body.source || "").slice(0, 100)
  };

  const prompt = `Bạn là trợ lý phân loại thư viện nhạc cá nhân. Chỉ dựa trên metadata được cung cấp; không giả vờ đã nghe âm thanh nếu không có audio. Nếu không chắc, dùng nhãn "chưa rõ" và giảm confidence.
Phân tích bài nhạc theo các trường:
genres: 1-3 thể loại ngắn, tiếng Việt hoặc tên thể loại phổ biến;
moods: 1-3 tâm trạng;
energy: một trong "Thấp", "Vừa", "Cao", "Chưa rõ";
context: một tình huống nghe phù hợp, tối đa 6 từ;
tags: 2-5 tag ngắn, không trùng thể loại/tâm trạng;
confidence: số từ 0 đến 1;
reason: giải thích ngắn bằng tiếng Việt, tối đa 25 từ.
Trả về CHỈ JSON hợp lệ, không Markdown.
Metadata: ${JSON.stringify(metadata)}
JSON schema example: {"genres":["Rock"],"moods":["Hào hứng"],"energy":"Cao","context":"Tập trung làm việc","tags":["Guitar","Hoài niệm"],"confidence":0.65,"reason":"Suy đoán từ tên bài và nghệ sĩ; chưa phân tích âm thanh."}`;

  try {
    const apiResponse = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(env.GEMINI_API_KEY),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        })
      }
    );

    const result = await apiResponse.json();
    if (!apiResponse.ok) {
      return new Response(JSON.stringify({
        error: apiResponse.status === 429
          ? "Đã chạm hạn mức miễn phí của AI. Hãy thử lại sau."
          : "Dịch vụ AI trả về lỗi. Kiểm tra API key hoặc hạn mức."
      }), { status: apiResponse.status === 429 ? 429 : 502, headers });
    }

    const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    if (!text) throw new Error("No AI output");
    let classification;
    try { classification = JSON.parse(text); }
    catch { throw new Error("Invalid AI JSON"); }

    const arr = key => Array.isArray(classification[key])
      ? classification[key].filter(x => typeof x === "string").slice(0, 5).map(x => x.slice(0, 60))
      : [];
    const energyAllowed = ["Thấp", "Vừa", "Cao", "Chưa rõ"];
    const clean = {
      genres: arr("genres").slice(0, 3),
      moods: arr("moods").slice(0, 3),
      energy: energyAllowed.includes(classification.energy) ? classification.energy : "Chưa rõ",
      context: String(classification.context || "Chưa rõ").slice(0, 100),
      tags: arr("tags").slice(0, 5),
      confidence: Math.max(0, Math.min(1, Number(classification.confidence) || 0)),
      reason: String(classification.reason || "").slice(0, 300),
      analyzedAt: new Date().toISOString(),
      basis: "metadata"
    };

    return new Response(JSON.stringify({ classification: clean }), { status: 200, headers });
  } catch {
    return new Response(JSON.stringify({ error: "Không xử lý được phản hồi AI. Hãy thử lại." }), {
      status: 502, headers
    });
  }
}
