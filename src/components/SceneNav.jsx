import { SlotButton } from './SlotButton'

export function SceneNav({ labels, active, onPick }) {
  return (
    <div className="scene-nav" role="tablist" aria-label="Scenes">
      {labels.map((label, index) => (
        <SlotButton
          key={label}
          type="button"
          role="tab"
          aria-selected={active === index}
          className={`scene-tab ${active === index ? 'is-on' : ''}`}
          labelA={label}
          labelB={labels[(index + 1) % labels.length]}
          onClick={() => onPick(index)}
        />
      ))}
    </div>
  )
}