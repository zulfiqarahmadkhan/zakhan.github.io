"""Fetch Google Scholar profile metrics and write data/scholar.json.

Run by the GitHub Action in .github/workflows/update-scholar.yml once a day.
Google Scholar has no official API, so this uses the `scholarly` package.
If Scholar blocks the request, the script keeps the previous data/scholar.json
unchanged and exits successfully, so the website never shows broken numbers.

Run locally:  pip install scholarly  &&  python scripts/update_scholar.py
"""
import datetime
import json
import os
import sys

SCHOLAR_ID = os.environ.get("SCHOLAR_ID", "TmDD6z8AAAAJ")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "scholar.json")


def main() -> int:
    try:
        from scholarly import scholarly, ProxyGenerator
    except ImportError:
        print("scholarly is not installed: pip install scholarly")
        return 1

    if os.environ.get("USE_FREE_PROXIES") == "1":
        pg = ProxyGenerator()
        if pg.FreeProxies():
            scholarly.use_proxy(pg)

    try:
        author = scholarly.search_author_id(SCHOLAR_ID)
        author = scholarly.fill(author, sections=["basics", "indices", "counts", "publications"])
    except Exception as exc:  # Scholar blocked us or changed its page
        print(f"Could not fetch Google Scholar profile ({exc!r}); keeping previous data.")
        return 0

    pubs = []
    for p in author.get("publications", []):
        bib = p.get("bib", {})
        pubs.append({
            "title": bib.get("title", ""),
            "year": bib.get("pub_year"),
            "citations": p.get("num_citations", 0),
        })

    this_year = datetime.date.today().year
    data = {
        "updated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "source": "Google Scholar via scholarly",
        "scholar_id": SCHOLAR_ID,
        "citations": author.get("citedby", 0),
        "citations_label": f"{author.get('citedby', 0):,}",
        "h_index": author.get("hindex", 0),
        "i10_index": author.get("i10index", 0),
        "since_year": this_year - 5,
        "citations_since": author.get("citedby5y"),
        "h_index_since": author.get("hindex5y"),
        "i10_index_since": author.get("i10index5y"),
        "cites_per_year": {str(k): v for k, v in sorted(author.get("cites_per_year", {}).items())},
        "publications": pubs,
    }

    if not data["citations"]:
        print("Scholar returned no citation data; keeping previous data.")
        return 0

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"Updated: {data['citations']} citations, h-index {data['h_index']}, "
          f"i10-index {data['i10_index']}, {len(pubs)} publications.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
