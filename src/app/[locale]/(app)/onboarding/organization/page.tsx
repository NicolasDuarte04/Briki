// /src/app/[locale]/(app)/onboarding/organization/page.tsx
import { createOrganization } from '@/app/actions/organizationActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { redirect } from 'next/navigation';

export default function OrganizationOnboardingPage() {
  const handleCreateOrg = async (formData: FormData) => {
    'use server';
    const name = formData.get('orgName') as string;
    const slug = formData.get('orgSlug') as string;
    
    if (!name || !slug) {
      throw new Error('Nombre y slug son requeridos');
    }
    
    // Validar que el slug sea válido (solo letras minúsculas, números y guiones)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      throw new Error('El slug solo puede contener letras minúsculas, números y guiones');
    }
    
    try {
      await createOrganization(name, slug);
      redirect('/workspace/cases'); // Redirigir al workspace después de crear la organización
    } catch (error) {
      console.error('Error creando organización:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Crea tu Organización
            </CardTitle>
            <CardDescription className="text-center">
              Dale un nombre a tu espacio de trabajo para empezar a gestionar casos y colaborar con tu equipo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleCreateOrg} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nombre de la Organización</Label>
                <Input 
                  id="orgName" 
                  name="orgName" 
                  placeholder="Ej: Mi Empresa S.A." 
                  required 
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Este nombre aparecerá en todos tus documentos y comunicaciones.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="orgSlug">URL Slug</Label>
                <Input 
                  id="orgSlug" 
                  name="orgSlug" 
                  placeholder="mi-empresa" 
                  pattern="[a-z0-9-]+"
                  required 
                />
                <p className="text-xs text-muted-foreground">
                  Solo letras minúsculas, números y guiones. Será tu URL única: briki.com/mi-empresa
                </p>
              </div>
              
              <Button type="submit" className="w-full">
                Crear y Continuar
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Si ya eres parte de una organización, tu administrador puede invitarte.
        </p>
      </div>
    </div>
  );
}
