import './styles.css';
import { App } from './ui/app';

const root = document.getElementById('app');
if (root) {
  const app = new App(root);
  // dev-only console handle for poking state; tree-shaken out of builds
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rv = app;
}
