import pool from '../db/config.js';

// Helper function to get table name
const getTableName = (type) => {
  return type === 'delivery' ? 'delivery_records' : 'service_records';
};

// Helper function to process VIN (convert O to 0)
const processVin = (vin) => {
  return vin.toUpperCase().replace(/O/g, '0');
};

// Helper function to build WHERE clause from filters
const buildWhereClause = (filters, includeDeleted = false) => {
  const { date, registered, search, repeated } = filters;
  let whereConditions = [];
  let params = [];
  let paramCount = 0;

  // Exclude deleted records by default unless explicitly requested
  if (!includeDeleted) {
    whereConditions.push('deleted = false');
  }

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

  if (search && search.trim() !== '') {
    paramCount++;
    whereConditions.push(`vin LIKE $${paramCount}`);
    params.push(`%${search.trim().toUpperCase()}%`);
  }

  if (repeated === 'repeated') {
    whereConditions.push('repeat_count > 0');
  } else if (repeated === 'not_repeated') {
    whereConditions.push('repeat_count = 0');
  }

  return {
    whereClause: whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '',
    params,
    paramCount
  };
};

// Get all records
export const getRecords = async (req, res) => {
  try {
    const { whereClause, params } = buildWhereClause(req.query);

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

    // Update repeat count and set as not registered
    // DO NOT update last_registered_at here - it should only update when actually registered
    const updateQuery = `
      UPDATE ${tableName}
      SET repeat_count = $1, registered = false
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

// Delete VIN (Soft Delete - move to trash)
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

    // Soft delete: mark as deleted and set deletion timestamp
    const deleteQuery = `
      UPDATE ${tableName} 
      SET deleted = true, deleted_at = CURRENT_TIMESTAMP 
      WHERE id = $1 AND deleted = false 
      RETURNING *
    `;
    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registro no encontrado' });
    }

    res.json({
      success: true,
      message: 'VIN movido a la papelera'
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
    // If registering (false → true), update last_registered_at to track when it was last registered
    const updateQuery = newStatus
      ? `
        UPDATE ${tableName}
        SET registered = $1, last_registered_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `
      : `
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

// Register all (filtered)
export const registerAll = async (req, res) => {
  try {
    const { type, ...filters } = req.body;
    
    // Force registered filter to 'not_registered' for safety
    const { whereClause, params } = buildWhereClause({ 
      ...filters, 
      registered: 'not_registered' 
    });

    const tableName = getTableName(type);
    const query = `UPDATE ${tableName} SET registered = true, last_registered_at = CURRENT_TIMESTAMP ${whereClause}`;
    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `Se registraron ${result.rowCount} VINs correctamente`
    });
  } catch (error) {
    console.error('Error registering all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Unregister all (filtered)
export const unregisterAll = async (req, res) => {
  try {
    const { type, ...filters } = req.body;
    
    // Force registered filter to 'registered' for safety
    const { whereClause, params } = buildWhereClause({ 
      ...filters, 
      registered: 'registered' 
    });

    const tableName = getTableName(type);
    const query = `UPDATE ${tableName} SET registered = false ${whereClause}`;
    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `Se desregistraron ${result.rowCount} VINs correctamente`
    });
  } catch (error) {
    console.error('Error unregistering all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete all (filtered) - Soft Delete
export const deleteAll = async (req, res) => {
  try {
    const { type, ...filters } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    const { whereClause, params } = buildWhereClause(filters);

    const tableName = getTableName(type);
    const query = `
      UPDATE ${tableName} 
      SET deleted = true, deleted_at = CURRENT_TIMESTAMP 
      ${whereClause}
    `;
    const result = await pool.query(query, params);

    res.json({
      success: true,
      message: `Se movieron ${result.rowCount} VINs a la papelera`
    });
  } catch (error) {
    console.error('Error deleting all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export data
export const exportData = async (req, res) => {
  try {
    const { type, ...queryFilters } = req.query;

    // Always export only non-registered records
    const { whereClause, params } = buildWhereClause({ 
      ...queryFilters, 
      registered: 'not_registered' 
    });

    let deliveryVins = [];
    let serviceVins = [];

    if (type === 'all' || type === 'delivery') {
      const query = `
        SELECT vin, repeat_count, last_registered_at, created_at
        FROM delivery_records ${whereClause}
        ORDER BY id ASC
      `;
      const result = await pool.query(query, params);

      deliveryVins = result.rows.map(record => {
        let vinLine = record.vin;
        if (record.repeat_count > 0) {
          const dateToShow = record.last_registered_at || record.created_at;
          const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
          vinLine += ` - Último registro: ${formattedDate}`;
        }
        return vinLine;
      });
    }

    if (type === 'all' || type === 'service') {
      const query = `
        SELECT vin, repeat_count, last_registered_at, created_at
        FROM service_records ${whereClause}
        ORDER BY id ASC
      `;
      const result = await pool.query(query, params);

      serviceVins = result.rows.map(record => {
        let vinLine = record.vin;
        if (record.repeat_count > 0) {
          const dateToShow = record.last_registered_at || record.created_at;
          const formattedDate = new Date(dateToShow).toLocaleString('es-ES');
          vinLine += ` - Último registro: ${formattedDate}`;
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

// ========================================
// TRASH/RECYCLE BIN FUNCTIONS
// ========================================

// Get deleted records (trash)
export const getDeleted = async (req, res) => {
  try {
    const { type } = req.query;

    if (type && type !== 'delivery' && type !== 'service') {
      return res.status(400).json({
        success: false,
        message: 'Tipo debe ser delivery o service'
      });
    }

    let deliveryRecords = [];
    let serviceRecords = [];

    if (!type || type === 'delivery') {
      const deliveryQuery = `
        SELECT * FROM delivery_records 
        WHERE deleted = true 
        ORDER BY deleted_at DESC
      `;
      const deliveryResult = await pool.query(deliveryQuery);
      deliveryRecords = deliveryResult.rows.map((record, index) => ({
        ...record,
        counter: index + 1,
        type: 'delivery'
      }));
    }

    if (!type || type === 'service') {
      const serviceQuery = `
        SELECT * FROM service_records 
        WHERE deleted = true 
        ORDER BY deleted_at DESC
      `;
      const serviceResult = await pool.query(serviceQuery);
      serviceRecords = serviceResult.rows.map((record, index) => ({
        ...record,
        counter: index + 1,
        type: 'service'
      }));
    }

    res.json({
      success: true,
      delivery: deliveryRecords,
      service: serviceRecords,
      total: deliveryRecords.length + serviceRecords.length
    });
  } catch (error) {
    console.error('Error getting deleted records:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore single VIN from trash
export const restoreVin = async (req, res) => {
  try {
    const { id, type } = req.body;

    if (!id || !type) {
      return res.status(400).json({
        success: false,
        message: 'ID y tipo son requeridos'
      });
    }

    const tableName = getTableName(type);

    const restoreQuery = `
      UPDATE ${tableName} 
      SET deleted = false, deleted_at = NULL 
      WHERE id = $1 AND deleted = true 
      RETURNING *
    `;
    const result = await pool.query(restoreQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registro no encontrado en la papelera' 
      });
    }

    res.json({
      success: true,
      message: 'VIN restaurado correctamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error restoring VIN:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Restore all VINs from trash (filtered)
export const restoreAll = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    const tableName = getTableName(type);

    const restoreQuery = `
      UPDATE ${tableName} 
      SET deleted = false, deleted_at = NULL 
      WHERE deleted = true
    `;
    const result = await pool.query(restoreQuery);

    res.json({
      success: true,
      message: `Se restauraron ${result.rowCount} VINs correctamente`
    });
  } catch (error) {
    console.error('Error restoring all:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Empty trash - permanently delete records older than 30 days or all
export const emptyTrash = async (req, res) => {
  try {
    const { type, permanent } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Tipo es requerido'
      });
    }

    const tableName = getTableName(type);

    // If permanent = true, delete all trash
    // Otherwise, only delete items older than 30 days
    const deleteQuery = permanent
      ? `DELETE FROM ${tableName} WHERE deleted = true`
      : `DELETE FROM ${tableName} WHERE deleted = true AND deleted_at < NOW() - INTERVAL '30 days'`;
    
    const result = await pool.query(deleteQuery);

    res.json({
      success: true,
      message: `Se eliminaron permanentemente ${result.rowCount} VINs de la papelera`
    });
  } catch (error) {
    console.error('Error emptying trash:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get verification data
export const getVerification = async (req, res) => {
  try {
    // Get total counts
    const deliveryCountResult = await pool.query('SELECT COUNT(*) FROM delivery_records');
    const serviceCountResult = await pool.query('SELECT COUNT(*) FROM service_records');
    
    // Get registered/not registered counts
    const deliveryRegisteredResult = await pool.query('SELECT COUNT(*) FROM delivery_records WHERE registered = true');
    const deliveryNotRegisteredResult = await pool.query('SELECT COUNT(*) FROM delivery_records WHERE registered = false');
    const serviceRegisteredResult = await pool.query('SELECT COUNT(*) FROM service_records WHERE registered = true');
    const serviceNotRegisteredResult = await pool.query('SELECT COUNT(*) FROM service_records WHERE registered = false');

    // Find duplicates within delivery_records
    const deliveryDuplicatesQuery = `
      SELECT vin, COUNT(*) as count, array_agg(id) as ids
      FROM delivery_records
      GROUP BY vin
      HAVING COUNT(*) > 1
      ORDER BY count DESC, vin
    `;
    const deliveryDuplicatesResult = await pool.query(deliveryDuplicatesQuery);

    // Find duplicates within service_records
    const serviceDuplicatesQuery = `
      SELECT vin, COUNT(*) as count, array_agg(id) as ids
      FROM service_records
      GROUP BY vin
      HAVING COUNT(*) > 1
      ORDER BY count DESC, vin
    `;
    const serviceDuplicatesResult = await pool.query(serviceDuplicatesQuery);

    // Find VINs that exist in both tables
    const crossTableQuery = `
      SELECT 
        d.vin,
        d.id as delivery_id,
        d.created_at as delivery_created_at,
        d.registered as delivery_registered,
        s.id as service_id,
        s.created_at as service_created_at,
        s.registered as service_registered,
        s.repeat_count as service_repeat_count
      FROM delivery_records d
      INNER JOIN service_records s ON d.vin = s.vin
      ORDER BY d.vin
    `;
    const crossTableResult = await pool.query(crossTableQuery);

    res.json({
      success: true,
      totalDelivery: parseInt(deliveryCountResult.rows[0].count),
      totalService: parseInt(serviceCountResult.rows[0].count),
      registeredDelivery: parseInt(deliveryRegisteredResult.rows[0].count),
      notRegisteredDelivery: parseInt(deliveryNotRegisteredResult.rows[0].count),
      registeredService: parseInt(serviceRegisteredResult.rows[0].count),
      notRegisteredService: parseInt(serviceNotRegisteredResult.rows[0].count),
      duplicatesInDelivery: deliveryDuplicatesResult.rows,
      duplicatesInService: serviceDuplicatesResult.rows,
      crossTableDuplicates: crossTableResult.rows
    });
  } catch (error) {
    console.error('Error getting verification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
