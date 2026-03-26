import React, { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import NfcManager, { Ndef, NdefRecord, NfcTech } from 'react-native-nfc-manager';
import { Theme } from '../theme';

/* ─────────────────────────── helpers ─────────────────────────────────── */

async function withNdefLocal<T>(fn: () => Promise<T>, alertMessage: string): Promise<T> {
  try {
    await NfcManager.requestTechnology(NfcTech.Ndef, { alertMessage });
    return await fn();
  } finally {
    NfcManager.cancelTechnologyRequest();
  }
}

const showConfirm = (title: string, message: string): Promise<boolean> =>
  new Promise(resolve => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });

function recordsToHex(records: NdefRecord[]): string {
  return records
    .map((r, i) => {
      const typeChars = (r.type ?? []) as number[];
      const type = `[${i + 1}] TNF=${r.tnf}  type=${typeChars.map((b: number) => String.fromCharCode(b)).join('')}`;
      const payloadBytes = (r.payload ?? []) as number[];
      const payload = payloadBytes.map((b: number) => b.toString(16).padStart(2, '0')).join(' ');
      let text = '';
      try {
        if (r.tnf === Ndef.TNF_WELL_KNOWN) {
          text = ` → "${Ndef.text.decodePayload(new Uint8Array(payloadBytes))}"`;
        }
      } catch {
        /* ignore */
      }
      return `${type}${text}\n${payload}`;
    })
    .join('\n\n');
}

/* ─────────────── NTAG21x config-page detection ────────────────────────── */

interface NtagConfig {
  pwdPage: number;   // page holding PWD0–3
  packPage: number;  // page holding PACK0–1
  cfg0Page: number;  // page holding AUTH0 in byte[3]
  cfg1Page: number;  // page holding ACCESS / PROT bit in byte[0]
}

// Page-map per tag type (from NXP datasheets)
const NTAG213: NtagConfig = { pwdPage: 0x2b, packPage: 0x2c, cfg0Page: 0x28, cfg1Page: 0x29 };
const NTAG215: NtagConfig = { pwdPage: 0x85, packPage: 0x86, cfg0Page: 0x82, cfg1Page: 0x83 };
const NTAG216: NtagConfig = { pwdPage: 0xe5, packPage: 0xe6, cfg0Page: 0xe2, cfg1Page: 0xe3 };

async function detectNtagConfig(
  transceive: (cmd: number[]) => Promise<number[]>,
): Promise<NtagConfig> {
  try {
    const resp = await transceive([0x60]); // GET_VERSION
    if (resp && resp.length >= 7) {
      const mem = resp[6];
      if (mem === 0x0f) return NTAG213;
      if (mem === 0x11) return NTAG215;
      if (mem === 0x13) return NTAG216;
    }
  } catch {
    /* tag doesn't support GET_VERSION – fall back */
  }
  return NTAG213; // most common default
}

/* ─────────────────────────── types ───────────────────────────────────── */

type Status = { text: string; ok: boolean } | null;

type MemoryResult = { title: string; body: string };

type Props = {
  theme: Theme;
  nfcSupported: boolean;
  nfcEnabled: boolean;
};

/* ─────────────────────────── component ───────────────────────────────── */

const OtherScreen = ({
  theme,
  nfcSupported,
  nfcEnabled,
}: Props) => {
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  const [memResult, setMemResult] = useState<MemoryResult | null>(null);

  // Format-memory dialogue
  type FormatPhase = 'idle' | 'confirm' | 'scanning';
  const [formatPhase, setFormatPhase] = useState<FormatPhase>('idle');
  const formatAborted = useRef(false);

  // Remove-password dialog
  const [removePwdVisible, setRemovePwdVisible] = useState(false);
  const [removePwdInput, setRemovePwdInput] = useState('');
  const [removePwdShow, setRemovePwdShow] = useState(false);
  const removePwdResolve = useRef<((v: string | null) => void) | null>(null);

  const promptCurrentPassword = (): Promise<string | null> =>
    new Promise(resolve => {
      setRemovePwdInput('');
      setRemovePwdShow(false);
      removePwdResolve.current = resolve;
      setRemovePwdVisible(true);
    });

  const onRemovePwdCancel = () => {
    setRemovePwdVisible(false);
    removePwdResolve.current?.(null);
  };

  const onRemovePwdOk = () => {
    setRemovePwdVisible(false);
    removePwdResolve.current?.(removePwdInput);
  };

  // Set-password dialog
  const [setPwdVisible, setSetPwdVisible] = useState(false);
  const [setPwdInput, setSetPwdInput] = useState('');
  const [setPwdShow, setSetPwdShow] = useState(false);
  const setPwdResolve = useRef<((v: string | null) => void) | null>(null);

  const promptNewPassword = (): Promise<string | null> =>
    new Promise(resolve => {
      setSetPwdInput('');
      setSetPwdShow(false);
      setPwdResolve.current = resolve;
      setSetPwdVisible(true);
    });

  const onSetPwdCancel = () => {
    setSetPwdVisible(false);
    setPwdResolve.current?.(null);
  };

  const onSetPwdOk = () => {
    setSetPwdVisible(false);
    setPwdResolve.current?.(setPwdInput);
  };

  /* guard */
  const nfcReady = (): boolean => {
    if (!nfcSupported) {
      setStatus({ text: 'NFC is not supported on this device.', ok: false });
      return false;
    }
    if (!nfcEnabled) {
      setStatus({ text: 'Please enable NFC in device settings.', ok: false });
      return false;
    }
    return true;
  };

  /* 4. Lock tag */
  const lockTag = async () => {
    if (!nfcReady() || busy) return;
    const confirmed = await showConfirm(
      'Lock Tag',
      'This will permanently make the tag read-only. This CANNOT be undone. Continue?',
    );
    if (!confirmed) return;
    setBusy(true);
    setStatus({ text: 'Approach tag to lock…', ok: true });
    try {
      await withNdefLocal(async () => {
        await NfcManager.ndefHandler.makeReadOnly();
        setStatus({ text: 'Tag locked successfully (permanently read-only).', ok: true });
      }, 'Approach tag to lock');
    } catch {
      setStatus({ text: 'Lock cancelled or not supported by this tag.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  /* 5. Read memory */
  const readMemory = async () => {
    if (!nfcReady() || busy) return;
    setBusy(true);
    setStatus({ text: 'Approach tag to read memory…', ok: true });
    try {
      let resultBody = '';
      await withNdefLocal(async () => {
        const tag = await NfcManager.getTag();
        const records = (tag as any)?.ndefMessage ?? null;
        const tagAny = tag as any;

        const info: string[] = [];
        if (tagAny?.ndefStatus?.maxSize)
          info.push(`Max NDEF size : ${tagAny.ndefStatus.maxSize} bytes`);
        if (tagAny?.ndefStatus?.isWritable !== undefined)
          info.push(`Writable      : ${tagAny.ndefStatus.isWritable ? 'Yes' : 'No'}`);
        if (tagAny?.nfcaInfo?.atqa != null)
          info.push(
            `ATQA          : 0x${Number(tagAny.nfcaInfo.atqa)
              .toString(16)
              .padStart(4, '0')
              .toUpperCase()}`,
          );
        if (tagAny?.nfcaInfo?.sak != null)
          info.push(
            `SAK           : 0x${Number(tagAny.nfcaInfo.sak)
              .toString(16)
              .padStart(2, '0')
              .toUpperCase()}`,
          );

        const recStr =
          records && records.length > 0
            ? recordsToHex(records)
            : '(No NDEF records found)';

        resultBody = [
          '── Tag Info ──',
          info.join('\n') || '(No tag info)',
          '\n── NDEF Records ──',
          recStr,
        ].join('\n');
      }, 'Approach tag to read memory');

      setStatus({ text: 'Memory read complete.', ok: true });
      setMemResult({ title: 'Memory Contents', body: resultBody });
    } catch {
      setStatus({ text: 'Read cancelled.', ok: false });
    } finally {
      setBusy(false);
    }
  };

  /* 7. Set password */
  const setPassword = async () => {
    if (!nfcReady() || busy) return;

    // Step 1: warning dialog + password input
    const pwd = await promptNewPassword();
    if (pwd === null) return; // cancelled
    if (pwd.length === 0) {
      setStatus({ text: 'Password cannot be empty.', ok: false });
      return;
    }

    // Step 2: approach tag
    setBusy(true);
    setStatus({ text: 'Approach the tag to set password…', ok: true });
    try {
      await NfcManager.requestTechnology(NfcTech.NfcA, {
        alertMessage: 'Approach the tag to set password',
      });

      const transceive = (cmd: number[]) => NfcManager.nfcAHandler.transceive(cmd);
      const writePage = async (page: number, data: number[]) => {
        await transceive([0xa2, page, ...data]);
      };

      // Pad / truncate password to exactly 4 bytes
      const pwdBytes = Array.from({ length: 4 }, (_, i) =>
        i < pwd.length ? pwd.charCodeAt(i) & 0xff : 0x00,
      );

      // Detect tag type to find correct config-page addresses
      const cfg = await detectNtagConfig(transceive);

      // Write PWD to the correct page
      await writePage(cfg.pwdPage, pwdBytes);

      // Write PACK (2-byte acknowledgment)
      await writePage(cfg.packPage, [0x80, 0x80, 0x00, 0x00]);

      // Set AUTH0 = 0x04 in CFG0 (protect from page 4 = start of user memory)
      // READ returns 16 bytes; first 4 are the requested page
      try {
        const cfg0 = await transceive([0x30, cfg.cfg0Page]);
        // Preserve bytes 0-2; set AUTH0 (byte 3) = 0x04
        await writePage(cfg.cfg0Page, [cfg0[0], cfg0[1], cfg0[2], 0x04]);
      } catch {
        await writePage(cfg.cfg0Page, [0x00, 0x00, 0x00, 0x04]);
      }

      // Set PROT=1 (bit 7) in CFG1 / ACCESS page → require auth for read + write
      try {
        const cfg1 = await transceive([0x30, cfg.cfg1Page]);
        await writePage(cfg.cfg1Page, [cfg1[0] | 0x80, cfg1[1], cfg1[2], cfg1[3]]);
      } catch {
        await writePage(cfg.cfg1Page, [0x80, 0x00, 0x00, 0x00]);
      }

      setStatus({ text: 'Password set successfully.', ok: true });
    } catch (err: any) {
      setStatus({
        text: err?.message ?? 'Failed to set password. Unsupported tag or write-protected.',
        ok: false,
      });
    } finally {
      NfcManager.cancelTechnologyRequest();
      setBusy(false);
    }
  };

  /* 8. Remove password */
  const removePassword = async () => {
    if (!nfcReady() || busy) return;

    // Step 1: ask for current password
    const pwd = await promptCurrentPassword();
    if (pwd === null) return; // cancelled

    // Step 2: approach the tag
    setBusy(true);
    setStatus({ text: 'Approach the tag to remove password…', ok: true });
    try {
      await NfcManager.requestTechnology(NfcTech.NfcA, {
        alertMessage: 'Approach the tag to remove password',
      });

      const transceive = (cmd: number[]) => NfcManager.nfcAHandler.transceive(cmd);
      const writePage = async (page: number, data: number[]) => {
        await transceive([0xa2, page, ...data]);
      };

      // Convert password string to 4-byte key
      const pwdBytes = Array.from({ length: 4 }, (_, i) =>
        i < pwd.length ? pwd.charCodeAt(i) & 0xff : 0x00,
      );

      // Step A: Detect tag type BEFORE authenticating — GET_VERSION must not run after PWD_AUTH
      const cfg = await detectNtagConfig(transceive);

      // Step B: Authenticate — PWD_AUTH (0x1B) must return a 2-byte PACK
      const authResp = await transceive([0x1b, ...pwdBytes]);
      if (!authResp || authResp.length < 2) {
        throw new Error('Authentication failed — wrong password or unsupported tag.');
      }

      // Step C: Disable password protection — set AUTH0 = 0xFF in CFG0
      // READ returns 16 bytes; first 4 bytes are the requested page
      const cfg0 = await transceive([0x30, cfg.cfg0Page]);
      // Preserve mirror/RFUI bytes (0-2); set AUTH0 (byte 3) = 0xFF (= no auth required)
      await writePage(cfg.cfg0Page, [cfg0[0], cfg0[1], cfg0[2], 0xff]);

      // Step D: Clear PROT bit (bit 7) in CFG1 / ACCESS page
      try {
        const cfg1 = await transceive([0x30, cfg.cfg1Page]);
        await writePage(cfg.cfg1Page, [cfg1[0] & 0x7f, cfg1[1], cfg1[2], cfg1[3]]);
      } catch {
        /* non-fatal if ACCESS page read fails after auth */
      }

      // Step E: Reset PWD and PACK to factory defaults
      await writePage(cfg.pwdPage, [0xff, 0xff, 0xff, 0xff]);
      await writePage(cfg.packPage, [0x00, 0x00, 0x00, 0x00]);

      setStatus({ text: 'Password removed successfully.', ok: true });
    } catch (err: any) {
      setStatus({
        text: err?.message ?? 'Failed to remove password. Wrong password or unsupported tag.',
        ok: false,
      });
    } finally {
      NfcManager.cancelTechnologyRequest();
      setBusy(false);
    }
  };

  /* 3. Format memory – 2-step custom dialog */
  const formatMemory = () => {
    if (!nfcReady() || busy) return;
    setFormatPhase('confirm');
  };

  const onFormatContinue = async () => {
    formatAborted.current = false;
    setFormatPhase('scanning');
    setBusy(true);
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Approach tag to format',
      });
      await NfcManager.ndefHandler.writeNdefMessage(
        Ndef.encodeMessage([Ndef.textRecord('')]),
      );
      setStatus({ text: 'Tag formatted successfully.', ok: true });
    } catch {
      if (!formatAborted.current) {
        setStatus({ text: 'Format failed. Please try again.', ok: false });
      }
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setFormatPhase('idle');
      setBusy(false);
    }
  };

  const onFormatCancel = () => {
    formatAborted.current = true;
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setFormatPhase('idle');
    setBusy(false);
  };

  /* menu definition */
  const ITEMS = [
    { id: 'lock_tag',        icon: '🔒', label: 'Lock tag',        action: lockTag },
    { id: 'format_memory',   icon: '🗄',  label: 'Format memory',   action: formatMemory },
    { id: 'read_memory',     icon: '≡',  label: 'Read memory',     action: readMemory },
    { id: 'set_password',    icon: '🔑', label: 'Set password',    action: setPassword },
    { id: 'remove_password', icon: '⊗',  label: 'Remove password', action: removePassword },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      {/* Status banner */}
      {status ? (
        <View
          style={[
            styles.statusBar,
            {
              backgroundColor: status.ok ? theme.surface : '#FF3B3018',
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.statusText, { color: status.ok ? theme.text : '#FF3B30' }]}>
            {status.text}
          </Text>
          <TouchableOpacity onPress={() => setStatus(null)} style={styles.statusClose}>
            <Text style={{ color: theme.muted, fontSize: 14 }}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content}>
        {ITEMS.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            activeOpacity={busy ? 1 : 0.7}
            style={[
              styles.row,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderTopWidth: index === 0 ? 1 : 0,
                opacity: busy ? 0.55 : 1,
              },
            ]}
            onPress={item.action}
            disabled={busy}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.rowIcon }]}>
              <Text style={styles.iconText}>{item.icon}</Text>
            </View>
            <Text style={[styles.label, { color: theme.text }]}>{item.label}</Text>
            <Text style={[styles.arrow, { color: theme.muted }]}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Set password dialog */}
      <Modal
        visible={setPwdVisible}
        transparent
        animationType="fade"
        onRequestClose={onSetPwdCancel}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            {/* Title row */}
            <View style={styles.dialogTitleRow}>
              <View style={[styles.dialogIconCircle, { borderColor: '#FF3B30' }]}>
                <Text style={styles.dialogIconText}>⚠️</Text>
              </View>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Set password</Text>
            </View>

            {/* Warning */}
            <Text style={[styles.dialogWarning, { color: theme.text }]}>
              Warning, your NFC tag will not be writable without a password.
            </Text>
            <Text style={[styles.dialogWarning, { color: theme.text }]}>
              This process cannot be reverted if you forget your password!
            </Text>

            {/* Input */}
            <Text style={[styles.dialogLabel, { color: theme.text }]}>Password:</Text>
            <View style={[styles.dialogInputRow, { borderBottomColor: theme.text }]}>
              <TextInput
                style={[styles.dialogInputFlex, { color: theme.text }]}
                value={setPwdInput}
                onChangeText={setSetPwdInput}
                secureTextEntry={!setPwdShow}
                autoFocus
                placeholder=""
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                onSubmitEditing={onSetPwdOk}
              />
              <TouchableOpacity onPress={() => setSetPwdShow(v => !v)} style={styles.eyeBtn}>
                <Text style={[styles.eyeIcon, { color: theme.muted }]}>
                  {setPwdShow ? '🙈' : '👁'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.dialogBtns}>
              <TouchableOpacity onPress={onSetPwdCancel} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSetPwdOk} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.accent }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Remove password dialog */}
      <Modal
        visible={removePwdVisible}
        transparent
        animationType="fade"
        onRequestClose={onRemovePwdCancel}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            {/* Title row */}
            <View style={styles.dialogTitleRow}>
              <View style={[styles.dialogIconCircle, { borderColor: theme.border }]}>
                <Text style={styles.dialogIconText}>🔑</Text>
              </View>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>
                Remove password
              </Text>
            </View>

            {/* Input */}
            <Text style={[styles.dialogLabel, { color: theme.text }]}>
              Current password:
            </Text>
            <View style={[styles.dialogInputRow, { borderBottomColor: theme.text }]}>
              <TextInput
                style={[styles.dialogInputFlex, { color: theme.text }]}
                value={removePwdInput}
                onChangeText={setRemovePwdInput}
                secureTextEntry={!removePwdShow}
                autoFocus
                placeholder=""
                placeholderTextColor={theme.muted}
                returnKeyType="done"
                onSubmitEditing={onRemovePwdOk}
              />
              <TouchableOpacity onPress={() => setRemovePwdShow(v => !v)} style={styles.eyeBtn}>
                <Text style={[styles.eyeIcon, { color: theme.muted }]}>
                  {removePwdShow ? '🙈' : '👁'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Buttons */}
            <View style={styles.dialogBtns}>
              <TouchableOpacity onPress={onRemovePwdCancel} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRemovePwdOk} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.accent }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Format Memory Step 1: Confirmation dialog ── */}
      <Modal
        visible={formatPhase === 'confirm'}
        transparent
        animationType="fade"
        onRequestClose={onFormatCancel}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialog, { backgroundColor: theme.surface }]}>
            {/* Icon + Title */}
            <View style={styles.dialogTitleRow}>
              <View style={[styles.dialogIconCircle, { borderColor: theme.border }]}>
                <Text style={styles.dialogIconText}>🗄</Text>
              </View>
              <Text style={[styles.dialogTitle, { color: theme.text }]}>Format memory</Text>
            </View>
            {/* Description */}
            <Text style={[styles.dialogWarning, { color: theme.text }]}>
              Formatting may take a few seconds, so please keep your NFC chip below your device until the process has finished.
            </Text>
            {/* Buttons */}
            <View style={styles.dialogBtns}>
              <TouchableOpacity onPress={onFormatCancel} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.muted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onFormatContinue} style={styles.dialogBtn}>
                <Text style={[styles.dialogBtnText, { color: theme.accent }]}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Format Memory Step 2: Approach tag dialog ── */}
      <Modal
        visible={formatPhase === 'scanning'}
        transparent
        animationType="fade"
        onRequestClose={onFormatCancel}
      >
        <View style={styles.dialogOverlay}>
          {/* Header label (matches NFC Tools style) */}
          <Text style={[styles.formatScanTitle, { color: theme.muted }]}>Format memory</Text>
          <View style={[styles.formatScanBox, { backgroundColor: theme.surface }]}>
            {/* Phone approaching NFC icon */}
            <View style={styles.formatScanIconWrap}>
              <Text style={styles.formatScanIcon}>📲</Text>
            </View>
            <Text style={[styles.formatScanLabel, { color: theme.text }]}>
              Approach an NFC Tag
            </Text>
            <TouchableOpacity
              style={[styles.formatCancelBtn, { borderColor: theme.border }]}
              onPress={onFormatCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.formatCancelBtnText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Memory result modal */}
      <Modal
        visible={!!memResult}
        animationType="slide"
        onRequestClose={() => setMemResult(null)}
      >
        <SafeAreaView style={[styles.memRoot, { backgroundColor: theme.bg }]}>
          <View
            style={[
              styles.memTopBar,
              { backgroundColor: theme.header, borderBottomColor: theme.border },
            ]}
          >
            <Text style={[styles.memTitle, { color: theme.text }]}>
              {memResult?.title ?? ''}
            </Text>
            <TouchableOpacity
              onPress={() => setMemResult(null)}
              activeOpacity={0.7}
              style={styles.memClose}
            >
              <Text style={[styles.memCloseText, { color: theme.accent }]}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.memContent}>
            <Text style={[styles.memBody, { color: theme.text }]}>{memResult?.body}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

/* ─────────────────────────── styles ──────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1 },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusText: { flex: 1, fontSize: 13, lineHeight: 18 },
  statusClose: { paddingLeft: 10, paddingVertical: 2 },
  content: { paddingTop: 12, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: { fontSize: 20 },
  label: { flex: 1, fontSize: 16, fontWeight: '500' },
  arrow: { fontSize: 22, fontWeight: '300' },
  memRoot: { flex: 1 },
  memTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  memTitle: { fontSize: 18, fontWeight: '700' },
  memClose: { padding: 4 },
  memCloseText: { fontSize: 15, fontWeight: '600' },
  /* remove-password dialog */
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dialog: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  dialogTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dialogIconText: { fontSize: 18 },
  dialogTitle: { fontSize: 18, fontWeight: '700' },
  dialogWarning: { fontSize: 14, lineHeight: 20, marginBottom: 10, fontWeight: '500' },
  dialogLabel: { fontSize: 14, marginBottom: 6 },
  dialogInput: {
    fontSize: 16,
    borderBottomWidth: 1.5,
    paddingVertical: 6,
    marginBottom: 24,
  },
  dialogInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    marginBottom: 24,
  },
  dialogInputFlex: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 6,
    paddingRight: 8,
  },
  eyeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  dialogBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
  },
  dialogBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  dialogBtnText: { fontSize: 15, fontWeight: '700' },
  memContent: { padding: 16, paddingBottom: 32 },
  memBody: { fontSize: 13, lineHeight: 20 },
  /* format-memory scan step */
  formatScanTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    alignSelf: 'center',
  },
  formatScanBox: {
    width: '100%',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  formatScanIconWrap: {
    marginBottom: 20,
  },
  formatScanIcon: {
    fontSize: 72,
    textAlign: 'center',
  },
  formatScanLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 32,
  },
  formatCancelBtn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
  },
  formatCancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OtherScreen;
