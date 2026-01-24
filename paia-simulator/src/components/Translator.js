import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

const Translator = ({ children }) => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const languages = [
    { code: 'en', label: t('language.english'), flag: '🇬🇧' },
    { code: 'es', label: t('language.spanish'), flag: '🇪🇸' },
    { code: 'fr', label: t('language.french'), flag: '🇫🇷' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: 10000,
      }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            color: '#333',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
          }}
        >
          <span style={{ fontSize: '18px' }}>{currentLanguage.flag}</span>
          <span>{currentLanguage.label}</span>
          <span style={{
            fontSize: '12px',
            transition: 'transform 0.2s ease',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            minWidth: '160px',
          }}>
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: 'none',
                  background: i18n.language === lang.code
                    ? 'rgba(102, 126, 234, 0.1)'
                    : 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: i18n.language === lang.code ? '600' : '500',
                  color: i18n.language === lang.code ? '#667eea' : '#333',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (i18n.language !== lang.code) {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (i18n.language !== lang.code) {
                    e.currentTarget.style.background = 'white';
                  }
                }}
              >
                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {i18n.language === lang.code && (
                  <span style={{ marginLeft: 'auto', color: '#667eea' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </>
  );
};

export default Translator;
