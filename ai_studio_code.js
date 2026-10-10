/**
 * ========================================================
 * RECIPE SCALER — CLIENT-SIDE ARCHITECTURE
 * Layer 3: Validation & Calculation Logic
 * Layer 4: Web Storage Persistence (localStorage)
 * Layer 5: DOM Result Rendering
 * ========================================================
 */

// Storage Configuration
const STORAGE_KEY = "RECIPE_SCALER_SESSION_DATA";

// DOM Elements: Form & Messaging
const form = document.getElementById("scalerForm");
const errorBanner = document.getElementById("errorBanner");
const clearBtn = document.getElementById("clearBtn");

// DOM Elements: Meta Inputs
const dishNameInput = document.getElementById("dishName");
const origServingInput = document.getElementById("origServing");
const wantedServingInput = document.getElementById("wantedServing");

// DOM Elements: Results Container
const resultContainer = document.getElementById("resultContainer");
const resDishName = document.getElementById("resDishName");
const resServingInfo = document.getElementById("resServingInfo");
const resScaleFactor = document.getElementById("resScaleFactor");
const resultTableBody = document.getElementById("resultTableBody");
const storageTimestamp = document.getElementById("storageTimestamp");

/* ========================================================
   LIFECYCLE: INITIALIZATION
   ======================================================== */
window.addEventListener("DOMContentLoaded", () => {
  loadFromLocalStorage();
});

/* ========================================================
   WORKFLOW: FORM SUBMISSION
   ======================================================== */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearError();

  // 1. Collect inputs
  const dishName = dishNameInput.value.trim();
  const origServing = parseFloat(origServingInput.value);
  const wantedServing = parseFloat(wantedServingInput.value);

  const ingredients = [
    {
      name: document.getElementById("ingName1").value.trim(),
      origAmount: parseFloat(document.getElementById("ingAmt1").value),
      unit: document.getElementById("ingUnit1").value.trim()
    },
    {
      name: document.getElementById("ingName2").value.trim(),
      origAmount: parseFloat(document.getElementById("ingAmt2").value),
      unit: document.getElementById("ingUnit2").value.trim()
    },
    {
      name: document.getElementById("ingName3").value.trim(),
      origAmount: parseFloat(document.getElementById("ingAmt3").value),
      unit: document.getElementById("ingUnit3").value.trim()
    }
  ];

  // 2. Validate input values
  const validationError = validateInputs(dishName, origServing, wantedServing, ingredients);
  if (validationError) {
    showError(validationError);
    return;
  }

  // 3. Calculation formula: [new amount = (original amount * wanted serving) / original serving]
  const scalingFactor = wantedServing / origServing;
  const scaledIngredients = ingredients.map((item) => {
    const newAmount = (item.origAmount * wantedServing) / origServing;
    return {
      ...item,
      scaledAmount: roundSmart(newAmount)
    };
  });

  const payload = {
    meta: {
      dishName,
      origServing,
      wantedServing,
      factor: scalingFactor.toFixed(2),
      timestamp: new Date().toLocaleTimeString()
    },
    ingredients: scaledIngredients
  };

  // 4. Save to Browser LocalStorage
  saveToLocalStorage(payload);

  // 5. Display Scaled Recipe
  renderResult(payload);
});

/* ========================================================
   WORKFLOW: RESET APPLICATION
   ======================================================== */
clearBtn.addEventListener("click", () => {
  form.reset();
  resultContainer.style.display = "none";
  clearError();
  localStorage.removeItem(STORAGE_KEY);
});

/* ========================================================
   LAYER 3: VALIDATION & MATH HELPERS
   ======================================================== */
function validateInputs(dishName, origServing, wantedServing, ingredients) {
  if (!dishName) {
    return "Please enter a Recipe / Dish name.";
  }

  if (isNaN(origServing) || origServing <= 0) {
    return "Original servings must be a positive number greater than 0.";
  }

  if (isNaN(wantedServing) || wantedServing <= 0) {
    return "Desired servings must be a positive number greater than 0.";
  }

  for (let i = 0; i < ingredients.length; i++) {
    const item = ingredients[i];
    const index = i + 1;

    if (!item.name) {
      return `Please specify a name for Ingredient #${index}.`;
    }

    if (isNaN(item.origAmount) || item.origAmount <= 0) {
      return `Please enter a valid amount (> 0) for "${item.name}".`;
    }
  }

  return null;
}

// Rounds safely to 2 decimals, preventing floating point artifacts (e.g., 3.3333333333)
function roundSmart(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/* ========================================================
   LAYER 5: DISPLAY RESULT
   ======================================================== */
function renderResult(data) {
  const { meta, ingredients } = data;

  resDishName.textContent = meta.dishName;
  resServingInfo.textContent = `Scaled from ${meta.origServing} to ${meta.wantedServing} servings`;
  resScaleFactor.textContent = `Factor: ${meta.factor}×`;

  resultTableBody.innerHTML = "";

  ingredients.forEach((item) => {
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.textContent = item.name;

    const tdOriginal = document.createElement("td");
    tdOriginal.textContent = `${item.origAmount} ${item.unit}`.trim();

    const tdScaled = document.createElement("td");
    tdScaled.className = "scaled-val";
    tdScaled.textContent = `${item.scaledAmount} ${item.unit}`.trim();

    tr.append(tdName, tdOriginal, tdScaled);
    resultTableBody.appendChild(tr);
  });

  storageTimestamp.textContent = `Cached in LocalStorage at: ${meta.timestamp}`;
  resultContainer.style.display = "block";
}

/* ========================================================
   LAYER 4: BROWSER LOCAL STORAGE
   ======================================================== */
function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn("Storage quota exceeded or private mode active:", err);
  }
}

function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) return;

    const data = JSON.parse(rawData);
    if (!data?.meta || !data?.ingredients) return;

    // Restore input fields
    dishNameInput.value = data.meta.dishName || "";
    origServingInput.value = data.meta.origServing || "";
    wantedServingInput.value = data.meta.wantedServing || "";

    data.ingredients.forEach((ing, index) => {
      const idx = index + 1;
      const nameField = document.getElementById(`ingName${idx}`);
      const amtField = document.getElementById(`ingAmt${idx}`);
      const unitField = document.getElementById(`ingUnit${idx}`);

      if (nameField) nameField.value = ing.name || "";
      if (amtField) amtField.value = ing.origAmount || "";
      if (unitField) unitField.value = ing.unit || "";
    });

    // Restore calculated display
    renderResult(data);
  } catch (err) {
    console.error("Failed to restore session from LocalStorage:", err);
  }
}

/* ========================================================
   UI NOTIFICATION UTILITIES
   ======================================================== */
function showError(message) {
  errorBanner.textContent = message;
  errorBanner.style.display = "block";
  errorBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearError() {
  errorBanner.textContent = "";
  errorBanner.style.display = "none";
}