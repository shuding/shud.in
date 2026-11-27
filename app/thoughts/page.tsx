import { getThoughts } from './_data'
import { ThoughtList } from './_list'

export const metadata = {
  title: 'Thoughts',
}

export default async function Page() {
  const { articles, appendix } = await getThoughts()

  return (
    <>
      <h1 className='sr-only'>Thoughts</h1>
      <ThoughtList groups={[articles, appendix].filter((g) => g.length)} />
    </>
  )
}
