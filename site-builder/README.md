# בונה האתרים

בעלי עסקים מספרים על העסק בשיחה חופשית, והאתר נבנה מול העיניים. הבנייה חינמית (עד 30 הודעות). פרסום האתר והמשך העריכה הם במנוי חודשי (49 ₪, עד 200 הודעות בחודש).

## מה יש כאן

| קובץ | מה הוא עושה |
|---|---|
| `index.html` | דף הנחיתה |
| `app.html` + `builder.js` | האפליקציה: התחברות בקוד לאימייל, שיחה, תמונות, תצוגה מקדימה, פרסום, תשלום, ביטול ומחיקת חשבון |
| `terms.html`, `privacy.html`, `accessibility.html` | עמודים משפטיים (פרטי העסק נמשכים מ־`config.js`) |
| `config.js` | **הגדרות ציבוריות שצריך למלא**: שם המותג, תמיכה, Supabase, Paddle |
| `render.js` | התבנית שהופכת את תוכן האתר לדף |
| `api/` | השרת: `chat`, `me`, `photos`, `publish`, `verify-subscription`, `subscription`, `account`, `site` (מגיש אתרים שפורסמו בכתובת `/s/<שם>`) |
| `lib/` | השיחה עם Claude, הגישה למסד הנתונים, Paddle, מגבלות |
| `supabase/schema.sql` | הקמת מסד הנתונים |
| `demo.html` + `demo.js` | התצוגה המקדימה שרצה בתוך claude.ai (לא חלק מהמוצר) |

Claude (`claude-opus-5-5`) לא כותב HTML: הוא ממלא את תוכן האתר דרך הכלי `update_site`, והתבנית מציגה אותו. כל אתר נראה מקצועי, ואי אפשר להזריק לו קוד.

## עלייה לאוויר, צעד אחר צעד

### 1. Supabase (התחברות, מסד נתונים, תמונות)
1. פותחים פרויקט חדש ב־supabase.com.
2. **SQL Editor** ← מדביקים את `supabase/schema.sql` ← Run.
3. **Authentication → Email Templates → Magic Link**: מוסיפים לתבנית את הקוד, למשל `הקוד שלך: {{ .Token }}`. האפליקציה מבקשת את הקוד, לא קישור.
4. **Authentication → SMTP**: מחברים שירות שליחת מיילים (למשל Resend). בלי זה Supabase שולח רק כמה מיילים בשעה, וזה לא מספיק ללקוחות אמיתיים.
5. **Project Settings → API**: מעתיקים את ה־URL, את ה־`anon` key ואת ה־`service_role` key.

### 2. Paddle (תשלומים)
1. יוצרים **מוצר חדש** עם מחיר חודשי של 49 ₪. לא להשתמש במחיר של PostIQ.
2. מעתיקים את מזהה המחיר (`pri_...`), את ה־**client-side token**, ויוצרים **API key** לשרת.
3. מומלץ להתחיל ב־sandbox, לעשות תשלום ניסיון, ורק אז לעבור ל־production.

### 3. Anthropic
יוצרים API key, ו**מגדירים תקרת הוצאה חודשית** ב־Console, כדי שתקלה או שימוש לרעה לא יגיעו לחשבון גדול.

### 4. `config.js`
ממלאים: שם המותג, וואטסאפ ואימייל לתמיכה, שם העסק ומספר העוסק (מופיעים בתנאי השימוש), ה־URL וה־anon key של Supabase, ה־client token וה־price id של Paddle.

### 5. Vercel
1. פרויקט חדש מהריפו. **Root Directory**: `site-builder`. **Framework**: Other.
2. משתני סביבה (Settings → Environment Variables):

| משתנה | ערך |
|---|---|
| `ANTHROPIC_API_KEY` | המפתח מ־Anthropic |
| `SUPABASE_URL` | ה־URL של הפרויקט |
| `SUPABASE_SERVICE_ROLE_KEY` | ה־service_role key (סודי!) |
| `PADDLE_API_KEY` | מפתח השרת של Paddle |
| `PADDLE_PRICE_ID` | `pri_...` (אותו אחד כמו ב־`config.js`) |
| `PADDLE_ENV` | `sandbox` או `production` |
| `BRAND_NAME` | שם המותג (מופיע בשורת "נבנה עם" באתרי הלקוחות) |
| `PUBLIC_BASE_URL` | אופציונלי: הכתובת הקבועה, למשל `https://yourdomain.co.il` |

3. Deploy, ואז מחברים דומיין משלכם (Settings → Domains).

### 6. בדיקה לפני שמזמינים לקוחות
- נרשמים, בונים אתר בשיחה, מעלים תמונות.
- מפרסמים ומשלמים ב־sandbox, ופותחים את הכתובת `/s/...` מטלפון.
- מבטלים מנוי, ומוחקים חשבון ניסיון.

## כדאי לדעת
- **עמודים משפטיים:** הטקסטים הם בסיס סביר, לא ייעוץ משפטי. כדאי שעורך דין יעבור עליהם לפני ההשקה.
- **מגבלות:** אפשר לשנות דרך משתני הסביבה `FREE_MESSAGES` ו־`PAID_MESSAGES_PER_MONTH`. אם משנים, צריך לעדכן גם את המספרים בדף הנחיתה.
- **עדיין אין:** דומיין פרטי לכל לקוח (כרגע `yourdomain/s/name`), תיאור טקסטואלי לתמונות, ולוח בקרה למנהל.

## בדיקות
```bash
npm install
npm test
```
הבדיקות מריצות את כל השרת מול מסד נתונים בזיכרון, Claude מדומה ו־Paddle מדומה, ולכן לא עולות כסף.
