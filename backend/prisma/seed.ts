import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { PrismaClient } from '@prisma/client';

const DEV_USER_ID = 'dev-user';
const DEV_USER_EMAIL = 'dev@propertypilot.local';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.upsert({
      where: { id: DEV_USER_ID },
      update: {},
      create: {
        id: DEV_USER_ID,
        email: DEV_USER_EMAIL,
        passwordHash: 'not-a-real-hash-pre-auth',
      },
    });
    console.log(`[seed] dev user ready: id=${user.id} email=${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
