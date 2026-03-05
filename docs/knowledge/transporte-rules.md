# Manual de Capacitación para Agente de IA
## Módulo 3: Transporte de Mercancías
Arquitectura de Riesgos en Tránsito y Análisis de Variables

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Transporte de Mercancías ampara las pérdidas o daños materiales que sufran los bienes del asegurado mientras son movilizados de un origen a un destino. Se divide en dos grandes ramas según la frontera: **Transporte Interno** (nacional) y **Transporte de Importaciones/Exportaciones** (internacional).

#### 1.1 Dimensionamiento del Riesgo Financiero (Inputs Críticos)
A diferencia de los seguros de propiedad estática, el transporte evalúa el flujo de bienes en el tiempo. El agente debe identificar dos valores matemáticos absolutos:
* **Presupuesto Anual de Movilizaciones:** Es la proyección total del valor de la mercancía que la empresa espera transportar durante todo el año. *Ejemplo:* Una fábrica proyecta despachar $10,000 millones este año.
* **Límite Máximo por Despacho (LMD):** Es el valor máximo de mercancía que irá en un **solo vehículo** o contenedor a la vez. *Ejemplo:* Aunque mueven $10,000 millones al año, en un solo camión nunca envían más de $200 millones.

#### 1.2 Trazabilidad y Tipos de Trayecto
El agente debe identificar la extensión de la cobertura:
* **Trayectos Múltiples:** Ampara los envíos desde que salen de la bodega hasta el cliente final, o entre bodegas del mismo asegurado.
* **Importaciones (Multimodal):** Incluye transporte marítimo/aéreo desde el país de origen, tránsito en puerto, nacionalización en aduanas y transporte terrestre final hasta la bodega del cliente.

#### 1.3 Coberturas y Amparos Principales
El agente debe verificar la presencia de estas coberturas operativas:
* **Pérdida o Daño Material (Todo Riesgo):** Cubre choque, volcamiento, incendio del vehículo transportador o daños por la naturaleza.
* **Sustracción / Hurto Calificado:** Robo de la mercancía con violencia (atraco en carretera) o desaparición misteriosa.
* **Operaciones de Cargue y Descargue:** Fundamental. Cubre si la mercancía se cae de la grúa o montacargas al subirla o bajarla del camión.
* **Huelga, Motín, Asonada:** Daños por vandalismo durante paros en carreteras.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

El módulo de "Comparaciones" debe separar claramente los valores agregados de los límites por evento.

#### Extracción 1: Estructura de Valores y Tasas
El agente debe extraer la Tasa (porcentaje o por mil) que se aplicará sobre el Presupuesto Anual, respetando el LMD.

| Concepto Transportado | Presupuesto Anual | LMD (Por camión) | Tasa (%o) |
| :--- | :--- | :--- | :--- |
| Mercancía Nacional | $5,000,000,000 | $150,000,000 | 1.50 |
| Importaciones (Terrestre) | $2,000,000,000 | $300,000,000 | 2.10 |
| Importaciones (Marítimo) | $2,000,000,000 | $500,000,000 | 0.80 |
| **PRIMA NETA ESTIMADA** | *(Presupuesto × Tasa / 1000)* | | **$13,300,000** |

#### Extracción 2: Deducibles Especializados
Los deducibles varían drásticamente dependiendo de si el daño fue un accidente o un robo.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **Pérdida o Daño Material** | 10% de la pérdida, Mínimo 1 SMMLV |
| **Hurto Calificado y/o Saqueo** | 20% de la pérdida, Mínimo 3 SMMLV |
| **Falta de entrega** | 15% de la pérdida, Mínimo 2 SMMLV |
| **Avería Particular (Rotura)** | 10% de la pérdida, Mínimo 1 SMMLV |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

El Agente de IA debe utilizar estas reglas de inferencia para evaluar la viabilidad de la póliza. En Transporte, las "Garantías" son tan o más importantes que el precio.

**A. Presupuesto vs. LMD (El Algoritmo de Tasa de Depósito)**
* **La Regla:** La aseguradora cobra una "Prima de Depósito" calculada sobre el Presupuesto Anual, pero solo pagará hasta el tope del LMD en caso de siniestro.
* **El Por Qué para la IA:** Si el cliente declara un LMD de $100 millones, pero mete $150 millones en el camión, la aseguradora aplicará infraseguro (penalidad por sobrecupo). La IA debe verificar estrictamente que el LMD de la aseguradora sea igual o superior al LMD solicitado por el cliente.

**B. La Trampa Operativa de las "Garantías" (Condiciones Sine Qua Non)**
* **La Regla:** Exigir la extracción de las Garantías (medidas de seguridad impuestas por la aseguradora).
* **El Por Qué para la IA:** Es el principal motivo de objeción de siniestros. La IA debe auditar y alertar: *"Atención: La aseguradora A exige Escolta Armada y GPS para despachos superiores a $100M. Si su flota no lo usa, no pagarán el siniestro"*. 

**C. Vehículos Propios vs. Transportadores Contratados**
* **La Regla:** Validar si se mueven en camiones propios o fleteras.
* **El Por Qué para la IA:** Si se contrata a un tercero, la IA debe buscar la cláusula de "No Subrogación contra el Transportador". Si la transportadora pierde la carga, sus límites de ley son bajos. La IA debe asegurar que la póliza cubra a valor real independientemente de quién maneje.

**D. Penalizaciones por Hurto vs. Daño**
* **La Regla:** El deducible de Hurto suele ser el doble del de Choque/Daño.
* **El Por Qué para la IA:** El robo en carretera es el riesgo mayor. La IA debe advertir siempre el deducible de Hurto (Ej. 20% vs 10%) y castigar propuestas que impongan deducibles abusivos (30% o más).