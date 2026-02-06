// Tutorial steps for Library page
// Complete guide covering ALL functionalities

const librarySteps = [
  // Welcome
  {
    selector: null, // No element, just overlay
    title: 'Welcome to PAIA!',
    description: 'PAIA is a platform for creating and managing AI agent workflows. Let\'s take a quick tour to show you around! This tutorial will guide you through every feature step by step.',
    placement: 'center',
    requireClick: false
  },

  // Tabs overview
  {
    selector: '[data-tutorial="tabs"]',
    title: ' Navigation Tabs',
    description: 'These tabs let you navigate between different sections: My Flows (your workflows), My Agents (your AI agents), Friends Active Flows (collaborative workflows), and Public Agents (community agents).',
    placement: 'bottom',
    requireClick: false
  },

  // My Flows tab
  {
    selector: '[data-tutorial="tab-flows"]',
    title: ' My Flows',
    description: 'This tab shows all your saved workflows. A flow is a visual diagram that shows how your AI agents interact and work together.',
    placement: 'bottom',
    requireClick: false
  },

  // CREATE SAMPLE FLOWS - This is an action step
  {
    selector: null,
    title: ' Let\'s Create Example Flows!',
    description: 'To show you how flow cards work, I\'ll add some example flows temporarily. You\'ll be able to see how they look and what actions you can perform on them!',
    placement: 'center',
    requireClick: false,
    action: 'createSampleFlows' // This triggers the action
  },

  // Flow card example (if exists)
  {
    selector: '[data-tutorial="flow-card"]',
    title: ' Flow Cards',
    description: 'Each card represents a saved flow. You can see the flow name, description, and action buttons. Click on a card to open and edit it.',
    placement: 'right',
    requireClick: false
  },

  // Flow actions
  {
    selector: '[data-tutorial="flow-actions"]',
    title: ' Flow Actions',
    description: 'Use these buttons to: Edit the flow, Delete it, or view more details. The edit button (pencil icon) lets you modify the flow in the canvas.',
    placement: 'left',
    requireClick: false
  },

  // My Agents tab
  {
    selector: '[data-tutorial="tab-agents"]',
    title: ' My Agents',
    description: 'This tab shows all your AI agents. Agents are the individual AI assistants that perform tasks in your flows. Click here to view them.',
    placement: 'bottom',
    requireClick: false,
    action: 'switchToAgentsTab' // Auto-switch to agents tab
  },

  // CREATE SAMPLE AGENTS - This is an action step
  {
    selector: null,
    title: ' Let\'s Create Example Agents!',
    description: 'To show you how agent cards work, I\'ll add some example agents temporarily. You\'ll be able to see what agents look like and what actions you can perform on them!',
    placement: 'center',
    requireClick: false,
    action: 'createSampleAgents' // This triggers the action
  },

  // Agent card
  {
    selector: '[data-tutorial="agent-card"]',
    title: ' Agent Cards',
    description: 'Each agent card shows the agent\'s name, personality type, and expertise area. You can chat with agents, edit them, or delete them.',
    placement: 'right',
    requireClick: false
  },

  // Agent actions
  {
    selector: '[data-tutorial="agent-chat"]',
    title: ' Chat with Agent',
    description: 'Click the chat icon to open a conversation with this agent. You can test and interact with your agents directly!',
    placement: 'left',
    requireClick: false
  },

  {
    selector: '[data-tutorial="agent-edit"]',
    title: ' Edit Agent',
    description: 'Click the edit icon to modify the agent\'s settings: name, personality, expertise, and even WhatsApp integration.',
    placement: 'left',
    requireClick: false
  },

  {
    selector: '[data-tutorial="agent-delete"]',
    title: ' Delete Agent',
    description: 'Click the trash icon to permanently delete an agent. Don\'t worry - you\'ll get a confirmation dialog before deletion.',
    placement: 'left',
    requireClick: false
  },

  // Public Agents tab
  {
    selector: '[data-tutorial="tab-public-agents"]',
    title: ' Public Agents',
    description: 'This tab shows agents shared by the community. You can browse and use public agents in your own flows!',
    placement: 'bottom',
    requireClick: false,
    action: 'switchToPublicAgentsTab' // Auto-switch to public agents tab
  },

  // Friends Active Flows
  {
    selector: '[data-tutorial="tab-friends"]',
    title: ' Friends Active Flows',
    description: 'See what your connected friends are working on. You can collaborate and share workflows with other users.',
    placement: 'bottom',
    requireClick: false,
    action: 'switchToFriendsTab' // Auto-switch to friends tab
  },

  // Header buttons
  {
    selector: '[data-tutorial="btn-notifications"]',
    title: ' Notifications',
    description: 'Click here to see your notifications: connection requests, flow updates, and system messages.',
    placement: 'bottom',
    requireClick: false
  },

  {
    selector: '[data-tutorial="btn-tutorial"]',
    title: ' Tutorial Button',
    description: 'You can always restart this tutorial by clicking here. Helpful if you need a refresher!',
    placement: 'bottom',
    requireClick: false
  },

  {
    selector: '[data-tutorial="btn-connect"]',
    title: ' Connect with Users',
    description: 'Click here to connect with other PAIA users. Share flows, collaborate on projects, and build together!',
    placement: 'bottom',
    requireClick: false
  },

  {
    selector: '[data-tutorial="btn-create-agent"]',
    title: ' Create New Agent',
    description: 'Click here to create a new AI agent. You can configure its personality, expertise, and even connect it to WhatsApp!',
    placement: 'bottom',
    requireClick: false
  },

  // Library Tutorial Complete - Cleanup option
  {
    selector: null,
    title: ' Library Tutorial Complete! 🎉',
    description: 'Great job! You now understand the Library. Would you like to keep the example flows and agents, or remove them?',
    placement: 'center',
    requireClick: false,
    showCleanupOptions: true // This will show cleanup buttons
  },

  // THE IMPORTANT ONE - Create Flow
  {
    selector: '[data-tutorial="btn-create-flow"]',
    title: ' Ready for the Canvas!',
    description: 'Now it\'s time to create your first flow! Click this button to enter the Canvas, where you\'ll build your AI workflow visually. This is where the magic happens!',
    placement: 'bottom',
    requireClick: true,
    action: 'required-click',
    blockOtherClicks: true,
    highlightPulse: true
  }
];

export default librarySteps;