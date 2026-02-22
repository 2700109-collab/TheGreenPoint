import { Routes, Route } from 'react-router-dom';
import VerifyLayout from '@/components/VerifyLayout';
import HomePage from '@/pages/HomePage';
import VerifyPage from '@/pages/VerifyPage';
import ScanPage from '@/pages/ScanPage';

function App() {
  return (
    <VerifyLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/verify/:trackingId" element={<VerifyPage />} />
        <Route path="/scan" element={<ScanPage />} />
      </Routes>
    </VerifyLayout>
  );
}

export default App;
