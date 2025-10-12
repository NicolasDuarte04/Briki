# Post-Mortem: Corrección del Error de Cifrado de Clientes (12-Ene-2025)

## 1. Resumen del Incidente

Se detectó un error crítico `ERROR: Illegal argument to function` que impedía la creación de nuevos clientes. El error se producía al intentar cifrar los datos del cliente (PII) en la base de datos.

## 2. Análisis de Causa Raíz

La función de PostgreSQL `encrypt_pii` depende de una variable de sesión llamada `app.encryption_key` para obtener la clave de cifrado. La investigación reveló dos problemas:
1.  La variable de entorno `APP_ENCRYPTION_KEY` no estaba definida en el archivo `.env.local` del proyecto.
2.  El código intentaba establecer la variable de sesión (`set_config`) en una consulta de Prisma separada de la consulta de inserción. Debido a la gestión de conexiones de Prisma, no se garantizaba que ambas operaciones se ejecutaran en la misma sesión, por lo que la clave no estaba disponible en el momento del cifrado.

## 3. Acciones de Resolución

1.  **Configuración de Entorno:** Se creó el archivo `.env.local` y se documentó el proceso para generar y añadir una `APP_ENCRYPTION_KEY` segura.
2.  **Refactorización a Transacciones:** La función `createClient` en `src/lib/clientsDb.ts` fue refactorizada para utilizar `prisma.$transaction`. Este enfoque garantiza que el comando para establecer la variable de sesión (`set_config`) y el comando `INSERT` que llama a `encrypt_pii` se ejecuten de forma atómica y dentro de la misma sesión de base de datos, resolviendo el problema de forma definitiva.
3.  **Limpieza de Código:** Se eliminó la función `setEncryptionKey`, que ahora es redundante.

## 4. Medidas Preventivas

-   Se añadió una validación en el código que arroja un error explícito si la `APP_ENCRYPTION_KEY` no está configurada, evitando errores crípticos de la base de datos.
-   Se ha establecido el uso de `prisma.$transaction` como el patrón estándar para operaciones que requieran la configuración de variables de sesión en PostgreSQL.

## 5. Archivos Modificados

- `.env.local` - Añadida variable de entorno `APP_ENCRYPTION_KEY`
- `src/lib/clientsDb.ts` - Refactorizada función `createClient` y `getClientsByOrg` para usar transacciones

## 6. Validación

Para verificar que la corrección funciona correctamente:

1. Crear un nuevo cliente a través de la interfaz web
2. Verificar que no aparezcan errores en la consola del servidor
3. Comprobar en la base de datos que los datos PII están cifrados (no en texto plano)
4. Confirmar que la lista de clientes muestra los datos descifrados correctamente

## 7. Lecciones Aprendidas

- Las operaciones que requieren configuración de variables de sesión en PostgreSQL deben ejecutarse dentro de transacciones para garantizar la consistencia de la sesión.
- La validación temprana de variables de entorno críticas previene errores crípticos en tiempo de ejecución.
- El uso de transacciones de Prisma es la solución canónica para problemas de gestión de sesiones de base de datos.
