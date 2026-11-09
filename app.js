// ---------- Данные ----------
const STORAGE_KEY = "flashcards-v1";

const defaultWords = [
  { id: 1, term: "apple", def: "яблоко", known: false },
  { id: 2, term: "book", def: "книга", known: false },
  { id: 3, term: "water", def: "вода", known: false },
];

let words = load();
let queue = [];          // id карточек, которые ещё не выучены в этом проходе
let swapped = false;     // false: слово -> перевод, true: перевод -> слово

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch (e) {}
  return defaultWords;
}
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

// ---------- Элементы ----------
const $ = (id) => document.getElementById(id);
const card = $("card");

// ---------- Вкладки ----------
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach((v) => v.classList.toggle("hidden", v.id !== tab.dataset.view));
    if (tab.dataset.view === "study") buildQueue(false);
    else renderList();
  });
});

// ---------- Обучение ----------
function buildQueue(resetKnown) {
  if (resetKnown) words.forEach((w) => (w.known = false));
  queue = words.filter((w) => !w.known).map((w) => w.id);
  save();
  showCard();
}

function currentWord() {
  return words.find((w) => w.id === queue[0]);
}

function showCard() {
  card.classList.remove("flipped");
  const total = words.length;
  const knownCount = words.filter((w) => w.known).length;

  if (total === 0) return showMessage("Пока нет слов", "Добавьте их на вкладке «Слова».");
  if (queue.length === 0) return showMessage("Всё выучено!", "Нажмите «Начать заново», чтобы повторить.");

  setActions(true);
  const w = currentWord();
  $("front-text").textContent = swapped ? w.def : w.term;
  $("back-text").textContent = swapped ? w.term : w.def;
  $("progress").textContent = `Выучено: ${knownCount} из ${total}`;
}

function showMessage(title, text) {
  setActions(false);
  $("front-text").innerHTML = `<div class="done"><strong>${title}</strong><span style="font-size:1rem;font-weight:400;color:var(--muted)">${text}</span></div>`;
  $("back-text").textContent = "";
  $("progress").textContent = `Выучено: ${words.filter((w) => w.known).length} из ${words.length}`;
}

function setActions(on) {
  $("btn-know").disabled = !on;
  $("btn-again").disabled = !on;
}

function flip() {
  if (queue.length) card.classList.toggle("flipped");
}

function answer(knew) {
  if (!queue.length) return;
  const id = queue.shift();
  if (knew) words.find((w) => w.id === id).known = true;
  else queue.push(id); // вернём в конец очереди
  save();
  showCard();
}

function shuffle() {
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  showCard();
}

card.addEventListener("click", flip);
$("btn-know").addEventListener("click", () => answer(true));
$("btn-again").addEventListener("click", () => answer(false));
$("btn-shuffle").addEventListener("click", shuffle);
$("btn-restart").addEventListener("click", () => buildQueue(true));
$("btn-swap").addEventListener("click", () => { swapped = !swapped; showCard(); });

document.addEventListener("keydown", (e) => {
  if (document.querySelector("#study").classList.contains("hidden")) return;
  if (e.code === "Space") { e.preventDefault(); flip(); }
  if (e.code === "ArrowRight") answer(true);
  if (e.code === "ArrowLeft") answer(false);
});

// ---------- Управление словами ----------
$("add-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const term = $("in-term").value.trim();
  const def = $("in-def").value.trim();
  if (!term || !def) return;
  words.push({ id: Date.now(), term, def, known: false });
  save();
  e.target.reset();
  $("in-term").focus();
  renderList();
});

function renderList() {
  const ul = $("word-list");
  ul.innerHTML = "";
  if (!words.length) {
    ul.innerHTML = '<li class="empty">Список пуст</li>';
    return;
  }
  words.forEach((w) => {
    const li = document.createElement("li");
    if (w.known) li.className = "known";
    const pair = document.createElement("div");
    pair.className = "pair";
    const b = document.createElement("b");
    b.textContent = w.term;
    const s = document.createElement("span");
    s.textContent = w.def;
    pair.append(b, s);
    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "×";
    del.setAttribute("aria-label", "Удалить " + w.term);
    del.addEventListener("click", () => {
      words = words.filter((x) => x.id !== w.id);
      save();
      renderList();
    });
    li.append(pair, del);
    ul.append(li);
  });
}

// ---------- Экспорт / импорт ----------
$("btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "words.json";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("file-import").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error();
    const have = new Set(words.map((w) => w.term.toLowerCase()));
    const fresh = data
      .filter((w) => w.term && w.def && !have.has(String(w.term).toLowerCase()))
      .map((w, i) => ({ id: Date.now() + i, term: String(w.term), def: String(w.def), known: !!w.known }));
    words = words.concat(fresh);
    alert(`Добавлено слов: ${fresh.length}`);
    save();
    renderList();
  } catch (err) {
    alert("Не удалось прочитать файл. Нужен JSON, который скачан из этого приложения.");
  }
  e.target.value = "";
});

// ---------- Старт ----------
buildQueue(false);