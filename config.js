/*
  百戦 - 設定ファイル
  ----------------------------------------------------
  1問目: 2026-09-23
  99問目: 2026-12-30
  100問目: 2026-12-31

  問題画像は questions/q001.png 〜 questions/q099.png を推奨。
  jpg/webpを使う場合は QUESTION_IMAGE_EXTENSION を変更してください。
*/

window.HYAKUSEN_CONFIG = {
  title: "百戦",
  startDate: "2026-09-23",       // JST基準
  totalRegularQuestions: 99,
  finalDate: "2026-12-31",
  questionImageExtension: "png",

  // 100問目を外部フォームにする場合、そのURLを入れる。
  // 空欄のままなら、100番を押したとき案内だけ表示します。
  finalFormUrl: "",

  // "remote" = Netlify Functionで正誤判定（推奨）
  // "save-only" = 回答を端末に保存するだけ
  answerMode: "save-only",

  // Netlify Functionsを利用する場合のAPI。
  checkAnswerEndpoint: "/.netlify/functions/check-answer",
  serverStateEndpoint: "/.netlify/functions/state",

  // リモート時刻取得に失敗したとき、端末時刻で開放判定するか。
  allowDeviceTimeFallback: true
};
