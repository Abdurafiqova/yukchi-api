import {
  CargoStatus,
  PrismaClient,
  UserRole,
  VehicleStatus,
  VehicleType,
} from '@prisma/client';

const prisma = new PrismaClient();

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const CITIES = [
  { id: 'toshkent', name: 'Toshkent', region: 'Toshkent shahri', lat: 41.3111, lng: 69.2797 },
  { id: 'samarqand', name: 'Samarqand', region: 'Samarqand viloyati', lat: 39.6542, lng: 66.9597 },
  { id: 'buxoro', name: 'Buxoro', region: 'Buxoro viloyati', lat: 39.7747, lng: 64.4286 },
  { id: 'jizzax', name: 'Jizzax', region: 'Jizzax viloyati', lat: 40.1158, lng: 67.8422 },
  { id: 'fargona', name: "Farg'ona", region: "Farg'ona viloyati", lat: 40.3864, lng: 71.7864 },
  { id: 'andijon', name: 'Andijon', region: 'Andijon viloyati', lat: 40.7829, lng: 72.3442 },
  { id: 'namangan', name: 'Namangan', region: 'Namangan viloyati', lat: 41.0011, lng: 71.6673 },
  { id: 'nukus', name: 'Nukus', region: "Qoraqalpog'iston", lat: 42.4531, lng: 59.6103 },
  { id: 'termiz', name: 'Termiz', region: 'Surxondaryo viloyati', lat: 37.2242, lng: 67.2783 },
  { id: 'qarshi', name: 'Qarshi', region: 'Qashqadaryo viloyati', lat: 38.8606, lng: 65.7891 },
  { id: 'navoiy', name: 'Navoiy', region: 'Navoiy viloyati', lat: 40.0844, lng: 65.3792 },
  { id: 'xorazm', name: 'Xorazm', region: 'Xorazm viloyati', lat: 41.5506, lng: 60.6316 },
] as const;

type CityName = (typeof CITIES)[number]['name'];

const OWNERS = [
  {
    key: 'rustam',
    phone: '+998712001122',
    fullName: 'Rustam Karimov',
    companyName: 'Karimov Logistics',
    rating: 4.9,
    ratingCount: 124,
  },
  {
    key: 'gulnora',
    phone: '+998902446510',
    fullName: 'Gulnora Yusupova',
    companyName: 'Yusupova Agro',
    rating: 4.8,
    ratingCount: 58,
  },
  {
    key: 'sardor',
    phone: '+998938102344',
    fullName: 'Sardor Bekmurodov',
    companyName: 'Bek Metal',
    rating: 4.7,
    ratingCount: 31,
  },
  {
    key: 'dilnoza',
    phone: '+998712330891',
    fullName: 'Dilnoza Karimova',
    companyName: null,
    rating: 5.0,
    ratingCount: 87,
  },
  {
    key: 'bekzod',
    phone: '+998975127760',
    fullName: 'Bekzod Toshpulatov',
    companyName: 'Toshpulatov Qurilish',
    rating: 4.6,
    ratingCount: 44,
  },
  {
    key: 'malika',
    phone: '+998909013418',
    fullName: 'Malika Azimova',
    companyName: 'Azim Textile',
    rating: 4.9,
    ratingCount: 62,
  },
  {
    key: 'otabek',
    phone: '+998913456627',
    fullName: 'Otabek Rasulov',
    companyName: null,
    rating: 4.8,
    ratingCount: 39,
  },
] as const;

type OwnerKey = (typeof OWNERS)[number]['key'];

interface SeedCargo {
  code: string;
  owner: OwnerKey;
  title: string;
  description: string;
  cargoType: string;
  weightKg: number;
  volumeM3: number;
  vehicleType: VehicleType;
  price: number;
  priceNegotiable: boolean;
  pickupCity: CityName;
  pickupAddress: string;
  dropoffCity: CityName;
  dropoffAddress: string;
  pickupInDays: number;
  publishedHoursAgo: number | null;
  status: CargoStatus;
  viewCount: number;
  images: { file: 'cement' | 'produce' | 'steel' | 'truck'; alt: string }[];
}

const CARGOS: SeedCargo[] = [
  {
    code: 'YC-1042',
    owner: 'rustam',
    title: '20 t tsement',
    description:
      "Tsement qoplar palletlarda, har biri 50 kg. Omborda forklift bilan yuklanadi. Yo'lda brezent (tent) zarur. Yuklash ertaga 14:00 da boshlanadi.",
    cargoType: 'Qurilish materiallari',
    weightKg: 20000,
    volumeM3: 80,
    vehicleType: VehicleType.TENT,
    price: 5000000,
    priceNegotiable: true,
    pickupCity: 'Toshkent',
    pickupAddress: 'Chorsu bozori, Toshkent',
    dropoffCity: 'Samarqand',
    dropoffAddress: 'Registon ko‘chasi, Samarqand',
    pickupInDays: 1,
    publishedHoursAgo: 9,
    status: CargoStatus.PUBLISHED,
    viewCount: 214,
    images: [
      { file: 'cement', alt: 'Palletlarda tsement qoplari' },
      { file: 'truck', alt: 'Magistralda ketayotgan yuk mashinasi' },
      { file: 'steel', alt: 'Platformali yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1041',
    owner: 'gulnora',
    title: '12 t tarvuz',
    description:
      "Yangi uzilgan tarvuzlar yashiklarda. Refrijerator +6 °C da bo'lishi shart. Yuklash ertalab 06:00 da boshlanadi, hududda tungi to'xtash taqiqlangan.",
    cargoType: 'Oziq-ovqat',
    weightKg: 12000,
    volumeM3: 45,
    vehicleType: VehicleType.REFRIGERATED,
    price: 2400000,
    priceNegotiable: false,
    pickupCity: 'Jizzax',
    pickupAddress: "G'allaorol bozori, Jizzax",
    dropoffCity: 'Toshkent',
    dropoffAddress: 'Abu Sahiy bozori, Toshkent',
    pickupInDays: 1,
    publishedHoursAgo: 10,
    status: CargoStatus.PUBLISHED,
    viewCount: 168,
    images: [
      { file: 'produce', alt: 'Yuk ortilgan yuk mashinalari' },
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1039',
    owner: 'sardor',
    title: "22 t po'lat o'ramlar",
    description:
      "O'ramlar bog'langan va yuklashga tayyor. Yon taxtali platforma kerak. Yuklash kran bilan, joyida 40 daqiqa.",
    cargoType: 'Metall',
    weightKg: 22000,
    volumeM3: 30,
    vehicleType: VehicleType.FLATBED,
    price: 7800000,
    priceNegotiable: true,
    pickupCity: 'Toshkent',
    pickupAddress: "O'zbekiston metallurgiya zavodi, Toshkent",
    dropoffCity: 'Buxoro',
    dropoffAddress: 'Buxoro sanoat zonasi',
    pickupInDays: 2,
    publishedHoursAgo: 12,
    status: CargoStatus.PUBLISHED,
    viewCount: 132,
    images: [
      { file: 'steel', alt: "Cho'l yo'lida platformali yuk mashinasi" },
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1037',
    owner: 'dilnoza',
    title: '15 t aralash yuk',
    description:
      "12 palletda maishiy buyumlar. Xavfli yuklar yo'q. Brezent va bog'ichlar kerak. Darvoza 20:00 da yopiladi.",
    cargoType: 'Aralash yuk',
    weightKg: 15000,
    volumeM3: 60,
    vehicleType: VehicleType.TENT,
    price: 4100000,
    priceNegotiable: true,
    pickupCity: "Farg'ona",
    pickupAddress: "Qo'qon yo'li ombori, Farg'ona",
    dropoffCity: 'Toshkent',
    dropoffAddress: 'Sergeli logistika markazi, Toshkent',
    pickupInDays: 1,
    publishedHoursAgo: 26,
    status: CargoStatus.PUBLISHED,
    viewCount: 301,
    images: [
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
      { file: 'cement', alt: 'Palletlarda yuk' },
    ],
  },
  {
    code: 'YC-1036',
    owner: 'rustam',
    title: '18 t un',
    description:
      "Un qoplari 25 kg dan, 720 qop. Ochiq havo ta'siridan himoya qilish kerak. Yuklash sexda, qo'lda va forklift bilan.",
    cargoType: 'Oziq-ovqat',
    weightKg: 18000,
    volumeM3: 55,
    vehicleType: VehicleType.TENT,
    price: 6200000,
    priceNegotiable: false,
    pickupCity: 'Toshkent',
    pickupAddress: 'Yunusobod tarmoq ombori, Toshkent',
    dropoffCity: 'Nukus',
    dropoffAddress: 'Nukus don mahsulotlari bazasi',
    pickupInDays: 3,
    publishedHoursAgo: 30,
    status: CargoStatus.PUBLISHED,
    viewCount: 187,
    images: [
      { file: 'produce', alt: 'Ombordagi yuk' },
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1034',
    owner: 'bekzod',
    title: "24 t shag'al",
    description:
      "Karyerdan shag'al. Samosval kerak, yon tomonlari mustahkam bo'lishi lozim. Yuklash ekskavator bilan.",
    cargoType: 'Qurilish materiallari',
    weightKg: 24000,
    volumeM3: 18,
    vehicleType: VehicleType.TIPPER,
    price: 3900000,
    priceNegotiable: true,
    pickupCity: 'Samarqand',
    pickupAddress: 'Urgut yo‘li karyeri, Samarqand',
    dropoffCity: 'Toshkent',
    dropoffAddress: 'Bektemir qurilish maydoni, Toshkent',
    pickupInDays: 2,
    publishedHoursAgo: 40,
    status: CargoStatus.PUBLISHED,
    viewCount: 96,
    images: [
      { file: 'steel', alt: "Cho'l yo'lida yuk mashinasi" },
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1032',
    owner: 'malika',
    title: "9 t to'qimachilik",
    description:
      'Rulonlardagi mato, 60 rulon. Namlikdan himoya qilinishi kerak. Yuklash omborda, palletlarda.',
    cargoType: "To'qimachilik",
    weightKg: 9000,
    volumeM3: 34,
    vehicleType: VehicleType.TENT,
    price: 3300000,
    priceNegotiable: true,
    pickupCity: 'Toshkent',
    pickupAddress: 'Chilonzor to‘qimachilik ombori, Toshkent',
    dropoffCity: 'Andijon',
    dropoffAddress: 'Andijon markaziy bozori',
    pickupInDays: 4,
    publishedHoursAgo: 48,
    status: CargoStatus.PUBLISHED,
    viewCount: 154,
    images: [
      { file: 'produce', alt: 'Ombordagi yuk' },
      { file: 'cement', alt: 'Palletlarda yuk' },
    ],
  },
  {
    code: 'YC-1030',
    owner: 'otabek',
    title: "16 t g'isht",
    description:
      "Qizil g'isht palletlarda. Platforma yoki tentli mashina. Yuklash ertalab 08:00 da, joyida 1 soat.",
    cargoType: 'Qurilish materiallari',
    weightKg: 16000,
    volumeM3: 22,
    vehicleType: VehicleType.FLATBED,
    price: 2700000,
    priceNegotiable: false,
    pickupCity: 'Buxoro',
    pickupAddress: 'G‘ijduvon g‘isht zavodi, Buxoro',
    dropoffCity: 'Samarqand',
    dropoffAddress: 'Samarqand qurilish bazasi',
    pickupInDays: 3,
    publishedHoursAgo: 56,
    status: CargoStatus.PUBLISHED,
    viewCount: 88,
    images: [
      { file: 'cement', alt: 'Palletlarda yuk' },
      { file: 'steel', alt: 'Platformali yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1028',
    owner: 'malika',
    title: '25 t paxta',
    description:
      'Presslangan paxta toylari. Platforma, yon tomonlari baland. Yuklash zavod hududida, ruxsatnoma talab qilinadi.',
    cargoType: 'Qishloq xo‘jaligi',
    weightKg: 25000,
    volumeM3: 90,
    vehicleType: VehicleType.FLATBED,
    price: 8400000,
    priceNegotiable: true,
    pickupCity: 'Andijon',
    pickupAddress: 'Paxta tozalash zavodi, Andijon',
    dropoffCity: 'Termiz',
    dropoffAddress: 'Termiz logistika markazi',
    pickupInDays: 5,
    publishedHoursAgo: 64,
    status: CargoStatus.PUBLISHED,
    viewCount: 121,
    images: [
      { file: 'produce', alt: 'Yuk ortilgan mashina' },
      { file: 'truck', alt: 'Magistralda yuk mashinasi' },
    ],
  },
  {
    code: 'YC-1026',
    owner: 'gulnora',
    title: '14 t meva-sabzavot',
    description:
      "Bozor uchun meva-sabzavot. Harorat +4 °C. Yuklash tunda, 02:00 da. Yo'lda muzlatish rejimi uzluksiz bo'lishi kerak.",
    cargoType: 'Oziq-ovqat',
    weightKg: 14000,
    volumeM3: 48,
    vehicleType: VehicleType.REFRIGERATED,
    price: 3600000,
    priceNegotiable: true,
    pickupCity: "Farg'ona",
    pickupAddress: 'Quva bozori, Farg‘ona',
    dropoffCity: 'Toshkent',
    dropoffAddress: 'Chorsu bozori, Toshkent',
    pickupInDays: 1,
    publishedHoursAgo: 72,
    status: CargoStatus.PUBLISHED,
    viewCount: 143,
    images: [
      { file: 'produce', alt: 'Yuk ortilgan mashina' },
      { file: 'cement', alt: 'Palletlarda yuk' },
    ],
  },
  {
    code: 'YC-1044',
    owner: 'dilnoza',
    title: '7 t mebel',
    description:
      'Yig‘ilgan mebel, 40 ta katta quti. Yuklash ertalab. Brezent va yumshoq yostiqchalar kerak.',
    cargoType: 'Aralash yuk',
    weightKg: 7000,
    volumeM3: 52,
    vehicleType: VehicleType.TENT,
    price: 2900000,
    priceNegotiable: false,
    pickupCity: 'Toshkent',
    pickupAddress: 'Uchtepa mebel bozori, Toshkent',
    dropoffCity: 'Namangan',
    dropoffAddress: 'Namangan markaziy ombori',
    pickupInDays: 2,
    publishedHoursAgo: null,
    status: CargoStatus.PENDING_REVIEW,
    viewCount: 0,
    images: [{ file: 'truck', alt: 'Yuk mashinasi' }],
  },
  {
    code: 'YC-1043',
    owner: 'otabek',
    title: '11 t sement bloklari',
    description: 'Palletlarda sement bloklari. Forklift bilan yuklanadi. Platforma yetarli.',
    cargoType: 'Qurilish materiallari',
    weightKg: 11000,
    volumeM3: 26,
    vehicleType: VehicleType.FLATBED,
    price: 3200000,
    priceNegotiable: true,
    pickupCity: 'Navoiy',
    pickupAddress: 'Navoiy qurilish bazasi',
    dropoffCity: 'Qarshi',
    dropoffAddress: 'Qarshi qurilish maydoni',
    pickupInDays: 3,
    publishedHoursAgo: null,
    status: CargoStatus.PENDING_REVIEW,
    viewCount: 0,
    images: [{ file: 'cement', alt: 'Sement bloklari' }],
  },
  {
    code: 'YC-1045',
    owner: 'rustam',
    title: '5 t kafel',
    description: 'Qoralama: kafel palletlarda, namlikdan himoya kerak.',
    cargoType: 'Qurilish materiallari',
    weightKg: 5000,
    volumeM3: 14,
    vehicleType: VehicleType.TENT,
    price: 1800000,
    priceNegotiable: true,
    pickupCity: 'Toshkent',
    pickupAddress: 'Yunusobod ombori, Toshkent',
    dropoffCity: 'Xorazm',
    dropoffAddress: 'Urganch qurilish bazasi',
    pickupInDays: 6,
    publishedHoursAgo: null,
    status: CargoStatus.DRAFT,
    viewCount: 0,
    images: [],
  },
];

async function main() {
  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { id: city.id },
      create: city,
      update: {
        name: city.name,
        region: city.region,
        lat: city.lat,
        lng: city.lng,
        isActive: true,
      },
    });
  }

  await prisma.user.upsert({
    where: { phone: '+998900000001' },
    create: {
      phone: '+998900000001',
      fullName: 'Yukchi Admin',
      role: UserRole.ADMIN,
    },
    update: { role: UserRole.ADMIN, status: 'ACTIVE', fullName: 'Yukchi Admin' },
  });

  const ownerIds = new Map<OwnerKey, string>();

  for (const owner of OWNERS) {
    const user = await prisma.user.upsert({
      where: { phone: owner.phone },
      create: {
        phone: owner.phone,
        fullName: owner.fullName,
        companyName: owner.companyName,
        role: UserRole.CARGO_OWNER,
        rating: owner.rating,
        ratingCount: owner.ratingCount,
      },
      update: {
        fullName: owner.fullName,
        companyName: owner.companyName,
        rating: owner.rating,
        ratingCount: owner.ratingCount,
      },
    });
    ownerIds.set(owner.key, user.id);
  }

  const driver = await prisma.user.upsert({
    where: { phone: '+998935550101' },
    create: {
      phone: '+998935550101',
      fullName: 'Aziz Rahimov',
      role: UserRole.DRIVER,
      rating: 4.8,
      ratingCount: 27,
    },
    update: { role: UserRole.DRIVER },
  });

  const driverVehicle = await prisma.vehicle.upsert({
    where: { userId_plateNumber: { userId: driver.id, plateNumber: '01A777BA' } },
    create: {
      userId: driver.id,
      plateNumber: '01A777BA',
      vehicleType: VehicleType.TENT,
      capacityKg: 24000,
      bodyVolumeM3: 82,
      status: VehicleStatus.ACTIVE,
    },
    update: { status: VehicleStatus.ACTIVE },
  });

  const now = Date.now();

  for (const cargo of CARGOS) {
    const ownerId = ownerIds.get(cargo.owner);
    if (!ownerId) throw new Error(`Owner topilmadi: ${cargo.owner}`);

    const existing = await prisma.cargo.findUnique({ where: { code: cargo.code } });
    if (existing) continue;

    const pickupDate = new Date(now + cargo.pickupInDays * DAY_MS);
    pickupDate.setHours(9, 0, 0, 0);

    const publishedAt =
      cargo.publishedHoursAgo === null ? null : new Date(now - cargo.publishedHoursAgo * HOUR_MS);
    const expiresAt = publishedAt
      ? new Date(publishedAt.getTime() + 7 * DAY_MS)
      : new Date(pickupDate.getTime() + 7 * DAY_MS);

    const created = await prisma.cargo.create({
      data: {
        code: cargo.code,
        ownerId,
        title: cargo.title,
        description: cargo.description,
        cargoType: cargo.cargoType,
        weightKg: cargo.weightKg,
        volumeM3: cargo.volumeM3,
        vehicleType: cargo.vehicleType,
        price: cargo.price,
        priceNegotiable: cargo.priceNegotiable,
        status: cargo.status,
        pickupCity: cargo.pickupCity,
        pickupAddress: cargo.pickupAddress,
        dropoffCity: cargo.dropoffCity,
        dropoffAddress: cargo.dropoffAddress,
        pickupDate,
        publishedAt,
        expiresAt,
        viewCount: cargo.viewCount,
        images: cargo.images.length
          ? {
              create: cargo.images.map((image, index) => ({
                url: `/stock/${image.file}.jpg`,
                alt: image.alt,
                sortOrder: index,
              })),
            }
          : undefined,
      },
    });

    const pickup = CITIES.find((city) => city.name === cargo.pickupCity);
    const dropoff = CITIES.find((city) => city.name === cargo.dropoffCity);

    if (pickup && dropoff) {
      await prisma.$executeRaw`
        UPDATE cargos
        SET pickup_point = ST_SetSRID(ST_MakePoint(${pickup.lng}, ${pickup.lat}), 4326)::geography,
            dropoff_point = ST_SetSRID(ST_MakePoint(${dropoff.lng}, ${dropoff.lat}), 4326)::geography
        WHERE id = ${created.id}::uuid
      `;
    }
  }

  const firstCargo = await prisma.cargo.findUnique({ where: { code: 'YC-1042' } });
  if (firstCargo) {
    await prisma.offer.upsert({
      where: { cargoId_driverId: { cargoId: firstCargo.id, driverId: driver.id } },
      create: {
        cargoId: firstCargo.id,
        driverId: driver.id,
        vehicleId: driverVehicle.id,
        price: 4_700_000,
        message: 'Ertaga 14:00 da yetib boraman, tentli 24 tonnalik mashina.',
        status: 'PENDING',
      },
      update: {},
    });

    const offerCount = await prisma.offer.count({ where: { cargoId: firstCargo.id } });
    await prisma.cargo.update({ where: { id: firstCargo.id }, data: { offerCount } });
  }

  const [cities, users, cargos] = await Promise.all([
    prisma.city.count(),
    prisma.user.count(),
    prisma.cargo.count(),
  ]);

  console.log(`Seed tugadi: ${cities} shahar, ${users} foydalanuvchi, ${cargos} e’lon`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
