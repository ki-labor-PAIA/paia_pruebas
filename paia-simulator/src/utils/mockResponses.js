export function generateMockResponse(agent, userMessage) {
  const responses = {
    scheduling: [
      `Como especialista en programación, puedo ayudarte a organizar tu tiempo. ¿Necesitas agendar alguna cita específica?`,
      `Veo que mencionas "${userMessage.slice(0, 20)}...". ¿Te gustaría que revise tu calendario disponible?`,
      `Perfecto, puedo ayudarte con eso. ¿Qué fechas y horarios prefieres?`
    ],
    travel: [
      `Como experto en viajes, te puedo ayudar a planificar tu próximo destino. ¿A dónde quieres ir?`,
      `Interesante. Para planificar tu viaje necesito saber las fechas y destino. ¿Podrías darme más detalles?`,
      `Excelente elección. ¿Necesitas ayuda con vuelos, hoteles o ambos?`
    ],
    research: [
      `Como investigador, puedo buscar información detallada sobre ese tema. ¿Qué aspecto específico te interesa más?`,
      `Déjame investigar eso por ti. ¿Necesitas fuentes académicas o información general?`,
      `Muy interesante pregunta. Te ayudo a encontrar la información más relevante.`
    ],
    creativity: [
      `¡Me encanta tu idea creativa! Como especialista en creatividad, puedo ayudarte a desarrollarla más.`,
      `Desde mi perspectiva creativa, veo muchas posibilidades en lo que propones. ¿Exploramos juntos?`,
      `Excelente. La creatividad no tiene límites. ¿Qué dirección quieres tomar?`
    ],
    finance: [
      `Como asesor financiero, puedo ayudarte a analizar esa situación económica. ¿Hablamos de inversiones o presupuesto?`,
      `Interesante tema financiero. ¿Necesitas ayuda con planificación, inversiones o análisis de gastos?`,
      `Perfecto. Las finanzas son mi especialidad. ¿Qué objetivo financiero tienes en mente?`
    ],
    general: [
      `Como tu asistente general, estoy aquí para ayudarte con cualquier cosa que necesites.`,
      `Entiendo tu consulta. ¿Podrías darme más detalles para ayudarte mejor?`,
      `Por supuesto, puedo ayudarte con eso. ¿Qué más necesitas saber?`
    ]
  };

  const personalityMods = {
    friendly: 'Es un placer ayudarte. ',
    professional: 'Desde luego. ',
    creative: '¡Qué interesante! ',
    analytical: 'Analicemos esto. '
  };

  const expertiseResponses = responses[agent.expertise] || responses.general;
  const randomResponse = expertiseResponses[Math.floor(Math.random() * expertiseResponses.length)];
  const personalityMod = personalityMods[agent.personality] || '';
  
  return personalityMod + randomResponse;
}