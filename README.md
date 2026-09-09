# Roperito Solidario

Plataforma para compartir prendas en la E.E.S.T N°1 Raúl Scalabrini Ortiz.

## Instalación

1. Instalar Node.js 20+ y MariaDB.
2. Ejecutar `npm install`.
3. Crear la base e importar `schema.sql`.
4. Copiar `.env.example` a `.env` y completar las credenciales de MariaDB.
5. Ejecutar `npm run build` y luego `npm start`.

Para desarrollo se puede usar `npm run dev`. El proceso debe iniciarse desde la raíz del proyecto.

## Primer administrador

Registrar una cuenta desde la interfaz y promoverla en MariaDB:

```sql
UPDATE usuarios SET rol = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

## Alwaysdata

Subir el proyecto incluyendo `dist`, `public` y `schema.sql`, instalar dependencias con `npm install --omit=dev` después de compilar, configurar las variables de entorno en el panel y usar `npm start` como comando de aplicación. Mantener `UPLOAD_DIR=uploads` dentro de un directorio persistente de la aplicación.
