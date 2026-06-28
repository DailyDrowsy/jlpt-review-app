(() => {
  "use strict";

  const STORAGE = {
    base: "jlpt-review.baseWords.v1",
    custom: "jlpt-review.customWords.v1",
    deleted: "jlpt-review.deletedBaseIds.v1",
    progress: "jlpt-review.progress.v1",
    history: "jlpt-review.history.v1",
    speech: "jlpt-review.speech.v1",
    settings: "jlpt-review.settings.v2",
    cursors: "jlpt-review.studyCursors.v1",
  };

  const LEVELS = ["N5", "N4", "N3", "N2", "N1", "CUSTOM"];
  const LEVEL_ORDER = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5, CUSTOM: 6 };
  const LIBRARY_LEVELS = ["N1", "N2", "N3", "N4", "N5", "CUSTOM"];
  const LEVEL_LABELS = { N5: "N5", N4: "N4", N3: "N3", N2: "N2", N1: "N1", CUSTOM: "自定义" };
  const SPEECH_VOICE_CHOICES = [
    { key: "nanami", label: "七海（女声）", terms: ["nanami", "七海"] },
    { key: "keita", label: "圭太（男声）", terms: ["keita", "圭太"] },
  ];
  const DAY = 24 * 60 * 60 * 1000;
  const OCR_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
  const OCR_FIELD_KEYS = ["word", "kana", "pos", "accent", "meaning", "note"];
  const CHOICE_MODES = new Set(["wordToMeaning", "meaningToKana", "listening"]);
  const KANA_TILE_POOL = [..."あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだでどばびぶべぼぱぴぷぺぽー"];

  const DEFAULT_SETTINGS = {
    theme: "light",
    dailyGoal: 20,
    autoSpeak: true,
    speechMode: "kana",
    speechVoice: "",
    speechRate: 0.85,
    speechPitch: 1,
    studyLevel: "all",
    studyScope: "today",
    studyCount: 20,
    studyMode: "mixed",
    studyOrder: "sequence",
  };

  const KANA_GROUPS = [
    { key: "all", label: "全部", chars: "" },
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
    { key: "他", label: "其他", chars: "" },
  ];


  const ROMAJI_PAIRS = [
    ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"], ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
    ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"], ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
    ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"], ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
    ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"], ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
    ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"], ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
    ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"], ["ふぁ", "fa"], ["ふぃ", "fi"], ["ふぇ", "fe"], ["ふぉ", "fo"],
  ];
  const ROMAJI_SINGLE = {
    あ:"a", い:"i", う:"u", え:"e", お:"o", か:"ka", き:"ki", く:"ku", け:"ke", こ:"ko",
    さ:"sa", し:"shi", す:"su", せ:"se", そ:"so", た:"ta", ち:"chi", つ:"tsu", て:"te", と:"to",
    な:"na", に:"ni", ぬ:"nu", ね:"ne", の:"no", は:"ha", ひ:"hi", ふ:"fu", へ:"he", ほ:"ho",
    ま:"ma", み:"mi", む:"mu", め:"me", も:"mo", や:"ya", ゆ:"yu", よ:"yo", ら:"ra", り:"ri",
    る:"ru", れ:"re", ろ:"ro", わ:"wa", を:"wo", ん:"n", が:"ga", ぎ:"gi", ぐ:"gu", げ:"ge", ご:"go",
    ざ:"za", じ:"ji", ず:"zu", ぜ:"ze", ぞ:"zo", だ:"da", ぢ:"ji", づ:"zu", で:"de", ど:"do",
    ば:"ba", び:"bi", ぶ:"bu", べ:"be", ぼ:"bo", ぱ:"pa", ぴ:"pi", ぷ:"pu", ぺ:"pe", ぽ:"po",
    ぁ:"a", ぃ:"i", ぅ:"u", ぇ:"e", ぉ:"o", ゃ:"ya", ゅ:"yu", ょ:"yo", ー:"-"
  };

  const state = {
    baseWords: [],
    savedBaseWords: [],
    customWords: [],
    deletedIds: new Set(),
    words: [],
    wordMap: new Map(),
    progress: {},
    history: [],
    studyCursors: {},
    settings: { ...DEFAULT_SETTINGS },
    activeView: "dashboardView",
    library: { query: "", level: "all", status: "all", source: "all", kana: "all" },
    filteredWords: [],
    selectedIds: new Set(),
    dialogWordId: null,
    confirmAction: null,
    session: null,
    summaryDestination: null,
    voices: [],
    ocr: { busy: false, scriptPromise: null },
    kanaScrubber: { items: [], dragging: false, raf: 0 },
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    loadPersistentState();
    applyTheme();
    disableBrowserFormReuse();
    bindCustomTextFields();
    bindNavigation();
    bindGlobalActions();
    bindLibraryEvents();
    bindStudyEvents();
    bindManageEvents();
    bindSettingsEvents();
    bindDialogEvents();
    bindKeyboardShortcuts();
    setupSpeechVoices();
    await loadWords();
    refreshWords();
    syncControlsFromSettings();
    renderAll();
    registerServiceWorker();
  }

  function loadPersistentState() {
    const savedBaseWords = loadJson(STORAGE.base, []);
    state.savedBaseWords = Array.isArray(savedBaseWords) ? savedBaseWords : [];
    state.customWords = loadJson(STORAGE.custom, []);
    state.deletedIds = new Set(loadJson(STORAGE.deleted, []));
    state.progress = loadJson(STORAGE.progress, {});
    state.history = loadJson(STORAGE.history, []);
    const cursors = loadJson(STORAGE.cursors, {});
    state.studyCursors = cursors && typeof cursors === "object" && !Array.isArray(cursors) ? cursors : {};
    const storedSettings = loadJson(STORAGE.settings, {});
    const oldSpeech = loadJson(STORAGE.speech, {});
    state.settings = {
      ...DEFAULT_SETTINGS,
      ...storedSettings,
      speechMode: storedSettings.speechMode ?? oldSpeech.mode ?? DEFAULT_SETTINGS.speechMode,
      speechVoice: storedSettings.speechVoice ?? oldSpeech.voiceURI ?? DEFAULT_SETTINGS.speechVoice,
      speechRate: Number(storedSettings.speechRate ?? oldSpeech.rate ?? DEFAULT_SETTINGS.speechRate),
      speechPitch: Number(storedSettings.speechPitch ?? oldSpeech.pitch ?? DEFAULT_SETTINGS.speechPitch),
    };
    if (!["sequence", "random"].includes(state.settings.studyOrder)) state.settings.studyOrder = "sequence";
  }

  async function loadWords() {
    let raw = null;
    if (Array.isArray(window.DEFAULT_VOCAB) && window.DEFAULT_VOCAB.length) {
      raw = window.DEFAULT_VOCAB;
    } else {
      try {
        const response = await fetch("./assets/vocab.json", { cache: "no-cache" });
        if (response.ok) raw = await response.json();
      } catch (_) {
        // 词库文件可选；没有文件时保持空词库，不再注入演示词。
      }
    }
    const source = Array.isArray(raw) ? raw : [];
    const loadedBase = source.map((item, index) => normalizeWord(item, index, false)).filter(Boolean);
    state.baseWords = mergeStoredBaseWords(loadedBase);
    if (!state.baseWords.length && !state.customWords.length) {
      toast("未检测到词汇数据，请在“词库管理”中导入词库。", "error", 5200);
    }
  }

  function mergeStoredBaseWords(loadedBase) {
    const stored = state.savedBaseWords
      .map((item, index) => normalizeWord(item, index, false))
      .filter(Boolean);
    if (!stored.length) return loadedBase;
    const storedById = new Map(stored.map((word) => [word.id, word]));
    const loadedIds = new Set(loadedBase.map((word) => word.id));
    const merged = loadedBase.map((word) => {
      const saved = storedById.get(word.id);
      return saved ? { ...word, ...saved, _custom: false } : word;
    });
    stored.forEach((word) => {
      if (!loadedIds.has(word.id)) merged.push({ ...word, _custom: false });
    });
    return merged;
  }

  function refreshWords() {
    const builtIn = state.baseWords.filter((word) => !state.deletedIds.has(word.id));
    const custom = state.customWords.map((item, index) => normalizeWord(item, index, true)).filter(Boolean);
    const merged = [...builtIn, ...custom];
    const seen = new Set();
    state.words = merged.filter((word) => {
      if (!word.id || seen.has(word.id)) return false;
      seen.add(word.id);
      buildSearchIndex(word);
      return true;
    });
    state.wordMap = new Map(state.words.map((word) => [word.id, word]));
    state.selectedIds = new Set([...state.selectedIds].filter((id) => state.wordMap.has(id)));
    populateSourceSelects();
  }

  function normalizeWord(raw, index, isCustom) {
    if (!raw || typeof raw !== "object") return null;
    const word = normalizeText(pickField(raw, ["word", "单词", "写法", "詞彙", "词汇", "表記", "汉字", "語彙"]));
    const meaning = normalizeText(pickField(raw, ["meaning", "含义", "意思", "释义", "中文", "翻译", "translation", "definition"]));
    if (!word || !meaning) return null;
    const kana = normalizeText(pickField(raw, ["kana", "假名", "读音", "読み", "よみ", "furigana"]));
    const level = normalizeLevel(pickField(raw, ["level", "等级", "級別", "级别", "JLPT"]) || (isCustom ? "CUSTOM" : "N5"));
    const source = normalizeText(pickField(raw, ["source", "词库", "詞庫", "listName", "book", "来源"])) || (isCustom ? "我的词库" : "内置词库");
    const rawId = normalizeText(raw.id);
    const id = rawId || `${isCustom ? "custom" : "base"}-${simpleHash(`${word}|${kana}|${meaning}|${index}`)}`;
    return {
      ...raw,
      id,
      seq: Number(raw.seq ?? index),
      level,
      type: normalizeText(pickField(raw, ["type", "类型", "條目", "条目"])) || "主词条",
      word,
      kana,
      pos: normalizeText(pickField(raw, ["pos", "词性", "詞性", "品词", "品詞"])),
      accent: normalizeText(pickField(raw, ["accent", "音调", "音調", "声调", "聲調"])),
      meaning,
      source,
      note: normalizeText(pickField(raw, ["note", "备注", "備註", "memo", "例句"])),
      status: normalizeText(raw.status),
      _custom: Boolean(isCustom || String(id).startsWith("custom-")),
    };
  }

  function buildSearchIndex(word) {
    word._romaji = kanaToRomaji(`${word.kana || ""} ${word.word || ""}`).toLowerCase();
    word._search = [word.word, word.kana, word.meaning, word.pos, word.accent, word.level, word.source, word.type, word.note, word._romaji]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    word._kanaGroup = getKanaGroup(word);
  }

  function bindNavigation() {
    $$('[data-view]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view, button)));
    $$('[data-view-jump]').forEach((button) => button.addEventListener("click", () => switchView(button.dataset.viewJump)));
  }

  function switchView(viewId, sourceButton = null) {
    if (!$(viewId)) return;
    state.activeView = viewId;
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    $$('[data-view]').forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
    const navButton = sourceButton || document.querySelector(`.side-nav [data-view="${viewId}"]`);
    const title = navButton?.dataset.title || getViewTitle(viewId).title;
    const subtitle = navButton?.dataset.subtitle || getViewTitle(viewId).subtitle;
    $("pageTitle").textContent = title;
    $("pageSubtitle").textContent = subtitle;
    $("mobilePageTitle").textContent = title;
    instantScrollTo(0);
    if (viewId !== "libraryView") $("kanaScrubber")?.classList.add("hidden");
    if (viewId === "libraryView") renderLibrary();
    if (viewId === "insightsView") renderInsights();
    if (viewId === "studyView") renderStudyConfig();
    updateLibraryTopButton();
  }

  function getViewTitle(viewId) {
    return {
      dashboardView: { title: "今日学习", subtitle: "把最重要的复习放在最前面" },
      libraryView: { title: "词汇库", subtitle: "搜索、筛选与整理你的词汇" },
      studyView: { title: "开始学习", subtitle: "按你的节奏安排一轮复习" },
      manageView: { title: "词库管理", subtitle: "添加、导入与备份词汇" },
      insightsView: { title: "学习洞察", subtitle: "从数据中找到下一步重点" },
      settingsView: { title: "偏好设置", subtitle: "调整外观、朗读和学习习惯" },
    }[viewId] || { title: "Kotoba Flow", subtitle: "JLPT 日语复习" };
  }

  function bindGlobalActions() {
    $("themeBtn").addEventListener("click", toggleTheme);
    $("mobileThemeBtn").addEventListener("click", toggleTheme);
    $("quickBackupBtn").addEventListener("click", exportBackup);
    $("startDueBtn").addEventListener("click", () => startRecommendedSession("due"));
    $("startQuickBtn").addEventListener("click", () => startRecommendedSession("quick"));
    $("viewAllDueBtn").addEventListener("click", () => {
      state.library.status = "due";
      $("libraryStatus").value = "due";
      switchView("libraryView");
    });
  }

  function bindLibraryEvents() {
    $("librarySearch").addEventListener("input", (event) => {
      state.library.query = event.target.value;
      renderLibrary();
    });
    [
      ["libraryLevel", "level"], ["libraryStatus", "status"], ["librarySource", "source"],
    ].forEach(([id, key]) => $(id).addEventListener("change", (event) => {
      state.library[key] = event.target.value;
      renderLibrary();
    }));
    $("resetLibraryFilters").addEventListener("click", () => {
      state.library = { query: "", level: "all", status: "all", source: "all", kana: "all" };
      syncLibraryControls();
      renderLibrary();
    });
    $("wordGrid").addEventListener("click", handleWordGridClick);
    $("selectPageBtn").addEventListener("click", () => {
      state.filteredWords.forEach((word) => state.selectedIds.add(word.id));
      renderLibrary();
    });
    $("clearSelectionBtn").addEventListener("click", () => {
      state.selectedIds.clear();
      renderLibrary();
    });
    $("starSelectedBtn").addEventListener("click", starSelectedWords);
    $("studySelectedBtn").addEventListener("click", () => startSessionFromIds([...state.selectedIds], { manual: true, includeMastered: true, scope: "manual" }));
    $("deleteSelectedBtn").addEventListener("click", deleteSelectedWords);
    $("studyFilteredBtn").addEventListener("click", () => {
      const limit = Math.max(1, Number($("studyCount").value || 20));
      const includeMastered = state.library.status === "mastered";
      const words = includeMastered ? state.filteredWords : state.filteredWords.filter((word) => !isMastered(state.progress[word.id]));
      startSessionFromIds(words.slice(0, limit).map((word) => word.id), { manual: true, includeMastered, scope: includeMastered ? "mastered" : "manual" });
    });
    $("libraryTopBtn")?.addEventListener("click", scrollLibraryToTop);
    bindKanaScrubberEvents();
  }

  function bindKanaScrubberEvents() {
    const track = $("kanaScrubberTrack");
    if (!track) return;
    const seekFromPointer = (event) => {
      const rect = track.getBoundingClientRect();
      const ratio = clamp((event.clientY - rect.top) / Math.max(1, rect.height), 0, 1);
      seekKanaScrubber(ratio);
    };
    track.addEventListener("pointerdown", (event) => {
      if (!state.kanaScrubber.items.length) return;
      event.preventDefault();
      state.kanaScrubber.dragging = true;
      document.documentElement.classList.add("instant-scroll");
      track.setPointerCapture?.(event.pointerId);
      $("kanaScrubber")?.classList.add("dragging");
      seekFromPointer(event);
    });
    track.addEventListener("pointermove", (event) => {
      if (!state.kanaScrubber.dragging) return;
      event.preventDefault();
      seekFromPointer(event);
    });
    const finishDrag = (event) => {
      if (!state.kanaScrubber.dragging) return;
      state.kanaScrubber.dragging = false;
      track.releasePointerCapture?.(event.pointerId);
      document.documentElement.classList.remove("instant-scroll");
      $("kanaScrubber")?.classList.remove("dragging");
      scheduleKanaScrubberUpdate();
      updateLibraryTopButton();
    };
    track.addEventListener("pointerup", finishDrag);
    track.addEventListener("pointercancel", finishDrag);
    track.addEventListener("keydown", (event) => {
      if (!state.kanaScrubber.items.length) return;
      const current = Number(track.getAttribute("aria-valuenow") || 0) / 100;
      const step = 1 / Math.max(1, state.kanaScrubber.items.length - 1);
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) event.preventDefault();
      if (event.key === "ArrowUp") seekKanaScrubber(current - step);
      if (event.key === "ArrowDown") seekKanaScrubber(current + step);
      if (event.key === "PageUp") seekKanaScrubber(current - step * 10);
      if (event.key === "PageDown") seekKanaScrubber(current + step * 10);
      if (event.key === "Home") seekKanaScrubber(0);
      if (event.key === "End") seekKanaScrubber(1);
    });
    window.addEventListener("scroll", () => {
      scheduleKanaScrubberUpdate();
      updateLibraryTopButton();
    }, { passive: true });
    window.addEventListener("resize", scheduleKanaScrubberMeasure, { passive: true });
  }

  function bindStudyEvents() {
    $$('[data-preset]').forEach((button) => button.addEventListener("click", () => applyStudyPreset(button.dataset.preset)));
    ["studyLevel", "studyScope", "studyCount", "studyOrder", "studyAutoSpeak"].forEach((id) => {
      $(id).addEventListener("change", () => {
        updateStudySettingsFromControls();
        renderStudyConfig();
      });
    });
    $("startStudyBtn").addEventListener("click", () => startConfiguredSession());
    $("closeStudyBtn").addEventListener("click", requestCloseStudy);
    $("studySpeakBtn").addEventListener("click", () => speakWord(currentSessionWord()));
    $("studyStarBtn").addEventListener("click", () => toggleStar(currentSessionWord()?.id));
    $("studyMasteredBtn").addEventListener("click", markCurrentWordMastered);
    $("showAnswerBtn").addEventListener("click", revealCurrentAnswer);
    $("studyOptions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-choice-id]");
      if (button) answerChoice(button.dataset.choiceId);
    });
    $("typingAnswerForm").addEventListener("submit", (event) => {
      event.preventDefault();
      answerTyping($("typingAnswer").value);
    });
    $("studyPrompt").addEventListener("click", (event) => {
      if (event.target.closest("[data-study-prompt-speak]")) speakWord(currentSessionWord());
    });
    $("kanaBuildChoices").addEventListener("click", (event) => {
      const button = event.target.closest("[data-kana-choice-index]");
      if (button) selectKanaChoice(Number(button.dataset.kanaChoiceIndex));
    });
    $("kanaBuildSlots").addEventListener("click", (event) => {
      const button = event.target.closest("[data-kana-slot-index]");
      if (button) removeKanaChoice(Number(button.dataset.kanaSlotIndex));
    });
    $("kanaBuildSubmit").addEventListener("click", answerKanaBuild);
    $("previousCardBtn").addEventListener("click", goToPreviousCard);
    $("nextCardBtn").addEventListener("click", goToNextCard);
    $("skipCardBtn").addEventListener("click", skipCurrentCard);
    $("studyAgainBtn").addEventListener("click", () => {
      state.summaryDestination = "studyView";
      $("sessionSummaryDialog").close();
    });
    $("sessionSummaryDialog").addEventListener("close", () => {
      if (!$("studyOverlay").classList.contains("hidden")) closeStudyOverlay();
      const destination = state.summaryDestination || "dashboardView";
      state.summaryDestination = null;
      state.session = null;
      switchView(destination);
      renderAll();
    });
  }

  function bindManageEvents() {
    $("addWordForm").addEventListener("submit", addSingleWord);
    bindOcrDropZone();
    $("importWordsInput").addEventListener("change", (event) => importWordFiles([...event.target.files]));
    const dropZone = $("dropZone");
    ["dragenter", "dragover"].forEach((type) => dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.add("dragging");
    }));
    ["dragleave", "drop"].forEach((type) => dropZone.addEventListener(type, (event) => {
      event.preventDefault();
      dropZone.classList.remove("dragging");
    }));
    dropZone.addEventListener("drop", (event) => importWordFiles([...event.dataTransfer.files]));
    $("exportBackupBtn").addEventListener("click", exportBackup);
    $("importBackupBtn").addEventListener("click", () => $("backupFileInput").click());
    $("backupFileInput").addEventListener("change", importBackupFile);
    $("exportLibraryBtn").addEventListener("click", exportLibrary);
    $("restoreBuiltInBtn").addEventListener("click", restoreBuiltInWords);
    $("sourceOverview").addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-source]");
      if (button) deleteSource(button.dataset.deleteSource);
    });
  }

  function bindOcrDropZone() {
    const zone = $("ocrDropZone");
    const input = $("ocrImageInput");
    if (!zone || !input) return;
    zone.addEventListener("click", () => {
      zone.focus();
      setOcrStatus("hint", "截图后按 Ctrl+V 粘贴到这里，我会自动识别并填入字段。");
    });
    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        zone.focus();
        setOcrStatus("hint", "截图后按 Ctrl+V 粘贴到这里，也可以把图片拖到这个框里。");
      }
    });
    input.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) handleOcrImage(file);
    });
    ["dragenter", "dragover"].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    }));
    ["dragleave", "drop"].forEach((type) => zone.addEventListener(type, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    }));
    zone.addEventListener("drop", (event) => {
      const file = imageFileFromTransfer(event.dataTransfer);
      if (file) handleOcrImage(file);
      else toast("请拖入 PNG、JPG 或 WebP 截图。", "error");
    });
    document.addEventListener("paste", (event) => {
      if (state.activeView !== "manageView" || state.ocr.busy) return;
      const file = imageFileFromTransfer(event.clipboardData);
      if (!file) return;
      event.preventDefault();
      handleOcrImage(file);
    });
  }

  function imageFileFromTransfer(dataTransfer) {
    const file = [...(dataTransfer?.files || [])].find((item) => item.type.startsWith("image/"));
    if (file) return file;
    return [...(dataTransfer?.items || [])]
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .find(Boolean) || null;
  }

  function bindSettingsEvents() {
    $$("[data-theme-option]").forEach((button) => button.addEventListener("click", () => {
      state.settings.theme = button.dataset.themeOption;
      saveSettings();
      applyTheme();
      renderSettings();
    }));
    $("dailyGoal").addEventListener("input", (event) => {
      state.settings.dailyGoal = Number(event.target.value);
      $("dailyGoalValue").textContent = `${state.settings.dailyGoal} 题`;
      saveSettings();
      renderDashboard();
    });
    $("autoSpeak").addEventListener("change", (event) => {
      state.settings.autoSpeak = event.target.checked;
      saveSettings();
    });
    $("speechMode").addEventListener("change", saveSpeechControls);
    $("speechVoice").addEventListener("change", saveSpeechControls);
    $("speechRate").addEventListener("input", () => {
      $("speechRateValue").textContent = Number($("speechRate").value).toFixed(2);
      saveSpeechControls();
    });
    $("speechPitch").addEventListener("input", () => {
      $("speechPitchValue").textContent = Number($("speechPitch").value).toFixed(2);
      saveSpeechControls();
    });
    $("testSpeechBtn").addEventListener("click", () => speakText("日本語を勉強します"));
    $("resetProgressBtn").addEventListener("click", resetProgress);
    $("clearHistoryBtn").addEventListener("click", clearHistory);
  }

  function bindDialogEvents() {
    $("dialogSpeakBtn").addEventListener("click", () => speakWord(state.wordMap.get(state.dialogWordId)));
    $("dialogStarBtn").addEventListener("click", () => {
      toggleStar(state.dialogWordId);
      openWordDialog(state.dialogWordId, true);
    });
    $("dialogStudyBtn").addEventListener("click", () => {
      $("wordDialog").close();
      startSessionFromIds([state.dialogWordId], { manual: true, includeMastered: true, scope: "manual" });
    });
    $("dialogEditMeaningBtn").addEventListener("click", showMeaningEditor);
    $("dialogCancelMeaningBtn").addEventListener("click", hideMeaningEditor);
    $("dialogSaveMeaningBtn").addEventListener("click", saveDialogMeaning);
    $("dialogDeleteBtn").addEventListener("click", () => {
      const id = state.dialogWordId;
      $("wordDialog").close();
      requestDeleteWords([id]);
    });
    $("confirmOkBtn").addEventListener("click", () => {
      const action = state.confirmAction;
      state.confirmAction = null;
      if (typeof action === "function") action();
    });
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || Boolean(target?.isContentEditable);
      const overlayOpen = !$("studyOverlay").classList.contains("hidden");
      if (overlayOpen) {
        const session = state.session;
        const card = currentSessionCard();
        if (event.key === "Escape") {
          event.preventDefault();
          requestCloseStudy();
          return;
        }
        if (card?.answered && (event.key === "Enter" || event.key === "ArrowRight")) {
          event.preventDefault();
          goToNextCard();
          return;
        }
        if (!typing && event.key === "ArrowLeft") {
          event.preventDefault();
          goToPreviousCard();
          return;
        }
        if (typing) return;
        if (event.key.toLowerCase() === "s") {
          event.preventDefault();
          speakWord(currentSessionWord());
          return;
        }
        if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          toggleStar(currentSessionWord()?.id);
          return;
        }
        if (event.code === "Space") {
          event.preventDefault();
          revealCurrentAnswer();
          return;
        }
        return;
      }
      if (!typing && event.key === "/" && state.activeView === "libraryView") {
        event.preventDefault();
        $("librarySearch").focus();
      }
    });
  }

  function renderAll() {
    $("todayText").textContent = formatLongDate(new Date());
    renderDashboard();
    renderLibrary();
    renderStudyConfig();
    renderManage();
    renderInsights();
    renderSettings();
  }

  function disableBrowserFormReuse() {
    const nonce = Date.now().toString(36);
    $$("form").forEach((form) => {
      form.setAttribute("autocomplete", "off");
      form.setAttribute("data-form-type", "other");
    });
    $$("input, textarea").forEach((field, index) => {
      const type = String(field.getAttribute("type") || "").toLowerCase();
      if (["file", "range", "checkbox", "radio", "button", "submit", "reset"].includes(type)) return;
      const isSearch = type === "search";
      field.setAttribute("autocomplete", isSearch ? "off" : "new-password");
      field.setAttribute("autocorrect", "off");
      field.setAttribute("autocapitalize", "off");
      field.setAttribute("spellcheck", "false");
      field.setAttribute("data-lpignore", "true");
      field.setAttribute("data-form-type", "other");
      field.name = `kf-${field.id || "field"}-${nonce}-${index}`;
    });
  }

  function bindCustomTextFields() {
    $$("[contenteditable][role='textbox']").forEach((field) => {
      field.dataset.plainTextField = "true";
      field.setAttribute("spellcheck", "false");
      field.setAttribute("autocorrect", "off");
      field.setAttribute("autocapitalize", "off");
      syncCustomFieldState(field);
      field.addEventListener("input", () => syncCustomFieldState(field));
      field.addEventListener("blur", () => setCustomFieldText(field, customFieldValue(field)));
      field.addEventListener("keydown", (event) => {
        const multiline = field.dataset.multiline === "true";
        if (event.key === "Enter" && !multiline && !event.isComposing) {
          event.preventDefault();
          if (event.ctrlKey || event.metaKey) $("addWordForm")?.requestSubmit();
        }
      });
      field.addEventListener("paste", (event) => {
        const hasImage = Boolean(imageFileFromTransfer(event.clipboardData));
        if (hasImage) return;
        const text = event.clipboardData?.getData("text/plain");
        if (!text) return;
        event.preventDefault();
        const multiline = field.dataset.multiline === "true";
        insertPlainText(field, multiline ? text.replace(/\r\n?/g, "\n") : normalizeText(text));
        syncCustomFieldState(field);
      });
    });
  }

  function fieldValue(id) {
    const field = $(id);
    if (!field) return "";
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) return field.value;
    return customFieldValue(field);
  }

  function setFieldValue(id, value) {
    const field = $(id);
    if (!field) return;
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      field.value = value ?? "";
      return;
    }
    setCustomFieldText(field, value);
  }

  function resetAddWordForm() {
    $("addLevel").value = "N5";
    ["addWord", "addKana", "addPos", "addAccent", "addMeaning", "addNote"].forEach((id) => setFieldValue(id, ""));
    setFieldValue("addSource", "我的词库");
  }

  function customFieldValue(field) {
    const raw = String(field?.innerText ?? field?.textContent ?? "").replace(/\u00a0/g, " ").replace(/\r\n?/g, "\n");
    return field?.dataset?.multiline === "true"
      ? raw.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
      : normalizeText(raw);
  }

  function setCustomFieldText(field, value) {
    if (!field) return;
    const text = field.dataset.multiline === "true" ? String(value ?? "").replace(/\r\n?/g, "\n").trim() : normalizeText(value);
    field.textContent = text;
    syncCustomFieldState(field);
  }

  function syncCustomFieldState(field) {
    field?.classList.toggle("is-empty", !customFieldValue(field));
  }

  function insertPlainText(field, text) {
    if (document.queryCommandSupported?.("insertText")) {
      document.execCommand("insertText", false, text);
    } else {
      field.textContent = `${field.textContent || ""}${text}`;
    }
  }

  function renderDashboard() {
    const stats = calculateStats();
    const goal = Math.max(1, state.settings.dailyGoal);
    const goalPct = clamp((stats.todayAnswers / goal) * 100, 0, 100);
    const hour = new Date().getHours();
    $("greetingTitle").textContent = hour < 11 ? "早上好，先完成一小轮吧。" : hour < 18 ? "今天也进步一点点。" : "晚上好，把今天的记忆收个尾。";
    $("heroMessage").textContent = stats.due > 0
      ? `有 ${stats.due} 个词已到期。先复习，再学习少量新词，记忆会更稳。`
      : "今天的到期复习已经清空，可以学习少量新词或巩固薄弱项。";
    $("goalRing").style.setProperty("--value", goalPct.toFixed(1));
    $("goalRingValue").textContent = stats.todayAnswers;
    $("goalRingLabel").textContent = `/ ${goal} 题`;
    $("sidebarGoalText").textContent = `${stats.todayAnswers} / ${goal}`;
    $("sidebarGoalBar").style.width = `${goalPct}%`;
    $("streakHero").textContent = `连续 ${stats.streak} 天`;
    $("focusDue").textContent = stats.due;
    $("focusNew").textContent = Math.min(10, stats.unseen);
    $("focusHard").textContent = stats.difficult;
    $("metricLearned").textContent = stats.learned.toLocaleString();
    $("metricLearnedSub").textContent = `共 ${stats.total.toLocaleString()} 词`;
    $("metricDue").textContent = stats.due.toLocaleString();
    $("metricAccuracy").textContent = `${stats.accuracy}%`;
    $("metricAccuracySub").textContent = stats.answers ? `累计 ${stats.answers.toLocaleString()} 次作答` : "尚无答题记录";
    $("metricMastered").textContent = stats.mastered.toLocaleString();
    renderDuePreview();
    renderWeekBars();
    renderLevelProgress($("dashboardLevelProgress"), false);
  }

  function renderDuePreview() {
    const dueWords = state.words
      .filter((word) => {
        const p = state.progress[word.id] || {};
        return isDue(p) && !isMastered(p);
      })
      .sort((a, b) => (state.progress[a.id]?.nextReview || 0) - (state.progress[b.id]?.nextReview || 0))
      .slice(0, 5);
    const root = $("duePreview");
    if (!dueWords.length) {
      root.innerHTML = `<div class="empty-state"><div><strong>今天的到期复习已清空</strong><span>可以学习 10 个新词，保持稳定节奏。</span></div></div>`;
      return;
    }
    root.innerHTML = dueWords.map((word) => compactWordTemplate(word, "到期")).join("");
    root.querySelectorAll("[data-word-id]").forEach((node) => node.addEventListener("click", () => openWordDialog(node.dataset.wordId)));
  }

  function renderWeekBars() {
    const days = lastNDays(7);
    const counts = new Map(days.map((date) => [dateKey(date), 0]));
    state.history.forEach((item) => {
      const key = dateKey(new Date(Number(item.time || item.timestamp || 0)));
      if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    });
    const values = days.map((date) => counts.get(dateKey(date)) || 0);
    const max = Math.max(1, ...values);
    $("weekBars").innerHTML = days.map((date, index) => {
      const value = values[index];
      const height = Math.max(5, Math.round((value / max) * 100));
      const active = dateKey(date) === dateKey(new Date()) ? " active" : "";
      return `<div class="week-bar${active}" title="${escapeAttr(formatShortDate(date))} · ${value} 题"><span style="--height:${height}%"></span><small>${weekdayShort(date)}</small></div>`;
    }).join("");
    const total = values.reduce((sum, value) => sum + value, 0);
    $("weekAnswerTotal").textContent = `${total} 题`;
    $("weekSummary").textContent = total
      ? `最近 7 天共完成 ${total} 题，${values.filter(Boolean).length} 天有学习记录。`
      : "完成第一轮学习后，这里会显示你的节奏。";
  }

  function calculateStats() {
    let learned = 0;
    let due = 0;
    let mastered = 0;
    let unseen = 0;
    let difficult = 0;
    let correct = 0;
    let wrong = 0;
    state.words.forEach((word) => {
      const p = state.progress[word.id] || {};
      if (p.seen > 0) learned += 1; else unseen += 1;
      const masteredWord = isMastered(p);
      if (masteredWord) mastered += 1;
      if (!masteredWord && isDue(p)) due += 1;
      if (!masteredWord && isDifficult(p)) difficult += 1;
      correct += Number(p.correct || 0);
      wrong += Number(p.wrong || 0);
    });
    const answers = correct + wrong;
    const today = dateKey(new Date());
    const todayAnswers = state.history.filter((item) => dateKey(new Date(Number(item.time || item.timestamp || 0))) === today).length;
    return {
      total: state.words.length,
      learned,
      due,
      mastered,
      unseen,
      difficult,
      correct,
      wrong,
      answers,
      accuracy: answers ? Math.round((correct / answers) * 100) : 0,
      todayAnswers,
      streak: calculateStreak(),
    };
  }

  function calculateStreak() {
    const dates = new Set(state.history.map((item) => dateKey(new Date(Number(item.time || item.timestamp || 0)))).filter(Boolean));
    if (!dates.size) return 0;
    let cursor = startOfDay(new Date());
    if (!dates.has(dateKey(cursor))) cursor = new Date(cursor.getTime() - DAY);
    let streak = 0;
    while (dates.has(dateKey(cursor))) {
      streak += 1;
      cursor = new Date(cursor.getTime() - DAY);
    }
    return streak;
  }

  function renderLevelProgress(root, detailed) {
    const levels = ["N5", "N4", "N3", "N2", "N1", "CUSTOM"];
    root.innerHTML = levels.map((level) => {
      const words = state.words.filter((word) => word.level === level);
      if (!words.length) return "";
      const learned = words.filter((word) => (state.progress[word.id]?.seen || 0) > 0).length;
      const mastered = words.filter((word) => isMastered(state.progress[word.id])).length;
      const pct = words.length ? Math.round((learned / words.length) * 100) : 0;
      const meta = detailed ? `${mastered} 已掌握` : `${learned} / ${words.length}`;
      return `<div class="level-progress-item"><strong>${LEVEL_LABELS[level]}</strong><div class="level-progress-main"><div class="level-progress-meta"><span>已学习 ${learned.toLocaleString()} / ${words.length.toLocaleString()}</span><span>${pct}%</span></div><div class="level-progress-track"><span style="width:${pct}%"></span></div></div><span>${meta}</span></div>`;
    }).join("") || `<div class="empty-state">暂无等级数据</div>`;
  }

  function renderLibrary() {
    const filtered = getFilteredWords();
    state.filteredWords = filtered;
    if (state.activeView !== "libraryView") return;
    syncLibraryControls();
    renderKanaChips();
    $("libraryResultCount").textContent = `${filtered.length.toLocaleString()} 个词`;
    $("libraryResultHint").textContent = !state.words.length
      ? "当前没有词汇，请先导入词库"
      : filtered.length === state.words.length
        ? `词库共 ${state.words.length.toLocaleString()} 个词`
        : `已从 ${state.words.length.toLocaleString()} 个词中筛选`;
    renderLibraryStream(filtered);
    renderSelectionBar();
    scheduleKanaScrubberMeasure();
  }

  function getFilteredWords() {
    const query = normalizeText(state.library.query).toLowerCase();
    const now = Date.now();
    return state.words.filter((word) => {
      if (state.library.level !== "all" && word.level !== state.library.level) return false;
      if (state.library.source !== "all" && word.source !== state.library.source) return false;
      if (state.library.kana !== "all" && word._kanaGroup !== state.library.kana) return false;
      const p = state.progress[word.id] || {};
      if (state.library.status === "due" && (!(p.nextReview && p.nextReview <= now) || isMastered(p))) return false;
      if (state.library.status === "new" && (p.seen || 0) > 0) return false;
      if (state.library.status === "starred" && !p.starred) return false;
      if (state.library.status === "difficult" && (!isDifficult(p) || isMastered(p))) return false;
      if (state.library.status === "mastered" && !isMastered(p)) return false;
      return !query || word._search.includes(query) || word._romaji.includes(query);
    }).sort((a, b) => {
      const groupDiff = LIBRARY_LEVELS.indexOf(a.level) - LIBRARY_LEVELS.indexOf(b.level);
      return groupDiff || compareKana(a, b);
    });
  }

  function renderLibraryStream(words) {
    const root = $("wordGrid");
    if (!words.length) {
      const title = state.words.length ? "没有找到匹配词汇" : "词库还是空的";
      const text = state.words.length ? "试试减少筛选条件或换一个关键词。" : "前往“词库管理”导入 JSON、CSV、TSV 或 XLSX 词库。";
      root.innerHTML = `<div class="empty-state library-empty"><div><strong>${title}</strong><span>${text}</span></div></div>`;
      state.kanaScrubber.items = [];
      $("kanaScrubber")?.classList.add("hidden");
      return;
    }
    state.kanaScrubber.items = words.map((word, index) => ({
      id: word.id,
      level: word.level,
      kana: getKanaPositionLabel(word),
      index,
    }));
    const streamIndex = new Map(state.kanaScrubber.items.map((item) => [item.id, item.index]));
    const requestedLevels = state.library.level === "all" ? LIBRARY_LEVELS : [state.library.level];
    root.innerHTML = requestedLevels.map((level) => {
      const levelWords = words.filter((word) => word.level === level).sort(compareKana);
      if (!levelWords.length) return "";
      const learned = levelWords.filter((word) => (state.progress[word.id]?.seen || 0) > 0).length;
      const firstKana = getKanaPositionLabel(levelWords[0]);
      const lastKana = getKanaPositionLabel(levelWords[levelWords.length - 1]);
      return `<section class="vocab-level-section" data-level-section="${escapeAttr(level)}">
        <header class="vocab-level-header">
          <span class="vocab-level-mark">${escapeHtml(LEVEL_LABELS[level] || level)}</span>
          <div><h2>${escapeHtml(LEVEL_LABELS[level] || level)} 词汇</h2><p>${levelWords.length.toLocaleString()} 个 · 已学习 ${learned.toLocaleString()} 个 · 假名 ${escapeHtml(firstKana)} → ${escapeHtml(lastKana)}</p></div>
        </header>
        <div class="vocab-waterfall">${levelWords.map((word) => wordCardTemplate(word, streamIndex.get(word.id))).join("")}</div>
      </section>`;
    }).join("");
  }

  function wordCardTemplate(word, index = 0) {
    const p = state.progress[word.id] || {};
    const selected = state.selectedIds.has(word.id);
    const status = getWordStatus(p);
    const dueText = status === "due" ? "现在复习" : status === "mastered" ? "已掌握" : p.seen ? `已学习 ${p.seen} 次` : "尚未学习";
    const kanaLabel = getKanaPositionLabel(word);
    return `<article class="word-card${selected ? " selected" : ""}" data-id="${escapeAttr(word.id)}" data-level="${escapeAttr(word.level)}" data-kana-label="${escapeAttr(kanaLabel)}" data-kana="${escapeAttr(word.kana || word.word)}" data-stream-index="${index}">
      <input class="word-select" type="checkbox" aria-label="选择 ${escapeAttr(word.word)}" ${selected ? "checked" : ""} />
      <div class="word-card-main">
        <div class="word-card-title"><h3>${escapeHtml(word.word)}</h3>${word.kana ? `<span class="kana-inline">${escapeHtml(word.kana)}</span>` : ""}</div>
        <div class="word-card-meta"><span class="level-badge">${escapeHtml(LEVEL_LABELS[word.level] || word.level)}</span>${word.pos ? `<span class="meta-badge">${escapeHtml(word.pos)}</span>` : ""}${word.source ? `<span class="meta-badge">${escapeHtml(word.source)}</span>` : ""}</div>
        <p class="word-card-meaning">${escapeHtml(word.meaning)}</p>
        <div class="word-card-footer"><span class="status-dot ${status}"></span><span>${escapeHtml(dueText)}</span></div>
      </div>
      <div class="word-card-actions">
        <button class="word-action speak" type="button" aria-label="朗读"><svg><use href="#i-volume"></use></svg></button>
        <button class="word-action star${p.starred ? " starred" : ""}" type="button" aria-label="收藏"><svg><use href="#i-star"></use></svg></button>
        <button class="word-action details" type="button" aria-label="详情"><svg><use href="#i-more"></use></svg></button>
      </div>
    </article>`;
  }

  function getKanaPositionLabel(word) {
    const reading = toHiragana(word?.kana || word?.word || "");
    const chars = [...reading].filter((char) => /[ぁ-ん]/.test(char));
    if (chars.length) return chars.slice(0, 2).join("");
    return word?._kanaGroup && word._kanaGroup !== "他" ? word._kanaGroup : "他";
  }

  function handleWordGridClick(event) {
    const card = event.target.closest(".word-card");
    if (!card) return;
    const id = card.dataset.id;
    if (event.target.closest(".word-select")) {
      const checkbox = event.target.closest(".word-select");
      checkbox.checked ? state.selectedIds.add(id) : state.selectedIds.delete(id);
      renderSelectionBar();
      card.classList.toggle("selected", checkbox.checked);
      return;
    }
    if (event.target.closest(".speak")) {
      event.stopPropagation();
      speakWord(state.wordMap.get(id));
      return;
    }
    if (event.target.closest(".star")) {
      event.stopPropagation();
      toggleStar(id);
      return;
    }
    openWordDialog(id);
  }

  function renderKanaChips() {
    const counts = countBy(state.words, (word) => word._kanaGroup);
    $("kanaChips").innerHTML = KANA_GROUPS.map((group) => {
      const count = group.key === "all" ? state.words.length : (counts[group.key] || 0);
      return `<button class="chip${state.library.kana === group.key ? " active" : ""}" data-kana="${group.key}" title="${escapeAttr(group.label)} · ${count} 个词">${group.key === "all" ? "全部" : group.key}</button>`;
    }).join("");
    $("kanaChips").querySelectorAll("[data-kana]").forEach((button) => button.addEventListener("click", () => {
      state.library.kana = button.dataset.kana;
      renderLibrary();
    }));
  }

  function scheduleKanaScrubberMeasure() {
    if (state.kanaScrubber.raf) window.cancelAnimationFrame(state.kanaScrubber.raf);
    state.kanaScrubber.raf = window.requestAnimationFrame(measureKanaScrubber);
  }

  function measureKanaScrubber() {
    const scrubber = $("kanaScrubber");
    const hasItems = state.activeView === "libraryView" && state.kanaScrubber.items.length > 0;
    scrubber?.classList.toggle("hidden", !hasItems);
    if (hasItems) updateKanaScrubberFromScroll();
  }

  function scheduleKanaScrubberUpdate() {
    if (state.kanaScrubber.dragging || state.activeView !== "libraryView") return;
    if (state.kanaScrubber.raf) window.cancelAnimationFrame(state.kanaScrubber.raf);
    state.kanaScrubber.raf = window.requestAnimationFrame(updateKanaScrubberFromScroll);
  }

  function libraryScrollRatio() {
    const stream = $("wordGrid");
    if (!stream) return 0;
    const rect = stream.getBoundingClientRect();
    const start = rect.top + window.scrollY;
    const travel = Math.max(1, stream.scrollHeight - Math.min(window.innerHeight * 0.62, 560));
    return clamp((window.scrollY - start + Math.min(window.innerHeight * 0.26, 210)) / travel, 0, 1);
  }

  function updateKanaScrubberFromScroll() {
    const items = state.kanaScrubber.items;
    if (!items.length || state.activeView !== "libraryView") return;
    const ratio = libraryScrollRatio();
    updateKanaScrubberUi(Math.round(ratio * (items.length - 1)));
  }

  function seekKanaScrubber(ratio) {
    const items = state.kanaScrubber.items;
    const stream = $("wordGrid");
    if (!items.length || !stream) return;
    const safeRatio = clamp(ratio, 0, 1);
    const index = Math.round(safeRatio * (items.length - 1));
    updateKanaScrubberUi(index);
    const rect = stream.getBoundingClientRect();
    const start = rect.top + window.scrollY;
    const travel = Math.max(0, stream.scrollHeight - Math.min(window.innerHeight * 0.62, 560));
    const offset = window.innerWidth <= 900 ? 82 : 20;
    window.scrollTo(0, Math.max(0, start + safeRatio * travel - offset));
  }

  function scrollLibraryToTop() {
    const view = $("libraryView");
    const top = view ? view.getBoundingClientRect().top + window.scrollY : 0;
    instantScrollTo(top);
    window.requestAnimationFrame(updateLibraryTopButton);
  }

  function updateLibraryTopButton() {
    const button = $("libraryTopBtn");
    if (!button) return;
    const view = $("libraryView");
    const top = view ? view.getBoundingClientRect().top + window.scrollY : 0;
    const visible = state.activeView === "libraryView" && window.scrollY > top + Math.min(360, window.innerHeight * 0.35);
    button.classList.toggle("hidden", !visible);
  }

  function instantScrollTo(top) {
    const root = document.documentElement;
    root.classList.add("instant-scroll");
    window.scrollTo(0, Math.max(0, top));
    window.requestAnimationFrame(() => {
      if (!state.kanaScrubber.dragging) root.classList.remove("instant-scroll");
    });
  }

  function updateKanaScrubberUi(index) {
    const items = state.kanaScrubber.items;
    if (!items.length) return;
    const safeIndex = clamp(index, 0, items.length - 1);
    const item = items[safeIndex];
    const ratio = items.length > 1 ? safeIndex / (items.length - 1) : 0;
    $("kanaScrubberLabel").textContent = item.kana;
    $("kanaScrubberLevel").textContent = LEVEL_LABELS[item.level] || item.level;
    const track = $("kanaScrubberTrack");
    const travel = Math.max(0, track.clientHeight - 16);
    const position = 8 + ratio * travel;
    $("kanaScrubberProgress").style.height = `${ratio * travel}px`;
    $("kanaScrubberThumb").style.top = `${position}px`;
    $("kanaScrubberBubble").style.top = `${position}px`;
    track.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    track.setAttribute("aria-valuetext", `${LEVEL_LABELS[item.level] || item.level} ${item.kana}`);
  }

  function renderSelectionBar() {
    const count = state.selectedIds.size;
    $("selectionBar").classList.toggle("hidden", count === 0);
    $("selectionCount").textContent = `已选择 ${count} 个词`;
  }

  function syncLibraryControls() {
    $("librarySearch").value = state.library.query;
    $("libraryLevel").value = state.library.level;
    $("libraryStatus").value = state.library.status;
    $("librarySource").value = [...$("librarySource").options].some((option) => option.value === state.library.source) ? state.library.source : "all";
  }

  function populateSourceSelects() {
    const sources = [...new Set(state.words.map((word) => word.source).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
    const select = $("librarySource");
    const current = state.library.source;
    select.innerHTML = `<option value="all">全部词库</option>${sources.map((source) => `<option value="${escapeAttr(source)}">${escapeHtml(source)}</option>`).join("")}`;
    state.library.source = sources.includes(current) ? current : "all";
  }

  function renderStudyConfig() {
    syncStudyControls();
    const config = readStudyConfig();
    const pool = getStudyPool(config);
    const count = Math.min(config.count, pool.length);
    const modeLabel = "混合题型";
    const scopeLabel = {
      today: "今日计划",
      due: "到期复习",
      new: "学习新词",
      difficult: "攻克薄弱",
      starred: "收藏词复习",
      all: "自由练习",
    }[config.scope] || "学习计划";
    const scopeText = {
      today: "先处理到期与薄弱词；数量不足时自动加入新词。",
      due: "仅处理已经到达复习时间的词汇。",
      new: "从未学习词汇中建立新的记忆。",
      difficult: "集中处理错题较多、记忆不稳的词。",
      starred: "复习你主动收藏的重要词汇。",
      all: "从当前等级的全部词汇中练习。",
    }[config.scope] || "按当前设置开始学习。";
    $("studyAvailability").textContent = `可用 ${pool.length.toLocaleString()} 词`;
    $("studyPoolCount").textContent = pool.length.toLocaleString();
    $("studyPreviewTitle").textContent = scopeLabel;
    $("studyPreviewText").textContent = scopeText;
    $("studyEstimate").textContent = `约 ${Math.max(1, Math.ceil(count * 18 / 60))} 分钟`;
    $("studyModeLabel").textContent = modeLabel;
    $("startStudyBtn").disabled = pool.length === 0;
    $("startStudyBtn").innerHTML = `<svg><use href="#i-spark"></use></svg>${pool.length ? `开始 ${count || config.count} 题` : "暂无可用词汇"}`;
    $$('[data-preset]').forEach((button) => {
      const presetScope = { today: "today", new: "new", hard: "difficult" }[button.dataset.preset];
      button.classList.toggle("active", config.scope === presetScope);
    });
  }

  function syncStudyControls() {
    $("studyLevel").value = state.settings.studyLevel;
    $("studyScope").value = state.settings.studyScope;
    $("studyCount").value = String(state.settings.studyCount);
    $("studyOrder").value = state.settings.studyOrder;
  }

  function updateStudySettingsFromControls() {
    state.settings.studyLevel = $("studyLevel").value;
    state.settings.studyScope = $("studyScope").value;
    state.settings.studyCount = Number($("studyCount").value);
    state.settings.studyMode = "mixed";
    state.settings.studyOrder = $("studyOrder").value;
    saveSettings();
  }

  function readStudyConfig() {
    const autoSpeakValue = $("studyAutoSpeak")?.value || "inherit";
    return {
      level: $("studyLevel").value,
      scope: $("studyScope").value,
      count: Number($("studyCount").value || 20),
      mode: "mixed",
      order: $("studyOrder").value,
      autoSpeak: autoSpeakValue === "inherit" ? state.settings.autoSpeak : autoSpeakValue === "on",
    };
  }

  function applyStudyPreset(preset) {
    const scope = { today: "today", new: "new", hard: "difficult" }[preset] || "today";
    $("studyScope").value = scope;
    if (preset === "new") $("studyCount").value = "10";
    if (preset === "today") $("studyCount").value = "20";
    if (preset === "hard") $("studyCount").value = "20";
    updateStudySettingsFromControls();
    renderStudyConfig();
  }

  function getStudyPool(config) {
    const now = Date.now();
    const includeMastered = Boolean(config.includeMastered);
    const levelPool = state.words.filter((word) => {
      if (config.level !== "all" && word.level !== config.level) return false;
      return includeMastered || !isMastered(state.progress[word.id]);
    });
    let pool = [...levelPool];
    if (config.scope === "today") {
      const due = levelPool.filter((word) => {
        const p = state.progress[word.id] || {};
        return p.nextReview && p.nextReview <= now;
      });
      const dueIds = new Set(due.map((word) => word.id));
      const difficult = levelPool.filter((word) => !dueIds.has(word.id) && isDifficult(state.progress[word.id]));
      const difficultIds = new Set(difficult.map((word) => word.id));
      const unseen = levelPool.filter((word) => !dueIds.has(word.id) && !difficultIds.has(word.id) && !(state.progress[word.id]?.seen > 0));
      pool = [...due, ...difficult, ...unseen];
    }
    if (config.scope === "due") pool = pool.filter((word) => {
      const p = state.progress[word.id] || {};
      return p.nextReview && p.nextReview <= now;
    });
    if (config.scope === "new") pool = pool.filter((word) => !(state.progress[word.id]?.seen > 0));
    if (config.scope === "difficult") pool = pool.filter((word) => isDifficult(state.progress[word.id]));
    if (config.scope === "starred") pool = pool.filter((word) => state.progress[word.id]?.starred);
    if (config.order === "random") shuffle(pool);
    if (config.order !== "random") pool.sort(compareStudySequence);
    if (config.order === "sequence" && !config.manual) pool = rotatePoolFromSequenceCursor(pool, config);
    return pool;
  }

  function sequenceCursorKey(config = {}) {
    return `${config.level || "all"}::${config.scope || "all"}`;
  }

  function rotatePoolFromSequenceCursor(pool, config) {
    if (!pool.length) return pool;
    const cursorId = state.studyCursors[sequenceCursorKey(config)];
    const cursorIndex = pool.findIndex((word) => word.id === cursorId);
    if (cursorIndex < 0) {
      const cursorWord = state.wordMap.get(cursorId);
      if (!cursorWord) return pool;
      const nextIndex = pool.findIndex((word) => compareStudySequence(word, cursorWord) > 0);
      if (nextIndex <= 0) return pool;
      return [...pool.slice(nextIndex), ...pool.slice(0, nextIndex)];
    }
    if (cursorIndex === 0) return pool;
    return [...pool.slice(cursorIndex), ...pool.slice(0, cursorIndex)];
  }

  function rememberSequenceCursor(config, id) {
    if (!config || config.manual || config.order !== "sequence" || !id) return;
    const key = config.sequenceKey || sequenceCursorKey(config);
    state.studyCursors[key] = id;
    saveJson(STORAGE.cursors, state.studyCursors);
  }

  function rememberFollowingSequenceCursor(session, id) {
    if (!session?.config || session.config.manual || session.config.order !== "sequence" || !id) return;
    const ids = session.config.sequencePoolIds?.length ? session.config.sequencePoolIds : session.ids;
    if (!ids?.length) return;
    const index = ids.indexOf(id);
    const nextId = ids[index >= 0 ? (index + 1) % ids.length : 0];
    rememberSequenceCursor(session.config, nextId);
  }

  function syncSequenceCursorForCard(session, card) {
    if (!session?.config || session.config.manual || session.config.order !== "sequence" || !card?.id) return;
    if (card.answered) rememberFollowingSequenceCursor(session, card.id);
    else rememberSequenceCursor(session.config, card.id);
  }

  function startConfiguredSession() {
    const config = readStudyConfig();
    const pool = getStudyPool(config);
    if (!pool.length) {
      toast("当前条件下没有可学习词汇。", "error");
      return;
    }
    const ids = pool.slice(0, config.count).map((word) => word.id);
    startSessionFromIds(ids, { ...config, sequencePoolIds: pool.map((word) => word.id), sequenceKey: sequenceCursorKey(config) });
  }

  function startRecommendedSession(kind) {
    const baseConfig = {
      level: "all",
      scope: kind === "quick" ? "all" : "due",
      count: kind === "quick" ? 10 : state.settings.studyCount,
      mode: "mixed",
      order: kind === "quick" ? "random" : "sequence",
      autoSpeak: state.settings.autoSpeak,
    };
    let pool = getStudyPool(baseConfig);
    if (!pool.length && kind !== "quick") {
      baseConfig.scope = "new";
      baseConfig.count = 10;
      pool = getStudyPool(baseConfig);
      toast("今天没有到期复习，已切换为 10 个新词。", "success");
    }
    if (!pool.length) {
      toast("词库中暂无可学习词汇。", "error");
      return;
    }
    if (kind === "quick") shuffle(pool);
    startSessionFromIds(pool.slice(0, baseConfig.count).map((word) => word.id), { ...baseConfig, sequencePoolIds: pool.map((word) => word.id), sequenceKey: sequenceCursorKey(baseConfig) });
  }

  function startSessionFromIds(ids, configOverride = null) {
    const uniqueIds = [...new Set(ids)].filter((id) => state.wordMap.has(id));
    if (!uniqueIds.length) {
      toast("请先选择可学习词汇。", "error");
      return;
    }
    const controlConfig = document.getElementById("studyLevel") ? readStudyConfig() : {
      level: "all", scope: "all", count: uniqueIds.length, mode: "mixed", order: state.settings.studyOrder, autoSpeak: state.settings.autoSpeak,
    };
    const config = { ...controlConfig, ...(configOverride || {}), count: uniqueIds.length };
    if (config.order === "sequence" && !config.manual && !config.sequenceKey) config.sequenceKey = sequenceCursorKey(config);
    state.session = {
      ids: uniqueIds,
      cards: buildSessionCards(uniqueIds, config),
      index: 0,
      results: [],
      startTime: Date.now(),
      answered: false,
      correct: false,
      selectedId: null,
      options: [],
      config,
    };
    openStudyOverlay();
    renderSessionCard();
  }

  function buildSessionCards(ids, config) {
    const deck = buildQuestionModeDeck(ids.length);
    return ids.map((id, index) => {
      const word = state.wordMap.get(id);
      const preferred = config.mode === "mixed" ? deck[index] : config.mode;
      return {
        id,
        mode: chooseQuestionMode(word, preferred),
        answered: false,
        correct: false,
        selectedId: null,
        peek: false,
        optionIds: null,
        kanaQuestion: null,
        selectedKanaIndices: [],
        committed: false,
        rating: null,
      };
    });
  }

  function buildQuestionModeDeck(count) {
    const majorCount = Math.round(count * 0.7);
    const minorCount = Math.max(0, count - majorCount);
    const deck = [
      ...Array(Math.ceil(majorCount / 2)).fill("wordToMeaning"),
      ...Array(Math.floor(majorCount / 2)).fill("meaningToKana"),
      ...Array(Math.ceil(minorCount / 2)).fill("kanaBuild"),
      ...Array(Math.floor(minorCount / 2)).fill("listening"),
    ];
    while (deck.length < count) deck.push(Math.random() < 0.5 ? "wordToMeaning" : "meaningToKana");
    shuffle(deck);
    return deck.slice(0, count);
  }

  function chooseQuestionMode(word, preferred) {
    const valid = validQuestionModesForWord(word);
    if (valid.includes(preferred)) return preferred;
    const fallbacks = {
      kanaBuild: ["listening", "meaningToKana", "wordToMeaning"],
      listening: ["kanaBuild", "meaningToKana", "wordToMeaning"],
      meaningToKana: ["wordToMeaning"],
      wordToMeaning: ["meaningToKana", "listening", "kanaBuild"],
    }[preferred] || ["wordToMeaning"];
    return fallbacks.find((mode) => valid.includes(mode)) || valid[0] || "wordToMeaning";
  }

  function validQuestionModesForWord(word) {
    const modes = ["wordToMeaning"];
    const kana = cleanKanaAnswer(word);
    if (kana && isCoreVocabulary(word)) {
      modes.push("meaningToKana", "listening");
      if (kana.length >= 2 && kana.length <= 7) modes.push("kanaBuild");
    }
    return modes;
  }

  function openStudyOverlay() {
    $("studyOverlay").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeStudyOverlay() {
    $("studyOverlay").classList.add("hidden");
    document.body.style.overflow = "";
  }

  function requestCloseStudy() {
    if (!state.session) {
      closeStudyOverlay();
      return;
    }
    const completed = state.session.results.length;
    if (!completed) {
      closeStudyOverlay();
      state.session = null;
      return;
    }
    askConfirm("退出本轮学习？", `已完成 ${completed} 题的进度会保留，未完成词汇不会受影响。`, () => {
      closeStudyOverlay();
      state.session = null;
      renderAll();
    }, "退出学习");
  }

  function currentSessionCard() {
    const session = state.session;
    if (!session) return null;
    return session.cards?.[session.index] || null;
  }

  function currentSessionWord() {
    const card = currentSessionCard();
    return card ? state.wordMap.get(card.id) || null : null;
  }

  function updateSessionHeader() {
    const session = state.session;
    if (!session) return;
    const total = session.cards.length;
    const completed = session.results.length;
    const correctCount = session.results.filter((result) => result.correct).length;
    $("sessionCounter").textContent = `${session.index + 1} / ${total}`;
    $("sessionAccuracy").textContent = `正确率 ${completed ? Math.round(correctCount / completed * 100) : 0}%`;
    $("sessionProgressBar").style.width = `${total ? (completed / total) * 100 : 0}%`;
  }

  function renderSessionCard() {
    const session = state.session;
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!session || !card || !word) {
      finishSession();
      return;
    }
    const mode = card.mode || "wordToMeaning";
    if (!card.optionIds && CHOICE_MODES.has(mode)) {
      card.optionIds = buildAnswerOptions(word, mode).map((option) => option.id);
    }
    if (mode === "kanaBuild" && !card.kanaQuestion) {
      card.kanaQuestion = buildKanaQuestion(word);
    }
    session.answered = card.answered;
    session.correct = card.correct;
    session.selectedId = card.selectedId;
    session.options = (card.optionIds || []).map((id) => state.wordMap.get(id)).filter(Boolean);
    updateSessionHeader();
    syncSequenceCursorForCard(session, card);
    $("studyCardLevel").textContent = LEVEL_LABELS[word.level] || word.level;
    $("studyStarBtn").classList.toggle("starred", Boolean(state.progress[word.id]?.starred));
    $("studyMasteredBtn").disabled = card.answered;
    $("answerPanel").classList.add("hidden");
    $("showAnswerBtn").classList.toggle("hidden", card.answered);
    $("typingAnswerForm").classList.toggle("hidden", mode !== "typing");
    $("studyOptions").classList.toggle("hidden", !CHOICE_MODES.has(mode));
    $("kanaBuildAnswer").classList.toggle("hidden", mode !== "kanaBuild");
    $("typingAnswer").value = mode === "typing" ? String(card.selectedId || "") : "";
    $("typingAnswer").disabled = card.answered;
    const typingSubmit = $("typingAnswerForm").querySelector('button[type="submit"]');
    if (typingSubmit) typingSubmit.disabled = card.answered;
    configurePrompt(word, mode);
    renderStudyOptions(word, mode);
    renderKanaBuildAnswer(word, card, mode);
    if (card.answered) {
      restoreStudyAnswerVisuals(word, card);
      showAnswerPanel(word, card.correct, card.peek, card.mastered);
    } else {
      if (mode === "typing") window.setTimeout(() => $("typingAnswer").focus(), 80);
    }
    if (session.config.autoSpeak) window.setTimeout(() => speakWord(word), mode === "listening" ? 80 : 120);
  }

  function configurePrompt(word, mode) {
    if (mode === "wordToMeaning") {
      $("studyPromptLabel").textContent = "选择中文含义";
      $("studyPrompt").textContent = word.word;
      $("studyPromptSub").textContent = [word.kana, word.pos, word.accent].filter(Boolean).join(" · ");
      return;
    }
    if (mode === "meaningToKana") {
      $("studyPromptLabel").textContent = "看中文选假名";
      $("studyPrompt").textContent = word.meaning;
      $("studyPromptSub").textContent = [LEVEL_LABELS[word.level], word.pos].filter(Boolean).join(" · ");
      return;
    }
    if (mode === "listening") {
      $("studyPromptLabel").textContent = "听音辨义";
      $("studyPrompt").innerHTML = `<button class="audio-prompt-button" type="button" data-study-prompt-speak aria-label="重听"><svg><use href="#i-volume"></use></svg></button>`;
      $("studyPromptSub").textContent = [LEVEL_LABELS[word.level], word.pos].filter(Boolean).join(" · ");
      return;
    }
    if (mode === "kanaBuild") {
      $("studyPromptLabel").textContent = "选择单词假名";
      $("studyPrompt").textContent = word.word;
      $("studyPromptSub").textContent = [word.meaning, word.pos].filter(Boolean).join(" · ");
      return;
    }
    $("studyPromptLabel").textContent = "选择中文含义";
    $("studyPrompt").textContent = word.word;
    $("studyPromptSub").textContent = [word.kana, word.pos, word.accent].filter(Boolean).join(" · ");
  }

  function buildAnswerOptions(word, mode) {
    if (!CHOICE_MODES.has(mode)) return [];
    const usedAnswers = new Set([answerOptionKey(word, mode)]);
    let candidates = state.words.filter((candidate) => {
      if (candidate.id === word.id || candidate.level !== word.level) return false;
      if (!isChoiceCandidate(candidate, mode)) return false;
      const key = answerOptionKey(candidate, mode);
      if (!key || usedAnswers.has(key)) return false;
      return true;
    });
    const samePos = candidates.filter((candidate) => candidate.pos && word.pos && candidate.pos === word.pos);
    const chosen = [];
    shuffle(samePos);
    samePos.slice(0, 2).forEach((candidate) => {
      chosen.push(candidate);
      usedAnswers.add(answerOptionKey(candidate, mode));
    });
    shuffle(candidates);
    for (const candidate of candidates) {
      if (chosen.length >= 3) break;
      const key = answerOptionKey(candidate, mode);
      if (!chosen.some((item) => item.id === candidate.id) && !usedAnswers.has(key)) {
        chosen.push(candidate);
        usedAnswers.add(key);
      }
    }
    if (chosen.length < 3) {
      const all = state.words.filter((candidate) => {
        if (candidate.id === word.id || chosen.some((item) => item.id === candidate.id)) return false;
        if (!isChoiceCandidate(candidate, mode)) return false;
        const key = answerOptionKey(candidate, mode);
        if (!key || usedAnswers.has(key)) return false;
        return true;
      });
      shuffle(all);
      for (const candidate of all) {
        if (chosen.length >= 3) break;
        chosen.push(candidate);
        usedAnswers.add(answerOptionKey(candidate, mode));
      }
    }
    const options = [word, ...chosen.slice(0, 3)];
    shuffle(options);
    return options;
  }

  function renderStudyOptions(word, mode) {
    const root = $("studyOptions");
    if (mode === "typing") {
      root.innerHTML = "";
      return;
    }
    root.innerHTML = state.session.options.map((option, index) => {
      let text = option.meaning;
      if (mode === "meaningToKana") text = cleanKanaAnswer(option) || option.kana || option.word;
      if (mode === "listening") text = option.meaning;
      return `<button class="study-option" data-choice-id="${escapeAttr(option.id)}"><span>${escapeHtml(text)}</span></button>`;
    }).join("");
  }

  function buildKanaQuestion(word) {
    const answer = cleanKanaAnswer(word);
    const answerChars = [...answer];
    const choices = [...answerChars];
    const targetSize = 15;
    const localPool = state.words
      .filter((item) => item.id !== word.id && item.level === word.level)
      .flatMap((item) => [...cleanKanaAnswer(item)])
      .filter(Boolean);
    while (choices.length < targetSize) {
      const pool = localPool.length ? localPool : KANA_TILE_POOL;
      choices.push(pool[Math.floor(Math.random() * pool.length)] || KANA_TILE_POOL[Math.floor(Math.random() * KANA_TILE_POOL.length)]);
    }
    shuffle(choices);
    return { answer, answerChars, choices };
  }

  function renderKanaBuildAnswer(word, card, mode) {
    const root = $("kanaBuildAnswer");
    if (mode !== "kanaBuild" || !card) {
      root.classList.add("hidden");
      $("kanaBuildSlots").innerHTML = "";
      $("kanaBuildChoices").innerHTML = "";
      return;
    }
    root.classList.remove("hidden");
    if (!card.kanaQuestion) card.kanaQuestion = buildKanaQuestion(word);
    const question = card.kanaQuestion;
    const selected = card.selectedKanaIndices || [];
    const selectedSet = new Set(selected);
    const locked = card.answered || card.peek;
    const slotClass = locked ? (card.correct || card.peek ? " correct" : " wrong") : "";
    $("kanaBuildSlots").className = `kana-build-slots${slotClass}`;
    $("kanaBuildSlots").innerHTML = question.answerChars.map((_, index) => {
      const choiceIndex = selected[index];
      const value = Number.isInteger(choiceIndex) ? question.choices[choiceIndex] : "";
      const filled = value ? " filled" : "";
      const label = value ? ` aria-label="移除 ${escapeAttr(value)}"` : "";
      return `<button class="kana-build-slot${filled}" type="button" data-kana-slot-index="${index}"${label} ${locked || !value ? "disabled" : ""}>${escapeHtml(value || "")}</button>`;
    }).join("");
    $("kanaBuildChoices").innerHTML = question.choices.map((char, index) => {
      const selectedClass = selectedSet.has(index) ? " selected" : "";
      return `<button class="kana-choice${selectedClass}" type="button" data-kana-choice-index="${index}" ${locked || selectedSet.has(index) ? "disabled" : ""}>${escapeHtml(char)}</button>`;
    }).join("");
    $("kanaBuildSubmit").disabled = locked || selected.length !== question.answerChars.length;
  }

  function selectKanaChoice(choiceIndex) {
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!card || !word || card.answered || card.mode !== "kanaBuild" || !card.kanaQuestion) return;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex >= card.kanaQuestion.choices.length) return;
    card.selectedKanaIndices = card.selectedKanaIndices || [];
    if (card.selectedKanaIndices.includes(choiceIndex) || card.selectedKanaIndices.length >= card.kanaQuestion.answerChars.length) return;
    card.selectedKanaIndices.push(choiceIndex);
    renderKanaBuildAnswer(word, card, card.mode);
  }

  function removeKanaChoice(slotIndex) {
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!card || !word || card.answered || card.mode !== "kanaBuild") return;
    card.selectedKanaIndices = card.selectedKanaIndices || [];
    if (slotIndex < 0 || slotIndex >= card.selectedKanaIndices.length) return;
    card.selectedKanaIndices.splice(slotIndex, 1);
    renderKanaBuildAnswer(word, card, card.mode);
  }

  function answerKanaBuild() {
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!card || !word || card.answered || card.mode !== "kanaBuild" || !card.kanaQuestion) return;
    const selected = card.selectedKanaIndices || [];
    if (selected.length !== card.kanaQuestion.answerChars.length) {
      toast("请选择完整假名。", "error");
      return;
    }
    const answer = selected.map((index) => card.kanaQuestion.choices[index]).join("");
    card.selectedId = answer;
    card.correct = answer === card.kanaQuestion.answer;
    card.peek = false;
    commitSessionAnswer(card, word);
    renderKanaBuildAnswer(word, card, card.mode);
  }

  function fillKanaAnswerSelection(card) {
    if (!card?.kanaQuestion) return;
    const used = new Set();
    card.selectedKanaIndices = card.kanaQuestion.answerChars.map((char) => {
      const index = card.kanaQuestion.choices.findIndex((choice, choiceIndex) => choice === char && !used.has(choiceIndex));
      if (index >= 0) used.add(index);
      return index;
    }).filter((index) => index >= 0);
  }

  function restoreStudyAnswerVisuals(word, card) {
    const mode = card?.mode || state.session?.config?.mode || "wordToMeaning";
    if (mode === "kanaBuild") {
      renderKanaBuildAnswer(word, card, mode);
      return;
    }
    if (mode === "typing") {
      $("typingAnswer").disabled = true;
      return;
    }
    $$(".study-option", $("studyOptions")).forEach((button) => {
      const id = button.dataset.choiceId;
      button.classList.toggle("correct", id === word.id);
      button.classList.toggle("wrong", id === card.selectedId && id !== word.id);
      button.classList.toggle("dimmed", id !== word.id && id !== card.selectedId);
      button.disabled = true;
    });
  }

  function answerChoice(choiceId) {
    const session = state.session;
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!session || !card || !word || card.answered) return;
    card.selectedId = choiceId;
    card.correct = choiceId === word.id;
    card.peek = false;
    restoreStudyAnswerVisuals(word, card);
    commitSessionAnswer(card, word);
  }

  function answerTyping(value) {
    const session = state.session;
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!session || !card || !word || card.answered) return;
    const normalized = normalizeAnswer(value);
    if (!normalized) {
      toast("请输入答案。", "error");
      return;
    }
    card.selectedId = value;
    card.correct = normalized === normalizeAnswer(word.word) || (word.kana && normalized === normalizeAnswer(word.kana));
    card.peek = false;
    $("typingAnswer").disabled = true;
    commitSessionAnswer(card, word);
  }

  function markCurrentWordMastered() {
    const session = state.session;
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!session || !card || !word || card.answered) return;
    if (card.mode === "kanaBuild") {
      if (!card.kanaQuestion) card.kanaQuestion = buildKanaQuestion(word);
      fillKanaAnswerSelection(card);
    }
    card.selectedId = word.id;
    card.correct = true;
    card.peek = false;
    card.mastered = true;
    card.answered = true;
    card.rating = "mastered";
    card.committed = true;
    session.answered = true;
    session.correct = true;
    session.selectedId = card.selectedId;
    updateProgressForMastery(word);
    session.results.push({ index: session.index, id: word.id, correct: true, rating: "mastered" });
    rememberFollowingSequenceCursor(session, word.id);
    updateSessionHeader();
    restoreStudyAnswerVisuals(word, card);
    showAnswerPanel(word, true, false, true);
  }

  function revealCurrentAnswer() {
    const session = state.session;
    const card = currentSessionCard();
    const word = currentSessionWord();
    if (!session || !card || !word || card.answered) return;
    card.selectedId = null;
    card.correct = false;
    card.peek = true;
    if (card.mode === "kanaBuild") {
      if (!card.kanaQuestion) card.kanaQuestion = buildKanaQuestion(word);
      fillKanaAnswerSelection(card);
    }
    restoreStudyAnswerVisuals(word, card);
    $("typingAnswer").disabled = true;
    commitSessionAnswer(card, word);
  }

  function commitSessionAnswer(card, word) {
    const session = state.session;
    if (!session || !card || card.answered) return;
    card.answered = true;
    card.rating = card.correct ? "good" : "again";
    session.answered = true;
    session.correct = card.correct;
    session.selectedId = card.selectedId;
    if (!card.committed) {
      updateProgressForReview(word, card.correct, card.rating);
      card.committed = true;
      session.results.push({ index: session.index, id: word.id, correct: card.correct, rating: card.rating });
      rememberFollowingSequenceCursor(session, word.id);
    }
    updateSessionHeader();
    showAnswerPanel(word, card.correct, card.peek, card.mastered);
  }

  function showAnswerPanel(word, correct, peek, mastered = false) {
    const session = state.session;
    $("showAnswerBtn").classList.add("hidden");
    $("answerPanel").classList.remove("hidden");
    const status = $("answerPanel").querySelector(".answer-status");
    status.classList.toggle("wrong", !correct);
    $("answerStatusIcon").innerHTML = `<svg><use href="#${correct ? "i-check" : "i-close"}"></use></svg>`;
    $("answerStatusTitle").textContent = mastered ? "已标记掌握" : correct ? "回答正确" : peek ? "已显示答案" : "还差一点";
    $("answerStatusText").textContent = [word.word, word.kana, word.accent, word.meaning].filter(Boolean).join(" · ");
    $("previousCardBtn").disabled = !session || session.index === 0;
    const isLast = session && session.index >= session.cards.length - 1;
    $("nextCardBtn").innerHTML = isLast
      ? `完成本轮 <span aria-hidden="true">✓</span><kbd>Enter</kbd>`
      : `下一题 <span aria-hidden="true">→</span><kbd>Enter</kbd>`;
  }

  function calculateSchedule(progress, rating) {
    const p = { ...progress };
    const ease = clamp(Number(p.ease || 2.3), 1.3, 3.0);
    const reps = Number(p.reps || 0);
    const currentInterval = Math.max(0, Number(p.interval || 0));
    let nextEase = ease;
    let nextReps = reps;
    let interval = 1;
    if (rating === "again") {
      interval = 1 / 24;
      nextEase = clamp(ease - 0.2, 1.3, 3.0);
      nextReps = 0;
    } else if (rating === "hard") {
      interval = reps === 0 ? 1 : Math.max(1, currentInterval * 1.2);
      nextEase = clamp(ease - 0.1, 1.3, 3.0);
      nextReps = reps + 1;
    } else if (rating === "easy") {
      interval = reps === 0 ? 4 : Math.max(4, currentInterval * ease * 1.3);
      nextEase = clamp(ease + 0.1, 1.3, 3.0);
      nextReps = reps + 1;
    } else {
      interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.max(3, currentInterval * ease);
      nextReps = reps + 1;
    }
    return { interval: Math.round(interval * 100) / 100, ease: nextEase, reps: nextReps };
  }

  function updateProgressForReview(word, correct, rating) {
    const now = Date.now();
    const old = state.progress[word.id] || { seen: 0, correct: 0, wrong: 0, streak: 0, interval: 0, ease: 2.3, reps: 0, lapses: 0 };
    const schedule = calculateSchedule(old, rating);
    const p = {
      ...old,
      seen: Number(old.seen || 0) + 1,
      correct: Number(old.correct || 0) + (correct ? 1 : 0),
      wrong: Number(old.wrong || 0) + (correct ? 0 : 1),
      streak: correct ? Number(old.streak || 0) + 1 : 0,
      lapses: Number(old.lapses || 0) + (rating === "again" ? 1 : 0),
      interval: schedule.interval,
      ease: schedule.ease,
      reps: schedule.reps,
      lastSeen: now,
      nextReview: now + schedule.interval * DAY,
      lastRating: rating,
    };
    state.progress[word.id] = p;
    saveJson(STORAGE.progress, state.progress);
    addHistory({ id: word.id, word: word.word, level: word.level, correct, rating, time: now });
  }

  function updateProgressForMastery(word) {
    const now = Date.now();
    const old = state.progress[word.id] || { seen: 0, correct: 0, wrong: 0, streak: 0, interval: 0, ease: 2.3, reps: 0, lapses: 0 };
    const p = {
      ...old,
      seen: Math.max(3, Number(old.seen || 0) + 1),
      correct: Number(old.correct || 0) + 1,
      wrong: Number(old.wrong || 0),
      streak: Math.max(3, Number(old.streak || 0) + 1),
      interval: Math.max(30, Number(old.interval || 0)),
      ease: Math.max(2.5, Number(old.ease || 2.3)),
      reps: Math.max(3, Number(old.reps || 0) + 1),
      lastSeen: now,
      nextReview: now + 30 * DAY,
      lastRating: "mastered",
    };
    state.progress[word.id] = p;
    saveJson(STORAGE.progress, state.progress);
    addHistory({ id: word.id, word: word.word, level: word.level, correct: true, rating: "mastered", time: now });
  }

  function goToPreviousCard() {
    const session = state.session;
    if (!session || session.index <= 0) return;
    session.index -= 1;
    renderSessionCard();
  }

  function goToNextCard() {
    const session = state.session;
    const card = currentSessionCard();
    if (!session || !card || !card.answered) return;
    if (session.index >= session.cards.length - 1) {
      finishSession();
      return;
    }
    session.index += 1;
    renderSessionCard();
  }

  function skipCurrentCard() {
    const session = state.session;
    const card = currentSessionCard();
    if (!session || !card) return;
    if (card.answered) {
      goToNextCard();
      return;
    }
    if (session.cards.length <= 1 || session.index >= session.cards.length - 1) {
      toast("已经是本轮最后一题。", "success");
      return;
    }
    const [skipped] = session.cards.splice(session.index, 1);
    session.cards.push(skipped);
    session.ids = session.cards.map((item) => item.id);
    renderSessionCard();
  }

  function finishSession() {
    const session = state.session;
    if (!session) return;
    const count = session.results.length;
    const correct = session.results.filter((result) => result.correct).length;
    const accuracy = count ? Math.round(correct / count * 100) : 0;
    const minutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
    $("summaryCorrect").textContent = correct;
    $("summaryAccuracy").textContent = `${accuracy}%`;
    $("summaryMinutes").textContent = minutes;
    $("summaryMessage").textContent = count
      ? `已完成 ${count} 题，答题记录与学习进度已经保存。`
      : "本轮没有记录答题结果。";
    $("sessionProgressBar").style.width = "100%";
    closeStudyOverlay();
    $("sessionSummaryDialog").showModal();
  }
  function addHistory(item) {
    state.history.unshift(item);
    state.history = state.history.slice(0, 1000);
    saveJson(STORAGE.history, state.history);
  }

  function renderManage() {
    $("manageTotalWords").textContent = `${state.words.length.toLocaleString()} 个词`;
    const groups = countBy(state.words, (word) => word.source || "未命名词库");
    const sources = Object.entries(groups).sort((a, b) => b[1] - a[1]);
    $("sourceOverview").innerHTML = sources.map(([source, count]) => {
      const customCount = state.words.filter((word) => word.source === source && word._custom).length;
      const subtitle = customCount === count ? "自定义词库" : customCount ? `${customCount} 个自定义词` : "内置词库";
      return `<div class="source-row"><div><strong>${escapeHtml(source)}</strong><span>${escapeHtml(subtitle)}</span></div><span>${count.toLocaleString()} 个词</span><button type="button" data-delete-source="${escapeAttr(source)}" aria-label="删除 ${escapeAttr(source)}"><svg><use href="#i-trash"></use></svg></button></div>`;
    }).join("") || `<div class="empty-state">暂无词库</div>`;
  }

  async function handleOcrImage(file) {
    if (!file || !file.type.startsWith("image/")) {
      toast("请使用截图图片文件。", "error");
      return;
    }
    if (state.ocr.busy) {
      toast("正在识别上一张截图，请稍等。", "error");
      return;
    }
    state.ocr.busy = true;
    setOcrStatus("loading", "正在加载 OCR，首次使用可能需要几十秒…");
    try {
      await ensureOcrLibrary();
      setOcrStatus("loading", "正在识别截图文字…");
      const result = await window.Tesseract.recognize(file, "jpn+chi_sim+eng", {
        logger: (event) => {
          if (!event || event.status !== "recognizing text") return;
          const pct = Math.round((event.progress || 0) * 100);
          setOcrStatus("loading", `正在识别截图文字… ${pct}%`);
        },
      });
      const text = result?.data?.text || "";
      let fields = parseDictionaryOcrText(text);
      setOcrStatus("loading", "正在强化识别日语写法…");
      fields = correctOcrFields(fields, await recognizeOcrTitleCandidates(file), { useVocabularyFallback: false });
      fields = correctOcrFields(fields, [], { useVocabularyFallback: true });
      fillAddWordFormFromOcr(fields);
      const found = ocrDisplayEntries(fields).map(([key]) => ocrFieldLabel(key));
      const correction = fields._ocrCorrection ? `（${fields._ocrCorrection}）` : "";
      setOcrStatus(found.length ? "success" : "error", found.length ? `已填入：${found.join("、")}${correction}` : "没有识别到可用字段，请换一张更清晰的截图。", fields);
      if (fields.word || fields.meaning) toast("截图识别完成，请确认字段后添加。", "success");
      else toast("未能识别主要字段。", "error");
    } catch (error) {
      setOcrStatus("error", error?.message || "截图识别失败，请确认网络和图片清晰度。");
      toast("截图识别失败。", "error", 5200);
    } finally {
      state.ocr.busy = false;
    }
  }

  function ensureOcrLibrary() {
    if (window.Tesseract?.recognize) return Promise.resolve();
    if (!state.ocr.scriptPromise) state.ocr.scriptPromise = loadExternalScript(OCR_SCRIPT_URL);
    return state.ocr.scriptPromise;
  }

  function setOcrStatus(type, message, fields = null) {
    const root = $("ocrStatus");
    if (!root) return;
    root.className = `ocr-status ${type || ""}`.trim();
    const chips = fields ? ocrDisplayEntries(fields)
      .map(([key, value]) => `<span><strong>${escapeHtml(ocrFieldLabel(key))}</strong>${escapeHtml(String(value).slice(0, 42))}</span>`)
      .join("") : "";
    root.innerHTML = `<p>${escapeHtml(message)}</p>${chips ? `<div>${chips}</div>` : ""}`;
  }

  function ocrDisplayEntries(fields) {
    return OCR_FIELD_KEYS.map((key) => [key, fields?.[key]]).filter(([, value]) => normalizeText(value));
  }

  function ocrFieldLabel(key) {
    return {
      word: "写法",
      kana: "假名",
      pos: "词性",
      accent: "音调",
      meaning: "含义",
      note: "备注",
    }[key] || key;
  }

  function fillAddWordFormFromOcr(fields) {
    if (!fields || typeof fields !== "object") return;
    const mapping = {
      word: "addWord",
      kana: "addKana",
      pos: "addPos",
      accent: "addAccent",
      meaning: "addMeaning",
      note: "addNote",
    };
    Object.entries(mapping).forEach(([key, id]) => {
      const value = key === "note" ? String(fields[key] ?? "").replace(/\r\n?/g, "\n").trim() : normalizeText(fields[key]);
      if (value) setFieldValue(id, value);
    });
    if (!fieldValue("addSource").trim()) setFieldValue("addSource", "截图词库");
    if ($("addLevel").value !== "CUSTOM") $("addLevel").value = "CUSTOM";
    $("addWord").focus();
  }

  function correctOcrFields(fields, titleCandidates = [], options = {}) {
    const corrected = { ...(fields || {}) };
    const notes = [];
    const titleWord = bestTitleWordCandidate(titleCandidates, corrected);
    if (titleWord && shouldPreferOcrWord(titleWord, corrected.word, titleCandidateConfidence(titleCandidates, titleWord))) {
      corrected.word = titleWord;
      notes.push("写法已用标题区重识别");
    }
    const vocabularyMatch = options.useVocabularyFallback ? bestVocabularyMatchFromOcr(corrected) : null;
    if (vocabularyMatch && shouldUseVocabularyMatch(corrected, vocabularyMatch)) {
      if (normalizeText(corrected.word) !== normalizeText(vocabularyMatch.word)) {
        corrected.word = vocabularyMatch.word;
        notes.push("写法已用本地词库兜底纠正");
      }
      if (!normalizeText(corrected.kana) && vocabularyMatch.kana) corrected.kana = vocabularyMatch.kana;
      if (!normalizeText(corrected.pos) && vocabularyMatch.pos) corrected.pos = vocabularyMatch.pos;
      if (!normalizeText(corrected.accent) && vocabularyMatch.accent) corrected.accent = vocabularyMatch.accent;
      if (!normalizeText(corrected.meaning) && vocabularyMatch.meaning) corrected.meaning = vocabularyMatch.meaning;
    }
    if (notes.length) corrected._ocrCorrection = [...new Set([corrected._ocrCorrection, ...notes].filter(Boolean))].join("，");
    return corrected;
  }

  function bestVocabularyMatchFromOcr(fields) {
    const kana = normalizeKanaKey(fields?.kana);
    const meaning = normalizeText(fields?.meaning);
    const currentWord = normalizeText(fields?.word);
    if (!kana && !meaning && !currentWord) return null;
    const sameKanaCount = kana ? state.words.filter((word) => normalizeKanaKey(word.kana) === kana).length : 0;
    let best = null;
    state.words.forEach((word) => {
      let score = 0;
      const wordKana = normalizeKanaKey(word.kana);
      if (kana && wordKana === kana) score += 70;
      else if (kana && wordKana && (wordKana.includes(kana) || kana.includes(wordKana))) score += 26;
      if (meaning) score += meaningSimilarityScore(meaning, word.meaning);
      if (currentWord && normalizeAnswer(currentWord) === normalizeAnswer(word.word)) score += 22;
      if (fields?.pos && word.pos && normalizeText(word.pos).includes(normalizeText(fields.pos).replace(/[［\[\]］]/g, ""))) score += 4;
      if (sameKanaCount === 1 && kana && wordKana === kana && isSuspiciousOcrWord(currentWord)) score += 10;
      if (!best || score > best.score) best = { ...word, score, sameKanaCount };
    });
    return best?.score > 0 ? best : null;
  }

  function shouldUseVocabularyMatch(fields, match) {
    if (!match) return false;
    const currentWord = normalizeText(fields?.word);
    if (normalizeAnswer(currentWord) === normalizeAnswer(match.word)) return false;
    if (!isSuspiciousOcrWord(currentWord)) return false;
    if (match.score >= 96) return true;
    return match.sameKanaCount === 1 && match.score >= 82;
  }

  function normalizeKanaKey(value) {
    return toHiragana(normalizeText(value))
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/[~～]/g, "")
      .split("")
      .filter((char) => /[ぁ-んー]/.test(char))
      .join("");
  }

  function meaningSimilarityScore(a, b) {
    const aTerms = meaningTerms(a);
    const bTerms = meaningTerms(b);
    if (!aTerms.length || !bTerms.length) return 0;
    let score = 0;
    aTerms.forEach((left) => {
      bTerms.forEach((right) => {
        if (!left || !right) return;
        if (left === right) score += left.length >= 2 ? 24 : 8;
        else if (left.length >= 2 && right.length >= 2 && (left.includes(right) || right.includes(left))) score += 18;
      });
    });
    const charsA = new Set(aTerms.join(""));
    const charsB = new Set(bTerms.join(""));
    const overlap = [...charsA].filter((char) => charsB.has(char)).length;
    score += Math.min(16, overlap * 3);
    return Math.min(46, score);
  }

  function meaningTerms(value) {
    return normalizeText(value)
      .replace(/[()（）［\]【】]/g, " ")
      .split(/[;；,，、。.\s]+/)
      .map((term) => term.replace(/^[中日]\s*/, "").trim())
      .filter((term) => /[一-龯]/.test(term));
  }

  function isSuspiciousOcrWord(word) {
    const text = normalizeText(word);
    if (!text) return true;
    if (/^[一二三四五六七八九十〇零0-9\-—ー]+$/.test(text)) return true;
    if (/^[|｜\-—]+$/.test(text)) return true;
    if (/^(名|動|形|副|中|日|AI|生成)$/.test(text)) return true;
    return false;
  }

  function shouldPreferOcrWord(candidate, current, confidence = 1) {
    const cleanCandidate = normalizeText(candidate);
    const cleanCurrent = normalizeText(current);
    if (!cleanCandidate || cleanCandidate === cleanCurrent) return false;
    if (isSuspiciousOcrWord(cleanCurrent)) return true;
    if (confidence >= 2 && !isSuspiciousOcrWord(cleanCandidate)) return true;
    if (cleanCandidate.length > cleanCurrent.length && /[一-龯々〆ヵヶ]/.test(cleanCandidate)) return true;
    return false;
  }

  async function recognizeOcrTitleCandidates(file) {
    try {
      const variants = await createOcrTitleImageVariants(file);
      const candidates = [];
      for (let index = 0; index < variants.length; index += 1) {
        const result = await window.Tesseract.recognize(variants[index], "jpn", {
          tessedit_pageseg_mode: index === 0 ? "7" : "13",
          preserve_interword_spaces: "1",
        });
        candidates.push(...extractOcrWordCandidates(result?.data?.text || ""));
      }
      return candidates.slice(0, 12);
    } catch (error) {
      console.warn("Title OCR failed", error);
      return [];
    }
  }

  async function createOcrTitleImageVariants(file) {
    const image = await loadImageForOcr(file);
    const width = image.width || image.naturalWidth;
    const height = image.height || image.naturalHeight;
    const specs = [
      { x: 0, y: 0, w: 0.62, h: 0.15, scale: 3, threshold: false },
      { x: 0, y: 0, w: 0.72, h: 0.18, scale: 3, threshold: true },
      { x: 0, y: 0.01, w: 0.54, h: 0.12, scale: 4, threshold: true },
    ];
    const variants = [];
    for (const spec of specs) {
      const sx = Math.max(0, Math.round(width * spec.x));
      const sy = Math.max(0, Math.round(height * spec.y));
      const sw = Math.min(width - sx, Math.round(width * spec.w));
      const sh = Math.min(height - sy, Math.round(height * spec.h));
      if (sw <= 0 || sh <= 0) continue;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw * spec.scale));
      canvas.height = Math.max(1, Math.round(sh * spec.scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      preprocessCanvasForOcr(canvas, spec.threshold);
      variants.push(await canvasToBlob(canvas));
    }
    image.close?.();
    return variants;
  }

  function loadImageForOcr(file) {
    if (window.createImageBitmap) return window.createImageBitmap(file);
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("无法读取截图。"));
      };
      image.src = url;
    });
  }

  function preprocessCanvasForOcr(canvas, threshold) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      const value = threshold ? (gray > 205 ? 255 : gray < 175 ? 0 : Math.round((gray - 175) * 8.5)) : clamp(Math.round((gray - 128) * 1.45 + 128), 0, 255);
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("无法生成 OCR 裁剪图。")), "image/png");
    });
  }

  function extractOcrWordCandidates(text) {
    return normalizeOcrLines(text)
      .map((line) => cleanOcrWord(line))
      .filter((word) => word && word.length <= 12 && !isOcrNoiseLine(word))
      .sort((a, b) => Number(isSuspiciousOcrWord(a)) - Number(isSuspiciousOcrWord(b)) || b.length - a.length);
  }

  function bestTitleWordCandidate(candidates, fields = {}) {
    const counts = new Map();
    (candidates || []).forEach((candidate) => {
      const word = normalizeText(candidate);
      if (!word) return;
      counts.set(word, (counts.get(word) || 0) + 1);
    });
    const current = normalizeText(fields?.word);
    const scored = [...counts.entries()].map(([word, count]) => {
      let score = count * 28;
      if (!isSuspiciousOcrWord(word)) score += 28;
      if (/[ぁ-んァ-ヶー]/.test(word)) score += 7;
      if (/[一-龯々〆ヵヶ]/.test(word)) score += 9;
      if (word.length > 1 && word.length <= 10) score += 8;
      if (current && word === current) score += 4;
      if (isSuspiciousOcrWord(word)) score -= 60;
      return { word, score, count };
    }).sort((a, b) => b.score - a.score || b.word.length - a.word.length);
    const best = scored[0];
    if (!best || best.score < 28 || isSuspiciousOcrWord(best.word)) return "";
    return best.word;
  }

  function titleCandidateConfidence(candidates, candidate) {
    const target = normalizeText(candidate);
    if (!target) return 0;
    return (candidates || []).filter((item) => normalizeText(item) === target).length;
  }

  function parseDictionaryOcrText(text) {
    const lines = normalizeOcrLines(text);
    const wordLine = lines.find((line) => looksLikeWordLine(line));
    const word = cleanOcrWord(wordLine);
    const accent = cleanOcrAccent(lines.find((line) => /[⓪①②③④⑤⑥⑦⑧⑨]/.test(line)) || wordLine);
    const kana = pickOcrKana(lines, wordLine);
    const pos = pickOcrPos(lines);
    const meaning = pickOcrMeaning(lines);
    const note = pickOcrExampleNote(lines);
    return { word, kana, pos, accent, meaning, note };
  }

  function normalizeOcrLines(text) {
    return String(text || "")
      .replace(/[|｜]/g, " | ")
      .split(/\r?\n/)
      .map((line) => normalizeText(line)
        .replace(/([一-龯々〆ヵヶぁ-んァ-ヶー])\s+(?=[一-龯々〆ヵヶぁ-んァ-ヶー])/g, "$1")
        .replace(/\s+([。。，，；;])/g, "$1")
        .replace(/([（(])\s+/g, "$1")
        .replace(/\s+([）)])/g, "$1"))
      .filter(Boolean);
  }

  function looksLikeWordLine(line) {
    if (!line || isOcrNoiseLine(line)) return false;
    if (!/[一-龯々〆ヵヶぁ-んァ-ヶー]/.test(line)) return false;
    if (line.length > 28 && !/[⓪①②③④⑤⑥⑦⑧⑨]/.test(line)) return false;
    return true;
  }

  function cleanOcrWord(line = "") {
    const clean = normalizeText(line)
      .replace(/[⓪①②③④⑤⑥⑦⑧⑨]/g, "")
      .replace(/[|｜].*$/g, "")
      .replace(/[a-zA-Z][a-zA-Z0-9_-]*/g, " ")
      .replace(/[^\u3040-\u30ff\u3400-\u9fff々〆ヵヶー〜～・]/g, " ");
    const parts = clean.match(/[一-龯々〆ヵヶぁ-んァ-ヶー〜～・]+/g) || [];
    return normalizeText(parts.sort((a, b) => b.length - a.length)[0] || "");
  }

  function cleanOcrAccent(line = "") {
    const match = String(line || "").match(/[⓪①②③④⑤⑥⑦⑧⑨]/);
    return match ? match[0] : "";
  }

  function pickOcrKana(lines, wordLine) {
    const start = Math.max(0, lines.indexOf(wordLine));
    const nearby = lines.slice(start, Math.min(lines.length, start + 5));
    const candidates = nearby
      .flatMap((line) => line.match(/[ぁ-んァ-ヶー]{2,}/g) || [])
      .map((value) => toHiragana(value))
      .filter((value) => value && !["あい", "いい"].includes(value));
    return candidates.sort((a, b) => b.length - a.length)[0] || "";
  }

  function pickOcrPos(lines) {
    const posLine = lines.slice(0, 8).find((line) => {
      if (isOcrNoiseLine(line)) return false;
      return /(連語|接頭|接尾|名詞?|動詞?|自動|他動|形容|イ形|ナ形|副詞?|助詞?)/.test(line) || /^名$|^動$|^形$|^副$/.test(line);
    });
    if (!posLine) return "";
    const match = posLine.match(/(連語|接頭|接尾|名詞?|動詞?|自動[0-9３3]?|他動[0-9３3]?|イ形|ナ形|副詞?|助詞?|名|動|形|副)/);
    return normalizeText(match?.[0] || "");
  }

  function pickOcrMeaning(lines) {
    const richMeaning = lines.find((line) => isChineseMeaningLine(line) && /[;；，,、]/.test(line));
    if (richMeaning) return cleanOcrChineseLine(richMeaning);
    const summaryIndex = lines.findIndex((line) => /简明释义|簡明釈義|簡明|释义|釈義/.test(line));
    if (summaryIndex >= 0) {
      const picked = lines.slice(summaryIndex + 1, summaryIndex + 7).find((line) => isChineseMeaningLine(line));
      if (picked) return cleanOcrChineseLine(picked);
    }
    const afterChineseMark = lines.findIndex((line) => /^中$|^中\s/.test(line));
    if (afterChineseMark >= 0) {
      const picked = lines.slice(afterChineseMark + 1, afterChineseMark + 4).find((line) => isChineseMeaningLine(line));
      if (picked) return cleanOcrChineseLine(picked);
    }
    return cleanOcrChineseLine(lines.find((line) => isChineseMeaningLine(line)) || "");
  }

  function pickOcrExampleNote(lines) {
    const exampleIndex = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => /[ぁ-んァ-ヶ]/.test(line) && /。/.test(line) && line.length >= 9)
      .map(({ index }) => index)
      .pop();
    if (!Number.isInteger(exampleIndex)) return "";
    const jp = cleanOcrExampleLine(lines[exampleIndex]);
    const zh = cleanOcrChineseLine(lines.slice(exampleIndex + 1, exampleIndex + 4).find((line) => isChineseMeaningLine(line)) || "");
    return zh ? `例：${jp}\n译：${zh}` : `例：${jp}`;
  }

  function cleanOcrExampleLine(line) {
    const clean = normalizeText(line)
      .replace(/^[補昌回中日\s]+/g, "")
      .replace(/[う》]+$/g, "")
      .replace(/\s+/g, " ");
    const sentence = clean.match(/[一-龯々〆ヵヶぁ-んァ-ヶー・、]+。/);
    return sentence ? sentence[0] : clean;
  }

  function cleanOcrChineseLine(line) {
    return normalizeText(line).replace(/([一-龯])\s+(?=[一-龯])/g, "$1");
  }

  function isChineseMeaningLine(line) {
    if (!line || isOcrNoiseLine(line)) return false;
    if (/[ぁ-んァ-ヶ]/.test(line)) return false;
    if (!/[一-龯]/.test(line)) return false;
    if (/^[中日]$/.test(line)) return false;
    return normalizeText(line).length >= 3;
  }

  function isOcrNoiseLine(line) {
    const text = normalizeText(line);
    return /^(AI生成|AI|生成|管理个人信息|保存的信息|上次使用)$/i.test(text)
      || /^(释义|釈義|简明释义|簡明釈義|简明|簡明)/.test(text);
  }

  function addSingleWord(event) {
    event.preventDefault();
    const word = normalizeText(fieldValue("addWord"));
    const meaning = normalizeText(fieldValue("addMeaning"));
    if (!word || !meaning) {
      toast("写法和含义不能为空。", "error");
      return;
    }
    const item = normalizeWord({
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      seq: Date.now(),
      level: $("addLevel").value,
      word,
      kana: fieldValue("addKana"),
      pos: fieldValue("addPos"),
      accent: fieldValue("addAccent"),
      meaning,
      source: fieldValue("addSource") || "我的词库",
      note: fieldValue("addNote"),
      type: "主词条",
      status: "自定义",
    }, state.customWords.length, true);
    if (!item) {
      toast("无法添加这个词条。", "error");
      return;
    }
    const duplicate = state.words.some((existing) => duplicateKey(existing) === duplicateKey(item));
    if (duplicate) {
      toast("词库中已有相同写法、假名和含义。", "error");
      return;
    }
    state.customWords.push(item);
    saveJson(STORAGE.custom, state.customWords.map(cleanWordForExport));
    resetAddWordForm();
    refreshWords();
    renderAll();
    toast(`已添加「${word}」。`, "success");
  }

  async function importWordFiles(files) {
    if (!files.length) return;
    const defaultLevel = $("importDefaultLevel").value;
    const defaultSource = normalizeText($("importDefaultSource").value) || "导入词库";
    let rawItems = [];
    try {
      for (const file of files) {
        const items = await parseWordFile(file);
        rawItems.push(...items.map((item) => ({ ...item, __fileName: file.name })));
      }
      const result = appendImportedWords(rawItems, { defaultLevel, defaultSource });
      $("importWordsInput").value = "";
      toast(`已导入 ${result.imported} 条${result.skipped ? `，跳过重复 ${result.skipped} 条` : ""}${result.invalid ? `，无效 ${result.invalid} 行` : ""}。`, result.imported ? "success" : "error", 5200);
    } catch (error) {
      toast(error?.message || "文件导入失败。", "error", 5200);
    }
  }

  async function parseWordFile(file) {
    const name = file.name.toLowerCase();
    if (name.endsWith(".json")) {
      const data = JSON.parse(await file.text());
      return extractImportItems(data);
    }
    if (name.endsWith(".csv") || name.endsWith(".tsv")) {
      const text = await file.text();
      const delimiter = name.endsWith(".tsv") ? "\t" : detectDelimiter(text);
      return rowsToObjects(parseDelimited(text, delimiter));
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      if (!window.XLSX) throw new Error("Excel 解析库未加载，请联网刷新后再试，或先另存为 CSV。 ");
      const workbook = window.XLSX.read(await file.arrayBuffer(), { type: "array" });
      return workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return window.XLSX.utils.sheet_to_json(sheet, { defval: "", blankrows: false });
      });
    }
    throw new Error(`暂不支持 ${file.name}，请使用 JSON、CSV、TSV 或 Excel。`);
  }

  function extractImportItems(data) {
    if (Array.isArray(data)) return data;
    for (const key of ["words", "vocab", "items", "custom", "customWords", "data"]) {
      if (Array.isArray(data?.[key])) return data[key];
    }
    return data && typeof data === "object" ? [data] : [];
  }

  function appendImportedWords(rawItems, defaults) {
    const existing = new Set(state.words.map(duplicateKey));
    let imported = 0;
    let skipped = 0;
    let invalid = 0;
    rawItems.forEach((raw, index) => {
      const candidate = normalizeWord({
        ...raw,
        id: normalizeText(raw.id) || `custom-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
        level: pickField(raw, ["level", "等级", "JLPT"]) || defaults.defaultLevel,
        source: pickField(raw, ["source", "词库", "listName", "来源"]) || defaults.defaultSource || raw.__fileName,
      }, state.customWords.length + index, true);
      if (!candidate) {
        invalid += 1;
        return;
      }
      const key = duplicateKey(candidate);
      if (existing.has(key)) {
        skipped += 1;
        return;
      }
      existing.add(key);
      state.customWords.push(candidate);
      imported += 1;
    });
    saveJson(STORAGE.custom, state.customWords.map(cleanWordForExport));
    refreshWords();
    renderAll();
    return { imported, skipped, invalid };
  }

  function exportBackup() {
    const payload = {
      app: "Kotoba Flow",
      version: 3,
      exportedAt: new Date().toISOString(),
      baseWords: state.baseWords.map(cleanWordForExport),
      customWords: state.customWords.map(cleanWordForExport),
      deletedBaseIds: [...state.deletedIds],
      progress: state.progress,
      history: state.history,
      settings: state.settings,
      speech: {
        mode: state.settings.speechMode,
        voiceURI: state.settings.speechVoice,
        rate: state.settings.speechRate,
        pitch: state.settings.speechPitch,
      },
    };
    downloadJson(payload, `kotoba-flow-backup-${dateKey(new Date())}.json`);
    toast("完整备份已导出。", "success");
  }

  function cleanWordForExport(word) {
    if (!word || typeof word !== "object") return word;
    const { _search, _romaji, _kanaGroup, _custom, ...clean } = word;
    return clean;
  }

  function saveBaseWords() {
    saveJson(STORAGE.base, state.baseWords.map(cleanWordForExport));
  }

  async function importBackupFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      askConfirm("恢复这个备份？", "当前浏览器中的同类数据会被备份内容覆盖。建议先导出一份当前备份。", () => applyImportedBackup(data), "确认恢复");
    } catch (_) {
      toast("备份文件不是有效的 JSON。", "error");
    }
  }

  function applyImportedBackup(data) {
    if (!data || typeof data !== "object") {
      toast("备份结构无法识别。", "error");
      return;
    }
    const importedBaseWords = data.baseWords || data.base;
    const looksLikeDirectProgress = !data.progress && Object.values(data).some((value) => value && typeof value === "object" && ("seen" in value || "correct" in value));
    if (importedBaseWords) saveJson(STORAGE.base, importedBaseWords);
    if (data.customWords || data.custom) saveJson(STORAGE.custom, data.customWords || data.custom);
    if (data.deletedBaseIds || data.deleted) saveJson(STORAGE.deleted, data.deletedBaseIds || data.deleted);
    if (data.progress) saveJson(STORAGE.progress, data.progress);
    else if (looksLikeDirectProgress) saveJson(STORAGE.progress, data);
    if (data.history) saveJson(STORAGE.history, data.history);
    if (data.settings) saveJson(STORAGE.settings, { ...state.settings, ...data.settings });
    if (data.speech && !data.settings) saveJson(STORAGE.speech, data.speech);
    loadPersistentState();
    if (importedBaseWords) {
      state.baseWords = state.savedBaseWords.map((item, index) => normalizeWord(item, index, false)).filter(Boolean);
    } else {
      state.baseWords = mergeStoredBaseWords(state.baseWords);
    }
    applyTheme();
    refreshWords();
    syncControlsFromSettings();
    renderAll();
    toast("备份已恢复。", "success");
  }

  function exportLibrary() {
    const payload = state.words.map(cleanWordForExport);
    downloadJson(payload, `jlpt-vocabulary-${dateKey(new Date())}.json`);
    toast(`已导出 ${payload.length.toLocaleString()} 个词。`, "success");
  }

  function restoreBuiltInWords() {
    if (!state.deletedIds.size) {
      toast("目前没有被隐藏的内置词。", "success");
      return;
    }
    askConfirm("恢复所有内置词？", `将恢复 ${state.deletedIds.size} 个被隐藏的内置词，自定义词不受影响。`, () => {
      state.deletedIds.clear();
      saveJson(STORAGE.deleted, []);
      refreshWords();
      renderAll();
      toast("内置词已恢复。", "success");
    }, "全部恢复");
  }

  function deleteSource(source) {
    const ids = state.words.filter((word) => word.source === source).map((word) => word.id);
    if (!ids.length) return;
    askConfirm(`删除词库「${source}」？`, `将删除或隐藏其中 ${ids.length} 个词。被隐藏的内置词之后可以恢复。`, () => {
      deleteWordsByIds(ids);
      toast(`词库「${source}」已移除。`, "success");
    }, "删除词库");
  }

  function requestDeleteWords(ids) {
    const valid = ids.filter((id) => state.wordMap.has(id));
    if (!valid.length) return;
    const builtInCount = valid.filter((id) => !state.wordMap.get(id)?._custom).length;
    const message = builtInCount
      ? `将处理 ${valid.length} 个词，其中 ${builtInCount} 个内置词会被隐藏，可在词库管理中恢复。`
      : `将永久删除 ${valid.length} 个自定义词。`;
    askConfirm("删除所选词汇？", message, () => {
      deleteWordsByIds(valid);
      toast(`已处理 ${valid.length} 个词。`, "success");
    }, "确认删除");
  }

  function deleteSelectedWords() {
    requestDeleteWords([...state.selectedIds]);
  }

  function deleteWordsByIds(ids) {
    const set = new Set(ids);
    state.customWords = state.customWords.filter((word) => !set.has(word.id));
    ids.forEach((id) => {
      const word = state.wordMap.get(id);
      if (word && !word._custom) state.deletedIds.add(id);
      state.selectedIds.delete(id);
    });
    saveJson(STORAGE.custom, state.customWords.map(cleanWordForExport));
    saveJson(STORAGE.deleted, [...state.deletedIds]);
    refreshWords();
    renderAll();
  }

  function starSelectedWords() {
    if (!state.selectedIds.size) return;
    const shouldStar = [...state.selectedIds].some((id) => !state.progress[id]?.starred);
    state.selectedIds.forEach((id) => {
      const p = state.progress[id] || {};
      state.progress[id] = { ...p, starred: shouldStar };
    });
    saveJson(STORAGE.progress, state.progress);
    renderAll();
    toast(shouldStar ? "已收藏所选词汇。" : "已取消收藏所选词汇。", "success");
  }

  function renderInsights() {
    const stats = calculateStats();
    const weekStart = Date.now() - 7 * DAY;
    const recent = state.history.filter((item) => Number(item.time || item.timestamp || 0) >= weekStart);
    const weekCorrect = recent.filter((item) => item.correct).length;
    const weekAccuracy = recent.length ? Math.round(weekCorrect / recent.length * 100) : 0;
    $("insightAnswers").textContent = stats.answers.toLocaleString();
    $("insightStreak").textContent = `${stats.streak} 天`;
    $("insightWeekAccuracy").textContent = `${weekAccuracy}%`;
    $("insightWeekAccuracySub").textContent = recent.length ? `近 7 天 ${recent.length} 次作答` : "暂无数据";
    $("insightDifficult").textContent = stats.difficult.toLocaleString();
    renderLevelProgress($("insightLevelProgress"), true);
    renderHeatmap();
    renderHistory();
    renderDifficultWords();
  }

  function renderHeatmap() {
    const days = lastNDays(28);
    const counts = new Map(days.map((date) => [dateKey(date), 0]));
    state.history.forEach((item) => {
      const key = dateKey(new Date(Number(item.time || item.timestamp || 0)));
      if (counts.has(key)) counts.set(key, counts.get(key) + 1);
    });
    const values = [...counts.values()];
    const max = Math.max(1, ...values);
    $("heatmap").innerHTML = days.map((date) => {
      const count = counts.get(dateKey(date)) || 0;
      const ratio = count / max;
      const level = count === 0 ? 0 : ratio <= .25 ? 1 : ratio <= .5 ? 2 : ratio <= .75 ? 3 : 4;
      return `<div class="heat-cell" data-level="${level}" aria-label="${escapeAttr(formatShortDate(date))} · ${count} 题"></div>`;
    }).join("");
  }

  function renderHistory() {
    const list = state.history.slice(0, 30);
    $("historyList").innerHTML = list.length ? list.map((item) => {
      const word = state.wordMap.get(item.id);
      const label = word?.meaning || `${LEVEL_LABELS[item.level] || item.level || ""} · ${ratingLabel(item.rating)}`;
      return `<div class="history-item"><span class="history-status${item.correct ? "" : " wrong"}">${item.correct ? "✓" : "×"}</span><div><strong>${escapeHtml(item.word || word?.word || "未知词汇")}</strong><span>${escapeHtml(label)}</span></div><time>${escapeHtml(relativeTime(Number(item.time || item.timestamp || 0)))}</time></div>`;
    }).join("") : `<div class="empty-state"><div><strong>还没有答题记录</strong><span>完成一轮学习后会显示在这里。</span></div></div>`;
  }

  function renderDifficultWords() {
    const words = state.words
      .filter((word) => {
        const p = state.progress[word.id] || {};
        return isDifficult(p) && !isMastered(p);
      })
      .sort((a, b) => difficultyScore(state.progress[b.id]) - difficultyScore(state.progress[a.id]))
      .slice(0, 8);
    const root = $("difficultList");
    root.innerHTML = words.length ? words.map((word) => compactWordTemplate(word, `错 ${state.progress[word.id]?.wrong || 0} 次`)).join("") : `<div class="empty-state"><div><strong>暂时没有明显薄弱词</strong><span>继续学习后会自动识别。</span></div></div>`;
    root.querySelectorAll("[data-word-id]").forEach((node) => node.addEventListener("click", () => openWordDialog(node.dataset.wordId)));
  }

  function clearHistory() {
    if (!state.history.length) {
      toast("答题历史已经是空的。", "success");
      return;
    }
    askConfirm("清空答题历史？", "只会清除最近记录和学习热力，不会重置单词进度。", () => {
      state.history = [];
      saveJson(STORAGE.history, []);
      renderAll();
      toast("答题历史已清空。", "success");
    }, "清空记录");
  }

  function renderSettings() {
    $$("[data-theme-option]").forEach((button) => button.classList.toggle("active", button.dataset.themeOption === state.settings.theme));
    $("dailyGoal").value = String(state.settings.dailyGoal);
    $("dailyGoalValue").textContent = `${state.settings.dailyGoal} 题`;
    $("autoSpeak").checked = Boolean(state.settings.autoSpeak);
    $("speechMode").value = state.settings.speechMode;
    $("speechRate").value = String(state.settings.speechRate);
    $("speechPitch").value = String(state.settings.speechPitch);
    $("speechRateValue").textContent = Number(state.settings.speechRate).toFixed(2);
    $("speechPitchValue").textContent = Number(state.settings.speechPitch).toFixed(2);
    updateThemeIcons();
  }

  function syncControlsFromSettings() {
    $("studyLevel").value = state.settings.studyLevel;
    $("studyScope").value = state.settings.studyScope;
    $("studyCount").value = String(state.settings.studyCount);
    $("studyOrder").value = state.settings.studyOrder;
    renderSettings();
  }

  function saveSpeechControls() {
    state.settings.speechMode = $("speechMode").value;
    state.settings.speechVoice = $("speechVoice").value;
    state.settings.speechRate = Number($("speechRate").value);
    state.settings.speechPitch = Number($("speechPitch").value);
    saveSettings();
    saveJson(STORAGE.speech, {
      mode: state.settings.speechMode,
      voiceURI: state.settings.speechVoice,
      rate: state.settings.speechRate,
      pitch: state.settings.speechPitch,
    });
  }

  function saveSettings() {
    saveJson(STORAGE.settings, state.settings);
  }

  function applyTheme() {
    const preferred = state.settings.theme === "system"
      ? (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : state.settings.theme;
    document.documentElement.dataset.theme = preferred;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", preferred === "dark" ? "#121816" : "#315f53");
    updateThemeIcons();
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme;
    state.settings.theme = current === "dark" ? "light" : "dark";
    saveSettings();
    applyTheme();
    renderSettings();
  }

  function updateThemeIcons() {
    const dark = document.documentElement.dataset.theme === "dark";
    [$("themeBtn"), $("mobileThemeBtn")].forEach((button) => {
      if (button) button.innerHTML = `<svg><use href="#${dark ? "i-sun" : "i-moon"}"></use></svg>`;
    });
  }

  function resetProgress() {
    const count = Object.keys(state.progress).length;
    if (!count && !state.history.length) {
      toast("目前没有学习进度。", "success");
      return;
    }
    askConfirm("清空所有学习进度？", "所有复习安排、正确率、收藏状态与历史记录都会归零，词库不会删除。", () => {
      state.progress = {};
      state.history = [];
      saveJson(STORAGE.progress, {});
      saveJson(STORAGE.history, []);
      renderAll();
      toast("学习进度已清空。", "success");
    }, "确认清空");
  }

  function openWordDialog(id, refreshOnly = false) {
    const word = state.wordMap.get(id);
    if (!word) return;
    state.dialogWordId = id;
    const p = state.progress[id] || {};
    $("dialogLevel").textContent = LEVEL_LABELS[word.level] || word.level;
    $("dialogSource").textContent = word.source || "未命名词库";
    $("dialogWord").textContent = word.word;
    $("dialogKana").textContent = [word.kana, word.accent].filter(Boolean).join(" · ") || "暂无假名";
    $("dialogMeaning").textContent = word.meaning;
    $("dialogMeaningInput").value = word.meaning;
    hideMeaningEditor();
    $("dialogPos").textContent = word.pos || "—";
    $("dialogAccent").textContent = word.accent || "—";
    $("dialogSeen").textContent = `${p.seen || 0} 次`;
    $("dialogDue").textContent = formatDue(p.nextReview);
    $("dialogNoteWrap").classList.toggle("hidden", !word.note);
    $("dialogNote").textContent = word.note || "";
    $("dialogStarBtn").textContent = p.starred ? "取消收藏" : "收藏";
    $("dialogDeleteBtn").textContent = word._custom ? "删除词条" : "隐藏词条";
    if (!refreshOnly && !$("wordDialog").open) $("wordDialog").showModal();
  }

  function showMeaningEditor() {
    const word = state.wordMap.get(state.dialogWordId);
    if (!word) return;
    $("dialogMeaningInput").value = word.meaning;
    $("dialogMeaningEditor").classList.remove("hidden");
    $("dialogMeaningInput").focus();
    $("dialogMeaningInput").select();
  }

  function hideMeaningEditor() {
    $("dialogMeaningEditor")?.classList.add("hidden");
  }

  function saveDialogMeaning() {
    const id = state.dialogWordId;
    const word = state.wordMap.get(id);
    const meaning = normalizeText($("dialogMeaningInput").value);
    if (!word || !meaning) {
      toast("含义不能为空。", "error");
      return;
    }
    if (word._custom) {
      const index = state.customWords.findIndex((item) => item.id === id);
      if (index >= 0) state.customWords[index] = { ...state.customWords[index], meaning };
      saveJson(STORAGE.custom, state.customWords.map(cleanWordForExport));
    } else {
      const index = state.baseWords.findIndex((item) => item.id === id);
      if (index >= 0) state.baseWords[index] = { ...state.baseWords[index], meaning };
      saveBaseWords();
    }
    refreshWords();
    renderAll();
    openWordDialog(id, true);
    toast("含义已保存到当前词库。", "success");
  }

  function toggleStar(id) {
    if (!id || !state.wordMap.has(id)) return;
    const p = state.progress[id] || {};
    state.progress[id] = { ...p, starred: !p.starred };
    saveJson(STORAGE.progress, state.progress);
    const word = state.wordMap.get(id);
    toast(state.progress[id].starred ? `已收藏「${word.word}」。` : `已取消收藏「${word.word}」。`, "success");
    renderDashboard();
    renderLibrary();
    renderInsights();
    if (state.session && currentSessionWord()?.id === id) {
      $("studyStarBtn").classList.toggle("starred", state.progress[id].starred);
    }
  }

  function askConfirm(title, message, action, confirmLabel = "确认") {
    state.confirmAction = action;
    $("confirmTitle").textContent = title;
    $("confirmMessage").textContent = message;
    $("confirmOkBtn").textContent = confirmLabel;
    if ($("confirmDialog").open) $("confirmDialog").close();
    $("confirmDialog").showModal();
  }

  function compactWordTemplate(word, trailingText) {
    return `<button class="compact-word-item" data-word-id="${escapeAttr(word.id)}" type="button" style="width:100%;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer">
      <div><div class="word-line"><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.meaning)}</span></div><small>${escapeHtml([word.kana, word.pos].filter(Boolean).join(" · "))}</small></div>
      <span class="level-badge">${escapeHtml(trailingText || LEVEL_LABELS[word.level] || word.level)}</span>
    </button>`;
  }

  function getWordStatus(progress = {}) {
    if (isMastered(progress)) return "mastered";
    if (isDue(progress)) return "due";
    if (progress.seen > 0) return "learning";
    return "new";
  }

  function isDue(progress = {}) {
    return Boolean(progress.nextReview && Number(progress.nextReview) <= Date.now());
  }

  function isMastered(progress = {}) {
    const attempts = Number(progress.correct || 0) + Number(progress.wrong || 0);
    const accuracy = attempts ? Number(progress.correct || 0) / attempts : 0;
    return Number(progress.seen || 0) >= 3 && Number(progress.interval || 0) >= 21 && accuracy >= 0.75;
  }

  function isDifficult(progress = {}) {
    const wrong = Number(progress.wrong || 0);
    const correct = Number(progress.correct || 0);
    return Number(progress.lapses || 0) >= 2 || (wrong >= 2 && wrong >= correct);
  }

  function difficultyScore(progress = {}) {
    return Number(progress.wrong || 0) * 3 + Number(progress.lapses || 0) * 4 - Number(progress.correct || 0) + (isDue(progress) ? 2 : 0);
  }

  function voiceChoiceFor(voice) {
    const haystack = `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
    return SPEECH_VOICE_CHOICES.find((choice) => choice.terms.some((term) => haystack.includes(term.toLowerCase()))) || null;
  }

  function getAllowedSpeechVoices() {
    const preferred = SPEECH_VOICE_CHOICES.map((choice) => {
      const candidates = state.voices
        .filter((voice) => voiceChoiceFor(voice)?.key === choice.key)
        .sort((a, b) => speechVoicePriority(b) - speechVoicePriority(a));
      return candidates[0] ? { voice: candidates[0], choice } : null;
    }).filter(Boolean);
    if (preferred.length) return preferred;
    return state.voices
      .filter((voice) => /^ja(-|_)jp$/i.test(String(voice?.lang || "")) || /japan|japanese|日本|日语|日語/i.test(`${voice?.name || ""} ${voice?.voiceURI || ""}`))
      .sort((a, b) => speechVoicePriority(b) - speechVoicePriority(a))
      .map((voice) => ({ voice, choice: { key: voice.voiceURI, label: voice.name || "系统日语语音" } }));
  }

  function speechVoicePriority(voice) {
    const name = `${voice?.name || ""} ${voice?.voiceURI || ""}`.toLowerCase();
    let score = 0;
    if (name.includes("natural")) score += 8;
    if (name.includes("online")) score += 6;
    if (String(voice?.lang || "").toLowerCase() === "ja-jp") score += 4;
    if (voice?.localService) score += 1;
    if (voice?.default) score += 1;
    return score;
  }

  function setupSpeechVoices() {
    if (!("speechSynthesis" in window)) return;
    const load = () => {
      state.voices = window.speechSynthesis.getVoices();
      const allowed = getAllowedSpeechVoices();
      const select = $("speechVoice");
      if (!select) return;
      if (!allowed.length) {
        select.innerHTML = `<option value="">当前浏览器未提供七海或圭太</option>`;
        select.disabled = true;
        return;
      }
      select.disabled = false;
      select.innerHTML = allowed.map(({ voice, choice }) => `<option value="${escapeAttr(voice.voiceURI)}">${escapeHtml(choice.label)}</option>`).join("");
      const selected = allowed.find(({ voice }) => voice.voiceURI === state.settings.speechVoice) || allowed[0];
      select.value = selected.voice.voiceURI;
      if (state.settings.speechVoice !== selected.voice.voiceURI) {
        state.settings.speechVoice = selected.voice.voiceURI;
        saveSettings();
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }

  function speakWord(word) {
    if (!word) return;
    const mode = state.settings.speechMode;
    const text = mode === "word"
      ? word.word
      : mode === "both"
        ? [word.kana || word.word, word.word].filter(Boolean).join("、")
        : word.kana || word.word;
    speakText(text);
  }

  function speakText(text) {
    if (!("speechSynthesis" in window) || !text) {
      toast("当前浏览器不支持语音朗读。", "error");
      return;
    }
    const allowed = getAllowedSpeechVoices();
    const selected = allowed.find(({ voice }) => voice.voiceURI === state.settings.speechVoice) || allowed[0];
    if (!selected) {
      toast("未检测到七海或圭太语音，请使用安装了这两种日语音色的浏览器。", "error", 4600);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selected.voice.lang || "ja-JP";
    utterance.rate = Number(state.settings.speechRate || 0.85);
    utterance.pitch = Number(state.settings.speechPitch || 1);
    utterance.voice = selected.voice;
    window.speechSynthesis.speak(utterance);
  }


  function formatDue(timestamp) {
    if (!timestamp) return "未安排";
    const diff = Number(timestamp) - Date.now();
    if (diff <= 0) return "现在";
    if (diff < DAY) return `${Math.max(1, Math.round(diff / 3600000))} 小时后`;
    if (diff < 30 * DAY) return `${Math.ceil(diff / DAY)} 天后`;
    return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(new Date(Number(timestamp)));
  }

  function relativeTime(timestamp) {
    if (!timestamp) return "未知时间";
    const diff = Date.now() - timestamp;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < DAY) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} 天前`;
    return formatShortDate(new Date(timestamp));
  }

  function ratingLabel(rating) {
    return { again: "重来", hard: "困难", good: "记得", easy: "简单", mastered: "掌握" }[rating] || "已作答";
  }

  function detectDelimiter(text) {
    const firstLine = String(text).split(/\r?\n/, 1)[0] || "";
    const candidates = [",", "\t", ";"];
    return candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    const input = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === delimiter && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => normalizeText(value))) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
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
        if (header) item[header] = row[index] ?? "";
      });
      return item;
    });
  }

  function pickField(object, aliases) {
    if (!object || typeof object !== "object") return "";
    const entries = Object.entries(object);
    for (const alias of aliases) {
      if (Object.prototype.hasOwnProperty.call(object, alias)) return object[alias];
      const normalizedAlias = String(alias).trim().toLowerCase();
      const found = entries.find(([key]) => String(key).trim().toLowerCase() === normalizedAlias);
      if (found) return found[1];
    }
    return "";
  }

  function normalizeLevel(value) {
    const text = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    if (LEVELS.includes(text)) return text;
    const match = text.match(/[N]?([1-5])/);
    return match ? `N${match[1]}` : "CUSTOM";
  }

  function normalizeText(value) {
    return String(value ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
  }

  function normalizeAnswer(value) {
    return normalizeText(value).replace(/[\s・、。,.，]/g, "").toLowerCase();
  }

  function cleanKanaAnswer(word) {
    const source = normalizeText(word?.kana || word?.word || "");
    return toHiragana(source)
      .replace(/[（(][^）)]*[）)]/g, "")
      .replace(/[~～]/g, "")
      .split("")
      .filter((char) => /[ぁ-んー]/.test(char))
      .join("");
  }

  function isCoreVocabulary(word) {
    const text = [word?.word, word?.kana, word?.pos, word?.type].map((value) => normalizeText(value)).join(" ");
    if (/[~～]/.test(text)) return false;
    return !/(接頭|接头|接尾|prefix|suffix)/i.test(text);
  }

  function isChoiceCandidate(word, mode) {
    if (!word?.meaning) return false;
    if (mode === "meaningToKana" || mode === "listening") return Boolean(cleanKanaAnswer(word)) && isCoreVocabulary(word);
    return true;
  }

  function answerOptionKey(word, mode) {
    if (mode === "meaningToKana") return cleanKanaAnswer(word);
    return normalizeText(word?.meaning || "").toLowerCase();
  }

  function duplicateKey(word) {
    return `${normalizeAnswer(word.word)}|${normalizeAnswer(word.kana)}|${normalizeAnswer(word.meaning)}`;
  }

  function toHiragana(value) {
    return String(value || "").replace(/[ァ-ヶ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
  }

  function kanaToRomaji(value) {
    const text = toHiragana(value);
    let output = "";
    let geminate = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (char === "っ") {
        geminate = true;
        continue;
      }
      const pair = text.slice(index, index + 2);
      const pairMatch = ROMAJI_PAIRS.find(([kana]) => kana === pair);
      let romaji = pairMatch ? pairMatch[1] : (ROMAJI_SINGLE[char] || char);
      if (pairMatch) index += 1;
      if (geminate && /^[bcdfghjklmnpqrstvwxyz]/i.test(romaji)) romaji = romaji[0] + romaji;
      geminate = false;
      output += romaji;
    }
    return output;
  }

  function getKanaGroup(word) {
    const reading = toHiragana(word.kana || word.word || "");
    const first = [...reading].find((char) => /[ぁ-ん]/.test(char));
    if (!first) return "他";
    const group = KANA_GROUPS.find((item) => item.key !== "all" && item.key !== "他" && item.chars.includes(first));
    return group?.key || "他";
  }

  function compareKana(a, b) {
    return (a.kana || a.word).localeCompare(b.kana || b.word, "ja", { sensitivity: "base" }) || a.word.localeCompare(b.word, "ja");
  }

  function compareStudySequence(a, b) {
    const seqA = Number.isFinite(Number(a.seq)) ? Number(a.seq) : Number.MAX_SAFE_INTEGER;
    const seqB = Number.isFinite(Number(b.seq)) ? Number(b.seq) : Number.MAX_SAFE_INTEGER;
    return seqA - seqB || compareKana(a, b);
  }

  function simpleHash(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function countBy(items, getter) {
    return items.reduce((result, item) => {
      const key = getter(item);
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
  }


  function shuffle(items) {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
    }
    return items;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number(value)));
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dateKey(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function lastNDays(count) {
    const today = startOfDay(new Date());
    return Array.from({ length: count }, (_, index) => new Date(today.getTime() - (count - 1 - index) * DAY));
  }

  function formatLongDate(date) {
    return new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(date);
  }

  function formatShortDate(date) {
    return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(date);
  }

  function weekdayShort(date) {
    return new Intl.DateTimeFormat("zh-CN", { weekday: "narrow" }).format(date);
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function loadExternalScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${CSS.escape(src)}"]`);
      if (existing) {
        if (existing.dataset.loaded === "true") {
          resolve();
          return;
        }
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        resolve();
      }, { once: true });
      script.addEventListener("error", () => reject(new Error("OCR 脚本加载失败，请检查网络后重试。")), { once: true });
      document.head.appendChild(script);
    });
  }

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      toast("浏览器存储空间不足，部分数据可能没有保存。", "error", 5200);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }

  function toast(message, type = "success", duration = 3200) {
    const node = document.createElement("div");
    node.className = `toast ${type}`;
    node.innerHTML = `<span>${escapeHtml(message)}</span>`;
    $("toastRegion")?.appendChild(node);
    window.setTimeout(() => node.remove(), duration);
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (state.settings.theme === "system") applyTheme();
  });
})();
