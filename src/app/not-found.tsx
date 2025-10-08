import type { Metadata, Viewport } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 - Page non trouvée | PAULINA HÔTEL',
  description: 'La page que vous recherchez n\'existe pas.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7D3837',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl font-bold text-red-600">404</span>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            Page non trouvée
          </h1>
          
          <p className="text-slate-600 mb-8">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
          </p>
          
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-medium rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}