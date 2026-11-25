export function SlotButton({ labelA, labelB, className = '', ...props }) {
  const b = labelB ?? labelA
  return (
    <button type="button" className={`slot-btn ${className}`.trim()} {...props}>
      <span className="slot-btn__mask">
        <span className="slot-btn__a">{labelA}</span>
        <span className="slot-btn__b">{b}</span>
      </span>
    </button>
  )
}