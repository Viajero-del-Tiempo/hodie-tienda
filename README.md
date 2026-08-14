# 🌟 HoDie Tienda - Tienda Online Premium

Este proyecto es una aplicación web moderna y optimizada para una tienda online, desarrollada utilizando **Angular 18/20** y diseñada con los componentes estéticos de **Angular Material** y estilos personalizados.

La base de datos y la autenticación se gestionan de forma reactiva mediante **Firebase (Firestore)**, y cuenta con un sistema de notificaciones integrado con **WhatsApp** para confirmar y actualizar el estado de los pedidos.

![Vista del portal de HoDie Tienda](public/assets/images/portal-tienda.png)

---

## ✨ Características Principales

*   🛒 **Experiencia de Compra Interactiva:** Carrito de compras persistente, catálogo dinámico y filtros de búsqueda avanzados.
*   📦 **Opciones de Empaque Personalizados:** Cada producto permite seleccionar envoltorios específicos con ajuste dinámico de precios.
*   🔐 **Autenticación Segura con WhatsApp:** Inicio de sesión y verificación de cuentas mediante el envío de códigos por WhatsApp.
*   💳 **Checkout Asíncrono Robusto:** Flujo transaccional seguro con try-catch directo a base de datos que evita la pérdida de carritos en caso de fallo.
*   🎉 **Pantalla de Agradecimiento:** Animación fluida de éxito y visualización del código de pedido generado al finalizar la compra.
*   📊 **Panel Administrativo Completo:** Dashboard con gráficos (ApexCharts) para estadísticas, gestor de productos, historial de pedidos con descuento automático de inventario, y control de usuarios.

---

## 🚀 Guía de Instalación y Despliegue

Sigue estos sencillos pasos para levantar el proyecto en tu entorno local:

### 📋 Prerrequisitos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior) en tu sistema.

### 1. Instalar las dependencias
Desde la terminal, accede a la carpeta raíz del proyecto y ejecuta:
```bash
npm install
```

### 2. Configurar Firebase y WhatsApp
Edita los parámetros de conexión de Firebase y la URL del backend de notificaciones en los archivos de entorno:
*   `src/environments/environment.ts` (Producción)
*   `src/environments/environment.development.ts` (Desarrollo)

### 3. Levantar el servidor de desarrollo local
Inicia la aplicación local en modo escucha:
```bash
npm start
```
Una vez iniciado, abre tu navegador favorito y entra en:
👉 **[http://localhost:4200](http://localhost:4200)**

### 4. Compilar para Producción
Para generar el bundle optimizado y listo para desplegar en tu hosting:
```bash
npx ng build
```
Los archivos finales compilados se guardarán dentro del directorio `dist/hodie-tienda`.

---

## ⚙️ Estructura de Archivos de Entorno (`environments`)

Debido a que las variables de entorno están excluidas del control de versiones en el archivo `.gitignore` por motivos de seguridad, debes crear manualmente la carpeta `src/environments/` y agregar los siguientes dos archivos antes de compilar o arrancar el servidor de desarrollo:

### 1. `src/environments/environment.ts` (Producción)
```typescript
export const environment = {
  production: true,
  whatsappApiUrl: 'URL_DE_TU_API_WHATSAPP_PROD',
  firebase: {
    apiKey: 'TU_API_KEY_FIREBASE',
    authDomain: 'TU_AUTH_DOMAIN_FIREBASE',
    projectId: 'TU_PROJECT_ID_FIREBASE',
    storageBucket: 'TU_STORAGE_BUCKET_FIREBASE',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID_FIREBASE',
    appId: 'TU_APP_ID_FIREBASE',
    measurementId: 'TU_MEASUREMENT_ID_FIREBASE',
  },
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME_CLOUDINARY',
    uploadPreset: 'TU_UPLOAD_PRESET_CLOUDINARY',
  },
};
```

### 2. `src/environments/environment.development.ts` (Desarrollo)
```typescript
export const environment = {
  production: false,
  whatsappApiUrl: 'URL_DE_TU_API_WHATSAPP_DEV',
  firebase: {
    apiKey: 'TU_API_KEY_FIREBASE',
    authDomain: 'TU_AUTH_DOMAIN_FIREBASE',
    projectId: 'TU_PROJECT_ID_FIREBASE',
    storageBucket: 'TU_STORAGE_BUCKET_FIREBASE',
    messagingSenderId: 'TU_MESSAGING_SENDER_ID_FIREBASE',
    appId: 'TU_APP_ID_FIREBASE',
    measurementId: 'TU_MEASUREMENT_ID_FIREBASE',
  },
  cloudinary: {
    cloudName: 'TU_CLOUD_NAME_CLOUDINARY',
    uploadPreset: 'TU_UPLOAD_PRESET_CLOUDINARY',
  },
};
```

