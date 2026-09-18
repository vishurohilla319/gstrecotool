import { seedDemoData } from "../lib/seed-data";

async function main() {
  console.log("Seeding Neon database with demo data...");
  const result = await seedDemoData();
  console.log("Neon database seeded successfully!", result);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  });
