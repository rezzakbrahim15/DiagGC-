// --- Utilitaires DOM
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const elOuvrage = $("#ouvrage");
const elAuteur  = $("#auteur");
const elCfg     = $("#cfg");
const elFile    = $("#file");
const elCam     = $("#camera");
const elBtn     = $("#btn");
const elClr     = $("#clear");
const elStatus  = $("#status");
const tbRes     = $("#tbl-results tbody");
const tbScnf    = $("#tbl-scnf tbody");

// --- Mapping simple vers règles SNCF
function mapSNCF(label) {
  const k = label.toLowerCase();

  if (/(fissure|crack)/.test(k))        return { degre: "Réparation à court terme",   urgence: "Très urgent",  u: "red" };
  if (/(éclatement|spall|spalling)/.test(k)) return { degre: "Réparation immédiate",     urgence: "Très urgent",  u: "red" };
  if (/(corrosion|armature|rebar|rust)/.test(k)) return { degre: "Réparation planifiée",   urgence: "Moyen",       u: "amber" };
  if (/(efflorescen|salitre)/.test(k))  return { degre: "Observation / Entretien",  urgence: "Faible",      u: "vert" };
  if (/(végét|mousse|plante|vegetation)/.test(k)) return { degre: "Entretien",              urgence: "Faible",      u: "vert" };
  if (/(infiltration|humidité|moist|leak)/.test(k)) return { degre: "Diagnostic complémentaire", urgence: "Moyen", u: "amber" };
  if (/(déformation|déflection|warping|bending)/.test(k)) return { degre: "Surveillance renforcée", urgence: "Moyen à urgent", u: "amber" };
  if (/(altération|degradation|deterioration)/.test(k)) return { degre: "Réparation planifiée", urgence: "Moyen", u: "amber" };

  return { degre: "Observation", urgence: "Faible", u: "vert" };
}

// --- Helpers affichage
function pill(text, tone) {
  const cls = tone === "red" ? "u-red" : tone === "amber" ? "u-amber" : "u-vert";
  return `<span class="pill ${cls}">${text}</span>`;
}

function setStatus(txt){ elStatus.textContent = txt; }

// --- Lecture du fichier choisi (galerie ou caméra)
function getChosenFile() {
  return elCam.files?.[0] || elFile.files?.[0] || null;
}

// --- Action: diagnostiquer
elBtn.addEventListener("click", async () => {
  const file = getChosenFile();
  if (!file) { setStatus("Choisis ou prends une photo."); return; }

  elBtn.disabled = true;
  setStatus("Analyse en cours…");

  // Construire le FormData pour /api/predict
  const fd = new FormData();
  fd.append("image", file, file.name);
  fd.append("ouvrage", elOuvrage.value || "");
  fd.append("auteur",  elAuteur.value  || "");
  fd.append("config",  elCfg.value     || "[]");

  try {
    const r = await fetch("/api/predict", { method: "POST", body: fd });
    if (!r.ok) throw new Error(`Erreur serveur (${r.status})`);
    const data = await r.json();

    // data.top = [{label, score}] (selon l’API fournie côté /api/predict)
    const top = (data.top || data || []).slice(0, 8);

    // Tableau résultats bruts
    tbRes.innerHTML = top.map(x =>
      `<tr><td>${x.label}</td><td>${(x.score*100).toFixed(1)} %</td></tr>`
    ).join("") || `<tr><td colspan="2" class="muted">Aucun résultat</td></tr>`;

    // Interprétation SNCF
    const seen = new Set();
    tbScnf.innerHTML = top.map(x => {
      if (seen.has(x.label.toLowerCase())) return "";
      seen.add(x.label.toLowerCase());

      const m = mapSNCF(x.label);
      const urg = m.u === "red" ? pill(m.urgence,"red")
               : m.u === "amber" ? pill(m.urgence,"amber")
               : pill(m.urgence,"vert");

      return `<tr>
        <td>${x.label}</td>
        <td>${m.degre}</td>
        <td>${urg}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="3" class="muted">Rien à interpréter</td></tr>`;

    setStatus("Terminé ✅");
  } catch (e) {
    console.error(e);
    setStatus("Erreur : " + e.message);
  } finally {
    elBtn.disabled = false;
  }
});

// --- Effacer
elClr.addEventListener("click", () => {
  elFile.value = ""; elCam.value=""; tbRes.innerHTML = ""; tbScnf.innerHTML = "";
  setStatus("En attente…");
});
