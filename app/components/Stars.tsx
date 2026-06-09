const GOLD = "#f5b50a";
const EMPTY = "#dfe4ea";

function Star({ fill, id }: { fill: number; id: string }) {
  // fill: 0 = empty, 0.5 = half, 1 = full
  const gradId = `half-${id}`;
  let starFill: string;
  if (fill >= 1) {
    starFill = GOLD;
  } else if (fill === 0.5) {
    starFill = `url(#${gradId})`;
  } else {
    starFill = EMPTY;
  }

  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden="true">
      {fill === 0.5 && (
        <defs>
          <linearGradient id={gradId}>
            <stop offset="50%" stopColor={GOLD} />
            <stop offset="50%" stopColor={EMPTY} />
          </linearGradient>
        </defs>
      )}
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95L12 2.5Z"
        fill={starFill}
      />
    </svg>
  );
}

export default function Stars({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    let fill = 0;
    if (rating >= i) {
      fill = 1;
    } else if (rating >= i - 0.5) {
      fill = 0.5;
    }
    stars.push(<Star key={i} fill={fill} id={`${rating}-${i}`} />);
  }
  return (
    <span
      className="stars"
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {stars}
    </span>
  );
}
