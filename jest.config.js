export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx)$': ['@swc/jest']
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
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};
