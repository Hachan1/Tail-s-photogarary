(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  if (!items.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML =
    '<button class="lightbox__close" type="button" aria-label="閉じる">Close</button>' +
    '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="前の写真">←</button>' +
    '<img class="lightbox__img" alt="">' +
    '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="次の写真">→</button>' +
    '<div class="lightbox__count"></div>';
  document.body.appendChild(box);

  var img = box.querySelector('.lightbox__img');
  var count = box.querySelector('.lightbox__count');
  var i = 0;

  function show(n) {
    i = (n + items.length) % items.length;
    var el = items[i];
    img.src = el.getAttribute('data-lightbox');
    img.alt = el.getAttribute('data-alt') || '';
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  }
  function open(n) {
    show(n);
    box.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close() {
    box.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  items.forEach(function (el, n) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(n); });
  });
  box.querySelector('.lightbox__close').addEventListener('click', close);
  box.querySelector('.lightbox__nav--prev').addEventListener('click', function () { show(i - 1); });
  box.querySelector('.lightbox__nav--next').addEventListener('click', function () { show(i + 1); });
  box.addEventListener('click', function (e) { if (e.target === box) close(); });
  document.addEventListener('keydown', function (e) {
    if (box.getAttribute('aria-hidden') === 'true') return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(i - 1);
    if (e.key === 'ArrowRight') show(i + 1);
  });
})();
