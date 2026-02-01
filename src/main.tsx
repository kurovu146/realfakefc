import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Home from './pages/Home.tsx'
import Players from './pages/Players.tsx'
import Fixtures from './pages/Fixtures.tsx'
import MatchDetail from './pages/MatchDetail.tsx'
import Admin from './pages/Admin.tsx'
import Stats from './pages/Stats.tsx'
import Login from './pages/Login.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { Toaster } from 'sonner'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
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
