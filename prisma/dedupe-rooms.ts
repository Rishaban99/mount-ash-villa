import { prisma } from '../lib/prisma';
import { dedupeRoomsInDb } from '../lib/db';

async function main() {
  await prisma.$connect();
  console.log('Deduplicating rooms by roomNumber...');
  await dedupeRoomsInDb();
  const count = await prisma.room.count();
  console.log(`Done. ${count} room document(s) remain.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
