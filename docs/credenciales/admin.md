# Admin de prueba

La misma cuenta funciona en MiFlota Web y MiFlota Admin Mobile porque ambas
usan el endpoint de autenticación de dueño del API.

| Campo | Valor |
|---|---|
| Usuario | `admin` |
| Contraseña | `AdminInterop2026x` (reseteada el 2026-08-20) |
| Uso | Web + Admin Mobile |

La VPS rechazó la contraseña histórica `admin12345678` y, por la política de
provisionamiento, no se reemplazó automáticamente. El 2026-08-20 se reseteó con
`crear-usuario.js admin --reset` para la prueba de interoperabilidad.

**Nota:** la flota demo (15 vehículos + choferes + pagos) pertenece a la cuenta
`test`, no a `admin`. `admin` solo posee el vehículo BYJ066. Para ver la flota
demo en Web/Admin Mobile se debe entrar con `test`.
