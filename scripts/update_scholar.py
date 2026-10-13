"""Fetch Google Scholar profile metrics and write data/scholar.json.

Run by the GitHub Action in .github/workflows/update-scholar.yml once a day.

Google Scholar blocks automated requests from GitHub's servers, so this uses
SerpAPI (https://serpapi.com), which fetches the Scholar profile on our behalf.
It needs a free SerpAPI key saved as the repository secret SERPAPI_KEY
(Settings > Secrets and variables > Actions > Repository secrets).

If anything fails, the previous data/scholar.json is kept unchanged, so the
website never shows broken numbers.
"""
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

SCHOLAR_ID = os.environ.get("SCHOLAR_ID", "TmDD6z8AAAAJ")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "").strip()
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "scholar.json")


def fetch_page(start):
    query = urllib.parse.urlencode({
        "engine": "google_scholar_author", "author_id": SCHOLAR_ID,
        "api_key": SERPAPI_KEY, "num": 100, "start": start, "hl": "en",
    })
    try:
        with urllib.request.urlopen("https://serpapi.com/search.json?" + query, timeout=60) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        # SerpAPI explains the problem (e.g. invalid key) in the response body
        try:
            data = json.load(e)
        except Exception:
            raise RuntimeError(f"SerpAPI returned HTTP {e.code}") from None
    if data.get("error"):
        raise RuntimeError("SerpAPI says: " + data["error"])
    return data


def main() -> int:
    if not SERPAPI_KEY:
        print("ERROR: no SERPAPI_KEY found.")
        print("Add your SerpAPI key in GitHub: Settings > Secrets and variables > Actions >")
        print("'Repository secrets' > New repository secret, with the name SERPAPI_KEY.")
        print("Keeping the previous numbers on the website.")
        return 1

    print(f"Using SerpAPI (key ending ...{SERPAPI_KEY[-4:]}) for Scholar ID {SCHOLAR_ID}.")
    pubs, metrics, graph, start = [], None, [], 0
    try:
        for _ in range(5):  # at most 5 pages of 100 papers
            data = fetch_page(start)
            if metrics is None:
                cited = data.get("cited_by", {})
                metrics = {}
                for row in cited.get("table", []):
                    metrics.update(row)   # e.g. {"citations": {"all": 3412, "since_2021": 3010}}
                graph = cited.get("graph", [])
            articles = data.get("articles", [])
            for a in articles:
                pubs.append({
                    "title": a.get("title", ""),
                    "year": a.get("year"),
                    "citations": (a.get("cited_by") or {}).get("value") or 0,
                })
            if len(articles) < 100 or not data.get("serpapi_pagination", {}).get("next"):
                break
            start += 100
    except Exception as exc:
        print(f"ERROR: could not fetch Google Scholar data: {exc}")
        print("Keeping the previous numbers on the website.")
        return 1

    def value(name, since=False):
        vals = (metrics or {}).get(name, {})
        if not since:
            return vals.get("all")
        return next((v for k, v in vals.items() if k.startswith("since_")), None)

    citations = value("citations")
    if not citations:
        print("ERROR: SerpAPI returned no citation numbers; keeping the previous numbers.")
        return 1

    since_key = next((k for v in metrics.values() for k in v if k.startswith("since_")), None)
    data = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "source": "Google Scholar via SerpAPI",
        "scholar_id": SCHOLAR_ID,
        "citations": citations,
        "citations_label": f"{citations:,}",
        "h_index": value("h_index"),
        "i10_index": value("i10_index"),
        "since_year": int(since_key.split("_")[1]) if since_key else None,
        "citations_since": value("citations", True),
        "h_index_since": value("h_index", True),
        "i10_index_since": value("i10_index", True),
        "cites_per_year": {str(g["year"]): g["citations"] for g in graph if "year" in g},
        "publications": pubs,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Updated: {data['citations']} citations, h-index {data['h_index']}, "
          f"i10-index {data['i10_index']}, {len(pubs)} publications.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
