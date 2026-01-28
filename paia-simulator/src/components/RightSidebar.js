
import { useTranslation } from 'react-i18next';
import { User, Bot, Send, Calendar, StickyNote, Globe, Plus } from 'lucide-react';


export default function RightSidebar({
  onAddActor,
  onAddTelegram,
  onAddCalendar,
  onConnect,
  onCreateAgent,
  onChatWithAgent,
  nodes,
  publicAgents,
  onLoadPublicAgents,
  onLoadMyAgents,
  onAddPublicAgent,
  isBackendConnected,
  isOpen = true
}) {

  const { t } = useTranslation();
  return (
    <div className={`sidebar right ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={{
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease'
    }}>
      <div className="button-group">
        <div className="button-group-title">{t('rightSidebar.addActors')}</div>
        <button data-tour="add-actors" onClick={() => onAddActor('human')} className="discreet-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <User size={16} /> {t('rightSidebar.simpleHuman')}
        </button>
        <button onClick={() => onAddActor('ai')} className="discreet-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Bot size={16} /> {t('rightSidebar.simpleAI')}
        </button>
        <button data-tour="create-paia-agent" onClick={onCreateAgent} className="discreet-button" style={{ background: 'var(--primary-color) !important', color: 'white !important', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Bot size={16} /> {t('rightSidebar.createPAIAAgent')}
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">🔧 Tools</div>
        <button onClick={onAddTelegram} className="discreet-button" style={{ background: '#0088cc', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Send size={16} /> Telegram
        </button>
        <button onClick={onAddCalendar} className="discreet-button" style={{ background: '#4285f4', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Calendar size={16} /> Google Calendar
        </button>
        <button onClick={() => onCreateAgent({ isNotesNode: true })} className="discreet-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <StickyNote size={16} /> Create Notes Node
        </button>
      </div>

      <div className="button-group" data-tour="connect-actors">
        <div className="button-group-title">{t('rightSidebar.connections')}</div>
        <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          {t('rightSidebar.dragToConnect')}
        </div>
      </div>

      {isBackendConnected && (
        <div className="button-group">
          <div className="button-group-title">{t('rightSidebar.publicAgents')}</div>
          <button
            onClick={onLoadPublicAgents}
            className="discreet-button"
            style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Globe size={16} /> {t('rightSidebar.loadAvailableAgents')}
          </button>

          <button
            onClick={onLoadMyAgents}
            className="discreet-button"
            style={{
              marginBottom: '10px',
              background: 'rgba(72, 187, 120, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Bot size={16} /> Load My Agents
          </button>

          {publicAgents.length > 0 && (
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              {publicAgents.map(agent => (
                <div 
                  key={agent.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',  
                    marginBottom: '6px',
                    padding: '6px 8px',
                    background: 'rgba(108, 92, 231, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(108, 92, 231, 0.3)'
                  }}
                >
                  <div style={{ fontSize: '0.75em', flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{agent.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                      {agent.expertise} • {agent.user_id}
                    </div>
                  </div>
                  <button
                    onClick={() => onAddPublicAgent(agent)}
                    style={{
                      padding: '4px 6px',
                      fontSize: '0.7em',
                      background: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {publicAgents.length === 0 && (
            <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {t('rightSidebar.loadAgentsToConnect')}
            </div>
          )}
        </div>
      )}

      <div className="button-group">
        <div className="button-group-title">💬 Chat</div>
        <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Chat with agents and humans
        </div>
        {nodes.filter(n => n.data.actorType === 'human' || n.data.actorType === 'ai').length > 0 ? (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {nodes.filter(n => n.data.actorType === 'human' || n.data.actorType === 'ai').map(node => (
              <button
                key={node.id}
                onClick={() => onChatWithAgent(node.id)}
                className="discreet-button"
                style={{ 
                  marginBottom: '6px',
                  padding: '8px 10px !important',
                  fontSize: '0.8em',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...(node.data.isExternal && {
                    border: '1px dashed #6c5ce7',
                    background: 'rgba(108, 92, 231, 0.05)'
                  }),
                  ...(node.data.actorType === 'human' && {
                    border: '1px solid #f59e0b',
                    background: 'rgba(245, 158, 11, 0.1)'
                  })
                }}
              >
                <span>
                  {node.data.emoji} {node.data.label}
                </span>
                <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>
                  {node.data.isExternal && t('rightSidebar.external')}
                  {node.data.actorType === 'human' && t('rightSidebar.you')}
                  {node.data.actorType === 'ai' && !node.data.isExternal && t('rightSidebar.ai')}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ 
            fontSize: '0.8em', 
            color: 'var(--text-secondary)', 
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '16px 8px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px',
            border: '1px dashed var(--border-color)'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '1.5em' }}>💬</div>
            <div>Create agents to start chatting</div>
            <div style={{ fontSize: '0.7em', marginTop: '4px' }}>
              You can chat with AI agents and humans
            </div>
          </div>
        )}
      </div>

      </div>
  );
}
