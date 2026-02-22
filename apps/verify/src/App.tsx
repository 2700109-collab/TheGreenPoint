import { Routes, Route } from 'react-router-dom';
import VerifyLayout from '@/components/VerifyLayout';
import HomePage from '@/pages/HomePage';
import VerifyPage from '@/pages/VerifyPage';
import ScanPage from '@/pages/ScanPage';
import PrivacyPage from '@/pages/PrivacyPage';
import AccessibilityPage from '@/pages/AccessibilityPage';

function App() {
  return (
    <VerifyLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify/:trackingId" element={<VerifyPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/accessibility" element={<AccessibilityPage />} />
      </Routes>
    </VerifyLayout>
  );
}

export default App;
