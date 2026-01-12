export const defaultConfig = {
  currency: "€",
  projectTypes: [
    { id: "company-web", name: "Firemný web", ratePerUnit: 55 },
    { id: "catalogue", name: "E-shop (katalóg)", ratePerUnit: 65 },
    { id: "checkout", name: "E-shop (košík)", ratePerUnit: 75 },
    { id: "portal", name: "Portál / služba", ratePerUnit: 85 },
  ],
  archetypes: [
    {
      id: "homepage-unique",
      name: "Homepage (unikátna)",
      coefficient: 1.5,
      note: "Hrdina, kompozícia",
    },
    {
      id: "page-standard",
      name: "Unikátna stránka (štandard)",
      coefficient: 1,
      note: "O nás, služby",
    },
    {
      id: "detail-content",
      name: "Detail (obsahový)",
      coefficient: 0.85,
      note: "Detail článku, realizácie",
    },
    {
      id: "listing",
      name: "Výpis / grid",
      coefficient: 0.6,
      note: "Zoznamy, kategórie",
    },
    {
      id: "product-detail",
      name: "Produkt detail (komplexný)",
      coefficient: 1,
      note: "Galéria, CTA, parametre",
    },
    {
      id: "contact-form",
      name: "Formulár / kontakt",
      coefficient: 0.75,
      note: "Kontakt s polami",
    },
    {
      id: "policy",
      name: "Text-only (policy/GDPR)",
      coefficient: 0.2,
      note: "Právne info",
    },
    {
      id: "landing",
      name: "Landing (dlhá)",
      coefficient: 1.5,
      note: "Sekcie + variácie",
    },
  ],
  multipliers: [
    { id: "mobile", name: "Mobilná verzia", value: 0.2 },
    { id: "wireframe", name: "Wireframe", value: 0.1 },
    { id: "vat", name: "DPH", value: 0.2, appliesToTotal: true },
  ],
};

export const projectTemplate = {
  name: "Nový projekt",
  projectTypeId: "company-web",
  multipliers: [],
  pages: [],
  adjustments: 0,
};
