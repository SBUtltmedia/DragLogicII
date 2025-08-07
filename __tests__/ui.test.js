import * as ui from '../js/ui.js';
import { store } from '../js/store.js';
import { EventBus } from '../js/event-bus.js';

// Mock the dependencies
jest.mock('../js/store.js', () => ({
  store: {
    getState: jest.fn(() => ({})),
    subscribe: jest.fn(),
    getState: jest.fn()
  }
}));

jest.mock('../js/event-bus.js', () => ({
  EventBus: {
    on: jest.fn(),
    emit: jest.fn()
  }
}));

describe('UI Module', () => {
  describe('addEventListeners', () => {
    test('should be a function', () => {
      expect(typeof ui.addEventListeners).toBe('function');
    });
  });

  describe('render functions', () => {
    test('should be defined', () => {
      expect(ui.render).toBeDefined();
      expect(typeof ui.render).toBe('function');
    });
  });
});
