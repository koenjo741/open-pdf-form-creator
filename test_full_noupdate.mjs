import { PDFDocument, StandardFonts, PDFName, PDFBool, rgb } from 'pdf-lib';
import * as fs from 'fs';

async function run() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  const form = doc.getForm();
  
  const tf = form.createTextField('test');
  tf.addToPage(page, { 
    x: 50, y: 50, width: 200, height: 100,
    borderWidth: 1,
    backgroundColor: rgb(1, 1, 1),
    borderColor: rgb(0.62, 0.75, 0.98),
  });
  tf.setFontSize(12);
  tf.enableMultiline();
  
  // Notice NO updateAppearances called!
  
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
