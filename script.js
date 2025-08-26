let achievementsData = {};
let cartItems = [];
let currentSortMode = "default";

// Cart management functions
function addToCart(achievementId) {
  const achievement = findAchievementById(achievementId);
  if (!achievement) return;

  // Check if item is already in cart
  if (cartItems.find((item) => item.id === achievementId)) {
    return; // Item already in cart
  }

  // Create a copy of the achievement with updated points if promoted
  const cartItem = { ...achievement };
  if (achievement.promoted) {
    cartItem.points = Math.round(achievement.points * 1.1);
  }

  // Preserve selectedCertification for certification renewal items
  if (achievement.selectedCertification !== undefined) {
    cartItem.selectedCertification = achievement.selectedCertification;
  }

  // Preserve certification circle fields
  if (achievement.circleSize !== undefined) {
    cartItem.circleSize = achievement.circleSize;
  }
  if (achievement.reservists !== undefined) {
    cartItem.reservists = achievement.reservists;
  }

  cartItems.push(cartItem);
  updateCartDisplay();
  updateMenuCartSummary();

  // Re-render current category to update button states
  if (
    [
      "professionalism",
      "tech",
      "knowledge-unlock",
      "collaboration",
      "extra",
    ].includes(currentCategory)
  ) {
    renderAchievements(currentCategory);
  }
}

function removeFromCart(achievementId) {
  cartItems = cartItems.filter((item) => item.id !== achievementId);
  updateCartDisplay();
  updateMenuCartSummary();

  // Re-render current category to update button states
  if (
    [
      "professionalism",
      "tech",
      "knowledge-unlock",
      "collaboration",
      "extra",
    ].includes(currentCategory)
  ) {
    renderAchievements(currentCategory);
  }
}

function clearCart() {
  cartItems = [];
  updateCartDisplay();
  updateMenuCartSummary();

  // Re-render current category to update button states
  if (
    [
      "professionalism",
      "tech",
      "knowledge-unlock",
      "collaboration",
      "extra",
    ].includes(currentCategory)
  ) {
    renderAchievements(currentCategory);
  }
}

function updateCartDisplay() {
  // This will be called to update the simulator page when it's active
  if (currentCategory === "simulator") {
    renderSimulator();
  }
}

function validateLevel() {
  const levelSelect = document.getElementById("levelSelect");
  const validationResult = document.getElementById("validationResult");

  if (!levelSelect || !validationResult) return;

  const selectedLevel = levelSelect.value;
  if (!selectedLevel) {
    // Clear validation result when no level is selected
    validationResult.className = "validation-result";
    validationResult.textContent = "";
    return;
  }

  // Level point requirements: [850, 850, 1000, 1000, 1200, 1200, 1500, 1500, 1700, 1700]
  const levelRequirements = {
    1: 850,
    2: 850,
    3: 1000,
    4: 1000,
    5: 1200,
    6: 1200,
    7: 1500,
    8: 1500,
    9: 1700,
    10: 1700,
  };

  const requiredPoints = levelRequirements[selectedLevel];
  const currentPoints = cartItems.reduce((sum, item) => sum + item.points, 0);

  // Check for mandatory items (Billable Hours and Weekly Reports)
  const mandatoryItems = ["Billable hours", "Weekly Reports"];
  const cartItemTitles = cartItems.map((item) => item.title);
  const missingMandatory = mandatoryItems.filter(
    (mandatory) =>
      !cartItemTitles.some((title) =>
        title.toLowerCase().includes(mandatory.toLowerCase())
      )
  );

  // Check both points and mandatory items
  const hasEnoughPoints = currentPoints >= requiredPoints;
  const hasMandatoryItems = missingMandatory.length === 0;

  if (hasEnoughPoints && hasMandatoryItems) {
    const surplus = currentPoints - requiredPoints;
    showValidationResult(
      `✅ Congratulations! You meet all requirements for Level ${selectedLevel}. You have ${surplus} extra points.`,
      true,
      []
    );
  } else {
    let message = `❌ Requirements not met for Level ${selectedLevel}:\n`;

    if (!hasEnoughPoints) {
      const shortage = requiredPoints - currentPoints;
      message += `• Need ${shortage} more points (${currentPoints}/${requiredPoints})\n`;
    }

    if (!hasMandatoryItems) {
      message += `• Missing mandatory items: ${missingMandatory.join(", ")}`;
    }

    showValidationResult(message, false, missingMandatory);
  }
}

function showValidationResult(message, isSuccess, missingMandatory = []) {
  const validationResult = document.getElementById("validationResult");
  if (!validationResult) return;

  // Clear previous content
  validationResult.innerHTML = "";
  validationResult.className = `validation-result ${
    isSuccess ? "success" : "error"
  }`;

  // Add the main message
  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  messageDiv.style.marginBottom = missingMandatory.length > 0 ? "1rem" : "0";
  validationResult.appendChild(messageDiv);

  // Add quick add buttons for missing mandatory items
  if (!isSuccess && missingMandatory.length > 0) {
    const buttonsDiv = document.createElement("div");
    buttonsDiv.style.display = "flex";
    buttonsDiv.style.gap = "0.5rem";
    buttonsDiv.style.flexWrap = "wrap";

    const quickAddLabel = document.createElement("div");
    quickAddLabel.textContent = "Quick add:";
    quickAddLabel.style.fontSize = "0.9rem";
    quickAddLabel.style.fontWeight = "600";
    quickAddLabel.style.color = "var(--text-primary)";
    quickAddLabel.style.marginRight = "0.5rem";
    quickAddLabel.style.alignSelf = "center";
    buttonsDiv.appendChild(quickAddLabel);

    missingMandatory.forEach((itemName) => {
      const button = document.createElement("button");
      button.textContent = `+ ${itemName}`;
      button.style.cssText = `
                background: linear-gradient(135deg, var(--accent-color), #2563eb);
                color: white;
                border: none;
                padding: 0.4rem 0.8rem;
                border-radius: 0.5rem;
                font-size: 0.8rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
      button.onclick = () => addMandatoryItem(itemName);
      button.onmouseover = () => (button.style.transform = "translateY(-1px)");
      button.onmouseout = () => (button.style.transform = "translateY(0)");
      buttonsDiv.appendChild(button);
    });

    validationResult.appendChild(buttonsDiv);
  }

  // Trigger animation
  setTimeout(() => {
    validationResult.classList.add("show");
  }, 10);
}

function getEffectivePoints(achievement) {
  return achievement.promoted
    ? Math.round(achievement.points * 1.1)
    : achievement.points;
}

function sortAchievements(achievements, sortMode) {
  if (!achievements || achievements.length === 0) return achievements;

  const sorted = [...achievements]; // Create a copy to avoid mutating original

  switch (sortMode) {
    case "points-high":
      return sorted.sort(
        (a, b) => getEffectivePoints(b) - getEffectivePoints(a)
      );
    case "points-low":
      return sorted.sort(
        (a, b) => getEffectivePoints(a) - getEffectivePoints(b)
      );
    case "default":
    default:
      return sorted; // Keep original order
  }
}

function setSortMode(sortMode) {
  currentSortMode = sortMode;
  renderAchievements(currentCategory);
}

function updateMenuCartSummary() {
  const simulatorNavLink = document.querySelector(
    "[onclick=\"showCategory('simulator')\"]"
  );
  if (!simulatorNavLink) return;

  const navTextSpan = simulatorNavLink.querySelector(".nav-text");
  if (!navTextSpan) return;

  // Remove existing summary
  const existingSummary = navTextSpan.querySelector(".menu-cart-summary");
  if (existingSummary) {
    existingSummary.remove();
  }

  // Reset nav-text to just the title
  navTextSpan.textContent = "Level-up simulator";

  // Only show summary if cart has items
  if (cartItems.length === 0) return;

  const totalPoints = cartItems.reduce((sum, item) => sum + item.points, 0);
  const itemCount = cartItems.length;

  const summaryDiv = document.createElement("div");
  summaryDiv.className = "menu-cart-summary";
  summaryDiv.innerHTML = `${itemCount} • ${totalPoints}`;

  navTextSpan.appendChild(summaryDiv);
}

async function loadAchievements() {
  try {
    const response = await fetch("achievements.json");
    achievementsData = await response.json();
    return achievementsData;
  } catch (error) {
    console.error("Error loading achievements:", error);
    return null;
  }
}

let currentCategory = "main";

function showCategory(category) {
  currentCategory = category;

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const targetLink = document.querySelector(
    `.nav-link[onclick="showCategory('${category}')"]`
  );
  if (targetLink) {
    targetLink.classList.add("active");
  }

  const categoryTitles = {
    main: "Welcome to DCR 2.0",
    simulator: "Level-up simulator",
    professionalism: "Professionalism",
    tech: "Tech",
    "knowledge-unlock": "Knowledge Unlock",
    collaboration: "Collaboration",
    extra: "Extra",
    roadmaps: "Roadmaps",
    guidelines: "Guidelines",
    faq: "FAQ",
    forms: "Forms",
  };

  document.getElementById("categoryTitle").textContent =
    categoryTitles[category];
  renderAchievements(category);
}

function renderSimulator() {
  const container = document.getElementById("achievementCards");
  const contentArea = container.parentElement; // Get the content-area div

  // Remove existing sort controls
  const existingSortControls = contentArea.querySelector(".sort-controls");
  if (existingSortControls) {
    existingSortControls.remove();
  }

  const totalPoints = cartItems.reduce((sum, item) => sum + item.points, 0);
  const itemCount = cartItems.length;

  // Preserve the selected level value
  const currentLevelSelect = document.getElementById("levelSelect");
  const selectedLevel = currentLevelSelect ? currentLevelSelect.value : "";

  if (itemCount === 0) {
    container.innerHTML = `
            <div style="text-align: center; padding: 4rem 2rem; max-width: 800px; margin: 0 auto;">
                <div style="font-size: 4rem; margin-bottom: 2rem;">🎮</div>
                <h2 style="font-size: 2.5rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.5rem; letter-spacing: -0.025em;">
                    Certification Simulator
                </h2>
                <p style="font-size: 1.2rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 3rem;">
                    Add items from the Pillars sections to build your learning path. 
                    Track your progress and see the total points you can earn.
                </p>
                <p style="font-size: 1rem; color: var(--text-muted);">
                    Your cart is empty. Visit the Pillars sections and click the + button on items to add them here.
                </p>
            </div>
        `;

    // Still restore selected level even when cart is empty
    setTimeout(() => {
      const newLevelSelect = document.getElementById("levelSelect");
      if (newLevelSelect && selectedLevel) {
        newLevelSelect.value = selectedLevel;
        validateLevel(); // Will show "need X points" message
      }
    }, 10);
    return;
  }

  container.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; padding: 2rem; background: var(--glass-elevated); border-radius: 1.5rem; border: 1px solid var(--glass-border); box-shadow: var(--shadow-medium);">
                <div style="flex: 1;">
                    <h3 style="font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin: 0 0 1rem 0;">Your Learning Path</h3>
                    <div style="display: flex; gap: 2rem; align-items: center; margin-bottom: 1.5rem;">
                        <div style="text-align: center; padding: 1rem 1.5rem; background: linear-gradient(135deg, var(--accent-color), #2563eb); border-radius: 1rem; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            <div style="font-size: 2rem; font-weight: 700; line-height: 1;">${itemCount}</div>
                            <div style="font-size: 0.85rem; font-weight: 500; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Item${
                              itemCount !== 1 ? "s" : ""
                            }</div>
                        </div>
                        <div style="text-align: center; padding: 1rem 1.5rem; background: linear-gradient(135deg, var(--success-color), #059669); border-radius: 1rem; color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                            <div style="font-size: 2rem; font-weight: 700; line-height: 1;">${totalPoints}</div>
                            <div style="font-size: 0.85rem; font-weight: 500; opacity: 0.9; text-transform: uppercase; letter-spacing: 0.5px;">Points</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="validation-dropdown" style="flex: 1; max-width: 300px;">
                            <label for="levelSelect" style="display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.5px;">Target Level</label>
                            <select id="levelSelect" onchange="validateLevel()">
                                <option value="">No level selected</option>
                                <option value="1">Level 1 (850 points)</option>
                                <option value="2">Level 2 (850 points)</option>
                                <option value="3">Level 3 (1000 points)</option>
                                <option value="4">Level 4 (1000 points)</option>
                                <option value="5">Level 5 (1200 points)</option>
                                <option value="6">Level 6 (1200 points)</option>
                                <option value="7">Level 7 (1500 points)</option>
                                <option value="8">Level 8 (1500 points)</option>
                                <option value="9">Level 9 (1700 points)</option>
                                <option value="10">Level 10 (1700 points)</option>
                            </select>
                        </div>
                    </div>
                    <div id="validationResult" class="validation-result"></div>
                </div>
                <button onclick="clearCart()" class="cart-clear-btn">
                    Clear All
                </button>
            </div>
            <div style="display: grid; gap: 1rem;">
                ${cartItems
                  .map((item) => {
                    const iconContent =
                      item.icon.startsWith("http") || item.icon.includes(".")
                        ? `<img src="${item.icon}" alt="${item.title}" style="width: 3rem; height: 3rem; object-fit: contain; border-radius: 0.5rem;">`
                        : `<div style="font-size: 2rem;">${item.icon}</div>`;

                    return `
                        <div class="cart-item" onclick="showDetails(${
                          item.id
                        })">
                            <div style="margin-right: 1.5rem; display: flex; align-items: center; justify-content: center; min-width: 3rem;">${iconContent}</div>
                            <div style="flex: 1;">
                                <h4 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.5rem 0;">${
                                  item.title
                                }</h4>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    ${
                                      item.title ===
                                      "Points from previous level"
                                        ? `<input type="number" 
                                               id="previousLevelPoints_${item.id}" 
                                               value="${item.points}" 
                                               min="0" 
                                               max="2000" 
                                               onclick="event.stopPropagation()" 
                                               onchange="updatePreviousLevelPoints(${item.id}, this.value)" 
                                               style="width: 80px; padding: 0.2rem 0.4rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.8rem;"> 
                                         <span style="color: var(--text-secondary); font-size: 0.9rem;">points • ${item.provider}</span>`
                                        : item.title === "Certification renewal"
                                        ? `<div onclick="event.stopPropagation()">
                                            <select id="cartCertSelect_${
                                              item.id
                                            }" 
                                                    onchange="updateCertificationRenewal(${
                                                      item.id
                                                    }, this.value)"
                                                    style="width: 200px; padding: 0.2rem 0.4rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.8rem; margin-bottom: 0.2rem;">
                                                <option value="">Select certification...</option>
                                                ${(() => {
                                                  const techAchievements =
                                                    achievementsData.tech || [];
                                                  return techAchievements
                                                    .map(
                                                      (tech) =>
                                                        `<option value="${
                                                          tech.id
                                                        }" ${
                                                          item.selectedCertification ===
                                                          tech.id
                                                            ? "selected"
                                                            : ""
                                                        }>${
                                                          tech.title
                                                        }</option>`
                                                    )
                                                    .join("");
                                                })()}
                                            </select>
                                            <br><span style="color: var(--text-secondary); font-size: 0.9rem;">${
                                              item.points
                                            } points • ${item.provider}</span>
                                        </div>`
                                        : item.title === "Certification circle"
                                        ? `<div onclick="event.stopPropagation()" style="font-size: 0.8rem;">
                                            <select id="cartCircleCertSelect_${
                                              item.id
                                            }" 
                                                    onchange="updateCertificationCircle(${
                                                      item.id
                                                    })"
                                                    style="width: 180px; padding: 0.2rem 0.3rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.75rem; margin-bottom: 0.15rem;">
                                                <option value="">Certification...</option>
                                                ${(() => {
                                                  const techAchievements =
                                                    achievementsData.tech || [];
                                                  return techAchievements
                                                    .filter(
                                                      (tech) =>
                                                        tech.points >= 130
                                                    )
                                                    .map(
                                                      (tech) =>
                                                        `<option value="${
                                                          tech.id
                                                        }" ${
                                                          item.selectedCertification ===
                                                          tech.id
                                                            ? "selected"
                                                            : ""
                                                        }>${
                                                          tech.title
                                                        }</option>`
                                                    )
                                                    .join("");
                                                })()}
                                            </select><br>
                                            <select id="cartCircleSizeSelect_${
                                              item.id
                                            }" 
                                                    onchange="updateCertificationCircle(${
                                                      item.id
                                                    })"
                                                    style="width: 90px; padding: 0.2rem 0.3rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.75rem; margin-right: 0.3rem;">
                                                <option value="">Size...</option>
                                                <option value="3" ${
                                                  item.circleSize === "3"
                                                    ? "selected"
                                                    : ""
                                                }>3</option>
                                                <option value="4" ${
                                                  item.circleSize === "4"
                                                    ? "selected"
                                                    : ""
                                                }>4</option>
                                                <option value="5" ${
                                                  item.circleSize === "5"
                                                    ? "selected"
                                                    : ""
                                                }>5</option>
                                                <option value="6" ${
                                                  item.circleSize === "6"
                                                    ? "selected"
                                                    : ""
                                                }>6</option>
                                                <option value="7" ${
                                                  item.circleSize === "7"
                                                    ? "selected"
                                                    : ""
                                                }>7+</option>
                                            </select>
                                            <select id="cartReservistsSelect_${
                                              item.id
                                            }" 
                                                    onchange="updateCertificationCircle(${
                                                      item.id
                                                    })"
                                                    style="width: 85px; padding: 0.2rem 0.3rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.75rem;">
                                                <option value="0" ${
                                                  item.reservists === "0"
                                                    ? "selected"
                                                    : ""
                                                }>0R</option>
                                                <option value="1" ${
                                                  item.reservists === "1"
                                                    ? "selected"
                                                    : ""
                                                }>1R</option>
                                                <option value="2" ${
                                                  item.reservists === "2"
                                                    ? "selected"
                                                    : ""
                                                }>2+R</option>
                                            </select>
                                            <br><span style="color: var(--text-secondary); font-size: 0.9rem;">${
                                              item.points
                                            } points • ${item.provider}</span>
                                        </div>`
                                        : `<p style="color: var(--text-secondary); margin: 0; font-size: 0.9rem;">${
                                            item.provider
                                          } • ${item.points} points${
                                            item.promoted
                                              ? ' <span style="color: var(--success-color); font-weight: 600;">(+10% bonus)</span>'
                                              : ""
                                          }</p>`
                                    }
                                </div>
                            </div>
                            <button onclick="event.stopPropagation(); removeFromCart(${
                              item.id
                            })" class="cart-remove-btn">
                                ×
                            </button>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    `;

  // Restore the selected level value after rendering
  setTimeout(() => {
    const newLevelSelect = document.getElementById("levelSelect");
    if (newLevelSelect && selectedLevel) {
      newLevelSelect.value = selectedLevel;
      validateLevel(); // Re-validate with updated cart
    }
  }, 10);
}

function renderForms() {
  const container = document.getElementById("achievementCards");
  const contentArea = container.parentElement;

  // Remove existing sort controls
  const existingSortControls = contentArea.querySelector(".sort-controls");
  if (existingSortControls) {
    existingSortControls.remove();
  }

  const forms = achievementsData["forms"];

  if (!forms || forms.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-size: 1.1rem;">No forms available</div>';
    return;
  }

  // Display all forms as cards
  container.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto; padding: 2rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <h2 style="font-size: 2.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">📋 Forms</h2>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
                ${forms
                  .map((form) => {
                    const isComingSoon = form.status === "coming_soon";
                    return `
                        <div class="form-card" onclick="${
                          isComingSoon ? "" : `showIndividualForm(${form.id})`
                        }" 
                             style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 1rem; padding: 2rem; box-shadow: var(--shadow-medium); cursor: ${
                               isComingSoon ? "default" : "pointer"
                             }; transition: all 0.3s ease; position: relative; ${
                      isComingSoon ? "opacity: 0.6;" : ""
                    }">
                            
                            ${
                              isComingSoon
                                ? '<div style="position: absolute; top: 1rem; right: 1rem; background: var(--warning-color); color: white; padding: 0.2rem 0.5rem; border-radius: 0.3rem; font-size: 0.7rem; font-weight: 600;">Coming Soon</div>'
                                : ""
                            }
                            
                            <div style="text-align: center; margin-bottom: 1.5rem;">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">${
                                  form.icon
                                }</div>
                                <h3 style="font-size: 1.4rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">${
                                  form.title
                                }</h3>
                                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">${
                                  form.description
                                }</p>
                            </div>
                            
                            ${
                              isComingSoon
                                ? `<div style="text-align: center; padding: 1rem; background: var(--glass-surface); border-radius: 0.5rem; border: 1px dashed var(--glass-border);">
                                    <span style="color: var(--text-muted); font-size: 0.8rem;">This form will be available soon</span>
                                </div>`
                                : `<div style="text-align: center;">
                                    <button style="background: var(--accent-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='var(--accent-color)'">
                                        Open Form →
                                    </button>
                                </div>`
                            }
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        </div>
    `;
}

function showIndividualForm(formId) {
  const container = document.getElementById("achievementCards");
  const form = achievementsData["forms"].find((f) => f.id === formId);

  if (!form) return;

  container.innerHTML = `
        <div style="max-width: 800px; margin: 0 auto; padding: 2rem;">
            <div style="margin-bottom: 2rem;">
                <button onclick="renderForms()" style="background: var(--glass-surface); border: 1px solid var(--glass-border); color: var(--text-primary); padding: 0.5rem 1rem; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease;" onmouseover="this.style.background='var(--glass-hover)'" onmouseout="this.style.background='var(--glass-surface)'">
                    ← Back to Forms
                </button>
            </div>
            
            <div style="text-align: center; margin-bottom: 2rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">${form.icon}</div>
                <h2 style="font-size: 1.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">${form.title}</h2>
                <p style="color: var(--text-secondary); font-size: 1rem;">${form.description}</p>
            </div>
            
            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 1rem; padding: 1.5rem; box-shadow: var(--shadow-medium); overflow: hidden;">
                <iframe 
                    src="${form.googleFormUrl}" 
                    width="100%" 
                    height="800" 
                    frameborder="0" 
                    marginheight="0" 
                    marginwidth="0"
                    style="border-radius: 0.5rem; background: white;"
                >
                    Loading Google Form...
                </iframe>
            </div>
            
            <div style="text-align: center; margin-top: 1rem; color: var(--text-secondary); font-size: 0.9rem;">
                <p>✨ Thank you for your contribution to the DCR system!</p>
            </div>
        </div>
    `;
}

function renderGuidelines() {
  const container = document.getElementById("achievementCards");
  const contentArea = container.parentElement;

  // Remove existing sort controls
  const existingSortControls = contentArea.querySelector(".sort-controls");
  if (existingSortControls) {
    existingSortControls.remove();
  }

  const guidelines = achievementsData["guidelines"];

  if (!guidelines || guidelines.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-size: 1.1rem;">No guidelines available</div>';
    return;
  }

  container.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 2rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <h2 style="font-size: 2.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">📋 Guidelines</h2>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 2rem;">
                ${guidelines
                  .map(
                    (guideline) => `
                    <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 1rem; padding: 2rem; box-shadow: var(--shadow-medium);">
                        <h3 style="font-size: 1.5rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 8px; height: 8px; background: linear-gradient(135deg, var(--accent-color), var(--success-color)); border-radius: 50%;"></div>
                            ${guideline.title}
                        </h3>
                        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem;">
                            ${guideline.points
                              .map(
                                (point) => `
                                <li style="display: flex; align-items: flex-start; gap: 0.75rem; line-height: 1.6; color: var(--text-secondary);">
                                    <div style="width: 6px; height: 6px; background: var(--accent-color); border-radius: 50%; margin-top: 0.6rem; flex-shrink: 0;"></div>
                                    <span>${point}</span>
                                </li>
                            `
                              )
                              .join("")}
                        </ul>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `;
}

function renderFAQ() {
  const container = document.getElementById("achievementCards");
  const contentArea = container.parentElement;

  // Remove existing sort controls
  const existingSortControls = contentArea.querySelector(".sort-controls");
  if (existingSortControls) {
    existingSortControls.remove();
  }

  const faqs = achievementsData["faq"];

  if (!faqs || faqs.length === 0) {
    container.innerHTML =
      '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-size: 1.1rem;">No FAQs available</div>';
    return;
  }

  container.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding: 2rem;">
            <div style="text-align: center; margin-bottom: 3rem;">
                <h2 style="font-size: 2.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">❓ Frequently Asked Questions</h2>
                <p style="color: var(--text-secondary); font-size: 1.1rem; max-width: 600px; margin: 0 auto;">
                    Find answers to common questions about the DCR program, requirements, and processes.
                </p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
                ${faqs
                  .map(
                    (faq) => `
                    <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 1rem; padding: 2rem; box-shadow: var(--shadow-medium); cursor: pointer; transition: all 0.3s ease;" onclick="toggleFAQ(${faq.id})">
                        <div style="display: flex; align-items: flex-start; gap: 1rem;">
                            <div style="flex-shrink: 0; width: 32px; height: 32px; background: linear-gradient(135deg, var(--accent-color), var(--success-color)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">
                                Q
                            </div>
                            <div style="flex: 1;">
                                <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin: 0 0 1rem 0; line-height: 1.4;">
                                    ${faq.question}
                                </h3>
                                <div id="faq-answer-${faq.id}" style="display: none;">
                                    <div style="height: 1px; background: linear-gradient(to right, var(--glass-border), transparent); margin: 1rem 0;"></div>
                                    <div style="display: flex; align-items: flex-start; gap: 1rem;">
                                        <div style="flex-shrink: 0; width: 32px; height: 32px; background: linear-gradient(135deg, var(--success-color), var(--accent-color)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 0.9rem;">
                                            A
                                        </div>
                                        <p style="color: var(--text-secondary); margin: 0; line-height: 1.6; flex: 1;">
                                            ${faq.answer}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div style="flex-shrink: 0; color: var(--accent-color); font-size: 1.5rem; transition: transform 0.3s ease;" id="faq-icon-${faq.id}">
                                +
                            </div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `;
}

function renderAchievements(category) {
  const container = document.getElementById("achievementCards");
  const contentArea = container.parentElement; // Get the content-area div

  if (category === "simulator") {
    container.classList.remove("grid-layout");
    renderSimulator();
    return;
  }

  if (category === "forms") {
    container.classList.remove("grid-layout");
    renderForms();
    return;
  }

  if (category === "guidelines") {
    container.classList.remove("grid-layout");
    renderGuidelines();
    return;
  }

  if (category === "faq") {
    container.classList.remove("grid-layout");
    renderFAQ();
    return;
  }

  let achievements = achievementsData[category];

  // Check if this is a pillar category that should have sorting
  const isPillarCategory = [
    "tech",
    "knowledge-unlock",
    "collaboration",
    "roadmaps",
  ].includes(category);

  // Remove existing sort controls
  const existingSortControls = contentArea.querySelector(".sort-controls");
  if (existingSortControls) {
    existingSortControls.remove();
  }

  if (isPillarCategory && achievements && achievements.length > 0) {
    // Apply sorting
    achievements = sortAchievements(achievements, currentSortMode);

    // Add grid layout class for achievement cards
    container.classList.add("grid-layout");

    // Create sort controls above the grid
    const sortControls = document.createElement("div");
    sortControls.className = "sort-controls";
    sortControls.innerHTML = `
            <div class="sort-dropdown">
                <label for="sortSelect">Sort by:</label>
                <select id="sortSelect" onchange="setSortMode(this.value)">
                    <option value="default" ${
                      currentSortMode === "default" ? "selected" : ""
                    }>Category Order</option>
                    <option value="points-high" ${
                      currentSortMode === "points-high" ? "selected" : ""
                    }>Points (High to Low)</option>
                    <option value="points-low" ${
                      currentSortMode === "points-low" ? "selected" : ""
                    }>Points (Low to High)</option>
                </select>
            </div>
        `;

    // Insert sort controls before the cards container
    contentArea.insertBefore(sortControls, container);

    container.innerHTML = achievements
      .map((achievement) => {
        const iconContent =
          achievement.icon.startsWith("http") || achievement.icon.includes(".")
            ? `<img src="${achievement.icon}" alt="${achievement.title}" style="width: 100%; height: 100%; object-fit: contain;">`
            : achievement.icon;

        const mandatoryRibbon = achievement.mandatory
          ? '<div class="mandatory-ribbon">Required</div>'
          : "";
        const promotedRibbon = achievement.promoted
          ? '<div class="promoted-ribbon">Promoted</div>'
          : "";

        // Add plus button only for pillar categories
        const isInCart = cartItems.find((item) => item.id === achievement.id);
        const plusButton = `
                <button class="add-to-cart-btn ${isInCart ? "added" : ""}" 
                        data-achievement-id="${achievement.id}" 
                        onclick="event.stopPropagation(); ${
                          isInCart
                            ? `removeFromCart(${achievement.id})`
                            : `addToCart(${achievement.id})`
                        };">
                    ${isInCart ? "✓" : "+"}
                </button>
            `;

        return `
                <div class="achievement-card" onclick="showDetails(${
                  achievement.id
                })">
                    ${mandatoryRibbon}
                    ${promotedRibbon}
                    ${plusButton}
                    <div class="card-image">${iconContent}</div>
                    <h3 class="card-title">${achievement.title}</h3>
                    ${
                      achievement.title === "Points from previous level"
                        ? `<div class="card-points" onclick="event.stopPropagation()">
                            <input type="number" 
                                   id="cardPoints_${achievement.id}" 
                                   value="${achievement.points}" 
                                   min="0" 
                                   max="2000" 
                                   onchange="updateAchievementPoints(${achievement.id}, this.value)" 
                                   style="width: 80px; padding: 0.3rem 0.5rem; border: 1px solid var(--glass-border); border-radius: 0.4rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.9rem; text-align: center; margin-bottom: 0.2rem;">
                            <br><span style="font-size: 0.8rem; color: var(--text-secondary);">points</span>
                        </div>`
                        : achievement.title === "Certification renewal"
                        ? `<div class="card-points" onclick="event.stopPropagation()">
                            <select id="certSelect_${achievement.id}" 
                                    onchange="updateCertificationRenewal(${
                                      achievement.id
                                    }, this.value)"
                                    style="width: 100%; padding: 0.3rem 0.5rem; border: 1px solid var(--glass-border); border-radius: 0.4rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.8rem; margin-bottom: 0.2rem;">
                                <option value="">Select certification...</option>
                                ${(() => {
                                  const techAchievements =
                                    achievementsData.tech || [];
                                  return techAchievements
                                    .map(
                                      (tech) =>
                                        `<option value="${tech.id}" ${
                                          achievement.selectedCertification ===
                                          tech.id
                                            ? "selected"
                                            : ""
                                        }>${tech.title}</option>`
                                    )
                                    .join("");
                                })()}
                            </select>
                            <br><span style="font-size: 0.8rem; color: var(--text-secondary);">${
                              achievement.points
                            } points</span>
                        </div>`
                        : achievement.title === "Certification circle"
                        ? `<div class="card-points" onclick="event.stopPropagation()" style="font-size: 0.75rem;">
                            <div style="display: flex; gap: 0.1rem; margin-bottom: 0.15rem; width: 100%;">
                                <select id="circleCertSelect_${achievement.id}" 
                                        onchange="updateCertificationCircle(${
                                          achievement.id
                                        })"
                                        style="width: 50%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                    <option value="">Cert</option>
                                    ${(() => {
                                      const techAchievements =
                                        achievementsData.tech || [];
                                      return techAchievements
                                        .filter((tech) => tech.points >= 130)
                                        .map(
                                          (tech) =>
                                            `<option value="${tech.id}" ${
                                              achievement.selectedCertification ===
                                              tech.id
                                                ? "selected"
                                                : ""
                                            }>${tech.title}</option>`
                                        )
                                        .join("");
                                    })()}
                                </select>
                                <select id="circleSizeSelect_${achievement.id}" 
                                        onchange="updateCertificationCircle(${
                                          achievement.id
                                        })"
                                        style="width: 25%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                    <option value="">Ppl</option>
                                    <option value="3" ${
                                      achievement.circleSize === "3"
                                        ? "selected"
                                        : ""
                                    }>3</option>
                                    <option value="4" ${
                                      achievement.circleSize === "4"
                                        ? "selected"
                                        : ""
                                    }>4</option>
                                    <option value="5" ${
                                      achievement.circleSize === "5"
                                        ? "selected"
                                        : ""
                                    }>5</option>
                                    <option value="6" ${
                                      achievement.circleSize === "6"
                                        ? "selected"
                                        : ""
                                    }>6</option>
                                    <option value="7" ${
                                      achievement.circleSize === "7"
                                        ? "selected"
                                        : ""
                                    }>7+</option>
                                </select>
                                <select id="reservistsSelect_${achievement.id}" 
                                        onchange="updateCertificationCircle(${
                                          achievement.id
                                        })"
                                        style="width: 25%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                    <option value="0" ${
                                      achievement.reservists === "0"
                                        ? "selected"
                                        : ""
                                    }>0R</option>
                                    <option value="1" ${
                                      achievement.reservists === "1"
                                        ? "selected"
                                        : ""
                                    }>1R</option>
                                    <option value="2" ${
                                      achievement.reservists === "2"
                                        ? "selected"
                                        : ""
                                    }>2+R</option>
                                </select>
                            </div>
                            <span style="font-size: 0.9rem; color: var(--text-secondary);">${
                              achievement.points
                            } points</span>
                        </div>`
                        : `<p class="card-points">${
                            achievement.promoted
                              ? `<span class="old-points">${
                                  achievement.points
                                }</span> <span class="new-points">${Math.round(
                                  achievement.points * 1.1
                                )} points</span>`
                              : `${achievement.points} points`
                          }</p>`
                    }
                </div>
            `;
      })
      .join("");

    return;
  }

  if (!achievements || achievements.length === 0) {
    // Remove grid layout for non-achievement pages
    container.classList.remove("grid-layout");

    if (category === "main") {
      container.innerHTML = `
                <div style="padding: 0; width: 100%; height: 100%; display: flex; flex-direction: column;">
                    <div style="margin-bottom: 2rem; width: 100%;">
                        <h3 style="font-size: 1.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.5rem; text-align: left;">
                            📰 What's new
                        </h3>
                        <div style="max-height: 320px; overflow-y: auto; padding-right: 0.5rem; scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.3) transparent;">
                            <style>
                                div::-webkit-scrollbar {
                                    width: 6px;
                                }
                                div::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                div::-webkit-scrollbar-thumb {
                                    background: rgba(255, 255, 255, 0.3);
                                    border-radius: 3px;
                                }
                                div::-webkit-scrollbar-thumb:hover {
                                    background: rgba(255, 255, 255, 0.5);
                                }
                            </style>
                            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem; margin-bottom: 0.6rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <div style="background: linear-gradient(135deg, var(--error-color), #dc2626); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                        Important
                                    </div>
                                    <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">Weekly reports are now required to level-up</h4>
                                </div>
                                <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                    Sending weekly reports is now required in order to level-up in the DCR. Please make sure to send them weekly. Of course special cases will be handled individually, but an approval of a team leader is now required.
                                </p>
                            </div>
                            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem; margin-bottom: 0.6rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <div style="background: linear-gradient(135deg, var(--success-color), #059669); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                        New
                                    </div>
                                    <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">New ways to get value and earn points</h4>
                                </div>
                                <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                    Roadmaps, certification-circles and more. Check 'guidelines' section for more details.
                                </p>
                            </div>
                            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem; margin-bottom: 0.6rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <div style="background: linear-gradient(135deg, var(--success-color), #059669); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                        New
                                    </div>
                                    <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">Promoted certifications launch</h4>
                                </div>
                                <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                    All GCP certifications now offer 10% bonus points! Get more value from your Google Cloud Platform certifications and accelerate your level progression.
                                </p>
                            </div>
                            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                    <div style="background: linear-gradient(135deg, var(--success-color), #059669); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                        New
                                    </div>
                                    <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">Miluim</h4>
                                </div>
                                <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                    Thanks for the service! New conditions for DCR for reservists. Check the 'guidelines' section for more details.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="flex: 1; width: 100%; display: flex; flex-direction: column;">
                        <h3 style="font-size: 1.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; text-align: left;">
                            🎯 Promoted items
                        </h3>
                        <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 1.5rem;">
                            <span style="font-size: 1.1rem; color: var(--text-secondary); font-weight: 500;">
                                GCP certifications
                            </span>
                            <div style="height: 1px; flex: 1; background: linear-gradient(to right, rgba(66, 133, 244, 0.3), transparent);"></div>
                        </div>
                        <div style="position: relative;">
                            <div id="promotedCarousel" style="display: flex; gap: 1rem; overflow-x: auto; scroll-behavior: smooth; padding: 0.5rem 0; scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch;">
                                <style>
                                    #promotedCarousel::-webkit-scrollbar {
                                        display: none;
                                    }
                                </style>
                                ${(() => {
                                  const promotedItems = [];
                                  for (const category in achievementsData) {
                                    if (achievementsData[category]) {
                                      promotedItems.push(
                                        ...achievementsData[category].filter(
                                          (item) => item.promoted
                                        )
                                      );
                                    }
                                  }
                                  if (promotedItems.length === 0) {
                                    return '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">No promoted items found</div>';
                                  }
                                  return promotedItems
                                    .map((item) => {
                                      const iconContent =
                                        item.icon.startsWith("http") ||
                                        item.icon.includes(".")
                                          ? `<img src="${item.icon}" alt="${item.title}" style="width: 2rem; height: 2rem; object-fit: contain; border-radius: 0.4rem;">`
                                          : `<div style="font-size: 1.5rem;">${item.icon}</div>`;

                                      return `
                                            <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.8rem; padding: 1rem; position: relative; cursor: pointer; transition: all 0.3s ease; box-shadow: var(--shadow-medium); min-width: 280px; flex-shrink: 0;" onclick="showDetails(${
                                              item.id
                                            })">
                                                <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.8rem;">
                                                    ${iconContent}
                                                    <div style="flex: 1; min-width: 0;">
                                                        <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0 0 0.2rem 0; line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${
                                                          item.title
                                                        }</h4>
                                                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0;">${
                                                          item.provider
                                                        }</p>
                                                    </div>
                                                </div>
                                                <div style="display: flex; justify-content: flex-start; align-items: center;">
                                                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                                                        <span style="font-size: 0.75rem; color: var(--text-muted); text-decoration: line-through;">${
                                                          item.points
                                                        }</span>
                                                        <span style="font-size: 0.8rem; font-weight: 600; color: var(--success-color);">${Math.round(
                                                          item.points * 1.1
                                                        )} points</span>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    })
                                    .join("");
                                })()}
                            </div>
                            <button onclick="scrollPromotedCarousel(-1)" style="position: absolute; left: -20px; top: 50%; transform: translateY(-50%); background: var(--glass-elevated); border: 1px solid var(--glass-border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-medium); color: var(--text-primary); font-size: 1.2rem; z-index: 10;">‹</button>
                            <button onclick="scrollPromotedCarousel(1)" style="position: absolute; right: -20px; top: 50%; transform: translateY(-50%); background: var(--glass-elevated); border: 1px solid var(--glass-border); border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: var(--shadow-medium); color: var(--text-primary); font-size: 1.2rem; z-index: 10;">›</button>
                        </div>
                    </div>
                    
                    <div style="margin-top: 2rem; width: 100%;">
                        <h3 style="font-size: 1.8rem; font-weight: 600; color: var(--text-primary); margin-bottom: 1.5rem; text-align: left;">
                            🔮 What's up next?
                        </h3>
                        <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem; margin-bottom: 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                <div style="background: linear-gradient(135deg, var(--accent-color), #2563eb); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Coming
                                </div>
                                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">New certifications</h4>
                            </div>
                            <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                More tech certifications are being added to expand your learning opportunities and help you reach higher levels faster.
                            </p>
                        </div>
                        <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem; margin-bottom: 0.6rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                <div style="background: linear-gradient(135deg, var(--accent-color), #2563eb); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Coming
                                </div>
                                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">Personal portal</h4>
                            </div>
                            <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                Personal portal with all the personal data, like level, achievements, plan etc.
                            </p>
                        </div>
                        <div style="background: var(--glass-elevated); backdrop-filter: var(--blur-light); border: 1px solid var(--glass-border); border-radius: 0.6rem; padding: 0.8rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem;">
                                <div style="background: linear-gradient(135deg, var(--accent-color), #2563eb); color: white; padding: 0.1rem 0.3rem; border-radius: 0.4rem; font-size: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                                    Coming
                                </div>
                                <h4 style="font-size: 0.9rem; font-weight: 600; color: var(--text-primary); margin: 0;">New badges</h4>
                            </div>
                            <p style="color: var(--text-secondary); margin: 0; line-height: 1.4; font-size: 0.8rem;">
                                More Develeap badges to achieve and earn points, for content creating, cooperation and more.
                            </p>
                        </div>
                    </div>
                </div>
            `;
    } else {
      container.innerHTML =
        '<div style="text-align: center; padding: 3rem; color: var(--text-secondary); font-size: 1.1rem;">Coming soon...</div>';
    }
    return;
  }

  // Add grid layout class for achievement cards
  container.classList.add("grid-layout");

  container.innerHTML = achievements
    .map((achievement) => {
      const iconContent =
        achievement.icon.startsWith("http") || achievement.icon.includes(".")
          ? `<img src="${achievement.icon}" alt="${achievement.title}" style="width: 100%; height: 100%; object-fit: contain;">`
          : achievement.icon;

      const mandatoryRibbon = achievement.mandatory
        ? '<div class="mandatory-ribbon">Required</div>'
        : "";
      const promotedRibbon = achievement.promoted
        ? '<div class="promoted-ribbon">Promoted</div>'
        : "";

      // Add plus button only for pillar categories
      const isPillarCategory = [
        "tech",
        "knowledge-unlock",
        "collaboration",
        "roadmaps",
      ].includes(category);
      const isInCart = cartItems.find((item) => item.id === achievement.id);
      const plusButton = isPillarCategory
        ? `
            <button class="add-to-cart-btn ${isInCart ? "added" : ""}" 
                    data-achievement-id="${achievement.id}" 
                    onclick="event.stopPropagation(); ${
                      isInCart
                        ? `removeFromCart(${achievement.id})`
                        : `addToCart(${achievement.id})`
                    };">
                ${isInCart ? "✓" : "+"}
            </button>
        `
        : "";

      return `
            <div class="achievement-card" onclick="showDetails(${
              achievement.id
            })">
                ${mandatoryRibbon}
                ${promotedRibbon}
                ${plusButton}
                <div class="card-image">${iconContent}</div>
                <h3 class="card-title">${achievement.title}</h3>
                ${
                  achievement.title === "Points from previous level"
                    ? `<div class="card-points" onclick="event.stopPropagation()">
                        <input type="number" 
                               id="cardPoints_${achievement.id}" 
                               value="${achievement.points}" 
                               min="0" 
                               max="2000" 
                               onchange="updateAchievementPoints(${achievement.id}, this.value)" 
                               style="width: 80px; padding: 0.3rem 0.5rem; border: 1px solid var(--glass-border); border-radius: 0.4rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.9rem; text-align: center; margin-bottom: 0.2rem;">
                        <br><span style="font-size: 0.8rem; color: var(--text-secondary);">points</span>
                    </div>`
                    : achievement.title === "Certification renewal"
                    ? `<div class="card-points" onclick="event.stopPropagation()">
                        <select id="certSelect_${achievement.id}" 
                                onchange="updateCertificationRenewal(${
                                  achievement.id
                                }, this.value)"
                                style="width: 100%; padding: 0.3rem 0.5rem; border: 1px solid var(--glass-border); border-radius: 0.4rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.8rem; margin-bottom: 0.2rem;">
                            <option value="">Select certification...</option>
                            ${(() => {
                              const techAchievements =
                                achievementsData.tech || [];
                              return techAchievements
                                .map(
                                  (tech) =>
                                    `<option value="${tech.id}" ${
                                      achievement.selectedCertification ===
                                      tech.id
                                        ? "selected"
                                        : ""
                                    }>${tech.title}</option>`
                                )
                                .join("");
                            })()}
                        </select>
                        <br><span style="font-size: 0.8rem; color: var(--text-secondary);">${
                          achievement.points
                        } points</span>
                    </div>`
                    : achievement.title === "Certification circle"
                    ? `<div class="card-points" onclick="event.stopPropagation()" style="font-size: 0.75rem;">
                        <div style="display: flex; gap: 0.1rem; margin-bottom: 0.15rem; width: 100%;">
                            <select id="circleCertSelect_${achievement.id}" 
                                    onchange="updateCertificationCircle(${
                                      achievement.id
                                    })"
                                    style="width: 50%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                <option value="">Cert</option>
                                ${(() => {
                                  const techAchievements =
                                    achievementsData.tech || [];
                                  return techAchievements
                                    .filter((tech) => tech.points >= 130)
                                    .map(
                                      (tech) =>
                                        `<option value="${tech.id}" ${
                                          achievement.selectedCertification ===
                                          tech.id
                                            ? "selected"
                                            : ""
                                        }>${tech.title}</option>`
                                    )
                                    .join("");
                                })()}
                            </select>
                            <select id="circleSizeSelect_${achievement.id}" 
                                    onchange="updateCertificationCircle(${
                                      achievement.id
                                    })"
                                    style="width: 25%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                <option value="">Ppl</option>
                                <option value="3" ${
                                  achievement.circleSize === "3"
                                    ? "selected"
                                    : ""
                                }>3</option>
                                <option value="4" ${
                                  achievement.circleSize === "4"
                                    ? "selected"
                                    : ""
                                }>4</option>
                                <option value="5" ${
                                  achievement.circleSize === "5"
                                    ? "selected"
                                    : ""
                                }>5</option>
                                <option value="6" ${
                                  achievement.circleSize === "6"
                                    ? "selected"
                                    : ""
                                }>6</option>
                                <option value="7" ${
                                  achievement.circleSize === "7"
                                    ? "selected"
                                    : ""
                                }>7+</option>
                            </select>
                            <select id="reservistsSelect_${achievement.id}" 
                                    onchange="updateCertificationCircle(${
                                      achievement.id
                                    })"
                                    style="width: 25%; padding: 0.2rem 0.1rem; border: 1px solid var(--glass-border); border-radius: 0.3rem; background: var(--glass-light); color: var(--text-primary); font-size: 0.6rem;">
                                <option value="0" ${
                                  achievement.reservists === "0"
                                    ? "selected"
                                    : ""
                                }>0R</option>
                                <option value="1" ${
                                  achievement.reservists === "1"
                                    ? "selected"
                                    : ""
                                }>1R</option>
                                <option value="2" ${
                                  achievement.reservists === "2"
                                    ? "selected"
                                    : ""
                                }>2+R</option>
                            </select>
                        </div>
                        <span style="font-size: 0.9rem; color: var(--text-secondary);">${
                          achievement.points
                        } points</span>
                    </div>`
                    : `<p class="card-points">${
                        achievement.promoted
                          ? `<span class="old-points">${
                              achievement.points
                            }</span> <span class="new-points">${Math.round(
                              achievement.points * 1.1
                            )} points</span>`
                          : `${achievement.points} points`
                      }</p>`
                }
            </div>
        `;
    })
    .join("");
}

function findAchievementById(id) {
  for (const category in achievementsData) {
    const achievement = achievementsData[category].find(
      (item) => item.id === id
    );
    if (achievement) return achievement;
  }
  return null;
}

function findAchievementByTitle(title) {
  for (const category in achievementsData) {
    const achievement = achievementsData[category].find((item) =>
      item.title.toLowerCase().includes(title.toLowerCase())
    );
    if (achievement) return achievement;
  }
  return null;
}

function addMandatoryItem(itemName) {
  const achievement = findAchievementByTitle(itemName);
  if (achievement && !cartItems.find((item) => item.id === achievement.id)) {
    addToCart(achievement.id);
    // Re-validate after adding
    setTimeout(validateLevel, 100);
  }
}

function updatePreviousLevelPoints(achievementId, newPoints) {
  const cartItemIndex = cartItems.findIndex(
    (item) => item.id === achievementId
  );
  if (cartItemIndex !== -1) {
    cartItems[cartItemIndex].points = parseInt(newPoints) || 0;
    updateCartDisplay();
    updateMenuCartSummary();

    // Re-validate level if a level is selected
    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect && levelSelect.value) {
      validateLevel();
    }
  }
}

function updateAchievementPoints(achievementId, newPoints) {
  const pointsValue = parseInt(newPoints) || 0;

  // Update the achievement in the data
  for (const category in achievementsData) {
    const achievement = achievementsData[category].find(
      (item) => item.id === achievementId
    );
    if (achievement) {
      achievement.points = pointsValue;
      break;
    }
  }

  // Update cart item if it exists
  const cartItemIndex = cartItems.findIndex(
    (item) => item.id === achievementId
  );
  if (cartItemIndex !== -1) {
    cartItems[cartItemIndex].points = pointsValue;
    updateCartDisplay();
    updateMenuCartSummary();

    // Re-validate level if a level is selected
    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect && levelSelect.value) {
      validateLevel();
    }
  }
}

function updateCertificationRenewal(achievementId, selectedCertId) {
  // Find the renewal achievement
  const renewalAchievement = achievementsData.extra.find(
    (item) => item.id === achievementId
  );
  if (!renewalAchievement) return;

  // Calculate 25% of the selected certification's points (rounded up)
  let renewalPoints = 0;
  if (selectedCertId) {
    const selectedCert = achievementsData.tech.find(
      (item) => item.id === parseInt(selectedCertId)
    );
    if (selectedCert) {
      renewalPoints = Math.ceil(selectedCert.points * 0.25);
    }
  }

  // Update the renewal achievement
  renewalAchievement.selectedCertification = selectedCertId
    ? parseInt(selectedCertId)
    : null;
  renewalAchievement.points = renewalPoints;

  // Update cart item if it exists
  const cartItemIndex = cartItems.findIndex(
    (item) => item.id === achievementId
  );
  if (cartItemIndex !== -1) {
    cartItems[cartItemIndex].selectedCertification =
      renewalAchievement.selectedCertification;
    cartItems[cartItemIndex].points = renewalPoints;
    updateCartDisplay();
    updateMenuCartSummary();

    // Re-validate level if a level is selected
    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect && levelSelect.value) {
      validateLevel();
    }
  }

  // Re-render current category to update the points display
  if (currentCategory === "extra") {
    renderAchievements(currentCategory);
  }
}

function updateCertificationCircle(achievementId) {
  // Find the circle achievement
  const circleAchievement = achievementsData.extra.find(
    (item) => item.id === achievementId
  );
  if (!circleAchievement) return;

  // Get current values from dropdowns (try both card and cart versions)
  const certSelect =
    document.getElementById(`circleCertSelect_${achievementId}`) ||
    document.getElementById(`cartCircleCertSelect_${achievementId}`);
  const sizeSelect =
    document.getElementById(`circleSizeSelect_${achievementId}`) ||
    document.getElementById(`cartCircleSizeSelect_${achievementId}`);
  const reservistsSelect =
    document.getElementById(`reservistsSelect_${achievementId}`) ||
    document.getElementById(`cartReservistsSelect_${achievementId}`);

  if (!certSelect || !sizeSelect || !reservistsSelect) return;

  const selectedCertId = certSelect.value;
  const circleSize = sizeSelect.value;
  const reservists = reservistsSelect.value;

  // Calculate points
  let totalPoints = 0;

  // Both certification and circle size are required
  if (selectedCertId && circleSize) {
    const selectedCert = achievementsData.tech.find(
      (item) => item.id === parseInt(selectedCertId)
    );
    if (selectedCert) {
      let basePoints = selectedCert.points;

      // Add circle size bonus
      const sizeBonus = {
        3: 0.08, // 8%
        4: 0.1, // 10%
        5: 0.13, // 13%
        6: 0.17, // 17%
        7: 0.22, // 22%
      };

      let multiplier = 1 + (sizeBonus[circleSize] || 0);

      // Add reservist bonus
      if (reservists === "1") {
        multiplier += 0.05; // +5%
      } else if (reservists === "2") {
        multiplier += 0.1; // +10%
      }

      totalPoints = Math.round(basePoints * multiplier);
    }
  }

  // Update the achievement
  circleAchievement.selectedCertification = selectedCertId
    ? parseInt(selectedCertId)
    : null;
  circleAchievement.circleSize = circleSize || null;
  circleAchievement.reservists = reservists;
  circleAchievement.points = totalPoints;

  // Update cart item if it exists
  const cartItemIndex = cartItems.findIndex(
    (item) => item.id === achievementId
  );
  if (cartItemIndex !== -1) {
    cartItems[cartItemIndex].selectedCertification =
      circleAchievement.selectedCertification;
    cartItems[cartItemIndex].circleSize = circleAchievement.circleSize;
    cartItems[cartItemIndex].reservists = circleAchievement.reservists;
    cartItems[cartItemIndex].points = totalPoints;
    updateCartDisplay();
    updateMenuCartSummary();

    // Re-validate level if a level is selected
    const levelSelect = document.getElementById("levelSelect");
    if (levelSelect && levelSelect.value) {
      validateLevel();
    }
  }

  // Re-render current category to update the points display
  if (currentCategory === "extra") {
    renderAchievements(currentCategory);
  }
}

let currentDetailsId = null;

function showDetails(achievementId) {
  const achievement = findAchievementById(achievementId);
  if (!achievement) return;

  currentDetailsId = achievementId;

  // Determine if this is a tech achievement
  const isTech =
    achievementsData.tech &&
    achievementsData.tech.some((item) => item.id === achievementId);

  // Determine if this is a roadmap achievement (IDs 301-308)
  const isRoadmap = achievementId >= 301 && achievementId <= 308;

  const detailsIcon = document.getElementById("detailsIcon");
  if (achievement.icon.startsWith("http") || achievement.icon.includes(".")) {
    detailsIcon.innerHTML = `<img src="${achievement.icon}" alt="${achievement.title}" style="width: 100%; height: 100%; object-fit: contain;">`;
  } else {
    detailsIcon.textContent = achievement.icon;
  }

  document.getElementById("detailsCertTitle").textContent = achievement.title;

  // Hide provider for roadmaps, show for others
  const providerElement = document.getElementById("detailsProvider");
  if (isRoadmap) {
    providerElement.style.display = "none";
  } else {
    providerElement.style.display = "block";
    providerElement.textContent = achievement.provider;
  }

  const displayPoints = achievement.promoted
    ? Math.round(achievement.points * 1.1)
    : achievement.points;
  document.getElementById(
    "detailsPoints"
  ).textContent = `${displayPoints} points`;

  // Handle description differently for roadmaps
  const descriptionElement = document.getElementById("detailsDescription");
  if (isRoadmap) {
    // Show list of certifications instead of description
    let roadmapCerts = [];

    if (achievementId === 301) {
      // DevOps & Cloud Associate
      roadmapCerts = [
        {
          id: 36,
          title: "HashiCorp Terraform Associate",
          icon: "https://images.credly.com/size/680x680/images/ed4be915-68f8-428a-b332-40ded9084ee5/blob",
          points: 100,
        },
        {
          isChoice: true,
          choiceTitle: "Cloud Platform Certification (Choose One)",
          options: [
            {
              id: 11,
              title: "AWS Certified Solutions Architect",
              icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Associate_badge.3419559c682629072f1eb968d59dea0741772c0f.png",
              points: 200,
            },
            {
              id: 26,
              title: "GCP Associate Cloud Engineer",
              icon: "https://images.credly.com/size/680x680/images/08096465-cbfc-4c3e-93e5-93c5aa61f23e/image.png",
              points: 250,
            },
          ],
        },
        {
          id: 34,
          title: "CKA - Certified Kubernetes Administrator",
          icon: "https://images.credly.com/size/680x680/images/8b8ed108-e77d-4396-ac59-2504583b9d54/cka_from_cncfsite__281_29.png",
          points: 200,
        },
        {
          id: 42,
          title: "GitHub Actions",
          icon: "https://images.credly.com/size/680x680/images/89efc3e7-842b-4790-b09b-9ea5efc71ec3/image.png",
          points: 125,
        },
      ];
    } else if (achievementId === 302) {
      // DevOps & Cloud Expert
      roadmapCerts = [
        {
          id: 37,
          title: "Terraform Authoring and Operations Professional",
          icon: "https://images.credly.com/size/340x340/images/a4c6650b-58c3-4be5-bdb0-4d1f437d4e40/blob",
          points: 250,
        },
        {
          isChoice: true,
          choiceTitle: "Cloud Platform Certification (Choose One)",
          options: [
            {
              id: 14,
              title: "AWS Certified Solutions Architect Professional",
              icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Professional_badge.69d82ff1b2861e1089539ebba906c70b011b928a.png",
              points: 400,
            },
            {
              id: 29,
              title: "GCP Cloud Architect Professional",
              icon: "https://images.credly.com/size/680x680/images/71c579e0-51fd-4247-b493-d2fa8167157a/image.png",
              points: 400,
            },
          ],
        },
        {
          id: 35,
          title: "CKS - Certified Kubernetes Security Specialist",
          icon: "https://images.credly.com/size/680x680/images/9945dfcb-1cca-4529-85e6-db1be3782210/kubernetes-security-specialist-logo2.png",
          points: 400,
        },
        {
          id: 43,
          title: "GitHub Administration",
          icon: "https://images.credly.com/size/680x680/images/34880f37-8ec8-4542-a78a-73ba6647208e/image.png",
          points: 125,
        },
      ];
    } else if (achievementId === 303) {
      // Multi Cloud Associate
      roadmapCerts = [
        {
          id: 11,
          title: "AWS Certified Solutions Architect",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Associate_badge.3419559c682629072f1eb968d59dea0741772c0f.png",
          points: 200,
        },
        {
          id: 19,
          title: "Azure Administrator Associate",
          icon: "https://img-c.udemycdn.com/open-badges/v2/badge-class/2082659861/azure-administrator-associate-600x60014067246547753667656.png",
          points: 200,
        },
        {
          id: 26,
          title: "GCP Associate Cloud Engineer",
          icon: "https://images.credly.com/size/680x680/images/08096465-cbfc-4c3e-93e5-93c5aa61f23e/image.png",
          points: 250,
        },
      ];
    } else if (achievementId === 304) {
      // Multi Cloud Expert
      roadmapCerts = [
        {
          id: 14,
          title: "AWS Certified Solutions Architect Professional",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Professional_badge.69d82ff1b2861e1089539ebba906c70b011b928a.png",
          points: 400,
        },
        {
          id: 24,
          title: "Azure Solutions Architect Expert",
          icon: "https://kevinhakanson.com/static/3e970253558c410b2fe0d1a7cefa8f3d/0a47e/azure-solutions-architect-expert-600x600.png",
          points: 450,
        },
        {
          id: 29,
          title: "GCP Cloud Architect Professional",
          icon: "https://images.credly.com/size/680x680/images/71c579e0-51fd-4247-b493-d2fa8167157a/image.png",
          points: 400,
        },
      ];
    } else if (achievementId === 305) {
      // GitHub Expert
      roadmapCerts = [
        {
          id: 39,
          title: "GitHub Foundations",
          icon: "https://images.credly.com/size/680x680/images/024d0122-724d-4c5a-bd83-cfe3c4b7a073/image.png",
          points: 50,
        },
        {
          id: 40,
          title: "GitHub Copilot",
          icon: "https://images.credly.com/size/680x680/images/6b924fae-3cd7-4233-b012-97413c62c85d/blob",
          points: 50,
        },
        {
          id: 41,
          title: "GitHub Advanced Security",
          icon: "https://images.credly.com/size/680x680/images/c9ed294b-f8ac-48fa-a8c3-96dab1f110f2/image.png",
          points: 100,
        },
        {
          id: 42,
          title: "GitHub Actions",
          icon: "https://images.credly.com/size/680x680/images/89efc3e7-842b-4790-b09b-9ea5efc71ec3/image.png",
          points: 125,
        },
        {
          id: 43,
          title: "GitHub Administration",
          icon: "https://images.credly.com/size/680x680/images/34880f37-8ec8-4542-a78a-73ba6647208e/image.png",
          points: 125,
        },
      ];
    } else if (achievementId === 306) {
      // K8S Expert
      roadmapCerts = [
        {
          id: 34,
          title: "CKA - Certified Kubernetes Administrator",
          icon: "https://images.credly.com/size/680x680/images/8b8ed108-e77d-4396-ac59-2504583b9d54/cka_from_cncfsite__281_29.png",
          points: 200,
        },
        {
          id: 35,
          title: "CKS - Certified Kubernetes Security Specialist",
          icon: "https://images.credly.com/size/680x680/images/9945dfcb-1cca-4529-85e6-db1be3782210/kubernetes-security-specialist-logo2.png",
          points: 400,
        },
      ];
    } else if (achievementId === 307) {
      // AWS Expert - Pro
      roadmapCerts = [
        {
          id: 14,
          title: "AWS Certified Solutions Architect Professional",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Solutions-Architect-Professional_badge.69d82ff1b2861e1089539ebba906c70b011b928a.png",
          points: 400,
        },
        {
          id: 15,
          title: "AWS Certified DevOps Engineer Professional",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-DevOps-Engineer-Professional_badge.7492bf660b5351e51f3f8015e4818924294a7e8c.png",
          points: 400,
        },
      ];
    } else if (achievementId === 308) {
      // AWS Expert - Specialist
      roadmapCerts = [
        {
          id: 18,
          title: "AWS Certified Security Speciality",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Security-Specialty_badge.75ad1e505c0241bdb321f4c4d9abc51c0109c54f.png",
          points: 350,
        },
        {
          id: 16,
          title: "AWS Certified Advanced Networking Speciality",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Advanced-Networking-Specialty_badge.e09a4e04210dd4dd57ace21344af66986d4b4dc7.png",
          points: 400,
        },
        {
          id: 17,
          title: "AWS Certified Machine Learning Speciality",
          icon: "https://d1.awsstatic.com/training-and-certification/certification-badges/AWS-Certified-Machine-Learning-Specialty_badge.e5d66b56552bbf046f905bacaecef6dad0ae7180.png",
          points: 400,
        },
      ];
    }

    // Calculate actual cert count (choices count as 1)
    const actualCertCount =
      roadmapCerts.filter((cert) => !cert.isChoice).length +
      roadmapCerts.filter((cert) => cert.isChoice).length;

    const certificationsList = `
            <div style="margin-bottom: 1rem;">
                <h4 style="color: var(--text-primary); margin-bottom: 1rem; font-size: 1.1rem; font-weight: 600;">
                    📋 Required Certifications (${actualCertCount})
                </h4>
            </div>
            <div style="display: grid; gap: 0.75rem;">
                ${roadmapCerts
                  .map((cert, index) => {
                    if (cert.isChoice) {
                      // Handle choice section
                      return `
                            <div style="background: var(--glass-elevated); border: 2px dashed var(--accent-color); border-radius: 0.75rem; padding: 1rem; margin: 0.5rem 0;">
                                <div style="text-align: center; margin-bottom: 0.75rem;">
                                    <h5 style="color: var(--accent-color); font-size: 0.85rem; font-weight: 600; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                        ${cert.choiceTitle}
                                    </h5>
                                </div>
                                <div style="display: grid; gap: 0.5rem;">
                                    ${cert.options
                                      .map(
                                        (option, optIndex) => `
                                        <div onclick="showDetails(${
                                          option.id
                                        })" style="
                                            display: flex; 
                                            align-items: center; 
                                            gap: 0.75rem; 
                                            padding: 0.75rem; 
                                            background: var(--glass-surface); 
                                            border: 1px solid var(--glass-border); 
                                            border-radius: 0.5rem; 
                                            cursor: pointer; 
                                            transition: all 0.2s ease;
                                            position: relative;
                                        " 
                                        onmouseover="this.style.background='var(--glass-hover)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                                        onmouseout="this.style.background='var(--glass-surface)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                            ${
                                              optIndex === 1
                                                ? `<div style="position: absolute; top: -8px; left: 50%; transform: translateX(-50%); background: var(--warning-color); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 600; z-index: 1;">OR</div>`
                                                : ""
                                            }
                                            <div style="
                                                width: 35px; 
                                                height: 35px; 
                                                border-radius: 0.4rem; 
                                                overflow: hidden; 
                                                flex-shrink: 0;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                background: var(--glass-light);
                                            ">
                                                <img src="${
                                                  option.icon
                                                }" alt="${
                                          option.title
                                        }" style="width: 100%; height: 100%; object-fit: contain;">
                                            </div>
                                            <div style="flex: 1; min-width: 0;">
                                                <div style="font-weight: 600; color: var(--text-primary); font-size: 0.85rem; margin-bottom: 0.2rem;">
                                                    ${option.title}
                                                </div>
                                                <div style="color: var(--text-secondary); font-size: 0.75rem;">
                                                    ${option.points} points
                                                </div>
                                            </div>
                                            <div style="color: var(--accent-color); font-size: 1rem;">→</div>
                                        </div>
                                    `
                                      )
                                      .join("")}
                                </div>
                            </div>
                        `;
                    } else {
                      // Handle regular certification
                      return `
                            <div onclick="showDetails(${cert.id})" style="
                                display: flex; 
                                align-items: center; 
                                gap: 0.75rem; 
                                padding: 0.75rem; 
                                background: var(--glass-surface); 
                                border: 1px solid var(--glass-border); 
                                border-radius: 0.5rem; 
                                cursor: pointer; 
                                transition: all 0.2s ease;
                                hover: transform: translateY(-1px);
                            " 
                            onmouseover="this.style.background='var(--glass-hover)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                            onmouseout="this.style.background='var(--glass-surface)'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                                <div style="
                                    width: 40px; 
                                    height: 40px; 
                                    border-radius: 0.4rem; 
                                    overflow: hidden; 
                                    flex-shrink: 0;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    background: var(--glass-light);
                                ">
                                    <img src="${cert.icon}" alt="${cert.title}" style="width: 100%; height: 100%; object-fit: contain;">
                                </div>
                                <div style="flex: 1; min-width: 0;">
                                    <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem; margin-bottom: 0.2rem;">
                                        ${cert.title}
                                    </div>
                                    <div style="color: var(--text-secondary); font-size: 0.8rem;">
                                        ${cert.points} points
                                    </div>
                                </div>
                                <div style="color: var(--accent-color); font-size: 1.2rem;">→</div>
                            </div>
                        `;
                    }
                  })
                  .join("")}
            </div>
            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--glass-light); border-radius: 0.5rem; border-left: 3px solid var(--success-color);">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    <strong style="color: var(--success-color);">Total Points:</strong> ${(() => {
                      // Check if this roadmap has choices
                      const hasChoices = roadmapCerts.some(
                        (cert) => cert.isChoice
                      );
                      if (hasChoices) {
                        // Calculate min/max points for choice roadmaps
                        let basePoints = roadmapCerts
                          .filter((cert) => !cert.isChoice)
                          .reduce((sum, cert) => sum + cert.points, 0);
                        let choicePoints = [];
                        roadmapCerts
                          .filter((cert) => cert.isChoice)
                          .forEach((choice) => {
                            choicePoints.push(
                              ...choice.options.map((opt) => opt.points)
                            );
                          });
                        const minChoice = Math.min(...choicePoints);
                        const maxChoice = Math.max(...choicePoints);
                        const minTotal = basePoints + minChoice;
                        const maxTotal = basePoints + maxChoice;
                        return minTotal === maxTotal
                          ? `${minTotal}`
                          : `${minTotal}/${maxTotal}`;
                      } else {
                        // Calculate exact points for non-choice roadmaps
                        return roadmapCerts.reduce(
                          (sum, cert) => sum + cert.points,
                          0
                        );
                      }
                    })()} + ${achievement.points} roadmap badge
                </div>
            </div>
        `;

    descriptionElement.innerHTML = certificationsList;
  } else {
    // Convert newlines to HTML line breaks for proper display
    descriptionElement.innerHTML = achievement.description.replace(
      /\n/g,
      "<br>"
    );
  }

  // Hide description header for roadmaps, show for others
  const descriptionHeader = document.querySelector(".details-description h4");
  if (isRoadmap) {
    if (descriptionHeader) {
      descriptionHeader.style.display = "none";
    }
  } else {
    if (descriptionHeader) {
      descriptionHeader.style.display = "block";
    }
  }

  // Show specs and skills only for tech items
  const specsSection = document.querySelector(".details-specs");
  const skillsSection = document.querySelector(".details-skills");

  if (isTech) {
    if (specsSection) {
      specsSection.style.display = "grid";
    }
    if (skillsSection) skillsSection.style.display = "block";

    // Only populate these fields for tech items
    document.getElementById("detailsDuration").textContent =
      achievement.duration || "N/A";
    document.getElementById("detailsPrice").textContent =
      achievement.price || "N/A";
    document.getElementById("detailsPassingGrade").textContent =
      achievement.passingGrade || "N/A";

    // Populate new certification details
    document.getElementById("detailsExamCode").textContent =
      achievement.examCode || "N/A";
    document.getElementById("detailsQuestionCount").textContent =
      achievement.questionCount || "N/A";
    document.getElementById("detailsQuestionTypes").textContent =
      achievement.questionTypes || "N/A";
    document.getElementById("detailsProctored").textContent =
      achievement.proctored
        ? "Yes"
        : achievement.proctored === false
        ? "No"
        : "N/A";
    document.getElementById("detailsValidity").textContent =
      achievement.validity || "N/A";
    // Handle prerequisites - only show mandatory requirements
    const prerequisitesText = achievement.prerequisites || "N/A";
    let filteredPrerequisites = prerequisitesText;

    if (prerequisitesText && prerequisitesText !== "N/A") {
      // Remove recommended experience mentions
      if (
        prerequisitesText.toLowerCase().includes("none") &&
        (prerequisitesText.toLowerCase().includes("recommended") ||
          prerequisitesText.toLowerCase().includes("experience"))
      ) {
        filteredPrerequisites = "None";
      }
    }

    document.getElementById("detailsPrerequisites").textContent =
      filteredPrerequisites;
    document.getElementById("detailsRetakePolicy").textContent =
      achievement.retakePolicy || "N/A";

    // Handle official URL
    const officialUrlElement = document.getElementById("detailsOfficialUrl");
    if (achievement.officialUrl) {
      officialUrlElement.innerHTML = `<a href="${achievement.officialUrl}" target="_blank" rel="noopener">📖 View Official Details →</a>`;
    } else {
      officialUrlElement.textContent = "Not Available";
    }

    const skillsList = document.getElementById("detailsSkills");
    skillsList.innerHTML = achievement.skills
      .map((skill) => `<span class="skill-tag">${skill}</span>`)
      .join("");
  } else {
    if (specsSection) {
      specsSection.style.setProperty("display", "none", "important");
    }
    if (skillsSection) {
      skillsSection.style.setProperty("display", "none", "important");
    }
  }

  // Reset scroll position to top
  const modalContent = document.querySelector(".details-content");
  if (modalContent) {
    modalContent.scrollTop = 0;
  }

  document.getElementById("detailsOverlay").classList.add("active");
  document.getElementById("detailsModal").classList.add("active");
}

function closeDetails() {
  document.getElementById("detailsOverlay").classList.remove("active");
  document.getElementById("detailsModal").classList.remove("active");
  currentDetailsId = null;
}

// Typing animation for DCR title
function startTypingAnimation() {
  const typedTextElement = document.getElementById("typedText");
  const textToType = " 2.0";
  let currentIndex = 0;
  let isTyping = true;

  function typeNextCharacter() {
    if (isTyping) {
      if (currentIndex < textToType.length) {
        typedTextElement.textContent = textToType.substring(
          0,
          currentIndex + 1
        );
        currentIndex++;
        setTimeout(typeNextCharacter, 500); // 500ms between each character
      } else {
        // Finished typing, wait a bit then start deleting
        setTimeout(() => {
          isTyping = false;
          deleteNextCharacter();
        }, 4000); // Wait 4 seconds before deleting
      }
    }
  }

  function deleteNextCharacter() {
    if (!isTyping) {
      if (currentIndex > 0) {
        currentIndex--;
        typedTextElement.textContent = textToType.substring(0, currentIndex);
        setTimeout(deleteNextCharacter, 200); // 200ms between each deletion
      } else {
        // Finished deleting, wait a bit then start typing again
        setTimeout(() => {
          isTyping = true;
          typeNextCharacter();
        }, 1000); // Wait 1 second before typing again
      }
    }
  }

  // Start the animation
  typeNextCharacter();
}

function scrollPromotedCarousel(direction) {
  const carousel = document.getElementById("promotedCarousel");
  if (carousel) {
    const scrollAmount = 300;
    carousel.scrollTo({
      left: carousel.scrollLeft + direction * scrollAmount,
      behavior: "smooth",
    });
  }
}

function toggleFAQ(faqId) {
  const answerElement = document.getElementById(`faq-answer-${faqId}`);
  const iconElement = document.getElementById(`faq-icon-${faqId}`);
  
  if (answerElement && iconElement) {
    const isVisible = answerElement.style.display !== "none";
    
    if (isVisible) {
      answerElement.style.display = "none";
      iconElement.textContent = "+";
      iconElement.style.transform = "rotate(0deg)";
    } else {
      answerElement.style.display = "block";
      iconElement.textContent = "−";
      iconElement.style.transform = "rotate(180deg)";
    }
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await loadAchievements();
  renderAchievements(currentCategory);
  updateMenuCartSummary();
  startTypingAnimation();
});
