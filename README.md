# しっぽ写真館 — 静的サイト

kosho-design 準拠。HTML は `series.json` から生成する。

```
site/
  series.json       … コンテンツの原本（ここだけ編集する）
  build.mjs         … series.json → HTML 生成スクリプト
  style.css
  gallery.js        … ライトボックス
  _headers          … キャッシュ設定
  images/           … 写真の置き場
  index.html        … 生成物
  works/index.html  … 生成物（シリーズ一覧）
  works/<slug>/index.html … 生成物（撮影会ギャラリー）
```

## 撮影会を追加する

1. 写真を `site/images/` に入れる
2. `series.json` の `series` 配列の **先頭** に1件足す（新しい順に並べる）

```json
{
  "slug": "aki-no-hikari",
  "title": "秋の光",
  "meta": "Nara — 2026",
  "note": "その日についての短い覚え書き。",
  "photos": [
    { "file": "aki-01.jpg", "alt": "縁側に座る女性" },
    { "file": "aki-02.jpg", "alt": "庭の落ち葉", "focus": "center 30%" }
  ]
}
```

3. `cd site && node build.mjs`

これでトップページの見出し・写真・More series、`works/` の一覧、その撮影会のギャラリーページがまとめて更新される。**書いた写真だけが並ぶ**ので、予定の空枠は出ない。ギャラリーは写真それぞれの縦横比のまま段組みで並ぶ（縦横混在でも切られない）。

- 番号（01, 02 …）はページに並ぶ順（新しい順）に自動で振られる
- `w` / `h` に書き出し後のピクセルサイズを入れると、読み込み前のレイアウトずれが出ない
- `focus` は縦位置写真をフルブリードで切るときの表示位置（省略可）
- トップに出るのは最新2件＋タイトル4件。6件を超えると「All series」リンクが出る
- 50件でも生成物は静的HTMLなので表示速度は変わらない

## Cloudflare Pages への公開

1. `site/` の中身をリポジトリに push
2. Workers & Pages → Create → Pages → Connect to Git
3. ビルド設定
   - Framework preset: **None**
   - Build command: **`node build.mjs`**（生成物をコミットする運用なら空欄でも可）
   - Build output directory: **/**（`site/` をサブフォルダに置いた場合は `site`）
4. Deploy → `xxx.pages.dev`
5. Custom domains でドメイン接続

## 公開前にやること

- `series.json` の `origin` を実ドメインに置換（canonical と og:image に使われる）
- 画像は長辺 2000px / JPEG 品質 80 に書き出す（既存2枚は済み。元データは `uploads/` に残っている）
- 仮テキスト（`note`）の差し替え
- `/about/` `/contact/` は未作成。作るか、ナビから外す

## デザイン規約（抜粋）

- 色：`#ffffff` / アクセント `#dff5ff` / 暗部 `#111111`
- 書体：見出し・本文 游明朝、ラベル Avenir Next
- 余白：`0.5 / 1 / 2 / 4 / 8rem` のみ（`--s1`〜`--s5`）
- 中間サイズの文字は使わない。影・太ウェイトは使わない
