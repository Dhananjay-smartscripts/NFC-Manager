import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../theme';

type Props = {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  theme: Theme;
};

const TagRow = ({ icon, label, value, sub, theme }: Props) => (
  <View style={[styles.row, { borderBottomColor: theme.divider }]}> 
    <View style={[styles.iconWrap, { backgroundColor: theme.rowIcon }]}>
      <Text style={styles.iconText}>{icon}</Text>
    </View>
    <View style={styles.textWrap}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.muted }]}>{value}</Text>
      {sub ? <Text style={[styles.sub, { color: theme.muted }]}>{sub}</Text> : null}
    </View>
    <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
  </View>
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
    fontSize: 18,
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
  sub: {
    fontSize: 12,
    marginTop: 1,
  },
  chevron: {
    fontSize: 18,
    paddingLeft: 8,
  },
});

export default TagRow;
