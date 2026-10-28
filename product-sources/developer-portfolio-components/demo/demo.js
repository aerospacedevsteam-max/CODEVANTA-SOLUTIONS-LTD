// Demo wiring only: logs component events. Nothing is sent over the network.
const log = document.getElementById('event-log');

function write(name, detail) {
  const safe = JSON.stringify(detail, (key, value) => (typeof value === 'function' ? undefined : value), 2);
  log.textContent = `${name}\n${safe}`;
}

document.addEventListener('cv-submit', (event) => {
  write('cv-submit', event.detail);
  // Simulate a short network request so the pending state is visible.
  event.detail.waitUntil(new Promise((resolve) => setTimeout(resolve, 600)));
});

document.addEventListener('cv-filter-change', (event) => write('cv-filter-change', event.detail));
document.addEventListener('cv-theme-change', (event) => write('cv-theme-change', event.detail));
