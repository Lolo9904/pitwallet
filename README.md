# PitWallet

PWA de finanzas personales: 3 cuentas, gastos/ingresos por categoría, presupuestos, gastos a devolver por la empresa y control detallado del coche (calendario de trabajo, repostajes, consumo real, coste por km).

Sin dependencias ni build: HTML + CSS + JS. Funciona offline.

## 1. Publicar la app (repo público)

1. Crea el repo `pitwallet` en GitHub y sube todos estos archivos a la raíz.
2. Settings → Pages → *Deploy from a branch* → `main` / `/ (root)`.
3. En 1–2 min estará en `https://lolo9904.github.io/pitwallet/`.
4. En el iPhone: ábrela en Safari → Compartir → **Añadir a pantalla de inicio**.

El repo de la app no contiene datos tuyos: puede ser público sin problema.

## 2. Sincronización (repo privado aparte)

Tus datos van a un repo **privado** distinto, como un único `data.json`.

1. Crea un repo **privado** vacío: `pitwallet-data` (márcalo con README para que tenga rama `main`).
2. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token:
   - Repository access: *Only select repositories* → `pitwallet-data`
   - Permissions → Repository → **Contents: Read and write**
   - Expiración: la que quieras (al caducar, la app te avisará con un error 401).
3. En la app: Ajustes → Sincronización → pega el token → *Guardar y sincronizar*.
4. Repite el paso 3 en cada dispositivo (iPhone, iPad, ordenador).

Cómo funciona: cada cambio se sube ~2,5 s después; al abrir la app o volver a ella, se baja y fusiona. La fusión es por registro (cada movimiento, día y categoría lleva fecha de modificación), así que puedes apuntar cosas offline en el móvil y en el PC y no se pisan. Cada sync es un commit, así que tienes el historial completo en el repo.

El token se guarda solo en el navegador de cada dispositivo, nunca en el repo.

## 3. Uso rápido

| Qué | Dónde |
|---|---|
| Saldo inicial de cada cuenta | Inicio → toca la cuenta (o Ajustes → Cuentas) |
| Cuadrar saldo si se descuadra | Toca la cuenta → "¿cuánto tienes de verdad?" → crea un ajuste con la diferencia |
| Gasto que te devuelve la empresa | Al añadir el gasto: "¿Lo tiene que devolver la empresa?" → pendiente |
| Marcar como cobrado | Inicio → Pendiente de cobro → *Cobrado* (crea el ingreso de reembolso) |
| Días de oficina / IDIADA | Coche → elige pincel → toca días. "Editar día" para km/compensación a medida |
| Repostaje | + → ⛽ Repostaje: importe, litros, **km hechos (trip)** u odómetro total, y si has llenado. Te enseña el consumo al momento |
| Presupuestos | Ajustes → Categorías → toca una → €/mes |

### Lógica del coche
- **Precio €/L**: el del último repostaje anterior a cada día (si no hay ninguno, el de Ajustes).
- **Consumo**: litros ÷ km hechos × 100, por método lleno‑a‑lleno (si entre medias hay repostajes parciales, se suman sus litros y km). Se meten los km del trip (lo pones a 0 al repostar) o el odómetro total; la app recuerda el último modo. Mejor no cambiar de modo a mitad: el tramo entre un trip y un odómetro no se puede enlazar. Sin datos usa el de Ajustes (6,0 L/100).
- **Coste día** = km × consumo / 100 × precio.
- **Trabajo vs personal**: km totales por odómetro (interpolado entre repostajes) − km de trabajo marcados = km personales/hobby.
- **Coste real por km** (12 meses) = todos los gastos de categorías marcadas como "coche" ÷ km del odómetro.

### Saldos
- **Líquido** = suma de las 3 cuentas.
- **Real** = líquido + lo pendiente de la empresa (gastos adelantados + dietas IDIADA no cobradas).
- Lo adelantado para la empresa y su reembolso no cuentan en stats ni presupuestos.

## 4. Actualizar la app
Si cambias código, sube `VERSION` en `sw.js` para que los móviles cojan la versión nueva.

## Backups
Ajustes → Datos → Backup JSON / Exportar CSV (separador `;`, abre bien en Excel en español).
