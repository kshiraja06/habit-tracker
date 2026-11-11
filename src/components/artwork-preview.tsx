import type { ArtworkState, WeeklyArtwork } from "@/lib/artwork";

interface ArtworkPreviewProps {
  artwork: WeeklyArtwork | null;
  state: ArtworkState;
  title?: string;
}

export function ArtworkPreview({ artwork, state, title }: ArtworkPreviewProps) {
  if (!artwork) {
    return (
      <div className="artwork-empty" role="status">
        A week of check-ins will gather here.
      </div>
    );
  }

  const preview = state === "preview";
  const grainId = `grain-${state}`;

  return (
    <figure className={`artwork-figure artwork-figure--${state}`}>
      {title ? <figcaption className="artwork-caption">{title}</figcaption> : null}
      <svg
        aria-label={preview ? "Unfinished weekly artwork preview" : "Final weekly artwork"}
        className="artwork-svg"
        role="img"
        viewBox={`0 0 ${artwork.width} ${artwork.height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter height="100%" id={grainId} width="100%" x="0%" y="0%">
            <feTurbulence baseFrequency="0.76" numOctaves="2" result="noise" seed="12" type="fractalNoise" />
            <feColorMatrix in="noise" type="saturate" values="0" />
          </filter>
          {artwork.cells.map((cell) => (
            <g key={cell.id}>
              <clipPath id={`blob-${state}-${cell.id}`}>
                <path d={cell.blobPath} />
              </clipPath>
              <radialGradient cx="35%" cy="28%" id={`wash-${state}-${cell.id}`} r="82%">
                <stop offset="0%" stopColor={cell.highlight} />
                <stop offset="100%" stopColor={cell.color} />
              </radialGradient>
            </g>
          ))}
        </defs>
        <rect fill="#fff8e9" height={artwork.height} width={artwork.width} />
        <path
          d={`M 0 0 H ${artwork.width} V ${artwork.height} H 0 Z`}
          fill="none"
          stroke="#596681"
          strokeOpacity={preview ? "0.27" : "0.44"}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        {Array.from({ length: artwork.columns - 1 }, (_, index) => (
          <path
            d={`M ${(index + 1) * artwork.cellWidth} 0 V ${artwork.height}`}
            key={`column-${index}`}
            stroke="#596681"
            strokeOpacity={preview ? "0.18" : "0.25"}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {Array.from({ length: artwork.rows - 1 }, (_, index) => (
          <path
            d={`M 0 ${(index + 1) * artwork.cellHeight} H ${artwork.width}`}
            key={`row-${index}`}
            stroke="#596681"
            strokeOpacity={preview ? "0.18" : "0.25"}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {artwork.cells.map((cell) => {
          if (preview && !cell.previewVisible) return null;
          const blobId = `blob-${state}-${cell.id}`;
          return (
            <g key={cell.id} opacity={preview ? 0.44 : cell.opacity}>
              <path
                d={cell.blobPath}
                fill={`url(#wash-${state}-${cell.id})`}
              />
              <rect
                clipPath={`url(#${blobId})`}
                fill={cell.color}
                height={cell.radiusY * 2 * cell.fullness}
                opacity={0.42 + (cell.score / 100) * 0.34}
                width={cell.radiusX * 2}
                x={cell.x - cell.radiusX}
                y={cell.y + cell.radiusY - cell.radiusY * 2 * cell.fullness}
              />
              <path
                d={cell.blobPath}
                fill="none"
                stroke={cell.color}
                strokeOpacity={preview ? "0.44" : "0.6"}
                strokeWidth="1"
              />
            </g>
          );
        })}
        <rect
          filter={`url(#${grainId})`}
          height={artwork.height}
          opacity={artwork.grainStrength}
          pointerEvents="none"
          width={artwork.width}
        />
      </svg>
      {preview ? <p className="artwork-state-note">Still forming · unfinished preview</p> : null}
    </figure>
  );
}
