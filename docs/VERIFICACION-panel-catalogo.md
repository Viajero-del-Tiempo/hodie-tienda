# Panel de catálogo — entrega 5b

El panel usa el modelo con variantes y las APIs administrativas de la 5a.
No se escribe directamente en Firestore ni se adapta un producto viejo.
Nada de esta rama se deploya antes de la entrega 6 junto con el agente nuevo.

## Levantar el entorno local

Terminal 1:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-node-app
npm run catalog:local
```

Terminal 2:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-tienda
npm start -- --configuration emulator
```

Requiere las dependencias instaladas, Firebase CLI y Java 21 o posterior.
El supervisor genera `environment.emulator.ts`, inicia el proyecto demo,
carga las fixtures y configura las imágenes locales. No usar el entorno
Angular de desarrollo habitual para este recorrido.

Entrá en `http://localhost:4200/login` con `0900000001`, el administrador
ficticio. El OTP aparece en la terminal 1; no se envía WhatsApp.
Abrí `http://localhost:4200/admin/products`. La UI de Firestore está en
`http://localhost:4000`, proyecto `demo-hodie-catalogo`.
Un nuevo arranque del emulador reinicia los ejemplos; sus imágenes son
temporales. Los datos de prueba son ficticios y no se cargan en producción.

## Recorrido manual

1. **Listado:** revisar nombre, slug, categoría, precio desde, cantidad total
   de variantes (incluye inactivas), estado, búsqueda por SKU y filtros de
   categoría/estado. Editar, desactivar y reactivar un ejemplo. Revisar que
   el cambio se refleje en la tienda al volver a consultar el catálogo.
2. **Producto nuevo:** completar nombre y observar la sugerencia de slug.
   Editar el slug y cambiar el nombre: se conserva el slug elegido. Elegir
   categoría activa; agregar etiquetas y atributos con valores libres.
   Agregar ejes de opciones y variantes con combinaciones diferentes,
   SKU, precio entero positivo y stock entero no negativo. Quitar una fila
   nueva antes de guardar. Guardar y revisar los IDs asignados en Firestore.
3. **Producto guardado:** cambiar nombre sin cambiar su enlace, precio,
   stock y opciones; renombrar un eje y verificar que conserva sus valores.
   Las variantes guardadas muestran ID y no ofrecen borrar. Desactivar una
   y guardar: sigue en el documento y en el editor, con el mismo ID/SKU.
   Reactivarla. Agregar una variante y verificar que recibe un nuevo ID.
4. **Personalización y empaques:** configurar texto, límite, imagen y notas;
   agregar empaques propios con identificador, nombre, precio e imagen.
   Probar un empaque gratuito. Verificar los nombres y precios reales del
   documento en el detalle de tienda; no hay listas predeterminadas.
5. **Imágenes:** subir JPG/PNG/WEBP en variantes y empaques. En la pestaña
   Network verificar POST a `http://localhost:3000/admin/images` con base64
   y MIME; la URL devuelta es local. No hay requests de subida a Cloudinary
   ni presets del frontend. Probar formato inválido, archivo mayor de 10 MB
   y PNG de contenido inválido. El error queda junto a la subida; conservar
   archivo pendiente, reintentar o quitarlo. No se permite guardar mientras
   quedan subidas pendientes. Quitar una imagen solo la retira del borrador.
6. **Errores por campo:** repetir slug y SKU de otro ejemplo, también después
   de desactivarlo. El servidor señala slug o SKU de la fila. Repetir una
   combinación de opciones y un identificador de empaque: el rechazo queda
   junto a sus campos. Probar campos vacíos y precio/stock inválidos.
   Corregir el campo sin perder otros valores. Las rutas como
   `variants[2].sku` y `packagingOptions[1].price` se resuelven por fila.
7. **409 por stock:** abrir un producto en dos pestañas. En A editar precio
   sin guardar. En B reducir stock y guardar (simula un descuento; también
   se puede cambiar solo el stock desde la UI del emulador). Guardar A:
   muestra qué cambió y conserva precio, stock y versión del borrador.
   “Consultar versión actual” muestra la revisión sin sobrescribirlo.
   “Actualizar borrador para revisarlo” incorpora el stock actual y conserva
   el precio editado. Revisar y guardar de nuevo: no restituye las unidades.
8. **409 con colisión:** repetir, editando stock tanto en A como en B. La
   revisión exige elegir stock actual o stock del borrador; no suma valores
   ni guarda automáticamente. Probar también “Descartar borrador y cargar
   actual”, que es una acción explícita. Si cambia nuevamente antes de
   guardar, la API vuelve a rechazar por versión y conserva el borrador.
9. **Categorías:** crear, editar nombre/descripción, cambiar orden y activar.
   El ID permanece de solo lectura al editar. Intentar desactivar una con
   productos activos: el error aparece junto a “Activa” y conserva el
   nombre y el orden del borrador. Desactivar sus productos y reintentar.
   Revisar orden y visibilidad en la tienda.
10. **Políticas y acceso:** crear un tema libre con ID, título y texto, luego
    editarlo conservando ID. Revisar navegación desde el menú administrativo.
    Salir y comprobar la protección de `/admin`; con un cliente ficticio,
    verificar que no obtiene acceso al panel ni a sus escrituras.

La comparación ante 409 identifica variantes por ID, aunque cambie el orden.
Nombre, slug, categoría, estado y cada campo de variante se comparan por
separado; atributos, ejes, etiquetas, personalización y empaques se comparan
como grupos. Una colisión requiere elección expresa, seguida de revisión y
guardado. La API sigue validando unicidad y modelo en su transacción.

## Tests y build (los ejecuta el dueño)

```bash
cd /home/arnaldoguerrero/Hodie/hodie-tienda
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
npm run build -- --configuration emulator
```

Karma necesita Chrome instalado; configurar `CHROME_BIN` si es necesario.
El build de emulador requiere primero generar el entorno con `catalog:local`.
Las suites nuevas están en `test/`, se incluyen en el comando habitual y usan
datos inventados de `test/helpers/admin-catalog-fixtures.ts`:

- `admin-catalog-service.spec.ts`: contratos HTTP, versión, campos editables,
  IDs, categorías/políticas, endpoint de imágenes y validación de archivos.
- `admin-product-editor.spec.ts`: formulario completo, slug, IDs estables,
  retiro de filas nuevas, ejes, errores por ruta, personalización, bloqueo
  por subidas/valores inválidos y 409 con conservación y revisión explícita.
- `admin-product-merge.spec.ts`: comparación por ID, stock remoto, precio local,
  variantes añadidas en ambas versiones y elección ante colisión de stock.
- `admin-catalog-pages.spec.ts`: listado/activación, filtros, categorías con
  orden e ID estable, rechazo junto a activación y políticas libres.
- `admin-catalog-images.spec.ts`: imágenes de variante y empaque, URL local,
  respuestas asíncronas, archivo fallido conservado y reintento sin duplicados.

Las suites simulan HTTP y no cargan `app.config`, Firebase ni Cloudinary.
Esta entrega no modifica código ni tests del backend. Para volver a verificar
su contrato con el emulador levantado:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-node-app
npm run test:catalog:unit
npm run test:integration:emulator
```

No se obtuvieron salidas de tests/build durante la implementación.
