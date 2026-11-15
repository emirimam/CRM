import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Guide — ITDVoIP CRM" };

function Screen({
  href,
  name,
  oneLine,
  children,
}: {
  href: string;
  name: string;
  oneLine: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-xs">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Link
          href={href}
          className="text-base font-semibold tracking-tight text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent/50"
        >
          {name}
        </Link>
        <span className="text-sm text-muted">{oneLine}</span>
      </div>
      <div className="mt-3 space-y-3 text-sm leading-[1.65] text-ink/90">{children}</div>
    </section>
  );
}

function Term({ word, children }: { word: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5">
      <dt className="text-sm font-semibold text-ink">{word}</dt>
      <dd className="mt-0.5 text-sm leading-[1.6] text-muted">{children}</dd>
    </div>
  );
}

export default function Guide() {
  return (
    <>
      <PageHeader
        title="How this works"
        lead="What each screen is for, what the words mean, and which rules the database will not let anyone break."
      />

      <Card title="The short version">
        <div className="space-y-3 text-sm leading-[1.65] text-ink/90">
          <p>
            This is an outbound pipeline for ITDVoIP hosted phone service. A scheduled Claude task
            wakes up on its own, reads carrier filings and company websites, and writes cold-email
            drafts into the database. Nothing it writes is ever sent automatically.
          </p>
          <p>
            Your job is the review step in the middle:{" "}
            <strong className="font-semibold text-ink">
              read the draft, check the claim it makes is true, send it yourself from Outlook, then
              mark it sent here
            </strong>
            . The agent researches, you decide, Adam takes the calls.
          </p>
          <p className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5 text-muted">
            A normal morning: open <strong className="text-ink">Today</strong>, read anything in the
            amber &ldquo;needs your decision&rdquo; box, then go to{" "}
            <strong className="text-ink">Drafts</strong> and work the queue top to bottom. Five
            minutes if nothing is wrong.
          </p>
        </div>
      </Card>

      <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-subtle">The screens</h2>

      <Screen href="/" name="Today" oneLine="the morning dashboard">
        <p>
          The five tiles across the top are counts, and most of them are clickable — they take you
          to the filtered list behind the number.
        </p>
        <p>
          If the agent is mid-run you get a live progress bar here, and the page refreshes itself
          every ten seconds. If the last run left something it could not decide, it appears in an
          amber box at the top. That box is the agent asking you a question; it will keep asking
          until you act on it.
        </p>
        <p>
          <strong className="font-semibold text-ink">Renewals within 75 days</strong> is the slow
          money. Every first email asks when the prospect&rsquo;s phone contract renews. When
          someone answers, put the date on their record and they surface here at the right moment
          instead of being chased blind.
        </p>
      </Screen>

      <Screen href="/drafts" name="Drafts" oneLine="the queue you actually work">
        <p>
          One card per unsent email. Each shows who it goes to, the verifiable claim it makes, the
          subject, and the full body.
        </p>
        <p>
          <strong className="font-semibold text-ink">A card outlined in red is not ready.</strong>{" "}
          That means one of four things: no email address for the contact, no verifiable fact
          recorded, no source URL behind the fact, or the body still contains a fill-in placeholder
          like the postal address. Fix it or discard it — do not send it.
        </p>
        <p>
          The buttons, in the order you normally use them:{" "}
          <strong className="font-semibold text-ink">Copy body</strong> and{" "}
          <strong className="font-semibold text-ink">Copy subject</strong> put the text on your
          clipboard for Outlook. <strong className="font-semibold text-ink">Approve</strong> just
          marks that you have read it and it is cleared — it does not send anything.{" "}
          <strong className="font-semibold text-ink">Mark sent</strong> is the one that matters:
          press it only after the mail has actually left, because it bumps the touch count and
          writes a history entry. <strong className="font-semibold text-ink">Discard</strong> kills
          the draft; put a reason in so the next run can learn from it.
        </p>
        <p className="text-muted">
          The search box here looks inside the body text too, so you can find &ldquo;the one about
          the fax line&rdquo; without remembering the company.
        </p>
      </Screen>

      <Screen href="/prospects" name="Prospects" oneLine="every company, and the record behind it">
        <p>
          The table is the full list. Search matches company, contact, email, phone, city, state,
          ZIP, industry, current provider, the trigger detail and your notes — so a ZIP or a
          half-remembered surname both work. Press <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-2xs">/</kbd>{" "}
          anywhere to jump into it.
        </p>
        <p>
          The four small bars in the <strong className="font-semibold text-ink">Touches</strong>{" "}
          column are the contact budget. They turn red at four, which is the hard stop.
        </p>
        <p>
          <strong className="font-semibold text-ink">
            Click a status in the table to change it on the spot.
          </strong>{" "}
          On an individual prospect page you can click almost any value — contact name, email,
          seats, renewal date, your notes — type, and press Enter. It saves immediately; there is
          no Save button and no form to submit. Press Escape to cancel an edit.
        </p>
        <p>
          The one thing that is not an inline edit is{" "}
          <strong className="font-semibold text-ink">do-not-contact</strong>, which has its own
          button. It is permanent, and it also discards every draft waiting for that company.
        </p>
      </Screen>

      <Screen href="/wire-centers" name="Wire centers" oneLine="the evidence behind every copper claim">
        <p>
          A wire center is the telephone exchange building that serves a given area. When a carrier
          decides to rip out the copper in one, it has to file a public notice naming that building
          and a date. Those filings are the whole basis of our cold outreach.
        </p>
        <p>
          Every row here has a link to the actual filing.{" "}
          <strong className="font-semibold text-ink">
            The database will not store a wire center without a source URL
          </strong>
          , which is deliberate: a date with no filing behind it cannot end up in an email.
        </p>
        <p>
          The default view is the ones not yet worked. Mark one done once the agent has mined it for
          prospects, so later runs move on to a fresh area instead of recycling the same town.
        </p>
      </Screen>

      <Screen href="/runs" name="Agent runs" oneLine="what the agent did, and what it could not do">
        <p>
          One card per run. While a run is live you see the current step, a progress bar and an
          activity log, and the page refreshes itself. If a run says nothing for twenty minutes it
          is flagged as stale — that usually means it stopped without finishing.
        </p>
        <p>
          The summary is where the agent is honest about what did not work: searches that came back
          empty, sources it could not reach, channels it could not scan. Read it. A run that found
          nothing is useful information, and padding it with weak prospects would be worse.
        </p>
      </Screen>

      <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-subtle">
        Rules the database enforces
      </h2>

      <Card>
        <div className="space-y-3 text-sm leading-[1.65] text-ink/90">
          <p className="text-muted">
            These are not reminders in a prompt. They are constraints and triggers in Postgres, so
            neither the agent nor a tired human at 7pm can work around them.
          </p>
          <ul className="space-y-2.5">
            <li>
              <strong className="font-semibold text-ink">Four touches, then stop.</strong> Marking a
              draft sent bumps the count and logs the touch. At four, the prospect is automatically
              moved to do-not-contact.
            </li>
            <li>
              <strong className="font-semibold text-ink">Do-not-contact is enforced on write.</strong>{" "}
              Queueing a draft for someone on that list raises a database exception.
            </li>
            <li>
              <strong className="font-semibold text-ink">No filing, no wire center.</strong> The
              source URL column cannot be null.
            </li>
            <li>
              <strong className="font-semibold text-ink">One record per company and ZIP.</strong> The
              agent cannot add the same firm twice across runs.
            </li>
          </ul>
        </div>
      </Card>

      <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-subtle">
        What the words mean
      </h2>

      <Card bodyClass="px-4 py-2">
        <dl className="divide-y divide-line/60">
          <Term word="Wire center">
            The telephone exchange serving an area. Carriers retire copper one wire center at a
            time, which is why our outreach is organised by area rather than by industry.
          </Term>
          <Term word="Copper retirement / copper sunset">
            A carrier removing old copper phone lines in a wire center. They must file public notice
            with a date. There is no federal deadline for a business to move off analog lines — only
            the carrier&rsquo;s own date. Never let an email imply otherwise.
          </Term>
          <Term word="Implementation date">
            The date in the filing, always worded &ldquo;on or after&rdquo;. It means the carrier is
            allowed to start, not that lines die that morning. Once it has passed, the window is
            open rather than approaching, and the email should say so.
          </Term>
          <Term word="Trigger">
            Why this company is on the list at all. <em>Copper sunset</em> means their wire center
            is in a filing. <em>PBX end-of-life</em> means they run an old on-prem system.{" "}
            <em>Switch intent</em> means they said publicly they want to leave their provider.{" "}
            <em>MSP partner</em> is not a sales prospect at all — it is an IT company that might
            send us referrals.
          </Term>
          <Term word="Trigger detail">
            The one verifiable fact about that specific company, with a URL. Every draft must
            contain its prospect&rsquo;s fact. If there is no fact, there is no email — a generic
            cold email is worse than none.
          </Term>
          <Term word="ATA">
            A small adapter that puts an existing analog device — usually a fax machine — onto our
            service while leaving the rest of the customer&rsquo;s setup alone. This is the entry
            offer: two to four lines, numbers kept, nothing else touched.
          </Term>
          <Term word="Touch">
            Any contact with a prospect: an email sent, a call made, a reply received. Four is the
            ceiling.
          </Term>
          <Term word="Sequence step">
            Which email in the series this is, 1 to 4. The agent writes step 1; later steps come
            after a reply or a gap.
          </Term>
          <Term word="CAN-SPAM">
            The US law covering commercial email. The part that bites us: every message needs a real
            physical postal address and a working way to opt out. That is why a draft with a
            placeholder address is blocked.
          </Term>
        </dl>
      </Card>

      <h2 className="pt-1 text-sm font-semibold uppercase tracking-wide text-subtle">
        Lines we do not cross
      </h2>

      <Card>
        <ul className="space-y-2.5 text-sm leading-[1.65] text-ink/90">
          <li>
            <strong className="font-semibold text-ink">
              No elevator phones, fire alarm panels or emergency call boxes.
            </strong>{" "}
            Those are life-safety circuits and need a code-reviewed replacement by a specialist.
            Every draft says so explicitly, and we turn that work down rather than take it.
          </li>
          <li>
            <strong className="font-semibold text-ink">No invented deadlines.</strong> Only the
            carrier&rsquo;s own filing, for that location, with the link.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              Never claim we called them.
            </strong>{" "}
            Only Emir logs calls, and only calls that happened.
          </li>
          <li>
            <strong className="font-semibold text-ink">We are not the cheap option.</strong> $15, $30
            and $40 per extension. No draft claims we undercut a named competitor.
          </li>
          <li>
            <strong className="font-semibold text-ink">
              No healthcare practices until a HIPAA business associate agreement is signed
            </strong>
            , and no existing ITDreamwire customers.
          </li>
          <li>
            <strong className="font-semibold text-ink">Every first email asks about renewal.</strong>{" "}
            It gives an honest exit and it is how the renewals list fills up.
          </li>
        </ul>
      </Card>
    </>
  );
}
