import React from 'react';
import { UpdateInfo } from '../services/updateService';

export interface UpdateNotificationProps {
  updateInfo: UpdateInfo;
  onDownload: () => void;
  onRemindLater: () => void;
  onSkip: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  updateInfo,
  onDownload,
  onRemindLater,
  onSkip,
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        backgroundColor: '#1e2330',
        borderRadius: '12px',
        padding: '24px',
        width: '400px',
        maxWidth: '90%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: '#fff',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        border: '1px solid #2a3142'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            New Version Available
          </h3>
          <span style={{ 
            backgroundColor: '#2a3142', 
            color: '#8b9bb4', 
            fontSize: '12px', 
            padding: '2px 8px', 
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>
            {updateInfo.version}
          </span>
        </div>

        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255,255,255,0.7)', 
          maxHeight: '150px', 
          overflowY: 'auto',
          lineHeight: '1.5'
        }}>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{updateInfo.notes}</p>
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
          SHA256 signature available
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
          <button
            onClick={onDownload}
            style={{
              width: '100%',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '10px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Download
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRemindLater}
              style={{
                flex: 1,
                backgroundColor: '#2a3142',
                color: '#fff',
                border: '1px solid #3b4255',
                padding: '8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Remind Later
            </button>
            <button
              onClick={onSkip}
              style={{
                flex: 1,
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid transparent',
                padding: '8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Skip Version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
