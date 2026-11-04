# Entornos y servicios

**Estado: inventario inicial para la issue #11.** Este documento describe lo que se
ha podido comprobar en el repositorio y esta sesión; no significa que haya un
backend desplegado, una cuenta de proveedor autenticada ni una app conectada a nube.
Las decisiones de cuenta, región, gasto y recursos remotos quedan pendientes de
confirmación del usuario. No se han creado, enlazado ni modificado recursos externos.

## Inventario comprobado

| Componente | Evidencia actual | Decisión/estado |
| --- | --- | --- |
| App En foco | Expo SDK 58, React Native 0.88; SQLite esquema v2; `app.json` conserva scheme `enfoco`; no `ios.bundleIdentifier`, `android.package` ni `extra.eas.projectId`. | App local/offline. No requiere variables cloud y debe seguir arrancando sin ellas. Sin SDK Supabase ni cuenta en la app. |
| GitHub | Repositorio público `ralaindev/Tareapps`; CI usa permisos de lectura, sin tokens de proveedor. Consulta autenticada de nombres de Actions secrets/variables: listas vacías. | Reutilizar repositorio, Project, PR y CI existentes. No agregar secretos hasta identificar un consumidor autorizado. |
| Supabase | CLI no instalada globalmente; proyecto `tareapps-cloud-experiment` configurado solo para el stack efímero local. CI ejecuta Supabase CLI 2.122.0 con Docker en Ubuntu. No hay `SUPABASE_ACCESS_TOKEN` ni `SUPABASE_DB_PASSWORD` en los ámbitos de entorno consultados. No se comprobó cuenta, organización, proyectos remotos, región, plan ni permisos MCP. | El experimento local/CI es solo pruebas, no un entorno `development` persistente ni producción. Proyecto remoto por inventariar; reutilizar uno existente si el usuario lo confirma y es apropiado. No hacer `link`, `db push`, reset ni despliegue remoto. |
| Expo/EAS | CLI EAS no instalada globalmente; configuración actual no tiene owner, projectId EAS ni IDs de aplicación. No se encontró `EXPO_TOKEN` en los ámbitos de entorno consultados. No se comprobó cuenta, proyectos, builds, certificados ni titularidad. | No ejecutar `eas init`, registrar IDs/certificados ni crear perfiles hasta conocer la cuenta, el proyecto existente y los identificadores elegidos. No iniciar builds/OTA/tiendas. |
| Vercel/web | CLI Vercel no instalada globalmente; no existe `vercel.json`. No se encontró `VERCEL_TOKEN` en los ámbitos de entorno consultados. No se comprobó cuenta, proyecto, dominio ni despliegues. | **Diferido/no necesario** para la app nativa ni para OTP por código en la app. Reconsiderar solo si se aprueba una ruta web de invitación/retorno/fallback; el primer despliegue puede tener efecto Production y debe autorizarse por separado. |
| Correo/SMTP y dominio | No hay configuración o credencial SMTP en el repositorio ni proyecto remoto inspeccionado. No se comprobó proveedor, dominio, DNS ni remitente existente. | Para validar entrega OTP real se necesitarán un proveedor/remitente autorizados y, potencialmente, dominio/DNS. Primero inventariar; no contratar ni cambiar DNS. El SMTP de prueba local no demuestra entrega real. |
| Credenciales locales | `gh auth status` verificó GitHub CLI autenticado como `ralaindev` en Windows Credential Manager. No se imprimió el PAT. La variable GitHub personal existe en el entorno de esta sesión, pero no es credencial Supabase/EAS/Vercel y no se reutiliza para ellos. | GitHub autenticado no implica autenticación en otros proveedores. No copiar tokens a issues, PRs, logs, archivos versionados ni bundle móvil. |

La ausencia de nombres en el repositorio o en variables del proceso/usuario/máquina
no prueba que no existan cuentas, recursos o credenciales almacenadas en un gestor
externo. Las comprobaciones de CLI y entorno realizadas son locales y de solo lectura.

## Matriz de entornos y ramas

| Entorno | Propósito/datos | Automatización y destino | Estado |
| --- | --- | --- | --- |
| `local` | App actual con SQLite local; experimento Supabase local solo con datos sintéticos. | `npm start`; stack cloud efímero solo mediante `npm run test:cloud` en host compatible con Docker. | App implementada. En este Windows no están instaladas las CLI globales de Supabase/Vercel/EAS ni Docker; no se ejecutó el experimento aquí. CI Ubuntu sí ejecuta el experimento. |
| CI | Lint, tipos, tests, Gitleaks y Supabase/Auth/RLS efímero. Sin datos reales ni secretos de proveedores. | GitHub Actions para PR/push de `main` y `develop`; Supabase local se crea y destruye en el runner. | Configuración existente; conservar los cuatro checks obligatorios y su aislamiento. |
| `development` remoto | Futuro destino compartido de pruebas con datos sintéticos y accesos limitados. | Solo tras inventariar y autorizar un proyecto concreto. Ramas/PR no deben enlazarse automáticamente a un proyecto productivo ni ejecutar migraciones remotas. | No existe/verificado aún. Bloqueado por identificar cuenta/proyecto, región y límites aceptables. |
| `preview` web/build | No se necesita para probar la app local ni el experimento CI. | Un preview no garantiza aislamiento; no apuntarlo a datos reales. Vercel solo tras decidir que la web aporta una necesidad concreta. | Diferido. |
| `production` | Servicio futuro para usuarios; no habilitado. | Sin despliegue automático por vincular proveedor o fusionar en `main`; migraciones, builds/OTA y publicación requieren una autorización/entrega aparte. | No configurado ni autorizado. |

La PR se revisa contra `develop`; `main` no debe activar despliegue productivo por
el mero hecho de conectar un proveedor. Las migraciones remotas requieren una
operación separada, revisada y autorizada; nunca `db push`/reset automático por PR.
No se comparten bases de producción como sustituto de aislamiento de desarrollo.

## Configuración y secretos

`.env.example` contiene únicamente nombres y placeholders, y está expresamente
permitido por `.gitignore`. Hoy no hay consumidor cloud en la app: añadir valores
reales no activa ni conecta nada. Variables con prefijo `EXPO_PUBLIC_` se incorporan
al cliente y son públicas; nunca poner ahí claves secretas, contraseñas, SMTP, PAT ni
`service_role`.

| Variable/credencial | Consumidor previsto | Clasificación y estado |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Futura app móvil, solo cuando exista cliente aprobado. | Configuración pública; no usada actualmente. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Futura app móvil con RLS probado. | Clave publicable, visible en el bundle; no concede permiso por sí sola y no existe conexión actual. |
| `SUPABASE_PROJECT_REF` | Automatización de entorno remoto, si se aprueba. | Identificador no secreto; no configurado. |
| `SUPABASE_ACCESS_TOKEN`, contraseña DB, `service_role`/secret key | Herramientas privilegiadas de operador/CI estrictamente autorizado. | Secretos; ninguno debe añadirse por defecto ni exponerse al bundle, fork o job de PR. No presentes en secretos de Actions según el inventario consultado. |
| `EXPO_TOKEN` | Automatización EAS solo si se decide y se identifica un job que lo necesite. | Secreto; no configurado. No necesario para CI actual. |
| `VERCEL_TOKEN` | Automatización web solo si Vercel se aprueba. | Secreto; no configurado. No necesario para el producto nativo. |
| SMTP/password/API key de proveedor | Configuración Auth de un proyecto Supabase remoto autorizado. | Secreto fuera del cliente; aún sin proveedor/proyecto identificado. Nunca guardarlo en este repositorio o en issue pública. |

Usar almacenes protegidos del proveedor solo cuando haya consumidor, privilegio
mínimo y entorno definido. Documentar responsable y rotación en un registro privado;
esta documentación pública solo conserva nombres, no valores ni datos personales.
No reutilizar el PAT de GitHub con otro proveedor. Al cambiar variables públicas de
Expo, regenerar el artefacto que las consume; no hay OTA ni build configurado aquí.

## Límites, costes, datos y recuperación

- No se ha consultado un plan autenticado de Supabase, Expo o Vercel; no se declara
  gratuita ninguna opción ni se prometen cuotas, SLA, backups o ausencia de suspensión.
- Antes de elegir destino remoto, acordar región próxima a usuarios, plan/límites
  vigentes, presupuesto máximo mensual, responsable, retención, backups y una prueba
  de restauración. No usar datos personales reales para la primera configuración.
- No comprar dominio, cambiar DNS, contratar SMTP/hosting, habilitar funciones de pago
  ni crear proyectos con coste sin autorización específica. Si no hay una opción que
  respete el límite aprobado, mantener el experimento local/CI y presentar alternativas.
- Los recursos existentes deben identificarse por owner/proyecto/propósito sin copiar
  datos personales. Reutilizar, crear después de autorizar, diferir o declarar no
  necesario; nunca borrar/renombrar recursos como atajo.

## Procedimiento de preparación y reversión

1. Confirmar con el owner la cuenta y los recursos existentes en Supabase, Expo/EAS,
   Vercel y correo/dominio. Verificar identidad/permisos en sus CLI/paneles sin volcar
   tokens; usar MFA y mínimos privilegios.
2. Acordar destino `development`, región, presupuesto/límites, datos sintéticos y
   responsable de recuperación. Si falta una decisión de cuenta/coste/dominio,
   detener solo la acción externa afectada; el trabajo local continúa.
3. Comparar migraciones del experimento con `docs/CLOUD_CONTRACT.md`; no aplicarlas
   a remoto directamente. Diseñar y revisar un esquema de desarrollo separado antes
   de cualquier DDL remoto. Mantener la base local/CI efímera aislada.
4. Añadir solo variables que un consumidor probado requiera; comprobar primero
   `.gitignore`, el escáner de secretos y el destino del secreto. Ejecutar `git check-ignore`
   para `.env` y verificar que `.env.example` sí puede versionarse. No enviar tokens
   en comandos, logs o shell tracing.
5. Para revertir una vinculación local, quitar solo su referencia/configuración local
   tras verificar que no contiene datos necesarios. Revertir una configuración remota
   exige identificar sus efectos y obtener aprobación; no borrar proyectos/datos para
   volver atrás. Rotar de inmediato un secreto expuesto desde el panel del proveedor,
   actualizar sus consumidores y documentar el incidente sin publicar el valor.

Comandos para revisar la base local, no para modificar servicios remotos:

```sh
node --version
npm --version
npm run lint
npm run typecheck
npm test
npm run test:review
npm run test:cloud
```

`npm run test:cloud` requiere Node.js 24, Docker y puertos locales libres; reinicia y
descarta exclusivamente la instancia efímera `tareapps-cloud-experiment`. No correrlo
contra recursos remotos ni sobre una base local con datos que se quieran conservar.

## Pendientes de verificación/decisión

- [ ] Confirmar cuentas/owners y proyectos remotos existentes; CLI/MCP y permisos
      efectivos de Supabase, Expo/EAS y, si aplica, Vercel.
- [ ] Elegir/reutilizar el proyecto Supabase de desarrollo, región, plan/límites,
      presupuesto, responsable y política de backup/restauración.
- [ ] Decidir proveedor SMTP/remitente y dominio solo si se realizará prueba de entrega
      OTP fuera del entorno local; verificar destinatarios autorizados y DNS antes de tocarlo.
- [ ] Decidir si Vercel/web de invitación es necesaria. De momento queda diferida;
      no bloquea OTP móvil por código.
- [ ] Confirmar owner/proyecto EAS, bundle identifier iOS y applicationId Android
      antes de preparar perfiles development/preview. Sin builds/certificados/pagos
      incluidos en esta preparación.
- [ ] Después de esas respuestas, diseñar/revisar configuración remota específica y
      solicitar autorización para aplicar cualquier cambio externo.

Referencias para reevaluar al autorizar el siguiente paso (planes y documentación
pueden cambiar): [Supabase Auth OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[URLs de retorno Supabase](https://supabase.com/docs/guides/auth/redirect-urls),
[entornos Vercel](https://vercel.com/docs/deployments/environments) y
[variables EAS](https://docs.expo.dev/eas/environment-variables/). La documentación
consultada no equivale a una configuración ni prueba de entrega/retorno en un build.
