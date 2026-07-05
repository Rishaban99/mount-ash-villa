import 'dotenv/config';
import { prisma } from '../lib/prisma';

const JOIN_DATE_BY_USERNAME: Record<string, string> = {
  rishaban: '2026-05-01',
  manager1: '2026-05-01',
  receptionist1: '2026-05-01',
  thomas_rep: '2026-05-10',
  emily_rep: '2026-08-01',
};

async function main() {
  let updated = 0;

  for (const [username, joinDate] of Object.entries(JOIN_DATE_BY_USERNAME)) {
    const result = await prisma.user.updateMany({
      where: { username },
      data: { joinDate },
    });
    if (result.count > 0) {
      console.log(`Set joinDate for ${username} -> ${joinDate} (${result.count} doc(s))`);
      updated += result.count;
    }
  }

  const remaining = await prisma.user.findMany({ where: { joinDate: null } });
  for (const user of remaining) {
    const result = await prisma.user.updateMany({
      where: { username: user.username },
      data: { joinDate: '2026-05-01' },
    });
    if (result.count > 0) {
      console.log(`Default joinDate for ${user.username} (${result.count} doc(s))`);
      updated += result.count;
    }
  }

  console.log(updated > 0 ? `Backfilled ${updated} document(s).` : 'All users already have joinDate.');
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
