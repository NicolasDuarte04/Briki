# Manual de Capacitación para Agente de IA
## Módulo 7: Accidentes Personales (Individual y Colectivo)
Arquitectura de Riesgos Biométricos y Análisis de Ocupación

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Accidentes Personales (AP) ampara la integridad física del asegurado exclusivamente ante eventos súbitos, imprevistos, violentos, externos e independientes de su voluntad. NO ampara enfermedades comunes. Puede ser individual (B2C) o colectivo (B2B).

#### 1.1 Identificación del Riesgo (El Input Actuarial)
* **Clasificación de Ocupación (Vital):** El riesgo se divide en clases (ej. Clase 1: Oficinistas, Clase 3: Obreros). La prima no depende del patrimonio, sino de la ocupación.
* **Edades de Ingreso y Permanencia:** Ej. ingreso hasta los 65 años, permanencia hasta los 70.

#### 1.2 Amparos Directos de Indemnización
* **Muerte Accidental:** Pago del 100% a beneficiarios si fallece a causa del accidente.
* **Invalidez Total y Permanente por Accidente:** Pago del 100% en vida si pierde más del 50% de capacidad laboral.
* **Desmembración / Invalidez Parcial:** Pago de un porcentaje basado en una tabla médica (Baremo).

#### 1.3 Amparos Reembolsables y Asistenciales
* **Gastos Médicos por Accidente:** Reembolso a clínicas solo para urgencias/cirugías del accidente.
* **Renta Diaria por Hospitalización:** Monto fijo diario para compensar ingresos perdidos mientras está internado.
* **Gastos Funerarios / Traslado:** Auxilio para exequias por muerte accidental.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Límites y Primas
Mapear si operan de manera independiente o como porcentaje del básico.

| Amparo / Cobertura | Límite Asegurado Propuesto | Tipo de Cobertura |
| :--- | :--- | :--- |
| Muerte Accidental (Básico) | $100,000,000 | Principal (Indemnizatorio) |
| Invalidez / Desmembración | $100,000,000 (100% del Básico) | Principal (Indemnizatorio) |
| Gastos Médicos por Accidente | $20,000,000 (20% del Básico) | Adicional (Reembolso) |
| Renta Diaria Hospitalaria | $100,000 por día (Max 30 días) | Adicional (Indemnizatorio) |

#### Extracción 2: Deducibles y Franquicias (Tiempos de Espera)
Buscar tanto deducibles económicos como franquicias en tiempo.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **Muerte Accidental e Invalidez** | 0% (Sin Deducible por ley) |
| **Gastos Médicos por Accidente** | Copago Fijo de $50,000 COP por evento |
| **Renta Diaria Hospitalaria** | Franquicia de 1 día (Paga a partir del 2do día) |
| **Enfermedades Tropicales (Si ampara)** | Deducible del 10% del gasto médico |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. El Concepto Estricto de "Accidente" vs. Evento Médico**
* **La Regla:** Aclarar que excluye enfermedades degenerativas o paros cardíacos espontáneos.
* **El Por Qué para la IA:** Es el motivo #1 de reclamos rechazados. Si el cliente busca proteger a su familia "por su salud/edad", la IA debe recomendar Vida. Si busca protegerse porque "viaja en moto", AP es correcto.

**B. Reticencia en la Profesión (El Riesgo Moral)**
* **La Regla:** Auditar exclusiones de uso de motocicletas o deportes extremos.
* **El Por Qué para la IA:** Si un obrero se declara oficinista, la aseguradora rechazará el siniestro. La IA debe advertir: *"Verifique que la póliza cubra su ocupación real; algunas excluyen manejo de motos"*.

**C. El Límite Agregado (Catastrófico en Pólizas Colectivas)**
* **La Regla:** En grupos (ej. empleados), buscar el "Límite Máximo de Acumulación por Evento".
* **El Por Qué para la IA:** Si 10 empleados viajan juntos y mueren, la póliza debe tener un límite catastrófico superior a la suma de todos, o el pago a cada familia se reducirá. Penalizar límites agregados bajos.

**D. Franquicias Temporales en Renta Diaria**
* **La Regla:** Evaluar los días de carencia en Renta Hospitalaria.
* **El Por Qué para la IA:** Para independientes, los primeros días son críticos. Pólizas que pagan "Desde el primer día" son superiores operativamente a las que exigen franquicias de 3 días.