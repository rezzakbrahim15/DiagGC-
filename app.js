async function diagnostiquer() {
  const fileInput = document.querySelector("input[type='file']");
  const statusEl = document.querySelector(".status");
  const resultEl = document.querySelector(".results");

  if (!fileInput.files.length) {
    alert("Choisis une image avant de lancer le diagnostic !");
    return;
  }

  const file = fileInput.files[0];

  // Empêche les HEIC/HEIF non supportés
  const okTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!okTypes.includes(file.type)) {
    alert("Format non supporté (HEIC). Fais une capture d’écran ou convertis en JPG/PNG.");
    return;
  }

  statusEl.textContent = "⏳ Analyse en cours...";
  resultEl.textContent = "";

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/predict", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Erreur IA");

    // Résultat IA
    statusEl.textContent = "✅ Analyse terminée";
    resultEl.innerHTML = `
      <p><strong>Label :</strong> ${data.label || "inconnu"}</p>
      <p><strong>Score :</strong> ${(data.score * 100).toFixed(2)}%</p>
    `;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Erreur lors du diagnostic";
  }
}

document.querySelector("button.diagnostiquer").addEventListener("click", diagnostiquer);
