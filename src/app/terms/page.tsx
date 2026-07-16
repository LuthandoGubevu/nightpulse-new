
import Link from "next/link";
import { PageHeader } from "@/components/common/PageHeader";
import { Icons } from "@/components/icons";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold font-headline">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
    </section>
  );
}

export const metadata = {
  title: "Terms of Service & Privacy Notice — Vybi",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4 space-y-10">
      <PageHeader
        title="Terms of Service & Privacy Notice"
        description="Last updated 16 July 2026"
      />

      <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 flex gap-3 text-sm text-accent-foreground/90">
        <Icons.shieldCheck className="h-5 w-5 flex-shrink-0 text-accent" />
        <p className="text-muted-foreground">
          This page is being finalized alongside our legal counsel ahead of full public launch,
          so a couple of business-specific details (like our formal dispute-resolution process)
          are still being confirmed. Everything about how your data is used, and how Meet&nbsp;Me
          works, is accurate today. Questions in the meantime:{" "}
          <a href="mailto:hello@nightpulse.app" className="text-accent underline">
            hello@nightpulse.app
          </a>
          .
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Welcome to Vybi. These Terms of Service, together with the Privacy Notice and Meet&nbsp;Me
        Special Terms below (together, the <strong className="text-foreground">&ldquo;Terms&rdquo;</strong>),
        form a binding agreement between you and Vybi (<strong className="text-foreground">&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;</strong>)
        governing your access to and use of the Vybi website, progressive web app, and any related
        services (together, the <strong className="text-foreground">&ldquo;Service&rdquo;</strong>).
      </p>
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">
          By creating an account, checking the &ldquo;I agree&rdquo; box at sign-up, or otherwise using the Service,
          you confirm that you have read, understood, and agree to be bound by these Terms. If you do not agree,
          do not create an account or use the Service.
        </strong>
      </p>

      <Section id="eligibility" title="1. Eligibility">
        <p>
          You must be <strong>at least 18 years old</strong> to create a Vybi account or use any part of the
          Service. This applies to the entire Service, not only Meet&nbsp;Me — Vybi is a nightlife-oriented
          product not intended for minors.
        </p>
        <p>By creating an account you represent that you are 18 or older, have the legal capacity to agree to these Terms, and that your registration information is accurate and complete.</p>
        <p>
          Vybi does not knowingly collect personal information from anyone under 18. If we become aware that we
          have, we will delete it and terminate the associated account. If you believe a user is under 18, please
          report it to <a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a>.
        </p>
      </Section>

      <Section id="the-service" title="2. The Service, in plain terms">
        <p>Vybi provides:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Crowd insights</strong>: live and historical information about how busy participating venues are, based on anonymized/aggregated location check-ins.</li>
          <li><strong>Meet Me</strong>: an entirely optional, opt-in feature that lets you become discoverable to other opted-in users physically present at the same venue, so you can express mutual interest and, if matched, chat within the app.</li>
          <li><strong>Safety Ratings</strong>: a feature allowing signed-in users to rate how safe a venue felt, shown as a community average.</li>
        </ul>
        <p>
          Crowd-level, wait-time, and safety-rating figures are estimates based on user and device data — they are
          <strong> not guarantees</strong> and may be inaccurate, delayed, or unavailable. See Section 8 (Disclaimers).
        </p>
      </Section>

      <Section id="your-account" title="3. Your Account">
        <p>You're responsible for keeping your login credentials confidential and for all activity under your account.</p>
        <p>You may sign up with email/password or Google Sign-In. Using Google Sign-In also means you agree to Google's own terms governing that sign-in method.</p>
        <p>Notify us promptly at <a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a> if you become aware of unauthorized use of your account. Don't create an account on behalf of someone else or use a false identity.</p>
      </Section>

      <Section id="data" title="4. Data We Collect and How We Use It">
        <p className="text-foreground font-medium">4.1. Information you give us directly</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information</strong>: your email address, and if you sign up with Google, your name and profile photo as provided by Google.</li>
          <li><strong>Meet Me profile information</strong> (only if you opt in): a display name, one profile photo, your age, your gender, and what you're looking for at a given venue (Friends or Love). Provided voluntarily, only if you use Meet&nbsp;Me.</li>
          <li><strong>Account-level age</strong>: we may separately, optionally ask any signed-in user for their age to compile aggregate demographic reporting for venue partners. You can decline this at any time without affecting the rest of the Service.</li>
          <li><strong>Safety ratings</strong> you submit, and <strong>chat messages</strong> you send through Meet&nbsp;Me to matched users.</li>
          <li><strong>Reports</strong> you submit about another user, including your stated reason.</li>
        </ul>
        <p className="text-foreground font-medium">4.2. Information collected automatically</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Precise location data</strong>, while the Service is open and location permission is granted, to determine which venue's geofence you're in and to power live crowd counts and Meet&nbsp;Me availability. This stops the moment you deny or revoke location permission.</li>
          <li>A locally generated <strong>device identifier</strong>, used to associate anonymous crowd-count &ldquo;heartbeats&rdquo; with a device, independent of whether you're signed in.</li>
          <li><strong>Visit/session data</strong> — how long your device is detected at a venue, and whether a visit is new or returning — used for the analytics described below.</li>
          <li>General <strong>usage data</strong> to maintain and improve the Service.</li>
        </ul>
        <p className="text-foreground font-medium">4.3. How we use this information</p>
        <p>To operate the Service (live counts, ratings, Meet&nbsp;Me matching/chat); to compile <strong>aggregate, venue-level analytics</strong> (busiest hours, average visit duration, new-vs-returning mix, age-bracket demographics) which we may share with venues — always aggregated, never disclosing your individual identity; to maintain safety and enforce these Terms; to market Vybi to you where you've opted in (Section 5); and to comply with legal obligations.</p>
        <p className="text-foreground font-medium">4.4. Sharing your information</p>
        <p>We do not sell your personal information. We share it: with <strong>other Meet Me users</strong>, limited to the minimal profile shown to them while you're opted in; with <strong>venues</strong>, only as aggregated, de-identified analytics; with <strong>service providers</strong> (currently Google/Firebase for auth, database, storage, and hosting) under confidentiality obligations; and where required by law.</p>
        <p className="text-foreground font-medium">4.5. Your rights</p>
        <p>Subject to applicable law (including POPIA, where you're in South Africa), you can request access to, correction of, or deletion of your personal information, and object to direct marketing at any time, free of charge, by contacting <a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a>.</p>
        <p className="text-foreground font-medium">4.6. Retention and deletion</p>
        <p>We retain your data while your account is active. If you delete your account, we delete or anonymize your personal information, except where we must retain records for legal or open-safety-report reasons, or where data is already irreversibly aggregated.</p>
      </Section>

      <Section id="consent" title="5. Consent to Location Tracking, Analytics & Marketing">
        <p><strong>This is your explicit consent for the tracking and marketing described below.</strong></p>
        <p><strong className="text-foreground">Location tracking.</strong> Granting location permission means you consent to us collecting your precise device location on an ongoing basis while the Service is open, for the purposes in Section 4. Withdraw this anytime in your browser/device settings — doing so disables live crowd-count and Meet&nbsp;Me functionality, which depend on it.</p>
        <p><strong className="text-foreground">Analytics and profiling.</strong> You consent to us using your usage, location, and (if provided) demographic data to generate the aggregate, de-identified analytics described in 4.3, including sharing it with venue partners.</p>
        <p><strong className="text-foreground">Marketing communications.</strong> By checking the marketing-consent box at sign-up (or later, in account settings), you consent to receive marketing emails, push notifications, or in-app messages about new features, venues, or offers. This is <strong>optional</strong> and separate from your ability to use the Service — withdraw it anytime via the unsubscribe link, your notification settings, or by contacting us. Withdrawing marketing consent doesn't affect operational messages (security, safety, or Terms-change notices), which we may still send.</p>
      </Section>

      <Section id="safety-ratings" title="6. Safety Ratings">
        <p>Safety ratings reflect a rating user's subjective opinion at a point in time — they are not a certification or guarantee of a venue's safety. Don't submit a rating that's false or intended to manipulate a venue's score.</p>
      </Section>

      <Section id="meet-me" title="7. Meet Me — Special Terms">
        <p>
          <strong>Meet Me is an entirely optional feature that facilitates in-person meetings between users.
          It carries risks different from, and greater than, the rest of the Service. Please read this section in full.</strong>
        </p>
        <p className="text-foreground font-medium">Opt-in only.</p>
        <p>Meet Me is off by default. You're only discoverable if you affirmatively opt in at a venue, and you can opt out — becoming invisible immediately — at any time, or by leaving the venue's geofence.</p>
        <p className="text-foreground font-medium">What others can see about you.</p>
        <p>While opted in, other opted-in users at the same venue can see your display name, age, one photo, and whether you're looking for Friends or Love. We do not disclose your exact location, contact details, or any other account information to other users.</p>
        <p className="text-foreground font-medium">No identity verification, no background checks.</p>
        <p><strong>We do not verify the identity, age, criminal history, or intentions of any user</strong>, beyond the age they self-report. Any information a user provides about themselves may be false.</p>
        <p className="text-foreground font-medium">Matching requires mutual interest.</p>
        <p>Two users must each independently express interest before a chat unlocks. This reduces unwanted contact, but is a matching mechanism, not a safety guarantee.</p>
        <p className="text-foreground font-medium">Assumption of risk.</p>
        <p>By using Meet Me, you accept that interacting with or meeting another user is entirely at your own risk, that Vybi has no control over or responsibility for the conduct of any user (in the app or in person), and that you are solely responsible for your own safety decisions. <strong>Safety tips</strong>: meet somewhere public (typically the venue itself), tell a friend where you are and who you're meeting, don't share financial information or your home address before you're comfortable, and trust your instincts — if something feels wrong, leave and use Report/Block.</p>
        <p className="text-foreground font-medium">Prohibited conduct on Meet Me.</p>
        <p>You agree not to: impersonate any person or misrepresent your age or identity; harass, threaten, or stalk another user, in the app or after; solicit or offer commercial sexual services; contact someone after being blocked or after they've asked you not to; use Meet Me if you're required to register as a sex offender in any jurisdiction; or use Meet Me for anything other than genuine, voluntary social interaction.</p>
        <p className="text-foreground font-medium">Reporting, blocking, and moderation.</p>
        <p>You can block any user at any time — a blocked user can't see you in discovery or match with you again. You can report any user for conduct that violates these Terms; we review reports and may warn, suspend, or terminate any account, or remove content, at our discretion. Consistent with app-marketplace requirements for apps enabling user-to-user contact, we provide in-app reporting and blocking, act on reports in a timely manner, and publish a working contact method (<a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a>).</p>
        <p className="text-foreground font-medium">No liability for user conduct or content.</p>
        <p>To the fullest extent permitted by law, Vybi is not liable for any loss, injury, or damage arising from your interaction with another user, in the app or in person. We do not routinely review chat messages between matched users, and are not responsible for their content except where reported to us.</p>
        <p className="text-foreground font-medium">Indemnification.</p>
        <p>You agree to indemnify and hold harmless Vybi and its officers, directors, and employees from claims arising out of your use of Meet&nbsp;Me, your interactions with any user you met through it, or your violation of this section.</p>
      </Section>

      <Section id="disclaimers" title="8. Disclaimers">
        <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind to the fullest extent permitted by law. We don't warrant that the Service will be uninterrupted or error-free, that crowd counts/wait times/safety ratings will be accurate, or that Meet&nbsp;Me matches will lead to any particular outcome. Vybi is a technology platform, not a venue, security provider, or introduction agency, and doesn't guarantee the safety of any listed venue.</p>
      </Section>

      <Section id="acceptable-use" title="9. Acceptable Use">
        <p>You agree not to: violate any applicable law using the Service; upload unlawful, defamatory, obscene, or rights-infringing content; upload any content involving a minor in a sexual or exploitative context (reported immediately to authorities, resulting in permanent termination); interfere with the Service's integrity (scraping, injecting false heartbeat data, bypassing Meet Me's matching/blocking); use the Service for unauthorized commercial purposes; or attempt unauthorized access to any part of the Service.</p>
      </Section>

      <Section id="ip" title="10. Intellectual Property">
        <p>Vybi and its licensors own the Service, including its trademarks and software, excluding content you submit. By submitting content (a photo, message, or rating), you grant Vybi a non-exclusive, worldwide, royalty-free license to host and display it solely to operate the Service. You keep ownership of your content.</p>
      </Section>

      <Section id="third-party" title="11. Third-Party Services">
        <p>The Service relies on third-party infrastructure, currently Google Firebase (auth, database, storage, hosting) and Google Maps. Features built on these are also subject to that provider's own terms and privacy policy. We're not responsible for third-party practices.</p>
      </Section>

      <Section id="liability" title="12. Limitation of Liability">
        <p>To the fullest extent permitted by law, Vybi and its officers, directors, and employees will not be liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability for any claim is capped at an amount to be finalized with legal counsel. Nothing here excludes liability that cannot lawfully be excluded (e.g., gross negligence or willful misconduct).</p>
      </Section>

      <Section id="termination" title="13. Termination">
        <p>You may stop using the Service and delete your account at any time by contacting <a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a>. We may suspend or terminate your account if we reasonably believe you've violated these Terms or for any other reason at our discretion, including to comply with legal requirements.</p>
      </Section>

      <Section id="law" title="14. Governing Law and Disputes">
        <p>These Terms are governed by the laws of the Republic of South Africa. Our formal dispute-resolution process (courts vs. arbitration) is being finalized with legal counsel and will be reflected here before full public launch.</p>
      </Section>

      <Section id="changes" title="15. Changes to These Terms">
        <p>We may update these Terms from time to time. If we make material changes, we'll notify you (e.g., by email or an in-app notice) before they take effect. Continuing to use the Service after that constitutes acceptance.</p>
      </Section>

      <Section id="contact" title="16. Contact Us">
        <p>Questions about these Terms or your data: <a href="mailto:hello@nightpulse.app">hello@nightpulse.app</a>.</p>
      </Section>

      <p className="text-xs text-muted-foreground border-t pt-6">
        Have questions about how Vybi handles your data or Meet&nbsp;Me? Reach us at{" "}
        <a href="mailto:hello@nightpulse.app" className="text-accent underline">hello@nightpulse.app</a>. Back to{" "}
        <Link href="/" className="text-accent underline">home</Link>.
      </p>
    </div>
  );
}
