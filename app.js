(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const original = (window.PHILISTINES_DATA && window.PHILISTINES_DATA.strips) || [];
  const strips = (Array.isArray(original) ? original : [])
    .filter(s => s && typeof s.image === 'string' && /^assets\/strips\/[\w.-]+$/.test(s.image))
    .slice()
    .sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')) || Number(b.id || 0)-Number(a.id || 0));

  const label = s => s.title || `Strip ${s.id}`;
  const prettyDate = date => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
    const d = new Date(date + 'T12:00:00');
    return Number.isNaN(d.valueOf()) ? '' : d.toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
  };
  const latest = strips[0];
  const archive = el('archive-grid');
  const reader = el('reader');
  let position = -1;

  const archiveCount = Math.max(0, strips.length - 1);
  el('archive-count').textContent = `${archiveCount} ${archiveCount === 1 ? 'strip' : 'strips'}`;
  if (latest) {
    el('latest-empty').hidden = true;
    el('latest-content').hidden = false;
    el('latest-image').src = latest.image;
    el('latest-image').alt = latest.alt || label(latest);
    el('latest-name').textContent = label(latest);
    el('latest-date').textContent = prettyDate(latest.date);
    el('latest-number').textContent = latest.id ? `#${latest.id}` : '';
    el('latest-open').addEventListener('click', () => openReader(0));
    if (strips.length > 1) el('archive-empty').hidden = true;
    strips.slice(1).forEach((strip, indexWithinArchive) => {
      const index = indexWithinArchive + 1;
      const button = document.createElement('button');
      button.className = 'archive-item'; button.type = 'button';
      button.setAttribute('aria-label', `Read ${label(strip)}`);
      const image = document.createElement('img');
      image.loading = 'lazy'; image.src = strip.image; image.alt = strip.alt || label(strip);
      const meta = document.createElement('div'); meta.className = 'archive-meta';
      const name = document.createElement('span'); name.textContent = label(strip);
      const date = document.createElement('time'); date.textContent = prettyDate(strip.date);
      meta.append(name,date); button.append(image,meta);
      button.addEventListener('click', () => openReader(index));
      archive.append(button);
    });
  }

  function openReader(index) {
    if (index < 0 || index >= strips.length) return;
    position = index; const s = strips[index];
    el('reader-title').textContent = label(s);
    el('reader-image').src = s.image;
    el('reader-image').alt = s.alt || label(s);
    el('reader-position').textContent = `${index+1} / ${strips.length}`;
    el('reader-newer').disabled = index === 0;
    el('reader-older').disabled = index === strips.length - 1;
    if (!reader.open) reader.showModal();
  }
  el('reader-close').addEventListener('click', () => reader.close());
  el('reader-older').addEventListener('click', () => openReader(position+1));
  el('reader-newer').addEventListener('click', () => openReader(position-1));
  reader.addEventListener('click', e => { if (e.target === reader) reader.close(); });
  document.addEventListener('keydown', e => {
    if (!reader.open) return;
    if (e.key === 'ArrowLeft') openReader(position+1);
    if (e.key === 'ArrowRight') openReader(position-1);
  });
})();
