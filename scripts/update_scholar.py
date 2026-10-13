"""Fetch Google Scholar profile metrics and write data/scholar.json.

Run by the GitHub Action in .github/workflows/update-scholar.yml once a day.

Google Scholar blocks most automated requests from GitHub's servers, so the
main method is SerpAPI (https://serpapi.com), which fetches the Scholar
profile on our behalf. It needs a free SerpAPI key stored as the repository
secret SERPAPI_KEY. Without a key, the script falls back to the `scholarly`
package, which often gets blocked.

If anything fails, the previous data/scholar.json is kept unchanged, so the
website never shows broken numbers.
"""
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

SCHOLAR_ID = os.environ.get("SCHOLAR_ID", "TmDD6z8AAAAJ")
SERPAPI_KEY = os.environ.get("SERPAPI_KEY", "").strip()
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "scholar.json")


def via_serpapi():
    """Return (metrics dict, publications list) using SerpAPI."""
    pubs, start, metrics, graph = [], 0, None, []
    for _ in range(5):  # at most 5 pages of 100 papers
        query = urllib.parse.urlencode({
            "engine": "google_scholar_author", "author_id": SCHOLAR_ID,
            "api_key": SERPAPI_KEY, "num": 100, "start": start, "hl": "en",
        })
        with urllib.request.urlopen("https://serpapi.com/search.json?" + query, timeout=60) as r:
            data = json.load(r)
        if data.get("error"):
            raise RuntimeError(data["error"])
        if metrics is None:
            cited = data.get("cited_by", {})
            metrics = {}
            for row in cited.get("table", []):
                for key, vals in row.items():          # e.g. "citations": {"all": 3412, "since_2021": 3010}
                    metrics[key] = vals
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

    def pick(name, which):
        vals = metrics.get(name, {})
        if which == "all":
            return vals.get("all")
        for k, v in vals.items():
            if k.startswith("since_"):
                return v
        return None

    since_key = next((k for v in metrics.values() for k in v if k.startswith("since_")), None)
    return {
        "citations": pick("citations", "all"),
        "h_index": pick("h_index", "all"),
        "i10_index": pick("i10_index", "all"),
        "citations_since": pick("citations", "since"),
        "h_index_since": pick("h_index", "since"),
        "i10_index_since": pick("i10_index", "since"),
        "since_year": int(since_key.split("_")[1]) if since_key else None,
        "cites_per_year": {str(g["year"]): g["citations"] for g in graph if "year" in g},
        "source": "Google Scholar via SerpAPI",
    }, pubs


def via_scholarly():
    """Return (metrics dict, publications list) using the scholarly package."""
    from scholarly import scholarly, ProxyGenerator
    if os.environ.get("USE_FREE_PROXIES") == "1":
        pg = ProxyGenerator()
        if pg.FreeProxies():
            scholarly.use_proxy(pg)
    author = scholarly.search_author_id(SCHOLAR_ID)
    author = scholarly.fill(author, sections=["basics", "indices", "counts", "publications"])
    pubs = [{
        "title": p.get("bib", {}).get("title", ""),
        "year": p.get("bib", {}).get("pub_year"),
        "citations": p.get("num_citations", 0),
    } for p in author.get("publications", [])]
    return {
        "citations": author.get("citedby"),
        "h_index": author.get("hindex"),
        "i10_index": author.get("i10index"),
        "citations_since": author.get("citedby5y"),
        "h_index_since": author.get("hindex5y"),
        "i10_index_since": author.get("i10index5y"),
        "since_year": datetime.date.today().year - 5,
        "cites_per_year": {str(k): v for k, v in sorted(author.get("cites_per_year", {}).items())},
        "source": "Google Scholar via scholarly",
    }, pubs


def main() -> int:
    try:
        if SERPAPI_KEY:
            print("Using SerpAPI.")
            metrics, pubs = via_serpapi()
        else:
            print("No SERPAPI_KEY secret found; trying scholarly (often blocked on GitHub).")
            metrics, pubs = via_scholarly()
    except Exception as exc:
        print(f"Could not fetch Google Scholar profile ({exc!r}); keeping previous data.")
        return 0

    if not metrics.get("citations"):
        print("Scholar returned no citation data; keeping previous data.")
        return 0

    data = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "source": metrics.pop("source"),
        "scholar_id": SCHOLAR_ID,
        "citations_label": f"{metrics['citations']:,}",
        **metrics,
        "publications": pubs,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Updated: {data['citations']} citations, h-index {data['h_index']}, "
          f"i10-index {data['i10_index']}, {len(pubs)} publications.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
