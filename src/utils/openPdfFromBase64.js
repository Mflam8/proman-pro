export function openPdfFromBase64(pdfBase64, filename = 'documento.pdf', targetWindow = null) {
  if (!pdfBase64) return;

  const byteCharacters = atob(pdfBase64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(blob);

  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = blobUrl;
  } else {
    const newWindow = window.open(blobUrl, '_blank');

    if (!newWindow) {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }

  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}