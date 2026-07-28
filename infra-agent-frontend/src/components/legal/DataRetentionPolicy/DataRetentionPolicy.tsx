import { PolicyLayout } from "@/components/legal/PolicyLayout/PolicyLayout";
import styles from "@/components/legal/PolicyLayout/PolicyLayout.module.css";

export function DataRetentionPolicy() {
  return (
    <PolicyLayout title="Data Retention Policy" lastUpdated="March 25, 2026">
      <h2>1. Purpose</h2>
      <p>
        This Data Retention Policy defines how long Metrum AI retains different categories of data
        within the Infra Agents platform, and the procedures for secure deletion or anonymization
        once retention periods expire. The goal is to retain data only for as long as necessary to
        serve legitimate operational, legal, and compliance purposes.
      </p>

      <h2>2. General Principles</h2>
      <ul>
        <li>
          <strong>Minimization</strong> — We collect and retain only the data necessary for the
          stated purposes.
        </li>
        <li>
          <strong>Purpose limitation</strong> — Data is not retained beyond the period needed for
          its original purpose unless required by law.
        </li>
        <li>
          <strong>Secure disposal</strong> — Data that has reached the end of its retention period
          is securely deleted or irreversibly anonymized.
        </li>
        <li>
          <strong>Regular review</strong> — Retention schedules are reviewed annually and updated as
          requirements change.
        </li>
      </ul>

      <h2>3. Retention Schedule</h2>
      <p>
        The following table outlines retention periods for each category of data processed by the
        Infra Agents platform.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Data Category</th>
              <th>Retention Period</th>
              <th>Justification</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>User account data (name, email, role)</td>
              <td>Duration of account + 90 days</td>
              <td>Required for service delivery; 90-day grace period for account recovery</td>
            </tr>
            <tr>
              <td>Authentication tokens and sessions</td>
              <td>Session duration (configurable, default 24 hours)</td>
              <td>Short-lived tokens; expired sessions purged automatically</td>
            </tr>
            <tr>
              <td>Device onboarding records</td>
              <td>Duration of service agreement + 1 year</td>
              <td>Operational continuity and audit requirements for infrastructure inventory</td>
            </tr>
            <tr>
              <td>Infrastructure monitoring telemetry</td>
              <td>90 days (raw), 1 year (aggregated)</td>
              <td>
                Raw metrics for real-time monitoring; aggregated data for trend analysis and
                capacity planning
              </td>
            </tr>
            <tr>
              <td>Network topology and rack configurations</td>
              <td>Duration of service agreement</td>
              <td>
                Required for active infrastructure management; deleted upon contract termination
              </td>
            </tr>
            <tr>
              <td>AI evaluation traces (KyAI)</td>
              <td>180 days</td>
              <td>
                Model evaluation and observability; sufficient for performance benchmarking cycles
              </td>
            </tr>
            <tr>
              <td>Workflow execution logs</td>
              <td>1 year</td>
              <td>Operational audit trail for automated workflow actions and incident review</td>
            </tr>
            <tr>
              <td>API access logs</td>
              <td>1 year</td>
              <td>Security monitoring, anomaly detection, and regulatory compliance</td>
            </tr>
            <tr>
              <td>RBAC authorization audit trail</td>
              <td>2 years</td>
              <td>Security compliance, access reviews, and forensic investigation requirements</td>
            </tr>
            <tr>
              <td>Database backups (PostgreSQL)</td>
              <td>30 days (daily), 6 months (weekly)</td>
              <td>
                Disaster recovery; daily backups for recent recovery, weekly for longer-term
                resilience
              </td>
            </tr>
            <tr>
              <td>Object storage archives (MinIO)</td>
              <td>1 year</td>
              <td>Bulk upload files, exported reports, and configuration snapshots</td>
            </tr>
            <tr>
              <td>Vault secrets and credentials</td>
              <td>Until rotated or revoked</td>
              <td>Managed by HashiCorp Vault; automatic rotation policies enforced</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>4. Backup Retention</h2>
      <p>
        Backups are managed through the persistent stores infrastructure and follow a tiered
        schedule:
      </p>
      <h3>4.1 PostgreSQL Backups</h3>
      <ul>
        <li>
          <strong>Daily snapshots</strong> — Retained for 30 days. Automated via cron-based backup
          jobs in the Kubernetes cluster.
        </li>
        <li>
          <strong>Weekly snapshots</strong> — Retained for 6 months. Created every Sunday and stored
          in encrypted MinIO buckets.
        </li>
        <li>
          <strong>Pre-migration snapshots</strong> — Retained until the migration is verified and
          rolled out for at least 14 days.
        </li>
      </ul>

      <h3>4.2 Redis Cache</h3>
      <ul>
        <li>
          Redis is used as a transient cache. No long-term retention applies. Data is ephemeral and
          subject to eviction policies.
        </li>
      </ul>

      <h3>4.3 MinIO Object Storage</h3>
      <ul>
        <li>
          Lifecycle rules are configured per bucket. Default retention is 1 year with automatic
          expiration.
        </li>
        <li>Legal-hold buckets are exempt from automatic deletion until the hold is released.</li>
      </ul>

      <h2>5. Audit Trail Retention</h2>
      <p>The Infra Agents platform generates structured audit logs for the following events:</p>
      <ul>
        <li>
          <strong>RBAC decisions</strong> — Every API request is logged with the user identity,
          requested resource, action, and allow/deny outcome. Retained for 2 years.
        </li>
        <li>
          <strong>Administrative actions</strong> — Configuration changes, policy updates, and user
          management operations. Retained for 2 years.
        </li>
        <li>
          <strong>System events</strong> — Service startups, failures, scaling events, and health
          check results. Retained for 1 year.
        </li>
      </ul>

      <div className={styles.callout}>
        <p>
          Audit logs are stored in append-only format and are protected against tampering. Access to
          audit data requires Platform Admin or Infra Admin role privileges.
        </p>
      </div>

      <h2>6. Data Deletion Procedures</h2>
      <h3>6.1 Automated Deletion</h3>
      <p>Time-based retention policies are enforced automatically using:</p>
      <ul>
        <li>PostgreSQL scheduled jobs for row-level TTL enforcement.</li>
        <li>MinIO lifecycle rules for object expiration.</li>
        <li>Redis TTL-based key expiration for cache entries.</li>
      </ul>

      <h3>6.2 Manual Deletion Requests</h3>
      <p>
        Data subjects may request deletion of their personal data (right to erasure) by contacting{" "}
        <a href="mailto:privacy@metrum.ai">privacy@metrum.ai</a>. Upon receiving a valid request, we
        will:
      </p>
      <ol>
        <li>Verify the identity of the requester.</li>
        <li>Identify all instances of the subject&apos;s personal data across platform modules.</li>
        <li>Delete or anonymize the data within 30 days.</li>
        <li>Confirm deletion in writing to the data subject.</li>
      </ol>
      <p>
        Certain data may be exempt from deletion where retention is required by law (e.g., audit
        trails for regulatory compliance). In such cases, we will inform the data subject of the
        exemption and the applicable retention period.
      </p>

      <h3>6.3 Secure Disposal Methods</h3>
      <ul>
        <li>
          <strong>Database records</strong> — Cryptographic erasure or overwrite followed by vacuum
          operations.
        </li>
        <li>
          <strong>Object storage</strong> — Permanent deletion with version purge in MinIO.
        </li>
        <li>
          <strong>Backups</strong> — Expired backups are overwritten according to the backup
          rotation schedule. Specific deletion from backups is handled during the next rotation
          cycle.
        </li>
      </ul>

      <h2>7. Tenant Data Upon Contract Termination</h2>
      <p>When a customer organization terminates its service agreement:</p>
      <ol>
        <li>
          All tenant-scoped data is exported and delivered to the Controller upon request (within 30
          days).
        </li>
        <li>All tenant data is permanently deleted within 90 days of contract termination.</li>
        <li>A deletion certificate is issued to the Controller confirming data disposal.</li>
      </ol>

      <h2>8. Policy Review</h2>
      <p>
        This retention policy is reviewed annually by the Data Protection Officer in consultation
        with engineering and legal teams. Changes are communicated to customers through the platform
        and direct notification to account administrators.
      </p>

      <h2>9. Contact</h2>
      <p>For questions about data retention or to request data deletion, contact:</p>
      <ul>
        <li>
          Email: <a href="mailto:privacy@metrum.ai">privacy@metrum.ai</a>
        </li>
        <li>Subject: Data Retention Inquiry</li>
      </ul>
    </PolicyLayout>
  );
}

export default DataRetentionPolicy;
