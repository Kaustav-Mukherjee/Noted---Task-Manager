import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import SharedDashboardView from './components/SharedDashboardView.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/dashboard/:shareId" element={<SharedDashboardView />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </React.StrictMode>,
)
