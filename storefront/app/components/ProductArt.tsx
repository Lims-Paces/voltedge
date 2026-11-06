// Original line illustrations for each product type (no brand imagery).
// Replace with real photos any time by setting image_url in the products table.

const ink = "var(--ink)";
const brand = "var(--brand)";
const tint = "var(--brand-tint)";

const art: Record<string, React.ReactNode> = {
  Laptops: (
    <>
      <rect x="52" y="34" width="116" height="74" rx="6" fill={tint} stroke={ink} strokeWidth="3" />
      <rect x="62" y="44" width="96" height="54" rx="2" fill={brand} opacity="0.85" />
      <path d="M36 112h148l-10 12H46z" fill="#fff" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M98 116h24" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  Phones: (
    <>
      <rect x="82" y="18" width="56" height="112" rx="12" fill="#fff" stroke={ink} strokeWidth="3" />
      <rect x="89" y="28" width="42" height="88" rx="4" fill={brand} opacity="0.85" />
      <circle cx="96" cy="36" r="3" fill="#fff" />
      <path d="M140 52v18" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  Tablets: (
    <>
      <rect x="54" y="20" width="112" height="108" rx="10" fill="#fff" stroke={ink} strokeWidth="3" />
      <rect x="63" y="30" width="94" height="88" rx="3" fill={brand} opacity="0.85" />
      <path d="M74 106l18-22 12 14 10-10 22 18" stroke="#fff" strokeWidth="3" fill="none" strokeLinejoin="round" />
    </>
  ),
  Gaming: (
    <>
      <path d="M58 60c4-14 22-16 30-10h44c8-6 26-4 30 10l10 40c3 12-12 20-22 10l-12-12H82l-12 12c-10 10-25 2-22-10z"
        fill="#fff" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M76 70v16M68 78h16" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="140" cy="72" r="5" fill={brand} />
      <circle cx="152" cy="84" r="5" fill={brand} />
    </>
  ),
  Audio: (
    <>
      <path d="M62 92V74a48 48 0 0 1 96 0v18" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
      <rect x="50" y="84" width="26" height="40" rx="10" fill={brand} stroke={ink} strokeWidth="3" />
      <rect x="144" y="84" width="26" height="40" rx="10" fill={brand} stroke={ink} strokeWidth="3" />
    </>
  ),
  TVs: (
    <>
      <rect x="30" y="24" width="160" height="92" rx="5" fill="#fff" stroke={ink} strokeWidth="3" />
      <rect x="38" y="32" width="144" height="76" rx="2" fill={brand} opacity="0.85" />
      <path d="M90 116l-8 14M130 116l8 14M76 130h68" stroke={ink} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  Accessories: null, // chosen per product below
};

const mouse = (
  <>
    <path d="M110 22c-24 0-36 18-36 44v22c0 24 16 40 36 40s36-16 36-40V66c0-26-12-44-36-44z"
      fill="#fff" stroke={ink} strokeWidth="3" />
    <path d="M110 22v38M74 62h72" stroke={ink} strokeWidth="3" />
    <rect x="106" y="36" width="8" height="14" rx="4" fill={brand} />
  </>
);

const powerBank = (
  <>
    <rect x="66" y="26" width="88" height="100" rx="14" fill="#fff" stroke={ink} strokeWidth="3" />
    <path d="M114 46l-18 32h16l-6 28 20-36h-16z" fill="var(--signal)" stroke={ink} strokeWidth="3" strokeLinejoin="round" />
    <path d="M100 26v-6h20v6" stroke={ink} strokeWidth="3" fill="none" />
  </>
);

export default function ProductArt({ id, category }: { id: string; category: string | null }) {
  const body = id.includes("mouse") ? mouse : id.includes("power") ? powerBank : art[category ?? ""] ?? mouse;
  return (
    <svg viewBox="0 0 220 150" role="img" aria-hidden="true" className="art">
      {body}
    </svg>
  );
}
