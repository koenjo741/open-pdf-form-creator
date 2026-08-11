import { PDFDocument, PDFName, PDFBool, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';

async function run() {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  
  // Download a custom font (Inter)
  const fontBytes = fs.readFileSync('public/fonts/Inter-Regular.ttf');
  const font = await doc.embedFont(fontBytes);
  
  const page = doc.addPage([500, 500]);
  const form = doc.getForm();
  
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

  const tf = form.createTextField('test');
  tf.addToPage(page, { 
    x: 50, y: 50, width: 200, height: 100,
  });
  tf.enableMultiline(); // This might cause the crash with custom font!
  
  try {
    tf.updateAppearances(font);
    console.log("Update Appearances Succeeded!");
  } catch (e) {
    console.error("Update Appearances Failed:", e);
  }
  
  const bytes = await doc.save();
  const doc2 = await PDFDocument.load(bytes);
  for (const f of doc2.getForm().getFields()) {
    try {
      console.log("Removing field:", f.getName());
      doc2.getForm().removeField(f);
    } catch(e) {
      console.error("Remove failed:", e.message);
    }
  }
}
run().catch(console.error);
