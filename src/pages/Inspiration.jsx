import { useState, useRef } from 'react'
import {
  Card,
  Text,
  Button,
  EmptyState,
  TextInput,
  HStack,
  VStack,
} from '@astryxdesign/core'
import { useInspirationBoards, generateId } from '../store'
import { compressImage } from '../utils/imageUtils'
import Lightbox from '../components/Lightbox'
import AstryxScope from '../ui/ax/AstryxScope'
import { useSEO } from '../ui/seo'

function downloadImage(src, filename) {
  const a = document.createElement('a')
  a.href = src
  a.download = filename
  a.click()
}

function BoardCard({ board, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(board.name)
  const previews = board.images?.slice(0, 4) ?? []

  return (
    <Card
      padding={0}
      style={{ overflow: 'hidden', cursor: 'pointer' }}
      onClick={() => onSelect(board.id)}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', aspectRatio: '4/3', background: 'var(--bg-tertiary)' }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ overflow: 'hidden', background: 'var(--bg-tertiary)' }}>
            {previews[i]
              ? <img src={previews[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)' }} />}
          </div>
        ))}
      </div>

      <HStack justify="between" align="center" gap={2} style={{ padding: '12px 16px' }}>
        {editing ? (
          <div style={{ flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
            <TextInput
              label="Board name"
              isLabelHidden
              value={name}
              onChange={setName}
              hasAutoFocus
              width="100%"
              onEnter={() => {
                if (name.trim()) onRename(board.id, name.trim())
                else setName(board.name)
                setEditing(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setName(board.name); setEditing(false) }
              }}
            />
          </div>
        ) : (
          <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
            <Text type="body" size="sm" weight="semibold" maxLines={1}>{board.name}</Text>
            <Text type="supporting" size="xsm" color="secondary">{board.images?.length ?? 0} images</Text>
          </VStack>
        )}
        <HStack gap={1} onClick={(e) => e.stopPropagation()}>
          {editing ? (
            <Button
              label="Done"
              variant="secondary"
              size="sm"
              onClick={() => {
                if (name.trim()) onRename(board.id, name.trim())
                else setName(board.name)
                setEditing(false)
              }}
            />
          ) : (
            <Button label="Rename" variant="ghost" size="sm" onClick={() => setEditing(true)} />
          )}
          <Button
            label="×"
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!board.images?.length || window.confirm(`Delete "${board.name}" and its ${board.images.length} image${board.images.length !== 1 ? 's' : ''}?`)) {
                onDelete(board.id)
              }
            }}
            style={{ color: 'var(--color-error, #FF3B30)' }}
          />
        </HStack>
      </HStack>
    </Card>
  )
}

function BoardDetail({ board, onBack, onUpdate }) {
  const fileRef = useRef()
  const [lightboxIdx, setLightboxIdx] = useState(null)

  const boardImagesRef = useRef(board.images)
  boardImagesRef.current = board.images

  function addImages(files) {
    const readers = Array.from(files).map(file => new Promise(resolve => {
      const r = new FileReader()
      r.onload = e => compressImage(e.target.result).then(resolve)
      r.readAsDataURL(file)
    }))
    Promise.all(readers).then(results => {
      onUpdate(board.id, { images: [...(boardImagesRef.current ?? []), ...results] })
    }).catch(console.error)
  }

  function removeImage(idx) {
    const next = board.images.filter((_, i) => i !== idx)
    onUpdate(board.id, { images: next })
  }

  function downloadAll() {
    board.images.forEach((img, i) => {
      setTimeout(() => downloadImage(img, `${board.name}-${i + 1}.jpg`), i * 120)
    })
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 70px' }}>
      {lightboxIdx !== null && (
        <Lightbox
          images={board.images}
          startIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <HStack gap={3} align="center" style={{ marginBottom: 24, flexWrap: 'wrap' }}>
        <Button label="← Back" variant="secondary" size="sm" onClick={onBack} />
        <Text type="large" weight="bold" style={{ flex: 1, letterSpacing: '-0.4px' }}>{board.name}</Text>
        {board.images?.length > 0 && (
          <Button label="↓ Download All" variant="secondary" size="sm" onClick={downloadAll} />
        )}
      </HStack>

      <Card
        padding={6}
        style={{
          border: '2px dashed var(--color-border, var(--border))',
          textAlign: 'center',
          marginBottom: 24,
          cursor: 'pointer',
        }}
        onClick={() => fileRef.current.click()}
      >
        <Text type="display-3" color="secondary" display="block" style={{ opacity: 0.4, marginBottom: 8 }}>+</Text>
        <Text type="body" size="sm" color="secondary">Add images from Pinterest, Instagram, etc.</Text>
        <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: 'none' }}
          onChange={(e) => addImages(e.target.files)} />
      </Card>

      {board.images?.length > 0 && (
        <div style={{ columns: 3, gap: 12 }}>
          {board.images.map((img, i) => (
            <div
              key={i}
              style={{ breakInside: 'avoid', marginBottom: 12, borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative', cursor: 'zoom-in' }}
              onClick={() => setLightboxIdx(i)}
            >
              <img src={img} alt="" style={{ width: '100%', display: 'block', transition: 'transform 0.3s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
              {/* Overlay buttons — shown on hover via pointer-events */}
              <div style={{
                position: 'absolute', top: 8, right: 8,
                display: 'flex', gap: 6,
              }}>
                <button
                  onClick={e => { e.stopPropagation(); downloadImage(img, `${board.name}-${i + 1}.jpg`) }}
                  title="Download"
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >↓</button>
                <button
                  onClick={e => { e.stopPropagation(); removeImage(i) }}
                  style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.5)', color: '#fff',
                    fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Inspiration() {
  const [boards, setBoards] = useInspirationBoards()
  const [selectedId, setSelectedId] = useState(null)

  useSEO({ path: '/inspiration' })

  function createBoard() {
    const board = { id: generateId(), name: 'New Board', images: [], createdAt: Date.now() }
    setBoards(prev => [...prev, board])
  }

  function renameBoard(id, name) {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, name } : b))
  }

  function deleteBoard(id) {
    setBoards(prev => prev.filter(b => b.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  function updateBoard(id, updates) {
    setBoards(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const selected = boards.find(b => b.id === selectedId)

  return (
    <AstryxScope>
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
        {selected ? (
          <BoardDetail board={selected} onBack={() => setSelectedId(null)} onUpdate={updateBoard} />
        ) : (
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 70px' }}>
            <div className="reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 30 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text
                  type="supporting"
                  size="xsm"
                  weight="bold"
                  color="secondary"
                  display="block"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
                >
                  Moodboards
                </Text>
                <h1 style={{ font: 'inherit', margin: 0 }}>
                  <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-1.2px', lineHeight: 1 }}>
                    AI influencer inspiration
                  </Text>
                </h1>
              </div>
              <Button label="+ New Board" variant="primary" size="md" onClick={createBoard} />
            </div>

            {boards.length === 0 ? (
              <div className="reveal-1" style={{ padding: '60px 0' }}>
                <EmptyState
                  title="No boards yet"
                  description="Create a board to start saving mood board inspiration"
                  actions={<Button label="+ New Board" variant="primary" size="md" onClick={createBoard} />}
                />
              </div>
            ) : (
              <div className="reveal-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {boards.map((board) => (
                  <BoardCard
                    key={board.id}
                    board={board}
                    onSelect={setSelectedId}
                    onRename={renameBoard}
                    onDelete={deleteBoard}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AstryxScope>
  )
}
