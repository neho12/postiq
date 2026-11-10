# בונה האתרים

בעל העסק מספר על העסק בשיחה חופשית, והאתר נבנה לצד הצ'אט. בניית הגרסה הראשונה חינמית. שינויים והוספת תוכן אחר כך דורשים מנוי חודשי (Paddle).

## איך זה עובד
- `index.html` + `app.js`: הצ'אט והתצוגה המקדימה. השיחה, האתר והתמונות נשמרים בדפדפן של בעל העסק.
- `api/chat.js`: שולח את השיחה ל־Claude (`claude-opus-5-5`, effort `medium`, עם server-side fallback אם המודל מסרב). Claude לא כותב HTML: הוא ממלא את תוכן האתר דרך הכלי `update_site`, והתבנית ב־`render.js` מציגה אותו.
- `api/verify-subscription.js` + `lib/paddle.js`: בודקים בשרת מול Paddle שהמנוי פעיל, ושהוא למוצר הזה ולא ל־PostIQ.

## הקמה ב־Vercel
1. פרויקט חדש מהריפו, **Root Directory**: `site-builder`, **Framework**: Other.
2. משתני סביבה (Settings → Environment Variables):
   - `ANTHROPIC_API_KEY`
   - `PADDLE_API_KEY`: מפתח שרת של Paddle (לא ה־client token)
   - `PADDLE_PRICE_ID`: מזהה המחיר של המנוי לבונה האתרים (`pri_...`)
   - `PADDLE_ENV`: `sandbox` לבדיקות, או `production`
3. ב־`config.js`: ה־client token וה־price id של Paddle (אלה ציבוריים).
4. ב־Paddle: מוצר ומחיר חודשי **נפרדים** מ־PostIQ.

לבדיקות בלי Paddle אפשר להגדיר `ALLOW_FREE_EDITS=1`. לא להשאיר את זה בייצור.

## בדיקות
```bash
npm install
npm test
```
הבדיקות מריצות את השרת עם לקוח Claude מזויף, ולכן לא עולות כסף.

## מה עוד חסר לפני השקה
- **פרסום האתר בכתובת משלו:** כרגע אפשר רק לראות אותו ולהוריד קובץ.
- **חשבונות משתמש ומסד נתונים:** בלי זה השיחה נשמרת רק בדפדפן, ואין הגבלת קצב. מי שמנקה את הדפדפן יכול לפתוח שיחה חינמית חדשה, וכל שיחה כזו עולה כסף ב־API.
- **הגבלת שימוש לכל מנוי:** כרגע מנוי פעיל מאפשר עריכות ללא הגבלה.
