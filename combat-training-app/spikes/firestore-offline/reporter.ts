import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { FullConfig, FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'

export default class SpikeReporter implements Reporter {
  private output = ''
  private rows: string[] = []

  onBegin(config: FullConfig) {
    this.output = path.join(config.rootDir, '../../test-results/firestore-offline')
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const scenario = test.annotations.find((entry) => entry.type === 'scenario')?.description
      ?? test.title.charAt(0)
    const project = test.parent.project()?.name ?? 'unknown'
    const expected = result.status === test.expectedStatus
    const detail = scenario === 'C' ? 'Kontrola: oczekiwana utrata zapisu w RAM' : 'Trwałość niewysłanego zapisu'
    this.rows.push(`| ${scenario} | ${project} | ${expected ? 'PASS' : 'FAIL'} | ${detail} |`)
  }

  onEnd(result: FullResult) {
    mkdirSync(this.output, { recursive: true })
    writeFileSync(path.join(this.output, 'summary.md'), [
      '# Firestore offline — issue #22',
      '',
      `Wynik Playwright: ${result.status}.`,
      '',
      '| Scenariusz | Przeglądarka | Wynik testu | Znaczenie |',
      '| --- | --- | --- | --- |',
      ...this.rows,
      '',
      'C jest zaliczony, gdy zapis NIE przetrwa zamknięcia karty. A i B wymagają trwałości i potwierdzenia przez REST emulatora.',
      '',
      'Wersje przeglądarek, Firebase i Node oraz szczegółowe obserwacje są w załącznikach observations.json raportu Playwright; wersje pakietów i Javy są w logu CI.',
      '',
    ].join('\n'), 'utf8')
  }
}
