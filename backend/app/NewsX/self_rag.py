"""
PSX Self-RAG — Company Announcements Retriever + PDF Downloader
================================================================
True Self-RAG pipeline:
  1. Scrape PSX announcements (titles only — saves tokens)
  2. IsRel  — Is this title relevant to the query?
  3. IsSup  — Is the summary grounded in the title?  (hallucination guard)
  4. IsUse  — Is the summary useful to an investor?  (quality gate)
  5. Download PDFs for top-N announcements that passed all evaluators
  6. Write final .txt report
 
Requirements:
    pip install openai playwright
    playwright install chromium
 
Usage:
    python psx_rag.py --ticker ABL
    python psx_rag.py --ticker ABL --query "dividend" --download 4
    python psx_rag.py --ticker ENGRO --max-results 20 --download 6
"""
 
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()
 
try:
    from openai import OpenAI
except ImportError:
    raise ImportError("openai package is required. Run: pip install openai")
 
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    raise ImportError("playwright package is required. Run: pip install playwright && playwright install chromium")
 
# ─── config ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
PSX_URL        = "https://dps.psx.com.pk/announcements"
 
 
# ══════════════════════════════════════════════════════════════════════════════
# STEP 1 — SCRAPE PSX  (titles + metadata + PDF urls)
# ══════════════════════════════════════════════════════════════════════════════
 
import requests


def scrape_psx_announcements(ticker: str, max_results: int = 20) -> list[dict]:
    """
    Scrapes PSX announcements with pagination support.
    Keeps clicking 'Next' until max_results are collected.
    """
    print(f"  Launching browser for '{ticker}'…")
    announcements = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        # ── XHR interceptor ──────────────────────────────────────────────
        xhr_rows = []
        def on_response(response):
            ct = response.headers.get("content-type", "")
            if response.status == 200 and "json" in ct:
                try:
                    body = response.json()
                    rows = body if isinstance(body, list) else body.get("data", [])
                    if isinstance(rows, list) and rows:
                        sample = rows[0] if rows else {}
                        if any(k in sample for k in ("title","subject","TITLE","heading")):
                            xhr_rows.extend(rows)
                except Exception:
                    pass
        page.on("response", on_response)

        # ── Navigate ─────────────────────────────────────────────────────
        page.goto(
            "https://dps.psx.com.pk/announcements/companies",
            wait_until="domcontentloaded",
            timeout=30_000,
        )
        try:
            page.wait_for_load_state("networkidle", timeout=15_000)
        except PWTimeout:
            pass
        time.sleep(2)

        # ── Fill symbol input ─────────────────────────────────────────────
        try:
            symbol_input = page.locator("#announcementsSearch")
            symbol_input.wait_for(state="visible", timeout=10_000)
            symbol_input.click()
            time.sleep(0.3)
            symbol_input.fill("")
            symbol_input.type(ticker.upper(), delay=150)
            print(f"  ✓ Typed '{ticker}' into symbol field")
        except Exception as e:
            print(f"  ⚠ Could not fill symbol: {e}")

        time.sleep(1.5)

        # ── Select exact ticker from autocomplete ─────────────────────────
        clicked_suggestion = page.evaluate(f"""
            () => {{
                const items = document.querySelectorAll(
                    'li, [class*="option"], [class*="suggest"], [class*="item"]'
                );
                for (const item of items) {{
                    const t = item.innerText.trim().toUpperCase();
                    if (t === '{ticker.upper()}' || t.startsWith('{ticker.upper()} ')) {{
                        const r = item.getBoundingClientRect();
                        if (r.width > 0 && r.height > 0) {{
                            item.click();
                            return true;
                        }}
                    }}
                }}
                return false;
            }}
        """)
        if clicked_suggestion:
            print(f"  ✓ Selected '{ticker}' from autocomplete")
        else:
            print(f"  ⚠ Autocomplete not found — proceeding anyway")

        time.sleep(0.5)

        # ── Click SEARCH ──────────────────────────────────────────────────
        try:
            page.locator("#annSearchBtn").click(timeout=5_000)
            print("  ✓ Clicked SEARCH")
        except Exception:
            try:
                page.locator("button:has-text('SEARCH')").click(timeout=5_000)
            except Exception as e:
                print(f"  ⚠ Search click failed: {e}")

        try:
            page.wait_for_load_state("networkidle", timeout=20_000)
        except PWTimeout:
            pass
        time.sleep(3)

        # ── Paginate until we have enough results ─────────────────────────
        page_num = 1
        while len(announcements) < max_results:
            print(f"  Reading page {page_num} ({len(announcements)}/{max_results} collected)…")

            try:
                page.wait_for_selector("table tbody tr", timeout=10_000)
            except PWTimeout:
                print("  ⚠ Table not found")
                break

            rows_el = page.query_selector_all("table tbody tr")
            print(f"  Found {len(rows_el)} rows on page {page_num}")

            if not rows_el:
                print("  No rows found — stopping pagination")
                break

            new_this_page = 0
            for row_el in rows_el:
                cells = row_el.query_selector_all("td")
                texts = [c.inner_text().strip() for c in cells]

                if len(texts) < 5:
                    continue

                # Columns: DATE(0) | TIME(1) | SYMBOL(2) | NAME(3) | TITLE(4)
                title      = texts[4]
                date       = texts[0]

                # PDF link
                pdf_url = ""
                for link in row_el.query_selector_all("a[href]"):
                    href = link.get_attribute("href") or ""
                    text = link.inner_text().strip().upper()
                    if "PDF" in text:
                        if not href.startswith("http"):
                            href = "https://dps.psx.com.pk" + href
                        pdf_url = href
                        break

                if title:
                    announcements.append({
                        "title":    title,
                        "date":     date,
                        "category": "",
                        "url":      pdf_url,
                    })
                    new_this_page += 1

            print(f"  + {new_this_page} announcements from page {page_num}")

            # Stop if we have enough
            if len(announcements) >= max_results:
                print(f"  ✓ Reached {max_results} — stopping")
                break

            # ── Click Next page ───────────────────────────────────────────
            next_clicked = False
            try:
                # PSX has multiple Prev/Next pairs — first one belongs to the table
                next_btn = page.locator("button:has-text('Next')").first
                is_disabled = next_btn.is_disabled()
                if is_disabled:
                    print("  ⚠ Next button disabled — no more pages")
                    break
                next_btn.click(timeout=5_000)
                print(f"  → Clicked Next (page {page_num} → {page_num+1})")
                next_clicked = True
                try:
                    page.wait_for_load_state("networkidle", timeout=10_000)
                except PWTimeout:
                    pass
                time.sleep(2)
                page_num += 1
            except Exception as e:
                print(f"  ⚠ Could not click Next: {e} — stopping")
                break

            if not next_clicked:
                break

        browser.close()

    # deduplicate
    seen, unique = set(), []
    for a in announcements:
        key = a["title"].strip().lower()
        if key and key not in seen:
            seen.add(key)
            unique.append(a)

    print(f"  → {len(unique)} unique announcements for {ticker}")
    return unique[:max_results]  # trim to exactly what was requested
# ══════════════════════════════════════════════════════════════════════════════
# STEP 5 — PDF DOWNLOADER
# ══════════════════════════════════════════════════════════════════════════════
 
def _safe_filename(title: str, date: str, idx: int) -> str:
    """Turn an announcement title into a safe filename."""
    clean = re.sub(r'[\\/*?:"<>|]', "", title)   # remove illegal chars
    clean = re.sub(r'\s+', "_", clean.strip())     # spaces → underscores
    clean = clean[:60]                              # truncate
    date_str = date[:10].replace("-", "") if date else "nodate"
    return f"{idx:02d}_{date_str}_{clean}.pdf"
 
 
def download_pdfs(announcements: list[dict], ticker: str,
                  download_dir: str, max_downloads: int) -> list[dict]:
    """
    Download PDFs for the top-N announcements using Playwright.
    Playwright handles cookies + redirects just like a browser.
 
    Updates each announcement dict with:
      pdf_path  — local file path (or "" if failed)
      pdf_ok    — True/False
    """
    # sort by IsRel + IsUse score combined (best first)
    ranked = sorted(
        announcements,
        key=lambda a: a.get("isrel_score", 0) + a.get("isuse_score", 0),
        reverse=True,
    )
    to_download = [a for a in ranked if a.get("url", "").strip()][:max_downloads]
 
    if not to_download:
        print("  ⚠  No URLs available to download PDFs from.")
        return announcements
 
    Path(download_dir).mkdir(parents=True, exist_ok=True)
    print(f"  Downloading {len(to_download)} PDF(s) into '{download_dir}/'")
 
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            accept_downloads=True,          # enable Playwright download handling
        )
        page = context.new_page()
 
        for idx, ann in enumerate(to_download, 1):
            url = ann["url"]
            filename = _safe_filename(ann["title"], ann["date"], idx)
            filepath = os.path.join(download_dir, filename)
 
            print(f"  [{idx}/{len(to_download)}] {ann['title'][:55]}…")
            print(f"           URL : {url}")
 
            try:
                # Method A: direct navigation to PDF URL
                # PSX PDFs are usually served as direct links or via redirect
                if url.lower().endswith(".pdf") or "pdf" in url.lower():
                    # Stream the PDF bytes via Playwright fetch
                    response = page.request.get(url, timeout=20_000)
                    if response.status == 200:
                        content_type = response.headers.get("content-type", "")
                        if "pdf" in content_type or "octet" in content_type:
                            with open(filepath, "wb") as f:
                                f.write(response.body())
                            ann["pdf_path"] = filepath
                            ann["pdf_ok"]   = True
                            size_kb = os.path.getsize(filepath) // 1024
                            print(f"           ✓  Saved ({size_kb} KB) → {filename}")
                            continue
                        else:
                            print(f"           ⚠  Unexpected content-type: {content_type}")
 
                # Method B: navigate to the page and intercept the download
                with page.expect_download(timeout=15_000) as dl_info:
                    page.goto(url, wait_until="domcontentloaded", timeout=15_000)
                download = dl_info.value
                download.save_as(filepath)
                ann["pdf_path"] = filepath
                ann["pdf_ok"]   = True
                size_kb = os.path.getsize(filepath) // 1024
                print(f"           ✓  Downloaded ({size_kb} KB) → {filename}")
 
            except PWTimeout:
                print(f"           ✗  Timed out")
                ann["pdf_path"] = ""
                ann["pdf_ok"]   = False
            except Exception as e:
                print(f"           ✗  Error: {e}")
                ann["pdf_path"] = ""
                ann["pdf_ok"]   = False
 
            time.sleep(0.5)
 
        browser.close()
 
    return announcements
 
 
# ══════════════════════════════════════════════════════════════════════════════
# SELF-RAG EVALUATORS  (OpenAI, titles only)
# ══════════════════════════════════════════════════════════════════════════════
 
def _chat(client, model, system, user, max_tokens=200):
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system},
                  {"role": "user",   "content": user}],
        max_tokens=max_tokens,
        temperature=0.0,
    )
    return resp.choices[0].message.content.strip()
 
 
def _parse_json(text):
    if "```" in text:
        for part in text.split("```"):
            part = part.strip().lstrip("json").strip()
            if part.startswith(("{", "[")):
                text = part
                break
    try:
        s = text.find("{"); e = text.rfind("}") + 1
        if s >= 0 and e > s:
            return json.loads(text[s:e])
    except Exception:
        pass
    return {}
 
 
def is_relevant(ann, ticker, query, client, model):
    context = f"company '{ticker}'" + (f", query '{query}'" if query else "")
    raw = _chat(client, model,
        system='PSX relevance classifier. Respond ONLY with JSON: {"relevant":true/false,"score":1-5,"reason":"one line"}',
        user=f"Relevant for {context}?\n\nTitle: {ann['title']}\nCategory: {ann['category']}\nDate: {ann['date']}",
        max_tokens=120)
    r = _parse_json(raw)
    return {"relevant": r.get("relevant", True), "score": r.get("score", 3), "reason": r.get("reason", "")}
 
 
def is_supported(title, summary, client, model):
    raw = _chat(client, model,
        system='Hallucination checker. Respond ONLY with JSON: {"supported":true/false,"reason":"one line"}',
        user=f"Is this summary grounded in the title?\n\nTitle: {title}\nSummary: {summary}",
        max_tokens=120)
    r = _parse_json(raw)
    return {"supported": r.get("supported", True), "reason": r.get("reason", "")}
 
 
def is_useful(ticker, query, summary, client, model):
    context = f"investor tracking {ticker}" + (f" interested in '{query}'" if query else "")
    raw = _chat(client, model,
        system='Utility evaluator. Respond ONLY with JSON: {"useful":true/false,"score":1-5,"reason":"one line"}',
        user=f"Useful for {context}?\n\nSummary: {summary}",
        max_tokens=120)
    r = _parse_json(raw)
    return {"useful": r.get("useful", True), "score": r.get("score", 3), "reason": r.get("reason", "")}
 
 
def summarize_from_title(ann, ticker, client, model):
    return _chat(client, model,
        system=(
            "Financial analyst. Based ONLY on the announcement title and category "
            "(do NOT invent financial figures), write a 2-3 sentence investor note."
        ),
        user=f"Company: {ticker}\nTitle: {ann['title']}\nCategory: {ann['category']}\nDate: {ann['date']}",
        max_tokens=200)
 
 
def generate_briefing(ticker, query, announcements, client, model):
    items = "\n".join(
        f"{i+1}. [{a['date']}] [{a['category']}] {a['title']}"
        for i, a in enumerate(announcements)
    )
    topic = f"'{query}'" if query else "recent activity"
    return _chat(client, model,
        system=(
            "Senior equity analyst. Write a structured market intelligence briefing: "
            "sentiment, key themes, financial highlights, risks, opportunities."
        ),
        user=f"PSX announcements for {ticker} about {topic}:\n\n{items}",
        max_tokens=600)
 
 
# ══════════════════════════════════════════════════════════════════════════════
# REPORT WRITER
# ══════════════════════════════════════════════════════════════════════════════
 
def write_report(ticker, query, passed, dropped, briefing, output_path):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    W = 70
    L = [
        "=" * W,
        "  PSX SELF-RAG ANNOUNCEMENT REPORT",
        f"  Ticker  : {ticker}",
        f"  Query   : {query or '(all recent)'}",
        f"  Date    : {now}",
        f"  Source  : {PSX_URL}",
        f"  Passed  : {len(passed)}   Dropped: {len(dropped)}",
        "=" * W, "",
        "┌─ SELF-RAG EVALUATORS",
        "│  IsRel — Is the title relevant to the query?       (titles only, no file read)",
        "│  IsSup — Is the summary grounded in the title?     (hallucination guard)",
        "│  IsUse — Is the summary useful to an investor?     (quality gate)",
        "└" + "─" * (W - 2), "",
        "┌─ MARKET INTELLIGENCE BRIEFING",
        "│",
    ]
    for line in briefing.split("\n"):
        L.append(f"│  {line}")
    L += ["│", "└" + "─" * (W - 2), ""]
 
    
    
 
    L += ["─" * W, f"  PASSED ANNOUNCEMENTS ({len(passed)})", "─" * W, ""]
    for i, a in enumerate(passed, 1):
        pdf_line = f"    PDF URL   : {a.get('url') or 'not available'}"
        L += [
            f"[{i}] {a['title']}",
            f"    Date      : {a['date']}",
            f"    Category  : {a['category']}",
            f"    URL       : {a['url']}",
            f"    IsRel     : {a.get('isrel_score','?')}/5 — {a.get('isrel_reason','')}",
            f"    IsSup     : {'✓ Grounded' if a.get('issup') else '✗ Flagged'} — {a.get('issup_reason','')}",
            f"    IsUse     : {a.get('isuse_score','?')}/5 — {a.get('isuse_reason','')}",
            pdf_line,
            "",
            "    SUMMARY (from title only):",
        ]
        for line in a.get("summary", "").split("\n"):
            L.append(f"    {line}")
        L += ["", "    " + "·" * (W - 4), ""]
 
    if dropped:
        L += ["─" * W, f"  DROPPED ({len(dropped)}) — failed IsRel/IsSup/IsUse", "─" * W, ""]
        for a in dropped:
            L.append(f"  ✗  [{a.get('isrel_score','?')}/5]  {a['title']}  ({a.get('drop_reason','')})")
        L.append("")
 
    L += ["=" * W, f"  Generated by PSX Self-RAG | {now}", "=" * W]
    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(L))
 
 
# ══════════════════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ══════════════════════════════════════════════════════════════════════════════
 
def run(ticker, query="", max_results=15, output_path=None,
        isrel_threshold=3, isuse_threshold=3,
        model="gpt-4o-mini"):
 
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")
 
    ticker = ticker.upper().strip()
    ts     = datetime.now().strftime("%Y%m%d_%H%M%S")
    if output_path is None:
        output_path = f"{ticker}_announcements_{ts}.txt"
   
 
    client = OpenAI(api_key=OPENAI_API_KEY)
 
    print(f"\n{'='*55}")
    print(f"  PSX Self-RAG  |  {ticker}  |  model: {model}")
    print(f"  Evaluators : IsRel → IsSup → IsUse")
    print(f"  Token mode : TITLES ONLY (no file content read)")
    
    print(f"{'='*55}")
 
    # 1. Scrape
    print(f"\n[1/6] Scraping PSX announcements for '{ticker}'…")
    raw = scrape_psx_announcements(ticker, max_results)
    print(f"  → {len(raw)} announcements scraped")
    if not raw:
        raise RuntimeError(f"No announcements found for '{ticker}'. Check the ticker symbol or your network connection.")
 
    # 2. IsRel
    print(f"\n[2/6] IsRel — scoring from titles only…")
    for i, ann in enumerate(raw):
        print(f"  [{i+1}/{len(raw)}] {ann['title'][:65]}")
        r = is_relevant(ann, ticker, query, client, model)
        ann["isrel_relevant"] = r["relevant"]
        ann["isrel_score"]    = r["score"]
        ann["isrel_reason"]   = r["reason"]
        time.sleep(0.15)
 
    # 3. Filter IsRel
    print(f"\n[3/6] Filtering IsRel (≥ {isrel_threshold}/5)…")
    relevant = [a for a in raw if a.get("isrel_score", 3) >= isrel_threshold]
    dropped  = [dict(a, drop_reason=f"IsRel {a['isrel_score']}/5")
                for a in raw if a.get("isrel_score", 3) < isrel_threshold]
    print(f"  → {len(relevant)} passed,  {len(dropped)} dropped")
    if not relevant:
        print("  ⚠  Lowering IsRel threshold to 2…")
        relevant = [a for a in raw if a.get("isrel_score", 3) >= 2] or raw
 
    # 4. Summarize (title only)
    print(f"\n[4/6] Summarizing from titles only (no PDF read)…")
    for i, ann in enumerate(relevant):
        print(f"  [{i+1}/{len(relevant)}] {ann['title'][:65]}")
        ann["summary"] = summarize_from_title(ann, ticker, client, model)
        time.sleep(0.15)
 
    # 5. IsSup + IsUse
    print(f"\n[5/6] IsSup + IsUse — grounding & utility checks…")
    final, extra_dropped = [], []
    for ann in relevant:
        sup = is_supported(ann["title"], ann["summary"], client, model)
        ann["issup"] = sup["supported"]; ann["issup_reason"] = sup["reason"]
 
        use = is_useful(ticker, query, ann["summary"], client, model)
        ann["isuse_score"] = use["score"]; ann["isuse_reason"] = use["reason"]
 
        if not sup["supported"]:
            ann["drop_reason"] = f"IsSup=False"
            extra_dropped.append(ann)
            print(f"  ✗ IsSup FAILED  {ann['title'][:55]}")
        elif use["score"] < isuse_threshold:
            ann["drop_reason"] = f"IsUse {use['score']}/5"
            extra_dropped.append(ann)
            print(f"  ✗ IsUse {use['score']}/5  {ann['title'][:55]}")
        else:
            final.append(ann)
            print(f"  ✓ IsRel={ann['isrel_score']} IsSup=Y IsUse={use['score']}  {ann['title'][:50]}")
        time.sleep(0.15)
 
    dropped += extra_dropped
    to_report = final or relevant
    print(f"\n  → {len(to_report)} passed all evaluators")
 
    print(f"\n[6/6] PDF URLs ready — no download, users open links directly")
    
 
    # Briefing + report
    print(f"\n  Generating market intelligence briefing…")
    briefing = generate_briefing(ticker, query, to_report, client, model)
 
    print(f"\n  Writing report → {output_path}")
    write_report(ticker, query, to_report, dropped, briefing, output_path)
 
    print(f"  PDF URLs → included in report")
    print(f"\n{'='*55}")
    print(f"  Done!")
    print(f"  Report   → {output_path}")
   
    print(f"  Scraped  : {len(raw)}   Passed: {len(to_report)}   Dropped: {len(dropped)}")
    print(f"{'='*55}\n")
    return output_path
 
 
# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════
 
def main():
    p = argparse.ArgumentParser(
        description="PSX Self-RAG — scrape announcements, evaluate with IsRel/IsSup/IsUse, download top PDFs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
SELF-RAG EVALUATORS:
  IsRel  Is the title relevant to the query?         (no file read — saves tokens)
  IsSup  Is the summary grounded in the title?       (hallucination guard)
  IsUse  Is the summary useful to an investor?       (quality gate)
 
PDF DOWNLOAD:
  Top-N announcements (ranked by IsRel+IsUse score) are downloaded as PDFs.
  Use --download 0 to skip PDF download entirely.
 
SETUP:
  pip install openai playwright
  playwright install chromium
  export OPENAI_API_KEY=sk-...
 
EXAMPLES:
  python psx_rag.py --ticker ABL
  python psx_rag.py --ticker ABL --query "dividend" --download 4
  python psx_rag.py --ticker ENGRO --max-results 20 --download 6
  python psx_rag.py --ticker HBL --download 0 --model gpt-4o
        """,
    )
    p.add_argument("--ticker",      "-t", required=True,             help="PSX symbol e.g. ABL, ENGRO, HBL")
    p.add_argument("--query",       "-q", default="",                help="Focus keyword e.g. 'dividend'")
    p.add_argument("--max-results", "-n", type=int, default=15,
               help="Number of announcements to fetch — will paginate if needed (default 15)")
    p.add_argument("--download",    "-d", type=int,   default=4,     help="Top-N PDFs to download (default 4, 0=skip)")
    p.add_argument("--output",      "-o", default=None,              help="Report .txt path")
    p.add_argument("--isrel",             type=int,   default=3,     choices=[1,2,3,4,5])
    p.add_argument("--isuse",             type=int,   default=3,     choices=[1,2,3,4,5])
    p.add_argument("--model",       "-m", default="gpt-4o-mini")
    args = p.parse_args()
 
    run(
        ticker          = args.ticker,
        query           = args.query,
        max_results     = args.max_results,
        output_path     = args.output,
        isrel_threshold = args.isrel,
        isuse_threshold = args.isuse,
        model           = args.model,
        
    )
 
if __name__ == "__main__":
    main()