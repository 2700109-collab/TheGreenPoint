import { Routes, Route } from 'react-router-dom';
import VerifyPage from './pages/VerifyPage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <span className="logo">🌿 NCTS Verify</span>
          <span className="tagline">South Africa's Cannabis Product Verification</span>
        </div>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/verify/:trackingId" element={<VerifyPage />} />
        </Routes>
      </main>
      <footer className="footer">
        <p>National Cannabis Tracking System — Republic of South Africa</p>
        <p className="footer-sub">Powered by TheGreenPoint</p>
      </footer>
    </div>
  );
}

export default App;
