import { useLayoutEffect, useRef, type ComponentProps } from 'react'

/** A textarea that is `rows` lines tall at least and grows with its content instead of scrolling. */
export function AutoGrowTextarea({ rows = 3, ...props }: Omit<ComponentProps<'textarea'>, 'ref'>) {
  const field = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = field.current
    if (!element) return
    let width = -1
    const fit = () => {
      element.style.height = 'auto'
      // With border-box sizing the content height excludes the borders.
      element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`
    }
    fit()
    // Wrapping changes with the width (rotation, font loading), not only with the text.
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return
      width = element.clientWidth
      fit()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [props.value])

  return <textarea ref={field} rows={rows} {...props} />
}
