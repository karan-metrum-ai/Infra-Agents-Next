import { PolicyLayout } from "@/components/legal/PolicyLayout/PolicyLayout";
import styles from "@/components/legal/PolicyLayout/PolicyLayout.module.css";

export function DataProcessingAgreement() {
  return (
    <PolicyLayout title="Data Processing Agreement" lastUpdated="March 25, 2026">
      <h2>1. Purpose and Scope</h2>
      <p>
        This Data Processing Agreement (&quot;DPA&quot;) forms part of the service agreement between
        Metrum AI (&quot;Processor&quot;) and the customer organization (&quot;Controller&quot;) for
        the provision of the Infra Agents platform. It governs the processing of personal data by
        the Processor on behalf of the Controller in accordance with Article 28 of the GDPR.
      </p>
      <p>
        This DPA applies to all personal data processed through the Infra Agents platform, including
        but not limited to device onboarding, infrastructure monitoring, AI evaluation, and team
        deployment services.
      </p>

      <h2>2. Definitions</h2>
      <ul>
        <li>
          <strong>&quot;Personal Data&quot;</strong> — Any information relating to an identified or
          identifiable natural person, as defined by Article 4(1) of the GDPR.
        </li>
        <li>
          <strong>&quot;Processing&quot;</strong> — Any operation performed on personal data,
          including collection, storage, alteration, retrieval, consultation, use, disclosure, or
          erasure.
        </li>
        <li>
          <strong>&quot;Sub-processor&quot;</strong> — A third party engaged by the Processor to
          process personal data on behalf of the Controller.
        </li>
      </ul>

      <h2>3. Data Processing Details</h2>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Subject matter</td>
              <td>
                Infrastructure management, device onboarding, monitoring, AI evaluation, and team
                deployment
              </td>
            </tr>
            <tr>
              <td>Duration</td>
              <td>For the term of the service agreement</td>
            </tr>
            <tr>
              <td>Nature and purpose</td>
              <td>
                Automated infrastructure discovery, telemetry collection, role-based access
                management, and AI-driven operational insights
              </td>
            </tr>
            <tr>
              <td>Types of personal data</td>
              <td>
                User identity (name, email, role), device identifiers (IPs, hostnames, serial
                numbers), API access logs, authorization audit trails
              </td>
            </tr>
            <tr>
              <td>Categories of data subjects</td>
              <td>Platform users (admins, operators, viewers), system service principals</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>4. Obligations of the Processor</h2>
      <p>Metrum AI, as the Processor, shall:</p>
      <ol>
        <li>
          Process personal data only on documented instructions from the Controller, unless required
          to do so by applicable law.
        </li>
        <li>
          Ensure that persons authorized to process the personal data have committed to
          confidentiality or are under an appropriate statutory obligation of confidentiality.
        </li>
        <li>
          Implement appropriate technical and organizational measures to ensure a level of security
          appropriate to the risk, including:
          <ul>
            <li>
              Mutual TLS (mTLS) encryption for all inter-service communication via Istio service
              mesh.
            </li>
            <li>AES-256 encryption at rest for PostgreSQL databases and MinIO object storage.</li>
            <li>JWT-based authentication validated at the Istio ingress gateway.</li>
            <li>PyCasbin RBAC with default-deny policy across all 86+ API endpoints.</li>
            <li>Secrets management via HashiCorp Vault with automatic rotation.</li>
          </ul>
        </li>
        <li>
          Assist the Controller in responding to data subject requests (access, rectification,
          erasure, portability) within the timelines required by law.
        </li>
        <li>
          Delete or return all personal data to the Controller upon termination of the service
          agreement, unless retention is required by law.
        </li>
        <li>
          Make available to the Controller all information necessary to demonstrate compliance with
          the obligations set out in this DPA.
        </li>
      </ol>

      <h2>5. Obligations of the Controller</h2>
      <p>The Controller shall:</p>
      <ol>
        <li>
          Ensure it has a lawful basis for processing personal data through the Infra Agents
          platform.
        </li>
        <li>
          Provide documented processing instructions to the Processor and notify the Processor
          immediately if it believes an instruction infringes applicable data protection law.
        </li>
        <li>
          Be responsible for the accuracy, quality, and legality of personal data provided to the
          Processor.
        </li>
      </ol>

      <h2>6. Sub-processors</h2>
      <p>The Controller authorizes the following categories of sub-processors:</p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Sub-processor</th>
              <th>Purpose</th>
              <th>Data Processed</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Auth0 (Okta)</td>
              <td>Identity and access management</td>
              <td>User email, name, authentication tokens, session data</td>
            </tr>
            <tr>
              <td>PostgreSQL (self-hosted / managed)</td>
              <td>Persistent data storage for all platform modules</td>
              <td>Device data, user records, RBAC policies, audit logs</td>
            </tr>
            <tr>
              <td>HashiCorp Vault</td>
              <td>Secrets and credential management</td>
              <td>Encrypted credentials, API keys, certificates</td>
            </tr>
            <tr>
              <td>Redis</td>
              <td>Caching and real-time data</td>
              <td>Session cache, temporary telemetry data</td>
            </tr>
            <tr>
              <td>MinIO</td>
              <td>Object storage</td>
              <td>Backup archives, bulk upload files, exported reports</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        The Processor shall notify the Controller at least 30 days in advance of any intended
        changes to sub-processors. The Controller may object to such changes. If the parties cannot
        resolve the objection, the Controller may terminate the affected services.
      </p>

      <h2>7. Data Breach Notification</h2>
      <p>
        The Processor shall notify the Controller without undue delay, and in any case within 48
        hours, after becoming aware of a personal data breach. The notification shall include:
      </p>
      <ol>
        <li>A description of the nature of the breach.</li>
        <li>The categories and approximate number of data subjects and records affected.</li>
        <li>Likely consequences of the breach.</li>
        <li>Measures taken or proposed to address the breach and mitigate its effects.</li>
      </ol>

      <h2>8. Audit Rights</h2>
      <p>
        The Controller has the right to conduct audits, including inspections, to verify the
        Processor&apos;s compliance with this DPA. The Processor shall:
      </p>
      <ul>
        <li>
          Provide access to relevant facilities, systems, and documentation upon reasonable notice.
        </li>
        <li>Allow audits by the Controller or a mutually agreed-upon third-party auditor.</li>
        <li>Cooperate fully and provide any information reasonably requested during the audit.</li>
      </ul>

      <div className={styles.callout}>
        <p>
          The Infra Agents platform maintains structured audit logs for all RBAC authorization
          decisions (allow/deny), API access, and administrative actions. These logs are available
          to Controllers for compliance review upon request.
        </p>
      </div>

      <h2>9. International Transfers</h2>
      <p>
        Where personal data is transferred outside the EEA, the Processor shall ensure appropriate
        safeguards as required by Chapter V of the GDPR, including Standard Contractual Clauses
        (Module 2: Controller to Processor), supplementary measures where necessary, and transfer
        impact assessments.
      </p>

      <h2>10. Liability and Indemnification</h2>
      <p>
        Each party&apos;s liability under this DPA is subject to the limitations and exclusions of
        liability set out in the underlying service agreement. Nothing in this DPA limits either
        party&apos;s liability for breaches of data protection law to data subjects.
      </p>

      <h2>11. Term and Termination</h2>
      <p>
        This DPA shall remain in effect for the duration of the service agreement. Upon termination,
        the Processor shall, at the Controller&apos;s election, delete or return all personal data
        within 90 days and certify deletion in writing, unless applicable law requires retention.
      </p>

      <h2>12. Contact</h2>
      <p>
        For questions about this Data Processing Agreement, or to request a signed copy, contact:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:privacy@metrum.ai">privacy@metrum.ai</a>
        </li>
        <li>Subject: Data Processing Agreement — [Your Organization]</li>
      </ul>
    </PolicyLayout>
  );
}

export default DataProcessingAgreement;
