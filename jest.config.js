export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(js|jsx)$': ['babel-jest']
  },
  testMatch: [
    '**/__tests__/**/*.{js,jsx}',
    '**/?(*.)+(spec|test).{js,jsx}'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/main.js',
    '!js/app.js'
  ],
  moduleNameMapper: {
    '../js/store.js': '<rootDir>/__tests__/mocks__/store.js'
  },
  testPathIgnorePatterns: [
    '<rootDir>/__tests__/mocks__/store.js',
    '<rootDir>/__tests__/setup.js'
  ]
};