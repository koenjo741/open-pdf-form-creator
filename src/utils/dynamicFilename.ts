export function generateFilename(template: string, defaultName: string, fieldData: Record<string, any>): string {
  if (!template || template.trim() === '') {
    return defaultName;
  }

  // Find all [field_name] matches in the template
  const regex = /\[([^\]]+)\]/g;
  let generatedName = template.replace(regex, (_match, fieldName) => {
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
