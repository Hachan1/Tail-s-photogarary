#!/bin/bash
# export.sh — uploads/ のマスターから Web 用 JPEG を images/ に書き出す。
#
#   ./export.sh uploads/shiori20260913-*.JPG
#
# ・拡大表示用：長辺 MAX px / 品質 QUALITY を images/ に
# ・一覧表示用：長辺 THUMB px / 品質 THUMB_QUALITY を images/thumb/ に
#   （格子や小カードは原寸だと8倍以上過剰。一覧はサムネ、拡大時だけ原寸を読む）
# ・最後に series.json に貼る photos の雛形を出す（alt だけ埋めれば済む）

set -euo pipefail

MAX=${MAX:-2560}
QUALITY=${QUALITY:-90}
THUMB=${THUMB:-960}
THUMB_QUALITY=${THUMB_QUALITY:-80}
OUT=${OUT:-images}

if [ $# -eq 0 ]; then
  echo "使い方: ./export.sh <元ファイル...>" >&2
  echo "  例:   ./export.sh uploads/shiori20260913-*.JPG" >&2
  echo "  設定: MAX=$MAX QUALITY=$QUALITY THUMB=$THUMB THUMB_QUALITY=$THUMB_QUALITY 出力先=$OUT" >&2
  exit 1
fi

mkdir -p "$OUT" "$OUT/thumb"

json=""
total_in=0
total_out=0
total_thumb=0
count=0

printf "%-32s %-13s %-13s %s\n" "ファイル" "元" "書き出し" "サイズ（拡大用 + 一覧用）"
printf -- "----------------------------------------------------------------------------\n"

for src in "$@"; do
  if [ ! -f "$src" ]; then
    echo "見つかりません: $src" >&2
    exit 1
  fi

  base=$(basename "$src")
  dst="$OUT/$base"

  read -r w h < <(sips -g pixelWidth -g pixelHeight "$src" 2>/dev/null \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  if [ -z "${w:-}" ] || [ -z "${h:-}" ]; then
    echo "サイズを読めません: $src" >&2
    exit 1
  fi

  # 長辺が MAX を超えるときだけ縮小する（拡大はしない）
  long=$w
  [ "$h" -gt "$w" ] && long=$h

  if [ "$long" -gt "$MAX" ]; then
    sips -Z "$MAX" -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$dst" >/dev/null
  else
    sips -s format jpeg -s formatOptions "$QUALITY" "$src" --out "$dst" >/dev/null
  fi

  read -r nw nh < <(sips -g pixelWidth -g pixelHeight "$dst" 2>/dev/null \
    | awk '/pixelWidth/{w=$2} /pixelHeight/{h=$2} END{print w, h}')

  # 一覧用サムネイル（拡大表示は原寸を読むので画質は落ちない）
  if [ "$long" -gt "$THUMB" ]; then
    sips -Z "$THUMB" -s format jpeg -s formatOptions "$THUMB_QUALITY" "$src" --out "$OUT/thumb/$base" >/dev/null
  else
    sips -s format jpeg -s formatOptions "$THUMB_QUALITY" "$src" --out "$OUT/thumb/$base" >/dev/null
  fi

  in_b=$(stat -f%z "$src")
  out_b=$(stat -f%z "$dst")
  th_b=$(stat -f%z "$OUT/thumb/$base")
  total_in=$((total_in + in_b))
  total_out=$((total_out + out_b))
  total_thumb=$((total_thumb + th_b))
  count=$((count + 1))

  printf "%-32s %-13s %-13s %s → %s + %s\n" "$base" "${w}x${h}" "${nw}x${nh}" \
    "$(echo "$in_b" | awk '{printf "%.2fMB", $1/1000000}')" \
    "$(echo "$out_b" | awk '{printf "%.2fMB", $1/1000000}')" \
    "$(echo "$th_b" | awk '{printf "%.0fKB", $1/1000}')"

  json="$json        {
          \"file\": \"$base\",
          \"alt\": \"\",
          \"w\": $nw,
          \"h\": $nh
        },
"
done

printf -- "----------------------------------------------------------------------------\n"
printf "%d枚を書き出しました  元 %s → 拡大用 %s（%s/）+ 一覧用 %s（%s/thumb/）\n" "$count" \
  "$(echo "$total_in" | awk '{printf "%.1fMB", $1/1000000}')" \
  "$(echo "$total_out" | awk '{printf "%.1fMB", $1/1000000}')" "$OUT" \
  "$(echo "$total_thumb" | awk '{printf "%.1fMB", $1/1000000}')" "$OUT"

cat <<EOS

--- series.json の "photos" に貼り付ける雛形（alt を埋めてください）---
      "photos": [
${json%,
}
      ]

表紙にしたい写真は、この配列の先頭へ移動してください。
フルブリードで頭の飾りが切れる場合は、その写真に "focus": "center 8%" を足します。
EOS
