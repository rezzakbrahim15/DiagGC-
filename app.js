function readJSON() {
  try { return JSON.parse(document.getElementById('config').value); }
  catch(e){ alert('JSON invalide dans la configuration IA.'); throw e; }
}
function pickFile() {
  const a = document.getElementById('file');
  const b = document.getElementById('camera');
  return a.files[0] || b.files[0] || null;
}
function renderJSON(id, data) {
  document.getElementById(id).textContent = JSON.stringify(data, null, 2);
}
const MAP = [
  { keys: ['crack','fissure','fracture'], patho:'Fissures', degre:"Intervention à court terme", urgence:"Urgent" },
  { keys: ['corrosion','rust','rouille'], patho:'Corrosion des armatures', degre:"Réparation planifiée", urgence:"Moyen" },
  { keys: ['spall','eclatement','spalling'], patho:'Éclatement du béton', degre:"Réparation immédiate", urgence:"Très urgent" },
  { keys: ['efflorescence','salt','salpetre'], patho:'Efflorescences', degre:"Observation / Entretien", urgence:"Faible" },
  { keys: ['vegetation','moss','mousse','plante','herbe'], patho:'Végétation et mousses', degre:"Entretien", urgence:"Faible" },
  { keys: ['leak','water','humidity','humidite','infiltration','moisture','wet'], patho:'Infiltrations / Humidité', degre:"Diagnostic complémentaire", urgence:"Moyen" },
  { keys: ['deformation','buckling','warp','bow'], patho:'Déformations', degre:"Contrôle / Surveillance renforcée", urgence:"Moyen à urgent" },
  { keys: ['spalled concrete','chipping','eclatement beton'], patho:'Altération du béton', degre:"Réparation planifiée", urgence:"Moyen" },
];
function interpretTop(top) {
  const rows = [];
  for (const {label, score} of (top || [])) {
    const L = String(label || '').toLowerCase();
    let best = null;
    for (const m of MAP) { if (m.keys.some(k => L.includes(k))) { best = m; break; } }
    rows.push({label, score, patho: best?.patho||'—', degre: best?.degre||'—', urgence: best?.urgence||'—'});
  }
  return rows;
}
function renderInterpretation(rows) {
  const tbody = document.querySelector('#interpretation tbody');
  tbody.innerHTML = rows.map(r => `<tr>
    <td>${r.label} (${(r.score*100).toFixed(1)}%)</td>
    <td>${r.patho}</td>
    <td>${r.degre}</td>
    <td>${r.urgence}</td>
  </tr>`).join('');
}
document.getElementById('btn-analyser').addEventListener('click', async () => {
  const f = pickFile();
  if (!f) { alert('Choisis ou prends une photo.'); return; }
  renderJSON('result', {status:'uploading', name:f.name, size:f.size});
  const form = new FormData();
  form.append('image', f);
  form.append('config', JSON.stringify(readJSON()));
  form.append('ouvrage', document.getElementById('ouvrage').value || '');
  form.append('auteur', document.getElementById('auteur').value || '');
  try {
    const r = await fetch('/api/predict', { method:'POST', body: form });
    const data = await r.json();
    renderJSON('result', data);
    renderInterpretation(interpretTop(data.top));
  } catch (e) {
    renderJSON('result', { ok:false, error: e.message });
  }
});
document.getElementById('btn-clear').addEventListener('click', () => {
  document.getElementById('result').textContent = 'En attente…';
  document.querySelector('#interpretation tbody').innerHTML = '';
  document.getElementById('file').value = '';
  document.getElementById('camera').value = '';
});
document.getElementById('btn-export').addEventListener('click', () => {
  const res = document.getElementById('result').textContent;
  const table = document.querySelector('#interpretation').outerHTML;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rapport DiagGC</title>
  <style>
    body{font-family:Inter,system-ui;padding:24px}
    pre{white-space:pre-wrap;background:#111827;color:#e5e7eb;padding:12px;border-radius:8px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ddd;padding:6px;text-align:left}
    th{background:#f3f4f6}
  </style>
  </head><body>
  <h1>Rapport DiagGC</h1>
  <p><b>Ouvrage :</b> ${ (document.getElementById('ouvrage').value || '—') }</p>
  <p><b>Auteur :</b> ${ (document.getElementById('auteur').value || '—') }</p>
  <h3>Résultats IA</h3>
  <pre>${res.replace(/[&<>]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[s]))}</pre>
  <h3>Interprétation SNCF</h3>
  ${table}
  </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); w.print();
});
