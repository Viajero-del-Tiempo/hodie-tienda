# Verificación de la entrega 4

La rama no se deploya hasta la puesta en marcha conjunta con el agente nuevo.
Los datos ficticios viven únicamente en `test/`; las suites frontend no cargan
`app.config`, Firebase, WhatsApp ni Cloudinary. HTTP y almacenamiento se simulan.

## Comandos

Desde `/home/arnaldoguerrero/Hodie/hodie-tienda`:

```sh
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

Karma requiere un Chrome local. Si no lo encuentra, `CHROME_BIN` debe apuntar al
ejecutable instalado; no se incorpora una descarga de navegador al proyecto.

Desde `/home/arnaldoguerrero/Hodie/hodie-node-app`:

```sh
npm run test:unit
npm run test:integration
```

La API pública en memoria está incluida en `test:unit`. Las suites preexistentes
de ese script pueden usar Firestore. `test:integration` conserva
`ALLOW_PROD_FIRESTORE_TESTS=1`: sus suites registran datos propios `test-` y los
limpian en `finally`. La suite de pedidos agrega el caso de tres líneas de la
misma variante con dos textos diferentes y otra personalización pendiente.

El backend es JavaScript ESM y no tiene script de build ni compilación pendiente.
Para revisar la sintaxis de los archivos de producción de esta entrega:

```sh
node --check src/app.js
node --check src/controllers/catalog.controller.js
node --check src/routes/catalog.routes.js
node --check src/services/catalog.service.js
node --check src/services/catalog.repository.js
node --check src/validators/catalog.validator.js
```

## Pruebas manuales antes de activar la tienda

Usar un backend local conectado a un catálogo de prueba controlado. `npm start`
en Angular usa `environment.development.ts`: configurar localmente
`whatsappApiUrl` como `http://localhost:3000` para esta verificación. La carpeta
`src/environments/` está excluida de Git y se conserva su configuración actual;
este ajuste local no forma parte de la entrega. El build de producción usa
`environment.ts`, con la URL productiva.
No crear fixtures desde el navegador en Firestore productivo. El CRUD nuevo del
panel se completa en entrega 5; hasta entonces los fixtures automatizados son
la forma de verificar el modelo nuevo sin cargar productos reales.

- En escritorio y móvil, revisar búsqueda, categorías, paginación y orden por
  relevancia/precio/nombre. Cada producto aparece una sola vez y sus tarjetas
  enlazan por slug; las variantes no se convierten en tarjetas independientes.
- Elegir combinaciones de dos ejes, cambiar el primero y verificar que se limpia
  el segundo. Revisar precio, imágenes, SKU en el pedido y cantidad disponible.
  Combinaciones agotadas se ven deshabilitadas; un producto agotado sigue visible.
- Revisar empaques con tipos libres, nombres, fotos y precios del catálogo.
  Un empaque configurado gratuito debe ser diferente del estándar `null`.
- Agregar varias unidades con un texto, luego otra línea con otro texto y la
  misma variante/empaque. Agregar el mismo texto debe sumar la línea existente.
- Editar texto en carrito para fusionar líneas, quitarlo y verificar el aviso de
  personalización pendiente. Probar un texto que supera `maxChars`, incluso con
  caracteres Unicode. El stock se suma entre todos los textos y empaques de
  la misma variante; cambiar otra variante no consume ese stock.
- Confirmar que el checkout muestra los textos sin pedirlos otra vez, mantiene
  OTP/dirección/pago manual y envía ambos IDs y el tipo libre del empaque.
- Cambiar un precio antes de confirmar: el resumen se actualiza y requiere otra
  confirmación. Reducir stock entre revisión y POST: el 400 conserva líneas y
  textos, permite corregir y no muestra éxito. La revisión pública usa caché,
  no reserva stock; el servidor valida con una lectura fresca al crear el pedido.
- Abrir un slug inexistente/inactivo y un enlace viejo basado en ID. Debe aparecer
  "Este producto ya no está disponible" con un enlace al catálogo.
- Guardar un carrito anterior en `localStorage.hodie_cart` y recargar: se descarta
  completo con aviso. Repetir con JSON inválido; el nuevo carrito conserva sus
  textos y referencias al recargar, recalculando identidad y totales.

Las salidas de tests y build las obtiene el dueño al ejecutar estos comandos.
