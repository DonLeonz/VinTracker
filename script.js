// Elementos del DOM
const vinInput = document.getElementById("vinInput");
const typeSelect = document.getElementById("typeSelect");
const addBtn = document.getElementById("addBtn");
const preview = document.getElementById("preview");
const deliveryBody = document.getElementById("deliveryBody");
const serviceBody = document.getElementById("serviceBody");
const dateFilter = document.getElementById("dateFilter");
const registeredFilter = document.getElementById("registeredFilter");
const alertBox = document.getElementById("alertBox");

// Variable para almacenar datos actuales
let currentData = { delivery: [], service: [] };

// Mostrar alerta
function showAlert(message, type = "error") {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.style.display = "block";

  setTimeout(() => {
    alertBox.style.display = "none";
  }, 5000);
}

// Función para procesar VIN
function processVin(input) {
  return input.toUpperCase().replace(/O/g, "0");
}

// Preview en tiempo real
vinInput.addEventListener("input", () => {
  const processed = processVin(vinInput.value);
  if (processed) {
    preview.textContent = `Vista previa: ${processed} (${processed.length} caracteres)`;
  } else {
    preview.textContent = "";
  }
});

// Filtro por fecha
dateFilter.addEventListener("change", () => {
  loadRecords();
});

// Filtro por estado de registro
registeredFilter.addEventListener("change", () => {
  console.log("Filtro cambiado a:", registeredFilter.value);
  loadRecords();
});

// Limpiar filtro
function clearFilter() {
  dateFilter.value = "";
  registeredFilter.value = "all";
  loadRecords();
}

// Verificar si hay VINs sin registrar antes de exportar
async function exportData(type) {
  try {
    // Verificar si hay VINs sin registrar
    const response = await fetch(
      "api.php?action=get&registered=not_registered"
    );
    const data = await response.json();

    if (!data.success) {
      showAlert("❌ Error al verificar registros", "error");
      return;
    }

    // Contar VINs sin registrar según el tipo solicitado
    let count = 0;
    if (type === "all") {
      count = data.delivery.length + data.service.length;
    } else if (type === "delivery") {
      count = data.delivery.length;
    } else if (type === "service") {
      count = data.service.length;
    }

    // Si no hay VINs para exportar
    if (count === 0) {
      let mensaje = "";
      if (type === "all") {
        mensaje = "⚠️ No hay VINs sin registrar para exportar";
      } else if (type === "delivery") {
        mensaje = "⚠️ No hay VINs de Delivery sin registrar para exportar";
      } else if (type === "service") {
        mensaje = "⚠️ No hay VINs de Service sin registrar para exportar";
      }
      showAlert(mensaje, "warning");
      return;
    }

    // Si hay VINs, proceder con la exportación
    const date = dateFilter.value;
    let url = `api.php?action=export&type=${type}`;
    if (date) {
      url += `&date=${date}`;
    }
    window.location.href = url;
  } catch (error) {
    showAlert(
      "❌ Error al verificar datos para exportar: " + error.message,
      "error"
    );
  }
}

// Registrar todos
async function registerAll(type) {
  if (
    !confirm(
      `¿Registrar TODOS los VINs sin registrar de ${type.toUpperCase()}?`
    )
  )
    return;

  try {
    const formData = new FormData();
    formData.append("action", "register_all");
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert("✅ " + data.message, "success");
      loadRecords();
    } else {
      showAlert("❌ " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error: " + error.message, "error");
  }
}

// Desregistrar todos
async function unregisterAll(type) {
  if (
    !confirm(
      `¿Desregistrar TODOS los VINs registrados de ${type.toUpperCase()}? (Volverán a rojo ❌)`
    )
  )
    return;

  try {
    const formData = new FormData();
    formData.append("action", "unregister_all");
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert("✅ " + data.message, "success");
      loadRecords();
    } else {
      showAlert("❌ " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error: " + error.message, "error");
  }
}

// Alternar estado de registrado
async function toggleRegistered(id, type) {
  try {
    const formData = new FormData();
    formData.append("action", "toggle_registered");
    formData.append("id", id);
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert("✅ " + data.message, "success");
      loadRecords();
    } else {
      showAlert("❌ " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error: " + error.message, "error");
  }
}

// Agregar VIN
addBtn.addEventListener("click", addVin);
vinInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addVin();
});

async function addVin() {
  const vin = vinInput.value.trim();
  const type = typeSelect.value;

  if (!vin) {
    showAlert("⚠️ Por favor ingrese un VIN", "error");
    return;
  }

  try {
    const formData = new FormData();
    formData.append("action", "add");
    formData.append("vin", vin);
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    // Parsear JSON independientemente del código de estado HTTP
    const data = await response.json();

    // Verificar primero si es un duplicado (código 409)
    if (data.is_duplicate) {
      // VIN duplicado - preguntar si quiere agregarlo como repetido
      const confirmMessage = `🔄 ${data.message}\n\n¿Desea agregarlo como repetido?\n\nContador actual: ${data.repeat_count} repeticiones`;

      if (confirm(confirmMessage)) {
        // Usuario aceptó - agregar como repetido
        await addRepeatedVin(vin, type);
      } else {
        showAlert("⚠️ No se agregó el VIN duplicado", "warning");
      }
    } else if (data.success) {
      vinInput.value = "";
      preview.textContent = "";
      showAlert("✅ VIN agregado correctamente", "success");
      loadRecords();
    } else {
      showAlert("❌ " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error al agregar VIN: " + error.message, "error");
  }
}

// Agregar VIN repetido
async function addRepeatedVin(vin, type) {
  try {
    const formData = new FormData();
    formData.append("action", "add_repeated");
    formData.append("vin", vin);
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      vinInput.value = "";
      preview.textContent = "";
      showAlert("✅ " + data.message, "success");
      loadRecords();
    } else {
      showAlert("❌ " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error al agregar VIN repetido: " + error.message, "error");
  }
}

// Eliminar VIN
async function deleteVin(id, type) {
  if (!confirm("¿Está seguro de eliminar este registro?")) return;

  try {
    const formData = new FormData();
    formData.append("action", "delete");
    formData.append("id", id);
    formData.append("type", type);

    const response = await fetch("api.php", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showAlert("✅ VIN eliminado correctamente", "success");
      loadRecords();
    } else {
      showAlert("❌ Error: " + data.message, "error");
    }
  } catch (error) {
    showAlert("❌ Error al eliminar VIN: " + error.message, "error");
  }
}

// Cargar registros
async function loadRecords() {
  try {
    const date = dateFilter.value;
    const registered = registeredFilter.value;

    let url = "api.php?action=get";

    if (date) {
      url += `&date=${date}`;
    }
    if (registered && registered !== "all") {
      url += `&registered=${registered}`;
    }

    console.log("URL de carga:", url);
    console.log("Filtro registrado:", registered);

    const response = await fetch(url);
    const data = await response.json();

    console.log("Datos recibidos:", data);

    if (data.success) {
      // Guardar datos actuales
      currentData = {
        delivery: data.delivery,
        service: data.service,
      };

      renderTable(data.delivery, deliveryBody, "delivery");
      renderTable(data.service, serviceBody, "service");
    }
  } catch (error) {
    console.error("Error al cargar registros:", error);
  }
}

// Formatear fecha
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Renderizar tabla
function renderTable(records, tbody, type) {
  if (records.length === 0) {
    tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">No hay registros de ${type}</td>
            </tr>
        `;
    return;
  }

  tbody.innerHTML = records
    .map(
      (record) => {
        // Mostrar información de repetición si existe
        let repeatInfo = "";
        if (record.repeat_count && record.repeat_count > 0) {
          const lastDate = record.last_repeated_at
            ? formatDate(record.last_repeated_at)
            : formatDate(record.created_at);
          repeatInfo = `
            <div style="font-size: 0.85rem; color: #f59e0b; margin-top: 4px;">
              🔄 Repetido ${record.repeat_count} ${
            record.repeat_count === 1 ? "vez" : "veces"
          }
              <br>Última: ${lastDate}
            </div>
          `;
        }

        return `
        <tr>
            <td style="font-weight: bold; color: #667eea;">${
              record.counter
            }</td>
            <td>${record.id}</td>
            <td>
                <span class="badge ${
                  record.char_count === 17 ? "badge-green" : "badge-red"
                }">
                    ${record.char_count}
                </span>
            </td>
            <td>
                <span class="vin-badge vin-${type}">
                    ${record.vin}
                </span>
                ${repeatInfo}
            </td>
            <td style="font-size: 0.9rem; color: #666;">
                ${formatDate(record.created_at)}
            </td>
            <td style="text-align: center;">
                <button
                    class="register-btn ${
                      record.registered == 1 ? "registered" : "not-registered"
                    }"
                    onclick="toggleRegistered(${record.id}, '${record.type}')"
                >
                    ${
                      record.registered == 1
                        ? "✅ Registrado"
                        : "❌ No Registrado"
                    }
                </button>
            </td>
            <td style="text-align: center;">
                <button class="action-btn delete-btn" onclick="deleteVin(${
                  record.id
                }, '${record.type}')">
                    🗑️
                </button>
            </td>
        </tr>
      `;
      }
    )
    .join("");
}

// Cargar registros al iniciar
loadRecords();
