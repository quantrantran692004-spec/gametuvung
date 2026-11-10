import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './style.css';

function RuntimeLabel() {
  return <span className="sr-only">WORD SHOOTER runtime</span>;
}

const rootElement = document.getElementById('react-runtime');
if (rootElement) createRoot(rootElement).render(<RuntimeLabel />);
void import('../js/app.js');
// Check the server whenever the app becomes visible; an installed worker can
// otherwise leave an already-open tab on the previous release indefinitely.
let refreshing = false;
if ('serviceWorker' in navigator) {
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    const check = () => { if (navigator.onLine) void registration.update().catch(() => {}); };
    window.addEventListener('online', check);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check(); });
    window.setInterval(check, 60 * 60 * 1000);
    check();
  },
});
