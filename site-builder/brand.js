// Fills brand and business details from config.js into static pages.
// Elements marked data-optional are removed when their value is empty.
import { BRAND, PRICE_LABEL } from './config.js';

const values = {
  brand: BRAND.name,
  price: PRICE_LABEL,
  'legal-name': BRAND.legalName || BRAND.name,
  'business-id': BRAND.businessId,
  'support-email': BRAND.supportEmail,
  'support-wa': BRAND.supportWhatsApp,
};

for (const [key, value] of Object.entries(values)) {
  document.querySelectorAll(`[data-${key}]`).forEach((el) => {
    if (!value) {
      const holder = el.closest('[data-optional]');
      if (holder) holder.remove();
      return;
    }
    if (key === 'support-email' && el.tagName === 'A') { el.href = `mailto:${value}`; el.textContent = value; }
    else if (key === 'support-wa' && el.tagName === 'A') el.href = `https://wa.me/${value}`;
    else el.textContent = value;
  });
}
if (document.title.includes('{brand}')) document.title = document.title.replace('{brand}', BRAND.name);
