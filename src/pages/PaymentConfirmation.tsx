
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home } from 'lucide-react';
import { processPaymentConfirmation } from '../services/mockBackend';

const PaymentConfirmation: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (type && id && (type === 'photo' || type === 'order')) {
        processPaymentConfirmation(type as 'photo' | 'order', id)
            .then((res) => {
                setStatus(res.success ? 'success' : 'error');
                setMessage(res.message);
            })
            .catch((err) => {
                setStatus('error');
                setMessage(err.message || 'Lỗi không xác định');
            });
    } else {
        setStatus('error');
        setMessage("Link không hợp lệ.");
    }
  }, [type, id]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black text-white">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-2xl">
            {status === 'loading' && (
                <>
                    <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-2">Đang xử lý...</h2>
                    <p className="text-zinc-400">Vui lòng đợi trong giây lát.</p>
                </>
            )}
            {status === 'success' && (
                <>
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-green-500">Thành công!</h2>
                    <p className="text-zinc-300 mb-6">{message}</p>
                    <Link to="/" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors">
                        <Home className="w-4 h-4" /> Về trang chủ
                    </Link>
                </>
            )}
            {status === 'error' && (
                <>
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <XCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-red-500">Lỗi</h2>
                    <p className="text-zinc-300 mb-6">{message}</p>
                    <Link to="/" className="inline-flex items-center gap-2 bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-zinc-700 transition-colors">
                        <Home className="w-4 h-4" /> Về trang chủ
                    </Link>
                </>
            )}
        </div>
    </div>
  );
};

export default PaymentConfirmation;
