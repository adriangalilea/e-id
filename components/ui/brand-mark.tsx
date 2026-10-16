// A BRAND'S MARK: a company's or a platform's logo, from simple-icons' 24-unit path
// (`siGithub`, `siTelegram`: `{ path }`), filled in the current colour and sized by
// whatever holds it (a button's icon slot, a menu row, a line of words). Lucide carries
// no brand marks, by its own policy, so every logo here is drawn from simple-icons
// through this one component. Unnamed (`aria-hidden`): what holds it says the brand,
// a button's label or the words beside it.

export function BrandMark({
  icon,
  className,
}: {
  icon: { path: string }
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
      data-slot="brand-mark"
      className={className}
    >
      <path d={icon.path} />
    </svg>
  )
}
