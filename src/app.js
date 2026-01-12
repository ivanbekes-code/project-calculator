import { defaultConfig, projectTemplate } from "./config.js";

const STORAGE_KEY = "project-calculator-config";

const state = {
  config: null,
  project: JSON.parse(JSON.stringify(projectTemplate)),
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const loadConfig = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
    return clone(defaultConfig);
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Invalid config in storage, resetting.", error);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig));
    return clone(defaultConfig);
  }
};

const saveConfig = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.config));
};

const resetConfig = () => {
  state.config = clone(defaultConfig);
  saveConfig();
  if (!state.config.projectTypes.find((type) => type.id === state.project.projectTypeId)) {
    state.project.projectTypeId = state.config.projectTypes[0]?.id ?? "";
  }
  renderAll();
};

const currency = (value) =>
  `${value.toFixed(2).replace(".", ",")} ${state.config.currency}`;

const formatPercent = (value) => `${Math.round(value * 100)} %`;

const getProjectType = () =>
  state.config.projectTypes.find(
    (type) => type.id === state.project.projectTypeId,
  );

const getArchetype = (id) =>
  state.config.archetypes.find((archetype) => archetype.id === id);

const calculateUnits = () =>
  state.project.pages.reduce((sum, page) => {
    const archetype = getArchetype(page.archetypeId);
    const coeff =
      Number(page.coefficientOverride) || archetype?.coefficient || 0;
    return sum + coeff * (Number(page.qty) || 0);
  }, 0);

const calculateSummary = () => {
  const units = calculateUnits();
  const projectType = getProjectType();
  const baseRate = projectType?.ratePerUnit ?? 0;
  const base = units * baseRate;

  const multiplierSubtotal = state.project.multipliers
    .map((id) => state.config.multipliers.find((item) => item.id === id))
    .filter(Boolean)
    .reduce((sum, multiplier) => {
      if (multiplier.appliesToTotal) return sum;
      return sum + base * multiplier.value;
    }, 0);

  const subtotal = base + multiplierSubtotal + Number(state.project.adjustments || 0);
  const vatMultiplier = state.config.multipliers.find((item) => item.id === "vat");
  const includesVat = state.project.multipliers.includes("vat");
  const vatValue = includesVat ? subtotal * (vatMultiplier?.value ?? 0) : 0;

  return {
    units,
    baseRate,
    base,
    multiplierSubtotal,
    adjustments: Number(state.project.adjustments || 0),
    subtotal,
    vatValue,
    total: subtotal + vatValue,
  };
};

const renderProjectTypes = () => {
  const select = document.querySelector("#projectType");
  select.innerHTML = state.config.projectTypes
    .map((type) => `<option value="${type.id}">${type.name}</option>`)
    .join("");

  if (!select.value || !state.config.projectTypes.find((type) => type.id === select.value)) {
    state.project.projectTypeId = state.config.projectTypes[0]?.id ?? "";
  }
  select.value = state.project.projectTypeId;

  const rate = document.querySelector("#projectRate");
  const activeType = getProjectType();
  rate.textContent = activeType
    ? `${currency(activeType.ratePerUnit)} / jednotka`
    : "";
};

const renderMultipliers = () => {
  const container = document.querySelector("#multipliers");
  container.innerHTML = state.config.multipliers
    .map((multiplier) => {
      const checked = state.project.multipliers.includes(multiplier.id)
        ? "checked"
        : "";
      const label = multiplier.appliesToTotal ? "(na výstup)" : formatPercent(multiplier.value);
      return `
        <label class="modifier">
          <input type="checkbox" data-id="${multiplier.id}" ${checked} />
          <span>
            <strong>${multiplier.name}</strong>
            <small>${label}</small>
          </span>
        </label>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      if (event.target.checked) {
        state.project.multipliers.push(id);
      } else {
        state.project.multipliers = state.project.multipliers.filter(
          (itemId) => itemId !== id,
        );
      }
      renderSummary();
    });
  });
};

const renderPages = () => {
  const container = document.querySelector("#pages");
  if (state.project.pages.length === 0) {
    container.innerHTML = `
      <div class="empty">
        <p>Zatiaľ nemáš pridané žiadne podstránky.</p>
        <p>Pridaj prvú stránku a vyber archetyp.</p>
      </div>
    `;
    return;
  }

  const archetypeOptions = state.config.archetypes
    .map((archetype) => `<option value="${archetype.id}">${archetype.name}</option>`)
    .join("");

  container.innerHTML = state.project.pages
    .map((page, index) => {
      const archetype = getArchetype(page.archetypeId);
      const coeff =
        Number(page.coefficientOverride) || archetype?.coefficient || 0;
      return `
        <div class="line-item">
          <div>
            <input class="inline" type="text" value="${page.name}" data-page-name="${index}" placeholder="Názov" />
            <small>${archetype?.note ?? ""}</small>
          </div>
          <div class="line-controls">
            <select data-page-archetype="${index}">${archetypeOptions}</select>
          </div>
          <div class="line-controls">
            <input type="number" min="1" value="${page.qty}" data-page-qty="${index}" />
            <span>ks</span>
          </div>
          <div class="line-controls">
            <input type="number" step="0.01" value="${page.coefficientOverride ?? ""}" data-page-coeff="${index}" placeholder="auto" />
            <span>x${coeff.toFixed(2)}</span>
          </div>
          <button class="ghost" data-remove-page="${index}">Odstrániť</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("select[data-page-archetype]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const index = Number(event.target.dataset.pageArchetype);
      state.project.pages[index].archetypeId = event.target.value;
      renderPages();
      renderSummary();
    });
    select.value = state.project.pages[Number(select.dataset.pageArchetype)].archetypeId;
  });

  container.querySelectorAll("input[data-page-name]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.pageName);
      state.project.pages[index].name = event.target.value;
    });
  });

  container.querySelectorAll("input[data-page-qty]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.pageQty);
      state.project.pages[index].qty = Number(event.target.value);
      renderSummary();
    });
  });

  container.querySelectorAll("input[data-page-coeff]").forEach((input) => {
    input.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.pageCoeff);
      const value = event.target.value;
      state.project.pages[index].coefficientOverride = value === "" ? null : Number(value);
      renderSummary();
      renderPages();
    });
  });

  container.querySelectorAll("button[data-remove-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const index = Number(event.target.dataset.removePage);
      state.project.pages.splice(index, 1);
      renderPages();
      renderSummary();
    });
  });
};

const renderSummary = () => {
  const summary = calculateSummary();
  document.querySelector("#unitsValue").textContent = summary.units.toFixed(2);
  document.querySelector("#rateValue").textContent = currency(summary.baseRate);
  document.querySelector("#baseValue").textContent = currency(summary.base);
  document.querySelector("#multiplierValue").textContent = currency(
    summary.multiplierSubtotal,
  );
  document.querySelector("#adjustmentValue").textContent = currency(
    summary.adjustments,
  );
  document.querySelector("#subtotalValue").textContent = currency(summary.subtotal);
  document.querySelector("#vatValue").textContent = currency(summary.vatValue);
  document.querySelector("#totalValue").textContent = currency(summary.total);
};

const renderConfigProjectTypes = () => {
  const container = document.querySelector("#configProjectTypes");
  container.innerHTML = state.config.projectTypes
    .map((type) => {
      return `
        <div class="config-row">
          <input type="text" data-field="name" data-id="${type.id}" value="${type.name}" placeholder="Názov" />
          <input type="number" step="0.01" data-field="ratePerUnit" data-id="${type.id}" value="${type.ratePerUnit}" />
          <button class="ghost" data-remove-project-type="${type.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const type = state.config.projectTypes.find((item) => item.id === id);
      if (!type) return;
      type[field] = Number(event.target.value) || event.target.value;
      saveConfig();
      renderProjectTypes();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove-project-type]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeProjectType;
      state.config.projectTypes = state.config.projectTypes.filter(
        (type) => type.id !== id,
      );
      saveConfig();
      renderProjectTypes();
      renderConfigProjectTypes();
      renderSummary();
    });
  });
};

const renderConfigArchetypes = () => {
  const container = document.querySelector("#configArchetypes");
  container.innerHTML = state.config.archetypes
    .map((archetype) => {
      return `
        <div class="config-row">
          <input type="text" data-field="name" data-id="${archetype.id}" value="${archetype.name}" placeholder="Názov" />
          <input type="number" step="0.01" data-field="coefficient" data-id="${archetype.id}" value="${archetype.coefficient}" />
          <input type="text" data-field="note" data-id="${archetype.id}" value="${archetype.note}" placeholder="Poznámka" />
          <button class="ghost" data-remove-archetype="${archetype.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const archetype = state.config.archetypes.find((item) => item.id === id);
      if (!archetype) return;
      archetype[field] = field === "coefficient" ? Number(event.target.value) : event.target.value;
      saveConfig();
      renderPages();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove-archetype]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeArchetype;
      state.config.archetypes = state.config.archetypes.filter(
        (item) => item.id !== id,
      );
      saveConfig();
      state.project.pages = state.project.pages.filter(
        (page) => page.archetypeId !== id,
      );
      renderConfigArchetypes();
      renderPages();
      renderSummary();
    });
  });
};

const renderConfigMultipliers = () => {
  const container = document.querySelector("#configMultipliers");
  container.innerHTML = state.config.multipliers
    .map((multiplier) => {
      return `
        <div class="config-row">
          <input type="text" data-field="name" data-id="${multiplier.id}" value="${multiplier.name}" placeholder="Názov" />
          <input type="number" step="0.01" data-field="value" data-id="${multiplier.id}" value="${multiplier.value}" />
          <label class="toggle">
            <input type="checkbox" data-field="appliesToTotal" data-id="${multiplier.id}" ${multiplier.appliesToTotal ? "checked" : ""} />
            <span>Na výstup</span>
          </label>
          <button class="ghost" data-remove-multiplier="${multiplier.id}">Zmazať</button>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll("input[type='text'], input[type='number']").forEach((input) => {
    input.addEventListener("input", (event) => {
      const id = event.target.dataset.id;
      const field = event.target.dataset.field;
      const multiplier = state.config.multipliers.find((item) => item.id === id);
      if (!multiplier) return;
      multiplier[field] = field === "value" ? Number(event.target.value) : event.target.value;
      saveConfig();
      renderMultipliers();
      renderSummary();
    });
  });

  container.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", (event) => {
      const id = event.target.dataset.id;
      const multiplier = state.config.multipliers.find((item) => item.id === id);
      if (!multiplier) return;
      multiplier.appliesToTotal = event.target.checked;
      saveConfig();
      renderMultipliers();
      renderSummary();
    });
  });

  container.querySelectorAll("button[data-remove-multiplier]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const id = event.target.dataset.removeMultiplier;
      state.config.multipliers = state.config.multipliers.filter(
        (item) => item.id !== id,
      );
      state.project.multipliers = state.project.multipliers.filter((item) => item !== id);
      saveConfig();
      renderMultipliers();
      renderConfigMultipliers();
      renderSummary();
    });
  });
};

const addProjectType = () => {
  const name = document.querySelector("#newProjectTypeName").value.trim();
  if (!name) return;
  const id = `project-${Date.now()}`;
  state.config.projectTypes.push({ id, name, ratePerUnit: 0 });
  document.querySelector("#newProjectTypeName").value = "";
  saveConfig();
  renderProjectTypes();
  renderConfigProjectTypes();
};

const addArchetype = () => {
  const name = document.querySelector("#newArchetypeName").value.trim();
  if (!name) return;
  const id = `archetype-${Date.now()}`;
  state.config.archetypes.push({ id, name, coefficient: 1, note: "" });
  document.querySelector("#newArchetypeName").value = "";
  saveConfig();
  renderConfigArchetypes();
  renderPages();
};

const addMultiplier = () => {
  const name = document.querySelector("#newMultiplierName").value.trim();
  if (!name) return;
  const id = `multiplier-${Date.now()}`;
  state.config.multipliers.push({ id, name, value: 0, appliesToTotal: false });
  document.querySelector("#newMultiplierName").value = "";
  saveConfig();
  renderMultipliers();
  renderConfigMultipliers();
};

const addPage = () => {
  const defaultArchetype = state.config.archetypes[0]?.id ?? "";
  state.project.pages.push({
    name: "Nová stránka",
    archetypeId: defaultArchetype,
    qty: 1,
    coefficientOverride: null,
  });
  renderPages();
  renderSummary();
};

const bindActions = () => {
  document.querySelector("#projectType").addEventListener("change", (event) => {
    state.project.projectTypeId = event.target.value;
    renderProjectTypes();
    renderSummary();
  });

  document.querySelector("#addPage").addEventListener("click", addPage);
  document.querySelector("#projectName").addEventListener("input", (event) => {
    state.project.name = event.target.value;
  });

  document.querySelector("#adjustments").addEventListener("input", (event) => {
    state.project.adjustments = Number(event.target.value) || 0;
    renderSummary();
  });

  document.querySelector("#addProjectType").addEventListener("click", addProjectType);
  document.querySelector("#addArchetype").addEventListener("click", addArchetype);
  document.querySelector("#addMultiplier").addEventListener("click", addMultiplier);
  document.querySelector("#resetConfig").addEventListener("click", resetConfig);
};

const renderAll = () => {
  renderProjectTypes();
  renderMultipliers();
  renderPages();
  renderSummary();
  renderConfigProjectTypes();
  renderConfigArchetypes();
  renderConfigMultipliers();
};

const bootstrap = () => {
  state.config = loadConfig();
  renderAll();
  bindActions();
};

bootstrap();
