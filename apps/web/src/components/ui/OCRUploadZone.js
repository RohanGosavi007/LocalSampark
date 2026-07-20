import React, { useState } from 'react';
import { Upload, FileText, CheckCircle } from 'lucide-react';

export default function OCRUploadZone({ onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSimulatedUpload = () => {
    setIsUploading(true);
    // Simulate OCR processing time
    setTimeout(() => {
      setIsUploading(false);
      setResult([
        { item: 'Paracetamol 500mg', qty: 2 },
        { item: 'Cough Syrup', qty: 1 }
      ]);
      if (onUploadComplete) {
        onUploadComplete();
      }
    }, 2000);
  };

  return (
    <div className="border-2 border-dashed border-border rounded-xl p-6 bg-background text-center hover:border-cat-primary transition-all">
      {!isUploading && !result ? (
        <div className="cursor-pointer" onClick={handleSimulatedUpload}>
          <Upload className="w-10 h-10 mx-auto text-text-muted mb-2" />
          <h3 className="font-bold">Upload Prescription / Handwritten List</h3>
          <p className="text-sm text-text-muted">Click or drag & drop to auto-extract items</p>
        </div>
      ) : isUploading ? (
        <div className="animate-pulse">
          <FileText className="w-10 h-10 mx-auto text-cat-primary mb-2" />
          <h3 className="font-bold">Extracting text via AI...</h3>
          <p className="text-sm text-text-muted">Please wait</p>
        </div>
      ) : (
        <div>
          <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
          <h3 className="font-bold text-green-500">Extraction Complete</h3>
          <ul className="text-left mt-4 bg-background-alt p-4 rounded-lg">
            {result.map((r, i) => (
              <li key={i} className="flex justify-between border-b border-border py-2 last:border-0">
                <span>{r.item}</span>
                <span className="font-bold">x{r.qty}</span>
              </li>
            ))}
          </ul>
          <button className="mt-4 px-4 py-2 bg-cat-primary text-white rounded-lg w-full font-bold">
            Add All to Cart
          </button>
        </div>
      )}
    </div>
  );
}
