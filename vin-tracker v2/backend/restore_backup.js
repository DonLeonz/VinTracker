import { readFileSync } from 'fs';
import pool from './db/config.js';

async function restoreBackup() {
  try {
    console.log('📂 Leyendo archivo de backup...');
    const data = JSON.parse(readFileSync('./data_backup.json', 'utf8'));

    console.log(`\n📊 Datos encontrados:`);
    console.log(`   - Delivery: ${data.delivery.length} registros`);

    console.log('\n⚠️  ADVERTENCIA: Esto insertará los datos de DELIVERY del backup.');
    console.log('   Si hay VINs duplicados, se omitirán.\n');

    let deliveryInserted = 0;
    let deliverySkipped = 0;

    // Restore delivery records
    console.log('📦 Restaurando registros de Delivery...');
    for (const record of data.delivery) {
      try {
        // Check if VIN already exists
        const checkQuery = 'SELECT id FROM delivery_records WHERE vin = $1';
        const checkResult = await pool.query(checkQuery, [record.vin]);

        if (checkResult.rows.length > 0) {
          deliverySkipped++;
          continue;
        }

        // Insert record
        const insertQuery = `
          INSERT INTO delivery_records (vin, char_count, registered, repeat_count, created_at)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await pool.query(insertQuery, [
          record.vin,
          record.char_count,
          record.registered === 1,
          record.repeat_count,
          record.created_at
        ]);
        deliveryInserted++;
      } catch (error) {
        console.error(`   ❌ Error con VIN ${record.vin}:`, error.message);
        deliverySkipped++;
      }
    }

    console.log('\n✅ Restauración completada:');
    console.log(`   📦 Delivery: ${deliveryInserted} insertados, ${deliverySkipped} omitidos\n`);

  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

restoreBackup();
