// PDF.js viewer with clickable links support
import * as pdfjsLib from './pdfjs-5.4.54-dist/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-5.4.54-dist/build/pdf.worker.mjs';

const pdfUrl = 'Resume.pdf';
const container = document.getElementById('pdf-container');

async function renderPDF() {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const scale = 1.5;
          const viewport = page.getViewport({ scale });

          // Create page wrapper
          const pageWrapper = document.createElement('div');
          pageWrapper.className = 'pdf-page-wrapper';
          pageWrapper.style.position = 'relative';
          pageWrapper.style.width = `${viewport.width}px`;
          pageWrapper.style.height = `${viewport.height}px`;
          pageWrapper.style.margin = '0 auto 20px auto';

          // Create canvas for rendering
          const canvas = document.createElement('canvas');
          canvas.className = 'pdf-page';
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = 'block';

          // Create annotation layer for links
          const annotationLayer = document.createElement('div');
          annotationLayer.className = 'annotation-layer';
          annotationLayer.style.position = 'absolute';
          annotationLayer.style.top = '0';
          annotationLayer.style.left = '0';
          annotationLayer.style.width = `${viewport.width}px`;
          annotationLayer.style.height = `${viewport.height}px`;
          annotationLayer.style.pointerEvents = 'auto';

          pageWrapper.appendChild(canvas);
          pageWrapper.appendChild(annotationLayer);
          container.appendChild(pageWrapper);

          // Render page on canvas
          const context = canvas.getContext('2d');
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Render annotations (links)
          const annotations = await page.getAnnotations();
          annotations.forEach(annotation => {
            if (annotation.subtype === 'Link' && annotation.url) {
              const rect = annotation.rect;
              const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(rect);

              const link = document.createElement('a');
              link.href = annotation.url;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.style.position = 'absolute';
              link.style.left = `${Math.min(x1, x2)}px`;
              link.style.top = `${Math.min(y1, y2)}px`;
              link.style.width = `${Math.abs(x2 - x1)}px`;
              link.style.height = `${Math.abs(y2 - y1)}px`;
              link.style.cursor = 'pointer';
              link.style.backgroundColor = 'transparent';
              link.addEventListener('mouseenter', () => {
                link.style.backgroundColor = 'rgba(0, 123, 255, 0.1)';
              });
              link.addEventListener('mouseleave', () => {
                link.style.backgroundColor = 'transparent';
              });

                  annotationLayer.appendChild(link);
                }
            });
    }
  } catch (error) {
    container.innerHTML = `<p style="color:red;">Error loading PDF: ${error.message}</p>`;
  }
}

renderPDF();
