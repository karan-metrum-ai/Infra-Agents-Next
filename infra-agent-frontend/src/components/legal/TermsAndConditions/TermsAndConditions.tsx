import Link from "next/link";
import { PolicyLayout } from "@/components/legal/PolicyLayout/PolicyLayout";
import styles from "@/components/legal/PolicyLayout/PolicyLayout.module.css";

export function TermsAndConditions() {
  return (
    <PolicyLayout title="Terms and Conditions" lastUpdated="January 2026">
      <p>
        <strong>TERMS AND CONDITIONS / END USER LICENSE AGREEMENT</strong>
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the Metrum Insights platform (&quot;Service&quot;), you agree to be
        bound by these Terms and Conditions (&quot;Terms&quot;). If you do not agree to these Terms,
        do not use the Service.
      </p>

      <h2>2. License Grant</h2>
      <p>
        Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
        non-transferable, revocable license to access and use the Service for your business
        purposes.
      </p>

      <h2>3. Privacy Policy</h2>
      <p>
        Your use of the Service is subject to our <Link href="/privacy-policy">Privacy Policy</Link>
        , which is available separately and describes how we collect, use, and share information
        about you. The Privacy Policy is incorporated by reference into these Terms.
      </p>

      <h2>4. User Content and Data</h2>
      <p>
        You retain all rights to any data or content you submit through the Service. By providing
        data, you grant us a limited license to process and analyze such data to provide the
        Service.
      </p>

      <h2>5. Prohibited Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any illegal purpose</li>
        <li>Attempt to reverse engineer or compromise the Service</li>
        <li>Share your account credentials with unauthorized parties</li>
        <li>Use the Service in any manner that could damage our systems</li>
      </ul>

      <h2>6. Third-Party Integrations</h2>
      <p>
        The Service may integrate with third-party platforms. Your use of such integrations is
        subject to their respective terms and conditions.
      </p>

      <h2>7. Disclaimer of Warranties</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any kind, either express or
        implied, including but not limited to warranties regarding benchmark accuracy, performance
        results, or fitness for a particular purpose.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        In no event shall Metrum AI be liable for any indirect, incidental, special, or
        consequential damages, including but not limited to damages resulting from reliance on
        benchmark results or performance data.
      </p>

      <h2>9. Termination</h2>
      <p>We may terminate your access to the Service at any time for violation of these Terms.</p>

      <h2>10. Governing Law</h2>
      <p>These Terms shall be governed by the laws of Delaware, United States.</p>

      <h2>11. Changes to Terms</h2>
      <p>
        We reserve the right to modify these Terms at any time. Continued use of the Service after
        such modifications constitutes acceptance of the updated Terms.
      </p>

      <h2>12. Contact Us</h2>
      <p>
        If you have any questions about these Terms, please contact us at:{" "}
        <a href="mailto:contact@metrum.ai">contact@metrum.ai</a>
      </p>

      <div className={styles.callout}>
        <p>
          By using the Service, you acknowledge that you have read, understood, and agree to be
          bound by these Terms.
        </p>
      </div>
    </PolicyLayout>
  );
}

export default TermsAndConditions;
