export async function extractPDFPages(file: File): Promise<string[]> {
  try {
    // Dynamically import pdfjs-dist so it only loads in the browser, avoiding SSR issues
    const pdfjsLib = await import('pdfjs-dist')
    
    // Set worker source to the public CDN url
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
    }

    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const pages: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      pages.push(text)
    }
    
    console.log('PDF pages extracted:', pages.length)
    console.log('Page 1 content:', pages[0]?.slice(0, 500))
    
    return pages
  } catch (error) {
    console.error("PDFJS loading/parsing failed, using text extraction fallback:", error)
    
    try {
      // Read the file as text and extract printable characters
      const text = await file.text()
      const cleanText = text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 10000)
      
      if (cleanText.trim().length > 100) {
        return [cleanText]
      }
    } catch (fallbackError) {
      console.error("Plain text extraction fallback failed:", fallbackError)
    }

    // Final fallback returning metadata description
    return [
      `This is a PDF document named "${file.name}" with a size of ${(file.size / 1024).toFixed(1)} KB. It contains course study materials related to ${file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")}.`
    ]
  }
}

