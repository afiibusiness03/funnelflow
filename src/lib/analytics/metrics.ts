import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export interface Metrics {
  totalEmails:number; scans30:number; scansPrev:number; completions30:number; completionsPrev:number;
  ratings:Record<number,number>; statuses:Record<string,number>; steps:Record<string,number>;
  daily:{day:string;scans:number;completions:number}[];
}
export const getMetrics=cache(async (campaignId?: string):Promise<Metrics> => {
  const db=await createClient()
  const {data,error}=await db.rpc('dashboard_metrics',{p_campaign:campaignId ?? null})
  if(error || !data)throw new Error('Analytics unavailable')
  return data as Metrics
})
const dateFormatter=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'})
export function dailyChart(metrics:Metrics) {
  const byDay=new Map(metrics.daily.map(day=>[day.day,day]))
  return Array.from({length:14},(_,i)=>{
    const date=new Date(Date.now()-(13-i)*86400000)
    const row=byDay.get(date.toISOString().slice(0,10))
    return {date:dateFormatter.format(date),scans:row?.scans ?? 0,completions:row?.completions ?? 0}
  })
}
