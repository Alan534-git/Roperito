CREATE DATABASE IF NOT EXISTS roperito_solidario CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE roperito_solidario;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'solicitante') NOT NULL DEFAULT 'solicitante',
  estado_aprobacion TINYINT UNSIGNED NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  KEY idx_usuarios_aprobacion (rol, estado_aprobacion),
  CONSTRAINT chk_usuarios_aprobacion CHECK (estado_aprobacion IN (0, 1, 2))
) ENGINE=InnoDB;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS estado_aprobacion TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER rol;

ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin', 'solicitante', 'usuario') NOT NULL DEFAULT 'solicitante';

UPDATE usuarios SET rol = 'solicitante' WHERE rol = 'usuario';
UPDATE usuarios SET estado_aprobacion = 1 WHERE rol = 'solicitante' AND estado_aprobacion = 0;

ALTER TABLE usuarios
  MODIFY COLUMN rol ENUM('admin', 'solicitante') NOT NULL DEFAULT 'solicitante';

CREATE TABLE IF NOT EXISTS prendas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(120) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  talle VARCHAR(30) NOT NULL,
  estado ENUM('nuevo', 'muy_bueno', 'bueno', 'a_reparar') NOT NULL DEFAULT 'bueno',
  ruta_imagen VARCHAR(255) NULL,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_prendas_disponible (disponible),
  KEY idx_prendas_categoria (categoria)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS solicitudes (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  prenda_id INT UNSIGNED NOT NULL,
  mensaje VARCHAR(500) NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_solicitud_activa (usuario_id, prenda_id, estado),
  CONSTRAINT fk_solicitudes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_solicitudes_prenda FOREIGN KEY (prenda_id) REFERENCES prendas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Promover un administrador inicial después de registrarlo:
-- UPDATE usuarios SET rol = 'admin', estado_aprobacion = 1 WHERE email = 'admin@roperito.local';
