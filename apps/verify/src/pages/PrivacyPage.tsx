function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: 1 February 2026</p>

      <div className="prose prose-slate max-w-none space-y-6 text-slate-700">
        <p>
          The <strong>National Cannabis Tracking System (NCTS)</strong> Product
          Verification portal is operated by <strong>SAHPRA</strong> (South African
          Health Products Regulatory Authority). This portal is designed for public
          use to verify the authenticity of legal cannabis products.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Information We Collect</h2>
        <p>
          The Product Verification portal is designed to be privacy-preserving.
          When you verify a product, we collect only:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>The tracking ID you submit (to perform the lookup)</li>
          <li>Basic request metadata (IP address, timestamp) for security</li>
        </ul>
        <p>
          We do <strong>not</strong> require registration, login, or any personal
          information to use this service. No cookies are set beyond what is
          strictly necessary for the site to function.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">How We Use This Information</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>To provide product verification results</li>
          <li>To detect and prevent abuse or denial-of-service attacks</li>
          <li>To monitor system health and performance</li>
        </ul>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Data Protection</h2>
        <p>
          All data is processed in compliance with the Protection of Personal
          Information Act 4 of 2013 (POPIA). Data is encrypted in transit using
          TLS 1.3.
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Contact</h2>
        <p>
          For privacy-related queries, contact the SAHPRA Information Officer:
          <br />
          Email:{' '}
          <a href="mailto:privacy@sahpra.gov.za" className="text-primary underline">
            privacy@sahpra.gov.za
          </a>
          <br />
          Phone: <a href="tel:08006287" className="text-primary underline">0800-NCTS (6287)</a>
        </p>

        <h2 className="text-xl font-semibold text-slate-900 mt-8">Information Regulator</h2>
        <p>
          You may lodge a complaint with the Information Regulator (South Africa)
          at{' '}
          <a href="mailto:enquiries@inforegulator.org.za" className="text-primary underline">
            enquiries@inforegulator.org.za
          </a>
          .
        </p>
      </div>
    </div>
  );
}

export default PrivacyPage;
