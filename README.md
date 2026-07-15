# Ofri Kraus Portfolio

A cinematic, Hebrew RTL portfolio for filmmaker Ofri Kraus. The site is a dependency-free static build with responsive imagery, accessible media dialogs, reduced-motion support, and production SEO metadata.

## Local preview

Open `index.html` directly, or serve the directory locally:

```powershell
python -m http.server 4173
```

## Quality checks

```powershell
python scripts\qa_site.py
python scripts\audit_layout.py
node --check script.js
```

## Media pipeline

Original media remains under `assets/`. Recreate the optimized WebP derivatives and social assets with:

```powershell
python scripts\optimize_assets.py
```
