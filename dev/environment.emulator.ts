// Plantilla local sin datos del negocio ni credenciales de servicios reales.
export const environment = {
  production: false,
  whatsappApiUrl: 'http://localhost:3000',
  emulator: { host: '127.0.0.1', port: 8080 },
  firebase: {
    apiKey: 'demo-key',
    authDomain: 'demo-hodie-catalogo.firebaseapp.com',
    projectId: 'demo-hodie-catalogo',
    storageBucket: 'demo-hodie-catalogo.appspot.com',
    messagingSenderId: '000000000000',
    appId: 'demo-app',
  },
  cloudinary: { cloudName: '', uploadPreset: '' },
};
