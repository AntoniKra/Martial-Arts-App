module.exports = function config(profile) {
  return { ci: {
    collect: {
      numberOfRuns: 5,
      settings: { onlyCategories: ['performance'], ...(profile === 'desktop' ? { preset: 'desktop' } : {}),
        disableStorageReset: false, chromeFlags: '--headless --disable-extensions' },
    },
    upload: { target: 'filesystem', outputDir: `perf-results/lighthouse-${profile}` },
  } }
}
