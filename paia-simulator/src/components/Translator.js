import React from 'react';
import { useTranslation } from 'react-i18next';

const Translator = ({ children }) => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const languages = [
    { code: 'en', label: t('language.english'), flag: '🇬🇧' },
    { code: 'es', label: t('language.spanish'), flag: '🇪🇸' },
    { code: 'fr', label: t('language.french'), flag: '🇫🇷' }
  ];

  return (
    <>
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 10000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(0, 0, 0, 0.1)'
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: '500',
          color: '#666',
          marginRight: '8px',
          alignSelf: 'center'
        }}>
          {t('language.selector')}:
        </span>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            style={{
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              background: i18n.language === lang.code
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#f0f0f0',
              color: i18n.language === lang.code ? '#fff' : '#333',
              boxShadow: i18n.language === lang.code
                ? '0 2px 4px rgba(102, 126, 234, 0.3)'
                : 'none',
              transform: i18n.language === lang.code ? 'scale(1.05)' : 'scale(1)',
            }}
            onMouseEnter={(e) => {
              if (i18n.language !== lang.code) {
                e.target.style.background = '#e0e0e0';
                e.target.style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              if (i18n.language !== lang.code) {
                e.target.style.background = '#f0f0f0';
                e.target.style.transform = 'scale(1)';
              }
            }}
          >
            <span style={{ marginRight: '6px' }}>{lang.flag}</span>
            {lang.label}
          </button>
        ))}
      </div>
      {children}
    </>
  );
};

export default Translator;
