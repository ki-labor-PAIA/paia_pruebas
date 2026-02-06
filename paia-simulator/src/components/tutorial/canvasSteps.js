// Tutorial steps for Canvas/Simulator page
// Complete guide covering ALL functionalities

const canvasSteps = [
  // Welcome to Canvas
  {
    selector: null,
    title: ' Welcome to the Canvas!',
    description: 'This is where you build your AI workflows visually. You\'ll drag and drop agents, connect them together, and create powerful automation. Let\'s learn how to use every feature!',
    placement: 'center',
    requireClick: false
  },

  // Left Sidebar - Overview
  {
    selector: '[data-tutorial="left-sidebar"]',
    title: ' Control Panel',
    description: 'This left sidebar is your control panel. Here you\'ll find buttons to save your flow, run simulations, and manage your workflow settings.',
    placement: 'right',
    requireClick: false
  },

  // Right Sidebar - Overview (showing the button area)
  {
    selector: '[data-tutorial="right-sidebar"]',
    title: ' Building Blocks',
    description: 'This right sidebar contains all the building blocks for your workflow. Click these buttons to add AI agents, human actors, and integrations to your canvas.',
    placement: 'left',
    requireClick: false
  },

  // Add AI Agent
  {
    selector: '[data-tutorial="btn-add-agent"]',
    title: ' Add AI Agent',
    description: 'Click here to add a new AI agent to your canvas. Agents are the core of your workflow - they can chat, analyze, make decisions, and perform tasks.',
    placement: 'left',
    requireClick: false
  },

  // Add Human Actor
  {
    selector: '[data-tutorial="btn-add-human"]',
    title: ' Add Human Actor',
    description: 'Add a human participant to your workflow. Useful when you need human input or decision-making in your automation.',
    placement: 'left',
    requireClick: false
  },

  // Add Calendar
  {
    selector: '[data-tutorial="btn-add-calendar"]',
    title: ' Add Calendar Integration',
    description: 'Integrate with Google Calendar or Microsoft Calendar. Schedule events, check availability, and manage appointments.',
    placement: 'left',
    requireClick: false
  },

  // Add Telegram
  {
    selector: '[data-tutorial="btn-add-telegram"]',
    title: ' Add Telegram Bot',
    description: 'Add Telegram bot integration to your workflow. Send and receive messages through Telegram in your automation.',
    placement: 'left',
    requireClick: false
  },

  // Connect Gmail
  {
    selector: '[data-tutorial="btn-connect-gmail"]',
    title: ' Connect Gmail',
    description: 'Connect your Gmail account to send and receive emails in your workflows. Authorize PAIA to access your Gmail for automated email handling.',
    placement: 'left',
    requireClick: false
  },

  // Add Notes Node
  {
    selector: '[data-tutorial="btn-add-notes"]',
    title: ' Create Notes Node',
    description: 'Create a notes node to document your workflow, add reminders, or store information. Perfect for keeping track of important details!',
    placement: 'left',
    requireClick: false
  },

  // Load Public Agents
  {
    selector: '[data-tutorial="btn-load-public-agents"]',
    title: ' Load Available Agents',
    description: 'Load public agents created by the PAIA community. Discover and use pre-built AI agents shared by other users!',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true // Only appears when backend is connected
  },

  // Load My Agents
  {
    selector: '[data-tutorial="btn-load-my-agents"]',
    title: ' Load My Agents',
    description: 'Load your own saved agents from the library. Quickly add agents you\'ve created before to your current workflow.',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true // Only appears when backend is connected
  },

  // Chat Section
  {
    selector: '[data-tutorial="chat-section"]',
    title: ' Chat with Agents',
    description: 'Once you have agents or humans in your canvas, you can chat with them here! Test your agents, configure human responses, and interact with your workflow participants.',
    placement: 'left',
    requireClick: false
  },

  // Canvas Area
  {
    selector: '[data-tutorial="canvas-area"]',
    title: ' The Canvas',
    description: 'This is your workspace! Click any button from the right sidebar to add nodes here. You can drag nodes, connect them with lines, and build your workflow. You can also zoom, pan, and organize nodes freely.',
    placement: 'top',
    requireClick: false
  },

  // CREATE SAMPLE NODES - This is an action step
  {
    selector: null,
    title: ' Let\'s Create Sample Nodes!',
    description: 'To show you how everything works, I\'ll add some example nodes to the canvas. You\'ll be able to see and interact with them during this tutorial. Don\'t worry - you can remove them at the end!',
    placement: 'center',
    requireClick: false,
    action: 'createSampleNodes' // This triggers the action
  },

  // Connecting nodes (educational - shown even without nodes)
  {
    selector: '[data-tutorial="node-handle"]',
    title: ' Connecting Nodes',
    description: 'Once you add nodes, you can connect them! Just drag from the small circle (handle) on one node to another node. These connections show the flow of information between agents.',
    placement: 'top',
    requireClick: false
  },

  // Node actions (educational - shown even without nodes)
  {
    selector: '[data-tutorial="node-actions"]',
    title: ' Node Actions',
    description: 'When you click on a node, you\'ll see action buttons: Configure (settings), Chat (test the agent), Edit (modify properties), or Delete (remove from canvas).',
    placement: 'top',
    requireClick: false,
    skipIfNotFound: true
  },

  // Configure node
  {
    selector: '[data-tutorial="btn-configure-node"]',
    title: ' Configure Node',
    description: 'The gear icon lets you configure node-specific settings. For agents, you can set up tools and capabilities. For integrations, you can connect accounts.',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true
  },

  // Chat with node
  {
    selector: '[data-tutorial="btn-chat-node"]',
    title: ' Chat with Agent',
    description: 'The chat bubble icon opens a conversation with an agent node. Perfect for testing and interacting with your AI agents!',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true
  },

  // Edit node
  {
    selector: '[data-tutorial="btn-edit-node"]',
    title: ' Edit Node',
    description: 'The pencil icon lets you edit a node\'s basic properties: name, description, personality (for agents), and more.',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true
  },

  // Delete node
  {
    selector: '[data-tutorial="btn-delete-node"]',
    title: ' Delete Node',
    description: 'The trash icon removes a node from the canvas. Don\'t worry - you\'ll get a confirmation before deletion.',
    placement: 'left',
    requireClick: false,
    skipIfNotFound: true
  },

  // Logs Panel (bottom left)
  {
    selector: '[data-tutorial="logs-panel"]',
    title: ' Execution Logs',
    description: 'See real-time logs of your workflow execution at the bottom left. Every action, message, and event will be recorded here when you run your flow.',
    placement: 'top',
    requireClick: false
  },

  // Stats Panel (bottom right)
  {
    selector: '[data-tutorial="stats-panel"]',
    title: ' Statistics Panel',
    description: 'View statistics about your workflow at the bottom right: number of nodes, connections, execution time, and more.',
    placement: 'top',
    requireClick: false
  },

  // Left Sidebar Actions - Save Flow
  {
    selector: '[data-tutorial="btn-save-flow"]',
    title: ' Save Your Flow',
    description: 'IMPORTANT: Click here to save your workflow! Give it a name and description. PAIA auto-saves your work, but manual saves are recommended for important checkpoints.',
    placement: 'right',
    requireClick: false
  },

  // Left Sidebar Actions - Run Flow
  {
    selector: '[data-tutorial="btn-run-flow"]',
    title: ' Run Your Flow',
    description: 'Once you\'ve added nodes and connections, click here to execute your workflow! You\'ll see the results in real-time in the logs panel below.',
    placement: 'right',
    requireClick: false
  },

  // Stop Flow (appears when running)
  {
    selector: '[data-tutorial="btn-stop-flow"]',
    title: ' Stop Flow',
    description: 'When your flow is running, this button appears. Click it to stop the execution at any time. Useful if something goes wrong or you need to make changes.',
    placement: 'right',
    requireClick: false,
    skipIfNotFound: true
  },

  // Clear Canvas
  {
    selector: '[data-tutorial="btn-clear-flow"]',
    title: ' Clear Canvas',
    description: 'This button clears the entire canvas, removing all nodes and connections. Make sure to save your work first! You\'ll get a confirmation before clearing.',
    placement: 'right',
    requireClick: false
  },

  // Zoom controls
  {
    selector: '[data-tutorial="zoom-controls"]',
    title: ' Zoom Controls',
    description: 'Use these controls to zoom in, zoom out, or fit the entire flow to screen. You can also use your mouse wheel to zoom in and out.',
    placement: 'left',
    requireClick: false
  },

  // Scenario info
  {
    selector: '[data-tutorial="scenario-info"]',
    title: ' Scenario Information',
    description: 'This shows your current scenario name and description. You can edit these fields when saving your flow to keep your projects organized.',
    placement: 'bottom',
    requireClick: false,
    skipIfNotFound: true
  },

  // Auto-save indicator
  {
    selector: '[data-tutorial="autosave-indicator"]',
    title: ' Auto-Save',
    description: 'This indicator shows when your work was last auto-saved. PAIA automatically saves your progress every 3 seconds, so you never lose your work!',
    placement: 'bottom',
    requireClick: false,
    skipIfNotFound: true
  },

  // Back to library
  {
    selector: '[data-tutorial="btn-back-library"]',
    title: ' Back to Library',
    description: 'Click here to return to the Library page. Don\'t worry - your flow will be auto-saved before you leave, so your work is always safe!',
    placement: 'bottom',
    requireClick: false,
    skipIfNotFound: true
  },

  // Final message with cleanup option
  {
    selector: null,
    title: ' Tutorial Complete! 🎉',
    description: 'Congratulations! You now know how to use PAIA. Would you like to keep the example nodes to continue experimenting, or start with a clean canvas?',
    placement: 'center',
    requireClick: false,
    showCleanupOptions: true // This will show cleanup buttons
  }
];

export default canvasSteps;