# משימה שבועית: עוגות חדשות מאינסטגרם לגלריה

איך יוצרים את המשימה (פעם אחת):
1. נכנסים ל־claude.ai/code ← Routines (משימות מתוזמנות) ← יצירת משימה חדשה.
2. מאגר: `neho12/postiq`. מחברים: Composio (שבו מחובר האינסטגרם yali.zini).
3. תזמון: פעם בשבוע, ביום ראשון ב־20:47 (שעון ישראל). כל הפעלה בשיחה חדשה. התראות: פוש.
4. מדביקים כהוראה את הטקסט שבחלק "ההוראה" למטה.

לפני ההפעלה הראשונה צריך שה־pull request https://github.com/neho12/postiq/pull/2 ימוזג ל־`main`.

## ההוראה

Weekly job for the YALI CAKES website (repo neho12/postiq, folder yali-cakes/). Talk to the user in Hebrew, addressing her in the feminine. The owner wants every new cake she posts on Instagram (@yali.zini) added to the site's gallery page, but ONLY after she approves each photo in this conversation.

0. Preconditions. Work from the latest `main`. If `main` has no `yali-cakes/data/gallery.json`, stop and tell her in one line that the pull request https://github.com/neho12/postiq/pull/2 needs to be merged first; do nothing else. If the Composio connector (Instagram) is not available in this session, stop and tell her that in one line.

1. Read state. `yali-cakes/data/instagram-state.json` holds {"processed": [media ids], "since": "<ISO timestamp>"}. If it does not exist, create it with "since" set to the time this job first runs (do NOT import the whole history) and an empty list, and treat this run as having nothing new.

2. Fetch new posts. Use the Composio Instagram connection for the account whose username is yali.zini (pick that account explicitly by checking user_info.username == yali.zini; other Instagram accounts are connected too, and if the yali.zini connection returns an OAuth error 190 tell her in one line that the Instagram connection has to be re-authorised in Composio, then stop). List media newer than "since" and not in "processed" (INSTAGRAM_GET_IG_USER_MEDIA with ig_user_id "me", fields id,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,caption,children{media_url,media_type}). For carousels look at every image child; for reels/videos use the thumbnail or extract a frame.

3. Pick cakes. Look at each image. Keep only clear photos of a finished cake made by her (designed/layer cake, number cake, mousse cake, bento cake, garden/sheet cake); the gallery page shows cakes only. Skip dessert tables, any photo where a person's face is visible (especially children), workshop shots, text graphics, screenshots, blurry or partial cakes, and cakes that are already on the site (compare with the alt texts and look at the existing tiles). If nothing qualifies, record the seen ids in "processed", update "since", commit that state file to main, and end with a one-line note (no images).

4. Prepare each candidate exactly like the existing gallery photos: remove the background (pip install rembg onnxruntime; use the "isnet-general-use" model), drop alpha below 24, crop to the subject, and place it centred on a 1200x1200 pure white canvas scaled to fit about 840 px wide / 880 px tall with its bottom near y=1030, plus a soft brownish elliptical shadow under the base (blurred ellipse, colour rgb(90,70,60), opacity ~110/255, blur ~26 px). Save as WebP quality 88; file name = md5 of the file + ".webp" in yali-cakes/assets/. Look at every result: if the cake is cut off, a hand or table edge remains, or the cut-out is ragged, do NOT offer it; mention it was skipped and why. Write a short Hebrew alt text describing the cake (colours, decorations, number) without names of people or children, and choose a category id from data/gallery.json ("torte", "number", "mousse", "bento", "garden").

5. Ask for approval. Send her the prepared images (one SendUserFile call, all candidates) with, for each: the Instagram link, the proposed category and alt text. Ask which to add (all / some / none) and whether to change any category or text. Wait for her reply. Do not change the site before she answers.

6. On approval: prepend the approved items to "items" in yali-cakes/data/gallery.json (and, so the home page carousel "קצת מהעבודות שלנו" shows them too, add a matching <figure class="gal-slide"><img loading="lazy" src="./assets/FILE" alt="ALT" width="1200" height="1200" decoding="async"></figure> (keep `loading="lazy"` BEFORE `src`: the page renderer otherwise starts every download at load) as the first slide inside id="gal" in yali-cakes/index.html) as {"file","alt","cat","w":1200,"h":1200}, add the image files, add every looked-at media id (approved or not) to "processed" and update "since". Validate the JSON, serve yali-cakes/ locally and open /gallery/ in Playwright (Chromium is pre-installed; require('playwright')) to confirm the new tiles render with no console errors. Commit with a clear message and push to `main` (Vercel publishes `main` automatically). Tell her in Hebrew what was added, with https://yalicakes.co.il/gallery/.

Rules: never touch anything outside yali-cakes/ (the repo also holds another app). Never change visible site text. Never add prices. Never post, comment or change anything on Instagram; read only.
