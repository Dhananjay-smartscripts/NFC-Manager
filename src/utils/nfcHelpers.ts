export const formatSerial = (id: unknown): string => {
  if (!id) return 'N/A';

  if (typeof id === 'string') {
    const clean = id.replace(/[^0-9A-Fa-f]/g, '');
    if (!clean.length) return id;
    return (clean.match(/.{1,2}/g) ?? []).map(b => b.toUpperCase()).join(':');
  }

  if (Array.isArray(id)) {
    return (id as number[])
      .map(b => b.toString(16).padStart(2, '0').toUpperCase())
      .join(':');
  }

  return String(id);
};

export const shortTech = (tech: string) =>
  tech.replace('android.nfc.tech.', '');

export const getTagType = (techTypes: string[] | null | undefined): string => {
  if (!techTypes) return 'Unknown';
  if (techTypes.some(t => t.includes('IsoDep'))) return 'ISO 14443-4';
  if (techTypes.some(t => t.includes('NfcA'))) return 'ISO 14443-3A';
  if (techTypes.some(t => t.includes('NfcB'))) return 'ISO 14443-3B';
  if (techTypes.some(t => t.includes('NfcF'))) return 'ISO 18092';
  if (techTypes.some(t => t.includes('NfcV'))) return 'ISO 15693';
  return 'Unknown';
};
