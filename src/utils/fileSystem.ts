import { saveAs } from 'file-saver';

export async function saveFileWithPicker(
  content: Blob | Uint8Array | string,
  suggestedName: string,
  description: string,
  accept: Record<string, string[]>
) {
  try {
    if ('showSaveFilePicker' in window) {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName,
        types: [{
          description,
          accept,
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return false; // User cancelled
    }
    // Fallback if permission denied or other error
  }
  
  // Fallback
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content as BlobPart], { type: Object.keys(accept)[0] || 'application/octet-stream' });
  
  saveAs(blob, suggestedName);
  return true;
}
