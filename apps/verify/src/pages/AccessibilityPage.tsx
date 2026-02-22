function AccessibilityPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Accessibility Statement</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: 1 February 2026</p>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p>
          The NCTS Product Verification portal is committed to ensuring digital
          accessibility for all users, including persons with disabilities. We
          strive to meet <strong>WCAG 2.1 Level AA</strong> standards.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Accessibility Features</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Semantic HTML5 structure with proper heading hierarchy</li>
          <li>High colour contrast ratios meeting WCAG 2.1 AA (minimum 4.5:1)</li>
          <li>Fully keyboard-navigable — all functions accessible without a mouse</li>
          <li>Screen reader compatible with ARIA labels and landmarks</li>
          <li>Responsive layout supporting text enlargement up to 200%</li>
          <li>Clear focus indicators on all interactive elements</li>
          <li>Form fields with visible labels and descriptive error messages</li>
          <li>No content that flashes more than three times per second</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">QR Code Scanning</h2>
        <p>
          Products can be verified using the QR scanner or by manually entering
          the tracking ID printed on the product label. This ensures that users
          who cannot use a camera have equal access to verification.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Known Limitations</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>The camera-based QR scanner requires device camera permissions</li>
          <li>QR scanner functionality may be limited on older browsers</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Feedback</h2>
        <p>
          If you encounter any accessibility barriers, please contact us:
          <br />
          Email:{' '}
          <a href="mailto:accessibility@sahpra.gov.za" className="text-primary underline">
            accessibility@sahpra.gov.za
          </a>
          <br />
          Phone: <a href="tel:08006287" className="text-primary underline">0800-NCTS (6287)</a>
          <br />
          <br />
          All accessibility feedback is reviewed and addressed within 10 working
          days.
        </p>
      </div>
    </div>
  );
}

export default AccessibilityPage;
