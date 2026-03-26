import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import RecordRow from '../components/RecordRow';
import { RECORD_TYPES, RecordTypeDef } from '../constants/recordTypes';
import { Theme } from '../theme';
import { buildNdefMessage, buildNdefMessageMulti } from '../utils/ndefBuilder';

type Props = {
  theme: Theme;
  message: string;
  isWriting: boolean;
  onWrite: (records: { typeId: string; formData: Record<string, string> }[]) => Promise<void>;
};

type ViewMode = 'PRIMARY' | 'SELECT' | 'FORM';

type PendingRecord = {
  id: string; // unique key for list
  type: RecordTypeDef;
  formData: Record<string, string>;
  bytes: number;
};

let _idCounter = 0;
const nextId = () => String(++_idCounter);

const WriteScreen = ({ theme, message, isWriting, onWrite }: Props) => {
  const [viewMode, setViewMode] = useState<ViewMode>('PRIMARY');
  const [selectedType, setSelectedType] = useState<RecordTypeDef | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null = new record
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [localMessage, setLocalMessage] = useState('');
  const [showSecure, setShowSecure] = useState<Record<string, boolean>>({});

  const title = useMemo(() => selectedType?.label ?? 'Add a record', [selectedType]);

  const totalBytes = useMemo(() => {
    if (records.length === 0) return 0;
    try {
      return buildNdefMessageMulti(
        records.map(r => ({ typeId: r.type.id, formData: r.formData })),
      ).length;
    } catch {
      return records.reduce((s, r) => s + r.bytes, 0);
    }
  }, [records]);

  const setField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getSummary = (type: RecordTypeDef, data: Record<string, string>) => {
    const values = type.fields
      .map(f => data[f.key]?.trim() ?? '')
      .filter(Boolean);
    return values.length > 0 ? values.slice(0, 2).join(' • ') : '';
  };

  const getBytes = (type: RecordTypeDef, data: Record<string, string>) => {
    try { return buildNdefMessage(type.id, data).length; } catch { return 0; }
  };

  const saveRecord = () => {
    if (!selectedType) return;
    const bytes = getBytes(selectedType, formData);

    if (editingId) {
      // update existing
      setRecords(prev =>
        prev.map(r =>
          r.id === editingId
            ? { ...r, type: selectedType, formData: { ...formData }, bytes }
            : r,
        ),
      );
    } else {
      // add new
      setRecords(prev => [
        ...prev,
        { id: nextId(), type: selectedType, formData: { ...formData }, bytes },
      ]);
    }

    setSelectedType(null);
    setEditingId(null);
    setFormData({});
    setShowSecure({});
    setViewMode('PRIMARY');
    setLocalMessage('');
  };

  const deleteRecord = (id: string) =>
    setRecords(prev => prev.filter(r => r.id !== id));

  const moveRecord = (id: string, dir: -1 | 1) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === id);
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  /* ── PRIMARY VIEW ── */
  if (viewMode === 'PRIMARY') {
    return (
      <ScrollView style={[styles.fill, { backgroundColor: theme.bg }]}>
        <View style={styles.primaryPad}>
          {/* Add a record */}
          <TouchableOpacity
            style={[styles.primaryAction, { borderColor: theme.border }]}
            onPress={() => {
              setEditingId(null);
              setFormData({});
              setViewMode('SELECT');
              setLocalMessage('');
            }}
            activeOpacity={0.75}
          >
            <Text style={[styles.primaryIcon, { color: theme.text }]}>⊕</Text>
            <Text style={[styles.primaryLabel, { color: theme.text }]}>Add a record</Text>
          </TouchableOpacity>

          {/* More options placeholder */}
          <TouchableOpacity
            style={[styles.primaryAction, { borderColor: theme.border }]}
            onPress={() => setLocalMessage('More options will be available soon.')}
            activeOpacity={0.75}
          >
            <Text style={[styles.primaryIcon, { color: theme.text }]}>⌕</Text>
            <Text style={[styles.primaryLabel, { color: theme.text }]}>More options</Text>
          </TouchableOpacity>

          {/* Write button */}
          <TouchableOpacity
            style={[
              styles.primaryAction,
              { borderColor: theme.border, opacity: records.length > 0 ? 1 : 0.5 },
            ]}
            onPress={() => {
              if (records.length === 0 || isWriting) return;
              onWrite(records.map(r => ({ typeId: r.type.id, formData: r.formData })));
            }}
            activeOpacity={0.75}
            disabled={records.length === 0 || isWriting}
          >
            <Text style={[styles.primaryIcon, { color: theme.text }]}>↓</Text>
            <Text style={[styles.primaryLabel, { color: theme.text }]}>
              {isWriting ? 'Writing…' : `Write / ${totalBytes} Bytes`}
            </Text>
          </TouchableOpacity>

          {/* Record list */}
          {records.length > 0 && (
            <View style={[styles.recordList, { borderTopColor: theme.border }]}>
              {records.map((rec, idx) => (
                <View
                  key={rec.id}
                  style={[
                    styles.recordItem,
                    { borderBottomColor: theme.border, backgroundColor: theme.surface },
                  ]}
                >
                  {/* Icon */}
                  <View style={[styles.recIconBox, { backgroundColor: theme.rowIcon }]}>
                    <Text style={styles.recIconText}>{rec.type.icon}</Text>
                  </View>

                  {/* Label + summary — tap to edit */}
                  <TouchableOpacity
                    style={styles.recTextWrap}
                    onPress={() => {
                      setSelectedType(rec.type);
                      setFormData({ ...rec.formData });
                      setEditingId(rec.id);
                      setShowSecure({});
                      setViewMode('FORM');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.recLabel, { color: theme.text }]}>
                      {rec.type.label} : {rec.bytes} Bytes
                    </Text>
                    <Text style={[styles.recSummary, { color: theme.muted }]} numberOfLines={1}>
                      {getSummary(rec.type, rec.formData)}
                    </Text>
                  </TouchableOpacity>

                  {/* Up / Down / Delete */}
                  <View style={styles.recActions}>
                    <TouchableOpacity
                      onPress={() => moveRecord(rec.id, -1)}
                      disabled={idx === 0}
                      style={styles.recBtn}
                    >
                      <Text style={[styles.recBtnText, { color: idx === 0 ? theme.muted : theme.text }]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveRecord(rec.id, 1)}
                      disabled={idx === records.length - 1}
                      style={styles.recBtn}
                    >
                      <Text style={[styles.recBtnText, { color: idx === records.length - 1 ? theme.muted : theme.text }]}>▼</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteRecord(rec.id)} style={styles.recBtn}>
                      <Text style={[styles.recBtnText, { color: '#FF3B30' }]}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {localMessage ? (
            <Text style={[styles.writeMsg, { color: theme.muted }]}>{localMessage}</Text>
          ) : null}

          {message ? (
            <Text
              style={[
                styles.writeMsg,
                {
                  color: message.toLowerCase().includes('success') ? '#34C759' : theme.accent,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    );
  }

  /* ── SELECT VIEW ── */
  if (viewMode === 'SELECT') {
    return (
      <ScrollView style={[styles.fill, { backgroundColor: theme.bg }]}>
        <View
          style={[
            styles.listHeader,
            { backgroundColor: theme.header, borderBottomColor: theme.divider },
          ]}
        >
          <TouchableOpacity onPress={() => setViewMode('PRIMARY')}>
            <Text style={[styles.formBack, { color: theme.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.listHeaderTitle, { color: theme.text }]}>Add a record</Text>
          <Text style={[styles.listHeaderSub, { color: theme.muted }]}>
            Select data type to write
          </Text>
        </View>

        {RECORD_TYPES.map(def => (
          <RecordRow
            key={def.id}
            def={def}
            theme={theme}
            onPress={() => {
              setSelectedType(def);
              if (!editingId) setFormData({});
              setViewMode('FORM');
            }}
          />
        ))}
      </ScrollView>
    );
  }

  /* ── FORM VIEW ── */
  if (!selectedType) {
    return (
      <View style={[styles.fill, { backgroundColor: theme.bg, justifyContent: 'center' }]}>
        <TouchableOpacity
          onPress={() => setViewMode('SELECT')}
          style={{ alignSelf: 'center', padding: 12 }}
        >
          <Text style={[styles.formBack, { color: theme.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.fill, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.formHeader,
            { borderBottomColor: theme.divider, backgroundColor: theme.header },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              setViewMode(editingId ? 'PRIMARY' : 'SELECT');
              if (!editingId) setFormData({});
            }}
          >
            <Text style={[styles.formBack, { color: theme.primary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.formTitle, { color: theme.text }]}>{title}</Text>
        </View>

        <View style={styles.formPad}>
          {selectedType.fields.map(field => (
            <View key={field.key} style={styles.fieldWrap}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{field.label}</Text>
              {field.secure ? (
                <View
                  style={[
                    styles.secureRow,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                  ]}
                >
                  <TextInput
                    style={[styles.fieldInputFlex, { color: theme.text }]}
                    value={formData[field.key] ?? ''}
                    onChangeText={val => setField(field.key, val)}
                    placeholder={field.placeholder}
                    placeholderTextColor={theme.muted}
                    keyboardType={field.keyboardType ?? 'default'}
                    secureTextEntry={!showSecure[field.key]}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowSecure(prev => ({ ...prev, [field.key]: !prev[field.key] }))
                    }
                    style={styles.writeEyeBtn}
                  >
                    <Text style={[styles.writeEyeIcon, { color: theme.muted }]}>
                      {showSecure[field.key] ? '🙈' : '👁'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TextInput
                  style={[
                    styles.fieldInput,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                      minHeight: field.multiline ? 90 : 48,
                    },
                  ]}
                  value={formData[field.key] ?? ''}
                  onChangeText={val => setField(field.key, val)}
                  placeholder={field.placeholder}
                  placeholderTextColor={theme.muted}
                  multiline={field.multiline}
                  textAlignVertical={field.multiline ? 'top' : 'center'}
                  keyboardType={field.keyboardType ?? 'default'}
                />
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.writeBtn, { backgroundColor: theme.primary }]}
            onPress={saveRecord}
            activeOpacity={0.8}
          >
            <Text style={styles.writeBtnText}>
              {editingId ? 'Update record' : 'Save record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.writeBtn,
              { backgroundColor: isWriting ? theme.muted : theme.accent, marginTop: 10 },
            ]}
            onPress={() => {
              // Save this record and immediately write all
              if (!selectedType || isWriting) return;
              const bytes = getBytes(selectedType, formData);
              let updatedRecords: PendingRecord[];
              if (editingId) {
                updatedRecords = records.map(r =>
                  r.id === editingId
                    ? { ...r, type: selectedType, formData: { ...formData }, bytes }
                    : r,
                );
              } else {
                updatedRecords = [
                  ...records,
                  { id: nextId(), type: selectedType, formData: { ...formData }, bytes },
                ];
              }
              setRecords(updatedRecords);
              setSelectedType(null);
              setEditingId(null);
              setFormData({});
              setShowSecure({});
              setViewMode('PRIMARY');
              onWrite(updatedRecords.map(r => ({ typeId: r.type.id, formData: r.formData })));
            }}
            disabled={isWriting}
            activeOpacity={0.8}
          >
            <Text style={styles.writeBtnText}>{isWriting ? 'Writing…' : 'Write now'}</Text>
          </TouchableOpacity>

          {message ? (
            <Text
              style={[
                styles.writeMsg,
                {
                  color: message.toLowerCase().includes('success')
                    ? '#34C759'
                    : theme.accent,
                },
              ]}
            >
              {message}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1 },
  primaryPad: {
    padding: 8,
  },
  primaryAction: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryIcon: {
    fontSize: 30,
    width: 46,
    textAlign: 'center',
    fontWeight: '700',
    marginRight: 12,
  },
  primaryLabel: {
    fontSize: 24,
    fontWeight: '600',
  },
  recordList: {
    marginTop: 4,
    borderTopWidth: 1,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  recIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recIconText: { fontSize: 20 },
  recTextWrap: { flex: 1, marginRight: 4 },
  recLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  recSummary: { fontSize: 13 },
  recActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  recBtn: { padding: 6 },
  recBtnText: { fontSize: 14, fontWeight: '700' },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  listHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  listHeaderSub: {
    fontSize: 13,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  formBack: {
    fontSize: 14,
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  formPad: {
    padding: 16,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    height: 48,
  },
  fieldInputFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  writeEyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  writeEyeIcon: {
    fontSize: 18,
  },
  writeBtn: {
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  writeBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  writeMsg: {
    marginTop: 14,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default WriteScreen;
