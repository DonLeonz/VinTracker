<?php
require_once 'config.php';

try {
    $conn = getConnection();

    // Exportar delivery_records
    $stmt = $conn->query("SELECT * FROM delivery_records ORDER BY id ASC");
    $delivery = $stmt->fetchAll();

    // Exportar service_records
    $stmt = $conn->query("SELECT * FROM service_records ORDER BY id ASC");
    $service = $stmt->fetchAll();

    $data = [
        'delivery' => $delivery,
        'service' => $service,
        'exported_at' => date('Y-m-d H:i:s')
    ];

    file_put_contents('data_backup.json', json_encode($data, JSON_PRETTY_PRINT));

    echo "✅ Datos exportados exitosamente a data_backup.json\n";
    echo "Total Delivery: " . count($delivery) . "\n";
    echo "Total Service: " . count($service) . "\n";

} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>
