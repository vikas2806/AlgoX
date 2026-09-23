import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const name = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password || !name) {
    console.error('Error: ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in environment variables.');
    process.exit(1);
  }

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingAdmin) {
    console.log(`Bootstrap admin account (${email}) already exists.`);
    return;
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await prisma.admin.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log(`Successfully created bootstrap ADMIN account for email: ${email}`);
}

main()
  .catch((e) => {
    console.error('Error seeding bootstrap admin account:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
