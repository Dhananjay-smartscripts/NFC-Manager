import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RecordTypeDef } from '../constants/recordTypes';
import { Theme } from '../theme';

type Props = {
  def: RecordTypeDef;
  theme: Theme;
  onPress: () => void;
};

const RecordRow = ({ def, theme, onPress }: Props) => (
  <TouchableOpacity
    style={[styles.row, { borderBottomColor: theme.divider }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.iconWrap, { backgroundColor: theme.rowIcon }]}>
      <Text style={styles.iconText}>{def.icon}</Text>
    </View>
    <View style={styles.textWrap}>
      <Text style={[styles.label, { color: theme.text }]}>{def.label}</Text>
      <Text style={[styles.value, { color: theme.muted }]}>{def.desc}</Text>
    </View>
    <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 1,
  },
  value: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 18,
    paddingLeft: 8,
  },
});

export default RecordRow;
