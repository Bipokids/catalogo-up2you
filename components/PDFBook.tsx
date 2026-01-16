'use client';
import { useState, forwardRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Configuración del worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFBookProps {
  pdfUrl: string;
}

// Configuración de calidad
const SCALE_FACTOR = 3; 
const BASE_WIDTH = 400;
const BASE_HEIGHT = 550;

const PageWrapper = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      ref={ref} 
      className="bg-white overflow-hidden w-[400px] h-[550px] flex justify-center items-center relative" 
      style={{ padding: 0, margin: 0 }} 
    >
      {props.children}
    </div>
  );
});
PageWrapper.displayName = 'PageWrapper';

export default function PDFBook({ pdfUrl }: PDFBookProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  
  // Estado que controla si estamos en modo "Pasar Página" (Zoom 1x) o "Explorar" (Zoom > 1x)
  const [canFlip, setCanFlip] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // Funciones de botones
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = 'catalogo-up2you.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    // Agregamos 'overscroll-none' para evitar rebotes del navegador
    <div className="flex flex-col justify-center items-center bg-gray-800 min-h-screen overflow-hidden relative overscroll-none">
      
      <style jsx global>{`
        .react-pdf__Page {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          justify-content: center;
          align-items: center;
          background-color: white;
        }
        .react-pdf__Page__canvas {
          width: 100% !important; 
          height: 100% !important;
          object-fit: fill !important; 
        }
      `}</style>

      <Document 
        file={pdfUrl} 
        onLoadSuccess={onDocumentLoadSuccess}
        loading={<div className="text-white font-bold">Cargando catálogo...</div>}
        error={<div className="text-red-500">Error al cargar PDF</div>}
      >
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={4}
          centerOnInit={true}
          // --- CORRECCIÓN CLAVE AQUÍ ---
          // Si 'canFlip' es verdadero (estamos al 100%), DESACTIVAMOS el panning.
          // Esto impide que el libro se mueva al arrastrar para pasar página.
          panning={{ disabled: canFlip }} 
          // -----------------------------
          onTransformed={(ref) => {
            // Margen de error pequeño (1.01) para detectar si hay zoom
            if (ref.state.scale > 1.01) {
              setCanFlip(false); // Hay zoom -> Desactivar Flip, Activar Pan
            } else {
              setCanFlip(true);  // No hay zoom -> Activar Flip, Desactivar Pan
            }
          }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent 
                wrapperStyle={{ width: "100%", height: "100vh" }}
                contentStyle={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
              >
                {/* @ts-expect-error: Error de tipos de librería */}
                <HTMLFlipBook 
                  width={BASE_WIDTH} 
                  height={BASE_HEIGHT} 
                  size="fixed" 
                  usePortrait={false} 
                  showCover={true}
                  minWidth={BASE_WIDTH}
                  maxWidth={BASE_WIDTH}
                  minHeight={BASE_HEIGHT}
                  maxHeight={BASE_HEIGHT}
                  drawShadow={true}
                  maxShadowOpacity={0.3} 
                  // Usamos CSS para "apagar" el libro si hay zoom, para que no interfiera
                  className={`shadow-2xl ${canFlip ? '' : 'pointer-events-none transition-none'}`}
                  useMouseEvents={canFlip}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <PageWrapper key={`page_${index + 1}`}>
                      <Page 
                        pageNumber={index + 1} 
                        width={BASE_WIDTH * SCALE_FACTOR} 
                        height={BASE_HEIGHT * SCALE_FACTOR}
                        className="pointer-events-none" 
                        renderAnnotationLayer={false} 
                        renderTextLayer={false}
                        devicePixelRatio={Math.min(2, window.devicePixelRatio || 1)} 
                      />
                      <span className="absolute bottom-4 right-4 text-[10px] text-gray-500 opacity-50 font-mono z-10">
                        {index + 1}
                      </span>
                    </PageWrapper>
                  ))}
                </HTMLFlipBook>
              </TransformComponent>

              {/* BARRA DE HERRAMIENTAS */}
              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md rounded-full px-6 py-3 flex gap-6 shadow-2xl border border-gray-700 items-center">
                <div className="flex gap-4 items-center">
                  <button onClick={() => zoomOut()} className="text-white hover:text-blue-400 font-bold text-xl leading-none transition-colors" title="Alejar">−</button>
                  <button onClick={() => resetTransform()} className="text-gray-300 hover:text-white text-xs font-medium uppercase tracking-wider transition-colors">Reset</button>
                  <button onClick={() => zoomIn()} className="text-white hover:text-blue-400 font-bold text-xl leading-none transition-colors" title="Acercar">+</button>
                </div>
                <div className="w-px h-6 bg-gray-600"></div>
                <div className="flex gap-4 items-center">
                  <button onClick={handleDownload} className="text-gray-300 hover:text-green-400 transition-colors" title="Descargar PDF">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button onClick={handlePrint} className="text-gray-300 hover:text-blue-400 transition-colors" title="Imprimir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </TransformWrapper>
      </Document>
    </div>
  );
}