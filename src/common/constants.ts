import { VehicleDocumentType, VehicleType } from '@prisma/client';

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  TENT: 'Tent',
  FLATBED: 'Platforma',
  REFRIGERATED: 'Refrijerator',
  TIPPER: 'Samosval',
  TANKER: 'Sisterna',
  VAN: 'Furgon',
  ISOTHERMAL: 'Izotermik',
  CONTAINER: 'Konteyner tashuvchi',
  CAR_CARRIER: 'Avtovoz',
  CRANE: 'Kran-manipulyator',
};

export const DOCUMENT_LABELS: Record<VehicleDocumentType, string> = {
  TECH_PASSPORT: 'Texnik pasport',
  INSURANCE: 'Sug‘urta polisi',
  TECH_INSPECTION: 'Texnik ko‘rik',
  PERMIT: 'Maxsus ruxsatnoma',
};

export const REQUIRED_DOCUMENT_TYPES: VehicleDocumentType[] = [
  VehicleDocumentType.TECH_PASSPORT,
  VehicleDocumentType.INSURANCE,
];

export const CARGO_TYPES = [
  'Qurilish materiallari',
  'Oziq-ovqat',
  'Metall',
  "To‘qimachilik",
  "Qishloq xo‘jaligi",
  'Aralash yuk',
  'Boshqa',
] as const;

export const CARGO_CODE_PREFIX = 'YC-';
export const PUBLISH_WINDOW_DAYS = 7;
