import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import LoginPage from './src/components/LoginPage';

try {
  const html = renderToString(createElement(LoginPage, {
    onLoginSuccess: () => {},
    onNavigateHome: () => {}
  }));
  console.log("Render successful!");
} catch (e) {
  console.error("Render failed:", e);
}
