import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './style.css';

function RuntimeLabel() {
  return <span className="sr-only">WORD SHOOTER runtime</span>;
}

const rootElement = document.getElementById('react-runtime');
if (rootElement) createRoot(rootElement).render(<RuntimeLabel />);
void import('../js/app.js');
registerSW({ immediate: true });
