# VIN Tracker — Versión PHP (legacy)

Versión original del sistema, desarrollada en PHP + MySQL para entornos locales con Laragon o WAMP.

Esta versión está archivada. La versión actual del proyecto está en [`../vin-tracker v2/`](../vin-tracker%20v2/).

## Stack

- PHP con PDO
- MySQL (Laragon / WAMP)
- JavaScript vanilla
- CSS propio

## Requisitos

- Laragon o WAMP con PHP y MySQL activos
- Base de datos `vin_tracker` creada en MySQL

## Configuración

Editar [`config.php`](config.php) con las credenciales de tu instancia MySQL local:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'vin_tracker');
define('DB_USER', 'root');      // cambiar si tu usuario es distinto
define('DB_PASS', '');          // cambiar si tienes contraseña
```

## Uso

Servir la carpeta desde el servidor local de Laragon/WAMP y abrir `index.html` en el navegador.
