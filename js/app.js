import { addEventListeners } from './ui.js';

let initialized = false;
document.addEventListener('DOMContentLoaded', () => {
    if (!initialized) {
        initialized = true;
        addEventListeners();
    }
});
