// export.mjs — uploads/ のマスターから Web 用 JPEG を images/ に書き出す（Mac・Windows 共通）。
//
//   node tools/export.mjs uploads/Shiori20260913-*.JPG
//
// ・拡大表示用：長辺 MAX px / 品質 QUALITY を images/ に
// ・一覧表示用：長辺 THUMB px / 品質 THUMB_QUALITY を images/thumb/ に
// ・最後に series.json に貼る photos の雛形を出す（alt だけ埋めれば済む）
// ・設定は環境変数で上書きできる（MAX / QUALITY / THUMB / THUMB_QUALITY / OUT）
//
// ※ Windows の PowerShell は * を展開しないので、このスクリプト側で展開する。

import sharp from "./node_modules/sharp/lib/index.js";
import { mkdir, stat, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const env = (k, d) => Number(process.env[k] ?? d);
const MAX = env("MAX", 2560);
const QUALITY = env("QUALITY", 90);
const THUMB = env("THUMB", 960);
const THUMB_QUALITY = env("THUMB_QUALITY", 80);
const OUT = process.env.OUT ?? "images";

// * を含む指定をファイル一覧に展開する（シェルが展開済みならそのまま通る）
async function expand(arg) {
  if (!arg.includes("*")) return [arg];
  const dir = dirname(arg);
  const re = new RegExp(
    "^" + basename(arg).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$"
  );
  return (await readdir(dir)).filter((f) => re.test(f)).sort().map((f) => join(dir, f));
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("使い方: node tools/export.mjs <元ファイル...>");
  console.error("  例:   node tools/export.mjs uploads/Shiori20260913-*.JPG");
  console.error(`  設定: MAX=${MAX} QUALITY=${QUALITY} THUMB=${THUMB} THUMB_QUALITY=${THUMB_QUALITY} 出力先=${OUT}`);
  process.exit(1);
}

const files = (await Promise.all(args.map(expand))).flat();
if (files.length === 0) {
  console.error("該当するファイルがありません");
  process.exit(1);
}

await mkdir(join(OUT, "thumb"), { recursive: true });

const mb = (n) => (n / 1e6).toFixed(2) + "MB";
const rows = [];
let totalIn = 0, totalOut = 0, totalThumb = 0;

console.log(["ファイル".padEnd(32), "元".padEnd(13), "書き出し".padEnd(13), "サイズ（拡大用 + 一覧用）"].join(" "));
console.log("-".repeat(76));

for (const src of files) {
  const base = basename(src);
  const dst = join(OUT, base);
  const thumbDst = join(OUT, "thumb", base);

  // 向きの情報（EXIF）を画素に反映してから大きさを測る
  const meta = await sharp(src).rotate().toBuffer({ resolveWithObject: true }).then((r) => r.info);
  const long = Math.max(meta.width, meta.height);

  // 長辺が上限を超えるときだけ縮小する（拡大はしない）。ICC プロファイルは残す
  const make = (limit, quality, out) =>
    sharp(src)
      .rotate()
      .resize({ width: limit, height: limit, fit: "inside", withoutEnlargement: true })
      .keepIccProfile()
      .jpeg({ quality, chromaSubsampling: "4:4:4" })
      .toFile(out);

  const info = await make(MAX, QUALITY, dst);
  await make(THUMB, THUMB_QUALITY, thumbDst);

  const inB = (await stat(src)).size;
  const outB = (await stat(dst)).size;
  const thB = (await stat(thumbDst)).size;
  totalIn += inB; totalOut += outB; totalThumb += thB;

  console.log(
    [
      base.padEnd(32),
      `${meta.width}x${meta.height}`.padEnd(13),
      `${info.width}x${info.height}`.padEnd(13),
      `${mb(inB)} → ${mb(outB)} + ${Math.round(thB / 1000)}KB`,
    ].join(" ")
  );
  rows.push({ base, w: info.width, h: info.height });
}

console.log("-".repeat(76));
console.log(
  `${files.length}枚を書き出しました  元 ${(totalIn / 1e6).toFixed(1)}MB → ` +
    `拡大用 ${(totalOut / 1e6).toFixed(1)}MB（${OUT}/）+ 一覧用 ${(totalThumb / 1e6).toFixed(1)}MB（${OUT}/thumb/）`
);

const json = rows
  .map((r) => `        {\n          "file": "${r.base}",\n          "alt": "",\n          "w": ${r.w},\n          "h": ${r.h}\n        }`)
  .join(",\n");

console.log(`
--- series.json の "photos" に貼り付ける雛形（alt を埋めてください）---
      "photos": [
${json}
      ]

表紙にしたい写真は、この配列の先頭へ移動してください。
フルブリードで頭の飾りが切れる場合は、その写真に "focus": "center 8%" を足します。`);
