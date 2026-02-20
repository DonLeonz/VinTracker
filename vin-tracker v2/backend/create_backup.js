import { writeFileSync } from 'fs';
import pool from './db/config.js';

async function createBackup() {
  try {
    console.log('🔄 Iniciando backup de la base de datos...\n');

    const backup = {
      metadata: {
        created_at: new Date().toISOString(),
        database: process.env.DB_DATABASE || 'vin_tracker',
        version: '2.0',
        description: 'Backup completo de VIN Tracker - Migrando a Linux'
      },
      delivery: [],
      service: []
    };

    // Backup delivery_records
    console.log('📦 Exportando registros de Delivery...');
    const deliveryQuery = `
      SELECT 
        id, vin, char_count, registered, repeat_count, 
        last_registered_at, created_at, updated_at, 
        deleted, deleted_at
      FROM delivery_records 
      ORDER BY id
    `;
    const deliveryResult = await pool.query(deliveryQuery);
    backup.delivery = deliveryResult.rows;
    console.log(`   ✅ ${deliveryResult.rows.length} registros exportados`);

    // Backup service_records
    console.log('📦 Exportando registros de Service...');
    const serviceQuery = `
      SELECT 
        id, vin, char_count, registered, repeat_count, 
        last_registered_at, created_at, updated_at,
        deleted, deleted_at
      FROM service_records 
      ORDER BY id
    `;
    const serviceResult = await pool.query(serviceQuery);
    backup.service = serviceResult.rows;
    console.log(`   ✅ ${serviceResult.rows.length} registros exportados`);

    // Save backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_${timestamp}.json`;
    const filepath = `./${filename}`;
    
    writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf8');
    
    // Also create/update the default backup file
    writeFileSync('./data_backup.json', JSON.stringify(backup, null, 2), 'utf8');

    console.log('\n✅ Backup completado exitosamente!');
    console.log('\n📄 Archivos creados:');
    console.log(`   • ${filename} (backup con fecha)`);
    console.log(`   • data_backup.json (backup por defecto)`);
    
    console.log('\n📊 Resumen del backup:');
    console.log(`   • Database: ${backup.metadata.database}`);
    console.log(`   • Fecha: ${new Date(backup.metadata.created_at).toLocaleString('es-ES')}`);
    console.log(`   • Delivery records: ${backup.delivery.length}`);
    console.log(`   • Service records: ${backup.service.length}`);
    console.log(`   • Total: ${backup.delivery.length + backup.service.length} registros`);
    
    console.log('\n💾 Para restaurar en Linux:');
    console.log('   1. Copia los archivos JSON a tu nuevo sistema');
    console.log('   2. Configura PostgreSQL en Linux');
    console.log('   3. Ejecuta: node restore_backup.js');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error durante el backup:', error);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

createBackup();
