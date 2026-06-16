(function () {
  const STORAGE = {
    custom: "jlpt-review.customWords.v1",
    deleted: "jlpt-review.deletedBaseIds.v1",
    progress: "jlpt-review.progress.v1",
    history: "jlpt-review.history.v1",
    speech: "jlpt-review.speech.v1",
  };

  const levelOrder = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5, CUSTOM: 6 };
  const browseLevelOrder = { N1: 1, N2: 2, N3: 3, N4: 4, N5: 5, CUSTOM: 6 };
  const levelLabels = { N1: "N1", N2: "N2", N3: "N3", N4: "N4", N5: "N5", CUSTOM: "自定义" };
  const defaultSpeechSettings = { mode: "kana", voiceURI: "", rate: 0.82, pitch: 1 };
  const KANA_GROUPS = [
    { key: "あ", label: "あ行", chars: "あいうえおぁぃぅぇぉ" },
    { key: "か", label: "か行", chars: "かきくけこがぎぐげご" },
    { key: "さ", label: "さ行", chars: "さしすせそざじずぜぞ" },
    { key: "た", label: "た行", chars: "たちつてとだぢづでどっ" },
    { key: "な", label: "な行", chars: "なにぬねの" },
    { key: "は", label: "は行", chars: "はひふへほばびぶべぼぱぴぷぺぽ" },
    { key: "ま", label: "ま行", chars: "まみむめも" },
    { key: "や", label: "や行", chars: "やゆよゃゅょ" },
    { key: "ら", label: "ら行", chars: "らりるれろ" },
    { key: "わ", label: "わ行", chars: "わをん" },
    { key: "他", label: "その他", chars: "" },
  ];
  const kanaGroupLabel = Object.fromEntries(KANA_GROUPS.map((group) => [group.key, group.label]));
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
    filteredWords: [],
    selectedIds: new Set(),
    autoAdvanceTimer: null,
    kanaDragActive: false,
    kanaScrollTicking: false,
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
      "librarySummary", "searchInput", "levelFilter", "typeFilter", "statusFilter", "sourceFilter", "resultsList", "resultCount", "resultHint",
      "directoryTabs", "searchFilters", "filterToggleBtn", "selectedCount", "kanaNavigator", "kanaRail", "kanaProgress", "kanaThumb", "kanaCurrent", "kanaLabels", "kanaPositionHint", "floatingTopBtn",
      "studyLevel", "studyScope", "studyCount", "customCountWrap", "customCount", "studyOrder", "studyDirection", "studyPoolHint", "studySettingsSummary",
      "speechMode", "speechVoice", "speechRate", "speechPitch", "speechRateValue", "speechPitchValue",
      "studyCard", "sessionProgress", "cardLevel", "promptLabel", "promptText", "promptSubtext", "options", "answerDetail",
      "addLevel", "addWord", "addKana", "addPos", "addAccent", "addMeaning", "addHint", "bulkInput", "bulkHint", "bulkLevel", "bulkSource", "bulkFileInput",
      "deleteSource", "learnedCount", "dueCount", "accuracyRate", "streakDays", "levelStats", "historyList",
    ].forEach((id) => { els[id] = $(id); });
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });
    ["searchInput", "levelFilter", "typeFilter", "statusFilter", "sourceFilter"].forEach((id) => {
      els[id].addEventListener("input", () => {
        state.selectedIds.clear();
        renderSearch();
      });
    });
    els.directoryTabs.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-level]");
      if (!btn || btn.disabled) return;
      els.levelFilter.value = btn.dataset.level;
      state.selectedIds.clear();
      renderSearch();
    });
    $("filterToggleBtn").addEventListener("click", toggleSearchFilters);
    ["backToTopBtn", "scrollToTopBottomBtn", "floatingTopBtn"].forEach((id) => {
      $(id).addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    });
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
      els.sourceFilter.value = "all";
      renderSearch();
    });
    $("studyCount").addEventListener("change", () => {
      els.customCountWrap.classList.toggle("hidden", els.studyCount.value !== "custom");
      updateStudyPoolHint();
    });
    ["studyLevel", "studyScope", "customCount", "studyOrder", "studyDirection"].forEach((id) => els[id].addEventListener("input", updateStudyPoolHint));
    $("openSettingsBtn").addEventListener("click", () => switchView("settingsView"));
    $("startStudyBtn").addEventListener("click", startStudy);
    $("resetSessionBtn").addEventListener("click", resetSession);
    $("prevCardBtn").addEventListener("click", prevCard);
    $("nextCardBtn").addEventListener("click", nextCard);
    $("showAnswerBtn").addEventListener("click", showAnswer);
    $("speakBtn").addEventListener("click", () => speakWord(currentWord()));
    $("starBtn").addEventListener("click", () => toggleStar(currentWord()?.id));
    $("testSpeechBtn").addEventListener("click", () => speakWord(currentWord() || state.filteredWords[0] || state.words[0]));
    ["speechMode", "speechVoice", "speechRate", "speechPitch"].forEach((id) => {
      els[id].addEventListener("input", () => {
        saveSpeechSettings();
      });
    });
    $("addWordBtn").addEventListener("click", addSingleWord);
    $("importBulkBtn").addEventListener("click", importBulkWords);
    $("importFileBtn").addEventListener("click", importWordFiles);
    $("bulkFileInput").addEventListener("change", () => {
      const count = els.bulkFileInput.files?.length || 0;
      els.bulkHint.textContent = count ? `已选择 ${count} 个文件，点击“导入文件”开始` : "";
    });
    $("loadSampleBtn").addEventListener("click", loadSampleJson);
    $("exportLibraryBtn").addEventListener("click", exportLibrary);
    $("clearCustomBtn").addEventListener("click", clearCustomWords);
    $("deleteLevelBtn").addEventListener("click", deleteLevelWords);
    $("deleteSourceBtn").addEventListener("click", deleteSourceWords);
    $("restoreDeletedBtn").addEventListener("click", restoreDeletedBaseWords);
    $("exportProgressBtn").addEventListener("click", exportProgress);
    $("importProgressInput").addEventListener("change", importProgress);
    $("resetProgressBtn").addEventListener("click", resetProgress);
    bindKanaNavigator();
    setupSpeechControls();
    window.addEventListener("scroll", () => {
      requestKanaNavigatorUpdate();
      updateFloatingTopButton();
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
        word.level, word.type, word.word, word.kana, word.pos, word.accent, word.meaning, word.status, word.source, word.listName, word._romaji,
      ].join(" ").toLowerCase();
    }
  }

  function renderAll() {
    updateSummary();
    renderSourceOptions();
    renderSearch();
    updateStudyPoolHint();
    renderStats();
    updateFloatingTopButton();
  }

  function updateSummary() {
    const counts = countByLevel(state.words);
    els.librarySummary.textContent = `${state.words.length.toLocaleString()} 个词条 · N1 ${counts.N1 || 0} · N2 ${counts.N2 || 0} · N3 ${counts.N3 || 0} · N4 ${counts.N4 || 0} · N5 ${counts.N5 || 0} · 自定义 ${counts.CUSTOM || 0}`;
  }

  function renderSourceOptions() {
    const sources = getSourceCounts();
    const activeSource = els.sourceFilter.value || "all";
    els.sourceFilter.innerHTML = '<option value="all">全部词库</option>';
    sources.forEach(({ source, count }) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = `${source} (${count})`;
      els.sourceFilter.appendChild(option);
    });
    els.sourceFilter.value = sources.some((item) => item.source === activeSource) ? activeSource : "all";

    els.deleteSource.innerHTML = "";
    sources.forEach(({ source, count }) => {
      const option = document.createElement("option");
      option.value = source;
      option.textContent = `${source} (${count})`;
      els.deleteSource.appendChild(option);
    });
    $("deleteSourceBtn").disabled = !sources.length;
  }

  function renderDirectories() {
    const counts = countByLevel(state.words);
    const levels = ["all", "N1", "N2", "N3", "N4", "N5", "CUSTOM"];
    els.directoryTabs.innerHTML = "";
    levels.forEach((level) => {
      const btn = document.createElement("button");
      btn.className = "directory-tab";
      btn.dataset.level = level;
      btn.classList.toggle("active", els.levelFilter.value === level);
      const label = level === "all" ? "全部" : (levelLabels[level] || level);
      const count = level === "all" ? state.words.length : (counts[level] || 0);
      btn.innerHTML = `<strong>${label}</strong><span>${count.toLocaleString()}</span>`;
      els.directoryTabs.appendChild(btn);
    });
  }

  function switchView(viewId) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    window.scrollTo({ top: 0, behavior: "auto" });
    if (viewId === "statsView") renderStats();
    if (viewId === "searchView") requestKanaNavigatorUpdate();
    updateFloatingTopButton();
  }

  function toggleSearchFilters() {
    const willOpen = els.searchFilters.classList.contains("hidden");
    els.searchFilters.classList.toggle("hidden", !willOpen);
    els.filterToggleBtn.setAttribute("aria-expanded", String(willOpen));
    els.filterToggleBtn.textContent = willOpen ? "收起筛选" : "筛选";
  }

  function updateFloatingTopButton() {
    const onSearchView = document.getElementById("searchView").classList.contains("active");
    els.floatingTopBtn.classList.toggle("hidden", !onSearchView || window.scrollY < 420);
  }

  function getFilteredWords() {
    const query = normalizeQuery(els.searchInput.value);
    const level = els.levelFilter.value;
    const type = els.typeFilter.value;
    const status = els.statusFilter.value;
    const source = els.sourceFilter.value;
    const progress = loadProgress();
    const now = Date.now();
    return state.words.filter((w) => {
      if (level !== "all" && w.level !== level) return false;
      if (type !== "all" && w.type !== type) return false;
      if (source !== "all" && getWordSource(w) !== source) return false;
      const p = progress[w.id] || {};
      if (status === "starred" && !p.starred) return false;
      if (status === "wrong" && !((p.wrong || 0) > (p.correct || 0))) return false;
      if (status === "due" && !(p.nextReview && p.nextReview <= now)) return false;
      if (status === "review" && w.status !== "需人工复核") return false;
      if (!query) return true;
      return w._haystack.includes(query) || w._romaji.includes(query);
    }).sort(compareBrowseWords);
  }

  function renderSearch() {
    const list = getFilteredWords();
    state.filteredWords = list;
    renderDirectories();
    els.resultCount.textContent = `${list.length.toLocaleString()} 条`;
    els.resultHint.textContent = list.length ? "连续浏览词表，拖动右侧五十音条可快速定位" : "没有匹配词条";
    els.selectedCount.textContent = `已选择 ${state.selectedIds.size} 条`;
    els.resultsList.innerHTML = "";
    renderKanaLabels(list);
    if (!list.length) {
      els.resultsList.innerHTML = '<div class="empty-state">没有匹配词条，换个等级或关键词试试。</div>';
      requestKanaNavigatorUpdate();
      return;
    }
    const frag = document.createDocumentFragment();
    const progress = loadProgress();
    const groupCounts = countByKanaGroup(list);
    let lastGroup = "";
    list.forEach((word, index) => {
      const group = getKanaGroup(word);
      if (group !== lastGroup) {
        frag.appendChild(renderKanaSection(group, groupCounts[group] || 0));
        lastGroup = group;
      }
      const item = renderWordItem(word, progress[word.id]);
      item.dataset.wordIndex = String(index);
      item.dataset.kanaGroup = group;
      frag.appendChild(item);
    });
    els.resultsList.appendChild(frag);
    requestKanaNavigatorUpdate();
  }

  function renderWordItem(word, progress) {
    const node = $("wordItemTemplate").content.firstElementChild.cloneNode(true);
    node.querySelector(".word-title").textContent = word.word;
    node.querySelector(".level-pill").textContent = levelLabels[word.level] || word.level;
    node.querySelector(".type-pill").textContent = word.type || "词条";
    const sourcePill = node.querySelector(".source-pill");
    const source = getWordSource(word);
    sourcePill.textContent = source;
    sourcePill.classList.toggle("hidden", !source);
    node.querySelector(".word-kana").textContent = [word.kana, word.pos, word.accent].filter(Boolean).join(" · ");
    node.querySelector(".word-meaning").textContent = word.meaning;
    node.querySelector(".speak-word").addEventListener("click", () => speakWord(word));
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

  function currentPageWords() {
    return state.filteredWords.length ? state.filteredWords : getFilteredWords();
  }

  function selectCurrentPage() {
    currentPageWords().forEach((word) => state.selectedIds.add(word.id));
    renderSearch();
  }

  function renderKanaSection(group, count) {
    const section = document.createElement("div");
    section.className = "kana-section";
    section.dataset.kanaSection = group;
    section.innerHTML = `<span>${escapeHtml(kanaGroupLabel[group] || group)}</span><small>${count.toLocaleString()} 条</small>`;
    return section;
  }

  function renderKanaLabels(list) {
    const counts = countByKanaGroup(list);
    els.kanaLabels.innerHTML = "";
    KANA_GROUPS.forEach((group) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.kanaTarget = group.key;
      btn.textContent = group.key;
      btn.title = `${group.label} · ${counts[group.key] || 0} 条`;
      btn.disabled = !counts[group.key];
      btn.addEventListener("click", () => scrollToKanaGroup(group.key));
      els.kanaLabels.appendChild(btn);
    });
  }

  function bindKanaNavigator() {
    els.kanaRail.addEventListener("pointerdown", (event) => {
      state.kanaDragActive = true;
      els.kanaRail.setPointerCapture(event.pointerId);
      scrollToRatioFromPointer(event);
    });
    els.kanaRail.addEventListener("pointermove", (event) => {
      if (!state.kanaDragActive) return;
      scrollToRatioFromPointer(event);
    });
    els.kanaRail.addEventListener("pointerup", (event) => {
      state.kanaDragActive = false;
      els.kanaRail.releasePointerCapture(event.pointerId);
    });
    els.kanaRail.addEventListener("pointercancel", () => {
      state.kanaDragActive = false;
    });
    els.kanaRail.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const total = Math.max(1, state.filteredWords.length - 1);
      const current = getCurrentVisibleWordIndex();
      const step = event.key.includes("Page") ? 25 : 5;
      let next = current;
      if (event.key === "ArrowUp") next -= step;
      if (event.key === "ArrowDown") next += step;
      if (event.key === "PageUp") next -= step * 4;
      if (event.key === "PageDown") next += step * 4;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = total;
      scrollToWordIndex(clamp(next, 0, total));
    });
  }

  function requestKanaNavigatorUpdate() {
    if (state.kanaScrollTicking) return;
    state.kanaScrollTicking = true;
    window.requestAnimationFrame(() => {
      state.kanaScrollTicking = false;
      updateKanaNavigatorFromScroll();
    });
  }

  function updateKanaNavigatorFromScroll() {
    if (!document.getElementById("searchView").classList.contains("active")) return;
    const total = state.filteredWords.length;
    els.kanaNavigator.classList.toggle("muted", total === 0);
    if (!total) {
      updateKanaThumb(0, "五十音");
      return;
    }
    const index = getCurrentVisibleWordIndex();
    const word = state.filteredWords[index] || state.filteredWords[0];
    const group = getKanaGroup(word);
    const ratio = total <= 1 ? 0 : index / (total - 1);
    updateKanaThumb(ratio, kanaGroupLabel[group] || group);
    els.kanaLabels.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.kanaTarget === group);
    });
  }

  function getCurrentVisibleWordIndex() {
    const nodes = Array.from(els.resultsList.querySelectorAll(".word-item"));
    if (!nodes.length) return 0;
    const targetY = Math.min(window.innerHeight * 0.42, 360);
    let bestNode = nodes[0];
    let bestDistance = Infinity;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const distance = Math.abs(rect.top - targetY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestNode = node;
      }
    }
    return Number(bestNode.dataset.wordIndex || 0);
  }

  function scrollToRatioFromPointer(event) {
    const rect = els.kanaRail.getBoundingClientRect();
    const ratio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
    const total = Math.max(1, state.filteredWords.length - 1);
    scrollToWordIndex(Math.round(total * ratio));
  }

  function scrollToWordIndex(index) {
    const node = els.resultsList.querySelector(`.word-item[data-word-index="${index}"]`);
    if (!node) return;
    const total = Math.max(1, state.filteredWords.length - 1);
    const word = state.filteredWords[index];
    updateKanaThumb(total ? index / total : 0, kanaGroupLabel[getKanaGroup(word)] || "五十音");
    node.scrollIntoView({ block: "center", behavior: state.kanaDragActive ? "auto" : "smooth" });
  }

  function scrollToKanaGroup(group) {
    const node = els.resultsList.querySelector(`.word-item[data-kana-group="${group}"]`);
    if (node) node.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function updateKanaThumb(ratio, label) {
    const pct = clamp(ratio, 0, 1) * 100;
    els.kanaProgress.style.height = `${pct}%`;
    els.kanaThumb.style.top = `${pct}%`;
    els.kanaCurrent.textContent = label;
    els.kanaPositionHint.textContent = label;
    els.kanaRail.setAttribute("aria-valuenow", String(Math.round(pct)));
    els.kanaRail.setAttribute("aria-valuetext", label);
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
    updateStudySettingsSummary(pool.length);
  }

  function updateStudySettingsSummary(poolCount) {
    const level = els.studyLevel.options[els.studyLevel.selectedIndex]?.textContent || "全部等级";
    const scope = els.studyScope.options[els.studyScope.selectedIndex]?.textContent || "新词";
    const count = els.studyCount.value === "custom" ? `${getStudyCount()} 题` : `${els.studyCount.value} 题`;
    const order = els.studyOrder.options[els.studyOrder.selectedIndex]?.textContent || "按等级顺序";
    const direction = els.studyDirection.options[els.studyDirection.selectedIndex]?.textContent || "看单词选意思";
    const available = typeof poolCount === "number" ? poolCount : getStudyPool().length;
    els.studySettingsSummary.textContent = `${level} · ${scope} · ${count} · ${order} · ${direction} · 可用 ${available.toLocaleString()} 条`;
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
      window.setTimeout(() => speakWord(word), 120);
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
      const result = appendImportedWords(extractImportItems(parsed), "文本 JSON");
      els.bulkHint.textContent = formatImportResult(result);
    } catch (err) {
      els.bulkHint.textContent = "JSON 格式有误";
    }
  }

  async function importWordFiles() {
    const files = Array.from(els.bulkFileInput.files || []);
    if (!files.length) {
      els.bulkHint.textContent = "请先选择 Excel、CSV 或 JSON 文件";
      return;
    }
    try {
      let items = [];
      for (const file of files) {
        const parsed = await parseWordFile(file);
        items = items.concat(parsed);
      }
      const result = appendImportedWords(items, `${files.length} 个文件`);
      els.bulkHint.textContent = formatImportResult(result);
      els.bulkFileInput.value = "";
    } catch (err) {
      els.bulkHint.textContent = err.message || "文件导入失败";
    }
  }

  async function parseWordFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      return extractImportItems(JSON.parse(await file.text()));
    }
    if (name.endsWith(".csv") || name.endsWith(".tsv")) {
      const delimiter = name.endsWith(".tsv") ? "\t" : ",";
      return rowsToObjects(parseDelimited(await file.text(), delimiter));
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      if (!window.XLSX) throw new Error("Excel 解析库还没加载完成，请刷新页面后再试");
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
      return workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return window.XLSX.utils.sheet_to_json(sheet, { defval: "", blankrows: false });
      });
    }
    throw new Error("暂不支持这个文件类型，请使用 .xlsx、.xls、.csv、.tsv 或 .json");
  }

  function extractImportItems(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.words)) return data.words;
    if (Array.isArray(data.vocab)) return data.vocab;
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.custom)) return data.custom;
    return [data];
  }

  function appendImportedWords(rawItems, originLabel) {
    const custom = loadJson(STORAGE.custom, []);
    const existingKeys = new Set(state.words.map(getDuplicateKey));
    const batchId = `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const defaults = {
      level: els.bulkLevel.value,
      source: normalizeText(els.bulkSource.value) || originLabel || "自定义词库",
      batchId,
    };
    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    rawItems.forEach((raw, index) => {
      const item = normalizeImportedWord(raw, index, defaults);
      if (!item) {
        invalid += 1;
        return;
      }
      const key = getDuplicateKey(item);
      if (existingKeys.has(key)) {
        skipped += 1;
        return;
      }
      existingKeys.add(key);
      custom.push(item);
      imported += 1;
    });
    saveJson(STORAGE.custom, custom);
    refreshWords();
    renderAll();
    return { imported, skipped, invalid };
  }

  function normalizeImportedWord(raw, index, defaults) {
    if (!raw || typeof raw !== "object") return null;
    const word = normalizeText(pickField(raw, ["word", "单词", "写法", "詞彙", "词汇", "表記", "汉字", "語彙"]));
    const meaning = normalizeText(pickField(raw, ["meaning", "含义", "意思", "释义", "中文", "翻译", "translation", "definition"]));
    if (!word || !meaning) return null;
    const level = normalizeLevel(pickField(raw, ["level", "等级", "級別", "级别", "jlpt"]) || defaults.level);
    const source = normalizeText(pickField(raw, ["source", "listName", "词库", "来源", "书名"]) || defaults.source);
    return {
      id: `custom-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      seq: Date.now() + index,
      level,
      type: normalizeText(pickField(raw, ["type", "条目", "类型"])) || "主词条",
      word,
      kana: normalizeText(pickField(raw, ["kana", "假名", "读音", "かな", "読み方", "读法"])),
      pos: normalizeText(pickField(raw, ["pos", "词性", "品詞", "partOfSpeech"])),
      accent: normalizeText(pickField(raw, ["accent", "音调", "声调", "アクセント"])),
      meaning,
      bookPage: normalizeText(pickField(raw, ["bookPage", "页码", "编号", "page"])),
      source,
      listName: source,
      batchId: defaults.batchId,
      status: "自定义",
    };
  }

  function pickField(raw, aliases) {
    const entries = Object.entries(raw);
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(raw, alias)) return raw[alias];
      const normalizedAlias = String(alias).trim().toLowerCase();
      const found = entries.find(([key]) => String(key).trim().toLowerCase() === normalizedAlias);
      if (found) return found[1];
    }
    return "";
  }

  function normalizeLevel(level) {
    const value = String(level || "").trim().toUpperCase();
    return ["N1", "N2", "N3", "N4", "N5", "CUSTOM"].includes(value) ? value : "CUSTOM";
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (ch === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === delimiter && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((ch === "\n" || ch === "\r") && !quoted) {
        if (ch === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => normalizeText(value))) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    if (row.some((value) => normalizeText(value))) rows.push(row);
    return rows;
  }

  function rowsToObjects(rows) {
    if (!rows.length) return [];
    const headers = rows[0].map((header) => normalizeText(header));
    return rows.slice(1).map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        if (header) item[header] = row[index] || "";
      });
      return item;
    });
  }

  function formatImportResult(result) {
    const parts = [`已导入 ${result.imported} 条`];
    if (result.skipped) parts.push(`跳过重复 ${result.skipped} 条`);
    if (result.invalid) parts.push(`无效 ${result.invalid} 行`);
    return parts.join("，");
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

  function deleteSourceWords() {
    const source = els.deleteSource.value;
    if (!source) return;
    const words = state.words.filter((w) => getWordSource(w) === source);
    if (!words.length) return;
    const builtInCount = words.filter((w) => !String(w.id).startsWith("custom-")).length;
    const suffix = builtInCount ? `其中 ${builtInCount} 条是内置词，删除后会被隐藏，可用“恢复内置词”找回。` : "这些词条会从自定义词库中移除。";
    if (!confirm(`确认删除词库“${source}”的 ${words.length} 个词条？${suffix}`)) return;
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

  function setupSpeechControls() {
    const settings = getSpeechSettings();
    els.speechMode.value = settings.mode;
    els.speechRate.value = String(settings.rate);
    els.speechPitch.value = String(settings.pitch);
    updateSpeechSettingLabels();
    populateSpeechVoices(settings.voiceURI);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.addEventListener("voiceschanged", () => populateSpeechVoices(getSpeechSettings().voiceURI));
    }
  }

  function populateSpeechVoices(selectedVoiceURI = "") {
    if (!("speechSynthesis" in window)) {
      els.speechVoice.innerHTML = '<option value="">当前浏览器不支持朗读</option>';
      els.speechVoice.disabled = true;
      return;
    }
    const voices = getJapaneseVoices();
    els.speechVoice.innerHTML = '<option value="">自动选择</option>';
    voices.forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.voiceURI;
      option.textContent = `${voice.name} · ${voice.lang}`;
      els.speechVoice.appendChild(option);
    });
    els.speechVoice.value = voices.some((voice) => voice.voiceURI === selectedVoiceURI) ? selectedVoiceURI : "";
  }

  function updateSpeechSettingsFromControls() {
    updateSpeechSettingLabels();
    saveJson(STORAGE.speech, {
      mode: els.speechMode.value,
      voiceURI: els.speechVoice.value,
      rate: Number(els.speechRate.value),
      pitch: Number(els.speechPitch.value),
    });
  }

  function updateSpeechSettingLabels() {
    els.speechRateValue.textContent = Number(els.speechRate.value).toFixed(2);
    els.speechPitchValue.textContent = Number(els.speechPitch.value).toFixed(2);
  }

  function saveSpeechSettings() {
    updateSpeechSettingsFromControls();
  }

  function getSpeechSettings() {
    return { ...defaultSpeechSettings, ...loadJson(STORAGE.speech, {}) };
  }

  function speakWord(word) {
    if (!word) return;
    const text = buildSpeechText(word);
    speakText(text);
  }

  function buildSpeechText(word) {
    const settings = getSpeechSettings();
    const kana = cleanSpeechText(word.kana || "");
    const writing = cleanSpeechText(word.word || "");
    if (settings.mode === "word") return writing || kana;
    if (settings.mode === "both" && kana && writing && kana !== writing) return `${kana}。${writing}`;
    return kana || writing;
  }

  function cleanSpeechText(text) {
    return String(text || "")
      .replace(/[〜~～]/g, "")
      .replace(/[［\[].*?[］\]]/g, "")
      .replace(/[（(].*?[）)]/g, "")
      .split(/[\/／,，;；、]/)[0]
      .replace(/\s+/g, "")
      .trim();
  }

  function speakText(text) {
    if (!("speechSynthesis" in window) || !text) return;
    const settings = getSpeechSettings();
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ja-JP";
    utter.rate = clamp(Number(settings.rate) || defaultSpeechSettings.rate, 0.65, 1.1);
    utter.pitch = clamp(Number(settings.pitch) || defaultSpeechSettings.pitch, 0.8, 1.2);
    const voice = getSpeechVoice(settings.voiceURI);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  function getSpeechVoice(voiceURI) {
    const voices = getJapaneseVoices();
    if (voiceURI) {
      const selected = voices.find((voice) => voice.voiceURI === voiceURI);
      if (selected) return selected;
    }
    return voices[0] || null;
  }

  function getJapaneseVoices() {
    if (!("speechSynthesis" in window)) return [];
    return window.speechSynthesis.getVoices()
      .filter((voice) => /^ja(?:-|_|$)/i.test(voice.lang) || /日本|japan|kyoko|otoya|nanami|haruka/i.test(voice.name))
      .sort(rankSpeechVoice);
  }

  function rankSpeechVoice(a, b) {
    return scoreSpeechVoice(b) - scoreSpeechVoice(a) || a.name.localeCompare(b.name, "ja-JP");
  }

  function scoreSpeechVoice(voice) {
    const name = voice.name.toLowerCase();
    let score = /^ja[-_]jp$/i.test(voice.lang) ? 20 : 10;
    if (voice.localService) score += 4;
    if (/kyoko|otoya|nanami|haruka|siri|google/.test(name)) score += 3;
    return score;
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

  function getSourceCounts() {
    const map = new Map();
    state.words.forEach((word) => {
      const source = getWordSource(word);
      if (!source) return;
      map.set(source, (map.get(source) || 0) + 1);
    });
    return Array.from(map, ([source, count]) => ({ source, count }))
      .sort((a, b) => a.source.localeCompare(b.source, "zh-Hans-CN"));
  }

  function getWordSource(word) {
    return normalizeText(word.source || word.listName || (String(word.id || "").startsWith("custom-") ? "自定义词库" : "内置词库"));
  }

  function getDuplicateKey(word) {
    return [
      word.level || "",
      normalizeText(word.word).toLowerCase(),
      normalizeText(word.kana).toLowerCase(),
      normalizeText(word.meaning).toLowerCase(),
    ].join("|");
  }

  function countByKanaGroup(words) {
    return words.reduce((acc, word) => {
      const group = getKanaGroup(word);
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {});
  }

  function getKanaGroup(word) {
    const text = String(word?.kana || word?.word || "")
      .replace(/[ァ-ン]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
    const firstKana = (text.match(/[ぁ-ん]/) || [])[0] || "";
    const group = KANA_GROUPS.find((item) => item.chars.includes(firstKana));
    return group?.key || "他";
  }

  function compareBrowseWords(a, b) {
    return (browseLevelOrder[a.level] || 99) - (browseLevelOrder[b.level] || 99)
      || getKanaGroupIndex(a) - getKanaGroupIndex(b)
      || String(a.kana || a.word || "").localeCompare(String(b.kana || b.word || ""), "ja-JP")
      || (a.seq || 0) - (b.seq || 0);
  }

  function getKanaGroupIndex(word) {
    const key = getKanaGroup(word);
    return KANA_GROUPS.findIndex((group) => group.key === key);
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
