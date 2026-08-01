/**
 * Idempotent backfill: for each property with no stay-fee rules, create a
 * year-round SIMPLE catch-all from legacy cleaningFee/securityDeposit columns
 * when those columns still exist.
 *
 * Prefer the SQL in migration `20260723220000_normalize_stay_fee_rules` for
 * deploy. This script is for manual/recovery use on DBs that still have the
 * legacy columns and empty rules table.
 *
 * Usage: pnpm --filter @repo/database backfill:stay-fee-rules
 */
import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const properties = await prisma.$queryRaw<
    Array<{ id: string; cleaningFee: number; securityDeposit: number }>
  >`
    SELECT id, "cleaningFee", "securityDeposit"
    FROM "properties"
  `.catch(async () => {
    console.log(
      'Legacy cleaningFee/securityDeposit columns are gone — nothing to backfill from Property.',
    );
    return [] as Array<{ id: string; cleaningFee: number; securityDeposit: number }>;
  });
  let created = 0;
  for (const property of properties) {
    const existing = await prisma.propertyStayFeeRule.count({
      where: { propertyId: property.id },
    });
    if (existing > 0) continue;
    await prisma.propertyStayFeeRule.create({
      data: {
        propertyId: property.id,
        dateFrom: null,
        dateTo: null,
        minNights: 1,
        maxNights: null,
        cleaningFee: property.cleaningFee,
        depositType: 'FIXED',
        depositValue: property.securityDeposit,
        sortOrder: 0,
      },
    });
    await prisma.property.update({
      where: { id: property.id },
      data: { stayFeeRulesMode: 'SIMPLE' },
    });
    created += 1;
  }
  console.log(`Backfill complete. Created ${created} catch-all stay fee rule(s).`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
