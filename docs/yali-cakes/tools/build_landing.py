"""Builds the landing pages (yali-cakes/<slug>/index.html) from landing.py.
Usage (from the repo root): python3 docs/yali-cakes/tools/build_landing.py yali-cakes
Add each new page's URL to yali-cakes/sitemap.xml."""
import json, os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from page_parts import SITE, head, header, footer, ARROW
from landing import PAGES

root = sys.argv[1]
gallery = json.load(open(os.path.join(root, "data", "gallery.json"), encoding="utf-8"))["items"]
by_file = {i["file"]: i for i in gallery}
business = {"@id": SITE + "/#business"}


def photos(spec):
    if "files" in spec:
        out = []
        for f in spec["files"]:
            if isinstance(f, (list, tuple)):
                out.append((f[0], f[1]))
            else:
                out.append((f, by_file[f]["alt"] if f in by_file else None))
        return out
    return [(i["file"], i["alt"]) for i in gallery if i["cat"] == spec["cat"]][: spec["count"]]


WORKSHOP_ALTS = {
    "e85bbadcdc8087350b217adc146bf297.webp": "יהלי עורכת את שולחן הסדנה עם קופסאות בנטו ושלט ורוד",
    "6ee6a6d8d3ea56aad3a51ec1c465b715.webp": "שולחן סדנת עוגות בנטו עם קופסאות, נרות ושלט ורוד",
    "35bea2a951ce2d28337780401eec03e7.webp": "שולחן סדנה ורוד עם קופסאות בנטו, שקיות קרם וקישוטים",
}

for p in PAGES:
    url = f"{SITE}/{p['slug']}/"
    pics = [(f, alt or WORKSHOP_ALTS.get(f, p["short"])) for f, alt in photos(p["photos"])]
    faq_ld = {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in p["faq"]]}
    jsonld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url + "#page", "url": url, "name": p["title"] + " | YALI CAKES",
         "description": p["description"], "inLanguage": "he", "isPartOf": {"@id": SITE + "/#website"},
         "primaryImageOfPage": f"{SITE}/assets/{pics[0][0]}"},
        {"@type": "Service", "name": p["service"], "serviceType": p["service"], "description": p["description"],
         "provider": business, "url": url, "image": [f"{SITE}/assets/{f}" for f, _ in pics[:4]]},
        faq_ld,
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": p["short"], "item": url}]}]}
    tiles = "\n".join(
        f'<li><figure class="yp-lp-tile"><img src="../assets/{f}" alt="{html.escape(a)}" width="1200" height="1200" loading="{"eager" if n < 2 else "lazy"}" decoding="async"></figure></li>'
        for n, (f, a) in enumerate(pics))
    faq = "\n".join(f'<details class="yp-lp-q"><summary>{html.escape(q)}</summary><p>{html.escape(a)}</p></details>' for q, a in p["faq"])
    others = "".join(f'<li><a href="../{o["slug"]}/">{o["short"]}</a></li>' for o in PAGES if o is not p)
    page = head("../", p["title"] + " | YALI CAKES", p["description"], url, jsonld, og_type="website") + header("../") + f'''
<main id="main" class="yp-main">
<section class="yp-hero-band">
<div class="yp-wrap">
<p class="yp-crumbs"><a href="../">דף הבית</a> › {p["short"]}</p>
<h1>{p["title"]}</h1>
<p class="yp-lead">{p["lead"]}</p>
<p class="yp-lp-cta"><a class="yp-btn" href="{p["cta"][1]}"><span>{p["cta"][0]}</span>{ARROW}</a></p>
</div>
</section>
<section class="yp-wrap" aria-label="תמונות"><ul class="yp-lp-grid">
{tiles}
</ul></section>
<article class="yp-article">
{p["body"].strip()}
<h2>שאלות נפוצות</h2>
{faq}
<div class="yp-article-cta">
<a class="yp-btn" href="{p["cta"][1]}"><span>{p["cta"][0]}</span>{ARROW}</a>
</div>
<h2>עוד אצל YALI CAKES</h2>
<ul>{others}<li><a href="../gallery/">העבודות שלי</a></li></ul>
</article>
</main>
''' + footer("../")
    os.makedirs(os.path.join(root, p["slug"]), exist_ok=True)
    open(os.path.join(root, p["slug"], "index.html"), "w", encoding="utf-8").write(page)
print("built", len(PAGES), "landing pages")
