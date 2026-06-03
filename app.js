(function () {
  const STORAGE = {
    custom: "jlpt-review.customWords.v1",
    deleted: "jlpt-review.deletedBaseIds.v1",
    progress: "jlpt-review.progress.v1",
    history: "jlpt-review.history.v1",
  };

  const levelOrder = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5, CUSTOM: 6 };
  const levelLabels = { N1: "N1", N2: "N2", N3: "N3", N4: "N4", N5: "N5", CUSTOM: "自定义" };
  const kanaMap = [
    ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"], ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
    ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"], ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
    ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"], ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
    ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"], ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
    ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"], ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
    ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"], ["ファ", "fa"], ["フィ", "fi"], ["フェ", "fe"], ["フォ", "fo"],
    ["ウィ", "wi"], ["ウェ", "we"], ["ウォ", "wo"], ["ティ", "ti"], ["ディ", "di"], ["チェ", "che"],
    ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"], ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
    ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"], ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
    ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"], ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
    ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"], ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
    ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"], ["わ", "wa"], ["を", "wo"], ["ん", "n"],
    ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"], ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
    ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"], ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
    ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
  ];

  const state = {
    baseWords: [],
    words: [],
    session: [],
    currentIndex: 0,
    answered: new Map(),
    searchPage: 1,
    selectedIds: new Set(),
    autoAdvanceTimer: null,
  };

  const $ = (id) => document.getElementById(id);
  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    await loadWords();
    renderAll();
  }

  function cacheElements() {
    [
      "librarySummary", "searchInput", "levelFilter", "typeFilter", "statusFilter", "resultsList", "resultCount", "resultHint",
      "pageSize", "customPageSizeWrap", "customPageSize", "jumpPage", "selectedCount",
      "studyLevel", "studyScope", "studyCount", "customCountWrap", "customCount", "studyOrder", "studyDirection", "studyPoolHint",
      "studyCard", "sessionProgress", "cardLevel", "promptLabel", "promptText", "promptSubtext", "options", "answerDetail",
      "addLevel", "addWord", "addKana", "addPos", "addAccent", "addMeaning", "addHint", "bulkInput", "bulkHint",
      "learnedCount", "dueCount", "accuracyRate", "streakDays", "levelStats", "historyList",
    ].forEach((id) => { els[id] = $(id); });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });
    ["searchInput", "levelFilter", "typeFilter", "statusFilter"].forEach((id) => {
      els[id].addEventListener("input", () => {
        state.searchPage = 1;
        state.selectedIds.clear();
        renderSearch();
      });
    });
    $("pageSize").addEventListener("change", () => {
      els.customPageSizeWrap.classList.toggle("hidden", els.pageSize.value !== "custom");
      state.searchPage = 1;
      renderSearch();
    });
    $("customPageSize").addEventListener("input", () => {
      state.searchPage = 1;
      renderSearch();
    });
    document.querySelectorAll(".page-prev").forEach((btn) => btn.addEventListener("click", () => changeSearchPage(-1)));
    document.querySelectorAll(".page-next").forEach((btn) => btn.addEventListener("click", () => changeSearchPage(1)));
    $("jumpPageBtn").addEventListener("click", jumpToPage);
    $("jumpPage").addEventListener("keydown", (event) => {
      if (event.key === "Enter") jumpToPage();
    });
    $("backToTopBtn").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    $("selectPageBtn").addEventListener("click", selectCurrentPage);
    $("clearSelectionBtn").addEventListener("click", () => {
      state.selectedIds.clear();
      renderSearch();
    });
    $("deleteSelectedBtn").addEventListener("click", deleteSelectedWords);
    $("clearSearchBtn").addEventListener("click", () => {
      els.searchInput.value = "";
      els.levelFilter.value = "all";
      els.typeFilter.value = "all";
      els.statusFilter.value = "all";
      renderSearch();
    });
    $("studyCount").addEventListener("change", () => {
      els.customCountWrap.classList.toggle("hidden", els.studyCount.value !== "custom");
      updateStudyPoolHint();
    });
    ["studyLevel", "studyScope", "customCount", "studyOrder"].forEach((id) => els[id].addEventListener("input", updateStudyPoolHint));
    $("startStudyBtn").addEventListener("click", startStudy);
    $("resetSessionBtn").addEventListener("click", resetSession);
    $("prevCardBtn").addEventListener("click", prevCard);
    $("nextCardBtn").addEventListener("click", nextCard);
    $("showAnswerBtn").addEventListener("click", showAnswer);
    $("speakBtn").addEventListener("click", () => speak(currentWord()?.word || ""));
    $("starBtn").addEventListener("click", () => toggleStar(currentWord()?.id));
    $("addWordBtn").addEventListener("click", addSingleWord);
    $("importBulkBtn").addEventListener("click", importBulkWords);
    $("loadSampleBtn").addEventListener("click", loadSampleJson);
    $("exportLibraryBtn").addEventListener("click", exportLibrary);
    $("clearCustomBtn").addEventListener("click", clearCustomWords);
    $("deleteLevelBtn").addEventListener("click", deleteLevelWords);
    $("restoreDeletedBtn").addEventListener("click", restoreDeletedBaseWords);
    $("exportProgressBtn").addEventListener("click", exportProgress);
    $("importProgressInput").addEventListener("change", importProgress);
    $("resetProgressBtn").addEventListener("click", resetProgress);
    let touchStartX = 0;
    els.resultsList.addEventListener("touchstart", (event) => {
      touchStartX = event.touches[0]?.clientX || 0;
    }, { passive: true });
    els.resultsList.addEventListener("touchend", (event) => {
      const endX = event.changedTouches[0]?.clientX || 0;
      const diff = endX - touchStartX;
      if (Math.abs(diff) > 80) changeSearchPage(diff > 0 ? -1 : 1);
    }, { passive: true });
  }

  async function loadWords() {
    if (Array.isArray(window.DEFAULT_VOCAB)) {
      state.baseWords = window.DEFAULT_VOCAB;
    } else {
      const res = await fetch("./assets/vocab.json");
      state.baseWords = await res.json();
    }
    refreshWords();
  }

  function refreshWords() {
    const deleted = new Set(loadJson(STORAGE.deleted, []));
    const custom = loadJson(STORAGE.custom, []);
    state.words = state.baseWords.filter((w) => !deleted.has(w.id)).concat(custom);
    buildSearchIndex();
  }

  function buildSearchIndex() {
    for (const word of state.words) {
      word._romaji = kanaToRomaji(`${word.kana || ""} ${word.word || ""}`).toLowerCase();
      word._haystack = [
        word.level, word.type, word.word, word.kana, word.pos, word.accent, word.meaning, word.status, word._romaji,
      ].join(" ").toLowerCase();
    }
  }

  function renderAll() {
    updateSummary();
    renderSearch();
    updateStudyPoolHint();
    renderStats();
  }

  function updateSummary() {
    const counts = countByLevel(state.words);
    els.librarySummary.textContent = `${state.words.length.toLocaleString()} 个词条 · N1 ${counts.N1 || 0} · N2 ${counts.N2 || 0} · N3 ${counts.N3 || 0} · N4 ${counts.N4 || 0} · N5 ${counts.N5 || 0} · 自定义 ${counts.CUSTOM || 0}`;
  }

  function switchView(viewId) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    if (viewId === "statsView") renderStats();
  }

  function getFilteredWords() {
    const query = normalizeQuery(els.searchInput.value);
    const level = els.levelFilter.value;
    const type = els.typeFilter.value;
    const status = els.statusFilter.value;
    const progress = loadProgress();
    const now = Date.now();
    return state.words.filter((w) => {
      if (level !== "all" && w.level !== level) return false;
      if (type !== "all" && w.type !== type) return false;
      const p = progress[w.id] || {};
      if (status === "starred" && !p.starred) return false;
      if (status === "wrong" && !((p.wrong || 0) > (p.correct || 0))) return false;
      if (status === "due" && !(p.nextReview && p.nextReview <= now)) return false;
      if (status === "review" && w.status !== "需人工复核") return false;
      if (!query) return true;
      return w._haystack.includes(query) || w._romaji.includes(query);
    });
  }

  function renderSearch() {
    const list = getFilteredWords();
    const pageSize = getPageSize(list.length);
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    state.searchPage = clamp(state.searchPage, 1, totalPages);
    const start = (state.searchPage - 1) * pageSize;
    const pageItems = list.slice(start, start + pageSize);
    els.resultCount.textContent = `${list.length.toLocaleString()} 条`;
    els.resultHint.textContent = list.length ? "可按等级浏览、翻页或输入关键词缩小范围" : "没有匹配词条";
    document.querySelectorAll(".page-info").forEach((el) => { el.textContent = `${state.searchPage} / ${totalPages}`; });
    document.querySelectorAll(".page-prev").forEach((btn) => { btn.disabled = state.searchPage <= 1; });
    document.querySelectorAll(".page-next").forEach((btn) => { btn.disabled = state.searchPage >= totalPages; });
    els.jumpPage.max = String(totalPages);
    els.jumpPage.value = String(state.searchPage);
    els.selectedCount.textContent = `已选择 ${state.selectedIds.size} 条`;
    els.resultsList.innerHTML = "";
    if (!pageItems.length) {
      els.resultsList.innerHTML = '<div class="empty-state">没有匹配词条，换个等级或关键词试试。</div>';
      return;
    }
    const frag = document.createDocumentFragment();
    const progress = loadProgress();
    pageItems.forEach((word) => frag.appendChild(renderWordItem(word, progress[word.id])));
    els.resultsList.appendChild(frag);
  }

  function renderWordItem(word, progress) {
    const node = $("wordItemTemplate").content.firstElementChild.cloneNode(true);
    node.querySelector(".word-title").textContent = word.word;
    node.querySelector(".level-pill").textContent = levelLabels[word.level] || word.level;
    node.querySelector(".type-pill").textContent = word.type || "词条";
    node.querySelector(".word-kana").textContent = [word.kana, word.pos, word.accent].filter(Boolean).join(" · ");
    node.querySelector(".word-meaning").textContent = word.meaning;
    node.querySelector(".speak-word").addEventListener("click", () => speak(word.word));
    const checkbox = node.querySelector(".select-word");
    checkbox.checked = state.selectedIds.has(word.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) state.selectedIds.add(word.id);
      else state.selectedIds.delete(word.id);
      els.selectedCount.textContent = `已选择 ${state.selectedIds.size} 条`;
    });
    const star = node.querySelector(".star-word");
    star.textContent = progress?.starred ? "取消收藏" : "收藏";
    star.addEventListener("click", () => toggleStar(word.id));
    node.querySelector(".delete-word").addEventListener("click", () => deleteWord(word.id));
    return node;
  }

  function changeSearchPage(delta) {
    const list = getFilteredWords();
    const pageSize = getPageSize(list.length);
    const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
    const next = clamp(state.searchPage + delta, 1, totalPages);
    if (next !== state.searchPage) {
      state.searchPage = next;
      renderSearch();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function currentPageWords() {
    const list = getFilteredWords();
    const pageSize = getPageSize(list.length);
    const start = (state.searchPage - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function getPageSize(total) {
    if (els.pageSize.value === "all") return Math.max(1, total);
    if (els.pageSize.value === "custom") return clamp(Number(els.customPageSize.value || 300), 10, 5000);
    return Number(els.pageSize.value || 50);
  }

  function jumpToPage() {
    const list = getFilteredWords();
    const totalPages = Math.max(1, Math.ceil(list.length / getPageSize(list.length)));
    state.searchPage = clamp(Number(els.jumpPage.value || 1), 1, totalPages);
    renderSearch();
  }

  function selectCurrentPage() {
    currentPageWords().forEach((word) => state.selectedIds.add(word.id));
    renderSearch();
  }

  function startStudy() {
    const pool = getStudyPool();
    const count = getStudyCount();
    if (!pool.length) {
      els.studyPoolHint.textContent = "当前条件下没有可学习词条";
      return;
    }
    state.session = pool.slice(0, count).map((w) => w.id);
    state.currentIndex = 0;
    state.answered = new Map();
    clearAutoAdvance();
    els.studyCard.classList.remove("hidden");
    renderCard({ autoSpeak: true });
  }

  function getStudyPool() {
    const level = els.studyLevel.value;
    const scope = els.studyScope.value;
    const order = els.studyOrder.value;
    const progress = loadProgress();
    const now = Date.now();
    let pool = state.words.filter((w) => level === "all" || w.level === level);
    if (scope === "new") pool = pool.filter((w) => !(progress[w.id]?.seen));
    if (scope === "due") pool = pool.filter((w) => progress[w.id]?.nextReview && progress[w.id].nextReview <= now);
    if (scope === "wrong") pool = pool.filter((w) => (progress[w.id]?.wrong || 0) > (progress[w.id]?.correct || 0));
    if (scope === "starred") pool = pool.filter((w) => progress[w.id]?.starred);
    if (!pool.length && scope === "due") pool = state.words.filter((w) => level === "all" || w.level === level);
    if (order === "random") shuffle(pool);
    if (order === "level") pool.sort((a, b) => (levelOrder[a.level] || 99) - (levelOrder[b.level] || 99) || a.seq - b.seq);
    if (order === "source") pool.sort((a, b) => a.seq - b.seq);
    return pool;
  }

  function updateStudyPoolHint() {
    const pool = getStudyPool();
    els.studyPoolHint.textContent = `当前条件可用 ${pool.length.toLocaleString()} 条`;
  }

  function getStudyCount() {
    if (els.studyCount.value === "custom") return clamp(Number(els.customCount.value || 25), 1, 300);
    return Number(els.studyCount.value);
  }

  function renderCard(options = {}) {
    const word = currentWord();
    if (!word) {
      els.studyCard.classList.add("hidden");
      return;
    }
    const direction = els.studyDirection.value;
    const progress = loadProgress();
    const p = progress[word.id] || {};
    els.sessionProgress.textContent = `${state.currentIndex + 1} / ${state.session.length}`;
    els.cardLevel.textContent = levelLabels[word.level] || word.level;
    $("starBtn").textContent = p.starred ? "取消收藏" : "收藏";
    els.promptLabel.textContent = direction === "wordToMeaning" ? "选择含义" : "选择单词";
    els.promptText.textContent = direction === "wordToMeaning" ? word.word : word.meaning;
    els.promptSubtext.textContent = direction === "wordToMeaning"
      ? [word.kana, word.pos, word.accent].filter(Boolean).join(" · ")
      : `${levelLabels[word.level] || word.level} · ${word.pos || "词条"}`;
    renderOptions(word);
    renderAnswerDetail(word, state.answered.get(word.id));
    if (options.autoSpeak) {
      window.setTimeout(() => speak(word.word || word.kana || ""), 120);
    }
  }

  function renderOptions(word) {
    const direction = els.studyDirection.value;
    const pool = state.words.filter((w) => w.id !== word.id && w.level === word.level);
    shuffle(pool);
    const options = [word, ...pool.slice(0, 3)];
    shuffle(options);
    els.options.innerHTML = "";
    options.forEach((optionWord) => {
      const btn = document.createElement("button");
      btn.className = "option";
      btn.textContent = direction === "wordToMeaning" ? optionWord.meaning : optionWord.word;
      const answered = state.answered.get(word.id);
      if (answered) {
        if (optionWord.id === word.id) btn.classList.add("correct");
        if (optionWord.id === answered.choiceId && !answered.correct) btn.classList.add("wrong");
      }
      btn.addEventListener("click", () => answerCurrent(optionWord.id));
      els.options.appendChild(btn);
    });
  }

  function answerCurrent(choiceId) {
    const word = currentWord();
    if (!word || state.answered.has(word.id)) return;
    const correct = choiceId === word.id;
    state.answered.set(word.id, { choiceId, correct });
    updateProgressForAnswer(word, correct);
    renderCard();
    renderStats();
    scheduleAutoAdvance();
  }

  function showAnswer() {
    const word = currentWord();
    if (!word) return;
    if (!state.answered.has(word.id)) {
      state.answered.set(word.id, { choiceId: null, correct: false, peek: true });
      updateProgressForAnswer(word, false);
    }
    renderCard();
    renderStats();
    scheduleAutoAdvance();
  }

  function renderAnswerDetail(word, answered) {
    if (!answered) {
      els.answerDetail.classList.add("hidden");
      els.answerDetail.innerHTML = "";
      return;
    }
    els.answerDetail.classList.remove("hidden");
    els.answerDetail.innerHTML = `
      <strong>${answered.correct ? "回答正确" : "正确答案"}</strong>
      <div>${escapeHtml(word.word)} ${escapeHtml(word.kana || "")} ${escapeHtml(word.accent || "")}</div>
      <div>${escapeHtml(word.pos || "")} · ${escapeHtml(word.meaning || "")}</div>
    `;
  }

  function updateProgressForAnswer(word, correct) {
    const progress = loadProgress();
    const now = Date.now();
    const p = progress[word.id] || { seen: 0, correct: 0, wrong: 0, streak: 0, interval: 0 };
    p.seen = (p.seen || 0) + 1;
    p.correct = (p.correct || 0) + (correct ? 1 : 0);
    p.wrong = (p.wrong || 0) + (correct ? 0 : 1);
    p.streak = correct ? (p.streak || 0) + 1 : 0;
    p.interval = correct ? Math.max(1, Math.round((p.interval || 0.5) * (p.streak > 2 ? 2.2 : 1.7))) : 0.08;
    p.lastSeen = now;
    p.nextReview = now + p.interval * 24 * 60 * 60 * 1000;
    progress[word.id] = p;
    saveJson(STORAGE.progress, progress);
    addHistory({ id: word.id, word: word.word, level: word.level, correct, time: now });
  }

  function nextCard() {
    clearAutoAdvance();
    if (state.currentIndex < state.session.length - 1) {
      state.currentIndex += 1;
      renderCard({ autoSpeak: true });
    } else {
      els.studyPoolHint.textContent = "本轮完成，可以继续换范围复习";
      renderStats();
    }
  }

  function prevCard() {
    clearAutoAdvance();
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderCard({ autoSpeak: true });
    }
  }

  function resetSession() {
    clearAutoAdvance();
    state.session = [];
    state.answered = new Map();
    state.currentIndex = 0;
    els.studyCard.classList.add("hidden");
    updateStudyPoolHint();
  }

  function scheduleAutoAdvance() {
    clearAutoAdvance();
    state.autoAdvanceTimer = window.setTimeout(() => {
      state.autoAdvanceTimer = null;
      nextCard();
    }, 1500);
  }

  function clearAutoAdvance() {
    if (state.autoAdvanceTimer) {
      window.clearTimeout(state.autoAdvanceTimer);
      state.autoAdvanceTimer = null;
    }
  }

  function currentWord() {
    const id = state.session[state.currentIndex];
    return state.words.find((w) => w.id === id);
  }

  function addSingleWord() {
    const word = normalizeText(els.addWord.value);
    const meaning = normalizeText(els.addMeaning.value);
    if (!word || !meaning) {
      els.addHint.textContent = "单词和含义不能为空";
      return;
    }
    const item = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      seq: Date.now(),
      level: els.addLevel.value,
      type: "主词条",
      word,
      kana: normalizeText(els.addKana.value),
      pos: normalizeText(els.addPos.value),
      accent: normalizeText(els.addAccent.value),
      meaning,
      bookPage: "",
      status: "自定义",
    };
    const custom = loadJson(STORAGE.custom, []);
    custom.push(item);
    saveJson(STORAGE.custom, custom);
    ["addWord", "addKana", "addPos", "addAccent", "addMeaning"].forEach((id) => { els[id].value = ""; });
    els.addHint.textContent = "已添加";
    refreshWords();
    renderAll();
  }

  function importBulkWords() {
    try {
      const parsed = JSON.parse(els.bulkInput.value);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const custom = loadJson(STORAGE.custom, []);
      for (const raw of items) {
        if (!raw.word || !raw.meaning) continue;
        custom.push({
          id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          seq: Date.now() + custom.length,
          level: ["N1", "N2", "N3", "N4", "N5", "CUSTOM"].includes(raw.level) ? raw.level : "CUSTOM",
          type: raw.type || "主词条",
          word: String(raw.word),
          kana: raw.kana ? String(raw.kana) : "",
          pos: raw.pos ? String(raw.pos) : "",
          accent: raw.accent ? String(raw.accent) : "",
          meaning: String(raw.meaning),
          bookPage: "",
          status: "自定义",
        });
      }
      saveJson(STORAGE.custom, custom);
      els.bulkHint.textContent = `已导入 ${items.length} 条`;
      refreshWords();
      renderAll();
    } catch (err) {
      els.bulkHint.textContent = "JSON 格式有误";
    }
  }

  function loadSampleJson() {
    els.bulkInput.value = JSON.stringify([
      { level: "CUSTOM", word: "試す", kana: "ためす", pos: "他動1", accent: "②", meaning: "尝试" },
      { level: "N5", word: "眠い", kana: "ねむい", pos: "イ形", accent: "②", meaning: "困，想睡" },
    ], null, 2);
  }

  function deleteWord(id) {
    if (!confirm("确认删除这个词条？")) return;
    deleteWordsByIds([id]);
  }

  function deleteWordsByIds(ids) {
    const idSet = new Set(ids);
    const custom = loadJson(STORAGE.custom, []).filter((w) => !idSet.has(w.id));
    const deleted = new Set(loadJson(STORAGE.deleted, []));
    ids.forEach((id) => {
      if (!String(id).startsWith("custom-")) deleted.add(id);
    });
    saveJson(STORAGE.custom, custom);
    saveJson(STORAGE.deleted, Array.from(deleted));
    ids.forEach((id) => state.selectedIds.delete(id));
    refreshWords();
    renderAll();
  }

  function deleteSelectedWords() {
    const ids = Array.from(state.selectedIds);
    if (!ids.length) return;
    if (!confirm(`确认删除已选择的 ${ids.length} 个词条？内置词会被隐藏，可在词库页恢复。`)) return;
    deleteWordsByIds(ids);
  }

  function deleteLevelWords() {
    const level = $("deleteLevel").value;
    const words = state.words.filter((w) => w.level === level);
    if (!words.length) return;
    const label = levelLabels[level] || level;
    if (!confirm(`确认删除 ${label} 的全部 ${words.length} 个词条？内置词会被隐藏，可恢复。`)) return;
    deleteWordsByIds(words.map((w) => w.id));
  }

  function restoreDeletedBaseWords() {
    if (!confirm("确认恢复所有被删除/隐藏的内置词？自定义词不会受影响。")) return;
    saveJson(STORAGE.deleted, []);
    state.selectedIds.clear();
    refreshWords();
    renderAll();
  }

  function clearCustomWords() {
    if (!confirm("确认清空所有自定义词？")) return;
    saveJson(STORAGE.custom, []);
    refreshWords();
    renderAll();
  }

  function toggleStar(id) {
    if (!id) return;
    const progress = loadProgress();
    const p = progress[id] || {};
    p.starred = !p.starred;
    progress[id] = p;
    saveJson(STORAGE.progress, progress);
    renderAll();
    if (currentWord()?.id === id) renderCard();
  }

  function renderStats() {
    const progress = loadProgress();
    const history = loadHistory();
    const now = Date.now();
    const learned = Object.values(progress).filter((p) => p.seen).length;
    const due = state.words.filter((w) => progress[w.id]?.nextReview && progress[w.id].nextReview <= now).length;
    const correct = Object.values(progress).reduce((sum, p) => sum + (p.correct || 0), 0);
    const wrong = Object.values(progress).reduce((sum, p) => sum + (p.wrong || 0), 0);
    els.learnedCount.textContent = learned.toLocaleString();
    els.dueCount.textContent = due.toLocaleString();
    els.accuracyRate.textContent = correct + wrong ? `${Math.round((correct / (correct + wrong)) * 100)}%` : "0%";
    els.streakDays.textContent = `${computeStreak(history)} 天`;
    renderLevelStats(progress);
    renderHistory(history);
  }

  function renderLevelStats(progress) {
    els.levelStats.innerHTML = "";
    ["N5", "N4", "N3", "N2", "N1", "CUSTOM"].forEach((level) => {
      const words = state.words.filter((w) => w.level === level);
      const learned = words.filter((w) => progress[w.id]?.seen).length;
      const pct = words.length ? Math.round((learned / words.length) * 100) : 0;
      const row = document.createElement("div");
      row.className = "level-row";
      row.innerHTML = `<strong>${levelLabels[level]}</strong><div class="bar"><span style="width:${pct}%"></span></div><small>${learned}/${words.length}</small>`;
      els.levelStats.appendChild(row);
    });
  }

  function renderHistory(history) {
    els.historyList.innerHTML = "";
    if (!history.length) {
      els.historyList.textContent = "还没有学习记录";
      return;
    }
    history.slice(0, 100).forEach((item) => {
      const row = document.createElement("div");
      row.className = "history-item";
      row.innerHTML = `<span>${escapeHtml(item.word)} · ${escapeHtml(item.level)}</span><strong>${item.correct ? "对" : "错"}</strong>`;
      els.historyList.appendChild(row);
    });
  }

  function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = 0.86;
    window.speechSynthesis.speak(utter);
  }

  function exportLibrary() {
    downloadJson("jlpt-library-export.json", state.words.map(({ _haystack, _romaji, ...w }) => w));
  }

  function exportProgress() {
    downloadJson("jlpt-progress-export.json", {
      custom: loadJson(STORAGE.custom, []),
      deleted: loadJson(STORAGE.deleted, []),
      progress: loadProgress(),
      history: loadHistory(),
      exportedAt: new Date().toISOString(),
    });
  }

  async function importProgress(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (data.custom) saveJson(STORAGE.custom, data.custom);
    if (data.deleted) saveJson(STORAGE.deleted, data.deleted);
    if (data.progress) saveJson(STORAGE.progress, data.progress);
    if (data.history) saveJson(STORAGE.history, data.history);
    refreshWords();
    renderAll();
    event.target.value = "";
  }

  function resetProgress() {
    if (!confirm("确认清空学习进度和历史？词库不会被删除。")) return;
    saveJson(STORAGE.progress, {});
    saveJson(STORAGE.history, []);
    renderAll();
  }

  function addHistory(item) {
    const history = loadHistory();
    history.unshift(item);
    saveJson(STORAGE.history, history.slice(0, 1000));
  }

  function loadProgress() {
    return loadJson(STORAGE.progress, {});
  }

  function loadHistory() {
    return loadJson(STORAGE.history, []);
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function normalizeQuery(text) {
    return normalizeText(text).toLowerCase();
  }

  function normalizeText(text) {
    return String(text || "").trim().replace(/\s+/g, " ");
  }

  function kanaToRomaji(input) {
    let text = String(input || "").replace(/[ァ-ン]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    for (const [kana, roma] of kanaMap) text = text.split(kana).join(roma);
    text = text.replace(/っ([bcdfghjklmnpqrstvwxyz])/g, "$1$1");
    text = text.replace(/ー/g, "");
    return text;
  }

  function countByLevel(words) {
    return words.reduce((acc, w) => {
      acc[w.level] = (acc[w.level] || 0) + 1;
      return acc;
    }, {});
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function clamp(num, min, max) {
    return Math.max(min, Math.min(max, num));
  }

  function computeStreak(history) {
    const days = new Set(history.map((h) => new Date(h.time).toDateString()));
    let streak = 0;
    const cur = new Date();
    for (;;) {
      if (!days.has(cur.toDateString())) break;
      streak += 1;
      cur.setDate(cur.getDate() - 1);
    }
    return streak;
  }

  function escapeHtml(text) {
    return String(text || "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }
})();
