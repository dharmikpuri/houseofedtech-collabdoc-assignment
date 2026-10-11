import { PERSONAS } from "@/config/site";

/**
 * The merge illustration on the auth screens: two people's streams of edits
 * converging into one document. Decorative (`aria-hidden`); the surrounding
 * copy carries the meaning.
 */

const AISHA = PERSONAS.aisha.color;
const MARCO = PERSONAS.marco.color;

/** Two people's concurrent edits converge to the same document. */
export function MergeArt() {
  return (
    <div className="relative h-full" aria-hidden>
      <svg viewBox="0 0 360 200" className="h-full w-full" fill="none">
        {/* Streams */}
        <path
          d="M58 62 C 150 62, 150 100, 232 100"
          stroke={AISHA}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M58 138 C 150 138, 150 100, 232 100"
          stroke={MARCO}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M232 100 H 296"
          className="stroke-primary"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Merge point */}
        <circle cx="232" cy="100" r="11" className="fill-primary/15" />
        <circle cx="232" cy="100" r="5.5" className="fill-primary" />
        {/* People */}
        <circle cx="46" cy="62" r="13" fill={AISHA} />
        <text
          x="46"
          y="66"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="var(--font-inter), sans-serif"
        >
          A
        </text>
        <circle cx="46" cy="138" r="13" fill={MARCO} />
        <text
          x="46"
          y="142"
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#fff"
          fontFamily="var(--font-inter), sans-serif"
        >
          M
        </text>
        {/* Result */}
        <rect
          x="296"
          y="82"
          width="30"
          height="36"
          rx="5"
          className="fill-surface stroke-border-strong"
          strokeWidth="1.5"
        />
        <path
          d="M303 93h16M303 100h16M303 107h10"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Labels */}
        <g
          fontFamily="var(--font-inter), sans-serif"
          fontSize="10.5"
          className="fill-muted-foreground"
        >
          <text x="70" y="50">
            Aisha · laptop
          </text>
          <text x="70" y="160">
            Marco · phone, offline
          </text>
          <text x="232" y="128" textAnchor="middle" className="fill-foreground" fontWeight="600">
            merge
          </text>
        </g>
      </svg>
      {/* What each of them typed */}
      <span
        className="absolute top-[14%] left-[44%] rounded-md px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${AISHA}1f`, color: AISHA }}
      >
        + the offline editor
      </span>
      <span
        className="absolute bottom-[12%] left-[48%] rounded-md px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${MARCO}1f`, color: MARCO }}
      >
        + after QA sign-off
      </span>
    </div>
  );
}
