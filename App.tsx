import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import NfcManager, { Ndef, TagEvent } from 'react-native-nfc-manager';
import { withNdef } from './utils/withNdef';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [scannedTag, setScannedTag] = useState<TagEvent | null>(null);
  const [writeText, setWriteText] = useState('Hello from React Native NFC!');
  const [message, setMessage] = useState('');

  const theme = {
    background: isDarkMode ? '#0F0F0F' : '#FFFFFF',
    surface: isDarkMode ? '#1C1C1E' : '#F8F9FA',
    cardBackground: isDarkMode ? '#2C2C2E' : '#FFFFFF',
    primary: '#007AFF',
    primaryDark: '#0056CC',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    text: isDarkMode ? '#FFFFFF' : '#000000',
    textSecondary: isDarkMode ? '#AEAEB2' : '#6C6C70',
    textTertiary: isDarkMode ? '#8E8E93' : '#8E8E93',
    border: isDarkMode ? '#38383A' : '#E5E5E7',
    shadow: isDarkMode ? '#000000' : '#000000',
  };

  useEffect(() => {
    async function initNfc() {
      try {
        const supported = await NfcManager.isSupported();
        setNfcSupported(supported);

        if (supported) {
          await NfcManager.start();
          const enabled = await NfcManager.isEnabled();
          setNfcEnabled(enabled);
        }
      } catch (ex: any) {
        console.warn('NFC initialization error', ex);
        setMessage(`NFC init error: ${ex.message}`);
      }
    }
    initNfc();
  }, []);

  const readNfc = useCallback(async () => {
    if (!nfcSupported || !nfcEnabled) {
      setMessage(
        !nfcSupported
          ? 'NFC not supported'
          : 'NFC disabled; enable in settings',
      );
      return;
    }

    setMessage('Ready to scan...');
    setScannedTag(null);

    await withNdef(async () => {
      const tag = await NfcManager.getTag();
      setScannedTag(tag);

      let parsed = 'No NDEF data.';
      if (tag?.ndefMessage?.length) {
        const rec = tag.ndefMessage[0];
        if (
          rec.tnf === Ndef.TNF_WELL_KNOWN &&
          rec.type.toString() === Ndef.RTD_TEXT.toString()
        ) {
          parsed = Ndef.text.decodePayload(new Uint8Array(rec.payload));
        } else {
          parsed = `Raw payload: ${Ndef.util.bytesToHexString(rec.payload)}`;
        }
      }
      setMessage(`Tag read: ${parsed}`);
    }, 'Approach tag to read');
  }, [nfcSupported, nfcEnabled]);

  const writeNfc = useCallback(async () => {
    if (!nfcSupported || !nfcEnabled) {
      setMessage(!nfcSupported ? 'NFC not supported' : 'Enable NFC first');
      return;
    }
    if (!writeText.trim()) {
      setMessage('Enter text to write');
      return;
    }

    setMessage('Ready to write...');
    await withNdef(async () => {
      const bytes = Ndef.encodeMessage([Ndef.textRecord(writeText)]);
      await NfcManager.ndefHandler.writeNdefMessage(bytes);
      setMessage(`Wrote: "${writeText}"`);
    }, 'Approach tag to write');
  }, [nfcSupported, nfcEnabled, writeText]);

  const getStatusColor = () => {
    if (!nfcSupported) return theme.error;
    if (!nfcEnabled) return theme.warning;
    return theme.success;
  };

  const getMessageColor = () => {
    if (message.includes('error') || message.includes('not supported')) {
      return theme.error;
    }
    if (message.includes('Ready') || message.includes('Wrote')) {
      return theme.success;
    }
    return theme.primary;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={
              isDarkMode
                ? require('./assets/mcards-white.png')
                : require('./assets/mcards.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: theme.text }]}>NFC Manager</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Read and write NFC tags with ease
          </Text>
        </View>

        {/* Status Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.statusContainer}>
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: nfcSupported ? theme.success : theme.error,
                  },
                ]}
              />
              <Text style={[styles.statusLabel, { color: theme.text }]}>
                NFC Support
              </Text>
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {nfcSupported ? 'Available' : 'Not Available'}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.statusItem}>
              <View
                style={[
                  styles.statusIndicator,
                  {
                    backgroundColor: nfcEnabled ? theme.success : theme.warning,
                  },
                ]}
              />
              <Text style={[styles.statusLabel, { color: theme.text }]}>
                NFC Status
              </Text>
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {nfcEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
        </View>

        {/* Message Display */}
        {message ? (
          <View
            style={[
              styles.messageCard,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.messageText, { color: getMessageColor() }]}>
              {message}
            </Text>
          </View>
        ) : null}

        {/* Read Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              📖 Read NFC Tag
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: theme.textSecondary },
              ]}
            >
              Tap to scan and read data from an NFC tag
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={readNfc}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Start Reading</Text>
          </TouchableOpacity>
        </View>

        {/* Write Section */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              ✍️ Write NFC Tag
            </Text>
            <Text
              style={[
                styles.sectionDescription,
                { color: theme.textSecondary },
              ]}
            >
              Enter text and write it to an NFC tag
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            onChangeText={setWriteText}
            value={writeText}
            placeholder="Enter text to write to tag"
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
            onPress={writeNfc}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Write to Tag</Text>
          </TouchableOpacity>
        </View>

        {/* Tag Information */}
        {scannedTag && (
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                🏷️ Tag Information
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  { color: theme.textSecondary },
                ]}
              >
                Details from the last scanned tag
              </Text>
            </View>
            <View style={styles.tagInfoContainer}>
              <View style={styles.tagInfoRow}>
                <Text
                  style={[styles.tagInfoLabel, { color: theme.textSecondary }]}
                >
                  ID:
                </Text>
                <Text style={[styles.tagInfoValue, { color: theme.text }]}>
                  {scannedTag.id || 'N/A'}
                </Text>
              </View>
              <View style={styles.tagInfoRow}>
                <Text
                  style={[styles.tagInfoLabel, { color: theme.textSecondary }]}
                >
                  Technologies:
                </Text>
                <Text style={[styles.tagInfoValue, { color: theme.text }]}>
                  {scannedTag.techTypes?.join(', ') || 'N/A'}
                </Text>
              </View>
              {scannedTag.ndefMessage && scannedTag.ndefMessage.length > 0 && (
                <View style={styles.ndefContainer}>
                  <Text
                    style={[
                      styles.tagInfoLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    NDEF Records:
                  </Text>
                  {scannedTag.ndefMessage.map((record, index) => (
                    <View key={index} style={styles.ndefRecord}>
                      <Text
                        style={[styles.ndefRecordText, { color: theme.text }]}
                      >
                        <Text style={{ fontWeight: '600' }}>Type:</Text>{' '}
                        {record.type
                          ? String.fromCharCode(...(record.type as number[]))
                          : 'Unknown'}
                      </Text>
                      <Text
                        style={[styles.ndefRecordText, { color: theme.text }]}
                      >
                        <Text style={{ fontWeight: '600' }}>Payload:</Text>{' '}
                        {record.payload
                          ? record.tnf === Ndef.TNF_WELL_KNOWN &&
                            record.type.toString() === Ndef.RTD_TEXT.toString()
                            ? Ndef.text.decodePayload(
                                new Uint8Array(record.payload),
                              )
                            : Ndef.util.bytesToHexString(record.payload)
                          : 'N/A'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: 20,
  },
  messageCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  messageText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  tagInfoContainer: {
    gap: 12,
  },
  tagInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tagInfoLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 80,
  },
  tagInfoValue: {
    fontSize: 14,
    flex: 1,
    fontFamily: 'monospace',
  },
  ndefContainer: {
    marginTop: 8,
    gap: 8,
  },
  ndefRecord: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginLeft: 12,
  },
  ndefRecordText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  footer: {
    height: 30,
  },
});

export default App;
