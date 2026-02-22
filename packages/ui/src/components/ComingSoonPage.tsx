import { Result, Button } from 'antd';

export interface ComingSoonPageProps {
  /** Handler to navigate back — injected by consuming app (router-agnostic) */
  onGoBack?: () => void;
}

/** Placeholder page for routes that haven't been implemented yet. */
export function ComingSoonPage({ onGoBack }: ComingSoonPageProps) {
  return (
    <Result
      status="info"
      title="Coming Soon"
      subTitle="This page is under development and will be available in a future release."
      extra={
        onGoBack && (
          <Button type="primary" onClick={onGoBack}>
            Go Back
          </Button>
        )
      }
    />
  );
}
