import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Segments } from '../components/ui/Segments'
import { PlanTab } from './train/PlanTab'
import { LogTab } from './train/LogTab'
import { HyroxTab } from './train/HyroxTab'

type TrainTab = 'plan' | 'log' | 'hyrox'

export function Train() {
  const [params, setParams] = useSearchParams()
  const initial = (params.get('tab') as TrainTab) || 'plan'
  const [tab, setTab] = useState<TrainTab>(
    ['plan', 'log', 'hyrox'].includes(initial) ? initial : 'plan',
  )

  useEffect(() => {
    const t = params.get('tab') as TrainTab | null
    if (t && ['plan', 'log', 'hyrox'].includes(t) && t !== tab) setTab(t)
  }, [params, tab])

  const onTab = (value: TrainTab) => {
    setTab(value)
    setParams(value === 'plan' ? {} : { tab: value })
  }

  return (
    <div className="page">
      <h1 className="page-title">Train</h1>
      <p className="page-sub">Plan · log · HYROX race engine</p>
      <Segments
        options={[
          { value: 'plan', label: 'Plan' },
          { value: 'log', label: 'Log' },
          { value: 'hyrox', label: 'HYROX' },
        ]}
        value={tab}
        onChange={onTab}
      />
      {tab === 'plan' && <PlanTab />}
      {tab === 'log' && <LogTab />}
      {tab === 'hyrox' && <HyroxTab />}
    </div>
  )
}
