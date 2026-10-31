# En foco — Plan técnico

## Continuación: GitHub y nube

### Base de trabajo autorizada — pasos 1–4

El usuario autorizó ejecutar la primera base completa y tomar decisiones iniciales
revisables sin esperar respuesta. Esto supersede el estado «solo propuestas» para
el alcance siguiente, no para todo el roadmap:

1. Project privado https://github.com/users/ralaindev/projects/1, issue padre #1 y
   sub-issues #2–#5; ramas desde `develop`, plantillas y controles de contribución.
   `docs/DEVELOPMENT.md` define revisión local firmada, fuente confiable y límites.
2. Formulario con ayuda obligatoria, validación tras blur y contador de descripción;
   tests de interacción. No se rediseñan tarjetas/gestos ni se afirma prueba física.
3. SDD v2 inicial en la sección 16 de `SDD.md` y contrato v1 en
   `docs/CLOUD_CONTRACT.md`. AC37 corresponde al formulario; AC38–AC48 son objetivos
   de nube, no una declaración de que la app ya los cumple.
4. Experimento separado `supabase/` + `experiments/cloud/`: Auth, Postgres/RLS y RPC
   versionadas con dos usuarios y ajeno, reintentos/conflictos/borrados/revocación.
   No requiere SDK Supabase en la app ni modifica su SQLite v2.

El bootstrap instala la primera PR en `main` antes de activar la protección, revisada
independientemente; después se alinea `develop`, se activan reglas y se prueba una PR
piloto. Registrar la evidencia efectiva al terminar, sin presentar configuración como
bloqueo probado. Docker no está disponible en el equipo Windows; la integración real
se ejecutará en Ubuntu/Docker de CI. Sin recursos cloud remotos, tiendas ni costes.

Los párrafos históricos siguientes conservan el diagnóstico previo. Para estado vigente,
consultar esta sección, `docs/DEVELOPMENT.md` y los resultados enlazados de las PRs.

**Evidencia de la base:** PR https://github.com/ralaindev/Tareapps/pull/6,
CI real https://github.com/ralaindev/Tareapps/actions/runs/41202732266.
81 tests Jest/7 suites, 9 tests criptográficos/servicio, Gitleaks y experimento Auth/RLS
correctos. La revisión independiente detectó dos bloqueos del gate (replay y verde
obsoleto ante fallo), corregidos y revisados antes de fusionar. `main`/`develop`
ya tienen protecciones estrictas con cuatro checks requeridos aplicados a admin,
sin force-push ni borrado. La PR piloto #8 registra el bloqueo real sin firma, con
firma inválida y la aprobación válida; consultar su historial para obsolescencia
tras nuevos commits y resultado final. Guía y enlaces en `docs/DEVELOPMENT.md`.

**Estado:** app local implementada y base inicial de pasos 1–4 integrada mediante PR #6. Hay SDD v2/contrato inicial y experimento backend aislado, no nube integrada en la app. Leer `AGENTS.md` y verificar Git antes de actuar.

### Estado de GitHub y pasos pendientes

1. Completado el 2026-10-31: GitHub CLI 2.103.3 instalada para el usuario y autenticación verificada como `ralaindev`. **https://github.com/ralaindev/Tareapps** es público después de una migración autorizada para preservar la privacidad del correo; el repositorio original permanece privado como `Tareapps-private-history`. No volver a crearlos.
2. Configurar/verificar el MCP de GitHub con acceso limitado a lo necesario. Se dispone de una variable local prevista, `GITHUB_PERSONAL_ACCESS_TOKEN`; jamás imprimir su contenido ni guardarlo en el repositorio. El token classic se validó antes, pero hay que comprobar su vigencia de nuevo.
3. El usuario autorizó después el primer commit y push. Remoto local `origin`: `https://github.com/ralaindev/Tareapps.git`; rama local `main`. Autenticación Git de lectura verificada con GitHub CLI, sin persistir el token ni cambiar la configuración global de credenciales. Antes del primer commit se reforzó `.gitignore` para excluir `.env` y bases SQLite, no se detectaron patrones habituales de credenciales y pasaron lint, tipos y 78 tests en 7 suites con Node.js 24. Consultar Git/GitHub para verificar el historial y seguimiento efectivo de `origin/main`. Esta autorización no incluye CI, nube ni despliegues.
4. Verificar los MCP/proyectos de Supabase, Vercel y Expo. Se observó Supabase en la configuración global, no se verificó integración de la app. No hay SDK Supabase, sesión de usuario ni sincronización implementados.

### CI de GitHub Actions

Configuración solicitada después del primer envío: `.github/workflows/ci.yml`, un job Ubuntu/Node.js 24 con instalación reproducible (`npm ci`), lint, tipos y tests secuenciales. Eventos: push a `main`, PR dirigida a `main` y ejecución manual. Acciones oficiales checkout/setup-node v7 fijadas por SHA, caché npm por lockfile, permisos `contents: read`, sin credenciales persistidas ni secretos adicionales, timeout de 15 minutos y cancelación de ejecuciones obsoletas por referencia. No incluye builds nativos, despliegues ni cambios de protección de rama/facturación.

Workflow conservado tras reescribir el historial y migrar a un repositorio independiente. Primera ejecución real correcta en el repositorio público nuevo el 2026-10-31: [run 41199748669](https://github.com/ralaindev/Tareapps/actions/runs/41199748669), para `f74ea78`, con instalación desde cero, lint, tipos y tests aprobados en Ubuntu/Node.js 24; job completado en 1 min 4 s. Los runners estándar de Actions son gratuitos para este repositorio público. No se ha modificado facturación ni protección de ramas; los runs anteriores permanecen en el repositorio histórico privado.

Validación local del workflow: `actionlint` 1.7.12 sin errores; lint, tipos y los 78 tests en 7 suites correctos con `CI=true` y Jest `--ci` en Windows/Node.js 24. La ejecución remota indicada arriba verifica también la instalación desde cero y los comandos de calidad en Ubuntu, no una compilación nativa ni una prueba en dispositivo.

### Privacidad del historial y publicación completada

El usuario autorizó hacer público el repositorio después de auditarlo y sustituir su correo por la dirección `noreply` de GitHub facilitada. Gitleaks 8.30.1 no detectó secretos en los tres commits originales ni en los logs de las dos ejecuciones originales de CI. No había issues, PRs, releases ni artefactos. Se guardó una copia de seguridad privada fuera del workspace y se reescribieron los tres commits con git-filter-repo 2.47.0, sustituyendo autor y committer. Se configuró `user.email` solo en este repositorio y se actualizó `main` con `--force-with-lease` ligado al SHA remoto anterior. El árbol de archivos antes/después es idéntico.

Historial corregido migrado: `1e38e32`, `d3100d2`, `f74ea78`. Todos los autores/committers usan `noreply` y Gitleaks no detectó secretos. La ejecución de CI posterior a la migración se enlaza arriba.

**Migración autorizada y verificada:** GitHub seguía permitiendo consultar los SHA anteriores con correo personal en el repositorio original; reescribir la rama no purga el servidor. Con autorización expresa se renombró ese repositorio a `ralaindev/Tareapps-private-history` (ID `1440651818`) manteniéndolo privado, sin borrarlo. Se creó `ralaindev/Tareapps` como repositorio independiente (ID `1440819993`, no fork), inicialmente privado, y se subió solo `main` corregido. Tras comprobar que los tres SHA antiguos devolvían HTTP 422, se hizo público. Una segunda comprobación sin autenticación verificó: acceso al nuevo público, todos los commits públicos con `noreply`, tres SHA antiguos inaccesibles desde el nuevo (HTTP 422) e histórico privado inaccesible (HTTP 404). El remoto local `origin` apunta al nuevo repositorio. No publicar el histórico ni subir las copias de seguridad locales; no se afirma haber purgado los objetos del servidor anterior.

Flujo posterior solicitado, pendiente de especificación y configuración: Project con épicas como issues padre y sub-issues listas para desarrollar en paralelo; ramas temporales desde `develop`, PRs trazables, borrado tras merge, checks de calidad y revisión IA obligatoria para el commit revisado. Revisor remoto solo si es gratuito; en caso contrario local, sin dar por resuelta todavía la conexión segura de ese resultado con un check requerido de GitHub.

### Roadmap propuesto, pendiente de concretar

| Etapa | Alcance discutido | Cierre previo al código |
| --- | --- | --- |
| Nube y colaboración | Cuenta, tableros personales/compartidos, invitaciones, miembros y responsables. | SDD v2, acceso/permisos, alta y migración de datos locales, flujos y criterios aprobados. |
| Sincronización | SQLite local más backend y cambios compartidos. | Cola offline, identificadores/versiones, política de conflictos y borrados, reintentos y Deshacer multiusuario. |
| Convivencia | Recurrencia, fechas y recordatorios; posible rotación posterior. | Reglas de repetición, zonas horarias, asignación y política de notificaciones. |
| Organización | Checklists, búsqueda/filtros, archivo e historial. | Priorizar de forma incremental; no introducir chat, gamificación o más controles sin necesidad aprobada. |

Supabase se propuso para Postgres/Auth/permisos/Realtime; Vercel para la web y las invitaciones; Expo/EAS para compilar/distribuir la app nativa; GitHub para código/PR/CI. **Supabase Realtime no sincroniza por sí solo SQLite:** hay que diseñar e implementar el protocolo local/remoto.

Pendiente decidir: si se conservan tableros privados, cómo se aceptan invitaciones, asignación manual frente a rotación, método de inicio de sesión y reglas ante cambios simultáneos. Privados más compartidos y asignación manual fueron recomendaciones, no decisiones finales. No reutilizar ni cambiar IDs AC01–AC36 para estas propuestas: definir criterios nuevos al aprobar v2.

### Secuencia para la fase v2

- [ ] Confirmar GitHub y conexiones de desarrollo, sin modificar producción.
- [ ] Redactar y acordar SDD v2 y mockups de cuentas/tableros/miembros.
- [ ] Aprobar modelo remoto, RLS/autorización, migración local y estrategia offline/conflictos.
- [ ] Dividir el tech-plan v2 en tareas verificables con criterios y pruebas de aislamiento entre usuarios.
- [ ] Implementar por entregas, conservando la experiencia local y los datos existentes.
- [ ] Validar con dos usuarios y dos dispositivos, desconexiones/reconexiones, revocación de acceso y operaciones concurrentes.

Este roadmap no constituye permiso para crear recursos, efectuar despliegues o ampliar el alcance sin la petición correspondiente.

## Diagnóstico y propuestas de evolución — 2026-10-31

**Estado: análisis solicitado y propuestas, no aprobación para implementarlas.** Se amplía este documento porque ya describe la arquitectura y el roadmap; `SDD.md` sigue siendo la fuente del producto aprobado. No se cambian AC01–AC36 ni se presentan criterios nuevos como aceptados. Los identificadores `PROP-*` siguientes identifican propuestas, no criterios del SDD ni issues ya creadas.

### Base analizada y límites de la evidencia

- Revisión del código de tablero, tarjetas, formulario, temas, repositorios, proveedor, modelo y migraciones, contrastada con SDD, README y tests. Base de aplicación: historial corregido `f74ea78`; `a0916c9` documenta la migración pública y no cambia el código de la app.
- Evidencia automatizada: lint/tipos locales correctos y CI real correcta sobre `a0916c9`: https://github.com/ralaindev/Tareapps/actions/runs/41199927421. La suite del proyecto consta de 78 tests en 7 suites. No se ha realizado una nueva compilación nativa, exportación ni prueba física para este diagnóstico.
- No se han verificado proyecto, región, plan, credenciales ni conexión real de Supabase, Vercel o Expo/EAS. Consultar documentación no acredita una integración ni autoriza crear recursos.
- Los bocetos de abajo son textuales y conceptuales: no son capturas ni diseños probados en iPhone/Android. La inspección de código identifica riesgos, no demuestra cómo se comportan físicamente los gestos o el teclado.

### Estado actual: conservar la base, no reescribirla

| Área | Evidencia actual | Consecuencia para evolucionar |
| --- | --- | --- |
| Experiencia local | Detallada/Compacta, tema persistido, alta/edición, gestos y Deshacer implementados. | Conservar el uso sin cuenta y offline como recomendación; cuentas opcionales requieren acuerdo en v2. |
| Escrituras | [repository.ts](src/features/tasks/repository.ts) confirma SQLite antes de devolver; SQL parametrizado y control de versión local. | Mantener confirmación local antes de actualizar la UI; guardar también la operación de sincronización en la misma transacción. |
| Serialización | [queue.ts](src/storage/queue.ts) comparte cola entre repositorios; [TasksProvider](src/features/tasks/TasksProvider.tsx) usa un bloqueo global de comandos. | No sustituir la cola por peticiones concurrentes; un bloqueo global no debe mantenerse durante la espera de red. |
| Modelo | [model.ts](src/features/tasks/model.ts): UUID, texto, estado y marcas temporales; sin cuenta, tablero ni responsable. | UUID reutilizable; añadir pertenencia y versión remota exige migración y contratos, no solo nuevos componentes. |
| Persistencia | [migrations.ts](src/storage/migrations.ts): esquema v2 con `tasks` y `preferences`; carga todas las tareas. | Versionar el siguiente esquema, separar datos por cuenta/tablero y consultar el tablero activo sin mezclar usuarios. |
| Conflictos | `updatedAt` monotónico se obtiene del reloj y máximo local; se usa en actualizaciones y Deshacer. | Sirve como protección local, no como reloj global ni árbitro entre teléfonos. |
| Borrado | Eliminación física y restauración mediante INSERT de un snapshot. | Antes de sincronizar, diseñar tombstones, retención y compensación para no resucitar borrados ni sobrescribir cambios ajenos. |
| Entrega | CI pública con instalación/lint/tipos/tests; sin `develop`, Project ni revisor obligatorio configurados. | Terminar el flujo de trabajo antes de abrir varias implementaciones en paralelo. |

### Propuestas visuales y de usabilidad

| ID / prioridad | Hallazgo o necesidad | Propuesta | Comprobación de salida propuesta |
| --- | --- | --- | --- |
| PROP-UX01 / alta | [TaskForm](src/components/TaskForm.tsx) muestra contador solo de título; el botón puede estar deshabilitado sin explicación junto al campo. El SDD ya pide contadores y errores contextualizados. | Marcar título obligatorio, contador de descripción y validación contextual tras interacción; reservar el error fijo para fallos de guardado. Sin anuncios por cada carácter. | Título vacío/espacios, límites, pegado, borrador conservado, lector y teclado; no persistir al escribir. |
| PROP-UX02 / alta | [TaskCard](src/components/TaskCard.tsx) trunca título y descripción a dos líneas incluso en Detallada. | Comparar título adaptable en Detallada frente al límite actual; descripción resumida y Compacta de solo título. No reducir áreas táctiles para ganar densidad. | Maqueta en pantalla estrecha/texto ampliado y revisión física antes de aprobar el cambio visual. |
| PROP-UX03 / alta | [index.tsx](src/app/index.tsx) reserva `88 × fontScale` para Deshacer, cuyo contenido puede envolver en varias filas. No hay evidencia física de una oclusión. | Medir la altura efectiva del aviso y ajustar la reserva de las listas si la validación confirma el riesgo; no mover el pie. Revisar también foco útil al regresar. | Última tarjeta y controles alcanzables con aviso, texto grande, lector y ambas vistas en iOS/Android. |
| PROP-UX04 / media | [EmptyColumn](src/components/EmptyColumn.tsx) considera primera utilización cualquier tablero sin tareas; los textos de validación aún mezclan nombres históricos. | Vacío neutral sin fingir que es primera apertura; vocabulario actual consistente. Ayuda de gestos contextual y descartable solo si las pruebas muestran que es necesaria. | Vacío inicial y tras borrar todo; no añadir texto fijo redundante ni cambiar dirección/umbral del gesto. |
| PROP-UX05 / v2 | Futuros tableros, miembros y estado de red competirían por una cabecera mínima. | Título como selector de tablero; cuenta/miembros en su hoja secundaria. Responsable solo en formulario y metadato breve en Detallada; Compacta mantiene solo título inicialmente. | Mockup claro/oscuro con nombres largos, texto ampliado, selección accesible y borrador protegido al cambiar de tablero. |
| PROP-UX06 / v2 | La app actual guarda solo en el dispositivo. | Al implementar nube, distinguir guardado local, pendiente, sincronizando, error y conflicto; no mostrar ahora un estado «sincronizado» inexistente. Un aviso contextual por tablero, no insignias en todas las tarjetas. | Pruebas de red y persistencia demuestran cada mensaje; no se confunde sincronización con Deshacer ni se bloquea CRUD local. |

Invariantes: **«＋ Nueva tarea» con texto en el pie**, sin FAB; tres estados con códigos actuales; temas claro/oscuro, movimiento reducido y controles de al menos 48 × 48. No renombrar En foco. Mantener el orden por entrada en columna y que editar texto no reordene. No convertir las dos vistas en variantes casi idénticas.

**Boceto A — formulario afinado, sin nube (conceptual)**

```text
Cancelar                 Nueva tarea

Título · obligatorio
[ ¿Qué quieres hacer?              ]
                           0 / 120
Descripción · opcional
[ Añade algún detalle…             ]
                          0 / 2000
Se añadirá a Pendiente

───────────────────────────────────
[          Crear tarea            ]  ← barra fija, fuera del scroll
```

No mostrar un error rojo al abrir el formulario vacío: explicar el requisito y validar tras interacción. El contador visual no debe generar avisos de lector en cada pulsación.

**Boceto B — tablero compartido futuro (conceptual, no implementado)**

```text
Casa compartida ▾        [vista] [tema]
Pendiente 3 | En progreso 1 | Hecho 8

┌───────────────────────────────────┐
│ Comprar productos de limpieza     │
│ Detalle opcional…                 │
│ Responsable: Ana                  │
│                       Empezar →   │
└───────────────────────────────────┘

Sin conexión · guardado aquí         ← solo cuando proceda
[ Tarea movida · Deshacer · × ]       ← aviso independiente, flotante
─────────────────────────────────────
[          ＋ Nueva tarea           ]
```

La ubicación de ambos avisos requiere una maqueta con medidas para evitar solapamiento; no fijar el diseño final con este ASCII. En estado normal no añadir una fila permanente de «todo correcto». La hoja del selector contendría tablero personal/compartidos, selección actual y accesos secundarios a miembros/cuenta. El filtro «Mías» se propone después de validar volumen y necesidad, no junto a todos los controles iniciales.

### Propuesta de nube: SQLite local + Supabase, no conexión directa a Postgres

**PROP-CLOUD01 / prioridad alta, pendiente de SDD v2.** Objetivo recomendado para la primera entrega: conservar tareas locales, permitir cuenta, guardar en nube y compartir un tablero con asignación manual. Fuera inicialmente: chat, adjuntos, rotación automática, calendario complejo y web completa.

```text
UI y comandos de dominio
          ↓
SQLite: tareas + cola durable de operaciones, en una transacción
          ↓                         ↑
motor de sincronización     reconciliación / recuperación
          ↓                         ↑
Supabase Auth + API/RPC + Postgres con permisos y RLS
          ↑
Realtime: señal para volver a consultar, no fuente única de verdad
```

No enviar credenciales de conexión Postgres al móvil. Utilizar SDK/API autenticada, clave publicable y políticas servidor; nunca `service_role`/claves secretas en la app, repositorio o variables `EXPO_PUBLIC_*`. Las variables públicas terminan dentro del bundle: no son un almacén de secretos.

**Modelo conceptual mínimo — no es todavía un esquema SQL aprobado:**

| Entidad | Responsabilidad y restricciones a concretar |
| --- | --- |
| `profiles` | Identidad pública mínima asociada a Auth; no exponer correos de otros usuarios sin necesidad. |
| `boards` | Tablero personal/compartido, propietario y metadatos. Definir transferencia de propiedad y cierre del tablero. |
| `board_members` | Relación usuario/tablero y permisos. Propuesta inicial: propietario y miembro, sin jerarquías innecesarias. No permitir autoascenso ni alta unilateral. |
| `tasks` | Conservar UUID y texto/estado; añadir `board_id`, autor, responsable opcional, versión servidor y borrado lógico. Asignar solo a miembros activos del mismo tablero. |
| `invitations` | Alta y aceptación controladas en servidor, token almacenado como hash, caducidad y uso único. Aceptación autenticada y comprobación del destinatario si se invita por correo. |
| Registro de operaciones/cambios | Deduplificación por `operation_id`, versiones y feed paginado para recuperar cambios y borrados tras desconexiones. Retención explícita, no historial infinito. |

Los permisos deben cubrir lectura y escritura por operación, no solo ocultar pantallas. Evitar políticas RLS recursivas entre tableros y miembros; cualquier función privilegiada se revisa con permisos mínimos y `search_path` seguro. La clave publicable no sustituye RLS ni grants. Probar anónimo, miembro, propietario, ajeno y miembro revocado, incluyendo intentos de cambiar `board_id`, asignar otro usuario o elevar rol.

**PROP-CLOUD02 / sincronización — contrato que debe cerrarse antes del código:**

1. Cada escritura local guarda tarea y operación durable de forma atómica, antes de modificar memoria. Guardar en el teléfono no espera a Internet. La red nunca se espera dentro de la cola/transacción SQLite.
2. Enviar operaciones con identidad única y versión base esperada; el servidor valida sesión/pertenencia, aplica la mutación y registra deduplicación en una transacción. Repetir tras un timeout no crea otra tarea ni otro movimiento.
3. Propuesta conservadora de conflictos: actualización condicional sobre una versión servidor, con rechazo explícito si cambió. Mantener el borrador/operación local y ofrecer resolución; no aplicar «último reloj del móvil gana» ni fusión automática de textos. Validar esta UX antes de aprobarla.
4. Descargar cambios con un cursor/orden estable diseñado para no perder commits concurrentes; no usar solo `updatedAt > últimoValor`. Recuperar también tombstones. El cursor se confirma junto con la aplicación local de la página; si caduca, rehidratar sin perder operaciones pendientes.
5. Reintentos con backoff y límites; activar al recuperar sesión/red o volver al primer plano. Realtime solo acelera consultas; tras reconexión hay recuperación completa de los cambios pendientes. No prometer ejecución continua en segundo plano móvil.
6. El servidor devuelve orden/versión autoritativos; separar esos valores del estado pendiente local y definir cómo reconciliar `columnEnteredAt` sin reordenar por una simple edición de texto.
7. Deshacer se convierte en operación compensatoria condicionada a la versión esperada. Si ya hay cambios ajenos o se revocó acceso, no sobrescribir ni restaurar a ciegas. Mantener una sola oportunidad y las reglas accesibles de duración existentes, salvo ampliación aprobada explícitamente.

**PROP-CLOUD03 / migración y privacidad local:**

- Migrar desde esquema v2 sin borrar tablas para resolver errores: introducir un tablero local y asignar las tareas existentes preservando IDs, texto y orden. Probar datos vacíos, grandes y fallo/rollback de cada migración.
- Proponer acceso sin cuenta y un flujo voluntario «Guardar mis tareas en mi cuenta», con vista previa y conteo. Reintentar la misma importación no duplica. No atribuir datos locales automáticamente a la primera cuenta que inicie sesión.
- Separar estado en memoria, caché SQLite, outbox y cursores por cuenta/tablero; no reutilizar una cola de envíos de la cuenta A bajo la sesión B. Guardar tokens con un adaptador de persistencia elegido y validado para móvil; el ejemplo de autenticación no resuelve por sí mismo la seguridad de la sesión.
- Cerrar sesión detiene envíos/suscripciones y elimina el acceso a la caché de esa cuenta según política aprobada, sin mezclarla con tareas locales anónimas. Si hay cambios pendientes, explicar el riesgo y ofrecer una salida segura; nunca afirmar que están en nube si no hubo confirmación.
- Revocar un miembro bloquea inmediatamente sus nuevas operaciones en servidor y hace inaccesible su caché al detectarlo. **No se puede retirar remotamente información ya vista o copiada ni garantizar borrado instantáneo de un dispositivo offline**; documentar ese límite y decidir duración del acceso offline.
- Revisar exportación/importación local versionada como red de seguridad antes de migrar: validación, vista previa, duplicados e importación atómica; no es una funcionalidad actual ni se introduce silenciosamente junto a la nube.

### Comparación de caminos y coste

| Alternativa | Ventaja | Coste/riesgo | Recomendación |
| --- | --- | --- | --- |
| Sustituir SQLite por CRUD remoto | Menos piezas al principio. | Rompe el comportamiento offline aprobado y hace depender el guardado de red. | Descartar para este producto, salvo cambio explícito de objetivos. |
| SQLite + Supabase + protocolo propio acotado | Aprovecha la app y permite compartir con permisos claros. | Exige diseñar recuperación, deduplicación, versiones y borrados; no es «instalar un SDK». | Candidata preferente para la SDD v2; validar con un experimento pequeño antes de producción. |
| Motor local-first especializado con Supabase | Puede reducir mantenimiento de sincronización. | Dependencia, compatibilidad Expo/CNG, modelo de datos, privacidad y posibles costes. | Evaluar si el protocolo propio crece; no adoptar ni añadir dependencias sin comparar esos factores. |

Supabase, proveedores de autenticación/correo y notificaciones tienen cuotas y condiciones cambiantes: verificar plan, región, backups, suspensión, residencia de datos y límites antes de crear un proyecto. Un plan gratuito no equivale a backup garantizado ni a coste cero ilimitado. No hay presupuesto ni proyecto cloud aprobados. Vercel solo sería necesario para web/invitaciones si se decide usarlo; no aloja la app nativa. Expo/EAS se reserva para builds/distribución autorizados.

### Priorización y entregas propuestas

| Orden / propuesta | Entrega acotada | Dependencias | Evidencia para cerrarla |
| --- | --- | --- | --- |
| 0 — PROP-DEV01 | Especificar/configurar Projects, jerarquía, `develop`, ramas temporales y controles obligatorios. Revisor local si no hay servicio remoto gratuito verificado. | Concretar publicación segura del resultado local y fuente de confianza. | PR piloto bloqueada sin OK, con fallo y con revisión obsoleta; pasa con revisión válida del commit/contexto actual. No basta un comentario «OK». |
| 1 — PROP-UX01/03 | Claridad del formulario y auditoría física de accesibilidad/Deshacer; UX02/04 tras comparar mockups. | No depende de nube; no rediseñar simultáneamente todo el tablero. | Tests relevantes y checklist real en iOS/Android, con tamaño de texto y lector registrados. |
| 2 — PROP-SPEC01 | Acordar SDD v2, mockups, modelo y contratos de sincronización/permisos. | Decisiones de la tabla siguiente. | Criterios nuevos sin reutilizar AC01–AC36, errores/casos límite y tech-plan aprobados. |
| 3 — PROP-DATA01 | Migración local/tableros y pruebas de importación sin pérdida. | Modelo v2 aprobado. | Snapshot v2 conservado, fallo recuperable, IDs/orden y aislamiento local verificados. |
| 4 — PROP-CLOUD01/02 | Experimento de Auth/RLS + una tarea en dos clientes con reintentos/versiones. | Proyecto/entorno de pruebas autorizado; contratos cerrados. | Aislamiento real entre usuarios, duplicación de envío, reconexión y conflicto demostrados; sin datos personales reales. |
| 5 — PROP-UX05/06 + colaboración | Cuentas/tableros/invitaciones/responsable y estados de sincronización por entregas. | Migración y experimento anteriores correctos. | Dos usuarios y dispositivos, revocación, sesión caducada, borrado/Deshacer y borradores sin pérdida. |
| 6 — PROP-FUNC01 | Búsqueda/filtro «Mías», archivo de Hecho y checklists si el uso lo justifica. | Modelo/contratos estables; elegir una función por entrega. | Búsqueda sobre datos locales autorizados, vacíos útiles y conservación de orden/estado. |
| 7 — PROP-FUNC02 | Recurrencia, fechas y recordatorios; después valorar rotación. | Decidir zonas horarias, quién genera ocurrencias y permisos/notificaciones. | No duplicar recurrencias al abrir dos dispositivos; probar cambio horario, completado y permiso denegado. Un recordatorio no es garantía de ejecución del SO. |

No convertir todas estas filas en issues «Lista»: varias son investigación/especificación. Cada entrega tendrá su issue padre y sub-issues después de cerrar su alcance.

Para PROP-DEV01 se propone ampliar la CI existente con reglas ESLint justificadas por el código, TypeScript, Jest y análisis determinista de seguridad/secretos (evaluar Semgrep CE y Gitleaks, además de actionlint para workflows). Reglas y versiones deben fijarse y probarse contra la base actual, sin silenciar fallos ni exigir porcentajes de cobertura arbitrarios. No presuponer que los productos cloud de esas herramientas son gratuitos. Separar el check de IA de los checks deterministas: error, timeout o respuesta no válida del revisor no significan OK. Una nueva revisión debe vincularse al HEAD y contexto de base actual; cambios en cualquiera invalidan el resultado anterior. No otorgar al revisor capacidad de escribir código, cambiar sus controles o hacer merge. Una aprobación publicada con las mismas credenciales del autor no constituye por sí sola revisión independiente; definir el publicador confiable y su protección antes de anunciar una garantía obligatoria.

### Trabajo paralelo e issues preparadas para desarrollo

Tras acordar cada entrega, una sub-issue debe incluir: padre/Project, objetivo, alcance/no alcance, contrato técnico y referencias, criterios verificables, archivos/áreas previsibles, pruebas/comandos/evidencia, dependencias, riesgos/migración y estado de decisiones. No depender del contexto de este chat. Una PR referencia la sub-issue y su padre; un worktree por rama temporal desde `develop`. No usar `Closes` como única automatización si `develop` no es la rama predeterminada.

Paralelismo seguro: formulario/accesibilidad y especificación cloud pueden avanzar separados; Auth/RLS, migración local y prototipos UI solo se paralelizan después de acordar contratos y usando adaptadores/dobles explícitos. El motor de sincronización depende de versión/idempotencia/borrado definidos. No dividir tareas que escriban a la vez en el mismo contrato sin un responsable de integración.

**Borrador de sub-issue concreta — no creada en GitHub ni aprobada:**

> **Título:** Completar ayudas y contadores del formulario (PROP-UX01).
>
> **Parent/Project:** asignar a la futura épica de claridad/accesibilidad antes de pasar a Lista.
>
> **Objetivo:** explicar requisitos y límites sin alterar la persistencia explícita.
>
> **Alcance:** título obligatorio, contador 0–2000 de descripción, ayuda/error contextual tras interacción y accesibilidad. No añadir nube, modificar límites, borrar borradores ni rediseñar navegación.
>
> **Contrato:** usar validación de dominio existente; definir el disparador de error en la especificación de la issue. Mantener los fallos de almacenamiento junto a Guardar.
>
> **Criterios propuestos:** apertura vacía sin alarma; título vacío/espacios no guarda y explica el requisito tras interacción; contador de descripción refleja el texto; límites/pegado conservan la regla vigente; un fallo de repositorio conserva borrador; Guardar permanece fijo y alcanzable.
>
> **Áreas:** `TaskForm.tsx`, `task-form.test.tsx`; solo cambiar `model.ts` si el contrato aprobado lo exige, no duplicar reglas.
>
> **Verificación:** lint, tipos, tests de formulario, revisión con texto ampliado/lector/teclado en ambas plataformas. Si no hay dispositivo, registrar la evidencia pendiente, no marcar aceptación física.
>
> **Dependencias:** aprobar detalle de interacción y asignar parent; no necesita backend. PR a `develop`, revisión independiente del diff y checks obligatorios una vez configurados.

### Decisiones que deben cerrarse antes de implementar v2

| Tema | Recomendación inicial | Estado |
| --- | --- | --- |
| Cuenta | Mantener uso local sin cuenta; acceso opcional para nube. Evaluar enlace/código por correo frente a contraseña y proveedores, con recuperación y deep links. | No decidido; no fijar método solo por el quickstart. |
| Tableros y roles | Personal + compartidos, propietario y miembro, un responsable opcional por tarea. | Propuesto, no aprobado. |
| Conflictos | Versión servidor y resolución explícita sin sobrescritura silenciosa. | Falta validar UX y contrato, incluidos cambios en campos diferentes. |
| Datos locales y sesión | Importación voluntaria/idempotente, aislamiento entre cuentas y política explícita de caché/offline/revocación. | Decisión de producto y seguridad pendiente. |
| Invitaciones | Enlace de uso único y aceptación autenticada; decidir correo destinatario, expiración y recuperación. | Pendiente. |
| Operación cloud | Región, proyecto nuevo/existente, cuotas, backups/retención, tratamiento de datos y presupuesto. | Sin verificación ni autorización de recursos. |
| Revisión obligatoria | Local por defecto si no se demuestra gratuidad remota, check ligado a SHA/base/contexto y publicador confiable. | Flujo solicitado, integración técnica pendiente; no afirmar bloqueo activo. |

Estas decisiones no bloquean este análisis ni los bocetos; sí impiden presentar como listas las issues de implementación que dependen de ellas. Próximo entregable recomendado: concretar PROP-DEV01 y PROP-UX01, y redactar la propuesta SDD v2 a partir de PROP-SPEC01 sin implementar todavía nube.

### Fuentes consultadas para la propuesta cloud

Documentación oficial consultada el 2026-10-31; comprobar versiones instaladas y referencias específicas antes de implementar:

- [Supabase Auth para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native): guía de integración, no arquitectura offline ni garantía del almacenamiento de sesión elegido.
- [RLS, grants y pruebas de políticas](https://supabase.com/docs/guides/database/postgres/row-level-security): autorización por fila y pruebas de permitidos/denegados.
- [Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes): suscripción a cambios; no reemplaza cola durable, recuperación y reconciliación SQLite.

## 1. Objetivo y base técnica

Mantener y verificar la implementación del comportamiento de [SDD.md](SDD.md) en iOS y Android con almacenamiento local sin servidor ni inicio de sesión. Este documento recoge la arquitectura, las fases de trabajo, la trazabilidad original AC01–AC12 y las ampliaciones AC13–AC36; el estado de comprobaciones figura en [README.md](README.md).

La base declarada en `package.json` al redactar estos documentos es Expo `~58.0.17`, React `19.3.0`, React Native `0.88.0`, TypeScript `~6.0.3`, Expo Router, `expo-sqlite` y `react-native-pager-view`. Mantener TypeScript estricto y resolver compatibilidad de dependencias mediante las herramientas de Expo. El gestor del repositorio es npm, con `package-lock.json`.

Antes de implementar APIs, consultar las referencias correspondientes a SDK 58:

- [Referencia SDK 58](https://docs.expo.dev/versions/v58.0.0/).
- [SQLite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/).
- [Expo Router](https://docs.expo.dev/versions/v58.0.0/sdk/router/).
- [Pager View](https://docs.expo.dev/versions/v58.0.0/sdk/view-pager/).
- [Directorio src](https://docs.expo.dev/router/reference/src-directory/).
- [Índice y correcciones de Expo](https://docs.expo.dev/llms.txt).

## 2. Arquitectura y estructura actual

Separar rutas, componentes, dominio y persistencia. Las rutas viven en **`src/app/`**; esta ubicación corrige cualquier propuesta previa de situarlas en `app/` en la raíz.

```text
src/
  app/
    _layout.tsx                 # Stack y proveedores
    index.tsx                   # Tablero
    task.tsx                    # Modal compartido de alta/edición, ID opcional
  components/                   # Tableros, tarjetas, formulario, gesto, controles y animación
  features/
    tasks/
      model.ts                  # Tipos, validación y orden
      TasksProvider.tsx         # Provider y comandos, deshacer de movimiento/borrado
      reducer.ts                # Estado puro
      repository.ts             # CRUD parametrizado y restauración
      scrollMemory.ts           # Offsets por vista/columna, durante la sesión
    preferences/                # Repositorio y proveedor de vista/tema
  storage/
    database.ts                 # Apertura y preparación
    migrations.ts               # Versiones transaccionales
    queue.ts                    # Cola compartida entre repositorios
  theme/                        # Paletas y proveedor de tema
__tests__/                      # Dominio, SQL, proveedores, UI, gestos y arranque
```

La estructura representa la implementación actual, no una tarea de reorganización pendiente. Mantener componentes y utilidades fuera de `src/app/`. Usar Expo Router para toda navegación y sus exportaciones `Link`, `router` y `useLocalSearchParams` según corresponda. Pasar identificadores por ruta; leer el registro vigente del almacén, sin serializar tareas completas en parámetros.

### Estado de aplicación

Un contexto con reducer mantiene tareas confirmadas, carga, error, columna activa y oportunidad de deshacer. Las listas y contadores se derivan de los mismos registros, evitando mantener copias independientes inconsistentes. Reducer puro; efectos y acceso a SQLite en comandos/repositorio.

El formulario mantiene su borrador local separado. Solo «Crear tarea» o «Guardar cambios» dispara persistencia. Detectar cambios respecto del formulario inicial y proteger todas las salidas usando la integración de prevención de retirada de pantalla compatible con la versión instalada del router.

## 3. Modelo de datos e invariantes

| Campo | Representación y responsabilidad |
| --- | --- |
| `id` | Texto único e inmutable, generado localmente. |
| `title` | Texto obligatorio, recortado, longitud 1–120. |
| `description` | Texto opcional normalizado a cadena vacía, longitud ≤ 2000. |
| `status` | Unión cerrada interna `pending`, `in_progress`, `done`; etiquetas actuales Pendiente, En progreso, Hecho. |
| `createdAt` | Entero de milisegundos desde época; nunca cambia. |
| `updatedAt` | Entero de última mutación confirmada. |
| `columnEnteredAt` | Entero de entrada en el estado actual; no cambia al editar texto. |

Tabla `tasks` con clave primaria y restricciones de estado/longitud; índice actual por `columnEnteredAt DESC, id ASC`, con filtrado por estado en memoria. Orden del selector: `columnEnteredAt DESC, id ASC`. Mantener coherente el recuento de caracteres entre dominio y restricciones SQL, incluyendo texto Unicode; añadir casos con caracteres no ASCII y emojis cuando se modifique esta validación.

Crear utiliza estado `pending` y fechas iniciales iguales. Editar solo texto cambia texto y `updatedAt`, sin reordenar. Si la edición cambia también el estado, guardar texto y transición de forma atómica, actualizando `columnEnteredAt`. Mover cambia estado, `updatedAt` y `columnEnteredAt`; deshacer recupera estado/entrada anteriores y genera nuevo `updatedAt`. Eliminar actúa por identificador. Para evitar colisiones temporales en comandos sucesivos del proceso, producir una marca de mutación mayor que la última observada; no asumir que el reloj de pared es siempre creciente.

## 4. SQLite, migraciones y concurrencia

1. Abrir una base local mediante `expo-sqlite`; completar migraciones antes de cargar tareas o habilitar comandos.
2. Versionar esquema mediante `PRAGMA user_version`. Cada migración ejecuta DDL, transformación necesaria y actualización de versión en una misma transacción. Si falla, revertir y mostrar error con reintento; nunca reinicializar silenciosamente datos del usuario.
3. Usar consultas parametrizadas para todos los valores variables: títulos, descripciones, identificadores, estados y fechas. Reservar SQL estático sin parámetros para esquema y pragmas conocidos.
4. Serializar **todas las mutaciones** con una cola única del repositorio. Una promesa rechazada no debe bloquear los comandos siguientes. Utilizar el mecanismo transaccional documentado por SDK 58 que garantice el aislamiento requerido.
5. Validar en el límite del repositorio. Leer estado vigente y comprobar precondiciones dentro de la transacción cuando una operación dependa de una versión anterior, especialmente deshacer.
6. Publicar al reducer únicamente resultados confirmados tras commit. Mantener el estado previo si hay rollback. Esta estrategia evita anunciar éxito antes de que los datos sean duraderos.
7. Bloquear dobles envíos del formulario y operaciones duplicadas por tarea mientras estén pendientes. La cola protege también operaciones iniciadas desde controles distintos.
8. Si SQLite confirma pero la vista necesita recuperarse, releer el estado canónico; un reintento no debe crear duplicados por una respuesta visual perdida. Conservar el identificador de un alta durante su intento.

No hay llamadas de red para las funciones del producto. Persistir al confirmar acciones, sin botón global adicional de sincronización y sin escritura por pulsación de teclado.

## 5. Tablero y formulario

### Tablero

- `react-native-pager-view` proporciona las tres páginas horizontales; cada página contiene una `FlatList` vertical con claves por `id`.
- Una fuente de verdad para página activa sincroniza pulsación de pestaña, evento de página seleccionada y selección programática después de crear. Evitar bucles de actualización.
- Contadores derivados del conjunto completo, no de las tarjetas renderizadas. Tarjetas reutilizables, callbacks estables y renderizado acotado; no asumir alturas fijas con texto escalable.
- Mover permanece en el índice actual. Crear vuelve al tablero y selecciona Pendiente después del commit. Editar regresa a la columna de origen.
- Acciones rápidas «Empezar» y «Completar» para Pendiente → En progreso → Hecho, con el mismo circuito transaccional y de deshacer.
- Diferenciar arranque, fallo de carga y lista vacía. Dejar espacio inferior para que el aviso no tape acciones.
- Ocultar del árbol accesible las páginas no seleccionadas y permitir cambiar de columna mediante pestañas sin gestos.

### Formulario

- Componente compartido para alta/edición con campos controlados, contadores, errores y estado de guardado.
- Validar título con `trim`; descripción opcional de hasta 2000. No escribir datos hasta guardar.
- El alta no permite elegir estado. La edición ofrece los tres estados y permite cualquier transición; guardar solo texto conserva el estado. Cancelar descarta también la selección de estado y conserva el registro original.
- Formulario desplazable y adaptado al teclado, áreas seguras y texto ampliado.
- Confirmación de descarte en todas las vías de navegación; permitir salida tras éxito sin falso aviso de cambios.
- Confirmación destructiva independiente para eliminar. Conservar borrador si se cancela o si falla la escritura.
- Gestionar identificador inválido o tarea inexistente con salida clara al tablero.

## 6. Deshacer seguro y accesible

Las comprobaciones de versión y existencia descritas aquí corresponden al deshacer de **movimientos**. La restauración de una tarea borrada es un flujo diferente, documentado en «Borrado por gesto — AC25–AC30»: inserta la instantánea sin sobrescribir una identidad existente. Ambos comparten una única oportunidad de Deshacer.

Mantener en memoria una oportunidad con identificador de operación, `taskId`, estado y `columnEnteredAt` anteriores, instantánea esperada posterior y vencimiento opcional.

Al confirmar un movimiento, sustituir la oportunidad anterior y comenzar 6 segundos si no hay lector de pantalla. Detectar el lector al iniciar y sus cambios durante la sesión: al activarse, quitar la caducidad; al desactivarse, iniciar una nueva ventana de 6 segundos para la oportunidad todavía vigente. Ofrecer «Cerrar aviso» accesible para descartarla. El temporizador comprueba el identificador de operación para no cerrar un aviso posterior.

Al deshacer, en la cola y dentro de la transacción:

1. Comprobar vigencia y existencia del registro.
2. Comparar su estado confirmado con la instantánea posterior esperada, incluyendo `updatedAt` y `columnEnteredAt`; verificar también identidad y texto para protegerse de cambios incompatibles.
3. Si coincide, restaurar estado y entrada anteriores, actualizar `updatedAt`, confirmar y consumir oportunidad.
4. Si no coincide, invalidar y comunicar que ya no se puede deshacer. No recrear ni sobrescribir.

Editar, eliminar o mover la tarea afectada invalida su oportunidad al confirmar el cambio. El control transaccional protege también carreras entre una pulsación de deshacer y un comando en curso. En error de almacenamiento conservar los datos y permitir reintentar mientras la oportunidad siga vigente. Al volver del segundo plano, comprobar el vencimiento real, sin depender de que el temporizador haya corrido. No persistir el aviso entre reinicios.

## 7. Fases y entregables

| Fase | Trabajo práctico | Criterio de salida | AC |
| --- | --- | --- | --- |
| 1. Documentación | Consolidar SDD, plan y README; conservar cuatro maquetas y reglas inequívocas. | AC01–AC12 trazables y decisiones aprobadas reflejadas. | AC01–AC12 |
| 2. Bootstrap | Expo Router en `src/app/`, TypeScript estricto, tema claro, proveedores y scripts de calidad. | Arranque y navegación base en ambas plataformas; scripts disponibles. | AC01, AC11, AC12 |
| 3. Almacén | Dominio, SQLite, migraciones, cola, reducer y selectores; fallos recuperables. | Validación, CRUD local y persistencia cubiertos por pruebas relevantes. | AC03, AC04, AC05, AC07, AC08, AC09, AC10 |
| 4. Tablero | Pager, pestañas, contadores, FlatList, acciones rápidas, tarjetas y vacíos. | Inicio en Pendiente, pestañas/swipe coherentes y movimientos rápidos. | AC01, AC02, AC04, AC06, AC11, AC12 |
| 5. Formulario | Alta, edición de texto/estado, validación, guardado, eliminación y protección de borrador. | Alta en Pendiente; guardar y cancelar correctos; cualquier transición; eliminación confirmada. | AC03, AC04, AC05, AC07, AC08, AC11, AC12 |
| 6. Deshacer | Movimiento transaccional, aviso 6 s, modo lector e invalidación. | Reversión correcta y carreras/operaciones obsoletas controladas. | AC06, AC12 |
| 7. Accesibilidad y verificación | Texto escalado, foco, teclado, lector, pruebas offline y reinicio en dispositivos. | Evidencia por AC y plataforma, defectos registrados y controles de calidad ejecutados. | AC01–AC12 |

Las fases describen la organización del trabajo de la aplicación implementada. Su aceptación requiere evidencia, no solo la existencia de archivos o dependencias. Las reglas complementarias de orden, límites, descarte y protección de deshacer se verifican además de los criterios originales, sin reasignar sus IDs.

## 8. Estrategia de verificación

### Pruebas automatizadas relevantes

- Límites del título recortado: 0, 1, 120, 121; espacios; descripción 0, 2000, 2001; Unicode coherente.
- Transiciones en todos los sentidos, no-op del estado actual, conservación de creación y orden al editar.
- Desempates de orden deterministas, contadores y restauración de posición tras deshacer.
- Repositorio: parámetros con comillas/saltos de línea, rollback de migración y escritura, reinicio, cola tras error y doble envío.
- Deshacer: reloj controlado, vencimiento a 6 s, sin vencimiento con lector, sustitución, edición posterior, eliminación y carrera con otra mutación.

Distinguir pruebas con dobles de SQLite, pruebas de repositorio con `node:sqlite` y ejecución nativa con `expo-sqlite`: ninguna prueba en Node demuestra por sí sola el comportamiento en iOS/Android. Las pruebas del repositorio requieren **Node.js 24** por el uso de `node:sqlite`; el mínimo del tooling de la app es Node.js 22.13.x. Usar Node.js 24 para ejecutar todas las comprobaciones locales.

### Comandos de calidad

```sh
npm run lint
npm run typecheck
npm run test
npx expo-doctor
```

Los scripts están configurados. Últimos resultados de la app: lint y typecheck aprobados, **78 pruebas aprobadas en 7 suites**, exportaciones JavaScript para iOS y Android correctas. Al preparar este traspaso se repitieron lint/typecheck correctamente y Expo Doctor dio **19/20**, indicando **10 paquetes con parches disponibles**. No se actualizaron dependencias: revisar compatibilidad y changelogs en una tarea específica. Las compilaciones nativas y la validación en dispositivos siguen pendientes. No confundir estos resultados con la implementación del roadmap de nube.

### Matriz de evidencia

| AC | Evidencia prevista |
| --- | --- |
| AC01 | Primera apertura sin datos: Pendiente vacía y acción de crear, sin login y sin conexión. |
| AC02 | Cambio por pestaña y swipe, contadores antes/después de mutaciones. |
| AC03 | Intentar crear y guardar una edición con título vacío o solo espacios; ambos deben impedirse. |
| AC04 | Crear con título y descripción opcional; comprobar contenido y primera posición en Pendiente. |
| AC05 | Guardar una edición y comprobar cambios; cancelar/descartar otra y comprobar registro original. |
| AC06 | Usar Iniciar y Completar, comprobar movimiento y deshacer cada acción. |
| AC07 | Guardar desde edición las seis transiciones entre estados distintos, incluido regreso desde Hecho. |
| AC08 | Cancelar y confirmar eliminación; comprobar lista y contadores. |
| AC09 | Cerrar/reabrir tras operaciones confirmadas y comprobar datos persistidos. |
| AC10 | Crear, consultar, editar y eliminar en modo avión. |
| AC11 | Todas las pantallas con teclado, áreas seguras, texto grande y controles alcanzables de 48 × 48. |
| AC12 | VoiceOver/TalkBack: nombres, roles, selección de pestañas y ejecución de todas las acciones. |

Verificar también las reglas complementarias: límites 120/2000, orden al editar, retorno a Pendiente tras crear, confirmación de descarte en todas las salidas, errores recuperables y deshacer 6 s/sin caducidad con lector, con invalidación de cambios obsoletos. No asignarles IDs de otros criterios.

Registrar comando, fecha, entorno, salida y estado real. El checklist de [README.md](README.md) está pendiente hasta su ejecución. Una exportación solo valida el empaquetado correspondiente; no sustituye una compilación nativa ni un recorrido en dispositivo. La compilación y distribución con EAS se gestionarán en una tarea posterior; esta entrega no las ejecuta.

## Refinamiento de interacción

- `BoardTabs` consume posición y offset del paginador mediante `Animated.event` con driver nativo: el indicador se mueve sin actualizar el estado de React en cada fotograma.
- El tablero distingue página asentada y destino solicitado; no reenvía `setPage` al completar un gesto e ignora asentamientos anteriores cuando hay una nueva petición pendiente.
- Las tres páginas se mantienen preparadas en Android mediante `offscreenPageLimit={2}`; las listas siguen virtualizadas.
- `MotionProvider` comparte una única suscripción a la preferencia de movimiento reducido. `usePressFeedback` usa resortes nativos y `FadeIn` transiciones de 200 ms, no interactivas, con limpieza al desmontarse.
- Pruebas de regresión para gestos, asentamientos y pulsaciones rápidas con el paginador nativo simulado. La medición visual de rendimiento queda pendiente en móvil o emulador.

## Modos de presentación del tablero

- `src/app/index.tsx` compone cabecera y selector fijo, contenido intercambiable y pie con alta/deshacer.
- `BoardViewToggle` ofrece un botón accesible que alterna Detallada/Compacta y representa la vista de destino. `DetailedBoard` encapsula pestañas y paginador; sus referencias e indicador se inicializan con la sección compartida cada vez que se monta.
- `CompactBoard` utiliza `SectionList` virtualizada, secciones estables por estado, cabeceras con contador y pies para los vacíos. `CompactTaskCard` muestra solo título y reutiliza el feedback de pulsación.
- `TasksProvider` continúa siendo la única fuente de tareas, selección y deshacer. `creationRevision` se incrementa únicamente tras crear correctamente y permite desplazar Compacta al inicio sin reaccionar a ediciones o movimientos.
- `BoardPreferencesProvider`, situado fuera de las rutas, conserva el modo durante la navegación. Carga antes de presentar el tablero; guarda antes de confirmar el nuevo modo y evita escrituras duplicadas. La preferencia no altera ni recarga las tareas.
- `preferencesRepository` lee/escribe `board_view_mode` con valores `detailed` o `compact`, mediante SQL parametrizado. Ausencia o valor desconocido utiliza Detallada.
- Migración v2: tabla `preferences(key TEXT PRIMARY KEY, value TEXT NOT NULL)`, sin modificar `tasks`. Versionado y esquema se actualizan dentro de la misma transacción.
- `storage/queue.ts` serializa las consultas de ambos repositorios, evitando que una preferencia entre por accidente en una transacción de tareas.
- Transición con `FadeIn` de 200 ms y preferencia global de movimiento reducido. No se mantiene una segunda copia de las tareas.

### Validación AC13–AC20

Pruebas de integración: grupos y contenido de tarjetas, apertura de tarea, selector fuera de la lista, recuperación del modo, errores de guardado, retorno a la sección elegida, creación en Compacta y deshacer entre modos. Pruebas SQLite: migración v1→v2 conservando tareas, persistencia de preferencias, consultas concurrentes y recuperación tras fallo. Revisar en dispositivo visibilidad al hacer scroll, retorno al inicio tras crear, texto grande, lector y transiciones.

## Tema oscuro — AC21–AC24

- `theme/tokens.ts`: paletas semánticas clara y oscura para superficies, texto, acentos, acciones, avisos y sombras. Los estilos se crean con `useThemedStyles` y se memorizan por paleta.
- `theme/ThemeProvider.tsx`: contexto reactivo compartido, apariencia nativa mediante `Appearance.setColorScheme` y fondo raíz mediante `expo-system-ui`. El navegador recibe el tema de navegación correspondiente y `StatusBar` cambia entre contenido claro/oscuro.
- `BoardPreferencesProvider` carga vista y tema de forma independiente con `Promise.allSettled`, conservando las preferencias recuperadas si falla la otra. Los cambios se confirman tras persistir y los controles se bloquean durante una escritura.
- `preferencesRepository` añade la clave `theme_mode` (`light`/`dark`) en la tabla existente; no requiere otra migración. Usa la misma cola SQLite que tareas y vista.
- `BoardViewToggle` sitúa un interruptor accesible con luna/sol a la derecha del botón de vista, en la cabecera. Su cambio no se usa como clave del tablero: la selección, el scroll y Deshacer se conservan.
- Formularios y estados de carga/error consumen la paleta; los campos configuran la apariencia del teclado iOS. `app.json` admite ambos temas con `userInterfaceStyle: automatic` y el plugin `expo-system-ui`.
- Pruebas de tema sobre tablero/formulario, conservación de selección y vista, errores de guardado y persistencia SQLite independiente. Revisión nativa del aspecto visual pendiente.

## Simplificación de cabecera

- `BoardIcon` dibuja lista, tarjetas, luna y sol con `react-native-svg`, instalado con una versión compatible con SDK 58. No requiere cargar fuentes de iconos.
- `BoardViewToggle` agrupa dos controles de 48 puntos en la cabecera de `index.tsx`. La ayuda de pulsación larga se cierra tras 2,2 segundos o al pulsar un control; el temporizador se limpia al desmontar.
- El botón de vista mantiene la persistencia y bloqueo de escrituras existentes. Las pruebas de navegación usan ahora el nombre de la acción de destino y comprueban el valor accesible de vista actual.
- `TaskCard` conserva edición y avance con altura determinada por contenido; se retiran metadatos repetidos y frases decorativas.
- `BoardTabs` dispone nombre y contador horizontalmente con altura mínima de 48 puntos, conserva interpolación nativa y ajusta el ancho mínimo al tamaño de texto.
- El pie y el botón «＋ Nueva tarea» conservan su distribución y funcionamiento.

## Borrado por gesto — AC25–AC30

- `SwipeToDelete` reutilizado por las dos tarjetas, con `PanResponder` y `Animated`. Captura únicamente desplazamientos de un dedo hacia la derecha, mayores de 12 puntos y predominantemente horizontales. Evalúa el desplazamiento final al soltar, no el máximo alcanzado.
- El desplazamiento y las interpolaciones de la papelera se actualizan sin estado React por fotograma. Retorno con resorte y salida de 140 ms con driver nativo; con movimiento reducido se omiten las animaciones autónomas.
- Papelera vectorial `trash` y tokens semánticos de fondo rojo/texto blanco para ambos temas. Máscara redondeada y sombra exterior evitan que el fondo sobresalga de la tarjeta.
- `DetailedBoard` deshabilita imperativamente el scroll del paginador al comenzar un toque sobre la tarjeta, y lo restaura al terminar, cancelar o desmontar. La captura horizontal respeta gestos verticales; las pestañas y el espacio fuera de las tarjetas conservan la navegación.
- `taskRepository.removeWithSnapshot` lee y elimina dentro de una transacción. `restoreDeleted` inserta el identificador y la posición originales con una nueva fecha de modificación; un conflicto de identidad falla sin reemplazar datos. No hay nueva migración.
- `TasksProvider` añade `removeWithUndo` y una unión discriminada para snapshots de movimiento/borrado. Persistencia antes de modificar memoria, bloqueo de acciones simultáneas y un único aviso de la acción más reciente.
- La escritura de borrado comienza al soltar, independientemente de la animación y de que se cambie de vista después. Una escritura fallida conserva el snapshot anterior; una restauración fallida conserva el actual mientras esté vigente.
- Las tarjetas anuncian la acción accesible «Eliminar tarea», que utiliza el mismo flujo reversible. El formulario conserva su confirmación.
- Pruebas: cruzar/retroceder/soltar, interrupciones y multitáctil, guardado duplicado/fallido, ambos tipos de tarjetas, arbitraje del paginador, expiración y modo lector, SQL real para borrar/restaurar y rechazo de colisiones. La prueba de gestos nativos queda pendiente en dispositivo.

## Separadores de la vista Compacta

`CompactBoard` activa `stickySectionHeadersEnabled` en ambas plataformas. Cada cabecera usa un fondo opaco externo del tema y una franja interna coloreada por estado, con símbolo, borde lateral y contador en cápsula. Los pies añaden espacio y un divisor salvo en el último grupo. Se reutilizan los tokens semánticos de ambos temas; no se modifica la estructura de datos ni los gestos de las tarjetas. La altura de cabecera es mínima, no fija, para admitir texto ampliado. Validación visual pendiente en dispositivos.

## Estabilidad de interfaz — AC31–AC36

- El aviso reversible se posiciona de forma absoluta en el área de contenido, separado del pie. El relleno inferior de ambas listas se reserva siempre, independientemente del aviso, y escala con el tamaño del texto.
- `BoardScrollMemory`, propiedad de la sesión en `TasksProvider`, almacena offsets de Compacta y de los tres estados sin provocar renders por scroll. Las listas toman un `contentOffset` inicial estable y guardan eventos de desplazamiento. `creationRevision` desplaza al inicio solo cuando cambia, no cada vez que Compacta vuelve a montarse.
- La barra de guardado de `TaskForm` es hermana del `ScrollView`, dentro de `KeyboardAvoidingView`. Los errores permanecen junto a la acción principal; Eliminar sigue en el contenido desplazable. Se mantienen validación, confirmación de descarte y persistencia previas.
- `expo-splash-screen` se configura con fondo oscuro neutro y se retiene desde el módulo raíz. `AppStartup` espera la carga de preferencias y oculta el splash al recibir layout de la interfaz ya tematizada. `ThemeProvider` evita aplicar el valor claro provisional mientras se cargan preferencias.
- `BoardPreferencesProvider` mantiene errores separados por preferencia y los combina solo para presentarlos. Cada escritura correcta limpia exclusivamente el error de su clave.
- `SwipeToDelete` añade una cápsula de confirmación por interpolación al alcanzar un tercio del ancho, sin estado React por fotograma ni cambios en las reglas de cancelación.
- Pruebas: conservación de offsets al desmontar/remontar vistas, reinicio selectivo tras crear, estructura fija de aviso/guardado, recuperación independiente de errores y arranque con preferencias pendientes o fallidas. La geometría real del teclado y splash de producción quedan pendientes de validación nativa.
