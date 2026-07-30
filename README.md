# Ofri Kraus Portfolio

A cinematic, Hebrew RTL portfolio for filmmaker Ofri Kraus. The public experience is a dependency-free static build with responsive imagery, accessible media dialogs, reduced-motion support, and production SEO metadata. Its authenticated administration layer uses Vercel Blob for managed media and content.

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

## Admin media uploads

The admin panel accepts JPG, PNG, WebP, and AVIF images up to 2.8 MB, plus MP4, WebM, and MOV videos up to 250 MB. Video uploads go directly to private Vercel Blob storage and are streamed through `/api/media-file` with byte-range support.

Rebuild the browser upload client after updating `@vercel/blob`:

```powershell
npm run bundle:upload
```
