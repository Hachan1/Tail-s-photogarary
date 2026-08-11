#!/usr/bin/env node
// site/build.mjs — series.json から HTML を生成する。実行: node build.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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
'    <a href="' + up + 'contact/">Contact</a>\n' +
'  </nav>\n</header>\n';
}

function footer(site, up) {
  return '\n<footer class="footer">\n  <div class="wrap footer__inner">\n' +
'    <div class="footer__mark">' + esc(site.name) + '</div>\n' +
'    <nav class="footer__menu">\n' +
'      <a href="' + up + 'index.html">Top</a>\n' +
'      <a href="' + up + 'works/">Works</a>\n' +
'      <a href="' + up + 'about/">About</a>\n' +
'      <a href="' + up + 'contact/">Contact</a>\n' +
'      <a href="#">Instagram</a>\n' +
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
  if (lead) {
    h += '  <section class="wrap lead entry">\n' +
'    <span class="num">' + lead.no + '</span>\n' +
'    <div class="entry__body">\n' +
'      <h1 class="title">' + esc(lead.title) + '</h1>\n' +
'      <p class="label">' + esc(lead.meta) + '</p>\n' +
'      <a class="viewlink" href="works/' + lead.slug + '/">View gallery</a>\n' +
'    </div>\n  </section>\n\n';
    if (lead.photos[0]) h += figure(lead, lead.photos[0], 'works/' + lead.slug + '/', true);
    if (lead.note) {
      h += '\n  <div class="wrap caption">\n    <span class="num"></span>\n' +
'    <p class="body">' + esc(lead.note) + '</p>\n  </div>\n\n';
    }
  }
  if (second && second.photos[0]) {
    h += figure(second, second.photos[0], 'works/' + second.slug + '/', false);
    h += '\n  <div class="wrap caption">\n    <span class="num">' + second.no + '</span>\n' +
'    <div class="caption__body">\n' +
'      <a class="h2" href="works/' + second.slug + '/">' + esc(second.title) + '</a>\n' +
'      <p class="label">' + esc(second.meta) + '</p>\n' +
'    </div>\n  </div>\n';
  }
  const rest = list.slice(second ? 2 : 1, (second ? 2 : 1) + 4);
  if (rest.length) {
    h += '\n  <section class="wrap index">\n    <p class="label">More series</p>\n    <div class="index__list">\n';
    for (const s of rest) {
      h += '      <span class="num">' + s.no + '</span>\n' +
'      <a class="h2" href="works/' + s.slug + '/">' + esc(s.title) + '</a>\n';
    }
    h += '    </div>\n';
    if (list.length > (second ? 6 : 5)) h += '    <a class="viewlink" href="works/">All series</a>\n';
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
    desc: site.name + '\u306e\u64ae\u5f71\u4f1a\u30b7\u30ea\u30fc\u30ba\u4e00\u89a7\u3002',
    canonical: site.origin + '/works/', up: '../'
  });
  h += nav(site, '../', 'works');
  h += '\n<main>\n  <section class="wrap lead">\n    <p class="label">Works</p>\n' +
'    <h1 class="title">\u30b7\u30ea\u30fc\u30ba\u4e00\u89a7</h1>\n  </section>\n\n  <div class="wrap gallery">\n';
  for (const s of list) {
    const p = s.photos[0];
    if (!p) continue;
    h += '    <a class="gallery__item" href="' + s.slug + '/">\n' +
'      <img src="../images/' + p.file + '" alt="' + esc(p.alt) + '"' + dims(p) + ' loading="lazy" decoding="async">\n' +
'    </a>\n';
  }
  h += '  </div>\n\n  <section class="wrap index">\n    <div class="index__list">\n';
  for (const s of list) {
    h += '      <span class="num">' + s.no + '</span>\n' +
'      <a class="h2" href="' + s.slug + '/">' + esc(s.title) + '</a>\n';
  }
  h += '    </div>\n  </section>\n</main>\n';
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
'    </div>\n  </section>\n\n  <div class="wrap gallery">\n';
  s.photos.forEach((p, i) => {
    h += '    <a class="gallery__item" href="../../images/' + p.file + '"' +
' data-lightbox="../../images/' + p.file + '" data-alt="' + esc(p.alt) + '">\n' +
'      <img src="../../images/' + p.file + '" alt="' + esc(p.alt) + '"' + dims(p) + ' loading="' + (i === 0 ? 'eager' : 'lazy') + '" decoding="async">\n' +
'    </a>\n';
  });
  h += '  </div>\n\n  <div class="wrap back">\n    <a class="viewlink" href="../">All series</a>\n  </div>\n</main>\n';
  return h + footer(site, '../../').replace('</body>', '<script src="../../gallery.js"></script>\n</body>');
}

async function put(rel, html) {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, html, 'utf8');
  console.log('wrote', rel);
}

const data = JSON.parse(await readFile(join(root, 'series.json'), 'utf8'));
await put('index.html', renderTop(data));
await put('works/index.html', renderWorksIndex(data));
for (const s of numbered(data.series)) {
  await put(join('works', s.slug, 'index.html'), renderSeries(data, s));
}
