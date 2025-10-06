// Test para ver qué métodos tiene disponibles prisma
import { prisma } from './src/lib/prisma';

console.log('Métodos disponibles en prisma:');
console.log(Object.getOwnPropertyNames(prisma).filter(prop => 
  !prop.startsWith('_') && 
  !prop.startsWith('$') && 
  typeof (prisma as any)[prop] === 'object'
));