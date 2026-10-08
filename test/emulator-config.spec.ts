import { getEmulatorConfig } from '../src/app/core/config/emulator.util';

describe('Configuración de emulador', () => {
  const normal = { production: true, firebase: { projectId: 'test-project' }, whatsappApiUrl: 'https://example.test' };
  const local = { production: false, firebase: { projectId: 'demo-hodie-catalogo' },
    whatsappApiUrl: 'http://localhost:3000', emulator: { host: '127.0.0.1', port: 8080 } };
  it('conserva el entorno normal y admite solo proyecto demo y servicios locales', () => {
    expect(getEmulatorConfig(normal)).toBeNull();
    expect(getEmulatorConfig(local)).toEqual(local.emulator);
    for (const bad of [
      { ...local, production: true }, { ...local, firebase: { projectId: 'test-real-project' } },
      { ...local, whatsappApiUrl: 'https://example.test' },
      { ...local, emulator: { host: 'remote.example', port: 8080 } },
    ]) expect(() => getEmulatorConfig(bad)).toThrow();
  });
});
