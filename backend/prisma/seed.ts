import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const DEV_USER_ID = 'dev-user';
const DEV_USER_EMAIL = 'dev@propertypilot.local';
const DEV_USER_PASSWORD = 'dev1234';
const BCRYPT_COST = 12;

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(DEV_USER_PASSWORD, BCRYPT_COST);
    const user = await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      update: { passwordHash },
      create: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        passwordHash,
      },
    });
    console.log(
      `[seed] dev user ready: id=${user.id} email=${user.email} password=${DEV_USER_PASSWORD}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
