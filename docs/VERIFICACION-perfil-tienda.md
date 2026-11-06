# Verificación de las pantallas 4b-2

Esta rama sigue sin deploy hasta la entrega 6 junto con el agente nuevo.
El frontend consulta únicamente las APIs de perfil y pedidos propios para los
clientes; no lee usuarios/pedidos directamente de Firestore. Mis pedidos es
solo lectura. Los precios y empaques mostrados provienen del catálogo.

## Levantar el entorno

Terminal 1:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-node-app
npm run catalog:local
```

Requiere Java 21 y Firebase CLI. El script valida cualquier proyecto/host
explícito antes de revisar herramientas y puertos. Sin esas variables utiliza
el proyecto demo y `127.0.0.1:8080`. Si hay valores heredados incompatibles,
corregirlos o quitarlos para esta terminal; no se reemplazan silenciosamente.
El secreto JWT sigue siendo generado por ejecución y distinto al de .env.

Terminal 2:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-tienda
npm start -- --configuration emulator
```

Abrir `http://localhost:4200`. API local 3000, Firestore UI 4000. No se envía
WhatsApp; el OTP aparece en la terminal 1. Las fixtures solo están en test/.
El seed no sobrescribe modificaciones: para repetir el estado inicial, reiniciar
el entorno sin importación de datos y cargar de nuevo las fixtures.

## Tests y build a cargo del dueño

```bash
cd /home/arnaldoguerrero/Hodie/hodie-tienda
npm test -- --watch=false --browsers=ChromeHeadless
npm run build:prod
```

Chrome local requerido (CHROME_BIN si corresponde). No se agregaron dependencias
ni scripts a package.json. Las suites existentes recogen los nuevos .spec.ts de
test/: formularios de envío/RUC, checkout, perfil/409, contrato HTTP, pedidos
propios/rutas protegidas y datos copiables de facturación del administrador.
Las suites HTTP usan HttpTestingController; no hay solicitudes reales a APIs.

Para validar también el backend, con el emulador encendido:

```bash
cd /home/arnaldoguerrero/Hodie/hodie-node-app
npm run test:catalog:unit
npm run test:customer:unit
npm run test:customer:integration
```

test:catalog:unit incluye la regresión de precedencia de configuración del
supervisor. Backend ESM sin script de build; sintaxis del supervisor:

```bash
node --check scripts/dev-catalog.js
node --check scripts/local-catalog.config.js
```

## Cliente con datos guardados: 0900000002

1. Iniciar sesión usando el OTP local. Entrar a Mi perfil desde el icono de
   cuenta (también en el menú móvil). Ver teléfono sin edición, dos direcciones
   y dos registros fiscales; sus predeterminados. Cambiar nombre, agregar,
   editar y borrar registros, elegir predeterminados y guardar. Los nuevos
   registros reciben IDs del servidor; guardarlos antes de elegirlos como
   predeterminados. Al borrar el predeterminado, queda la primera restante.
2. Agregar al carrito dos líneas de la misma variante con textos distintos.
   En checkout verificar la dirección predeterminada, elegir otra o una nueva.
   La casilla de guardar dirección debe estar desmarcada. El tipo de envío
   aparece al elegir/escribir la ciudad, sin confirmar la compra.
3. Alternar ciudades local/transportadora de las fixtures: cédula visible y
   requerida solo para transportadora. Confirmar local y verificar en el
   detalle/PDF que no se guardó una cédula sobrante.
4. La factura empieza desmarcada. Marcarla y elegir un registro fiscal, o cargar
   otros datos. Con `1234567`, ver la propuesta `1234567-9`: confirmar antes de
   comprar. Con `1234567-8`, corregirlo o marcar la aceptación explícita del DV
   distinto. Editar el RUC después: las confirmaciones anteriores se limpian.
5. Guardar opcionalmente dirección/facturación y confirmar. Revisar Mis pedidos:
   número, fecha, total, estado, destinatario, texto por línea, empaque y datos
   fiscales del pedido. Descargar PDF: aclara que no es factura. Editar el
   perfil posteriormente y comprobar que la foto del pedido no cambia.
6. Al inicio son visibles dos pedidos: web verificado e histórico web con origen
   explícito. No aparecen el pedido de teléfono manual ni el histórico sin
   origen. No hay edición de pedidos en esta sección.

## Cliente sin datos guardados: 0900000003

1. Entrar a Mi perfil: listas vacías y Mis pedidos sin pedidos. Ir al catálogo,
   agregar una variante disponible y entrar al checkout. Debe abrir directamente
   el formulario de destinatario/calle/ciudad/departamento aunque profile_status
   sea complete; guardar dirección viene marcado. Sin dirección válida o sin
   confirmación de RUC no se puede confirmar la compra.
2. Probar una compra desmarcando guardar: no debe agregar direcciones al perfil.
   En otra compra, dejarlo marcado: conserva la primera dirección y la usa como
   predeterminada. En la próxima visita al checkout la casilla viene desmarcada.
   Sin solicitar factura, detalle y PDF indican consumidor final.
3. Probar agregar/editar/borrar registros fiscales personales de diferentes
   longitudes. No se exige prefijo empresarial ni longitud fija de ocho dígitos.

## Errores, concurrencia y aislamiento

- Usar dos pestañas con el mismo cliente y abrir Mi perfil en ambas. Guardar un
  cambio en una y otro en la segunda: el 409 explica qué cambió y conserva
  nombre/listas del borrador. Ver los datos actuales no lo reemplaza. Solo las
  acciones explícitas permiten descartar o conservar el borrador con la versión
  actual; conservar las listas reemplazará las actuales al guardar nuevamente.
- Los 400 con field se muestran junto al control. Los errores de filas del
  perfil se muestran junto a esa dirección/registro; abrir Editar los muestra
  también junto al campo. Corregir el campo limpia ese error, sin vaciar datos.
- Reducir stock de una variante en Firestore UI después de revisar el carrito:
  el rechazo del POST conserva carrito, textos y formularios, sin mostrar éxito.
- Simular fallos de la consulta de ciudad/RUC: mostrar Reintentar y bloquear la
  confirmación hasta tener una respuesta vigente. Cambiar ciudad o RUC mientras
  consulta cancela la solicitud anterior.
- Sin sesión, /profile, /profile/orders y su detalle llevan a login. Iniciar
  sesión con 0900000003 y abrir el ID de un pedido de 0900000002: no muestra sus
  datos; el backend responde 404. Las rutas públicas no consultan /admin/orders.
- Con el administrador local 0900000001, abrir el pedido nuevo en /admin/orders:
  ver solicitud de factura, razón social/RUC copiables y aviso de DV si aplica.

No hay resultados de tests/build adjuntos: los ejecuta el dueño.
