const mockHls = {
  loadSource: jest.fn(),
  attachMedia: jest.fn(),
  on: jest.fn(),
  destroy: jest.fn(),
};

const Hls = jest.fn().mockImplementation(() => mockHls);

Hls.isSupported = jest.fn().mockReturnValue(true);
Hls.Events = {
  MANIFEST_PARSED: 'hlsManifestParsed',
  ERROR: 'hlsError',
};

module.exports = Hls;