import "temporal-polyfill/full/global";
import { db } from "./prisma/db.js";

async function cleanup() {
  const query = db.raw.sql`
    DELETE FROM "application"
    WHERE "userId" IS NULL
  `
    .affectedCount()
    .build();

  const result =
    await db.runtime().execute(query);

  console.log(
    `Deleted ${result.affectedRows} orphan application(s).`
  );
}

cleanup()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Cleanup failed:", error);
    process.exit(1);
  });