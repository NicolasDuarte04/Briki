# Manual de Capacitación para Agente de IA
## Módulo 1: Seguro de Todo Riesgo Daños Materiales (TRDM)
Arquitectura de Riesgos Corporativos y Análisis de Variables

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Todo Riesgo Daños Materiales (TRDM) o Multiriesgo es la póliza fundamental de protección patrimonial. Resguarda los activos físicos tangibles de la empresa contra pérdidas súbitas e imprevistas.

#### 1.1 Desglose del Valor Asegurable (Variables de Input)
El agente debe identificar y categorizar estrictamente los activos del cliente:
* **Edificios y Mejoras Locativas:** Valor de reconstrucción de la sede (excluyendo el lote).
* **Muebles y Enseres / Equipo de Oficina:** Mobiliario estático y herramientas no industriales.
* **Maquinaria y Equipo:** Activos productivos industriales (ej. tornos, hornos).
* **Equipos Eléctricos y Electrónicos Móviles:** Computadores, servidores, equipos médicos.
* **Dineros (Dentro de Predio y Tránsito):** Efectivo en caja fuerte o en transporte.
* **Mercancías:** Materias primas, productos en proceso y terminados.
* **Lucro Cesante:** Pérdida de beneficios brutos (utilidad + gastos fijos) por paralización.

#### 1.2 Coberturas y Amparos Principales
* **Catastróficos y Naturaleza:** Terremoto, Temblor, Tifón, Huracán, Tornado, Daños por Agua, Anegación.
* **Antrópicos (Sociales):** HMACC (Huelga, Motín, Asonada, Conmoción Civil), AMIT (Actos Mal Intencionados de Terceros), Terrorismo.
* **Operativos Especializados:** Rotura de Maquinaria, Sustracción (hurto calificado con violencia).
* **Sublímites:** Gastos de Extinción, Remoción de Escombros, Preservación de Bienes, Honorarios Profesionales.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Matriz de Tasas y Costos
El agente debe desglosar la tasa por tipo de riesgo.

| Concepto a Extraer | Valor Asegurado | Tasa (%o) | Prima Neta |
| :--- | :--- | :--- | :--- |
| Amparo Básico (Incendio) | $10,000,000,000 | 0.85 | $8,500,000 |
| Terremoto y Temblor | $10,000,000,000 | 1.20 | $12,000,000 |
| AMIT y Terrorismo | $10,000,000,000 | 0.30 | $3,000,000 |
| Sustracción (Dineros) | $50,000,000 | 5.00 | $250,000 |
| **PRIMA NETA TOTAL** | | | **$23,750,000** |

#### Extracción 2: Estructura de Deducibles
Fórmula exacta exigida para la extracción.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **Terremoto** | 2% del Valor Asegurable, Mínimo 2 SMMLV |
| **Incendio / HMACC / AMIT** | 10% del valor de la pérdida, Mínimo 1 SMMLV |
| **Rotura de Maquinaria** | 10% del valor de la pérdida, Mínimo 2 SMMLV |
| **Equipo Electrónico** | 10% del valor de la pérdida, Mínimo 1 SMMLV |
| **Lucro Cesante** | 3 días de paralización de operaciones |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")
Estas son las "Reglas de Inferencia" que el Agente debe aplicar al comparar.

**A. El Principio del Valor Total y el Infraseguro**
* **La Regla:** En TRDM, el cliente está OBLIGADO a asegurar el 100% del valor de reconstrucción a nuevo de sus bienes.
* **El Por Qué para la IA:** Si un cliente reporta en el formulario que sus activos valen $10,000M, pero la cotización extraída muestra un valor asegurado de $5,000M, el Agente DEBE emitir una Alerta Crítica de Infraseguro. En caso de siniestro parcial, la aseguradora pagará los daños en la misma proporción (regla proporcional).

**B. Bases Matemáticas de los Deducibles: Valor Asegurable vs. Pérdida**
* **La Regla:** Existen dos formas de calcular un deducible. "X% del Valor Asegurable" (Catastróficos) y "X% del Valor de la Pérdida" (Operativos).
* **El Por Qué para la IA:** Al comparar Aseguradora A vs B, si A ofrece deducible de Terremoto al "2% de la Pérdida" y B ofrece "2% del Valor Asegurable", la IA debe resaltar contundentemente a la Aseguradora A como ganadora técnica, ya que el riesgo financiero para el cliente es monumentalmente menor.

**C. Lucro Cesante: Tiempo vs. Dinero**
* **La Regla:** En Lucro Cesante, el deducible se mide en tiempo (Días/Horas).
* **El Por Qué para la IA:** Si la Aseguradora A exige "Franquicia: 5 días" y la B exige "Franquicia: 2 días", la B es mejor porque empezará a indemnizar la pérdida de utilidades mucho más rápido.

**D. Límites Geográficos de Riesgo Ocultos**
* **La Regla:** El TRDM es un seguro de Ubicación Estática.
* **El Por Qué para la IA:** Si el formulario dice "Operaciones a nivel nacional" pero la póliza solo lista Bogotá, debe generar una advertencia de exclusión geográfica. Debe verificar también la cláusula de "Traslado Temporal".