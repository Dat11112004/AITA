import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function renderPdfToImages(file: File, scale = 2.0): Promise<string[]> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const numPages = pdf.numPages;
    const pageImages: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not get 2d context');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas as any
        };
        
        await page.render(renderContext as any).promise;
        
        // Convert to high quality JPEG to save some bandwidth over PNG
        const base64Img = canvas.toDataURL('image/jpeg', 0.9);
        pageImages.push(base64Img);
    }
    
    return pageImages;
}

export async function processCropImagesInHtml(html: string, pageImages: string[]): Promise<string> {
    const cropRegex = /src="crop:\/\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)"/g;
    
    let match;
    let finalHtml = html;
    
    // We need to resolve all promises for cropping
    const replacements: { old: string, new: string }[] = [];
    
    while ((match = cropRegex.exec(html)) !== null) {
        const fullMatch = match[0];
        const pageIdx = parseInt(match[1], 10);
        const ymin = parseInt(match[2], 10);
        const xmin = parseInt(match[3], 10);
        const ymax = parseInt(match[4], 10);
        const xmax = parseInt(match[5], 10);
        
        if (pageImages[pageIdx]) {
            const base64Src = pageImages[pageIdx];
            
            // Create an image object to get original dimensions
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = base64Src;
            });
            
            // Coordinates are 0-1000 normalized
            const sx = (xmin / 1000) * img.width;
            const sy = (ymin / 1000) * img.height;
            const sw = ((xmax - xmin) / 1000) * img.width;
            const sh = ((ymax - ymin) / 1000) * img.height;
            
            const canvas = document.createElement('canvas');
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
                const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
                replacements.push({ old: fullMatch, new: `src="${croppedBase64}"` });
            }
        }
    }
    
    for (const r of replacements) {
        finalHtml = finalHtml.replace(r.old, r.new);
    }
    
    return finalHtml;
}
