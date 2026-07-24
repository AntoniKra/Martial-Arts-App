import { homeMockData } from '@/features/home/data/homeMockData'
import { HomeView } from '@/features/home/components/HomeView'

export function HomePage() {
  return <HomeView data={homeMockData} />
}
