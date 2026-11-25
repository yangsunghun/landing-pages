import { CONCEPTS } from '../experience/concepts'
import { copy } from '../copy'

export function ConceptTools({ concept, stylesOn, reveal, onSelect }) {
  return (
    <div
      className={`tools ${stylesOn ? 'is-revealed' : ''}`}
      style={{ opacity: reveal, pointerEvents: stylesOn ? 'auto' : 'none' }}
    >
      <div className="concepts" role="group" aria-label={copy.stylesLabel}>
        {CONCEPTS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={`concept-btn ${concept === item.id ? 'is-on' : ''}`}
            style={{ '--reveal-i': index }}
            aria-pressed={concept === item.id}
            tabIndex={stylesOn ? 0 : -1}
            onClick={() => onSelect(item.id)}
          >
            <span className="concept-btn__label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}