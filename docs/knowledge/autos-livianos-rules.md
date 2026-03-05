# Manual de Capacitación para Agente de IA
## Módulo 6: Vehículos Livianos (Autos Individuales / B2C)
Arquitectura de Riesgos Familiares y Análisis de Movilidad Personal

---

### 1. ANATOMÍA Y CARACTERÍSTICAS PUNTUALES
El seguro de Autos Livianos protege el patrimonio familiar frente a la pérdida del vehículo (choque o robo) y blinda financieramente al titular frente a demandas civiles. Aquí cobran vital importancia las "Asistencias" y el impacto directo al bolsillo del cliente.

#### 1.1 Identificación del Activo
* **Valor Asegurado (Guía Oficial):** Los autos no se aseguran por un valor estático a elección del cliente, sino por guías del mercado (ej. Fasecolda), depreciándose mes a mes.
* **Accesorios Opcionales:** Rines de lujo, radios o blindajes deben declararse como un monto extra; de lo contrario, la póliza solo paga partes de fábrica.

#### 1.2 Amparos Directos al Patrimonio (El Vehículo)
* **Pérdida Total por Daños (PTD):** Choque donde la reparación supera el 75% del valor comercial.
* **Pérdida Total por Hurto (PTH):** Robo completo del vehículo no recuperado.
* **Pérdida Parcial por Daños (PPD):** Choques reparables (abolladuras, farolas).
* **Pérdida Parcial por Hurto (PPH):** Robo de autopartes (espejos, computador).

#### 1.3 Amparos de Responsabilidad y Confort
* **Límite Único Combinado (LUC) / RCE:** Bolsa total para cubrir daños a bienes o lesiones a terceros.
* **Gastos de Transporte:** Auxilio diario o "Vehículo de Reemplazo" pagado mientras el auto está en el taller.
* **Asistencias:** Grúa, Conductor Elegido, cerrajería.

---

### 2. EJEMPLOS PUNTUALES DE TABLAS/DATOS NECESARIOS A EXTRAER

#### Extracción 1: Estructura de Coberturas B2C
El agente debe mapear los límites y la disponibilidad de servicios adicionales.

| Amparo / Beneficio | Aseguradora A | Aseguradora B |
| :--- | :--- | :--- |
| RCE (Límite Único Combinado) | $1,500,000,000 | $3,000,000,000 |
| Pérdida Total (PTD y PTH) | 100% Valor Fasecolda | 100% Valor Fasecolda |
| Gastos de Transporte (Choque) | $50,000 / 15 días | Vehículo Alquilado / 20 días |
| Asistencia: Conductor Elegido | 6 eventos al año | Ilimitado |
| Asistencia: Grúa | Límite 50 SMDLV | Ilimitado |

#### Extracción 2: Estructura de Deducibles Familiares
El impacto al bolsillo se mide aquí.

| Cobertura | Condición de Deducible Extraída |
| :--- | :--- |
| **RCE (Daños a Terceros)** | Sin Deducible (Pago desde el primer peso) |
| **Pérdida Total (Daños o Hurto)** | 0% (Sin Deducible) |
| **Pérdidas Parciales (PPD / PPH)** | 10% de la pérdida, Mínimo 1 SMMLV |
| **Pequeños Accesorios (Llantas/Vidrios)** | 10% de la pérdida, Mínimo 1 SMMLV |

---

### 3. ANÁLISIS COMPARATIVO Y LA NATURALEZA DEL RIESGO (EL "POR QUÉ")

**A. El Impacto de la Pérdida Total**
* **La Regla:** Priorizar siempre cotizaciones que ofrezcan "0% de Deducible" en Pérdida Total.
* **El Por Qué para la IA:** Si a una familia le roban un carro de $60M y tiene deducible del 10%, recibe $54M, insuficiente para comprar un carro igual. La IA debe advertir fuertemente si una aseguradora cobra deducible en pérdida total, considerándola una propuesta inferior.

**B. Gastos de Transporte: Dinero vs. Vehículo Físico**
* **La Regla:** Auditar la calidad del amparo de movilización temporal.
* **El Por Qué para la IA:** Un auxilio de $40,000 pesos/día apenas cubre taxis. Un "Vehículo de Reemplazo" (alquiler pagado) salva la rutina familiar. La IA debe destacar a la aseguradora que ofrezca vehículo físico por más días.

**C. Las "Letras Chicas" de las Asistencias**
* **La Regla:** Auditar límites de Grúa y Conductor Elegido.
* **El Por Qué para la IA:** Las pólizas "baratas" limitan la grúa a 50 KM o el conductor a 3 veces/año. La IA debe revisar el condicionado y alertar: *"La cotización B es más económica, pero su grúa tiene un tope; si viaja por carretera, la cotización A es más segura"*.

**D. RCE: La Ruina de la Clase Media**
* **La Regla:** Auditar el Límite de Responsabilidad Civil (LUC).
* **El Por Qué para la IA:** Los clientes B2C miran solo la cobertura de robo, ignorando que atropellar a alguien puede embargarles la casa por demandas. La IA debe actuar como asesor ético: rechazar límites obsoletos (ej. $500M) y sugerir LUC de al menos $2,000M a $3,000M.