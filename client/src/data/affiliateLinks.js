/**
 * Affiliate recommendations — contextual, non-intrusive product links shown on
 * zero-cost screens (e.g. History). Pure margin: no API cost, no feature gating.
 *
 * ⚠️ Replace the placeholder URLs/tags below with YOUR real affiliate links.
 *   - Books:   Amazon Associates tag, or Daraz Affiliate (ships in PK/BD/LK).
 *   - Courses: Udemy (via Rakuten/Impact), Coursera affiliate, etc.
 *   - Study abroad / visa: partner agency referral links.
 * Disclosure is shown automatically (required by Amazon/most programs and by law
 * in many regions).
 */

export const AFFILIATE_DISCLOSURE =
  "Some links are affiliate links — we may earn a small commission at no extra cost to you.";

// Set to false to hide the strip everywhere without removing the code.
export const AFFILIATE_ENABLED = true;

export const AFFILIATE_LINKS = [
  {
    id: "book-cambridge",
    category: "Practice book",
    title: "Cambridge IELTS Practice Tests",
    blurb: "Official-style full practice tests with answer keys.",
    // TODO: replace with your Amazon Associates or Daraz affiliate URL.
    url: "https://www.amazon.com/s?k=cambridge+ielts+practice+tests&tag=YOUR_AMAZON_TAG",
    emoji: "📘",
  },
  {
    id: "course-speaking",
    category: "Online course",
    title: "IELTS Speaking Masterclass",
    blurb: "Structured video lessons to push your band up.",
    // TODO: replace with your Udemy (Rakuten/Impact) or Coursera affiliate URL.
    url: "https://www.udemy.com/courses/search/?q=ielts+speaking&tag=YOUR_AFFILIATE_TAG",
    emoji: "🎓",
  },
  {
    id: "vocab-book",
    category: "Vocabulary",
    title: "IELTS Vocabulary & Collocations",
    blurb: "Build the Band 7+ word range examiners reward.",
    url: "https://www.amazon.com/s?k=ielts+vocabulary&tag=YOUR_AMAZON_TAG",
    emoji: "🗂️",
  },
  {
    id: "study-abroad",
    category: "Study abroad",
    title: "Free study-abroad consultation",
    blurb: "Turn your IELTS score into a university placement.",
    // TODO: replace with your partner agency referral link.
    url: "https://example.com/study-abroad-partner?ref=bandlogic",
    emoji: "✈️",
  },
];
