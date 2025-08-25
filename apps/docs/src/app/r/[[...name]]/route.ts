import { NextRequest } from 'next/server';
import { 
  getRegistryIndex, 
  getComponentMeta, 
  getStaticComponentForShadcn 
} from '@/lib/registry-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name?: string[] }> }
) {
  try {
    const { name = [] } = await params;
    const path = name.join('/');
    const url = new URL(request.url);
    
    // Handle root registry request
    if (path === '') {
      const index = await getRegistryIndex();
      return Response.json(index);
    }
    
    // Handle meta requests
    if (path.startsWith('meta/')) {
      const componentPath = path.replace('meta/', '');
      const meta = await getComponentMeta(componentPath);
      return Response.json(meta);
    }
    
    // Handle component requests
    const routeNameRaw = url.searchParams.get('routeName');
    const routeName = routeNameRaw ? routeNameRaw.replace(/^\/+/, '') : undefined;
    
    const component = await getStaticComponentForShadcn(path, { routeName });
    
    // Replace {proofkit} placeholders with the current origin
    const responseData = {
      ...component,
      registryDependencies: component.registryDependencies?.map((dep: string) =>
        dep.replace('{proofkit}', url.origin)
      ),
    };
    
    return Response.json(responseData);
  } catch (error) {
    console.error('Registry route error:', error);
    return Response.json(
      { error: 'Component not found.' },
      { status: 404 }
    );
  }
}
