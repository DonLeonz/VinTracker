<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

// Función helper para obtener el nombre de la tabla según el tipo
function getTableName($type) {
    return $type === 'delivery' ? 'delivery_records' : 'service_records';
}

try {
    $conn = getConnection();

    switch ($action) {
        case 'add':
            $vin = $_POST['vin'] ?? '';
            $type = $_POST['type'] ?? 'delivery';

            // Procesar VIN: reemplazar O por 0
            $vin = strtoupper(str_replace('O', '0', $vin));
            $charCount = strlen($vin);

            if (empty($vin)) {
                throw new Exception('VIN no puede estar vacío');
            }

            // Obtener nombre de la tabla según el tipo
            $tableName = getTableName($type);

            // Verificar si el VIN ya existe en esta tabla
            $checkStmt = $conn->prepare("SELECT id, repeat_count, created_at, registered FROM {$tableName} WHERE vin = ?");
            $checkStmt->execute([$vin]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                // Si el VIN ya existe pero NO está registrado, no permitir agregar
                if ($existing['registered'] == 0) {
                    http_response_code(409); // Conflict
                    echo json_encode([
                        'success' => false,
                        'is_duplicate' => true,
                        'is_not_registered' => true,
                        'message' => 'Este VIN ya está en la base de datos pero NO está registrado todavía',
                        'existing_id' => $existing['id']
                    ]);
                    exit;
                }

                // Si el VIN ya existe y está registrado, preguntar si quiere agregarlo como repetido
                http_response_code(409); // Conflict
                echo json_encode([
                    'success' => false,
                    'is_duplicate' => true,
                    'is_not_registered' => false,
                    'message' => 'Este VIN ya existe en ' . ucfirst($type) . ' (ID: ' . $existing['id'] . ')',
                    'existing_id' => $existing['id'],
                    'existing_type' => $type,
                    'repeat_count' => $existing['repeat_count'],
                    'created_at' => $existing['created_at']
                ]);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO {$tableName} (vin, char_count, registered, repeat_count) VALUES (?, ?, 0, 0)");
            $stmt->execute([$vin, $charCount]);

            echo json_encode([
                'success' => true,
                'message' => 'VIN agregado correctamente',
                'id' => $conn->lastInsertId()
            ]);
            break;

        case 'add_repeated':
            $vin = $_POST['vin'] ?? '';
            $type = $_POST['type'] ?? 'delivery';

            // Procesar VIN: reemplazar O por 0
            $vin = strtoupper(str_replace('O', '0', $vin));

            if (empty($vin)) {
                throw new Exception('VIN no puede estar vacío');
            }

            // Obtener nombre de la tabla según el tipo
            $tableName = getTableName($type);

            // Buscar el VIN existente en esta tabla
            $checkStmt = $conn->prepare("SELECT id, repeat_count FROM {$tableName} WHERE vin = ?");
            $checkStmt->execute([$vin]);
            $existing = $checkStmt->fetch();

            if (!$existing) {
                throw new Exception('VIN no encontrado en ' . ucfirst($type) . '. Usa la función agregar normal.');
            }

            // Incrementar contador de repeticiones y actualizar fecha
            $newRepeatCount = $existing['repeat_count'] + 1;
            $updateStmt = $conn->prepare("UPDATE {$tableName} SET repeat_count = ?, last_repeated_at = NOW(), registered = 0 WHERE id = ?");
            $updateStmt->execute([$newRepeatCount, $existing['id']]);

            echo json_encode([
                'success' => true,
                'message' => 'VIN marcado como repetido (Repetición #' . $newRepeatCount . ')',
                'id' => $existing['id'],
                'repeat_count' => $newRepeatCount
            ]);
            break;

        case 'get':
            $type = $_GET['type'] ?? 'all';
            $dateFilter = $_GET['date'] ?? '';
            $registeredFilter = $_GET['registered'] ?? 'all';

            $delivery = [];
            $service = [];

            // Construir query base con filtros
            $whereConditions = [];
            $params = [];

            if (!empty($dateFilter)) {
                $whereConditions[] = "DATE(created_at) = ?";
                $params[] = $dateFilter;
            }

            if ($registeredFilter === 'registered') {
                $whereConditions[] = "registered = 1";
            } elseif ($registeredFilter === 'not_registered') {
                $whereConditions[] = "registered = 0";
            }

            $whereClause = count($whereConditions) > 0 ? 'WHERE ' . implode(' AND ', $whereConditions) : '';

            // Obtener registros de delivery
            if ($type === 'all' || $type === 'delivery') {
                $query = "SELECT * FROM delivery_records {$whereClause} ORDER BY id ASC";
                if (!empty($params)) {
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                } else {
                    $stmt = $conn->query($query);
                }
                $deliveryRecords = $stmt->fetchAll();

                $deliveryCounter = 1;
                foreach ($deliveryRecords as $record) {
                    $record['counter'] = $deliveryCounter++;
                    $record['type'] = 'delivery';
                    $delivery[] = $record;
                }
            }

            // Obtener registros de service
            if ($type === 'all' || $type === 'service') {
                $query = "SELECT * FROM service_records {$whereClause} ORDER BY id ASC";
                if (!empty($params)) {
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                } else {
                    $stmt = $conn->query($query);
                }
                $serviceRecords = $stmt->fetchAll();

                $serviceCounter = 1;
                foreach ($serviceRecords as $record) {
                    $record['counter'] = $serviceCounter++;
                    $record['type'] = 'service';
                    $service[] = $record;
                }
            }

            echo json_encode([
                'success' => true,
                'delivery' => $delivery,
                'service' => $service
            ]);
            break;

        case 'toggle_registered':
            $id = $_POST['id'] ?? 0;
            $type = $_POST['type'] ?? '';

            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($type)) {
                throw new Exception('Tipo de servicio no especificado');
            }

            $tableName = getTableName($type);

            // Obtener estado actual
            $stmt = $conn->prepare("SELECT registered FROM {$tableName} WHERE id = ?");
            $stmt->execute([$id]);
            $current = $stmt->fetch();

            if (!$current) {
                throw new Exception('Registro no encontrado');
            }

            // Cambiar estado
            $newStatus = $current['registered'] == 1 ? 0 : 1;
            $updateStmt = $conn->prepare("UPDATE {$tableName} SET registered = ? WHERE id = ?");
            $updateStmt->execute([$newStatus, $id]);

            echo json_encode([
                'success' => true,
                'registered' => $newStatus,
                'message' => $newStatus == 1 ? 'VIN marcado como registrado' : 'VIN marcado como no registrado'
            ]);
            break;

        case 'register_all':
            $type = $_POST['type'] ?? 'all';

            if ($type === 'all') {
                // Registrar en ambas tablas
                $stmt1 = $conn->prepare("UPDATE delivery_records SET registered = 1 WHERE registered = 0");
                $stmt1->execute();
                $affected1 = $stmt1->rowCount();

                $stmt2 = $conn->prepare("UPDATE service_records SET registered = 1 WHERE registered = 0");
                $stmt2->execute();
                $affected2 = $stmt2->rowCount();

                $affected = $affected1 + $affected2;
            } else {
                $tableName = getTableName($type);
                $stmt = $conn->prepare("UPDATE {$tableName} SET registered = 1 WHERE registered = 0");
                $stmt->execute();
                $affected = $stmt->rowCount();
            }

            echo json_encode([
                'success' => true,
                'message' => "Se registraron {$affected} VINs correctamente"
            ]);
            break;

        case 'unregister_all':
            $type = $_POST['type'] ?? 'all';

            if ($type === 'all') {
                // Desregistrar en ambas tablas
                $stmt1 = $conn->prepare("UPDATE delivery_records SET registered = 0 WHERE registered = 1");
                $stmt1->execute();
                $affected1 = $stmt1->rowCount();

                $stmt2 = $conn->prepare("UPDATE service_records SET registered = 0 WHERE registered = 1");
                $stmt2->execute();
                $affected2 = $stmt2->rowCount();

                $affected = $affected1 + $affected2;
            } else {
                $tableName = getTableName($type);
                $stmt = $conn->prepare("UPDATE {$tableName} SET registered = 0 WHERE registered = 1");
                $stmt->execute();
                $affected = $stmt->rowCount();
            }

            echo json_encode([
                'success' => true,
                'message' => "Se desregistraron {$affected} VINs correctamente"
            ]);
            break;

        case 'export':
            $type = $_GET['type'] ?? 'all';
            $dateFilter = $_GET['date'] ?? '';

            $deliveryVins = [];
            $serviceVins = [];

            // Construir condiciones de filtro
            $whereConditions = ["registered = 0"];
            $params = [];

            if (!empty($dateFilter)) {
                $whereConditions[] = "DATE(created_at) = ?";
                $params[] = $dateFilter;
            }

            $whereClause = 'WHERE ' . implode(' AND ', $whereConditions);

            // Obtener VINs de delivery
            if ($type === 'all' || $type === 'delivery') {
                $query = "SELECT vin, repeat_count, last_repeated_at, created_at FROM delivery_records {$whereClause} ORDER BY id ASC";
                if (!empty($params)) {
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                } else {
                    $stmt = $conn->query($query);
                }
                $deliveryRecords = $stmt->fetchAll();

                foreach ($deliveryRecords as $record) {
                    $vinLine = $record['vin'];
                    if ($record['repeat_count'] > 0) {
                        $dateToShow = $record['last_repeated_at'] ?? $record['created_at'];
                        $vinLine .= " - Última repetición: " . date('Y-m-d H:i', strtotime($dateToShow));
                    }
                    $deliveryVins[] = $vinLine;
                }
            }

            // Obtener VINs de service
            if ($type === 'all' || $type === 'service') {
                $query = "SELECT vin, repeat_count, last_repeated_at, created_at FROM service_records {$whereClause} ORDER BY id ASC";
                if (!empty($params)) {
                    $stmt = $conn->prepare($query);
                    $stmt->execute($params);
                } else {
                    $stmt = $conn->query($query);
                }
                $serviceRecords = $stmt->fetchAll();

                foreach ($serviceRecords as $record) {
                    $vinLine = $record['vin'];
                    if ($record['repeat_count'] > 0) {
                        $dateToShow = $record['last_repeated_at'] ?? $record['created_at'];
                        $vinLine .= " - Última repetición: " . date('Y-m-d H:i', strtotime($dateToShow));
                    }
                    $serviceVins[] = $vinLine;
                }
            }

            // Si no hay VINs sin registrar
            if (count($deliveryVins) === 0 && count($serviceVins) === 0) {
                throw new Exception('No hay VINs sin registrar para exportar');
            }

            // Preparar TXT con encabezados
            $filename = "vins_sin_registrar_" . date('Y-m-d_His') . ".txt";

            header('Content-Type: text/plain; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');

            // Imprimir Deliverys
            if (count($deliveryVins) > 0) {
                echo "Deliverys\n";
                foreach ($deliveryVins as $vin) {
                    echo $vin . "\n";
                }
            }

            // Imprimir Services
            if (count($serviceVins) > 0) {
                echo "Services\n";
                foreach ($serviceVins as $vin) {
                    echo $vin . "\n";
                }
            }

            exit;
            break;

        case 'update':
            $id = $_POST['id'] ?? 0;
            $type = $_POST['type'] ?? '';
            $vin = $_POST['vin'] ?? '';

            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($type)) {
                throw new Exception('Tipo de servicio no especificado');
            }

            if (empty($vin)) {
                throw new Exception('VIN no puede estar vacío');
            }

            // Procesar VIN: reemplazar O por 0
            $vin = strtoupper(str_replace('O', '0', $vin));
            $charCount = strlen($vin);

            // Validar que el VIN tenga exactamente 17 caracteres
            if ($charCount !== 17) {
                throw new Exception('El VIN debe tener exactamente 17 caracteres');
            }

            $tableName = getTableName($type);

            // Verificar que el VIN no exista en otro registro del mismo tipo
            $checkStmt = $conn->prepare("SELECT id FROM {$tableName} WHERE vin = ? AND id != ?");
            $checkStmt->execute([$vin, $id]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                throw new Exception('Este VIN ya existe en otro registro de ' . ucfirst($type));
            }

            $stmt = $conn->prepare("UPDATE {$tableName} SET vin = ?, char_count = ? WHERE id = ?");
            $stmt->execute([$vin, $charCount, $id]);

            echo json_encode([
                'success' => true,
                'message' => 'VIN actualizado correctamente'
            ]);
            break;

        case 'delete':
            $id = $_POST['id'] ?? 0;
            $type = $_POST['type'] ?? '';

            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            if (empty($type)) {
                throw new Exception('Tipo de servicio no especificado');
            }

            $tableName = getTableName($type);
            $stmt = $conn->prepare("DELETE FROM {$tableName} WHERE id = ?");
            $stmt->execute([$id]);

            echo json_encode([
                'success' => true,
                'message' => 'VIN eliminado correctamente'
            ]);
            break;

        default:
            throw new Exception('Acción no válida');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>
