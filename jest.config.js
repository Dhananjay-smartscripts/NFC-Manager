module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-nfc-manager)/)',
  ],
  moduleNameMapper: {
    'react-native-nfc-manager': '<rootDir>/__mocks__/react-native-nfc-manager.js',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
