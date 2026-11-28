import { useState } from "react";
import { Image } from "lucide-react";

export default function CampaignMedia({
  message,
  format,
}) {

  const [failed, setFailed] = useState(false);

  const src =
    "/api/admin/marketing-inbox/campaign-media/" +
    message.campaign_id;


  // Fallback when the original file is unavailable.

  if (failed || !message.media_filename) {

    return (
      <div className="mb-3 flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg bg-slate-100 p-4 text-center text-xs text-slate-500">

        <Image size={26} />

        <span className="break-all">
          {message.media_filename ||
            format + " header"}
        </span>

        <span>Original media unavailable</span>

        {failed && (
          <button
            type="button"
            onClick={() => setFailed(false)}
            className="font-medium text-teal-700 underline"
          >
            Retry Preview
          </button>
        )}

      </div>
    );
  }


  // Video campaign header.

  if (format === "VIDEO") {

    return (
      <video
        src={src}
        controls
        preload="metadata"
        playsInline
        onError={() => setFailed(true)}
        className="mb-3 block h-auto w-full rounded-lg"
      />
    );
  }


  // Image campaign header.

  return (

    <img
      src={src}
      alt={message.media_filename}
      loading="lazy"
      onError={() => setFailed(true)}
      className="mb-3 block h-auto w-full rounded-lg object-contain"
    />

  );
}