import { PDFDocument, PDFName, PDFString, PDFDict } from 'pdf-lib';

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
  const form2 = doc2.getForm();
  for (const f of form2.getFields()) {
    console.log("Fixing and Removing field:", f.getName());
    
    // Fix missing AP/N before removing
    const widgets = f.acroField.getWidgets();
    for (const w of widgets) {
      let AP = w.dict.get(PDFName.of('AP'));
      if (AP instanceof PDFDict) {
        if (!AP.get(PDFName.of('N'))) {
           const dummyStream = doc2.context.flateStream(new Uint8Array(0));
           AP.set(PDFName.of('N'), doc2.context.register(dummyStream));
        }
      } else {
        AP = doc2.context.obj({});
        const dummyStream = doc2.context.flateStream(new Uint8Array(0));
        AP.set(PDFName.of('N'), doc2.context.register(dummyStream));
        w.dict.set(PDFName.of('AP'), AP);
      }
    }
    
    form2.removeField(f);
  }
  console.log("Success");
}
run().catch(console.error);
