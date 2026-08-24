const form = document.querySelector('#catalog-form');
const results = document.querySelector('#results');
const message = document.querySelector('#form-message');
const submitButton = form.querySelector('button[type="submit"]');

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const confidence = (value) => {
  const percent = Math.round(Number(value) * 100);
  return `<div class="confidence"><span>Confidence ${percent}%</span><span class="confidence-bar"><span style="width:${percent}%"></span></span></div>`;
};

const resultCard = (label, value, subvalue, rationale, score) => `
  <article class="result-card">
    <div class="result-card-label">${label}</div>
    <div class="result-value">${escapeHtml(value)}</div>
    <div class="result-subvalue">${escapeHtml(subvalue)}</div>
    ${confidence(score)}
    <p class="result-rationale">${escapeHtml(rationale)}</p>
  </article>`;

function showResults(payload) {
  const catalog = payload.catalog;
  const headings = catalog.lcsh.map((item) => `<span class="heading-chip">${escapeHtml(item.heading)}</span>`).join('');
  const notes = catalog.reviewNotes.length
    ? `<ul class="review-notes">${catalog.reviewNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
    : '<p class="result-rationale">No additional review notes.</p>';

  results.innerHTML = `<div class="results-content">
    <div class="result-header">
      <div><span class="step-label">02 / Catalog record</span><p class="result-summary">${escapeHtml(catalog.summary)}</p></div>
      <span class="review-tag">Review required</span>
    </div>
    <div class="result-grid">
      ${resultCard('DDC classification', catalog.ddc.number, catalog.ddc.label, catalog.ddc.rationale, catalog.ddc.confidence)}
      ${resultCard('Cutter number', catalog.cutter.number, catalog.cutter.basis, catalog.cutter.rationale, catalog.cutter.confidence)}
      <article class="result-card full"><div class="result-card-label">LCSH subject headings</div><div class="heading-list">${headings}</div></article>
      <article class="result-card full"><div class="result-card-label">Review notes</div>${notes}</article>
    </div>
  </div>`;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.hidden = true;
  submitButton.disabled = true;
  submitButton.querySelector('span:first-child').textContent = 'Analyzing book...';
  results.innerHTML = '<div class="loading"><span class="spinner"></span> Preparing catalog suggestions...</div>';

  const formData = new FormData(form);
  const book = Object.fromEntries([...formData.entries()].filter(([, value]) => value !== ''));
  if (book.publicationYear) book.publicationYear = Number(book.publicationYear);

  try {
    const response = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(book)
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to generate suggestions');
    showResults(payload);
  } catch (error) {
    message.textContent = error.message;
    message.hidden = false;
    results.innerHTML = '<div class="results-empty"><div class="empty-index">02</div><div><span class="step-label">Catalog record</span><h2>Waiting for valid results</h2><p>Correct the issue above and try again.</p></div></div>';
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span:first-child').textContent = 'Generate suggestions';
  }
});
