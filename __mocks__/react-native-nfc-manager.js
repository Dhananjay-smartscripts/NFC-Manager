const NfcManager = {
  isSupported: jest.fn().mockResolvedValue(false),
  start: jest.fn().mockResolvedValue(undefined),
  isEnabled: jest.fn().mockResolvedValue(false),
  requestTechnology: jest.fn().mockResolvedValue(undefined),
  cancelTechnologyRequest: jest.fn().mockResolvedValue(undefined),
  getTag: jest.fn().mockResolvedValue(null),
  ndefHandler: {
    writeNdefMessage: jest.fn().mockResolvedValue(undefined),
  },
};

const NfcTech = {
  Ndef: 'Ndef',
};

const Ndef = {
  TNF_WELL_KNOWN: 0x01,
  RTD_TEXT: [0x54],
  text: {
    decodePayload: jest.fn().mockReturnValue('mock text'),
  },
  util: {
    bytesToHexString: jest.fn().mockReturnValue('00'),
  },
  encodeMessage: jest.fn().mockReturnValue([]),
  textRecord: jest.fn().mockReturnValue({}),
};

module.exports = NfcManager;
module.exports.default = NfcManager;
module.exports.NfcTech = NfcTech;
module.exports.Ndef = Ndef;
