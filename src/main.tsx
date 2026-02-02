import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import Players from './pages/Players.tsx'
import Fixtures from './pages/Fixtures.tsx'
import MatchDetail from './pages/MatchDetail.tsx'
import Admin from './pages/admin/Admin.tsx'
import Login from './pages/Login.tsx'
import Stats from './pages/Stats.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { Toaster } from 'sonner'
import OneSignal from 'react-onesignal';
import './index.css'

const OneSignalApp = () => {
  useEffect(() => {
    const initOneSignal = async () => {
        try {
            await OneSignal.init({ 
                appId: import.meta.env.VITE_ONESIGNAL_APP_ID || "", 
                allowLocalhostAsSecureOrigin: true 
            });
            
            // Xử lý click thông báo
            OneSignal.Notifications.addEventListener('click', (event) => {
                const data = event.notification.additionalData as any;
                const url = data?.url || event.notification.launchURL;
                if (url) {
                    // Nếu là URL tuyệt đối, lấy phần path
                    try {
                        const urlObj = new URL(url);
                        if (urlObj.origin === window.location.origin) {
                             window.location.href = urlObj.pathname;
                        } else {
                             window.location.href = url;
                        }
                    } catch (e) {
                        window.location.href = url;
                    }
                }
            });

            OneSignal.Slidedown.promptPush();
        } catch (error) {
            console.error("OneSignal init error:", error);
        }
    };
    initOneSignal();
  }, []);

  return null;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <OneSignalApp />
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Home />} />
            <Route path="players" element={<Players />} />
            <Route path="fixtures" element={<Fixtures />} />
            <Route path="fixtures/:id" element={<MatchDetail />} />
            <Route path="stats" element={<Stats />} />
            <Route path="admin" element={<Admin />} />
            <Route path="login" element={<Login />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
)