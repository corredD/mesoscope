/** Promise-based FileReader, replacing the callback pattern in js/cp_serialized.js's `cp_Deserialized*_cb` handlers. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'))
    reader.readAsText(file, 'UTF-8')
  })
}
