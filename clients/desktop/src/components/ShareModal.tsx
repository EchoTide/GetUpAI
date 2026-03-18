import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShareCard } from './ShareCard';
import { generateShareImage } from '../utils/shareImage';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShareModal({ open, onClose }: ShareModalProps) {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    setMessage(null);
    try {
      const blob = await generateShareImage(cardRef.current);
      const buffer = await blob.arrayBuffer();
      await (window.electronAPI as any)?.copyImageToClipboard?.(buffer);
      setMessage(t('share.copied'));
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      console.error(e);
      setMessage(t('share.copy_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    setMessage(null);
    try {
      const blob = await generateShareImage(cardRef.current);
      const buffer = await blob.arrayBuffer();
      const dateStr = new Date().toISOString().split('T')[0];
      const res = await (window.electronAPI as any)?.saveImage?.(buffer, `getup-ai-${dateStr}.png`);
      if (res?.success) {
        setMessage(t('share.saved'));
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (e) {
      console.error(e);
      setMessage(t('share.save_fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(5px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          alignItems: 'center',
          position: 'relative',
          maxHeight: '90vh',
          width: '100%',
          maxWidth: 480,
          height: 'min(90vh, 980px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-testid="share-modal-preview"
          style={{
          overflow: 'auto',
          width: '100%',
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '20px 0',
        }}>
          <ShareCard ref={cardRef} />
        </div>

        <div style={{ display: 'flex', gap: 12, paddingBottom: 20 }}>
          <button
            onClick={handleCopy}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            {loading ? t('modal.generating') : t('share.copy_image')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              background: '#40DCFF',
              border: 'none',
              color: '#000',
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              transition: 'all 0.2s',
              outline: 'none',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {loading ? t('modal.generating') : t('share.save_image')}
          </button>
        </div>

        {message && (
          <div style={{
            position: 'absolute',
            bottom: 80,
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 14,
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'fadeIn 0.2s ease-out',
            zIndex: 10,
          }}>
            {message}
          </div>
        )}
      </div>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
}
