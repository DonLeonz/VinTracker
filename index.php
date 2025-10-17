<!DOCTYPE html>
<html lang="es">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Registro VIN</title>
    <link rel="stylesheet" href="styles.css">
</head>

<body>
    <div class="container">
        <h1>🚗 Sistema de Registro VIN</h1>

        <!-- Mensaje de alerta -->
        <div id="alertBox" class="alert"></div>

        <!-- Panel de entrada -->
        <div class="card">
            <div class="input-section">
                <div class="form-group">
                    <label for="vinInput">Número VIN</label>
                    <input type="text" id="vinInput" placeholder="Ingrese el VIN (O se convierte en 0)" maxlength="25">
                    <div class="preview" id="preview"></div>
                </div>

                <div class="form-group">
                    <label for="typeSelect">Tipo</label>
                    <select id="typeSelect">
                        <option value="delivery">Delivery</option>
                        <option value="service">Service</option>
                    </select>
                </div>

                <button id="addBtn">
                    <span>➕</span>
                    Agregar VIN
                </button>
            </div>
        </div>

        <!-- Filtros y Exportación -->
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: end; flex-wrap: wrap; gap: 15px;">
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <div class="form-group" style="margin: 0; max-width: 250px;">
                        <label for="dateFilter">Filtrar por Fecha</label>
                        <input type="date" id="dateFilter">
                    </div>

                    <div class="form-group" style="margin: 0; max-width: 250px;">
                        <label for="registeredFilter">Filtrar por Estado</label>
                        <select id="registeredFilter">
                            <option value="all">Todos</option>
                            <option value="not_registered">❌ No Registrados</option>
                            <option value="registered">✅ Registrados</option>
                        </select>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="clearFilter()" style="background: #6c757d;">
                        <span>🔄</span>
                        Ver Todos
                    </button>
                    <button onclick="exportData('all')" style="background: #28a745;">
                        <span>📥</span>
                        Exportar Sin Registrar
                    </button>
                    <button onclick="exportData('delivery')" style="background: #17a2b8;">
                        <span>📦</span>
                        Export. Delivery
                    </button>
                    <button onclick="exportData('service')" style="background: #ffc107; color: #333;">
                        <span>🔧</span>
                        Export. Service
                    </button>
                </div>
            </div>
        </div>

        <!-- Tabla Delivery -->
        <div class="card">
            <div class="button-group" style="margin-bottom: 20px;">
                <h2 class="section-title" style="margin: 0;">📦 Delivery</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-register-all" onclick="registerAll('delivery')">
                        <span>✅</span>
                        Registrar Todos
                    </button>
                    <button class="btn-unregister-all" onclick="unregisterAll('delivery')">
                        <span>❌</span>
                        Desregistrar Todos
                    </button>
                </div>
            </div>
            <div id="deliveryLoading" class="loading" style="display: none;">Cargando...</div>
            <table id="deliveryTable">
                <thead>
                    <tr>
                        <th style="width: 60px;">#</th>
                        <th style="width: 80px;">ID</th>
                        <th style="width: 100px;">Caracteres</th>
                        <th>VIN</th>
                        <th style="width: 150px;">Fecha</th>
                        <th style="width: 120px; text-align: center;">Estado</th>
                        <th style="width: 80px; text-align: center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="deliveryBody">
                    <tr>
                        <td colspan="7" class="empty-state">No hay registros de delivery</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Tabla Service -->
        <div class="card">
            <div class="button-group" style="margin-bottom: 20px;">
                <h2 class="section-title" style="margin: 0;">🔧 Service</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-register-all" onclick="registerAll('service')">
                        <span>✅</span>
                        Registrar Todos
                    </button>
                    <button class="btn-unregister-all" onclick="unregisterAll('service')">
                        <span>❌</span>
                        Desregistrar Todos
                    </button>
                </div>
            </div>
            <div id="serviceLoading" class="loading" style="display: none;">Cargando...</div>
            <table id="serviceTable">
                <thead>
                    <tr>
                        <th style="width: 60px;">#</th>
                        <th style="width: 80px;">ID</th>
                        <th style="width: 100px;">Caracteres</th>
                        <th>VIN</th>
                        <th style="width: 150px;">Fecha</th>
                        <th style="width: 120px; text-align: center;">Estado</th>
                        <th style="width: 80px; text-align: center;">Acción</th>
                    </tr>
                </thead>
                <tbody id="serviceBody">
                    <tr>
                        <td colspan="7" class="empty-state">No hay registros de service</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <script src="script.js"></script>
</body>

</html>