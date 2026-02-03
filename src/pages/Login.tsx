import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Login() {
  const { loginWithGoogle, user, isWhitelisted, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
      if (user && isWhitelisted) {
          navigate('/');
      }
  }, [user, isWhitelisted, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await loginWithGoogle();
    } catch (error: any) {
      toast.error('Login failed: ' + error.message);
      setLoading(false);
    }
  };

  if (authLoading) return <div className="text-center py-20 font-heading">Verifying identity...</div>;

  // Trường hợp Đã Login Google nhưng KHÔNG nằm trong Whitelist
  if (user && !isWhitelisted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl text-center border-t-8 border-red-500">
          <div className="text-red-500 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
          </div>
          <h2 className="text-3xl font-heading font-bold text-pl-purple uppercase mb-4">Unauthorized Access</h2>
          <p className="text-gray-500 text-sm mb-2">The email <span className="font-bold text-pl-pink">{user.email}</span> is not registered in our squad list.</p>
          <p className="text-xs text-gray-400 mb-8 italic">Please contact the Team Admin to whitelist your email.</p>
          
          <button 
            onClick={() => logout()}
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all cursor-pointer uppercase text-xs tracking-widest"
          >
            Try Another Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-xl text-center border border-gray-100">
        <div className="w-20 h-20 bg-pl-purple text-white rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">RF</div>
        <h2 className="text-4xl font-heading font-bold text-pl-purple uppercase mb-2">Welcome Back</h2>
        <p className="text-gray-500 text-sm mb-10">Sign in with your Google account to access team features.</p>
        
        <button 
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 border-2 border-gray-200 py-3 px-6 rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-pl-purple transition-all group cursor-pointer shadow-sm active:scale-95"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <p className="mt-8 text-[10px] text-gray-400 uppercase tracking-widest">
          Registered Squad Members Only
        </p>
      </div>
    </div>
  );
}
