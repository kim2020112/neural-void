import { useMemo, useState } from 'react'
import {
  FEATURED_SHAPE_OPTIONS,
  LAB_SHAPE_OPTIONS,
  SHAPE_OPTIONS,
} from '../particles/shapes/catalog'
import type { ParticleShape, ShapeOption } from '../particles/shapes/types'
import { preloadSceneRenderer } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

interface SceneLibraryProps {
  onRequestClose: () => void
}

export function SceneLibrary({ onRequestClose }: SceneLibraryProps) {
  const particleShape = useAppStore((state) => state.particleShape)
  const setParticleShape = useAppStore((state) => state.setParticleShape)
  const [labOpen, setLabOpen] = useState(() =>
    LAB_SHAPE_OPTIONS.some((shape) => shape.id === particleShape),
  )
  const [pendingShape, setPendingShape] = useState<ParticleShape | null>(null)
  const [failedShape, setFailedShape] = useState<ParticleShape | null>(null)
  const activeShape = useMemo(
    () => SHAPE_OPTIONS.find((shape) => shape.id === particleShape),
    [particleShape],
  )

  const warmScene = (shape: ParticleShape) => {
    void preloadSceneRenderer(shape).catch(() => undefined)
  }

  const selectScene = async (shape: ParticleShape) => {
    if (shape === particleShape || pendingShape) return
    setPendingShape(shape)
    setFailedShape(null)
    try {
      await preloadSceneRenderer(shape)
      if (LAB_SHAPE_OPTIONS.some((option) => option.id === shape)) setLabOpen(true)
      setParticleShape(shape)
      if (window.matchMedia('(max-width: 760px)').matches) onRequestClose()
    } catch {
      setFailedShape(shape)
    } finally {
      setPendingShape(null)
    }
  }

  const renderSceneButton = (shape: ShapeOption) => {
    const active = particleShape === shape.id
    const pending = pendingShape === shape.id
    const failed = failedShape === shape.id
    const status = pending
      ? '正在加载场景'
      : failed
        ? '加载失败，点击重试'
        : shape.hint

    return (
      <button
        key={shape.id}
        type="button"
        className="scene-library__card"
        data-scene-id={shape.id}
        aria-busy={pending}
        aria-pressed={active}
        disabled={pendingShape !== null}
        style={{
          borderColor: active ? shape.accent : undefined,
          boxShadow: active ? `0 0 18px ${shape.accent}24` : undefined,
          opacity: pendingShape && !pending ? 0.58 : 1,
        }}
        onPointerEnter={() => warmScene(shape.id)}
        onPointerDown={() => warmScene(shape.id)}
        onFocus={() => warmScene(shape.id)}
        onClick={() => { void selectScene(shape.id) }}
      >
        <span className="scene-library__accent" style={{ background: shape.accent }} />
        <span className="scene-library__card-meta">
          {shape.tier === 'featured' && (
            <span>{String(shape.featuredOrder).padStart(2, '0')}</span>
          )}
          <span>{shape.tier === 'featured' ? '旗舰' : '实验'}</span>
        </span>
        <strong className="scene-library__card-title">{shape.label}</strong>
        <span className="scene-library__card-hint">{status}</span>
      </button>
    )
  }

  return (
    <section
      id="scene-library-panel"
      className="scene-library"
      aria-label="场景库"
      data-testid="scene-library"
    >
      <header className="scene-library__header">
        <div>
          <div className="scene-library__eyebrow">场景库</div>
          <div className="scene-library__title">{activeShape?.label ?? '未命名结构'}</div>
        </div>
        <div className="scene-library__count">4 旗舰</div>
      </header>

      <div className="scene-library__grid" aria-label="旗舰场景">
        {FEATURED_SHAPE_OPTIONS.map(renderSceneButton)}
      </div>

      <button
        type="button"
        data-testid="lab-toggle"
        className="scene-library__lab-toggle"
        aria-controls="scene-library-lab"
        aria-expanded={labOpen}
        onClick={() => setLabOpen((open) => !open)}
      >
        <span>实验室 · {LAB_SHAPE_OPTIONS.length}</span>
        <span className="scene-library__lab-state">{labOpen ? '收起' : '展开'}</span>
      </button>

      {labOpen && (
        <div id="scene-library-lab" className="scene-library__grid scene-library__grid--lab" aria-label="实验场景">
          {LAB_SHAPE_OPTIONS.map(renderSceneButton)}
        </div>
      )}

      <div className="scene-library__status" role="status" aria-live="polite">
        {pendingShape
          ? `正在载入 ${SHAPE_OPTIONS.find((shape) => shape.id === pendingShape)?.label ?? ''}`
          : failedShape
            ? '场景载入失败，原场景保持不变'
            : '场景就绪'}
      </div>
    </section>
  )
}
