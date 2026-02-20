import { readFileSync } from 'fs';
import pool from './db/config.js';

async function restoreBackup(filename = './data_backup.json') {
  try {
    console.log('📂 Leyendo archivo de backup...');
    const data = JSON.parse(readFileSync(filename, 'utf8'));

    console.log(`\n📊 Datos encontrados:`);
    console.log(`   - Delivery: ${data.delivery.length} registros`);
    console.log(`   - Service: ${data.service.length} registros`);
    
    if (data.metadata) {
      console.log(`   - Backup creado: ${new Date(data.metadata.created_at).toLocaleString('es-ES')}`);
    }

    console.log('\n⚠️  ADVERTENCIA: Esto insertará TODOS los datos del backup.');
    console.log('   Si hay VINs duplicados, se omitirán.\n');

    let deliveryInserted = 0;
    let deliverySkipped = 0;
    let serviceInserted = 0;
    let serviceSkipped = 0;

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

        // Insert record with all fields
        const insertQuery = `
          INSERT INTO delivery_records (
            vin, char_count, registered, repeat_count, 
            last_registered_at, created_at, updated_at,
            deleted, deleted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pool.query(insertQuery, [
          record.vin,
          record.char_count,
          record.registered === 1 || record.registered === true,
          record.repeat_count,
          record.last_registered_at || null,
          record.created_at,
          record.updated_at || record.created_at,
          record.deleted || false,
          record.deleted_at || null
        ]);
        deliveryInserted++;
      } catch (error) {
        console.error(`   ❌ Error con VIN ${record.vin}:`, error.message);
        deliverySkipped++;
      }
    }

    // Restore service records
    console.log('🔧 Restaurando registros de Service...');
    for (const record of data.service) {
      try {
        // Check if VIN already exists
        const checkQuery = 'SELECT id FROM service_records WHERE vin = $1';
        const checkResult = await pool.query(checkQuery, [record.vin]);

        if (checkResult.rows.length > 0) {
          serviceSkipped++;
          continue;
        }

        // Insert record with all fields
        const insertQuery = `
          INSERT INTO service_records (
            vin, char_count, registered, repeat_count, 
            last_registered_at, created_at, updated_at,
            deleted, deleted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pool.query(insertQuery, [
          record.vin,
          record.char_count,
          record.registered === 1 || record.registered === true,
          record.repeat_count,
          record.last_registered_at || null,
          record.created_at,
          record.updated_at || record.created_at,
          record.deleted || false,
          record.deleted_at || null
        ]);
        serviceInserted++;
      } catch (error) {
        console.error(`   ❌ Error con VIN ${record.vin}:`, error.message);
        serviceSkipped++;
      }
    }

    console.log('\n✅ Restauración completada:');
    console.log(`   📦 Delivery: ${deliveryInserted} insertados, ${deliverySkipped} omitidos`);
    console.log(`   🔧 Service: ${serviceInserted} insertados, ${serviceSkipped} omitidos\n`);

  } catch (error) {
    console.error('❌ Error durante la restauración:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

// Allow passing filename as argument: node restore_backup.js backup_2026-01-31.json
const filename = process.argv[2] || './data_backup.json';
restoreBackup(filename);
