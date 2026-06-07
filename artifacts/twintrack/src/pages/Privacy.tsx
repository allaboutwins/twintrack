export default function Privacy() {
  return (
    <div style={{ fontFamily: "'Quicksand', sans-serif", background: "#fafafa", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "2px solid #f0e0f0", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>💕</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#e91e8c" }}>TwinTrack</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#1a1a2e", margin: "0 0 8px" }}>Privacy Policy</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>
            Effective Date: June 4, 2026 &nbsp;·&nbsp; Last Updated: June 4, 2026
          </p>
        </div>

        <div style={{ color: "#333", lineHeight: 1.75, fontSize: 15 }}>
          <Section title="Who We Are">
            <p>TwinTrack ("TwinTrack," "we," "us," or "our") is operated by All About Twins LLC. We built TwinTrack to help parents of twins track their babies' sleep, feeding, diapers, routines, and milestones.</p>
            <p>Contact: <a href="mailto:contact@allaboutwins.com" style={{ color: "#e91e8c" }}>contact@allaboutwins.com</a></p>
          </Section>

          <Section title="What Information We Collect">
            <SubHeading>Information You Provide</SubHeading>
            <ul>
              <li><strong>Account Information:</strong> Your name and email address when you sign up (via Clerk authentication).</li>
              <li><strong>Twin Profiles:</strong> Names, genders, and birthdates you enter for your twins.</li>
              <li><strong>Tracking Data:</strong> Sleep sessions, feeding logs, diaper logs, routines, and milestones you record.</li>
              <li><strong>Community Content:</strong> Questions, answers, poll responses, and other content you submit in community features.</li>
              <li><strong>Feedback:</strong> Messages you submit through the in-app feedback form.</li>
            </ul>
            <SubHeading>Information Collected Automatically</SubHeading>
            <ul>
              <li><strong>Usage Analytics:</strong> Pages visited, features used, session duration (via PostHog, anonymized/pseudonymized).</li>
              <li><strong>Push Notification Token:</strong> If you grant notification permission, your device's push token is stored to send you reminders.</li>
              <li><strong>Error Reports:</strong> Anonymous crash and error data to help us fix bugs.</li>
            </ul>
            <SubHeading>Information We Do NOT Collect</SubHeading>
            <ul>
              <li>Precise location</li>
              <li>Contacts or address book</li>
              <li>Health records from Apple HealthKit or Google Fit (unless explicitly integrated in a future update)</li>
              <li>Payment card information (payments are handled entirely by Apple App Store or Google Play)</li>
              <li>Data from children — TwinTrack is a tool for parents, not for children</li>
            </ul>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use your information solely to:</p>
            <ul>
              <li>Provide the TwinTrack service (store and sync your tracking data)</li>
              <li>Display community content to other TwinTrack users (see Community Content section below)</li>
              <li>Send push notifications you've opted into (reminders, daily summaries)</li>
              <li>Understand how features are used to improve the app</li>
              <li>Respond to your feedback and support requests</li>
              <li>Maintain security and prevent abuse</li>
            </ul>
            <p><strong>We never:</strong></p>
            <ul>
              <li>Sell your personal data to third parties</li>
              <li>Use your data for advertising targeting</li>
              <li>Share identifying information with any third party except as described below</li>
            </ul>
          </Section>

          <Section title="Community Content">
            <p>TwinTrack includes community features where you may submit questions, answers, poll responses, feedback, and other content ("Community Content"). By submitting Community Content, you acknowledge that:</p>
            <ul>
              <li>Community Content you submit may be visible to other TwinTrack users within the app.</li>
              <li>You are solely responsible for the content you submit. Do not share sensitive personal information, identifying details about your children, or content that violates others' rights.</li>
              <li>We reserve the right to remove Community Content that violates our Terms of Service or that we deem inappropriate, at our sole discretion.</li>
              <li>Community Content is associated with your account and may be deleted when you delete your account.</li>
            </ul>
          </Section>

          <Section title="Payments & Subscriptions">
            <p>TwinTrack offers optional premium subscriptions. All payment processing is handled exclusively by Apple App Store (for iOS) or Google Play (for Android).</p>
            <ul>
              <li><strong>We do not store payment card numbers, billing addresses, or any payment instrument details.</strong></li>
              <li>Purchase receipts and subscription status are managed by Apple or Google directly.</li>
              <li>Subscription management and cancellation are handled through your device's App Store or Google Play account settings.</li>
              <li>For billing questions, contact Apple Support or Google Play Support directly.</li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>We share data only with:</p>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "#f8f0ff", borderBottom: "2px solid #e91e8c22" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#1a1a2e" }}>Recipient</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#1a1a2e" }}>Purpose</th>
                  <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, color: "#1a1a2e" }}>Data Shared</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Clerk", "Authentication", "Email, name, session tokens"],
                  ["PostHog", "Product analytics", "Pseudonymized usage events"],
                  ["Apple App Store / Google Play", "Payment processing", "Purchase transactions only"],
                  ["PostgreSQL database", "Data storage", "All app data, encrypted at rest"],
                  ["Hosting provider", "Infrastructure", "Encrypted in transit"],
                ].map(([r, p, d], i) => (
                  <tr key={r} style={{ background: i % 2 === 0 ? "#fff" : "#faf5ff", borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700 }}>{r}</td>
                    <td style={{ padding: "10px 12px" }}>{p}</td>
                    <td style={{ padding: "10px 12px", color: "#555" }}>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>All third-party services are contractually bound to protect your data and may not use it for their own purposes.</p>
          </Section>

          <Section title="Data Retention">
            <ul>
              <li>Your account and all associated data is retained while your account is active.</li>
              <li>You may delete your account and all data at any time via Settings → Delete Account.</li>
              <li>After account deletion, data is purged within 30 days from all production systems and within 90 days from backups.</li>
            </ul>
          </Section>

          <Section title="Your Rights">
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li><strong>Access</strong> the data we hold about you</li>
              <li><strong>Correct</strong> inaccurate data</li>
              <li><strong>Delete</strong> your account and all data</li>
              <li><strong>Export</strong> your tracking data (contact us)</li>
              <li><strong>Opt out</strong> of analytics by contacting us</li>
            </ul>
            <p>To exercise these rights, email <a href="mailto:contact@allaboutwins.com" style={{ color: "#e91e8c" }}>contact@allaboutwins.com</a>.</p>
            <SubHeading>California Residents (CCPA)</SubHeading>
            <p>We do not sell personal information. California residents may submit requests to know, delete, or opt out via the contact above.</p>
            <SubHeading>European / UK Residents (GDPR / UK GDPR)</SubHeading>
            <p>Our lawful basis for processing is <strong>contract performance</strong> (providing the app you signed up for) and <strong>legitimate interests</strong> (product improvement via analytics). You have the right to lodge a complaint with your local supervisory authority.</p>
          </Section>

          <Section title="Children's Privacy">
            <p>TwinTrack is designed for use by adults (parents and caregivers). We do not knowingly collect information from children under 13. If you believe a child under 13 has created an account, contact us at <a href="mailto:contact@allaboutwins.com" style={{ color: "#e91e8c" }}>contact@allaboutwins.com</a> and we will delete it promptly.</p>
          </Section>

          <Section title="Security">
            <p>We protect your data using:</p>
            <ul>
              <li>TLS 1.3 encryption for all data in transit</li>
              <li>Encrypted-at-rest PostgreSQL database</li>
              <li>Clerk's industry-standard authentication (including MFA support)</li>
              <li>Access controls and regular security reviews</li>
            </ul>
            <p>No method of transmission over the internet is 100% secure. We do our best to protect your data, but cannot guarantee absolute security.</p>
          </Section>

          <Section title="Push Notifications">
            <p>If you grant notification permission, we use your device push token to send:</p>
            <ul>
              <li>Feed and nap reminders (if enabled in Settings)</li>
              <li>Daily summary notifications (if enabled)</li>
            </ul>
            <p>You can withdraw permission at any time in your device Settings or by toggling notifications off in TwinTrack Settings. We never send marketing messages without explicit opt-in.</p>
          </Section>

          <Section title="Changes to This Policy">
            <p>We will notify you of material changes by posting a notice in the app or emailing you. Continued use of TwinTrack after changes constitutes acceptance.</p>
          </Section>

          <Section title="Contact">
            <p>
              <strong>All About Twins LLC</strong><br />
              Email: <a href="mailto:contact@allaboutwins.com" style={{ color: "#e91e8c" }}>contact@allaboutwins.com</a><br />
              Website: <a href="https://allaboutwins.com" style={{ color: "#e91e8c" }}>allaboutwins.com</a>
            </p>
          </Section>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
          <a href="/terms" style={{ color: "#e91e8c", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Terms of Service</a>
          <span style={{ color: "#ccc", margin: "0 12px" }}>·</span>
          <a href="mailto:contact@allaboutwins.com" style={{ color: "#888", fontSize: 14, textDecoration: "none" }}>Contact Us</a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", borderLeft: "4px solid #e91e8c", paddingLeft: 12, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#555", marginTop: 16, marginBottom: 8 }}>{children}</h3>
  );
}
