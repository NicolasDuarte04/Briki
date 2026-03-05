# Manual de Capacitación para Agente de IA
## Módulo 2: Responsabilidad Civil Extracontractual (RCE)
Arquitectura de Riesgos Legales y Análisis de Variables

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de RCE protege el patrimonio del asegurado frente a la obligación legal de indemnizar a un tercero por daños a sus bienes o lesiones personales derivados del desarrollo normal de su actividad económica.

#### 1.1 Amparo Básico y Límite Global
* **Límite Único Combinado (LUC):** Monto máximo que la aseguradora pagará por todos los eventos en la vigencia.
* **Predios, Labores y Operaciones (PLO):** El corazón de la póliza. Cubre incidentes en las instalaciones o durante la operación (Ej. Un cliente resbala por un piso mojado y demanda).

#### 1.2 Amparos Específicos (Sublímites o Límites Independientes)
* **R.C. Patronal:** Cubre demandas de propios empleados contra el empleador por culpa comprobada en accidentes laborales (perjuicios morales y fisiológicos).
* **R.C. Contratistas y Subcontratistas:** Responsabilidad solidaria si un contratista del asegurado causa un daño.
* **R.C. Vehículos Propios y No Propios:** Opera "en exceso" de la póliza de autos básica del vehículo.
* **R.C. Parqueaderos:** Ampara vehículos de clientes en custodia.
* **Bienes bajo cuidado, tenencia y control:** Máquinas alquiladas o mercancía ajena.
* **Gastos Médicos:** Cobertura sin análisis de culpa para gastos hospitalarios inmediatos de terceros lesionados.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Límites Asegurados
El agente debe mapear si la cobertura es por Vigencia o por Evento.

| Amparo / Cobertura | Límite por Evento | Límite por Vigencia |
| :--- | :--- | :--- |
| PLO (Amparo Básico) | $1,500,000,000 | $1,500,000,000 |
| RC Patronal | $500,000,000 | $1,000,000,000 |
| RC Vehículos Propios y No Propios | $750,000,000 | $1,500,000,000 |
| Gastos Médicos | $15,000,000 | $50,000,000 |

#### Extracción 2: Deducibles y Franquicias en RC
Extracción literal de las condiciones jurídicas.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **PLO (Básico y demás amparos)** | 10% de la pérdida, Mínimo 1 SMMLV |
| **RC Patronal** | En exceso de la Seguridad Social (Sin deducible directo) |
| **Gastos Médicos** | Sin deducible |
| **RC Vehículos** | En exceso del SOAT y RCE Autos (Mínimo $100M COP) |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. Sublímites vs. Límites Adicionales (La Trampa Matemática)**
* **La Regla:** Distinguir si las coberturas accesorias son un Sublímite (restan del PLO) o Límite Adicional (se suman).
* **El Por Qué para la IA:** Si la Aseguradora B ofrece $1,000M para PLO y, ADEMÁS, un límite independiente de $500M para RC Patronal, es superior a la Aseguradora A que ofrece RC Patronal como sublímite, porque la capacidad indemnizatoria total real de B es mayor.

**B. La Función Táctica de los "Gastos Médicos"**
* **La Regla:** Verificar que los "Gastos Médicos" figuren siempre "Sin Deducible".
* **El Por Qué para la IA:** Si hay deducible, la empresa no podrá usarlo de inmediato para una urgencia médica rápida del tercero, lo que derivará en una demanda mayor. Castigar pólizas que impongan deducibles aquí.

**C. RC Patronal vs. ARL**
* **La Regla:** La RC Patronal opera "En Exceso" de la Seguridad Social (ARL).
* **El Por Qué para la IA:** La ARL paga gastos médicos y pensión. La póliza de RC Patronal paga las demandas civiles por "Daños Morales y Lucro Cesante futuro" a la familia del trabajador fallecido si hubo negligencia de la empresa.

**D. RC Vehículos Propios y No Propios como "Exceso"**
* **La Regla:** Extraer los límites exigidos en la base ("En exceso del SOAT y póliza primaria de mínimo X monto").
* **El Por Qué para la IA:** Es una "Póliza Sombrilla". Validar que las aseguradoras no exijan tener pólizas primarias inalcanzables para activar esta cobertura corporativa.