import { defaultCatalog, projectTemplate } from "./config.js";

const STORAGE_KEY = "project-calculator-config";

const state = {
  catalog: null,
  project: JSON.parse(JSON.stringify(projectTemplate)),
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const loadCatalog = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCatalog));
    return clone(defaultCatalog);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Invalid catalog in storage, resetting.", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCatalog));
    return clone(defaultCatalog);
  }
};

const saveCatalog = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.catalog));
};

const resetCatalog = () => {
  state.catalog = clone(defaultCatalog);
  saveCatalog();
  if (!state.catalog.projectTypes.find((type) => type.id === state.project.projectTypeId)) {
    state.project.projectTypeId = state.catalog.projectTypes[0]?.id ?? "";
  }
  renderAll();
};

const currency = (value) =>
  `${value.toFixed(2).replace(".", ",")} ${state.catalog.currency}`;

const formatPercent = (value) => `${Math.round(value * 100)} %`;

const getItemById = (id) => state.catalog.items.find((item) => item.id === id);

const getProjectType = () =>
  state.catalog.projectTypes.find(
    (type) => type.id === state.project.projectTypeId,
  );

const calculateLineTotal = (line) => {
  const item = getItemById(line.itemId);
  if (!item) return 0;

  const qty = Number(line.qty) || 0;

  if (item.pricing.mode === "unit") {
    return qty * item.pricing.pricePerUnit;
  }

  if (item.pricing.mode === "tiered_total") {
    const tier = item.pricing.tiers.find((t) => qty <= t.upTo);
    if (tier) {
      return tier.total;
    }
    const lastTier = item.pricing.tiers[item.pricing.tiers.length - 1];
    const overageQty = qty - lastTier.upTo;
    return lastTier.total + overageQty * item.pricing.overage.pricePerUnit;
  }

  if (item.pricing.mode === "volume_price") {
    const sorted = [...item.pricing.tiers].sort((a, b) => a.min - b.min);
    const tier = [...sorted].reverse().find((t) => qty >= t.min) || sorted[0];
    return qty * tier.pricePerUnit;
  }

  return 0;
};

const calculateSummary = () => {
  const base = state.project.lines.reduce(
    (sum, line) => sum + calculateLineTotal(line),
    0,
  );

  const baseMultiplier = getProjectType()?.baseMultiplier ?? 1;
  const modifierSubtotal = state.project.modifiers
    .map((id) => state.catalog.modifiers.find((mod) => mod.id === id))
    .filter(Boolean)
    .reduce((sum, mod) => {
      if (mod.appliesToTotal) return sum;
      return sum + base * mod.value;
    }, 0);

  const totalBeforeVat = (base + modifierSubtotal) * baseMultiplier;
  const vatModifier = state.catalog.modifiers.find((mod) => mod.id === "vat");
  const includesVat = state.project.modifiers.includes("vat");
  const vatValue = includesVat ? totalBeforeVat * (vatModifier?.value ?? 0) : 0;

  return {
    base,
    baseMultiplier,
    modifierSubtotal,
    totalBeforeVat,
    vatValue,
    total: totalBeforeVat + vatValue,
  };
};

const renderProjectType = () => {
  const select = document.querySelector("#projectType");
  select.innerHTML = state.catalog.projectTypes
    .map(
      (type) =>
        `<option value="${type.id}">${type.name} (x${type.baseMultiplier})</option>`,
    )
    .join("");

  if (!select.value || !state.catalog.projectTypes.find((type) => type.id === select.value)) {
    state.project.projectTypeId = state.catalog.projectTypes[0]?.id ?? "";
  }
  select.value = state.project.projectTypeId;

  const description = document.querySelector("#projectTypeDescription");
  const activeType = getProjectType();
  description.textContent = activeType?.description ?? "";
};

const renderModifiers = () => {
  const container = document.querySelector("#modifiers");
  container.innerHTML = state.catalog.modifiers
    .map((mod) => {
      const checked = state.project.modifiers.includes(mod.id) ? "checked" : "";
      const value = mod.appliesToTotal
        ? "(výstup)"
        : formatPercent(mod.value);
      return `
        <label class="modifier">
          <input type="checkbox" data-id="${mod.id}" ${checked} />
          <span>
            <strong>${mod.label}</strong>
            <small>${value} · ${mod.description}</small>
          </span>
        </label>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      if (event.target.checked) {
        state.project.modifiers.push(id);
      } else {
        state.project.modifiers = state.project.modifiers.filter(
          (modId) => modId !== id,
        );
      }
      renderSummary();
    });
  });
};

const renderCatalog = () => {
  const select = document.querySelector("#catalogSelect");
  select.innerHTML = state.catalog.items
    .map(
      (item) =>
        `<option value="${item.id}">${item.label} · ${item.category}</option>`,
    )
    .join("");
  select.disabled = state.catalog.items.length === 0;
  document.querySelector("#addLine").disabled = state.catalog.items.length === 0;
};

const renderLines = () => {
  const container = document.querySelector("#lines");

  if (state.project.lines.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p>Zatiaľ nemáš pridané žiadne položky.</p>
        <p>Vyber položku z katalógu a pridaj ju do projektu.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.project.lines
    .map((line, index) => {
      const item = getItemById(line.itemId);
      const unit = item?.unitLabel ?? "";
      const lineTotal = calculateLineTotal(line);

      return `
        <div class="line-item">
          <div>
            <strong>${item?.label ?? ""}</strong>
            <small>${item?.category ?? ""}</small>
          </div>
          <div class="line-controls">
            <input type="number" min="1" value="${line.qty}" data-index="${index}" />
            <span>${unit}</span>
          </div>
          <div class="line-total">${currency(lineTotal)}</div>
          <button class="ghost" data-remove="${index}">Odstrániť</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='number']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.index);
      state.project.lines[index].qty = Number(event.target.value);
      renderLines();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.target.dataset.remove);
      state.project.lines.splice(index, 1);
      renderLines();
      renderSummary();
    });
  });
};

const renderSummary = () => {
  const summary = calculateSummary();
  document.querySelector("#baseValue").textContent = currency(summary.base);
  document.querySelector("#modifierValue").textContent = currency(
    summary.modifierSubtotal,
  );
  document.querySelector("#multiplierValue").textContent = `x${summary.baseMultiplier}`;
  document.querySelector("#subtotalValue").textContent = currency(
    summary.totalBeforeVat,
  );
  document.querySelector("#vatValue").textContent = currency(summary.vatValue);
  document.querySelector("#totalValue").textContent = currency(summary.total);
};

const renderConfigProjectTypes = () => {
  const container = document.querySelector("#configProjectTypes");
  container.innerHTML = state.catalog.projectTypes
    .map((type) => {
      return `
        <div class="config-row">
          <input type="text" data-field="name" data-id="${type.id}" value="${type.name}" placeholder="Názov" />
          <input type="number" step="0.01" data-field="baseMultiplier" data-id="${type.id}" value="${type.baseMultiplier}" />
          <input type="text" data-field="description" data-id="${type.id}" value="${type.description}" placeholder="Poznámka" />
          <button class="ghost" data-remove-project-type="${type.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const type = state.catalog.projectTypes.find((item) => item.id === id);
      if (!type) return;
      type[field] = field === "baseMultiplier" ? Number(event.target.value) : event.target.value;
      saveCatalog();
      renderProjectType();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove-project-type]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeProjectType;
      state.catalog.projectTypes = state.catalog.projectTypes.filter((type) => type.id !== id);
      saveCatalog();
      renderProjectType();
      renderConfigProjectTypes();
      renderSummary();
    });
  });
};

const renderConfigModifiers = () => {
  const container = document.querySelector("#configModifiers");
  container.innerHTML = state.catalog.modifiers
    .map((mod) => {
      return `
        <div class="config-row">
          <input type="text" data-field="label" data-id="${mod.id}" value="${mod.label}" placeholder="Názov" />
          <input type="number" step="0.01" data-field="value" data-id="${mod.id}" value="${mod.value}" />
          <input type="text" data-field="description" data-id="${mod.id}" value="${mod.description}" placeholder="Poznámka" />
          <label class="toggle">
            <input type="checkbox" data-field="appliesToTotal" data-id="${mod.id}" ${mod.appliesToTotal ? "checked" : ""} />
            <span>Na výstup</span>
          </label>
          <button class="ghost" data-remove-modifier="${mod.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='text'], input[type='number']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const mod = state.catalog.modifiers.find((item) => item.id === id);
      if (!mod) return;
      mod[field] = field === "value" ? Number(event.target.value) : event.target.value;
      saveCatalog();
      renderModifiers();
      renderSummary();
    });
  });

  container.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      const mod = state.catalog.modifiers.find((item) => item.id === id);
      if (!mod) return;
      mod.appliesToTotal = event.target.checked;
      saveCatalog();
      renderModifiers();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove-modifier]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeModifier;
      state.catalog.modifiers = state.catalog.modifiers.filter((mod) => mod.id !== id);
      state.project.modifiers = state.project.modifiers.filter((modId) => modId !== id);
      saveCatalog();
      renderModifiers();
      renderConfigModifiers();
      renderSummary();
    });
  });
};

const renderConfigItems = () => {
  const container = document.querySelector("#configItems");
  container.innerHTML = state.catalog.items
    .map((item) => {
      const mode = item.pricing.mode;
      const pricingDetail =
        mode === "unit"
          ? `Za jednotku: ${item.pricing.pricePerUnit}`
          : mode === "tiered_total"
            ? `Tiered total: ${item.pricing.tiers.map((tier) => `≤${tier.upTo}=${tier.total}`).join(", ")}`
            : `Volume: ${item.pricing.tiers.map((tier) => `≥${tier.min}=${tier.pricePerUnit}`).join(", ")}`;

      return `
        <div class="config-row">
          <input type="text" data-field="label" data-id="${item.id}" value="${item.label}" placeholder="Názov" />
          <input type="text" data-field="category" data-id="${item.id}" value="${item.category}" placeholder="Kategória" />
          <input type="text" data-field="unitLabel" data-id="${item.id}" value="${item.unitLabel}" placeholder="Jednotka" />
          <span class="config-meta">${pricingDetail}</span>
          <button class="ghost" data-edit-item="${item.id}">Upraviť cenu</button>
          <button class="ghost" data-remove-item="${item.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='text']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const item = state.catalog.items.find((entry) => entry.id === id);
      if (!item) return;
      item[field] = event.target.value;
      saveCatalog();
      renderCatalog();
      renderLines();
    });
  });

  container.querySelectorAll("button[data-remove-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeItem;
      state.catalog.items = state.catalog.items.filter((item) => item.id !== id);
      state.project.lines = state.project.lines.filter((line) => line.itemId !== id);
      saveCatalog();
      renderCatalog();
      renderLines();
      renderConfigItems();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-edit-item]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.editItem;
      const item = state.catalog.items.find((entry) => entry.id === id);
      if (!item) return;
      const panel = document.querySelector("#itemEditor");
      panel.dataset.editingId = id;
      panel.querySelector("#itemName").value = item.label;
      panel.querySelector("#itemCategory").value = item.category;
      panel.querySelector("#itemUnit").value = item.unitLabel;
      panel.querySelector("#pricingMode").value = item.pricing.mode;
      panel.querySelector("#pricingValue").value =
        item.pricing.mode === "unit"
          ? item.pricing.pricePerUnit
          : "";
      panel.querySelector("#pricingTiers").value = JSON.stringify(
        item.pricing.mode === "unit" ? [] : item.pricing.tiers,
      );
      panel.querySelector("#pricingOverage").value =
        item.pricing.mode === "tiered_total"
          ? item.pricing.overage.pricePerUnit
          : "";
      panel.scrollIntoView({ behavior: "smooth" });
    });
  });
};

const addProjectType = () => {
  const name = document.querySelector("#newProjectTypeName").value.trim();
  if (!name) return;
  const id = `project-${Date.now()}`;
  state.catalog.projectTypes.push({
    id,
    name,
    description: "",
    baseMultiplier: 1,
  });
  document.querySelector("#newProjectTypeName").value = "";
  saveCatalog();
  renderProjectType();
  renderConfigProjectTypes();
};

const addModifier = () => {
  const label = document.querySelector("#newModifierLabel").value.trim();
  if (!label) return;
  const id = `modifier-${Date.now()}`;
  state.catalog.modifiers.push({
    id,
    label,
    type: "percent",
    value: 0,
    description: "",
    appliesToTotal: false,
  });
  document.querySelector("#newModifierLabel").value = "";
  saveCatalog();
  renderModifiers();
  renderConfigModifiers();
};

const addItem = () => {
  const label = document.querySelector("#newItemLabel").value.trim();
  if (!label) return;
  const id = `item-${Date.now()}`;
  state.catalog.items.push({
    id,
    label,
    category: "Custom",
    unitLabel: "ks",
    pricing: {
      mode: "unit",
      pricePerUnit: 0,
    },
  });
  document.querySelector("#newItemLabel").value = "";
  saveCatalog();
  renderCatalog();
  renderConfigItems();
};

const saveItemEditor = () => {
  const panel = document.querySelector("#itemEditor");
  const id = panel.dataset.editingId;
  const item = state.catalog.items.find((entry) => entry.id === id);
  if (!item) return;

  item.label = panel.querySelector("#itemName").value.trim() || item.label;
  item.category = panel.querySelector("#itemCategory").value.trim() || item.category;
  item.unitLabel = panel.querySelector("#itemUnit").value.trim() || item.unitLabel;
  const mode = panel.querySelector("#pricingMode").value;

  if (mode === "unit") {
    item.pricing = {
      mode,
      pricePerUnit: Number(panel.querySelector("#pricingValue").value) || 0,
    };
  } else if (mode === "tiered_total") {
    const tiers = JSON.parse(panel.querySelector("#pricingTiers").value || "[]");
    item.pricing = {
      mode,
      tiers,
      overage: {
        pricePerUnit: Number(panel.querySelector("#pricingOverage").value) || 0,
      },
    };
  } else if (mode === "volume_price") {
    const tiers = JSON.parse(panel.querySelector("#pricingTiers").value || "[]");
    item.pricing = {
      mode,
      tiers,
    };
  }

  saveCatalog();
  renderCatalog();
  renderLines();
  renderConfigItems();
  renderSummary();
};

const bindActions = () => {
  document.querySelector("#projectType").addEventListener("change", (event) => {
    state.project.projectTypeId = event.target.value;
    renderProjectType();
    renderSummary();
  });

  document.querySelector("#addLine").addEventListener("click", () => {
    const itemId = document.querySelector("#catalogSelect").value;
    if (!itemId) return;
    state.project.lines.push({ itemId, qty: 1 });
    renderLines();
    renderSummary();
  });

  document.querySelector("#projectName").addEventListener("input", (event) => {
    state.project.name = event.target.value;
  });

  document.querySelector("#addProjectType").addEventListener("click", addProjectType);
  document.querySelector("#addModifier").addEventListener("click", addModifier);
  document.querySelector("#addItem").addEventListener("click", addItem);
  document.querySelector("#saveItemEditor").addEventListener("click", saveItemEditor);
  document.querySelector("#resetCatalog").addEventListener("click", resetCatalog);
};

const renderAll = () => {
  renderProjectType();
  renderModifiers();
  renderCatalog();
  renderLines();
  renderSummary();
  renderConfigProjectTypes();
  renderConfigModifiers();
  renderConfigItems();
};

const bootstrap = () => {
  state.catalog = loadCatalog();
  renderAll();
  bindActions();
};

bootstrap();
