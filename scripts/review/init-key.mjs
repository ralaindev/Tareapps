import { generateKeyPairSync } from 'node:crypto';
import { writeFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';

const target = process.argv[2];
if (!target || !existsSync(dirname(resolve(target)))) throw new Error('Indica una ruta con directorio existente fuera del repositorio.');
const path = resolve(realpathSync(dirname(resolve(target))), resolve(target).split(/[\\/]/).at(-1));
if (path.startsWith(`${realpathSync(process.cwd())}${sep}`)) throw new Error('La clave privada no puede estar en el workspace.');
if (existsSync(path) || existsSync(`${path}.pub`)) throw new Error('La clave ya existe. No se sobrescribe.');
const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' },
});
writeFileSync(path, privateKey, { flag: 'wx', mode: 0o600 });
writeFileSync(`${path}.pub`, publicKey, { flag: 'wx', mode: 0o600 });
console.log('Clave creada fuera del workspace. Solo la clave .pub puede versionarse.');
