import pool from '../db/config.js';

// Helper function to get table name
const getTableName = (type) => {
  return type === 'delivery' ? 'delivery_records' : 'service_records';
};

// Helper function to process VIN (convert O to 0)
const processVin = (vin) => {
  return vin.toUpperCase().replace(/O/g, '0');
};

// Get all records
export const getRecords = async (req, res) => {
  try {
    const { date, registered } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      whereConditions.push(`DATE(created_at) = $${paramCount}`);
      params.push(date);
    }

    if (registered === 'registered') {
      whereConditions.push('registered = true');
    } else if (registered === 'not_registered') {
      whereConditions.push('registered = false');
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get delivery records
    const deliveryQuery = `SELECT * FROM delivery_records ${whereClause} ORDER BY id ASC`;
    const deliveryResult = await pool.query(deliveryQuery, params);

    // Get service records
    const serviceQuery = `SELECT * FROM service_records ${whereClause} ORDER BY id ASC`;
    const serviceResult = await pool.query(serviceQuery, params);

    // Add counter to each record
    const deliveryRecords = deliveryResult.rows.map((record, index) => ({
      ...record,
      counter: index + 1,
      type: 'delivery'
    }));

    const serviceRecords = serviceResult.rows.map((record, index) => ({
      ...record,
      counter: index + 1,
      type: 'service'
    }));

    res.json({
      success: true,
      delivery: deliveryRecords,
      service: serviceRecords
    });
  } catch (error) {
    console.error('Error getting records:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add VIN
export const addVin = async (req, res) => {
  try {
    let { vin, type } = req.body;

    if (!vin) {
      return res.status(400).json({ success: false, message: 'VIN no puede estar vacío' });
    }

    // Process VIN
    vin = processVin(vin);
    const charCount = vin.length;

    // Validate VIN length (17 characters)
    if (charCount !== 17) {
      return res.status(400).json({
        success: false,
        message: `El VIN debe tener exactamente 17 caracteres (tiene ${charCount})`
      });
    }

    const tableName = getTableName(type);

    // Check if VIN already exists
    const checkQuery = `SELECT id, repeat_count, created_at, registered FROM ${tableName} WHERE vin = $1`;
    const checkResult = await pool.query(checkQuery, [vin]);

    if (checkResult.rows.length > 0) {
      const existing = checkResult.rows[0];

      // If VIN exists but is not registered
      if (!existing.registered) {
        return res.status(409).json({
          success: false,
          is_duplicate: true,
          is_not_registered: true,
          message: 'Este VIN ya está en la base de datos pero NO está registrado todavía',
          existing_id: existing.id
        });
      }

      // If VIN exists and is registered
      return res.status(409).json({
        success: false,
        is_duplicate: true,
        is_not_registered: false,
        message: `Este VIN ya existe en ${type} (ID: ${existing.id})`,
        existing_id: existing.id,
        existing_type: type,
        repeat_count: existing.repeat_count,
        created_at: existing.created_at
      });
    }

    // Insert new VIN
    const insertQuery = `
      INSERT INTO ${tableName} (vin, char_count, registered, repeat_count)
      VALUES ($1, $2, false, 0)
      RETURNING *
    `;
    const result = await pool.query(insertQuery, [vin, charCount]);

    res.json({
      success: true,
      message: 'VIN agregado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add repeated VIN
export const addRepeatedVin = async (req, res) => {
  try {
    let { vin, type } = req.body;

    if (!vin) {
      return res.status(400).json({ success: false, message: 'VIN no puede estar vacío' });
    }

    vin = processVin(vin);
    const tableName = getTableName(type);

    // Find existing VIN
    const checkQuery = `SELECT id, repeat_count FROM ${tableName} WHERE vin = $1`;
    const checkResult = await pool.query(checkQuery, [vin]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `VIN no encontrado en ${type}. Usa la función agregar normal.`
      });
    }

    const existing = checkResult.rows[0];
    const newRepeatCount = existing.repeat_count + 1;

    // Update repeat count and last_repeated_at
    const updateQuery = `
      UPDATE ${tableName}
      SET repeat_count = $1, last_repeated_at = CURRENT_TIMESTAMP, registered = false
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [newRepeatCount, existing.id]);

    res.json({
      success: true,
      message: `VIN marcado como repetido (Repetición #${newRepeatCount})`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding repeated VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update VIN
export const updateVin = async (req, res) => {
  try {
    const { id, type } = req.body;
    let { vin } = req.body;

    if (!vin) {
      return res.status(400).json({ success: false, message: 'VIN no puede estar vacío' });
    }

    vin = processVin(vin);
    const charCount = vin.length;

    // Validate VIN length
    if (charCount !== 17) {
      return res.status(400).json({
        success: false,
        message: `El VIN debe tener exactamente 17 caracteres (tiene ${charCount})`
      });
    }

    const tableName = getTableName(type);

    // Check if VIN exists in another record
    const checkQuery = `SELECT id FROM ${tableName} WHERE vin = $1 AND id != $2`;
    const checkResult = await pool.query(checkQuery, [vin, id]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Este VIN ya existe en otro registro de ${type}`
      });
    }

    // Update VIN
    const updateQuery = `
      UPDATE ${tableName}
      SET vin = $1, char_count = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [vin, charCount, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    res.json({
      success: true,
      message: 'VIN actualizado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete VIN
export const deleteVin = async (req, res) => {
  try {
    const { id, type } = req.body;

    if (!id || !type) {
      return res.status(400).json({
        success: false,
        message: 'ID y tipo son requeridos'
      });
    }

    const tableName = getTableName(type);

    const deleteQuery = `DELETE FROM ${tableName} WHERE id = $1 RETURNING *`;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    res.json({
      success: true,
      message: 'VIN eliminado correctamente'
    });
  } catch (error) {
    console.error('Error deleting VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle registered status
export const toggleRegistered = async (req, res) => {
  try {
    const { id, type } = req.body;

    if (!id || !type) {
      return res.status(400).json({
        success: false,
        message: 'ID y tipo son requeridos'
      });
    }

    const tableName = getTableName(type);

    // Get current status
    const getQuery = `SELECT registered FROM ${tableName} WHERE id = $1`;
    const getResult = await pool.query(getQuery, [id]);

    if (getResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    const newStatus = !getResult.rows[0].registered;

    // Update status
    const updateQuery = `
      UPDATE ${tableName}
      SET registered = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(updateQuery, [newStatus, id]);

    res.json({
      success: true,
      registered: newStatus,
      message: newStatus ? 'VIN marcado como registrado' : 'VIN marcado como no registrado',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling registered:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register all
export const registerAll = async (req, res) => {
  try {
    const { type } = req.body;

    if (type === 'all') {
      const query1 = `UPDATE delivery_records SET registered = true WHERE registered = false`;
      const query2 = `UPDATE service_records SET registered = true WHERE registered = false`;

      const result1 = await pool.query(query1);
      const result2 = await pool.query(query2);

      const affected = result1.rowCount + result2.rowCount;

      return res.json({
        success: true,
        message: `Se registraron ${affected} VINs correctamente`
      });
    }

    const tableName = getTableName(type);
    const query = `UPDATE ${tableName} SET registered = true WHERE registered = false`;
    const result = await pool.query(query);

    res.json({
      success: true,
      message: `Se registraron ${result.rowCount} VINs correctamente`
    });
  } catch (error) {
    console.error('Error registering all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unregister all
export const unregisterAll = async (req, res) => {
  try {
    const { type } = req.body;

    if (type === 'all') {
      const query1 = `UPDATE delivery_records SET registered = false WHERE registered = true`;
      const query2 = `UPDATE service_records SET registered = false WHERE registered = true`;

      const result1 = await pool.query(query1);
      const result2 = await pool.query(query2);

      const affected = result1.rowCount + result2.rowCount;

      return res.json({
        success: true,
        message: `Se desregistraron ${affected} VINs correctamente`
      });
    }

    const tableName = getTableName(type);
    const query = `UPDATE ${tableName} SET registered = false WHERE registered = true`;
    const result = await pool.query(query);

    res.json({
      success: true,
      message: `Se desregistraron ${result.rowCount} VINs correctamente`
    });
  } catch (error) {
    console.error('Error unregistering all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export data
export const exportData = async (req, res) => {
  try {
    const { type, date } = req.query;

    let whereConditions = ['registered = false'];
    let params = [];
    let paramCount = 0;

    if (date) {
      paramCount++;
      whereConditions.push(`DATE(created_at) = $${paramCount}`);
      params.push(date);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    let deliveryVins = [];
    let serviceVins = [];

    if (type === 'all' || type === 'delivery') {
      const query = `
        SELECT vin, repeat_count, last_repeated_at, created_at
        FROM delivery_records ${whereClause}
        ORDER BY id ASC
      `;
      const result = await pool.query(query, params);

      deliveryVins = result.rows.map(record => {
        let vinLine = record.vin;
        if (record.repeat_count > 0) {
          const dateToShow = record.last_repeated_at || record.created_at;
          const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
          vinLine += ` - Última repetición: ${formattedDate}`;
        }
        return vinLine;
      });
    }

    if (type === 'all' || type === 'service') {
      const query = `
        SELECT vin, repeat_count, last_repeated_at, created_at
        FROM service_records ${whereClause}
        ORDER BY id ASC
      `;
      const result = await pool.query(query, params);

      serviceVins = result.rows.map(record => {
        let vinLine = record.vin;
        if (record.repeat_count > 0) {
          const dateToShow = record.last_repeated_at || record.created_at;
          const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
          vinLine += ` - Última repetición: ${formattedDate}`;
        }
        return vinLine;
      });
    }

    if (deliveryVins.length === 0 && serviceVins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No hay VINs sin registrar para exportar'
      });
    }

    let textContent = '';

    if (deliveryVins.length > 0) {
      textContent += 'Deliverys\n';
      textContent += deliveryVins.join('\n') + '\n\n';
    }

    if (serviceVins.length > 0) {
      textContent += 'Services\n';
      textContent += serviceVins.join('\n');
    }

    const filename = `vins_sin_registrar_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(textContent);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
