import { PDFDocument, PDFName, PDFString } from 'pdf-lib';

async function run() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 500]);
  const form = doc.getForm();
  
  // Like generateSignatureField.ts
  const signatureDict = doc.context.obj({
    Type: 'Annot', Subtype: 'Widget', FT: 'Sig',
    Rect: [50, 50, 150, 150],
    T: PDFString.of('my_signature'), F: 4, P: page.ref,
  });
  const signatureRef = doc.context.register(signatureDict);
  page.node.addAnnot(signatureRef);
  form.acroForm.addField(signatureRef);
  
  const bytes = await doc.save();
  const doc2 = await PDFDocument.load(bytes);
  for (const f of doc2.getForm().getFields()) {
    console.log("Removing field:", f.getName());
    doc2.getForm().removeField(f);
  }
  console.log("Success");
}
run().catch(console.error);
