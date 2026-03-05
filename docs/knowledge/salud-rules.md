# Manual de Capacitación para Agente de IA
## Módulo 9: Salud y Gastos Médicos Mayores
Arquitectura de Riesgos Biométricos y Auditoría Médica

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Salud (o Gastos Médicos Mayores) protege el patrimonio familiar frente a los costos catastróficos derivados de enfermedades graves, cirugías o accidentes. Su suscripción depende del perfil biológico del asegurado y no de sus activos financieros.

#### 1.1 Identificación del Riesgo (Perfil Biométrico)
A diferencia de asegurar un edificio, el riesgo en salud evoluciona y empeora con el tiempo. El agente debe extraer:
* **Variables de Tarificación:** Edad biológica (la prima sube por tramos quinquenales), Género y Ubicación geográfica.
* **Declaración de Asegurabilidad:** Cuestionario médico. Ocultar enfermedades previas anula el contrato.
* **Grupo Familiar:** Titular, cónyuge y dependientes (hijos).

#### 1.2 Coberturas Intrahospitalarias (In-Patient)
Es el núcleo de la protección para "Gastos Mayores":
* **Hospitalización y Cirugía:** Costos de habitación (individual/compartida), UCI, derechos de sala de cirugía y anestesia.
* **Honorarios Médicos:** Pago a cirujanos y especialistas.
* **Insumos y Prótesis:** Medicamentos intrahospitalarios, material de osteosíntesis, válvulas, marcapasos.

#### 1.3 Coberturas Ambulatorias y Especiales (Out-Patient)
* **Ambulatorio Base:** Consultas directas con especialistas, exámenes de diagnóstico (TAC, Resonancias) y terapias.
* **Maternidad:** Parto, cesárea, complicaciones y cobertura del recién nacido (requiere tiempos de carencia).
* **Enfermedades Catastróficas:** Tratamientos prolongados (Quimioterapia, Radioterapia, Diálisis).
* **Asistencia Internacional:** Urgencias en viaje o acceso a redes hospitalarias mundiales para cirugías.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

La IA debe ser implacable al estructurar la "Participación del Asegurado".

#### Extracción 1: Estructura de Límites y Acceso
El agente debe identificar la arquitectura de red y los topes financieros.

| Parámetro de Salud | Póliza Nacional Básica | Póliza Global VIP |
| :--- | :--- | :--- |
| Límite Máximo Asegurado | $1,000,000,000 Anual | Ilimitado / USD $2,000,000 |
| Red Hospitalaria | Cerrada (Solo clínicas aliadas) | Abierta (Libre elección) |
| Habitación Hospitalaria | Estándar Compartida | Suite Individual |
| Maternidad | $10,000,000 (Tope máximo) | 100% del valor facturado |

#### Extracción 2: Participación Económica (Deducibles, Copagos y Coaseguros)
El LLM suele confundir estos tres términos. Su extracción y diferenciación es obligatoria.



| Concepto | Mecánica Extraída (Ejemplo) |
| :--- | :--- |
| **Copago (Eventos Menores)** | $50,000 COP fijos por cada consulta médica o examen. |
| **Deducible (Eventos Mayores)** | $2,000,000 COP anual acumulable (El cliente paga los primeros 2M del año, luego la aseguradora asume el 100%). |
| **Coaseguro (Riesgo Compartido)** | 10% a cargo del asegurado en reembolsos fuera de red, con un tope máximo de pérdida (Stop-Loss) de $5,000,000. |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

Al comparar, el Agente de IA debe actuar como un Auditor Médico preventivo.

**A. Deducible Anual Acumulable vs. Deducible por Evento**
* **La Regla:** Rastrear cómo se aplica el deducible en hospitalizaciones.
* **El Por Qué para la IA:** Un "Deducible por Evento" de $3M significa que el cliente paga $3M por apendicitis y OTROS $3M si se fractura un mes después. En un "Deducible Anual", una vez paga los primeros $3M, el resto de eventos del año le salen al 100%. La IA debe calificar exponencialmente mejor las pólizas con Deducibles Anuales.

**B. Red Cerrada (Pago Directo) vs. Red Abierta (Reembolso)**
* **La Regla:** Identificar el método de pago al hospital.
* **El Por Qué para la IA:** En Red Cerrada, el cliente solo paga el copago. En Red Abierta, debe pagar una cirugía de $50M de su bolsillo y luego pedir reembolso. La IA debe advertir el impacto en la liquidez familiar si la póliza exige reembolsos para procedimientos mayores.

**C. Tiempos de Carencia y la Antigüedad**
* **La Regla:** Auditar los "Periodos de Espera" (Carencias).
* **El Por Qué para la IA:** Cáncer o Maternidad no se cubren el Día 1. Si el usuario sube una póliza vigente ("Baseline") para cotizar una nueva ("Challenger"), la IA DEBE alertar obligatoriamente: *"Solicite un Certificado de Continuidad para que le respeten la antigüedad; de lo contrario, volverá a tener carencias y perderá cobertura de preexistencias"*.

**D. El Stop-Loss (Límite de Pérdida o Tope de Coaseguro)**
* **La Regla:** Si cobran Coaseguro (ej. 10%), buscar la cláusula de "Tope".
* **El Por Qué para la IA:** El 10% de un cáncer de $500M son $50M (quiebra familiar). Un "Stop-Loss" frena esto (ej. paga el 10% pero máximo hasta $5M en el año). Penalizar severamente propuestas de salud que tengan Coaseguro sin Stop-Loss (cheque en blanco contra el cliente).