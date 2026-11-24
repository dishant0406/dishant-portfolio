import Image from "next/image";

// Two stickers sit on top of the greeting bar: my head peeking over it on the
// left, and a pile of a book, a coffee cup and a star on the right.
const hover =
  "pointer-events-auto transition-transform duration-300 ease-[var(--motion-ease-standard)] motion-reduce:transition-none";
// The pictures have black outlines, so in dark mode they get a thin light edge.
const edge = "dark:[filter:drop-shadow(0_0_1px_#fff)_drop-shadow(0_0_1px_#fff)]";

export function AboutMascots() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-full z-10">
      <Image
        src="/images/about-peek.webp"
        alt=""
        width={256}
        height={195}
        draggable={false}
        className={`${hover} ${edge} rise absolute bottom-0 left-4 w-32 select-none hover:-translate-y-1`}
      />
      <Image
        src="/images/about-desk.webp"
        alt=""
        width={200}
        height={116}
        draggable={false}
        style={{ "--rise-delay": "0.12s" } as React.CSSProperties}
        className={`${hover} ${edge} rise absolute bottom-0 right-6 w-32 select-none hover:-rotate-3 hover:-translate-y-1`}
      />
    </div>
  );
}
