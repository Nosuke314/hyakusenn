(() => {
  const cfg = window.HYAKUSEN_CONFIG;
  const STORAGE_KEY = "hyakusen.answers.v1";
  const USER_KEY = "hyakusen.user.v1";

  const el = {
    grid: document.getElementById("questionGrid"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    unlockCount: document.getElementById("unlockCount"),
    todayText: document.getElementById("todayText"),
    dialog: document.getElementById("questionDialog"),
    dialogNumber: document.getElementById("dialogNumber"),
    closeDialog: document.getElementById("closeDialog"),
    lockedView: document.getElementById("lockedView"),
    unlockDateText: document.getElementById("unlockDateText"),
    questionView: document.getElementById("questionView"),
    questionImage: document.getElementById("questionImage"),
    imagePlaceholder: document.getElementById("imagePlaceholder"),
    imagePlaceholderNumber: document.getElementById("imagePlaceholderNumber"),
    answerForm: document.getElementById("answerForm"),
    answerInput: document.getElementById("answerInput"),
    answerMessage: document.getElementById("answerMessage"),
    savedAtText: document.getElementById("savedAtText"),
    clearAnswerButton: document.getElementById("clearAnswerButton"),
    finalCard: document.getElementById("finalCard"),
    finalStatus: document.getElementById("finalStatus"),
    helpButton: document.getElementById("helpButton"),
    helpDialog: document.getElementById("helpDialog"),
    closeHelp: document.getElementById("closeHelp")
  };

  let currentQuestion = null;
  let state = {
    nowJstDate: jstDateString(new Date()),
    unlockedRegularCount: 0,
    finalUnlocked: false,
    source: "device"
  };

  const answers = loadAnswers();
  const userId = getOrCreateUserId();

  function getOrCreateUserId() {
    let id = localStorage.getItem(USER_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || `u-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(USER_KEY, id);
    }
    return id;
  }

  function loadAnswers() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }

  function persistAnswers() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }

  function dateAtJstMidnight(dateString) {
    return new Date(`${dateString}T00:00:00+09:00`);
  }

  function addDays(dateString, days) {
    const d = dateAtJstMidnight(dateString);
    d.setUTCDate(d.getUTCDate() + days);
    return jstDateString(d);
  }

  function jstDateString(date) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function formatMd(dateString) {
    const [, m, d] = dateString.split("-");
    return `${Number(m)}.${Number(d)}`;
  }

  function formatJapaneseDate(dateString) {
    const [y, m, d] = dateString.split("-");
    return `${y}年${Number(m)}月${Number(d)}日 0:00`;
  }

  function releaseDateFor(n) {
    return addDays(cfg.startDate, n - 1);
  }

  function isDateReached(releaseDate) {
    return state.nowJstDate >= releaseDate;
  }

  async function loadServerState() {
    try {
      const res = await fetch(cfg.serverStateEndpoint, { cache: "no-store" });
      if (!res.ok) throw new Error("state API unavailable");
      const data = await res.json();
      if (!data?.nowJstDate) throw new Error("invalid state");
      state = {
        nowJstDate: data.nowJstDate,
        unlockedRegularCount: Math.max(0, Math.min(cfg.totalRegularQuestions, data.unlockedRegularCount ?? 0)),
        finalUnlocked: Boolean(data.finalUnlocked),
        source: "server"
      };
    } catch {
      if (!cfg.allowDeviceTimeFallback) return;
      const now = jstDateString(new Date());
      const start = dateAtJstMidnight(cfg.startDate);
      const today = dateAtJstMidnight(now);
      const diff = Math.floor((today - start) / 86400000) + 1;
      state = {
        nowJstDate: now,
        unlockedRegularCount: Math.max(0, Math.min(cfg.totalRegularQuestions, diff)),
        finalUnlocked: now >= cfg.finalDate,
        source: "device"
      };
    }
  }

  function renderGrid() {
    el.grid.innerHTML = "";
    for (let n = 1; n <= cfg.totalRegularQuestions; n++) {
      const releaseDate = releaseDateFor(n);
      const unlocked = n <= state.unlockedRegularCount && isDateReached(releaseDate);
      const answered = Boolean(answers[n]?.text?.trim());
      const isToday = state.nowJstDate === releaseDate;

      const button = document.createElement("button");
      button.type = "button";
      button.className = `question-card${unlocked ? "" : " locked"}${answered ? " answered" : ""}${isToday ? " today" : ""}`;
      button.dataset.question = String(n);
      button.setAttribute("aria-label", `第${n}問${unlocked ? "" : " 未公開"}`);
      button.innerHTML = `
        <span class="number">${String(n).padStart(2, "0")}</span>
        <span class="status-dot" aria-hidden="true"></span>
        <span class="date">${formatMd(releaseDate)}</span>
      `;
      button.addEventListener("click", () => openQuestion(n));
      el.grid.appendChild(button);
    }
    updateProgress();
    updateFinal();
  }

  function updateProgress() {
    const answeredCount = Object.entries(answers)
      .filter(([k,v]) => Number(k) <= cfg.totalRegularQuestions && v?.text?.trim()).length;
    el.progressText.textContent = `${answeredCount} / ${cfg.totalRegularQuestions}`;
    el.progressBar.style.width = `${(answeredCount / cfg.totalRegularQuestions) * 100}%`;
    el.unlockCount.textContent = `${state.unlockedRegularCount} OPEN`;
    el.todayText.textContent = `${state.nowJstDate.replaceAll("-", ".")} JST${state.source === "device" ? "" : " • SERVER"}`;
  }

  function updateFinal() {
    const unlocked = state.finalUnlocked && isDateReached(cfg.finalDate);
    el.finalCard.classList.toggle("locked", !unlocked);
    el.finalStatus.textContent = unlocked ? "OPEN" : `${formatMd(cfg.finalDate)} OPEN`;
  }

  function openQuestion(n) {
    currentQuestion = n;
    const releaseDate = releaseDateFor(n);
    const unlocked = n <= state.unlockedRegularCount && isDateReached(releaseDate);

    el.dialogNumber.textContent = String(n).padStart(3, "0");
    el.answerMessage.textContent = "";
    el.answerMessage.className = "answer-message";

    if (!unlocked) {
      el.lockedView.hidden = false;
      el.questionView.hidden = true;
      el.unlockDateText.textContent = `${formatJapaneseDate(releaseDate)} に公開されます。`;
    } else {
      el.lockedView.hidden = true;
      el.questionView.hidden = false;
      loadQuestionImage(n);
      el.answerInput.value = answers[n]?.text || "";
      updateSavedAt(n);
      setTimeout(() => el.answerInput.focus(), 80);
    }

    if (!el.dialog.open) el.dialog.showModal();
    history.replaceState(null, "", `#q${n}`);
  }

  function loadQuestionImage(n) {
    const filename = `q${String(n).padStart(3, "0")}.${cfg.questionImageExtension}`;
    el.questionImage.hidden = false;
    el.imagePlaceholder.hidden = true;
    el.questionImage.src = `questions/${filename}?v=${n}`;
    el.questionImage.alt = `第${n}問`;
    el.imagePlaceholderNumber.textContent = String(n).padStart(3, "0");
    el.questionImage.onerror = () => {
      el.questionImage.hidden = true;
      el.imagePlaceholder.hidden = false;
    };
  }

  function updateSavedAt(n) {
    const item = answers[n];
    if (!item?.savedAt) {
      el.savedAtText.textContent = "未回答";
      return;
    }
    const d = new Date(item.savedAt);
    el.savedAtText.textContent = `保存済み ${new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
    }).format(d)}`;
  }

  async function saveAnswer(n, text) {
    answers[n] = { text, savedAt: new Date().toISOString() };
    persistAnswers();
    updateSavedAt(n);
    renderGrid();

    if (!text.trim()) {
      el.answerMessage.textContent = "回答を空欄で保存しました。";
      return;
    }

    if (cfg.answerMode !== "remote") {
      el.answerMessage.textContent = "回答をこの端末に保存しました。";
      return;
    }

    el.answerMessage.textContent = "判定中…";
    try {
      const res = await fetch(cfg.checkAnswerEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: n, answer: text, userId })
      });
      if (!res.ok) throw new Error("check API unavailable");
      const data = await res.json();
      if (data.correct === true) {
        el.answerMessage.textContent = "正解です。";
        el.answerMessage.className = "answer-message correct";
      } else if (data.correct === false) {
        el.answerMessage.textContent = "回答は保存しました。もう一度考えてみてください。";
        el.answerMessage.className = "answer-message wrong";
      } else {
        el.answerMessage.textContent = "回答を保存しました。";
      }
    } catch {
      el.answerMessage.textContent = "回答は保存しました（判定サーバーには接続できませんでした）。";
    }
  }

  el.answerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentQuestion) return;
    saveAnswer(currentQuestion, el.answerInput.value);
  });

  el.clearAnswerButton.addEventListener("click", () => {
    if (!currentQuestion) return;
    delete answers[currentQuestion];
    persistAnswers();
    el.answerInput.value = "";
    el.answerMessage.textContent = "回答を削除しました。";
    updateSavedAt(currentQuestion);
    renderGrid();
  });

  function closeQuestionDialog() {
    if (el.dialog.open) el.dialog.close();
    currentQuestion = null;
    history.replaceState(null, "", location.pathname + location.search);
  }

  el.closeDialog.addEventListener("click", closeQuestionDialog);
  el.dialog.addEventListener("click", e => {
    if (e.target === el.dialog) closeQuestionDialog();
  });

  el.finalCard.addEventListener("click", () => {
    const unlocked = state.finalUnlocked && isDateReached(cfg.finalDate);
    if (!unlocked) return;
    if (cfg.finalFormUrl) {
      location.href = cfg.finalFormUrl;
      return;
    }
    alert("100問目の回答フォームURLを config.js の finalFormUrl に設定してください。");
  });

  el.helpButton.addEventListener("click", () => el.helpDialog.showModal());
  el.closeHelp.addEventListener("click", () => el.helpDialog.close());
  el.helpDialog.addEventListener("click", e => { if (e.target === el.helpDialog) el.helpDialog.close(); });

  async function init() {
    await loadServerState();
    renderGrid();
    const match = location.hash.match(/^#q(\d{1,3})$/);
    if (match) {
      const n = Number(match[1]);
      if (n >= 1 && n <= cfg.totalRegularQuestions) openQuestion(n);
    }
  }

  init();
})();
