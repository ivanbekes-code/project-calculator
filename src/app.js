import { catalog, projectTemplate } from "./config.js";

const state = {
  project: JSON.parse(JSON.stringify(projectTemplate)),
};

const currency = (value) =>
  `${value.toFixed(2).replace(".", ",")} ${catalog.currency}`;

const formatPercent = (value) => `${Math.round(value * 100)} %`;

const getItemById = (id) => catalog.items.find((item) => item.id === id);

const getProjectType = () =>
  catalog.projectTypes.find(
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
    .map((id) => catalog.modifiers.find((mod) => mod.id === id))
    .filter(Boolean)
    .reduce((sum, mod) => {
      if (mod.appliesToTotal) return sum;
      return sum + base * mod.value;
    }, 0);

  const totalBeforeVat = (base + modifierSubtotal) * baseMultiplier;
  const vatModifier = catalog.modifiers.find((mod) => mod.id === "vat");
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
  select.innerHTML = catalog.projectTypes
    .map(
      (type) =>
        `<option value="${type.id}">${type.name} (x${type.baseMultiplier})</option>`,
    )
    .join("");
  select.value = state.project.projectTypeId;

  const description = document.querySelector("#projectTypeDescription");
  const activeType = getProjectType();
  description.textContent = activeType?.description ?? "";
};

const renderModifiers = () => {
  const container = document.querySelector("#modifiers");
  container.innerHTML = catalog.modifiers
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
  select.innerHTML = catalog.items
    .map(
      (item) =>
        `<option value="${item.id}">${item.label} · ${item.category}</option>`,
    )
    .join("");
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

const bindActions = () => {
  document.querySelector("#projectType").addEventListener("change", (event) => {
    state.project.projectTypeId = event.target.value;
    renderProjectType();
    renderSummary();
  });

  document.querySelector("#addLine").addEventListener("click", () => {
    const itemId = document.querySelector("#catalogSelect").value;
    state.project.lines.push({ itemId, qty: 1 });
    renderLines();
    renderSummary();
  });

  document.querySelector("#projectName").addEventListener("input", (event) => {
    state.project.name = event.target.value;
  });
};

const bootstrap = () => {
  renderProjectType();
  renderModifiers();
  renderCatalog();
  renderLines();
  renderSummary();
  bindActions();
};

bootstrap();
