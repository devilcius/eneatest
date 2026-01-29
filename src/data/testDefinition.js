import rawDefinition from '../../data/test-auto-gnosis.json'

export const TEST = rawDefinition.test
export const TEST_VERSION = 1

export const DEFAULT_SCALE = Array.from(
  { length: TEST.scale.max - TEST.scale.min + 1 },
  (_, idx) => {
    const value = TEST.scale.min + idx
    return { value, label: TEST.scale.labels[String(value)] ?? String(value) }
  }
)
