import { initGame } from './app.js';
import { store } from './store.js';
import { render } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initGame(); // Initialize the game
    store.subscribe(render);
    render(); // Initial render
});