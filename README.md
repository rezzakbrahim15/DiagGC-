# DiagGC v2 – Détection IA (Hugging Face + Roboflow optionnel)
Front statique + fonction serverless `/api/predict`.
- Variables nécessaires : `HF_TOKEN` (obligatoire), optionnel `ROBOFLOW_API_KEY`, `ROBOFLOW_MODEL`, `ROBOFLOW_VERSION`, `RF_WEIGHT`.
- Le front interprète automatiquement les labels → Pathologie SNCF + Degré d’intervention + Urgence.
- Export PDF intégré.

## Déploiement
1) **Décompressez** ce ZIP. Uploadez les **fichiers extraits** dans GitHub (pas le ZIP).
2) Connectez le dépôt à Vercel → Deploy.
3) Ajoutez `HF_TOKEN` dans Settings → Environment Variables → Redeploy.
