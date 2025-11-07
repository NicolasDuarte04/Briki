This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 📦 Gestor de Paquetes

**Este proyecto usa [pnpm](https://pnpm.io/) como gestor de paquetes principal.**

### ¿Por qué pnpm?

- **Mejor rendimiento**: Instalación más rápida y uso eficiente del espacio en disco
- **Resolución estricta de dependencias**: Evita problemas de "phantom dependencies"
- **Compatibilidad con monorepos**: Mejor soporte para proyectos grandes
- **Consistencia**: Garantiza que todos los desarrolladores usen las mismas versiones

### Instalación de pnpm

Si no tienes pnpm instalado:

```bash
npm install -g pnpm
# o
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

## Getting Started

### 1. Instalar dependencias

```bash
pnpm install
```

**⚠️ Importante**: Este proyecto está configurado para usar **pnpm únicamente**. El uso de `npm` o `yarn` está bloqueado por el script `preinstall` para mantener la consistencia del proyecto.

### 2. Iniciar servidor de desarrollo

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
