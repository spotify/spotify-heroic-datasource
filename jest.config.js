module.exports = {
  "roots": [
    "<rootDir>/src"
  ],
  "setupFiles": [
    "<rootDir>/test-setup/jest-setup.ts"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}