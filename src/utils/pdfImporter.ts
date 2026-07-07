import { PDFDocument, PDFName, PDFTextField, PDFDropdown, PDFCheckBox, PDFRadioGroup } from 'pdf-lib';
import type { FieldDef, FieldType } from '../types';

export async function extractAndStripFormFields(buffer: Uint8Array): Promise<{ buffer: Uint8Array, extractedFields: FieldDef[], debugInfo: string }> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const extractedFields: FieldDef[] = [];
  const pages = pdfDoc.getPages();
  let debugLog = `AcroForm Fields: ${fields.length} | `;

  for (const f of fields) {
    let type: FieldType | null = null;
    
    // Combine all methods to detect field type because bundlers can break any single method
    if (f instanceof PDFTextField || f.constructor?.name === 'PDFTextField' || typeof (f as any).getText === 'function') {
      type = 'text';
    } else if (f instanceof PDFDropdown || f.constructor?.name === 'PDFDropdown' || typeof (f as any).addOptions === 'function') {
      type = 'dropdown';
    } else if (f instanceof PDFCheckBox || f.constructor?.name === 'PDFCheckBox' || typeof (f as any).check === 'function') {
      type = 'checkbox';
    } else if (f instanceof PDFRadioGroup || f.constructor?.name === 'PDFRadioGroup' || typeof (f as any).addOptionToPage === 'function') {
      type = 'radio';
    } else {
      // Fallback: If we really can't determine the type, treat it as a text field rather than deleting it completely.
      type = 'text';
      console.warn(`Could not determine type for field ${name}, defaulting to text.`);
    }


    const widgets = f.acroField.getWidgets();
    
    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      const pRef = w.dict.get(PDFName.of('P'));
      
      let pageIndex = 0; // Default to first page if not found
      if (pRef) {
        const foundIdx = pages.findIndex(p => p.ref === pRef);
        if (foundIdx !== -1) pageIndex = foundIdx;
      }
      
      const rect = w.getRectangle();
      
      const fieldId = crypto.randomUUID();
      const baseField: Partial<FieldDef> = {
        id: fieldId,
        pageIndex,
        type,
        name: type === 'radio' ? `${name}_${i}` : name, // Radios share a name, but we need unique names internally? Wait, our app uses groupName for radios.
        label: name,
        pdfX: rect.x,
        pdfY: rect.y,
        // pdf-lib's getRectangle() returns width/height.
        pdfWidth: rect.width,
        pdfHeight: rect.height,
      };

      if (type === 'text') {
        baseField.fontSize = 12; 
      } else if (type === 'dropdown') {
        const dd = f as PDFDropdown;
        baseField.options = dd.getOptions();
        baseField.defaultOption = dd.getSelected()[0];
      } else if (type === 'checkbox') {
        const cb = f as PDFCheckBox;
        baseField.checkedByDefault = cb.isChecked();
      } else if (type === 'radio') {
        baseField.name = `${name}_${i}`;
        baseField.groupName = name;
        baseField.radioValue = w.getOnValue()?.decodeText() || `${name}_${i}`;
      }
      
      extractedFields.push(baseField as FieldDef);
    }
  }

  // Strip fields from the PDF (using AcroForm API)
  for (const f of fields) {
    form.removeField(f);
  }

  // --- FALLBACK: If pdf-lib failed to find AcroForm fields (e.g. Foxit PDF issues), scan annotations manually ---
  if (extractedFields.length === 0) {
    debugLog += `Fallback activated. Pages: ${pages.length}. `;
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const annots = page.node.Annots();
      debugLog += `P${pageIndex} Annots: ${annots ? annots.size() : 0}. `;
      if (!annots) continue;

      const newAnnots = pdfDoc.context.obj([]);
      
      for (let i = 0; i < annots.size(); i++) {
        let annotRef = annots.lookup(i);
        let annot = pdfDoc.context.lookup(annotRef);
        
        // Ensure it's a Dictionary
        if (!annot || typeof annot.get !== 'function') {
          newAnnots.push(annotRef);
          continue;
        }

        // Use context.lookup to resolve references
        let subtype = annot.get(PDFName.of('Subtype'));
        if (subtype && typeof subtype.lookup === 'function') subtype = pdfDoc.context.lookup(subtype);

        if (subtype && typeof subtype.decodeText === 'function') {
          debugLog += `[${subtype.decodeText()}] `;
        }
        
        // If it's a Widget (form field), extract it and do NOT add it to newAnnots (strip it)
        if (subtype && typeof subtype.decodeText === 'function' && subtype.decodeText() === 'Widget') {
          let rect = annot.get(PDFName.of('Rect'));
          if (rect && typeof rect.lookup === 'function') rect = pdfDoc.context.lookup(rect);

          if (rect && typeof rect.lookup === 'function') {
            const x = pdfDoc.context.lookup(rect.lookup(0)).asNumber();
            const y = pdfDoc.context.lookup(rect.lookup(1)).asNumber();
            const w = pdfDoc.context.lookup(rect.lookup(2)).asNumber() - x;
            const h = pdfDoc.context.lookup(rect.lookup(3)).asNumber() - y;
            
            // Try to find the field name (T)
            let fieldName = `RecoveredField_${crypto.randomUUID().slice(0, 5)}`;
            let tEntry = annot.get(PDFName.of('T'));
            if (tEntry && typeof tEntry.lookup === 'function') tEntry = pdfDoc.context.lookup(tEntry);
            if (tEntry && typeof tEntry.decodeText === 'function') {
              fieldName = tEntry.decodeText();
            }

            extractedFields.push({
              id: crypto.randomUUID(),
              pageIndex,
              type: 'text', // Default to text for recovered annotations
              name: fieldName,
              label: fieldName,
              pdfX: x,
              pdfY: y,
              pdfWidth: w,
              pdfHeight: h,
              fontSize: 12,
            });
            debugLog += `(Extracted Widget) `;
            continue; // Skip adding to newAnnots to strip it!
          }
        }
        
        // Keep non-widget annotations
        newAnnots.push(annotRef);
      }
      
      // Update page annotations
      page.node.set(PDFName.of('Annots'), newAnnots);
    }
  }

  const newBuffer = await pdfDoc.save();
  return { buffer: newBuffer, extractedFields, debugInfo: debugLog };
}
