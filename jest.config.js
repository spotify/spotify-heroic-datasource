module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  "setupFiles": [
    "./test-setup/jest-setup.ts"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  "globals": {
    "ts-jest": {
      diagnostics: false
    }
  },
}