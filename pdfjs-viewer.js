// Minimal PDF.js viewer script for local files
import * as pdfjsLib from './pdfjs-5.4.54-dist/build/pdf.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-5.4.54-dist/build/pdf.worker.mjs';

const url = 'Resume.pdf';
const loadingTask = pdfjsLib.getDocument(url);
loadingTask.promise.then(function(pdf) {
  pdf.getPage(1).then(function(page) {
    const scale = 1.5;
    const viewport = page.getViewport({ scale: scale });
    const canvas = document.getElementById('pdf-canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    page.render({ canvasContext: context, viewport: viewport });
  });
});
