interface EmulatorEnvironment {
  production: boolean;
  whatsappApiUrl: string;
  firebase: { projectId: string };
  emulator?: { host: string; port: number };
}
export function getEmulatorConfig(environment: EmulatorEnvironment): { host: string; port: number } | null {
  if (!environment.emulator) return null;
  if (environment.production || environment.firebase.projectId !== 'demo-hodie-catalogo'
      || environment.whatsappApiUrl !== 'http://localhost:3000'
      || environment.emulator.host !== '127.0.0.1' || environment.emulator.port !== 8080) {
    throw new Error('La configuración emulator requiere proyecto demo y servicios locales');
  }
  return environment.emulator;
}
