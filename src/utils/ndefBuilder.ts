import { Ndef, NdefRecord } from 'react-native-nfc-manager';

/** Build a single NdefRecord (no message wrapping) for a given type/form. */
export const buildNdefRecord = (
  typeId: string,
  form: Record<string, string>,
): NdefRecord => {
  switch (typeId) {
    case 'text':
      return Ndef.textRecord(form.text ?? '');
    case 'url':
      return Ndef.uriRecord(form.url ?? '');
    case 'mail': {
      const to = encodeURIComponent(form.email ?? '');
      const subject = encodeURIComponent(form.subject ?? '');
      const body = encodeURIComponent(form.body ?? '');
      return Ndef.uriRecord(`mailto:${to}?subject=${subject}&body=${body}`);
    }
    case 'phone':
      return Ndef.uriRecord(`tel:${form.phone ?? ''}`);
    case 'contact': {
      const name = (form.name ?? '').trim();
      const phone = (form.phone ?? '').trim();
      const email = (form.email ?? '').trim();
      return Ndef.textRecord(`MECARD:N:${name};TEL:${phone};EMAIL:${email};;`);
    }
    case 'address': {
      const payload =
        `ADDR:STREET=${(form.street ?? '').trim()};CITY=${(form.city ?? '').trim()};` +
        `STATE=${(form.state ?? '').trim()};POSTAL=${(form.postalCode ?? '').trim()};` +
        `COUNTRY=${(form.country ?? '').trim()};;`;
      return Ndef.textRecord(payload);
    }
    case 'location':
      return Ndef.uriRecord(`geo:${form.lat ?? '0'},${form.lng ?? '0'}`);
    case 'wifi': {
      const wifi = `WIFI:T:${form.security || 'WPA2'};S:${form.ssid || ''};P:${form.password || ''};;`;
      return Ndef.textRecord(wifi);
    }
    case 'data':
    default:
      return Ndef.textRecord(form.data ?? '');
  }
};

/** Build a full NDEF byte array from one record (backward compat). */
export const buildNdefMessage = (
  typeId: string,
  form: Record<string, string>,
): number[] => Ndef.encodeMessage([buildNdefRecord(typeId, form)]);

/** Build a full NDEF byte array from multiple records. */
export const buildNdefMessageMulti = (
  records: { typeId: string; formData: Record<string, string> }[],
): number[] => Ndef.encodeMessage(records.map(r => buildNdefRecord(r.typeId, r.formData)));
