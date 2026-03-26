import React from 'react';
import {
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Theme } from '../theme';

type MenuEntry = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  theme: Theme;
  onClose: () => void;
};

const PopupMenu = ({ visible, theme, onClose }: Props) => {
  const items: MenuEntry[] = [
    {
      label: 'About Us',
      onPress: () => {
        onClose();
        Linking.openURL('https://intentdesk.com/about-us/').catch(() => {});
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.menu,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              {items.map((item, index) => (
                <React.Fragment key={item.label}>
                  {index > 0 && (
                    <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  )}
                  <TouchableOpacity
                    onPress={item.onPress}
                    activeOpacity={0.7}
                    style={styles.menuItem}
                  >
                    <Text
                      style={[
                        styles.menuLabel,
                        { color: item.destructive ? '#FF3B30' : theme.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 120,
    paddingRight: 14,
  },
  menu: {
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 160,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  menuItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  divider: {
    height: 1,
  },
});

export default PopupMenu;
