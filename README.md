# Yukchi API

NestJS + Prisma backend: OTP autentifikatsiya, yuk (cargo), takliflar, hujjatlar moderatsiyasi, chat va valyuta kurslari.

## Ishga tushirish

```bash
cp .env.example .env      # DATABASE_URL va secret kalitlarni to'ldiring
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Server `http://localhost:4000/api/v1` manzilida ishlaydi.

## Skriptlar

| Buyruq | Vazifa |
| --- | --- |
| `npm run start:dev` | ishlab chiqish rejimida |
| `npm run build` / `npm run start:prod` | build va production |
| `npm run prisma:migrate` | migratsiya |
| `npm run prisma:seed` | demo ma'lumot |

## Muhit o'zgaruvchilari

`.env.example` to'liq ro'yxatni beradi. `JWT_ACCESS_SECRET` va `OTP_HASH_SECRET` ni kriptoografik tasodifiy qiymat bilan generatsiya qiling:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

`EXPOSE_DEV_OTP=true` faqat local muhitda — OTP kodini javobda qaytaradi.
