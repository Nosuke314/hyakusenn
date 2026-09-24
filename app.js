(() => {
  const cfg = window.HYAKUSEN_CONFIG;
  const STORAGE_KEY = "hyakusen.answers.v1";

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
    finalDialog: document.getElementById("finalDialog"),
    closeFinalDialog: document.getElementById("closeFinalDialog"),
    finalQuestionImage: document.getElementById("finalQuestionImage"),
    finalImageLocked: document.getElementById("finalImageLocked"),
    finalImageDateText: document.getElementById("finalImageDateText"),
    finalFormButton: document.getElementById("finalFormButton"),
    finalFormNote: document.getElementById("finalFormNote"),
    helpButton: document.getElementById("helpButton"),
    helpDialog: document.getElementById("helpDialog"),
    closeHelp: document.getElementById("closeHelp")
  };

  let currentQuestion = null;
  const answers = loadAnswers();
  const nowJstDate = jstDateString(new Date());

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

  function isDateReached(dateString) {
    return nowJstDate >= dateString;
  }

  function unlockedRegularCount() {
    const start = dateAtJstMidnight(cfg.startDate);
    const today = dateAtJstMidnight(nowJstDate);
    const diff = Math.floor((today - start) / 86400000) + 1;
    return Math.max(0, Math.min(cfg.totalRegularQuestions, diff));
  }

  function renderGrid() {
    const openCount = unlockedRegularCount();
    el.grid.innerHTML = "";

    for (let n = 1; n <= cfg.totalRegularQuestions; n++) {
      const releaseDate = releaseDateFor(n);
      const unlocked = n <= openCount && isDateReached(releaseDate);
      const answered = Boolean(answers[n]?.text?.trim());
      const isToday = nowJstDate === releaseDate;

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

    updateProgress(openCount);
    updateFinalCard();
  }

  function updateProgress(openCount) {
    const answeredCount = Object.entries(answers)
      .filter(([k, v]) => Number(k) <= cfg.totalRegularQuestions && v?.text?.trim()).length;

    el.progressText.textContent = `${answeredCount} / ${cfg.totalRegularQuestions}`;
    el.progressBar.style.width = `${(answeredCount / cfg.totalRegularQuestions) * 100}%`;
    el.unlockCount.textContent = `${openCount} OPEN`;
    el.todayText.textContent = `${nowJstDate.replaceAll("-", ".")} JST`;
  }

  function updateFinalCard() {
    const imageOpen = isDateReached(cfg.finalImageDate);
    el.finalCard.classList.remove("locked");
    el.finalStatus.textContent = imageOpen ? "QUESTION OPEN" : `PAGE OPEN • IMAGE ${formatMd(cfg.finalImageDate)}`;
  }

  function openQuestion(n) {
    currentQuestion = n;
    const releaseDate = releaseDateFor(n);
    const unlocked = n <= unlockedRegularCount() && isDateReached(releaseDate);

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

  function saveAnswer(n, text) {
    answers[n] = { text, savedAt: new Date().toISOString() };
    persistAnswers();
    updateSavedAt(n);
    renderGrid();
    el.answerMessage.textContent = text.trim()
      ? "回答をこの端末に保存しました。"
      : "回答を空欄で保存しました。";
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

  function openFinal() {
    const imageOpen = isDateReached(cfg.finalImageDate);

    el.finalQuestionImage.hidden = true;
    el.finalImageLocked.hidden = true;

    if (imageOpen) {
      el.finalQuestionImage.hidden = false;
      el.finalQuestionImage.src = `questions/q100.${cfg.questionImageExtension}?v=100`;
      el.finalQuestionImage.onerror = () => {
        el.finalQuestionImage.hidden = true;
        el.finalImageLocked.hidden = false;
        el.finalImageDateText.textContent = "第100問の画像ファイルがまだ配置されていません。";
      };
    } else {
      el.finalImageLocked.hidden = false;
      el.finalImageDateText.textContent = `${formatJapaneseDate(cfg.finalImageDate)} に第100問の画像を公開します。`;
    }

    if (cfg.finalFormUrl) {
      el.finalFormButton.href = cfg.finalFormUrl;
      el.finalFormButton.classList.remove("disabled");
      el.finalFormButton.setAttribute("aria-disabled", "false");
      el.finalFormNote.textContent = "最終解答は外部フォームで受け付けます。";
    } else {
      el.finalFormButton.removeAttribute("href");
      el.finalFormButton.classList.add("disabled");
      el.finalFormButton.setAttribute("aria-disabled", "true");
      el.finalFormNote.textContent = "config.js の finalFormUrl に回答フォームURLを設定してください。";
    }

    if (!el.finalDialog.open) el.finalDialog.showModal();
    history.replaceState(null, "", "#q100");
  }

  function closeFinal() {
    if (el.finalDialog.open) el.finalDialog.close();
    history.replaceState(null, "", location.pathname + location.search);
  }

  el.finalCard.addEventListener("click", openFinal);
  el.closeFinalDialog.addEventListener("click", closeFinal);
  el.finalDialog.addEventListener("click", e => {
    if (e.target === el.finalDialog) closeFinal();
  });
  el.finalFormButton.addEventListener("click", e => {
    if (!cfg.finalFormUrl) e.preventDefault();
  });

  el.helpButton.addEventListener("click", () => el.helpDialog.showModal());
  el.closeHelp.addEventListener("click", () => el.helpDialog.close());
  el.helpDialog.addEventListener("click", e => { if (e.target === el.helpDialog) el.helpDialog.close(); });

  function init() {
    renderGrid();
    const match = location.hash.match(/^#q(\d{1,3})$/);
    if (!match) return;

    const n = Number(match[1]);
    if (n >= 1 && n <= cfg.totalRegularQuestions) openQuestion(n);
    if (n === 100) openFinal();
  }

  init();
})();
