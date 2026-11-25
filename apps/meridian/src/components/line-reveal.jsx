export function LineReveal({ show, children, className = '', as: Tag = 'p' }) {
  return (
    <Tag className={`line-reveal ${show ? 'is-on' : ''} ${className}`.trim()}>
      <span className="line-reveal__inner">{children}</span>
    </Tag>
  )
}