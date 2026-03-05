# Manual de Capacitación para Agente de IA
## Módulo 4: Riesgos Financieros (Manejo y Crime)
Arquitectura de Riesgos de Fraude y Análisis de Variables

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
Los seguros de Riesgos Financieros protegen el patrimonio de la empresa frente a pérdidas económicas directas causadas por actos fraudulentos o deshonestos. Se dividen en dos enfoques: **Manejo Global/Fidelidad** (fraude tradicional de empleados) y **Crime Manager** (fraude corporativo integral, incluyendo cibernético y de terceros).

#### 1.1 Amparos Básicos (La Conducta Delictiva)
* **Hurto y Hurto Calificado:** Sustracción de bienes o dinero por un empleado (ej. el cajero saca billetes).
* **Abuso de Confianza:** Apropiación indebida de bienes confiados al empleado para su labor.
* **Falsedad:** Alteración de documentos (ej. alterar facturas para reembolso).
* **Estafa:** Engaño para obtener un provecho ilícito.

#### 1.2 Extensiones Operativas (Sublímites Críticos)
* **Pérdidas por Personas No Identificadas:** Faltante por robo interno donde no se puede probar exactamente cuál empleado de un grupo fue el culpable.
* **Personal Temporal / Firmas Especializadas:** Extiende cobertura a empleados de outsourcing o vigilantes externos.

#### 1.3 Coberturas Crime (El Fraude Moderno)
* **Fraude por Computador:** Terceros que hackean el sistema para desviar fondos.
* **Falsificación de Títulos Valores:** Terceros que falsifican cheques de la empresa.
* **Ingeniería Social (Phishing):** Empleado engañado para transferir dinero a un estafador.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Límites Asegurados
El agente debe identificar si la cobertura es global o está sublimitada.

| Amparo / Cobertura | Límite / Valor Asegurado | Tipo de Límite |
| :--- | :--- | :--- |
| Manejo Global (Límite Máximo) | $1,000,000,000 | Límite Global |
| Fraude por Computador (Crime) | $1,000,000,000 | Al 100% |
| Falsificación de Títulos Valores | $1,000,000,000 | Al 100% |
| Pérdida por empleados no identificados | $200,000,000 | Sublímite (20%) |
| Personal por firmas temporales | $100,000,000 | Sublímite (10%) |

#### Extracción 2: Deducibles Especializados
Suelen tener mínimos altos para evitar reclamaciones de "caja menor".

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **Amparo Básico (Identificados)** | 10% de la pérdida, Mínimo 2 SMMLV |
| **Empleados no identificados** | 15% de la pérdida, Mínimo 3 SMMLV |
| **Firmas temporales** | 15% de la pérdida, Mínimo 2 SMMLV |
| **Ingeniería Social** | 20% de la pérdida, Mínimo 5 SMMLV |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. TRDM (Sustracción) vs. Riesgos Financieros**
* **La Regla:** El TRDM NUNCA paga un hurto si es cometido por un empleado o sin violencia.
* **El Por Qué para la IA:** Si el asegurado es una empresa de retail o manejo de valores, la IA debe validar que no confíen en el "hurto" del TRDM para fraude interno, recomendando activamente esta póliza.

**B. La Trampa Probatoria: Empleados No Identificados**
* **La Regla:** Auditar el sublímite para "Empleados No Identificados".
* **El Por Qué para la IA:** Sin culpable exacto, la aseguradora no puede subrogar (demandar). Por ende, limitan la cobertura. La IA debe castigar propuestas con sublímites menores al 20% para este amparo, ya que dan falsa sensación de seguridad.

**C. Riesgo Moral y Garantías Estrictas (El KYC)**
* **La Regla:** El seguro está plagado de "Garantías" previas (auditorías, antecedentes).
* **El Por Qué para la IA:** Si la empresa no hace auditorías anuales o no verifica antecedentes penales, la póliza no pagará. La IA DEBE extraer y alertar sobre las garantías exigidas en las cotizaciones.

**D. Fidelidad Tradicional vs. Pólizas Crime (La Brecha Digital)**
* **La Regla:** Fidelidad solo cubre "Fraude Interno". Crime cubre "Fraude Interno + Externo".
* **El Por Qué para la IA:** Hoy los mayores robos son phishing (Ingeniería Social). Una póliza de "Fidelidad" lo negará porque el estafador no es empleado. La IA debe ponderar mejor las estructuras "Crime Manager".