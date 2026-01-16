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

// Renderizamos la imagen 3 veces más grande para nitidez al hacer zoom
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
  const [canFlip, setCanFlip] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="flex flex-col justify-center items-center bg-gray-800 min-h-screen overflow-hidden relative">
      
      {/* --- CORRECCIÓN DE MÁRGENES AQUÍ --- */}
      <style jsx global>{`
        .react-pdf__Page {
          width: 100% !important;
          height: 100% !important;
          display: flex !important;
          justify-content: center;
          align-items: center;
          background-color: white; /* Asegura fondo blanco por si acaso */
        }
        .react-pdf__Page__canvas {
          width: 100% !important; 
          height: 100% !important;
          /* CAMBIO CLAVE: Usamos 'fill' en lugar de 'contain' */
          /* Esto estira ligeramente la imagen para cubrir todo el hueco sin dejar bordes */
          object-fit: fill !important; 
        }
      `}</style>
      {/* ----------------------------------- */}

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
                  className={`shadow-2xl ${canFlip ? '' : 'pointer-events-none transition-none'}`}
                  useMouseEvents={canFlip}
                >
                  {Array.from(new Array(numPages), (el, index) => (
                    <PageWrapper key={`page_${index + 1}`}>
                      <Page 
                        pageNumber={index + 1} 
                        // Renderizado de alta calidad (3x)
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

              <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md rounded-full px-4 py-2 flex gap-4 shadow-xl border border-gray-700">
                <button onClick={() => zoomOut()} className="text-white hover:text-blue-400 font-bold text-xl px-2">−</button>
                <button onClick={() => resetTransform()} className="text-white hover:text-blue-400 text-sm px-2 font-medium border-l border-r border-gray-600">Reset</button>
                <button onClick={() => zoomIn()} className="text-white hover:text-blue-400 font-bold text-xl px-2">+</button>
              </div>
            </>
          )}
        </TransformWrapper>
      </Document>
    </div>
  );
}