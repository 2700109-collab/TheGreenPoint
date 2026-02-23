import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ServerErrorPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="500"
        title="500 — Server Error"
        subTitle="Something went wrong on our end. Please try again later."
        extra={[
          <Button type="primary" key="retry" onClick={() => window.location.reload()}>
            Retry
          </Button>,
          <Button key="home" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>,
        ]}
      />
    </div>
  );
}
