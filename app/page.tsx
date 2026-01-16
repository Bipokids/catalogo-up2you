// app/page.tsx
'use client';
import dynamic from 'next/dynamic';

// Importación dinámica con 'ssr: false' para evitar el error de DOMMatrix
const PDFBook = dynamic(() => import('../components/PDFBook'), {
  ssr: false,
  loading: () => <p className="text-center mt-10">Cargando catálogo...</p>,
});

export default function Home() {
  return (
    <main>
      <PDFBook pdfUrl="/catalogo.pdf" />
    </main>
  );
}