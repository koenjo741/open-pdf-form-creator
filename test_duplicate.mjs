import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';

async function run() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  const form = doc.getForm();
  
  // Create first widget
  const tf = form.createTextField('test');
  tf.addToPage(page, { x: 50, y: 50, width: 200, height: 100 });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  tf.updateAppearances(font);
  
  // Create duplicate widget (isDuplicate = true logic)
  tf.addToPage(page, { x: 50, y: 200, width: 200, height: 100 });
  // We do NOT call updateAppearances here, just like our code!
  
  const bytes = await doc.save();
  
  const doc2 = await PDFDocument.load(bytes);
  const form2 = doc2.getForm();
  const fields = form2.getFields();
  for (const f of fields) {
    console.log("Removing field:", f.getName());
    form2.removeField(f);
  }
  console.log('Success');
}
run().catch(console.error);
