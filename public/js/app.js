const CATEGORIES = [
  { key: "Hårdvara",   label: "Hårdvara" },
  { key: "Mjukvara",   label: "Mjukvara" },
  { key: "Kontohantering", label: "Kontohantering" },
  { key: "Nätverk",    label: "Nätverk" },
  { key: "Telefoni",   label: "Telefoni" },
  { key: "Annat",   label: "Annat" },
];

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function createPanel(technicians) {
  let selectedCategory = null;
  let state = "idle";

  const panel = document.createElement("div");
  panel.className = "panel";

  const techSelect = document.createElement("select");
  techSelect.className = "tech-select";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Välj tekniker…";
  placeholder.disabled = true;
  placeholder.selected = true;
  techSelect.appendChild(placeholder);
  technicians.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.name;
    techSelect.appendChild(opt);
  });
  panel.appendChild(techSelect);

  const categoryList = document.createElement("div");
  categoryList.className = "category-list";

  CATEGORIES.forEach(({ key, label }) => {
    const catBtn = document.createElement("button");
    catBtn.className = "category-btn";
    catBtn.textContent = label;
    catBtn.addEventListener("click", () => {
      if (state === "running") return;
      if (selectedCategory === key) {
        catBtn.classList.remove("active");
        selectedCategory = null;
        startBtn.disabled = true;
      } else {
        categoryList.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
        catBtn.classList.add("active");
        selectedCategory = key;
        startBtn.disabled = !techSelect.value;
      }
    });
    categoryList.appendChild(catBtn);
  });
  panel.appendChild(categoryList);

  const timerDisplay = document.createElement("div");
  timerDisplay.className = "timer-display";
  timerDisplay.textContent = "0:00";
  panel.appendChild(timerDisplay);

  const startBtn = document.createElement("button");
  startBtn.className = "start-btn";
  startBtn.textContent = "Starta";
  startBtn.disabled = true;
  panel.appendChild(startBtn);

  const timer = new Timer(seconds => {
    timerDisplay.textContent = formatTime(seconds);
  });

  techSelect.addEventListener("change", () => {
    if (selectedCategory) startBtn.disabled = false;
  });

  startBtn.addEventListener("click", async () => {
    if (state === "idle") {
      state = "running";
      startBtn.textContent = "Stoppa";
      startBtn.classList.add("running");
      techSelect.disabled = true;
      categoryList.querySelectorAll(".category-btn").forEach(b => b.disabled = true);
      timer.start();
    } else {
      const seconds = timer.stop();
      await Storage.saveEntry(Number(techSelect.value), selectedCategory, seconds);

      state = "idle";
      selectedCategory = null;
      timerDisplay.textContent = "0:00";
      startBtn.textContent = "Starta";
      startBtn.classList.remove("running");
      startBtn.disabled = true;
      techSelect.disabled = false;
      categoryList.querySelectorAll(".category-btn").forEach(b => {
        b.disabled = false;
        b.classList.remove("active");
      });
    }
  });

  return panel;
}

async function init() {
  const root = document.getElementById("root");
  Stats.init(root);
  const technicians = await Storage.getTechnicians();
  root.appendChild(createPanel(technicians));
}

init();