export const config = { api: { bodyParser: false } };
import Busboy from "busboy";
function readFileFromFormData(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });
    let fileBuffer = Buffer.alloc(0);
    let fields = {};
    bb.on("file", (_name, file) => { file.on("data", (d) => (fileBuffer = Buffer.concat([fileBuffer, d]))); });
    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("close", () => resolve({ buffer: fileBuffer, fields }));
    bb.on("error", reject); req.pipe(bb);
  });
}
async function callHF(buffer, modelId) {
  const res = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, "Content-Type": "application/octet-stream" },
    body: buffer, cache: "no-store",
  });
  if (!res.ok) throw new Error(`HF ${modelId}: ${res.status}`); return res.json();
}
async function callRoboflow(buffer) {
  if (!process.env.ROBOFLOW_API_KEY || !process.env.ROBOFLOW_MODEL || !process.env.ROBOFLOW_VERSION) return null;
  const url = `https://detect.roboflow.com/${process.env.ROBOFLOW_MODEL}/${process.env.ROBOFLOW_VERSION}?api_key=${process.env.ROBOFLOW_API_KEY}&format=json`;
  const res = await fetch(url, { method: "POST", body: buffer, headers: { "Content-Type": "application/octet-stream" } });
  if (!res.ok) throw new Error(`Roboflow: ${res.status}`); return res.json();
}
function normalizeHF(resp){ if(Array.isArray(resp)) return resp.map(x=>({label:String(x.label||x.class||"unknown"),score:Number(x.score||x.confidence||0)})); return []; }
function normalizeRF(resp){ if(!resp||!resp.predictions) return []; return resp.predictions.map(p=>({label:String(p.class),score:Number(p.confidence||0)})); }
function ensemble(results, weights){ const bag={}; for(const [src,arr] of Object.entries(results)){ const w=weights[src]??1; for(const {label,score} of arr){ const k=label.toLowerCase(); bag[k]=(bag[k]||0)+w*score; } } return Object.entries(bag).map(([label,score])=>({label,score})).sort((a,b)=>b.score-a.score).slice(0,10); }
export default async function handler(req,res){ try{ if(req.method!=="POST") return res.status(405).json({error:"Use POST"}); const {buffer,fields}=await readFileFromFormData(req);
  let models=[{id:"nateraw/image-classification",weight:0.9},{id:"apple/mobilevit-small",weight:0.8}];
  if(fields?.config){ try{ const p=JSON.parse(fields.config); if(Array.isArray(p)&&p.length) models=p; }catch{} }
  const hfPromises=models.map(m=>callHF(buffer,m.id).then(r=>({id:m.id,w:Number(m.weight??1),r})));
  const [rf,...hf]=await Promise.all([callRoboflow(buffer),...hfPromises]);
  const results={},weights={}; hf.forEach(({id,w,r})=>{results[id]=normalizeHF(r);weights[id]=w;}); if(rf){results["roboflow"]=normalizeRF(rf);weights["roboflow"]=Number(process.env.RF_WEIGHT||1.0);}
  const fused=ensemble(results,weights);
  res.status(200).json({ ok:true, ouvrage:fields?.ouvrage||null, auteur:fields?.auteur||null, providers:Object.keys(results), top:fused });
}catch(e){ res.status(500).json({ ok:false, error:e.message }); } }
