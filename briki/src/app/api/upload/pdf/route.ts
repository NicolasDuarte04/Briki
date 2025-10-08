import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📄 API: Endpoint ejecutándose...');
    
    // 📡 Extraer FormData del request
    const formData = await request.formData();
    console.log('📡 API: FormData extraído');
    
    // 📄 Extraer el archivo del FormData
    const file = formData.get('pdf') as File;
    console.log('📄 API: Archivo extraído:', file?.name, file?.size);

    // 🔍 Validar que existe el archivo
    if (!file) {
      return NextResponse.json(
        { error: 'No se encontró archivo PDF' },
        { status: 400 }
      );
    }

    // Validar que sea PDF
    console.log('🔍 API: Validando tipo de archivo:', file.type);
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'El archivo debe ser un PDF' },
        { status: 400 }
      );
    }
    console.log('✅ API: Archivo PDF válido');

    // Convertir File a Buffer para pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('🔄 Buffer creado, tamaño:', buffer.length, 'bytes');

    // Extraer texto con pdf2json
    console.log('📚 Iniciando extracción de texto...');
    const PDFParser = require('pdf2json');
    
    const pdfData = await new Promise<{text: string, numpages: number}>((resolve, reject) => {
      const pdfParser = new PDFParser(null, 1);
      
      pdfParser.on('pdfParser_dataError', (errData: any) => {
        console.error('❌ Error parseando PDF:', errData);
        reject(errData);
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        console.log('📄 PDF parseado, páginas:', pdfData.Meta.Pages);
        
        // Extraer texto de todas las páginas
        let fullText = '';
        pdfData.Pages.forEach((page: any, pageIndex: number) => {
          console.log(`📖 Procesando página ${pageIndex + 1}`);
          page.Texts.forEach((textBlock: any) => {
            textBlock.R.forEach((run: any) => {
              // Decodificar texto URI-encoded
              const decodedText = decodeURIComponent(run.T);
              fullText += decodedText + ' ';
            });
          });
          fullText += '\n'; // Nueva línea entre páginas
        });
        
        resolve({
          text: fullText.trim(),
          numpages: pdfData.Meta.Pages
        });
      });
      
      // Cargar el PDF desde el buffer
      pdfParser.parseBuffer(buffer);
    });

    console.log('✅ Extracción completada:', pdfData.text.length, 'caracteres');

    //  Responder con información del archivo
    return NextResponse.json({
        success: true,
        message: 'PDF procesado exitosamente',
        text: pdfData.text, // ← NUEVO: El texto extraído
        metadata: {
            name: file.name,
            size: file.size,
            type: file.type,
            bufferSize: buffer.length,
            pages: pdfData.numpages, // ← NUEVO
            charactersExtracted: pdfData.text.length // ← NUEVO
        }
    });
    
  } catch (error) {
    console.error('Error en endpoint:', error);
    return NextResponse.json(
      { error: 'Error en el servidor' },
      { status: 500 }
    );
  }
}