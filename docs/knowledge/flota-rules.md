# Manual de Capacitación para Agente de IA
## Módulo 5: Flota de Vehículos (Empresarial)
Arquitectura de Riesgos Logísticos y Responsabilidad Corporativa

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Flota es un contrato maestro (Póliza Colectiva) diseñado para empresas. No evalúa el riesgo de un solo conductor, sino la operación logística y comercial de la compañía, agrupando todos los activos móviles.

#### 1.1 Identificación y Tipificación del Activo (Matriz de Flota)
* **Clasificación de Uso:** Comercial, Carga, Pasajeros o Maquinaria Amarilla.
* **Vehículos Pesados vs. Livianos:** Los camiones (>3 toneladas) requieren límites de RC y tasas diametralmente distintas.
* **Accesorios Industriales:** Furgones, volcos o grúas deben declararse por separado del chasis.

#### 1.2 La Cobertura Crítica B2B: Amparo Patrimonial
* **Definición Operativa:** Protege a la empresa cuando el conductor (empleado) viola la ley (ej. choca en estado de embriaguez o huye del lugar).
* **Alcance:** La aseguradora **paga a los terceros afectados** (salvando a la empresa de demandas), pero **no paga** los daños del vehículo propio como penalidad.

#### 1.3 Responsabilidad Civil Extracontractual (RCE)
* **Daños a Bienes de Terceros:** Chocar infraestructuras o vehículos ajenos.
* **Muerte o Lesiones (Pluralidad):** Límite máximo para accidentes múltiples (ej. chocar un autobús).
* **Perjuicios Extrapatrimoniales:** Cubre daños "morales" o psicológicos demandados por las víctimas.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Límites Corporativos (RCE)
El agente debe diferenciar si aplican límites distintos para Pesados y Livianos.

| Métrica de RCE Exigida | Vehículos Livianos (Comercial) | Vehículos Pesados (Carga) |
| :--- | :--- | :--- |
| Límite Único Combinado (LUC) | $2,000,000,000 | $4,000,000,000 |
| Amparo Patrimonial | Incluido (Límite RCE) | Incluido (Límite RCE) |
| Perjuicios Extrapatrimoniales | 100% del LUC | 100% del LUC |
| Asistencia Jurídica Penal | Ilimitada | Ilimitada |

#### Extracción 2: Deducibles Unificados de Flota
En empresas, los deducibles se negocian en bloque.

| Cobertura (Toda la flota) | Condición de Deducible Extraída |
| :--- | :--- |
| **RCE (Daños a Terceros)** | Sin Deducible (Exigencia innegociable B2B) |
| **Pérdida Total (Daños o Hurto)** | 0% (Sin Deducible) |
| **Pérdidas Parciales (Livianos)** | 10% de la pérdida, Mínimo 1 SMMLV |
| **Pérdidas Parciales (Pesados)** | 10% de la pérdida, Mínimo 3 SMMLV |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. Tarificación Unificada vs. Individualización**
* **La Regla:** Buscar si la aseguradora aplicó una "Tasa Plana" (Flat Rate) para toda la flota.
* **El Por Qué para la IA:** Es inviable cotizar cada vez que la empresa compra un vehículo. Si una aseguradora ofrece Tasa Plana (ej. 2.5%), las inclusiones futuras son automáticas a ese costo. Penalizar a las que no ofrezcan esto.

**B. El Riesgo Moral del Empleado (Amparo Patrimonial)**
* **La Regla:** Si no indica explícitamente "Amparo Patrimonial", emitir Alerta Roja Crítica.
* **El Por Qué para la IA:** Si un empleado choca ebrio y no hay Amparo Patrimonial, la aseguradora no paga nada. Las víctimas demandarán solidariamente a la empresa, llevándola a la quiebra.

**C. Límites Catastróficos Diferenciados (Pesados vs. Livianos)**
* **La Regla:** Auditar que los vehículos pesados tengan límites de RCE significativamente más altos.
* **El Por Qué para la IA:** Un sedán causa daños menores; una tractomula sin frenos causa catástrofes de $4,000M. Si la propuesta ofrece el mismo límite bajo para ambos, advertir sobre un Sub-seguro de Responsabilidad.

**D. Deducibles de Pérdida Parcial en Pesados**
* **La Regla:** En pesados, el mínimo del deducible suele ser más alto (ej. 3 SMMLV).
* **El Por Qué para la IA:** Evita reclamaciones por raspones de uso diario. Validar que el cliente entienda que daños menores van por su presupuesto de mantenimiento.