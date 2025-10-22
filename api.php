<?php
header('Content-Type: application/json');
require_once 'config.php';

$action = $_POST['action'] ?? $_GET['action'] ?? '';

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

            // Verificar si el VIN ya existe
            $checkStmt = $conn->prepare("SELECT id, type, repeat_count, created_at FROM vin_records WHERE vin = ?");
            $checkStmt->execute([$vin]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                // Retornar información sobre el duplicado para que el usuario decida
                http_response_code(409); // Conflict
                echo json_encode([
                    'success' => false,
                    'is_duplicate' => true,
                    'message' => 'Este VIN ya existe en ' . ucfirst($existing['type']) . ' (ID: ' . $existing['id'] . ')',
                    'existing_id' => $existing['id'],
                    'existing_type' => $existing['type'],
                    'repeat_count' => $existing['repeat_count'],
                    'created_at' => $existing['created_at']
                ]);
                exit;
            }

            $stmt = $conn->prepare("INSERT INTO vin_records (vin, char_count, type, registered, repeat_count) VALUES (?, ?, ?, 0, 0)");
            $stmt->execute([$vin, $charCount, $type]);

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
            $charCount = strlen($vin);

            if (empty($vin)) {
                throw new Exception('VIN no puede estar vacío');
            }

            // Buscar el VIN existente
            $checkStmt = $conn->prepare("SELECT id, repeat_count FROM vin_records WHERE vin = ?");
            $checkStmt->execute([$vin]);
            $existing = $checkStmt->fetch();

            if (!$existing) {
                throw new Exception('VIN no encontrado. Usa la función agregar normal.');
            }

            // Incrementar contador de repeticiones y actualizar fecha
            $newRepeatCount = $existing['repeat_count'] + 1;
            $updateStmt = $conn->prepare("UPDATE vin_records SET repeat_count = ?, last_repeated_at = NOW(), registered = 0 WHERE id = ?");
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

            $query = "SELECT * FROM vin_records WHERE 1=1";
            $params = [];

            if ($type !== 'all') {
                $query .= " AND type = ?";
                $params[] = $type;
            }

            if (!empty($dateFilter)) {
                $query .= " AND DATE(created_at) = ?";
                $params[] = $dateFilter;
            }

            // Filtro por estado de registro
            if ($registeredFilter === 'registered') {
                $query .= " AND registered = 1";
            } elseif ($registeredFilter === 'not_registered') {
                $query .= " AND registered = 0";
            }

            $query .= " ORDER BY type ASC, id ASC";

            if (!empty($params)) {
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
            } else {
                $stmt = $conn->query($query);
            }

            $records = $stmt->fetchAll();

            // Separar por tipo y agregar contadores
            $delivery = [];
            $service = [];
            $deliveryCounter = 1;
            $serviceCounter = 1;

            foreach ($records as $record) {
                if ($record['type'] === 'delivery') {
                    $record['counter'] = $deliveryCounter++;
                    $delivery[] = $record;
                } else {
                    $record['counter'] = $serviceCounter++;
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

            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            // Obtener estado actual
            $stmt = $conn->prepare("SELECT registered FROM vin_records WHERE id = ?");
            $stmt->execute([$id]);
            $current = $stmt->fetch();

            if (!$current) {
                throw new Exception('Registro no encontrado');
            }

            // Cambiar estado
            $newStatus = $current['registered'] == 1 ? 0 : 1;
            $updateStmt = $conn->prepare("UPDATE vin_records SET registered = ? WHERE id = ?");
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
                $stmt = $conn->prepare("UPDATE vin_records SET registered = 1 WHERE registered = 0");
                $stmt->execute();
            } else {
                $stmt = $conn->prepare("UPDATE vin_records SET registered = 1 WHERE registered = 0 AND type = ?");
                $stmt->execute([$type]);
            }

            $affected = $stmt->rowCount();

            echo json_encode([
                'success' => true,
                'message' => "Se registraron {$affected} VINs correctamente"
            ]);
            break;

        case 'unregister_all':
            $type = $_POST['type'] ?? 'all';

            if ($type === 'all') {
                $stmt = $conn->prepare("UPDATE vin_records SET registered = 0 WHERE registered = 1");
                $stmt->execute();
            } else {
                $stmt = $conn->prepare("UPDATE vin_records SET registered = 0 WHERE registered = 1 AND type = ?");
                $stmt->execute([$type]);
            }

            $affected = $stmt->rowCount();

            echo json_encode([
                'success' => true,
                'message' => "Se desregistraron {$affected} VINs correctamente"
            ]);
            break;

        case 'export':
            $type = $_GET['type'] ?? 'all';
            $dateFilter = $_GET['date'] ?? '';

            // SOLO exportar VINs NO registrados
            $query = "SELECT vin, type, repeat_count, last_repeated_at, created_at FROM vin_records WHERE registered = 0";
            $params = [];

            if ($type !== 'all') {
                $query .= " AND type = ?";
                $params[] = $type;
            }

            if (!empty($dateFilter)) {
                $query .= " AND DATE(created_at) = ?";
                $params[] = $dateFilter;
            }

            $query .= " ORDER BY type ASC, id ASC";

            if (!empty($params)) {
                $stmt = $conn->prepare($query);
                $stmt->execute($params);
            } else {
                $stmt = $conn->query($query);
            }

            $records = $stmt->fetchAll();

            // Si no hay VINs sin registrar
            if (count($records) === 0) {
                throw new Exception('No hay VINs sin registrar para exportar');
            }

            // Separar por tipo
            $deliveryVins = [];
            $serviceVins = [];

            foreach ($records as $record) {
                $vinLine = $record['vin'];

                // Si es repetido, agregar la fecha de última repetición o creación
                if ($record['repeat_count'] > 0) {
                    $dateToShow = $record['last_repeated_at'] ?? $record['created_at'];
                    $vinLine .= " - Última repetición: " . date('Y-m-d H:i', strtotime($dateToShow));
                }

                if ($record['type'] === 'delivery') {
                    $deliveryVins[] = $vinLine;
                } else {
                    $serviceVins[] = $vinLine;
                }
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

        case 'delete':
            $id = $_POST['id'] ?? 0;

            if ($id <= 0) {
                throw new Exception('ID inválido');
            }

            $stmt = $conn->prepare("DELETE FROM vin_records WHERE id = ?");
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