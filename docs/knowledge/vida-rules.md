# Manual de Capacitación para Agente de IA
## Módulo 10: Vida Individual
Arquitectura de Protección Financiera a Largo Plazo

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Vida Individual garantiza la estabilidad económica de los dependientes en caso de fallecimiento prematuro, o protege al propio asegurado en caso de supervivencia con pérdida de capacidad de generar ingresos (Invalidez o Enfermedad Grave).

#### 1.1 El Riesgo Biométrico y la Selección (Underwriting)
La prima es estrictamente individual y se basa en la probabilidad de fallecimiento:
* **Edad Actuarial:** Factor principal. A mayor edad, mayor riesgo y prima.
* **Estado de Salud y Preexistencias:** Ocultar condiciones es motivo de nulidad del contrato.
* **Hábitos y Ocupación:** Fumar, deportes extremos o trabajos peligrosos generan extraprimas o rechazos.

#### 1.2 Amparos Base y Beneficios por Supervivencia
* **Muerte por Cualquier Causa (Básico):** Indemnización a beneficiarios por fallecimiento natural o accidental.
* **Incapacidad Total y Permanente (ITP):** Pago del capital si el titular pierde su capacidad de trabajar (>50%).
* **Enfermedades Graves / Críticas:** Anticipo o valor adicional al ser diagnosticado con Cáncer, Infarto, ACV, etc.
* **Auxilio Funerario:** Monto de pago rápido para exequias.

#### 1.3 Modalidades Estructurales de la Póliza
* **Vida Riesgo (Term Life):** Cobertura por tiempo definido (ej. 1, 10 años). Sin retorno de dinero. Es la más económica.
* **Vida Entera (Whole Life):** Cobertura vitalicia. Prima más alta pero nivelada (no sube con la edad).
* **Vida con Ahorro (Universal / VUL):** Una parte de la prima va a un fondo de inversión (Valor de Rescate).

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Capitales (Suma Asegurada)
Identificar si las coberturas son independientes o "anticipos" que consumen el valor básico.

| Cobertura | Capital Asegurado | Modalidad de Pago |
| :--- | :--- | :--- |
| Amparo Básico (Muerte) | $500,000,000 | Independiente |
| Incapacidad Total y Permanente (ITP) | $500,000,000 | Anticipo del Básico (lo agota) |
| Enfermedades Graves | $250,000,000 | Adicional (No agota el básico) |
| Muerte Accidental | $500,000,000 | Adicional (Suma al Básico) |

#### Extracción 2: Edades Límite y Condiciones de Permanencia
Vida Individual tiene caducidad por edad. Extraer topes y carencias.

| Condición | Regla Extraída |
| :--- | :--- |
| **Edad Máxima de Ingreso (Básico)** | 65 Años |
| **Edad de Terminación (Básico)** | 80 Años (La cobertura cesa automáticamente) |
| **Edad de Terminación (ITP / Enfermedades)** | 65 Años (Cesación anticipada de amparos adicionales) |
| **Periodo de Carencia (Enfermedades Graves)** | 90 Días desde el inicio de vigencia |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. Anticipo vs. Cobertura Adicional (El Impacto en Vida)**
* **La Regla:** Examinar si ITP y Enfermedades Graves son "Adicionales" o "Anticipos" del básico.
* **El Por Qué para la IA:** Si ITP es "Anticipo", al quedar inválido el asegurado recibe el dinero en vida, pero *la póliza se cancela* y al fallecer su familia no recibe nada. Si es "Adicional", recibe el dinero en vida y la cobertura de Muerte sigue vigente. Ponderar inmensamente mejor las coberturas adicionales.

**B. Prima Nivelada vs. Prima Renovable Anualmente (YRT)**
* **La Regla:** Identificar el comportamiento proyectado de la prima.
* **El Por Qué para la IA:** Una póliza "Term" a un año (YRT) será barata a los 30 años pero insostenible a los 60. Si el cliente busca protección a largo plazo, la IA debe recomendar opciones de "Prima Nivelada" (costo congelado en el tiempo).

**C. El Periodo de Disputabilidad y Carencias**
* **La Regla:** Validar periodos de carencia.
* **El Por Qué para la IA:** Penalizar pólizas que exijan carencias de más de 90 días para Enfermedades Graves, ya que exponen al cliente a un largo vacío de protección. Recordar siempre al usuario la importancia de declarar preexistencias.

**D. Designación de Beneficiarios (Protección Legal)**
* **La Regla:** La póliza de Vida está fuera del patrimonio hereditario.
* **El Por Qué para la IA:** El seguro se paga libre de embargos e impuestos a los beneficiarios. La IA debe sugerir siempre la designación nominal (Ej. Esposa 50%, Hijo 50%) para evitar que entre a juicio de sucesión.