import { useMemo, useState } from 'react'
import { SHAPE_OPTIONS } from '../particles/shapes/catalog'
import type { ParticleShape, ShapeOption } from '../particles/shapes/types'
import { preloadSceneRenderer } from '../scenes/sceneProfiles'
import { useAppStore } from '../store/appStore'

interface SceneLibraryProps {
  onRequestClose: () => void
}

export function SceneLibrary({ onRequestClose }: SceneLibraryProps) {
  const particleShape = useAppStore((state) => state.particleShape)
  const setParticleShape = useAppStore((state) => state.setParticleShape)
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
          <span>S-{String(shape.featuredOrder).padStart(2, '0')}</span>
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
        <div className="scene-library__count">8 场景</div>
      </header>

      <div className="scene-library__grid" aria-label="正式场景">
        {SHAPE_OPTIONS.map(renderSceneButton)}
      </div>

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
