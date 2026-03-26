import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ndef, TagEvent } from 'react-native-nfc-manager';
import NfcSymbol from '../components/NfcSymbol';
import TagRow from '../components/TagRow';
import { Theme } from '../theme';
import { formatSerial, getTagType, shortTech } from '../utils/nfcHelpers';

type ParsedTextRecord = {
  title: string;
  lines: string[];
};

const parseTextRecord = (text: string): ParsedTextRecord | null => {
  if (!text) {
    return null;
  }

  if (text.startsWith('MECARD:')) {
    const fields = text
      .replace('MECARD:', '')
      .split(';')
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, field) => {
        const [key, ...rest] = field.split(':');
        if (!key || rest.length === 0) {
          return acc;
        }
        acc[key.toUpperCase()] = rest.join(':').trim();
        return acc;
      }, {});

    const lines = [
      fields.N ? `Name: ${fields.N}` : null,
      fields.TEL ? `Phone: ${fields.TEL}` : null,
      fields.EMAIL ? `Email: ${fields.EMAIL}` : null,
    ].filter((line): line is string => Boolean(line));

    return {
      title: 'Contact',
      lines,
    };
  }

  if (text.startsWith('ADDR:')) {
    const fields = text
      .replace('ADDR:', '')
      .split(';')
      .filter(Boolean)
      .reduce<Record<string, string>>((acc, field) => {
        const [key, ...rest] = field.split('=');
        if (!key || rest.length === 0) {
          return acc;
        }
        acc[key.toUpperCase()] = rest.join('=').trim();
        return acc;
      }, {});

    const lines = [
      fields.STREET ? `Street: ${fields.STREET}` : null,
      fields.CITY ? `City: ${fields.CITY}` : null,
      fields.STATE ? `State: ${fields.STATE}` : null,
      fields.POSTAL ? `Postal Code: ${fields.POSTAL}` : null,
      fields.COUNTRY ? `Country: ${fields.COUNTRY}` : null,
    ].filter((line): line is string => Boolean(line));

    return {
      title: 'Address',
      lines,
    };
  }

  // Backward compatibility for older address payloads written as
  // "street, city, state, postal, country".
  const legacyAddressParts = text
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  if (legacyAddressParts.length >= 3) {
    const [street, city, state, postalCode, country] = legacyAddressParts;
    const lines = [
      street ? `Street: ${street}` : null,
      city ? `City: ${city}` : null,
      state ? `State: ${state}` : null,
      postalCode ? `Postal Code: ${postalCode}` : null,
      country ? `Country: ${country}` : null,
    ].filter((line): line is string => Boolean(line));

    return {
      title: 'Address',
      lines,
    };
  }

  return null;
};

type Props = {
  theme: Theme;
  scannedTag: TagEvent | null;
  isScanning: boolean;
  message: string;
  onStartScan: () => void;
  onReset: () => void;
};

const ReadScreen = ({
  theme,
  scannedTag,
  isScanning,
  message,
  onStartScan,
  onReset,
}: Props) => {
  if (scannedTag) {
    const tag = scannedTag as any;
    const techs = (scannedTag.techTypes ?? []).map(shortTech).join(', ') || 'N/A';
    const tagType = getTagType(scannedTag.techTypes);
    const serial = formatSerial(scannedTag.id as unknown);
    const atqa =
      tag.nfcaInfo?.atqa != null
        ? `0x${Number(tag.nfcaInfo.atqa).toString(16).padStart(4, '0').toUpperCase()}`
        : null;
    const sak =
      tag.nfcaInfo?.sak != null
        ? `0x${Number(tag.nfcaInfo.sak).toString(16).padStart(2, '0').toUpperCase()}`
        : null;
    const maxSize = tag.ndefStatus?.maxSize ?? 0;
    const usedSize = (scannedTag.ndefMessage ?? []).reduce(
      (a: number, r: any) => a + (r.payload?.length ?? 0),
      0,
    );

    return (
      <ScrollView style={[styles.fill, { backgroundColor: theme.bg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onReset} activeOpacity={0.7}>
          <Text style={[styles.backBtnText, { color: theme.primary }]}>Scan another</Text>
        </TouchableOpacity>

        <TagRow theme={theme} icon="T" label="Tag type" value={tagType} />
        <TagRow theme={theme} icon="I" label="Technologies" value={techs} />
        <TagRow theme={theme} icon="S" label="Serial number" value={serial} />
        {atqa ? <TagRow theme={theme} icon="A" label="ATQA" value={atqa} /> : null}
        {sak ? <TagRow theme={theme} icon="K" label="SAK" value={sak} /> : null}
        {maxSize > 0 ? (
          <TagRow
            theme={theme}
            icon="M"
            label="Memory"
            value={`${usedSize} / ${maxSize} bytes`}
          />
        ) : null}

        {(scannedTag.ndefMessage?.length ?? 0) > 0 ? (
          <View style={[styles.ndefSection, { backgroundColor: theme.surface }]}>
            <Text style={[styles.ndefTitle, { color: theme.text }]}>NDEF Content</Text>
            {scannedTag.ndefMessage!.map((rec: any, i: number) => {
              let content = '';
              let parsedRecord: ParsedTextRecord | null = null;
              try {
                content =
                  rec.tnf === Ndef.TNF_WELL_KNOWN &&
                  rec.type.toString() === Ndef.RTD_TEXT.toString()
                    ? Ndef.text.decodePayload(new Uint8Array(rec.payload))
                    : Ndef.util.bytesToHexString(rec.payload);

                if (
                  rec.tnf === Ndef.TNF_WELL_KNOWN &&
                  rec.type.toString() === Ndef.RTD_TEXT.toString()
                ) {
                  parsedRecord = parseTextRecord(content);
                }
              } catch {
                content = 'Unable to decode';
              }
              return (
                <View key={i} style={[styles.ndefRecord, { backgroundColor: theme.bg }]}>
                  {parsedRecord ? (
                    <>
                      <Text style={[styles.structuredTitle, { color: theme.text }]}>
                        {parsedRecord.title}
                      </Text>
                      {parsedRecord.lines.map(line => (
                        <Text key={line} style={{ color: theme.muted }}>
                          {line}
                        </Text>
                      ))}
                    </>
                  ) : (
                    <Text style={{ color: theme.muted }}>{content}</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.scanArea, { backgroundColor: theme.bg }]}
      onPress={onStartScan}
      activeOpacity={0.85}
      disabled={isScanning}
    >
      <NfcSymbol size={80} color={isScanning ? theme.accent : theme.muted} />
      <Text style={[styles.title, { color: isScanning ? theme.accent : theme.text }]}>
        {isScanning ? 'Scanning...' : 'Approach an NFC Tag'}
      </Text>
      {message ? <Text style={[styles.msg, { color: theme.accent }]}>{message}</Text> : null}
      <View style={[styles.divider, { backgroundColor: theme.divider }]} />
      <Text style={{ color: theme.muted }}>Welcome to NFC Tools</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 19,
    fontWeight: '500',
    marginTop: 28,
    marginBottom: 8,
    textAlign: 'center',
  },
  msg: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  divider: {
    width: 220,
    height: 1,
    marginVertical: 22,
  },
  backBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ndefSection: {
    margin: 16,
    borderRadius: 10,
    padding: 14,
  },
  ndefTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  ndefRecord: {
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
  },
  structuredTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default ReadScreen;
