import { JSDOM } from 'jsdom';
import { URL, URLSearchParams } from 'whatwg-url';

global.URL = URL;
global.URLSearchParams = URLSearchParams;

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="game-wrapper"><div id="wff-output-tray"></div><div id="trash-can-drop-area"></div><ol id="proof-lines"></ol><div id="proof-feedback"></div><div id="subproof-goal-display-container"></div><h1 id="game-title"></h1><button id="prev-feedback"></button><button id="next-feedback"></button><button id="zoom-in-wff"></button><button id="zoom-out-wff"></button><div id="help-icon"></div><div id="subproofs-area"></div><div id="inference-rules-area"></div><div id="proof-problem-info"></div></div></body></html>', { url: 'https://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.navigator = {
    userAgent: 'node.js',
};
