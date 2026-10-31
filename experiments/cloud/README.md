# Experimento cloud local aislado

Base experimental autorizada para dos clientes (A y B) y un tercer usuario ajeno,
con **Supabase Auth real + Postgres/RLS/RPC**. No es producción ni una integración
de la aplicación móvil. Todo el código vive en `supabase/` y `experiments/cloud/`.
No requiere SDK, `npm install` ni dependencias nuevas del proyecto: HTTP mediante
`fetch`, `node:crypto`, `node:test` y procesos nativos de **Node.js 24**.

## Ejecutar en Ubuntu local o CI con Docker

Desde la raíz del repositorio, en una máquina/runner Ubuntu con Node.js 24, npm,
Docker instalado y daemon accesible para el usuario (`docker info` debe funcionar):

```sh
node --version
docker info >/dev/null
npx --yes supabase@2.122.0 --version
node experiments/cloud/run-local-ci.mjs
```

El último comando es el paso ejecutable del job `Cloud experiment` en
`.github/workflows/ci.yml`. La primera ejecución real pasó en la PR #6:
https://github.com/ralaindev/Tareapps/actions/runs/41202239005.
Se ejecuta después de checkout y de preparar Node 24 en Ubuntu con Docker. No necesita secretos de GitHub,
login Supabase, `link`, un proyecto remoto ni service keys. La primera ejecución
descarga CLI/imágenes, por lo que requiere Internet y puede tardar varios minutos.
Los puertos 54320–54322 deben estar libres; no ejecutar dos instancias simultáneas
del mismo proyecto en el mismo Docker host.

El runner ejecuta, en orden, estos comandos (captura la salida de Supabase para
evitar registrar sus claves locales):

```sh
npx --yes supabase@2.122.0 start
npx --yes supabase@2.122.0 db reset --local --yes
npx --yes supabase@2.122.0 db lint --local --schema public --level warning --fail-on warning
npx --yes supabase@2.122.0 status --output json
node --test experiments/cloud/*.test.mjs
npx --yes supabase@2.122.0 stop --no-backup
```

**Usar una instancia local desechable** con el ID
`tareapps-cloud-experiment`: `db reset --local` borra sus datos y aplica las
migraciones; `stop --no-backup` descarta sus volúmenes locales. La limpieza se
intenta también si falla el arranque o las pruebas. No usar este runner sobre
una instancia con datos que se quieran conservar. No establecer overrides
`SUPABASE_*` de proyecto/puertos/servicios en ese runner.

`status --output json` puede contener credenciales administrativas locales: el
runner lo mantiene en memoria y pasa al proceso de pruebas **solo** URL y clave
pública (`ANON_KEY`, o `PUBLISHABLE_KEY` si no existe la anterior), además del
entorno habitual del proceso. No se imprime ni se escribe ese JSON en archivos.
No ejecutar estos comandos individualmente con salida/trace públicos si se quiere
evitar que la CLI registre sus claves; para CI usar el runner. No se usa ninguna
clave administrativa para crear usuarios, leer datos o llamar RPC.

### Ejecutar únicamente las pruebas sobre una instancia ya arrancada

Con la migración aplicada y confirmación email desactivada, suministrar mediante
el entorno del proceso:

- `SUPABASE_URL`: `http://127.0.0.1:54321` o `http://localhost:54321`.
- `SUPABASE_ANON_KEY`: clave publicable local o JWT local con rol `anon`.

```sh
node --test experiments/cloud/*.test.mjs
```

Se rechazan URL remotas, HTTPS, credenciales en URL, rutas, query, fragmentos,
claves `sb_secret_*` y JWT `service_role`. Las redirecciones HTTP también fallan.
La comprobación del rol JWT en el cliente es una protección contra errores de
configuración; **la autenticidad del token la verifica Supabase**. Sin variables
o sin servidor, la integración falla; no se omite silenciosamente.

Cada ejecución crea tres usuarios nuevos con `signUp`, direcciones únicas
`cloud-<UUID>@example.test` y contraseñas aleatorias criptográficas. Las sesiones
solo se mantienen en memoria. No se imprimen contraseñas, tokens ni entorno.
No se envía correo real; `auth.email.enable_confirmations = false` es específico
de este experimento local. Sin reset, los usuarios/datos experimentales se acumulan.

## Contrato de datos y permisos

Migración: `supabase/migrations/20261031000000_cloud_experiment.sql`, transaccional.

- `boards`: UUID, propietario Auth inmutable, nombre recortado 1–120, fecha servidor.
- `board_members`: clave tablero/usuario Auth y `active`. Propietario incluido como
  miembro activo. Solo el propietario añade, reactiva o revoca por UUID conocido;
  no puede revocarse a sí mismo. No hay invitaciones ni transferencia de propiedad.
- `tasks`: UUID global e inmutable, `board_id`, título recortado 1–120,
  descripción hasta 2000, estado textual restringido a `pending`, `in_progress`,
  `done`, versión `bigint` servidor desde 1, fechas servidor y `deleted_at`.
  El recorte de título cubre espacios ASCII, tabulador, CR, LF, FF y VT; no define
  equivalencia Unicode con el `trim` de JavaScript. Longitudes según caracteres
  de Postgres. No hay responsable opcional en esta base.
- `cloud_private.task_operations`: dedup por `(actor_id, operation_id)`, payload
  JSONB exacto y resultado. Fuera de los esquemas API; sin permisos de cliente.

RLS permite SELECT de las tres tablas públicas **solo a miembros activos**;
los miembros ven los UUID/actividad de la membresía del mismo tablero, no emails.
Los ajenos y revocados reciben listas vacías por RLS (HTTP 200, cero filas);
anónimos no tienen permiso SELECT. No hay políticas ni grants de escritura directa,
ni para el propietario. `INSERT`, `UPDATE`, `DELETE` se rechazan desde REST.

Funciones `SECURITY DEFINER`, `search_path = ''`, objetos cualificados, sin SQL
dinámico, actor obtenido de `auth.uid()`, `EXECUTE` revocado a PUBLIC/anon y
concedido a authenticated:

| RPC | Parámetros y resultado |
| --- | --- |
| `cloud_is_member` | `p_board_id`; booleano de membresía del usuario actual. Helper RLS sin recursión; no admite otro actor. |
| `cloud_create_board` | `p_name`; devuelve UUID y crea membresía propietaria en la misma transacción. |
| `cloud_set_member` | `p_board_id`, `p_user_id`, `p_active`; alta/reactivación o revocación, solo propietario. |
| `cloud_apply_task` | `p_board_id`, `p_task_id`, `p_operation_id` UUID, `p_action`, `p_expected_version`, `p_data` JSONB; devuelve `{outcome, task}`. |

### Operaciones sobre tareas

- `create`: `expected_version = 0`; `p_data` contiene `title` y `status` textuales,
  `description` textual opcional (por defecto `''`). UUID elegido por el cliente;
  el servidor asigna versión 1. Un UUID ya existente no se sobrescribe.
- `update`: versión esperada >= 1; **reemplazo completo** de título/estado y
  descripción (omitir descripción equivale a vaciarla). No es un patch parcial.
- `delete` / `restore`: versión esperada >= 1, datos `{}`. Borrado lógico o
  restauración, preservando texto/estado. Actualizar/borrar exige tarea viva;
  restaurar exige tombstone. Cada mutación aplicada incrementa versión en 1.
- Campos adicionales (`board_id`, `version`, `deleted_at`, etc.) se rechazan;
  versiones negativas, nulas, fraccionarias y combinaciones inválidas también.
- Un desfase de versión o estado incompatible devuelve `outcome: 'conflict'`
  con la fila actual autorizada, sin escritura de tarea. Crear un UUID que ya
  pertenece a otro tablero devuelve conflicto con `task: null`, sin filtrar datos.
  Operar sobre una tarea ausente en el tablero indicado da `P0002`.
- Cada resultado aplicado **o conflicto** queda guardado en la misma transacción.
  Repetir actor/op y JSONB idéntico devuelve ese resultado original, aunque la
  tarea haya cambiado después. El orden de claves JSON no importa; omitir campos,
  espacios en cadenas o cambiar cualquier argumento sí cambia el payload.
  La misma identidad con payload distinto falla (`22023`). Una excepción revierte
  toda la operación y no consume esa identidad.
- Membresía se comprueba **antes de dedup en cada llamada**; un revocado no puede
  recuperar ni ejecutar un resultado antiguo. Actor/op tiene ámbito global por
  usuario; otro usuario puede utilizar el mismo UUID de operación independientemente.

Todas las RPC mutadoras de un tablero existente toman `FOR UPDATE` sobre su fila
antes de comprobar acceso. Así, escritura/revocación tienen un orden definido:
una operación que obtuvo el lock primero puede terminar antes de la revocación;
una posterior a su commit se rechaza. Las tareas además se bloquean al consultarlas.
Un advisory lock transaccional por hash actor/op serializa identidades incluso
entre tableros distintos; la PK y comparación de payload, no el hash, deciden la
deduplicación. Hashes coincidentes solo introducen espera adicional. Este bloqueo
grueso por tablero sacrifica paralelismo deliberadamente para el experimento.

## Snapshot y reconexión: límite explícito

Las pruebas reconstruyen un snapshot con SELECT de tareas **sin filtrar
`deleted_at`**, incluyendo tombstones. No hay cursor incremental, Realtime,
outbox SQLite, sincronizador móvil ni protocolo de paginación consistente.
`updated_at` y `version` no se presentan como un cursor global de commits.

La API tiene un máximo de 1000 filas y las pruebas usan tableros diminutos.
Este SELECT solo sirve como snapshot de una petición en este experimento; una
lectura de varias tablas/páginas bajo cambios concurrentes no es un snapshot
atómico global. No usarlo para producción ni afirmar que recupera arbitrariamente
grandes tableros sin pérdidas. Tampoco hay retención/purga de tombstones u
operaciones, resolución UI de conflictos, renovación de sesión, expiración/offline,
migración de SQLite, recuperación de backups, cuotas o validación móvil. La
revocación no puede retirar información que un usuario ya descargó.

## Cobertura y validación realizada en este equipo

La integración HTTP cubre A propietario, B miembro y tercero ajeno: Auth/signup,
compartir/revocar, protección del propietario, RLS en las tres tablas, anónimo,
escrituras REST prohibidas, aislamiento entre tableros, retry de create,
reutilización de identidad con payload distinto, límites/tipos/campos servidor,
update concurrente con un solo ganador, conflicto sin overwrite y retry estable,
tombstone/restore condicionado por versión, retries concurrentes y revocación
incluido retry antiguo. También compite la misma identidad con payload distinto
entre dos tableros accesibles para comprobar el bloqueo global actor/op.

**Aquí (Windows) no hay Docker ni Podman**, por lo que no se ejecutó el stack
local en este equipo. Sí se ejecutaron `start`, `db reset`, `db lint` y la suite
Auth/Postgres/RLS/RPC reales en Ubuntu CI: run
https://github.com/ralaindev/Tareapps/actions/runs/41202732266, correcto antes del
merge de la base #6. La evidencia local adicional fue:

```sh
npm view supabase version                          # 2.122.0
npx --yes supabase@2.122.0 --version                # 2.122.0
npx --yes supabase@2.122.0 db lint --help           # flags contrastados
npx --yes supabase@2.122.0 db reset --help          # flags contrastados
npx --yes supabase@2.122.0 stop --help              # flags contrastados
npx --yes supabase@2.122.0 status                  # fallo esperado: Docker/Podman ausentes
node --check experiments/cloud/client.mjs
node --check experiments/cloud/guards.test.mjs
node --check experiments/cloud/integration.test.mjs
node --check experiments/cloud/run-local-ci.mjs
node --test experiments/cloud/guards.test.mjs      # guardas locales, no integración
npm run lint
npm run typecheck
git diff --check
```

La CLI llegó a inspeccionar Docker tras cargar/validar configuración; esto no
prueba que arranque el stack. Configuración contrastada con la
[plantilla de CLI v2.122.0](https://github.com/supabase/cli/blob/v2.122.0/apps/cli-go/pkg/config/templates/config.toml)
y revisión estática de permisos, bloqueos y transacción. La ejecución Ubuntu indicada
arriba acredita el experimento SQL/HTTP, no una app móvil conectada ni producción.
No se han creado recursos cloud; la base se integró por PR. Las claves administrativas
nunca deben llegar al móvil.
