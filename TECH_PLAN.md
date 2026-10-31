# En foco — Plan técnico

## Continuación: GitHub y nube

**Estado:** la aplicación local está implementada; la siguiente ampliación es un roadmap discutido, no una SDD v2 aprobada. Leer `AGENTS.md` para el contexto breve y verificar el estado real de Git antes de actuar.

### Estado de GitHub y pasos pendientes

1. Completado el 2026-10-31: GitHub CLI 2.103.3 instalada para el usuario y autenticación verificada como `ralaindev`. Creado **https://github.com/ralaindev/Tareapps** y verificado como **privado y vacío**. No volver a crearlo.
2. Configurar/verificar el MCP de GitHub con acceso limitado a lo necesario. Se dispone de una variable local prevista, `GITHUB_PERSONAL_ACCESS_TOKEN`; jamás imprimir su contenido ni guardarlo en el repositorio. El token classic se validó antes, pero hay que comprobar su vigencia de nuevo.
3. El usuario autorizó después el primer commit y push. Remoto local `origin`: `https://github.com/ralaindev/Tareapps.git`; rama local `main`. Autenticación Git de lectura verificada con GitHub CLI, sin persistir el token ni cambiar la configuración global de credenciales. Antes del primer commit se reforzó `.gitignore` para excluir `.env` y bases SQLite, no se detectaron patrones habituales de credenciales y pasaron lint, tipos y 78 tests en 7 suites con Node.js 24. Consultar Git/GitHub para verificar el historial y seguimiento efectivo de `origin/main`. Esta autorización no incluye CI, nube ni despliegues.
4. Verificar los MCP/proyectos de Supabase, Vercel y Expo. Se observó Supabase en la configuración global, no se verificó integración de la app. No hay SDK Supabase, sesión de usuario ni sincronización implementados.

### CI de GitHub Actions

Configuración solicitada después del primer envío: `.github/workflows/ci.yml`, un job Ubuntu/Node.js 24 con instalación reproducible (`npm ci`), lint, tipos y tests secuenciales. Eventos: push a `main`, PR dirigida a `main` y ejecución manual. Acciones oficiales checkout/setup-node v7 fijadas por SHA, caché npm por lockfile, permisos `contents: read`, sin credenciales persistidas ni secretos adicionales, timeout de 15 minutos y cancelación de ejecuciones obsoletas por referencia. No incluye builds nativos, despliegues ni cambios de protección de rama/facturación.

Pendiente de subir este cambio y observar la primera ejecución real; la validación local no demuestra que el runner remoto haya pasado. Las ejecuciones de este repositorio privado consumen la cuota de Actions de la cuenta.

Validación local del workflow: `actionlint` 1.7.12 sin errores; lint, tipos y los 78 tests en 7 suites correctos con `CI=true` y Jest `--ci` en Windows/Node.js 24. No se ha probado todavía la instalación desde cero ni la ejecución en Ubuntu para este workflow.

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
