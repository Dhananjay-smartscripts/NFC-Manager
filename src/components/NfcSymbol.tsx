import React from 'react';
import { View } from 'react-native';

type Props = {
  size?: number;
  color: string;
};

const NfcSymbol = ({ size = 80, color }: Props) => (
  <View
    style={{
      width: size,
      height: size,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {[1, 0.68, 0.38].map((scale, i) => (
      <View
        key={i}
        style={{
          position: 'absolute',
          width: size * scale,
          height: size * scale,
          borderRadius: (size * scale) / 2,
          borderWidth: 4,
          borderColor: color,
          opacity: 0.3 + i * 0.3,
        }}
      />
    ))}
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
      }}
    />
  </View>
);

export default NfcSymbol;
