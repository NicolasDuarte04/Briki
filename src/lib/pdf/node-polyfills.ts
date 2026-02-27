/**
 * Node.js Polyfills for pdfjs-dist (Serverless Environments)
 * 
 * pdfjs-dist@5.x ejecuta `new DOMMatrix()` a nivel de módulo (top-level constant)
 * durante la carga de `pdf.mjs`. En entornos serverless (Vercel/Lambda), Node.js
 * NO provee DOMMatrix, ImageData ni Path2D — causando ReferenceError fatal.
 * 
 * Este módulo provee stubs mínimos que satisfacen la instanciación del módulo.
 * Briki solo usa pdfjs-dist para EXTRACCIÓN DE TEXTO (getTextContent), nunca
 * para renderizado a canvas, por lo que estos stubs son funcionalmente suficientes.
 * 
 * ⚠️ IMPORTANTE: Si se necesita renderizado de PDF server-side en el futuro,
 * estos stubs NO son suficientes — se necesitaría @napi-rs/canvas o similar.
 * 
 * @module pdf/node-polyfills
 * @see https://github.com/nicolo-ribaudo/pdfjs-dist/blob/master/legacy/build/pdf.mjs#L16623
 */

// Solo aplicar en entornos server-side (Node.js)
// El guard previene sobrescritura de APIs nativas en el navegador
if (typeof globalThis.DOMMatrix === 'undefined') {
  /**
   * Stub mínimo de DOMMatrix para satisfacer la instanciación top-level de pdfjs-dist.
   * Implementa la interfaz DOMMatrix2D con propiedades de identidad.
   * 
   * Usado en pdf.mjs línea 16623: `const SCALE_MATRIX = new DOMMatrix()`
   * y en pdf.worker.mjs: `new DOMMatrix().scaleSelf(...).translateSelf(...)`
   */
  class MinimalDOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;

    constructor(init?: string | number[]) {
      if (Array.isArray(init) && init.length === 6) {
        this.a = init[0]!; this.b = init[1]!; this.c = init[2]!;
        this.d = init[3]!; this.e = init[4]!; this.f = init[5]!;
        this.m11 = this.a; this.m12 = this.b;
        this.m21 = this.c; this.m22 = this.d;
        this.m41 = this.e; this.m42 = this.f;
      }
    }

    // Métodos de transformación encadenables (usados en pdf.worker.mjs)
    scaleSelf(scaleX: number = 1, scaleY?: number): this {
      this.a *= scaleX;
      this.d *= (scaleY ?? scaleX);
      this.m11 = this.a;
      this.m22 = this.d;
      return this;
    }

    translateSelf(tx: number = 0, ty: number = 0): this {
      this.e += tx * this.a;
      this.f += ty * this.d;
      this.m41 = this.e;
      this.m42 = this.f;
      return this;
    }

    preMultiplySelf(): this { return this; }
    multiplySelf(): this { return this; }
    invertSelf(): this { return this; }
    scale(): MinimalDOMMatrix { return new MinimalDOMMatrix(); }
    translate(): MinimalDOMMatrix { return new MinimalDOMMatrix(); }
    inverse(): MinimalDOMMatrix { return new MinimalDOMMatrix(); }
    multiply(): MinimalDOMMatrix { return new MinimalDOMMatrix(); }
    transformPoint(): { x: number; y: number; z: number; w: number } {
      return { x: 0, y: 0, z: 0, w: 1 };
    }
    toFloat32Array(): Float32Array { return new Float32Array(16); }
    toFloat64Array(): Float64Array { return new Float64Array(16); }
  }

  // @ts-ignore — Stub compatible con la interfaz que pdfjs-dist necesita
  globalThis.DOMMatrix = MinimalDOMMatrix;
}

if (typeof globalThis.Path2D === 'undefined') {
  /**
   * Stub mínimo de Path2D para satisfacer la verificación de polyfill de pdfjs-dist.
   * pdf.mjs usa Path2D en rutas de renderizado canvas (no en text extraction).
   */
  class MinimalPath2D {
    addPath(): void { /* no-op para text extraction */ }
    closePath(): void { /* no-op */ }
    moveTo(): void { /* no-op */ }
    lineTo(): void { /* no-op */ }
    bezierCurveTo(): void { /* no-op */ }
    quadraticCurveTo(): void { /* no-op */ }
    arc(): void { /* no-op */ }
    arcTo(): void { /* no-op */ }
    ellipse(): void { /* no-op */ }
    rect(): void { /* no-op */ }
  }

  // @ts-ignore — Stub compatible con la interfaz que pdfjs-dist necesita
  globalThis.Path2D = MinimalPath2D;
}

if (typeof globalThis.ImageData === 'undefined') {
  /**
   * Stub mínimo de ImageData para satisfacer la verificación de polyfill de pdfjs-dist.
   * pdf.mjs usa ImageData en rutas de renderizado canvas (no en text extraction).
   */
  class MinimalImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    colorSpace: string = 'srgb';

    constructor(sw: number | Uint8ClampedArray, sh?: number, settings?: number) {
      if (sw instanceof Uint8ClampedArray) {
        this.data = sw;
        this.width = sh ?? 0;
        this.height = settings ?? 0;
      } else {
        this.width = sw;
        this.height = sh ?? 0;
        this.data = new Uint8ClampedArray(this.width * this.height * 4);
      }
    }
  }

  // @ts-ignore — Stub compatible con la interfaz que pdfjs-dist necesita
  globalThis.ImageData = MinimalImageData;
}
