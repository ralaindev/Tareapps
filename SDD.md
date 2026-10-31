# En foco — Especificación de diseño de software

**Lectura vigente:** las secciones iniciales y los primeros mockups describen el MVP original. Las ampliaciones posteriores incorporan Compacta, tema oscuro, cabecera mínima, borrado con Deshacer y mejoras de estabilidad; AC01–AC36 se conservan sin cambios. La etiqueta actual del segundo estado es **En progreso**; «En curso» se conserva en algunos textos históricos. Para retomar el proyecto, leer primero `AGENTS.md`. La sección 16 incorpora la **base v2 autorizada para planificación y experimento**, revisable después, con AC37 para el formulario actual y AC38+ como objetivos futuros. Esto no acredita una aplicación cloud implementada.

## 1. Producto y alcance aprobado

**En foco** es una aplicación personal de tareas para **iOS y Android**, local y utilizable sin conexión. Su tablero permite concentrarse en una columna cada vez y organizar tareas en tres estados fijos: **Pendiente**, **En curso** y **Hecho**. La interfaz es clara, en español, con tema claro y acento violeta.

Esta especificación recoge el comportamiento aprobado de la aplicación implementada. El plan técnico está en [TECH_PLAN.md](TECH_PLAN.md) y las instrucciones y el estado de verificación en [README.md](README.md). La validación en dispositivos sigue pendiente.

Incluye crear, consultar, editar, mover, eliminar y deshacer un movimiento. No requiere servidor, cuenta, inicio de sesión ni sincronización. Quedan fuera del alcance inicial colaboración, estados personalizados, adjuntos, recordatorios, prioridades, búsqueda y reordenación manual.

## 2. Reglas del dominio

### 2.1. Campos y validación

| Campo | Regla |
| --- | --- |
| Título | Obligatorio. Aplicar `trim` antes de validar y guardar. Entre 1 y 120 caracteres después del recorte. Un título compuesto solo por espacios es inválido. |
| Descripción | Opcional, máximo 2000 caracteres. Vacía equivale a ausencia de descripción. Conservar saltos de línea y contenido introducido. |
| Estado | Solo Pendiente, En curso o Hecho. Una tarea nueva siempre empieza en Pendiente. |
| Identificador | Único e inmutable; no depende del título. Se permiten títulos repetidos. |
| Fechas | Creación, última modificación y última entrada en columna; ver modelo técnico. |

La misma validación se aplica en formulario y almacenamiento. Se muestran contadores y errores junto a cada campo; el pegado de texto y el teclado no deben permitir guardar valores fuera de los límites. El error explica cómo corregirlo: «Escribe un título de entre 1 y 120 caracteres» o «La descripción admite hasta 2000 caracteres».

### 2.2. Orden y transiciones

- Las columnas conservan siempre el orden Pendiente → En curso → Hecho.
- Cada columna ordena por **entrada más reciente en esa columna, descendente** (`columnEnteredAt`). El desempate es determinista por identificador.
- Crear establece las tres fechas iniciales y coloca la tarea al principio de Pendiente.
- Editar título o descripción actualiza `updatedAt`, pero conserva `createdAt` y `columnEnteredAt`: **editar no reordena**.
- Mover permite cualquier otro estado, incluso regresar desde Hecho. Actualiza `status`, `updatedAt` y `columnEnteredAt`; la tarea aparece al principio del destino.
- Elegir el estado actual no crea una mutación ni una opción de deshacer.
- Deshacer restaura el estado y la fecha de entrada anteriores, recuperando la posición relativa previa; actualiza la fecha de modificación para reflejar la reversión.

## 3. Navegación y pantallas

### 3.1. Tablero

Pantalla inicial con título «En foco», acción «Nueva tarea» y pestañas con el número total de tareas de cada estado. Inicialmente muestra Pendiente. Las pestañas y el desplazamiento horizontal seleccionan la misma columna; se ve **una sola columna a la vez**. Cada columna tiene desplazamiento vertical independiente mediante `FlatList`.

Una tarjeta presenta título, descripción opcional resumida y acciones explícitas de editar y mover. Las acciones rápidas «Iniciar» y «Completar» permiten avanzar de Pendiente a En curso y de En curso a Hecho, respectivamente, con opción de deshacer. Se puede abrir la edición tocando la tarjeta. Los controles anidados no deben disparar dos acciones. El selector de movimiento presenta los otros dos estados con nombres completos. No es necesario arrastrar tarjetas ni descubrir gestos para operar.

Al mover, **se mantiene seleccionada la columna de origen**. La tarjeta desaparece de ella, se actualizan ambos contadores y se comunica el destino con una acción «Deshacer». No se fuerza el salto a la columna receptora.

### 3.2. Crear

«Nueva tarea» abre un formulario con título, descripción y la indicación «Se creará en Pendiente». No hay selector de estado en el alta. «Crear tarea» valida y guarda explícitamente. Tras confirmarse la escritura local, vuelve al tablero y **selecciona Pendiente**, independientemente de la columna desde la que se abrió.

### 3.3. Editar y eliminar

La edición está disponible en los tres estados. Muestra los datos actuales, un selector con los tres estados y las acciones «Guardar cambios» y «Eliminar tarea». Permite cambiar de cualquier estado a cualquier otro, también regresar desde Hecho. La selección es parte del borrador y solo se aplica al guardar.

Guardar conserva el estado y el orden si solo cambia el texto; si cambia el estado, aplica las reglas de entrada en la columna de destino. Vuelve al tablero con la columna desde la que se abrió. Cancelar y descartar conserva el registro original, incluido su estado. Eliminar solicita confirmación con el título de la tarea y opciones «Cancelar» y «Eliminar». Cancelar conserva la tarea y el formulario. Solo después de confirmar y completar la escritura desaparece la tarea y se actualiza su contador. La eliminación no utiliza el deshacer de movimientos.

Una ruta de edición cuyo identificador ya no exista muestra «Esta tarea ya no está disponible» y una acción para regresar al tablero, sin crear una tarea sustituta.

### 3.4. Salir con cambios

El borrador es estado temporal del formulario. Si difiere del valor inicial, salir por «Cancelar», atrás del encabezado, atrás de Android o gesto de regreso de iOS solicita: «¿Descartar los cambios?» con «Seguir editando» y «Descartar». Una salida sin cambios no pide confirmación. Tras guardar correctamente se permite salir sin mostrar esa confirmación.

Escribir no persiste el borrador. Cerrar el proceso sin guardar puede perderlo; los datos previamente guardados permanecen. La aplicación no promete restauración de borradores.

## 4. Cuatro maquetas textuales

Son esquemas de contenido y jerarquía, no dimensiones rígidas. Los bloques crecen con la escala de texto y respetan las áreas seguras.

### 4.1. Tablero con tareas

```text
┌─────────────────────────────────────────┐
│ En foco                   [Nueva tarea] │
│ Tus tareas, un paso a la vez             │
│                                         │
│ [Pendiente 2]  En curso 1   Hecho 3       │
│  ━━━━━━━━━━━                            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Preparar la presentación            │ │
│ │ Revisar el cierre y las imágenes…   │ │
│ │ [Editar]                  [Mover]  │ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Comprar cuaderno                    │ │
│ │ [Editar]                  [Mover]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Desliza o toca una pestaña               │
│ ┌─────────────────────────────────────┐ │
│ │ Tarea movida a En curso [Deshacer]   │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

Los datos son ilustrativos. Tras mover, el contador de origen baja y el de destino sube; el mensaje se superpone sin ocultar la última tarjeta ni sus acciones.

### 4.2. Crear tarea

```text
┌─────────────────────────────────────────┐
│ [Cancelar]           Nueva tarea        │
│                                         │
│ Título *                                │
│ ┌─────────────────────────────────────┐ │
│ │ ¿Qué quieres hacer?                 │ │
│ └─────────────────────────────────────┘ │
│ 0/120                                   │
│                                         │
│ Descripción (opcional)                   │
│ ┌─────────────────────────────────────┐ │
│ │ Añade detalles si los necesitas     │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
│ 0/2000                                  │
│ Se creará en Pendiente                   │
│                                         │
│ [             Crear tarea             ] │
└─────────────────────────────────────────┘
```

### 4.3. Editar tarea

```text
┌─────────────────────────────────────────┐
│ [Volver]             Editar tarea       │
│ Estado: [En curso ▾]                    │
│                                         │
│ Título *                                │
│ ┌─────────────────────────────────────┐ │
│ │ Preparar la presentación            │ │
│ └─────────────────────────────────────┘ │
│ 26/120                                  │
│ Descripción (opcional)                   │
│ ┌─────────────────────────────────────┐ │
│ │ Revisar el cierre y las imágenes    │ │
│ └─────────────────────────────────────┘ │
│ 34/2000                                 │
│ [           Guardar cambios           ] │
│ [           Eliminar tarea            ] │
│                                         │
│ Confirmación al eliminar:               │
│ ¿Eliminar «Preparar la presentación»?    │
│ Esta acción elimina la tarea guardada.   │
│ [Cancelar]                  [Eliminar]  │
└─────────────────────────────────────────┘
```

### 4.4. Columna vacía

```text
┌─────────────────────────────────────────┐
│ En foco                   [Nueva tarea] │
│                                         │
│ [Pendiente 0]  En curso 0   Hecho 0       │
│  ━━━━━━━━━━━                            │
│                                         │
│              Todo por empezar           │
│       No hay tareas en Pendiente.        │
│       Crea una tarea para dar            │
│       el primer paso.                    │
│                                         │
│ [             Crear tarea             ] │
│                                         │
└─────────────────────────────────────────┘
```

En En curso: «No hay tareas en curso. Mueve una tarea desde otra columna cuando empieces». En Hecho: «Aún no hay tareas hechas. Aquí verás lo que completes». La acción de crear sigue disponible y siempre crea en Pendiente. Una columna vacía no implica que las otras estén vacías.

## 5. Persistencia, errores y deshacer

### Persistencia local

Las operaciones confirmadas se guardan automáticamente en SQLite local: guardar explícitamente el formulario, mover, deshacer y confirmar eliminación. **No se guarda mientras se escribe**. El funcionamiento del producto no depende de Internet. Reiniciar restaura los registros confirmados con sus estados, fechas y orden.

Se distingue carga inicial de tablero vacío. Un fallo de apertura o migración muestra una explicación y «Reintentar»; no se borra la base para ocultar el error. Un fallo de escritura mantiene los datos anteriores, conserva el formulario cuando corresponda y ofrece reintentar. No se anuncia éxito ni se navega como si se hubiera guardado. Durante una operación se evita la doble pulsación.

### Deshacer un movimiento

- Tras un movimiento guardado se ofrece «Deshacer» durante **6 segundos** en uso convencional.
- Con lector de pantalla activo, la acción permanece **sin caducidad temporal** hasta deshacer, descartarla, reemplazarla por otro movimiento o invalidarla por un cambio posterior. Debe existir una acción accesible para cerrar el aviso.
- Se mantiene una sola oportunidad, correspondiente al último movimiento confirmado. Un nuevo movimiento reemplaza la anterior.
- Editar, volver a mover o eliminar esa misma tarea invalida la oportunidad anterior. Cambios en otras tareas no la invalidan, salvo un nuevo movimiento que la reemplace.
- Antes de revertir se comprueba que el registro todavía coincide con la versión resultante del movimiento. Un deshacer obsoleto nunca sobrescribe cambios posteriores ni resucita una tarea eliminada.
- Deshacer es una escritura local explícita. Si falla, se informa del error; no se finge la reversión. La oportunidad no sobrevive al cierre del proceso.

## 6. Diseño visual y accesibilidad

| Uso | Color |
| --- | --- |
| Fondo general | `#F7F7FC` |
| Superficies y tarjetas | `#FFFFFF` |
| Acento, selección y acción principal | `#6D4AFF` |
| Texto principal | `#20212B` |
| Texto secundario | `#626575` |

Tema claro estable, tipografía del sistema, márgenes generosos, tarjetas redondeadas y jerarquía sencilla. Las acciones destructivas se reconocen por texto y confirmación. Validar contraste en combinaciones reales; no utilizar el color como única señal de estado, error o selección.

- Áreas táctiles mínimas de **48 × 48 unidades lógicas** en pestañas, acciones, navegación y deshacer, con separación suficiente.
- Respetar escala de texto del sistema. Evitar alturas fijas que corten contenido; permitir que pestañas, tarjetas y botones se adapten a texto grande y pantallas pequeñas.
- Formularios desplazables con teclado abierto, campos y botón de guardar alcanzables; respetar áreas seguras y barras del sistema.
- Etiquetas persistentes, roles, estado seleccionado de pestañas, contadores legibles y foco visible. Ejemplo: «Pendiente, 2 tareas, seleccionada».
- VoiceOver y TalkBack deben acceder solo a la columna visible. Las pestañas son una alternativa completa al gesto horizontal.
- Anunciar errores y movimientos sin robar el foco durante la escritura. Al abrir una pantalla, identificar su título; al regresar, recuperar un foco útil.
- Comprobar tablero, alta, edición, vacío, confirmaciones, selector de estados y aviso de deshacer con lector de pantalla y texto ampliado.

## 7. Criterios de aceptación

Se conserva la correspondencia original de los criterios aceptados. Los mismos identificadores se utilizan en el plan técnico y la verificación manual. Los límites de longitud, el orden, el descarte de borradores, la duración de deshacer y los demás detalles anteriores son reglas complementarias; no sustituyen ni renumeran estos criterios.

| ID | Criterio y resultado observable |
| --- | --- |
| AC01 | En una primera apertura sin datos, se muestra Pendiente vacía con una acción para crear una tarea, sin inicio de sesión y disponible sin conexión. |
| AC02 | El tablero presenta exactamente Pendiente, En curso y Hecho en ese orden, con contadores correctos; pestañas y swipe horizontal sincronizados muestran una columna cada vez. |
| AC03 | Un título vacío o compuesto solo por espacios no permite crear una tarea ni guardar su edición. |
| AC04 | Una tarea nueva aparece al principio de Pendiente con su título y su descripción opcional guardados. |
| AC05 | Editar y guardar actualiza los datos de la tarea; cancelar y descartar los cambios conserva los datos originales. |
| AC06 | Las acciones rápidas de iniciar y completar mueven la tarea a En curso y Hecho, respectivamente, y permiten deshacer el movimiento. |
| AC07 | Desde la edición se puede cambiar el estado de cualquier tarea de cualquiera de los tres estados a cualquier otro y guardar el cambio. |
| AC08 | Eliminar requiere confirmación; cancelar conserva la tarea y confirmar la retira de la lista y actualiza los contadores. |
| AC09 | Cerrar y reabrir la aplicación conserva los datos y cambios confirmados mediante persistencia local. |
| AC10 | Crear, consultar, editar y eliminar tareas funciona sin conexión. |
| AC11 | Las pantallas respetan teclado y áreas seguras, admiten texto ampliado y mantienen controles accesibles y alcanzables. |
| AC12 | Con lector de pantalla, los controles tienen nombres y roles comprensibles, se anuncia el estado seleccionado y se pueden ejecutar las acciones. |

## 8. Condición de aceptación

Completar AC01–AC12 con evidencia por plataforma, además de lint, comprobación de tipos y pruebas de dominio/persistencia. Una exportación de JavaScript no constituye una compilación nativa ni demuestra comportamiento en dispositivos. Las validaciones reales de iOS y Android quedan pendientes hasta ejecutarlas y registrar dispositivo, versión del sistema, fecha y resultado.

## 9. Refinamiento visual — navegación y tarjetas

- Selector de estados con fondo suave e indicador deslizante que acompaña al desplazamiento del tablero.
- El cambio por pestaña y por gesto no debe provocar una segunda transición al terminar, tampoco tras pulsar varias pestañas rápidamente.
- Tarjetas detalladas adaptables al contenido y texto ampliado: título destacado, descripción opcional, acento lateral, sombra suave y acción separada. Sin altura fija ni etiqueta de estado redundante.
- Respuesta de pulsación con una ligera reducción de escala y recuperación amortiguada; aparición breve de tarjetas y avisos mediante opacidad y desplazamiento pequeño.
- Los efectos no retrasan acciones y se desactivan al activar «Reducir movimiento» en el sistema.
- La fluidez percibida y el aspecto final se revisan en emulador o dispositivo; las pruebas automatizadas comprueban la sincronización de navegación.

## 10. Modos Detallada y Compacta

Esta ampliación permite elegir la presentación del mismo tablero. Las reglas anteriores sobre una sola columna, pestañas y tarjetas grandes corresponden a **Detallada**.

- Un único botón de vista a la derecha de «Mi tablero», junto al modo oscuro y fuera del contenido desplazable. Permanece visible en el tablero, también durante carga o error; no se añade al formulario modal.
- Detallada es el modo inicial cuando no existe preferencia. Conserva pestañas, gestos horizontales, tarjetas grandes, descripción y acciones rápidas.
- Compacta utiliza una lista vertical con los tres estados desplegados y contadores en sus cabeceras. Con muchas tareas es necesario desplazarse para ver los grupos inferiores.
- Las tarjetas compactas muestran exclusivamente el título, hasta dos líneas, con altura mínima de 60 puntos y crecimiento para texto ampliado. No muestran descripción, etiqueta ni botón de avance.
- Tocar una tarjeta compacta abre la edición de esa tarea, donde se puede cambiar de estado o eliminar. Los grupos vacíos indican «Sin tareas en este estado».
- El modo elegido se conserva localmente entre sesiones. Un fallo al guardar mantiene la vista anterior y permite reintentar; un fallo al leer permite usar Detallada y volver a elegir.
- Alternar no cambia tareas, orden ni la oportunidad de deshacer. Se conserva la sección detallada seleccionada durante la sesión.
- Crear en Compacta mantiene ese modo y desplaza la lista al inicio de Pendiente para mostrar la nueva tarea. Como en el flujo existente, una creación selecciona Pendiente para la siguiente visita a Detallada.
- El cambio utiliza una entrada suave de 200 ms, sin movimiento cuando está activado «Reducir movimiento».

### Criterios adicionales

| ID | Resultado observable |
| --- | --- |
| AC13 | El selector de vista permanece visible fuera de la lista mientras se desplaza el contenido. |
| AC14 | Compacta muestra los tres grupos con contadores y tarjetas de solo título; los vacíos se distinguen. |
| AC15 | Tocar una tarjeta compacta abre la tarea correcta con su descripción y todas las acciones de edición disponibles. |
| AC16 | Cambiar de modo conserva tareas, orden, sección detallada seleccionada y deshacer activo. |
| AC17 | Cerrar y abrir restaura el último modo guardado; la migración conserva las tareas existentes. |
| AC18 | Crear desde Compacta mantiene el modo y muestra la nueva tarea arriba de Pendiente. |
| AC19 | Alternar repetidamente vuelve a montar el paginador en la sección correcta, sin órdenes de navegación duplicadas. |
| AC20 | Selector y tarjetas son utilizables con lector y texto ampliado; los efectos respetan movimiento reducido. |

La validación visual y con gestos en dispositivos continúa pendiente. Las pruebas de integración simulan la capa nativa del paginador.

## 11. Tema claro y oscuro

- Botón con luna/sol en la esquina superior derecha, siempre visible junto al botón de cambio de vista. El lector lo anuncia como interruptor «Modo oscuro» y comunica si está activado.
- Pulsarlo alterna entre claro y oscuro sin cambiar el modo de vista, la sección seleccionada, las tareas ni el estado de Deshacer.
- Claro es el valor inicial. La elección se conserva en el dispositivo entre sesiones, independientemente de Detallada/Compacta.
- El tema se aplica a fondos, tarjetas, textos, pestañas, estados vacíos, botones, avisos, formularios y barra de estado. Los diálogos nativos y el teclado compatible siguen la apariencia elegida.
- Paleta oscura: fondo `#14121B`, superficies `#201D2C`, texto `#F6F2FF`, texto secundario `#B8B1C8` y acento violeta `#B9A4FF`. Los botones principales mantienen un fondo violeta más intenso con texto blanco.
- Si falla el guardado, se mantiene el tema anterior y se permite reintentar. El cambio no reinicia el tablero ni sus animaciones de entrada.

| ID | Resultado observable |
| --- | --- |
| AC21 | El control de modo oscuro está junto al cambio de vista, es accesible y cambia de estado al pulsarlo. |
| AC22 | Ambas vistas y el formulario mantienen colores legibles en claro y oscuro, con barra de estado acorde. |
| AC23 | Reabrir restaura el tema elegido sin modificar la preferencia de vista ni las tareas. |
| AC24 | Alternar conserva sección y Deshacer; un fallo al guardar conserva el tema anterior y admite reintento. |

Revisar contraste percibido, teclado, diálogos y barra de estado en iOS y Android reales o emulados antes de cerrar la aceptación visual.

## 12. Cabecera y tarjetas simplificadas

- Cabecera fija en una sola fila: «Mi tablero», botón de vista y botón de tema. Se eliminan la marca «EN FOCO» y el subtítulo. El título puede ocupar más líneas con texto ampliado para evitar recortes.
- El botón de vista representa el destino: líneas de lista para pasar a Compacta, dos tarjetas para pasar a Detallada. El nombre accesible anuncia «Cambiar a vista…» y el valor accesible comunica la vista actual. Mantener pulsado muestra una ayuda breve sin cambiar la vista.
- Ambos controles usan iconos vectoriales coherentes y áreas táctiles de 48 × 48 puntos.
- En Detallada se eliminan la etiqueta de estado, la flecha decorativa de edición y las frases de apoyo. Se conservan título, descripción, acción rápida y respuesta de pulsación. Las tarjetas crecen según el contenido.
- Pestañas de estado con nombre y contador en una misma línea, manteniendo el indicador animado y el desplazamiento horizontal para texto ampliado.
- «＋ Nueva tarea» continúa en el pie con su texto y comportamiento actuales.

## 13. Borrado por arrastre con Deshacer

- En Compacta y Detallada, arrastrar una tarjeta hacia la derecha descubre un fondo rojo y una papelera blanca por la izquierda. La papelera aumenta suavemente su presencia al aproximarse al umbral.
- El borrado solo se confirma al levantar el dedo habiendo desplazado al menos un tercio del ancho de la tarjeta. Cruzar el umbral y regresar por debajo antes de soltar cancela la operación.
- Soltar antes del umbral o interrumpir el gesto devuelve la tarjeta a su posición. Un gesto vertical, uno hacia la izquierda o uno multitáctil no inicia el borrado. Añadir un segundo dedo cancela el arrastre activo.
- El gesto no pide confirmación: tras guardar la eliminación, desaparece la tarjeta, se actualizan los contadores y aparece «Tarea eliminada · Deshacer».
- Deshacer restaura identidad, título, descripción, estado, fecha de creación y posición originales. La última modificación se actualiza. No sobrescribe una tarea que ya tenga ese identificador.
- Se comparte una única oportunidad de Deshacer con los movimientos: la acción reversible más reciente sustituye a la anterior. Dura 6 segundos, sin caducidad automática con lector de pantalla; no sobrevive al cierre del proceso.
- Si falla el borrado, la tarea y la oportunidad anterior de Deshacer se conservan, la tarjeta regresa a su sitio y se muestra el error. Si falla la restauración, se conserva la oportunidad mientras siga vigente.
- En Detallada, los gestos iniciados sobre una tarjeta no desplazan el paginador. El cambio lateral entre secciones se inicia fuera de las tarjetas o mediante las pestañas. El desplazamiento vertical de las listas sigue disponible.
- Cada tarjeta ofrece la acción accesible «Eliminar tarea» como alternativa al arrastre. El formulario conserva su eliminación con confirmación, conforme a AC08; la eliminación directa por gesto es la ampliación aprobada aquí.
- Retorno y salida utilizan animaciones cortas y respetan «Reducir movimiento».

| ID | Resultado observable |
| --- | --- |
| AC25 | En ambas vistas, arrastrar a la derecha muestra papelera y fondo rojo; no se elimina nada hasta soltar pasado el umbral. |
| AC26 | Volver hacia el origen antes de soltar, soltar antes del umbral o interrumpir el gesto conserva la tarjeta. |
| AC27 | Borrar actualiza lista y contadores; Deshacer recupera datos, estado y posición también tras cambiar de vista. |
| AC28 | El gesto no cambia la sección del tablero ni bloquea el scroll vertical o las acciones de pulsación. |
| AC29 | Los fallos de almacenamiento no pierden tareas ni sobrescriben datos al restaurar; se pueden reintentar las operaciones. |
| AC30 | Lector de pantalla permite eliminar sin gesto, anuncia eliminación/restauración y mantiene Deshacer accesible. |

Las pruebas automatizadas simulan los eventos de gesto y comprueban reglas y persistencia. La convivencia física con el paginador y el scroll requiere validación en iOS y Android.

## 14. Separación de estados en Compacta

- Cada grupo comienza con una franja sin sombra, menos redondeada que las tarjetas: lavanda neutra para Pendiente, violeta suave para En progreso y verde suave para Hecho, con variantes de tema oscuro.
- La franja incluye símbolo, nombre destacado, acento lateral y contador en una cápsula. El estado se reconoce por texto y símbolo además del color.
- Se aumenta el espacio entre grupos y se añade una línea divisoria discreta antes de la siguiente sección. Las tarjetas mantienen su separación compacta.
- La cabecera de la sección actual permanece fija bajo la cabecera principal durante el scroll, hasta que la siguiente la sustituye. Su fondo es opaco para que no se mezclen tarjetas y texto.
- Los estados vacíos conservan franja y contador a cero, con un mensaje breve debajo.
- Verificar separación, cabeceras fijas, texto ampliado y contraste en ambos temas en móvil o emulador.

## 15. Estabilidad y claridad de los flujos

- «Deshacer» flota encima del pie: al aparecer o desaparecer no cambia la altura disponible de la lista ni mueve «Nueva tarea». Las listas reservan espacio al final para alcanzar las últimas tarjetas sin que el aviso las tape, adaptado al tamaño de texto.
- Se recuerda durante la sesión el desplazamiento de Compacta y de cada columna detallada. Alternar modos conserva la posición de lectura. Crear una tarea reinicia únicamente Pendiente y Compacta para mostrarla; editar texto no reinicia posiciones.
- El formulario elimina las frases decorativas y reduce la altura inicial de la descripción. Crear/Guardar y los errores se sitúan en una barra fija, fuera de los campos desplazables y dentro del ajuste del teclado. Eliminar permanece como acción secundaria dentro del formulario, con confirmación.
- El arranque espera a recuperar las preferencias antes de presentar el tablero y aplicar apariencia nativa. Si falla la lectura, permite continuar con valores iniciales y muestra el error correspondiente.
- Los errores de vista y tema se recuperan por separado: guardar uno no elimina el aviso del otro.
- Al alcanzar el umbral de borrado aparece una cápsula blanca detrás de la papelera roja. Al retroceder desaparece, indicando que soltar ya no borrará.
- Los vacíos usan mensajes coherentes con el estado: primera apertura, «Todo al día por aquí», «Nada en marcha» y «Aquí verás lo que completes».

| ID | Resultado observable |
| --- | --- |
| AC31 | Mostrar/ocultar Deshacer mantiene la distribución del pie y la altura de la lista. |
| AC32 | Alternar vistas recupera su scroll; crear vuelve al inicio de Pendiente/Compacta y editar no reinicia el scroll. |
| AC33 | Crear/Guardar permanece fuera de los campos desplazables y accesible con teclado, mientras Eliminar sigue separado. |
| AC34 | El tablero se presenta con la paleta recuperada; una lectura fallida no deja la app bloqueada en el arranque. |
| AC35 | Recuperar la preferencia de vista o tema solo limpia su propio error. |
| AC36 | La papelera distingue visualmente si el desplazamiento final supera el umbral, y revierte al retroceder. |

El teclado, la restauración física del scroll, los tamaños ampliados y el arranque nativo requieren revisión en dispositivos. Expo Go no reproduce íntegramente el splash de una compilación final.

## 16. Base v2 — cuentas opcionales y colaboración

### 16.1. Autorización, alcance y estado

Base autorizada por el usuario el **2026-10-31**, sin exigir decisiones previas adicionales para avanzar en los pasos **1–4** del diagnóstico de `TECH_PLAN.md`. Las decisiones siguientes son iniciales y editables mediante revisión explícita. Se distingue aprobar una dirección de producto de implementarla o verificarla.

| Paso del diagnóstico | Alcance autorizado y estado de esta base |
| --- | --- |
| 1 — flujo de trabajo | Projects, padre/sub-issues, develop/PRs, calidad y revisión local firmada. Instalado en PR #6; protección activa y prueba piloto posterior. Guía en `docs/DEVELOPMENT.md`. |
| 2 — formulario/accesibilidad | Afinar formulario local (AC37). Implementado con tests; aceptación física y auditoría real de Deshacer siguen pendientes. |
| 3 — especificación v2 | Esta sección y [CLOUD_CONTRACT.md](docs/CLOUD_CONTRACT.md) fijan producto y contratos iniciales para planificación/experimento. La futura migración SQLite no está implementada. |
| 4 — experimento | Auth/RLS y mutaciones versionadas en Supabase **local**, aislado en `supabase/`, con dos usuarios y snapshots. CI real correcta en run 41202732266. Sin cliente Supabase en la app. |

La numeración de esta tabla corresponde a los cuatro pasos ofrecidos al usuario, no a los índices 0–7 del roadmap histórico. El encargo autoriza implementar e integrar esta base por PR, con recursos GitHub gratuitos; no implica desplegar, crear recursos cloud con coste ni integrar toda la colaboración productiva. Las cuentas, invitaciones, migración SQLite y sincronización dentro de la app siguen siendo objetivos posteriores.

### 16.2. Decisiones iniciales de producto

1. **Local sin cuenta:** conservar todas las operaciones locales/offline aprobadas. La cuenta es opcional para usar nube. Iniciar sesión no importa ni atribuye automáticamente las tareas anónimas.
2. **Identidad:** OTP por correo es el baseline propuesto para producción; recuperación, entrega de correo, sesión y enlaces móviles requieren validación antes de integrarlo. El experimento usa signup con email/contraseña exclusivamente en Auth local y datos ficticios; no fija contraseña como método de producción.
3. **Tableros:** un espacio local y, al activar nube, tableros personales y compartidos. El tablero personal de cuenta tiene solo su owner; compartir es una conversión explícita a compartido, no una filtración de su contenido. Cada tarea pertenece a un único tablero.
4. **Roles:** `owner` administra tablero, invitaciones y miembros; `member` consulta y modifica tareas del tablero. Un único owner activo por tablero, también presente en membership. No se puede autoascender, retirar al último owner ni transferir propiedad mediante una edición ordinaria; transferencia y cierre quedan fuera de la primera implementación.
5. **Responsable:** como máximo uno, opcional, y miembro activo del mismo tablero. Dejar de ser miembro retira su asignación de forma atómica y versionada; no borra las tareas ni elimina su autoría histórica.
6. **Invitaciones:** enlace con token aleatorio de alta entropía; almacenar solo hash en servidor, TTL inicial de 7 días, uso único y aceptación autenticada. El owner puede revocarlo. Si se vincula a email, el servidor comprueba el correo verificado del destinatario; el enlace no expone el directorio de correos. El token bruto no se registra ni se incluye en snapshots compartidos.
7. **Permisos:** autorización real por membership activa en servidor y RLS, para lecturas y escrituras. La UI no concede permisos. Revocación bloquea operaciones remotas y oculta la caché cuando el cliente la detecta; no se promete retirar datos ya vistos/copiados ni borrado remoto instantáneo de un dispositivo offline.
8. **Conflictos:** versión autoritativa del servidor, comparación por igualdad y resolución explícita. Nunca aplicar last-write-wins silencioso, ni el reloj del móvil como arbitraje. Ante conflicto se conserva el trabajo local y se puede descartar o preparar una nueva operación contra la versión actual.
9. **Migración/importación:** migrar SQLite v2 sin borrar datos, conservando identidad, texto, estado, fechas y orden. «Guardar mis tareas en mi cuenta» es voluntario, con destino/vista previa/conteo y una identidad de importación estable para no duplicar al reintentar. La copia local se conserva; eliminarla sería otra acción explícita. Memoria, caché, outbox y recuperación quedan aisladas por cuenta/tablero.
10. **Deshacer/Rehacer:** conservar una sola oportunidad de Deshacer, 6 s y sin caducidad temporal con lector, con cierre accesible e invalidación por cambios posteriores; no sobrevive al cierre del proceso. En nube, revertir es una compensación versionada, nunca reescribir el pasado o restaurar a ciegas. Rehacer, si se incorpora después, también exige nueva operación/versión; no se añade ahora un control ni una pila de Rehacer.

### 16.3. Interfaz y referencias de diseño

El **título del tablero será el selector**; su hoja mostrará local/personal/compartidos, selección actual y accesos secundarios a cuenta/miembros. Cambiar de tablero o cuenta protege un borrador sin guardar. Se mantienen botones de vista/tema, Detallada con descripción y acción rápida, Compacta de solo título y **«＋ Nueva tarea» textual en el pie**, sin botón flotante.

Responsable se editará en formulario y aparecerá como metadato breve en Detallada. Los estados de red serán contextuales y veraces: guardado local, pendiente, sincronizando, conflicto o error; no mostrar «sincronizado» sin confirmación. No convertir cada tarjeta en un panel de indicadores ni solapar estos mensajes con Deshacer.

Referencias sin duplicar las maquetas existentes:
- Secciones 4.2/4.3 de este SDD: jerarquía de campos; secciones 12/15: cabecera y guardado fijo vigentes.
- `TECH_PLAN.md`, diagnóstico, **Boceto A — formulario afinado, sin nube**: base de AC37.
- Mismo diagnóstico, **Boceto B — tablero compartido futuro**: referencia ASCII conceptual para selector, responsable y pie. No es diseño medido ni evidencia física; antes de integrar el paso 5 se validarán avisos, nombres largos, temas, lector, movimiento reducido y texto ampliado.

### 16.4. AC37 — formulario local, implementación actual

| ID | Resultado observable | Estado de implementación/verificación |
| --- | --- | --- |
| AC37 | Alta y edición identifican el título como obligatorio, mantienen 1–120 caracteres tras `trim` y muestran contador de descripción `longitud/2000`. Abrir vacío muestra ayuda sin error rojo. Al perder foco (`blur`), un título vacío/espacios muestra error junto al campo; corregirlo retira el error. Contadores no anuncian cada carácter. Valores inválidos bloquean Guardar; no se persiste al escribir. Fallos de guardado conservan borrador y error junto a la barra fija. | Implementado en `TaskForm.tsx`; 14 tests de formulario, lint/tipos y CI correctos en la base #6. Sin cierre físico: lector/teclado/texto ampliado pendientes. No equivale a validación cloud. |

AC37 precisa la interacción del formulario sin sustituir AC03, AC11, AC12 ni AC33. No depende de Auth ni de red.

### 16.5. AC38+ — criterios objetivo futuros

Todos los criterios siguientes son **objetivos de la base v2, pendientes de implementación/verificación de extremo a extremo en la app**. Una prueba del experimento solo acredita la parte que ejecuta; no convierte la tabla entera en implementada.

| ID | Resultado observable objetivo |
| --- | --- |
| AC38 | Sin cuenta se conserva CRUD offline y SQLite; crear una cuenta/iniciar sesión no sube las tareas locales sin consentimiento. |
| AC39 | Cuenta opcional habilita personal/compartidos; el selector en el título cambia de tablero sin mezclar datos ni perder borradores y conserva «＋ Nueva tarea» textual en el pie. |
| AC40 | Owner administra miembros e invitaciones; member modifica tareas sin administrar permisos. Anónimo, ajeno y revocado no pueden leer ni mutar el tablero por API directa ni reutilizando operaciones anteriores. |
| AC41 | Cada tarea tiene cero o un responsable activo del mismo tablero; asignación externa se rechaza y retirar un miembro elimina su asignación con nueva versión. |
| AC42 | Una invitación autenticada comprueba hash, TTL, uso único, revocación y destinatario si procede. Aceptaciones simultáneas no consumen el enlace más de una vez ni elevan rol. |
| AC43 | Migrar desde SQLite v2 conserva datos/IDs/fechas/orden; un fallo hace rollback y permite reintentar. Importación voluntaria repetida no duplica ni mezcla cuentas. |
| AC44 | Mutación local y outbox se confirman atómicamente antes de actualizar memoria; guardar no espera red. Cambiar/cerrar sesión detiene envíos de esa cuenta y no reutiliza operaciones bajo otra identidad. |
| AC45 | Repetir la misma operación tras timeout devuelve el mismo resultado autorizado sin duplicar efectos; `expected_version` obsoleta produce conflicto visible sin sobrescritura silenciosa y conserva el trabajo local. |
| AC46 | Borrado se propaga mediante tombstone; Deshacer es compensación contra la versión correspondiente, conserva posición si sigue siendo válida y rechaza cambios ajenos/revocación. Mantiene 6 s o sin caducidad con lector; Rehacer no está implementado por este criterio. |
| AC47 | La recuperación de producción no pierde commits/borrados concurrentes: página y cursor se confirman juntos; cursor caducado exige rehidratar preservando pendientes. El snapshot del experimento no demuestra este criterio. |
| AC48 | La app diferencia confirmación local/remota, pendientes, conflicto y rechazo; sesión caducada permite reautenticar la misma cuenta sin enviar con otra. La revocación se aplica al detectarse y no promete retirar remotamente copias offline. |

### 16.6. Condición de terminado y registro de evidencia

- **Documentación base:** decisiones iniciales, límites, criterios y contratos enlazados; editable después con trazabilidad de cambios. No se presenta como entrega cloud.
- **Paso 1:** circuito PR/revisión/calidad probado con una PR piloto; no basta guardar una configuración. Registrar estados sin firma/inválida/obsoleta y aprobación válida, y borrado de rama tras merge.
- **Paso 2:** lint, tipos y tests significativos de formulario. La revisión de teclado, texto ampliado, lector, scroll y Deshacer en iOS/Android se registra por separado con entorno/fecha/resultado; queda pendiente si no se ejecutó.
- **Paso 3:** documentación y contratos, no migración ejecutada. Cuando se implemente la migración: SQL real desde snapshots v2, rollback, reintento/importación idempotente y aislamiento entre cuentas; dobles de repositorio no bastan para demostrarla.
- **Paso 4:** pruebas reproducibles contra Supabase local real con Auth y dos usuarios, RLS/grants y RPC reales, permitidos y denegados, versiones, duplicados, conflictos y revocación; evidencia del comando, entorno y resultado. CI debe ejecutar ese entorno real para acreditar permisos/Auth, no solo dobles o claims JWT inventadas. Si únicamente corre local o con dobles, indicarlo expresamente y dejar la integración CI pendiente.
- **Producción futura:** AC38+ se cierra por entregas con evidencia servidor/cliente y validación en dispositivos cuando corresponda. Ni tests unitarios, ni un run CI de la app local, ni exportar JavaScript acreditan nube integrada o dispositivos.

El detalle normativo del protocolo futuro v1, alcance reducido del experimento y pendientes de producción está en [docs/CLOUD_CONTRACT.md](docs/CLOUD_CONTRACT.md).
