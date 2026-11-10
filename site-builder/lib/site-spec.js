// The site content the model fills in through the update_site tool.
// The page design is fixed (render.js); the model only controls content,
// the color theme, and which optional sections appear (empty = hidden).

export const THEMES = ['copper', 'emerald', 'rose', 'blue', 'gold', 'mono'];

const str = (description) => ({ type: 'string', description });

export const SITE_SPEC_SCHEMA = {
  type: 'object',
  properties: {
    business_name: str('Name of the business as it should appear on the site.'),
    business_type: str('Short label for the kind of business, e.g. "מספרה", "קוסמטיקאית", "מאמן כושר".'),
    tagline: str('One short line that captures the business. Shown big in the hero.'),
    intro: str('One or two sentences under the tagline: what they do and for whom.'),
    cta_label: str('Main button text, e.g. "קביעת תור", "הזמנת עוגה", "שיחת היכרות".'),
    theme: { type: 'string', enum: THEMES, description: 'Color theme that fits the business.' },
    marquee: { type: 'array', items: { type: 'string' }, description: '3-6 short words or phrases for the moving strip (services, values).' },
    services: {
      type: 'array',
      description: 'Main services, up to 10.',
      items: {
        type: 'object',
        properties: {
          title: str('Service name.'),
          description: str('One short line. Empty string if none.'),
          price: str('Price exactly as the owner gave it, e.g. "120 ₪". Empty string if the owner did not give one.'),
        },
        required: ['title', 'description', 'price'],
        additionalProperties: false,
      },
    },
    about_title: str('Heading for the about section. Empty string hides the section.'),
    about_text: str('About the business/owner, 2-5 sentences, only from facts the owner gave. Empty string hides the section.'),
    faq: {
      type: 'array',
      description: 'Up to 6 questions customers often ask, only with answers the owner gave. Empty array hides the section.',
      items: {
        type: 'object',
        properties: { question: str('Question.'), answer: str('Answer.') },
        required: ['question', 'answer'],
        additionalProperties: false,
      },
    },
    city: str('City or area. Empty string if unknown.'),
    address: str('Street address. Empty string if unknown.'),
    hours: str('Opening hours as free text. Empty string if unknown.'),
    phone: str('Phone / WhatsApp number as given. Empty string if unknown.'),
    instagram: str('Instagram username without @. Empty string if none.'),
    since_year: str('Year the business started, digits only. Empty string if unknown.'),
  },
  required: [
    'business_name', 'business_type', 'tagline', 'intro', 'cta_label', 'theme', 'marquee', 'services',
    'about_title', 'about_text', 'faq', 'city', 'address', 'hours', 'phone', 'instagram', 'since_year',
  ],
  additionalProperties: false,
};

const LIMITS = {
  business_name: 60, business_type: 40, tagline: 120, intro: 300, cta_label: 30,
  about_title: 80, about_text: 1200, city: 40, address: 120, hours: 200, phone: 30, instagram: 40, since_year: 4,
};

function clip(v, n) {
  return typeof v === 'string' ? v.trim().slice(0, n) : '';
}

// Normalizes model output into a safe, bounded spec. Never throws.
export function normalizeSpec(input) {
  const warnings = [];
  const src = input && typeof input === 'object' ? input : {};
  const spec = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    spec[key] = clip(src[key], max);
    if (typeof src[key] === 'string' && src[key].trim().length > max) warnings.push(`${key} was shortened to ${max} characters`);
  }
  spec.theme = THEMES.includes(src.theme) ? src.theme : 'copper';
  spec.since_year = /^\d{4}$/.test(spec.since_year) ? spec.since_year : '';
  spec.instagram = spec.instagram.replace(/^@/, '').replace(/[^\w.]/g, '');

  spec.marquee = (Array.isArray(src.marquee) ? src.marquee : []).map((w) => clip(w, 30)).filter(Boolean).slice(0, 8);

  const services = Array.isArray(src.services) ? src.services : [];
  if (services.length > 10) warnings.push('only the first 10 services are shown');
  spec.services = services.slice(0, 10)
    .map((s) => ({ title: clip(s?.title, 60), description: clip(s?.description, 160), price: clip(s?.price, 30) }))
    .filter((s) => s.title);

  const faq = Array.isArray(src.faq) ? src.faq : [];
  if (faq.length > 6) warnings.push('only the first 6 FAQ items are shown');
  spec.faq = faq.slice(0, 6)
    .map((f) => ({ question: clip(f?.question, 160), answer: clip(f?.answer, 600) }))
    .filter((f) => f.question && f.answer);

  if (!spec.business_name) warnings.push('business_name is empty');
  if (!spec.phone) warnings.push('no phone yet, so the contact buttons have no number');
  return { spec, warnings };
}
