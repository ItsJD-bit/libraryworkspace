const form = document.querySelector('#report-form');
const exportButton = document.querySelector('#export-pdf');
const dateFrom = document.querySelector('#date-from');
const dateTo = document.querySelector('#date-to');
const rangeLabel = document.querySelector('#report-range');
const uniquePatronsValue = document.querySelector('#unique-patrons');
const totalUsesValue = document.querySelector('#total-uses');
const circulationsValue = document.querySelector('#circulation-uses');
const internetValue = document.querySelector('#internet-uses');
const discussionValue = document.querySelector('#discussion-uses');
const reportTableBody = document.querySelector('#report-table-body');
const reportEmpty = document.querySelector('#report-empty');

const toDateText = (value) => {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function setLoading(loading) {
  const submitButton = document.querySelector('#generate-report');
  if (submitButton) {
    submitButton.disabled = loading;
    submitButton.textContent = loading ? 'Generating…' : 'Generate report';
  }
}

async function loadReport() {
  if (!dateFrom.value || !dateTo.value) return;

  setLoading(true);
  try {
    const response = await fetch(`/api/reports?startDate=${encodeURIComponent(dateFrom.value)}&endDate=${encodeURIComponent(dateTo.value)}`);
    const rawText = await response.text();

    let payload;
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (parseError) {
      const preview = rawText.replace(/\s+/g, ' ').trim();
      const sanitized = preview.length > 180 ? `${preview.slice(0, 180)}…` : preview;
      const htmlFallback = /<!doctype|<html|<body/i.test(rawText);
      throw new Error(
        htmlFallback
          ? 'The report service is unavailable on this port. Please start the app server and refresh this page.'
          : `Report response was not valid JSON: ${sanitized || 'empty response'}`
      );
    }

    if (!response.ok) {
      throw new Error(payload.error || 'Unable to generate the report.');
    }

    const serviceMap = Object.fromEntries((payload.serviceBreakdown || []).map((item) => [item.name, item.count]));
    const circulationCount = Number(serviceMap['Circulation'] || 0);
    const internetCount = Number(serviceMap['Internet Room'] || 0);
    const discussionCount = Number(serviceMap['Discussion Room'] || 0);

    rangeLabel.textContent = `${toDateText(payload.startDate)} – ${toDateText(payload.endDate)}`;
    uniquePatronsValue.textContent = formatNumber(payload.uniquePatrons);
    totalUsesValue.textContent = formatNumber(payload.totalUsage);
    circulationsValue.textContent = formatNumber(circulationCount);
    internetValue.textContent = formatNumber(internetCount);
    discussionValue.textContent = formatNumber(discussionCount);

    const rows = [
      { name: 'Circulation', count: circulationCount },
      { name: 'Internet Room', count: internetCount },
      { name: 'Discussion Room', count: discussionCount }
    ].filter((row) => row.count > 0);

    if (!rows.length) {
      reportTableBody.innerHTML = '';
      reportEmpty.hidden = false;
      return;
    }

    reportTableBody.innerHTML = rows.map((row) => `
      <tr>
        <td>${row.name}</td>
        <td>${formatNumber(row.count)}</td>
      </tr>
    `).join('');
    reportEmpty.hidden = true;
  } catch (error) {
    reportEmpty.hidden = false;
    reportTableBody.innerHTML = '';
    reportEmpty.textContent = error.message || 'Unable to generate the report.';
    console.error(error);
  } finally {
    setLoading(false);
  }
}

if (form) {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    loadReport();
  });
}

if (exportButton) {
  exportButton.addEventListener('click', () => {
    if (!dateFrom.value || !dateTo.value) {
      return;
    }
    window.print();
  });
}

const to = new Date();
const from = new Date();
from.setDate(to.getDate() - 30);

dateFrom.value = from.toISOString().slice(0, 10);
dateTo.value = to.toISOString().slice(0, 10);
loadReport();
