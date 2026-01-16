'use client';
import { useState, useEffect, forwardRef, useCallback } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { Document, Page, pdfjs } from 'react-pdf';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// Configuración del worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFBookProps {
  pdfUrl: string;
}

// Factor de calidad (Supermuestreo)
const SCALE_FACTOR = 3; 

// Componente Wrapper que ahora recibe dimensiones dinámicas
const PageWrapper = forwardRef<HTMLDivElement, any>((props, ref) => {
  return (
    <div 
      ref={ref} 
      className="bg-white overflow-hidden flex justify-center items-center relative shadow-sm"
      // Usamos las props style pasadas desde el padre para el tamaño
      style={{ ...props.style, padding: 0, margin: 0 }} 
    >
      {props.children}
    </div>
  );
});
PageWrapper.displayName = 'PageWrapper';

export default function PDFBook({ pdfUrl }: PDFBookProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [canFlip, setCanFlip] = useState(true);

  // --- ESTADO PARA RESPONSIVIDAD ---
  const [bookSize, setBookSize] = useState({
    width: 400,  // Ancho base PC
    height: 550, // Alto base PC
    isMobile: false
  });

  // Función para calcular tamaño basado en la ventana
  const calculateSize = useCallback(() => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    // Si la pantalla es menor a 768px (Tablets/Celulares verticales)
    const isMobile = screenW < 768;

    if (isMobile) {
      // EN MOVIL: Ocupamos casi todo el ancho de la pantalla
      // Dejamos 20px de margen (10px cada lado)
      const newWidth = Math.min(screenW - 20, 400); 
      // Calculamos la altura manteniendo la proporción (aprox 1.375)
      const newHeight = newWidth * 1.375; 
      
      setBookSize({ width: newWidth, height: newHeight, isMobile: true });
    } else {
      // EN PC: Medidas fijas originales
      setBookSize({ width: 400, height: 550, isMobile: false });
    }
  }, []);

  // Detectar cambio de tamaño de pantalla
  useEffect(() => {
    calculateSize(); // Cálculo inicial
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, [calculateSize]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

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

  // Si aún no hemos calculado el tamaño (render inicial), no mostramos nada para evitar saltos
  if (bookSize.width === 0) return null;

  return (
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
          panning={{ disabled: canFlip }} 
          onTransformed={(ref) => {
            if (ref.state.scale > 1.01) {
              setCanFlip(false);
            } else {
              setCanFlip(true);
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
                  // --- MEDIDAS DINÁMICAS ---
                  width={bookSize.width} 
                  height={bookSize.height} 
                  // -------------------------
                  size="fixed" 
                  // Si es móvil, activamos 'usePortrait' para ver UNA sola página
                  usePortrait={bookSize.isMobile} 
                  showCover={true}
                  minWidth={bookSize.width}
                  maxWidth={bookSize.width}
                  minHeight={bookSize.height}
                  maxHeight={bookSize.height}
                  drawShadow={true}
                  maxShadowOpacity={0.3} 
                  className={`shadow-2xl ${canFlip ? '' : 'pointer-events-none transition-none'}`}
                  useMouseEvents={canFlip}
                  // Forzamos re-render si cambia el modo (móvil/pc)
                  key={bookSize.isMobile ? 'mobile' : 'desktop'}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <PageWrapper 
                      key={`page_${index + 1}`}
                      // Pasamos el tamaño al wrapper explícitamente
                      style={{ width: bookSize.width, height: bookSize.height }}
                    >
                      <Page 
                        pageNumber={index + 1} 
                        // Calculamos la calidad basada en el nuevo tamaño dinámico
                        width={bookSize.width * SCALE_FACTOR} 
                        height={bookSize.height * SCALE_FACTOR}
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

              {/* BARRA DE HERRAMIENTAS ADAPTATIVA */}
              <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900/90 backdrop-blur-md rounded-full px-4 py-2 flex gap-4 shadow-2xl border border-gray-700 items-center scale-90 sm:scale-100">
                <div className="flex gap-3 items-center">
                  <button onClick={() => zoomOut()} className="text-white hover:text-blue-400 font-bold text-xl leading-none px-2 py-1" title="Alejar">−</button>
                  <button onClick={() => resetTransform()} className="text-gray-300 hover:text-white text-[10px] font-medium uppercase tracking-wider px-1">Reset</button>
                  <button onClick={() => zoomIn()} className="text-white hover:text-blue-400 font-bold text-xl leading-none px-2 py-1" title="Acercar">+</button>
                </div>
                <div className="w-px h-6 bg-gray-600"></div>
                <div className="flex gap-4 items-center">
                  <button onClick={handleDownload} className="text-gray-300 hover:text-green-400 transition-colors p-1" title="Descargar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </button>
                  <button onClick={handlePrint} className="text-gray-300 hover:text-blue-400 transition-colors p-1" title="Imprimir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
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