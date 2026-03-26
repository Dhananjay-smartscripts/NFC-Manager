import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import NfcManager, { TagEvent } from 'react-native-nfc-manager';
import { withNdef } from './utils/withNdef';
import HelpScreen from './src/screens/HelpScreen';
import OtherScreen from './src/screens/OtherScreen';
import ReadScreen from './src/screens/ReadScreen';
import WriteScreen from './src/screens/WriteScreen';
import PopupMenu from './src/components/PopupMenu';
import { buildNdefMessageMulti } from './src/utils/ndefBuilder';
import { makeTheme, Tab } from './src/theme';

const App = () => {
  const isDark = useColorScheme() === 'dark';
  const theme = makeTheme(isDark);

  const [activeTab, setActiveTab] = useState<Tab>('READ');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);

  const [scannedTag, setScannedTag] = useState<TagEvent | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [readMessage, setReadMessage] = useState('');

  const [writeMessage, setWriteMessage] = useState('');
  const [isWriting, setIsWriting] = useState(false);

  const [helpVisible, setHelpVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supported = await NfcManager.isSupported();
        setNfcSupported(supported);
        if (supported) {
          await NfcManager.start();
          setNfcEnabled(await NfcManager.isEnabled());
        }
      } catch (error) {
        console.warn('NFC init error', error);
      }
    })();
  }, []);

  const onStartScan = useCallback(async () => {
    if (!nfcSupported || !nfcEnabled) {
      setReadMessage(
        !nfcSupported
          ? 'NFC not supported on this device'
          : 'Please enable NFC in Settings',
      );
      return;
    }

    setIsScanning(true);
    setScannedTag(null);
    setReadMessage('');

    try {
      await withNdef(async () => {
        const tag = await NfcManager.getTag();
        setScannedTag(tag);
      }, 'Approach tag to read');
    } catch {
      setReadMessage('Scan cancelled');
    } finally {
      setIsScanning(false);
    }
  }, [nfcSupported, nfcEnabled]);

  const onWrite = useCallback(
    async (records: { typeId: string; formData: Record<string, string> }[]) => {
      if (!nfcSupported || !nfcEnabled) {
        setWriteMessage(!nfcSupported ? 'NFC not supported' : 'Enable NFC first');
        return;
      }

      setIsWriting(true);
      setWriteMessage('Approach tag to write...');

      try {
        await withNdef(async () => {
          const bytes: number[] = buildNdefMessageMulti(records);
          await NfcManager.ndefHandler.writeNdefMessage(bytes);
          setWriteMessage('Write success');
        }, 'Approach tag to write');
      } catch (error: any) {
        setWriteMessage(`Write failed: ${error?.message ?? 'Unknown error'}`);
      } finally {
        setIsWriting(false);
      }
    },
    [nfcSupported, nfcEnabled],
  );

  const renderContent = () => {
    if (activeTab === 'READ') {
      return (
        <ReadScreen
          theme={theme}
          scannedTag={scannedTag}
          isScanning={isScanning}
          message={readMessage}
          onStartScan={onStartScan}
          onReset={() => {
            setScannedTag(null);
            setReadMessage('');
          }}
        />
      );
    }

    if (activeTab === 'WRITE') {
      return (
        <WriteScreen
          theme={theme}
          message={writeMessage}
          isWriting={isWriting}
          onWrite={onWrite}
        />
      );
    }

    if (activeTab === 'OTHER') {
      return (
        <OtherScreen
          theme={theme}
          nfcSupported={nfcSupported}
          nfcEnabled={nfcEnabled}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.barStyle} backgroundColor={theme.header} />

      <View
        style={[
          styles.header,
          { backgroundColor: theme.header, borderBottomColor: theme.border },
        ]}
      >
        <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.headerActions}>
          {/* Help / FAQ */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setHelpVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnText, { color: theme.text }]}>?</Text>
          </TouchableOpacity>

          {/* More menu */}
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.iconBtnText, { color: theme.text, letterSpacing: 1 }]}>•••</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.tabBar,
          { backgroundColor: theme.tabBar, borderBottomColor: theme.border },
        ]}
      >
        {(['READ', 'WRITE', 'OTHER'] as Tab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, { color: activeTab === tab ? theme.text : theme.muted }]}>
              {tab}
            </Text>
            {activeTab === tab ? (
              <View style={[styles.tabUnderline, { backgroundColor: theme.accent }]} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.fill}>{renderContent()}</View>

      <HelpScreen
        visible={helpVisible}
        theme={theme}
        onClose={() => setHelpVisible(false)}
      />
      <PopupMenu
        visible={menuVisible}
        theme={theme}
        onClose={() => setMenuVisible(false)}
      />
    </SafeAreaView>
  );
};

const ANDROID_EXTRA_BOTTOM = Platform.OS === 'android' ? 8 : 0;

const styles = StyleSheet.create({
  root: { flex: 1, paddingBottom: ANDROID_EXTRA_BOTTOM },
  fill: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  logo: {
    width: 170,
    height: 54,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    minWidth: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  iconBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
  },

});

export default App;
