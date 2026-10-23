const form = document.querySelector("#guide-form");
const errorBox = document.querySelector("#form-error");
const statusBox = document.querySelector("#request-status");
const results = document.querySelector("#results");
const sectionsContainer = document.querySelector("#guide-sections");
const overviewContainer = document.querySelector("#guide-overview");
const submitButton = form.querySelector('button[type="submit"]');
const fieldPopover = document.querySelector("#field-popover");

document.querySelector("#dismiss-popover").addEventListener("click", () => {
  fieldPopover.hidden = true;
});

const sectionLabels = {
  profile: ["Your profile", "◎"],
  assessment: ["Starting point & safety", "✳"],
  transformation_roadmap: ["Your roadmap", "↗"],
  workout_plan: ["Workout plan", "◌"],
  nutrition_plan: ["Nutrition plan", "◍"],
  grocery_list: ["Grocery list", "▤"],
  progress_tracker: ["Progress tracker", "↗"],
  lifestyle_habits: ["Everyday habits", "✳"],
  first_seven_days_checklist: ["Your first seven days", "✓"],
  disclaimers: ["Important notes", "◇"],
  follow_up_questions: ["Questions to consider", "?"],
};

const wideSections = new Set([
  "transformation_roadmap",
  "workout_plan",
  "nutrition_plan",
  "grocery_list",
  "progress_tracker",
  "first_seven_days_checklist",
]);

const preferredTitles = [
  "day", "session_name", "name", "meal_name", "timeframe", "category",
  "objective",
];

function isInternalField(key) {
  return /^(?:id|.*[_-]id)$/i.test(key) || /(?:Id|ID)$/.test(key);
}

function humanize(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDisplayText(value) {
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(value)) {
    return humanize(value);
  }
  return value;
}

function titleFor(object, index) {
  for (const key of preferredTitles) {
    if (object[key] !== null && object[key] !== undefined && object[key] !== "") {
      const title = typeof object[key] === "object"
        ? stringify(object[key])
        : formatDisplayText(String(object[key]));
      if (key === "day" && typeof object[key] === "number") return `Day ${title}`;
      return title;
    }
  }
  return `Item ${index + 1}`;
}

function stringify(value) {
  if (value === null || value === undefined || value === "") return "Not specified";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderValue(value, label, index = 0) {
  if (value === null || value === undefined || value === "") {
    const empty = document.createElement("span");
    empty.className = "empty-value";
    empty.textContent = "Not specified";
    return empty;
  }

  if (typeof value === "boolean") {
    const pill = document.createElement("span");
    pill.className = `bool-pill${value ? "" : " no"}`;
    pill.textContent = value ? "Yes" : "No";
    return pill;
  }

  if (Array.isArray(value)) {
    if (!value.length) {
      const empty = document.createElement("span");
      empty.className = "empty-value";
      empty.textContent = "None noted";
      return empty;
    }
    const list = document.createElement("ul");
    list.className = "data-list";
    value.forEach((item, itemIndex) => {
      const listItem = document.createElement("li");
      if (item !== null && typeof item === "object") {
        listItem.classList.add("object-list-item");
        listItem.append(renderObject(item, titleFor(item, itemIndex)));
      } else {
        const text = stringify(item);
        listItem.textContent = formatDisplayText(text);
      }
      list.append(listItem);
    });
    return list;
  }

  if (typeof value === "object") return renderObject(value, null);

  const text = document.createElement("span");
  text.textContent = formatDisplayText(String(value));
  return text;
}

function renderObject(object, title) {
  const card = document.createElement("div");
  card.className = "data-card";

  if (title) {
    const heading = document.createElement("h4");
    heading.className = "data-card-title";
    heading.textContent = title;
    card.append(heading);
  }

  const entries = Object.entries(object).filter(([key]) => !isInternalField(key));
  const unit = object.unit;
  const unitValueKey = unit
    ? ["quantity", "target_value", "value"].find((candidate) =>
      entries.some(([key, value]) => key === candidate && value !== null && value !== undefined && value !== ""),
    )
    : undefined;

  entries.forEach(([key, value]) => {
    if (key === "unit" && unitValueKey) return;

    const row = document.createElement("div");
    row.className = "data-row";
    const label = document.createElement("span");
    label.className = "data-label";
    label.textContent = humanize(key);
    const content = document.createElement("div");
    content.className = "data-value";
    content.append(renderValue(value, key));
    if (key === unitValueKey) {
      const unitLabel = document.createElement("span");
      unitLabel.className = "inline-unit";
      unitLabel.textContent = unit;
      content.classList.add("value-with-unit");
      content.append(unitLabel);
    }
    row.append(label, content);
    card.append(row);
  });
  return card;
}

function makeOverviewCard(label, value) {
  const card = document.createElement("div");
  card.className = "overview-card";
  const caption = document.createElement("span");
  caption.className = "overview-label";
  caption.textContent = label;
  const text = document.createElement("span");
  text.className = "overview-value";
  text.textContent = value;
  card.append(caption, text);
  return card;
}

function displayMeasure(measure) {
  if (!measure || typeof measure !== "object" || measure.value == null) return "—";
  return `${measure.value}${measure.unit ? ` ${measure.unit}` : ""}`;
}

function renderGuide(guide) {
  window.currentGuide = guide;
  overviewContainer.replaceChildren();
  sectionsContainer.replaceChildren();

  const profile = guide.profile || {};
  const workoutPlan = guide.workout_plan || {};
  const nutrition = guide.nutrition_plan || {};
  const targets = nutrition.daily_targets || {};
  overviewContainer.append(
    makeOverviewCard("Starting weight", displayMeasure(profile.current_weight)),
    makeOverviewCard("Target weight", displayMeasure(profile.target_weight)),
    makeOverviewCard("Timeframe", displayMeasure(profile.target_timeframe)),
    makeOverviewCard("Weekly sessions", String(
      Array.isArray(workoutPlan.weekly_overview)
        ? workoutPlan.weekly_overview.filter((day) => day.session_id).length
        : "—",
    )),
  );
  const calorieCard = makeOverviewCard(
    "Daily calorie estimate",
    targets.calories ? displayMeasure(targets.calories) : "See nutrition plan",
  );
  overviewContainer.append(calorieCard);

  const count = Object.keys(guide).filter(
    (key) => !["schema_version", "guide_status"].includes(key) && !isInternalField(key),
  ).length;
  document.querySelector("#results-summary").textContent =
    `${count} personalized sections · ${guide.guide_status === "complete" ? "Complete guide" : humanize(guide.guide_status || "Guide")}`;

  Object.entries(guide).forEach(([key, value]) => {
    if (key === "schema_version" || key === "guide_status") return;
    const [title, icon] = sectionLabels[key] || [humanize(key), "•"];
    const details = document.createElement("details");
    details.className = `section-card${wideSections.has(key) ? " wide" : ""}`;
    details.open = ["assessment", "transformation_roadmap"].includes(key);

    const summary = document.createElement("summary");
    const heading = document.createElement("div");
    heading.className = "section-heading";
    const symbol = document.createElement("span");
    symbol.className = "section-icon";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = icon;
    const headingText = document.createElement("h3");
    headingText.textContent = title;
    heading.append(symbol, headingText);
    const countText = document.createElement("span");
    countText.className = "section-count";
    countText.textContent = Array.isArray(value)
      ? `${value.length} ${value.length === 1 ? "item" : "items"}`
      : "PERSONALIZED";
    summary.append(heading, countText);

    const body = document.createElement("div");
    body.className = "section-body";
    const rendered = renderValue(value, key);
    if (rendered.classList.contains("data-card") || rendered.classList.contains("data-list")) {
      const grid = document.createElement("div");
      grid.className = `data-grid${wideSections.has(key) ? " single" : ""}`;
      grid.append(rendered);
      body.append(grid);
    } else {
      body.append(rendered);
    }
    details.append(summary, body);
    sectionsContainer.append(details);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.hidden = true;
  statusBox.hidden = false;
  statusBox.className = "request-status loading-overlay";
  statusBox.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Building a guide around your goals and routine…</span>';
  submitButton.disabled = true;
  submitButton.querySelector("span:first-child").textContent = "Creating your guide…";

  const payload = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "We could not generate your guide. Please try again.");
    }
    if (!data || Array.isArray(data) || typeof data !== "object") {
      throw new Error("The generated guide was not in the expected format. Please try again.");
    }
    renderGuide(data);
    results.hidden = false;
    statusBox.hidden = true;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    statusBox.hidden = true;
    errorBox.textContent = error instanceof TypeError
      ? "We could not reach the server. Check that the Flask app is running and try again."
      : error.message;
    errorBox.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span:first-child").textContent = "Make my guide";
  }
});

document.querySelector("#download-guide").addEventListener("click", () => {
  if (!window.currentGuide) return;
  const blob = new Blob([JSON.stringify(window.currentGuide, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fitness-guide.json";
  link.click();
  URL.revokeObjectURL(url);
});
