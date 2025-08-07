export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest']
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
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
