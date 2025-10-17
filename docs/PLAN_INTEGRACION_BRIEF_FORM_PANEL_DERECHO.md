# PLAN DE INTEGRACIÓN BRIEF FORM EN PANEL DERECHO DEL AGENTE
**Fecha**: 2025-01-12  
**Desarrollador**: FullStack Senior AI Assistant  
**Objetivo**: Integrar el formulario detallado de Cases en el primer paso del panel derecho del agente

---

## 🔍 ANÁLISIS DE LA ESTRUCTURA ACTUAL

### **Flujo Actual del LandingPage:**
1. **Usuario envía mensaje** → `LandingChatInput.handleSubmit()`
2. **Se activa briefing** → `useUI.getState().startBriefing(message)`
3. **Se muestra BriefForm** → Modal/overlay con formulario completo
4. **Usuario completa formulario** → Se crea caso y va al agente

### **Estructura del Agente (3 Paneles):**
- **Panel Izquierdo**: `SidebarNav` / `SidebarChatPanel` (NO MODIFICAR)
- **Panel Medio**: `ConversationPane` (chat del agente)
- **Panel Derecho**: `WorkspaceTabs` con 6 pasos:
  1. **"case-brief"** → `CaseBrief` (solo lectura)
  2. **"policies"** → `Policies`
  3. **"comparisons"** → `Comparison`
  4. **"proposal"** → `Proposal`
  5. **"compliance"** → `ComplianceGate`
  6. **"renewals"** → `Renewals`

### **Problema Identificado:**
- El `CaseBrief` actual es **solo lectura** (muestra datos del `brief` del estado)
- No permite edición ni captura de datos detallados
- El flujo actual interrumpe la experiencia con un formulario modal

---

## 🎯 OBJETIVOS DE LA INTEGRACIÓN

### **Objetivo Principal:**
Modificar el flujo para que:
1. **LandingPage** → Mensaje se procesa inmediatamente
2. **Agente responde** → "Estoy analizando tu solicitud pero los componentes del caso no han sido especificados en su totalidad, rellénalos en el formulario del panel a su derecha"
3. **Panel Derecho** → Primer paso contiene `BriefForm` editable
4. **Usuario completa** → Datos se guardan y botón "Aprobar" activa el hardcodeo

### **Restricciones:**
- ✅ **NO modificar** panel izquierdo
- ✅ **NO cambiar** relaciones de tamaño entre paneles
- ✅ **Mantener** estructura visual existente
- ✅ **Preservar** flujo de hardcodeo actual

---

## 🛠️ PLAN DE IMPLEMENTACIÓN

### **FASE 1: Modificar Flujo del LandingPage**

#### **1.1 Actualizar `LandingChatInput.tsx`**
```typescript
const handleSubmit = async () => {
    // Check if user is authenticated
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    const message = value.trim();
    
    // Limpiar estado local
    setValue('');
    setTempUploads([]);
    trackEvent("hero_chat_start", { hasText: Boolean(message), hasPDF: tempUploads.length > 0 });
    
    // NUEVO FLUJO: Ir directamente a conversación sin briefing
    setInitialMessage(message);
    setBrief({ freeText: message });
    setStep("conversation");
};
```

#### **1.2 Actualizar `ConversationPane.tsx`**
```typescript
// Modificar el useEffect que maneja initialMessage
useEffect(() => {
    if (initialMessage && initialMessage.trim()) {
        // Mostrar mensaje del usuario inmediatamente
        const userMessage: ChatMessage = { 
            role: "user", 
            content: initialMessage 
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Mostrar respuesta del agente pidiendo completar formulario
        const agentResponse: ChatMessage = {
            role: "assistant",
            content: "Estoy analizando tu solicitud pero los componentes del caso no han sido especificados en su totalidad, rellénalos en el formulario del panel a su derecha.",
            agent: { label: "Sourcing" }
        };
        setMessages(prev => [...prev, agentResponse]);
        
        // Limpiar initialMessage
        clearInitialMessage();
    }
}, [initialMessage, clearInitialMessage]);
```

### **FASE 2: Integrar BriefForm en Panel Derecho**

#### **2.1 Crear `CaseBriefForm.tsx` (Nuevo Componente)**
```typescript
// src/components/Workspace/CaseBriefForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUI } from '@/lib/ui/state';
import { BriefForm, CaseBriefData } from '@/components/Cases/BriefForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export default function CaseBriefForm() {
    const { brief, setBrief, currentCaseId } = useUI();
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const t = useTranslations("workspace.caseBrief");

    // Convertir brief actual a CaseBriefData
    const [formData, setFormData] = useState<CaseBriefData>({
        insurance_category: '',
        max_budget: null,
        budget_currency: 'COP',
        required_coverages: [],
        client_profile: '',
        notes: brief.freeText || '',
        clientName: '',
        businessType: brief.businessType || '',
        employees: brief.employees || null,
        coverage: brief.coverage || '',
        freeText: brief.freeText || '',
    });

    const handleFormSubmit = async (data: CaseBriefData) => {
        setIsSubmitting(true);
        try {
            // Actualizar el brief en el estado global
            setBrief({
                businessType: data.businessType,
                employees: data.employees,
                coverage: data.coverage,
                freeText: data.freeText,
            });

            // Si hay un caso activo, actualizarlo en la BD
            if (currentCaseId) {
                await fetch('/api/cases/update', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        caseId: currentCaseId,
                        ...data
                    })
                });
            }

            setIsEditing(false);
        } catch (error) {
            console.error('Error updating case:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <header className="pb-1">
                    <h1 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                        {t("title")} - Editar
                    </h1>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto">
                    <BriefForm 
                        onSubmit={handleFormSubmit}
                        isSubmitting={isSubmitting}
                        initialNotes={formData.notes}
                    />
                </div>
            </div>
        );
    }

    // Vista de solo lectura (similar al CaseBrief actual)
    return (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <header className="pb-1 flex justify-between items-center">
                <h1 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                    {t("title")}
                </h1>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(true)}
                >
                    Editar
                </Button>
            </header>
            {/* ... resto del componente similar a CaseBrief actual ... */}
        </div>
    );
}
```

#### **2.2 Actualizar `WorkspaceTabs.tsx`**
```typescript
// Importar el nuevo componente
import CaseBriefForm from "./CaseBriefForm";

// En el TabsContent del case-brief
<TabsContent value="case-brief" className="py-6">
    <CaseBriefForm />
</TabsContent>
```

### **FASE 3: Implementar Flujo de Aprobación**

#### **3.1 Actualizar `ConversationPane.tsx`**
```typescript
// Añadir estado para mostrar botón de aprobación
const [showApprovalButton, setShowApprovalButton] = useState(false);

// Modificar el useEffect para mostrar botón después de completar formulario
useEffect(() => {
    // Verificar si el brief está completo
    const isBriefComplete = brief.businessType && brief.employees && brief.coverage;
    setShowApprovalButton(isBriefComplete);
}, [brief]);

// Añadir función de aprobación
const handleApprove = async () => {
    setIsTyping(true);
    setShowApprovalButton(false);
    
    // Aquí se activaría el hardcodeo existente
    // startSourcing() o similar
    
    // Simular respuesta del agente
    setTimeout(() => {
        const approvalResponse: ChatMessage = {
            role: "assistant",
            content: "Perfecto, he recibido todos los datos necesarios. Ahora procederé a analizar tu caso en detalle...",
            agent: { label: "Sourcing" }
        };
        setMessages(prev => [...prev, approvalResponse]);
        setIsTyping(false);
        
        // Activar el flujo de sourcing existente
        if (!isSourcing) {
            startSourcing();
        }
    }, 2000);
};

// En el JSX, añadir botón de aprobación
{showApprovalButton && (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 mb-3">
            El formulario del caso está completo. ¿Deseas que proceda con el análisis?
        </p>
        <Button onClick={handleApprove} className="w-full">
            Aprobar y Continuar
        </Button>
    </div>
)}
```

### **FASE 4: Crear API para Actualizar Casos**

#### **4.1 Crear `src/app/api/cases/update/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';

export async function PUT(request: NextRequest) {
    try {
        const { caseId, ...updateData } = await request.json();
        const { currentOrg } = await getCurrentOrg();
        
        // Actualizar el caso en la BD
        const updatedCase = await prisma.case.update({
            where: { 
                id: caseId,
                orgId: currentOrg.id // Asegurar que pertenece a la organización
            },
            data: {
                businessType: updateData.businessType,
                employees: updateData.employees,
                insurance_category: updateData.insurance_category,
                max_budget: updateData.max_budget,
                budget_currency: updateData.budget_currency,
                required_coverages: updateData.required_coverages,
                client_profile: updateData.client_profile,
                // Actualizar briefData con los nuevos datos
                briefData: {
                    businessType: updateData.businessType,
                    employees: updateData.employees,
                    coverage: updateData.coverage,
                    freeText: updateData.freeText,
                }
            }
        });
        
        return NextResponse.json({ success: true, case: updatedCase });
    } catch (error) {
        console.error('Error updating case:', error);
        return NextResponse.json(
            { error: 'Error updating case' },
            { status: 500 }
        );
    }
}
```

---

## 🔄 FLUJO COMPLETO INTEGRADO

### **Nuevo Flujo de Usuario:**
1. **LandingPage**: Usuario envía mensaje → Va directamente a conversación
2. **Agente**: Responde pidiendo completar formulario en panel derecho
3. **Panel Derecho**: Usuario ve formulario editable en primer paso
4. **Usuario**: Completa datos del caso (mayoría opcionales, algunos cruciales)
5. **Panel Medio**: Aparece botón "Aprobar y Continuar"
6. **Usuario**: Hace clic en aprobar
7. **Sistema**: Guarda datos y activa hardcodeo existente
8. **Agente**: Continúa con análisis normal

### **Ventajas de esta Implementación:**
- ✅ **No interrumpe** la experiencia del usuario
- ✅ **Mantiene** la estructura visual existente
- ✅ **Reutiliza** componentes existentes
- ✅ **Preserva** el flujo de hardcodeo actual
- ✅ **Permite** edición iterativa del formulario
- ✅ **Integra** perfectamente con el estado global

---

## 📁 ARCHIVOS A MODIFICAR

### **Archivos Existentes a Modificar:**
1. `src/components/Landing/LandingChatInput.tsx`
2. `src/components/Chat/ConversationPane.tsx`
3. `src/components/Workspace/Tabs.tsx`
4. `src/lib/ui/state.ts` (añadir estado para formulario completo)

### **Archivos Nuevos a Crear:**
1. `src/components/Workspace/CaseBriefForm.tsx`
2. `src/app/api/cases/update/route.ts`

### **Archivos a Preservar (NO MODIFICAR):**
1. `src/components/Workspace/CaseBrief.tsx` (se mantiene como referencia)
2. `src/components/SidebarNav.tsx`
3. `src/components/SidebarChatPanel.tsx`
4. Estructura de `WorkspaceTabs.tsx` (solo añadir import)

---

## 🧪 PLAN DE PRUEBAS

### **Pruebas de Integración:**
1. **LandingPage** → Enviar mensaje → Verificar que va a conversación
2. **Agente** → Verificar mensaje pidiendo completar formulario
3. **Panel Derecho** → Verificar que primer paso muestra formulario editable
4. **Formulario** → Completar datos → Verificar que se guardan
5. **Aprobación** → Hacer clic en aprobar → Verificar que activa hardcodeo
6. **Flujo Completo** → Verificar que todo funciona sin errores

### **Pruebas de Regresión:**
1. **Panel Izquierdo** → Verificar que no se modificó
2. **Otros Pasos** → Verificar que policies, comparisons, etc. siguen funcionando
3. **Estado Global** → Verificar que brief se actualiza correctamente
4. **Base de Datos** → Verificar que casos se actualizan correctamente

---

## ⚡ IMPLEMENTACIÓN PRIORITARIA

### **Orden de Implementación:**
1. **FASE 1** → Modificar flujo LandingPage (CRÍTICO)
2. **FASE 2** → Crear CaseBriefForm (CRÍTICO)
3. **FASE 3** → Implementar flujo aprobación (CRÍTICO)
4. **FASE 4** → Crear API update (IMPORTANTE)
5. **PRUEBAS** → Verificar flujo completo (CRÍTICO)

### **Tiempo Estimado:**
- **FASE 1**: 30 minutos
- **FASE 2**: 45 minutos
- **FASE 3**: 30 minutos
- **FASE 4**: 20 minutos
- **PRUEBAS**: 30 minutos
- **TOTAL**: ~2.5 horas

---

## 🎯 CRITERIOS DE ÉXITO

### **Funcionalidad:**
- ✅ Usuario puede enviar mensaje desde LandingPage sin interrupciones
- ✅ Agente responde pidiendo completar formulario
- ✅ Formulario es editable en panel derecho
- ✅ Datos se guardan correctamente
- ✅ Botón aprobar activa hardcodeo existente

### **Experiencia de Usuario:**
- ✅ Flujo fluido sin interrupciones
- ✅ Interfaz intuitiva y familiar
- ✅ Retroalimentación clara en cada paso
- ✅ Preservación de la estructura visual existente

### **Técnico:**
- ✅ Código limpio y mantenible
- ✅ Reutilización de componentes existentes
- ✅ Integración perfecta con estado global
- ✅ Sin regresiones en funcionalidad existente

---

**Este plan garantiza una integración perfecta del formulario detallado en el flujo del agente, manteniendo la experiencia de usuario y la estructura técnica existente.**
