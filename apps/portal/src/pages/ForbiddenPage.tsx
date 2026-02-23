import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Result
        status="403"
        title="403 — Access Denied"
        subTitle="You do not have permission to view this page. Contact your administrator if you believe this is an error."
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            Go to Dashboard
          </Button>,
          <Button key="back" onClick={() => navigate(-1)}>
            Go Back
          </Button>,
        ]}
      />
    </div>
  );
}
