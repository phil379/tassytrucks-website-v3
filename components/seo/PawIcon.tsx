/** Simple sage paw mark for Winnie Ride page headers. No emoji — brand stays restrained. */
export default function PawIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#7C9A5C"
      aria-hidden="true"
      data-testid="paw-icon"
    >
      {/* main pad */}
      <path d="M12 11.5c2.6 0 5.4 2.1 6.1 4.9.4 1.6-.5 3.1-2.1 3.4-1.4.3-2.7-.5-4-.5s-2.6.8-4 .5c-1.6-.3-2.5-1.8-2.1-3.4.7-2.8 3.5-4.9 6.1-4.9Z" />
      {/* toes */}
      <ellipse cx="5" cy="9.2" rx="1.9" ry="2.4" transform="rotate(-20 5 9.2)" />
      <ellipse cx="9.4" cy="6.2" rx="1.9" ry="2.5" transform="rotate(-8 9.4 6.2)" />
      <ellipse cx="14.6" cy="6.2" rx="1.9" ry="2.5" transform="rotate(8 14.6 6.2)" />
      <ellipse cx="19" cy="9.2" rx="1.9" ry="2.4" transform="rotate(20 19 9.2)" />
    </svg>
  );
}
