export function generateFilename(template: string, defaultName: string, fieldData: Record<string, any>): string {
  if (!template || template.trim() === '') {
    return defaultName;
  }

  // Find all [field_name] or [field_name, N] matches in the template
  const regex = /\[([^\]]+)\]/g;
  let generatedName = template.replace(regex, (_match, innerContent) => {
    const parts = innerContent.split(',');
    const fieldName = parts[0].trim();
    let sliceLength: number | undefined;

    if (parts.length > 1) {
      const numStr = parts[1].trim();
      if (numStr !== '') {
        sliceLength = parseInt(numStr, 10);
      }
    }

    const val = fieldData[fieldName];
    if (val !== undefined && val !== null && val !== '') {
      let strVal = String(val);
      
      // If the string strictly matches a date pattern, remove the separators
      if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(strVal)) {
        strVal = strVal.replace(/\./g, '');
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(strVal)) {
        strVal = strVal.replace(/-/g, '');
      } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(strVal)) {
        strVal = strVal.replace(/\//g, '');
      }
      
      // Apply slicing if specified
      if (sliceLength !== undefined && !isNaN(sliceLength) && sliceLength !== 0) {
        if (sliceLength > 0) {
          strVal = strVal.slice(0, sliceLength);
        } else {
          strVal = strVal.slice(sliceLength);
        }
      }
      
      return strVal;
    }
    return '';
  });

  // If the generated name is empty after replacements, fallback
  if (!generatedName.trim()) {
    return defaultName;
  }

  // Basic sanitization for filenames (remove invalid characters)
  // Windows invalid chars: \ / : * ? " < > |
  // We'll also remove leading/trailing spaces and multiple spaces
  generatedName = generatedName
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // remove invalid chars
    .replace(/\s+/g, ' ')                  // normalize spaces
    .trim();

  return generatedName || defaultName;
}
