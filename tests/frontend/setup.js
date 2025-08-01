require('jest-fetch-mock').enableMocks();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock Audio API
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  canPlayType: jest.fn().mockReturnValue('maybe'),
  volume: 1,
  currentTime: 0,
  duration: 0,
  paused: true,
  ended: false,
}));

// Mock HLS.js
global.Hls = {
  isSupported: jest.fn().mockReturnValue(true),
  Events: {
    MANIFEST_PARSED: 'hlsManifestParsed',
    ERROR: 'hlsError',
  },
};

global.Hls.mockImplementation = jest.fn().mockImplementation(() => ({
  loadSource: jest.fn(),
  attachMedia: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
}));

// Mock console to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  if (fetch.resetMocks) {
    fetch.resetMocks();
  }
  localStorageMock.clear.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});