
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, CheckCircle, Loader2, FileText, FileCheck, FileWarning } from 'lucide-react';
import { uploadPrintFile } from '../services/printService';

const PrintMobileUpload: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !sessionId) return;

      setIsUploading(true);
      setError('');
      try {
          const url = await uploadPrintFile(file, sessionId);
          if (url) {
              setUploadedFiles(prev => [...prev, file.name]);
          } else {
              setError("Lỗi tải lên máy chủ.");
          }
      } catch (err: any) {
          setError("Lỗi xử lý tệp.");
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col animate-fade-in">
        <div className="mb-8">
            <h1 className="text-2xl font-bold">Gửi tài liệu in</h1>
            <p className="text-zinc-500 text-sm">Trạm in: <span className="text-blue-400 font-mono font-bold">{sessionId}</span></p>
        </div>

        <div className={`relative border-2 border-dashed rounded-3xl p-12 text-center transition-all ${isUploading ? 'border-blue-500 bg-blue-500/5' : 'border-zinc-800 bg-zinc-900/50'}`}>
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFile} disabled={isUploading} accept=".pdf,.docx,.xlsx,.pptx,image/*" />
            
            {isUploading ? (
                <div className="space-y-4">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto"/>
                    <p className="text-blue-400 font-bold animate-pulse">Đang tải lên...</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto text-zinc-400"><Upload className="w-8 h-8"/></div>
                    <h2 className="text-xl font-bold">Chọn tài liệu</h2>
                    <p className="text-zinc-500 text-xs">PDF, Office (Word/Excel/PP) hoặc Ảnh</p>
                </div>
            )}
        </div>

        {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-3 text-red-500 text-sm items-center">
                <FileWarning className="w-5 h-5 shrink-0"/> {error}
            </div>
        )}

        <div className="mt-10 space-y-3">
            {uploadedFiles.map((name, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 animate-slide-up">
                    <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center text-blue-400"><FileText className="w-5 h-5"/></div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{name}</p>
                        <span className="text-[10px] text-green-500 flex items-center gap-1"><FileCheck className="w-3 h-3"/> Đã tải lên</span>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
            ))}
        </div>

        <div className="mt-auto pt-10 text-center">
            <p className="text-zinc-500 text-[11px] italic">Tài liệu sẽ tự động xuất hiện trên máy tính trạm in.</p>
        </div>
    </div>
  );
};

export default PrintMobileUpload;
