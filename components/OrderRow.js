"use client";

export default function OrderRow({
  title,
  image,
  status, // JSX chip
  rightArea, // totals + actions (JSX)
  subtitleRight, // optional small text near status
  metaLeft = [], // array of [label, value]
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-[#f8fbff] shadow-sm hover:shadow-md hover:ring-1 hover:ring-[#325082]/15 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 rounded-t-2xl bg-gradient-to-r from-[#f3f7ff] to-white border-b border-slate-200">
        <div className="text-[13px] font-medium text-[#325082]">
          Order summary
        </div>
        <div className="flex items-center gap-3">
          {subtitleRight}
          {status}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex gap-4">
        {/* Thumb */}
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 ring-1 ring-slate-200">
          {image ? (
            <img
              src={image}
              alt={title}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-[#1b2b4a] line-clamp-2">
            {title}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-slate-600">
            {metaLeft.map(([k, v], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-slate-500">{k}:</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="w-full sm:w-64 flex sm:block items-end justify-between">
          {rightArea}
        </div>
      </div>
    </div>
  );
}
