import html2canvas from 'html2canvas';

export async function generateShareImage(element: HTMLElement): Promise<Blob> {
  const clone = element.cloneNode(true) as HTMLElement;

  // Force styles on the clone to ensure full content capture off-screen
  clone.style.width = '400px'; // ShareCard width
  clone.style.height = 'auto';
  clone.style.position = 'absolute';
  clone.style.top = '-9999px';
  clone.style.left = '-9999px';
  // Ensure the clone is visible to html2canvas but not the user
  clone.style.zIndex = '-1'; 
  
  // Append to body so html2canvas can access the DOM structure
  document.body.appendChild(clone);

  try {
    const canvas = await html2canvas(clone, {
      backgroundColor: '#0a0a0a',
      scale: 3, // High resolution
      useCORS: true,
      logging: false,
    });
    
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  } finally {
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
  }
}
