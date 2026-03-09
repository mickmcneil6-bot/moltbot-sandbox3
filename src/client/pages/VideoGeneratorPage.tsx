import { useState, useEffect, useCallback } from 'react'
import {
  getVideoConfig,
  generateVoiceover,
  generateVideo,
  getOutputUrl,
  type VideoConfig,
} from '../video-api'
import './VideoGeneratorPage.css'

type WizardStep = 'config' | 'script' | 'scenes' | 'review' | 'generating' | 'done'

const STEP_LABELS: Record<WizardStep, string> = {
  config: 'Setup',
  script: 'Script',
  scenes: 'Scenes',
  review: 'Review',
  generating: 'Generating',
  done: 'Done',
}

const STEPS: WizardStep[] = ['config', 'script', 'scenes', 'review', 'generating', 'done']

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIdx = STEPS.indexOf(current)
  return (
    <div className="step-indicator">
      {STEPS.filter((s) => s !== 'generating').map((step, idx) => {
        const actualIdx = STEPS.indexOf(step)
        let state = 'upcoming'
        if (actualIdx < currentIdx || current === 'done') state = 'completed'
        else if (actualIdx === currentIdx) state = 'active'
        // Show 'generating' as active for the 'done' position when generating
        if (step === 'done' && current === 'generating') state = 'active'
        return (
          <div key={step} className={`step-dot-group ${state}`}>
            <div className="step-dot">
              {state === 'completed' ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <span>{idx + 1}</span>
              )}
            </div>
            <span className="step-label">{STEP_LABELS[step]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function VideoGeneratorPage() {
  const [step, setStep] = useState<WizardStep>('config')
  const [config, setConfig] = useState<VideoConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [script, setScript] = useState('')
  const [scenes, setScenes] = useState<string[]>([''])
  const [generateMode, setGenerateMode] = useState<'full' | 'voiceover'>('full')

  // Generation state
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [outputFile, setOutputFile] = useState<string | null>(null)
  const [logs, setLogs] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      setConfigError(null)
      const data = await getVideoConfig()
      setConfig(data)
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to load config')
    } finally {
      setConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const addScene = () => setScenes([...scenes, ''])
  const removeScene = (idx: number) => setScenes(scenes.filter((_, i) => i !== idx))
  const updateScene = (idx: number, value: string) => {
    const updated = [...scenes]
    updated[idx] = value
    setScenes(updated)
  }

  const validScenes = scenes.filter((s) => s.trim() !== '')

  const canProceedToScenes = script.trim().length > 0
  const canProceedToReview = generateMode === 'voiceover' || validScenes.length > 0

  const handleGenerate = async () => {
    setStep('generating')
    setGenerating(true)
    setError(null)
    setOutputFile(null)
    setLogs(null)

    try {
      if (generateMode === 'voiceover') {
        setProgress('Generating voiceover audio via ElevenLabs...')
        const result = await generateVoiceover(script)
        setOutputFile(result.outputFile)
        setLogs(result.logs || null)
      } else {
        setProgress('Generating full video (this may take several minutes)...')
        const result = await generateVideo(script, validScenes, title || undefined)
        setOutputFile(result.outputFile)
        setLogs(result.logs || null)
      }
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
      setStep('review')
    } finally {
      setGenerating(false)
    }
  }

  const handleStartOver = () => {
    setStep('config')
    setTitle('')
    setScript('')
    setScenes([''])
    setOutputFile(null)
    setLogs(null)
    setError(null)
  }

  if (configLoading) {
    return (
      <div className="video-page">
        <div className="loading">
          <div className="spinner" />
          <p>Loading video generator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="video-page">
      <StepIndicator current={step} />

      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="dismiss-btn">Dismiss</button>
        </div>
      )}

      {/* Step 1: Config/Setup */}
      {step === 'config' && (
        <div className="wizard-step">
          <h2>Video Generator Setup</h2>
          <p className="step-description">
            Create short branded video clips with AI voiceover. Let's check your configuration first.
          </p>

          <div className="config-checks">
            <div className={`config-check ${config?.voice.configured ? 'ok' : 'missing'}`}>
              <span className="check-icon">{config?.voice.configured ? 'OK' : '!'}</span>
              <div>
                <strong>ElevenLabs Voice</strong>
                <p>{config?.voice.configured
                  ? `Configured (Voice: ${config.voice.voiceId})`
                  : 'ELEVENLABS_API_KEY not set - voiceover will not work'
                }</p>
              </div>
            </div>

            <div className={`config-check ${config?.cdp.configured ? 'ok' : 'missing'}`}>
              <span className="check-icon">{config?.cdp.configured ? 'OK' : '!'}</span>
              <div>
                <strong>Browser Capture (CDP)</strong>
                <p>{config?.cdp.configured
                  ? 'Configured - can capture scene frames'
                  : 'CDP_SECRET/WORKER_URL not set - full video generation unavailable'
                }</p>
              </div>
            </div>

            <div className="config-check ok">
              <span className="check-icon">OK</span>
              <div>
                <strong>Branding</strong>
                <p>
                  Brand: <strong>{config?.brand.name}</strong>
                  {' | '}Color: <span className="color-swatch" style={{ background: config?.brand.color }} />
                  {config?.brand.color}
                  {config?.brand.logoUrl ? ' | Logo configured' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="mode-select">
            <label className="mode-label">What would you like to create?</label>
            <div className="mode-options">
              <button
                className={`mode-btn ${generateMode === 'full' ? 'selected' : ''}`}
                onClick={() => setGenerateMode('full')}
                disabled={!config?.voice.configured || !config?.cdp.configured}
              >
                <strong>Full Video</strong>
                <span>Branded intro + scenes + outro + voiceover</span>
              </button>
              <button
                className={`mode-btn ${generateMode === 'voiceover' ? 'selected' : ''}`}
                onClick={() => setGenerateMode('voiceover')}
                disabled={!config?.voice.configured}
              >
                <strong>Voiceover Only</strong>
                <span>Generate narration audio from script text</span>
              </button>
            </div>
          </div>

          {configError && (
            <div className="error-banner" style={{ marginTop: '1rem' }}>
              <span>{configError}</span>
            </div>
          )}

          <div className="wizard-actions">
            <button
              className="btn btn-primary"
              onClick={() => setStep('script')}
              disabled={!config?.voice.configured}
            >
              Next: Write Script
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Script */}
      {step === 'script' && (
        <div className="wizard-step">
          <h2>Write Your Script</h2>
          <p className="step-description">
            Write the narration text that will be converted to voiceover audio via ElevenLabs.
          </p>

          <div className="form-group">
            <label htmlFor="video-title">Video Title (optional)</label>
            <input
              id="video-title"
              type="text"
              className="form-input"
              placeholder="e.g., Weekly Product Update"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="video-script">Narration Script</label>
            <textarea
              id="video-script"
              className="form-textarea"
              placeholder="Write your voiceover narration here. This text will be spoken by the ElevenLabs AI voice..."
              rows={8}
              value={script}
              onChange={(e) => setScript(e.target.value)}
            />
            <span className="char-count">{script.length} characters</span>
          </div>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep('config')}>
              Back
            </button>
            {generateMode === 'voiceover' ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep('review')}
                disabled={!canProceedToScenes}
              >
                Next: Review
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => setStep('scenes')}
                disabled={!canProceedToScenes}
              >
                Next: Add Scenes
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Scenes */}
      {step === 'scenes' && (
        <div className="wizard-step">
          <h2>Define Scenes</h2>
          <p className="step-description">
            Add scenes for your video. Use URLs to capture live web pages, or type descriptions for styled text slides.
          </p>

          <div className="scenes-list">
            {scenes.map((scene, idx) => (
              <div key={idx} className="scene-row">
                <span className="scene-num">{idx + 1}</span>
                <input
                  type="text"
                  className="form-input"
                  placeholder="URL (https://...) or text description"
                  value={scene}
                  onChange={(e) => updateScene(idx, e.target.value)}
                />
                {scenes.length > 1 && (
                  <button
                    className="btn btn-danger btn-sm scene-remove"
                    onClick={() => removeScene(idx)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="btn btn-secondary btn-sm" onClick={addScene}>
            + Add Scene
          </button>

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={() => setStep('script')}>
              Back
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setStep('review')}
              disabled={!canProceedToReview}
            >
              Next: Review
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 'review' && (
        <div className="wizard-step">
          <h2>Review & Generate</h2>
          <p className="step-description">
            Review your settings before generating.
          </p>

          <div className="review-card">
            <div className="review-row">
              <span className="review-label">Mode</span>
              <span className="review-value">
                {generateMode === 'full' ? 'Full Branded Video' : 'Voiceover Only'}
              </span>
            </div>
            {title && (
              <div className="review-row">
                <span className="review-label">Title</span>
                <span className="review-value">{title}</span>
              </div>
            )}
            <div className="review-row">
              <span className="review-label">Script</span>
              <span className="review-value script-preview">{script}</span>
            </div>
            {generateMode === 'full' && (
              <div className="review-row">
                <span className="review-label">Scenes ({validScenes.length})</span>
                <span className="review-value">
                  <ol className="scenes-preview">
                    {validScenes.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </span>
              </div>
            )}
            <div className="review-row">
              <span className="review-label">Brand</span>
              <span className="review-value">
                <span className="color-swatch" style={{ background: config?.brand.color }} />
                {config?.brand.name}
              </span>
            </div>
            <div className="review-row">
              <span className="review-label">Voice</span>
              <span className="review-value">{config?.voice.voiceId}</span>
            </div>
          </div>

          <div className="wizard-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setStep(generateMode === 'voiceover' ? 'script' : 'scenes')}
            >
              Back
            </button>
            <button className="btn btn-success btn-lg" onClick={handleGenerate}>
              Generate {generateMode === 'full' ? 'Video' : 'Voiceover'}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Generating */}
      {step === 'generating' && (
        <div className="wizard-step generating-step">
          <div className="generating-animation">
            <div className="spinner" />
          </div>
          <h2>Generating...</h2>
          <p className="step-description">{progress}</p>
          <p className="generating-hint">
            {generateMode === 'full'
              ? 'This may take several minutes. The pipeline is capturing frames, generating audio, and encoding video.'
              : 'Sending text to ElevenLabs for speech synthesis...'
            }
          </p>
        </div>
      )}

      {/* Step 6: Done */}
      {step === 'done' && outputFile && (
        <div className="wizard-step done-step">
          <div className="done-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="var(--success-color)" opacity="0.2"/>
              <path d="M14 24l7 7 13-13" stroke="var(--success-color)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>{generateMode === 'full' ? 'Video' : 'Voiceover'} Ready!</h2>
          <p className="step-description">
            Your {generateMode === 'full' ? 'branded video' : 'voiceover audio'} has been generated successfully.
          </p>

          <div className="output-actions">
            <a
              className="btn btn-primary btn-lg"
              href={getOutputUrl(outputFile)}
              download
            >
              Download {generateMode === 'full' ? 'Video (.mp4)' : 'Audio (.mp3)'}
            </a>
          </div>

          {logs && (
            <details className="generation-logs">
              <summary>Generation Logs</summary>
              <pre>{logs}</pre>
            </details>
          )}

          <div className="wizard-actions">
            <button className="btn btn-secondary" onClick={handleStartOver}>
              Create Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
