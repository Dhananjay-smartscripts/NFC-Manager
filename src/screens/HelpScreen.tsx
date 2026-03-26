import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Theme } from '../theme';

const FAQ = [
  {
    q: 'What is NFC?',
    a: 'Near Field Communication (NFC) is a short-range wireless technology that lets devices exchange data when placed within a few centimetres of each other.',
  },
  {
    q: 'How do I read an NFC tag?',
    a: 'Go to the READ tab and tap the scan area. Hold your device within 4 cm of an NFC tag. The tag data will appear automatically.',
  },
  {
    q: 'How do I write to an NFC tag?',
    a: 'Go to the WRITE tab, tap "Add a record" and choose a data type (Text, URL, Contact, etc.). Fill in the details, tap "Save record", then tap "Write / X Bytes" and approach the tag.',
  },
  {
    q: 'How do I copy a tag?',
    a: 'Go to the OTHER tab and tap "Copy tag". Approach the source tag to capture its NDEF data. Then use "Copy to infinity!" to write it to as many tags as you need.',
  },
  {
    q: 'How do I erase a tag?',
    a: 'In the OTHER tab, tap "Erase tag" and confirm. Hold your device near the tag to overwrite it with an empty NDEF message.',
  },
  {
    q: 'How do I read raw memory?',
    a: 'In the OTHER tab, tap "Read memory". Approach a tag and the app will display its NDEF records and technical memory details.',
  },
  {
    q: 'How do I lock a tag?',
    a: 'In the OTHER tab, tap "Lock tag" and confirm. This makes the tag permanently read-only. Warning: this action cannot be undone.',
  },
  {
    q: 'Why is NFC not working?',
    a: 'Ensure NFC is enabled in your device settings. NFC does not work on emulators — a physical device is required. Some older tags may not be compatible.',
  },
  {
    q: 'Which tag types are supported?',
    a: 'The app supports NDEF-formatted tags including NTAG213, NTAG215, NTAG216, Mifare Classic (read), and other standard NFC Forum compliant tags.',
  },
  {
    q: 'What does "Copy to infinity" do?',
    a: '"Copy to infinity" repeatedly writes a previously copied tag\'s NDEF content to new tags. Each time you approach a tag the data is written; you are then asked whether to continue.',
  },
];

type Props = {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
};

const HelpScreen = ({ visible, theme, onClose }: Props) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.topBar,
            { backgroundColor: theme.header, borderBottomColor: theme.border },
          ]}
        >
          <Text style={[styles.title, { color: theme.text }]}>Help &amp; FAQ</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.closeBtn}>
            <Text style={[styles.closeTxt, { color: theme.accent }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.intro, { color: theme.muted }]}>
            Tap a question to expand the answer.
          </Text>
          {FAQ.map((item, i) => {
            const open = expanded === i;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.75}
                onPress={() => setExpanded(open ? null : i)}
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={styles.cardRow}>
                  <Text style={[styles.q, { color: theme.text, flex: 1 }]}>{item.q}</Text>
                  <Text style={[styles.chevron, { color: theme.muted }]}>
                    {open ? '▲' : '▼'}
                  </Text>
                </View>
                {open ? (
                  <Text style={[styles.a, { color: theme.muted }]}>{item.a}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 15, fontWeight: '600' },
  content: { padding: 16, gap: 10, paddingBottom: 32 },
  intro: { fontSize: 13, marginBottom: 4 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  q: { fontSize: 15, fontWeight: '600', lineHeight: 21 },
  chevron: { fontSize: 11, marginLeft: 8 },
  a: { fontSize: 14, lineHeight: 21, marginTop: 8 },
});

export default HelpScreen;
