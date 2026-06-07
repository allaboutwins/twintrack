export default function Terms() {
  return (
    <div style={{ fontFamily: "'Quicksand', sans-serif", background: "#fafafa", minHeight: "100dvh" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40, borderBottom: "2px solid #f0e0f0", paddingBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>💕</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#e91e8c" }}>TwinTrack</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#1a1a2e", margin: "0 0 8px" }}>Terms of Service</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>
            Effective Date: June 4, 2026 &nbsp;·&nbsp; Last Updated: June 4, 2026
          </p>
        </div>

        <div style={{ color: "#333", lineHeight: 1.75, fontSize: 15 }}>
          <Section title="1. Acceptance of Terms">
            <p>By creating an account or using TwinTrack ("the App"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the App.</p>
            <p>These Terms are a legal agreement between you and <strong>All About Twins LLC</strong> ("Company," "we," "us").</p>
          </Section>

          <Section title="2. Description of Service">
            <p>TwinTrack is a mobile and web application that helps parents of twins track sleep, feeding, diapers, routines, and milestones. The App is provided "as is" for personal, non-commercial use.</p>
          </Section>

          <Section title="3. Accounts & Eligibility">
            <ul>
              <li>You must be at least <strong>18 years old</strong> to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You may not share your account with others or create accounts for third parties without their consent.</li>
              <li>One person may have one account. Multiple accounts for the same person are not permitted.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the App for any unlawful purpose</li>
              <li>Attempt to access other users' accounts or data</li>
              <li>Reverse engineer, decompile, or disassemble any part of the App</li>
              <li>Upload malicious code, spam, or abusive content</li>
              <li>Use the App in any way that disrupts our systems or other users</li>
              <li>Scrape or harvest data from the App</li>
            </ul>
          </Section>

          <Section title="5. Your Data">
            <ul>
              <li>You retain ownership of all tracking data you enter (sleep logs, feeds, diapers, milestones).</li>
              <li>You grant us a limited license to store, process, and display your data solely to provide the service.</li>
              <li>You may export or delete your data at any time. See our <a href="/privacy" style={{ color: "#e91e8c" }}>Privacy Policy</a>.</li>
            </ul>
          </Section>

          <Section title="5a. Community Content">
            <p>TwinTrack includes community features (polls, Q&amp;A, feedback). By submitting Community Content you agree that:</p>
            <ul>
              <li>Your Community Content may be visible to other TwinTrack users within the app.</li>
              <li>You are solely responsible for content you submit. Do not post sensitive personal information, identifying details about your children, or content that violates others' rights.</li>
              <li>You grant All About Twins LLC a non-exclusive, royalty-free license to display your Community Content to other users within the service.</li>
              <li>We may remove Community Content at our sole discretion without notice.</li>
            </ul>
          </Section>

          <Section title="5b. Subscriptions & In-App Purchases">
            <ul>
              <li>TwinTrack offers optional premium subscriptions that unlock additional features.</li>
              <li>All purchases are processed through Apple App Store or Google Play. By making a purchase you also agree to Apple's or Google's terms of service.</li>
              <li>Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.</li>
              <li>You may manage or cancel subscriptions in your device's App Store or Google Play account settings.</li>
              <li>We do not store payment card information. Billing is handled entirely by Apple or Google.</li>
              <li>Refunds are subject to Apple's or Google's refund policies. Contact Apple Support or Google Play Support for billing issues.</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <ul>
              <li>The App, its design, branding (including the TwinTrack name and All About Twins brand), source code, and content are owned by All About Twins LLC.</li>
              <li>You may not copy, distribute, modify, or create derivative works of any part of the App without written permission.</li>
            </ul>
          </Section>

          <Section title="7. Disclaimers">
            <div style={{ background: "#fff8fb", border: "2px solid #ffd0e8", borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
              <strong style={{ color: "#e91e8c" }}>TwinTrack is not a medical device.</strong> The App is a convenience tool for personal tracking. It is not intended to diagnose, treat, cure, or prevent any medical condition. Do not rely on TwinTrack as a substitute for professional medical advice.
            </div>
            <p style={{ textTransform: "uppercase", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p style={{ textTransform: "uppercase", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, ALL ABOUT TWINS LLC SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p style={{ textTransform: "uppercase", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR THE APP SHALL NOT EXCEED $100 USD OR THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, WHICHEVER IS GREATER.
            </p>
          </Section>

          <Section title="9. Indemnification">
            <p>You agree to indemnify and hold harmless All About Twins LLC and its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including attorneys' fees) arising from your use of the App or violation of these Terms.</p>
          </Section>

          <Section title="10. Termination">
            <ul>
              <li>You may delete your account at any time via Settings → Delete Account.</li>
              <li>We may suspend or terminate your account if you violate these Terms, with or without notice.</li>
              <li>Upon termination, your right to use the App ceases and we may delete your data per our Privacy Policy.</li>
            </ul>
          </Section>

          <Section title="11. Changes to Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes via in-app notice or email. Continued use after the effective date of changes constitutes acceptance.</p>
          </Section>

          <Section title="12. Governing Law & Disputes">
            <p>These Terms are governed by the laws of the United States, without regard to conflict-of-law provisions.</p>
            <p>Any disputes shall be resolved through binding arbitration under the rules of the American Arbitration Association, except that either party may seek injunctive relief in court for intellectual property disputes. <strong>You waive the right to participate in class action lawsuits.</strong></p>
          </Section>

          <Section title="13. Contact">
            <p>
              <strong>All About Twins LLC</strong><br />
              Email: <a href="mailto:contact@allaboutwins.com" style={{ color: "#e91e8c" }}>contact@allaboutwins.com</a><br />
              Website: <a href="https://allaboutwins.com" style={{ color: "#e91e8c" }}>allaboutwins.com</a>
            </p>
          </Section>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid #f0f0f0", textAlign: "center" }}>
          <a href="/privacy" style={{ color: "#e91e8c", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>Privacy Policy</a>
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
