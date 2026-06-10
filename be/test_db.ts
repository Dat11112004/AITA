import { prisma } from './src/database/prisma.js';

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('users length:', users.length);
  } catch (e) {
    console.error('DB ERROR:', e);
  }
}

main();
