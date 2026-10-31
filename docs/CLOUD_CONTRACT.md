# Contrato cloud v1 — base para planificación y experimento

**Fecha/base:** 2026-10-31. Vinculado a [SDD §16](../SDD.md#16-base-v2--cuentas-opcionales-y-colaboración), AC38–AC48. Es un contrato futuro versionado y revisable, no una API desplegada ni una integración existente en En foco. El número **v1 del protocolo** es independiente de la base de producto v2 y del esquema **SQLite v2** actual.

## 1. Alcance y estados

La autorización de los cuatro pasos cubre flujo de trabajo, formulario, esta especificación y experimento Auth/RLS/versiones. La migración de datos locales, cuentas, selector, invitaciones y motor de sincronización dentro de la app pertenecen a entregas posteriores. La base se integró en la PR #6; no es una entrega cloud del producto.

| Área | Estado y evidencia exigida |
| --- | --- |
| App actual | Local/offline, sin cliente Supabase. AC37 es la mejora local del formulario, independiente de este protocolo. |
| Contrato v1 | Base normativa para diseñar y probar; nombres lógicos, sin afirmar funciones SQL o endpoints ya creados. |
| Experimento `supabase/` | Implementado y verificado en CI 41202732266 con Auth real, dos usuarios/ajeno, RLS/RPC/versiones/tombstones y snapshots. Sin invitaciones/responsables/cursor de producción. No acredita nube en la app. |
| Producción | OTP por email como baseline propuesto; cursor incremental, retención operativa, sesión móvil e integración UI pendientes. |

Las decisiones iniciales de producto están en el SDD y pueden revisarse. Este contrato concreta invariantes técnicos; un cambio incompatible deberá versionar el protocolo y definir compatibilidad/migración. `contract_version: 1` viajará en solicitudes/resultados; una versión desconocida se rechaza explícitamente, sin reinterpretarla.

## 2. Entidades y nombres

Servidor/API usa **snake_case**. Modelo local/dominio usa **camelCase** mediante adaptadores explícitos (`board_id` ↔ `boardId`, `expected_version` ↔ `expectedVersion`). No renombrar silenciosamente las columnas SQLite existentes: cualquier cambio requiere migración versionada. IDs UUID estables; fechas servidor en UTC, sin usar relojes móviles para concurrencia.

| Entidad futura | Campos contractuales mínimos y reglas |
| --- | --- |
| `profiles` | `user_id` ligado a Auth, `display_name`. Identidad pública mínima; no exponer emails como directorio de miembros. |
| `boards` | `id`, `owner_id`, `kind` (`personal`/`shared`), `title`, `version`, `created_at`, `updated_at`, `deleted_at` nullable. Ownership no editable por la mutación ordinaria de tareas. |
| `board_members` | `board_id`, `user_id`, `role` (`owner`/`member`), estado activo/revocado, versión/metadatos de cambio. Unicidad `(board_id,user_id)`; owner coincide con `boards.owner_id`, exactamente uno activo. |
| `tasks` | `id`, `board_id`, `created_by`, `assignee_id` nullable, `title`, `description`, `status`, `created_at`, `updated_at`, `column_entered_at`, `version`, `deleted_at` nullable. Título recortado 1–120, descripción ≤2000; estados `pending`, `in_progress`, `done`. |
| `invitations` | `id`, `board_id`, `created_by`, `token_hash`, `expires_at`, `consumed_at`, `consumed_by`, `revoked_at`, destinatario opcional protegido. Solo invita como member; TTL inicial 7 días, configurable explícitamente. |
| Registro de operaciones | Principal autenticado, `operation_id`, versión de contrato, huella canónica de solicitud, resultado terminal y referencia a entidad/tablero. Unicidad por principal/operación; no es un historial público. |
| Recuperación de cambios | Contrato incremental de producción aún pendiente; debe incluir tombstones y cambios de acceso. No se da por existente una tabla/feed o cursor concreto. |

`version` es entero positivo asignado por servidor, incrementado en cada mutación efectiva; `expected_version: 0` representa ausencia solo en create. `updated_at` no sustituye esa versión. Crear/mover fija orden autoritativo de entrada en columna; editar texto conserva `column_entered_at`. El desempate por ID mantiene orden determinista. El dispositivo separa versión/orden confirmados del estado local pendiente.

## 3. Ownership, membership y permisos

- Local sin cuenta tiene un ámbito propio, no un usuario Auth ficticio. Tablero personal de cuenta admite solo owner; añadir miembros requiere conversión explícita a shared.
- Owner activo consulta/muta tareas y administra invitaciones/miembros. Member activo consulta y crea/edita/mueve/borra/restaura tareas del tablero; no cambia roles, owner ni pertenencia de una tarea.
- Anónimo, usuario ajeno y miembro revocado no leen ni escriben datos del tablero. RLS y grants cubren tablas, consultas y mutaciones: ocultar botones o usar filtros cliente no autoriza.
- `created_by` se deriva de la sesión y es inmutable. `board_id` de una tarea es inmutable en estas operaciones. Asignar solo a miembro activo del mismo tablero; retirar membresía desasigna tareas en transacción e incrementa versiones afectadas.
- No se puede retirar al owner ni autoascender. Transferencia/cierre requieren contrato posterior, no un UPDATE genérico.
- Creación de tablero y membership owner es atómica. Aceptar invitación valida usuario, hash, expiración según reloj servidor, revocación, uso único y email verificado cuando se especificó; consumo y alta de membership son atómicos. Una carrera no concede dos usos. Reintentar una aceptación confirmada puede devolver su recibo al mismo usuario autorizado, sin consumir de nuevo ni otorgar otro rol.
- Tokens de invitación brutos solo en el enlace entregado; hash en servidor. No ponerlos en logs, fixtures públicas ni resultados de listado. RLS no expone hashes ni registro de operaciones a otros miembros.
- Funciones privilegiadas, si se usan, requieren grants mínimos, contexto de sesión comprobado y `search_path` seguro; evitar políticas recursivas. Nunca incluir `service_role`, claves secretas ni conexión Postgres en la app o en variables públicas.

## 4. Solicitud de mutación v1

Forma lógica de las operaciones de tarea, no un endpoint ya implementado:

```json
{
  "contract_version": 1,
  "operation_id": "UUID estable para este intento lógico",
  "board_id": "UUID",
  "entity_id": "UUID de tarea",
  "kind": "update",
  "expected_version": 3,
  "payload": { "title": "Comprar pan" }
}
```

La identidad de cuenta viene de Auth, nunca de un `user_id` confiado al cliente. La huella canónica incluye versión de contrato, tablero, entidad, tipo, versión esperada y payload normalizado; el principal queda ligado por separado. Para compensaciones se admite `compensates_operation_id`, también incluido en la huella, que referencia el resultado original de esa tarea y principal. No incluye campos de transporte como contador de reintentos. Campos no permitidos se rechazan.

| `kind` | Precondición por igualdad y efecto atómico |
| --- | --- |
| `create` | `expected_version = 0` y ausencia del ID, incluido cualquier tombstone/reserva de borrado. Inserta versión 1, autor de sesión y campos válidos; alta ordinaria en `pending`. La importación que conserve otro estado necesita un flujo explícito validado, no eludir la regla del alta. No equivale a upsert. |
| `update` | Tarea viva y `version = expected_version`. Aplica campos permitidos (texto, estado, responsable), incrementa versión; mover cambia entrada en columna, editar texto no. |
| `delete` | Tarea viva y versión exactamente esperada. Crea tombstone con versión siguiente; no hace borrado físico inmediato. |
| `restore` | Tombstone recuperable y versión exactamente esperada. Restaura la identidad y snapshot autorizado retenido, incrementando versión; valida de nuevo permisos y responsable. No permite INSERT ciego ni recreación de un ID purgado. |

Una operación no se divide en efectos parciales. La respuesta incluye `contract_version`, `operation_id`, resultado y, cuando existe acceso, versión/registro autoritativo o tombstone. Una respuesta deduplicada es el recibo original, no garantía de que siga siendo el estado más reciente: reconciliar sin retroceder versiones locales ya confirmadas.

### 4.1. Orden obligatorio en servidor

1. Autenticar sesión y **revalidar acceso actual al tablero/operación antes de consultar o devolver deduplicación**. Un revocado no recupera datos a través de un recibo antiguo. Serializar la comprobación de membership con revocación para que la mutación tenga un punto de autorización coherente.
2. Validar contrato y forma; adquirir la exclusión necesaria para `(principal, operation_id)` y la entidad afectada.
3. Si existe ese ID con huella idéntica, devolver el mismo resultado terminal autorizado sin reaplicar. Si la huella difiere, rechazar como `operation_id_reused`; no editar el recibo previo.
4. En una sola transacción validar campos/permisos específicos, comprobar **igualdad** de versión, mutar o registrar conflicto/rechazo de dominio y persistir el recibo terminal. Dos operaciones con la misma versión base no pueden ganar ambas. La igualdad no es `>=` ni comparación de timestamps.
5. Confirmar y responder. Caída antes del commit no deja efecto parcial; caída tras commit se recupera reintentando la solicitud idéntica.

Errores de transporte/servidor transitorios no se almacenan como éxito terminal. Autenticación/autorización fallida devuelve un error sin datos protegidos y prevalece sobre recibos anteriores. Para corregir un payload o resolver un conflicto se crea **nuevo** `operation_id` con nueva versión base; no se recicla el ID anterior. Reintentos idénticos de un conflicto registrado siguen devolviendo ese conflicto, no se convierten en éxito porque cambió después la entidad.

### 4.2. Resultados lógicos

| Resultado | Tratamiento cliente |
| --- | --- |
| `applied` | Confirmar resultado/versión remota y retirar pendiente en transacción local. |
| `conflict` | Versión obsoleta/estado incompatible; conservar intención y borrador local, mostrar resolución explícita. Devolver estado actual solo si sigue autorizado. |
| `rejected` | Validación, permiso, invitación, ID reutilizado o restauración expirada; conservar explicación recuperable sin reintento infinito. Acceso denegado no incluye snapshot. |
| Sesión vencida / fallo transitorio | Pausar o reintentar según causa; no declarar rechazo terminal ni éxito si el resultado sigue desconocido. Reautenticar la misma cuenta antes de reenviar. |

Nunca fusionar textos automáticamente ni usar last-write-wins silencioso, incluso si las ediciones afectan campos diferentes. La resolución muestra versión local/remota, conserva trabajo y solicita una nueva intención explícita contra la versión confirmada.

## 5. SQLite, outbox y aislamiento

### 5.1. Mutaciones y red

Una transacción SQLite guarda el cambio local y su operación durable de outbox; solo después del commit se actualiza memoria/UI. Confirmación de respuesta remota y reconciliación local también son atómicas. SQL parametrizado, migraciones versionadas y cola compartida de almacenamiento conservan las garantías actuales.

**No hay `await` de red dentro de transacciones ni de la cola SQLite.** Se permiten únicamente esperas propias de almacenamiento en esa sección. El motor toma un lote/snapshot breve, libera la cola, solicita red y vuelve con una transacción local corta. Tampoco mantiene el bloqueo global de comandos de UI mientras espera Internet.

Outbox local separada por `accountId`/`boardId`; cada entrada contiene identidad de operación, secuencia local durable, versión confirmada base, payload, estado, intentos, próxima ejecución y error sin secretos.

| Estado | Significado/transición |
| --- | --- |
| `pending` | Sin confirmación terminal; incluye red incierta y espera de sesión/backoff. Reintento conserva ID, versión y payload exactos. |
| `conflict` | Respuesta de conflicto; se conserva intención. Bloquea operaciones dependientes hasta resolver/descartar explícitamente. |
| `rejected` | Rechazo terminal explicado; no se reintenta automáticamente. Conservar o retirar intención según decisión explícita y permisos. |

Una operación aplicada sale de pendientes con su recibo/versiones confirmadas; no confundir ese acuse con una descarga completa. El estado visual local puede ser optimista tras commit local, pero no se etiqueta «sincronizado» hasta confirmación real.

### 5.2. Orden, dependencias y reintentos

- Un emisor por cuenta activa, orden durable por secuencia de esa cuenta; no procesar dos escrituras concurrentes de la misma entidad. Una dependencia bloqueada no se salta a ciegas. Otros tableros/entidades independientes solo podrán avanzar con regla explícita que respete dependencias.
- Si hay varias intenciones locales sobre una tarea, las siguientes esperan la versión resultante confirmada. Distinguir intención aún no enviada del sobre inmutable ya enviado: solo materializar el siguiente sobre con la nueva base cuando se conozca. No cambiar `expected_version` de una solicitud cuyo resultado sea incierto.
- Timeout/reconexión: reenviar la misma operación con backoff exponencial acotado, jitter y máximo por ciclo; después ofrecer reintento. Recuperar al volver a primer plano/red/sesión, sin prometer ejecución continua en segundo plano.
- Cambio de cuenta cancela emisor/suscripciones y descarta respuestas tardías para el contexto de UI activo. Una respuesta solo puede reconciliar el ámbito de su cuenta original con sesión/contexto válidos, nunca la cuenta nueva.
- Logout hace inaccesible la caché autenticada y no la convierte en local anónima. Con pendientes, explicar que no están confirmados y permitir cancelar salida o conservarlos aislados para reautenticar la misma cuenta; un descarte/borrado irreversible exige decisión explícita. El espacio local sin cuenta permanece separado.
- Revocación detectada oculta/bloquea datos de ese tablero y rechaza reenvíos; no promete borrar una copia de un dispositivo desconectado. Duración máxima de acceso offline, cifrado/retención de caché y adaptador de tokens móvil deben concretarse antes de producción.

## 6. Migración e importación

Partir de SQLite **esquema v2**, no de una base vacía recreada. La siguiente migración crea ámbito/tablero local y asigna tareas existentes preservando IDs, campos, fechas, estados y orden; preferencias no se pierden. Una falla revierte la transacción, mantiene la base recuperable y se puede reintentar sin borrar tablas para ocultar errores.

Importación cloud separada, voluntaria y con vista previa/conteo/destino de cuenta/tablero. Guardar una identidad durable de importación y correspondencia `(origen local, tarea, cuenta destino, tablero destino) → entidad/operación` antes del envío; su reanudación reutiliza los mismos IDs. En colisión con un ID remoto ajeno al recibo de importación, detener/explicar, nunca sobrescribir. Confirmar por tarea y reanudar fallos parciales sin duplicar. No subir silenciosamente nuevas ediciones de la copia local ni borrar esa copia tras importar. Importar hacia otra cuenta requiere nueva decisión explícita y ámbito separado.

## 7. Borrado, compensaciones y retención segura

- Delete conserva tombstone e identidad/versiones; las lecturas normales ocultan su contenido, la recuperación autorizada conoce el borrado. Un snapshot no debe permitir que una outbox obsoleta resucite el registro.
- Deshacer un movimiento es `update` compensatorio con versión de su resultado; Deshacer un borrado es `restore` contra la versión del tombstone. Nunca decrementar versión ni sobrescribir cambios ajenos. Mantener 6 s, sin caducidad temporal con lector, cierre accesible, una oportunidad, invalidaciones y límite al proceso del SDD.
- La compensación referencia `compensates_operation_id`; servidor valida misma tarea/principal y que la versión esperada sea la resultante de esa operación. Obtiene estado/entrada en columna anteriores del snapshot retenido con el recibo, sin aceptar una fecha de orden arbitraria del móvil. Así recupera la posición previa en lugar de tratar Deshacer como un movimiento nuevo al principio. Si falta el snapshot o ya cambió la versión, rechaza de forma explícita. Las operaciones ordinarias no permiten escribir fechas servidor.
- Si el original sigue pendiente, registrar dependencia; resolver su acuse antes de materializar la compensación contra la versión real. No borrar a ciegas una solicitud posiblemente aplicada ni decir que se restauró remotamente antes de confirmación. Si el original fue rechazado, reconciliar el estado local y explicar que no hubo efecto remoto que revertir.
- Si una asignación dejó de ser válida, no restaurarla silenciosamente: conflicto/rechazo con explicación para una nueva resolución. La restauración conserva identidad, datos válidos y posición previa cuando la versión lo permite; `updated_at` y versión reflejan la compensación.
- Rehacer sería otra compensación con nuevo ID y versión esperada. No hay pila ni control Rehacer en el alcance actual.
- No fijar una duración numérica arbitraria de tombstones/recibos como garantía de producción. Definir conjuntamente ventana máxima offline/reintentos, horizonte de deduplicación y restauración, épocas de clientes y recuperación tras vencimiento. Hasta demostrar esas condiciones, el experimento no purga automáticamente tombstones ni recibos.
- Purga futura solo si un cliente antiguo no puede recrear un ID borrado o repetir efectos: conservar reserva mínima de identidad/versión o rechazar épocas/operaciones antiguas con rehidratación obligatoria. Si caduca la ventana de restauración, responder explícitamente sin INSERT. No eliminar recibos dejando que el mismo ID se trate como nuevo. La retención segura no se deriva solo de la antigüedad ni de que un cliente haya confirmado.

## 8. Lectura y recuperación: snapshot experimental vs cursor futuro

### Experimento local

Usa **snapshot completo autorizado** del tablero con tareas vivas, tombstones y versiones. Debe ser coherente en el servidor; no componer una supuesta foto con consultas independientes que puedan mezclar estados. Reconciliar snapshot y resultado local sin borrar outbox ni intenciones en conflicto. Dos sesiones Auth reales representan usuarios distintos; sus clientes de prueba y snapshots no son un motor de sincronización móvil. Tras reconexión, volver a obtener snapshot y reenviar pendientes según contrato.

### Producción — aún NO implementado ni protocolo de cursor cerrado

Se exige recuperación incremental paginada sin perder commits concurrentes, incluyendo borrados y cambios de acceso. El diseño debe demostrar orden estable compatible con visibilidad de commits, límite consistente de páginas, repetición/continuación y expiración. **No se inventa un watermark de timestamp**, ni se supone correcto `updated_at > últimoValor`; tampoco basta una secuencia reservada antes del commit sin resolver huecos/visibilidad.

Aplicar página y persistir su cursor en la misma transacción SQLite. Cursor opaco, versionado y ligado a cuenta/ámbito; no reutilizar entre cuentas. Ante expiración, rehidratar con snapshot coherente conservando operaciones locales y conflictos, sin sustituir el trabajo pendiente por una tabla vacía. Realtime, si se añade, solo avisa para volver a consultar: no sustituye recuperación durable. AC47 queda pendiente hasta implementar y probar este protocolo de producción.

## 9. Experimento aislado y definición de terminado

Código/fixtures del experimento irán en `supabase/`, sin añadir SDK, credenciales, Auth ni cliente cloud a la app. Usar Supabase local con Auth real y email/contraseña de prueba; OTP de producción, enlaces móviles y proveedores de correo no quedan validados por ello. No requiere crear proyecto remoto ni usar datos personales reales. Fijar versión de herramientas y comandos reproducibles al implementarlo.

Checklist de evidencia para dar el experimento por terminado:

- [ ] Arranque/reset local reproducible y migraciones/RLS/grants/RPC versionadas; reset solo de la base efímera de prueba, nunca SQLite del usuario.
- [ ] Dos usuarios con signup/login reales y tokens emitidos por Auth local; anónimo probado sin sesión. No sustituirlo por JWT inventados ni un mock de cliente.
- [ ] Owner A con tablero personal inaccesible para B; tablero shared con B member; B modifica tareas pero no administra roles/invitaciones. A y B tienen también datos aislados.
- [ ] Acceso directo permitido/denegado por RLS y funciones; intentos de cambiar tablero/autor, autoascender, asignar ajeno y retirar owner rechazados. Comprobar que grants no dejan rutas alternativas sin control.
- [ ] Create/update/delete/restore con versión por igualdad, dos escrituras concurrentes contra misma base, duplicado idéntico y colisión de ID con payload distinto. Una respuesta perdida se recupera sin duplicar efectos.
- [ ] Revocar B y después reintentar una operación ya confirmada: acceso denegado antes de deduplicación, sin fuga del recibo/snapshot; sesión caducada distinguida de conflicto.
- [ ] Reconexión con snapshot, tombstones y pendientes; compensación obsoleta no sobrescribe ni resucita; sin purga automática. Invitaciones, si se implementan en esta fase, requieren TTL/uso único/carrera/revocación reales, no se marcan cubiertas por pruebas de tareas.
- [ ] Tests SQL de migración/importación se registran separadamente de Auth/RLS; pruebas con dobles pueden cubrir UI/outbox pero no acreditan permisos del servidor.
- [ ] CI levanta Supabase local real y ejecuta los tests de Auth/RLS con fallos que bloqueen el job; registrar comando, versiones, fecha y resultado. Si falta integración CI, el experimento puede tener evidencia local pero no se declara terminado con CI real.

Un run de lint/tipos/Jest de la app no implica haber ejecutado estos checks. Ninguna de estas pruebas acredita dispositivos, build nativo, entrega OTP, cursor incremental ni colaboración integrada. Registrar cada área como implementada, verificada localmente, verificada en CI real o pendiente, con evidencia enlazada, sin trasladar automáticamente el estado de una a otra.

## 10. Referencias y pendientes de producción

- Producto, decisiones iniciales y AC: [SDD §16](../SDD.md#16-base-v2--cuentas-opcionales-y-colaboración).
- Contexto/ASCII y secuencia 1–4: [diagnóstico de TECH_PLAN](../TECH_PLAN.md#diagnóstico-y-propuestas-de-evolución--2026-10-31), Bocetos A/B y PROP-DATA01/PROP-CLOUD01/02. El plan técnico se actualiza por separado.
- Antes de implementar detalles dependientes de versión, contrastar documentación oficial: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [desarrollo local](https://supabase.com/docs/guides/local-development), [Auth OTP email](https://supabase.com/docs/guides/auth/auth-email-passwordless). Estas referencias no acreditan una consulta de versiones/APIs ni una integración ejecutada en esta tarea documental.

Pendientes de producción: cursor probado, retención/épocas, política de caché offline y tokens móvil, OTP/entrega/recuperación, UI de conflictos, flujos completos de invitación/cuenta, observabilidad sin secretos y operación/backup/región/cuotas. Las decisiones iniciales permiten planificar y experimentar; no sustituyen la implementación ni autorizan despliegues o gasto.
