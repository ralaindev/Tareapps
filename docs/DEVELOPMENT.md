# Flujo de desarrollo de Tareapps

## Base autorizada

[Project privado](https://github.com/users/ralaindev/projects/1), vinculado al repositorio público.
Issue padre [#1](https://github.com/ralaindev/Tareapps/issues/1) y sub-issues #2–#5 cubren
la primera base. Cada issue incluye objetivo, alcance, contrato, dependencias y evidencia.
No escribir datos personales/secretos en issues o PRs públicas, aunque el Project sea privado.

Estados iniciales del Project: Todo, In Progress y Done. Todo contiene solo trabajo con
alcance descrito; para tareas no preparadas, explicar decisiones pendientes en la issue.
Se pueden añadir estados sin alterar las reglas de la app. El historial real está en
issues, PRs, commits y ejecuciones; no inventar issues históricas como si precediesen al código.

## Ramas e integración

- `main`: rama estable; la retirada del antiguo workflow de firma se completa al integrar el cambio en ella.
- `develop`: integración; las ramas `feat/<slug>` y `fix/<slug>` usan nombres descriptivos
  sin número de issue y parten de `origin/develop` actualizado, con worktree/directorio
  independiente por tarea paralela. La issue se enlaza en la PR, no en el nombre de rama.
- PR normal contra `develop`, issue + padre + Project enlazados. Una entrega revisada
  integra `develop` en `main` por PR, conservando `develop`.
- Checks requeridos: **Lint, types and tests**, **Secrets** y **Cloud experiment**.
  Rama actualizada con la base, sin force-push ni borrado de `main`/`develop`, reglas
  aplicadas también a administradores. No usar `--admin` para saltarlas.
- Al fusionar, GitHub borra automáticamente la rama de trabajo. Si la fuente es
  `develop`, la protección de rama impide borrarla. La limpieza del worktree local
  es posterior y solo tras conservar todo su contenido.
- Cada PR puede cubrir una o varias issues explícitas; preferir una unidad independiente.
  La primera base agrupa #2–#5 para instalar el circuito confiable coherentemente.
- Cada PR debe incluir en su cuerpo una línea `Closes #123` por cada issue que
  completa, perteneciente a este repositorio. La comprobación `Issue link` valida
  su existencia y que esté abierta para PRs a `develop`. Al fusionar en `develop`,
  un workflow cierra esas issues; GitHub no lo hace de forma nativa fuera de `main`.
  En PRs de promoción a `main` se admiten issues ya cerradas. No referenciar un
  parent hasta que todas sus sub-issues estén terminadas. Si falla la automatización
  tras el merge, volver a ejecutar el job fallido desde GitHub Actions: se reintentan
  fallos transitorios y se omiten issues ya cerradas. Si persiste, comprobar permisos
  y resolver las pendientes manualmente. El propietario acepta el riesgo de editar el
  cuerpo entre la validación y el merge; se procesa el cuerpo vigente al fusionar.

## Revisión local de código

Antes de completar una PR, revisar el diff completo y los criterios aplicables en
un contexto independiente usando `tareapps-reviewer`. Comprobar errores, regresiones,
contratos, pruebas y límites de integración; además evaluar responsabilidades,
cohesión, acoplamiento, duplicación, patrones del proyecto y principios como SOLID
según el contexto, sin introducir complejidad o abstracciones gratuitas.

Publicar un comentario en la PR solo si un hallazgo requiere una decisión o revisión
del usuario; incluir HEAD y base, impacto y decisión necesaria. Corregir con autonomía
lo autorizado y volver a revisar, sin comentarios de confirmación o trámite. Conservar
el resultado y los límites en el informe local. No firmar ni publicar un check de
revisión artificial.

La revisión es local y manual; no aparece como check automático obligatorio. El
verde de GitHub corresponde a los controles de CI requeridos, no demuestra por sí
solo que se haya completado la revisión ni la aceptación funcional. El workflow de
firma anterior está desactivado en GitHub y se elimina de cada rama al integrar este
cambio; el historial del piloto sigue disponible en la PR #8.
## Calidad y experimento cloud

Node.js 24, npm/lockfile, lint, tipos y Jest; el verificador tiene tests criptográficos
con `npm run test:review`. Secrets ejecuta Gitleaks fijado y verificado por checksum.
Cloud experiment usa Supabase efímero con Auth/Postgres/RLS reales en Ubuntu/Docker;
no conecta a un proyecto cloud ni publica la app. Ver `experiments/cloud/README.md`.
No se exige un porcentaje arbitrario de cobertura ni se añade un servicio de pago.

En este equipo Windows no hay Docker: validar el experimento en CI y distinguir esa
evidencia de una app conectada o de una prueba en dispositivo. Semgrep y controles
adicionales pueden incorporarse después con reglas justificadas y versiones fijadas.
