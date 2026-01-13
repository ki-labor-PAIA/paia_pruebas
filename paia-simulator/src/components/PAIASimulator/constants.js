/**
 * Constants for PAIASimulator component
 */

// Initial state for ReactFlow
export const initialNodes = [];
export const initialEdges = [];

// Personality colors mapping
export const personalityColors = {
  'Analítico': '#023e7d',     // Azul
  'Creativo': '#049a8f',      // Morado
  'Empático': '#b9375e',      // Verde
  'Pragmático': '#4a2419',    // Naranja
  'Entusiasta': '#dbb42c',    // Rosa
  'Metódico': '#932f6d',      // Cyan
  'Innovador': '#4c956c',     // Lima
  'Colaborativo': '#f4a259',  // Orange
  'Estratégico': '#564592',   // Rojo coral
  'Aventurero': '#e76f51',    // Turquesa
  'Reflexivo': '#6a994e',     // Verde menta
  'Dinámico': '#c32f27',      // Rosa salmón
  'default': '#6366f1'        // Indigo por defecto
};

/**
 * Get agent color based on personality
 * @param {string} personality - The personality type
 * @returns {string} Hex color code
 */
export const getAgentColor = (personality) => {
  if (!personality) return personalityColors['default'];
  const key = personality.trim();
  return personalityColors[key] || personalityColors['default'];
};
