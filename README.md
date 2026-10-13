# Zulfiqar Ahmad Khan — personal academic website

A static website with three pages (About, Publications, CV), a day/night switch,
and Google Scholar metrics that update automatically every day.
It runs for free on GitHub Pages; no server or build step is needed.

## 1. Publish on GitHub Pages

1. Create a new repository on GitHub. For the address `https://<username>.github.io`,
   name the repository exactly `<username>.github.io`.
2. Upload **all** files and folders from this zip, including the hidden `.github` folder
   (drag the whole folder into GitHub's "Add file → Upload files" page, or use `git push`).
3. In the repository, go to **Settings → Pages** and set *Source* to **Deploy from a branch**,
   branch **main**, folder **/ (root)**. Your site appears at the address shown there within a minute or two.
4. Go to **Settings → Actions → General → Workflow permissions** and choose
   **Read and write permissions** (the daily update needs this to save new numbers).
5. Open the **Actions** tab, pick **Update Google Scholar metrics**, and click **Run workflow**
   once to fill in your live numbers straight away.

## 2. Where to edit things

All content lives in the `data/` folder. You never need to touch the HTML or JavaScript.

| What you want to change | File |
| --- | --- |
| Name, position, bio, research interests, links, education, experience, awards, skills | `data/profile.json` |
| Publications (add a new paper, fix a title, add a link) | `data/publications.json` |
| Journal quartile (Q1–Q4) and impact factor | `data/journals.json` |
| The CV files people download | `files/` (keep the same file names, or update `cv_pdf` / `resume_pdf` in `profile.json`) |
| Your photo | add `assets/photo.jpg` (a square photo works best) |

**Links:** in `profile.json`, any link with an empty `"url": ""` is hidden. Fill in ResearchGate,
GitHub or LinkedIn and they appear automatically.

**Journal rankings:** each journal is listed once in `data/journals.json`. Fill in, for example:

```json
"Applied Energy": { "quartile": "Q1", "impact_factor": "10.1", "note": "JCR 2024" }
```

Every paper in that journal then shows the Q and IF badges. Badges stay hidden while a field is empty.

**Adding a publication:** copy an existing entry in `data/publications.json` and edit it.
`type` is one of `journal`, `conference`, `submitted`, `patent`. Put new papers at the top so the numbering stays newest-first.

## 3. How the Google Scholar numbers work

Google Scholar has no official API and cannot be read directly from a web page. Instead, a
GitHub Action (`.github/workflows/update-scholar.yml`) runs `scripts/update_scholar.py` once a day.
It collects your total citations, h-index, i10-index, citations per year and per-paper citation
counts, saves them in `data/scholar.json`, and the site reads that file.

* Until the first run, the site shows the figures from your CV (3000+, 25, 30+).
* Google Scholar sometimes blocks automated requests. When that happens the script simply keeps
  the previous numbers, so the site never breaks. If it keeps failing for several days, set
  `USE_FREE_PROXIES: "1"` in the workflow file.
* Your Scholar ID is set in the workflow (`SCHOLAR_ID: TmDD6z8AAAAJ`).

## 4. Preview on your own computer

The pages load their content from the `data/` files, which browsers block when you double-click
an HTML file. Run a small local server instead, from inside this folder:

```
python -m http.server 8000
```

then open <http://localhost:8000>.
