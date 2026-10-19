#!/usr/bin/env node
// site/build.mjs — series.json から HTML を生成する。実行: node build.mjs
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));

const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function head(o) {
  return '<!DOCTYPE html>\n<html lang="ja">\n<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<title>' + esc(o.title) + '</title>\n' +
'<meta name="description" content="' + esc(o.desc) + '">\n' +
'<link rel="canonical" href="' + o.canonical + '">\n' +
'<meta property="og:type" content="' + (o.ogType || 'website') + '">\n' +
'<meta property="og:title" content="' + esc(o.title) + '">\n' +
'<meta property="og:description" content="' + esc(o.desc) + '">\n' +
(o.ogImage ? '<meta property="og:image" content="' + o.ogImage + '">\n' : '') +
'<meta name="twitter:card" content="summary_large_image">\n' +
'<link rel="stylesheet" href="' + o.up + 'style.css">\n' +
'</head>\n<body>\n';
}

function nav(site, up, here) {
  return '\n<header class="nav">\n' +
'  <a class="nav__mark" href="' + up + 'index.html">' + esc(site.name) + '</a>\n' +
'  <nav class="nav__menu">\n' +
'    <a href="' + (here === 'works' ? './' : up + 'works/') + '">Works</a>\n' +
'    <a href="' + up + 'about/">About</a>\n' +
'  </nav>\n</header>\n';
}

function footer(site, up) {
  return '\n<footer class="footer">\n  <div class="wrap footer__inner">\n' +
'    <div class="footer__mark">' + esc(site.name) + '</div>\n' +
'    <nav class="footer__menu">\n' +
'      <a href="' + up + 'index.html">Top</a>\n' +
'      <a href="' + up + 'works/">Works</a>\n' +
'      <a href="' + up + 'about/">About</a>\n' +
'    </nav>\n' +
'    <div class="footer__copy">\u00a9 2026 shippo</div>\n' +
'  </div>\n</footer>\n\n</body>\n</html>\n';
}

function numbered(series) {
  return series.map((s, i) => Object.assign({}, s, { no: pad(i + 1) }));
}

function dims(p) {
  return (p.w && p.h) ? ' width="' + p.w + '" height="' + p.h + '"' : '';
}

// 一覧（格子・小カード）は images/thumb/ の縮小版を読む。
// フルブリードの大きな写真とライトボックスだけが images/ の原寸を読む。
function thumb(up, p) {
  return up + 'images/thumb/' + p.file;
}
function full(up, p) {
  return up + 'images/' + p.file;
}

function thumbStyle(p) {
  return p.focus ? ' style="object-position:' + p.focus + '"' : '';
}

function figure(s, p, href, eager) {
  const style = p.focus ? ' style="object-position:' + p.focus + '"' : '';
  return '  <a class="figure-link" href="' + href + '">\n' +
'    <img class="figure" src="images/' + p.file + '" alt="' + esc(p.alt) + '"' + dims(p) + style +
' loading="' + (eager ? 'eager' : 'lazy') + '" decoding="async">\n  </a>\n';
}

function renderTop(data) {
  const site = data.site;
  const list = numbered(data.series);
  const lead = list[0];
  const second = list[1];
  let h = head({
    title: site.name, desc: site.description,
    canonical: site.origin + '/', up: '',
    ogImage: lead && lead.photos[0] ? site.origin + '/images/' + lead.photos[0].file : ''
  });
  h += nav(site, '', 'top');
  h += '\n<main>\n';
  if (lead && lead.photos[0]) {
    const p = lead.photos[0];
    const style = p.focus ? ' style="object-position:' + p.focus + '"' : '';
    h += '  <a class="figure-link hero" href="works/' + lead.slug + '/">\n' +
'    <img class="figure" src="images/' + p.file + '" alt="' + esc(p.alt) + '"' + dims(p) + style +
' loading="eager" decoding="async">\n' +
'    <div class="hero__overlay">\n' +
'      <span class="num hero__num">' + lead.no + '</span>\n' +
'      <h1 class="title hero__title">' + esc(lead.title) + '</h1>\n' +
'      <p class="label hero__label">' + esc(lead.meta) + '</p>\n' +
'    </div>\n  </a>\n\n';
    if (lead.note) {
      h += '\n  <div class="wrap caption">\n    <span class="num"></span>\n' +
'    <p class="body">' + esc(lead.note) + '</p>\n  </div>\n\n';
    }
  }
  if (second && second.photos[0]) {
    const p = second.photos[0];
    const style = p.focus ? ' style="object-position:' + p.focus + '"' : '';
    h += '\n  <div class="gap"></div>\n\n' +
'  <a class="figure-link hero" href="works/' + second.slug + '/">\n' +
'    <img class="figure" src="images/' + p.file + '" alt="' + esc(p.alt) + '"' + dims(p) + style +
' loading="lazy" decoding="async">\n' +
'    <div class="hero__overlay">\n' +
'      <span class="num hero__num">' + second.no + '</span>\n' +
'      <h2 class="title hero__title">' + esc(second.title) + '</h2>\n' +
'      <p class="label hero__label">' + esc(second.meta) + '</p>\n' +
'    </div>\n  </a>\n';
  }
  const rest = list.slice(second ? 2 : 1, (second ? 2 : 1) + 4);
  if (rest.length) {
    h += '\n  <section class="wrap more">\n    <p class="label">More events</p>\n    <div class="more__grid">\n';
    for (const s of rest) {
      const p = s.photos[0];
      if (!p) continue;
      const style = p.focus ? ' style="object-position:' + p.focus + '"' : '';
      h += '      <a class="figure-link hero hero--small" href="works/' + s.slug + '/">\n' +
'        <img class="figure" src="' + thumb('', p) + '" alt="' + esc(p.alt) + '"' + dims(p) + style +
' loading="lazy" decoding="async">\n' +
'        <div class="hero__overlay">\n' +
'          <span class="num hero__num">' + s.no + '</span>\n' +
'          <h2 class="title hero__title hero__title--small">' + esc(s.title) + '</h2>\n' +
'          <p class="label hero__label">' + esc(s.meta) + '</p>\n' +
'        </div>\n      </a>\n';
    }
    h += '    </div>\n';
    if (list.length > (second ? 6 : 5)) h += '    <a class="viewlink" href="works/">All events</a>\n';
    h += '  </section>\n';
  }
  h += '</main>\n';
  return h + footer(site, '');
}

function renderWorksIndex(data) {
  const site = data.site;
  const list = numbered(data.series);
  let h = head({
    title: 'Works \u2014 ' + site.name,
    desc: site.name + '\u306e\u53c2\u52a0\u64ae\u5f71\u4f1a\u4e00\u89a7\u3002',
    canonical: site.origin + '/works/', up: '../'
  });
  h += nav(site, '../', 'works');
  h += '\n<main>\n  <section class="wrap lead">\n    <p class="label">Works</p>\n' +
'    <h1 class="title">\u53c2\u52a0\u64ae\u5f71\u4f1a\u4e00\u89a7</h1>\n  </section>\n\n  <div class="wrap gallery">\n';
  for (const s of list) {
    const p = s.photos[0];
    if (!p) continue;
    h += '    <a class="gallery__item gallery__item--card" href="' + s.slug + '/">\n' +
'      <img src="' + thumb('../', p) + '" alt="' + esc(p.alt) + '"' + dims(p) + ' loading="lazy" decoding="async">\n' +
'      <div class="hero__overlay">\n' +
'        <span class="num hero__num">' + s.no + '</span>\n' +
'        <h2 class="title hero__title hero__title--small">' + esc(s.title) + '</h2>\n' +
'        <p class="label hero__label">' + esc(s.meta) + '</p>\n' +
'      </div>\n' +
'    </a>\n';
  }
  h += '  </div>\n</main>\n';
  return h + footer(site, '../');
}

function renderAbout(data) {
  const site = data.site;
  const a = data.about;
  let h = head({
    title: 'About — ' + site.name,
    desc: a.desc || site.description,
    canonical: site.origin + '/about/', up: '../'
  });
  h += nav(site, '../', 'about');
  h += '\n<main>\n  <section class="wrap lead">\n    <p class="label">About</p>\n' +
'    <h1 class="title">' + esc(a.title) + '</h1>\n  </section>\n\n  <section class="wrap prose">\n';
  for (const s of a.sections || []) {
    h += '    <div class="prose__item">\n';
    if (s.heading) h += '      <h2 class="h2">' + esc(s.heading) + '</h2>\n';
    for (const p of s.body || []) h += '      <p class="body">' + esc(p) + '</p>\n';
    if (s.rules) {
      h += '      <div class="rules">\n';
      if (s.rules.heading) h += '        <p class="rules__title">' + esc(s.rules.heading) + '</p>\n';
      for (const p of s.rules.body || []) h += '        <p class="rules__body">' + esc(p) + '</p>\n';
      if ((s.rules.items || []).length) {
        h += '        <ol class="rules__list">\n';
        for (const it of s.rules.items) h += '          <li>' + esc(it) + '</li>\n';
        h += '        </ol>\n';
      }
      h += '      </div>\n';
    }
    h += '    </div>\n';
  }
  h += '  </section>\n</main>\n';
  return h + footer(site, '../');
}

function renderSeries(data, s) {
  const site = data.site;
  let h = head({
    title: s.title + ' \u2014 ' + site.name,
    desc: s.note || site.description,
    canonical: site.origin + '/works/' + s.slug + '/',
    up: '../../', ogType: 'article',
    ogImage: s.photos[0] ? site.origin + '/images/' + s.photos[0].file : ''
  });
  h += nav(site, '../../', 'series');
  h += '\n<main>\n  <section class="wrap lead entry">\n    <span class="num">' + s.no + '</span>\n' +
'    <div class="entry__body">\n      <h1 class="title">' + esc(s.title) + '</h1>\n' +
'      <p class="label">' + esc(s.meta) + '</p>\n' +
(s.note ? '      <p class="body">' + esc(s.note) + '</p>\n' : '') +
'    </div>\n  </section>\n\n' +
'  <div class="wrap gallery-hint">\n' +
'    <p class="label">タップ・クリックで大きく表示されます</p>\n' +
'  </div>\n\n  <div class="wrap gallery">\n';
  s.photos.forEach((p, i) => {
    h += '    <a class="gallery__item" href="' + full('../../', p) + '"' +
' data-lightbox="' + full('../../', p) + '" data-alt="' + esc(p.alt) + '">\n' +
'      <img src="' + thumb('../../', p) + '" alt="' + esc(p.alt) + '"' + dims(p) + ' loading="' + (i === 0 ? 'eager' : 'lazy') + '" decoding="async">\n' +
'    </a>\n';
  });
  h += '  </div>\n\n  <div class="wrap back">\n    <a class="viewlink" href="../">All events</a>\n  </div>\n</main>\n';
  return h + footer(site, '../../').replace('</body>', '<script src="../../gallery.js"></script>\n</body>');
}

async function put(rel, html) {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, html, 'utf8');
  console.log('wrote', rel);
}

// "hidden": true のシリーズは非公開にする。
//  ・ページを生成しない（既に生成済みのページがあれば消す）
//  ・トップ／一覧／番号／og:image にも出さない
//  ・画像は .assetsignore の自動管理ブロックに書き出し、配信対象から外す
//    （これをしないとページが無くても画像のURLを直接叩けば見えてしまう）
// series.json のデータと images/ の実ファイルは残るので、hidden を外して再ビルドすれば再公開できる。
const all = JSON.parse(await readFile(join(root, 'series.json'), 'utf8'));
const hidden = all.series.filter((s) => s.hidden);
const data = Object.assign({}, all, { series: all.series.filter((s) => !s.hidden) });

await put('index.html', renderTop(data));
await put('works/index.html', renderWorksIndex(data));
if (data.about) await put('about/index.html', renderAbout(data));
for (const s of numbered(data.series)) {
  await put(join('works', s.slug, 'index.html'), renderSeries(data, s));
}

for (const s of hidden) {
  await rm(join(root, 'works', s.slug), { recursive: true, force: true });
  console.log('hidden ', s.slug, '(' + s.photos.length + '枚)');
}

// 非表示シリーズの画像を .assetsignore に反映する。
// 公開中のシリーズが同じ画像を使っている場合は除外しない。
const BEGIN = '# >>> build.mjs 自動管理：非表示シリーズの画像（手で編集しない）';
const END = '# <<< 自動管理ここまで';
const visibleFiles = new Set(data.series.flatMap((s) => s.photos.map((p) => p.file)));
const ignored = [...new Set(hidden.flatMap((s) => s.photos.map((p) => p.file)))]
  .filter((f) => !visibleFiles.has(f))
  .sort()
  .flatMap((f) => ['/images/' + f, '/images/thumb/' + f]);
const ignPath = join(root, '.assetsignore');
let ign = await readFile(ignPath, 'utf8');
const block = ignored.length ? BEGIN + '\n' + ignored.join('\n') + '\n' + END + '\n' : '';
const re = new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\n?');
ign = re.test(ign) ? ign.replace(re, block) : (block ? ign.replace(/\n*$/, '\n\n') + block : ign);
await writeFile(ignPath, ign, 'utf8');
console.log('.assetsignore: 非表示の画像', ignored.length, 'ファイルを配信対象から除外');
