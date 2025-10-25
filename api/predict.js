// api/predict.js
export const config = { api: { bodyParser: false } };
import Busboy from "busboy";

// Lire le multipart (image + champs texte)
function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let fileBuffer = Buffer.alloc(0);
    const fields = {};
    bb.on("file", (_n, file) => file.on("data", d => fileBuffer = Buffer.concat([fileBuffer, d])));
    bb.on("field", (n, v) => fields[n] = v);
    bb.on("close", () => resolve({ buffer: fileBuffer, fields }));
    bb.on("error", reject);
    req.pipe(bb);
  });
}

async function callHF(buffer, modelId) {
  const r = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_TOKEN}`,
      "Content-Type": "application/octet-stream"
    },
    body: buffer,
    cache: "no-store"
  });
  if (!r.ok) throw new Error(`HF ${modelId}: ${r.status} ${r.statusText}`);
  return r.json();
}

// Normaliser résultats HF
const norm = (arr=[]) => arr.map(x => ({
  label: String(x.label ?? x.class ?? "inconnu"),
  score: Number(x.score ?? x.confidence ?? 0)
}));

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ ok:false, error:"Utilisez POST" });

    const { buffer, fields } = await readMultipart(req);

    // Liste de modèles (modifiable depuis le textarea "Configuration IA")
    let models = [
      { id: "nateraw/image-classification", weight: 0.9 },
      { id: "apple/mobilevit-small",        weight: 0.8 }
    ];
    if (fields?.config) {
      try {
        const cfg = JSON.parse(fields.config);
        if (Array.isArray(cfg) && cfg.length) models = cfg;
      } catch {}
    }

    // Appels en // puis fusion pondérée
    const outs = await Promise.all(models.map(m =>
      callHF(buffer, m.id).then(r => ({ w: Number(m.weight ?? 1), res: norm(r) }))
    ));

    const bag = {};
    for (const { w, res } of outs) {
      for (const { label, score } of res) {
        const k = label.toLowerCase();
        bag[k] = (bag[k] || 0) + w * score;
      }
    }

    const top = Object.entries(bag)
      .map(([label, score]) => ({ label, score }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 10);

    res.status(200).json({ ok: true, ouvrage: fields?.ouvrage ?? null, auteur: fields?.auteur ?? null, top });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
}
