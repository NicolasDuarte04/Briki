#!/usr/bin/env python3
"""
Script para procesar resultados de FASE 1 y completar documentación automáticamente
"""

import re
import json
from datetime import datetime
from pathlib import Path

def parse_psql_output(content):
    """Parsea la salida de psql y extrae información estructurada"""
    results = {
        'messages': {},
        'profiles': {},
        'functions': [],
        'clients': {},
        'configuration': {},
        'raw_data': {}
    }
    
    # Extraer estructura de messages - buscar content_enc o content
    messages_section = re.search(r'=== ESTRUCTURA DE messages ===(.*?)(?===|$)', content, re.DOTALL)
    if messages_section:
        # Buscar content_enc primero (nuevo formato), luego content (formato antiguo)
        content_enc_match = re.search(r'content_enc\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        content_match = re.search(r'content\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        
        if content_enc_match:
            results['messages']['column_name'] = 'content_enc'
            results['messages']['data_type'] = content_enc_match.group(1)
            results['messages']['is_nullable'] = content_enc_match.group(2) == 'Y'
            results['messages']['encrypted'] = content_enc_match.group(1) == 'bytea'
            results['messages']['tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['messages']['encrypted'] else 'TEXTO PLANO (TEXT)'
            results['messages']['scenario'] = 'C' if results['messages']['encrypted'] else 'A'
        elif content_match:
            results['messages']['column_name'] = 'content'
            results['messages']['data_type'] = content_match.group(1)
            results['messages']['is_nullable'] = content_match.group(2) == 'Y'
            results['messages']['encrypted'] = content_match.group(1) == 'bytea'
            results['messages']['tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['messages']['encrypted'] else 'TEXTO PLANO (TEXT)'
            results['messages']['scenario'] = 'C' if results['messages']['encrypted'] else 'A'
        
        # Buscar también en la sección de tipo específico
        tipo_section = re.search(r'=== TIPO DE.*?content.*?EN messages ===(.*?)(?===|$)', content, re.DOTALL)
        if tipo_section:
            tipo_match = re.search(r'(content_enc|content)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(ENCRIPTADO|TEXTO PLANO)', content)
            if tipo_match:
                results['messages']['column_name'] = tipo_match.group(1)
                results['messages']['data_type'] = tipo_match.group(2)
                results['messages']['udt_name'] = tipo_match.group(3)
                results['messages']['tipo_detectado'] = tipo_match.group(4)
                results['messages']['encrypted'] = 'ENCRIPTADO' in tipo_match.group(4)
                results['messages']['scenario'] = 'C' if results['messages']['encrypted'] else 'A'
    
    # Extraer estructura de profiles - buscar phone_enc/address_enc o phone/address
    profiles_section = re.search(r'=== ESTRUCTURA DE profiles ===(.*?)(?===|$)', content, re.DOTALL)
    if profiles_section:
        # Buscar phone_enc primero (nuevo formato), luego phone (formato antiguo)
        phone_enc_match = re.search(r'phone_enc\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        phone_match = re.search(r'phone\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        
        if phone_enc_match:
            results['profiles']['phone_column'] = 'phone_enc'
            results['profiles']['phone_type'] = phone_enc_match.group(1)
            results['profiles']['phone_encrypted'] = phone_enc_match.group(1) == 'bytea'
            results['profiles']['phone_tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['profiles']['phone_encrypted'] else 'TEXTO PLANO (TEXT)'
        elif phone_match:
            results['profiles']['phone_column'] = 'phone'
            results['profiles']['phone_type'] = phone_match.group(1)
            results['profiles']['phone_encrypted'] = phone_match.group(1) == 'bytea'
            results['profiles']['phone_tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['profiles']['phone_encrypted'] else 'TEXTO PLANO (TEXT)'
        
        # Buscar address_enc primero (nuevo formato), luego address (formato antiguo)
        address_enc_match = re.search(r'address_enc\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        address_match = re.search(r'address\s*\|\s*(\w+)\s*\|\s*([YN])\s*\|\s*([^\|]*)', content)
        
        if address_enc_match:
            results['profiles']['address_column'] = 'address_enc'
            results['profiles']['address_type'] = address_enc_match.group(1)
            results['profiles']['address_encrypted'] = address_enc_match.group(1) == 'bytea'
            results['profiles']['address_tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['profiles']['address_encrypted'] else 'TEXTO PLANO (TEXT)'
        elif address_match:
            results['profiles']['address_column'] = 'address'
            results['profiles']['address_type'] = address_match.group(1)
            results['profiles']['address_encrypted'] = address_match.group(1) == 'bytea'
            results['profiles']['address_tipo_detectado'] = 'ENCRIPTADO (BYTEA)' if results['profiles']['address_encrypted'] else 'TEXTO PLANO (TEXT)'
        
        # Determinar escenario
        if results['profiles'].get('phone_encrypted') or results['profiles'].get('address_encrypted'):
            results['profiles']['scenario'] = 'C'
            results['profiles']['encrypted'] = True
        else:
            results['profiles']['scenario'] = 'A'
            results['profiles']['encrypted'] = False
        
        # Buscar también en la sección de tipo específico
        tipo_section = re.search(r'=== TIPOS DE.*?phone.*?address.*?EN profiles ===(.*?)(?===|$)', content, re.DOTALL)
        if tipo_section:
            phone_tipo_match = re.search(r'(phone_enc|phone)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(ENCRIPTADO|TEXTO PLANO)', content)
            if phone_tipo_match:
                results['profiles']['phone_column'] = phone_tipo_match.group(1)
                results['profiles']['phone_type'] = phone_tipo_match.group(2)
                results['profiles']['phone_udt'] = phone_tipo_match.group(3)
                results['profiles']['phone_tipo_detectado'] = phone_tipo_match.group(4)
                results['profiles']['phone_encrypted'] = 'ENCRIPTADO' in phone_tipo_match.group(4)
            
            address_tipo_match = re.search(r'(address_enc|address)\s*\|\s*(\w+)\s*\|\s*(\w+)\s*\|\s*(ENCRIPTADO|TEXTO PLANO)', content)
            if address_tipo_match:
                results['profiles']['address_column'] = address_tipo_match.group(1)
                results['profiles']['address_type'] = address_tipo_match.group(2)
                results['profiles']['address_udt'] = address_tipo_match.group(3)
                results['profiles']['address_tipo_detectado'] = address_tipo_match.group(4)
                results['profiles']['address_encrypted'] = 'ENCRIPTADO' in address_tipo_match.group(4)
            
            # Re-determinar escenario con datos actualizados
            if results['profiles'].get('phone_encrypted') or results['profiles'].get('address_encrypted'):
                results['profiles']['scenario'] = 'C'
                results['profiles']['encrypted'] = True
            else:
                results['profiles']['scenario'] = 'A'
                results['profiles']['encrypted'] = False
    
    # Extraer funciones de encriptación
    functions = re.findall(r'(encrypt_pii|decrypt_pii|encrypt_api_key|decrypt_api_key)', content)
    results['functions'] = list(set(functions))
    
    # Extraer información de pgcrypto
    pgcrypto_match = re.search(r'pgcrypto\s*\|\s*([\d.]+)', content)
    if pgcrypto_match:
        results['configuration']['pgcrypto_installed'] = True
        results['configuration']['pgcrypto_version'] = pgcrypto_match.group(1)
    else:
        results['configuration']['pgcrypto_installed'] = False
    
    return results

def generate_documentation(results, output_file):
    """Genera documentación completa basada en resultados"""
    
    doc = f"""# ESTRUCTURA REAL DE LA BASE DE DATOS - ANÁLISIS FASE 1

**Fecha de Análisis**: {datetime.now().strftime('%d de %B, %Y')}  
**Analista**: Script Automatizado - FASE 1  
**Objetivo**: Documentar la estructura real de la BD para determinar qué cambios de encriptación se implementaron realmente

---

## 📋 RESUMEN EJECUTIVO

Este documento contiene los resultados del análisis automatizado de la estructura real de la base de datos en Supabase.

---

## 🔍 RESULTADOS DEL ANÁLISIS

### **1. ESTRUCTURA DE LA TABLA `messages`**

#### **1.1. Análisis de `content`**

**Tipo de Dato en BD**:
- **Tipo**: {results['messages'].get('data_type', 'N/A')}
- **UDT**: {results['messages'].get('udt_name', 'N/A')}
- **Nullable**: {'Sí' if results['messages'].get('is_nullable') else 'No'}
- **Tipo Detectado**: {results['messages'].get('tipo_detectado', 'N/A')}

**Conclusión**: 
"""
    
    if results['messages'].get('scenario') == 'C':
        doc += """- ✅ **Escenario C**: La BD tiene `content` como `BYTEA` (con encriptación) → Se implementó pero el schema de Prisma está desactualizado

**Acción Requerida**: 
- Actualizar Prisma schema: `content String` → `content Bytes`
- Crear helpers de encriptación para messages
- Actualizar APIs para usar encriptación/desencriptación
"""
    elif results['messages'].get('scenario') == 'A':
        doc += """- ✅ **Escenario A**: La BD tiene `content` como `TEXT` (sin encriptación) → No se implementó realmente

**Acción Requerida**: 
- No se requiere cambio en código actual
- Si se desea implementar encriptación, crear migración primero
"""
    else:
        doc += """- ⚠️ **Escenario no determinado**: Requiere análisis manual

**Acción Requerida**: 
- Revisar resultados manualmente
- Determinar estructura real de la BD
"""
    
    doc += f"""
---

### **2. ESTRUCTURA DE LA TABLA `profiles`**

#### **2.1. Análisis de `phone` y `address`**

**Tipo de `phone`**:
- **Tipo**: {results['profiles'].get('phone_type', 'N/A')}
- **UDT**: {results['profiles'].get('phone_udt', 'N/A')}
- **Tipo Detectado**: {results['profiles'].get('phone_tipo_detectado', 'N/A')}
- **Encriptado**: {'✅ SÍ' if results['profiles'].get('phone_encrypted') else '❌ NO'}

**Tipo de `address`**:
- **Tipo**: {results['profiles'].get('address_type', 'N/A')}
- **UDT**: {results['profiles'].get('address_udt', 'N/A')}
- **Tipo Detectado**: {results['profiles'].get('address_tipo_detectado', 'N/A')}
- **Encriptado**: {'✅ SÍ' if results['profiles'].get('address_encrypted') else '❌ NO'}

**Conclusión**: 
"""
    
    if results['profiles'].get('scenario') == 'C':
        doc += """- ✅ **Escenario C**: La BD tiene `phone` y/o `address` como `BYTEA` (con encriptación) → Se implementó pero el schema de Prisma está desactualizado

**Acción Requerida**: 
- Actualizar Prisma schema: `phone String?` → `phone Bytes?`, `address String?` → `address Bytes?`
- Crear helpers de encriptación para profiles
- Actualizar código que usa profiles
"""
    elif results['profiles'].get('scenario') == 'A':
        doc += """- ✅ **Escenario A**: La BD tiene `phone` y `address` como `TEXT` (sin encriptación) → No se implementó realmente

**Acción Requerida**: 
- No se requiere cambio en código actual
- Si se desea implementar encriptación, crear migración primero
"""
    else:
        doc += """- ⚠️ **Escenario no determinado**: Requiere análisis manual

**Acción Requerida**: 
- Revisar resultados manualmente
- Determinar estructura real de la BD
"""
    
    doc += f"""
---

### **3. FUNCIONES DE ENCRIPTACIÓN DISPONIBLES**

**Funciones Encontradas**:
"""
    
    for func in results['functions']:
        doc += f"- ✅ `{func}()`\n"
    
    if not results['functions']:
        doc += "- ⚠️ No se encontraron funciones de encriptación\n"
    
    doc += f"""
**Estado**:
- `encrypt_pii()`: {'✅ Existe' if 'encrypt_pii' in results['functions'] else '❌ No existe'}
- `decrypt_pii()`: {'✅ Existe' if 'decrypt_pii' in results['functions'] else '❌ No existe'}
- `encrypt_api_key()`: {'✅ Existe' if 'encrypt_api_key' in results['functions'] else '❌ No existe'}
- `decrypt_api_key()`: {'✅ Existe' if 'decrypt_api_key' in results['functions'] else '❌ No existe'}

---

### **4. CONFIGURACIÓN DE ENCRIPTACIÓN**

**Extensión pgcrypto**:
- **Instalada**: {'✅ SÍ' if results['configuration'].get('pgcrypto_installed') else '❌ NO'}
"""
    
    if results['configuration'].get('pgcrypto_installed'):
        doc += f"- **Versión**: {results['configuration'].get('pgcrypto_version', 'N/A')}\n"
    
    doc += """
---

## 📊 RESUMEN DE HALLAZGOS

### **TABLA `messages`**

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| Tipo de `content` | """ + results['messages'].get('data_type', 'N/A') + """ | """ + results['messages'].get('tipo_detectado', 'N/A') + """ |
| Encriptación implementada | """ + ('✅ SÍ' if results['messages'].get('encrypted') else '❌ NO') + """ | Escenario """ + results['messages'].get('scenario', 'N/A') + """ |
| Compatibilidad con código actual | """ + ('❌ NO' if results['messages'].get('encrypted') else '✅ SÍ') + """ | """ + ('Requiere actualización' if results['messages'].get('encrypted') else 'Compatible') + """ |

### **TABLA `profiles`**

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| Tipo de `phone` | """ + results['profiles'].get('phone_type', 'N/A') + """ | """ + results['profiles'].get('phone_tipo_detectado', 'N/A') + """ |
| Tipo de `address` | """ + results['profiles'].get('address_type', 'N/A') + """ | """ + results['profiles'].get('address_tipo_detectado', 'N/A') + """ |
| Encriptación implementada | """ + ('✅ SÍ' if results['profiles'].get('encrypted') else '❌ NO') + """ | Escenario """ + results['profiles'].get('scenario', 'N/A') + """ |
| Compatibilidad con código actual | """ + ('❌ NO' if results['profiles'].get('encrypted') else '✅ SÍ') + """ | """ + ('Requiere actualización' if results['profiles'].get('encrypted') else 'Compatible') + """ |

### **FUNCIONES DE ENCRIPTACIÓN**

| Función | Estado | Observaciones |
|---------|--------|---------------|
| `encrypt_pii()` | """ + ('✅ EXISTE' if 'encrypt_pii' in results['functions'] else '❌ NO EXISTE') + """ | Función base para encriptación PII |
| `decrypt_pii()` | """ + ('✅ EXISTE' if 'decrypt_pii' in results['functions'] else '❌ NO EXISTE') + """ | Función base para desencriptación PII |
| `encrypt_api_key()` | """ + ('✅ EXISTE' if 'encrypt_api_key' in results['functions'] else '❌ NO EXISTE') + """ | Función para encriptación de API keys |
| `decrypt_api_key()` | """ + ('✅ EXISTE' if 'decrypt_api_key' in results['functions'] else '❌ NO EXISTE') + """ | Función para desencriptación de API keys |

### **CONFIGURACIÓN**

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| `pgcrypto` instalado | """ + ('✅ SÍ' if results['configuration'].get('pgcrypto_installed') else '❌ NO') + """ | """ + (f"Versión {results['configuration'].get('pgcrypto_version', 'N/A')}" if results['configuration'].get('pgcrypto_installed') else 'Requiere instalación') + """ |

---

## 🎯 CONCLUSIONES Y PRÓXIMOS PASOS

### **CONCLUSIONES PRINCIPALES**

1. **Messages**:
   - Estructura actual: """ + results['messages'].get('data_type', 'N/A') + """
   - Requiere cambios: """ + ('✅ SÍ' if results['messages'].get('encrypted') else '❌ NO') + """
   - Acción necesaria: """ + ('Actualizar código para usar encriptación' if results['messages'].get('encrypted') else 'No se requiere acción') + """

2. **Profiles**:
   - Estructura actual: phone=""" + results['profiles'].get('phone_type', 'N/A') + """, address=""" + results['profiles'].get('address_type', 'N/A') + """
   - Requiere cambios: """ + ('✅ SÍ' if results['profiles'].get('encrypted') else '❌ NO') + """
   - Acción necesaria: """ + ('Actualizar código para usar encriptación' if results['profiles'].get('encrypted') else 'No se requiere acción') + """

3. **Funciones de Encriptación**:
   - Estado: """ + ('✅ Disponibles' if results['functions'] else '❌ No disponibles') + """
   - Requiere cambios: """ + ('❌ NO' if 'encrypt_pii' in results['functions'] and 'decrypt_pii' in results['functions'] else '✅ SÍ - Crear funciones') + """
   - Acción necesaria: """ + ('No se requiere acción' if 'encrypt_pii' in results['functions'] and 'decrypt_pii' in results['functions'] else 'Crear funciones de encriptación') + """

### **PRÓXIMOS PASOS**

Basado en los hallazgos, las siguientes fases del plan se adaptarán:

- [ ] **FASE 2**: Sincronización de migraciones
  - """ + ('Crear migración que refleje estado actual (BYTEA)' if results['messages'].get('encrypted') or results['profiles'].get('encrypted') else 'No se requiere migración nueva') + """
  
- [ ] **FASE 3**: Actualización de código
  - """ + ('Actualizar código para usar encriptación en messages' if results['messages'].get('encrypted') else 'No se requiere cambio en messages') + """
  - """ + ('Actualizar código para usar encriptación en profiles' if results['profiles'].get('encrypted') else 'No se requiere cambio en profiles') + """
  
- [ ] **FASE 4**: Actualización de Prisma
  - """ + ('Actualizar schema: Message.content String → Bytes' if results['messages'].get('encrypted') else 'Schema actual es correcto para messages') + """
  - """ + ('Actualizar schema: Profile.phone/address String? → Bytes?' if results['profiles'].get('encrypted') else 'Schema actual es correcto para profiles') + """

---

## 📝 NOTAS ADICIONALES

Este análisis fue generado automáticamente por el script de FASE 1.
Para más detalles, revisar: `.phase1-results/analysis-results.txt`

---

**Última actualización**: """ + datetime.now().strftime('%d de %B, %Y %H:%M:%S') + """  
**Próxima revisión**: Después de completar FASE 2  
**Estado**: ✅ COMPLETADO - Listo para FASE 2
"""
    
    # Escribir documentación
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(doc)
    
    print(f"✅ Documentación generada en: {output_file}")

if __name__ == '__main__':
    # Leer resultados
    results_file = Path('.phase1-results/analysis-results.txt')
    if not results_file.exists():
        print("❌ No se encontró archivo de resultados")
        print("   Ejecuta primero: ./scripts/execute-phase1-analysis.sh")
        exit(1)
    
    with open(results_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Procesar resultados
    results = parse_psql_output(content)
    
    # Guardar resultados procesados en JSON
    json_file = Path('.phase1-results/processed-results.json')
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print("✅ Resultados procesados y guardados en JSON")
    
    # Generar documentación
    doc_file = Path('docs/ESTRUCTURA_BD_REAL.md')
    generate_documentation(results, doc_file)
    
    print("\n✅ FASE 1 completada exitosamente")
    print(f"   - Resultados: {results_file}")
    print(f"   - JSON procesado: {json_file}")
    print(f"   - Documentación: {doc_file}")

