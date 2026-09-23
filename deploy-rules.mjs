import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from '../hodie-node-app/node_modules/google-auth-library/build/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = path.resolve(__dirname, 'firestore.rules');
const keyPath = path.resolve(__dirname, '../hodie-node-app/serviceAccountKey.json');

async function deployRules() {
  console.log('🚀 Iniciando despliegue de reglas de seguridad en Firestore...');
  const content = fs.readFileSync(rulesPath, 'utf8');

  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  // 1. Crear el nuevo ruleset
  console.log('📦 Subiendo nuevo ruleset restrictivo...');
  const createRes = await fetch('https://firebaserules.googleapis.com/v1/projects/hodie-tienda-de-regalos/rulesets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [{ name: 'firestore.rules', content }],
      },
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Error creando ruleset: ${createRes.status} ${err}`);
  }

  const newRuleset = await createRes.json();
  console.log(`✅ Ruleset creado con éxito: ${newRuleset.name}`);

  // 2. Actualizar la release de Firestore
  console.log('🔄 Publicando ruleset en release cloud.firestore...');
  const updateRes = await fetch(
    'https://firebaserules.googleapis.com/v1/projects/hodie-tienda-de-regalos/releases/cloud.firestore',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: 'projects/hodie-tienda-de-regalos/releases/cloud.firestore',
          rulesetName: newRuleset.name,
        },
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Error actualizando release: ${updateRes.status} ${err}`);
  }

  const releaseData = await updateRes.json();
  console.log('🎉 ¡Reglas restrictivas desplegadas y activas en producción!');
  console.log(`📋 Release activa: ${releaseData.name}`);
  console.log(`🔒 Ruleset activo: ${releaseData.rulesetName}`);
}

deployRules().catch((err) => {
  console.error('❌ Fallo en deploy:', err);
  process.exit(1);
});
