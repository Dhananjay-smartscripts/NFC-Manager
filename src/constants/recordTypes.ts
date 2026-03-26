export interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  keyboardType?:
    | 'default'
    | 'email-address'
    | 'phone-pad'
    | 'url'
    | 'numeric';
  secure?: boolean;
}

export interface RecordTypeDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  fields: FieldDef[];
}

export const RECORD_TYPES: RecordTypeDef[] = [
  {
    id: 'text',
    icon: 'T',
    label: 'Text',
    desc: 'Add a text record',
    fields: [
      {
        key: 'text',
        label: 'Text',
        placeholder: 'Enter your text...',
        multiline: true,
      },
    ],
  },
  {
    id: 'url',
    icon: 'U',
    label: 'URL / URI',
    desc: 'Add a URL record',
    fields: [
      {
        key: 'url',
        label: 'URL',
        placeholder: 'https://example.com',
        keyboardType: 'url',
      },
    ],
  },
  {
    id: 'mail',
    icon: 'M',
    label: 'Mail',
    desc: 'Add mail record',
    fields: [
      {
        key: 'email',
        label: 'Email',
        placeholder: 'you@example.com',
        keyboardType: 'email-address',
      },
      { key: 'subject', label: 'Subject', placeholder: 'Subject' },
      {
        key: 'body',
        label: 'Body',
        placeholder: 'Message...',
        multiline: true,
      },
    ],
  },
  {
    id: 'phone',
    icon: 'P',
    label: 'Phone number',
    desc: 'Add a phone number',
    fields: [
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+1234567890',
        keyboardType: 'phone-pad',
      },
    ],
  },
  {
    id: 'contact',
    icon: 'C',
    label: 'Contact',
    desc: 'Add a contact card',
    fields: [
      {
        key: 'name',
        label: 'Name',
        placeholder: 'John Doe',
      },
      {
        key: 'phone',
        label: 'Phone',
        placeholder: '+1234567890',
        keyboardType: 'phone-pad',
      },
      {
        key: 'email',
        label: 'Email',
        placeholder: 'john@example.com',
        keyboardType: 'email-address',
      },
    ],
  },
  {
    id: 'address',
    icon: 'A',
    label: 'Address',
    desc: 'Add an address record',
    fields: [
      {
        key: 'street',
        label: 'Street',
        placeholder: '123 Main Street',
      },
      {
        key: 'city',
        label: 'City',
        placeholder: 'New York',
      },
      {
        key: 'state',
        label: 'State',
        placeholder: 'NY',
      },
      {
        key: 'postalCode',
        label: 'Postal Code',
        placeholder: '10001',
        keyboardType: 'numeric',
      },
      {
        key: 'country',
        label: 'Country',
        placeholder: 'USA',
      },
    ],
  },
  {
    id: 'wifi',
    icon: 'W',
    label: 'Wi-Fi network',
    desc: 'Configure a Wi-Fi network',
    fields: [
      {
        key: 'ssid',
        label: 'Network Name (SSID)',
        placeholder: 'MyNetwork',
      },
      {
        key: 'password',
        label: 'Password',
        placeholder: 'Password',
        secure: true,
      },
      {
        key: 'security',
        label: 'Security (WPA2/WEP/None)',
        placeholder: 'WPA2',
      },
    ],
  },
  {
    id: 'location',
    icon: 'L',
    label: 'Location',
    desc: 'Add a location',
    fields: [
      {
        key: 'lat',
        label: 'Latitude',
        placeholder: '37.7749',
        keyboardType: 'numeric',
      },
      {
        key: 'lng',
        label: 'Longitude',
        placeholder: '-122.4194',
        keyboardType: 'numeric',
      },
    ],
  },
  {
    id: 'data',
    icon: 'D',
    label: 'Data',
    desc: 'Add a custom record',
    fields: [
      {
        key: 'data',
        label: 'Custom data',
        placeholder: 'Enter custom data...',
        multiline: true,
      },
    ],
  },
];
