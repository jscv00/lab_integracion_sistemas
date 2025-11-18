// Script para probar la conexión a la base de datos
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});

async function testConnection() {
  console.log("🔍 Probando conexión a PostgreSQL...\n");
  console.log("Configuración:");
  console.log(`  Host: ${process.env.PGHOST}`);
  console.log(`  Port: ${process.env.PGPORT}`);
  console.log(`  Database: ${process.env.PGDATABASE}`);
  console.log(`  User: ${process.env.PGUSER}`);
  console.log("");

  try {
    // Probar conexión
    const client = await pool.connect();
    console.log("✅ Conexión exitosa a PostgreSQL\n");

    // Verificar tablas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log("📋 Tablas encontradas:");
    if (tablesResult.rows.length === 0) {
      console.log("  ⚠️  No hay tablas. Ejecuta setup-database.sql");
    } else {
      tablesResult.rows.forEach((row) => {
        console.log(`  - ${row.table_name}`);
      });
    }
    console.log("");

    // Contar registros
    if (tablesResult.rows.some((r) => r.table_name === "plants")) {
      const plantsCount = await client.query("SELECT COUNT(*) FROM plants");
      console.log(`🌱 Total de plantas: ${plantsCount.rows[0].count}`);
    }

    if (tablesResult.rows.some((r) => r.table_name === "plant_activities")) {
      const activitiesCount = await client.query(
        "SELECT COUNT(*) FROM plant_activities"
      );
      console.log(`📝 Total de actividades: ${activitiesCount.rows[0].count}`);
    }

    client.release();
    console.log("\n✨ Todo está funcionando correctamente!");
  } catch (error) {
    console.error("❌ Error de conexión:", error.message);
    console.log("\n💡 Posibles soluciones:");
    console.log("  1. Verifica que PostgreSQL esté corriendo");
    console.log("  2. Verifica las credenciales en el archivo .env");
    console.log('  3. Asegúrate de que la base de datos "dev_db" exista');
    console.log("  4. Revisa SETUP-INSTRUCTIONS.md para más ayuda");
  } finally {
    await pool.end();
  }
}

testConnection();
