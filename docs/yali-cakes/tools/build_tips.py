"""Builds yali-cakes/tips/ (index + one page per article) from articles.py.
Usage (from the repo root): python3 docs/yali-cakes/tools/build_tips.py yali-cakes <publish date YYYY-MM-DD>
To add an article: append it to ARTICLES in articles.py, rebuild, and add its URL to yali-cakes/sitemap.xml."""
import json, os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from articles import ARTICLES

from page_parts import SITE, head, header, footer, ARROW
root, date = sys.argv[1], sys.argv[2]

INDEX_TITLE = "טיפים לאפייה ולאירועים | YALI CAKES"
INDEX_DESC = "מדריכים קצרים מ־YALI CAKES: עוגות בנטו, בחירת עוגה לאירוע, שמירה והעברה של עוגה, סדנאות אפייה ושולחנות קינוחים."
crumb_home = {"@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE + "/"}
crumb_tips = {"@type": "ListItem", "position": 2, "name": "טיפים לאפייה", "item": SITE + "/tips/"}

os.makedirs(os.path.join(root, "tips"), exist_ok=True)
# Index
cards = "\n".join(
    f'<li><a class="yp-card" href="./{a["slug"]}/"><h2>{a["short"]}</h2><p>{a["description"]}</p><span class="yp-card-more">לקריאה ←</span></a></li>'
    for a in ARTICLES)
jsonld = {"@context": "https://schema.org", "@graph": [
    {"@type": "CollectionPage", "name": INDEX_TITLE, "description": INDEX_DESC, "url": SITE + "/tips/", "inLanguage": "he"},
    {"@type": "BreadcrumbList", "itemListElement": [crumb_home, crumb_tips]}]}
page = head("../", INDEX_TITLE, INDEX_DESC, SITE + "/tips/", jsonld) + header("../") + f'''
<main id="main" class="yp-main">
<section class="yp-hero-band">
<div class="yp-wrap">
<p class="yp-crumbs"><a href="../">דף הבית</a> › טיפים לאפייה</p>
<h1>טיפים לאפייה</h1>
<p class="yp-lead">מדריכים קצרים מהמטבח של YALI CAKES: על עוגות, אירועים, סדנאות ושולחנות קינוחים.</p>
</div>
</section>
<div class="yp-wrap"><ul class="yp-cards">
{cards}
</ul></div>
</main>
''' + footer("../")
open(os.path.join(root, "tips", "index.html"), "w", encoding="utf-8").write(page)

# Articles
for a in ARTICLES:
    url = f'{SITE}/tips/{a["slug"]}/'
    jsonld = {"@context": "https://schema.org", "@graph": [
        {"@type": "Article", "headline": a["title"], "description": a["description"], "inLanguage": "he",
         "datePublished": date, "dateModified": date, "mainEntityOfPage": url,
         "author": {"@type": "Person", "name": "יהלי זיני"},
         "publisher": {"@type": "Organization", "name": "YALI CAKES", "logo": {"@type": "ImageObject", "url": SITE + "/assets/22fcc5164c177f9f147d86b8a8319b25.svg"}}},
        {"@type": "BreadcrumbList", "itemListElement": [crumb_home, crumb_tips, {"@type": "ListItem", "position": 3, "name": a["short"], "item": url}]}]}
    others = "".join(f'<li><a href="../{o["slug"]}/">{o["short"]}</a></li>' for o in ARTICLES if o is not a)
    body = head("../../", a["title"] + " | YALI CAKES", a["description"], url, jsonld) + header("../../") + f'''
<main id="main" class="yp-main">
<section class="yp-hero-band">
<div class="yp-wrap" style="max-width:820px">
<p class="yp-crumbs"><a href="../../">דף הבית</a> › <a href="../">טיפים לאפייה</a></p>
<h1>{a["title"]}</h1>
<p class="yp-lead">{a["lead"]}</p>
</div>
</section>
<article class="yp-article">
<p class="yp-crumbs">מאת יהלי זיני</p>
{a["body"].strip()}
<div class="yp-article-cta">
<a class="yp-btn" href="{a["cta"][1]}"><span>{a["cta"][0]}</span>{ARROW}</a>
</div>
<h2>עוד טיפים</h2>
<ul>{others}</ul>
</article>
</main>
''' + footer("../../")
    os.makedirs(os.path.join(root, "tips", a["slug"]), exist_ok=True)
    open(os.path.join(root, "tips", a["slug"], "index.html"), "w", encoding="utf-8").write(body)
print("built", len(ARTICLES), "articles")
