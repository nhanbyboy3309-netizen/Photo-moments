
import React, { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import { updatePassword } from '../../../services/mockBackend';

const SecuritySettings: React.FC = () => {
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [isChangingPass, setIsChangingPass] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return alert("Mật khẩu không khớp!");
    if (passwords.new.length < 4) return alert("Mật khẩu quá ngắn (tối thiểu 4 ký tự)!");

    setIsChangingPass(true);
    try {
      await updatePassword(passwords.new);
      setPasswords({ new: '', confirm: '' });
      alert("Đổi mật khẩu thành công!");
    } catch (error) {
      console.error(error);
      alert("Lỗi đổi mật khẩu");
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
         <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-white">Đổi mật khẩu</h2>
                <p className="text-zinc-400 text-sm">Bảo mật tài khoản Admin.</p>
            </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Mật khẩu mới</label>
              <input 
                type="password" required
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                value={passwords.new}
                onChange={(e) => setPasswords(prev => ({...prev, new: e.target.value}))}
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Nhập lại mật khẩu mới</label>
              <input 
                type="password" required
                className="w-full bg-black border border-zinc-700 rounded-lg p-3 focus:border-white focus:outline-none transition-colors text-white"
                value={passwords.confirm}
                onChange={(e) => setPasswords(prev => ({...prev, confirm: e.target.value}))}
                placeholder="Xác nhận mật khẩu"
              />
            </div>
            <div className="pt-4">
                <button type="submit" disabled={isChangingPass} className="w-full md:w-auto bg-white text-black px-6 py-3 rounded-lg font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-sm">
                    {isChangingPass ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu mật khẩu mới"}
                </button>
            </div>
        </form>
    </div>
  );
};

export default SecuritySettings;
