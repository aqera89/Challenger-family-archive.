# Challenger Family Archive

A public historical family tree prototype, with living relatives excluded.

## Features
- Responsive historical genealogy website
- Search historical profiles
- Click ancestors for notes and evidence status
- Research data maintained in `data.json`

## Publishing on GitHub Pages
1. Create a **public** repository named `challenger-family-archive`.
2. Upload `index.html`, `style.css`, `script.js`, and `data.json` to the repository root (and this README).
3. Open **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, `main`, `/ (root)`, then Save.
4. After deployment, open `https://YOUR-USERNAME.github.io/challenger-family-archive/`.

## Privacy
Do not put living-person names, dates, addresses, photographs, or private family data into this public repository, including Git history. Public GitHub Pages sites are publicly accessible.

## Research integrity
All dates in the initial dataset are **reported or hypothetical**, not independently verified. The vertical sequence is a *working research lineage*, not proof of parentage. Add citations to the `sources` arrays and corroborate each relationship before changing its status to Documented.

## Local preview
Run `python -m http.server 8000` inside this folder, then open `http://localhost:8000`.
