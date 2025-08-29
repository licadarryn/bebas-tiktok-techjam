import { useCallback, useEffect, useState } from '@lynx-js/react'
import './App.css'

export function App(props: { onRender?: () => void }) {
  const [alterLogo, setAlterLogo] = useState(false)

  useEffect(() => {
    console.info('Hello, ReactLynx')
  }, [])
  props.onRender?.()

  const onTap = useCallback(() => {
    'background only'
    setAlterLogo(prev => !prev)
  }, [])

  // Demo data (replace with real values)
  const author = '@axelgiovanni'
  const videoId = '987654324098'
  const timeMade = '2025-08-30 10:30'
  const p75 = 0.75
  const money = 12340

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

  return (
    <view>
      <view className='Background' />
      <view className='App'>
        <view className='Banner'>
          <view className="Title" bindtap={onTap}>
            <text className="heading-score">Score: 78</text>
            <view className="meta">
              <text className="meta-item"><text className="eyebrow">author</text> {author}</text>
              <text className="meta-sep">•</text>
              <text className="meta-item"><text className="eyebrow">videoid</text> {videoId}</text>
              <text className="meta-sep">•</text>
              <text className="meta-item"><text className="eyebrow">time created</text> {timeMade}</text>
            </view>
          </view>
        </view>

        <view className="Content">
          <view className="grid-2">
            <view className="card highlight">
              <text className="card-eyebrow">75th percentile</text>
              <text className="big-number num">{Math.round(p75 * 100)}%</text>
              <text className="hint">vs peer set</text>
            </view>

            <view className="card highlight">
              <text className="card-eyebrow">Money earned</text>
              <text className="big-number num">{fmtCurrency(money)}</text>
              <text className="hint">estimated gross</text>
            </view>
          </view>

          <view className="grid-1">
            <view className="card">
              <text className="card-title">Policy violation</text>

              <view className="stat">
                <text className="label">Advertisement</text>
                <text className="value">67%</text>
              </view>
              <view className="bar"><view className="fill" style={{ width: '67%' }} /></view>

              <view className="stat">
                <text className="label">NSFW</text>
                <text className="value">23%</text>
              </view>
              <view className="bar"><view className="fill" style={{ width: '23%' }} /></view>

              <view className="stat">
                <text className="label">Adult Content</text>
                <text className="value">33%</text>
              </view>
              <view className="bar"><view className="fill" style={{ width: '33%' }} /></view>

              <view className="stat">
                <text className="label">Scam</text>
                <text className="value">23%</text>
              </view>
              <view className="bar"><view className="fill" style={{ width: '23%' }} /></view>
            </view>
          </view>

          <view className="grid-1">
            <view className="card">
              <text className="card-title">Description</text>
              <text className="muted">
                This will contain short description of video. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
                labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
              </text>
            </view>
          </view>
        </view>
      </view>
    </view>
  )
}
