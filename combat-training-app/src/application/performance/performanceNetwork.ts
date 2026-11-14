export async function setPerformanceNetworkEnabled(enabled: boolean): Promise<void> {
  const network = await import('@/infrastructure/firebase/performanceNetwork')
  await network.setPerformanceNetworkEnabled(enabled)
}
