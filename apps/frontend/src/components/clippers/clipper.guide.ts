// The public Notion pages for clippers. The onboarding links each step to the
// page it comes from.
// create a login, connect TikTok, post
export const CLIPPER_GUIDE_URL =
  'https://maxmannstein.notion.site/4248f86dc2d38110a9fcf9dcd8967af7';
// create and warm up the accounts
export const CLIPPER_WARMUP_URL =
  'https://maxmannstein.notion.site/TikTok-Clipping-Accounts-erstellen-und-aufw-rmen-41e8f86dc2d381f8b0c5fcb83ec60928';
// the agreement: pay, missed days, liability
export const CLIPPER_TERMS_URL =
  'https://maxmannstein.notion.site/TikTok-Clipping-VibeLabs-UG-haftungsbeschr-nkt-41b8f86dc2d381058d2ce0d9e2d3724e';

// Max on WhatsApp, as in the guides
export const CLIPPER_SUPPORT_PHONE = '+49 151 50907606';

/** a WhatsApp chat with the number, optionally with a prefilled text */
export const whatsappUrl = (phone: string, text?: string) => {
  const digits = phone.replace(/\D/g, '').replace(/^00/, '');
  // a German mobile number without the country code
  const number = digits.startsWith('0') ? `49${digits.slice(1)}` : digits;
  return `https://wa.me/${number}${
    text ? `?text=${encodeURIComponent(text)}` : ''
  }`;
};

export const CLIPPER_SUPPORT_URL = whatsappUrl(CLIPPER_SUPPORT_PHONE);
