# Manual de Capacitación para Agente de IA
## Módulo 8: Hogar / Multiriesgo Residencial
Arquitectura de Riesgos Familiares y Protección Patrimonial

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Hogar protege la vivienda (el contenedor) y los bienes personales (el contenido) frente a eventos accidentales. Incluye protección legal para la familia.

#### 1.1 Desglose del Valor Asegurable (El Activo B2C)
El cliente no asegura un "límite global", debe declarar valores exactos:
* **Edificio (Contenedor):** Estructura física. Se asegura por el **valor de reconstrucción**, NO por el valor comercial inmobiliario (que incluye el terreno).
* **Contenidos (Muebles y Enseres):** Ropa, muebles, electrodomésticos.
* **Equipo Eléctrico y Electrónico (EEE):** Televisores, computadores.
* **Objetos de Valor:** Joyería o arte (requieren avalúo y declaración expresa).

#### 1.2 Coberturas Directas al Patrimonio
* **Naturaleza:** Terremoto, Inundación, Vientos.
* **Accidentales:** Incendio, Daños por Agua (rotura de tuberías).
* **Antrópicos:** Sustracción (Robo) con violencia.
* **Daños a EEE:** Cortocircuitos o variaciones de voltaje.

#### 1.3 Responsabilidad Civil y Asistencias
* **RC Familiar:** Cubre daños causados por miembros de la familia, mascotas o trabajadores domésticos a terceros.
* **Asistencia Domiciliaria:** Plomería, electricidad, cerrajería para emergencias.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Valores Asegurados y RC
En Hogar, la RCE suele ser un límite independiente.

| Ítem a Asegurar / Cobertura | Valor Asegurado / Límite | Nota / Tipo |
| :--- | :--- | :--- |
| Edificio (Reconstrucción) | $400,000,000 | Valor Total Declarado |
| Contenidos (Muebles y EEE) | $100,000,000 | Valor Total Declarado |
| RC Familiar (Eventos de Terceros) | $500,000,000 | Límite Único |
| Gastos de Alojamiento Temporal | $15,000,000 | Sublímite (Max. 6 meses) |

#### Extracción 2: Estructura de Deducibles Residenciales
Los deducibles buscan ser amigables, excepto en eventos de la naturaleza.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **Incendio / Eventos Accidentales** | Sin Deducible o Copago Fijo ($50,000) |
| **Terremoto y Eventos de Naturaleza** | 2% del Valor Asegurable del ítem afectado |
| **Sustracción (Robo)** | 10% de la pérdida, Mínimo 1 SMMLV |
| **RC Familiar** | Sin Deducible |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. Edificio Comercial vs. Edificio Reconstrucción (El Error Inmobiliario)**
* **La Regla:** Auditar que no se asegure el "lote/terreno".
* **El Por Qué para la IA:** Si un apto vale $1,000M, el terreno puede valer $400M. El terreno no se quema. Si el cliente asegura $1,000M, la aseguradora jamás le pagará esos $400M extra. La IA debe advertir sobre este "Sobreseguro" y sugerir declarar solo el costo de reconstrucción.

**B. Propietario vs. Arrendatario**
* **La Regla:** Identificar la tenencia.
* **El Por Qué para la IA:** Un inquilino no debe asegurar el Edificio, solo los Contenidos y una cobertura de "RC Arrendatario". Si la IA detecta que le cobran prima de edificio a un inquilino, debe marcarlo como error.

**C. Robo Fuera del Hogar (Atraco)**
* **La Regla:** Diferenciar Sustracción (en casa) de Atraco (en la calle).
* **El Por Qué para la IA:** El cliente cree que su laptop está cubierta si se la roban en un café. Esto requiere una extensión especial ("Hurto fuera del predio"). La IA debe buscar esta cláusula y destacarla.

**D. Asistencias Domiciliarias**
* **La Regla:** Comparar topes de asistencias.
* **El Por Qué para la IA:** Se usa más la plomería que la cobertura de terremoto. Una póliza que ofrece $500,000 por evento en plomería es superior a una que ofrece $100,000. La IA debe priorizar altos topes asistenciales.