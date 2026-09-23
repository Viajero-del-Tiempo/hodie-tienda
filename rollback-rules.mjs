import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleAuth } from '../hodie-node-app/node_modules/google-auth-library/build/src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupRulesPath = path.resolve(__dirname, 'firestore.rules.backup-pre-restrictivo');
const keyPath = path.resolve(__dirname, '../hodie-node-app/serviceAccountKey.json');

async function rollbackRules() {
  console.log('⚠️ EJECUTANDO ROLLBACK DE REGLAS DE FIRESTORE...');
  const content = fs.readFileSync(backupRulesPath, 'utf8');

  const auth = new GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  console.log('📦 Creando ruleset de respaldo permisivo...');
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
    throw new Error(`Error en ruleset de rollback: ${createRes.status} ${err}`);
  }

  const backupRuleset = await createRes.json();
  console.log(`✅ Ruleset de rollback creado: ${backupRuleset.name}`);

  console.log('🔄 Restaurando release cloud.firestore a reglas permisivas...');
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
          rulesetName: backupRuleset.name,
        },
      }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    throw new Error(`Error en release de rollback: ${updateRes.status} ${err}`);
  }

  const releaseData = await updateRes.json();
  console.log('🚨 ROLLBACK COMPLETADO: Reglas permisivas restauradas exitosamente.');
  console.log(`📋 Release activa: ${releaseData.name}`);
  console.log(`🔓 Ruleset activo: ${releaseData.rulesetName}`);
}

rollbackRules().catch((err) => {
  console.error('❌ Fallo en rollback:', err);
  process.exit(1);
});
