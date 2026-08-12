# しっぽ写真館 — 静的サイト

kosho-design 準拠。HTML は `series.json` から生成する。

```
series.json       … コンテンツの原本（ここだけ編集する）
build.mjs         … series.json → HTML 生成スクリプト
style.css
gallery.js        … ライトボックス
_headers          … キャッシュ設定
images/           … 写真の置き場（Web書き出し後のもの）
uploads/          … 書き出し前の元データ（gitignore。ローカルにだけ残す）
index.html                … 生成物（トップ）
works/index.html          … 生成物（参加撮影会一覧）
works/<slug>/index.html   … 生成物（撮影会ギャラリー）
about/index.html          … 生成物（このサイトについて）
```

## 撮影会を追加する

1. 写真を `images/` に入れる（書き出し設定は下記「画像の書き出し」）
2. `series.json` の `series` 配列の **先頭** に1件足す（新しい順に並べる）

```json
{
  "slug": "aki-no-hikari",
  "title": "秋の光",
  "meta": "Studio — 2026.10.01",
  "note": "",
  "photos": [
    { "file": "aki-01.jpg", "alt": "縁側に座る女性", "focus": "center 10%", "w": 1667, "h": 2500 },
    { "file": "aki-02.jpg", "alt": "庭の落ち葉", "w": 2500, "h": 1667 }
  ]
}
```

3. `node build.mjs`

これでトップページの見出し・写真、`works/` の一覧、その撮影会のギャラリーページがまとめて更新される。**書いた写真だけが並ぶ**ので、予定の空枠は出ない。ギャラリーは写真それぞれの縦横比のまま段組みで並ぶ（縦横混在でも切られない）。

- 番号（01, 02 …）はページに並ぶ順（新しい順）に自動で振られる
- **`photos` の1枚目がトップページとサムネイルに使われる。** 別の写真を表紙にしたいときは、その写真を配列の先頭へ移動する
- `w` / `h` に書き出し後のピクセルサイズを入れると、読み込み前のレイアウトずれが出ない
- `focus` は表紙写真をフルブリードで切るときの表示位置（省略可）。値を小さくすると上が写る。頭の飾りが切れるときは `center 6%` 前後まで下げる
- `note` は空文字にすると本文ブロックごと出ない
- トップに出るのは最新2件。3件目以降は「More events」に4件、6件を超えると「All events」リンクが出る
- 50件でも生成物は静的HTMLなので表示速度は変わらない

## About ページを直す

`series.json` の `about` を編集して `node build.mjs`。

- `sections[]` … `heading` と `body`（段落の配列）
- `sections[].rules` … 引用ブロック（アクセント色の囲み）。`heading` / `body` / `items`
- `items` は自動で `(1)(2)(3)…` と振られる

引用ブロックだけはゴシック体・太字見出しで組んである（Photopa! の原文の見た目に合わせるため）。ページ本文は游明朝。

## 画像の書き出し

- 長辺 **2000px** / JPEG **品質90** / sRGB
- 元データは `uploads/` に残す（gitignore 済み。リポジトリには入らない）
- ライトボックスの表示上限は約1100px幅なので、2000pxあれば Retina でも足りる

```bash
sips -Z 2000 -s format jpeg -s formatOptions 90 元ファイル.JPG --out images/名前.jpg
```

## 公開

Cloudflare の Workers & Pages で Git 連携。ビルド設定は Framework preset **None** /
Build command **空欄**（生成物をコミットする運用のため）/ 出力ディレクトリ **/**。

push すると自動でデプロイされる。公開URLは
<https://tail-s-photogarary.shippo-photo.workers.dev>

`_headers` はそのまま効いている（画像は1年 immutable、`X-Content-Type-Options: nosniff`）。

独自ドメインを繋いだときは、`series.json` の `origin` を新URLに書き換えて
`node build.mjs` → commit → push（canonical と og:image に使われるため）。

## 公開前にやること

- `series.json` の `origin` を実URLに置換（canonical と og:image に使われる）
- 画像を上記の設定で書き出し直す（元のカメラ出力のままだと1枚3MB前後になる）
- `/contact/` は未作成。ナビからは外してある

## デザイン規約（抜粋）

- 色：`#ffffff` / アクセント `#dff5ff` / 暗部 `#111111`
- 書体：見出し・本文 游明朝、ラベル Avenir Next（About の引用ブロックのみゴシック）
- 余白：`0.5 / 1 / 2 / 4 / 8rem` のみ（`--s1`〜`--s5`）
- 中間サイズの文字は使わない。影・太ウェイトは使わない（同じく引用ブロックのみ例外）
