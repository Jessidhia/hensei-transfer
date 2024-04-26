// bookmarklet does not count as user interaction; cannot use clipboard API

export function write(content: string) {
  const textarea = document.body.appendChild(
    document.createElement('textarea'),
  )
  textarea.textContent = content
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

export { customPrompt as prompt }
function customPrompt(promptMessage = 'Paste your Export here') {
  return prompt(promptMessage)
}
