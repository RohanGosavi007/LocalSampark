/**
 * Restricted goods (A3): products the console flags for review, and search
 * (C5) does not offer, by keyword in the name or description.
 */
const RESTRICTED_KEYWORDS = [
  'tobacco', 'cigarette', 'bidi', 'gutkha', 'nicotine',
  'alcohol', 'liquor', 'beer', 'whiskey', 'rum', 'vodka', 'wine',
  'weapon', 'gun', 'pistol', 'knife', 'explosive',
  'narcotic', 'steroid', 'weed', 'cannabis', 'marijuana'
];

function isRestrictedProduct(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase();
  for (const kw of RESTRICTED_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    if (regex.test(text)) {
      return { restricted: true, keyword: kw };
    }
  }
  return { restricted: false };
}

module.exports = { RESTRICTED_KEYWORDS, isRestrictedProduct };
