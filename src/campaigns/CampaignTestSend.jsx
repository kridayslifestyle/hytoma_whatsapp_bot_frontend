import { useRef, useState } from "react";

import {
  Send,
  ShieldCheck,
} from "lucide-react";

import { apiRequest } from "../api";


export default function CampaignTestSend({

  campaignId,

  ready,

  disabled,

  onBusyChange,

}) {

  const storageKey =
    "hytoma-test-send:" + campaignId;

  const [pending, setPending] = useState(() => {

    try {

      return JSON.parse(
        sessionStorage.getItem(storageKey)
      ) || null;

    } catch {

      return null;

    }

  });

  const [phone, setPhone] = useState(
    pending?.phone || ""
  );

  const [confirmed, setConfirmed] =
    useState(false);

  const [busy, setBusy] =
    useState(false);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  const inFlight = useRef(false);


  // --------------------------------------------------
  // Preserve Request ID
  // --------------------------------------------------

  function remember(value) {

    setPending(value);

    try {

      if (value) {

        sessionStorage.setItem(

          storageKey,

          JSON.stringify(value)

        );

      } else {

        sessionStorage.removeItem(
          storageKey
        );

      }

    } catch {

      // Backend duplicate protection remains active.

    }
  }


  // --------------------------------------------------
  // Send Test Message
  // --------------------------------------------------

  async function send(event) {

    event.preventDefault();

    if (

      inFlight.current ||

      disabled ||

      !ready ||

      !confirmed ||

      !phone.trim()

    ) return;


    const approved = window.confirm(

      pending

        ? "Retry the same test request? No new request ID will be generated."

        : "Send one real WhatsApp test message to this authorized number?"

    );

    if (!approved) return;


    // Reuse the same ID if the previous
    // request outcome is not confirmed.

    const attempt = pending || {

      phone: phone.trim(),

      request_id: crypto.randomUUID(),

    };

    remember(attempt);

    inFlight.current = true;

    setBusy(true);

    onBusyChange(true);

    setError("");

    setResult(null);


    try {

      const response = await apiRequest(

        "/admin/campaigns/" +
          campaignId +
          "/test-send",

        {

          method: "POST",

          body: JSON.stringify({

            ...attempt,

            confirmed: true,

          }),

        }

      );

      setResult(response);


      // Clear the pending request only after
      // receiving a definitive API result.

      if (

        ["accepted", "rejected"].includes(
          response.status
        )

      ) {

        remember(null);

        setConfirmed(false);

      }

    } catch (err) {

      setError(err.message);

    } finally {

      inFlight.current = false;

      setBusy(false);

      onBusyChange(false);

    }

  }


  // --------------------------------------------------
  // Test Send UI
  // --------------------------------------------------

  return (

    <form

      onSubmit={send}

      className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"

    >

      {/* Section Heading */}

      <div>

        <h4 className="flex items-center gap-2 font-semibold text-slate-900">

          <Send
            size={18}
            className="text-emerald-700"
          />

          Test Message

        </h4>

        <p className="mt-2 text-xs leading-relaxed text-slate-500">

          Only an authorized, opted-in test number
          can receive a test message.

          This does not launch the campaign.

        </p>

      </div>


      {/* Configuration Warning */}

      {!ready && (

        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">

          Save the required media and template
          variables before testing.

        </p>

      )}


      {/* Test Recipient Form */}

      <fieldset

        disabled={
          disabled ||
          busy ||
          !ready
        }

        className="space-y-4"

      >

        <label className="block space-y-2 text-sm font-medium text-slate-700">

          WhatsApp Test Number

          <input

            type="tel"

            required

            maxLength={40}

            value={phone}

            disabled={!!pending}

            placeholder="+91XXXXXXXXXX"

            onChange={event => {

              setPhone(event.target.value);

              setResult(null);

              setError("");

              setConfirmed(false);

            }}

            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"

          />

        </label>


        {/* Confirmation Checkbox */}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">

          <input

            type="checkbox"

            checked={confirmed}

            onChange={event =>
              setConfirmed(event.target.checked)
            }

            className="mt-1 h-4 w-4 accent-emerald-700"

          />

          <span>

            I confirm this is my authorized test
            number and has opted in.

          </span>

        </label>


        {/* Send Button */}

        <button

          type="submit"

          disabled={

            busy ||

            !confirmed ||

            !phone.trim()

          }

          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"

        >

          <Send size={16} />

          {busy

            ? "Sending..."

            : pending

            ? "Check / Retry Same Request"

            : "Send Test Message"

          }

        </button>

      </fieldset>


      {/* Error Message */}

      {error && (

        <p

          role="alert"

          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"

        >

          {error}

          {" "}

          The request ID has been retained.
          Do not create another request until
          you know the outcome.

        </p>

      )}


      {/* API Result */}

      {result && (

        <div

          role="status"

          className={

            "space-y-2 rounded-lg border p-3 text-sm " +

            (

              result.status === "accepted"

                ? "border-emerald-200 bg-emerald-50 text-emerald-800"

                : "border-amber-200 bg-amber-50 text-amber-800"

            )

          }

        >

          <p className="font-semibold">

            {result.status === "accepted"

              ? (

                  result.duplicate_request

                    ? "Existing request accepted"

                    : "Test message accepted"

                )

              : result.status === "rejected"

              ? "Test message rejected"

              : "Send outcome uncertain"

            }

          </p>


          <p>

            {result.status === "accepted"

              ? (

                  result.duplicate_request

                    ? "No duplicate message was sent."

                    : "Meta accepted the test. Confirm delivery on your WhatsApp phone."

                )

              : result.status === "rejected"

              ? "Check the configuration before trying again."

              : "Do not send another test until this request has been reconciled."

            }

          </p>


          {result.wamid && (

            <p className="break-all text-xs opacity-75">

              Message ID: {result.wamid}

            </p>

          )}

        </div>

      )}


      {/* Clear Reconciled Request */}

      {pending && !busy && (

        <button

          type="button"

          className="text-xs text-slate-600 underline"

          onClick={() => {

            if (

              window.confirm(

                "Only clear this request if you have verified its outcome. Continue?"

              )

            ) {

              remember(null);

              setConfirmed(false);

              setError("");

              setResult(null);

            }

          }}

        >

          Clear request after verifying outcome

        </button>

      )}


      {/* Protection Notice */}

      <div className="flex items-center gap-2 text-xs text-slate-500">

        <ShieldCheck
          size={15}
          className="text-emerald-700"
        />

        Duplicate protection and 60-second
        cooldown enforced by backend.

      </div>

    </form>

  );
}