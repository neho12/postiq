"""Shared page parts (head, top menu, footer) for the standalone YALI CAKES pages built by build_tips.py and build_landing.py."""
import json, html

SITE = "https://www.yalicakes.co.il"

def head(prefix, title, desc, url, jsonld, og_type="article"):
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
<meta property="og:type" content="{og_type}">
<meta property="og:locale" content="he_IL">
<meta property="og:site_name" content="YALI CAKES">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-image.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="עוגת וינטג׳ ורודה של YALI CAKES">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{SITE}/og-image.jpg">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
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
