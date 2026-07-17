export default function ColorSwatch({ id, label, color, image, isSelected, onClick }) {
  const isLightLabel = /white|silver/i.test(label)

  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={isSelected}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '2.4 / 1',
        borderRadius: '9999px',
        border: 'none',
        outline: 'none',
        WebkitAppearance: 'none',
        appearance: 'none',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        transform: isSelected ? 'scale(0.97)' : undefined,
        boxShadow: isSelected
          ? '0 0 0 2.5px #DA634B, 0 0 0 5px rgba(218,99,75,0.35)'
          : undefined,
        ...(image
          ? {
              backgroundImage: `url('${image}')`,
              backgroundSize: '130% 130%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : { backgroundColor: color }),
      }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 12px',
        }}
      >
        <span
          style={{
            color: isLightLabel ? '#000' : '#fff',
            // fontWeight: 700,
            textTransform: 'uppercase',
            textAlign: 'center',
            lineHeight: 1.25,
            fontSize: 'clamp(11px, 2vw, 14px)',
            letterSpacing: '0.08em',
            // textShadow: isLightLabel
            //   ? '0 1px 4px rgba(255,255,255,0.9), 0 0 8px rgba(255,255,255,0.7)'
            //   : '0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)',
          }}
        >
          {label}
        </span>
      </span>
    </button>
  )
}