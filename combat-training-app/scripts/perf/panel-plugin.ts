import type { Plugin } from 'vite'
import { fileURLToPath } from 'node:url'

/** Keep the opt-in guard separate; no performance code joins the initial JS graph. */
export function performancePanelPlugin(): Plugin {
  let source = () => '/src/features/performance/panel.ts'
  let guardSource = (script: string) => script
  let dev = false
  return {
    name: 'opt-in-performance-panel',
    configResolved(config) { dev = config.command === 'serve' },
    buildStart() {
      if (!dev) {
        const reference = this.emitFile({ type: 'chunk', id: fileURLToPath(new URL('../../src/features/performance/panel.ts', import.meta.url)), name: 'performance-panel' })
        source = () => `/${this.getFileName(reference)}`
        guardSource = (script) => `/${this.getFileName(this.emitFile({ type: 'asset', name: 'perf-guard.js', source: script }))}`
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler() {
        const script = `(()=>{let enabled=false;try{const flag=new URLSearchParams(location.search).get('perf');if(flag==='0')sessionStorage.removeItem('combat-training.perf');if(flag==='1')sessionStorage.setItem('combat-training.perf','1');enabled=flag==='1'||(flag!=='0'&&sessionStorage.getItem('combat-training.perf')==='1')}catch{enabled=new URLSearchParams(location.search).get('perf')==='1'}if(enabled)import(${JSON.stringify(source())}).catch(()=>{const p=document.createElement('p');p.setAttribute('role','alert');p.textContent='Nie udało się wczytać panelu pomiarów. Połącz się z siecią i przeładuj stronę.';document.body.append(p)})})()`
        return [{ tag: 'script', injectTo: 'body', ...(dev ? { children: script } : { attrs: { src: guardSource(script) } }) }]
      },
    },
  }
}
