import { testDatabaseConnection } from "@/lib/db/test-connection";

async function main() {
  console.log("=================================================");
  console.log("   Supabase PostgreSQL Connection Diagnostic    ");
  console.log("=================================================");

  const result = await testDatabaseConnection();

  if (result.success) {
    console.log("Status: SUCCESS");
    console.log("Message:", result.message);
    if (result.details) {
      console.log("Database Time:", result.details.databaseTime);
      console.log("PostgreSQL Version:", result.details.postgresVersion);
      console.log("Tables Detected:", result.details.tablesFound?.join(", ") || "None");
      console.log("Supabase Host:", result.details.isSupabase ? "Yes" : "No");
    }
  } else {
    console.log("Status: CONNECTION PENDING / FAILED");
    console.log("Message:", result.message);
    if (result.error) {
      console.log("Diagnostic Code / Error:", result.error);
    }
    console.log("\nAction Required:");
    console.log("1. Open your .env file in the project root.");
    console.log("2. Set DATABASE_URL to your Supabase PostgreSQL connection string.");
    console.log(
      "   Format: postgresql://postgres.[project-ref]:[db-password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
    );
    console.log("3. (Optional) Set DIRECT_URL to the direct connection port (5432).");
  }
  console.log("=================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
