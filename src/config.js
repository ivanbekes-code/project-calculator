export const defaultCatalog = {
  currency: "€",
  projectTypes: [
    {
      id: "web-site",
      name: "Web / UX projekt",
      description: "Štandardný web, UX, marketingové weby.",
      baseMultiplier: 1,
    },
    {
      id: "ecommerce",
      name: "E-shop",
      description: "Komplexnejšie projekty s katalógom a checkoutom.",
      baseMultiplier: 1.15,
    },
    {
      id: "branding",
      name: "Branding & Logo",
      description: "Zamerané na identitu, logá a vizuálne prvky.",
      baseMultiplier: 1,
    },
    {
      id: "print",
      name: "Print & Offline",
      description: "Vizitky, bannery, letáky a iná tlač.",
      baseMultiplier: 0.9,
    },
  ],
  modifiers: [
    {
      id: "mobile",
      label: "Mobilná verzia",
      type: "percent",
      value: 0.2,
      description: "+20 % k základu",
      appliesToTotal: false,
    },
    {
      id: "wireframe",
      label: "Wireframe / UX návrh",
      type: "percent",
      value: 0.12,
      description: "+12 % k základu",
      appliesToTotal: false,
    },
    {
      id: "rush",
      label: "Expresné dodanie",
      type: "percent",
      value: 0.25,
      description: "+25 % k základu",
      appliesToTotal: false,
    },
    {
      id: "vat",
      label: "DPH",
      type: "percent",
      value: 0.2,
      description: "20 % (na výstup)",
      appliesToTotal: true,
    },
  ],
  items: [
    {
      id: "page",
      label: "Podstránka",
      category: "Web",
      unitLabel: "stránka",
      pricing: {
        mode: "unit",
        pricePerUnit: 100,
      },
    },
    {
      id: "ux-audit",
      label: "UX audit (hodiny)",
      category: "UX",
      unitLabel: "hod",
      pricing: {
        mode: "unit",
        pricePerUnit: 45,
      },
    },
    {
      id: "logo",
      label: "Logo varianty",
      category: "Branding",
      unitLabel: "variant",
      pricing: {
        mode: "tiered_total",
        tiers: [
          { upTo: 1, total: 120 },
          { upTo: 2, total: 200 },
          { upTo: 3, total: 260 },
        ],
        overage: { pricePerUnit: 70 },
      },
    },
    {
      id: "banner",
      label: "Banner / vizuál",
      category: "Print",
      unitLabel: "ks",
      pricing: {
        mode: "volume_price",
        tiers: [
          { min: 1, pricePerUnit: 60 },
          { min: 5, pricePerUnit: 52 },
          { min: 10, pricePerUnit: 45 },
        ],
      },
    },
    {
      id: "consulting",
      label: "Strategické konzultácie",
      category: "Service",
      unitLabel: "hod",
      pricing: {
        mode: "unit",
        pricePerUnit: 65,
      },
    },
  ],
};

export const projectTemplate = {
  name: "Nový projekt",
  projectTypeId: "web-site",
  modifiers: [],
  lines: [],
};
