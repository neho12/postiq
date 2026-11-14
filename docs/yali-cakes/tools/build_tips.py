"""Builds yali-cakes/tips/ (index + one page per article) from articles.py.
Usage (from the repo root): python3 docs/yali-cakes/tools/build_tips.py yali-cakes <publish date YYYY-MM-DD>
To add an article: append it to ARTICLES in articles.py, rebuild, and add its URL to yali-cakes/sitemap.xml."""
import json, os, sys, html
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from articles import ARTICLES

SITE = "https://yalicakes.co.il"
root, date = sys.argv[1], sys.argv[2]

def head(prefix, title, desc, url, jsonld):
    return f'''<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#FAE4EA">
<meta property="og:type" content="article">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="YALI CAKES">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}">
<link rel="icon" type="image/svg+xml" href="{prefix}assets/943e4356ed84118b907593c91ed4892b.svg">
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJN2SX08TM"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){{dataLayer.push(arguments);}}
  gtag('js', new Date());

  gtag('config', 'G-BJN2SX08TM');
</script>
<script type="application/ld+json">
{json.dumps(jsonld, ensure_ascii=False, indent=1)}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&amp;display=swap">
<link rel="stylesheet" href="{prefix}yali-plus.css">
<link rel="stylesheet" href="{prefix}pages.css">
</head>
<body class="yp-page">
<a class="yp-skip" href="#main">דלג לתוכן הראשי</a>
'''

def header(prefix):
    ig = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"></circle></svg>'
    tt = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 3.5v10.2a3.9 3.9 0 1 1-3.9-3.9"></path><path d="M14.5 3.5c.3 2.4 1.9 4 4.3 4.2"></path></svg>'
    return f'''
<header class="yp-head" id="yp-head">
<div class="yp-head-in">
<a class="yp-brand" href="{prefix}" aria-label="YALI CAKES, לעמוד הבית"><img src="{prefix}assets/943e4356ed84118b907593c91ed4892b.svg" alt="YALI CAKES" width="40" height="44"></a>
<nav class="yp-nav" id="yp-nav" aria-label="ניווט ראשי">
<a class="yp-link nav-link" href="{prefix}#cakes">עוגות</a>
<a class="yp-link nav-link" href="{prefix}#workshops">סדנאות</a>
<a class="yp-link nav-link" href="{prefix}#desserts">שולחנות קינוחים</a>
<a class="yp-link nav-link" href="{prefix}#about">עליי</a>
<a class="yp-link nav-link" href="{prefix}tips/">טיפים</a>
<span class="yp-soc-row">
<a class="yp-soc" href="https://www.instagram.com/yali.zini/" target="_blank" rel="noopener noreferrer" aria-label="אינסטגרם של YALI CAKES (נפתח בלשונית חדשה)">{ig}</a>
<a class="yp-soc" href="https://www.tiktok.com/@yali_zini" target="_blank" rel="noopener noreferrer" aria-label="טיקטוק של YALI CAKES (נפתח בלשונית חדשה)">{tt}</a>
</span>
</nav>
</div>
</header>
'''

def footer(prefix):
    return f'''
<footer class="yp-foot">
<div class="yp-wrap yp-foot-in">
<img class="yp-foot-logo" src="{prefix}assets/22fcc5164c177f9f147d86b8a8319b25.svg" alt="YALI CAKES" width="120" height="148">
<nav aria-label="קישורים" class="yp-foot-links"><a href="{prefix}tips/">טיפים לאפייה</a><a href="{prefix}gallery/">העבודות שלי</a><a href="{prefix}#terms">תנאי שימוש</a><a href="{prefix}#privacy">מדיניות פרטיות</a><a href="{prefix}#accessibility">הצהרת נגישות</a></nav>
<span class="yp-copy">© 2026 YALI CAKES. כל הזכויות שמורות.</span>
</div>
</footer>

<script src="{prefix}yali-plus.js"></script>
</body>
</html>
'''

ARROW = '<i class="yp-btn-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"></path></svg></i>'
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
