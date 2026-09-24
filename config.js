/*
  百戦 - GitHub Pages用設定
  ----------------------------------------------------
  1問目: 2026-09-24
  98問目: 2026-12-30
  99問目: 2026-12-31
  100問目のページ: 初日からアクセス可能
  100問目の問題画像: 2026-12-31 に公開

  問題画像:
    questions/q001.png ～ questions/q099.png
    questions/q100.png

  未来の問題画像をGitHubに先に置くとURLから見られる可能性があるため、
  公開日ごとに追加する運用を推奨します。
*/

window.HYAKUSEN_CONFIG = {
  title: "百戦",
  startDate: "2026-09-24",       // JST基準
  totalRegularQuestions: 99,
  finalImageDate: "2026-12-31", // 100問目の画像公開日
  questionImageExtension: "jpg",

  // 100問目の外部回答フォームURL。
  // 例: "https://forms.gle/xxxxxxxxxxxxxxxxx"
  finalFormUrl: "",

  // GitHub Pagesでは端末時刻を使って公開判定します。
  allowDeviceTimeFallback: true
};
